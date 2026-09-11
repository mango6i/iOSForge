#import "ATSystemOverlayController.h"

#import <QuartzCore/QuartzCore.h>
#import <dlfcn.h>
#import <objc/message.h>

static const CGFloat ATVisualWindowLevel = 2999.0;
static const CGFloat ATInteractionWindowLevel = 3000.0;
static const CGFloat ATHUDWindowLevel = 3001.0;

@interface ATHUDWindow : UIWindow
@end

@implementation ATHUDWindow
- (BOOL)_isWindowServerHostingManaged { return NO; }
- (BOOL)_ignoresHitTest { return NO; }
- (BOOL)canBecomeKeyWindow { return YES; }
@end

@interface ATOverlayVisualWindow : UIWindow
@end

@implementation ATOverlayVisualWindow
- (BOOL)_isWindowServerHostingManaged { return NO; }
- (BOOL)_ignoresHitTest { return YES; }
- (BOOL)_isSecure { return YES; }
- (BOOL)_shouldCreateContextAsSecure { return YES; }
- (BOOL)canBecomeKeyWindow { return NO; }
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event { return nil; }
@end

@interface ATOverlayInteractionWindow : UIWindow
@property (nonatomic) BOOL systemInteractionEnabled;
@end

@implementation ATOverlayInteractionWindow
- (BOOL)_isWindowServerHostingManaged { return NO; }
- (BOOL)_ignoresHitTest { return !self.systemInteractionEnabled; }
- (BOOL)canBecomeKeyWindow { return NO; }
@end

@interface ATPassthroughRootView : UIView
@end

@implementation ATPassthroughRootView
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    UIView *hit = [super hitTest:point withEvent:event];
    return hit == self ? nil : hit;
}
@end

@interface ATOverlayRootController : UIViewController
@end

@implementation ATOverlayRootController
- (void)loadView {
    ATPassthroughRootView *view = [[ATPassthroughRootView alloc] initWithFrame:UIScreen.mainScreen.bounds];
    view.backgroundColor = UIColor.clearColor;
    self.view = view;
}
- (BOOL)shouldAutorotate { return YES; }
- (UIInterfaceOrientationMask)supportedInterfaceOrientations { return UIInterfaceOrientationMaskAll; }
@end

@interface ATMarkerView : UIView
@property (nonatomic, strong) UILabel *numberLabel;
@property (nonatomic) BOOL active;
@property (nonatomic) BOOL selected;
- (void)configureNumber:(NSInteger)number scale:(CGFloat)scale selected:(BOOL)selected active:(BOOL)active;
@end

@implementation ATMarkerView
- (instancetype)initWithFrame:(CGRect)frame {
    self = [super initWithFrame:frame];
    if (self) {
        self.backgroundColor = UIColor.systemBackgroundColor;
        self.layer.shadowOpacity = 0.28;
        self.layer.shadowRadius = 7;
        self.layer.shadowOffset = CGSizeMake(0, 3);
        _numberLabel = [[UILabel alloc] initWithFrame:self.bounds];
        _numberLabel.textAlignment = NSTextAlignmentCenter;
        _numberLabel.adjustsFontSizeToFitWidth = YES;
        [self addSubview:_numberLabel];
    }
    return self;
}
- (void)layoutSubviews {
    [super layoutSubviews];
    self.layer.cornerRadius = CGRectGetWidth(self.bounds) / 2.0;
    self.numberLabel.frame = self.bounds;
}
- (void)configureNumber:(NSInteger)number scale:(CGFloat)scale selected:(BOOL)selected active:(BOOL)active {
    self.selected = selected;
    self.active = active;
    UIColor *blue = [UIColor colorWithRed:0.08 green:0.48 blue:0.96 alpha:1];
    UIColor *color = active ? UIColor.systemGreenColor : blue;
    CGFloat side = 48.0 * scale;
    self.bounds = CGRectMake(0, 0, side, side);
    self.layer.borderColor = color.CGColor;
    self.layer.borderWidth = (selected || active) ? 4.0 : 3.0;
    self.layer.shadowColor = color.CGColor;
    self.layer.shadowRadius = active ? 13.0 : 7.0;
    self.numberLabel.text = [NSString stringWithFormat:@"%ld", (long)number];
    self.numberLabel.textColor = color;
    self.numberLabel.font = [UIFont systemFontOfSize:17.0 * scale weight:UIFontWeightBold];
    self.transform = active ? CGAffineTransformMakeScale(1.1, 1.1) : CGAffineTransformIdentity;
    [self setNeedsLayout];
}
@end

