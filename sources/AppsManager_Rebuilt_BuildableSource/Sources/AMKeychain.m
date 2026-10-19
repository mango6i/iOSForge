#import "AMKeychain.h"
#include <spawn.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <unistd.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
extern char **environ;
static BOOL Run(NSString *path, NSArray<NSString *> *arguments, NSError **error) {
    __attribute__((objc_precise_lifetime)) NSMutableArray<NSString *> *all =
        [NSMutableArray arrayWithObject:path];
    [all addObjectsFromArray:arguments];
    char **argv = calloc(all.count + 1, sizeof(char *));
    if (!argv) {
        if (error)
            *error = AMError(12, @"无法分配进程参数");
        return NO;
    }
    for (NSUInteger i = 0; i < all.count; i++)
        argv[i] = (char *)all[i].fileSystemRepresentation;
    pid_t pid = -1;
    int r = posix_spawn(&pid, path.fileSystemRepresentation, NULL, NULL, argv, environ);
    free(argv);
    if (r || pid <= 0) {
        int failure = r ?: EINVAL;
        if (error)
            *error = AMError(failure, [NSString stringWithFormat:@"无法启动 %@：%s（%d）",
                                                                 path.lastPathComponent,
                                                                 strerror(failure), failure]);
        return NO;
    }
    int status = 0;
    pid_t waited;
    do {
        waited = waitpid(pid, &status, 0);
    } while (waited < 0 && errno == EINTR);
    if (waited != pid || !WIFEXITED(status) || WEXITSTATUS(status) != 0) {
        NSString *why =
            waited != pid ? [NSString stringWithFormat:@"等待失败（%d）", errno]
            : WIFSIGNALED(status)
                ? [NSString stringWithFormat:@"被信号 %d 终止", WTERMSIG(status)]
                : [NSString
                      stringWithFormat:@"退出码 %d", WIFEXITED(status) ? WEXITSTATUS(status) : -1];
        if (error)
            *error =
                AMError(20, [NSString stringWithFormat:@"%@：%@", path.lastPathComponent, why]);
        return NO;
    }
    return YES;
}
static NSURL *Signer(BOOL *fast) {
    NSURL *original = [AMApplicationRegistry originalSignerURL];
    if (original) {
        *fast = YES;
        return original;
    }
    *fast = NO;
    for (NSString *path in @[
             @"/var/jb/usr/bin/ldid", @"/usr/bin/ldid", @"/usr/local/bin/ldid", @"/usr/libexec/ldid"
         ])
        if (access(path.fileSystemRepresentation, X_OK) == 0)
            return [NSURL fileURLWithPath:path];
    return nil;
}
@implementation AMKeychain
+ (NSString *)signerDescription {
    BOOL fast = NO;
    NSURL *url = Signer(&fast);
    return url ? [NSString stringWithFormat:@"%@：%@", fast ? @"fastPathSign" : @"ldid", url.path]
               : @"未找到运行时签名工具";
}
+ (BOOL)backupApplication:(AMApplication *)app output:(NSURL *)output error:(NSError **)error {
    return [self operate:@"backup" application:app input:nil mapping:nil output:output error:error];
}
+ (BOOL)operate:(NSString *)command
    application:(AMApplication *)app
          input:(NSURL *)input
        mapping:(NSDictionary *)mapping
         output:(NSURL *)output
          error:(NSError **)error {
    if (app.keychainResolutionError) {
        if (error)
            *error = app.keychainResolutionError;
        return NO;
    }
    BOOL fast = NO;
    NSURL *signer = Signer(&fast);
    if (!signer) {
        if (error)
            *error = AMError(30, @"没有可用的钥匙串助手签名工具。可保留已安装原版 AppsManager 提供 "
                                 @"fastPathSign，或使用当前越狱环境的 ldid。");
        return NO;
    }
    NSURL *source = [NSBundle.mainBundle URLForResource:@"AMKeychainHelper" withExtension:nil];
    if (!source) {
        if (error)
            *error = AMError(31, @"安装包内缺少从源码编译的 AMKeychainHelper");
        return NO;
    }
    id rawAppID = app.entitlements[@"application-identifier"];
    NSString *appID = [rawAppID isKindOfClass:NSString.class] ? rawAppID : nil;
    NSMutableArray *groups = [NSMutableArray array];
    if (app.keychainGroups)
        [groups addObjectsFromArray:app.keychainGroups];
    id rawGroups = app.entitlements[@"keychain-access-groups"];
    if ([rawGroups isKindOfClass:NSArray.class])
        for (id group in rawGroups)
            if ([group isKindOfClass:NSString.class] && [group length] &&
                ![group containsString:@"*"] && ![groups containsObject:group])
                [groups addObject:group];
    if ([appID isKindOfClass:NSString.class] && appID.length && ![groups containsObject:appID])
        [groups addObject:appID];
    if (!groups.count) {
        if (error)
            *error = AMError(32, @"目标应用没有可确认的钥匙串访问组，不能生成完整钥匙串备份");
        return NO;
    }
    NSFileManager *fm = NSFileManager.defaultManager;
    NSURL *work = [fm.temporaryDirectory
        URLByAppendingPathComponent:[@"AMKeychain-" stringByAppendingString:NSUUID.UUID.UUIDString]
                        isDirectory:YES];
    if (![fm createDirectoryAtURL:work
            withIntermediateDirectories:YES
                             attributes:@{NSFilePosixPermissions : @0700}
                                  error:error])
        return NO;
    BOOL success = NO;
    @try {
        NSURL *helper = [work URLByAppendingPathComponent:@"AMKeychainHelper"];
        NSURL *entitlementsURL = [work URLByAppendingPathComponent:@"entitlements.plist"];
        NSURL *requestURL = [work URLByAppendingPathComponent:@"request.plist"];
        if (![fm copyItemAtURL:source toURL:helper error:error])
            return NO;
        NSMutableDictionary *entitlements = [@{
            @"platform-application" : @YES,
            @"com.apple.private.security.no-container" : @YES,
            @"com.apple.private.security.container-required" : @NO,
            @"keychain-access-groups" : groups
        } mutableCopy];
        if (appID.length)
            entitlements[@"application-identifier"] = appID;
        id appGroups = app.entitlements[@"com.apple.security.application-groups"];
        if (appGroups)
            entitlements[@"com.apple.security.application-groups"] = appGroups;
        NSData *entData =
            [NSPropertyListSerialization dataWithPropertyList:entitlements
                                                       format:NSPropertyListXMLFormat_v1_0
                                                      options:0
                                                        error:error];
        NSMutableDictionary *payload = [@{@"groups" : groups} mutableCopy];
        if (input)
            payload[@"input"] = input.path;
        if (mapping)
            payload[@"mapping"] = mapping;
        NSData *request =
            [NSPropertyListSerialization dataWithPropertyList:payload
                                                       format:NSPropertyListBinaryFormat_v1_0
                                                      options:0
                                                        error:error];
        if (!entData || !request ||
            ![entData writeToURL:entitlementsURL options:NSDataWritingAtomic error:error] ||
            ![request writeToURL:requestURL options:NSDataWritingAtomic error:error])
            return NO;
        chmod(entitlementsURL.fileSystemRepresentation, 0600);
        chmod(requestURL.fileSystemRepresentation, 0600);
        NSArray *args =
            fast ? @[ @"--entitlements", entitlementsURL.path, helper.path ]
                 : @[ [@"-S" stringByAppendingString:entitlementsURL.path], helper.path ];
        if (!Run(signer.path, args, error))
            return NO;
        if (chmod(helper.fileSystemRepresentation, 0755) != 0 ||
            access(helper.fileSystemRepresentation, X_OK) != 0) {
            if (error)
                *error = AMError(errno, [NSString stringWithFormat:@"无法设置助手执行权限：%s",
                                                                   strerror(errno)]);
            return NO;
        }
        if (!Run(helper.path, @[ command, requestURL.path, output.path ], error)) {
            NSString *detail =
                [NSString stringWithContentsOfFile:[output.path stringByAppendingString:@".error"]
                                          encoding:NSUTF8StringEncoding
                                             error:nil];
            if (detail.length && error)
                *error = AMError(33, detail);
            return NO;
        }
        id result = [NSDictionary dictionaryWithContentsOfURL:output];
        if (![result isKindOfClass:NSDictionary.class] ||
            (![command isEqualToString:@"backup"] && ![result[@"success"] boolValue] &&
             ![result[@"validated"] boolValue])) {
            if (error)
                *error = AMError(34, @"助手未生成有效的钥匙串结果文件");
            return NO;
        }
        chmod(output.fileSystemRepresentation, 0600);
        success = YES;
    } @finally {
        [fm removeItemAtURL:work error:nil];
    }
    return success;
}
@end
