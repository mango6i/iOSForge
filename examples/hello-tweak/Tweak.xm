#import <UIKit/UIKit.h>

%hook SpringBoard

- (void)applicationDidFinishLaunching:(id)application {
    %orig;
    NSLog(@"[iOSForge] Hello from a user-owned iOS 15+ tweak project");
}

%end
