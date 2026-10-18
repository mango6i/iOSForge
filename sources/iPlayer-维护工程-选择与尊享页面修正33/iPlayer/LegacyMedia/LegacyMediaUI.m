// New compatibility implementation based on the owner's 1.6.2 UI reference.
// This file is editable source; it is not recovered original Swift source.
#import "LegacyMediaUI.h"
#import "LegacyMediaLibrary.h"
#import "LegacyPlaybackLayout.h"
#import <AVFoundation/AVFoundation.h>
#import <AVKit/AVKit.h>
#import <Photos/Photos.h>
#import <ImageIO/ImageIO.h>
#import <QuartzCore/QuartzCore.h>

static NSArray<NSURL *> *LMRoots(void) {
    NSMutableArray *roots = [NSMutableArray array];
    NSFileManager *fm = NSFileManager.defaultManager;
    for (NSNumber *directory in @[@(NSDocumentDirectory), @(NSApplicationSupportDirectory)]) {
        NSURL *url = [fm URLsForDirectory:directory.unsignedIntegerValue inDomains:NSUserDomainMask].firstObject;
        if (url) [roots addObject:url];
    }
    return roots;
}

static BOOL LMSafeFile(NSURL *url) {
    if (!url.isFileURL) return NO;
    NSString *path = url.URLByResolvingSymlinksInPath.path.stringByStandardizingPath;
    for (NSURL *root in LMRoots()) {
        NSString *prefix = [root.URLByResolvingSymlinksInPath.path.stringByStandardizingPath stringByAppendingString:@"/"];
        if ([path hasPrefix:prefix]) return YES;
    }
    return NO;
}

static BOOL LMExistingFile(NSURL *url) {
    NSNumber *regular=nil,*link=nil;
    [url getResourceValue:&regular forKey:NSURLIsRegularFileKey error:NULL];
    [url getResourceValue:&link forKey:NSURLIsSymbolicLinkKey error:NULL];
    return regular.boolValue&&!link.boolValue&&LMSafeFile(url);
}

static void LMSaveToPhotos(LMItem *item,void (^completion)(BOOL)) {
    if(!LMExistingFile(item.URL)){completion(NO);return;}
    [PHPhotoLibrary requestAuthorizationForAccessLevel:PHAccessLevelAddOnly handler:^(PHAuthorizationStatus status){
        if(status!=PHAuthorizationStatusAuthorized&&status!=PHAuthorizationStatusLimited){dispatch_async(dispatch_get_main_queue(),^{completion(NO);});return;}
        [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
            if(item.video)[PHAssetChangeRequest creationRequestForAssetFromVideoAtFileURL:item.URL];
            else[PHAssetChangeRequest creationRequestForAssetFromImageAtFileURL:item.URL];
        } completionHandler:^(BOOL success,NSError *error){dispatch_async(dispatch_get_main_queue(),^{completion(success);});}];
    }];
}

static UIImage *LMPlayerImage(NSString *name, NSString *fallback) {
    NSBundle *framework = [NSBundle bundleForClass:NSClassFromString(@"LMGridController")];
    NSString *path = [framework pathForResource:name ofType:@"png" inDirectory:@"CLPlayer.bundle"];
    if (!path) path = [framework pathForResource:[name stringByAppendingString:@"@3x"] ofType:@"png" inDirectory:@"CLPlayer.bundle"];
    return path ? [UIImage imageWithContentsOfFile:path] : [UIImage systemImageNamed:fallback];
}

static NSString *LMTime(double seconds) {
    if (!isfinite(seconds) || seconds < 0) return @"00:00";
    NSInteger n = (NSInteger)seconds;
    return n >= 3600 ? [NSString stringWithFormat:@"%ld:%02ld:%02ld",(long)n/3600,(long)(n/60)%60,(long)n%60]
                     : [NSString stringWithFormat:@"%02ld:%02ld",(long)n/60,(long)n%60];
}

@interface LMThumbnailStore : NSObject
@property(nonatomic,strong) NSCache *cache;
@property(nonatomic,strong) NSOperationQueue *queue;
+ (instancetype)shared;
- (void)imageForItem:(LMItem *)item completion:(void (^)(UIImage * _Nullable))completion;
@end
@implementation LMThumbnailStore
+ (instancetype)shared {
    static LMThumbnailStore *store; static dispatch_once_t once;
    dispatch_once(&once, ^{ store=[self new]; store.cache=[NSCache new]; store.cache.totalCostLimit=24*1024*1024;
        store.queue=[NSOperationQueue new]; store.queue.maxConcurrentOperationCount=2;
        store.queue.qualityOfService=NSQualityOfServiceUtility; });
    return store;
}
- (void)imageForItem:(LMItem *)item completion:(void (^)(UIImage *))completion {
    NSString *key=[NSString stringWithFormat:@"%@-%.0f-%llu",item.URL.path,item.modifiedDate.timeIntervalSince1970,item.byteSize];
    UIImage *cached=[self.cache objectForKey:key]; if(cached){ completion(cached); return; }
    [self.queue addOperationWithBlock:^{ @autoreleasepool {
        UIImage *image=nil;
        if (LMSafeFile(item.URL)) {
            if (item.video) {
                AVURLAsset *asset=[AVURLAsset URLAssetWithURL:item.URL options:nil];
                AVAssetImageGenerator *generator=[AVAssetImageGenerator assetImageGeneratorWithAsset:asset];
                generator.appliesPreferredTrackTransform=YES; generator.maximumSize=CGSizeMake(480,480);
                CGImageRef cg=[generator copyCGImageAtTime:kCMTimeZero actualTime:NULL error:NULL];
                if(cg){image=[UIImage imageWithCGImage:cg];CGImageRelease(cg);}
            } else {
                CGImageSourceRef source=CGImageSourceCreateWithURL((__bridge CFURLRef)item.URL,NULL);
                if(source){ NSDictionary *options=@{(id)kCGImageSourceCreateThumbnailFromImageAlways:@YES,
                    (id)kCGImageSourceThumbnailMaxPixelSize:@480,(id)kCGImageSourceCreateThumbnailWithTransform:@YES};
                    CGImageRef cg=CGImageSourceCreateThumbnailAtIndex(source,0,(__bridge CFDictionaryRef)options);
                    if(cg){image=[UIImage imageWithCGImage:cg];CGImageRelease(cg);} CFRelease(source); }
            }
        }
        if(image) [self.cache setObject:image forKey:key cost:(NSUInteger)(image.size.width*image.size.height*4)];
        dispatch_async(dispatch_get_main_queue(), ^{completion(image);});
    }}];
}
@end

@class LMFolderHeader;
@interface LMVideoSurface : UIView
@property(nonatomic,readonly) AVPlayerLayer *playerLayer;
@end
// Controls live on an ordinary UIView. Video gravity only affects this
// noninteractive child, never the layer that owns the buttons or menus.
@interface LMVideoContentView : UIView
@end
@implementation LMVideoContentView
+ (Class)layerClass { return AVPlayerLayer.class; }
@end
@interface LMVideoSurface ()
@property(nonatomic,strong) LMVideoContentView *content;
@end
@implementation LMVideoSurface
- (instancetype)initWithFrame:(CGRect)frame {
    if((self=[super initWithFrame:frame])){
        self.clipsToBounds=YES;self.content=[LMVideoContentView new];
        self.content.userInteractionEnabled=NO;self.content.clipsToBounds=YES;
        [self addSubview:self.content];
    }return self;
}
- (AVPlayerLayer *)playerLayer { return (AVPlayerLayer *)self.content.layer; }
- (void)layoutSubviews {
    [super layoutSubviews];
    if(!CGRectEqualToRect(self.content.frame,self.bounds)){
        [CATransaction begin];[CATransaction setDisableActions:YES];
        self.content.frame=self.bounds;[CATransaction commit];
    }
}
@end

static void LMSetFrame(UIView *view,CGRect frame) {
    if(view&&!CGRectEqualToRect(view.frame,frame))view.frame=frame;
}

static void LMToggleFolder(UICollectionView *collection,NSArray<LMGroup *> *groups,
                           NSMutableSet<NSString *> *expanded,NSString *identifier,
                           LMFolderHeader *header,void (^changed)(void));

@interface LMGridCell : UICollectionViewCell
@property(nonatomic,strong) UIImageView *image;
@property(nonatomic,strong) UILabel *nameLabel,*dateLabel,*selectionLabel;
@property(nonatomic,copy) NSString *representedPath;
@end
@implementation LMGridCell
- (instancetype)initWithFrame:(CGRect)frame {
    if((self=[super initWithFrame:frame])){self.backgroundColor=UIColor.secondarySystemBackgroundColor;self.image=[UIImageView new];self.image.contentMode=UIViewContentModeScaleAspectFill;self.image.clipsToBounds=YES;
        self.nameLabel=[UILabel new];self.nameLabel.textColor=UIColor.labelColor;self.nameLabel.font=[UIFont systemFontOfSize:12];
        self.dateLabel=[UILabel new];self.dateLabel.textColor=UIColor.secondaryLabelColor;self.dateLabel.font=[UIFont systemFontOfSize:10];
        self.selectionLabel=[UILabel new];self.selectionLabel.textAlignment=NSTextAlignmentCenter;self.selectionLabel.textColor=UIColor.whiteColor;self.selectionLabel.backgroundColor=self.tintColor;self.selectionLabel.layer.cornerRadius=12;self.selectionLabel.clipsToBounds=YES;
        for(UIView *v in @[self.image,self.nameLabel,self.dateLabel,self.selectionLabel])[self.contentView addSubview:v];}return self;
}
- (void)layoutSubviews {[super layoutSubviews];CGFloat w=self.bounds.size.width,h=self.bounds.size.height;self.image.frame=CGRectMake(0,0,w,MAX(0,h-34));self.nameLabel.frame=CGRectMake(4,h-32,w-8,16);self.dateLabel.frame=CGRectMake(4,h-16,w-8,14);self.selectionLabel.frame=CGRectMake(w-29,5,24,24);}
- (void)tintColorDidChange {[super tintColorDidChange];self.selectionLabel.backgroundColor=self.tintColor;}
- (void)prepareForReuse {[super prepareForReuse];self.representedPath=nil;self.image.image=nil;}
@end

static CGFloat LMFolderTitleHeight(NSString *title,CGFloat width) {
    CGFloat available=MAX(1,width-120);
    CGRect text=[(title?:@"") boundingRectWithSize:CGSizeMake(available,CGFLOAT_MAX)
        options:NSStringDrawingUsesLineFragmentOrigin|NSStringDrawingUsesFontLeading
        attributes:@{NSFontAttributeName:[UIFont systemFontOfSize:14 weight:UIFontWeightMedium]} context:nil];
    return MAX(20,ceil(text.size.height));
}
static CGFloat LMFolderHeaderHeight(NSString *title,CGFloat width) {
    return 8+LMFolderTitleHeight(title,width)+4+18+8;
}

