#import "XKBootstrapDelegate.h"

NSString *XKBootstrapFailure = nil;

@implementation XKBootstrapDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    (void)application;
    (void)launchOptions;
    UIViewController *controller = [UIViewController new];
    controller.view.backgroundColor = UIColor.systemBackgroundColor;
    UITextView *message = [[UITextView alloc] initWithFrame:CGRectZero];
    message.translatesAutoresizingMaskIntoConstraints = NO;
    message.editable = NO;
    message.selectable = YES;
    message.font = [UIFont monospacedSystemFontOfSize:14 weight:UIFontWeightRegular];
    message.text = [NSString stringWithFormat:@"星空恢复工程 · 启动诊断\n\n%@\n\n"
                    @"此界面表示原生运行库尚未正常启动。\n"
                    @"请保存完整错误信息，以及 iOS 版本、设备型号、签名方式和编译日志。",
                    XKBootstrapFailure ?: @"Unknown bootstrap failure"];
    [controller.view addSubview:message];
    UILayoutGuide *safe = controller.view.safeAreaLayoutGuide;
    [NSLayoutConstraint activateConstraints:@[
        [message.leadingAnchor constraintEqualToAnchor:safe.leadingAnchor constant:16],
        [message.trailingAnchor constraintEqualToAnchor:safe.trailingAnchor constant:-16],
        [message.topAnchor constraintEqualToAnchor:safe.topAnchor constant:16],
        [message.bottomAnchor constraintEqualToAnchor:safe.bottomAnchor constant:-16]
    ]];
    self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
    self.window.rootViewController = controller;
    [self.window makeKeyAndVisible];
    return YES;
}
@end
