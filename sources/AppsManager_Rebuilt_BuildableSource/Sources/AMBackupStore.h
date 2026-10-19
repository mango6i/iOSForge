#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN
@interface AMBackupStore : NSObject
+ (NSURL *)retainedDirectory;
+ (NSArray<NSURL *> *)retainedArchives;
+ (BOOL)isOwnedActiveArchive:(NSURL *)archive;
+ (BOOL)retire:(NSURL *)archive error:(NSError **)error;
+ (BOOL)reactivate:(NSURL *)archive error:(NSError **)error;
+ (BOOL)rename:(NSURL *)archive filename:(NSString *)filename error:(NSError **)error;
+ (BOOL)applyRetentionForApplication:(NSString *)identifier
                       keepingNewest:(NSURL *)newest
                               error:(NSError **)error;
@end
NS_ASSUME_NONNULL_END
