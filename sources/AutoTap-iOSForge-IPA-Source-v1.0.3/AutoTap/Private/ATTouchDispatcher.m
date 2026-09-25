#import "ATTouchDispatcher.h"
#import "ATSystemOverlayController.h"

#import <UIKit/UIKit.h>
#import <dlfcn.h>
#import <mach/mach_time.h>
#import <objc/message.h>

typedef struct __IOHIDEvent *IOHIDEventRef;
typedef struct __IOHIDEventSystemClient *IOHIDEventSystemClientRef;
typedef double IOHIDFloat;
typedef uint32_t IOOptionBits;

typedef IOHIDEventRef (*ATCreateDigitizerEventFn)(
    CFAllocatorRef, uint64_t, uint32_t, uint32_t, uint32_t, uint32_t, uint32_t,
    IOHIDFloat, IOHIDFloat, IOHIDFloat, IOHIDFloat, IOHIDFloat,
    Boolean, Boolean, IOOptionBits);
typedef IOHIDEventRef (*ATCreateFingerEventFn)(
    CFAllocatorRef, uint64_t, uint32_t, uint32_t, uint32_t,
    IOHIDFloat, IOHIDFloat, IOHIDFloat, IOHIDFloat, IOHIDFloat,
    Boolean, Boolean, IOOptionBits);
typedef void (*ATAppendEventFn)(IOHIDEventRef, IOHIDEventRef, IOOptionBits);
typedef void (*ATSetIntegerValueFn)(IOHIDEventRef, uint32_t, CFIndex);
typedef void (*ATSetFloatValueFn)(IOHIDEventRef, uint32_t, double);
typedef void (*ATSetSenderIDFn)(IOHIDEventRef, uint64_t);
typedef void (*ATSetDigitizerInfoFn)(IOHIDEventRef, uint32_t, uint8_t, uint8_t, CFStringRef, CFTimeInterval, float);
typedef IOHIDEventSystemClientRef (*ATCreateSystemClientFn)(CFAllocatorRef);
typedef void (*ATDispatchEventFn)(IOHIDEventSystemClientRef, IOHIDEventRef);
typedef CFTypeRef (*ATSecTaskCreateFromSelfFn)(CFAllocatorRef);
typedef CFTypeRef (*ATSecTaskCopyValueForEntitlementFn)(CFTypeRef, CFStringRef, CFErrorRef *);
typedef int32_t (*ATCreatePowerAssertionFn)(CFStringRef, uint32_t, CFStringRef, uint32_t *);
typedef int32_t (*ATReleasePowerAssertionFn)(uint32_t);

static const uint32_t ATDigitizerTransducerTypeHand = 3;
static const uint32_t ATDigitizerEventTouch = 1u << 1;
static const uint32_t ATDigitizerEventPosition = 1u << 2;
static const uint32_t ATDigitizerEventAttribute = 1u << 4;
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
// Matches the default multitouch sender used by the known-working TrollStore
// implementation. BackBoard treats this as a display-integrated digitizer;
// an arbitrary debugging sender can be accepted by the client API yet ignored
// by the foreground application's event route.
static const uint64_t ATDigitizerSenderID = 0x8000000817319372ULL;

static NSMutableOrderedSet<NSNumber *> *ATSyntheticTouchTimestamps(void) {
    static NSMutableOrderedSet<NSNumber *> *timestamps;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        timestamps = [NSMutableOrderedSet orderedSetWithCapacity:512];
    });
    return timestamps;
}

static NSUInteger ATSyntheticDispatchDepth = 0;

static void ATTouchDispatcherBeginSyntheticDispatch(void) {
    NSMutableOrderedSet<NSNumber *> *timestamps = ATSyntheticTouchTimestamps();
    @synchronized (timestamps) { ATSyntheticDispatchDepth += 1; }
}