@interface ATSystemOverlayController ()
@property (nonatomic, copy, readwrite) NSString *diagnosticText;
@property (nonatomic, strong) ATOverlayVisualWindow *visualWindow;
@property (nonatomic, strong) ATOverlayInteractionWindow *interactionWindow;
@property (nonatomic, strong) ATHUDWindow *hudWindow;
@property (nonatomic, strong) ATOverlayRootController *visualController;
@property (nonatomic, strong) ATOverlayRootController *interactionController;
@property (nonatomic, strong) ATOverlayRootController *hudController;
@property (nonatomic, strong) id visualHostingController;
@property (nonatomic, strong) id interactionHostingController;
@property (nonatomic, strong) id hudHostingController;
@property (nonatomic) uint32_t visualContextID;
@property (nonatomic) uint32_t interactionContextID;
@property (nonatomic) uint32_t hudContextID;
@property (nonatomic, strong) NSMutableArray<ATMarkerView *> *markerViews;
@property (nonatomic, strong) NSMutableArray<UIView *> *markerHitViews;
@property (nonatomic, strong) UIView *toolbar;
@property (nonatomic) CGPoint toolbarCenterRatio;
@property (nonatomic, copy) NSArray<NSValue *> *points;
@property (nonatomic) BOOL multiple;
@property (nonatomic) NSInteger selectedIndex;
@property (nonatomic) NSInteger activeIndex;
@property (nonatomic) CGFloat markerScale;
@property (nonatomic) CGFloat controlScale;
@property (nonatomic) BOOL running;
@property (nonatomic) BOOL frameworkLoaded;
@property (nonatomic) BOOL registrationPending;
@end

@implementation ATSystemOverlayController

+ (instancetype)shared {
    static ATSystemOverlayController *controller;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{ controller = [[self alloc] initPrivate]; });
    return controller;
}

- (instancetype)init { return [ATSystemOverlayController shared]; }

- (instancetype)initPrivate {
    self = [super init];
    if (self) {
        _diagnosticText = @"系统悬浮窗尚未启动。";
        _markerViews = [NSMutableArray array];
        _markerHitViews = [NSMutableArray array];
        _toolbarCenterRatio = CGPointMake(0.105, 0.54);
        [self loadHostingFramework];
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(screenGeometryChanged:)
                                                     name:UIDeviceOrientationDidChangeNotification
                                                   object:nil];
    }
    return self;
}

- (BOOL)isAvailable {
    Class hostingClass = NSClassFromString(@"SBSAccessibilityWindowHostingController");
    return self.frameworkLoaded && hostingClass != Nil;
}

- (BOOL)isVisible { return self.visualWindow != nil && !self.visualWindow.hidden; }

- (void)loadHostingFramework {
    void *handle = dlopen("/System/Library/PrivateFrameworks/AccessibilityUtilities.framework/AccessibilityUtilities", RTLD_LAZY | RTLD_LOCAL);
    if (!handle) {
        handle = dlopen("/System/Library/PrivateFrameworks/SpringBoardServices.framework/SpringBoardServices", RTLD_LAZY | RTLD_LOCAL);
    }
    self.frameworkLoaded = handle != NULL;
    if (!self.frameworkLoaded) {
        self.diagnosticText = @"无法加载系统悬浮窗托管接口。";
    } else if (NSClassFromString(@"SBSAccessibilityWindowHostingController") == Nil) {
        self.diagnosticText = @"当前系统没有悬浮窗托管类。";
    }
}

