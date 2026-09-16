#import "ATSystemOverlayController.h"
#import "ATTouchDispatcher.h"

#import <QuartzCore/QuartzCore.h>
#import <dlfcn.h>
#import <mach/mach_time.h>
#import <math.h>
#import <objc/message.h>

typedef struct __IOHIDEvent *IOHIDEventRef;
typedef struct __IOHIDEventSystemClient *IOHIDEventSystemClientRef;
typedef struct __IOHIDServiceClient *IOHIDServiceClientRef;
typedef void (*ATSystemHIDCallbackFn)(void *, void *, IOHIDServiceClientRef, IOHIDEventRef);
typedef IOHIDEventSystemClientRef (*ATCreateHIDSystemClientFn)(CFAllocatorRef);
typedef IOHIDEventRef (*ATCreateDigitizerEventFn)(
    CFAllocatorRef, uint64_t, uint32_t, uint32_t, uint32_t, uint32_t, uint32_t,
    double, double, double, double, double, Boolean, Boolean, uint32_t);
typedef IOHIDEventRef (*ATCreateFingerEventFn)(
    CFAllocatorRef, uint64_t, uint32_t, uint32_t, uint32_t,
    double, double, double, double, double, Boolean, Boolean, uint32_t);
typedef void (*ATAppendHIDEventFn)(IOHIDEventRef, IOHIDEventRef, uint32_t);
typedef void (*ATRegisterHIDCallbackFn)(IOHIDEventSystemClientRef, ATSystemHIDCallbackFn, void *, void *);
typedef void (*ATUnregisterHIDCallbackFn)(IOHIDEventSystemClientRef);
// IOHIDEventSystemClient uses Mach's 32-bit boolean_t for filter callbacks.
// Keep the dynamically declared block ABI exact; Foundation's one-byte
// Boolean/BOOL return type can otherwise produce an unreliable filter result
// on arm64 and let the foreground app receive part of a drag gesture.
typedef uint32_t (^ATSystemHIDFilterBlock)(void *, void *, void *, IOHIDEventRef);
typedef void (*ATRegisterHIDFilterBlockFn)(IOHIDEventSystemClientRef, ATSystemHIDFilterBlock, void *, void *);
typedef void (*ATScheduleHIDClientFn)(IOHIDEventSystemClientRef, CFRunLoopRef, CFStringRef);
typedef void (*ATUnscheduleHIDClientFn)(IOHIDEventSystemClientRef, CFRunLoopRef, CFStringRef);
typedef IOHIDEventRef (*ATCopyHIDEventFn)(CFAllocatorRef, IOHIDEventRef);
typedef CFArrayRef (*ATGetHIDChildrenFn)(IOHIDEventRef);
typedef uint32_t (*ATGetHIDTypeFn)(IOHIDEventRef);
typedef double (*ATGetHIDFloatValueFn)(IOHIDEventRef, uint32_t);
typedef CFIndex (*ATGetHIDIntegerValueFn)(IOHIDEventRef, uint32_t);
typedef uint64_t (*ATGetHIDSenderIDFn)(IOHIDEventRef);
typedef uint64_t (*ATGetHIDTimestampFn)(IOHIDEventRef);
typedef void (*ATSetHIDSenderIDFn)(IOHIDEventRef, uint64_t);
typedef void (*ATSetHIDIntegerValueFn)(IOHIDEventRef, uint32_t, CFIndex);
typedef void (*ATSetHIDFloatValueFn)(IOHIDEventRef, uint32_t, double);
typedef void (*ATSetDigitizerInfoFn)(IOHIDEventRef, uint32_t, uint8_t, uint8_t, CFStringRef, CFTimeInterval, float);

static const CGFloat ATVisualWindowLevel = 2999.0;
static const CGFloat ATInteractionWindowLevel = 3000.0;
static const CGFloat ATHUDWindowLevel = 3001.0;
static const uint32_t ATDigitizerEventType = 11;
static const uint32_t ATDigitizerTransducerTypeHand = 3;
static const uint32_t ATDigitizerEventRange = 1u << 0;
static const uint32_t ATDigitizerEventTouch = 1u << 1;
static const uint32_t ATDigitizerEventPosition = 1u << 2;
static const uint32_t ATDigitizerEventIdentity = 1u << 5;
static const uint32_t ATFieldIsBuiltIn = 4;
static const uint32_t ATFieldDigitizerX = 0xB0000;
static const uint32_t ATFieldDigitizerY = 0xB0001;
static const uint32_t ATFieldDigitizerEventMask = 0xB0007;
static const uint32_t ATFieldDigitizerRange = 0xB0008;
static const uint32_t ATFieldDigitizerTouch = 0xB0009;
static const uint32_t ATFieldDigitizerMajorRadius = 0xB0014;
static const uint32_t ATFieldDigitizerMinorRadius = 0xB0015;
static const uint32_t ATFieldDigitizerIsDisplayIntegrated = 0xB0019;
static const uint32_t ATFieldDigitizerIsBuiltIn = 0xB001B;
static const uint64_t ATSyntheticSenderID = 0xDEFACEDBEEFFECE5ULL;
static const uint64_t ATAutomationSenderID = 0x8000000817319372ULL;

typedef NS_ENUM(NSInteger, ATDirectTouchTarget) {
    ATDirectTouchTargetNone = 0,
    ATDirectTouchTargetMarker,
    ATDirectTouchTargetToolbar,
    ATDirectTouchTargetControl,
    ATDirectTouchTargetSegmentedControl,
};

@interface ATHUDWindow : UIWindow
@property (nonatomic) BOOL systemInteractionEnabled;
@end

@implementation ATHUDWindow
- (BOOL)_isWindowServerHostingManaged { return NO; }
- (BOOL)_ignoresHitTest { return !self.systemInteractionEnabled; }
- (BOOL)canBecomeKeyWindow { return NO; }
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    UIView *hit = [super hitTest:point withEvent:event];
    return hit == self ? nil : hit;
}
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
@property (nonatomic, copy) void (^appearanceDidChange)(void);
@end

@implementation ATOverlayRootController
- (void)loadView {
    ATPassthroughRootView *view = [[ATPassthroughRootView alloc] initWithFrame:UIScreen.mainScreen.bounds];
    view.backgroundColor = UIColor.clearColor;
    self.view = view;
}
- (BOOL)shouldAutorotate { return YES; }
- (UIInterfaceOrientationMask)supportedInterfaceOrientations { return UIInterfaceOrientationMaskAll; }
- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection {
    [super traitCollectionDidChange:previousTraitCollection];
    if (!previousTraitCollection ||
        [self.traitCollection hasDifferentColorAppearanceComparedToTraitCollection:previousTraitCollection]) {
        if (self.appearanceDidChange) { self.appearanceDidChange(); }
    }
}
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
    // Keep hosted markers in sync with the phone's current appearance. UIKit
    // resolves this dynamic color again when the system switches themes.
    self.backgroundColor = UIColor.systemBackgroundColor;
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

