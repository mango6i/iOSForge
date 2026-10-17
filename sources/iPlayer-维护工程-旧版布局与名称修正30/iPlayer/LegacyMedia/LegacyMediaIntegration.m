#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import "LegacyMediaUI.h"

// This is an independent UIKit compatibility layer. The original SwiftUI tab
// controllers and their selection/delegate ownership remain with the host app.
static NSString * const LMInstallationNotification = @"IPlayerLegacyMediaInstallationDidChange";
static char LMTabStateKey;
static char LMOwnedNavigationKey;
static BOOL LMDiscoveryPending;
static BOOL LMDiscoveryWantsRefresh;
static IMP LMOriginalDidAppear;
static IMP LMOriginalDidLayout;
static IMP LMOriginalSetIndex;
static IMP LMOriginalSetController;
static IMP LMOriginalSetTab;
static IMP LMOriginalProxyWillAppear;
static BOOL LMProxyHookInstalled;
static IMP LMOriginalOrientations;
static Class LMOrientationDelegate;

@interface LMTabIntegrationState : NSObject
@property(nonatomic, weak) UIViewController *host;
@property(nonatomic, strong) UINavigationController *navigation;
@property(nonatomic, weak) UIViewController *media;
@property(nonatomic) BOOL video;
@property(nonatomic) BOOL evaluating;
@property(nonatomic) BOOL pending;
@property(nonatomic) BOOL wantsRefresh;
@property(nonatomic,strong) NSMutableDictionary<NSNumber *,UINavigationController *> *cachedNavigation;
@end
@implementation LMTabIntegrationState
@end

static void LMScheduleTab(UITabBarController *tab, BOOL refresh);
static void LMScheduleDiscovery(BOOL refresh);

