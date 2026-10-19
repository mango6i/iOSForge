#import "AMModels.h"
NS_ASSUME_NONNULL_BEGIN
@interface AMOperations : NSObject
+ (nullable NSDictionary *)infoForArchive:(NSURL *)archive error:(NSError **)error;
+ (nullable NSURL *)importArchive:(NSURL *)archive error:(NSError **)error;
+ (BOOL)restoreArchive:(NSURL *)archive
           application:(AMApplication *)application
              progress:(void (^)(NSString *message))progress
                 error:(NSError **)error;
+ (BOOL)wipeApplication:(AMApplication *)application
               progress:(void (^)(NSString *message))progress
                  error:(NSError **)error;
+ (NSURL *)recoveryDirectory;
+ (BOOL)hasPendingRecovery;
+ (BOOL)recoverJournal:(NSURL *)journal
           application:(AMApplication *)application
                 error:(NSError **)error;
@end
NS_ASSUME_NONNULL_END