- (BOOL)showWithPoints:(NSArray<NSValue *> *)points
              multiple:(BOOL)multiple
          selectedIndex:(NSInteger)selectedIndex
            activeIndex:(NSInteger)activeIndex
            markerScale:(CGFloat)markerScale
           controlScale:(CGFloat)controlScale
                running:(BOOL)running {
    NSAssert(NSThread.isMainThread, @"Overlay must be created on the main thread");
    if (!self.available) { return NO; }
    [self createWindowsIfNeeded];
    [self updateWithPoints:points
                  multiple:multiple
              selectedIndex:selectedIndex
                activeIndex:activeIndex
                markerScale:markerScale
               controlScale:controlScale
                    running:running];
    self.visualWindow.hidden = NO;
    self.interactionWindow.hidden = NO;
    self.hudWindow.hidden = NO;
    [CATransaction flush];
    [self registerWindowsWithAttempt:0];
    return YES;
}

- (void)updateWithPoints:(NSArray<NSValue *> *)points
                multiple:(BOOL)multiple
            selectedIndex:(NSInteger)selectedIndex
              activeIndex:(NSInteger)activeIndex
              markerScale:(CGFloat)markerScale
             controlScale:(CGFloat)controlScale
                  running:(BOOL)running {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self updateWithPoints:points multiple:multiple selectedIndex:selectedIndex activeIndex:activeIndex markerScale:markerScale controlScale:controlScale running:running];
        });
        return;
    }
    self.points = [points copy];
    self.multiple = multiple;
    self.selectedIndex = selectedIndex;
    self.activeIndex = activeIndex;
    self.markerScale = MIN(MAX(markerScale, 0.75), 1.5);
    self.controlScale = MIN(MAX(controlScale, 0.8), 1.35);
    self.running = running;
    if (self.visualWindow != nil) { [self rebuildOverlayContent]; }
}

- (void)createWindowsIfNeeded {
    if (self.visualWindow && self.interactionWindow && self.hudWindow) { return; }
    UIWindowScene *scene = [self preferredWindowScene];
    CGRect bounds = scene ? scene.coordinateSpace.bounds : UIScreen.mainScreen.bounds;

    if (@available(iOS 13.0, *)) {
        self.visualWindow = scene ? [[ATOverlayVisualWindow alloc] initWithWindowScene:scene] : [[ATOverlayVisualWindow alloc] initWithFrame:bounds];
        self.interactionWindow = scene ? [[ATOverlayInteractionWindow alloc] initWithWindowScene:scene] : [[ATOverlayInteractionWindow alloc] initWithFrame:bounds];
        self.hudWindow = scene ? [[ATHUDWindow alloc] initWithWindowScene:scene] : [[ATHUDWindow alloc] initWithFrame:bounds];
    } else {
        self.visualWindow = [[ATOverlayVisualWindow alloc] initWithFrame:bounds];
        self.interactionWindow = [[ATOverlayInteractionWindow alloc] initWithFrame:bounds];
        self.hudWindow = [[ATHUDWindow alloc] initWithFrame:bounds];
    }

    self.visualController = [[ATOverlayRootController alloc] init];
    self.interactionController = [[ATOverlayRootController alloc] init];
    self.hudController = [[ATOverlayRootController alloc] init];
    self.visualWindow.rootViewController = self.visualController;
    self.interactionWindow.rootViewController = self.interactionController;
    self.hudWindow.rootViewController = self.hudController;
    self.visualWindow.frame = bounds;
    self.interactionWindow.frame = bounds;
    self.hudWindow.frame = bounds;
    self.visualWindow.backgroundColor = UIColor.clearColor;
    self.interactionWindow.backgroundColor = UIColor.clearColor;
    self.hudWindow.backgroundColor = UIColor.clearColor;
    self.visualWindow.windowLevel = ATVisualWindowLevel;
    self.interactionWindow.windowLevel = ATInteractionWindowLevel;
    self.hudWindow.windowLevel = ATHUDWindowLevel;
    self.visualWindow.userInteractionEnabled = NO;
    self.interactionWindow.systemInteractionEnabled = !self.running;
}

