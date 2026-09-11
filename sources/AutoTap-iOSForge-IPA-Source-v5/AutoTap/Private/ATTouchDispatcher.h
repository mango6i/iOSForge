#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, ATTouchPhase) {
    ATTouchPhaseDown = 0,
    ATTouchPhaseMove = 1,
    ATTouchPhaseUp = 2,
};

@interface ATTouchDispatcher : NSObject

+ (instancetype)shared NS_SWIFT_NAME(shared());

@property (nonatomic, readonly, getter=isAvailable) BOOL available;
@property (nonatomic, copy, readonly) NSString *diagnosticText;

- (BOOL)sendAtX:(CGFloat)x
               y:(CGFloat)y
           phase:(ATTouchPhase)phase NS_SWIFT_NAME(send(x:y:phase:));

- (BOOL)openApplicationWithBundleIdentifier:(NSString *)bundleIdentifier
    NS_SWIFT_NAME(openApplication(bundleIdentifier:));

@end

NS_ASSUME_NONNULL_END

