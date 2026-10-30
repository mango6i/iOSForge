#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN
// The bridge calls provider SDKs only. It never grants shells/VIP locally.
__attribute__((swift_attr("@MainActor")))
@interface HailuoPaymentBridge : NSObject
@property(class, nonatomic, readonly) HailuoPaymentBridge *shared;
@property(class, nonatomic, readonly) BOOL sdkLinked;
@property(nonatomic, copy, readonly) NSString *lastMessage;
+ (BOOL)canLaunchChannel:(NSString *)channel NS_SWIFT_NAME(canLaunch(channel:));
- (BOOL)launchChannel:(NSString *)channel data:(NSDictionary<NSString *, NSString *> *)data orderID:(NSString *)orderID NS_SWIFT_NAME(launch(channel:data:orderID:));
- (BOOL)handleURL:(NSURL *)url NS_SWIFT_NAME(handle(url:));
- (BOOL)handleUniversalLink:(NSUserActivity *)activity NS_SWIFT_NAME(handle(activity:));
@end
NS_ASSUME_NONNULL_END
