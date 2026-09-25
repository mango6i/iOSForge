#import "ATSystemOverlayController.h"
#import "ATTouchDispatcher.h"

#import <QuartzCore/QuartzCore.h>
#import <dlfcn.h>
#import <mach/mach_time.h>
#import <math.h>
#import <objc/message.h>
#import <os/lock.h>
#import <stdatomic.h>

static atomic_bool ATDeviceLocked = false;

void ATSystemOverlaySetDeviceLocked(BOOL locked) {
    atomic_store_explicit(&ATDeviceLocked, locked, memory_order_release);
}

BOOL ATSystemOverlayIsDeviceLocked(void) {
    return atomic_load_explicit(&ATDeviceLocked, memory_order_acquire);
}

// Touch-visualizer styling for gesture playback: a translucent white dot runs
// along the recorded path and drags a shorter, fainter tail behind it.
// Enough dots at a short enough spacing that the tail reads as one continuous
// stroke on any curve instead of a row of separate beads.
static const NSInteger ATGestureTrailDotCount = 12;
static const CGFloat ATGestureTrailHeadRadius = 20.0;
static const CGFloat ATGestureTrailHeadAlpha = 0.8;
static const CFTimeInterval ATGestureTrailDotDelay = 0.022;

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
static const uint32_t ATDigitizerEventTouch = 1u << 1;
static const uint32_t ATDigitizerEventIdentity = 1u << 5;
static const uint32_t ATFieldDigitizerX = 0xB0000;
static const uint32_t ATFieldDigitizerY = 0xB0001;
static const uint32_t ATFieldDigitizerEventMask = 0xB0007;
static const uint32_t ATFieldDigitizerTouch = 0xB0009;
enum { ATFilterMarkerCapacity = 256 };

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
    NSUInteger _sessionIdentifier;
    NSInteger _sessionRole;
    BOOL _overlayPresented;
    BOOL _physicalTouchActive;
    BOOL _recordingPhysicalTouchActive;
    BOOL _filterTouchActive;
    BOOL _filterTouchDecided;
    CFTimeInterval _filterLastEventAt;
    BOOL _forwardedTouchActive;
    CFTimeInterval _lastPhysicalEventAt;
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
    CGPoint _recordingTouchLastPoint;
    BOOL _recordingTouchMoved;
    CFTimeInterval _recordingTouchStartedAt;
    CFTimeInterval _recordingLastTapAt;
    CFTimeInterval _recordingLastSampleAt;
    NSMutableArray<NSValue *> *_recordingPathPoints;
    NSMutableArray<NSNumber *> *_recordingPathOffsets;
    CFTimeInterval _recordingActivatedAt;
    CFTimeInterval _acceptPhysicalInputAfter;
    CFTimeInterval _lastToolbarActionAt;
    SEL _lastToolbarAction;
    // The IOHID filter is part of the system input pipeline. It must never
    // synchronously wait for UIKit's main queue: iOS can suspend that queue
    // while locking the device and then wait for this filter to return. Keep a
    // tiny geometry snapshot that the filter can inspect with try-lock only.
    os_unfair_lock _filterSnapshotLock;
    BOOL _filterSnapshotVisible;
    BOOL _filterSnapshotSuppressed;
    BOOL _filterSnapshotEditorOpen;
    BOOL _filterSnapshotMarkersEnabled;
    CGSize _filterSnapshotScreenSize;
    CGRect _filterSnapshotToolbarFrame;
    CFTimeInterval _filterSnapshotAcceptAfter;
    CGRect _filterSnapshotMarkerFrames[ATFilterMarkerCapacity];
    NSUInteger _filterSnapshotMarkerCount;
}
- (instancetype)initPrivateForModule:(NSString *)module;
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
@property (nonatomic, strong) NSMutableArray<NSNumber *> *editorIntervalPresets;
@property (nonatomic) NSInteger editorPreviousUnitIndex;
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
@property (nonatomic) BOOL paused;
@property (nonatomic) BOOL recording;
@property (nonatomic) BOOL recordingActive;
@property (nonatomic) BOOL recordingCapturesGestures;
@property (nonatomic) NSInteger countdownSeconds;
@property (nonatomic) UIUserInterfaceStyle lastAppearanceStyle;
@property (nonatomic, strong) NSTimer *appearanceTimer;
@property (nonatomic) BOOL frameworkLoaded;
@property (nonatomic) BOOL registrationPending;
@property (nonatomic) NSUInteger registrationGeneration;
@property (nonatomic) BOOL gestureInProgress;
@property (nonatomic) BOOL rebuildPending;
@property (nonatomic, strong) NSMutableArray<CALayer *> *gesturePathLayers;
@property (nonatomic, copy) NSString *gesturePathsSignature;
@property (nonatomic) uint32_t activeInputContextID;
- (void)handlePhysicalHIDEvent:(IOHIDEventRef)event;
- (void)enqueuePhysicalHIDEventCopy:(IOHIDEventRef)event;
- (uint32_t)processPhysicalHIDEvent:(IOHIDEventRef)event;
- (BOOL)readPhysicalHIDEvent:(IOHIDEventRef)event point:(CGPoint *)point touching:(BOOL *)touching;
- (IOHIDEventRef)filterFingerEventFromEvent:(IOHIDEventRef)event;
- (void)refreshHIDFilterSnapshot;
- (void)resetHIDFilterTouchState;
- (BOOL)hudOwnsScreenPoint:(CGPoint)point;
- (UIView *)hudHitViewAtScreenPoint:(CGPoint)point;
- (UIView *)fallbackHUDHitViewAtScreenPoint:(CGPoint)point;
- (void)beginDirectTouchAtPoint:(CGPoint)point;
- (void)moveDirectTouchToPoint:(CGPoint)point;
- (void)endDirectTouchAtPoint:(CGPoint)point cancelled:(BOOL)cancelled;
- (void)resetDirectTouchState;
- (BOOL)startPhysicalHIDMonitor;
- (void)stopPhysicalHIDMonitor;
- (BOOL)startRecordingHIDMonitor;
- (void)stopRecordingHIDMonitor;
- (void)handleRecordingHIDEvent:(IOHIDEventRef)event;
- (void)recordTapImmediatelyAtPoint:(CGPoint)point time:(CFTimeInterval)now;
- (void)finishRecordingTouchAtPoint:(CGPoint)point time:(CFTimeInterval)now;
- (void)finishGestureAndApplyPendingRebuild;
- (void)requestDeferredOverlayRebuild;
- (void)syncRecordingMarkers;
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
- (void)unregisterHosting:(id)hosting contextID:(uint32_t)contextID;
@end

static void ATSystemOverlayHIDCallback(void *target, void *refcon, IOHIDServiceClientRef service, IOHIDEventRef event) {
    (void)refcon;
    (void)service;
    if (!target || !event || ATSystemOverlayIsDeviceLocked()) { return; }
    ATSystemOverlayController *controller = (__bridge ATSystemOverlayController *)target;
    // On systems without the filter-block API all four modules use the legacy
    // callback route. Do not enqueue every event from three hidden modules onto
    // main: a burst of taps would otherwise postpone the final mode's show.
    if (!controller.isVisible) { return; }
    if (NSThread.isMainThread) {
        [controller handlePhysicalHIDEvent:event];
        return;
    }
    [controller enqueuePhysicalHIDEventCopy:event];
}

@implementation ATSystemOverlayController

+ (instancetype)shared {
    static ATSystemOverlayController *controller;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{ controller = [[self alloc] initPrivateForModule:@"shared"]; });
    return controller;
}

+ (instancetype)controllerForModule:(NSString *)module {
    return [[self alloc] initPrivateForModule:module.length > 0 ? module : @"overlay"];
}

- (instancetype)init { return [ATSystemOverlayController shared]; }