@interface LMFolderHeader : UICollectionReusableView
@property(nonatomic,strong) UIImageView *icon;
@property(nonatomic,strong) UILabel *nameLabel,*platformLabel,*countLabel,*arrow;
@property(nonatomic,strong) UIButton *hit;
@property(nonatomic,copy) void (^tapped)(void);
@end
@implementation LMFolderHeader
- (instancetype)initWithFrame:(CGRect)frame {
    if((self=[super initWithFrame:frame])){
        self.backgroundColor=UIColor.systemBackgroundColor;
        self.icon=[UIImageView new];self.icon.tintColor=self.tintColor;self.icon.contentMode=UIViewContentModeScaleAspectFit;
        self.nameLabel=[UILabel new];self.nameLabel.font=[UIFont systemFontOfSize:14 weight:UIFontWeightMedium];self.nameLabel.textColor=UIColor.labelColor;
        self.nameLabel.numberOfLines=0;self.nameLabel.lineBreakMode=NSLineBreakByWordWrapping;
        self.platformLabel=[UILabel new];self.platformLabel.font=[UIFont systemFontOfSize:12];self.platformLabel.textColor=UIColor.secondaryLabelColor;
        self.countLabel=[UILabel new];self.countLabel.font=[UIFont systemFontOfSize:12];self.countLabel.textColor=UIColor.secondaryLabelColor;
        self.countLabel.lineBreakMode=NSLineBreakByClipping;
        [self.countLabel setContentCompressionResistancePriority:UILayoutPriorityRequired forAxis:UILayoutConstraintAxisHorizontal];
        [self.countLabel setContentHuggingPriority:UILayoutPriorityDefaultHigh forAxis:UILayoutConstraintAxisHorizontal];
        [self.platformLabel setContentCompressionResistancePriority:UILayoutPriorityDefaultLow forAxis:UILayoutConstraintAxisHorizontal];
        self.arrow=[UILabel new];self.arrow.textColor=self.tintColor;self.arrow.textAlignment=NSTextAlignmentCenter;
        self.hit=[UIButton buttonWithType:UIButtonTypeCustom];[self.hit addTarget:self action:@selector(tap) forControlEvents:UIControlEventTouchUpInside];
        UIView *line=[UIView new];line.backgroundColor=UIColor.separatorColor;
        for(UIView *v in @[self.icon,self.nameLabel,self.platformLabel,self.countLabel,self.arrow,self.hit,line]){v.translatesAutoresizingMaskIntoConstraints=NO;[self addSubview:v];}
        // Count width no longer depends on the previous reused header's text
        // or a sizeThatFits result from its previous bounds.
        [NSLayoutConstraint activateConstraints:@[
            [self.icon.leadingAnchor constraintEqualToAnchor:self.leadingAnchor constant:15],
            [self.icon.centerYAnchor constraintEqualToAnchor:self.centerYAnchor],
            [self.icon.widthAnchor constraintEqualToConstant:35],[self.icon.heightAnchor constraintEqualToConstant:40],
            [self.nameLabel.leadingAnchor constraintEqualToAnchor:self.leadingAnchor constant:65],
            [self.nameLabel.trailingAnchor constraintEqualToAnchor:self.trailingAnchor constant:-55],
            [self.nameLabel.topAnchor constraintEqualToAnchor:self.topAnchor constant:8],
            [self.countLabel.leadingAnchor constraintEqualToAnchor:self.nameLabel.leadingAnchor],
            [self.countLabel.topAnchor constraintEqualToAnchor:self.nameLabel.bottomAnchor constant:4],
            [self.countLabel.heightAnchor constraintEqualToConstant:18],[self.countLabel.widthAnchor constraintGreaterThanOrEqualToConstant:86],
            [self.platformLabel.leadingAnchor constraintEqualToAnchor:self.countLabel.trailingAnchor constant:10],
            [self.platformLabel.trailingAnchor constraintEqualToAnchor:self.nameLabel.trailingAnchor],
            [self.platformLabel.centerYAnchor constraintEqualToAnchor:self.countLabel.centerYAnchor],
            [self.arrow.trailingAnchor constraintEqualToAnchor:self.trailingAnchor constant:-12],
            [self.arrow.centerYAnchor constraintEqualToAnchor:self.centerYAnchor],
            [self.arrow.widthAnchor constraintEqualToConstant:32],[self.arrow.heightAnchor constraintEqualToConstant:32],
            [self.hit.leadingAnchor constraintEqualToAnchor:self.leadingAnchor],[self.hit.trailingAnchor constraintEqualToAnchor:self.trailingAnchor],
            [self.hit.topAnchor constraintEqualToAnchor:self.topAnchor],[self.hit.bottomAnchor constraintEqualToAnchor:self.bottomAnchor],
            [line.leadingAnchor constraintEqualToAnchor:self.leadingAnchor constant:15],[line.trailingAnchor constraintEqualToAnchor:self.trailingAnchor],
            [line.bottomAnchor constraintEqualToAnchor:self.bottomAnchor],[line.heightAnchor constraintEqualToConstant:0.5]
        ]];
    }return self;
}
- (void)tintColorDidChange {[super tintColorDidChange];self.icon.tintColor=self.tintColor;self.arrow.textColor=self.tintColor;}
- (void)tap {if(self.tapped)self.tapped();}
- (void)prepareForReuse {[super prepareForReuse];self.tapped=nil;self.nameLabel.text=nil;self.countLabel.text=nil;self.platformLabel.text=nil;}
@end

// Change only this folder's item range. Other headers and thumbnails keep
// their instances, so opening one group cannot flash every visible folder.
static void LMToggleFolder(UICollectionView *collection,NSArray<LMGroup *> *groups,
                           NSMutableSet<NSString *> *expanded,NSString *identifier,
                           LMFolderHeader *header,void (^changed)(void)) {
    NSUInteger section=[groups indexOfObjectPassingTest:^BOOL(LMGroup *group,NSUInteger idx,BOOL *stop){return [group.identifier isEqualToString:identifier];}];
    if(section==NSNotFound||!collection.userInteractionEnabled)return;
    BOOL wasOpen=[expanded containsObject:identifier];
    NSMutableArray *paths=[NSMutableArray array];
    for(NSUInteger n=0;n<groups[section].items.count;n++)[paths addObject:[NSIndexPath indexPathForItem:n inSection:section]];
    collection.userInteractionEnabled=NO;
    [UIView performWithoutAnimation:^{
        [collection performBatchUpdates:^{
            if(wasOpen){[expanded removeObject:identifier];[collection deleteItemsAtIndexPaths:paths];}
            else{[expanded addObject:identifier];[collection insertItemsAtIndexPaths:paths];}
        } completion:^(BOOL finished){
            collection.userInteractionEnabled=YES;
            [[NSNotificationCenter defaultCenter] postNotificationName:@"IPlayerFolderUpdateEnded" object:collection];
        }];
        header.arrow.text=wasOpen?@"▸":@"▾";
        header.hit.accessibilityLabel=[NSString stringWithFormat:@"%@，%@，%@",groups[section].title,header.countLabel.text,wasOpen?@"展开":@"收起"];
    }];
    if(changed)changed();
}

@class LMPlaybackController;
@interface LMFullscreenVideoController : UIViewController
@property(nonatomic,weak) LMPlaybackController *owner;
@end

static void LMRequestVideoOrientation(UIViewController *controller,BOOL landscape) {
    if(@available(iOS 16.0,*)){
        for(UIViewController *parent=controller;parent;parent=parent.parentViewController)[parent setNeedsUpdateOfSupportedInterfaceOrientations];
        [controller.view.window.rootViewController setNeedsUpdateOfSupportedInterfaceOrientations];
        UIWindowScene *scene=controller.view.window.windowScene;
        if(!scene)return;
        UIInterfaceOrientationMask mask=landscape?UIInterfaceOrientationMaskLandscape:UIInterfaceOrientationMaskPortrait;
        [scene requestGeometryUpdateWithPreferences:[[UIWindowSceneGeometryPreferencesIOS alloc] initWithInterfaceOrientations:mask] errorHandler:^(NSError *error){
            // Fullscreen canvas layout is already active; a rejected window
            // rotation cannot turn the button into a no-op.
            [[NSNotificationCenter defaultCenter] postNotificationName:@"IPlayerVideoGeometryRequestFailed" object:nil userInfo:@{@"code":@(error.code)}];
        }];
    }
}

@interface LMPlaybackController : UIViewController <UICollectionViewDataSource,UICollectionViewDelegateFlowLayout,AVPictureInPictureControllerDelegate,UIGestureRecognizerDelegate>
@property(nonatomic,strong) NSArray<LMItem *> *items;
@property(nonatomic,strong) NSArray<LMGroup *> *groups;
@property(nonatomic,strong) NSMutableSet<NSString *> *expanded;
@property(nonatomic,copy) void (^expandedDidChange)(NSSet<NSString *> *);
@property(nonatomic) CGSize lastPlaylistSize;
@property(nonatomic) NSInteger index;
@property(nonatomic,strong) AVPlayer *player;
@property(nonatomic,strong) LMVideoSurface *surface;
@property(nonatomic,strong) UIView *topBar,*bottomBar;
@property(nonatomic,strong) UILabel *titleLabel,*elapsed,*total,*errorLabel;
@property(nonatomic,strong) UIButton *playButton,*fullButton,*verticalFullButton,*pipButton;
@property(nonatomic,strong) LMFullscreenVideoController *fullscreenController;
@property(nonatomic) BOOL verticalFullscreen;
@property(nonatomic,strong) UIView *morePanel;
@property(nonatomic,strong) UIScrollView *moreScroll;
@property(nonatomic,strong) NSTimer *hideControlsTimer;
- (void)layoutSurfaceInBounds:(CGRect)bounds safe:(UIEdgeInsets)safe full:(BOOL)full;
- (void)restoreInlineAfterFullscreen:(LMFullscreenVideoController *)controller;
- (void)resetControlsTimer;
@property(nonatomic,strong) UISlider *slider;
@property(nonatomic,strong) UICollectionView *playlist;
@property(nonatomic,strong) id timeObserver;
@property(nonatomic,strong) AVPictureInPictureController *pip;
@property(nonatomic) float playbackRate;
@property(nonatomic) BOOL dragging,fullscreen,controlsVisible,observing;
@property(nonatomic) CGPoint panOrigin;
@property(nonatomic) double panTime;
@property(nonatomic) float panVolume,panBrightness;
- (void)clearPlayer;
@end

@implementation LMFullscreenVideoController
- (void)viewDidLoad {[super viewDidLoad];self.view.backgroundColor=UIColor.blackColor;self.modalPresentationCapturesStatusBarAppearance=YES;[self.view addSubview:self.owner.surface];}
- (void)viewDidLayoutSubviews {[super viewDidLayoutSubviews];[self.owner layoutSurfaceInBounds:self.view.bounds safe:self.view.safeAreaInsets full:YES];}
- (void)viewDidAppear:(BOOL)animated {[super viewDidAppear:animated];LMRequestVideoOrientation(self,!self.owner.verticalFullscreen);}
- (void)viewDidDisappear:(BOOL)animated {[super viewDidDisappear:animated];if(self.isBeingDismissed||!self.presentingViewController)[self.owner restoreInlineAfterFullscreen:self];}
- (UIInterfaceOrientationMask)supportedInterfaceOrientations {return UIInterfaceOrientationMaskAllButUpsideDown;}
- (UIInterfaceOrientation)preferredInterfaceOrientationForPresentation {return self.owner.verticalFullscreen?UIInterfaceOrientationPortrait:UIInterfaceOrientationLandscapeRight;}
- (BOOL)shouldAutorotate {return YES;}
- (BOOL)prefersStatusBarHidden {return YES;}
- (BOOL)prefersHomeIndicatorAutoHidden {return YES;}
@end