@interface ATSystemOverlayController () {
    void *_ioKitHandle;
    void *_backBoardHandle;
    ATCreateHIDSystemClientFn _createHIDSystemClient;
    ATCreateDigitizerEventFn _createDigitizerEvent;
    ATCreateFingerEventFn _createFingerEvent;
    ATAppendHIDEventFn _appendHIDEvent;
    ATRegisterHIDCallbackFn _registerHIDCallback;
    ATUnregisterHIDCallbackFn _unregisterHIDCallback;
    ATRegisterHIDFilterBlockFn _registerHIDFilterBlock;
    ATSystemHIDFilterBlock _hidFilterBlock;
    ATScheduleHIDClientFn _scheduleHIDClient;
    ATUnscheduleHIDClientFn _unscheduleHIDClient;
    ATCopyHIDEventFn _copyHIDEvent;
    ATGetHIDChildrenFn _getHIDChildren;
    ATGetHIDTypeFn _getHIDType;
    ATGetHIDFloatValueFn _getHIDFloatValue;
    ATGetHIDIntegerValueFn _getHIDIntegerValue;
    ATGetHIDSenderIDFn _getHIDSenderID;
    ATGetHIDTimestampFn _getHIDTimestamp;
    ATSetHIDSenderIDFn _setHIDSenderID;
    ATSetHIDIntegerValueFn _setHIDIntegerValue;
    ATSetHIDFloatValueFn _setHIDFloatValue;
    ATSetDigitizerInfoFn _setDigitizerInfo;
    IOHIDEventSystemClientRef _hidMonitor;
    BOOL _physicalTouchActive;
    BOOL _filterTouchActive;
    BOOL _forwardedTouchActive;
    ATDirectTouchTarget _directTouchTarget;
    NSInteger _directMarkerIndex;
    UIView *_directControlView;
    CGPoint _directTouchStartPoint;
    CGPoint _directTargetStartCenter;
    CGPoint _lastPhysicalTouchPoint;
    BOOL _directTouchMoved;
    BOOL _editingSuppressed;
    BOOL _recordingTouchCandidate;
    CGPoint _recordingTouchStartPoint;
    CFTimeInterval _recordingTouchStartedAt;
    CFTimeInterval _recordingLastTapAt;
    CFTimeInterval _lastToolbarActionAt;
    SEL _lastToolbarAction;
}
@property (nonatomic, copy, readwrite) NSString *diagnosticText;
@property (nonatomic, strong) ATOverlayVisualWindow *visualWindow;
@property (nonatomic, strong) ATOverlayInteractionWindow *interactionWindow;
@property (nonatomic, strong) ATHUDWindow *hudWindow;
@property (nonatomic, weak) UIWindow *ownerWindow;
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
@property (nonatomic, strong) UIButton *runButton;
@property (nonatomic, strong) UIView *countdownBadge;
@property (nonatomic, strong) UILabel *countdownLabel;
@property (nonatomic, strong) UIView *completionPanel;
@property (nonatomic) NSUInteger completionGeneration;
@property (nonatomic, strong) UIControl *editorBackdrop;
@property (nonatomic, strong) UIView *editorPanel;
@property (nonatomic, strong) UISegmentedControl *editorUnitControl;
@property (nonatomic, strong) UIButton *editorIntervalField;
@property (nonatomic, strong) UIButton *editorDurationField;
@property (nonatomic, strong) UIButton *editorRepeatField;
@property (nonatomic, strong) UIButton *editorSelectedField;
@property (nonatomic, copy) NSString *editorInputBuffer;
@property (nonatomic) NSInteger editingIndex;
@property (nonatomic) BOOL editorReplaceOnNextDigit;
@property (nonatomic) CGPoint toolbarCenterRatio;
@property (nonatomic, copy) NSArray<NSValue *> *points;
@property (nonatomic, copy) NSArray<NSDictionary<NSString *, NSNumber *> *> *actionSettings;
@property (nonatomic) BOOL multiple;
@property (nonatomic) NSInteger selectedIndex;
@property (nonatomic) NSInteger activeIndex;
@property (nonatomic) CGFloat markerScale;
@property (nonatomic) CGFloat controlScale;
@property (nonatomic) BOOL pointEditingEnabled;
@property (nonatomic) BOOL running;
@property (nonatomic) BOOL recording;
@property (nonatomic) BOOL recordingActive;
@property (nonatomic) NSInteger countdownSeconds;
@property (nonatomic) UIUserInterfaceStyle lastAppearanceStyle;
@property (nonatomic, strong) NSTimer *appearanceTimer;
@property (nonatomic) BOOL frameworkLoaded;
@property (nonatomic) BOOL registrationPending;
@property (nonatomic) NSUInteger registrationGeneration;
@property (nonatomic) BOOL gestureInProgress;
@property (nonatomic) BOOL rebuildPending;
@property (nonatomic) uint32_t activeInputContextID;
- (void)handlePhysicalHIDEvent:(IOHIDEventRef)event;
- (uint32_t)processPhysicalHIDEvent:(IOHIDEventRef)event;
- (BOOL)shouldFilterPhysicalHIDEvent:(IOHIDEventRef)event;
- (BOOL)readPhysicalHIDEvent:(IOHIDEventRef)event point:(CGPoint *)point touching:(BOOL *)touching;
- (BOOL)hudOwnsScreenPoint:(CGPoint)point;
- (UIView *)hudHitViewAtScreenPoint:(CGPoint)point;
- (UIView *)fallbackHUDHitViewAtScreenPoint:(CGPoint)point;
- (void)beginDirectTouchAtPoint:(CGPoint)point;
- (void)moveDirectTouchToPoint:(CGPoint)point;
- (void)endDirectTouchAtPoint:(CGPoint)point cancelled:(BOOL)cancelled;
- (void)resetDirectTouchState;
- (BOOL)startPhysicalHIDMonitor;
- (void)stopPhysicalHIDMonitor;
- (void)finishGestureAndApplyPendingRebuild;
- (void)requestDeferredOverlayRebuild;
- (void)updateOverlayContentInPlace;
- (void)updateCountdownHUD;
- (UIUserInterfaceStyle)currentSystemAppearanceStyle;
- (void)applyCurrentAppearance;
- (void)startAppearanceMonitoring;
- (void)stopAppearanceMonitoring;
- (UIWindow *)foregroundApplicationWindow;
- (void)showPointEditorAtIndex:(NSInteger)index;
- (void)dismissPointEditor;
- (void)useHostedHUDPresentation;
- (void)registerWindowsWithAttempt:(NSInteger)attempt generation:(NSUInteger)generation;
@end

static void ATSystemOverlayHIDCallback(void *target, void *refcon, IOHIDServiceClientRef service, IOHIDEventRef event) {
    if (!target || !event) { return; }
    ATSystemOverlayController *controller = (__bridge ATSystemOverlayController *)target;
    if (NSThread.isMainThread) {
        [controller handlePhysicalHIDEvent:event];
        return;
    }
    CFRetain(event);
    dispatch_async(dispatch_get_main_queue(), ^{
        [controller handlePhysicalHIDEvent:event];
        CFRelease(event);
    });
}

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
        _pointEditingEnabled = YES;
        _toolbarCenterRatio = CGPointMake(0.105, 0.54);
        _lastAppearanceStyle = UIUserInterfaceStyleUnspecified;
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

- (BOOL)isVisible { return self.hudWindow != nil && !self.hudWindow.hidden; }

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

- (UIUserInterfaceStyle)currentSystemAppearanceStyle {
    UIUserInterfaceStyle style = UIScreen.mainScreen.traitCollection.userInterfaceStyle;
    if (style == UIUserInterfaceStyleUnspecified) {
        style = self.ownerWindow.traitCollection.userInterfaceStyle;
    }
    if (style == UIUserInterfaceStyleUnspecified) {
        style = self.hudWindow.traitCollection.userInterfaceStyle;
    }
    if (style == UIUserInterfaceStyleUnspecified) {
        NSString *storedStyle = [[NSUserDefaults standardUserDefaults] stringForKey:@"AppleInterfaceStyle"];
        if (storedStyle && [storedStyle caseInsensitiveCompare:@"Dark"] == NSOrderedSame) {
            style = UIUserInterfaceStyleDark;
        }
    }
    return style == UIUserInterfaceStyleDark ? UIUserInterfaceStyleDark : UIUserInterfaceStyleLight;
}

- (void)applyCurrentAppearance {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self applyCurrentAppearance]; });
        return;
    }
    UIUserInterfaceStyle style = [self currentSystemAppearanceStyle];
    self.lastAppearanceStyle = style;
    BOOL dark = style == UIUserInterfaceStyleDark;
    UIColor *solidSurface = [UIColor colorWithWhite:dark ? 0.04 : 1.0 alpha:1.0];
    UIColor *toolbarSurface = [UIColor colorWithWhite:dark ? 0.04 : 1.0 alpha:0.92];
    UIColor *primaryText = dark ? UIColor.whiteColor : UIColor.blackColor;
    UIColor *secondaryText = dark ? UIColor.systemGray2Color : UIColor.systemGrayColor;

    self.toolbar.backgroundColor = toolbarSurface;
    for (UIView *view in self.toolbar.subviews) {
        if (![view isKindOfClass:UIButton.class]) { continue; }
        UIButton *button = (UIButton *)view;
        if ([button.accessibilityIdentifier containsString:@"toolbarClose:"]) {
            button.tintColor = primaryText;
        }
    }
    for (ATMarkerView *marker in self.markerViews) {
        marker.backgroundColor = solidSurface;
    }
    self.countdownBadge.backgroundColor = [solidSurface colorWithAlphaComponent:0.94];
    self.countdownLabel.textColor = primaryText;
    for (UIView *view in self.countdownBadge.subviews) {
        if ([view isKindOfClass:UILabel.class] && view != self.countdownLabel) {
            ((UILabel *)view).textColor = secondaryText;
        }
    }
    self.completionPanel.backgroundColor = [solidSurface colorWithAlphaComponent:0.96];
    self.completionPanel.layer.borderColor = (dark
        ? [UIColor colorWithWhite:1.0 alpha:0.13]
        : [UIColor colorWithWhite:0.0 alpha:0.10]).CGColor;
    for (UIView *view in self.completionPanel.subviews) {
        if ([view isKindOfClass:UILabel.class]) {
            ((UILabel *)view).textColor = primaryText;
        }
    }
    self.editorPanel.backgroundColor = dark
        ? [UIColor colorWithWhite:0.10 alpha:0.98]
        : [UIColor colorWithWhite:1.0 alpha:0.98];
    [CATransaction flush];
}

- (void)appearanceTimerFired:(NSTimer *)timer {
    UIUserInterfaceStyle style = [self currentSystemAppearanceStyle];
    if (style != self.lastAppearanceStyle) { [self applyCurrentAppearance]; }
}

- (void)startAppearanceMonitoring {
    [self applyCurrentAppearance];
    if (self.appearanceTimer) { return; }
    self.appearanceTimer = [NSTimer timerWithTimeInterval:0.35
                                                   target:self
                                                 selector:@selector(appearanceTimerFired:)
                                                 userInfo:nil
                                                  repeats:YES];
    [[NSRunLoop mainRunLoop] addTimer:self.appearanceTimer forMode:NSRunLoopCommonModes];
}

- (void)stopAppearanceMonitoring {
    [self.appearanceTimer invalidate];
    self.appearanceTimer = nil;
    self.lastAppearanceStyle = UIUserInterfaceStyleUnspecified;
}

