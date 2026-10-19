#import "AMModels.h"
NS_ASSUME_NONNULL_BEGIN
UIViewController *AMApplicationDetails(AMApplication *app, void (^backup)(void));
UIViewController *AMArchiveDetails(NSURL *archive);
UIViewController *AMPropertyListViewer(id value, NSString *title);
UIViewController *AMRecoveryRecords(void);
UIViewController *AMRetainedBackups(void);
NS_ASSUME_NONNULL_END
