#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import <dlfcn.h>
#import "XKBootstrapDelegate.h"

static void XKUseBundledJavaScript(id self, SEL selector) {
    // The inherited launch method already sets main.jsbundle as jsCodeLocation.
    // Keep that URL; leave old sandbox updates and chat data untouched.
    (void)self;
    (void)selector;
}

static NSString *XKLoadRecoveredDelegate(void) {
    NSString *path = [NSBundle.mainBundle.privateFrameworksPath
        stringByAppendingPathComponent:@"XingkongRuntime.framework/XingkongRuntime"];
    void *handle = dlopen(path.fileSystemRepresentation, RTLD_NOW | RTLD_GLOBAL);
    if (handle == NULL) {
        const char *message = dlerror();
        XKBootstrapFailure = [NSString stringWithFormat:@"原生运行库加载失败：\n%s\n\n%@",
                              message ? message : "Unknown loader error", path];
        return NSStringFromClass(XKBootstrapDelegate.class);
    }
    Class original = NSClassFromString(@"AppDelegate");
    Method method = original ? class_getInstanceMethod(original, NSSelectorFromString(@"hvdown")) : NULL;
    const char *types = method ? method_getTypeEncoding(method) : NULL;
    if (original == Nil || method == NULL || types == NULL || types[0] != 'v' || method_getNumberOfArguments(method) != 2) {
        XKBootstrapFailure = @"原生 AppDelegate 或 hvdown 接口与恢复版本不匹配。\n请保留此画面和设备控制台日志。";
        return NSStringFromClass(XKBootstrapDelegate.class);
    }
    Class recovered = NSClassFromString(@"XKRecoveredAppDelegate");
    if (recovered == Nil) {
        recovered = objc_allocateClassPair(original, "XKRecoveredAppDelegate", 0);
        if (recovered == Nil || !class_addMethod(recovered, NSSelectorFromString(@"hvdown"),
                                                (IMP)XKUseBundledJavaScript, types)) {
            XKBootstrapFailure = @"无法创建维护版启动代理。请保留设备控制台日志。";
            return NSStringFromClass(XKBootstrapDelegate.class);
        }
        objc_registerClassPair(recovered);
    }
    return NSStringFromClass(recovered);
}

int main(int argc, char *argv[]) {
    @autoreleasepool {
        NSString *delegateClassName = XKLoadRecoveredDelegate();
        if (XKBootstrapFailure.length) NSLog(@"[XingkongRecovery] %@", XKBootstrapFailure);
        return UIApplicationMain(argc, argv, nil, delegateClassName);
    }
}