- (BOOL)startPhysicalHIDMonitor {
    if (_hidMonitor) { return YES; }

    _ioKitHandle = dlopen("/System/Library/Frameworks/IOKit.framework/IOKit", RTLD_LAZY | RTLD_LOCAL);
    _backBoardHandle = dlopen("/System/Library/PrivateFrameworks/BackBoardServices.framework/BackBoardServices", RTLD_LAZY | RTLD_LOCAL);
    // Reading the global digitizer stream only depends on IOKit. BackBoard is
    // optional here; requiring it made drag support fail completely on builds
    // where that private framework could not be opened even though HID monitor
    // permission was present.
    if (!_ioKitHandle) { return NO; }

    _createHIDSystemClient = (ATCreateHIDSystemClientFn)dlsym(_ioKitHandle, "IOHIDEventSystemClientCreate");
    _createDigitizerEvent = (ATCreateDigitizerEventFn)dlsym(_ioKitHandle, "IOHIDEventCreateDigitizerEvent");
    _createFingerEvent = (ATCreateFingerEventFn)dlsym(_ioKitHandle, "IOHIDEventCreateDigitizerFingerEvent");
    _appendHIDEvent = (ATAppendHIDEventFn)dlsym(_ioKitHandle, "IOHIDEventAppendEvent");
    _registerHIDCallback = (ATRegisterHIDCallbackFn)dlsym(_ioKitHandle, "IOHIDEventSystemClientRegisterEventCallback");
    _unregisterHIDCallback = (ATUnregisterHIDCallbackFn)dlsym(_ioKitHandle, "IOHIDEventSystemClientUnregisterEventCallback");
    _registerHIDFilterBlock = (ATRegisterHIDFilterBlockFn)dlsym(_ioKitHandle, "IOHIDEventSystemClientRegisterEventFilterBlock");
    _scheduleHIDClient = (ATScheduleHIDClientFn)dlsym(_ioKitHandle, "IOHIDEventSystemClientScheduleWithRunLoop");
    _unscheduleHIDClient = (ATUnscheduleHIDClientFn)dlsym(_ioKitHandle, "IOHIDEventSystemClientUnscheduleWithRunLoop");
    _copyHIDEvent = (ATCopyHIDEventFn)dlsym(_ioKitHandle, "IOHIDEventCreateCopy");
    _getHIDChildren = (ATGetHIDChildrenFn)dlsym(_ioKitHandle, "IOHIDEventGetChildren");
    _getHIDType = (ATGetHIDTypeFn)dlsym(_ioKitHandle, "IOHIDEventGetType");
    _getHIDFloatValue = (ATGetHIDFloatValueFn)dlsym(_ioKitHandle, "IOHIDEventGetFloatValue");
    _getHIDIntegerValue = (ATGetHIDIntegerValueFn)dlsym(_ioKitHandle, "IOHIDEventGetIntegerValue");
    _getHIDSenderID = (ATGetHIDSenderIDFn)dlsym(_ioKitHandle, "IOHIDEventGetSenderID");
    _getHIDTimestamp = (ATGetHIDTimestampFn)dlsym(_ioKitHandle, "IOHIDEventGetTimeStamp");
    _setHIDSenderID = (ATSetHIDSenderIDFn)dlsym(_ioKitHandle, "IOHIDEventSetSenderID");
    _setHIDIntegerValue = (ATSetHIDIntegerValueFn)dlsym(_ioKitHandle, "IOHIDEventSetIntegerValue");
    _setHIDFloatValue = (ATSetHIDFloatValueFn)dlsym(_ioKitHandle, "IOHIDEventSetFloatValue");
    _setDigitizerInfo = (ATSetDigitizerInfoFn)dlsym(_backBoardHandle, "BKSHIDEventSetDigitizerInfo");

    // Direct HUD manipulation only needs the raw monitor and field readers.
    // Creation/BackBoard symbols remain optional for older fallback paths and
    // must not prevent physical drag handling from starting.
    if (!_createHIDSystemClient || (!_registerHIDFilterBlock && !_registerHIDCallback) || !_scheduleHIDClient ||
        !_getHIDChildren || !_getHIDType || !_getHIDFloatValue ||
        !_getHIDIntegerValue || !_getHIDTimestamp) {
        return NO;
    }

    _hidMonitor = _createHIDSystemClient(kCFAllocatorDefault);
    if (!_hidMonitor) { return NO; }
    // Prefer the private filter block.  It both delivers the event to us and
    // lets us return YES for a HUD-owned stream, preventing the foreground app
    // from receiving the same drag.  Older systems without this symbol fall
    // back to the observational callback (dragging still works, but the
    // underlying app may also see the touch).
    if (_registerHIDFilterBlock) {
        __weak ATSystemOverlayController *weakSelf = self;
        _hidFilterBlock = [^(void *target, void *refcon, void *sender, IOHIDEventRef event) {
            ATSystemOverlayController *controller = weakSelf;
            return controller ? [controller processPhysicalHIDEvent:event] : (uint32_t)false;
        } copy];
        _registerHIDFilterBlock(_hidMonitor, _hidFilterBlock, NULL, NULL);
    } else {
        _registerHIDCallback(_hidMonitor, ATSystemOverlayHIDCallback, (__bridge void *)self, NULL);
    }
    _scheduleHIDClient(_hidMonitor, CFRunLoopGetMain(), kCFRunLoopCommonModes);
    return YES;
}

- (void)stopPhysicalHIDMonitor {
    self.activeInputContextID = 0;
    _physicalTouchActive = NO;
    _filterTouchActive = NO;
    _forwardedTouchActive = NO;
    _recordingTouchCandidate = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastTapAt = 0;
    [self resetDirectTouchState];
    if (!_hidMonitor) { _hidFilterBlock = nil; return; }
    if (_unregisterHIDCallback) { _unregisterHIDCallback(_hidMonitor); }
    if (_unscheduleHIDClient) {
        _unscheduleHIDClient(_hidMonitor, CFRunLoopGetMain(), kCFRunLoopCommonModes);
    }
    CFRelease(_hidMonitor);
    _hidMonitor = NULL;
    _hidFilterBlock = nil;
}

- (IOHIDEventRef)fingerEventFromEvent:(IOHIDEventRef)event {
    if (!_getHIDChildren) { return event; }
    CFArrayRef children = _getHIDChildren(event);
    if (!children || CFArrayGetCount(children) == 0) { return event; }
    // Digitizer collections place the active finger in the last child.
    return (IOHIDEventRef)CFArrayGetValueAtIndex(children, CFArrayGetCount(children) - 1);
}

- (uint32_t)inputContextAtScreenPoint:(CGPoint)point {
    if (self.hudWindow && self.hudContextID != 0) {
        CGPoint local = [self.hudWindow convertPoint:point fromWindow:nil];
        UIView *hit = [self.hudWindow hitTest:local withEvent:nil];
        if (hit && hit != self.hudWindow && hit != self.hudController.view) {
            return self.hudContextID;
        }
    }
    if (self.interactionWindow.systemInteractionEnabled && self.interactionContextID != 0) {
        CGPoint local = [self.interactionWindow convertPoint:point fromWindow:nil];
        UIView *hit = [self.interactionWindow hitTest:local withEvent:nil];
        if (hit && hit != self.interactionWindow && hit != self.interactionController.view) {
            return self.interactionContextID;
        }
    }
    return 0;
}

- (void)handlePhysicalHIDEvent:(IOHIDEventRef)event {
    // A hosted window remains visible while this process is in the background,
    // but UIKit does not reliably feed that background window's gesture
    // recognizers. Consume the raw digitizer stream ourselves and manipulate
    // the HUD views directly instead of attempting to re-enqueue UIEvents.
    if (!self.visible || _editingSuppressed) { return; }
    CGPoint point = CGPointZero;
    BOOL touching = NO;
    if (![self readPhysicalHIDEvent:event point:&point touching:&touching]) { return; }

    BOOL began = touching && !_physicalTouchActive;
    BOOL ended = !touching && _physicalTouchActive;
    if (!began && !ended && !_physicalTouchActive) { return; }
    if (touching) { _lastPhysicalTouchPoint = point; }
    if (began) {
        BOOL touchesHUD = [self hudOwnsScreenPoint:point];
        _recordingTouchCandidate = self.recording && self.recordingActive && !touchesHUD;
        _recordingTouchStartPoint = point;
        _recordingTouchStartedAt = CACurrentMediaTime();
        [self beginDirectTouchAtPoint:point];
    } else if (touching) {
        if (_recordingTouchCandidate &&
            hypot(point.x - _recordingTouchStartPoint.x, point.y - _recordingTouchStartPoint.y) > 12.0) {
            _recordingTouchCandidate = NO;
        }
        [self moveDirectTouchToPoint:point];
    }
    _physicalTouchActive = touching;
    if (ended) {
        if (_recordingTouchCandidate && self.recordTapHandler) {
            CFTimeInterval now = CACurrentMediaTime();
            NSInteger intervalMilliseconds = _recordingLastTapAt > 0
                ? (NSInteger)llround((now - _recordingLastTapAt) * 1000.0)
                : 500;
            NSInteger durationMilliseconds = (NSInteger)llround((now - _recordingTouchStartedAt) * 1000.0);
            CGSize size = UIScreen.mainScreen.bounds.size;
            CGFloat x = MIN(MAX(_lastPhysicalTouchPoint.x / MAX(size.width, 1), 0), 1);
            CGFloat y = MIN(MAX(_lastPhysicalTouchPoint.y / MAX(size.height, 1), 0), 1);
            _recordingLastTapAt = now;
            self.recordTapHandler(x,
                                  y,
                                  MIN(MAX(intervalMilliseconds, 1), 3600000),
                                  MIN(MAX(durationMilliseconds, 1), 10000));
        }
        _recordingTouchCandidate = NO;
        [self endDirectTouchAtPoint:_lastPhysicalTouchPoint cancelled:NO];
    }
}

- (uint32_t)processPhysicalHIDEvent:(IOHIDEventRef)event {
    if (!event) { return 0; }
    // Synthetic dispatch can invoke this filter synchronously. Reject it
    // before any main-queue hop; otherwise a warm-up frame sent from the main
    // thread can wait on a filter callback that is itself waiting on main.
    if (ATTouchDispatcherIsSyntheticDispatchInProgress() ||
        (_getHIDTimestamp && ATTouchDispatcherIsSyntheticTimestamp(_getHIDTimestamp(event)))) {
        return 0;
    }
    if (!NSThread.isMainThread) {
        __block uint32_t filtered = 0;
        CFRetain(event);
        dispatch_sync(dispatch_get_main_queue(), ^{
            filtered = [self processPhysicalHIDEvent:event];
            CFRelease(event);
        });
        return filtered;
    }
    BOOL filtered = [self shouldFilterPhysicalHIDEvent:event];
    [self handlePhysicalHIDEvent:event];
    return filtered ? 1u : 0u;
}

- (BOOL)readPhysicalHIDEvent:(IOHIDEventRef)event point:(CGPoint *)point touching:(BOOL *)touching {
    if (!event || !_getHIDType || !_getHIDChildren || !_getHIDFloatValue ||
        !_getHIDIntegerValue || !_getHIDTimestamp || !point || !touching) {
        return NO;
    }
    if (_getHIDType(event) != ATDigitizerEventType) { return NO; }
    if (ATTouchDispatcherIsSyntheticDispatchInProgress() ||
        ATTouchDispatcherIsSyntheticTimestamp(_getHIDTimestamp(event))) {
        return NO;
    }

    IOHIDEventRef finger = [self fingerEventFromEvent:event];
    if (!finger) { return NO; }
    *touching = _getHIDIntegerValue(finger, ATFieldDigitizerTouch) != 0;
    double x = _getHIDFloatValue(finger, ATFieldDigitizerX);
    double y = _getHIDFloatValue(finger, ATFieldDigitizerY);
    CGSize size = UIScreen.mainScreen.bounds.size;
    // Physical events are generally logical points.  A few iOS releases
    // expose normalized 0...1 values to the monitor client; accept both so
    // the HUD remains draggable across system versions and display scales.
    if (x >= 0 && x <= 1.001 && y >= 0 && y <= 1.001) {
        x *= size.width;
        y *= size.height;
    }
    *point = CGPointMake(MIN(MAX(x, 0), size.width), MIN(MAX(y, 0), size.height));
    return YES;
}

