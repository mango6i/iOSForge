#import "AMModels.h"
NS_ASSUME_NONNULL_BEGIN
@interface AMBackup : NSObject
+ (NSURL *)directory;
+ (BOOL)backup:(AMApplication *)application
    includeKeychain:(BOOL)includeKeychain
           progress:(void (^)(NSString *message))progress
              error:(NSError **)error;
+ (NSArray<NSURL *> *)archives;
@end
NS_ASSUME_NONNULL_END
