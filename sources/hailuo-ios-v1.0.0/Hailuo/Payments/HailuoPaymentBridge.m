#import "HailuoPaymentBridge.h"
#if __has_include(<AlipaySDK/AlipaySDK.h>)
#import <AlipaySDK/AlipaySDK.h>
#define HAILUO_HAS_ALIPAY 1
#else
#define HAILUO_HAS_ALIPAY 0
#endif
#if __has_include(<WechatOpenSDK/WXApi.h>)
#import <WechatOpenSDK/WXApi.h>
#define HAILUO_HAS_WECHAT 1
#else
#define HAILUO_HAS_WECHAT 0
#endif

@interface HailuoPaymentBridge ()
#if HAILUO_HAS_WECHAT
<WXApiDelegate>
#endif
@property(nonatomic, copy, readwrite) NSString *lastMessage;
@property(nonatomic, copy) NSString *activeOrderID;
@end

@implementation HailuoPaymentBridge
+ (instancetype)shared {
    static HailuoPaymentBridge *instance;
    static dispatch_once_t once;
    dispatch_once(&once, ^{ instance = [HailuoPaymentBridge new]; instance.lastMessage = @""; });
    return instance;
}
+ (BOOL)sdkLinked { return HAILUO_HAS_ALIPAY || HAILUO_HAS_WECHAT; }
+ (NSString *)configuredWechatID { return [[NSBundle mainBundle] objectForInfoDictionaryKey:@"HailuoWechatAppID"] ?: @""; }
+ (NSString *)configuredUniversalLink { return [[NSBundle mainBundle] objectForInfoDictionaryKey:@"HailuoWechatUniversalLink"] ?: @""; }
+ (BOOL)canLaunchChannel:(NSString *)channel {
    if ([channel isEqualToString:@"alipay"]) return HAILUO_HAS_ALIPAY;
    if ([channel isEqualToString:@"wechat"]) {
        NSString *appid = [self configuredWechatID];
        NSURL *link = [NSURL URLWithString:[self configuredUniversalLink]];
        NSCharacterSet *invalid = [[NSCharacterSet alphanumericCharacterSet] invertedSet];
        return HAILUO_HAS_WECHAT && [appid hasPrefix:@"wx"] && appid.length > 2 && appid.length < 128 &&
            [appid rangeOfCharacterFromSet:invalid].location == NSNotFound &&
            [link.scheme isEqualToString:@"https"] && link.host.length > 0 &&
            link.user.length == 0 && link.password.length == 0 && link.fragment.length == 0;
    }
    return NO;
}
- (void)notifyOrder:(NSString *)orderID message:(NSString *)message {
    dispatch_async(dispatch_get_main_queue(), ^{
        [[NSNotificationCenter defaultCenter] postNotificationName:@"hailuo.paymentReturn" object:nil
            userInfo:@{ @"orderId": orderID ?: @"", @"message": message }];
    });
}
- (BOOL)launchChannel:(NSString *)channel data:(NSDictionary<NSString *,NSString *> *)data orderID:(NSString *)orderID {
    self.lastMessage = @"当前支付方式暂不可用";
    if (![[self class] canLaunchChannel:channel] || orderID.length == 0) return NO;
    self.activeOrderID = orderID;
#if HAILUO_HAS_ALIPAY
    if ([channel isEqualToString:@"alipay"]) {
        NSString *signedOrder = data[@"orderString"];
        if (signedOrder.length == 0 || signedOrder.length > 65536) { self.lastMessage = @"支付参数无效，请刷新订单后重试"; return NO; }
        [[AlipaySDK defaultService] payOrder:signedOrder fromScheme:@"hailuo-alipay" callback:^(NSDictionary *result) {
            NSString *hint = [[result[@"resultStatus"] description] isEqualToString:@"6001"]
                ? @"已取消支付，可稍后继续" : @"正在向服务器确认订单";
            [self notifyOrder:orderID message:hint];
        }];
        self.lastMessage = @"请在支付宝中完成支付，返回后将确认到账";
        return YES;
    }
#endif
#if HAILUO_HAS_WECHAT
    if ([channel isEqualToString:@"wechat"]) {
        if (![data[@"appId"] isEqualToString:[[self class] configuredWechatID]]) {
            self.lastMessage = @"支付应用配置不匹配，请联系管理员"; return NO;
        }
        if (![WXApi isWXAppInstalled]) { self.lastMessage = @"请先安装微信后再支付"; return NO; }
        for (NSString *key in @[@"partnerId", @"prepayId", @"packageValue", @"nonceStr", @"timeStamp", @"sign"]) {
            if (data[key].length == 0 || data[key].length > 4096) { self.lastMessage = @"支付参数无效，请刷新订单后重试"; return NO; }
        }
        NSScanner *scanner = [NSScanner scannerWithString:data[@"timeStamp"]];
        unsigned long long timestamp = 0;
        if (![scanner scanUnsignedLongLong:&timestamp] || !scanner.isAtEnd || timestamp > UINT32_MAX) {
            self.lastMessage = @"支付时间戳无效，请刷新订单后重试"; return NO;
        }
        if (![WXApi registerApp:data[@"appId"] universalLink:[[self class] configuredUniversalLink]]) {
            self.lastMessage = @"微信支付配置无效，请联系管理员"; return NO;
        }
        PayReq *request = [PayReq new];
        request.partnerId = data[@"partnerId"]; request.prepayId = data[@"prepayId"];
        request.package = data[@"packageValue"]; request.nonceStr = data[@"nonceStr"];
        request.timeStamp = (UInt32)timestamp; request.sign = data[@"sign"];
        [WXApi sendReq:request completion:^(BOOL success) {
            if (!success) [self notifyOrder:orderID message:@"未能打开微信支付，请稍后重试"];
        }];
        self.lastMessage = @"请在微信中完成支付，返回后将确认到账";
        return YES;
    }
#endif
    return NO;
}
- (BOOL)handleURL:(NSURL *)url {
    if ([url.scheme isEqualToString:@"hailuo-alipay"] && [url.host isEqualToString:@"safepay"] && self.activeOrderID.length > 0) {
#if HAILUO_HAS_ALIPAY
        NSString *orderID = self.activeOrderID;
        [[AlipaySDK defaultService] processOrderWithPaymentResult:url standbyCallback:^(NSDictionary *result) {
            [self notifyOrder:orderID message:[[result[@"resultStatus"] description] isEqualToString:@"6001"]
                ? @"已取消支付，可稍后继续" : @"正在向服务器确认订单"];
        }];
        return YES;
#endif
    }
#if HAILUO_HAS_WECHAT
    if ([url.scheme isEqualToString:[[self class] configuredWechatID]]) return [WXApi handleOpenURL:url delegate:self];
#endif
    return NO;
}
- (BOOL)handleUniversalLink:(NSUserActivity *)activity {
#if HAILUO_HAS_WECHAT
    NSURL *url = activity.webpageURL;
    NSURL *configured = [NSURL URLWithString:[[self class] configuredUniversalLink]];
    NSString *basePath = configured.path ?: @"/";
    NSString *pathPrefix = [basePath hasSuffix:@"/"] ? basePath : [basePath stringByAppendingString:@"/"];
    if ([activity.activityType isEqualToString:NSUserActivityTypeBrowsingWeb] &&
        [[self class] canLaunchChannel:@"wechat"] && [url.scheme isEqualToString:@"https"] &&
        [url.host.lowercaseString isEqualToString:configured.host.lowercaseString] &&
        [(url.port ?: @443) isEqualToNumber:(configured.port ?: @443)] &&
        url.user.length == 0 && url.password.length == 0 &&
        ([url.path isEqualToString:basePath] || [url.path hasPrefix:pathPrefix])) {
        return [WXApi handleOpenUniversalLink:activity delegate:self];
    }
#endif
    return NO;
}
#if HAILUO_HAS_WECHAT
- (void)onResp:(BaseResp *)response {
    if (![response isKindOfClass:[PayResp class]] || self.activeOrderID.length == 0) return;
    [self notifyOrder:self.activeOrderID message:response.errCode == -2
        ? @"已取消支付，可稍后继续" : @"正在向服务器确认订单"];
}
#endif
@end
