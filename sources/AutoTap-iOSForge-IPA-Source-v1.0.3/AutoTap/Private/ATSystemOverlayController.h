#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// Fast process-wide lock gate used directly from the Darwin notification
/// callback. HID filters read it before synchronizing with UIKit's main queue.
FOUNDATION_EXPORT void ATSystemOverlaySetDeviceLocked(BOOL locked);
FOUNDATION_EXPORT BOOL ATSystemOverlayIsDeviceLocked(void);

@interface ATSystemOverlayController : NSObject

+ (instancetype)shared NS_SWIFT_NAME(shared());
+ (instancetype)controllerForModule:(NSString *)module NS_SWIFT_NAME(controller(module:));

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
/// Reports the complete sampled path of a physical gesture. Points are
/// normalized to the current screen and offsets are milliseconds from DOWN.
@property (nonatomic, copy, nullable) void (^recordGestureHandler)(NSArray<NSValue *> *normalizedPoints, NSArray<NSNumber *> *offsetMilliseconds, NSInteger intervalMilliseconds);
@property (nonatomic, copy, nullable) void (^startRecordingHandler)(void);
@property (nonatomic, copy, nullable) void (^finishRecordingHandler)(void);

/// Starts one logically isolated HUD session. Every control rendered for the
/// session is stamped with `identifier`; controls left over from an older mode
/// are rejected instead of invoking the new mode's callbacks.
- (void)beginSessionWithIdentifier:(NSUInteger)identifier
                              role:(NSInteger)role NS_SWIFT_NAME(beginSession(identifier:role:));

/// Applies the recorder role atomically. This avoids rebuilding the hosted HUD
/// between three independent flags while switching modes.
- (void)configureRecordingEnabled:(BOOL)enabled
                  capturesGestures:(BOOL)capturesGestures
                             active:(BOOL)active NS_SWIFT_NAME(configureRecording(enabled:capturesGestures:active:));

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

/// Stops this module's raw HID monitor without destroying its hosted HUD.
/// Unlocking can restart the monitor and restore the same paused session.
- (void)suspendForDeviceLock NS_SWIFT_NAME(suspendForDeviceLock());
- (BOOL)resumeAfterDeviceUnlock NS_SWIFT_NAME(resumeAfterDeviceUnlock());

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

/// Touch-visualizer style routes for gesture playback. `paths` holds one array
/// of normalized points per recorded gesture and `durations` the matching
/// playback length in seconds, so the moving indicator keeps pace with the real
/// replay and follows any curve (straight, S-shaped, circular …). The indicator
/// is a translucent white dot dragging a fading tail, exactly like iOS
/// "show touches". Passing an empty array removes everything, which is how a
/// paused or stopped gesture script hides its route.
- (void)setGesturePaths:(NSArray<NSArray<NSValue *> *> *)paths
              durations:(NSArray<NSNumber *> *)durations NS_SWIFT_NAME(setGesturePaths(_:durations:));

@end

NS_ASSUME_NONNULL_END
