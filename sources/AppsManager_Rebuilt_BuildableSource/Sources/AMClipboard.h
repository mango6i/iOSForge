#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN
@interface AMClipboard : NSObject
+ (nullable NSArray<NSURL *> *)directoriesForTeam:(NSString *)team error:(NSError **)error;
@end
NS_ASSUME_NONNULL_END