static void ATTouchDispatcherEndSyntheticDispatch(void) {
    NSMutableOrderedSet<NSNumber *> *timestamps = ATSyntheticTouchTimestamps();
    @synchronized (timestamps) {
        if (ATSyntheticDispatchDepth > 0) { ATSyntheticDispatchDepth -= 1; }
    }
}

BOOL ATTouchDispatcherIsSyntheticDispatchInProgress(void) {
    NSMutableOrderedSet<NSNumber *> *timestamps = ATSyntheticTouchTimestamps();
    @synchronized (timestamps) { return ATSyntheticDispatchDepth > 0; }
}

void ATTouchDispatcherRegisterSyntheticTimestamp(uint64_t timestamp) {
    NSMutableOrderedSet<NSNumber *> *timestamps = ATSyntheticTouchTimestamps();
    @synchronized (timestamps) {
        [timestamps addObject:@(timestamp)];
        while (timestamps.count > 512) {
            [timestamps removeObjectAtIndex:0];
        }
    }
}

BOOL ATTouchDispatcherIsSyntheticTimestamp(uint64_t timestamp) {
    NSMutableOrderedSet<NSNumber *> *timestamps = ATSyntheticTouchTimestamps();
    @synchronized (timestamps) {
        return [timestamps containsObject:@(timestamp)];
    }
}

@interface ATTouchDispatcher ()
@property (nonatomic, copy, readwrite) NSString *diagnosticText;
@end

@implementation ATTouchDispatcher {
    void *_ioKitHandle;
    void *_backBoardHandle;
    ATCreateDigitizerEventFn _createDigitizerEvent;
    ATCreateFingerEventFn _createFingerEvent;
    ATAppendEventFn _appendEvent;
    ATSetIntegerValueFn _setIntegerValue;
    ATSetFloatValueFn _setFloatValue;
    ATSetSenderIDFn _setSenderID;
    ATSetDigitizerInfoFn _setDigitizerInfo;
    ATCreateSystemClientFn _createSystemClient;
    ATDispatchEventFn _dispatchEvent;
    ATCreatePowerAssertionFn _createPowerAssertion;
    ATReleasePowerAssertionFn _releasePowerAssertion;
    IOHIDEventSystemClientRef _systemClient;
    uint32_t _displaySleepAssertionID;
    BOOL _available;
    BOOL _touchActive;
    CGFloat _lastTouchX;
    CGFloat _lastTouchY;
    CGSize _screenSize;
}

+ (instancetype)shared {
    static ATTouchDispatcher *dispatcher;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        dispatcher = [[self alloc] initPrivate];
    });
    return dispatcher;
}

+ (instancetype)dispatcherForModule:(NSString *)module {
    (void)module;
    return [[self alloc] initPrivate];
}

- (instancetype)init {
    return [ATTouchDispatcher shared];
}

- (instancetype)initPrivate {
    self = [super init];
    if (self) {
        _screenSize = UIScreen.mainScreen.bounds.size;
        [self loadPrivateSymbols];
    }
    return self;
}

- (BOOL)isAvailable {
    return _available;
}

