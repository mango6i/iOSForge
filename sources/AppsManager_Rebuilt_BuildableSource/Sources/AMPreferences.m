#import "AMPreferences.h"
#import "AMModels.h"
#include <sys/stat.h>
/* Same private container initializer used by the original BackupList and plist editor. */
@interface NSUserDefaults (AMContainer)
- (instancetype)_initWithSuiteName:(NSString *)name container:(NSURL *)url;
@end
static NSUserDefaults *Defaults(NSString *domain, NSURL *container, NSError **error) {
    struct stat st;
    if (![domain isKindOfClass:NSString.class] || !domain.length ||
        ![domain.lastPathComponent isEqual:domain] || [domain isEqual:@"."] ||
        [domain isEqual:@".."] || [domain containsString:@"\\"] ||
        [domain rangeOfCharacterFromSet:NSCharacterSet.controlCharacterSet].location !=
            NSNotFound ||
        !container.isFileURL || lstat(container.fileSystemRepresentation, &st) ||
        !S_ISDIR(st.st_mode)) {
        if (error)
            *error = AMError(109, @"偏好设置域或容器无效，未修改数据");
        return nil;
    }
    NSUserDefaults *allocated = [NSUserDefaults alloc];
    if (![allocated respondsToSelector:@selector(_initWithSuiteName:container:)]) {
        if (error)
            *error = AMError(110, @"当前系统不支持容器偏好设置接口，未修改数据");
        return nil;
    }
    NSUserDefaults *defaults = [allocated _initWithSuiteName:domain container:container];
    if (!defaults && error)
        *error = AMError(111, @"无法初始化容器偏好设置");
    return defaults;
}
@implementation AMPreferences
+ (NSDictionary *)readDomain:(NSString *)domain
                   container:(NSURL *)container
                       error:(NSError **)error {
    @try {
        NSUserDefaults *defaults = Defaults(domain, container, error);
        if (!defaults)
            return nil;
        if (![defaults synchronize]) {
            if (error)
                *error = AMError(112, @"无法同步容器偏好设置，已停止操作");
            return nil;
        }
        return [defaults persistentDomainForName:domain] ?: @{};
    } @catch (NSException *exception) {
        if (error)
            *error = AMError(
                108, [NSString stringWithFormat:@"读取偏好设置接口异常（%@）", exception.name]);
        return nil;
    }
}
+ (BOOL)writeDomain:(NSString *)domain
          container:(NSURL *)container
             values:(NSDictionary *)values
              error:(NSError **)error {
    @try {
        if (![values isKindOfClass:NSDictionary.class] ||
            ![NSPropertyListSerialization propertyList:values
                                      isValidForFormat:NSPropertyListBinaryFormat_v1_0]) {
            if (error)
                *error = AMError(113, @"偏好设置不是有效字典");
            return NO;
        }
        NSUserDefaults *defaults = Defaults(domain, container, error);
        if (!defaults)
            return NO;
        [defaults setPersistentDomain:values forName:domain];
        if (![defaults synchronize]) {
            if (error)
                *error = AMError(114, @"写入容器偏好设置失败");
            return NO;
        }
        NSDictionary *readback = [defaults persistentDomainForName:domain] ?: @{};
        NSURL *file = [container
            URLByAppendingPathComponent:[NSString stringWithFormat:@"Library/Preferences/%@.plist",
                                                                   domain]];
        NSDictionary *disk = [NSDictionary dictionaryWithContentsOfURL:file];
        if (!disk && ![NSFileManager.defaultManager fileExistsAtPath:file.path])
            disk = @{};
        if (![readback isEqual:values] || ![disk isEqual:values]) {
            if (error)
                *error = AMError(115, @"偏好设置内存或磁盘读回不一致");
            return NO;
        }
        return YES;
    } @catch (NSException *exception) {
        if (error)
            *error = AMError(
                107, [NSString stringWithFormat:@"写入偏好设置接口异常（%@）", exception.name]);
        return NO;
    }
}
@end