static LMPlaybackController *LMPictureInPictureOwner;
@implementation LMPlaybackController
- (UIButton *)button:(NSString *)symbol image:(NSString *)asset action:(SEL)action {
    UIButton *button=[UIButton buttonWithType:UIButtonTypeSystem]; button.tintColor=UIColor.whiteColor;
    [button setImage:asset ? LMPlayerImage(asset,symbol) : [UIImage systemImageNamed:symbol] forState:UIControlStateNormal];
    [button addTarget:self action:action forControlEvents:UIControlEventTouchUpInside];
    return button;
}
- (void)viewDidLoad {
    [super viewDidLoad]; self.view.backgroundColor=UIColor.systemBackgroundColor; self.playbackRate=1; self.controlsVisible=YES;
    self.surface=[[LMVideoSurface alloc] initWithFrame:CGRectZero]; self.surface.backgroundColor=UIColor.blackColor;
    self.surface.playerLayer.videoGravity=AVLayerVideoGravityResizeAspect; [self.view addSubview:self.surface];
    UITapGestureRecognizer *tap=[[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(toggleControls)];tap.delegate=self;tap.cancelsTouchesInView=NO;[self.surface addGestureRecognizer:tap];
    UIPanGestureRecognizer *pan=[[UIPanGestureRecognizer alloc] initWithTarget:self action:@selector(pan:)];pan.delegate=self;[self.surface addGestureRecognizer:pan];
    self.topBar=[UIView new];self.topBar.backgroundColor=[UIColor colorWithWhite:0 alpha:0.55];[self.surface addSubview:self.topBar];
    UIButton *back=[self button:@"chevron.left" image:@"CLBack" action:@selector(close)]; back.tag=1;back.accessibilityLabel=@"返回";
    [self.topBar addSubview:back];
    self.titleLabel=[UILabel new];self.titleLabel.textColor=UIColor.whiteColor;self.titleLabel.font=[UIFont systemFontOfSize:14];
    [self.topBar addSubview:self.titleLabel];
    self.pipButton=[self button:@"pip.enter" image:nil action:@selector(startPictureInPicture)];self.pipButton.accessibilityLabel=@"画中画";[self.topBar addSubview:self.pipButton];
    UIButton *more=[self button:@"ellipsis" image:@"CLMore" action:@selector(more:)];more.tag=2;more.accessibilityLabel=@"更多";[self.topBar addSubview:more];
    self.bottomBar=[UIView new];self.bottomBar.backgroundColor=[UIColor colorWithWhite:0 alpha:0.55];[self.surface addSubview:self.bottomBar];
    self.playButton=[self button:@"pause.fill" image:@"CLPause" action:@selector(playPause)];self.playButton.accessibilityLabel=@"播放或暂停";
    self.fullButton=[self button:@"arrow.up.left.and.arrow.down.right" image:@"CLFullscreen" action:@selector(toggleFullscreen)];
    self.fullButton.accessibilityLabel=@"横屏全屏";
    self.verticalFullButton=[self button:@"arrow.up.and.down" image:nil action:@selector(toggleVerticalFullscreen)];self.verticalFullButton.accessibilityLabel=@"竖屏全屏";
    [self.bottomBar addSubview:self.playButton];[self.bottomBar addSubview:self.fullButton];[self.bottomBar addSubview:self.verticalFullButton];
    self.elapsed=[UILabel new];self.total=[UILabel new];
    for(UILabel *label in @[self.elapsed,self.total]){label.textColor=UIColor.whiteColor;label.font=[UIFont monospacedDigitSystemFontOfSize:11 weight:UIFontWeightRegular];label.textAlignment=NSTextAlignmentCenter;[self.bottomBar addSubview:label];}
    self.slider=[UISlider new];self.slider.minimumValue=0;self.slider.maximumValue=1;self.slider.accessibilityLabel=@"播放进度";
    [self.slider setThumbImage:LMPlayerImage(@"CLSlider",@"circle.fill") forState:UIControlStateNormal];
    [self.slider addTarget:self action:@selector(beginSeek) forControlEvents:UIControlEventTouchDown];
    [self.slider addTarget:self action:@selector(endSeek) forControlEvents:UIControlEventTouchUpInside|UIControlEventTouchUpOutside|UIControlEventTouchCancel];
    [self.bottomBar addSubview:self.slider];
    self.errorLabel=[UILabel new];self.errorLabel.textColor=UIColor.whiteColor;self.errorLabel.numberOfLines=0;self.errorLabel.textAlignment=NSTextAlignmentCenter;
    self.errorLabel.font=[UIFont systemFontOfSize:14];self.errorLabel.hidden=YES;[self.surface addSubview:self.errorLabel];
    UICollectionViewFlowLayout *filesLayout=[UICollectionViewFlowLayout new];filesLayout.minimumLineSpacing=5;filesLayout.minimumInteritemSpacing=5;filesLayout.sectionInset=UIEdgeInsetsMake(0,5,5,5);filesLayout.sectionHeadersPinToVisibleBounds=YES;
    if(!self.expanded)self.expanded=[NSMutableSet set];
    if(!self.groups.count){LMGroup *group=[LMGroup new];group.identifier=@"replay";group.title=@"录像";group.platform=@"";group.items=self.items?:@[];self.groups=@[group];}
    if(self.index>=0&&self.index<self.items.count)for(LMGroup *group in self.groups)if([group.items containsObject:self.items[self.index]])[self.expanded addObject:group.identifier];
    self.playlist=[[UICollectionView alloc] initWithFrame:CGRectZero collectionViewLayout:filesLayout];
    self.playlist.backgroundColor=UIColor.systemBackgroundColor;self.playlist.dataSource=self;self.playlist.delegate=self;
    [self.playlist registerClass:LMGridCell.class forCellWithReuseIdentifier:@"playlist"];
    [self.playlist registerClass:LMFolderHeader.class forSupplementaryViewOfKind:UICollectionElementKindSectionHeader withReuseIdentifier:@"folder"];[self.view addSubview:self.playlist];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(ended:) name:AVPlayerItemDidPlayToEndTimeNotification object:nil];
    [self openIndex:self.index];
}
- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];[self.navigationController setNavigationBarHidden:YES animated:animated];
    // This viewer owns a full-screen presentation. The SwiftUI tab bar and
    // its safe-area layout are never mutated while a video is playing.
}
- (void)viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear:animated];
    if(self.isMovingFromParentViewController||self.isBeingDismissed||self.navigationController.isBeingDismissed){
        [self.navigationController setNavigationBarHidden:NO animated:animated];

    }
}
- (void)viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];
    if(!self.parentViewController&&!self.presentingViewController&&!self.fullscreenController){if(self.pip.pictureInPictureActive)LMPictureInPictureOwner=self;else[self clearPlayer];}
}
- (void)viewDidLayoutSubviews {
    [super viewDidLayoutSubviews];
    CGRect bounds=self.view.bounds;UIEdgeInsets safe=self.view.safeAreaInsets;
    LMPlaybackGeometry g=LMPlaybackGeometryMake(bounds.size.width,bounds.size.height,(LMLayoutInsets){safe.top,safe.left,safe.bottom,safe.right},false,false);
    LMSetFrame(self.playlist,CGRectMake(0,g.listY,bounds.size.width,g.listHeight));
    if(!CGSizeEqualToSize(self.lastPlaylistSize,self.playlist.bounds.size)){self.lastPlaylistSize=self.playlist.bounds.size;[self.playlist.collectionViewLayout invalidateLayout];}
    if(self.surface.superview==self.view)[self layoutSurfaceInBounds:bounds safe:safe full:NO];
}
- (void)layoutSurfaceInBounds:(CGRect)bounds safe:(UIEdgeInsets)safe full:(BOOL)full {
    LMPlaybackGeometry g=LMPlaybackGeometryMake(bounds.size.width,bounds.size.height,(LMLayoutInsets){safe.top,safe.left,safe.bottom,safe.right},full,self.verticalFullscreen);
    // Idempotent layout: never reset identity then rotate on every pass.
    [CATransaction begin];[CATransaction setDisableActions:YES];
    CGRect canvas=CGRectMake(0,0,g.canvasWidth,g.canvasHeight);
    CGPoint center=CGPointMake(g.centerX,g.centerY);
    CGAffineTransform transform=CGAffineTransformMakeRotation(g.rotation);
    if(!CGRectEqualToRect(self.surface.bounds,canvas))self.surface.bounds=canvas;
    if(!CGPointEqualToPoint(self.surface.center,center))self.surface.center=center;
    if(!CGAffineTransformEqualToTransform(self.surface.transform,transform))self.surface.transform=transform;
    CGFloat left=g.controlLeft,right=g.controlRight,w=MAX(0,g.canvasWidth-left-right),h=g.canvasHeight;
    LMSetFrame(self.topBar,CGRectMake(left,g.controlTop,w,44));
    LMSetFrame(self.bottomBar,CGRectMake(left,MAX(0,h-44-g.controlBottom),w,44));
    LMSetFrame([self.topBar viewWithTag:1],CGRectMake(0,0,44,44));LMSetFrame([self.topBar viewWithTag:2],CGRectMake(w-44,0,44,44));
    LMSetFrame(self.pipButton,CGRectMake(w-88,0,44,44));LMSetFrame(self.titleLabel,CGRectMake(48,0,MAX(0,w-140),44));
    LMSetFrame(self.playButton,CGRectMake(0,0,40,44));LMSetFrame(self.elapsed,CGRectMake(40,0,48,44));
    LMSetFrame(self.fullButton,CGRectMake(w-40,0,40,44));LMSetFrame(self.verticalFullButton,CGRectMake(w-80,0,40,44));
    LMSetFrame(self.total,CGRectMake(w-128,0,48,44));LMSetFrame(self.slider,CGRectMake(90,0,MAX(0,w-220),44));
    LMSetFrame(self.errorLabel,CGRectInset(self.surface.bounds,40,54));
    if(self.fullButton.selected!=full){self.fullButton.selected=full;[self.fullButton setImage:LMPlayerImage(full?@"CLSmallscreen":@"CLFullscreen",@"arrow.up.left.and.arrow.down.right") forState:UIControlStateNormal];}
    if(self.morePanel){CGFloat panelWidth=MIN(310,MAX(0,g.canvasWidth-g.controlLeft-g.controlRight));LMSetFrame(self.morePanel,CGRectMake(g.canvasWidth-panelWidth-g.controlRight,g.controlTop,panelWidth,MAX(0,h-g.controlTop-g.controlBottom)));LMSetFrame(self.moreScroll,self.morePanel.bounds);}
    [CATransaction commit];
}
- (UIInterfaceOrientationMask)supportedInterfaceOrientations {return UIDevice.currentDevice.userInterfaceIdiom==UIUserInterfaceIdiomPad?UIInterfaceOrientationMaskAllButUpsideDown:UIInterfaceOrientationMaskPortrait;}
- (BOOL)shouldAutorotate {return YES;}
- (UIStatusBarStyle)preferredStatusBarStyle {return UIStatusBarStyleDefault;}
- (void)resetControlsTimer {
    [self.hideControlsTimer invalidate];self.hideControlsTimer=nil;
    if(!self.controlsVisible||self.dragging||self.player.rate==0||(self.morePanel&&!self.morePanel.hidden))return;
    __weak typeof(self) weak=self;
    self.hideControlsTimer=[NSTimer scheduledTimerWithTimeInterval:5 repeats:NO block:^(NSTimer *timer){LMPlaybackController *s=weak;if(!s)return;s.controlsVisible=NO;s.topBar.hidden=YES;s.bottomBar.hidden=YES;}];
}
- (void)clearPlayer {
    if(self.observing){[self.player.currentItem removeObserver:self forKeyPath:@"status"];self.observing=NO;}
    if(self.timeObserver){[self.player removeTimeObserver:self.timeObserver];self.timeObserver=nil;}
    [self.player pause];self.surface.playerLayer.player=nil;self.player=nil;self.pip.delegate=nil;[self.pip stopPictureInPicture];self.pip=nil;
}
- (void)openIndex:(NSInteger)index {
    if(index<0 || index>=self.items.count) return; [self clearPlayer];self.index=index;
    LMItem *item=self.items[index];self.titleLabel.text=item.name;
    for(LMGroup *group in self.groups)if([group.items containsObject:item]){self.titleLabel.text=group.title;break;}
    self.errorLabel.hidden=YES;self.slider.value=0;
    self.elapsed.text=@"00:00";self.total.text=@"00:00";self.slider.enabled=NO;
    [self.playButton setImage:LMPlayerImage(@"CLPause",@"pause.fill") forState:UIControlStateNormal];
    for(LMGroup *group in self.groups)if([group.items containsObject:item]&&![self.expanded containsObject:group.identifier])
        LMToggleFolder(self.playlist,self.groups,self.expanded,group.identifier,nil,nil);
    [self updatePlayingCells];
    if(!LMExistingFile(item.URL)){self.errorLabel.text=@"文件暂时无法读取，请返回刷新后重试。";self.errorLabel.hidden=NO;return;}
    AVPlayerItem *playerItem=[AVPlayerItem playerItemWithURL:item.URL];self.player=[AVPlayer playerWithPlayerItem:playerItem];
    self.surface.playerLayer.player=self.player;
    [playerItem addObserver:self forKeyPath:@"status" options:NSKeyValueObservingOptionInitial context:NULL];self.observing=YES;
    if([AVPictureInPictureController isPictureInPictureSupported]){self.pip=[[AVPictureInPictureController alloc] initWithPlayerLayer:self.surface.playerLayer];self.pip.delegate=self;}
    __weak typeof(self) weak=self;
    self.timeObserver=[self.player addPeriodicTimeObserverForInterval:CMTimeMakeWithSeconds(0.5,600) queue:dispatch_get_main_queue() usingBlock:^(CMTime time){
        LMPlaybackController *s=weak;if(!s)return; double current=CMTimeGetSeconds(time),duration=CMTimeGetSeconds(s.player.currentItem.duration);
        s.elapsed.text=LMTime(current);s.total.text=LMTime(duration);
        s.pipButton.enabled=s.pip.pictureInPicturePossible;s.slider.enabled=isfinite(duration)&&duration>0;
        if(!s.dragging && isfinite(duration)&&duration>0) s.slider.value=(float)(current/duration);
    }];
}
- (void)updatePlayingCells {
    for(NSIndexPath *path in self.playlist.indexPathsForVisibleItems){
        LMGridCell *cell=(LMGridCell *)[self.playlist cellForItemAtIndexPath:path];
        LMItem *item=self.groups[path.section].items[path.item];
        BOOL playing=self.index>=0&&self.index<self.items.count&&[item.URL.path isEqualToString:self.items[self.index].URL.path];
        cell.nameLabel.textColor=playing?self.view.tintColor:UIColor.labelColor;
        cell.selectionLabel.hidden=!playing;cell.selectionLabel.text=@"▶";
    }
}
- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary *)change context:(void *)context {
    if(![keyPath isEqualToString:@"status"])return;
    dispatch_async(dispatch_get_main_queue(), ^{
        if(object!=self.player.currentItem)return;
        if(self.player.currentItem.status==AVPlayerItemStatusReadyToPlay){[self.player play];self.player.rate=self.playbackRate;[self resetControlsTimer];}
        else if(self.player.currentItem.status==AVPlayerItemStatusFailed){self.errorLabel.text=@"此录像暂时无法播放，可在列表中分享或导出原文件。";self.errorLabel.hidden=NO;}
    });
}
- (void)playPause {
    if(self.player.rate!=0){[self.player pause];[self.hideControlsTimer invalidate];[self.playButton setImage:LMPlayerImage(@"CLPlay",@"play.fill") forState:UIControlStateNormal];}
    else {if(CMTimeCompare(self.player.currentTime,self.player.currentItem.duration)>=0)[self.player seekToTime:kCMTimeZero];
        [self.player play];self.player.rate=self.playbackRate;[self.playButton setImage:LMPlayerImage(@"CLPause",@"pause.fill") forState:UIControlStateNormal];[self resetControlsTimer];}
}
- (void)beginSeek { self.dragging=YES;[self.hideControlsTimer invalidate]; }
- (void)endSeek {
    double duration=CMTimeGetSeconds(self.player.currentItem.duration);self.dragging=NO;
    if(isfinite(duration)&&duration>0)[self.player seekToTime:CMTimeMakeWithSeconds(self.slider.value*duration,600) toleranceBefore:kCMTimeZero toleranceAfter:kCMTimeZero];
    [self resetControlsTimer];
}
- (void)toggleControls {if(self.morePanel&&!self.morePanel.hidden){self.morePanel.hidden=YES;self.controlsVisible=YES;}else self.controlsVisible=!self.controlsVisible;self.topBar.hidden=!self.controlsVisible;self.bottomBar.hidden=!self.controlsVisible;[self resetControlsTimer];}
- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gesture shouldReceiveTouch:(UITouch *)touch {
    return ![touch.view isDescendantOfView:self.topBar]&&![touch.view isDescendantOfView:self.bottomBar]&&![touch.view isDescendantOfView:self.morePanel];
}
- (void)pan:(UIPanGestureRecognizer *)gesture {
    CGPoint delta=[gesture translationInView:self.surface];
    if(gesture.state==UIGestureRecognizerStateBegan){self.panOrigin=[gesture locationInView:self.surface];self.panTime=CMTimeGetSeconds(self.player.currentTime);self.panVolume=self.player.volume;self.panBrightness=UIScreen.mainScreen.brightness;}
    if(fabs(delta.x)>fabs(delta.y)){
        double duration=CMTimeGetSeconds(self.player.currentItem.duration);if(!isfinite(duration)||duration<=0)return;
        double target=MAX(0,MIN(duration,self.panTime+delta.x/MAX(1,self.surface.bounds.size.width)*duration));
        self.elapsed.text=LMTime(target);
        if(gesture.state==UIGestureRecognizerStateEnded)[self.player seekToTime:CMTimeMakeWithSeconds(target,600)];
    } else if(gesture.state==UIGestureRecognizerStateChanged){
        CGFloat change=-delta.y/MAX(1,self.surface.bounds.size.height);
        if(self.panOrigin.x<self.surface.bounds.size.width/2)UIScreen.mainScreen.brightness=MAX(0,MIN(1,self.panBrightness+change));
        else self.player.volume=MAX(0,MIN(1,self.panVolume+change));
    }
}
- (void)enterFullscreenVertical:(BOOL)vertical {
    if(self.fullscreenController||self.presentedViewController)return;
    self.fullscreen=YES;self.verticalFullscreen=vertical;
    LMFullscreenVideoController *controller=[LMFullscreenVideoController new];controller.owner=self;
    controller.modalPresentationStyle=UIModalPresentationFullScreen;
    self.fullscreenController=controller;
    // Reparent the existing layer and controls; never recreate AVPlayer or seek.
    [self presentViewController:controller animated:NO completion:^{[controller.view setNeedsLayout];[controller.view layoutIfNeeded];}];
}
- (void)toggleFullscreen {if(self.fullscreenController)[self exitFullscreen];else[self enterFullscreenVertical:NO];}
- (void)toggleVerticalFullscreen {if(self.fullscreenController)[self exitFullscreen];else[self enterFullscreenVertical:YES];}
- (void)exitFullscreen {
    LMFullscreenVideoController *controller=self.fullscreenController;if(!controller)return;
    [controller dismissViewControllerAnimated:NO completion:^{[self restoreInlineAfterFullscreen:controller];}];
}
- (void)restoreInlineAfterFullscreen:(LMFullscreenVideoController *)controller {
    if(self.fullscreenController!=controller)return;
    self.fullscreenController=nil;self.fullscreen=NO;self.verticalFullscreen=NO;
    self.surface.transform=CGAffineTransformIdentity;[self.view insertSubview:self.surface atIndex:0];
    self.controlsVisible=YES;self.topBar.hidden=NO;self.bottomBar.hidden=NO;
    [self.view setNeedsLayout];[self.view layoutIfNeeded];[self resetControlsTimer];
    if(UIDevice.currentDevice.userInterfaceIdiom==UIUserInterfaceIdiomPhone)LMRequestVideoOrientation(self,NO);
}
- (UIViewController *)controlPresenter {return self.fullscreenController?:self;}
- (void)startPictureInPicture {if(self.pip.pictureInPicturePossible)[self.pip startPictureInPicture];}
- (UIButton *)panelButton:(NSString *)title tag:(NSInteger)tag action:(SEL)action {
    UIButton *button=[UIButton buttonWithType:UIButtonTypeSystem];[button setTitle:title forState:UIControlStateNormal];button.tintColor=UIColor.whiteColor;
    button.titleLabel.font=[UIFont systemFontOfSize:14];button.backgroundColor=[UIColor colorWithWhite:0.22 alpha:1];button.layer.cornerRadius=5;button.tag=tag;
    [button addTarget:self action:action forControlEvents:UIControlEventTouchUpInside];[self.moreScroll addSubview:button];return button;
}
- (void)more:(UIButton *)sender {
    if(!self.morePanel){
        self.morePanel=[UIView new];self.morePanel.backgroundColor=[UIColor colorWithWhite:0.08 alpha:0.97];self.morePanel.hidden=YES;[self.surface addSubview:self.morePanel];
        self.moreScroll=[UIScrollView new];[self.morePanel addSubview:self.moreScroll];
        UILabel *title=[UILabel new];title.text=@"播放设置";title.textColor=UIColor.whiteColor;title.font=[UIFont boldSystemFontOfSize:16];title.frame=CGRectMake(16,8,180,36);[self.moreScroll addSubview:title];
        UIButton *close=[self panelButton:@"关闭" tag:0 action:@selector(closeMore)];close.frame=CGRectMake(238,8,60,36);
        UILabel *rate=[UILabel new];rate.text=@"播放速度";rate.textColor=UIColor.whiteColor;rate.frame=CGRectMake(16,50,240,26);[self.moreScroll addSubview:rate];
        NSArray *rates=@[@0.25,@0.5,@0.75,@1,@1.25,@1.5,@1.75,@2];
        for(NSInteger n=0;n<rates.count;n++){UIButton *button=[self panelButton:[NSString stringWithFormat:@"%@×",rates[n]] tag:n action:@selector(chooseRate:)];button.frame=CGRectMake(12+(n%4)*74,82+(n/4)*40,66,34);}
        UILabel *aspect=[UILabel new];aspect.text=@"画面比例";aspect.textColor=UIColor.whiteColor;aspect.frame=CGRectMake(16,169,240,26);[self.moreScroll addSubview:aspect];
        NSArray *modes=@[@"适应",@"填充",@"拉伸"];
        for(NSInteger n=0;n<modes.count;n++){UIButton *button=[self panelButton:modes[n] tag:n action:@selector(chooseAspect:)];button.frame=CGRectMake(12+n*99,204,90,34);}
        UIButton *capture=[self panelButton:@"截图" tag:0 action:@selector(captureFrame)];capture.frame=CGRectMake(12,252,138,38);
        UIButton *pip=[self panelButton:@"画中画" tag:0 action:@selector(startPictureInPicture)];pip.frame=CGRectMake(160,252,138,38);
        self.moreScroll.contentSize=CGSizeMake(310,306);
    }
    self.morePanel.hidden=!self.morePanel.hidden;
    self.controlsVisible=self.morePanel.hidden;self.topBar.hidden=!self.controlsVisible;self.bottomBar.hidden=!self.controlsVisible;
    [self.hideControlsTimer invalidate];
    if(self.morePanel.hidden)[self resetControlsTimer];
    if(self.fullscreenController)[self.fullscreenController.view setNeedsLayout];else[self.view setNeedsLayout];
}
- (void)closeMore {self.morePanel.hidden=YES;self.controlsVisible=YES;self.topBar.hidden=NO;self.bottomBar.hidden=NO;[self resetControlsTimer];}
- (void)chooseRate:(UIButton *)sender {NSArray *rates=@[@0.25,@0.5,@0.75,@1,@1.25,@1.5,@1.75,@2];self.playbackRate=[rates[sender.tag] floatValue];if(self.player.rate!=0)self.player.rate=self.playbackRate;[self closeMore];}
- (void)chooseAspect:(UIButton *)sender {
    NSArray *modes=@[AVLayerVideoGravityResizeAspect,AVLayerVideoGravityResizeAspectFill,AVLayerVideoGravityResize];
    if(sender.tag<0||sender.tag>=modes.count)return;
    [self closeMore];
    AVPlayerLayer *video=self.surface.playerLayer;NSString *gravity=modes[sender.tag];
    if(![video.videoGravity isEqualToString:gravity]){
        [CATransaction begin];[CATransaction setDisableActions:YES];video.videoGravity=gravity;[CATransaction commit];
    }
}
- (void)ended:(NSNotification *)note {if(note.object==self.player.currentItem){[self.playButton setImage:LMPlayerImage(@"CLPlay",@"play.fill") forState:UIControlStateNormal];}}
- (void)captureFrame {
    AVAsset *asset=self.player.currentItem.asset;CMTime time=self.player.currentTime;LMItem *item=self.items[self.index];
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED,0), ^{@autoreleasepool{
        AVAssetImageGenerator *generator=[AVAssetImageGenerator assetImageGeneratorWithAsset:asset];generator.appliesPreferredTrackTransform=YES;
        CGImageRef cg=[generator copyCGImageAtTime:time actualTime:NULL error:NULL];BOOL success=NO;
        if(cg){NSData *png=UIImagePNGRepresentation([UIImage imageWithCGImage:cg]);CGImageRelease(cg);
            NSArray<NSString *> *components=item.URL.pathComponents;NSUInteger slot=NSNotFound;
            for(NSUInteger n=0;n<components.count;n++)if([components[n].lowercaseString isEqualToString:@"records"]){slot=n;break;}
            NSURL *directory=nil;
            if(slot!=NSNotFound&&slot+1<components.count){NSMutableArray *target=[components mutableCopy];[target removeObjectsInRange:NSMakeRange(slot+2,target.count-slot-2)];
                target[slot]=[components[slot] isEqualToString:@"Records"]?@"Snapshots":@"images";directory=[NSURL fileURLWithPath:[NSString pathWithComponents:target] isDirectory:YES];}
            if(!directory)directory=[LMRoots().firstObject URLByAppendingPathComponent:@"images/Replay" isDirectory:YES];
            if(directory&&LMSafeFile(directory)&&png){[NSFileManager.defaultManager createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:NULL];
                NSString *name=[NSString stringWithFormat:@"%@.png",NSUUID.UUID.UUIDString];NSURL *destination=[directory URLByAppendingPathComponent:name];
                success=[png writeToURL:destination options:NSDataWritingWithoutOverwriting error:NULL];}
        }
        dispatch_async(dispatch_get_main_queue(), ^{if(![self controlPresenter].view.window)return;UIAlertController *alert=[UIAlertController alertControllerWithTitle:success?@"已保存到截图":@"截图未成功" message:nil preferredStyle:UIAlertControllerStyleAlert];[alert addAction:[UIAlertAction actionWithTitle:@"好" style:UIAlertActionStyleDefault handler:nil]];[[self controlPresenter] presentViewController:alert animated:YES completion:nil];});
    }});
}
- (void)close {
    if(self.fullscreenController){[self exitFullscreen];return;}
    if(self.pip.pictureInPictureActive)LMPictureInPictureOwner=self;else[self clearPlayer];
    if(self.navigationController.viewControllers.count>1)[self.navigationController popViewControllerAnimated:YES];
    else if(self.navigationController.presentingViewController)[self.navigationController dismissViewControllerAnimated:YES completion:nil];
    else[self dismissViewControllerAnimated:YES completion:nil];
}
- (NSInteger)numberOfSectionsInCollectionView:(UICollectionView *)view {return self.groups.count;}
- (NSInteger)collectionView:(UICollectionView *)view numberOfItemsInSection:(NSInteger)section {
    LMGroup *group=self.groups[section];return [self.expanded containsObject:group.identifier]?group.items.count:0;
}
- (UICollectionViewCell *)collectionView:(UICollectionView *)view cellForItemAtIndexPath:(NSIndexPath *)path {
    LMGridCell *cell=[view dequeueReusableCellWithReuseIdentifier:@"playlist" forIndexPath:path];LMItem *item=self.groups[path.section].items[path.item];
    BOOL playing=self.index>=0&&self.index<self.items.count&&[item.URL.path isEqualToString:self.items[self.index].URL.path];
    BOOL sameFile=[cell.representedPath isEqualToString:item.URL.path];
    cell.representedPath=item.URL.path;cell.nameLabel.text=item.name;cell.nameLabel.textColor=playing?self.view.tintColor:UIColor.labelColor;
    cell.selectionLabel.hidden=!playing;cell.selectionLabel.text=@"▶";
    static NSDateFormatter *date;static dispatch_once_t once;dispatch_once(&once,^{date=[NSDateFormatter new];date.dateFormat=@"yyyy-MM-dd HH:mm:ss";});cell.dateLabel.text=[date stringFromDate:item.modifiedDate];
    if(!sameFile)cell.image.image=[UIImage systemImageNamed:@"play.rectangle"];__weak LMGridCell *weak=cell;NSString *represented=item.URL.path;
    [[LMThumbnailStore shared] imageForItem:item completion:^(UIImage *thumbnail){if([weak.representedPath isEqualToString:represented]&&thumbnail)weak.image.image=thumbnail;}];return cell;
}
- (UICollectionReusableView *)collectionView:(UICollectionView *)view viewForSupplementaryElementOfKind:(NSString *)kind atIndexPath:(NSIndexPath *)path {
    LMFolderHeader *header=[view dequeueReusableSupplementaryViewOfKind:kind withReuseIdentifier:@"folder" forIndexPath:path];LMGroup *group=self.groups[path.section];
    header.icon.image=[UIImage systemImageNamed:@"folder.fill.badge.play"]?:[UIImage systemImageNamed:@"folder.fill"];
    header.nameLabel.text=group.title;header.platformLabel.text=group.platform;header.countLabel.text=[NSString stringWithFormat:@"%lu个视频",(unsigned long)group.items.count];
    BOOL open=[self.expanded containsObject:group.identifier];header.arrow.text=open?@"▾":@"▸";
    header.hit.accessibilityLabel=[NSString stringWithFormat:@"%@，%@，%@",group.title,header.countLabel.text,open?@"收起":@"展开"];
    __weak typeof(self) weak=self;__weak LMFolderHeader *weakHeader=header;NSString *identifier=group.identifier;[header setNeedsLayout];header.tapped=^{LMPlaybackController *s=weak;if(!s)return;
        LMToggleFolder(s.playlist,s.groups,s.expanded,identifier,weakHeader,^{if(s.expandedDidChange)s.expandedDidChange([s.expanded copy]);});};return header;
}
- (CGSize)collectionView:(UICollectionView *)view layout:(UICollectionViewLayout *)layout referenceSizeForHeaderInSection:(NSInteger)section {return CGSizeMake(view.bounds.size.width,LMFolderHeaderHeight(self.groups[section].title,view.bounds.size.width));}
- (CGSize)collectionView:(UICollectionView *)view layout:(UICollectionViewLayout *)layout sizeForItemAtIndexPath:(NSIndexPath *)path {
    NSInteger columns=2;if(UIDevice.currentDevice.userInterfaceIdiom==UIUserInterfaceIdiomPad)columns=view.bounds.size.width>800?6:4;
    CGFloat width=floor((view.bounds.size.width-(columns+1)*5)/columns);return CGSizeMake(width,width*1.06);
}
- (void)collectionView:(UICollectionView *)view didSelectItemAtIndexPath:(NSIndexPath *)path {
    LMItem *item=self.groups[path.section].items[path.item];NSUInteger index=[self.items indexOfObjectIdenticalTo:item];if(index!=NSNotFound)[self openIndex:index];
}
- (void)pictureInPictureControllerDidStartPictureInPicture:(AVPictureInPictureController *)controller {LMPictureInPictureOwner=self;}
- (void)pictureInPictureControllerDidStopPictureInPicture:(AVPictureInPictureController *)controller {
    if(!self.view.window)[self clearPlayer];if(LMPictureInPictureOwner==self)LMPictureInPictureOwner=nil;
}
- (void)pictureInPictureController:(AVPictureInPictureController *)controller restoreUserInterfaceForPictureInPictureStopWithCompletionHandler:(void (^)(BOOL))completion {
    if(self.view.window||self.fullscreenController.view.window){completion(YES);return;}
    UIViewController *presenter=nil;
    for(UIScene *scene in UIApplication.sharedApplication.connectedScenes)if([scene isKindOfClass:UIWindowScene.class]&&scene.activationState==UISceneActivationStateForegroundActive)
        for(UIWindow *window in ((UIWindowScene *)scene).windows)if(window.isKeyWindow)presenter=window.rootViewController;
    while(presenter.presentedViewController)presenter=presenter.presentedViewController;
    if(presenter){UINavigationController *navigation=[[UINavigationController alloc] initWithRootViewController:self];navigation.modalPresentationStyle=UIModalPresentationFullScreen;[presenter presentViewController:navigation animated:YES completion:^{completion(YES);}];}else completion(NO);
}
- (void)dealloc {[[NSNotificationCenter defaultCenter] removeObserver:self];[self.hideControlsTimer invalidate];[self clearPlayer];}
@end

