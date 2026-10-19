/* Rebuilt source from the recovered ApplicationItem/AppsTableViewController contracts. */
#import "AMModels.h"
#import <objc/message.h>
id AMRead(id object, NSString *key) {
    if (!object)
        return nil;
    @try {
        return [object valueForKey:key];
    } @catch (NSException *e) {
        (void)e;
        return nil;
    }
}
NSError *AMError(NSInteger code, NSString *description) {
    return [NSError errorWithDomain:@"AppsManagerRebuilt"
                               code:code
                           userInfo:@{NSLocalizedDescriptionKey : description}];
}
static NSArray *AMProxies(void) {
    Class workspace = NSClassFromString(@"LSApplicationWorkspace");
    SEL selector = NSSelectorFromString(@"defaultWorkspace");
    if (![workspace respondsToSelector:selector])
        return nil;
    id instance = ((id(*)(id, SEL))objc_msgSend)(workspace, selector);
    selector = NSSelectorFromString(@"allInstalledApplications");
    return [instance respondsToSelector:selector]
               ? ((id(*)(id, SEL))objc_msgSend)(instance, selector)
               : nil;
}
static NSDictionary *AMURLDictionary(id raw) {
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    if ([raw isKindOfClass:NSDictionary.class])
        for (id key in raw) {
            id value = raw[key];
            if ([value isKindOfClass:NSString.class] && [value isAbsolutePath])
                value = [NSURL fileURLWithPath:value isDirectory:YES];
            if ([key isKindOfClass:NSString.class] && [value isKindOfClass:NSURL.class] &&
                [value isFileURL])
                result[key] = value;
        }
    return result;
}
static NSDictionary *AMGroups(id proxy) {
    id raw=AMRead(proxy,@"groupContainerURLs")?:AMRead(proxy,@"groupContainers")?:AMRead(AMRead(proxy,@"_groupContainers"),@"propertyList");
    return AMURLDictionary(raw);
}
static void AddKeychainGroups(NSDictionary *entitlements, NSMutableSet *groups) {
    id values = entitlements[@"keychain-access-groups"];
    if ([values isKindOfClass:NSArray.class])
        for (id value in values)
            if ([value isKindOfClass:NSString.class] && [value length] &&
                ![value containsString:@"*"])
                [groups addObject:value];
    id appID = entitlements[@"application-identifier"];
    if ([appID isKindOfClass:NSString.class] && [appID length] && ![appID containsString:@"*"])
        [groups addObject:appID];
}
static BOOL AllGroupsResolved(NSDictionary *entitlements, NSDictionary *groups) {
    id identifiers = entitlements[@"com.apple.security.application-groups"];
    if (!identifiers)
        return YES;
    if (![identifiers isKindOfClass:NSArray.class])
        return NO;
    for (id key in identifiers)
        if (![key isKindOfClass:NSString.class] || !groups[key])
            return NO;
    return YES;
}
@implementation AMApplication
- (UIImage *)icon {
    SEL selector = NSSelectorFromString(@"_applicationIconImageForBundleIdentifier:format:scale:");
    UIImage *image = nil;
    if ([UIImage respondsToSelector:selector])
        image = ((id(*)(id, SEL, id, NSInteger, CGFloat))objc_msgSend)(
            UIImage.class, selector, self.identifier, 2, UIScreen.mainScreen.scale);
    return image ?: [UIImage systemImageNamed:@"app"];
}
@end
@implementation AMApplicationRegistry
+ (NSArray<AMApplication *> *)applicationsWithError:(NSError **)error {
    NSArray *proxies = AMProxies();
    if (![proxies isKindOfClass:NSArray.class]) {
        if (error)
            *error = AMError(1, @"无法读取应用列表。请通过 TrollStore 安装，确认权限已生效。");
        return nil;
    }
    NSMutableArray *result = [NSMutableArray array];
    for (id proxy in proxies) {
        NSString *identifier = AMRead(proxy, @"applicationIdentifier");
        NSURL *dataURL = AMRead(proxy, @"dataContainerURL");
        if (![identifier isKindOfClass:NSString.class] || !identifier.length ||
            [identifier isEqualToString:NSBundle.mainBundle.bundleIdentifier])
            continue;
        AMApplication *app = [AMApplication new];
        app.proxy = proxy;
        app.identifier = identifier;
        id name = AMRead(proxy, @"localizedName");
        app.name = [name isKindOfClass:NSString.class] ? name : identifier;
        app.dataURL = [dataURL isKindOfClass:NSURL.class] ? dataURL : nil;
        id entitlements = AMRead(proxy, @"entitlements");
        app.entitlements = [entitlements isKindOfClass:NSDictionary.class] ? entitlements : @{};
        NSMutableDictionary *groups = [AMGroups(proxy) mutableCopy];
        NSMutableSet *keychainGroups = [NSMutableSet set];
        AddKeychainGroups(app.entitlements, keychainGroups);
        if (!AllGroupsResolved(app.entitlements, groups))
            app.containerResolutionError = AMError(4, @"有声明的共享容器未能定位，备份已停止");
        if (![entitlements isKindOfClass:NSDictionary.class])
            app.keychainResolutionError = AMError(5, @"无法确认应用钥匙串权限，完整备份已停止");
        NSMutableDictionary *extensions = [NSMutableDictionary dictionary];
        id plugins = AMRead(proxy, @"plugInKitPlugins");
        if (![plugins isKindOfClass:NSArray.class] && ![plugins isKindOfClass:NSSet.class])
            plugins = @[];
        for (id plugin in plugins) {
            id pluginID =
                AMRead(plugin, @"pluginIdentifier") ?: AMRead(plugin, @"applicationIdentifier");
            id url = AMRead(plugin, @"dataContainerURL");
            if ([pluginID isKindOfClass:NSString.class] && [url isKindOfClass:NSURL.class])
                extensions[pluginID] = url;
            NSDictionary *pluginGroups = AMGroups(plugin);
            for (NSString *key in pluginGroups) {
                if (groups[key] && ![groups[key] isEqual:pluginGroups[key]])
                    app.containerResolutionError = AMError(6, @"共享容器解析冲突，备份已停止");
                groups[key] = pluginGroups[key];
            }
            id pluginEntitlements = AMRead(plugin, @"entitlements");
            if ([pluginEntitlements isKindOfClass:NSDictionary.class]) {
                AddKeychainGroups(pluginEntitlements, keychainGroups);
                if (!AllGroupsResolved(pluginEntitlements, groups))
                    app.containerResolutionError =
                        AMError(7, @"有声明的扩展共享容器未能定位，备份已停止");
            } else
                app.keychainResolutionError = AMError(8, @"无法确认扩展钥匙串权限，完整备份已停止");
        }
        app.extensionURLs = extensions;
        app.groupURLs = groups;
        app.keychainGroups =
            [[keychainGroups allObjects] sortedArrayUsingSelector:@selector(compare:)];
        app.systemApplication = [AMRead(proxy, @"applicationType") isEqual:@"System"];
        id usage = AMRead(proxy, @"dynamicDiskUsage");
        app.dataBytes = [usage respondsToSelector:@selector(unsignedLongLongValue)]
                            ? [usage unsignedLongLongValue]
                            : 0;
        id code = AMRead(proxy, @"staticDiskUsage");
        app.codeBytes = [code respondsToSelector:@selector(unsignedLongLongValue)]
                            ? [code unsignedLongLongValue]
                            : 0;
        if (app.dataURL)
            [result addObject:app];
    }
    return
        [result sortedArrayUsingComparator:^NSComparisonResult(AMApplication *a, AMApplication *b) {
            return [a.name localizedStandardCompare:b.name];
        }];
}
+ (NSURL *)originalSignerURL {
    for (id proxy in AMProxies())
        if ([AMRead(proxy, @"applicationIdentifier") isEqual:@"com.tigisoftware.ADManager"]) {
            NSURL *bundle = AMRead(proxy, @"bundleURL");
            if (![bundle isKindOfClass:NSURL.class])
                continue;
            NSURL *tool = [bundle URLByAppendingPathComponent:@"fastPathSign"];
            if ([NSFileManager.defaultManager isExecutableFileAtPath:tool.path])
                return tool;
        }
    return nil;
}
@end