- (BOOL)prepareForDispatch {
    if (ATSystemOverlayIsDeviceLocked()) {
        self.diagnosticText = @"设备处于锁屏状态，任务已暂停。";
        return NO;
    }
    // IOHID dispatch has no UIKit affinity. Never synchronously hop to the main
    // queue from an automation worker: that queue may be suspended while iOS is
    // locking the device. Main-thread callers refresh the cached geometry;
    // workers safely reuse it.
    if (NSThread.isMainThread) { _screenSize = UIScreen.mainScreen.bounds.size; }
    @synchronized (self) {
        if (ATSystemOverlayIsDeviceLocked()) {
            self.diagnosticText = @"设备处于锁屏状态，任务已暂停。";
            return NO;
        }
        if (!_available || !_createSystemClient || !_dispatchEvent || !_createDigitizerEvent || !_createFingerEvent || !_appendEvent) {
            self.diagnosticText = @"HID 发送接口尚未就绪。";
            return NO;
        }
        if (_touchActive) {
            self.diagnosticText = @"仍有触点未释放，无法重建 HID 客户端。";
            return NO;
        }
        // Keep one dispatch client for the process lifetime. Recreating it for
        // every start/resume works once on some TrollStore systems, then stops
        // accepting the MOVE frames required by recorded gestures.
        if (!_systemClient) { _systemClient = _createSystemClient(kCFAllocatorDefault); }
        if (!_systemClient) {
            self.diagnosticText = @"无法创建 HID 系统客户端。";
            return NO;
        }

        // Establish the dispatch route without generating a touch. Some iOS
        // versions discard the first digitizer frame after the application has
        // moved to the background; making that frame neutral protects the first
        // user-configured click.
        const uint64_t timestamp = mach_absolute_time();
        IOHIDEventRef neutral = _createDigitizerEvent(
            kCFAllocatorDefault,
            timestamp,
            ATDigitizerTransducerTypeHand,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            false,
            false,
            0
        );
        IOHIDEventRef neutralFinger = _createFingerEvent(
            kCFAllocatorDefault,
            timestamp,
            0,
            2,
            0,
            0,
            0,
            0,
            0,
            0,
            false,
            false,
            0
        );
        if (!neutral || !neutralFinger) {
            if (neutralFinger) { CFRelease(neutralFinger); }
            if (neutral) { CFRelease(neutral); }
            self.diagnosticText = @"无法创建 HID 预热事件。";
            return NO;
        }
        _setIntegerValue(neutral, ATFieldIsBuiltIn, 1);
        _setIntegerValue(neutral, ATFieldDigitizerIsDisplayIntegrated, 1);
        _setIntegerValue(neutral, ATFieldDigitizerIsBuiltIn, 1);
        _appendEvent(neutral, neutralFinger, 0);
        _setIntegerValue(neutralFinger, ATFieldIsBuiltIn, 1);
        _setIntegerValue(neutralFinger, ATFieldDigitizerIsDisplayIntegrated, 1);
        _setIntegerValue(neutralFinger, ATFieldDigitizerIsBuiltIn, 1);
        _setSenderID(neutral, ATDigitizerSenderID);
        _setSenderID(neutralFinger, ATDigitizerSenderID);
        // A system-wide touch must not be routed back to AutoTap's own window
        // context. Sender ID plus display-integrated fields target whichever
        // application is currently in front.
        if (ATSystemOverlayIsDeviceLocked()) {
            CFRelease(neutralFinger);
            CFRelease(neutral);
            self.diagnosticText = @"设备正在锁屏，已取消触摸预热。";
            return NO;
        }
        ATTouchDispatcherRegisterSyntheticTimestamp(timestamp);
        ATTouchDispatcherBeginSyntheticDispatch();
        _dispatchEvent(_systemClient, neutral);
        ATTouchDispatcherEndSyntheticDispatch();
        CFRelease(neutralFinger);
        CFRelease(neutral);
        self.diagnosticText = @"HID 发送通道已预热。";
        return YES;
    }
}

- (BOOL)setDisplaySleepPreventionEnabled:(BOOL)enabled {
    @synchronized (self) {
        if (!enabled) {
            if (_displaySleepAssertionID != 0 && _releasePowerAssertion) {
                _releasePowerAssertion(_displaySleepAssertionID);
            }
            _displaySleepAssertionID = 0;
            return YES;
        }
        if (_displaySleepAssertionID != 0) { return YES; }
        if (!_createPowerAssertion) { return NO; }

        uint32_t assertionID = 0;
        int32_t result = _createPowerAssertion(
            CFSTR("PreventUserIdleDisplaySleep"),
            255,
            CFSTR("AutoTap automation is running"),
            &assertionID
        );
        // Older iOS builds expose the legacy assertion name instead.
        if (result != 0 || assertionID == 0) {
            assertionID = 0;
            result = _createPowerAssertion(
                CFSTR("NoDisplaySleepAssertion"),
                255,
                CFSTR("AutoTap automation is running"),
                &assertionID
            );
        }
        if (result == 0 && assertionID != 0) {
            _displaySleepAssertionID = assertionID;
            return YES;
        }
        return NO;
    }
}