- (void)rebuildOverlayContent {
    for (UIView *view in self.markerViews) { [view removeFromSuperview]; }
    for (UIView *view in self.markerHitViews) { [view removeFromSuperview]; }
    [self.markerViews removeAllObjects];
    [self.markerHitViews removeAllObjects];
    [self.toolbar removeFromSuperview];
    self.interactionWindow.systemInteractionEnabled = !self.running;

    CGRect bounds = self.visualWindow.bounds;
    CGFloat width = CGRectGetWidth(bounds);
    CGFloat height = CGRectGetHeight(bounds);
    for (NSInteger index = 0; index < self.points.count; index++) {
        CGPoint ratio = self.points[index].CGPointValue;
        CGPoint center = CGPointMake(MIN(MAX(ratio.x * width, 28), width - 28),
                                     MIN(MAX(ratio.y * height, 28), height - 28));
        ATMarkerView *marker = [[ATMarkerView alloc] initWithFrame:CGRectZero];
        [marker configureNumber:index + 1
                          scale:self.markerScale
                       selected:index == self.selectedIndex
                         active:index == self.activeIndex];
        marker.center = center;
        [self.visualController.view addSubview:marker];
        [self.markerViews addObject:marker];

        CGFloat hitSide = MAX(58.0, 58.0 * self.markerScale);
        UIView *hit = [[UIView alloc] initWithFrame:CGRectMake(0, 0, hitSide, hitSide)];
        hit.center = center;
        hit.backgroundColor = UIColor.clearColor;
        hit.tag = index;
        hit.hidden = self.running;
        UITapGestureRecognizer *tap = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(markerTapped:)];
        UIPanGestureRecognizer *pan = [[UIPanGestureRecognizer alloc] initWithTarget:self action:@selector(markerDragged:)];
        [hit addGestureRecognizer:tap];
        [hit addGestureRecognizer:pan];
        [self.interactionController.view addSubview:hit];
        [self.markerHitViews addObject:hit];
    }
    [self buildToolbar];
}

- (void)buildToolbar {
    CGFloat s = self.controlScale;
    CGFloat buttonSide = 43.0 * s;
    CGFloat gap = 4.0 * s;
    NSInteger buttonCount = self.multiple ? 6 : 4;
    CGFloat panelWidth = buttonSide + 14.0 * s;
    CGFloat panelHeight = buttonSide * buttonCount + gap * (buttonCount - 1) + 14.0 * s;
    UIView *panel = [[UIView alloc] initWithFrame:CGRectMake(0, 0, panelWidth, panelHeight)];
    panel.backgroundColor = [UIColor colorWithWhite:0.04 alpha:0.90];
    panel.layer.cornerRadius = 15.0 * s;
    panel.layer.shadowColor = UIColor.blackColor.CGColor;
    panel.layer.shadowOpacity = 0.35;
    panel.layer.shadowRadius = 10;
    panel.layer.shadowOffset = CGSizeMake(0, 4);

    NSMutableArray<NSDictionary *> *items = [NSMutableArray array];
    [items addObject:@{@"symbol": @"xmark", @"color": UIColor.whiteColor, @"action": @"toolbarClose:"}];
    [items addObject:@{@"symbol": self.running ? @"stop.fill" : @"play.fill", @"color": self.running ? UIColor.systemRedColor : UIColor.systemBlueColor, @"action": @"toolbarToggle:"}];
    if (self.multiple) {
        [items addObject:@{@"symbol": @"plus", @"color": UIColor.systemGreenColor, @"action": @"toolbarAdd:"}];
        [items addObject:@{@"symbol": @"minus", @"color": UIColor.systemRedColor, @"action": @"toolbarDelete:"}];
    }
    [items addObject:@{@"symbol": @"gearshape.fill", @"color": [UIColor colorWithRed:0.47 green:0.69 blue:0.80 alpha:1], @"action": @"toolbarSettings:"}];
    [items addObject:@{@"symbol": @"move.3d", @"color": UIColor.systemGrayColor, @"action": @"toolbarNoop:"}];

    [items enumerateObjectsUsingBlock:^(NSDictionary *item, NSUInteger index, BOOL *stop) {
        UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
        button.frame = CGRectMake(7.0 * s, 7.0 * s + index * (buttonSide + gap), buttonSide, buttonSide);
        UIImageSymbolConfiguration *configuration = [UIImageSymbolConfiguration configurationWithPointSize:21.0 * s weight:UIImageSymbolWeightBold];
        UIImage *image = [UIImage systemImageNamed:item[@"symbol"] withConfiguration:configuration];
        [button setImage:image forState:UIControlStateNormal];
        button.tintColor = item[@"color"];
        [button addTarget:self action:NSSelectorFromString(item[@"action"]) forControlEvents:UIControlEventTouchUpInside];
        [panel addSubview:button];
        if (index == items.count - 1) {
            UIPanGestureRecognizer *pan = [[UIPanGestureRecognizer alloc] initWithTarget:self action:@selector(toolbarDragged:)];
            [button addGestureRecognizer:pan];
        }
    }];

    CGRect bounds = self.hudWindow.bounds;
    panel.center = CGPointMake(MIN(MAX(self.toolbarCenterRatio.x * CGRectGetWidth(bounds), panelWidth / 2.0 + 4), CGRectGetWidth(bounds) - panelWidth / 2.0 - 4),
                               MIN(MAX(self.toolbarCenterRatio.y * CGRectGetHeight(bounds), panelHeight / 2.0 + 8), CGRectGetHeight(bounds) - panelHeight / 2.0 - 8));
    [self.hudController.view addSubview:panel];
    self.toolbar = panel;
}