- (BOOL)shouldFilterPhysicalHIDEvent:(IOHIDEventRef)event {
    if (!NSThread.isMainThread) {
        __block BOOL filtered = NO;
        CFRetain(event);
        dispatch_sync(dispatch_get_main_queue(), ^{
            filtered = [self shouldFilterPhysicalHIDEvent:event];
            CFRelease(event);
        });
        return filtered;
    }
    if (!self.visible || _editingSuppressed) {
        _filterTouchActive = NO;
        return NO;
    }
    CGPoint point = CGPointZero;
    BOOL touching = NO;
    if (![self readPhysicalHIDEvent:event point:&point touching:&touching]) { return NO; }

    // Decide ownership on the first digitizer frame at a HUD control.  Some
    // iOS versions publish a range frame (touch=0) immediately before the
    // actual down frame; claiming the stream from that first frame prevents
    // the foreground app from beginning a scroll before the marker drag is
    // recognized. Once claimed, consume every frame—including the lift.
    if (!_filterTouchActive) {
        _filterTouchActive = [self hudOwnsScreenPoint:point];
    }
    BOOL filtered = _filterTouchActive;
    if (!touching) { _filterTouchActive = NO; }
    return filtered;
}

- (BOOL)hudOwnsScreenPoint:(CGPoint)point {
    if (!self.hudWindow || self.hudWindow.hidden || _editingSuppressed) { return NO; }

    // First use UIKit's normal hit-test path. This is the most accurate route
    // when the hosted window has a valid WindowServer context.
    if ([self hudHitViewAtScreenPoint:point] != nil) { return YES; }

    // A hosted window can briefly report no hit-test result while its context
    // is being mirrored by SpringBoard. Fall back to geometry in the same
    // root-view coordinate space so a marker drag is still claimed from its
    // very first frame and never turns into an underlying-app scroll.
    return [self fallbackHUDHitViewAtScreenPoint:point] != nil;
}

- (UIView *)hudHitViewAtScreenPoint:(CGPoint)point {
    if (!self.hudWindow || self.hudWindow.hidden || _editingSuppressed) { return nil; }
    CGPoint local = [self.hudWindow convertPoint:point fromWindow:nil];
    return [self.hudWindow hitTest:local withEvent:nil];
}

- (UIView *)fallbackHUDHitViewAtScreenPoint:(CGPoint)point {
    if (!self.hudWindow || self.hudWindow.hidden || _editingSuppressed) { return nil; }
    CGPoint windowPoint = [self.hudWindow convertPoint:point fromWindow:nil];
    CGPoint rootPoint = [self.hudController.view convertPoint:windowPoint fromView:self.hudWindow];

    // Check the editor first because it visually sits above every marker and
    // the toolbar. Calling hitTest on the candidate itself still resolves its
    // nested buttons even when the hosted UIWindow does not receive UIEvents.
    if (self.editorBackdrop) {
        CGPoint local = [self.editorBackdrop convertPoint:rootPoint fromView:self.hudController.view];
        if ([self.editorBackdrop pointInside:local withEvent:nil]) {
            return [self.editorBackdrop hitTest:local withEvent:nil] ?: self.editorBackdrop;
        }
    }
    if (self.toolbar) {
        CGPoint local = [self.toolbar convertPoint:rootPoint fromView:self.hudController.view];
        if ([self.toolbar pointInside:local withEvent:nil]) {
            UIView *hit = [self.toolbar hitTest:local withEvent:nil];
            if (hit && hit != self.toolbar) { return hit; }
            // Hosted contexts occasionally return only the toolbar container.
            // Resolve its buttons explicitly so minus/play/stop cannot be
            // missed after an overlay close and reopen.
            for (UIView *subview in [self.toolbar.subviews reverseObjectEnumerator]) {
                if (subview.hidden || subview.alpha < 0.01 || !subview.userInteractionEnabled) { continue; }
                CGPoint childPoint = [subview convertPoint:local fromView:self.toolbar];
                if ([subview pointInside:childPoint withEvent:nil]) {
                    return [subview hitTest:childPoint withEvent:nil] ?: subview;
                }
            }
            return self.toolbar;
        }
    }
    if (!self.running && !self.recording && self.pointEditingEnabled) {
        for (UIView *marker in [self.markerHitViews reverseObjectEnumerator]) {
            CGPoint local = [marker convertPoint:rootPoint fromView:self.hudController.view];
            if ([marker pointInside:local withEvent:nil]) {
                return [marker hitTest:local withEvent:nil] ?: marker;
            }
        }
    }
    return nil;
}

- (UIButton *)buttonAncestorOfView:(UIView *)view {
    UIView *candidate = view;
    while (candidate && candidate != self.hudController.view) {
        if ([candidate isKindOfClass:UIButton.class]) { return (UIButton *)candidate; }
        candidate = candidate.superview;
    }
    return nil;
}

- (NSInteger)markerIndexContainingView:(UIView *)view {
    UIView *candidate = view;
    while (candidate && candidate != self.hudController.view) {
        NSUInteger index = [self.markerHitViews indexOfObjectIdenticalTo:candidate];
        if (index != NSNotFound) { return (NSInteger)index; }
        candidate = candidate.superview;
    }
    return NSNotFound;
}

- (void)beginDirectTouchAtPoint:(CGPoint)point {
    [self resetDirectTouchState];
    UIView *hit = [self hudHitViewAtScreenPoint:point];
    if (!hit) { hit = [self fallbackHUDHitViewAtScreenPoint:point]; }
    if (!hit) { return; }

    _directTouchStartPoint = point;
    _directTouchMoved = NO;
    NSInteger markerIndex = [self markerIndexContainingView:hit];
    if (markerIndex != NSNotFound && !self.running && self.pointEditingEnabled) {
        _directTouchTarget = ATDirectTouchTargetMarker;
        _directMarkerIndex = markerIndex;
        _directTargetStartCenter = self.markerHitViews[markerIndex].center;
        self.gestureInProgress = YES;
        self.selectedIndex = markerIndex;
        if (self.selectHandler) { self.selectHandler(markerIndex); }
        [self updateOverlayContentInPlace];
        return;
    }

    if (self.editorUnitControl && [hit isDescendantOfView:self.editorUnitControl]) {
        _directTouchTarget = ATDirectTouchTargetSegmentedControl;
        _directControlView = self.editorUnitControl;
        return;
    }

    UIButton *button = [self buttonAncestorOfView:hit];
    if (button) {
        _directTouchTarget = ATDirectTouchTargetControl;
        _directControlView = button;
        _directTargetStartCenter = self.toolbar.center;
        button.highlighted = YES;
        return;
    }

    if (hit == self.editorBackdrop) {
        _directTouchTarget = ATDirectTouchTargetControl;
        _directControlView = hit;
        return;
    }

    if (self.toolbar && (hit == self.toolbar || [hit isDescendantOfView:self.toolbar])) {
        _directTouchTarget = ATDirectTouchTargetToolbar;
        _directTargetStartCenter = self.toolbar.center;
        self.gestureInProgress = YES;
    }
}

- (void)moveDirectTouchToPoint:(CGPoint)point {
    if (_directTouchTarget == ATDirectTouchTargetNone) { return; }
    CGFloat dx = point.x - _directTouchStartPoint.x;
    CGFloat dy = point.y - _directTouchStartPoint.y;
    CGFloat distance = hypot(dx, dy);
    if (distance > 6.0) { _directTouchMoved = YES; }

    // A button occupies most of the narrow toolbar. Once the finger actually
    // moves, turn that press into a toolbar drag instead of firing the button.
    if (_directTouchTarget == ATDirectTouchTargetControl &&
        _directTouchMoved && self.toolbar &&
        (_directControlView == self.toolbar || [_directControlView isDescendantOfView:self.toolbar])) {
        if ([_directControlView isKindOfClass:UIButton.class]) {
            ((UIButton *)_directControlView).highlighted = NO;
        }
        _directTouchTarget = ATDirectTouchTargetToolbar;
        _directControlView = nil;
        self.gestureInProgress = YES;
    }

    CGRect bounds = self.hudWindow.bounds;
    if (_directTouchTarget == ATDirectTouchTargetMarker &&
        _directMarkerIndex >= 0 && _directMarkerIndex < self.markerHitViews.count) {
        UIView *container = self.markerHitViews[_directMarkerIndex];
        CGFloat halfWidth = CGRectGetWidth(container.bounds) / 2.0;
        CGFloat halfHeight = CGRectGetHeight(container.bounds) / 2.0;
        CGPoint center = CGPointMake(_directTargetStartCenter.x + dx,
                                     _directTargetStartCenter.y + dy);
        center.x = MIN(MAX(center.x, halfWidth), CGRectGetWidth(bounds) - halfWidth);
        center.y = MIN(MAX(center.y, halfHeight), CGRectGetHeight(bounds) - halfHeight);
        // Move the one container that owns both the visible number and its hit
        // area. No duplicate visual view is rebuilt during this gesture.
        [CATransaction begin];
        [CATransaction setDisableActions:YES];
        container.center = center;
        [CATransaction commit];
        // A SpringBoard-hosted context can otherwise present one frame behind
        // while this process is in the background. Flush the same container
        // that owns both the hit target and visible number.
        [CATransaction flush];
        return;
    }

    if (_directTouchTarget == ATDirectTouchTargetToolbar && self.toolbar) {
        CGFloat halfWidth = CGRectGetWidth(self.toolbar.bounds) / 2.0;
        CGFloat halfHeight = CGRectGetHeight(self.toolbar.bounds) / 2.0;
        CGPoint center = CGPointMake(_directTargetStartCenter.x + dx,
                                     _directTargetStartCenter.y + dy);
        center.x = MIN(MAX(center.x, halfWidth + 4), CGRectGetWidth(bounds) - halfWidth - 4);
        center.y = MIN(MAX(center.y, halfHeight + 8), CGRectGetHeight(bounds) - halfHeight - 8);
        [CATransaction begin];
        [CATransaction setDisableActions:YES];
        self.toolbar.center = center;
        [CATransaction commit];
        [CATransaction flush];
    }
}

