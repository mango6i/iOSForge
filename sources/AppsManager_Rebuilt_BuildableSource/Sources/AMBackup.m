/* Rebuilt backup implementation using the recovered original .adbk layout. */
#import "AMBackup.h"
#import "AMArchive.h"
#import "AMKeychain.h"
#import "AMPrivateInfo.h"
#import "AMExtraction.h"
#import "AMClipboard.h"
#import "AMBackupStore.h"
#include <sys/stat.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>

static BOOL AddTree(AMArchive *archive, NSURL *root, NSString *prefix, NSError **error) {
    NSFileManager *fm = NSFileManager.defaultManager;
    struct stat st;
    if (lstat(root.fileSystemRepresentation, &st) != 0 || !S_ISDIR(st.st_mode)) {
        if (error)
            *error = AMError(errno ?: 40,
                             [NSString stringWithFormat:@"无法读取数据容器：%@", root.path]);
        return NO;
    }
    if (AMArchiveAddBytes(archive, [[prefix stringByAppendingString:@"/"] UTF8String], "", 0,
                          0040700)) {
        if (error)
            *error = AMError(41, @(AMArchiveError(archive)));
        return NO;
    }
    __block NSError *enumerationError = nil;
    NSDirectoryEnumerator<NSURL *> *enumerator =
        [fm enumeratorAtURL:root
            includingPropertiesForKeys:nil
                               options:0
                          errorHandler:^BOOL(NSURL *url, NSError *failure) {
                              (void)url;
                              enumerationError = failure;
                              return NO;
                          }];
    if (!enumerator) {
        if (error)
            *error = AMError(52, @"无法枚举数据容器，未发布备份");
        return NO;
    }
    NSError *itemError = nil;
    for (NSURL *url in enumerator) {
        @autoreleasepool {
            if (lstat(url.fileSystemRepresentation, &st) != 0) {
                itemError =
                    AMError(errno, [NSString stringWithFormat:@"无法读取文件：%@", url.path]);
                break;
            }
            NSString *relative = [url.path substringFromIndex:root.path.length];
            while ([relative hasPrefix:@"/"])
                relative = [relative substringFromIndex:1];
            if ([relative.pathComponents.firstObject hasPrefix:@".amrollback-"]) {
                if (S_ISDIR(st.st_mode))
                    [enumerator skipDescendants];
                continue;
            }
            if ([relative isEqualToString:@".com.apple.mobile_container_manager.metadata.plist"] ||
                [relative isEqualToString:@"Library/Preferences/.GlobalPreferences.plist"])
                continue;
            NSString *name = [prefix stringByAppendingPathComponent:relative];
            int result = 0;
            if (S_ISLNK(st.st_mode)) {
                NSString *destination = [fm destinationOfSymbolicLinkAtPath:url.path
                                                                      error:&itemError];
                if (!destination) {
                    if (!itemError)
                        itemError = AMError(53, @"无法读取符号链接，未发布备份");
                    break;
                }
                NSData *data = [destination dataUsingEncoding:NSUTF8StringEncoding];
                result = AMArchiveAddBytes(archive, name.UTF8String, data.bytes, data.length,
                                           (uint32_t)st.st_mode);
                [enumerator skipDescendants];
            } else if (S_ISDIR(st.st_mode))
                result =
                    AMArchiveAddBytes(archive, [[name stringByAppendingString:@"/"] UTF8String], "",
                                      0, (uint32_t)st.st_mode);
            else if (S_ISREG(st.st_mode))
                result = AMArchiveAddFile(archive, name.UTF8String, url.fileSystemRepresentation,
                                          (uint32_t)st.st_mode);
            else {
                itemError = AMError(
                    42, [NSString stringWithFormat:@"不支持的特殊文件：%@，未发布备份", url.path]);
                break;
            }
            if (result) {
                itemError = AMError(43, [NSString stringWithFormat:@"归档 %@ 失败：%s", name,
                                                                   AMArchiveError(archive)]);
                break;
            }
        }
    }
    if (itemError) {
        if (error)
            *error = itemError;
        return NO;
    }
    if (enumerationError) {
        if (error)
            *error = enumerationError;
        return NO;
    }
    return YES;
}
@implementation AMBackup
+ (NSURL *)directory {
    return [NSURL fileURLWithPath:@"/var/mobile/Library/AppsManagerRebuilt/Backups"
                      isDirectory:YES];
}
+ (NSArray<NSURL *> *)archives {
    NSMutableArray *items = [NSMutableArray array];
    for (NSURL *directory in @[
             self.directory, [NSURL fileURLWithPath:@"/var/mobile/Library/ADManager"
                                        isDirectory:YES]
         ])
        [items addObjectsFromArray:
                   [NSFileManager.defaultManager
                         contentsOfDirectoryAtURL:directory
                       includingPropertiesForKeys:nil
                                          options:NSDirectoryEnumerationSkipsHiddenFiles
                                            error:nil]
                       ?: @[]];
    NSPredicate *predicate =
        [NSPredicate predicateWithBlock:^BOOL(NSURL *url, NSDictionary *bindings) {
            (void)bindings;
            return [url.pathExtension isEqualToString:@"adbk"];
        }];
    return [[items filteredArrayUsingPredicate:predicate]
               sortedArrayUsingComparator:^NSComparisonResult(NSURL *a, NSURL *b) {
                   return [b.lastPathComponent compare:a.lastPathComponent];
               }]
               ?: @[];
}
+ (BOOL)backup:(AMApplication *)app
    includeKeychain:(BOOL)includeKeychain
           progress:(void (^)(NSString *))progress
              error:(NSError **)error {
    if (app.containerResolutionError) {
        if (error)
            *error = app.containerResolutionError;
        return NO;
    }
    NSFileManager *fm = NSFileManager.defaultManager;
    NSURL *directory = self.directory;
    if (![fm createDirectoryAtURL:directory
            withIntermediateDirectories:YES
                             attributes:@{NSFilePosixPermissions : @0700}
                                  error:error])
        return NO;
    NSString *token = NSUUID.UUID.UUIDString;
    NSURL *stage =
        [directory URLByAppendingPathComponent:[@".staging-" stringByAppendingString:token]
                                   isDirectory:YES];
    if (![fm createDirectoryAtURL:stage
            withIntermediateDirectories:NO
                             attributes:@{NSFilePosixPermissions : @0700}
                                  error:error])
        return NO;
    AMArchive *archive = NULL;
    BOOL success = NO;
    @try {
        NSURL *keychain = [stage URLByAppendingPathComponent:@"Keychain.plist"];
        if (includeKeychain) {
            progress(@"正在备份钥匙串");
            if (![AMKeychain backupApplication:app output:keychain error:error])
                return NO;
        }
        NSURL *temporary = [stage URLByAppendingPathComponent:@"archive.partial"];
        archive = AMArchiveOpen(temporary.fileSystemRepresentation);
        if (!archive) {
            if (error)
                *error = AMError(errno, @"无法创建备份文件");
            return NO;
        }
        chmod(temporary.fileSystemRepresentation, 0600);
        progress(@"正在归档应用数据");
        if (!app.dataURL || !AddTree(archive, app.dataURL, app.identifier, error))
            return NO;
        for (NSString *key in
             [app.groupURLs.allKeys sortedArrayUsingSelector:@selector(compare:)]) {
            progress([@"正在归档共享容器：" stringByAppendingString:key]);
            if (!AddTree(archive, app.groupURLs[key],
                         [@"___groups___" stringByAppendingPathComponent:key], error))
                return NO;
        }
        for (NSString *key in
             [app.extensionURLs.allKeys sortedArrayUsingSelector:@selector(compare:)])
            if (!AddTree(archive, app.extensionURLs[key],
                         [@"___extensions___" stringByAppendingPathComponent:key], error))
                return NO;
        NSString *appID = app.entitlements[@"application-identifier"];
        NSString *team = [appID isKindOfClass:NSString.class]
                             ? [[appID componentsSeparatedByString:@"."] firstObject]
                             : nil;
        NSArray<NSURL *> *pasteboards =
            includeKeychain ? [AMClipboard directoriesForTeam:team ?: @"" error:error] : @[];
        if (!pasteboards)
            return NO;
        for (NSURL *pasteboard in pasteboards)
            if (!AddTree(archive, pasteboard,
                         [@"__pasteboards__"
                             stringByAppendingPathComponent:pasteboard.lastPathComponent],
                         error))
                return NO;
        NSDictionary *manifest = @{
            @"Format" : @"AppsManagerRebuilt",
            @"Version" : @1,
            @"ApplicationIdentifier" : app.identifier,
            @"ApplicationName" : app.name,
            @"Created" : NSDate.date,
            @"IncludesKeychain" : @(includeKeychain),
            @"GroupIdentifiers" : app.groupURLs.allKeys,
            @"ExtensionIdentifiers" : app.extensionURLs.allKeys,
            @"IncludesPasteboards" : @(includeKeychain)
        };
        NSData *data =
            [NSPropertyListSerialization dataWithPropertyList:manifest
                                                       format:NSPropertyListBinaryFormat_v1_0
                                                      options:0
                                                        error:error];
        if (!data)
            return NO;
        if (AMArchiveAddBytes(archive, "AMManifest.plist", data.bytes, data.length, 0100600)) {
            if (error)
                *error = AMError(44, @(AMArchiveError(archive)));
            return NO;
        }
        NSData *kc = includeKeychain ? [NSData dataWithContentsOfURL:keychain options:0 error:error]
                                     : [NSPropertyListSerialization
                                           dataWithPropertyList:@{}
                                                         format:NSPropertyListBinaryFormat_v1_0
                                                        options:0
                                                          error:error];
        NSData *pb =
            [NSPropertyListSerialization dataWithPropertyList:@[]
                                                       format:NSPropertyListBinaryFormat_v1_0
                                                      options:0
                                                        error:error];
        NSData *en =
            [NSPropertyListSerialization dataWithPropertyList:app.entitlements
                                                       format:NSPropertyListBinaryFormat_v1_0
                                                      options:0
                                                        error:error];
        if (!kc || !pb || !en)
            return NO;
        AMPrivateSlice slices[3] = {
            {kc.bytes, kc.length}, {pb.bytes, pb.length}, {en.bytes, en.length}};
        uint8_t *encoded = NULL;
        size_t encodedSize = 0;
        if (AMPrivateEncode(slices, &encoded, &encodedSize)) {
            if (error)
                *error = AMError(46, @"无法生成原版私有信息容器");
            return NO;
        }
        int privateResult =
            AMArchiveAddBytes(archive, "__private_info", encoded, encodedSize, 0100600);
        free(encoded);
        if (privateResult) {
            if (error)
                *error = AMError(47, @(AMArchiveError(archive)));
            return NO;
        }
        NSDictionary *info =
            @{@"date" : NSDate.date, @"displayName" : app.name, @"id" : app.identifier};
        data = [NSPropertyListSerialization dataWithPropertyList:info
                                                          format:NSPropertyListXMLFormat_v1_0
                                                         options:0
                                                           error:error];
        if (!data)
            return NO;
        if (AMArchiveAddBytes(archive, "Binfo.plist", data.bytes, data.length, 0100600)) {
            if (error)
                *error = AMError(48, @(AMArchiveError(archive)));
            return NO;
        }
        NSURL *preferences = [app.dataURL
            URLByAppendingPathComponent:[NSString stringWithFormat:@"Library/Preferences/%@.plist",
                                                                   app.identifier]];
        if ([fm fileExistsAtPath:preferences.path] &&
            AMArchiveAddFile(archive,
                             [[app.identifier stringByAppendingString:@".plist"] UTF8String],
                             preferences.fileSystemRepresentation, 0100600)) {
            if (error)
                *error = AMError(49, @(AMArchiveError(archive)));
            return NO;
        }
        __block NSData *icon = nil;
        if (NSThread.isMainThread)
            icon = UIImagePNGRepresentation(app.icon);
        else
            dispatch_sync(dispatch_get_main_queue(), ^{
                icon = UIImagePNGRepresentation(app.icon);
            });
        if (icon && AMArchiveAddBytes(archive, "icon.png", icon.bytes, icon.length, 0100600)) {
            if (error)
                *error = AMError(50, @(AMArchiveError(archive)));
            return NO;
        }
        int closed = AMArchiveClose(archive);
        archive = NULL;
        if (closed) {
            if (error)
                *error = AMError(45, @"归档写入或关闭失败，未发布备份");
            return NO;
        }
        progress(@"正在读回校验整个备份");
        if (![AMExtraction verifyArchive:temporary error:error])
            return NO;
        NSDateFormatter *formatter = [NSDateFormatter new];
        formatter.locale = [NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"];
        formatter.dateFormat = @"yyyyMMdd-HHmmss";
        NSString *name = [NSString stringWithFormat:@"%@_%@_%@.adbk", app.identifier,
                                                    [formatter stringFromDate:NSDate.date],
                                                    [token substringToIndex:8]];
        NSURL *destination = [directory URLByAppendingPathComponent:name];
        success = [fm moveItemAtURL:temporary toURL:destination error:error];
        if (success) {
            NSError *retentionError = nil;
            if (![AMBackupStore applyRetentionForApplication:app.identifier
                                               keepingNewest:destination
                                                       error:&retentionError]) {
                /* A retention failure must not turn an intact backup into a false failure. */
                NSData *warning = [NSPropertyListSerialization
                    dataWithPropertyList:@{
                        @"archive" : destination.lastPathComponent,
                        @"retentionWarning" : retentionError.localizedDescription
                            ?: @"保留上限未应用"
                    }
                                  format:NSPropertyListBinaryFormat_v1_0
                                 options:0
                                   error:nil];
                [warning writeToURL:[directory.URLByDeletingLastPathComponent
                                        URLByAppendingPathComponent:@"RetentionWarning.plist"]
                         atomically:YES];
            }
        }
    } @catch (NSException *exception) {
        if (!success && error)
            *error = AMError(
                51,
                [NSString stringWithFormat:@"备份过程中系统接口发生异常（%@）；未发布不完整归档",
                                           exception.name]);
    } @finally {
        if (archive)
            AMArchiveAbort(archive);
        [fm removeItemAtURL:stage error:nil];
    }
    return success;
}
@end
