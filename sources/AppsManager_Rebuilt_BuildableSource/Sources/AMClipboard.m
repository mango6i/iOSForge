/* Original BackupList backupPasteboardWithTeamID: contract (iOS 10+).
 * Parse the keyed archive as a property list; never instantiate private classes.
 */
#import "AMClipboard.h"
#import "AMModels.h"
#include <dlfcn.h>
#include <sys/stat.h>
typedef CFTypeID (*UIDType)(void);
typedef uint32_t (*UIDValue)(CFTypeRef);
static id Dereference(id value, NSArray *objects) {
    UIDType type = (UIDType)dlsym(RTLD_DEFAULT, "_CFKeyedArchiverUIDGetTypeID");
    UIDValue get = (UIDValue)dlsym(RTLD_DEFAULT, "_CFKeyedArchiverUIDGetValue");
    if (type && get && value && CFGetTypeID((__bridge CFTypeRef)value) == type()) {
        uint32_t index = get((__bridge CFTypeRef)value);
        return index < objects.count ? objects[index] : nil;
    }
    return value;
}
@implementation AMClipboard
+ (NSArray<NSURL *> *)directoriesForTeam:(NSString *)team error:(NSError **)error {
    if (!team.length) {
        if (error)
            *error = AMError(80, @"无法确认签名团队，不能确认专属剪贴板范围");
        return nil;
    }
    NSFileManager *fm = NSFileManager.defaultManager;
    NSURL *root = [NSURL fileURLWithPath:@"/var/mobile/Library/Caches/com.apple.Pasteboard"
                             isDirectory:YES];
    if (![fm fileExistsAtPath:root.path])
        return @[];
    NSArray<NSURL *> *items = [fm contentsOfDirectoryAtURL:root
                                includingPropertiesForKeys:nil
                                                   options:0
                                                     error:error];
    if (!items)
        return nil;
    NSMutableArray *selected = [NSMutableArray array];
    for (NSURL *url in items) {
        struct stat st;
        if (lstat(url.fileSystemRepresentation, &st)) {
            if (error)
                *error = AMError(81, @"无法检查剪贴板目录");
            return nil;
        }
        if (!S_ISDIR(st.st_mode))
            continue;
        NSURL *manifest = [url URLByAppendingPathComponent:@"Manifest.plist"];
        if (![fm fileExistsAtPath:manifest.path])
            continue;
        NSData *data = [NSData dataWithContentsOfURL:manifest options:0 error:error];
        if (!data)
            return nil;
        id plist = [NSPropertyListSerialization propertyListWithData:data
                                                             options:NSPropertyListImmutable
                                                              format:NULL
                                                               error:error];
        NSArray *objects = [plist isKindOfClass:NSDictionary.class] ? plist[@"$objects"] : nil;
        if (![objects isKindOfClass:NSArray.class]) {
            if (error)
                *error = AMError(82, @"剪贴板 Manifest 格式尚未识别，完整备份已停止");
            return nil;
        }
        NSString *owner = nil;
        for (id object in objects)
            if ([object isKindOfClass:NSDictionary.class]) {
                for (id key in object)
                    if ([key isKindOfClass:NSString.class] &&
                        [key caseInsensitiveCompare:@"originatorTeamID"] == NSOrderedSame) {
                        id candidate = Dereference(object[key], objects);
                        if ([candidate isKindOfClass:NSString.class])
                            owner = candidate;
                    }
            }
        if (!owner) {
            if (error)
                *error = AMError(83, @"无法确认剪贴板所属团队，完整备份已停止");
            return nil;
        }
        if ([owner isEqualToString:team])
            [selected addObject:url];
    }
    return selected;
}
@end