- (instancetype)initPrivateForModule:(NSString *)module {
    self = [super init];
    if (self) {
        _filterSnapshotLock = OS_UNFAIR_LOCK_INIT;
        _filterSnapshotToolbarFrame = CGRectNull;
        _filterSnapshotScreenSize = UIScreen.mainScreen.bounds.size;
        _diagnosticText = @"系统悬浮窗尚未启动。";
        _markerViews = [NSMutableArray array];
        _markerHitViews = [NSMutableArray array];
        _pointEditingEnabled = YES;
        _toolbarCenterRatio = CGPointMake(0.105, 0.54);
        _lastAppearanceStyle = UIUserInterfaceStyleUnspecified;
        _recordingPathPoints = [NSMutableArray array];
        _recordingPathOffsets = [NSMutableArray array];
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

- (BOOL)isVisible { return _overlayPresented; }

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
            (void)target;
            (void)refcon;
            (void)sender;
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
    [self resetHIDFilterTouchState];
    _lastPhysicalEventAt = 0;
    _forwardedTouchActive = NO;
    _recordingTouchCandidate = NO;
    _recordingTouchMoved = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastTapAt = 0;
    if (!_hidMonitor) { _hidFilterBlock = nil; return; }
    if (_unregisterHIDCallback) { _unregisterHIDCallback(_hidMonitor); }
    if (_unscheduleHIDClient) {
        _unscheduleHIDClient(_hidMonitor, CFRunLoopGetMain(), kCFRunLoopCommonModes);
    }
    CFRelease(_hidMonitor);
    _hidMonitor = NULL;
    _hidFilterBlock = nil;
}

- (BOOL)startRecordingHIDMonitor {
    // One long-lived filter client is more reliable than creating a second
    // observational client every time recording starts. The filter receives
    // the complete global digitizer stream and returns false for touches that
    // do not belong to the HUD, so the foreground app still receives them.
    if (![self startPhysicalHIDMonitor]) { return NO; }
    _recordingPhysicalTouchActive = NO;
    _recordingTouchCandidate = NO;
    _recordingTouchMoved = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastTapAt = 0;
    _recordingLastSampleAt = 0;
    [_recordingPathPoints removeAllObjects];
    [_recordingPathOffsets removeAllObjects];
    return YES;
}

- (void)stopRecordingHIDMonitor {
    _recordingPhysicalTouchActive = NO;
    _recordingTouchCandidate = NO;
    _recordingTouchMoved = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastTapAt = 0;
    _recordingLastSampleAt = 0;
    [_recordingPathPoints removeAllObjects];
    [_recordingPathOffsets removeAllObjects];
}

- (IOHIDEventRef)fingerEventFromEvent:(IOHIDEventRef)event {
    if (!_getHIDChildren) { return event; }
    CFArrayRef children = _getHIDChildren(event);
    if (!children || CFArrayGetCount(children) == 0) { return event; }

    // A parent event can contain both the finger that changed state and stale
    // children that are still marked touching. Prefer the child whose touch
    // bit actually changed; otherwise its stale sibling hides the UP frame
    // and every following tap is treated as part of the same press.
    BOOL tracking = _recordingPhysicalTouchActive || _physicalTouchActive;
    CGPoint reference = _recordingPhysicalTouchActive ? _recordingTouchLastPoint : _lastPhysicalTouchPoint;
    IOHIDEventRef bestTransition = NULL;
    IOHIDEventRef bestFallback = NULL;
    double bestTransitionDistance = HUGE_VAL;
    double bestFallbackDistance = HUGE_VAL;
    for (CFIndex index = 0; index < CFArrayGetCount(children); index++) {
        IOHIDEventRef child = (IOHIDEventRef)CFArrayGetValueAtIndex(children, index);
        if (!child || (_getHIDType && _getHIDType(child) != ATDigitizerEventType)) { continue; }
        double x = _getHIDFloatValue ? _getHIDFloatValue(child, ATFieldDigitizerX) : 0;
        double y = _getHIDFloatValue ? _getHIDFloatValue(child, ATFieldDigitizerY) : 0;
        CGSize size = UIScreen.mainScreen.bounds.size;
        if (x >= 0 && x <= 1.001 && y >= 0 && y <= 1.001) {
            x *= size.width;
            y *= size.height;
        }
        double distance = tracking ? hypot(x - reference.x, y - reference.y) : (double)index;
        uint32_t mask = _getHIDIntegerValue ? (uint32_t)_getHIDIntegerValue(child, ATFieldDigitizerEventMask) : 0;
        if ((mask & ATDigitizerEventTouch) && distance < bestTransitionDistance) {
            bestTransition = child;
            bestTransitionDistance = distance;
        }
        if (distance < bestFallbackDistance) {
            bestFallback = child;
            bestFallbackDistance = distance;
        }
    }
    return bestTransition ?: bestFallback ?: (IOHIDEventRef)CFArrayGetValueAtIndex(children, 0);
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
    if (!self.visible || _editingSuppressed || CACurrentMediaTime() < _acceptPhysicalInputAfter) { return; }
    // The recorder and controls share one long-lived HID client.
    if (self.recording && self.recordingActive) {
        [self handleRecordingHIDEvent:event];
        // While capturing, a touch away from the floating controls belongs to
        // the app being recorded. Letting it run through the HUD control path as
        // well makes it fight with UIKit, which is why taps made inside AutoTap
        // itself only produced the first couple of numbered markers while taps
        // in any other app were all captured.
        CGPoint recordPoint = CGPointZero;
        BOOL recordTouching = NO;
        if ([self readPhysicalHIDEvent:event point:&recordPoint touching:&recordTouching]
            && ![self recordingControlOwnsScreenPoint:recordPoint]) {
            return;
        }
    }
    CGPoint point = CGPointZero;
    BOOL touching = NO;
    if (![self readPhysicalHIDEvent:event point:&point touching:&touching]) { return; }
    CFTimeInterval now = CACurrentMediaTime();
    IOHIDEventRef stateFinger = [self fingerEventFromEvent:event];
    uint32_t stateMask = stateFinger && _getHIDIntegerValue
        ? (uint32_t)_getHIDIntegerValue(stateFinger, ATFieldDigitizerEventMask)
        : 0;
    BOOL freshDownAfterMissedUp = touching && _physicalTouchActive
        && (stateMask & ATDigitizerEventTouch)
        && (stateMask & ATDigitizerEventIdentity)
        && _lastPhysicalEventAt > 0
        && now - _lastPhysicalEventAt >= 0.04;
    if (freshDownAfterMissedUp) {
        // A missing UP used to leave the old toolbar control permanently
        // active, so X/Play/Stop stopped responding until process restart.
        [self endDirectTouchAtPoint:_lastPhysicalTouchPoint cancelled:YES];
        _physicalTouchActive = NO;
    }
    _lastPhysicalEventAt = now;

    BOOL began = touching && !_physicalTouchActive;
    BOOL ended = !touching && _physicalTouchActive;
    if (!began && !ended && !_physicalTouchActive) { return; }
    if (touching) { _lastPhysicalTouchPoint = point; }
    if (began) {
        [self beginDirectTouchAtPoint:point];
    } else if (touching) {
        [self moveDirectTouchToPoint:point];
    }
    _physicalTouchActive = touching;
    if (ended) {
        [self endDirectTouchAtPoint:_lastPhysicalTouchPoint cancelled:NO];
    }
}

- (void)enqueuePhysicalHIDEventCopy:(IOHIDEventRef)event {
    if (!event || ATSystemOverlayIsDeviceLocked()) { return; }
    // IOHID may recycle an event's child storage as soon as its filter callback
    // returns. Retaining the outer object is therefore insufficient when the
    // main queue is busy rendering AutoTap itself: later taps can all appear as
    // the same stale frame. Make a deep event copy before leaving the HID pipe.
    IOHIDEventRef queuedEvent = _copyHIDEvent
        ? _copyHIDEvent(kCFAllocatorDefault, event)
        : NULL;
    if (!queuedEvent) {
        CFRetain(event);
        queuedEvent = event;
    }
    dispatch_async(dispatch_get_main_queue(), ^{
        if (!ATSystemOverlayIsDeviceLocked() && self.visible && !self->_editingSuppressed) {
            [self handlePhysicalHIDEvent:queuedEvent];
        }
        CFRelease(queuedEvent);
    });
}

- (void)handleRecordingHIDEvent:(IOHIDEventRef)event {
    if (!self.visible || !self.recording || !self.recordingActive || _editingSuppressed) { return; }
    if (ATTouchDispatcherIsSyntheticDispatchInProgress() ||
        (_getHIDTimestamp && ATTouchDispatcherIsSyntheticTimestamp(_getHIDTimestamp(event)))) {
        return;
    }

    CGPoint point = CGPointZero;
    BOOL touching = NO;
    if (![self readPhysicalHIDEvent:event point:&point touching:&touching]) { return; }
    CFTimeInterval now = CACurrentMediaTime();
    IOHIDEventRef stateFinger = [self fingerEventFromEvent:event];
    uint32_t stateMask = stateFinger && _getHIDIntegerValue
        ? (uint32_t)_getHIDIntegerValue(stateFinger, ATFieldDigitizerEventMask)
        : 0;

    // Tap capture must not depend on receiving a later UP frame. When AutoTap
    // itself is foreground, SwiftUI can keep the main run loop busy long enough
    // for a private HID client to omit/coalesce that lift. The old UP-driven
    // recorder then stayed in an active-contact state and silently discarded
    // most following taps. A physical DOWN transition is already a complete tap
    // target, so publish its marker/action immediately. The UP frame only resets
    // contact state. Gesture capture still needs the complete DOWN/MOVE/UP stream
    // and continues through the path recorder below.
    if (!self.recordingCapturesGestures) {
        BOOL explicitDown = touching &&
            (stateMask & ATDigitizerEventTouch) != 0 &&
            (stateMask & ATDigitizerEventIdentity) != 0;
        if (explicitDown && _recordingPhysicalTouchActive &&
            _recordingTouchStartedAt > 0 && now - _recordingTouchStartedAt >= 0.03) {
            // Recover from a coalesced/missing UP before accepting this new
            // contact. This never creates an extra marker for MOVE frames,
            // because they do not carry the Touch+Identity transition pair.
            _recordingPhysicalTouchActive = NO;
        }

        BOOL began = touching && !_recordingPhysicalTouchActive;
        if (began) {
            _recordingTouchCandidate = ![self recordingControlOwnsScreenPoint:point];
            _recordingTouchStartPoint = point;
            _recordingTouchLastPoint = point;
            _recordingTouchStartedAt = now;
            if (_recordingTouchCandidate) {
                [self recordTapImmediatelyAtPoint:point time:now];
            }
        }
        _recordingPhysicalTouchActive = touching;
        if (!touching) {
            _recordingTouchCandidate = NO;
            _recordingTouchStartedAt = 0;
        }
        return;
    }

    BOOL freshDownWhileTracking = touching && _recordingPhysicalTouchActive
        && (stateMask & ATDigitizerEventTouch)
        && (stateMask & ATDigitizerEventIdentity)
        && _recordingTouchStartedAt > 0
        && now - _recordingTouchStartedAt >= 0.04;
    if (freshDownWhileTracking) {
        // Some iOS builds occasionally omit a physical UP callback. Without
        // recovery, the next DOWN is mistaken for movement of the old finger,
        // so several numbered taps disappear. Finalize the old contact at its
        // last known point, then let this frame begin a new contact.
        [self finishRecordingTouchAtPoint:_recordingTouchLastPoint time:now];
    }
    BOOL began = touching && !_recordingPhysicalTouchActive;
    BOOL ended = !touching && _recordingPhysicalTouchActive;
    if (!began && !ended && !_recordingPhysicalTouchActive) { return; }

    if (began) {
        _recordingTouchCandidate = ![self recordingControlOwnsScreenPoint:point];
        _recordingTouchStartPoint = point;
        _recordingTouchLastPoint = point;
        _recordingTouchMoved = NO;
        _recordingTouchStartedAt = now;
        _recordingLastSampleAt = _recordingTouchStartedAt;
        [_recordingPathPoints removeAllObjects];
        [_recordingPathOffsets removeAllObjects];
        if (_recordingTouchCandidate) {
            [_recordingPathPoints addObject:[NSValue valueWithCGPoint:point]];
            [_recordingPathOffsets addObject:@0];
        }
    } else if (touching && _recordingTouchCandidate) {
        _recordingTouchLastPoint = point;
        CGFloat movementThreshold = self.recordingCapturesGestures ? 12.0 : 24.0;
        if (hypot(point.x - _recordingTouchStartPoint.x, point.y - _recordingTouchStartPoint.y) > movementThreshold) {
            _recordingTouchMoved = YES;
        }
        if (self.recordingCapturesGestures) {
            CGPoint previous = _recordingPathPoints.lastObject.CGPointValue;
            CFTimeInterval sampleTime = CACurrentMediaTime();
            if (_recordingPathPoints.count < 511 &&
                (hypot(point.x - previous.x, point.y - previous.y) >= 1.5 ||
                 sampleTime - _recordingLastSampleAt >= 0.012)) {
                NSInteger offset = MAX(1, (NSInteger)llround((sampleTime - _recordingTouchStartedAt) * 1000.0));
                [_recordingPathPoints addObject:[NSValue valueWithCGPoint:point]];
                [_recordingPathOffsets addObject:@(MIN(offset, 10000))];
                _recordingLastSampleAt = sampleTime;
            }
        }
    }
    _recordingPhysicalTouchActive = touching;

    if (!ended) { return; }
    [self finishRecordingTouchAtPoint:point time:now];
}

- (void)recordTapImmediatelyAtPoint:(CGPoint)point time:(CFTimeInterval)now {
    NSInteger intervalMilliseconds = _recordingLastTapAt > 0
        ? (NSInteger)llround((now - _recordingLastTapAt) * 1000.0)
        : 500;
    CGSize size = UIScreen.mainScreen.bounds.size;
    CGFloat x = MIN(MAX(point.x / MAX(size.width, 1), 0), 1);
    CGFloat y = MIN(MAX(point.y / MAX(size.height, 1), 0), 1);
    NSInteger safeInterval = MIN(MAX(intervalMilliseconds, 1), 3600000);
    const NSInteger defaultDuration = 40;

    // Append the hosted marker before notifying SwiftUI. This makes every DOWN
    // visible even if publishing the model causes a foreground layout pass.
    NSMutableArray<NSValue *> *points = [self.points mutableCopy] ?: [NSMutableArray array];
    [points addObject:[NSValue valueWithCGPoint:CGPointMake(x, y)]];
    self.points = points;
    NSMutableArray<NSDictionary<NSString *, NSNumber *> *> *settings =
        [self.actionSettings mutableCopy] ?: [NSMutableArray array];
    [settings addObject:@{
        @"intervalValue": @(500),
        @"unitIndex": @(0),
        @"durationMilliseconds": @(defaultDuration),
        @"repeatCount": @(1)
    }];
    self.actionSettings = settings;
    self.selectedIndex = self.points.count - 1;
    [self syncRecordingMarkers];
    [CATransaction flush];

    if (self.recordTapHandler) {
        self.recordTapHandler(x, y, safeInterval, defaultDuration);
    }
    _recordingLastTapAt = now;
}

- (void)finishRecordingTouchAtPoint:(CGPoint)point time:(CFTimeInterval)now {
    _recordingPhysicalTouchActive = NO;
    _recordingTouchLastPoint = point;
    if (_recordingTouchCandidate) {
        NSInteger intervalMilliseconds = _recordingLastTapAt > 0
            ? (NSInteger)llround((now - _recordingLastTapAt) * 1000.0)
            : 500;
        NSInteger durationMilliseconds = (NSInteger)llround((now - _recordingTouchStartedAt) * 1000.0);
        CGSize size = UIScreen.mainScreen.bounds.size;
        CGFloat startX = MIN(MAX(_recordingTouchStartPoint.x / MAX(size.width, 1), 0), 1);
        CGFloat startY = MIN(MAX(_recordingTouchStartPoint.y / MAX(size.height, 1), 0), 1);
        CGFloat endX = MIN(MAX(_recordingTouchLastPoint.x / MAX(size.width, 1), 0), 1);
        CGFloat endY = MIN(MAX(_recordingTouchLastPoint.y / MAX(size.height, 1), 0), 1);
        NSInteger safeInterval = MIN(MAX(intervalMilliseconds, 1), 3600000);
        NSInteger safeDuration = MIN(MAX(durationMilliseconds, 1), 10000);
        BOOL recorded = NO;
        if (_recordingTouchMoved && self.recordingCapturesGestures) {
            CGPoint finalPoint = _recordingTouchLastPoint;
            CGPoint previous = _recordingPathPoints.lastObject.CGPointValue;
            if (_recordingPathPoints.count < 2 || hypot(finalPoint.x - previous.x, finalPoint.y - previous.y) >= 0.5) {
                [_recordingPathPoints addObject:[NSValue valueWithCGPoint:finalPoint]];
                [_recordingPathOffsets addObject:@(MAX(1, safeDuration))];
            } else if (_recordingPathOffsets.count > 0) {
                _recordingPathOffsets[_recordingPathOffsets.count - 1] = @(MAX(1, safeDuration));
            }

            if (self.recordGestureHandler && _recordingPathPoints.count >= 2) {
                NSMutableArray<NSValue *> *normalizedPoints = [NSMutableArray arrayWithCapacity:_recordingPathPoints.count];
                for (NSValue *value in _recordingPathPoints) {
                    CGPoint pathPoint = value.CGPointValue;
                    CGPoint normalized = CGPointMake(
                        MIN(MAX(pathPoint.x / MAX(size.width, 1), 0), 1),
                        MIN(MAX(pathPoint.y / MAX(size.height, 1), 0), 1));
                    [normalizedPoints addObject:[NSValue valueWithCGPoint:normalized]];
                }
                self.recordGestureHandler(normalizedPoints, [_recordingPathOffsets copy], safeInterval);
                recorded = YES;
            } else if (self.recordSwipeHandler) {
                self.recordSwipeHandler(startX, startY, endX, endY, safeInterval, MAX(safeDuration, 80));
                recorded = YES;
            }
        } else if (!_recordingTouchMoved && self.recordTapHandler) {
            // In the foreground, publishing SwiftUI state for every contact can
            // start a full page render before the hosted HUD receives its next
            // marker. Append the visual marker synchronously in the native
            // recorder first; the model callback then reconciles the same count.
            if (!self.recordingCapturesGestures) {
                NSMutableArray<NSValue *> *points = [self.points mutableCopy] ?: [NSMutableArray array];
                [points addObject:[NSValue valueWithCGPoint:CGPointMake(endX, endY)]];
                self.points = points;
                NSMutableArray<NSDictionary<NSString *, NSNumber *> *> *settings =
                    [self.actionSettings mutableCopy] ?: [NSMutableArray array];
                [settings addObject:@{
                    @"intervalValue": @(500),
                    @"unitIndex": @(0),
                    @"durationMilliseconds": @(safeDuration),
                    @"repeatCount": @(1)
                }];
                self.actionSettings = settings;
                self.selectedIndex = self.points.count - 1;
                [self syncRecordingMarkers];
                [CATransaction flush];
            }
            self.recordTapHandler(endX, endY, safeInterval, safeDuration);
            recorded = YES;
        }
        if (recorded) { _recordingLastTapAt = now; }
    }
    _recordingTouchCandidate = NO;
    _recordingTouchMoved = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastSampleAt = 0;
    [_recordingPathPoints removeAllObjects];
    [_recordingPathOffsets removeAllObjects];
}

- (IOHIDEventRef)filterFingerEventFromEvent:(IOHIDEventRef)event {
    if (!_getHIDChildren) { return event; }
    CFArrayRef children = _getHIDChildren(event);
    if (!children || CFArrayGetCount(children) == 0) { return event; }
    IOHIDEventRef fallback = NULL;
    for (CFIndex index = 0; index < CFArrayGetCount(children); index++) {
        IOHIDEventRef child = (IOHIDEventRef)CFArrayGetValueAtIndex(children, index);
        if (!child || (_getHIDType && _getHIDType(child) != ATDigitizerEventType)) { continue; }
        if (!fallback) { fallback = child; }
        uint32_t mask = _getHIDIntegerValue
            ? (uint32_t)_getHIDIntegerValue(child, ATFieldDigitizerEventMask)
            : 0;
        if (mask & ATDigitizerEventTouch) { return child; }
    }
    return fallback ?: (IOHIDEventRef)CFArrayGetValueAtIndex(children, 0);
}

- (void)refreshHIDFilterSnapshot {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self refreshHIDFilterSnapshot]; });
        return;
    }
    CGSize screenSize = self.hudWindow ? self.hudWindow.bounds.size : UIScreen.mainScreen.bounds.size;
    CGRect toolbarFrame = CGRectNull;
    if (self.toolbar && self.toolbar.superview) {
        toolbarFrame = [self.hudController.view convertRect:self.toolbar.bounds fromView:self.toolbar];
        toolbarFrame = CGRectInset(toolbarFrame, -8.0, -8.0);
    }
    CGRect markerFrames[ATFilterMarkerCapacity];
    NSUInteger markerCount = MIN(self.markerHitViews.count, ATFilterMarkerCapacity);
    for (NSUInteger index = 0; index < markerCount; index++) {
        UIView *marker = self.markerHitViews[index];
        markerFrames[index] = [self.hudController.view convertRect:marker.bounds fromView:marker];
    }

    os_unfair_lock_lock(&_filterSnapshotLock);
    _filterSnapshotVisible = _overlayPresented && self.hudWindow != nil;
    _filterSnapshotSuppressed = _editingSuppressed;
    _filterSnapshotEditorOpen = self.editorBackdrop != nil;
    _filterSnapshotMarkersEnabled = (!self.running || self.paused) && !self.recording && self.pointEditingEnabled;
    _filterSnapshotScreenSize = screenSize;
    _filterSnapshotToolbarFrame = toolbarFrame;
    _filterSnapshotAcceptAfter = _acceptPhysicalInputAfter;
    _filterSnapshotMarkerCount = markerCount;
    for (NSUInteger index = 0; index < markerCount; index++) {
        _filterSnapshotMarkerFrames[index] = markerFrames[index];
    }
    os_unfair_lock_unlock(&_filterSnapshotLock);
}