@interface LMPhotoController : UIPageViewController <UIPageViewControllerDataSource,UIPageViewControllerDelegate>
@property(nonatomic,strong) NSArray<LMItem *> *items;
@property(nonatomic) NSInteger index;
@property(nonatomic,strong) UILabel *counter;
@end
@interface LMPhotoPage : UIViewController <UIScrollViewDelegate>
@property(nonatomic,strong) LMItem *item;
@property(nonatomic,strong) UIScrollView *scroll;
@property(nonatomic,strong) UIImageView *image;
@property(nonatomic) NSInteger index;
@end
@implementation LMPhotoPage
- (void)viewDidLoad {
    [super viewDidLoad];self.view.backgroundColor=UIColor.systemBackgroundColor;self.scroll=[UIScrollView new];self.scroll.delegate=self;self.scroll.maximumZoomScale=5;
    self.image=[UIImageView new];self.image.contentMode=UIViewContentModeScaleAspectFit;[self.scroll addSubview:self.image];[self.view addSubview:self.scroll];
    NSURL *url=self.item.URL;__weak typeof(self) weak=self;
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED,0), ^{@autoreleasepool{UIImage *image=nil;
        CGImageSourceRef source=LMSafeFile(url)?CGImageSourceCreateWithURL((__bridge CFURLRef)url,NULL):NULL;
        if(source){NSDictionary *options=@{(id)kCGImageSourceCreateThumbnailFromImageAlways:@YES,(id)kCGImageSourceThumbnailMaxPixelSize:@4096,(id)kCGImageSourceCreateThumbnailWithTransform:@YES};
            CGImageRef cg=CGImageSourceCreateThumbnailAtIndex(source,0,(__bridge CFDictionaryRef)options);if(cg){image=[UIImage imageWithCGImage:cg];CGImageRelease(cg);}CFRelease(source);}
        dispatch_async(dispatch_get_main_queue(), ^{weak.image.image=image;});
    }});
    UITapGestureRecognizer *tap=[[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(zoom:)];tap.numberOfTapsRequired=2;[self.view addGestureRecognizer:tap];
}
- (void)viewDidLayoutSubviews {[super viewDidLayoutSubviews];if(self.scroll.zoomScale==1){self.scroll.frame=self.view.bounds;self.image.frame=self.scroll.bounds;self.scroll.contentSize=self.scroll.bounds.size;}}
- (UIView *)viewForZoomingInScrollView:(UIScrollView *)scrollView{return self.image;}
- (void)zoom:(UITapGestureRecognizer *)tap {[self.scroll setZoomScale:self.scroll.zoomScale>1?1:2.5 animated:YES];}
@end
@implementation LMPhotoController
- (LMPhotoPage *)page:(NSInteger)index {if(index<0||index>=self.items.count)return nil;LMPhotoPage *page=[LMPhotoPage new];page.item=self.items[index];page.index=index;return page;}
- (void)viewDidLoad {
    [super viewDidLoad];self.view.backgroundColor=UIColor.systemBackgroundColor;self.dataSource=self;self.delegate=self;
    [self setViewControllers:@[[self page:self.index]] direction:UIPageViewControllerNavigationDirectionForward animated:NO completion:nil];
    UIButton *back=[UIButton buttonWithType:UIButtonTypeSystem];[back setImage:LMPlayerImage(@"CLBack",@"chevron.left") forState:UIControlStateNormal];
    back.accessibilityLabel=@"返回";[back addTarget:self action:@selector(close) forControlEvents:UIControlEventTouchUpInside];back.tag=90;[self.view addSubview:back];
    self.counter=[UILabel new];self.counter.textColor=UIColor.labelColor;self.counter.textAlignment=NSTextAlignmentCenter;self.counter.font=[UIFont systemFontOfSize:14];[self.view addSubview:self.counter];[self updateCounter];
}
- (void)viewDidLayoutSubviews {[super viewDidLayoutSubviews];CGFloat y=self.view.safeAreaInsets.top;[self.view viewWithTag:90].frame=CGRectMake(8,y,44,44);self.counter.frame=CGRectMake(60,y,self.view.bounds.size.width-120,44);}
- (void)updateCounter {self.counter.text=[NSString stringWithFormat:@"%ld / %lu",(long)self.index+1,(unsigned long)self.items.count];}
- (UIViewController *)pageViewController:(UIPageViewController *)p viewControllerBeforeViewController:(LMPhotoPage *)page{return [self page:page.index-1];}
- (UIViewController *)pageViewController:(UIPageViewController *)p viewControllerAfterViewController:(LMPhotoPage *)page{return [self page:page.index+1];}
- (void)pageViewController:(UIPageViewController *)p didFinishAnimating:(BOOL)finished previousViewControllers:(NSArray *)previous transitionCompleted:(BOOL)completed {if(completed){self.index=((LMPhotoPage *)p.viewControllers.firstObject).index;[self updateCounter];}}
- (void)close {[self dismissViewControllerAnimated:NO completion:nil];}
@end

