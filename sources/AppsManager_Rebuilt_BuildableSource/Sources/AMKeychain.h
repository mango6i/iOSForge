#import "AMModels.h"
NS_ASSUME_NONNULL_BEGIN
@interface AMKeychain : NSObject
/* Requires an executable fastPathSign from installed original AppsManager,
 * or an available jailbreak ldid. No binary injection is performed. */
+ (BOOL)backupApplication:(AMApplication *)application
                   output:(NSURL *)output
                    error:(NSError **)error;
+ (BOOL)operate:(NSString *)command
    application:(AMApplication *)application
          input:(nullable NSURL *)input
        mapping:(nullable NSDictionary *)mapping
         output:(NSURL *)output
          error:(NSError **)error;
+ (NSString *)signerDescription;
@end
NS_ASSUME_NONNULL_END
