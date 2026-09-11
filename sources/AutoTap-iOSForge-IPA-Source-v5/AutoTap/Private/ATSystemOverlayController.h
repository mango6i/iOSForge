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

- (BOOL)showWithPoints:(NSArray<NSValue *> *)points
              multiple:(BOOL)multiple
          selectedIndex:(NSInteger)selectedIndex
            activeIndex:(NSInteger)activeIndex
            markerScale:(CGFloat)markerScale
           controlScale:(CGFloat)controlScale
                running:(BOOL)running NS_SWIFT_NAME(show(points:multiple:selectedIndex:activeIndex:markerScale:controlScale:running:));

- (void)updateWithPoints:(NSArray<NSValue *> *)points
                multiple:(BOOL)multiple
            selectedIndex:(NSInteger)selectedIndex
              activeIndex:(NSInteger)activeIndex
              markerScale:(CGFloat)markerScale
             controlScale:(CGFloat)controlScale
                  running:(BOOL)running NS_SWIFT_NAME(update(points:multiple:selectedIndex:activeIndex:markerScale:controlScale:running:));

- (void)hide;

@end

NS_ASSUME_NONNULL_END