- (void)resetHIDFilterTouchState {
    os_unfair_lock_lock(&_filterSnapshotLock);
    _filterTouchActive = NO;
    _filterTouchDecided = NO;
    _filterLastEventAt = 0;
    os_unfair_lock_unlock(&_filterSnapshotLock);
}

- (uint32_t)processPhysicalHIDEvent:(IOHIDEventRef)event {
    if (!event || ATSystemOverlayIsDeviceLocked()) { return 0; }
    // The system HID client also reports hardware keys. Power/lock buttons must
    // return immediately without touching UIKit or waiting for its main queue.
    if (_getHIDType && _getHIDType(event) != ATDigitizerEventType) { return 0; }
    if (ATTouchDispatcherIsSyntheticDispatchInProgress() ||
        (_getHIDTimestamp && ATTouchDispatcherIsSyntheticTimestamp(_getHIDTimestamp(event)))) {
        return 0;
    }

    // Never block the system input pipeline. If the main thread happens to be
    // publishing a new HUD geometry snapshot, let this one frame pass through.
    if (!os_unfair_lock_trylock(&_filterSnapshotLock)) { return 0; }
    CFTimeInterval now = CACurrentMediaTime();
    BOOL snapshotReady = _filterSnapshotVisible && !_filterSnapshotSuppressed &&
        now >= _filterSnapshotAcceptAfter;
    if (!snapshotReady) {
        _filterTouchActive = NO;
        _filterTouchDecided = NO;
        _filterLastEventAt = 0;
        os_unfair_lock_unlock(&_filterSnapshotLock);
        return 0;
    }

    IOHIDEventRef finger = [self filterFingerEventFromEvent:event];
    if (!finger || !_getHIDFloatValue || !_getHIDIntegerValue) {
        os_unfair_lock_unlock(&_filterSnapshotLock);
        return 0;
    }
    BOOL touching = _getHIDIntegerValue(finger, ATFieldDigitizerTouch) != 0;
    double x = _getHIDFloatValue(finger, ATFieldDigitizerX);
    double y = _getHIDFloatValue(finger, ATFieldDigitizerY);
    CGSize size = _filterSnapshotScreenSize;
    if (x >= 0 && x <= 1.001 && y >= 0 && y <= 1.001) {
        x *= MAX(size.width, 1.0);
        y *= MAX(size.height, 1.0);
    }
    CGPoint point = CGPointMake(x, y);
    uint32_t stateMask = (uint32_t)_getHIDIntegerValue(finger, ATFieldDigitizerEventMask);
    BOOL freshDownAfterMissedUp = touching && _filterTouchDecided
        && (stateMask & ATDigitizerEventTouch)
        && (stateMask & ATDigitizerEventIdentity)
        && _filterLastEventAt > 0
        && now - _filterLastEventAt >= 0.04;
    if (freshDownAfterMissedUp) {
        _filterTouchActive = NO;
        _filterTouchDecided = NO;
    }
    _filterLastEventAt = now;
    if (touching && !_filterTouchDecided) {
        BOOL owned = _filterSnapshotEditorOpen || CGRectContainsPoint(_filterSnapshotToolbarFrame, point);
        if (!owned && _filterSnapshotMarkersEnabled) {
            for (NSUInteger index = 0; index < _filterSnapshotMarkerCount; index++) {
                if (CGRectContainsPoint(_filterSnapshotMarkerFrames[index], point)) {
                    owned = YES;
                    break;
                }
            }
        }
        _filterTouchActive = owned;
        _filterTouchDecided = YES;
    }
    BOOL filtered = _filterTouchActive;
    if (!touching) {
        _filterTouchActive = NO;
        _filterTouchDecided = NO;
        _filterLastEventAt = 0;
    }
    os_unfair_lock_unlock(&_filterSnapshotLock);

    // UIKit work is observational and asynchronous. The filter has already
    // decided ownership from its immutable snapshot and can return immediately,
    // so locking the device can never create a main-queue/HID circular wait.
    [self enqueuePhysicalHIDEventCopy:event];
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

/// Hit test used while recording. The hosted HUD window spans the whole screen,
/// so `hudOwnsScreenPoint:` reports every tap as "owned by the HUD" once its
/// WindowServer context is live — which silently swallowed recording after the
/// first couple of taps. Only the floating toolbar and an open editor are real
/// controls; everything else has to be recorded.
- (BOOL)recordingControlOwnsScreenPoint:(CGPoint)point {
    if (!self.hudWindow || self.hudWindow.hidden || _editingSuppressed) { return NO; }
    if (self.editorBackdrop) { return YES; }
    if (!self.toolbar) { return NO; }
    CGPoint windowPoint = [self.hudWindow convertPoint:point fromWindow:nil];
    CGRect toolbarFrame = [self.hudController.view convertRect:self.toolbar.bounds
                                                      fromView:self.toolbar];
    return CGRectContainsPoint(CGRectInset(toolbarFrame, -6, -6), windowPoint);
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
    if ((!self.running || self.paused) && !self.recording && self.pointEditingEnabled) {
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
    if (markerIndex != NSNotFound && (!self.running || self.paused) && self.pointEditingEnabled) {
        _directTouchTarget = ATDirectTouchTargetMarker;
        _directMarkerIndex = markerIndex;
        _directTargetStartCenter = self.markerHitViews[markerIndex].center;
        self.gestureInProgress = YES;
        self.selectedIndex = markerIndex;
        if (self.selectHandler) { self.selectHandler(markerIndex); }
        [self updateOverlayContentInPlace];
        return;
    }

    if (self.editorUnitControl &&
        (hit == self.editorUnitControl || [hit isDescendantOfView:self.editorUnitControl])) {
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

    if ((!self.running || self.paused) && !self.recordingActive && self.toolbar &&
        (hit == self.toolbar || [hit isDescendantOfView:self.toolbar])) {
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
        _directTouchMoved && (!self.running || self.paused) && !self.recordingActive && self.toolbar &&
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
        _directMarkerIndex >= 0 && _directMarkerIndex < (NSInteger)self.markerHitViews.count) {
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
        [self refreshHIDFilterSnapshot];
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
        [self refreshHIDFilterSnapshot];
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
        markerIndex >= 0 && markerIndex < (NSInteger)self.markerHitViews.count) {
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
    } else if (!cancelled &&
               (target == ATDirectTouchTargetControl || target == ATDirectTouchTargetSegmentedControl) &&
               (!moved || (self.running && !self.paused) || self.recordingActive)) {
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

- (void)beginSessionWithIdentifier:(NSUInteger)identifier role:(NSInteger)role {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self beginSessionWithIdentifier:identifier role:role];
        });
        return;
    }
    if (identifier == 0) { return; }
    BOOL changed = _sessionIdentifier != identifier || _sessionRole != role;
    _sessionIdentifier = identifier;
    _sessionRole = role;
    if (!changed) { return; }

    [self dismissPointEditor];
    [self resetDirectTouchState];
    _physicalTouchActive = NO;
    [self resetHIDFilterTouchState];
    _lastPhysicalEventAt = 0;
    _lastToolbarAction = NULL;
    _lastToolbarActionAt = 0;
    self.gestureInProgress = NO;
    self.rebuildPending = NO;
}

- (void)configureRecordingEnabled:(BOOL)enabled
                  capturesGestures:(BOOL)capturesGestures
                             active:(BOOL)active {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self configureRecordingEnabled:enabled capturesGestures:capturesGestures active:active];
        });
        return;
    }
    BOOL normalizedActive = enabled && active;
    BOOL changed = self.recording != enabled ||
        _recordingCapturesGestures != capturesGestures ||
        _recordingActive != normalizedActive;
    if (!changed) { return; }

    BOOL activeChanged = _recordingActive != normalizedActive;
    self.recording = enabled;
    _recordingCapturesGestures = enabled && capturesGestures;
    _recordingActive = normalizedActive;
    _recordingTouchCandidate = NO;
    _recordingTouchMoved = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastSampleAt = 0;
    if (activeChanged) {
        _recordingLastTapAt = 0;
        _recordingActivatedAt = normalizedActive ? CACurrentMediaTime() : 0;
        if (normalizedActive) {
            if (![self startRecordingHIDMonitor]) {
                self.diagnosticText = @"无法启动独立录制监听，请检查 HID event-monitor 权限。";
            }
        } else {
            [self stopRecordingHIDMonitor];
        }
    } else if (!enabled) {
        [self stopRecordingHIDMonitor];
    }
    if (self.hudWindow) { [self requestDeferredOverlayRebuild]; }
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
                 paused:(BOOL)paused
       countdownSeconds:(NSInteger)countdownSeconds {
    NSAssert(NSThread.isMainThread, @"Overlay must be created on the main thread");
    if (!self.available) { return NO; }
    if (![self startPhysicalHIDMonitor]) {
        self.diagnosticText = @"无法启动悬浮窗触摸监听；请确认使用巨魔安装并保留私有权限。";
        return NO;
    }
    UIWindow *applicationWindow = [self foregroundApplicationWindow];
    if (applicationWindow) { self.ownerWindow = applicationWindow; }
    [self createWindowsIfNeeded];
    _overlayPresented = YES;
    _acceptPhysicalInputAfter = CACurrentMediaTime() + 0.25;
    _physicalTouchActive = NO;
    [self resetHIDFilterTouchState];
    _lastPhysicalEventAt = 0;
    [self resetDirectTouchState];
    self.rebuildPending = NO;
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
                     paused:paused
           countdownSeconds:countdownSeconds];
    // A gesture script can legitimately have zero numbered points. After a
    // previous HUD is closed, point-count comparison alone may therefore see
    // no structural change even though the toolbar was removed. Always restore
    // the control bar before presenting the reused WindowServer context.
    if (!self.toolbar) { [self rebuildOverlayContent]; }
    // Every marker and control is now drawn and hit-tested in the same hosted
    // HUD context. Keeping the two legacy layers hidden prevents a second
    // stale copy of a marker from remaining at its pre-drag position.
    self.visualWindow.hidden = YES;
    self.interactionWindow.hidden = YES;
    self.hudWindow.hidden = NO;
    self.hudWindow.systemInteractionEnabled = YES;
    self.hudWindow.userInteractionEnabled = YES;
    self.hudController.view.hidden = NO;
    self.hudController.view.layer.opacity = 1.0f;
    _editingSuppressed = NO;
    [self refreshHIDFilterSnapshot];
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
                   paused:(BOOL)paused
         countdownSeconds:(NSInteger)countdownSeconds {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self updateWithPoints:points actionSettings:actionSettings multiple:multiple selectedIndex:selectedIndex activeIndex:activeIndex markerScale:markerScale controlScale:controlScale editingEnabled:editingEnabled running:running paused:paused countdownSeconds:countdownSeconds];
        });
        return;
    }
    BOOL countChanged = self.points.count != points.count;
    BOOL layoutChanged = self.multiple != multiple ||
        self.pointEditingEnabled != editingEnabled ||
        fabs(self.markerScale - markerScale) > 0.001 ||
        fabs(self.controlScale - controlScale) > 0.001;
    BOOL structureChanged = countChanged || layoutChanged;
    self.points = [points copy];
    self.actionSettings = [actionSettings copy];
    self.multiple = multiple;
    self.selectedIndex = selectedIndex;
    self.activeIndex = activeIndex;
    self.markerScale = MIN(MAX(markerScale, 0.75), 1.5);
    self.controlScale = MIN(MAX(controlScale, 0.8), 1.35);
    self.pointEditingEnabled = editingEnabled;
    self.running = running;
    self.paused = paused;
    self.countdownSeconds = countdownSeconds;
    if (self.hudWindow != nil) {
        if (self.gestureInProgress) {
            self.rebuildPending = self.rebuildPending || structureChanged;
        } else if (self.recording && countChanged && !layoutChanged && self.toolbar) {
            [self syncRecordingMarkers];
        } else if (structureChanged || self.markerViews.count != self.points.count) {
            [self rebuildOverlayContent];
        } else {
            [self updateOverlayContentInPlace];
        }
        [self.hudController.view setNeedsLayout];
        [self.hudController.view layoutIfNeeded];
        [CATransaction flush];
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
    self.interactionWindow.systemInteractionEnabled = !(self.running && !self.paused);
    self.hudWindow.systemInteractionEnabled = YES;
}

