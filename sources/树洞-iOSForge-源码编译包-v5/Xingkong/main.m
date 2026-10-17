#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import <objc/message.h>
#import <dlfcn.h>
#import "XKBootstrapDelegate.h"

static void XKUseBundledJavaScript(id self, SEL selector) {
    // Pin the launch URL on the original delegate, including later native reloads.
    // Sandbox updates and account/chat data remain untouched.
    NSURL *url = [NSBundle.mainBundle URLForResource:@"main" withExtension:@"jsbundle"];
    ((void (*)(id, SEL, NSURL *))objc_msgSend)(self, NSSelectorFromString(@"setJsCodeLocation:"), url);
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
    if (![NSBundle.mainBundle URLForResource:@"main" withExtension:@"jsbundle"] ||
        !class_getInstanceMethod(original, NSSelectorFromString(@"setJsCodeLocation:"))) {
        XKBootstrapFailure = @"随包界面文件或原生启动接口缺失。";
        return NSStringFromClass(XKBootstrapDelegate.class);
    }
    method_setImplementation(method, (IMP)XKUseBundledJavaScript);
    return NSStringFromClass(original);
}

int main(int argc, char *argv[]) {
    @autoreleasepool {
        NSString *delegateClassName = XKLoadRecoveredDelegate();
        if (XKBootstrapFailure.length) NSLog(@"[XingkongRecovery] %@", XKBootstrapFailure);
        return UIApplicationMain(argc, argv, nil, delegateClassName);
    }
}