- (void)markerTapped:(UITapGestureRecognizer *)gesture {
    self.selectedIndex = gesture.view.tag;
    if (self.selectHandler) { self.selectHandler(self.selectedIndex); }
    [self rebuildOverlayContent];
}

- (void)markerDragged:(UIPanGestureRecognizer *)gesture {
    UIView *view = gesture.view;
    CGPoint translation = [gesture translationInView:self.interactionController.view];
    view.center = CGPointMake(view.center.x + translation.x, view.center.y + translation.y);
    [gesture setTranslation:CGPointZero inView:self.interactionController.view];
    if (view.tag < self.markerViews.count) { self.markerViews[view.tag].center = view.center; }
    if (gesture.state == UIGestureRecognizerStateBegan) {
        self.selectedIndex = view.tag;
        if (self.selectHandler) { self.selectHandler(view.tag); }
    }
    if (gesture.state == UIGestureRecognizerStateEnded || gesture.state == UIGestureRecognizerStateCancelled) {
        CGRect bounds = self.interactionWindow.bounds;
        CGFloat x = MIN(MAX(view.center.x / MAX(CGRectGetWidth(bounds), 1), 0), 1);
        CGFloat y = MIN(MAX(view.center.y / MAX(CGRectGetHeight(bounds), 1), 0), 1);
        if (self.moveHandler) { self.moveHandler(view.tag, x, y); }
    }
}

- (void)toolbarDragged:(UIPanGestureRecognizer *)gesture {
    CGPoint translation = [gesture translationInView:self.hudController.view];
    CGPoint center = CGPointMake(self.toolbar.center.x + translation.x, self.toolbar.center.y + translation.y);
    CGRect bounds = self.hudWindow.bounds;
    CGFloat halfWidth = CGRectGetWidth(self.toolbar.bounds) / 2.0;
    CGFloat halfHeight = CGRectGetHeight(self.toolbar.bounds) / 2.0;
    center.x = MIN(MAX(center.x, halfWidth + 4), CGRectGetWidth(bounds) - halfWidth - 4);
    center.y = MIN(MAX(center.y, halfHeight + 8), CGRectGetHeight(bounds) - halfHeight - 8);
    self.toolbar.center = center;
    [gesture setTranslation:CGPointZero inView:self.hudController.view];
    if (gesture.state == UIGestureRecognizerStateEnded || gesture.state == UIGestureRecognizerStateCancelled) {
        self.toolbarCenterRatio = CGPointMake(center.x / MAX(CGRectGetWidth(bounds), 1), center.y / MAX(CGRectGetHeight(bounds), 1));
    }
}

- (void)toolbarClose:(id)sender { if (self.closeHandler) { self.closeHandler(); } }
- (void)toolbarToggle:(id)sender { if (self.toggleRunHandler) { self.toggleRunHandler(); } }
- (void)toolbarSettings:(id)sender { if (self.settingsHandler) { self.settingsHandler(); } }
- (void)toolbarAdd:(id)sender { if (self.addHandler) { self.addHandler(); } }
- (void)toolbarDelete:(id)sender { if (self.deleteHandler) { self.deleteHandler(); } }
- (void)toolbarNoop:(id)sender {}

