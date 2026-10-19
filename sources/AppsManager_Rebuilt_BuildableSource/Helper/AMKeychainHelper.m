/* Rebuilt helper; original FileContainer access-control serialization retained.
 * A durable snapshot precedes mutation. No original executable is embedded.
 */
#import <Foundation/Foundation.h>
#import <Security/Security.h>
#import <LocalAuthentication/LocalAuthentication.h>
#include <dlfcn.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
typedef CFDataRef (*CopyControl)(SecAccessControlRef);
typedef SecAccessControlRef (*CreateControl)(CFAllocatorRef, CFDataRef, CFErrorRef *);
static NSError *Failure(NSInteger code, NSString *text) {
    return [NSError errorWithDomain:@"AMKeychainHelper"
                               code:code
                           userInfo:@{NSLocalizedDescriptionKey : text}];
}
static NSArray *Classes(void) {
    return @[
        (__bridge id)kSecClassGenericPassword, (__bridge id)kSecClassInternetPassword,
        (__bridge id)kSecClassCertificate, (__bridge id)kSecClassKey, (__bridge id)kSecClassIdentity
    ];
}
static BOOL Save(id value, NSString *path, NSError **error) {
    NSData *data = [NSPropertyListSerialization dataWithPropertyList:value
                                                              format:NSPropertyListBinaryFormat_v1_0
                                                             options:0
                                                               error:error];
    if (!data || ![data writeToFile:path options:NSDataWritingAtomic error:error])
        return NO;
    if (chmod(path.fileSystemRepresentation, 0600)) {
        if (error)
            *error = Failure(1, @"无法限制钥匙串结果文件权限");
        return NO;
    }
    int fd = open(path.fileSystemRepresentation, O_RDWR | O_NOFOLLOW);
    if (fd < 0) {
        if (error)
            *error = Failure(2, @"无法打开钥匙串结果文件");
        return NO;
    }
    BOOL ok = fsync(fd) == 0;
    if (close(fd))
        ok = NO;
    if (!ok && error)
        *error = Failure(3, @"钥匙串结果文件落盘失败");
    return ok;
}
static NSDictionary *Serialize(NSDictionary *item, NSError **error) {
    NSMutableDictionary *record = [item mutableCopy];
    id control = record[(__bridge id)kSecAttrAccessControl];
    if (control) {
        CopyControl copy = (CopyControl)dlsym(RTLD_DEFAULT, "SecAccessControlCopyData");
        CFDataRef data = copy ? copy((__bridge SecAccessControlRef)control) : NULL;
        if (!data) {
            if (error)
                *error = Failure(4, @"无法序列化钥匙串访问控制，备份已停止");
            return nil;
        }
        record[@"__accc__data__"] = CFBridgingRelease(data);
        [record removeObjectForKey:(__bridge id)kSecAttrAccessControl];
    }
    if (![NSPropertyListSerialization propertyList:record
                                  isValidForFormat:NSPropertyListBinaryFormat_v1_0]) {
        if (error)
            *error = Failure(5, @"钥匙串记录包含不支持的类型，备份已停止");
        return nil;
    }
    return record;
}
static NSDictionary *Snapshot(NSArray *groups, NSError **error) {
    NSMutableDictionary *backup = [NSMutableDictionary dictionary];
    LAContext *context = [LAContext new];
    context.interactionNotAllowed = YES;
    for (id type in Classes()) {
        NSMutableArray *entries = [NSMutableArray array];
        for (NSString *group in groups) {
            BOOL identity = [type isEqual:(__bridge id)kSecClassIdentity];
            NSDictionary *query = @{
                (__bridge id)kSecClass : type,
                (__bridge id)kSecAttrAccessGroup : group,
                (__bridge id)kSecReturnAttributes : @YES,
                (identity ? (__bridge id)kSecReturnRef : (__bridge id)kSecReturnData) : @YES,
                (__bridge id)kSecMatchLimit : (__bridge id)kSecMatchLimitAll,
                (__bridge id)kSecUseAuthenticationContext : context
            };
            CFTypeRef raw = NULL;
            OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &raw);
            id found = CFBridgingRelease(raw);
            if (status == errSecItemNotFound)
                continue;
            if (status != errSecSuccess) {
                if (error)
                    *error = Failure(
                        status, [NSString stringWithFormat:@"读取目标钥匙串失败（%d），未发布备份",
                                                           (int)status]);
                return nil;
            }
            if (identity) {
                if (error)
                    *error = Failure(
                        6, @"检测到身份凭据。该类记录尚未完成恢复验证，已停止备份；未修改原数据");
                return nil;
            }
            NSArray *items = [found isKindOfClass:NSArray.class]        ? found
                             : [found isKindOfClass:NSDictionary.class] ? @[ found ]
                                                                        : nil;
            if (!items) {
                if (error)
                    *error = Failure(7, @"钥匙串返回了无法确认的记录格式");
                return nil;
            }
            for (id item in items) {
                if (![item isKindOfClass:NSDictionary.class]) {
                    if (error)
                        *error = Failure(8, @"钥匙串记录格式无效");
                    return nil;
                }
                NSDictionary *record = Serialize(item, error);
                if (!record)
                    return nil;
                [entries addObject:record];
            }
        }
        backup[type] = entries;
    }
    return backup;
}
static NSArray *Prepare(NSDictionary *backup, NSArray *groups, NSDictionary *mapping,
                        NSError **error) {
    if (![backup isKindOfClass:NSDictionary.class]) {
        if (error)
            *error = Failure(9, @"钥匙串备份不是字典");
        return nil;
    }
    NSMutableArray *prepared = [NSMutableArray array];
    NSArray *classes = Classes();
    for (id type in backup) {
        if (![classes containsObject:type] || ![backup[type] isKindOfClass:NSArray.class]) {
            if (error)
                *error = Failure(10, @"钥匙串备份含未知类别");
            return nil;
        }
        for (id item in backup[type]) {
            if (![item isKindOfClass:NSDictionary.class]) {
                if (error)
                    *error = Failure(11, @"钥匙串备份含无效记录");
                return nil;
            }
            if ([type isEqual:(__bridge id)kSecClassIdentity]) {
                if (error)
                    *error = Failure(12, @"身份凭据恢复尚未完成验证，未修改数据");
                return nil;
            }
            NSMutableDictionary *record = [item mutableCopy];
            id original = record[(__bridge id)kSecAttrAccessGroup];
            id group =
                [original isKindOfClass:NSString.class] ? (mapping[original] ?: original) : nil;
            if (!group || ![groups containsObject:group]) {
                if (error)
                    *error = Failure(13, @"备份钥匙串访问组不属于当前目标，未修改数据");
                return nil;
            }
            record[(__bridge id)kSecAttrAccessGroup] = group;
            record[(__bridge id)kSecClass] = type;
            for (id key in @[
                     (__bridge id)kSecValuePersistentRef, @"persistref", @"certdata",
                     (__bridge id)kSecValueRef
                 ])
                [record removeObjectForKey:key];
            id control = record[@"__accc__data__"];
            if (control) {
                CreateControl create =
                    (CreateControl)dlsym(RTLD_DEFAULT, "SecAccessControlCreateFromData");
                CFErrorRef cfError = NULL;
                SecAccessControlRef access =
                    [control isKindOfClass:NSData.class] && create
                        ? create(kCFAllocatorDefault, (__bridge CFDataRef)control, &cfError)
                        : NULL;
                if (cfError)
                    CFRelease(cfError);
                if (!access) {
                    if (error)
                        *error = Failure(14, @"无法还原钥匙串访问控制，未修改数据");
                    return nil;
                }
                record[(__bridge id)kSecAttrAccessControl] = CFBridgingRelease(access);
                [record removeObjectForKey:(__bridge id)kSecAttrAccessible];
                [record removeObjectForKey:@"__accc__data__"];
            }
            [prepared addObject:record];
        }
    }
    return prepared;
}
static BOOL Clear(NSArray *groups, NSError **error) {
    for (id type in Classes()) {
        if ([type isEqual:(__bridge id)kSecClassIdentity])
            continue;
        for (NSString *group in groups) {
            NSDictionary *query =
                @{(__bridge id)kSecClass : type, (__bridge id)kSecAttrAccessGroup : group};
            OSStatus status = SecItemDelete((__bridge CFDictionaryRef)query);
            if (status != errSecSuccess && status != errSecItemNotFound) {
                if (error)
                    *error = Failure(status, [NSString stringWithFormat:@"清理目标钥匙串失败（%d）",
                                                                        (int)status]);
                return NO;
            }
        }
    }
    return YES;
}
static BOOL Add(NSArray *records, NSError **error) {
    for (NSDictionary *record in records) {
        OSStatus status = SecItemAdd((__bridge CFDictionaryRef)record, NULL);
        if (status != errSecSuccess) {
            if (error)
                *error = Failure(
                    status, [NSString stringWithFormat:@"恢复钥匙串记录失败（%d）", (int)status]);
            return NO;
        }
    }
    return YES;
}
int main(int argc, char **argv) {
    @autoreleasepool {
        umask(077);
        if (argc != 4)
            return 64;
        NSString *command = @(argv[1]), *output = @(argv[3]);
        NSError *error = nil;
        NSDictionary *request = [NSDictionary dictionaryWithContentsOfFile:@(argv[2])];
        NSArray *groups = request[@"groups"];
        if (![groups isKindOfClass:NSArray.class] || !groups.count)
            return 65;
        for (id group in groups)
            if (![group isKindOfClass:NSString.class] || ![group length] ||
                [group containsString:@"*"])
                return 65;
        BOOL success = NO;
        if ([command isEqualToString:@"backup"]) {
            NSDictionary *backup = Snapshot(groups, &error);
            success = backup && Save(backup, output, &error);
        } else if ([@[ @"restore", @"validate", @"wipe" ] containsObject:command]) {
            NSString *inputPath =
                [request[@"input"] isKindOfClass:NSString.class] ? request[@"input"] : nil;
            NSDictionary *input = [command isEqualToString:@"wipe"] ? @{}
                                  : inputPath
                                      ? [NSDictionary dictionaryWithContentsOfFile:inputPath]
                                      : nil;
            NSDictionary *mapping =
                [request[@"mapping"] isKindOfClass:NSDictionary.class] ? request[@"mapping"] : @{};
            NSArray *prepared = Prepare(input, groups, mapping, &error);
            if (prepared && [command isEqualToString:@"validate"])
                success = Save(@{@"validated" : @YES}, output, &error);
            else if (prepared) {
                NSDictionary *previous = Snapshot(groups, &error);
                NSArray *rollback = previous ? Prepare(previous, groups, @{}, &error) : nil;
                NSString *journal = [output stringByAppendingString:@".rollback.plist"];
                if (rollback && Save(previous, journal, &error)) {
                    success = Clear(groups, &error) && Add(prepared, &error);
                    if (success)
                        success = Save(@{@"success" : @YES}, output, &error);
                    if (!success) {
                        NSError *rollbackError = nil;
                        BOOL rolledBack =
                            Clear(groups, &rollbackError) && Add(rollback, &rollbackError);
                        if (!rolledBack)
                            error = Failure(
                                15,
                                [NSString
                                    stringWithFormat:@"%@；钥匙串回退也失败：%@。原快照保留在 %@",
                                                     error.localizedDescription,
                                                     rollbackError.localizedDescription, journal]);
                    }
                }
            }
        } else
            return 64;
        if (!success) {
            [(error.localizedDescription
                  ?: @"钥匙串操作失败") writeToFile:[output stringByAppendingString:@".error"]
                                         atomically:YES
                                           encoding:NSUTF8StringEncoding
                                              error:nil];
            chmod([[output stringByAppendingString:@".error"] fileSystemRepresentation], 0600);
            return 1;
        }
        return 0;
    }
}
