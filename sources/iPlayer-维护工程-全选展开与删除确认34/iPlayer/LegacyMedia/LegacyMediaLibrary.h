// Newly written, read-only compatibility discovery for old and current media.
#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN
@interface LMItem : NSObject
@property(nonatomic,strong) NSURL *URL;
@property(nonatomic,copy) NSString *name;
@property(nonatomic,strong) NSDate *modifiedDate;
@property(nonatomic) unsigned long long byteSize;
@property(nonatomic) BOOL video;
@end
@interface LMGroup : NSObject
@property(nonatomic,copy) NSString *identifier;
@property(nonatomic,copy) NSString *title;
@property(nonatomic,copy) NSString *platform;
@property(nonatomic,strong) NSArray<LMItem *> *items;
@end
@interface LMLibrary : NSObject
+ (NSArray<LMGroup *> *)groupsForVideo:(BOOL)video roots:(NSArray<NSURL *> *)roots;
@end
NS_ASSUME_NONNULL_END