- (void)activateDirectControl:(UIView *)control atScreenPoint:(CGPoint)point {
    if (!control || control.hidden || control.alpha < 0.01 || !control.userInteractionEnabled) { return; }
    CGPoint windowPoint = [self.hudWindow convertPoint:point fromWindow:nil];
    CGPoint rootPoint = [self.hudController.view convertPoint:windowPoint fromView:self.hudWindow];
    CGPoint local = [control convertPoint:rootPoint fromView:self.hudController.view];
    if (![control pointInside:local withEvent:nil]) { return; }

    NSString *directAction = control.accessibilityIdentifier;
    static NSString *const actionPrefix = @"AutoTap.DirectAction.";
    if ([directAction hasPrefix:actionPrefix]) {
        SEL selector = NSSelectorFromString([directAction substringFromIndex:actionPrefix.length]);
        if ([self respondsToSelector:selector]) {
            ((void (*)(id, SEL, id))objc_msgSend)(self, selector, control);
        }
    } else if ([control isKindOfClass:UISegmentedControl.class]) {
        UISegmentedControl *segmented = (UISegmentedControl *)control;
        NSInteger count = segmented.numberOfSegments;
        if (count > 0) {
            NSInteger index = (NSInteger)floor(local.x / MAX(CGRectGetWidth(segmented.bounds), 1) * count);
            segmented.selectedSegmentIndex = MIN(MAX(index, 0), count - 1);
            [segmented sendActionsForControlEvents:UIControlEventValueChanged];
        }
    }
}

- (void)endDirectTouchAtPoint:(CGPoint)point cancelled:(BOOL)cancelled {
    ATDirectTouchTarget target = _directTouchTarget;
    NSInteger markerIndex = _directMarkerIndex;
    UIView *control = _directControlView;
    BOOL moved = _directTouchMoved;

    if ([control isKindOfClass:UIButton.class]) {
        ((UIButton *)control).highlighted = NO;
    }

    if (!cancelled && target == ATDirectTouchTargetMarker &&
        markerIndex >= 0 && markerIndex < self.markerHitViews.count) {
        UIView *container = self.markerHitViews[markerIndex];
        if (moved) {
            CGRect bounds = self.hudWindow.bounds;
            CGFloat x = MIN(MAX(container.center.x / MAX(CGRectGetWidth(bounds), 1), 0), 1);
            CGFloat y = MIN(MAX(container.center.y / MAX(CGRectGetHeight(bounds), 1), 0), 1);
            if (self.moveHandler) { self.moveHandler(markerIndex, x, y); }
        } else {
            self.selectedIndex = markerIndex;
            if (self.selectHandler) { self.selectHandler(markerIndex); }
            [self updateOverlayContentInPlace];
            [self showPointEditorAtIndex:markerIndex];
        }
    } else if (!cancelled && target == ATDirectTouchTargetToolbar && moved && self.toolbar) {
        CGRect bounds = self.hudWindow.bounds;
        self.toolbarCenterRatio = CGPointMake(
            self.toolbar.center.x / MAX(CGRectGetWidth(bounds), 1),
            self.toolbar.center.y / MAX(CGRectGetHeight(bounds), 1));
    } else if (!cancelled && !moved &&
               (target == ATDirectTouchTargetControl || target == ATDirectTouchTargetSegmentedControl)) {
        [self activateDirectControl:control atScreenPoint:point];
    }

    BOOL wasGesture = self.gestureInProgress;
    [self resetDirectTouchState];
    if (wasGesture) { [self finishGestureAndApplyPendingRebuild]; }
}

- (void)resetDirectTouchState {
    if ([_directControlView isKindOfClass:UIButton.class]) {
        ((UIButton *)_directControlView).highlighted = NO;
    }
    _directTouchTarget = ATDirectTouchTargetNone;
    _directMarkerIndex = NSNotFound;
    _directControlView = nil;
    _directTouchMoved = NO;
}

- (BOOL)showWithPoints:(NSArray<NSValue *> *)points
         actionSettings:(NSArray<NSDictionary<NSString *,NSNumber *> *> *)actionSettings
              multiple:(BOOL)multiple
          selectedIndex:(NSInteger)selectedIndex
            activeIndex:(NSInteger)activeIndex
            markerScale:(CGFloat)markerScale
           controlScale:(CGFloat)controlScale
         editingEnabled:(BOOL)editingEnabled
                running:(BOOL)running
       countdownSeconds:(NSInteger)countdownSeconds {
    NSAssert(NSThread.isMainThread, @"Overlay must be created on the main thread");
    if (!self.available) { return NO; }
    UIWindow *applicationWindow = [self foregroundApplicationWindow];
    if (applicationWindow) { self.ownerWindow = applicationWindow; }
    [self createWindowsIfNeeded];
    [self startAppearanceMonitoring];
    [self updateWithPoints:points
            actionSettings:actionSettings
                  multiple:multiple
              selectedIndex:selectedIndex
                activeIndex:activeIndex
                markerScale:markerScale
               controlScale:controlScale
             editingEnabled:editingEnabled
                    running:running
           countdownSeconds:countdownSeconds];
    // Every marker and control is now drawn and hit-tested in the same hosted
    // HUD context. Keeping the two legacy layers hidden prevents a second
    // stale copy of a marker from remaining at its pre-drag position.
    self.visualWindow.hidden = YES;
    self.interactionWindow.hidden = YES;
    self.hudWindow.hidden = NO;
    self.hudWindow.systemInteractionEnabled = YES;
    self.hudWindow.userInteractionEnabled = YES;
    self.hudController.view.hidden = NO;
    _editingSuppressed = NO;
    // A system-hosted HUD must not replace the app's own key window. If it
    // does, SwiftUI recomputes its safe area and the whole page can step down
    // after every close/open cycle.
    if (UIApplication.sharedApplication.applicationState == UIApplicationStateActive &&
        self.ownerWindow && !self.ownerWindow.isKeyWindow) {
        [self.ownerWindow makeKeyWindow];
    }
    [CATransaction flush];
    // Start the raw monitor before attempting WindowServer registration.  A
    // hosted context can take a few hundred milliseconds to obtain its ID; if
    // the user taps Play during that window, waiting to start the monitor until
    // registration succeeds loses the first control touch.  The monitor is
    // idempotent and will begin routing the HUD as soon as its context appears.
    (void)[self startPhysicalHIDMonitor];
    self.registrationGeneration += 1;
    [self registerWindowsWithAttempt:0 generation:self.registrationGeneration];
    return YES;
}

- (void)updateWithPoints:(NSArray<NSValue *> *)points
          actionSettings:(NSArray<NSDictionary<NSString *,NSNumber *> *> *)actionSettings
                multiple:(BOOL)multiple
            selectedIndex:(NSInteger)selectedIndex
              activeIndex:(NSInteger)activeIndex
              markerScale:(CGFloat)markerScale
             controlScale:(CGFloat)controlScale
           editingEnabled:(BOOL)editingEnabled
                  running:(BOOL)running
         countdownSeconds:(NSInteger)countdownSeconds {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self updateWithPoints:points actionSettings:actionSettings multiple:multiple selectedIndex:selectedIndex activeIndex:activeIndex markerScale:markerScale controlScale:controlScale editingEnabled:editingEnabled running:running countdownSeconds:countdownSeconds];
        });
        return;
    }
    BOOL structureChanged = self.points.count != points.count ||
        self.multiple != multiple ||
        self.pointEditingEnabled != editingEnabled ||
        fabs(self.markerScale - markerScale) > 0.001 ||
        fabs(self.controlScale - controlScale) > 0.001;
    self.points = [points copy];
    self.actionSettings = [actionSettings copy];
    self.multiple = multiple;
    self.selectedIndex = selectedIndex;
    self.activeIndex = activeIndex;
    self.markerScale = MIN(MAX(markerScale, 0.75), 1.5);
    self.controlScale = MIN(MAX(controlScale, 0.8), 1.35);
    self.pointEditingEnabled = editingEnabled;
    self.running = running;
    self.countdownSeconds = countdownSeconds;
    if (self.hudWindow != nil) {
        if (self.gestureInProgress) {
            self.rebuildPending = self.rebuildPending || structureChanged;
        } else if (structureChanged || self.markerViews.count != self.points.count) {
            [self rebuildOverlayContent];
        } else {
            [self updateOverlayContentInPlace];
        }
    }
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
    __weak ATSystemOverlayController *weakSelf = self;
    self.hudController.appearanceDidChange = ^{
        [weakSelf applyCurrentAppearance];
    };
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
    self.hudWindow.systemInteractionEnabled = YES;
}

- (UIWindow *)foregroundApplicationWindow {
    UIWindow *fallback = nil;
    if (@available(iOS 13.0, *)) {
        UIWindowScene *scene = [self preferredWindowScene];
        for (UIWindow *window in scene.windows) {
            if (window == self.visualWindow || window == self.interactionWindow || window == self.hudWindow) { continue; }
            if (window.isKeyWindow) { return window; }
            if (!window.hidden && window.alpha > 0.01 && window.windowLevel == UIWindowLevelNormal) {
                fallback = fallback ?: window;
            }
        }
    }
    if (!fallback) {
        for (UIWindow *window in UIApplication.sharedApplication.windows) {
            if (window == self.visualWindow || window == self.interactionWindow || window == self.hudWindow) { continue; }
            if (window.isKeyWindow) { return window; }
            if (!window.hidden && window.alpha > 0.01 && window.windowLevel == UIWindowLevelNormal) {
                fallback = fallback ?: window;
            }
        }
    }
    return fallback;
}