- (UIWindow *)foregroundApplicationWindow {
    UIWindow *fallback = nil;
    UIWindowScene *scene = [self preferredWindowScene];
    for (UIWindow *window in scene.windows) {
        if (window == self.visualWindow || window == self.interactionWindow || window == self.hudWindow) { continue; }
        if (window.isKeyWindow) { return window; }
        if (!window.hidden && window.alpha > 0.01 && window.windowLevel == UIWindowLevelNormal) {
            fallback = fallback ?: window;
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
    BOOL executing = self.running && !self.paused;
    self.interactionWindow.systemInteractionEnabled = !executing;

    CGRect bounds = self.hudWindow.bounds;
    CGFloat width = CGRectGetWidth(bounds);
    CGFloat height = CGRectGetHeight(bounds);
    for (NSInteger index = 0; index < (NSInteger)self.points.count; index++) {
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
        hit.userInteractionEnabled = !executing && !self.recording && self.pointEditingEnabled;
        marker.center = CGPointMake(CGRectGetMidX(hit.bounds), CGRectGetMidY(hit.bounds));
        // Only a running script fades its markers. Dimming them while recording
        // hid the very numbers the user needed to see while capturing.
        marker.alpha = executing ? 0.20 : 1.0;
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
    [self refreshHIDFilterSnapshot];
}

- (void)syncRecordingMarkers {
    // Recording adds a number after every physical lift. Rebuilding the whole
    // hosted HUD for each lift blocks the HID filter's main-thread handoff and
    // can lose the next fast tap. Keep the toolbar/context, append only the new
    // non-interactive marker, and let the usual in-place update position it.
    while (self.markerHitViews.count > self.points.count) {
        [self.markerHitViews.lastObject removeFromSuperview];
        [self.markerHitViews removeLastObject];
        [self.markerViews removeLastObject];
    }
    for (NSInteger index = (NSInteger)self.markerHitViews.count; index < (NSInteger)self.points.count; index++) {
        ATMarkerView *marker = [[ATMarkerView alloc] initWithFrame:CGRectZero];
        CGFloat hitSide = MAX(58.0, 58.0 * self.markerScale);
        UIView *hit = [[UIView alloc] initWithFrame:CGRectMake(0, 0, hitSide, hitSide)];
        hit.backgroundColor = UIColor.clearColor;
        hit.userInteractionEnabled = NO;
        marker.center = CGPointMake(CGRectGetMidX(hit.bounds), CGRectGetMidY(hit.bounds));
        [hit addSubview:marker];
        [self.hudController.view addSubview:hit];
        [self.markerViews addObject:marker];
        [self.markerHitViews addObject:hit];
    }
    [self updateOverlayContentInPlace];
}

- (void)updateOverlayContentInPlace {
    CGRect bounds = self.hudWindow.bounds;
    CGFloat width = CGRectGetWidth(bounds);
    CGFloat height = CGRectGetHeight(bounds);
    BOOL executing = self.running && !self.paused;
    self.interactionWindow.systemInteractionEnabled = !executing;
    for (NSInteger index = 0; index < (NSInteger)self.markerViews.count && index < (NSInteger)self.points.count; index++) {
        CGPoint ratio = self.points[index].CGPointValue;
        CGPoint center = CGPointMake(MIN(MAX(ratio.x * width, 28), width - 28),
                                     MIN(MAX(ratio.y * height, 28), height - 28));
        ATMarkerView *marker = self.markerViews[index];
        [marker configureNumber:index + 1
                          scale:self.markerScale
                       selected:index == self.selectedIndex
                         active:(executing && index == self.activeIndex)];
        UIView *hit = self.markerHitViews[index];
        hit.tag = index;
        hit.center = center;
        hit.userInteractionEnabled = !executing && !self.recording && self.pointEditingEnabled;
        marker.center = CGPointMake(CGRectGetMidX(hit.bounds), CGRectGetMidY(hit.bounds));
        // Only a running script fades its markers. Dimming them while recording
        // hid the very numbers the user needed to see while capturing.
        marker.alpha = executing ? 0.20 : 1.0;
    }
    UIImageSymbolConfiguration *configuration = [UIImageSymbolConfiguration configurationWithPointSize:21.0 * self.controlScale weight:UIImageSymbolWeightBold];
    NSString *symbol = executing ? @"pause.fill" : @"play.fill";
    [self.runButton setImage:[UIImage systemImageNamed:symbol withConfiguration:configuration] forState:UIControlStateNormal];
    self.runButton.tintColor = executing ? UIColor.systemOrangeColor : UIColor.systemBlueColor;
    self.toolbar.alpha = executing ? 0.20 : 1.0;
    if (executing) { [self dismissPointEditor]; }
    [self updateCountdownHUD];
    [self applyCurrentAppearance];
    [self refreshHIDFilterSnapshot];
}

- (void)buildToolbar {
    CGFloat s = self.controlScale;
    CGFloat buttonSide = 43.0 * s;
    CGFloat gap = 4.0 * s;

    NSMutableArray<NSDictionary *> *items = [NSMutableArray array];
    [items addObject:@{@"symbol": @"xmark", @"color": UIColor.labelColor, @"action": @"toolbarClose:"}];
    if (self.recording) {
        // The two capture modes get their own icon and accent so the floating
        // bar always shows which recorder is armed: a red dot for tap capture
        // and a purple hand for gesture capture.
        // Role 4 is the gesture-recorder session. Use it as authoritative
        // identity as well as the capture flag so a fast rebuild can never
        // render the red tap-recorder icon in the purple gesture module.
        BOOL gestures = self.recordingCapturesGestures || _sessionRole == 4;
        UIColor *accent = gestures
            ? [UIColor colorWithRed:0.55 green:0.27 blue:0.85 alpha:1.0]
            : UIColor.systemRedColor;
        if (self.recordingActive) {
            [items addObject:@{@"symbol": @"stop.fill", @"color": accent, @"action": @"toolbarFinishRecording:"}];
        } else {
            [items addObject:@{@"symbol": gestures ? @"hand.draw.fill" : @"record.circle.fill", @"color": accent, @"action": @"toolbarStartRecording:"}];
        }
    } else {
        BOOL executing = self.running && !self.paused;
        [items addObject:@{@"symbol": executing ? @"pause.fill" : @"play.fill", @"color": executing ? UIColor.systemOrangeColor : UIColor.systemBlueColor, @"action": @"toolbarToggle:"}];
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
    // Keep the bar fully visible while recording: it has to stay tappable and
    // readable, only a running script should fade out of the way.
    panel.alpha = (self.running && !self.paused) ? 0.20 : 1.0;
    panel.layer.cornerRadius = 15.0 * s;
    panel.layer.shadowColor = UIColor.blackColor.CGColor;
    panel.layer.shadowOpacity = 0.35;
    panel.layer.shadowRadius = 10;
    panel.layer.shadowOffset = CGSizeMake(0, 4);

    [items enumerateObjectsUsingBlock:^(NSDictionary *item, NSUInteger index, BOOL *stop) {
        (void)stop;
        UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
        button.frame = CGRectMake(7.0 * s, 7.0 * s + index * (buttonSide + gap), buttonSide, buttonSide);
        UIImageSymbolConfiguration *configuration = [UIImageSymbolConfiguration configurationWithPointSize:21.0 * s weight:UIImageSymbolWeightBold];
        UIImage *image = [UIImage systemImageNamed:item[@"symbol"] withConfiguration:configuration];
        [button setImage:image forState:UIControlStateNormal];
        button.tintColor = item[@"color"];
        button.tag = (NSInteger)_sessionIdentifier;
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
    if (!self.visible || _editingSuppressed || !self.hudController.view || self.hudWindow.hidden) { return; }

    self.completionGeneration += 1;
    NSUInteger generation = self.completionGeneration;
    [self.completionPanel removeFromSuperview];

    CGRect bounds = self.hudWindow.bounds;
    CGFloat panelWidth = MIN(CGRectGetWidth(bounds) - 32.0, 188.0);
    CGFloat panelHeight = 94.0;
    CGFloat iconSize = 32.0;
    UIView *panel = [[UIView alloc] initWithFrame:CGRectMake(0, 0, panelWidth, panelHeight)];
    panel.center = CGPointMake(CGRectGetMidX(bounds), CGRectGetMidY(bounds));
    panel.backgroundColor = [UIColor.systemBackgroundColor colorWithAlphaComponent:0.94];
    panel.layer.cornerRadius = 18.0;
    panel.layer.borderWidth = 1.0;
    panel.layer.borderColor = UIColor.separatorColor.CGColor;
    panel.layer.shadowColor = UIColor.blackColor.CGColor;
    panel.layer.shadowOpacity = 0.34;
    panel.layer.shadowRadius = 16.0;
    panel.userInteractionEnabled = NO;

    // Centered layout: the icon sits above the text and everything is
    // horizontally centered, matching the in-app completion prompt.
    UIImageView *icon = [[UIImageView alloc] initWithImage:[UIImage systemImageNamed:@"checkmark.circle.fill"]];
    icon.frame = CGRectMake((panelWidth - iconSize) / 2.0, 13.0, iconSize, iconSize);
    icon.tintColor = UIColor.systemGreenColor;
    icon.contentMode = UIViewContentModeScaleAspectFit;
    [panel addSubview:icon];

    UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(14.0, 51.0, panelWidth - 28.0, 28.0)];
    label.text = message.length > 0 ? message : @"脚本已完成";
    label.textColor = UIColor.labelColor;
    label.font = [UIFont systemFontOfSize:17.0 weight:UIFontWeightSemibold];
    label.numberOfLines = 1;
    label.textAlignment = NSTextAlignmentCenter;
    label.lineBreakMode = NSLineBreakByWordWrapping;
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

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
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
    if ((self.running && !self.paused) || !self.pointEditingEnabled || index < 0 || index >= (NSInteger)self.actionSettings.count) { return; }
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

    // 连续执行次数 only belongs to the single-target script (0 = tap forever).
    // Multi-target and recorded scripts run every number once per round and are
    // repeated through 循环次数, so the field is hidden for them.
    BOOL showsRepeatField = !self.multiple;
    NSArray<NSString *> *labels = showsRepeatField
        ? @[@"点击间隔", @"按压时长（毫秒）", @"连续执行次数"]
        : @[@"点击间隔", @"按压时长（毫秒）"];
    NSArray<NSNumber *> *values = showsRepeatField
        ? @[settings[@"intervalValue"] ?: @500,
            settings[@"durationMilliseconds"] ?: @60,
            settings[@"repeatCount"] ?: @1]
        : @[settings[@"intervalValue"] ?: @500,
            settings[@"durationMilliseconds"] ?: @60];
    NSMutableArray<UIButton *> *fields = [NSMutableArray array];
    for (NSInteger row = 0; row < (NSInteger)labels.count; row++) {
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
    self.editorRepeatField = showsRepeatField ? fields[2] : nil;

    if (showsRepeatField) {
        UILabel *repeatTip = [self editorLabelWithText:@"执行次数 0 = 无限次，直到手动暂停或停止"
                                                 frame:CGRectMake(20, 234, panelWidth - 40, 20)
                                                  font:[UIFont systemFontOfSize:12 weight:UIFontWeightMedium]];
        repeatTip.textColor = UIColor.systemOrangeColor;
        repeatTip.adjustsFontSizeToFitWidth = YES;
        [panel addSubview:repeatTip];
    }

    UISegmentedControl *unit = [[UISegmentedControl alloc] initWithItems:@[@"毫秒", @"秒", @"分钟"]];
    unit.frame = CGRectMake(20, showsRepeatField ? 258.0 : 195.0, panelWidth - 40, 38);
    NSInteger selectedUnit = MIN(MAX([settings[@"unitIndex"] integerValue], 0), 2);
    unit.selectedSegmentIndex = selectedUnit;
    NSInteger intervalValue = MAX([settings[@"intervalValue"] integerValue], 1);
    NSInteger selectedMultiplier = selectedUnit == 0 ? 1 : (selectedUnit == 1 ? 1000 : 60000);
    NSInteger intervalMilliseconds = MIN(MAX(intervalValue * selectedMultiplier, 1), 3600000);
    NSArray<NSString *> *presetKeys = @[@"millisecondsPreset", @"secondsPreset", @"minutesPreset"];
    NSArray<NSNumber *> *multipliers = @[@1, @1000, @60000];
    self.editorIntervalPresets = [NSMutableArray arrayWithCapacity:3];
    for (NSInteger presetIndex = 0; presetIndex < 3; presetIndex++) {
        NSNumber *stored = settings[presetKeys[presetIndex]];
        NSInteger fallback = MAX((NSInteger)llround((double)intervalMilliseconds / multipliers[presetIndex].doubleValue), 1);
        [self.editorIntervalPresets addObject:@(MAX(stored ? stored.integerValue : fallback, 1))];
    }
    self.editorIntervalPresets[selectedUnit] = @(intervalValue);
    self.editorPreviousUnitIndex = selectedUnit;
    [unit addTarget:self action:@selector(editorUnitChanged:) forControlEvents:UIControlEventValueChanged];
    [panel addSubview:unit];
    self.editorUnitControl = unit;

    NSArray<NSString *> *keys = @[@"1", @"2", @"3", @"4", @"5", @"6", @"7", @"8", @"9", @"清空", @"0", @"⌫"];
    CGFloat keyGap = 7;
    CGFloat keyWidth = (panelWidth - 40 - keyGap * 2) / 3;
    CGFloat keyHeight = 42;
    for (NSInteger idx = 0; idx < (NSInteger)keys.count; idx++) {
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
    cancel.titleLabel.font = [UIFont systemFontOfSize:17 weight:UIFontWeightSemibold];
    cancel.backgroundColor = UIColor.tertiarySystemFillColor;
    [cancel setTitleColor:UIColor.labelColor forState:UIControlStateNormal];
    cancel.layer.cornerRadius = 10;
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
    [self refreshHIDFilterSnapshot];
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

- (void)editorUnitChanged:(UISegmentedControl *)sender {
    NSInteger newIndex = MIN(MAX(sender.selectedSegmentIndex, 0), 2);
    NSInteger oldIndex = MIN(MAX(self.editorPreviousUnitIndex, 0), 2);
    if (self.editorIntervalPresets.count != 3) {
        self.editorIntervalPresets = [NSMutableArray arrayWithArray:@[@500, @1, @1]];
    }
    NSInteger currentValue = MAX([[self.editorIntervalField titleForState:UIControlStateNormal] integerValue], 1);
    self.editorIntervalPresets[oldIndex] = @(currentValue);
    NSInteger nextValue = MAX(self.editorIntervalPresets[newIndex].integerValue, 1);
    [self.editorIntervalField setTitle:[NSString stringWithFormat:@"%ld", (long)nextValue]
                              forState:UIControlStateNormal];
    self.editorPreviousUnitIndex = newIndex;
    if (self.editorSelectedField == self.editorIntervalField) {
        self.editorInputBuffer = [NSString stringWithFormat:@"%ld", (long)nextValue];
        self.editorReplaceOnNextDigit = YES;
    }
}

- (void)editorCancel:(id)sender { [self dismissPointEditor]; }

- (void)editorSave:(id)sender {
    NSInteger interval = MAX([[self.editorIntervalField titleForState:UIControlStateNormal] integerValue], 1);
    NSInteger duration = MAX([[self.editorDurationField titleForState:UIControlStateNormal] integerValue], 1);
    NSInteger unit = self.editorUnitControl.selectedSegmentIndex;
    if (self.editorIntervalPresets.count != 3) {
        self.editorIntervalPresets = [NSMutableArray arrayWithArray:@[@500, @1, @1]];
    }
    self.editorIntervalPresets[MIN(MAX(unit, 0), 2)] = @(interval);
    NSInteger index = self.editingIndex;
    // When the repeat field is hidden, keep the stored value instead of saving
    // a zero derived from a missing field.
    NSInteger repeats = 1;
    if (self.editorRepeatField) {
        repeats = MAX([[self.editorRepeatField titleForState:UIControlStateNormal] integerValue], 0);
    } else if (index >= 0 && index < (NSInteger)self.actionSettings.count) {
        repeats = MAX([self.actionSettings[index][@"repeatCount"] integerValue], 0);
    }
    NSInteger millisecondsPreset = self.editorIntervalPresets[0].integerValue;
    NSInteger secondsPreset = self.editorIntervalPresets[1].integerValue;
    NSInteger minutesPreset = self.editorIntervalPresets[2].integerValue;
    [self dismissPointEditor];
    if (self.saveActionHandler) {
        self.saveActionHandler(
            index,
            interval,
            unit,
            millisecondsPreset,
            secondsPreset,
            minutesPreset,
            duration,
            repeats
        );
    }
}

- (void)dismissPointEditor {
    [self.editorBackdrop removeFromSuperview];
    self.editorBackdrop = nil;
    self.editorPanel = nil;
    self.editorUnitControl = nil;
    self.editorIntervalPresets = nil;
    self.editorPreviousUnitIndex = 0;
    self.editorIntervalField = nil;
    self.editorDurationField = nil;
    self.editorRepeatField = nil;
    self.editorSelectedField = nil;
    self.editorInputBuffer = nil;
    [self refreshHIDFilterSnapshot];
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
    // Raw HID and UIKit can report the same button press twice, so debounce
    // only the same action. A different button (for example Play then Pause,
    // or Record then Close) must remain immediately responsive.
    if (_lastToolbarAction == action && now - _lastToolbarActionAt < 0.35) { return NO; }
    _lastToolbarAction = action;
    _lastToolbarActionAt = now;
    return YES;
}

- (BOOL)senderBelongsToCurrentSession:(id)sender {
    if (_sessionIdentifier == 0) { return NO; }
    if (![sender isKindOfClass:UIButton.class]) { return YES; }
    return ((UIButton *)sender).tag == (NSInteger)_sessionIdentifier;
}

- (void)toolbarClose:(id)sender {
    if ([self senderBelongsToCurrentSession:sender] && [self acceptToolbarAction:_cmd] && self.closeHandler) { self.closeHandler(); }
}
- (void)toolbarToggle:(id)sender {
    if ([self senderBelongsToCurrentSession:sender] && [self acceptToolbarAction:_cmd] && self.toggleRunHandler) { self.toggleRunHandler(); }
}
- (void)toolbarSettings:(id)sender {
    if ((self.running && !self.paused) || self.recordingActive) { return; }
    if ([self senderBelongsToCurrentSession:sender] && [self acceptToolbarAction:_cmd] && self.settingsHandler) { self.settingsHandler(); }
}
- (void)toolbarAdd:(id)sender {
    if ((self.running && !self.paused) || self.recordingActive) { return; }
    if ([self senderBelongsToCurrentSession:sender] && [self acceptToolbarAction:_cmd] && self.addHandler) { self.addHandler(); }
}
- (void)toolbarDelete:(id)sender {
    if ((self.running && !self.paused) || self.recordingActive) { return; }
    if ([self senderBelongsToCurrentSession:sender] && [self acceptToolbarAction:_cmd] && self.deleteHandler) { self.deleteHandler(); }
}
- (void)toolbarStartRecording:(id)sender {
    if ([self senderBelongsToCurrentSession:sender] && [self acceptToolbarAction:_cmd] && self.startRecordingHandler) { self.startRecordingHandler(); }
}
- (void)toolbarFinishRecording:(id)sender {
    if (CACurrentMediaTime() - _recordingActivatedAt < 0.60) { return; }
    if ([self senderBelongsToCurrentSession:sender] && [self acceptToolbarAction:_cmd] && self.finishRecordingHandler) { self.finishRecordingHandler(); }
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
    if (!self.visible || generation != self.registrationGeneration) { return; }
    if (hudOK) {
        [self useHostedHUDPresentation];
        BOOL inputReady = _hidMonitor != NULL || [self startPhysicalHIDMonitor];
        self.diagnosticText = inputReady
            ? @"跨进程悬浮窗与原始触摸直控已注册。"
            : @"悬浮窗已显示，但原始触摸直控不可用；请检查巨魔权限。";
        return;
    }
    // Creating a CAContext can take longer while several module transitions
    // are being committed by WindowServer. Keep retrying while this exact show
    // generation is still active; closing the mode invalidates the generation
    // immediately, so stale retries cannot revive it.
    if (attempt < 39) {
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
    if (self.visible) {
        self.hudWindow.hidden = NO;
        self.hudWindow.systemInteractionEnabled = YES;
        self.hudWindow.userInteractionEnabled = YES;
        self.hudController.view.hidden = NO;
        self.hudController.view.layer.opacity = 1.0f;
    }
    [CATransaction commit];
    if (self.visible && !self.toolbar) { [self rebuildOverlayContent]; }
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
    if (suppressed) {
        // Drop ownership of any touch that was in flight when Settings opened
        // or the device locked. Carrying this state onto the lock screen can
        // consume the first unlock DOWN/UP pair.
        _physicalTouchActive = NO;
        [self resetHIDFilterTouchState];
        _lastPhysicalEventAt = 0;
        [self resetDirectTouchState];
    }
    if (!self.visible) {
        // A hidden module must stay hidden. Previously, calling this method
        // with `NO` during a rapid mode switch restored opacity/interactivity
        // without restoring `_overlayPresented`, producing an invisible or
        // blocking orphan context that the next conditional hide skipped.
        self.hudWindow.systemInteractionEnabled = NO;
        self.hudWindow.userInteractionEnabled = NO;
        if (self.hudWindow) {
            self.hudWindow.hidden = NO;
            self.hudController.view.hidden = NO;
            [CATransaction begin];
            [CATransaction setDisableActions:YES];
            self.hudController.view.layer.opacity = 0.0f;
            [CATransaction commit];
            [CATransaction flush];
        }
        [self refreshHIDFilterSnapshot];
        return;
    }
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
    [self refreshHIDFilterSnapshot];
    [CATransaction flush];
}

- (void)suspendForDeviceLock {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self suspendForDeviceLock]; });
        return;
    }
    // Lock handling must not commit layers or flush the SpringBoard-hosted
    // context while WindowServer itself is transitioning to the lock screen.
    // Close only the input gate/client here; visual reconciliation is deferred
    // until the application becomes active again.
    _editingSuppressed = YES;
    _physicalTouchActive = NO;
    _lastPhysicalEventAt = 0;
    _directTouchTarget = ATDirectTouchTargetNone;
    _directMarkerIndex = NSNotFound;
    _directControlView = nil;
    _directTouchMoved = NO;
    self.gestureInProgress = NO;
    [self stopAppearanceMonitoring];
    os_unfair_lock_lock(&_filterSnapshotLock);
    _filterSnapshotSuppressed = YES;
    _filterTouchActive = NO;
    _filterTouchDecided = NO;
    _filterLastEventAt = 0;
    os_unfair_lock_unlock(&_filterSnapshotLock);
    [self stopRecordingHIDMonitor];
    [self stopPhysicalHIDMonitor];
}

- (BOOL)resumeAfterDeviceUnlock {
    if (!NSThread.isMainThread) {
        self.diagnosticText = @"解锁恢复必须在主线程执行。";
        return NO;
    }
    // Release the lock suppression for every controller, visible or not. A
    // suspended controller that is not visible right now used to keep the flag,
    // so its mode opened suppressed the next time it was used — one of the ways
    // the interface ended up looking frozen after a screen lock.
    [self setEditingSuppressed:NO];
    os_unfair_lock_lock(&_filterSnapshotLock);
    _filterSnapshotSuppressed = NO;
    os_unfair_lock_unlock(&_filterSnapshotLock);
    if (!self.visible) { return YES; }
    if (![self startPhysicalHIDMonitor]) {
        self.diagnosticText = @"解锁后无法恢复悬浮窗触摸监听，请关闭并重新开启当前模式。";
        return NO;
    }
    [self startAppearanceMonitoring];
    _acceptPhysicalInputAfter = CACurrentMediaTime() + 0.25;
    [self refreshHIDFilterSnapshot];
    return YES;
}

- (void)setGesturePaths:(NSArray<NSArray<NSValue *> *> *)paths
              durations:(NSArray<NSNumber *> *)durations {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self setGesturePaths:paths durations:durations]; });
        return;
    }
    if (!self.gesturePathLayers) { self.gesturePathLayers = [NSMutableArray array]; }
    NSArray<NSArray<NSValue *> *> *routes = paths ?: @[];

    // Refresh runs on every engine change. Redrawing identical routes would
    // restart the animation and make the same gesture appear twice, so only a
    // real change repaints.
    NSMutableString *signature = [NSMutableString string];
    for (NSArray<NSValue *> *route in routes) {
        CGPoint head = route.firstObject ? route.firstObject.CGPointValue : CGPointZero;
        CGPoint tail = route.lastObject ? route.lastObject.CGPointValue : CGPointZero;
        [signature appendFormat:@"%lu:%.4f,%.4f-%.4f,%.4f|",
         (unsigned long)route.count, head.x, head.y, tail.x, tail.y];
    }
    if ([signature isEqualToString:self.gesturePathsSignature ?: @""]) { return; }

    [self clearGesturePathLayers];
    self.gesturePathsSignature = signature;
    if (!self.hudWindow || self.hudWindow.hidden || _editingSuppressed) { return; }
    if (routes.count == 0) { return; }

    CGRect bounds = self.hudWindow.bounds;
    CGFloat width = CGRectGetWidth(bounds);
    CGFloat height = CGRectGetHeight(bounds);
    CFTimeInterval now = CACurrentMediaTime();
    NSArray<NSNumber *> *lengths = durations ?: @[];
    NSInteger routeIndex = 0;
    for (NSArray<NSValue *> *route in routes) {
        if (route.count < 2) { continue; }
        UIBezierPath *line = [UIBezierPath bezierPath];
        CGPoint first = CGPointZero;
        for (NSInteger index = 0; index < (NSInteger)route.count; index++) {
            CGPoint ratio = route[index].CGPointValue;
            CGPoint point = CGPointMake(MIN(MAX(ratio.x, 0), 1) * width,
                                        MIN(MAX(ratio.y, 0), 1) * height);
            if (index == 0) {
                first = point;
                [line moveToPoint:point];
            } else {
                [line addLineToPoint:point];
            }
        }

        // Touch-visualizer style: a translucent white dot runs along the path
        // and drags a fading tail behind it, exactly like iOS "show touches".
        // The replay length makes the indicator keep pace with the real run.
        CFTimeInterval duration = MAX(0.8, (CFTimeInterval)route.count * 0.012);
        if (routeIndex < (NSInteger)lengths.count) {
            duration = MAX(0.25, lengths[routeIndex].doubleValue);
        }
        routeIndex += 1;
        for (NSInteger dot = 0; dot < ATGestureTrailDotCount; dot++) {
            CGFloat progress = (CGFloat)dot / (CGFloat)(ATGestureTrailDotCount - 1);
            CGFloat radius = ATGestureTrailHeadRadius * (1.0 - 0.55 * progress);
            CGFloat alpha = ATGestureTrailHeadAlpha * (1.0 - 0.80 * progress);
            CAShapeLayer *dotLayer = [CAShapeLayer layer];
            dotLayer.frame = CGRectMake(0, 0, radius * 2.0, radius * 2.0);
            dotLayer.path = [UIBezierPath bezierPathWithOvalInRect:CGRectMake(0, 0, radius * 2.0, radius * 2.0)].CGPath;
            dotLayer.fillColor = UIColor.whiteColor.CGColor;
            dotLayer.opacity = alpha;
            dotLayer.position = first;

            CAKeyframeAnimation *move = [CAKeyframeAnimation animationWithKeyPath:@"position"];
            move.path = line.CGPath;
            move.duration = duration;
            move.calculationMode = kCAAnimationPaced;
            move.rotationMode = kCAAnimationRotateAuto;
            // One pass per gesture: the route is drawn while that gesture is
            // actually replayed, then replaced by the next one, so the routes
            // appear one after another instead of all at once.
            move.repeatCount = 1;
            move.removedOnCompletion = NO;
            // Each dot starts a little later, which parks it further back on the
            // same path and produces the tail. "Both" keeps the tail at the
            // start point during its delay and parks it at the end afterwards.
            move.beginTime = now + (CFTimeInterval)dot * ATGestureTrailDotDelay;
            move.fillMode = kCAFillModeBoth;
            [dotLayer addAnimation:move forKey:@"ATGestureTrailMove"];

            [self.hudController.view.layer addSublayer:dotLayer];
            [self.gesturePathLayers addObject:dotLayer];
        }
    }
}

- (void)clearGesturePathLayers {
    for (CALayer *layer in self.gesturePathLayers) { [layer removeFromSuperlayer]; }
    [self.gesturePathLayers removeAllObjects];
    // Force the next call to repaint even when the routes are identical.
    self.gesturePathsSignature = nil;
}

- (void)setRecordingEnabled:(BOOL)enabled {
    [self configureRecordingEnabled:enabled
                    capturesGestures:enabled && _recordingCapturesGestures
                               active:NO];
}

- (void)setRecordingCapturesGestures:(BOOL)enabled {
    [self configureRecordingEnabled:self.recording
                    capturesGestures:enabled
                               active:_recordingActive];
}

- (void)setRecordingActive:(BOOL)active {
    [self configureRecordingEnabled:self.recording
                    capturesGestures:_recordingCapturesGestures
                               active:active];
}

- (void)hide {
    if (!NSThread.isMainThread) {
        dispatch_async(dispatch_get_main_queue(), ^{ [self hide]; });
        return;
    }
    _overlayPresented = NO;
    _sessionIdentifier = 0;
    _sessionRole = 0;
    self.registrationGeneration += 1;
    self.completionGeneration += 1;
    self.registrationPending = NO;
    [self stopAppearanceMonitoring];
    // A hidden module must not retain a global IOHID filter client. Four module
    // controllers retaining four clients was both a cross-mode input leak and a
    // lock-screen hazard: SpringBoard continued invoking suspended AutoTap
    // clients while installing the lock screen. The known-safe lifecycle used
    // by the earlier release tears the client down on every close and creates
    // exactly one fresh client for the one visible module.
    [self stopRecordingHIDMonitor];
    [self stopPhysicalHIDMonitor];
    [self dismissPointEditor];
    [self.countdownBadge removeFromSuperview];
    [self.completionPanel removeFromSuperview];
    if (self.hudWindow.isKeyWindow &&
        UIApplication.sharedApplication.applicationState == UIApplicationStateActive &&
        self.ownerWindow) {
        [self.ownerWindow makeKeyWindow];
    }

    // Preserve this module's source UIWindow and view state, but remove its
    // WindowServer registration. Reopening the same module registers that live
    // context again without sharing toolbar or recorder state with any other
    // module.
    self.hudWindow.hidden = NO;
    self.hudWindow.systemInteractionEnabled = NO;
    self.hudWindow.userInteractionEnabled = NO;
    self.visualWindow.hidden = YES;
    self.interactionWindow.hidden = YES;
    for (UIView *view in self.markerHitViews) { [view removeFromSuperview]; }
    [self.toolbar removeFromSuperview];
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    self.hudController.view.layer.opacity = 0.0f;
    [CATransaction commit];
    self.toolbar = nil;
    self.runButton = nil;
    self.countdownBadge = nil;
    self.countdownLabel = nil;
    self.completionPanel = nil;
    self.gestureInProgress = NO;
    self.rebuildPending = NO;
    self.recording = NO;
    _recordingActive = NO;
    _recordingCapturesGestures = NO;
    _recordingTouchCandidate = NO;
    _recordingTouchMoved = NO;
    _recordingTouchStartedAt = 0;
    _recordingLastTapAt = 0;
    _recordingActivatedAt = 0;
    _acceptPhysicalInputAfter = 0;
    [self resetHIDFilterTouchState];
    _physicalTouchActive = NO;
    _lastPhysicalEventAt = 0;
    _lastToolbarActionAt = 0;
    _lastToolbarAction = NULL;
    self.running = NO;
    self.paused = NO;
    self.points = @[];
    self.actionSettings = @[];
    [self clearGesturePathLayers];
    self.multiple = NO;
    self.selectedIndex = NSNotFound;
    self.activeIndex = NSNotFound;
    _editingSuppressed = NO;
    [self.markerViews removeAllObjects];
    [self.markerHitViews removeAllObjects];
    [self refreshHIDFilterSnapshot];
    [CATransaction flush];
    id oldHostingController = self.hudHostingController;
    uint32_t oldContextID = self.hudContextID;
    self.hudHostingController = nil;
    self.hudContextID = 0;
    [self unregisterHosting:oldHostingController contextID:oldContextID];
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
    NSUInteger generation = self.registrationGeneration;
    dispatch_async(dispatch_get_main_queue(), ^{
        // The notification can be delivered immediately before a rapid mode
        // switch. Never let that old queued layout rebuild a toolbar after
        // `hide` cleared its session id; such a toolbar looks visible but all
        // of its stamped buttons are correctly rejected as stale.
        if (!self.visible || generation != self.registrationGeneration) { return; }
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