- (void)registerWindowsWithAttempt:(NSInteger)attempt {
    if (!self.visible || self.registrationPending) { return; }
    self.registrationPending = YES;
    BOOL visualOK = [self registerWindow:self.visualWindow
                         hostingProperty:@"visualHostingController"
                       contextIDProperty:@"visualContextID"
                                   level:ATVisualWindowLevel];
    BOOL interactionOK = [self registerWindow:self.interactionWindow
                              hostingProperty:@"interactionHostingController"
                            contextIDProperty:@"interactionContextID"
                                        level:ATInteractionWindowLevel];
    BOOL hudOK = [self registerWindow:self.hudWindow
                      hostingProperty:@"hudHostingController"
                    contextIDProperty:@"hudContextID"
                                level:ATHUDWindowLevel];
    self.registrationPending = NO;
    if (visualOK && interactionOK && hudOK) {
        self.diagnosticText = @"跨进程悬浮窗已注册。";
        return;
    }
    if (attempt < 7) {
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.12 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self registerWindowsWithAttempt:attempt + 1];
        });
    } else {
        self.diagnosticText = @"系统拒绝托管悬浮窗；请确认使用巨魔安装，并保留源码内的私有权限。";
    }
}

- (BOOL)registerWindow:(UIWindow *)window
       hostingProperty:(NSString *)hostingProperty
     contextIDProperty:(NSString *)contextIDProperty
                 level:(CGFloat)level {
    uint32_t existing = [[self valueForKey:contextIDProperty] unsignedIntValue];
    if (existing != 0) { return YES; }
    uint32_t contextID = [self contextIDForWindow:window];
    if (contextID == 0) { return NO; }

    Class hostingClass = NSClassFromString(@"SBSAccessibilityWindowHostingController");
    id hosting = [[hostingClass alloc] init];
    SEL selector = NSSelectorFromString(@"registerWindowWithContextID:atLevel:");
    if (!hosting || ![hosting respondsToSelector:selector]) { return NO; }
    if (![self invokeRegistrationSelector:selector target:hosting contextID:contextID level:level]) { return NO; }
    [self setValue:hosting forKey:hostingProperty];
    [self setValue:@(contextID) forKey:contextIDProperty];
    return YES;
}

- (uint32_t)contextIDForWindow:(UIWindow *)window {
    for (NSString *name in @[@"_contextId", @"contextId", @"contextID"]) {
        SEL selector = NSSelectorFromString(name);
        if (![window respondsToSelector:selector]) { continue; }
        NSMethodSignature *signature = [window methodSignatureForSelector:selector];
        if (!signature || signature.methodReturnLength == 0 || signature.methodReturnLength > sizeof(uint64_t)) { continue; }
        NSInvocation *invocation = [NSInvocation invocationWithMethodSignature:signature];
        invocation.selector = selector;
        [invocation invokeWithTarget:window];
        uint64_t result = 0;
        [invocation getReturnValue:&result];
        if (result != 0) { return (uint32_t)result; }
    }
    return 0;
}

- (BOOL)invokeRegistrationSelector:(SEL)selector target:(id)target contextID:(uint32_t)contextID level:(CGFloat)level {
    @try {
        NSMethodSignature *signature = [target methodSignatureForSelector:selector];
        if (!signature || signature.numberOfArguments < 4) { return NO; }
        NSInvocation *invocation = [NSInvocation invocationWithMethodSignature:signature];
        invocation.selector = selector;
        [self setIntegerArgument:contextID invocation:invocation index:2 type:[signature getArgumentTypeAtIndex:2]];
        [self setLevelArgument:level invocation:invocation index:3 type:[signature getArgumentTypeAtIndex:3]];
        [invocation invokeWithTarget:target];
        return YES;
    } @catch (__unused NSException *exception) {
        return NO;
    }
}