@interface LMGridController : UIViewController <UICollectionViewDataSource,UICollectionViewDelegate,UICollectionViewDelegateFlowLayout>
@property(nonatomic,strong) UICollectionView *collectionView;
@property(nonatomic,strong) UIView *selectionBar;
@property(nonatomic,strong) UIStackView *selectionActions;
@property(nonatomic,strong) UIButton *allButton,*invertButton,*shareButton,*deleteButton;
@property(nonatomic) BOOL video,selecting;
@property(nonatomic,strong) NSArray<LMGroup *> *groups;
@property(nonatomic,strong) NSMutableSet<NSString *> *expanded,*selected;
@property(nonatomic,copy) NSSet<NSString *> *expandedBeforeSelection;
@property(nonatomic) CGPoint offsetBeforeSelection;
@property(nonatomic) BOOL cancelSelectionPending;
@property(nonatomic,strong) NSOperationQueue *scanQueue;
@property(nonatomic) NSUInteger refreshGeneration;
@property(nonatomic) BOOL scanInFlight,refreshRequested;
@property(nonatomic,strong) NSArray *mediaSignature;
@property(nonatomic,strong) UILabel *emptyLabel;
@property(nonatomic,weak) UIViewController *activeViewer;
- (void)refreshMedia;
@end
@implementation LMGridController
- (void)viewDidLoad {
    [super viewDidLoad];self.title=self.video?@"录像记录":@"截图记录";self.overrideUserInterfaceStyle=UIUserInterfaceStyleUnspecified;
    self.edgesForExtendedLayout=UIRectEdgeNone;self.view.backgroundColor=UIColor.systemBackgroundColor;
    UICollectionViewFlowLayout *layout=[UICollectionViewFlowLayout new];layout.minimumInteritemSpacing=5;layout.minimumLineSpacing=5;layout.sectionInset=UIEdgeInsetsMake(0,5,0,5);layout.sectionHeadersPinToVisibleBounds=YES;
    self.collectionView=[[UICollectionView alloc] initWithFrame:CGRectZero collectionViewLayout:layout];self.collectionView.dataSource=self;self.collectionView.delegate=self;self.collectionView.contentInsetAdjustmentBehavior=UIScrollViewContentInsetAdjustmentNever;[self.view addSubview:self.collectionView];
    self.groups=@[];self.expanded=[NSMutableSet set];self.selected=[NSMutableSet set];self.scanQueue=[NSOperationQueue new];self.scanQueue.maxConcurrentOperationCount=1;
    self.scanQueue.qualityOfService=NSQualityOfServiceUserInitiated;self.collectionView.backgroundColor=UIColor.systemBackgroundColor;self.collectionView.alwaysBounceVertical=YES;
    [self.collectionView registerClass:LMGridCell.class forCellWithReuseIdentifier:@"file"];
    [self.collectionView registerClass:LMFolderHeader.class forSupplementaryViewOfKind:UICollectionElementKindSectionHeader withReuseIdentifier:@"folder"];
    self.emptyLabel=[UILabel new];self.emptyLabel.text=self.video?@"暂无录像":@"暂无截图";self.emptyLabel.textColor=UIColor.secondaryLabelColor;self.emptyLabel.textAlignment=NSTextAlignmentCenter;
    self.collectionView.backgroundView=self.emptyLabel;
    UIRefreshControl *refresh=[UIRefreshControl new];[refresh addTarget:self action:@selector(refreshMedia) forControlEvents:UIControlEventValueChanged];self.collectionView.refreshControl=refresh;
    self.navigationItem.rightBarButtonItem=[[UIBarButtonItem alloc] initWithTitle:@"选择" style:UIBarButtonItemStylePlain target:self action:@selector(toggleSelection)];
    self.selectionBar=[UIView new];self.selectionBar.backgroundColor=UIColor.systemBackgroundColor;self.selectionBar.hidden=YES;[self.view addSubview:self.selectionBar];
    self.allButton=[UIButton buttonWithType:UIButtonTypeSystem];[self.allButton setTitle:@"全选" forState:UIControlStateNormal];[self.allButton addTarget:self action:@selector(selectAll) forControlEvents:UIControlEventTouchUpInside];
    self.invertButton=[UIButton buttonWithType:UIButtonTypeSystem];[self.invertButton setTitle:@"反选" forState:UIControlStateNormal];[self.invertButton addTarget:self action:@selector(invertSelection) forControlEvents:UIControlEventTouchUpInside];
    self.shareButton=[UIButton buttonWithType:UIButtonTypeSystem];[self.shareButton setTitle:@"分享" forState:UIControlStateNormal];[self.shareButton addTarget:self action:@selector(shareSelected:) forControlEvents:UIControlEventTouchUpInside];
    self.deleteButton=[UIButton buttonWithType:UIButtonTypeSystem];[self.deleteButton setTitle:@"删除" forState:UIControlStateNormal];self.deleteButton.tintColor=UIColor.systemRedColor;[self.deleteButton addTarget:self action:@selector(deleteSelected:) forControlEvents:UIControlEventTouchUpInside];
    for(UIButton *button in @[self.allButton,self.invertButton,self.shareButton,self.deleteButton])button.titleLabel.font=[UIFont systemFontOfSize:14];
    self.selectionActions=[[UIStackView alloc] initWithArrangedSubviews:@[self.allButton,self.invertButton,self.shareButton,self.deleteButton]];self.selectionActions.distribution=UIStackViewDistributionFillEqually;[self.selectionBar addSubview:self.selectionActions];
    UIView *line=[UIView new];line.tag=901;line.backgroundColor=UIColor.separatorColor;[self.selectionBar addSubview:line];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(folderUpdateEnded:) name:@"IPlayerFolderUpdateEnded" object:self.collectionView];
    [self updateSelectionActions];
}
- (void)viewWillAppear:(BOOL)animated {[super viewWillAppear:animated];[self.navigationController setNavigationBarHidden:NO animated:animated];[self.navigationController setToolbarHidden:YES animated:NO];[self refreshMedia];}
- (void)viewDidLayoutSubviews {
    [super viewDidLayoutSubviews];CGRect bounds=self.view.bounds;
    // The child uses the host's full bounds. UIKit owns the tab/navigation
    // safe areas; account for the bottom inset once, inside the page.
    CGFloat bottom=MAX(0,self.view.safeAreaInsets.bottom);
    LMSelectionGeometry g=LMSelectionGeometryMake(bounds.size.height,bounds.size.height-bottom,self.selecting);
    CGSize old=self.collectionView.bounds.size;
    LMSetFrame(self.collectionView,CGRectMake(0,0,bounds.size.width,g.contentHeight));
    UIEdgeInsets inset=UIEdgeInsetsMake(0,0,self.selecting?0:bottom,0);
    if(!UIEdgeInsetsEqualToEdgeInsets(self.collectionView.contentInset,inset)){
        self.collectionView.contentInset=inset;self.collectionView.verticalScrollIndicatorInsets=inset;
    }
    LMSetFrame(self.selectionBar,CGRectMake(0,g.barY,bounds.size.width,g.barHeight));
    LMSetFrame(self.selectionActions,CGRectMake(0,0,bounds.size.width,g.buttonHeight));
    LMSetFrame([self.selectionBar viewWithTag:901],CGRectMake(0,0,bounds.size.width,0.5));
    if(!CGSizeEqualToSize(old,self.collectionView.bounds.size))[self.collectionView.collectionViewLayout invalidateLayout];
}
- (void)viewSafeAreaInsetsDidChange {[super viewSafeAreaInsetsDidChange];[self.view setNeedsLayout];}
- (NSMutableSet<NSString *> *)allMediaPaths {
    NSMutableSet *paths=[NSMutableSet set];
    for(LMGroup *group in self.groups)for(LMItem *item in group.items)if(item.URL.path.length)[paths addObject:item.URL.path];
    return paths;
}
- (void)updateSelectionActions {
    NSSet *all=[self allMediaPaths];BOOL any=self.selected.count>0;
    BOOL complete=all.count>0&&[all isSubsetOfSet:self.selected];
    [self.allButton setTitle:complete?@"取消全选":@"全选" forState:UIControlStateNormal];
    self.allButton.enabled=all.count>0;self.invertButton.enabled=all.count>0;
    self.shareButton.enabled=any;self.deleteButton.enabled=any;self.selectionBar.hidden=!self.selecting;
    self.navigationItem.title=self.selecting?[NSString stringWithFormat:@"已选择 %lu 项",(unsigned long)self.selected.count]:(self.video?@"录像记录":@"截图记录");
}
- (void)updateVisibleSelectionCells {
    for(NSIndexPath *path in self.collectionView.indexPathsForVisibleItems){
        if(path.section>=self.groups.count||path.item>=self.groups[path.section].items.count)continue;
        LMGridCell *cell=(LMGridCell *)[self.collectionView cellForItemAtIndexPath:path];LMItem *item=self.groups[path.section].items[path.item];
        cell.selectionLabel.hidden=!self.selecting;cell.selectionLabel.text=[self.selected containsObject:item.URL.path]?@"✓":@"○";
    }
}
- (void)folderUpdateEnded:(NSNotification *)notification {
    if(self.cancelSelectionPending){self.cancelSelectionPending=NO;[self toggleSelection];}
    if(self.refreshRequested&&!self.scanInFlight){self.refreshRequested=NO;[self refreshMedia];}
}