- (void)rebuildOverlayContent {
    for (UIView *view in self.markerViews) { [view removeFromSuperview]; }
    for (UIView *view in self.markerHitViews) { [view removeFromSuperview]; }
    [self.markerViews removeAllObjects];
    [self.markerHitViews removeAllObjects];
    [self.toolbar removeFromSuperview];
    self.runButton = nil;
    self.interactionWindow.systemInteractionEnabled = !self.running;

    CGRect bounds = self.hudWindow.bounds;
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
        CGFloat hitSide = MAX(58.0, 58.0 * self.markerScale);
        UIView *hit = [[UIView alloc] initWithFrame:CGRectMake(0, 0, hitSide, hitSide)];
        hit.center = center;
        hit.backgroundColor = UIColor.clearColor;
        hit.tag = index;
        hit.userInteractionEnabled = !self.running && !self.recording && self.pointEditingEnabled;
        marker.center = CGPointMake(CGRectGetMidX(hit.bounds), CGRectGetMidY(hit.bounds));
        marker.alpha = (self.running || self.recordingActive) ? 0.20 : 1.0;
        [hit addSubview:marker];
        // Raw HID is the only gesture path. Keeping UIKit recognizers here made
        // one physical drag execute twice whenever the hosted context also
        // received a normal UIEvent.
        [self.hudController.view addSubview:hit];
        [self.markerViews addObject:marker];
        [self.markerHitViews addObject:hit];
    }
    [self buildToolbar];
    [self updateCountdownHUD];
    [self applyCurrentAppearance];
}

- (void)updateOverlayContentInPlace {
    CGRect bounds = self.hudWindow.bounds;
    CGFloat width = CGRectGetWidth(bounds);
    CGFloat height = CGRectGetHeight(bounds);
    self.interactionWindow.systemInteractionEnabled = !self.running;
    for (NSInteger index = 0; index < self.markerViews.count && index < self.points.count; index++) {
        CGPoint ratio = self.points[index].CGPointValue;
        CGPoint center = CGPointMake(MIN(MAX(ratio.x * width, 28), width - 28),
                                     MIN(MAX(ratio.y * height, 28), height - 28));
        ATMarkerView *marker = self.markerViews[index];
        [marker configureNumber:index + 1
                          scale:self.markerScale
                       selected:index == self.selectedIndex
                         active:(!self.running ? NO : index == self.activeIndex)];
        UIView *hit = self.markerHitViews[index];
        hit.tag = index;
        hit.center = center;
        hit.userInteractionEnabled = !self.running && !self.recording && self.pointEditingEnabled;
        marker.center = CGPointMake(CGRectGetMidX(hit.bounds), CGRectGetMidY(hit.bounds));
        marker.alpha = (self.running || self.recordingActive) ? 0.20 : 1.0;
    }
    UIImageSymbolConfiguration *configuration = [UIImageSymbolConfiguration configurationWithPointSize:21.0 * self.controlScale weight:UIImageSymbolWeightBold];
    NSString *symbol = self.running ? @"pause.fill" : @"play.fill";
    [self.runButton setImage:[UIImage systemImageNamed:symbol withConfiguration:configuration] forState:UIControlStateNormal];
    self.runButton.tintColor = self.running ? UIColor.systemOrangeColor : UIColor.systemBlueColor;
    if (self.running) { [self dismissPointEditor]; }
    [self updateCountdownHUD];
    [self applyCurrentAppearance];
}

- (void)buildToolbar {
    CGFloat s = self.controlScale;
    CGFloat buttonSide = 43.0 * s;
    CGFloat gap = 4.0 * s;

    NSMutableArray<NSDictionary *> *items = [NSMutableArray array];
    [items addObject:@{@"symbol": @"xmark", @"color": UIColor.labelColor, @"action": @"toolbarClose:"}];
    if (self.recording) {
        if (self.recordingActive) {
            [items addObject:@{@"symbol": @"stop.fill", @"color": UIColor.systemRedColor, @"action": @"toolbarFinishRecording:"}];
        } else {
            [items addObject:@{@"symbol": @"record.circle.fill", @"color": UIColor.systemRedColor, @"action": @"toolbarStartRecording:"}];
        }
    } else {
        [items addObject:@{@"symbol": self.running ? @"pause.fill" : @"play.fill", @"color": self.running ? UIColor.systemOrangeColor : UIColor.systemBlueColor, @"action": @"toolbarToggle:"}];
        if (self.multiple && self.pointEditingEnabled) {
            [items addObject:@{@"symbol": @"plus", @"color": UIColor.systemGreenColor, @"action": @"toolbarAdd:"}];
            [items addObject:@{@"symbol": @"minus", @"color": UIColor.systemRedColor, @"action": @"toolbarDelete:"}];
        }
        [items addObject:@{@"symbol": @"gearshape.fill", @"color": [UIColor colorWithRed:0.47 green:0.69 blue:0.80 alpha:1], @"action": @"toolbarSettings:"}];
    }
    [items addObject:@{@"symbol": @"move.3d", @"color": UIColor.systemGrayColor, @"action": @"toolbarNoop:"}];

    NSInteger buttonCount = items.count;
    CGFloat panelWidth = buttonSide + 14.0 * s;
    CGFloat panelHeight = buttonSide * buttonCount + gap * (buttonCount - 1) + 14.0 * s;
    UIView *panel = [[UIView alloc] initWithFrame:CGRectMake(0, 0, panelWidth, panelHeight)];
    panel.backgroundColor = [UIColor.systemBackgroundColor colorWithAlphaComponent:0.90];
    panel.layer.cornerRadius = 15.0 * s;
    panel.layer.shadowColor = UIColor.blackColor.CGColor;
    panel.layer.shadowOpacity = 0.35;
    panel.layer.shadowRadius = 10;
    panel.layer.shadowOffset = CGSizeMake(0, 4);

    [items enumerateObjectsUsingBlock:^(NSDictionary *item, NSUInteger index, BOOL *stop) {
        UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
        button.frame = CGRectMake(7.0 * s, 7.0 * s + index * (buttonSide + gap), buttonSide, buttonSide);
        UIImageSymbolConfiguration *configuration = [UIImageSymbolConfiguration configurationWithPointSize:21.0 * s weight:UIImageSymbolWeightBold];
        UIImage *image = [UIImage systemImageNamed:item[@"symbol"] withConfiguration:configuration];
        [button setImage:image forState:UIControlStateNormal];
        button.tintColor = item[@"color"];
        button.accessibilityIdentifier = [@"AutoTap.DirectAction." stringByAppendingString:item[@"action"]];
        [panel addSubview:button];
        if ([item[@"action"] isEqualToString:@"toolbarToggle:"]) { self.runButton = button; }
    }];

    CGRect bounds = self.hudWindow.bounds;
    panel.center = CGPointMake(MIN(MAX(self.toolbarCenterRatio.x * CGRectGetWidth(bounds), panelWidth / 2.0 + 4), CGRectGetWidth(bounds) - panelWidth / 2.0 - 4),
                               MIN(MAX(self.toolbarCenterRatio.y * CGRectGetHeight(bounds), panelHeight / 2.0 + 8), CGRectGetHeight(bounds) - panelHeight / 2.0 - 8));
    [self.hudController.view addSubview:panel];
    self.toolbar = panel;
}

- (void)updateCountdownHUD {
    if (self.countdownSeconds < 0) {
        [self.countdownBadge removeFromSuperview];
        self.countdownBadge = nil;
        self.countdownLabel = nil;
        return;
    }
    if (!self.countdownBadge) {
        UIView *badge = [[UIView alloc] initWithFrame:CGRectMake(0, 0, 132, 132)];
        badge.backgroundColor = [UIColor.systemBackgroundColor colorWithAlphaComponent:0.92];
        badge.layer.cornerRadius = 66;
        badge.layer.borderWidth = 3;
        badge.layer.borderColor = UIColor.systemBlueColor.CGColor;
        badge.layer.shadowOpacity = 0.35;
        badge.layer.shadowRadius = 12;
        badge.userInteractionEnabled = NO;
        UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(8, 10, 116, 82)];
        label.textAlignment = NSTextAlignmentCenter;
        label.textColor = UIColor.labelColor;
        label.font = [UIFont monospacedDigitSystemFontOfSize:54 weight:UIFontWeightBold];
        [badge addSubview:label];
        UILabel *caption = [[UILabel alloc] initWithFrame:CGRectMake(8, 91, 116, 24)];
        caption.text = @"即将开始";
        caption.textAlignment = NSTextAlignmentCenter;
        caption.textColor = UIColor.secondaryLabelColor;
        caption.font = [UIFont systemFontOfSize:14 weight:UIFontWeightSemibold];
        [badge addSubview:caption];
        [self.hudController.view addSubview:badge];
        self.countdownBadge = badge;
        self.countdownLabel = label;
    }
    self.countdownLabel.text = [NSString stringWithFormat:@"%ld", (long)MAX(self.countdownSeconds, 0)];
    CGRect bounds = self.hudWindow.bounds;
    self.countdownBadge.center = CGPointMake(CGRectGetMidX(bounds), MAX(105, CGRectGetHeight(bounds) * 0.20));
    [self.hudController.view bringSubviewToFront:self.countdownBadge];
}