- (void)loadPrivateSymbols {
    _ioKitHandle = dlopen("/System/Library/Frameworks/IOKit.framework/IOKit", RTLD_LAZY | RTLD_LOCAL);
    if (!_ioKitHandle) {
        self.diagnosticText = @"无法加载 IOKit 私有接口。";
        return;
    }

    _createDigitizerEvent = (ATCreateDigitizerEventFn)dlsym(_ioKitHandle, "IOHIDEventCreateDigitizerEvent");
    _createFingerEvent = (ATCreateFingerEventFn)dlsym(_ioKitHandle, "IOHIDEventCreateDigitizerFingerEvent");
    _appendEvent = (ATAppendEventFn)dlsym(_ioKitHandle, "IOHIDEventAppendEvent");
    _setIntegerValue = (ATSetIntegerValueFn)dlsym(_ioKitHandle, "IOHIDEventSetIntegerValue");
    _setFloatValue = (ATSetFloatValueFn)dlsym(_ioKitHandle, "IOHIDEventSetFloatValue");
    _setSenderID = (ATSetSenderIDFn)dlsym(_ioKitHandle, "IOHIDEventSetSenderID");
    _createSystemClient = (ATCreateSystemClientFn)dlsym(_ioKitHandle, "IOHIDEventSystemClientCreate");
    _dispatchEvent = (ATDispatchEventFn)dlsym(_ioKitHandle, "IOHIDEventSystemClientDispatchEvent");
    _createPowerAssertion = (ATCreatePowerAssertionFn)dlsym(_ioKitHandle, "IOPMAssertionCreateWithName");
    _releasePowerAssertion = (ATReleasePowerAssertionFn)dlsym(_ioKitHandle, "IOPMAssertionRelease");
    _backBoardHandle = dlopen("/System/Library/PrivateFrameworks/BackBoardServices.framework/BackBoardServices", RTLD_LAZY | RTLD_LOCAL);
    if (_backBoardHandle) {
        _setDigitizerInfo = (ATSetDigitizerInfoFn)dlsym(_backBoardHandle, "BKSHIDEventSetDigitizerInfo");
    }

    _available = _createDigitizerEvent && _createFingerEvent && _appendEvent &&
        _setIntegerValue && _setFloatValue && _setSenderID &&
        _createSystemClient && _dispatchEvent;

    if (!_available) {
        self.diagnosticText = @"当前系统缺少一个或多个 HID 符号。";
        return;
    }

    _systemClient = _createSystemClient(kCFAllocatorDefault);
    if (!_systemClient) {
        _available = NO;
        self.diagnosticText = @"无法创建 HID 系统客户端。";
        return;
    }

    void *securityHandle = dlopen("/System/Library/Frameworks/Security.framework/Security", RTLD_LAZY | RTLD_LOCAL);
    if (securityHandle) {
        ATSecTaskCreateFromSelfFn createTask = (ATSecTaskCreateFromSelfFn)dlsym(securityHandle, "SecTaskCreateFromSelf");
        ATSecTaskCopyValueForEntitlementFn copyEntitlement = (ATSecTaskCopyValueForEntitlementFn)dlsym(securityHandle, "SecTaskCopyValueForEntitlement");
        if (createTask && copyEntitlement) {
            CFTypeRef task = createTask(kCFAllocatorDefault);
            if (task) {
                CFTypeRef value = copyEntitlement(task, CFSTR("com.apple.private.hid.client.event-dispatch"), NULL);
                BOOL granted = value && CFGetTypeID(value) == CFBooleanGetTypeID() && CFBooleanGetValue((CFBooleanRef)value);
                if (value) { CFRelease(value); }
                CFRelease(task);
                if (!granted) {
                    _available = NO;
                    self.diagnosticText = @"当前 IPA 未保留 HID event-dispatch 权限；请用 iOSForge 无证书构建后直接通过 TrollStore 安装，不要二次普通自签。";
                    return;
                }
            }
        }
    }

    self.diagnosticText = @"HID 权限与事件桥接均已就绪。";
}