- (void)traitCollectionDidChange:(UITraitCollection *)previous {
    [super traitCollectionDidChange:previous];
    // A full-screen presentation can be reparented above the SwiftUI host.
    // Carry changes from that host into the viewer while it is presented.
    self.activeViewer.overrideUserInterfaceStyle=self.traitCollection.userInterfaceStyle;
    if(self.activeViewer.isViewLoaded)self.activeViewer.view.tintColor=self.view.tintColor;
}
- (void)refreshMedia {
    if(!self.isViewLoaded)return;
    if(self.scanInFlight){self.refreshRequested=YES;return;}
    self.scanInFlight=YES;NSUInteger generation=++self.refreshGeneration;BOOL video=self.video;NSArray *roots=LMRoots();__weak typeof(self) weak=self;
    [self.scanQueue addOperationWithBlock:^{
        NSArray *groups=[LMLibrary groupsForVideo:video roots:roots];
        NSMutableArray *signature=[NSMutableArray array];
        for(LMGroup *g in groups){[signature addObject:@[g.identifier?:@"",g.title?:@"",g.platform?:@""]];
            for(LMItem *i in g.items)[signature addObject:@[i.URL.path?:@"",i.name?:@"",i.modifiedDate?:NSDate.distantPast,@(i.byteSize),@(i.video)]];}
        dispatch_async(dispatch_get_main_queue(), ^{
            LMGridController *s=weak;if(!s||generation!=s.refreshGeneration)return;
            s.scanInFlight=NO;[s.collectionView.refreshControl endRefreshing];
            if(![s.mediaSignature isEqual:signature]){
                if(!s.collectionView.userInteractionEnabled){s.refreshRequested=YES;return;}
                s.groups=groups;s.mediaSignature=signature;
                NSMutableSet *valid=[NSMutableSet set];for(LMGroup *g in groups)for(LMItem *i in g.items)[valid addObject:i.URL.path];
                [s.selected intersectSet:valid];[s updateSelectionActions];s.emptyLabel.hidden=groups.count>0;
                [UIView performWithoutAnimation:^{[s.collectionView reloadData];}];
            }
            if(s.refreshRequested){s.refreshRequested=NO;[s refreshMedia];}
        });
    }];
}
- (NSInteger)numberOfSectionsInCollectionView:(UICollectionView *)collectionView {return self.groups.count;}
- (NSInteger)collectionView:(UICollectionView *)collectionView numberOfItemsInSection:(NSInteger)section {LMGroup *g=self.groups[section];return [self.expanded containsObject:g.identifier]?g.items.count:0;}
- (UICollectionViewCell *)collectionView:(UICollectionView *)collectionView cellForItemAtIndexPath:(NSIndexPath *)path {
    LMGridCell *cell=[collectionView dequeueReusableCellWithReuseIdentifier:@"file" forIndexPath:path];LMItem *item=self.groups[path.section].items[path.item];
    BOOL sameFile=[cell.representedPath isEqualToString:item.URL.path];
    cell.representedPath=item.URL.path;cell.nameLabel.text=item.name;cell.selectionLabel.hidden=!self.selecting;cell.selectionLabel.text=[self.selected containsObject:item.URL.path]?@"✓":@"○";
    static NSDateFormatter *date;static dispatch_once_t once;dispatch_once(&once,^{date=[NSDateFormatter new];date.dateFormat=@"yyyy-MM-dd HH:mm:ss";});cell.dateLabel.text=[date stringFromDate:item.modifiedDate];
    if(!sameFile)cell.image.image=[UIImage systemImageNamed:self.video?@"play.rectangle":@"photo"];
    __weak LMGridCell *weak=cell;NSString *filePath=item.URL.path;
    [[LMThumbnailStore shared] imageForItem:item completion:^(UIImage *image){if([weak.representedPath isEqualToString:filePath]&&image)weak.image.image=image;}];return cell;
}
- (UICollectionReusableView *)collectionView:(UICollectionView *)collectionView viewForSupplementaryElementOfKind:(NSString *)kind atIndexPath:(NSIndexPath *)path {
    LMFolderHeader *header=[collectionView dequeueReusableSupplementaryViewOfKind:kind withReuseIdentifier:@"folder" forIndexPath:path];LMGroup *group=self.groups[path.section];
    header.icon.image=[UIImage systemImageNamed:self.video?@"folder.fill.badge.play":@"folder.fill"];
    if(!header.icon.image)header.icon.image=[UIImage systemImageNamed:@"folder.fill"];
    header.nameLabel.text=group.title;header.platformLabel.text=group.platform;
    header.countLabel.text=[NSString stringWithFormat:@"%lu个%@",(unsigned long)group.items.count,self.video?@"视频":@"图片"];
    BOOL open=[self.expanded containsObject:group.identifier];header.arrow.text=open?@"▾":@"▸";
    header.hit.accessibilityLabel=[NSString stringWithFormat:@"%@，%@，%@",group.title,header.countLabel.text,open?@"收起":@"展开"];
    __weak typeof(self) weak=self;__weak LMFolderHeader *weakHeader=header;NSString *identifier=group.identifier;[header setNeedsLayout];header.tapped=^{LMGridController *s=weak;if(!s)return;
        LMToggleFolder(s.collectionView,s.groups,s.expanded,identifier,weakHeader,nil);};return header;
}
- (CGSize)collectionView:(UICollectionView *)cv layout:(UICollectionViewLayout *)layout sizeForItemAtIndexPath:(NSIndexPath *)path {
    CGFloat width=cv.bounds.size.width;NSInteger columns=2;if(UIDevice.currentDevice.userInterfaceIdiom==UIUserInterfaceIdiomPad)columns=width>800?6:4;
    CGFloat w=floor((width-(columns+1)*5)/columns);return CGSizeMake(w,w*1.06);
}
- (CGSize)collectionView:(UICollectionView *)cv layout:(UICollectionViewLayout *)layout referenceSizeForHeaderInSection:(NSInteger)section {return CGSizeMake(cv.bounds.size.width,LMFolderHeaderHeight(self.groups[section].title,cv.bounds.size.width));}
- (void)collectionView:(UICollectionView *)cv didSelectItemAtIndexPath:(NSIndexPath *)path {
    LMGroup *group=self.groups[path.section];LMItem *item=group.items[path.item];
    if(self.selecting){if([self.selected containsObject:item.URL.path])[self.selected removeObject:item.URL.path];else[self.selected addObject:item.URL.path];[self updateSelectionActions];[cv reloadItemsAtIndexPaths:@[path]];return;}
    if(self.video){
        // Keep all recording groups available below the pinned video surface,
        // including folders containing only one recording. Switching a file
        // stays in this player instead of opening a single-item detail screen.
        NSMutableArray<LMItem *> *items=[NSMutableArray array];for(LMGroup *g in self.groups)[items addObjectsFromArray:g.items];
        NSUInteger index=[items indexOfObjectIdenticalTo:item];if(index==NSNotFound)return;
        LMPlaybackController *player=[LMPlaybackController new];player.groups=self.groups;player.items=items;player.index=index;player.expanded=[self.expanded mutableCopy];
        __weak typeof(self) weak=self;player.expandedDidChange=^(NSSet<NSString *> *expanded){weak.expanded=[expanded mutableCopy];};
        player.overrideUserInterfaceStyle=self.traitCollection.userInterfaceStyle;player.view.tintColor=self.view.tintColor;
        self.activeViewer=player;
        UINavigationController *navigation=[[UINavigationController alloc] initWithRootViewController:player];
        navigation.modalPresentationStyle=UIModalPresentationFullScreen;navigation.navigationBarHidden=YES;
        [self presentViewController:navigation animated:YES completion:nil];
    }
    else {LMPhotoController *photos=[[LMPhotoController alloc] initWithTransitionStyle:UIPageViewControllerTransitionStyleScroll navigationOrientation:UIPageViewControllerNavigationOrientationHorizontal options:nil];photos.items=group.items;photos.index=path.item;photos.overrideUserInterfaceStyle=self.traitCollection.userInterfaceStyle;photos.view.tintColor=self.view.tintColor;self.activeViewer=photos;photos.modalPresentationStyle=UIModalPresentationFullScreen;[self presentViewController:photos animated:NO completion:nil];}
}
- (void)toggleSelection {
    if(self.selecting&&!self.collectionView.userInteractionEnabled){self.cancelSelectionPending=YES;return;}
    BOOL leaving=self.selecting;
    if(leaving){
        self.selecting=NO;[self.selected removeAllObjects];
        self.expanded=[self.expandedBeforeSelection mutableCopy]?:[NSMutableSet set];self.expandedBeforeSelection=nil;
    }else{
        self.expandedBeforeSelection=[self.expanded copy];self.offsetBeforeSelection=self.collectionView.contentOffset;
        [self.selected removeAllObjects];self.selecting=YES;
    }
    self.navigationItem.rightBarButtonItem.title=self.selecting?@"取消":@"选择";
    [self updateSelectionActions];[self applySelectionLayoutRestoringOffset:leaving];
}
- (void)applySelectionLayoutRestoringOffset:(BOOL)restore {
    [UIView performWithoutAnimation:^{
        [self.view setNeedsLayout];[self.view layoutIfNeeded];
        if(restore){
            [self.collectionView reloadData];[self.collectionView layoutIfNeeded];
            CGFloat minimum=-self.collectionView.adjustedContentInset.top;
            CGFloat maximum=MAX(minimum,self.collectionView.contentSize.height-self.collectionView.bounds.size.height+self.collectionView.adjustedContentInset.bottom);
            [self.collectionView setContentOffset:CGPointMake(self.offsetBeforeSelection.x,MIN(maximum,MAX(minimum,self.offsetBeforeSelection.y))) animated:NO];
        }else [self updateVisibleSelectionCells];
    }];
}
- (void)selectAll {
    if(!self.selecting)return;NSSet *all=[self allMediaPaths];
    if(all.count&&[all isSubsetOfSet:self.selected])[self.selected removeAllObjects];else[self.selected setSet:all];
    // Selecting files never changes which folders are expanded.
    [self updateSelectionActions];[self updateVisibleSelectionCells];
}
- (void)invertSelection {
    if(!self.selecting)return;NSMutableSet *inverse=[self allMediaPaths];
    [inverse minusSet:self.selected];[self.selected setSet:inverse];
    [self updateSelectionActions];[self updateVisibleSelectionCells];
}
- (NSArray<NSURL *> *)selectedURLs {
    NSMutableArray *urls=[NSMutableArray array];for(LMGroup *g in self.groups)for(LMItem *i in g.items)if([self.selected containsObject:i.URL.path]&&LMExistingFile(i.URL))[urls addObject:i.URL];return urls;
}
- (void)shareSelected:(UIButton *)sender {
    NSArray *urls=[self selectedURLs];if(!urls.count)return;UIActivityViewController *share=[[UIActivityViewController alloc] initWithActivityItems:urls applicationActivities:nil];
    share.popoverPresentationController.sourceView=sender;share.popoverPresentationController.sourceRect=sender.bounds;[self presentViewController:share animated:YES completion:nil];
}
- (void)deleteSelected:(UIButton *)sender {
    NSArray<NSURL *> *urls=[self selectedURLs];if(!urls.count)return;
    UIAlertController *alert=[UIAlertController alertControllerWithTitle:@"删除所选文件？" message:@"删除后无法撤销。" preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"取消" style:UIAlertActionStyleCancel handler:nil]];
    [alert addAction:[UIAlertAction actionWithTitle:@"删除" style:UIAlertActionStyleDestructive handler:^(UIAlertAction *action){
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY,0), ^{NSMutableArray *errors=[NSMutableArray array];
            for(NSURL *url in urls){NSError *error=nil;if(LMExistingFile(url)&&![NSFileManager.defaultManager removeItemAtURL:url error:&error]&&error)[errors addObject:error];}
            dispatch_async(dispatch_get_main_queue(), ^{[self.selected removeAllObjects];[self refreshMedia];if(errors.count){UIAlertController *failure=[UIAlertController alertControllerWithTitle:@"部分文件未能删除" message:@"请刷新列表后重试。" preferredStyle:UIAlertControllerStyleAlert];[failure addAction:[UIAlertAction actionWithTitle:@"好" style:UIAlertActionStyleDefault handler:nil]];[self presentViewController:failure animated:YES completion:nil];}});
        });
    }]];[self presentViewController:alert animated:YES completion:nil];
}
- (UIContextMenuConfiguration *)collectionView:(UICollectionView *)cv contextMenuConfigurationForItemAtIndexPath:(NSIndexPath *)path point:(CGPoint)point {
    LMItem *item=self.groups[path.section].items[path.item];__weak typeof(self) weak=self;
    return [UIContextMenuConfiguration configurationWithIdentifier:item.URL.path previewProvider:nil actionProvider:^UIMenu *(NSArray *suggested){
        UIAction *share=[UIAction actionWithTitle:@"分享原文件" image:[UIImage systemImageNamed:@"square.and.arrow.up"] identifier:nil handler:^(UIAction *a){
            LMGridController *s=weak;if(!s||!LMSafeFile(item.URL))return;UIActivityViewController *v=[[UIActivityViewController alloc] initWithActivityItems:@[item.URL] applicationActivities:nil];
            UICollectionViewCell *cell=[s.collectionView cellForItemAtIndexPath:path];v.popoverPresentationController.sourceView=cell?:s.view;v.popoverPresentationController.sourceRect=cell?cell.bounds:CGRectMake(0,0,1,1);[s presentViewController:v animated:YES completion:nil];}];
        UIAction *save=[UIAction actionWithTitle:@"保存到相册" image:[UIImage systemImageNamed:@"square.and.arrow.down"] identifier:nil handler:^(UIAction *a){
            LMSaveToPhotos(item,^(BOOL success){LMGridController *s=weak;if(!s)return;UIAlertController *v=[UIAlertController alertControllerWithTitle:success?@"已保存到相册":@"未能保存" message:success?nil:@"请检查相册权限及文件格式。" preferredStyle:UIAlertControllerStyleAlert];[v addAction:[UIAlertAction actionWithTitle:@"好" style:UIAlertActionStyleDefault handler:nil]];[s presentViewController:v animated:YES completion:nil];});}];
        return [UIMenu menuWithTitle:@"" children:@[share,save]];
    }];
}
@end