static LMTabIntegrationState *LMState(UITabBarController *tab, BOOL create) {
    LMTabIntegrationState *state = objc_getAssociatedObject(tab, &LMTabStateKey);
    if (!state && create) {
        state = [LMTabIntegrationState new];
        state.cachedNavigation = [NSMutableDictionary dictionary];
        objc_setAssociatedObject(tab, &LMTabStateKey, state, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    return state;
}

static void LMPostState(UITabBarController *tab, LMTabIntegrationState *state,
                        NSString *event) {
    NSDictionary *info = @{
        @"event": event,
        @"installed": @(state.navigation.parentViewController != nil),
        @"mediaType": state.video ? @"record" : @"snapshot",
        @"hostClass": state.host ? NSStringFromClass(state.host.class) : @""
    };
    [[NSNotificationCenter defaultCenter] postNotificationName:LMInstallationNotification
                                                        object:tab userInfo:info];
}

static void LMDetach(UITabBarController *tab, LMTabIntegrationState *state) {
    UINavigationController *navigation = state.navigation;
    if (!navigation) {
        state.host = nil;
        state.media = nil;
        return;
    }
    [navigation willMoveToParentViewController:nil];
    [navigation.viewIfLoaded removeFromSuperview];
    [navigation removeFromParentViewController];
    state.navigation = nil;
    state.media = nil;
    state.host = nil;
    LMPostState(tab, state, @"removed");
}

static NSString *LMItemTitle(UITabBarController *tab, NSUInteger index) {
    if (@available(iOS 18.0,*)) {
        if (index < tab.tabs.count) return tab.tabs[index].title;
    }
    NSArray<UITabBarItem *> *items = tab.tabBar.items;
    if (index < items.count && items[index].title.length) return items[index].title;
    NSArray<UIViewController *> *controllers = tab.viewControllers;
    return index < controllers.count ? controllers[index].tabBarItem.title : nil;
}

// Native code establishes four SwiftUI tabs, in this order, with these literal
// labels. Validate the whole shape instead of treating every tab at index 1/2
// in the process as one of the app's media pages.
static BOOL LMRecognizesRoot(UITabBarController *tab) {
    NSUInteger count = tab.viewControllers.count;
    if (@available(iOS 18.0,*)) { if (tab.tabs.count) count=tab.tabs.count; }
    if (count != 4) return NO;
    return [LMItemTitle(tab, 0) isEqualToString:@"iPlayer"] &&
           [LMItemTitle(tab, 1) isEqualToString:@"录像"] &&
           [LMItemTitle(tab, 2) isEqualToString:@"截图"] &&
           [LMItemTitle(tab, 3) isEqualToString:@"设置"];
}

static BOOL LMHasPresentedDescendant(UIViewController *controller, NSUInteger depth) {
    if (!controller || depth > 12) return NO;
    UIViewController *presented = controller.presentedViewController;
    if (presented && !presented.isBeingDismissed) return YES;
    for (UIViewController *child in controller.childViewControllers) {
        if (LMHasPresentedDescendant(child, depth + 1)) return YES;
    }
    return NO;
}

static BOOL LMHasBlockingPresentation(UITabBarController *tab, UIViewController *host) {
    UIViewController *ancestor = tab;
    for (NSUInteger depth = 0; ancestor && depth <= 12; depth++) {
        UIViewController *presented = ancestor.presentedViewController;
        if (presented && !presented.isBeingDismissed) return YES;
        ancestor = ancestor.parentViewController;
    }
    return LMHasPresentedDescendant(host, 0);
}

static void LMUpdateFrame(UITabBarController *tab, LMTabIntegrationState *state) {
    UIView *container = state.host.viewIfLoaded;
    UIView *view = state.navigation.viewIfLoaded;
    if (!container || !view) return;
    CGRect frame = container.bounds;
    UITabBar *bar = tab.tabBar;
    UIColor *accent = bar.standardAppearance.stackedLayoutAppearance.selected.iconColor;
    if (!accent) accent = bar.standardAppearance.stackedLayoutAppearance.selected.titleTextAttributes[NSForegroundColorAttributeName];
    if (!accent) accent = bar.tintColor ?: container.tintColor;
    if (accent && ![view.tintColor isEqual:accent]) {
        view.tintColor = accent;
        state.navigation.navigationBar.tintColor = accent;
        state.navigation.toolbar.tintColor = accent;
    }
    if (!bar.hidden && bar.alpha > 0.01 && bar.window && bar.window == container.window) {
        CGRect barFrame = [container convertRect:bar.bounds fromView:bar];
        CGRect overlap = CGRectIntersection(frame, barFrame);
        if (!CGRectIsNull(overlap) && !CGRectIsEmpty(overlap) &&
            CGRectGetMinY(overlap) > CGRectGetMinY(frame)) {
            frame.size.height = MAX(0.0, CGRectGetMinY(overlap) - CGRectGetMinY(frame));
        }
    }
    // Full host bounds preserve UIKit's propagated safe-area/status-bar insets;
    // only an actual visible tab-bar intersection is removed from the frame.
    if (!CGRectEqualToRect(view.frame, frame)) view.frame = frame;
    if (view.superview == container && container.subviews.lastObject != view) [container bringSubviewToFront:view];
}

static void LMConfigureNavigation(UINavigationController *navigation) {
    navigation.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
    navigation.view.backgroundColor = UIColor.systemBackgroundColor;
    navigation.navigationBar.barStyle = UIBarStyleDefault;
    navigation.navigationBar.translucent = NO;
    navigation.navigationBar.barTintColor = UIColor.systemBackgroundColor;
    navigation.navigationBar.prefersLargeTitles = YES;
    UINavigationBarAppearance *appearance = [UINavigationBarAppearance new];
    [appearance configureWithOpaqueBackground];
    appearance.backgroundColor = UIColor.systemBackgroundColor;
    appearance.titleTextAttributes = @{NSForegroundColorAttributeName: UIColor.labelColor};
    appearance.largeTitleTextAttributes = @{NSForegroundColorAttributeName: UIColor.labelColor};
    navigation.navigationBar.standardAppearance = appearance;
    navigation.navigationBar.scrollEdgeAppearance = appearance;
    navigation.navigationBar.compactAppearance = appearance;
    UIToolbarAppearance *toolbar = [UIToolbarAppearance new];
    [toolbar configureWithOpaqueBackground];toolbar.backgroundColor = UIColor.systemBackgroundColor;
    navigation.toolbar.standardAppearance = toolbar;
    if (@available(iOS 15.0, *)) navigation.toolbar.scrollEdgeAppearance = toolbar;
}

static void LMRefresh(UIViewController *media) {
    SEL selector = @selector(refreshMedia);
    if (![media respondsToSelector:selector]) return;
    IMP implementation = [media methodForSelector:selector];
    ((void (*)(id, SEL))implementation)(media, selector);
}

static void LMEvaluateTab(UITabBarController *tab, BOOL refresh) {
    NSCAssert(NSThread.isMainThread, @"Legacy media UI requires the main thread");
    LMTabIntegrationState *state = LMState(tab, YES);
    if (state.evaluating) return;
    state.evaluating = YES;
    @try {
        if (state.navigation && (!state.host ||
            state.navigation.parentViewController != state.host)) {
            LMDetach(tab, state);
        }
        if (!LMRecognizesRoot(tab)) {
            LMDetach(tab, state);
            return;
        }
        UIViewController *host = tab.selectedViewController;
        NSUInteger index = [tab.viewControllers indexOfObjectIdenticalTo:host];
        if (@available(iOS 18.0,*)) {
            if (tab.tabs.count) {
                index = [tab.tabs indexOfObjectIdenticalTo:tab.selectedTab];
                host = tab.selectedTab.viewController;
            }
        }
        BOOL video = index == 1;
        if (index != 1 && index != 2) {
            LMDetach(tab, state);
            return;
        }
        if (!tab.viewIfLoaded.window || !host.viewIfLoaded.window ||
            LMHasBlockingPresentation(tab, host)) return;
        if (state.navigation && (state.host != host || state.video != video)) {
            LMDetach(tab, state);
        }
        if (!state.navigation) {
            UINavigationController *navigation = state.cachedNavigation[@(video)];
            UIViewController *media = navigation.viewControllers.firstObject;
            if (!navigation) {
                media = LMCreateMediaController(video);
                if (!media) return;
                navigation = [[UINavigationController alloc] initWithRootViewController:media];
                state.cachedNavigation[@(video)] = navigation;
            }
            objc_setAssociatedObject(navigation, &LMOwnedNavigationKey, @YES,
                                     OBJC_ASSOCIATION_RETAIN_NONATOMIC);
            LMConfigureNavigation(navigation);
            state.host = host;
            state.media = media;
            state.navigation = navigation;
            state.video = video;
            [host addChildViewController:navigation];
            navigation.view.tintColor = tab.tabBar.tintColor ?: host.view.tintColor;
            navigation.navigationBar.tintColor = navigation.view.tintColor;
            navigation.toolbar.tintColor = navigation.view.tintColor;
            navigation.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
            [host.view addSubview:navigation.view];
            LMUpdateFrame(tab, state);
            [navigation didMoveToParentViewController:host];
            LMPostState(tab, state, @"installed");
            // Initial loading is owned by the media controller's lifecycle.
        } else {
            LMUpdateFrame(tab, state);
            if (refresh) {
                LMRefresh(state.media);
                LMPostState(tab, state, @"refreshed");
            }
        }
    } @finally {
        state.evaluating = NO;
    }
}

static void LMScheduleTab(UITabBarController *tab, BOOL refresh) {
    if (!tab) return;
    if (!NSThread.isMainThread) {
        __weak UITabBarController *weakTab = tab;
        dispatch_async(dispatch_get_main_queue(), ^{ LMScheduleTab(weakTab, refresh); });
        return;
    }
    LMTabIntegrationState *state = LMState(tab, YES);
    if (state.evaluating) return;
    state.wantsRefresh |= refresh;
    if (state.pending) return;
    state.pending = YES;
    __weak UITabBarController *weakTab = tab;
    dispatch_async(dispatch_get_main_queue(), ^{
        UITabBarController *strongTab = weakTab;
        if (!strongTab) return;
        LMTabIntegrationState *current = LMState(strongTab, NO);
        BOOL wantsRefresh = current.wantsRefresh;
        current.wantsRefresh = NO;
        current.pending = NO;
        LMEvaluateTab(strongTab, wantsRefresh);
    });
}

static void LMDiscoverInController(UIViewController *controller, NSUInteger depth,
                                  BOOL refresh) {
    if (!controller || depth > 12 || objc_getAssociatedObject(controller, &LMOwnedNavigationKey)) return;
    Class playerClass = NSClassFromString(@"AVPlayerViewController");
    if (playerClass && [controller isKindOfClass:playerClass]) return;
    if ([controller isKindOfClass:UITabBarController.class]) {
        LMScheduleTab((UITabBarController *)controller, refresh);
        return;
    }
    // Presented controllers are deliberately not traversed: a player or share
    // sheet must never become a compatibility-overlay installation target.
    if ([controller isKindOfClass:UINavigationController.class]) {
        LMDiscoverInController(((UINavigationController *)controller).topViewController,
                               depth + 1, refresh);
        return;
    }
    for (UIViewController *child in controller.childViewControllers) {
        LMDiscoverInController(child, depth + 1, refresh);
    }
}

static void LMInstallProxyHook(void);

static UIInterfaceOrientationMask LMDefaultOrientations(void) {
    NSDictionary *info = NSBundle.mainBundle.infoDictionary;
    NSArray *names = UIDevice.currentDevice.userInterfaceIdiom == UIUserInterfaceIdiomPad ?
        info[@"UISupportedInterfaceOrientations~ipad"] : info[@"UISupportedInterfaceOrientations"];
    UIInterfaceOrientationMask mask = 0;
    for (NSString *name in names) {
        if ([name isEqualToString:@"UIInterfaceOrientationPortrait"]) mask |= UIInterfaceOrientationMaskPortrait;
        if ([name isEqualToString:@"UIInterfaceOrientationLandscapeLeft"]) mask |= UIInterfaceOrientationMaskLandscapeLeft;
        if ([name isEqualToString:@"UIInterfaceOrientationLandscapeRight"]) mask |= UIInterfaceOrientationMaskLandscapeRight;
        if ([name isEqualToString:@"UIInterfaceOrientationPortraitUpsideDown"]) mask |= UIInterfaceOrientationMaskPortraitUpsideDown;
    }
    return mask ?: UIInterfaceOrientationMaskPortrait;
}

static UIInterfaceOrientationMask LMOrientations(id self, SEL selector, UIApplication *app, UIWindow *window) {
    UIViewController *controller = window.rootViewController;
    Class replay = NSClassFromString(@"LMPlaybackController");
    for (NSUInteger depth = 0; controller && depth < 12; depth++) {
        if (replay && [controller isKindOfClass:replay] && !controller.isBeingDismissed)
            return UIInterfaceOrientationMaskAllButUpsideDown;
        controller = controller.presentedViewController;
    }
    if (LMOriginalOrientations)
        return ((UIInterfaceOrientationMask (*)(id,SEL,id,id))LMOriginalOrientations)(self,selector,app,window);
    return LMDefaultOrientations();
}

static void LMInstallOrientationHook(UIApplication *application) {
    Class cls = [application.delegate class];
    if (!cls || LMOrientationDelegate) return;
    SEL selector = @selector(application:supportedInterfaceOrientationsForWindow:);
    Method method = class_getInstanceMethod(cls,selector);
    LMOriginalOrientations = method ? method_getImplementation(method) : NULL;
    if (!class_addMethod(cls,selector,(IMP)LMOrientations,method ? method_getTypeEncoding(method) : "Q@:@@"))
        method_setImplementation(class_getInstanceMethod(cls,selector),(IMP)LMOrientations);
    LMOrientationDelegate = cls;
}

static void LMDiscover(BOOL refresh) {
    LMInstallProxyHook();
    UIApplication *application = UIApplication.sharedApplication;
    if (application.applicationState != UIApplicationStateActive) return;
    LMInstallOrientationHook(application);
    if (@available(iOS 13.0, *)) {
        for (UIScene *scene in application.connectedScenes) {
            if (scene.activationState != UISceneActivationStateForegroundActive ||
                ![scene isKindOfClass:UIWindowScene.class]) continue;
            for (UIWindow *window in ((UIWindowScene *)scene).windows) {
                if (window.isKeyWindow && !window.hidden && window.windowLevel == UIWindowLevelNormal) {
                    LMDiscoverInController(window.rootViewController, 0, refresh);
                }
            }
        }
    } else {
        UIWindow *window = application.keyWindow;
        if (window.isKeyWindow && !window.hidden && window.windowLevel == UIWindowLevelNormal) {
            LMDiscoverInController(window.rootViewController, 0, refresh);
        }
    }
}

static void LMScheduleDiscovery(BOOL refresh) {
    dispatch_async(dispatch_get_main_queue(), ^{
        LMDiscoveryWantsRefresh |= refresh;
        if (LMDiscoveryPending) return;
        LMDiscoveryPending = YES;
        dispatch_async(dispatch_get_main_queue(), ^{
            BOOL wantsRefresh = LMDiscoveryWantsRefresh;
            LMDiscoveryWantsRefresh = NO;
            LMDiscoveryPending = NO;
            LMDiscover(wantsRefresh);
        });
    });
}

static void LMTabDidAppear(UITabBarController *self, SEL selector, BOOL animated) {
    ((void (*)(id, SEL, BOOL))LMOriginalDidAppear)(self, selector, animated);
    LMScheduleTab(self, YES);
}

static void LMTabDidLayout(UITabBarController *self, SEL selector) {
    ((void (*)(id, SEL))LMOriginalDidLayout)(self, selector);
    LMScheduleTab(self, NO);
}

static void LMTabSetIndex(UITabBarController *self, SEL selector, NSUInteger index) {
    ((void (*)(id, SEL, NSUInteger))LMOriginalSetIndex)(self, selector, index);
    LMScheduleTab(self, YES);
}

static void LMTabSetController(UITabBarController *self, SEL selector, UIViewController *controller) {
    ((void (*)(id, SEL, UIViewController *))LMOriginalSetController)(self, selector, controller);
    LMScheduleTab(self, YES);
}

static void LMTabSetModernTab(UITabBarController *self, SEL selector, id selectedTab) {
    ((void (*)(id,SEL,id))LMOriginalSetTab)(self,selector,selectedTab);
    LMScheduleTab(self,YES);
}

static void LMProxyWillAppear(UIViewController *self, SEL selector, BOOL animated) {
    ((void (*)(id, SEL, BOOL))LMOriginalProxyWillAppear)(self, selector, animated);
    // This proxy is a general navigation bridge, not a media-page identifier.
    // Discovery still requires the exact four-tab root and selected media item.
    LMScheduleDiscovery(YES);
}

static BOOL LMHook(Class target, SEL selector, IMP replacement, IMP *original) {
    Method method = class_getInstanceMethod(target, selector);
    if (!method) return NO;
    IMP previous = method_getImplementation(method);
    if (previous == replacement) return YES;
    *original = previous;
    if (!class_addMethod(target, selector, replacement, method_getTypeEncoding(method))) {
        *original = method_setImplementation(class_getInstanceMethod(target, selector), replacement);
    }
    return YES;
}

static void LMInstallProxyHook(void) {
    if (LMProxyHookInstalled) return;
    Class proxy = objc_getClass("_TtCV7iPlayerP33_9645348F7D14B9366A9EFE8C5D97E2D623PXTabBarLifecycleBridge21PXProxyViewController");
    if (!proxy || ![proxy isSubclassOfClass:UIViewController.class]) return;
    LMProxyHookInstalled = LMHook(proxy, @selector(viewWillAppear:), (IMP)LMProxyWillAppear,
                                  &LMOriginalProxyWillAppear);
}

@interface LMLegacyMediaBootstrap : NSObject
@end
@implementation LMLegacyMediaBootstrap
+ (void)load {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        Class target = UITabBarController.class;
        LMHook(target, @selector(viewDidAppear:), (IMP)LMTabDidAppear, &LMOriginalDidAppear);
        LMHook(target, @selector(viewDidLayoutSubviews), (IMP)LMTabDidLayout, &LMOriginalDidLayout);
        LMHook(target, @selector(setSelectedIndex:), (IMP)LMTabSetIndex, &LMOriginalSetIndex);
        LMHook(target, @selector(setSelectedViewController:), (IMP)LMTabSetController, &LMOriginalSetController);
        if (@available(iOS 18.0,*))
            LMHook(target, @selector(setSelectedTab:), (IMP)LMTabSetModernTab, &LMOriginalSetTab);
        NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
        for (NSNotificationName name in @[UIApplicationDidBecomeActiveNotification,
                                           UIApplicationDidFinishLaunchingNotification,
                                           UIWindowDidBecomeVisibleNotification]) {
            [center addObserverForName:name object:nil queue:NSOperationQueue.mainQueue
                             usingBlock:^(NSNotification *note) {
                LMScheduleDiscovery([note.name isEqualToString:UIApplicationDidBecomeActiveNotification]);
            }];
        }
    });
}
@end
