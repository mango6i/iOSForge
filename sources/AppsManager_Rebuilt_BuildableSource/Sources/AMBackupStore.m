#import "AMBackupStore.h"
#import "AMBackup.h"
#import "AMOperations.h"
#import "AMTransaction.h"
#include <sys/stat.h>
static BOOL OwnedFile(NSURL *url, NSURL *directory) {
    struct stat st;
    return [url.URLByDeletingLastPathComponent.path isEqual:directory.path] &&
           [url.pathExtension isEqualToString:@"adbk"] &&
           lstat(url.fileSystemRepresentation, &st) == 0 && S_ISREG(st.st_mode);
}
static BOOL MoveFile(NSURL *source, NSURL *directory, NSError **error) {
    NSFileManager *fm = NSFileManager.defaultManager;
    if (![fm createDirectoryAtURL:directory
            withIntermediateDirectories:YES
                             attributes:@{
                                 NSFilePosixPermissions : @0700
                             }
                                  error:error])
        return NO;
    NSURL *destination = [directory URLByAppendingPathComponent:source.lastPathComponent];
    if ([fm fileExistsAtPath:destination.path])
        destination = [directory
            URLByAppendingPathComponent:[NSString stringWithFormat:@"%@_%@", NSUUID.UUID.UUIDString,
                                                                   source.lastPathComponent]];
    int code = AMExclusiveRename(source.fileSystemRepresentation,
                                 destination.fileSystemRepresentation, NULL);
    if (code && error)
        *error = AMError(code, @"无法移动备份；已有文件未被覆盖");
    return code == 0;
}
@implementation AMBackupStore
+ (NSURL *)retainedDirectory {
    return [AMBackup.directory.URLByDeletingLastPathComponent
        URLByAppendingPathComponent:@"RetainedBackups"
                        isDirectory:YES];
}
+ (NSArray<NSURL *> *)retainedArchives {
    NSArray *all = [NSFileManager.defaultManager
          contentsOfDirectoryAtURL:self.retainedDirectory
        includingPropertiesForKeys:nil
                           options:NSDirectoryEnumerationSkipsHiddenFiles
                             error:nil];
    NSMutableArray *items = [NSMutableArray array];
    for (NSURL *url in all)
        if (OwnedFile(url, self.retainedDirectory))
            [items addObject:url];
    return [items sortedArrayUsingComparator:^NSComparisonResult(NSURL *a, NSURL *b) {
        return [a.lastPathComponent localizedStandardCompare:b.lastPathComponent];
    }];
}
+ (BOOL)isOwnedActiveArchive:(NSURL *)archive {
    return OwnedFile(archive, AMBackup.directory);
}
+ (BOOL)retire:(NSURL *)archive error:(NSError **)error {
    if (![self isOwnedActiveArchive:archive]) {
        if (error)
            *error = AMError(140, @"只管理维护版备份目录中的普通文件；原版归档请先导入");
        return NO;
    }
    return MoveFile(archive, self.retainedDirectory, error);
}
+ (BOOL)reactivate:(NSURL *)archive error:(NSError **)error {
    if (!OwnedFile(archive, self.retainedDirectory)) {
        if (error)
            *error = AMError(141, @"文件不属于保留区");
        return NO;
    }
    return MoveFile(archive, AMBackup.directory, error);
}
+ (BOOL)rename:(NSURL *)archive filename:(NSString *)filename error:(NSError **)error {
    if (![self isOwnedActiveArchive:archive] || !filename.length ||
        ![filename.lastPathComponent isEqual:filename] || [filename containsString:@"\\"] ||
        [filename hasPrefix:@"."] || ![filename.pathExtension isEqualToString:@"adbk"] ||
        [filename lengthOfBytesUsingEncoding:NSUTF8StringEncoding] > 240) {
        if (error)
            *error = AMError(142, @"备份名称无效或归档不属于维护版目录");
        return NO;
    }
    NSURL *destination = [AMBackup.directory URLByAppendingPathComponent:filename];
    if ([destination isEqual:archive])
        return YES;
    int code = AMExclusiveRename(archive.fileSystemRepresentation,
                                 destination.fileSystemRepresentation, NULL);
    if (code && error)
        *error = AMError(code, @"无法重命名；同名文件未被覆盖");
    return code == 0;
}
+ (BOOL)applyRetentionForApplication:(NSString *)identifier
                       keepingNewest:(NSURL *)newest
                               error:(NSError **)error {
    NSInteger maximum = [NSUserDefaults.standardUserDefaults integerForKey:@"max-backups"];
    if (maximum <= 0)
        return YES;
    NSMutableArray<NSDictionary *> *matching = [NSMutableArray array];
    for (NSURL *url in AMBackup.archives) {
        if (![self isOwnedActiveArchive:url])
            continue;
        NSDictionary *info = [AMOperations infoForArchive:url error:nil];
        if (![info[@"id"] isEqual:identifier])
            continue;
        id date = info[@"date"];
        if (![date isKindOfClass:NSDate.class])
            date = [NSFileManager.defaultManager attributesOfItemAtPath:url.path
                                                                  error:nil][NSFileModificationDate]
                       ?: NSDate.distantPast;
        [matching addObject:@{@"url" : url, @"date" : date}];
    }
    [matching sortUsingComparator:^NSComparisonResult(NSDictionary *a, NSDictionary *b) {
        return [a[@"date"] compare:b[@"date"]];
    }];
    NSUInteger activeCount = matching.count;
    for (NSDictionary *old in matching) {
        if (activeCount <= (NSUInteger)maximum)
            break;
        if ([old[@"url"] isEqual:newest])
            continue;
        if (![self retire:old[@"url"] error:error])
            return NO;
        activeCount--;
    }
    return YES;
}
@end