- (void)setIntegerArgument:(uint32_t)value invocation:(NSInvocation *)invocation index:(NSInteger)index type:(const char *)rawType {
    const char *type = rawType;
    while (*type == 'r' || *type == 'n' || *type == 'N' || *type == 'o' || *type == 'O' || *type == 'R' || *type == 'V') { type++; }
    if (*type == 'Q' || *type == 'L') { uint64_t v = value; [invocation setArgument:&v atIndex:index]; }
    else if (*type == 'q' || *type == 'l') { int64_t v = value; [invocation setArgument:&v atIndex:index]; }
    else { uint32_t v = value; [invocation setArgument:&v atIndex:index]; }
}

- (void)setLevelArgument:(CGFloat)value invocation:(NSInvocation *)invocation index:(NSInteger)index type:(const char *)rawType {
    const char *type = rawType;
    while (*type == 'r' || *type == 'n' || *type == 'N' || *type == 'o' || *type == 'O' || *type == 'R' || *type == 'V') { type++; }
    if (*type == 'f') { float v = value; [invocation setArgument:&v atIndex:index]; }
    else if (*type == 'd') { double v = value; [invocation setArgument:&v atIndex:index]; }
    else if (*type == 'Q' || *type == 'L') { uint64_t v = (uint64_t)value; [invocation setArgument:&v atIndex:index]; }
    else { int64_t v = (int64_t)value; [invocation setArgument:&v atIndex:index]; }
}

- (void)hide {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self hide]; });
        return;
    }
    [self unregisterHosting:self.visualHostingController contextID:self.visualContextID];
    [self unregisterHosting:self.interactionHostingController contextID:self.interactionContextID];
    [self unregisterHosting:self.hudHostingController contextID:self.hudContextID];
    self.visualContextID = 0;
    self.interactionContextID = 0;
    self.hudContextID = 0;
    self.visualHostingController = nil;
    self.interactionHostingController = nil;
    self.hudHostingController = nil;
    self.visualWindow.hidden = YES;
    self.interactionWindow.hidden = YES;
    self.hudWindow.hidden = YES;
    self.visualWindow.rootViewController = nil;
    self.interactionWindow.rootViewController = nil;
    self.hudWindow.rootViewController = nil;
    self.visualWindow = nil;
    self.interactionWindow = nil;
    self.hudWindow = nil;
    self.visualController = nil;
    self.interactionController = nil;
    self.hudController = nil;
    self.toolbar = nil;
    [self.markerViews removeAllObjects];
    [self.markerHitViews removeAllObjects];
    self.diagnosticText = @"系统悬浮窗已关闭。";
}

- (void)unregisterHosting:(id)hosting contextID:(uint32_t)contextID {
    if (!hosting || contextID == 0) { return; }
    SEL selector = NSSelectorFromString(@"unregisterWindowWithContextID:");
    if (![hosting respondsToSelector:selector]) { return; }
    @try {
        NSMethodSignature *signature = [hosting methodSignatureForSelector:selector];
        if (!signature || signature.numberOfArguments < 3) { return; }
        NSInvocation *invocation = [NSInvocation invocationWithMethodSignature:signature];
        invocation.selector = selector;
        [self setIntegerArgument:contextID invocation:invocation index:2 type:[signature getArgumentTypeAtIndex:2]];
        [invocation invokeWithTarget:hosting];
    } @catch (__unused NSException *exception) {}
}

- (UIWindowScene *)preferredWindowScene API_AVAILABLE(ios(13.0)) {
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
        if ([scene isKindOfClass:UIWindowScene.class] && scene.activationState != UISceneActivationStateUnattached) {
            return (UIWindowScene *)scene;
        }
    }
    return nil;
}

- (void)screenGeometryChanged:(NSNotification *)notification {
    if (!self.visible) { return; }
    dispatch_async(dispatch_get_main_queue(), ^{
        UIWindowScene *scene = [self preferredWindowScene];
        CGRect bounds = scene ? scene.coordinateSpace.bounds : UIScreen.mainScreen.bounds;
        self.visualWindow.frame = bounds;
        self.interactionWindow.frame = bounds;
        self.hudWindow.frame = bounds;
        [self rebuildOverlayContent];
    });
}

@end