- (void)showCompletionMessage:(NSString *)message {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self showCompletionMessage:message]; });
        return;
    }
    if (!self.hudController.view || self.hudWindow.hidden) { return; }

    self.completionGeneration += 1;
    NSUInteger generation = self.completionGeneration;
    [self.completionPanel removeFromSuperview];

    CGRect bounds = self.hudWindow.bounds;
    CGFloat panelWidth = MIN(CGRectGetWidth(bounds) - 40.0, 292.0);
    UIView *panel = [[UIView alloc] initWithFrame:CGRectMake(0, 0, panelWidth, 118.0)];
    panel.center = CGPointMake(CGRectGetMidX(bounds), CGRectGetMidY(bounds));
    panel.backgroundColor = [UIColor.systemBackgroundColor colorWithAlphaComponent:0.94];
    panel.layer.cornerRadius = 22.0;
    panel.layer.borderWidth = 1.0;
    panel.layer.borderColor = UIColor.separatorColor.CGColor;
    panel.layer.shadowColor = UIColor.blackColor.CGColor;
    panel.layer.shadowOpacity = 0.34;
    panel.layer.shadowRadius = 16.0;
    panel.userInteractionEnabled = NO;

    UIImageView *icon = [[UIImageView alloc] initWithImage:[UIImage systemImageNamed:@"checkmark.circle.fill"]];
    icon.frame = CGRectMake(22.0, 34.0, 50.0, 50.0);
    icon.tintColor = UIColor.systemGreenColor;
    icon.contentMode = UIViewContentModeScaleAspectFit;
    [panel addSubview:icon];

    UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(84.0, 18.0, panelWidth - 102.0, 82.0)];
    label.text = message.length > 0 ? message : @"脚本已完成";
    label.textColor = UIColor.labelColor;
    label.font = [UIFont systemFontOfSize:18.0 weight:UIFontWeightSemibold];
    label.numberOfLines = 2;
    [panel addSubview:label];

    panel.alpha = 0.0;
    panel.transform = CGAffineTransformMakeScale(0.92, 0.92);
    [self.hudController.view addSubview:panel];
    [self.hudController.view bringSubviewToFront:panel];
    self.completionPanel = panel;
    [self applyCurrentAppearance];
    [UIView animateWithDuration:0.20 animations:^{
        panel.alpha = 1.0;
        panel.transform = CGAffineTransformIdentity;
    }];

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(3.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        if (generation != self.completionGeneration || self.completionPanel != panel) { return; }
        [UIView animateWithDuration:0.20 animations:^{
            panel.alpha = 0.0;
            panel.transform = CGAffineTransformMakeScale(0.94, 0.94);
        } completion:^(__unused BOOL finished) {
            if (generation == self.completionGeneration && self.completionPanel == panel) {
                [panel removeFromSuperview];
                self.completionPanel = nil;
            }
        }];
    });
}

- (UILabel *)editorLabelWithText:(NSString *)text frame:(CGRect)frame font:(UIFont *)font {
    UILabel *label = [[UILabel alloc] initWithFrame:frame];
    label.text = text;
    label.textColor = UIColor.labelColor;
    label.font = font;
    return label;
}

- (UIButton *)editorValueButtonWithTitle:(NSString *)title tag:(NSInteger)tag frame:(CGRect)frame {
    UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
    button.frame = frame;
    button.tag = tag;
    [button setTitle:title forState:UIControlStateNormal];
    [button setTitleColor:UIColor.labelColor forState:UIControlStateNormal];
    button.titleLabel.font = [UIFont monospacedDigitSystemFontOfSize:19 weight:UIFontWeightSemibold];
    button.backgroundColor = UIColor.tertiarySystemBackgroundColor;
    button.layer.cornerRadius = 10;
    button.layer.borderWidth = 1;
    button.layer.borderColor = UIColor.separatorColor.CGColor;
    button.accessibilityIdentifier = @"AutoTap.DirectAction.editorFieldTapped:";
    return button;
}

- (void)showPointEditorAtIndex:(NSInteger)index {
    if (self.running || !self.pointEditingEnabled || index < 0 || index >= self.actionSettings.count) { return; }
    [self dismissPointEditor];
    NSDictionary<NSString *, NSNumber *> *settings = self.actionSettings[index];
    self.editingIndex = index;

    CGRect bounds = self.hudWindow.bounds;
    UIControl *backdrop = [[UIControl alloc] initWithFrame:bounds];
    backdrop.backgroundColor = [UIColor colorWithWhite:0 alpha:0.30];
    backdrop.accessibilityIdentifier = @"AutoTap.DirectAction.editorCancel:";
    [self.hudController.view addSubview:backdrop];
    self.editorBackdrop = backdrop;

    CGFloat panelWidth = MIN(342, CGRectGetWidth(bounds) - 28);
    CGFloat contentHeight = 550;
    CGFloat panelHeight = MIN(contentHeight, CGRectGetHeight(bounds) - 24);
    UIScrollView *panel = [[UIScrollView alloc] initWithFrame:CGRectMake(0, 0, panelWidth, panelHeight)];
    panel.contentSize = CGSizeMake(panelWidth, contentHeight);
    panel.alwaysBounceVertical = panelHeight < contentHeight;
    panel.center = CGPointMake(CGRectGetMidX(bounds), CGRectGetMidY(bounds));
    panel.backgroundColor = UIColor.secondarySystemBackgroundColor;
    panel.layer.cornerRadius = 22;
    panel.layer.shadowColor = UIColor.blackColor.CGColor;
    panel.layer.shadowOpacity = 0.35;
    panel.layer.shadowRadius = 18;
    [backdrop addSubview:panel];
    self.editorPanel = panel;

    [panel addSubview:[self editorLabelWithText:[NSString stringWithFormat:@"目标 %ld 独立设置", (long)index + 1]
                                          frame:CGRectMake(20, 16, panelWidth - 40, 32)
                                           font:[UIFont systemFontOfSize:22 weight:UIFontWeightBold]]];
    UILabel *tip = [self editorLabelWithText:@"点击数值后可直接输入"
                                       frame:CGRectMake(20, 48, panelWidth - 40, 22)
                                        font:[UIFont systemFontOfSize:13 weight:UIFontWeightRegular]];
    tip.textColor = UIColor.secondaryLabelColor;
    [panel addSubview:tip];

    NSArray<NSString *> *labels = @[@"点击间隔", @"按压时长（毫秒）", @"连续执行次数"];
    NSArray<NSNumber *> *values = @[settings[@"intervalValue"] ?: @500,
                                    settings[@"durationMilliseconds"] ?: @60,
                                    settings[@"repeatCount"] ?: @1];
    NSMutableArray<UIButton *> *fields = [NSMutableArray array];
    for (NSInteger row = 0; row < 3; row++) {
        CGFloat y = 79 + row * 58;
        [panel addSubview:[self editorLabelWithText:labels[row]
                                              frame:CGRectMake(20, y, 150, 40)
                                               font:[UIFont systemFontOfSize:15 weight:UIFontWeightMedium]]];
        UIButton *field = [self editorValueButtonWithTitle:values[row].stringValue
                                                       tag:row + 1
                                                     frame:CGRectMake(panelWidth - 145, y, 125, 40)];
        [panel addSubview:field];
        [fields addObject:field];
    }
    self.editorIntervalField = fields[0];
    self.editorDurationField = fields[1];
    self.editorRepeatField = fields[2];

    NSString *repeatTipText = self.multiple
        ? @"执行次数 0 = 每轮 1 次，并持续按编号循环"
        : @"执行次数 0 = 无限次，直到手动暂停或停止";
    UILabel *repeatTip = [self editorLabelWithText:repeatTipText
                                             frame:CGRectMake(20, 234, panelWidth - 40, 20)
                                              font:[UIFont systemFontOfSize:12 weight:UIFontWeightMedium]];
    repeatTip.textColor = UIColor.systemOrangeColor;
    repeatTip.adjustsFontSizeToFitWidth = YES;
    [panel addSubview:repeatTip];

    UISegmentedControl *unit = [[UISegmentedControl alloc] initWithItems:@[@"毫秒", @"秒", @"分钟"]];
    unit.frame = CGRectMake(20, 258, panelWidth - 40, 38);
    unit.selectedSegmentIndex = MIN(MAX([settings[@"unitIndex"] integerValue], 0), 2);
    [panel addSubview:unit];
    self.editorUnitControl = unit;

    NSArray<NSString *> *keys = @[@"1", @"2", @"3", @"4", @"5", @"6", @"7", @"8", @"9", @"清空", @"0", @"⌫"];
    CGFloat keyGap = 7;
    CGFloat keyWidth = (panelWidth - 40 - keyGap * 2) / 3;
    CGFloat keyHeight = 42;
    for (NSInteger idx = 0; idx < keys.count; idx++) {
        UIButton *key = [UIButton buttonWithType:UIButtonTypeSystem];
        NSInteger row = idx / 3;
        NSInteger column = idx % 3;
        key.frame = CGRectMake(20 + column * (keyWidth + keyGap), 304 + row * (keyHeight + keyGap), keyWidth, keyHeight);
        [key setTitle:keys[idx] forState:UIControlStateNormal];
        key.titleLabel.font = [UIFont systemFontOfSize:19 weight:UIFontWeightSemibold];
        key.backgroundColor = UIColor.tertiarySystemBackgroundColor;
        key.layer.cornerRadius = 9;
        key.tag = idx < 9 ? idx + 1 : (idx == 9 ? 11 : (idx == 10 ? 0 : 10));
        key.accessibilityIdentifier = @"AutoTap.DirectAction.editorKeyTapped:";
        [panel addSubview:key];
    }

    CGFloat actionY = contentHeight - 54;
    UIButton *cancel = [UIButton buttonWithType:UIButtonTypeSystem];
    cancel.frame = CGRectMake(20, actionY, (panelWidth - 48) / 2, 40);
    [cancel setTitle:@"取消" forState:UIControlStateNormal];
    cancel.accessibilityIdentifier = @"AutoTap.DirectAction.editorCancel:";
    [panel addSubview:cancel];
    UIButton *save = [UIButton buttonWithType:UIButtonTypeSystem];
    save.frame = CGRectMake(CGRectGetMaxX(cancel.frame) + 8, actionY, CGRectGetWidth(cancel.frame), 40);
    [save setTitle:@"保存" forState:UIControlStateNormal];
    save.titleLabel.font = [UIFont systemFontOfSize:17 weight:UIFontWeightBold];
    save.backgroundColor = UIColor.systemBlueColor;
    [save setTitleColor:UIColor.whiteColor forState:UIControlStateNormal];
    save.layer.cornerRadius = 10;
    save.accessibilityIdentifier = @"AutoTap.DirectAction.editorSave:";
    [panel addSubview:save];

    [self editorFieldTapped:self.editorIntervalField];
    [self applyCurrentAppearance];
}

- (void)editorFieldTapped:(UIButton *)sender {
    self.editorSelectedField.layer.borderWidth = 1;
    self.editorSelectedField.layer.borderColor = UIColor.separatorColor.CGColor;
    self.editorSelectedField = sender;
    sender.layer.borderWidth = 2;
    sender.layer.borderColor = UIColor.systemBlueColor.CGColor;
    self.editorInputBuffer = [sender titleForState:UIControlStateNormal] ?: @"";
    self.editorReplaceOnNextDigit = YES;
}