UIViewController *LMCreateMediaController(BOOL video) {
    LMGridController *controller=[LMGridController new];controller.video=video;return controller;
}

// Settings entry exported for the sample-bound native action bridge. No
// transactions, restore flow, receipt refresh or network access is involved.
static UIColor *LMGoldColor(void) {
    return [UIColor colorWithDynamicProvider:^UIColor *(UITraitCollection *traits){
        return traits.userInterfaceStyle==UIUserInterfaceStyleDark?
            [UIColor colorWithRed:0.86 green:0.75 blue:0.43 alpha:1]:[UIColor colorWithRed:0.66 green:0.53 blue:0.23 alpha:1];
    }];
}

@interface LMFreeFeaturesController : UIViewController
@end
@implementation LMFreeFeaturesController
- (UILabel *)label:(NSString *)text size:(CGFloat)size bold:(BOOL)bold {
    UILabel *label=[UILabel new];label.text=text;label.numberOfLines=0;
    label.font=bold?[UIFont boldSystemFontOfSize:size]:[UIFont systemFontOfSize:size];
    label.textColor=bold?UIColor.labelColor:UIColor.secondaryLabelColor;return label;
}
- (UIView *)ownedBadge {
    UIView *badge=[UIView new];badge.backgroundColor=[LMGoldColor() colorWithAlphaComponent:0.13];badge.layer.cornerRadius=15;
    UIImageView *check=[[UIImageView alloc] initWithImage:[UIImage systemImageNamed:@"checkmark.seal.fill"]];check.tintColor=LMGoldColor();check.contentMode=UIViewContentModeScaleAspectFit;
    UILabel *text=[self label:@"已尊享" size:13 bold:YES];text.textColor=LMGoldColor();text.numberOfLines=1;
    UIStackView *stack=[[UIStackView alloc] initWithArrangedSubviews:@[check,text]];stack.spacing=6;stack.alignment=UIStackViewAlignmentCenter;
    stack.translatesAutoresizingMaskIntoConstraints=NO;[badge addSubview:stack];
    [NSLayoutConstraint activateConstraints:@[[stack.centerXAnchor constraintEqualToAnchor:badge.centerXAnchor],[stack.centerYAnchor constraintEqualToAnchor:badge.centerYAnchor],
        [check.widthAnchor constraintEqualToConstant:14],[check.heightAnchor constraintEqualToConstant:14],
        [badge.widthAnchor constraintEqualToConstant:92],[badge.heightAnchor constraintEqualToConstant:30]]];
    badge.isAccessibilityElement=YES;badge.accessibilityLabel=@"已尊享，当前版本免费使用";return badge;
}
- (UIView *)feature:(NSString *)title description:(NSString *)description icon:(NSString *)symbol {
    UIView *card=[UIView new];card.backgroundColor=UIColor.secondarySystemGroupedBackgroundColor;card.layer.cornerRadius=18;
    UIView *circle=[UIView new];circle.backgroundColor=[LMGoldColor() colorWithAlphaComponent:0.12];circle.layer.cornerRadius=26;
    UIImageView *icon=[[UIImageView alloc] initWithImage:[UIImage systemImageNamed:symbol]];icon.tintColor=LMGoldColor();icon.contentMode=UIViewContentModeScaleAspectFit;
    icon.translatesAutoresizingMaskIntoConstraints=NO;[circle addSubview:icon];
    UILabel *name=[self label:title size:18 bold:YES];UILabel *body=[self label:description size:14 bold:NO];
    UIStackView *text=[[UIStackView alloc] initWithArrangedSubviews:@[name,body]];text.axis=UILayoutConstraintAxisVertical;text.spacing=6;
    UIView *owned=[self ownedBadge];
    for(UIView *view in @[circle,text,owned]){view.translatesAutoresizingMaskIntoConstraints=NO;[card addSubview:view];}
    [NSLayoutConstraint activateConstraints:@[
        [card.heightAnchor constraintGreaterThanOrEqualToConstant:116],
        [circle.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:16],[circle.centerYAnchor constraintEqualToAnchor:card.centerYAnchor],
        [circle.widthAnchor constraintEqualToConstant:52],[circle.heightAnchor constraintEqualToConstant:52],
        [icon.centerXAnchor constraintEqualToAnchor:circle.centerXAnchor],[icon.centerYAnchor constraintEqualToAnchor:circle.centerYAnchor],
        [icon.widthAnchor constraintEqualToConstant:26],[icon.heightAnchor constraintEqualToConstant:26],
        [owned.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-16],[owned.centerYAnchor constraintEqualToAnchor:card.centerYAnchor],
        [text.leadingAnchor constraintEqualToAnchor:circle.trailingAnchor constant:16],[text.trailingAnchor constraintEqualToAnchor:owned.leadingAnchor constant:-12],
        [text.topAnchor constraintGreaterThanOrEqualToAnchor:card.topAnchor constant:16],[text.bottomAnchor constraintLessThanOrEqualToAnchor:card.bottomAnchor constant:-16],
        [text.centerYAnchor constraintEqualToAnchor:card.centerYAnchor]
    ]];return card;
}
- (UIView *)scriptCard {
    UIView *card=[UIView new];card.backgroundColor=UIColor.secondarySystemGroupedBackgroundColor;card.layer.cornerRadius=18;
    UIImageView *icon=[[UIImageView alloc] initWithImage:[UIImage systemImageNamed:@"terminal.fill"]];icon.tintColor=LMGoldColor();icon.contentMode=UIViewContentModeScaleAspectFit;
    UILabel *title=[self label:@"JavaScript 引擎" size:20 bold:YES];
    UILabel *tier=[self label:@"PRO+" size:12 bold:YES];tier.textColor=LMGoldColor();tier.textAlignment=NSTextAlignmentCenter;tier.backgroundColor=[LMGoldColor() colorWithAlphaComponent:0.14];tier.layer.cornerRadius=5;tier.clipsToBounds=YES;
    UIStackView *heading=[[UIStackView alloc] initWithArrangedSubviews:@[icon,title,tier]];heading.spacing=12;heading.alignment=UIStackViewAlignmentCenter;
    UILabel *description=[self label:@"开放运行自定义 JS 脚本能力，突破播放边界。" size:15 bold:NO];
    UIStackView *content=[[UIStackView alloc] initWithArrangedSubviews:@[heading,description,[self ownedBadge]]];content.axis=UILayoutConstraintAxisVertical;content.spacing=16;content.alignment=UIStackViewAlignmentLeading;
    content.translatesAutoresizingMaskIntoConstraints=NO;[card addSubview:content];
    [NSLayoutConstraint activateConstraints:@[
        [content.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:20],[content.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-20],
        [content.topAnchor constraintEqualToAnchor:card.topAnchor constant:20],[content.bottomAnchor constraintEqualToAnchor:card.bottomAnchor constant:-20],
        [heading.widthAnchor constraintEqualToAnchor:content.widthAnchor],[description.widthAnchor constraintEqualToAnchor:content.widthAnchor],
        [icon.widthAnchor constraintEqualToConstant:28],[icon.heightAnchor constraintEqualToConstant:28],
        [tier.widthAnchor constraintEqualToConstant:48],[tier.heightAnchor constraintEqualToConstant:22]
    ]];return card;
}
- (void)viewDidLoad {
    [super viewDidLoad];self.title=@"升级专业版";self.view.backgroundColor=UIColor.systemGroupedBackgroundColor;
    self.navigationItem.leftBarButtonItem=[[UIBarButtonItem alloc] initWithTitle:@"关闭" style:UIBarButtonItemStylePlain target:self action:@selector(close)];
    self.navigationItem.rightBarButtonItem=[[UIBarButtonItem alloc] initWithTitle:@"恢复购买" style:UIBarButtonItemStylePlain target:self action:@selector(restorePurchases)];
    self.navigationItem.largeTitleDisplayMode=UINavigationItemLargeTitleDisplayModeNever;
    UIScrollView *scroll=[UIScrollView new];scroll.translatesAutoresizingMaskIntoConstraints=NO;[self.view addSubview:scroll];
    UIStackView *cards=[UIStackView new];cards.axis=UILayoutConstraintAxisVertical;cards.spacing=12;cards.translatesAutoresizingMaskIntoConstraints=NO;[scroll addSubview:cards];
    NSArray *names=@[@"文件导出",@"后台录播",@"多任务播放",@"画中画 (PiP)",@"解锁全功能"];
    NSArray *details=@[@"将媒体文件无损导出至系统相册或分享。",@"App 退至后台依然保持音频解码与流媒体录制。",@"支持最高 3×3 矩阵并发播放和录制。",@"全局悬浮窗，在其他应用之上继续无缝观影。",@"包含上述所有高级特性并可查看原始播放地址，终身尊享。"];
    NSArray *symbols=@[@"folder",@"play.rectangle",@"square.grid.2x2",@"pip.enter",@"sparkles"];
    for(NSUInteger n=0;n<names.count;n++)[cards addArrangedSubview:[self feature:names[n] description:details[n] icon:symbols[n]]];
    [cards addArrangedSubview:[self scriptCard]];
    UILabel *free=[self label:@"当前版本全部功能免费，无需购买或恢复购买。" size:13 bold:NO];free.textAlignment=NSTextAlignmentCenter;[cards addArrangedSubview:free];
    [NSLayoutConstraint activateConstraints:@[
        [scroll.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],[scroll.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
        [scroll.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor],[scroll.bottomAnchor constraintEqualToAnchor:self.view.bottomAnchor],
        [cards.leadingAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.leadingAnchor constant:16],
        [cards.trailingAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.trailingAnchor constant:-16],
        [cards.topAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.topAnchor constant:12],
        [cards.bottomAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.bottomAnchor constant:-24],
        [cards.widthAnchor constraintEqualToAnchor:scroll.frameLayoutGuide.widthAnchor constant:-32]
    ]];
}
- (void)restorePurchases {
    UIAlertController *alert=[UIAlertController alertControllerWithTitle:@"全部功能已免费开放" message:@"此版本无需付款，也无需恢复购买。页面中的功能均显示为已尊享。" preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"好" style:UIAlertActionStyleDefault handler:nil]];[self presentViewController:alert animated:YES completion:nil];
}
- (void)close {[self dismissViewControllerAnimated:YES completion:nil];}
@end

__attribute__((visibility("default"))) void LMPresentFreeFeatures(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        UIViewController *presenter=nil;
        for(UIScene *scene in UIApplication.sharedApplication.connectedScenes){
            if(![scene isKindOfClass:UIWindowScene.class]||scene.activationState!=UISceneActivationStateForegroundActive)continue;
            for(UIWindow *window in ((UIWindowScene *)scene).windows)if(window.isKeyWindow&&!window.hidden){presenter=window.rootViewController;break;}
            if(presenter)break;
        }
        while(presenter.presentedViewController&&!presenter.presentedViewController.isBeingDismissed)presenter=presenter.presentedViewController;
        if(!presenter||presenter.isBeingDismissed||presenter.isBeingPresented)return;
        if([presenter isKindOfClass:UINavigationController.class]&&[((UINavigationController *)presenter).topViewController isKindOfClass:LMFreeFeaturesController.class])return;
        LMFreeFeaturesController *page=[LMFreeFeaturesController new];
        UINavigationController *navigation=[[UINavigationController alloc] initWithRootViewController:page];
        navigation.view.tintColor=presenter.view.tintColor;
        [presenter presentViewController:navigation animated:YES completion:nil];
    });
}
