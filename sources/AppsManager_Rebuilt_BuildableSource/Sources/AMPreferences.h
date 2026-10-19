#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN
@interface AMPreferences : NSObject
+ (nullable NSDictionary *)readDomain:(NSString *)domain
                            container:(NSURL *)container
                                error:(NSError **)error;
+ (BOOL)writeDomain:(NSString *)domain
          container:(NSURL *)container
             values:(NSDictionary *)values
              error:(NSError **)error;
@end
NS_ASSUME_NONNULL_END