- (void)editorKeyTapped:(UIButton *)sender {
    if (!self.editorSelectedField) { return; }
    NSInteger key = sender.tag;
    if (key == 11) {
        self.editorInputBuffer = @"";
    } else if (key == 10) {
        if (self.editorInputBuffer.length > 0) {
            self.editorInputBuffer = [self.editorInputBuffer substringToIndex:self.editorInputBuffer.length - 1];
        }
    } else {
        if (self.editorReplaceOnNextDigit) { self.editorInputBuffer = @""; }
        if (self.editorInputBuffer.length < 7) {
            self.editorInputBuffer = [self.editorInputBuffer stringByAppendingFormat:@"%ld", (long)key];
        }
    }
    self.editorReplaceOnNextDigit = NO;
    [self.editorSelectedField setTitle:self.editorInputBuffer.length ? self.editorInputBuffer : @"0" forState:UIControlStateNormal];
}

- (void)editorCancel:(id)sender { [self dismissPointEditor]; }

- (void)editorSave:(id)sender {
    NSInteger interval = MAX([[self.editorIntervalField titleForState:UIControlStateNormal] integerValue], 1);
    NSInteger duration = MAX([[self.editorDurationField titleForState:UIControlStateNormal] integerValue], 1);
    NSInteger repeats = MAX([[self.editorRepeatField titleForState:UIControlStateNormal] integerValue], 0);
    NSInteger unit = self.editorUnitControl.selectedSegmentIndex;
    NSInteger index = self.editingIndex;
    [self dismissPointEditor];
    if (self.saveActionHandler) { self.saveActionHandler(index, interval, unit, duration, repeats); }
}

- (void)dismissPointEditor {
    [self.editorBackdrop removeFromSuperview];
    self.editorBackdrop = nil;
    self.editorPanel = nil;
    self.editorUnitControl = nil;
    self.editorIntervalField = nil;
    self.editorDurationField = nil;
    self.editorRepeatField = nil;
    self.editorSelectedField = nil;
    self.editorInputBuffer = nil;
}

- (void)finishGestureAndApplyPendingRebuild {
    self.gestureInProgress = NO;
    BOOL rebuild = self.rebuildPending;
    self.rebuildPending = NO;
    dispatch_async(dispatch_get_main_queue(), ^{
        if (!self.visible || self.gestureInProgress) { return; }
        if (rebuild) { [self rebuildOverlayContent]; }
        else { [self updateOverlayContentInPlace]; }
    });
}

- (void)requestDeferredOverlayRebuild {
    self.rebuildPending = YES;
    dispatch_async(dispatch_get_main_queue(), ^{
        if (!self.visible || !self.hudWindow || self.gestureInProgress || !self.rebuildPending) { return; }
        self.rebuildPending = NO;
        [self dismissPointEditor];
        [self rebuildOverlayContent];
        [CATransaction flush];
    });
}

- (BOOL)acceptToolbarAction:(SEL)action {
    CFTimeInterval now = CACurrentMediaTime();
    if (_lastToolbarAction == action && now - _lastToolbarActionAt < 0.35) { return NO; }
    _lastToolbarAction = action;
    _lastToolbarActionAt = now;
    return YES;
}

- (void)toolbarClose:(id)sender {
    if ([self acceptToolbarAction:_cmd] && self.closeHandler) { self.closeHandler(); }
}
- (void)toolbarToggle:(id)sender {
    if ([self acceptToolbarAction:_cmd] && self.toggleRunHandler) { self.toggleRunHandler(); }
}
- (void)toolbarSettings:(id)sender {
    if ([self acceptToolbarAction:_cmd] && self.settingsHandler) { self.settingsHandler(); }
}
- (void)toolbarAdd:(id)sender {
    if ([self acceptToolbarAction:_cmd] && self.addHandler) { self.addHandler(); }
}
- (void)toolbarDelete:(id)sender {
    if ([self acceptToolbarAction:_cmd] && self.deleteHandler) { self.deleteHandler(); }
}
- (void)toolbarStartRecording:(id)sender {
    if ([self acceptToolbarAction:_cmd] && self.startRecordingHandler) { self.startRecordingHandler(); }
}
- (void)toolbarFinishRecording:(id)sender {
    if ([self acceptToolbarAction:_cmd] && self.finishRecordingHandler) { self.finishRecordingHandler(); }
}
- (void)toolbarNoop:(id)sender {}

- (void)registerWindowsWithAttempt:(NSInteger)attempt generation:(NSUInteger)generation {
    if (!self.visible || generation != self.registrationGeneration || self.registrationPending) { return; }
    self.registrationPending = YES;
    BOOL hudOK = [self registerWindow:self.hudWindow
                      hostingProperty:@"hudHostingController"
                    contextIDProperty:@"hudContextID"
                                level:ATHUDWindowLevel];
    self.registrationPending = NO;
    if (hudOK) {
        [self useHostedHUDPresentation];
        BOOL inputReady = _hidMonitor != NULL || [self startPhysicalHIDMonitor];
        self.diagnosticText = inputReady
            ? @"跨进程悬浮窗与原始触摸直控已注册。"
            : @"悬浮窗已显示，但原始触摸直控不可用；请检查巨魔权限。";
        return;
    }
    if (attempt < 7) {
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.12 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self registerWindowsWithAttempt:attempt + 1 generation:generation];
        });
    } else {
        self.diagnosticText = @"系统拒绝托管悬浮窗；请确认使用巨魔安装，并保留源码内的私有权限。";
    }
}

- (void)useHostedHUDPresentation {
    if (!self.hudWindow || self.hudContextID == 0) { return; }

    // registerWindowWithContextID:atLevel: keeps the WindowServer-hosted copy
    // at ATHUDWindowLevel.  Leaving the source UIWindow at that same local
    // level makes AutoTap's foreground scene composite the source window and
    // the hosted copy together.  During a drag those two presentation paths
    // can commit on different frames, so the old toolbar remains visible at
    // its pre-drag position.  Keep the source context alive and unhidden, but
    // place only its local presentation behind the app's normal window.  Raw
    // HID hit-testing still uses the live source view hierarchy, while the
    // single hosted copy stays interactive and visible in every application.
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    self.hudWindow.windowLevel = UIWindowLevelNormal - 1.0;
    [CATransaction commit];
    [CATransaction flush];

    if (UIApplication.sharedApplication.applicationState == UIApplicationStateActive &&
        self.ownerWindow && !self.ownerWindow.isKeyWindow) {
        [self.ownerWindow makeKeyWindow];
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

- (void)setEditingSuppressed:(BOOL)suppressed {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self setEditingSuppressed:suppressed]; });
        return;
    }
    _editingSuppressed = suppressed;
    self.hudWindow.systemInteractionEnabled = !suppressed;
    self.hudWindow.userInteractionEnabled = !suppressed;
    // Never toggle UIWindow.hidden for a registered hosted context. On some
    // iOS versions that allocates a new CAContext while SpringBoard continues
    // displaying the old one, which leaves a second marker at its pre-drag
    // position after returning from Settings. Keep one context alive and make
    // its existing root layer transparent/non-interactive instead.
    if (self.hudWindow) {
        self.hudWindow.hidden = NO;
        self.hudController.view.hidden = NO;
        if (!suppressed) { [self updateOverlayContentInPlace]; }
        [CATransaction begin];
        [CATransaction setDisableActions:YES];
        self.hudController.view.layer.opacity = suppressed ? 0.0f : 1.0f;
        [CATransaction commit];
    }
    [CATransaction flush];
}

- (void)setRecordingEnabled:(BOOL)enabled {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self setRecordingEnabled:enabled]; });
        return;
    }
    if (self.recording == enabled) { return; }
    self.recording = enabled;
    if (!enabled) { _recordingActive = NO; }
    _recordingTouchCandidate = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastTapAt = 0;
    if (self.hudWindow) { [self requestDeferredOverlayRebuild]; }
}

- (void)setRecordingActive:(BOOL)active {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self setRecordingActive:active]; });
        return;
    }
    BOOL normalized = self.recording && active;
    if (_recordingActive == normalized) { return; }
    // This method is the custom Objective-C setter. Assigning through
    // self.recordingActive here calls this method again forever and crashes
    // only when the floating red record control is tapped.
    _recordingActive = normalized;
    _recordingTouchCandidate = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastTapAt = 0;
    // Rebuild on the next run-loop pass so the direct-touch handler can finish
    // releasing the button that triggered this state change first.
    if (self.hudWindow) { [self requestDeferredOverlayRebuild]; }
}

- (void)hide {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self hide]; });
        return;
    }
    self.registrationGeneration += 1;
    self.completionGeneration += 1;
    self.registrationPending = NO;
    [self stopAppearanceMonitoring];
    [self stopPhysicalHIDMonitor];
    [self dismissPointEditor];
    [self.countdownBadge removeFromSuperview];
    [self.completionPanel removeFromSuperview];
    if (self.hudWindow.isKeyWindow &&
        UIApplication.sharedApplication.applicationState == UIApplicationStateActive &&
        self.ownerWindow) {
        [self.ownerWindow makeKeyWindow];
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
    self.runButton = nil;
    self.countdownBadge = nil;
    self.countdownLabel = nil;
    self.completionPanel = nil;
    self.gestureInProgress = NO;
    self.rebuildPending = NO;
    self.recording = NO;
    _recordingActive = NO;
    _recordingTouchCandidate = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastTapAt = 0;
    _editingSuppressed = NO;
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
        [self dismissPointEditor];
        UIWindowScene *scene = [self preferredWindowScene];
        CGRect bounds = scene ? scene.coordinateSpace.bounds : UIScreen.mainScreen.bounds;
        self.visualWindow.frame = bounds;
        self.interactionWindow.frame = bounds;
        self.hudWindow.frame = bounds;
        if (self.gestureInProgress) {
            self.rebuildPending = YES;
        } else {
            [self rebuildOverlayContent];
        }
    });
}

@end