- (BOOL)sendAtX:(CGFloat)x y:(CGFloat)y phase:(ATTouchPhase)phase {
    // Construct and dispatch directly on the calling engine's serial queue.
    // Waiting for UIKit's main queue here can deadlock the system input path
    // during lock; IOHIDEventSystemClient itself does not require UIKit.
    if (ATSystemOverlayIsDeviceLocked()) { return NO; }
    @synchronized (self) {
    if (ATSystemOverlayIsDeviceLocked()) { return NO; }
    if (!_available || !_systemClient) {
        self.diagnosticText = @"HID 桥接不可用，请检查系统版本与签名权限。";
        return NO;
    }

    CGSize screenSize = _screenSize;
    if (screenSize.width <= 0 || screenSize.height <= 0) {
        self.diagnosticText = @"屏幕坐标尚未初始化，请重新开启当前模式。";
        return NO;
    }
    // The system-wide dispatch client used by TrollStore expects display-
    // integrated digitizer coordinates in the normalized 0...1 space.  The
    // previous logical-point change made otherwise valid events land outside
    // the accepted digitizer range, so the foreground app ignored them.
    const IOHIDFloat pointX = MIN(MAX(x / MAX(screenSize.width, 1.0), 0.0), 1.0);
    const IOHIDFloat pointY = MIN(MAX(y / MAX(screenSize.height, 1.0), 0.0), 1.0);
    const BOOL touching = phase != ATTouchPhaseUp;
    uint32_t parentMask = 0;
    uint32_t childMask = 0;
    if (phase == ATTouchPhaseDown || phase == ATTouchPhaseUp) {
        parentMask = ATDigitizerEventTouch | ATDigitizerEventIdentity;
        childMask = ATDigitizerEventTouch | ATDigitizerEventIdentity;
    } else if (phase == ATTouchPhaseMove) {
        parentMask = ATDigitizerEventPosition | ATDigitizerEventAttribute;
        childMask = ATDigitizerEventPosition | ATDigitizerEventAttribute;
    }

    const uint64_t timestamp = mach_absolute_time();
    IOHIDEventRef parent = _createDigitizerEvent(
        kCFAllocatorDefault,
        timestamp,
        ATDigitizerTransducerTypeHand,
        90.0,
        0,
        parentMask,
        0,
        0,
        0,
        0,
        0,
        0,
        false,
        touching,
        0
    );

    IOHIDEventRef finger = _createFingerEvent(
        kCFAllocatorDefault,
        timestamp,
        0,
        2,
        childMask,
        pointX,
        pointY,
        0,
        0,
        0,
        touching,
        touching,
        0
    );

    if (!parent || !finger) {
        if (finger) { CFRelease(finger); }
        if (parent) { CFRelease(parent); }
        self.diagnosticText = @"创建触摸事件失败。";
        return NO;
    }

    _setIntegerValue(parent, ATFieldIsBuiltIn, 1);
    _setIntegerValue(parent, ATFieldDigitizerEventMask, parentMask);
    _setFloatValue(parent, ATFieldDigitizerX, 0);
    _setFloatValue(parent, ATFieldDigitizerY, 0);
    _setIntegerValue(parent, ATFieldDigitizerIsDisplayIntegrated, 1);
    _setIntegerValue(parent, ATFieldDigitizerIsBuiltIn, 1);
    _setIntegerValue(parent, ATFieldDigitizerRange, 0);
    _setIntegerValue(parent, ATFieldDigitizerTouch, touching ? 1 : 0);
    _setIntegerValue(finger, ATFieldIsBuiltIn, 1);
    _setIntegerValue(finger, ATFieldDigitizerEventMask, childMask);
    _setIntegerValue(finger, ATFieldDigitizerRange, touching ? 1 : 0);
    _setIntegerValue(finger, ATFieldDigitizerTouch, touching ? 1 : 0);
    _setIntegerValue(finger, ATFieldDigitizerIsDisplayIntegrated, 1);
    _setIntegerValue(finger, ATFieldDigitizerIsBuiltIn, 1);
    _setFloatValue(finger, ATFieldDigitizerX, pointX);
    _setFloatValue(finger, ATFieldDigitizerY, pointY);
    _setFloatValue(finger, ATFieldDigitizerMajorRadius, touching ? 5.0 : 0.0);
    _setFloatValue(finger, ATFieldDigitizerMinorRadius, touching ? 5.0 : 0.0);
    _appendEvent(parent, finger, 0);
    _setSenderID(parent, ATDigitizerSenderID);
    _setSenderID(finger, ATDigitizerSenderID);
    if (ATSystemOverlayIsDeviceLocked()) {
        CFRelease(finger);
        CFRelease(parent);
        _touchActive = NO;
        return NO;
    }
    ATTouchDispatcherRegisterSyntheticTimestamp(timestamp);
    ATTouchDispatcherBeginSyntheticDispatch();
    _dispatchEvent(_systemClient, parent);
    ATTouchDispatcherEndSyntheticDispatch();

    CFRelease(finger);
    CFRelease(parent);
    _lastTouchX = x;
    _lastTouchY = y;
    _touchActive = touching;
    return YES;
    }
}

