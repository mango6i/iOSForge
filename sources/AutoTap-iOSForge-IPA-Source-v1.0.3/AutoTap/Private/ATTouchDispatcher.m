#import "ATTouchDispatcher.h"
#import "ATSystemOverlayController.h"

#import <UIKit/UIKit.h>
#import <dlfcn.h>
#import <mach/mach_time.h>
#import <objc/message.h>
#import <os/lock.h>
#import <stdatomic.h>
#import <unistd.h>
#import <math.h>

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

static os_unfair_lock ATSyntheticTimestampLock = OS_UNFAIR_LOCK_INIT;
static uint64_t ATSyntheticTimestamps[512];
static NSUInteger ATSyntheticTimestampIndex = 0;
static atomic_uint ATSyntheticDispatchDepth = 0;

static void ATTouchDispatcherBeginSyntheticDispatch(void) {
    atomic_fetch_add_explicit(&ATSyntheticDispatchDepth, 1, memory_order_acq_rel);
}

static void ATTouchDispatcherEndSyntheticDispatch(void) {
    atomic_fetch_sub_explicit(&ATSyntheticDispatchDepth, 1, memory_order_acq_rel);
}

BOOL ATTouchDispatcherIsSyntheticDispatchInProgress(void) {
    return atomic_load_explicit(&ATSyntheticDispatchDepth, memory_order_acquire) > 0;
}

void ATTouchDispatcherRegisterSyntheticTimestamp(uint64_t timestamp) {
    os_unfair_lock_lock(&ATSyntheticTimestampLock);
    ATSyntheticTimestamps[ATSyntheticTimestampIndex++ % 512] = timestamp;
    os_unfair_lock_unlock(&ATSyntheticTimestampLock);
}

BOOL ATTouchDispatcherIsSyntheticTimestamp(uint64_t timestamp) {
    if (timestamp == 0 || !os_unfair_lock_trylock(&ATSyntheticTimestampLock)) { return NO; }
    BOOL found = NO;
    for (NSUInteger index = 0; index < 512; index++) {
        if (ATSyntheticTimestamps[index] == timestamp) { found = YES; break; }
    }
    os_unfair_lock_unlock(&ATSyntheticTimestampLock);
    return found;
}

@interface ATTouchDispatcher ()
@property (nonatomic, copy, readwrite) NSString *diagnosticText;
- (BOOL)sendAtX:(CGFloat)x
               y:(CGFloat)y
           phase:(ATTouchPhase)phase
allowWhileLocked:(BOOL)allowWhileLocked;
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
    uint64_t _lastDispatchTime;
    os_unfair_lock _screenSizeLock;
    dispatch_queue_t _cleanupQueue;
    dispatch_queue_t _powerQueue;
    atomic_bool _lockCleanupPending;
    atomic_uint _pendingTouchCancellations;
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
    // Script state and worker queues are independent per mode, but the private
    // IOHID event-dispatch connection is a process-wide hardware transport.
    // Creating one client per mode left four privileged clients registered even
    // while three modes were idle, which made SpringBoard lock transitions
    // unreliable. All engines serialize through the shared dispatcher's
    // synchronized send methods, so sharing the transport cannot mix scripts.
    return [self shared];
}

- (instancetype)init {
    return [ATTouchDispatcher shared];
}

