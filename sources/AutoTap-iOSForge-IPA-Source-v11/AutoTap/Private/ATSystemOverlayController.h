#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface ATSystemOverlayController : NSObject

+ (instancetype)shared NS_SWIFT_NAME(shared());

@property (nonatomic, readonly, getter=isAvailable) BOOL available;
@property (nonatomic, readonly, getter=isVisible) BOOL visible;
@property (nonatomic, copy, readonly) NSString *diagnosticText;

@property (nonatomic, copy, nullable) void (^toggleRunHandler)(void);
@property (nonatomic, copy, nullable) void (^closeHandler)(void);
@property (nonatomic, copy, nullable) void (^settingsHandler)(void);
@property (nonatomic, copy, nullable) void (^addHandler)(void);
@property (nonatomic, copy, nullable) void (^deleteHandler)(void);
@property (nonatomic, copy, nullable) void (^selectHandler)(NSInteger index);
@property (nonatomic, copy, nullable) void (^moveHandler)(NSInteger index, CGFloat normalizedX, CGFloat normalizedY);
@property (nonatomic, copy, nullable) void (^saveActionHandler)(NSInteger index, NSInteger intervalValue, NSInteger unitIndex, NSInteger durationMilliseconds, NSInteger repeatCount);

- (BOOL)showWithPoints:(NSArray<NSValue *> *)points
         actionSettings:(NSArray<NSDictionary<NSString *, NSNumber *> *> *)actionSettings
              multiple:(BOOL)multiple
          selectedIndex:(NSInteger)selectedIndex
            activeIndex:(NSInteger)activeIndex
            markerScale:(CGFloat)markerScale
           controlScale:(CGFloat)controlScale
                running:(BOOL)running
       countdownSeconds:(NSInteger)countdownSeconds NS_SWIFT_NAME(show(points:actionSettings:multiple:selectedIndex:activeIndex:markerScale:controlScale:running:countdownSeconds:));

- (void)updateWithPoints:(NSArray<NSValue *> *)points
          actionSettings:(NSArray<NSDictionary<NSString *, NSNumber *> *> *)actionSettings
                multiple:(BOOL)multiple
            selectedIndex:(NSInteger)selectedIndex
              activeIndex:(NSInteger)activeIndex
              markerScale:(CGFloat)markerScale
             controlScale:(CGFloat)controlScale
                  running:(BOOL)running
         countdownSeconds:(NSInteger)countdownSeconds NS_SWIFT_NAME(update(points:actionSettings:multiple:selectedIndex:activeIndex:markerScale:controlScale:running:countdownSeconds:));

- (void)hide;

@end

NS_ASSUME_NONNULL_END
