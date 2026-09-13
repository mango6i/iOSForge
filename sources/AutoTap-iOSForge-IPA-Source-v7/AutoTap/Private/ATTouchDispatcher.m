#import "ATTouchDispatcher.h"

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
typedef IOHIDEventSystemClientRef (*ATCreateSystemClientFn)(CFAllocatorRef);
typedef void (*ATDispatchEventFn)(IOHIDEventSystemClientRef, IOHIDEventRef);
typedef CFTypeRef (*ATSecTaskCreateFromSelfFn)(CFAllocatorRef);
typedef CFTypeRef (*ATSecTaskCopyValueForEntitlementFn)(CFTypeRef, CFStringRef, CFErrorRef *);

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
static const uint64_t ATDigitizerSenderID = 0xDEFACEDBEEFFECE5ULL;

@interface ATTouchDispatcher ()
@property (nonatomic, copy, readwrite) NSString *diagnosticText;
@end

@implementation ATTouchDispatcher {
    void *_ioKitHandle;
    ATCreateDigitizerEventFn _createDigitizerEvent;
    ATCreateFingerEventFn _createFingerEvent;
    ATAppendEventFn _appendEvent;
    ATSetIntegerValueFn _setIntegerValue;
    ATSetFloatValueFn _setFloatValue;
    ATSetSenderIDFn _setSenderID;
    ATCreateSystemClientFn _createSystemClient;
    ATDispatchEventFn _dispatchEvent;
    IOHIDEventSystemClientRef _systemClient;
    BOOL _available;
    BOOL _touchActive;
    CGFloat _lastTouchX;
    CGFloat _lastTouchY;
}

+ (instancetype)shared {
    static ATTouchDispatcher *dispatcher;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        dispatcher = [[self alloc] initPrivate];
    });
    return dispatcher;
}

- (instancetype)init {
    return [ATTouchDispatcher shared];
}

- (instancetype)initPrivate {
    self = [super init];
    if (self) {
        [self loadPrivateSymbols];
    }
    return self;
}

- (BOOL)isAvailable {
    return _available;
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
    @synchronized (self) {
    if (!_available || !_systemClient) {
        self.diagnosticText = @"HID 桥接不可用，请检查系统版本与签名权限。";
        return NO;
    }

    CGSize screenSize = UIScreen.mainScreen.bounds.size;
    const IOHIDFloat normalizedX = MIN(MAX(x / MAX(screenSize.width, 1.0), 0.0), 1.0);
    const IOHIDFloat normalizedY = MIN(MAX(y / MAX(screenSize.height, 1.0), 0.0), 1.0);
    const BOOL touching = phase != ATTouchPhaseUp;
    const uint32_t parentMask = phase == ATTouchPhaseMove
        ? ATDigitizerEventPosition
        : (ATDigitizerEventRange | ATDigitizerEventTouch | ATDigitizerEventIdentity |
           (phase == ATTouchPhaseUp ? ATDigitizerEventPosition : 0));
    const uint32_t childMask = phase == ATTouchPhaseMove
        ? ATDigitizerEventPosition
        : (ATDigitizerEventRange | ATDigitizerEventTouch);

    const uint64_t timestamp = mach_absolute_time();
    IOHIDEventRef parent = _createDigitizerEvent(
        kCFAllocatorDefault,
        timestamp,
        ATDigitizerTransducerTypeHand,
        1u << 22,
        1,
        parentMask,
        0,
        normalizedX,
        normalizedY,
        0,
        0,
        0,
        false,
        false,
        0
    );

    IOHIDEventRef finger = _createFingerEvent(
        kCFAllocatorDefault,
        timestamp,
        3,
        2,
        childMask,
        normalizedX,
        normalizedY,
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
    _setFloatValue(parent, ATFieldDigitizerX, normalizedX);
    _setFloatValue(parent, ATFieldDigitizerY, normalizedY);
    _setIntegerValue(parent, ATFieldDigitizerIsDisplayIntegrated, 1);
    _setIntegerValue(parent, ATFieldDigitizerIsBuiltIn, 1);
    _setIntegerValue(parent, ATFieldDigitizerRange, 0);
    _setIntegerValue(parent, ATFieldDigitizerTouch, 0);
    _setIntegerValue(finger, ATFieldIsBuiltIn, 1);
    _setIntegerValue(finger, ATFieldDigitizerEventMask, childMask);
    _setIntegerValue(finger, ATFieldDigitizerRange, touching ? 1 : 0);
    _setIntegerValue(finger, ATFieldDigitizerTouch, touching ? 1 : 0);
    _setIntegerValue(finger, ATFieldDigitizerIsDisplayIntegrated, 1);
    _setIntegerValue(finger, ATFieldDigitizerIsBuiltIn, 1);
    _setFloatValue(finger, ATFieldDigitizerMajorRadius, 0.04);
    _setFloatValue(finger, ATFieldDigitizerMinorRadius, 0.04);
    _appendEvent(parent, finger, 0);
    _setSenderID(parent, ATDigitizerSenderID);
    _setSenderID(finger, ATDigitizerSenderID);
    _dispatchEvent(_systemClient, parent);

    CFRelease(finger);
    CFRelease(parent);
    _lastTouchX = x;
    _lastTouchY = y;
    _touchActive = touching;
    return YES;
    }
}

- (void)cancelActiveTouch {
    CGFloat x = 0;
    CGFloat y = 0;
    @synchronized (self) {
        if (!_touchActive) { return; }
        x = _lastTouchX;
        y = _lastTouchY;
    }
    (void)[self sendAtX:x y:y phase:ATTouchPhaseUp];
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
