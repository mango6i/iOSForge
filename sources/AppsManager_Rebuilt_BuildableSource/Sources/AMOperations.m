/* Recovered BackupList restore/wipe contracts, rebuilt with retained rollback.
 * This source is a reconstruction. It needs a device round-trip qualification.
 */
#import "AMOperations.h"
#import "AMBackup.h"
#import "AMExtraction.h"
#import "AMKeychain.h"
#import "AMPrivateInfo.h"
#import "AMTransaction.h"
#import "AMPreferences.h"
#import "AMClipboard.h"
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>

static BOOL WriteJournal(NSMutableDictionary *journal, NSURL *url, NSError **error) {
    NSData *data = [NSPropertyListSerialization dataWithPropertyList:journal
                                                              format:NSPropertyListBinaryFormat_v1_0
                                                             options:0
                                                               error:error];
    if (!data || ![data writeToURL:url options:NSDataWritingAtomic error:error])
        return NO;
    if (chmod(url.fileSystemRepresentation, 0600)) {
        if (error)
            *error = AMError(errno, @"无法限制恢复日志权限");
        return NO;
    }
    int fd = open(url.fileSystemRepresentation, O_RDWR | O_NOFOLLOW);
    if (fd < 0) {
        if (error)
            *error = AMError(errno, @"无法打开恢复日志");
        return NO;
    }
    BOOL success = fsync(fd) == 0;
    if (close(fd))
        success = NO;
    if (!success && error)
        *error = AMError(errno, @"恢复日志落盘失败");
    return success;
}
typedef struct {
    __unsafe_unretained NSMutableDictionary *journal;
    __unsafe_unretained NSURL *url;
} JournalContext;
static int Persist(size_t completed, size_t pending, int rollingBack, void *opaque) {
    JournalContext *context = opaque;
    context->journal[@"completed"] = @(completed);
    context->journal[@"pending"] = pending == SIZE_MAX ? @(-1) : @(pending);
    context->journal[@"rollingBack"] = @(rollingBack);
    return WriteJournal(context->journal, context->url, NULL) ? 0 : EIO;
}
static BOOL RealDirectory(NSURL *url) {
    struct stat st;
    return url && lstat(url.fileSystemRepresentation, &st) == 0 && S_ISDIR(st.st_mode);
}
static BOOL ValidContainer(NSURL *url) {
    if (!RealDirectory(url))
        return NO;
    NSURL *resolved = url.URLByResolvingSymlinksInPath;
    NSString *path = resolved.path;
    if ([path hasPrefix:@"/private/"])
        path = [path substringFromIndex:8];
    NSString *parent = path.stringByDeletingLastPathComponent;
    return [[NSUUID alloc] initWithUUIDString:path.lastPathComponent] && [@[
               @"/var/mobile/Containers/Data/Application",
               @"/var/mobile/Containers/Data/PluginKitPlugin",
               @"/var/mobile/Containers/Shared/AppGroup"
           ] containsObject:parent];
}
static BOOL RepairOwnership(NSURL *source, NSURL *target, NSError **error) {
    struct stat st;
    if (lstat(target.fileSystemRepresentation, &st)) {
        if (error)
            *error = AMError(errno, @"无法读取目标所有者");
        return NO;
    }
    __block NSError *enumerationError = nil;
    NSDirectoryEnumerator *entries =
        [NSFileManager.defaultManager enumeratorAtURL:source
                           includingPropertiesForKeys:nil
                                              options:0
                                         errorHandler:^BOOL(NSURL *url, NSError *failure) {
                                             (void)url;
                                             enumerationError = failure;
                                             return NO;
                                         }];
    if (!entries) {
        if (error)
            *error = AMError(103, @"无法枚举待恢复的文件");
        return NO;
    }
    for (NSURL *url in entries) {
        struct stat item;
        if (lstat(url.fileSystemRepresentation, &item)) {
            if (error)
                *error = AMError(errno, @"无法读取待恢复项类型，未开始替换");
            return NO;
        }
        if (S_ISLNK(item.st_mode)) {
            NSString *link = [NSFileManager.defaultManager destinationOfSymbolicLinkAtPath:url.path
                                                                                     error:error];
            NSString *base = source.URLByResolvingSymlinksInPath.path;
            NSString *destination = [[url.URLByDeletingLastPathComponent.path
                stringByAppendingPathComponent:link ?: @""] stringByStandardizingPath];
            NSString *resolved =
                [NSURL fileURLWithPath:destination].URLByResolvingSymlinksInPath.path;
            NSString *lexicalBase = source.path.stringByStandardizingPath;
            NSString *prefix = [base stringByAppendingString:@"/"];
            if (!link.length || link.isAbsolutePath ||
                (![destination isEqual:lexicalBase] &&
                 ![destination hasPrefix:[lexicalBase stringByAppendingString:@"/"]]) ||
                (![resolved isEqual:base] && ![resolved hasPrefix:prefix])) {
                if (error && !*error)
                    *error = AMError(106, @"归档符号链接越过单个容器边界，未开始替换");
                return NO;
            }
        }
        if (lchown(url.fileSystemRepresentation, st.st_uid, st.st_gid)) {
            if (error)
                *error = AMError(errno, @"无法还原数据文件所有者，未开始替换");
            return NO;
        }
    }
    if (enumerationError) {
        if (error)
            *error = enumerationError;
        return NO;
    }
    return YES;
}
static BOOL PrepareContainer(NSURL *target, NSURL *source, NSString *token, NSMutableArray *moves,
                             NSMutableArray *retained, NSMutableArray *preferences,
                             NSError **error) {
    NSFileManager *fm = NSFileManager.defaultManager;
    if (!ValidContainer(target) || !RealDirectory(source)) {
        if (error)
            *error = AMError(90, @"容器路径或解压数据目录校验失败，未修改目标数据");
        return NO;
    }
    NSMutableSet *domains = [NSMutableSet set];
    for (NSURL *container in @[ target, source ]) {
        NSURL *directory = [container URLByAppendingPathComponent:@"Library/Preferences"
                                                      isDirectory:YES];
        if (![fm fileExistsAtPath:directory.path])
            continue;
        NSArray *files = [fm contentsOfDirectoryAtURL:directory
                           includingPropertiesForKeys:nil
                                              options:0
                                                error:error];
        if (!files)
            return NO;
        for (NSURL *file in files)
            if ([file.pathExtension isEqualToString:@"plist"] &&
                ![file.lastPathComponent isEqualToString:@".GlobalPreferences.plist"])
                [domains addObject:[file.lastPathComponent stringByDeletingPathExtension]];
    }
    for (NSString *domain in domains) {
        NSDictionary *oldValues = [AMPreferences readDomain:domain container:target error:error];
        if (!oldValues)
            return NO;
        NSURL *file = [source
            URLByAppendingPathComponent:[NSString stringWithFormat:@"Library/Preferences/%@.plist",
                                                                   domain]];
        NSDictionary *newValues = @{};
        if ([fm fileExistsAtPath:file.path]) {
            NSData *data = [NSData dataWithContentsOfURL:file options:0 error:error];
            id value =
                data ? [NSPropertyListSerialization propertyListWithData:data
                                                                 options:NSPropertyListImmutable
                                                                  format:NULL
                                                                   error:error]
                     : nil;
            if (![value isKindOfClass:NSDictionary.class]) {
                if (error && !*error)
                    *error = AMError(117, @"偏好设置文件不是字典，已停止恢复");
                return NO;
            }
            newValues = value;
        }
        [preferences addObject:@{
            @"container" : target.path,
            @"domain" : domain,
            @"old" : oldValues,
            @"new" : newValues
        }];
    }
    NSURL *rollback =
        [target URLByAppendingPathComponent:[@".amrollback-" stringByAppendingString:token]
                                isDirectory:YES];
    if (![fm createDirectoryAtURL:rollback
            withIntermediateDirectories:NO
                             attributes:@{
                                 NSFilePosixPermissions : @0700
                             }
                                  error:error])
        return NO;
    [retained addObject:rollback.path];
    if (!RepairOwnership(source, target, error))
        return NO;
    NSArray<NSURL *> *old = [fm contentsOfDirectoryAtURL:target
                              includingPropertiesForKeys:nil
                                                 options:0
                                                   error:error];
    if (!old)
        return NO;
    NSArray<NSURL *> *fresh = [fm contentsOfDirectoryAtURL:source
                                includingPropertiesForKeys:nil
                                                   options:0
                                                     error:error];
    if (!fresh)
        return NO;
    for (NSURL *url in old) {
        NSString *name = url.lastPathComponent;
        if ([name isEqualToString:@".com.apple.mobile_container_manager.metadata.plist"] ||
            [name hasPrefix:@".amrollback-"])
            continue;
        [moves addObject:@{
            @"from" : url.path,
            @"to" : [[rollback URLByAppendingPathComponent:name] path]
        }];
    }
    for (NSURL *url in fresh) {
        NSString *name = url.lastPathComponent;
        if ([name isEqualToString:@".com.apple.mobile_container_manager.metadata.plist"] ||
            [name hasPrefix:@".amrollback-"])
            continue;
        [moves addObject:@{
            @"from" : url.path,
            @"to" : [[target URLByAppendingPathComponent:name] path]
        }];
    }
    return YES;
}
static NSDictionary *ReadPlist(NSData *data, NSError **error) {
    id value = data ? [NSPropertyListSerialization propertyListWithData:data
                                                                options:NSPropertyListImmutable
                                                                 format:NULL
                                                                  error:error]
                    : nil;
    if (![value isKindOfClass:NSDictionary.class]) {
        if (error && !*error)
            *error = AMError(91, @"备份信息不是有效字典");
        return nil;
    }
    return value;
}
@implementation AMOperations
+ (NSURL *)recoveryDirectory {
    return [NSURL fileURLWithPath:@"/var/mobile/Library/AppsManagerRebuilt/Recovery"
                      isDirectory:YES];
}
+ (BOOL)hasPendingRecovery {
    NSFileManager *fm = NSFileManager.defaultManager;
    if (![fm fileExistsAtPath:self.recoveryDirectory.path])
        return NO;
    NSError *error = nil;
    NSArray<NSURL *> *items = [fm contentsOfDirectoryAtURL:self.recoveryDirectory
                                includingPropertiesForKeys:nil
                                                   options:NSDirectoryEnumerationSkipsHiddenFiles
                                                     error:&error];
    if (!items)
        return YES;
    for (NSURL *url in items) {
        NSURL *file = [url URLByAppendingPathComponent:@"Journal.plist"];
        if (![fm fileExistsAtPath:file.path])
            continue;
        NSDictionary *journal = [NSDictionary dictionaryWithContentsOfURL:file];
        NSString *state = journal[@"state"];
        if (!journal ||
            ![@[ @"completed", @"rolledBack", @"preflightFailed" ] containsObject:state])
            return YES;
    }
    return NO;
}
+ (BOOL)recoverJournal:(NSURL *)url application:(AMApplication *)app error:(NSError **)error {
    @synchronized(self) {
        NSURL *work = url.URLByDeletingLastPathComponent;
        struct stat journalStat;
        if (!RealDirectory(work) || ![url.lastPathComponent isEqualToString:@"Journal.plist"] ||
            ![[work URLByDeletingLastPathComponent].path isEqual:self.recoveryDirectory.path] ||
            ![[NSUUID alloc] initWithUUIDString:work.lastPathComponent] ||
            lstat(url.fileSystemRepresentation, &journalStat) || !S_ISREG(journalStat.st_mode)) {
            if (error)
                *error = AMError(121, @"恢复日志路径不属于本程序");
            return NO;
        }
        NSMutableDictionary *journal = [[NSDictionary dictionaryWithContentsOfURL:url] mutableCopy];
        NSString *state = journal[@"state"];
        if (![journal[@"application"] isEqual:app.identifier] || ![@[
                @"preflight", @"movingFiles", @"changingPreferences", @"changingKeychain",
                @"needsRecovery"
            ] containsObject:state]) {
            if (error)
                *error = AMError(122, @"日志与目标不匹配，或无需回退");
            return NO;
        }
        // The durable "movingFiles" journal is written before the first rename.
        if ([state isEqual:@"preflight"]) {
            journal[@"state"] = @"preflightFailed";
            return WriteJournal(journal, url, error);
        }
        NSArray *plan = journal[@"moves"], *retained = journal[@"retainedDirectories"];
        NSArray *preferences = journal[@"preferences"];
        if (![plan isKindOfClass:NSArray.class] || ![retained isKindOfClass:NSArray.class] ||
            ![preferences isKindOfClass:NSArray.class] ||
            ![journal[@"completed"] isKindOfClass:NSNumber.class] ||
            ![journal[@"pending"] isKindOfClass:NSNumber.class]) {
            if (error)
                *error = AMError(123, @"恢复日志格式无效");
            return NO;
        }
        for (NSString *flag in
             @[ @"rollingBack", @"preferencesMayHaveChanged", @"keychainMayHaveChanged" ])
            if (journal[flag] && ![journal[flag] isKindOfClass:NSNumber.class]) {
                if (error)
                    *error = AMError(123, @"恢复日志标志类型无效");
                return NO;
            }
        if (!app.dataURL || app.containerResolutionError) {
            if (error)
                *error = app.containerResolutionError ?: AMError(124, @"目标容器不可用");
            return NO;
        }
        NSMutableSet *roots = [NSMutableSet set];
        NSMutableArray *containers = [NSMutableArray arrayWithObject:app.dataURL];
        [containers addObjectsFromArray:app.groupURLs.allValues];
        [containers addObjectsFromArray:app.extensionURLs.allValues];
        for (NSURL *container in containers) {
            if (!ValidContainer(container)) {
                if (error)
                    *error = AMError(124, @"目标容器已更换或不可用");
                return NO;
            }
            [roots addObject:container.path];
        }
        for (id path in retained)
            if (![path isKindOfClass:NSString.class] ||
                ![roots containsObject:[path stringByDeletingLastPathComponent]] ||
                ![[path lastPathComponent]
                    isEqualToString:[@".amrollback-"
                                        stringByAppendingString:work.lastPathComponent]]) {
                if (error)
                    *error = AMError(125, @"恢复点不属于当前目标容器");
                return NO;
            }
        NSString *extracted = [work URLByAppendingPathComponent:@"Extracted" isDirectory:YES].path;
        NSMutableDictionary *sourceRoots = [NSMutableDictionary dictionary];
        sourceRoots[[extracted stringByAppendingPathComponent:app.identifier]] = app.dataURL.path;
        for (NSString *kind in @[ @"___groups___", @"___extensions___" ]) {
            NSDictionary<NSString *, NSURL *> *targets =
                [kind isEqual:@"___groups___"] ? app.groupURLs : app.extensionURLs;
            for (NSString *key in targets)
                sourceRoots[[[extracted stringByAppendingPathComponent:kind]
                    stringByAppendingPathComponent:key]] = targets[key].path;
        }
        NSMutableSet *sources = [NSMutableSet set], *destinations = [NSMutableSet set];
        for (id move in plan) {
            if (![move isKindOfClass:NSDictionary.class] ||
                ![move[@"from"] isKindOfClass:NSString.class] ||
                ![move[@"to"] isKindOfClass:NSString.class]) {
                if (error)
                    *error = AMError(126, @"恢复计划中有无效路径");
                return NO;
            }
            NSString *from = move[@"from"], *to = move[@"to"],
                     *fromParent = from.stringByDeletingLastPathComponent,
                     *toParent = to.stringByDeletingLastPathComponent;
            BOOL oldMove = [roots containsObject:fromParent] && [retained containsObject:toParent];
            oldMove = oldMove && [toParent.stringByDeletingLastPathComponent isEqual:fromParent];
            NSString *actualParent =
                [NSURL fileURLWithPath:fromParent].URLByResolvingSymlinksInPath.path;
            NSString *actualExtract =
                [NSURL fileURLWithPath:extracted].URLByResolvingSymlinksInPath.path;
            BOOL newMove = [sourceRoots[fromParent] isEqual:toParent] &&
                           [actualParent hasPrefix:[actualExtract stringByAppendingString:@"/"]] &&
                           [roots containsObject:toParent];
            if ((!oldMove && !newMove) || ![from isEqual:from.stringByStandardizingPath] ||
                ![to isEqual:to.stringByStandardizingPath] ||
                ![from.lastPathComponent isEqual:to.lastPathComponent] ||
                [from.lastPathComponent hasPrefix:@".amrollback-"] ||
                [from.lastPathComponent
                    isEqual:@".com.apple.mobile_container_manager.metadata.plist"] ||
                [sources containsObject:from] || [destinations containsObject:to] ||
                !RealDirectory([NSURL fileURLWithPath:fromParent]) ||
                !RealDirectory([NSURL fileURLWithPath:toParent])) {
                if (error)
                    *error = AMError(127, @"恢复计划越过允许范围或父目录被更改");
                return NO;
            }
            [sources addObject:from];
            [destinations addObject:to];
        }
        // Validate the entire preference rollback before changing keychain or files.
        for (id change in preferences) {
            if (![change isKindOfClass:NSDictionary.class] ||
                ![change[@"container"] isKindOfClass:NSString.class] ||
                ![roots containsObject:change[@"container"]] ||
                ![change[@"domain"] isKindOfClass:NSString.class] || ![change[@"domain"] length] ||
                ![[change[@"domain"] lastPathComponent] isEqual:change[@"domain"]] ||
                [change[@"domain"] containsString:@"\\"] ||
                [change[@"domain"] rangeOfCharacterFromSet:NSCharacterSet.controlCharacterSet]
                        .location != NSNotFound ||
                [@[ @".", @"..", @".GlobalPreferences" ] containsObject:change[@"domain"]] ||
                ![change[@"old"] isKindOfClass:NSDictionary.class] ||
                ![NSPropertyListSerialization propertyList:change[@"old"]
                                          isValidForFormat:NSPropertyListBinaryFormat_v1_0]) {
                if (error)
                    *error = AMError(131, @"偏好设置回退记录无效，未开始回退");
                return NO;
            }
        }
        if ([journal[@"keychainMayHaveChanged"] boolValue]) {
            NSURL *snapshot = [work URLByAppendingPathComponent:@"PreviousKeychain.plist"];
            struct stat st;
            if (lstat(snapshot.fileSystemRepresentation, &st) || !S_ISREG(st.st_mode)) {
                if (error)
                    *error = AMError(132, @"钥匙串回退快照缺失或类型无效，未开始回退");
                return NO;
            }
        }
        size_t completed = [journal[@"completed"] unsignedLongLongValue];
        long long pending = [journal[@"pending"] longLongValue];
        if (completed > plan.count || pending < (-1) ||
            (pending >= 0 && (uint64_t)pending >= plan.count)) {
            if (error)
                *error = AMError(128, @"恢复计数超出日志范围");
            return NO;
        }
        if (pending >= 0) {
            BOOL backwards = [journal[@"rollingBack"] boolValue];
            if ((!backwards && (size_t)pending != completed) ||
                (backwards && (!completed || (size_t)pending != completed - 1))) {
                if (error)
                    *error = AMError(129, @"恢复意图与计数不一致");
                return NO;
            }
            NSDictionary *move = plan[(NSUInteger)pending];
            struct stat st;
            BOOL source = lstat([move[@"from"] fileSystemRepresentation], &st) == 0;
            BOOL destination = lstat([move[@"to"] fileSystemRepresentation], &st) == 0;
            if (source == destination) {
                if (error)
                    *error = AMError(130, @"无法唯一判断上次移动是否完成；未覆盖或删除任何文件");
                return NO;
            }
            if (!backwards && !source && destination)
                completed++;
            if (backwards && source && !destination)
                completed--;
        }
        const NSUInteger planCount = plan.count;
        AMMove *moves = calloc(planCount ?: 1, sizeof(*moves));
        if (!moves) {
            if (error)
                *error = AMError(12, @"无法分配回退计划");
            return NO;
        }
        for (NSUInteger i = 0; i < planCount; i++) {
            moves[i].from = [plan[i][@"from"] fileSystemRepresentation];
            moves[i].to = [plan[i][@"to"] fileSystemRepresentation];
        }
        JournalContext context = {journal, url};
        BOOL ok = YES;
        if ([journal[@"keychainMayHaveChanged"] boolValue]) {
            NSURL *snapshot = [work URLByAppendingPathComponent:@"PreviousKeychain.plist"];
            ok = [AMKeychain
                    operate:@"restore"
                application:app
                      input:snapshot
                    mapping:nil
                     output:[work URLByAppendingPathComponent:@"RecoveryKeychainResult.plist"]
                      error:error];
        }
        if (ok) {
            AMMoveResult result = AMMovesRollback(moves, completed, NULL, Persist, &context);
            if (result.rollbackError) {
                ok = NO;
                if (error)
                    *error = AMError(result.rollbackError, @"文件回退未完成；原数据和日志仍保留");
            }
        }
        free(moves);
        if (ok && [journal[@"preferencesMayHaveChanged"] boolValue])
            for (NSDictionary *change in preferences) {
                if (![AMPreferences writeDomain:change[@"domain"]
                                      container:[NSURL fileURLWithPath:change[@"container"]
                                                           isDirectory:YES]
                                         values:change[@"old"]
                                          error:error]) {
                    ok = NO;
                    break;
                }
            }
        journal[@"state"] = ok ? @"rolledBack" : @"needsRecovery";
        if (!WriteJournal(journal, url, error))
            return NO;
        return ok;
    }
}
+ (NSDictionary *)infoForArchive:(NSURL *)url error:(NSError **)error {
    NSData *data = [AMExtraction readEntry:@"Binfo.plist"
                               fromArchive:url
                               maximumSize:1048576
                                     error:error];
    NSDictionary *info = ReadPlist(data, error);
    if (![info[@"id"] isKindOfClass:NSString.class] || ![info[@"id"] length] ||
        ![info[@"displayName"] isKindOfClass:NSString.class]) {
        if (error && !*error)
            *error = AMError(92, @"备份缺少有效应用标识或名称");
        return nil;
    }
    return info;
}
+ (NSURL *)importArchive:(NSURL *)url error:(NSError **)error {
    if (![self infoForArchive:url error:error] || ![AMExtraction verifyArchive:url error:error])
        return nil;
    NSFileManager *fm = NSFileManager.defaultManager;
    NSURL *directory = AMBackup.directory;
    if (![fm createDirectoryAtURL:directory
            withIntermediateDirectories:YES
                             attributes:@{NSFilePosixPermissions : @0700}
                                  error:error])
        return nil;
    NSString *name = [NSString stringWithFormat:@"Imported_%@.adbk", NSUUID.UUID.UUIDString];
    NSURL *destination = [directory URLByAppendingPathComponent:name];
    if (![fm copyItemAtURL:url toURL:destination error:error])
        return nil;
    chmod(destination.fileSystemRepresentation, 0600);
    if (![AMExtraction verifyArchive:destination error:error]) {
        [fm removeItemAtURL:destination error:nil];
        return nil;
    }
    return destination;
}
+ (BOOL)restoreArchive:(NSURL *)url
           application:(AMApplication *)app
              progress:(void (^)(NSString *))progress
                 error:(NSError **)error {
    return [self performArchive:url application:app wipe:NO progress:progress error:error];
}
+ (BOOL)wipeApplication:(AMApplication *)app
               progress:(void (^)(NSString *))progress
                  error:(NSError **)error {
    NSString *appID = app.entitlements[@"application-identifier"];
    NSString *team = [appID isKindOfClass:NSString.class]
                         ? [[appID componentsSeparatedByString:@"."] firstObject]
                         : @"";
    NSArray *pasteboards = [AMClipboard directoriesForTeam:team error:error];
    if (!pasteboards)
        return NO;
    if (pasteboards.count) {
        if (error)
            *error = AMError(118, @"检测到专属剪贴板；其擦除与回退尚未完成真机验证，未执行擦除");
        return NO;
    }
    progress(@"擦除前先生成并读回校验完整备份");
    if (![AMBackup backup:app includeKeychain:YES progress:progress error:error])
        return NO;
    return [self performArchive:nil application:app wipe:YES progress:progress error:error];
}
+ (BOOL)performArchive:(NSURL *)archive
           application:(AMApplication *)app
                  wipe:(BOOL)wipe
              progress:(void (^)(NSString *))progress
                 error:(NSError **)error {
    @synchronized(self) {
        if (![NSUserDefaults.standardUserDefaults boolForKey:@"EnableDataChanges"]) {
            if (error)
                *error = AMError(143, @"此候选版的数据修改尚未启用");
            return NO;
        }
        if (app.containerResolutionError) {
            if (error)
                *error = app.containerResolutionError;
            return NO;
        }
        if (self.hasPendingRecovery) {
            if (error)
                *error = AMError(
                    93,
                    @"存在未结束的恢复记录，已阻止新的恢复/擦除。请先保留 Recovery 目录并检查记录");
            return NO;
        }
        if (app.systemApplication) {
            if (error)
                *error = AMError(94, @"该候选工程暂不允许恢复/擦除系统应用");
            return NO;
        }
        NSFileManager *fm = NSFileManager.defaultManager;
        NSString *token = NSUUID.UUID.UUIDString;
        NSURL *work = [self.recoveryDirectory URLByAppendingPathComponent:token isDirectory:YES];
        if (![fm createDirectoryAtURL:work
                withIntermediateDirectories:YES
                                 attributes:@{NSFilePosixPermissions : @0700}
                                      error:error])
            return NO;
        NSURL *extract = [work URLByAppendingPathComponent:@"Extracted" isDirectory:YES];
        if (![fm createDirectoryAtURL:extract
                withIntermediateDirectories:NO
                                 attributes:@{NSFilePosixPermissions : @0700}
                                      error:error])
            return NO;
        NSURL *journalURL = [work URLByAppendingPathComponent:@"Journal.plist"];
        NSMutableDictionary *journal = [@{
            @"state" : @"preflight",
            @"application" : app.identifier,
            @"wipe" : @(wipe),
            @"date" : NSDate.date,
            @"completed" : @0,
            @"pending" : @(-1)
        } mutableCopy];
        if (!WriteJournal(journal, journalURL, error))
            return NO;
        BOOL success = NO;
        BOOL attemptedFiles = NO;
        BOOL keychainAttempted = NO;
        BOOL preferencesAttempted = NO;
        AMMove *nativeMoves = NULL;
        AMMoveResult result = {0, 0, 0};
        __attribute__((objc_precise_lifetime)) NSArray *plan = nil;
        NSMutableArray *preferenceChanges = [NSMutableArray array];
        JournalContext context = {journal, journalURL};
        NSURL *previousKeychain = [work URLByAppendingPathComponent:@"PreviousKeychain.plist"];
        @try {
            NSURL *dataSource = nil;
            NSURL *keychain = [work URLByAppendingPathComponent:@"RequestedKeychain.plist"];
            BOOL includeKeychain = YES;
            if (wipe) {
                dataSource = [extract URLByAppendingPathComponent:app.identifier isDirectory:YES];
                if (![fm createDirectoryAtURL:dataSource
                        withIntermediateDirectories:NO
                                         attributes:@{NSFilePosixPermissions : @0700}
                                              error:error])
                    return NO;
                for (NSString *directory in
                     @[ @"Documents", @"Library/Preferences", @"Library/Caches", @"tmp" ])
                    if (![fm createDirectoryAtURL:[dataSource URLByAppendingPathComponent:directory]
                            withIntermediateDirectories:YES
                                             attributes:@{NSFilePosixPermissions : @0700}
                                                  error:error])
                        return NO;
            } else {
                progress(@"检查归档并完整解压到隔离目录");
                if (![AMExtraction extract:archive toEmptyDirectory:extract error:error])
                    return NO;
                NSDictionary *info = [NSDictionary
                    dictionaryWithContentsOfURL:[extract
                                                    URLByAppendingPathComponent:@"Binfo.plist"]];
                if (![info[@"id"] isKindOfClass:NSString.class] ||
                    ![info[@"id"] isEqual:app.identifier]) {
                    if (error)
                        *error = AMError(95, @"备份的应用标识不匹配，未修改数据");
                    return NO;
                }
                dataSource = [extract URLByAppendingPathComponent:app.identifier isDirectory:YES];
                NSURL *privateURL = [extract URLByAppendingPathComponent:@"__private_info"];
                NSDictionary *attributes = [fm attributesOfItemAtPath:privateURL.path error:error];
                if (!attributes || [attributes[NSFileSize] unsignedLongLongValue] > 67108864) {
                    if (error)
                        *error = AMError(104, @"私有信息容器缺失或超过 64 MB 限制");
                    return NO;
                }
                NSData *private = [NSData dataWithContentsOfURL:privateURL options:0 error:error];
                AMPrivateSlice slices[3];
                if (!private || AMPrivateDecode(private.bytes, private.length, slices)) {
                    if (error)
                        *error = AMError(96, @"原版私有信息容器校验失败");
                    return NO;
                }
                NSDictionary *oldEntitlements =
                    ReadPlist([NSData dataWithBytes:slices[2].data length:slices[2].size], error);
                if (!oldEntitlements)
                    return NO;
                NSDictionary *manifest =
                    [NSDictionary dictionaryWithContentsOfURL:
                                      [extract URLByAppendingPathComponent:@"AMManifest.plist"]];
                if (manifest) {
                    if (![manifest[@"Format"] isEqual:@"AppsManagerRebuilt"] ||
                        ![manifest[@"Version"] isEqual:@1] ||
                        ![manifest[@"IncludesKeychain"] isKindOfClass:NSNumber.class]) {
                        if (error)
                            *error = AMError(105, @"维护版备份清单无效或版本不支持");
                        return NO;
                    }
                    includeKeychain = [manifest[@"IncludesKeychain"] boolValue];
                }
                if (includeKeychain && ![oldEntitlements[@"application-identifier"]
                                           isEqual:app.entitlements[@"application-identifier"]]) {
                    if (error)
                        *error = AMError(
                            97, @"签名身份不一致。跨团队钥匙串映射尚未完成真机验证，未修改数据");
                    return NO;
                }
                if (![[NSData dataWithBytes:slices[0].data
                                     length:slices[0].size] writeToURL:keychain
                                                               options:NSDataWritingAtomic
                                                                 error:error])
                    return NO;
                chmod(keychain.fileSystemRepresentation, 0600);
                NSURL *pasteboards = [extract URLByAppendingPathComponent:@"__pasteboards__"
                                                              isDirectory:YES];
                NSArray *pb = [fm contentsOfDirectoryAtURL:pasteboards
                                includingPropertiesForKeys:nil
                                                   options:0
                                                     error:nil];
                if (pb.count) {
                    if (error)
                        *error = AMError(
                            98,
                            @"归档包含专属剪贴板。该部分恢复尚未完成真机验证，本次未修改目标数据");
                    return NO;
                }
                NSURL *legacyPreferences = [extract
                    URLByAppendingPathComponent:[app.identifier stringByAppendingString:@".plist"]];
                if ([fm fileExistsAtPath:legacyPreferences.path]) {
                    NSURL *preferences =
                        [dataSource URLByAppendingPathComponent:@"Library/Preferences"
                                                    isDirectory:YES];
                    if (![fm createDirectoryAtURL:preferences
                            withIntermediateDirectories:YES
                                             attributes:@{NSFilePosixPermissions : @0700}
                                                  error:error])
                        return NO;
                    NSData *value = [NSData dataWithContentsOfURL:legacyPreferences
                                                          options:0
                                                            error:error];
                    if (!value ||
                        ![value writeToURL:[preferences
                                               URLByAppendingPathComponent:legacyPreferences
                                                                               .lastPathComponent]
                                   options:NSDataWritingAtomic
                                     error:error])
                        return NO;
                }
            }
            if (includeKeychain) {
                progress(@"预检钥匙串并保存当前快照");
                if (!wipe &&
                    ![AMKeychain operate:@"validate"
                             application:app
                                   input:keychain
                                 mapping:nil
                                  output:[work URLByAppendingPathComponent:@"Validation.plist"]
                                   error:error])
                    return NO;
                if (![AMKeychain backupApplication:app output:previousKeychain error:error])
                    return NO;
            }
            NSMutableArray *moves = [NSMutableArray array], *retained = [NSMutableArray array];
            if (!PrepareContainer(app.dataURL, dataSource, token, moves, retained,
                                  preferenceChanges, error))
                return NO;
            for (NSString *kind in @[ @"___groups___", @"___extensions___" ]) {
                NSDictionary *targets =
                    [kind isEqualToString:@"___groups___"] ? app.groupURLs : app.extensionURLs;
                NSURL *sources = [extract URLByAppendingPathComponent:kind isDirectory:YES];
                NSArray<NSURL *> *items = @[];
                if (!wipe && [fm fileExistsAtPath:sources.path]) {
                    items = [fm contentsOfDirectoryAtURL:sources
                              includingPropertiesForKeys:nil
                                                 options:0
                                                   error:error];
                    if (!items)
                        return NO;
                }
                if (wipe) {
                    if (![fm createDirectoryAtURL:sources
                            withIntermediateDirectories:YES
                                             attributes:@{NSFilePosixPermissions : @0700}
                                                  error:error])
                        return NO;
                    NSMutableArray *empty = [NSMutableArray array];
                    for (NSString *key in targets) {
                        NSURL *item = [sources URLByAppendingPathComponent:key isDirectory:YES];
                        if (![fm createDirectoryAtURL:item
                                withIntermediateDirectories:NO
                                                 attributes:@{NSFilePosixPermissions : @0700}
                                                      error:error])
                            return NO;
                        [empty addObject:item];
                    }
                    items = empty;
                }
                for (NSURL *item in items) {
                    NSURL *target = targets[item.lastPathComponent];
                    if (!target) {
                        if (error)
                            *error = AMError(99, @"备份含当前应用没有的共享或扩展容器，未开始替换");
                        return NO;
                    }
                    if (!PrepareContainer(target, item, token, moves, retained, preferenceChanges,
                                          error))
                        return NO;
                }
            }
            plan = [moves copy];
            journal[@"moves"] = plan;
            journal[@"retainedDirectories"] = retained;
            journal[@"preferences"] = preferenceChanges;
            journal[@"keychainSnapshot"] = previousKeychain.path;
            journal[@"includesKeychain"] = @(includeKeychain);
            journal[@"state"] = @"movingFiles";
            if (!WriteJournal(journal, journalURL, error))
                return NO;
            nativeMoves = calloc(plan.count, sizeof(*nativeMoves));
            if (!nativeMoves && plan.count) {
                if (error)
                    *error = AMError(12, @"无法分配恢复计划");
                return NO;
            }
            for (NSUInteger i = 0; i < plan.count; i++) {
                nativeMoves[i].from = [plan[i][@"from"] fileSystemRepresentation];
                nativeMoves[i].to = [plan[i][@"to"] fileSystemRepresentation];
            }
            progress(@"替换数据并保留原目录内容");
            attemptedFiles = YES;
            result = AMMovesExecute(nativeMoves, plan.count, NULL, Persist, &context);
            if (result.error) {
                if (error)
                    *error = AMError(
                        result.error,
                        [NSString
                            stringWithFormat:@"数据替换失败。文件回退状态：%@。记录：%@",
                                             result.rollbackError ? @"需要人工检查" : @"已回退",
                                             work.path]);
                return NO;
            }
            journal[@"state"] = @"changingPreferences";
            journal[@"preferencesMayHaveChanged"] = @YES;
            if (!WriteJournal(journal, journalURL, error))
                return NO;
            preferencesAttempted = YES;
            for (NSDictionary *change in preferenceChanges)
                if (![AMPreferences writeDomain:change[@"domain"]
                                      container:[NSURL fileURLWithPath:change[@"container"]
                                                           isDirectory:YES]
                                         values:change[@"new"]
                                          error:error])
                    return NO;
            if (includeKeychain) {
                journal[@"state"] = @"changingKeychain";
                journal[@"keychainMayHaveChanged"] = @YES;
                if (!WriteJournal(journal, journalURL, error))
                    return NO;
                keychainAttempted = YES;
                if (![AMKeychain operate:wipe ? @"wipe" : @"restore"
                             application:app
                                   input:wipe ? nil : keychain
                                 mapping:nil
                                  output:[work URLByAppendingPathComponent:@"KeychainResult.plist"]
                                   error:error])
                    return NO;
            }
            journal[@"state"] = @"completed";
            if (!WriteJournal(journal, journalURL, error))
                return NO;
            success = YES;
        } @catch (NSException *exception) {
            if (error)
                *error = AMError(
                    119, [NSString stringWithFormat:@"系统接口发生异常（%@）；保留恢复记录：%@",
                                                    exception.name, work.path]);
            return NO;
        } @finally {
            if (!success) {
                BOOL rolledBack = YES;
                if (keychainAttempted) {
                    NSError *failure = nil;
                    rolledBack = [AMKeychain
                            operate:@"restore"
                        application:app
                              input:previousKeychain
                            mapping:nil
                             output:[work
                                        URLByAppendingPathComponent:@"KeychainRollbackResult.plist"]
                              error:&failure];
                    if (!rolledBack && error)
                        *error = AMError(
                            100,
                            [NSString stringWithFormat:@"钥匙串回退失败：%@；保留记录：%@",
                                                       failure.localizedDescription, work.path]);
                }
                if (attemptedFiles && result.completed) {
                    AMMoveResult rollback =
                        AMMovesRollback(nativeMoves, result.completed, NULL, Persist, &context);
                    if (rollback.rollbackError) {
                        rolledBack = NO;
                        if (error)
                            *error = AMError(
                                101,
                                [NSString
                                    stringWithFormat:@"文件回退未完成（%d）。保留原数据和日志：%@",
                                                     rollback.rollbackError, work.path]);
                    }
                }
                if (preferencesAttempted)
                    for (NSDictionary *change in preferenceChanges) {
                        NSError *failure = nil;
                        if (![AMPreferences writeDomain:change[@"domain"]
                                              container:[NSURL fileURLWithPath:change[@"container"]
                                                                   isDirectory:YES]
                                                 values:change[@"old"]
                                                  error:&failure]) {
                            rolledBack = NO;
                            if (error)
                                *error = AMError(
                                    120,
                                    [NSString
                                        stringWithFormat:@"偏好设置回退失败：%@；保留记录：%@",
                                                         failure.localizedDescription, work.path]);
                        }
                    }
                journal[@"state"] = attemptedFiles ? (rolledBack ? @"rolledBack" : @"needsRecovery")
                                                   : @"preflightFailed";
                if (!WriteJournal(journal, journalURL, NULL) && error && !*error)
                    *error = AMError(102, @"恢复日志写入失败，请保留 Recovery 目录");
            }
            free(nativeMoves);
        }
        return success;
    }
}
@end
