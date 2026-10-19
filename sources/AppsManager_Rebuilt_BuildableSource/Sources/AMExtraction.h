#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN
@interface AMExtraction : NSObject
/* Destination must be a new empty private directory. No target app is modified. */
+ (BOOL)extract:(NSURL *)archive toEmptyDirectory:(NSURL *)destination error:(NSError **)error;
+ (nullable NSData *)readEntry:(NSString *)name
                   fromArchive:(NSURL *)archive
                   maximumSize:(NSUInteger)maximum
                         error:(NSError **)error;
+ (BOOL)verifyArchive:(NSURL *)archive error:(NSError **)error;
@end
NS_ASSUME_NONNULL_END
