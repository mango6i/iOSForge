// Xcode link bootstrap only. BuildSupport/assemble_app.py replaces this
// executable with the preserved original Swift runtime and applies the
// maintenance patch. This file is not the recovered App implementation.
#ifndef IPLAYER_RUNTIME_ASSEMBLY
#error "Bootstrap is not the iPlayer app. Use iPlayer.xcodeproj or build_ipa.py; this builder omitted the runtime assembly phase."
#endif
#import <UIKit/UIKit.h>

@interface MaintenanceBootstrapDelegate : UIResponder <UIApplicationDelegate>
@property (strong, nonatomic) UIWindow *window;
@end
@implementation MaintenanceBootstrapDelegate
- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    return YES;
}
@end

int main(int argc, char *argv[]) {
    @autoreleasepool {
        return UIApplicationMain(argc, argv, nil,
            NSStringFromClass([MaintenanceBootstrapDelegate class]));
    }
}
