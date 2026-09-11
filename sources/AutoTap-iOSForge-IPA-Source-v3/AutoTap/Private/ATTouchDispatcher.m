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

static const uint32_t ATDigitizerTransducerTypeHand = 3;
static const uint32_t ATDigitizerEventRange = 1u << 0;
static const uint32_t ATDigitizerEventTouch = 1u << 1;
static const uint32_t ATDigitizerEventPosition = 1u << 2;
static const uint32_t ATFieldDigitizerMajorRadius = 0xB0014;
static const uint32_t ATFieldDigitizerMinorRadius = 0xB0015;
static const uint32_t ATFieldDigitizerIsDisplayIntegrated = 0xB0019;
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

    self.diagnosticText = @"HID 桥接已加载；事件是否生效仍取决于签名权限。";
}

- (BOOL)sendAtX:(CGFloat)x y:(CGFloat)y phase:(ATTouchPhase)phase {
    if (!_available || !_systemClient) {
        self.diagnosticText = @"HID 桥接不可用，请检查系统版本与签名权限。";
        return NO;
    }

    const BOOL touching = phase != ATTouchPhaseUp;
    uint32_t childMask = 0;
    if (phase == ATTouchPhaseMove) {
        childMask |= ATDigitizerEventPosition;
    } else {
        childMask |= ATDigitizerEventRange | ATDigitizerEventTouch;
    }

    const uint64_t timestamp = mach_absolute_time();
    IOHIDEventRef parent = _createDigitizerEvent(
        kCFAllocatorDefault,
        timestamp,
        ATDigitizerTransducerTypeHand,
        0,
        0,
        ATDigitizerEventTouch,
        0,
        0,
        0,
        0,
        0,
        0,
        false,
        true,
        0
    );

    IOHIDEventRef finger = _createFingerEvent(
        kCFAllocatorDefault,
        timestamp,
        1,
        3,
        childMask,
        (IOHIDFloat)x,
        (IOHIDFloat)y,
        0,
        touching ? 0.45 : 0,
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

    _setIntegerValue(parent, ATFieldDigitizerIsDisplayIntegrated, 1);
    _setIntegerValue(finger, ATFieldDigitizerIsDisplayIntegrated, 1);
    _setFloatValue(finger, ATFieldDigitizerMajorRadius, 5.0);
    _setFloatValue(finger, ATFieldDigitizerMinorRadius, 5.0);
    _appendEvent(parent, finger, 0);
    _setSenderID(parent, ATDigitizerSenderID);
    _dispatchEvent(_systemClient, parent);

    CFRelease(finger);
    CFRelease(parent);
    return YES;
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