- (void)cancelActiveTouch {
    if (ATSystemOverlayIsDeviceLocked()) {
        @synchronized (self) { _touchActive = NO; }
        return;
    }
    CGFloat x = 0;
    CGFloat y = 0;
    @synchronized (self) {
        if (!_touchActive) { return; }
        x = _lastTouchX;
        y = _lastTouchY;
    }
    (void)[self sendAtX:x y:y phase:ATTouchPhaseUp];
}

- (void)suspendForDeviceLock {
    // This object owns only IOHID/CoreFoundation state. Tear it down on the
    // caller immediately; routing through a suspended UIKit main queue would
    // leave a live dispatch client attached to the lock-screen transition.
    @synchronized (self) {
        _touchActive = NO;
        _lastTouchX = 0;
        _lastTouchY = 0;
        if (_systemClient) {
            CFRelease(_systemClient);
            _systemClient = NULL;
        }
    }
}

- (BOOL)openApplicationWithBundleIdentifier:(NSString *)bundleIdentifier {
    if (bundleIdentifier.length == 0) { return NO; }
    Class workspaceClass = NSClassFromString(@"LSApplicationWorkspace");
    SEL defaultSelector = NSSelectorFromString(@"defaultWorkspace");
    SEL openSelector = NSSelectorFromString(@"openApplicationWithBundleID:");
    if (!workspaceClass || ![workspaceClass respondsToSelector:defaultSelector]) {
        self.diagnosticText = @"当前环境不能访问 LSApplicationWorkspace。";
        return NO;
    }

    id workspace = ((id (*)(id, SEL))objc_msgSend)((id)workspaceClass, defaultSelector);
    if (!workspace || ![workspace respondsToSelector:openSelector]) {
        self.diagnosticText = @"当前环境不能打开指定 Bundle ID。";
        return NO;
    }

    BOOL opened = ((BOOL (*)(id, SEL, id))objc_msgSend)(workspace, openSelector, bundleIdentifier);
    if (!opened) {
        self.diagnosticText = [NSString stringWithFormat:@"无法打开 %@，请检查 Bundle ID。", bundleIdentifier];
    }
    return opened;
}

@end
