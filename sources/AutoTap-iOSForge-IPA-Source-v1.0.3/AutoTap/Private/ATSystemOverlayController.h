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
@property (nonatomic, copy, nullable) void (^recordTapHandler)(CGFloat normalizedX, CGFloat normalizedY, NSInteger intervalMilliseconds, NSInteger durationMilliseconds);
@property (nonatomic, copy, nullable) void (^recordSwipeHandler)(CGFloat startX, CGFloat startY, CGFloat endX, CGFloat endY, NSInteger intervalMilliseconds, NSInteger durationMilliseconds);
@property (nonatomic, copy, nullable) void (^startRecordingHandler)(void);
@property (nonatomic, copy, nullable) void (^finishRecordingHandler)(void);

- (BOOL)showWithPoints:(NSArray<NSValue *> *)points
         actionSettings:(NSArray<NSDictionary<NSString *, NSNumber *> *> *)actionSettings
              multiple:(BOOL)multiple
          selectedIndex:(NSInteger)selectedIndex
            activeIndex:(NSInteger)activeIndex
            markerScale:(CGFloat)markerScale
           controlScale:(CGFloat)controlScale
         editingEnabled:(BOOL)editingEnabled
                running:(BOOL)running
                 paused:(BOOL)paused
       countdownSeconds:(NSInteger)countdownSeconds NS_SWIFT_NAME(show(points:actionSettings:multiple:selectedIndex:activeIndex:markerScale:controlScale:editingEnabled:running:paused:countdownSeconds:));

- (void)updateWithPoints:(NSArray<NSValue *> *)points
          actionSettings:(NSArray<NSDictionary<NSString *, NSNumber *> *> *)actionSettings
                multiple:(BOOL)multiple
            selectedIndex:(NSInteger)selectedIndex
              activeIndex:(NSInteger)activeIndex
              markerScale:(CGFloat)markerScale
             controlScale:(CGFloat)controlScale
           editingEnabled:(BOOL)editingEnabled
                  running:(BOOL)running
                   paused:(BOOL)paused
         countdownSeconds:(NSInteger)countdownSeconds NS_SWIFT_NAME(update(points:actionSettings:multiple:selectedIndex:activeIndex:markerScale:controlScale:editingEnabled:running:paused:countdownSeconds:));

- (void)hide;

/// Temporarily makes the existing hosted HUD transparent and non-interactive
/// without destroying its WindowServer context. Used while editing settings in
/// AutoTap so restoring the HUD cannot leave a stale duplicate context behind.
- (void)setEditingSuppressed:(BOOL)suppressed NS_SWIFT_NAME(setEditingSuppressed(_:));

/// Enables passive recording. Touches outside the floating toolbar continue
/// to the foreground application and completed taps are reported as normalized
/// coordinates with their captured timing.
- (void)setRecordingEnabled:(BOOL)enabled NS_SWIFT_NAME(setRecordingEnabled(_:));

/// Selects whether an active recording session captures both taps and swipes.
/// Tap recording leaves this disabled so an accidental drag is never saved as
/// a numbered click.
- (void)setRecordingCapturesGestures:(BOOL)enabled NS_SWIFT_NAME(setRecordingCapturesGestures(_:));

/// Switches the already-open recording HUD between its armed state and active
/// capture. Opening the mode itself never begins recording until the red record
/// control is pressed.
- (void)setRecordingActive:(BOOL)active NS_SWIFT_NAME(setRecordingActive(_:));

/// Presents a short, non-interactive confirmation in the cross-process HUD.
- (void)showCompletionMessage:(NSString *)message NS_SWIFT_NAME(showCompletionMessage(_:));

@end

NS_ASSUME_NONNULL_END