- (instancetype)initPrivate {
    self = [super init];
    if (self) {
        _screenSizeLock = OS_UNFAIR_LOCK_INIT;
        atomic_init(&_lockCleanupPending, false);
        atomic_init(&_pendingTouchCancellations, 0);
        _cleanupQueue = dispatch_queue_create("com.local.autotap.hid-cleanup", DISPATCH_QUEUE_SERIAL);
        _powerQueue = dispatch_queue_create("com.local.autotap.power", DISPATCH_QUEUE_SERIAL);
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
    if (atomic_load_explicit(&_lockCleanupPending, memory_order_acquire) ||
        atomic_load_explicit(&_pendingTouchCancellations, memory_order_acquire) != 0) {
        self.diagnosticText = @"输入通道正在释放触点，请稍后再点继续。";
        return NO;
    }
    // IOHID dispatch has no UIKit affinity. Never synchronously hop to the main
    // queue from an automation worker: that queue may be suspended while iOS is
    // locking the device. Main-thread callers refresh the cached geometry;
    // workers safely reuse it.
    if (NSThread.isMainThread) {
        CGSize size = UIScreen.mainScreen.bounds.size;
        os_unfair_lock_lock(&_screenSizeLock);
        _screenSize = size;
        os_unfair_lock_unlock(&_screenSizeLock);
        // Client creation/prewarming may synchronously enter BackBoard. Keep
        // it off UIKit; the engine also prepares immediately before its DOWN.
        dispatch_async(_cleanupQueue, ^{ (void)[self prepareForDispatch]; });
        return _available;
    }
    @synchronized (self) {
        if (ATSystemOverlayIsDeviceLocked() || atomic_load_explicit(&_lockCleanupPending, memory_order_acquire)) {
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
    dispatch_async(_powerQueue, ^{ [self applyDisplaySleepPreventionEnabled:enabled && !ATSystemOverlayIsDeviceLocked()]; });
    return _createPowerAssertion != NULL;
}

- (void)applyDisplaySleepPreventionEnabled:(BOOL)enabled {
        if (!enabled) {
            if (_displaySleepAssertionID != 0 && _releasePowerAssertion) {
                _releasePowerAssertion(_displaySleepAssertionID);
            }
            _displaySleepAssertionID = 0;
            return;
        }
        if (_displaySleepAssertionID != 0) { return; }
        if (!_createPowerAssertion) { return; }

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
            return;
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
    return [self sendAtX:x y:y phase:phase allowWhileLocked:NO];
}

- (BOOL)sendAtX:(CGFloat)x
               y:(CGFloat)y
           phase:(ATTouchPhase)phase
allowWhileLocked:(BOOL)allowWhileLocked {
    // Construct and dispatch directly on the calling engine's serial queue.
    // Waiting for UIKit's main queue here can deadlock the system input path
    // during lock; IOHIDEventSystemClient itself does not require UIKit.
    if (!allowWhileLocked && (ATSystemOverlayIsDeviceLocked() || atomic_load_explicit(&_lockCleanupPending, memory_order_acquire))) { return NO; }
    @synchronized (self) {
    if (!allowWhileLocked && (ATSystemOverlayIsDeviceLocked() || atomic_load_explicit(&_lockCleanupPending, memory_order_acquire))) { return NO; }
    // UIKit callers must never wait on synchronous private transport IPC.
    if (NSThread.isMainThread) { return NO; }
    if (!_systemClient && !allowWhileLocked && ![self prepareForDispatch]) { return NO; }
    if (!_available || !_systemClient) {
        self.diagnosticText = @"HID 桥接不可用，请检查系统版本与签名权限。";
        return NO;
    }
    // A 1ms profile otherwise floods BackBoard with ~1000 DOWN/UP frames per
    // second. Bound the hardware stream to 240 frames/s (up to 120 taps/s).
    // This pacing is only on workers; lock/cancel UP bypasses it immediately.
    if (!allowWhileLocked && _lastDispatchTime != 0) {
        mach_timebase_info_data_t timebase;
        mach_timebase_info(&timebase);
        uint64_t now = mach_absolute_time();
        double elapsed = (double)(now - _lastDispatchTime) * timebase.numer / timebase.denom / 1e9;
        double remaining = 1.0 / 240.0 - elapsed;
        if (remaining > 0) { usleep((useconds_t)ceil(remaining * 1e6)); }
        if (ATSystemOverlayIsDeviceLocked()) { return NO; }
    }

    os_unfair_lock_lock(&_screenSizeLock);
    CGSize screenSize = _screenSize;
    os_unfair_lock_unlock(&_screenSizeLock);
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
    if (!allowWhileLocked && ATSystemOverlayIsDeviceLocked()) {
        CFRelease(finger);
        CFRelease(parent);
        // Preserve the pending UP obligation if a DOWN was already sent.
        return NO;
    }
    ATTouchDispatcherRegisterSyntheticTimestamp(timestamp);
    ATTouchDispatcherBeginSyntheticDispatch();
    _dispatchEvent(_systemClient, parent);
    _lastDispatchTime = mach_absolute_time();
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
    // Pause/close/lock callbacks may be on main. They never wait on a worker
    // that is dispatching into BackBoard. Serialize UP with client teardown.
    void (^releaseTouch)(void) = ^{
        @synchronized (self) {
            if (self->_touchActive && self->_systemClient) {
                (void)[self sendAtX:self->_lastTouchX y:self->_lastTouchY
                             phase:ATTouchPhaseUp allowWhileLocked:YES];
            }
        }
    };
    // A worker releases its interrupted gesture in order. Only UIKit needs
    // the asynchronous path; queuing an old worker cancel could lift a new
    // gesture after an immediate resume.
    if (!NSThread.isMainThread) { releaseTouch(); return; }
    atomic_fetch_add_explicit(&_pendingTouchCancellations, 1, memory_order_acq_rel);
    dispatch_async(_cleanupQueue, ^{
        releaseTouch();
        atomic_fetch_sub_explicit(&self->_pendingTouchCancellations, 1, memory_order_acq_rel);
    });
}

- (void)afterPendingTouchCleanup:(void (^)(void))completion {
    dispatch_async(_cleanupQueue, ^{
        if (completion) { dispatch_async(dispatch_get_main_queue(), completion); }
    });
}

- (void)suspendForDeviceLock {
    ATSystemOverlaySetDeviceLocked(YES);
    if (atomic_exchange_explicit(&_lockCleanupPending, true, memory_order_acq_rel)) { return; }
    (void)[self setDisplaySleepPreventionEnabled:NO];
    dispatch_async(_cleanupQueue, ^{
    @synchronized (self) {
        // Always release an accepted DOWN, including a lock racing its UP.
        if (self->_touchActive && self->_systemClient) {
            (void)[self sendAtX:self->_lastTouchX y:self->_lastTouchY
                         phase:ATTouchPhaseUp allowWhileLocked:YES];
        }
        self->_touchActive = NO;
        self->_lastTouchX = 0;
        self->_lastTouchY = 0;
        if (self->_systemClient) {
            CFRelease(self->_systemClient);
            self->_systemClient = NULL;
        }
    }
    atomic_store_explicit(&self->_lockCleanupPending, false, memory_order_release);
    });
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
