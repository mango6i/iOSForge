#import <UIKit/UIKit.h>
NS_ASSUME_NONNULL_BEGIN
id _Nullable AMRead(id _Nullable object, NSString *key);
NSError *AMError(NSInteger code, NSString *description);
@interface AMApplication : NSObject
@property(nonatomic, copy) NSString *identifier;
@property(nonatomic, copy) NSString *name;
@property(nonatomic, strong) id proxy;
@property(nonatomic, strong, nullable) NSURL *dataURL;
@property(nonatomic, copy) NSDictionary<NSString *, NSURL *> *groupURLs;
@property(nonatomic, copy) NSDictionary<NSString *, NSURL *> *extensionURLs;
@property(nonatomic, copy) NSDictionary *entitlements;
@property(nonatomic, copy) NSArray<NSString *> *keychainGroups;
@property(nonatomic, strong, nullable) NSError *containerResolutionError;
@property(nonatomic, strong, nullable) NSError *keychainResolutionError;
@property(nonatomic) unsigned long long dataBytes;
@property(nonatomic) unsigned long long codeBytes;
@property(nonatomic) BOOL systemApplication;
- (UIImage *)icon;
@end
@interface AMApplicationRegistry : NSObject
+ (NSArray<AMApplication *> *_Nullable)applicationsWithError:(NSError **)error;
+ (NSURL *_Nullable)originalSignerURL;
@end
NS_ASSUME_NONNULL_END
