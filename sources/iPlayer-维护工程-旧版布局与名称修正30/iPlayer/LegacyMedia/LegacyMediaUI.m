// New compatibility implementation based on the owner's 1.6.2 UI reference.
// This file is editable source; it is not recovered original Swift source.
#import "LegacyMediaUI.h"
#import "LegacyMediaLibrary.h"
#import <AVFoundation/AVFoundation.h>
#import <AVKit/AVKit.h>
#import <Photos/Photos.h>
#import <ImageIO/ImageIO.h>

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

@interface LMVideoSurface : UIView
@property(nonatomic,readonly) AVPlayerLayer *playerLayer;
@end
@implementation LMVideoSurface
+ (Class)layerClass { return AVPlayerLayer.class; }
- (AVPlayerLayer *)playerLayer { return (AVPlayerLayer *)self.layer; }
@end

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

@interface LMFolderHeader : UICollectionReusableView
@property(nonatomic,strong) UIImageView *icon;
@property(nonatomic,strong) UILabel *nameLabel,*platformLabel,*countLabel,*arrow;
@property(nonatomic,strong) UIButton *hit;
@property(nonatomic,copy) void (^tapped)(void);
@end
@implementation LMFolderHeader
- (instancetype)initWithFrame:(CGRect)frame {
    if((self=[super initWithFrame:frame])){self.backgroundColor=UIColor.systemBackgroundColor;self.icon=[UIImageView new];self.icon.tintColor=self.tintColor;self.icon.contentMode=UIViewContentModeScaleAspectFit;
        self.nameLabel=[UILabel new];self.nameLabel.font=[UIFont systemFontOfSize:14 weight:UIFontWeightMedium];self.nameLabel.textColor=UIColor.labelColor;
        self.platformLabel=[UILabel new];self.platformLabel.font=[UIFont systemFontOfSize:12];self.platformLabel.textColor=UIColor.secondaryLabelColor;
        self.countLabel=[UILabel new];self.countLabel.font=[UIFont systemFontOfSize:12];self.countLabel.textColor=UIColor.secondaryLabelColor;
        self.arrow=[UILabel new];self.arrow.textColor=self.tintColor;self.arrow.textAlignment=NSTextAlignmentCenter;
        self.hit=[UIButton buttonWithType:UIButtonTypeCustom];[self.hit addTarget:self action:@selector(tap) forControlEvents:UIControlEventTouchUpInside];
        for(UIView *v in @[self.icon,self.nameLabel,self.platformLabel,self.countLabel,self.arrow,self.hit])[self addSubview:v];
        UIView *line=[UIView new];line.tag=3;line.backgroundColor=UIColor.separatorColor;[self addSubview:line];}return self;
}
- (void)layoutSubviews {[super layoutSubviews];CGFloat w=self.bounds.size.width;self.icon.frame=CGRectMake(15,6,35,40);
    CGFloat nameWidth=MIN(MAX(70,[self.nameLabel sizeThatFits:CGSizeMake(w-150,20)].width),w-150);
    self.nameLabel.frame=CGRectMake(65,6,nameWidth,20);self.platformLabel.frame=CGRectMake(70+nameWidth,7,MAX(0,w-nameWidth-120),18);
    self.countLabel.frame=CGRectMake(65,29,w-110,18);self.arrow.frame=CGRectMake(w-44,10,32,32);self.hit.frame=self.bounds;
    [self viewWithTag:3].frame=CGRectMake(15,self.bounds.size.height-0.5,w-15,0.5);}
- (void)tintColorDidChange {[super tintColorDidChange];self.icon.tintColor=self.tintColor;self.arrow.textColor=self.tintColor;}
- (void)tap {if(self.tapped)self.tapped();}
- (void)prepareForReuse {[super prepareForReuse];self.tapped=nil;}
@end

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
@property(nonatomic,strong) UIButton *playButton,*fullButton;
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
    self.surface=[LMVideoSurface new]; self.surface.backgroundColor=UIColor.blackColor;
    self.surface.playerLayer.videoGravity=AVLayerVideoGravityResizeAspect; [self.view addSubview:self.surface];
    UITapGestureRecognizer *tap=[[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(toggleControls)];tap.delegate=self;tap.cancelsTouchesInView=NO;[self.surface addGestureRecognizer:tap];
    UIPanGestureRecognizer *pan=[[UIPanGestureRecognizer alloc] initWithTarget:self action:@selector(pan:)];pan.delegate=self;[self.surface addGestureRecognizer:pan];
    self.topBar=[UIView new];self.topBar.backgroundColor=[UIColor colorWithWhite:0 alpha:0.55];[self.surface addSubview:self.topBar];
    UIButton *back=[self button:@"chevron.left" image:@"CLBack" action:@selector(close)]; back.tag=1;back.accessibilityLabel=@"返回";
    [self.topBar addSubview:back];
    self.titleLabel=[UILabel new];self.titleLabel.textColor=UIColor.whiteColor;self.titleLabel.font=[UIFont systemFontOfSize:14];
    [self.topBar addSubview:self.titleLabel];
    UIButton *more=[self button:@"ellipsis" image:@"CLMore" action:@selector(more:)];more.tag=2;more.accessibilityLabel=@"更多";[self.topBar addSubview:more];
    self.bottomBar=[UIView new];self.bottomBar.backgroundColor=[UIColor colorWithWhite:0 alpha:0.55];[self.surface addSubview:self.bottomBar];
    self.playButton=[self button:@"pause.fill" image:@"CLPause" action:@selector(playPause)];self.playButton.accessibilityLabel=@"播放或暂停";
    self.fullButton=[self button:@"arrow.up.left.and.arrow.down.right" image:@"CLFullscreen" action:@selector(toggleFullscreen)];
    self.fullButton.accessibilityLabel=@"全屏";[self.bottomBar addSubview:self.playButton];[self.bottomBar addSubview:self.fullButton];
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
- (void)viewDidLayoutSubviews {
    [super viewDidLayoutSubviews]; CGRect bounds=self.view.bounds;UIEdgeInsets safe=self.view.safeAreaInsets;
    BOOL wide=bounds.size.width>bounds.size.height;CGFloat y=wide?0:safe.top;
    CGFloat h=wide?bounds.size.height:MIN(bounds.size.width*9/16,MAX(160,bounds.size.height-safe.top-safe.bottom-160));
    self.surface.frame=CGRectMake(0,y,bounds.size.width,h); self.playlist.hidden=wide;
    self.playlist.frame=CGRectMake(0,y+h,bounds.size.width,MAX(0,bounds.size.height-y-h-safe.bottom));
    if(!CGSizeEqualToSize(self.lastPlaylistSize,self.playlist.bounds.size)){self.lastPlaylistSize=self.playlist.bounds.size;[self.playlist.collectionViewLayout invalidateLayout];
        [self.fullButton setImage:LMPlayerImage(wide?@"CLSmallscreen":@"CLFullscreen",@"arrow.up.left.and.arrow.down.right") forState:UIControlStateNormal];[self setNeedsStatusBarAppearanceUpdate];}
    CGFloat left=wide?safe.left:0,right=wide?safe.right:0,w=bounds.size.width-left-right;
    self.topBar.frame=CGRectMake(left,0,w,44);self.bottomBar.frame=CGRectMake(left,h-44-(wide?safe.bottom:0),w,44);
    [self.topBar viewWithTag:1].frame=CGRectMake(0,0,44,44);[self.topBar viewWithTag:2].frame=CGRectMake(w-44,0,44,44);
    self.titleLabel.frame=CGRectMake(48,0,MAX(0,w-96),44);
    self.playButton.frame=CGRectMake(0,0,40,44);self.elapsed.frame=CGRectMake(40,0,48,44);
    self.fullButton.frame=CGRectMake(w-40,0,40,44);self.total.frame=CGRectMake(w-88,0,48,44);
    self.slider.frame=CGRectMake(90,0,MAX(0,w-180),44);
    self.errorLabel.frame=CGRectInset(self.surface.bounds,40,54);
}
- (UIInterfaceOrientationMask)supportedInterfaceOrientations { return self.fullscreen?UIInterfaceOrientationMaskLandscape:UIInterfaceOrientationMaskAllButUpsideDown; }
- (UIInterfaceOrientation)preferredInterfaceOrientationForPresentation { return self.fullscreen?UIInterfaceOrientationLandscapeRight:UIInterfaceOrientationPortrait; }
- (BOOL)shouldAutorotate { return YES; }
- (BOOL)prefersStatusBarHidden { return self.view.bounds.size.width>self.view.bounds.size.height; }
- (UIStatusBarStyle)preferredStatusBarStyle {return self.view.bounds.size.width>self.view.bounds.size.height?UIStatusBarStyleLightContent:UIStatusBarStyleDefault;}
- (void)clearPlayer {
    if(self.observing){[self.player.currentItem removeObserver:self forKeyPath:@"status"];self.observing=NO;}
    if(self.timeObserver){[self.player removeTimeObserver:self.timeObserver];self.timeObserver=nil;}
    [self.player pause];self.surface.playerLayer.player=nil;self.player=nil;self.pip.delegate=nil;[self.pip stopPictureInPicture];self.pip=nil;
}
- (void)openIndex:(NSInteger)index {
    if(index<0 || index>=self.items.count) return; [self clearPlayer];self.index=index;
    LMItem *item=self.items[index];self.titleLabel.text=item.name;self.errorLabel.hidden=YES;self.slider.value=0;
    self.elapsed.text=@"00:00";self.total.text=@"00:00";self.slider.enabled=NO;
    [self.playButton setImage:LMPlayerImage(@"CLPause",@"pause.fill") forState:UIControlStateNormal];
    for(LMGroup *group in self.groups)if([group.items containsObject:item])[self.expanded addObject:group.identifier];
    [self.playlist reloadData];
    if(!LMExistingFile(item.URL)){self.errorLabel.text=@"文件暂时无法读取，请返回刷新后重试。";self.errorLabel.hidden=NO;return;}
    AVPlayerItem *playerItem=[AVPlayerItem playerItemWithURL:item.URL];self.player=[AVPlayer playerWithPlayerItem:playerItem];
    self.surface.playerLayer.player=self.player;
    [playerItem addObserver:self forKeyPath:@"status" options:NSKeyValueObservingOptionInitial context:NULL];self.observing=YES;
    if([AVPictureInPictureController isPictureInPictureSupported]){self.pip=[[AVPictureInPictureController alloc] initWithPlayerLayer:self.surface.playerLayer];self.pip.delegate=self;}
    __weak typeof(self) weak=self;
    self.timeObserver=[self.player addPeriodicTimeObserverForInterval:CMTimeMakeWithSeconds(0.5,600) queue:dispatch_get_main_queue() usingBlock:^(CMTime time){
        LMPlaybackController *s=weak;if(!s)return; double current=CMTimeGetSeconds(time),duration=CMTimeGetSeconds(s.player.currentItem.duration);
        s.elapsed.text=LMTime(current);s.total.text=LMTime(duration);s.slider.enabled=isfinite(duration)&&duration>0;
        if(!s.dragging && isfinite(duration)&&duration>0) s.slider.value=(float)(current/duration);
    }];
    [self.playlist reloadData];
}
- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary *)change context:(void *)context {
    if(![keyPath isEqualToString:@"status"])return;
    dispatch_async(dispatch_get_main_queue(), ^{
        if(object!=self.player.currentItem)return;
        if(self.player.currentItem.status==AVPlayerItemStatusReadyToPlay){[self.player play];self.player.rate=self.playbackRate;}
        else if(self.player.currentItem.status==AVPlayerItemStatusFailed){self.errorLabel.text=@"此录像暂时无法播放，可在列表中分享或导出原文件。";self.errorLabel.hidden=NO;}
    });
}
- (void)playPause {
    if(self.player.rate!=0){[self.player pause];[self.playButton setImage:LMPlayerImage(@"CLPlay",@"play.fill") forState:UIControlStateNormal];}
    else {if(CMTimeCompare(self.player.currentTime,self.player.currentItem.duration)>=0)[self.player seekToTime:kCMTimeZero];
        [self.player play];self.player.rate=self.playbackRate;[self.playButton setImage:LMPlayerImage(@"CLPause",@"pause.fill") forState:UIControlStateNormal];}
}
- (void)beginSeek { self.dragging=YES; }
- (void)endSeek {
    double duration=CMTimeGetSeconds(self.player.currentItem.duration);self.dragging=NO;
    if(isfinite(duration)&&duration>0)[self.player seekToTime:CMTimeMakeWithSeconds(self.slider.value*duration,600) toleranceBefore:kCMTimeZero toleranceAfter:kCMTimeZero];
}
- (void)toggleControls {self.controlsVisible=!self.controlsVisible;self.topBar.hidden=!self.controlsVisible;self.bottomBar.hidden=!self.controlsVisible;}
- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gesture shouldReceiveTouch:(UITouch *)touch {
    return ![touch.view isDescendantOfView:self.topBar]&&![touch.view isDescendantOfView:self.bottomBar];
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
- (void)toggleFullscreen {
    self.fullscreen=self.view.bounds.size.width<=self.view.bounds.size.height;
    [self.fullButton setImage:LMPlayerImage(self.fullscreen?@"CLSmallscreen":@"CLFullscreen",@"arrow.up.left.and.arrow.down.right") forState:UIControlStateNormal];
    if(@available(iOS 16.0,*)){
        [self setNeedsUpdateOfSupportedInterfaceOrientations];
        UIWindowScene *scene=self.view.window.windowScene;
        UIInterfaceOrientationMask mask=self.fullscreen?UIInterfaceOrientationMaskLandscape:UIInterfaceOrientationMaskPortrait;
        [scene requestGeometryUpdateWithPreferences:[[UIWindowSceneGeometryPreferencesIOS alloc] initWithInterfaceOrientations:mask] errorHandler:^(NSError *error){(void)error;}];
    } else { [UIViewController attemptRotationToDeviceOrientation]; }
}
- (void)more:(UIButton *)sender {
    UIAlertController *menu=[UIAlertController alertControllerWithTitle:@"更多" message:nil preferredStyle:UIAlertControllerStyleActionSheet];
    for(NSNumber *rate in @[@0.5,@1,@1.25,@1.5,@2]){
        [menu addAction:[UIAlertAction actionWithTitle:[NSString stringWithFormat:@"%@ 倍速",rate] style:UIAlertActionStyleDefault handler:^(UIAlertAction *a){self.playbackRate=rate.floatValue;if(self.player.rate!=0)self.player.rate=self.playbackRate;}]];
    }
    [menu addAction:[UIAlertAction actionWithTitle:@"适应画面" style:UIAlertActionStyleDefault handler:^(UIAlertAction *a){self.surface.playerLayer.videoGravity=AVLayerVideoGravityResizeAspect;}]];
    [menu addAction:[UIAlertAction actionWithTitle:@"填充画面" style:UIAlertActionStyleDefault handler:^(UIAlertAction *a){self.surface.playerLayer.videoGravity=AVLayerVideoGravityResizeAspectFill;}]];
    [menu addAction:[UIAlertAction actionWithTitle:@"截图" style:UIAlertActionStyleDefault handler:^(UIAlertAction *a){[self captureFrame];}]];
    if(self.pip)[menu addAction:[UIAlertAction actionWithTitle:@"画中画" style:UIAlertActionStyleDefault handler:^(UIAlertAction *a){if(self.pip.pictureInPicturePossible)[self.pip startPictureInPicture];}]];
    [menu addAction:[UIAlertAction actionWithTitle:@"取消" style:UIAlertActionStyleCancel handler:nil]];
    menu.popoverPresentationController.sourceView=sender;menu.popoverPresentationController.sourceRect=sender.bounds;[self presentViewController:menu animated:YES completion:nil];
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
        dispatch_async(dispatch_get_main_queue(), ^{if(!self.view.window)return;UIAlertController *alert=[UIAlertController alertControllerWithTitle:success?@"已保存到截图":@"截图未成功" message:nil preferredStyle:UIAlertControllerStyleAlert];[alert addAction:[UIAlertAction actionWithTitle:@"好" style:UIAlertActionStyleDefault handler:nil]];[self presentViewController:alert animated:YES completion:nil];});
    }});
}
- (void)close {
    if(self.pip.pictureInPictureActive)LMPictureInPictureOwner=self;else[self clearPlayer];
    [self dismissViewControllerAnimated:YES completion:nil];
}
- (NSInteger)numberOfSectionsInCollectionView:(UICollectionView *)view {return self.groups.count;}
- (NSInteger)collectionView:(UICollectionView *)view numberOfItemsInSection:(NSInteger)section {
    LMGroup *group=self.groups[section];return [self.expanded containsObject:group.identifier]?group.items.count:0;
}
- (UICollectionViewCell *)collectionView:(UICollectionView *)view cellForItemAtIndexPath:(NSIndexPath *)path {
    LMGridCell *cell=[view dequeueReusableCellWithReuseIdentifier:@"playlist" forIndexPath:path];LMItem *item=self.groups[path.section].items[path.item];
    BOOL playing=self.index>=0&&self.index<self.items.count&&[item.URL.path isEqualToString:self.items[self.index].URL.path];
    cell.representedPath=item.URL.path;cell.nameLabel.text=item.name;cell.nameLabel.textColor=playing?self.view.tintColor:UIColor.labelColor;
    cell.selectionLabel.hidden=!playing;cell.selectionLabel.text=@"▶";
    static NSDateFormatter *date;static dispatch_once_t once;dispatch_once(&once,^{date=[NSDateFormatter new];date.dateFormat=@"yyyy-MM-dd HH:mm:ss";});cell.dateLabel.text=[date stringFromDate:item.modifiedDate];
    cell.image.image=[UIImage systemImageNamed:@"play.rectangle"];__weak LMGridCell *weak=cell;NSString *represented=item.URL.path;
    [[LMThumbnailStore shared] imageForItem:item completion:^(UIImage *thumbnail){if([weak.representedPath isEqualToString:represented]&&thumbnail)weak.image.image=thumbnail;}];return cell;
}
- (UICollectionReusableView *)collectionView:(UICollectionView *)view viewForSupplementaryElementOfKind:(NSString *)kind atIndexPath:(NSIndexPath *)path {
    LMFolderHeader *header=[view dequeueReusableSupplementaryViewOfKind:kind withReuseIdentifier:@"folder" forIndexPath:path];LMGroup *group=self.groups[path.section];
    header.icon.image=[UIImage systemImageNamed:@"folder.fill.badge.play"]?:[UIImage systemImageNamed:@"folder.fill"];
    header.nameLabel.text=group.title;header.platformLabel.text=group.platform;header.countLabel.text=[NSString stringWithFormat:@"%lu个视频",(unsigned long)group.items.count];
    BOOL open=[self.expanded containsObject:group.identifier];header.arrow.text=open?@"▾":@"▸";
    header.hit.accessibilityLabel=[NSString stringWithFormat:@"%@，%@，%@",group.title,header.countLabel.text,open?@"收起":@"展开"];
    __weak typeof(self) weak=self;NSString *identifier=group.identifier;header.tapped=^{LMPlaybackController *s=weak;if(!s)return;
        if([s.expanded containsObject:identifier])[s.expanded removeObject:identifier];else[s.expanded addObject:identifier];
        if(s.expandedDidChange)s.expandedDidChange([s.expanded copy]);[s.playlist reloadData];};return header;
}
- (CGSize)collectionView:(UICollectionView *)view layout:(UICollectionViewLayout *)layout referenceSizeForHeaderInSection:(NSInteger)section {return CGSizeMake(view.bounds.size.width,52);}
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
    if(self.view.window){completion(YES);return;}
    UIViewController *presenter=nil;
    for(UIScene *scene in UIApplication.sharedApplication.connectedScenes)if([scene isKindOfClass:UIWindowScene.class]&&scene.activationState==UISceneActivationStateForegroundActive)
        for(UIWindow *window in ((UIWindowScene *)scene).windows)if(window.isKeyWindow)presenter=window.rootViewController;
    while(presenter.presentedViewController)presenter=presenter.presentedViewController;
    if(presenter)[presenter presentViewController:self animated:YES completion:^{completion(YES);}];else completion(NO);
}
- (void)dealloc {[[NSNotificationCenter defaultCenter] removeObserver:self];[self clearPlayer];}
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

@interface LMGridController : UICollectionViewController <UICollectionViewDelegateFlowLayout>
@property(nonatomic) BOOL video,selecting;
@property(nonatomic,strong) NSArray<LMGroup *> *groups;
@property(nonatomic,strong) NSMutableSet<NSString *> *expanded,*selected;
@property(nonatomic,strong) NSOperationQueue *scanQueue;
@property(nonatomic) NSUInteger refreshGeneration;
@property(nonatomic,strong) UILabel *emptyLabel;
@property(nonatomic,weak) UIViewController *activeViewer;
- (void)refreshMedia;
@end
@implementation LMGridController
- (void)viewDidLoad {
    [super viewDidLoad];self.title=self.video?@"录像记录":@"截图记录";self.overrideUserInterfaceStyle=UIUserInterfaceStyleUnspecified;
    self.groups=@[];self.expanded=[NSMutableSet set];self.selected=[NSMutableSet set];self.scanQueue=[NSOperationQueue new];self.scanQueue.maxConcurrentOperationCount=1;
    self.scanQueue.qualityOfService=NSQualityOfServiceUserInitiated;self.collectionView.backgroundColor=UIColor.systemBackgroundColor;self.collectionView.alwaysBounceVertical=YES;
    [self.collectionView registerClass:LMGridCell.class forCellWithReuseIdentifier:@"file"];
    [self.collectionView registerClass:LMFolderHeader.class forSupplementaryViewOfKind:UICollectionElementKindSectionHeader withReuseIdentifier:@"folder"];
    self.emptyLabel=[UILabel new];self.emptyLabel.text=self.video?@"暂无录像":@"暂无截图";self.emptyLabel.textColor=UIColor.secondaryLabelColor;self.emptyLabel.textAlignment=NSTextAlignmentCenter;
    self.collectionView.backgroundView=self.emptyLabel;
    UIRefreshControl *refresh=[UIRefreshControl new];[refresh addTarget:self action:@selector(refreshMedia) forControlEvents:UIControlEventValueChanged];self.collectionView.refreshControl=refresh;
    self.navigationItem.rightBarButtonItem=[[UIBarButtonItem alloc] initWithTitle:@"选择" style:UIBarButtonItemStylePlain target:self action:@selector(toggleSelection)];
    self.toolbarItems=@[[[UIBarButtonItem alloc] initWithTitle:@"全选" style:UIBarButtonItemStylePlain target:self action:@selector(selectAll)],
       [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace target:nil action:nil],
       [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemAction target:self action:@selector(shareSelected:)],
       [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace target:nil action:nil],
       [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemTrash target:self action:@selector(deleteSelected:)]];
    [self refreshMedia];
}
- (void)viewWillAppear:(BOOL)animated {[super viewWillAppear:animated];[self.navigationController setToolbarHidden:!self.selecting animated:NO];[self refreshMedia];}
- (void)traitCollectionDidChange:(UITraitCollection *)previous {
    [super traitCollectionDidChange:previous];
    // A full-screen presentation can be reparented above the SwiftUI host.
    // Carry changes from that host into the viewer while it is presented.
    self.activeViewer.overrideUserInterfaceStyle=self.traitCollection.userInterfaceStyle;
    if(self.activeViewer.isViewLoaded)self.activeViewer.view.tintColor=self.view.tintColor;
}
- (void)refreshMedia {
    if(!self.isViewLoaded)return;NSUInteger generation=++self.refreshGeneration;BOOL video=self.video;NSArray *roots=LMRoots();__weak typeof(self) weak=self;
    [self.scanQueue cancelAllOperations];[self.scanQueue addOperationWithBlock:^{
        NSArray *groups=[LMLibrary groupsForVideo:video roots:roots];dispatch_async(dispatch_get_main_queue(), ^{
            LMGridController *s=weak;if(!s||generation!=s.refreshGeneration)return;s.groups=groups;
            NSMutableSet *valid=[NSMutableSet set];for(LMGroup *g in groups)for(LMItem *i in g.items)[valid addObject:i.URL.path];
            [s.selected intersectSet:valid];s.emptyLabel.hidden=groups.count>0;[s.collectionView.refreshControl endRefreshing];[s.collectionView reloadData];
        });
    }];
}
- (NSInteger)numberOfSectionsInCollectionView:(UICollectionView *)collectionView {return self.groups.count;}
- (NSInteger)collectionView:(UICollectionView *)collectionView numberOfItemsInSection:(NSInteger)section {LMGroup *g=self.groups[section];return [self.expanded containsObject:g.identifier]?g.items.count:0;}
- (UICollectionViewCell *)collectionView:(UICollectionView *)collectionView cellForItemAtIndexPath:(NSIndexPath *)path {
    LMGridCell *cell=[collectionView dequeueReusableCellWithReuseIdentifier:@"file" forIndexPath:path];LMItem *item=self.groups[path.section].items[path.item];
    cell.representedPath=item.URL.path;cell.nameLabel.text=item.name;cell.selectionLabel.hidden=!self.selecting;cell.selectionLabel.text=[self.selected containsObject:item.URL.path]?@"✓":@"○";
    static NSDateFormatter *date;static dispatch_once_t once;dispatch_once(&once,^{date=[NSDateFormatter new];date.dateFormat=@"yyyy-MM-dd HH:mm:ss";});cell.dateLabel.text=[date stringFromDate:item.modifiedDate];
    cell.image.image=[UIImage systemImageNamed:self.video?@"play.rectangle":@"photo"];
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
    __weak typeof(self) weak=self;NSString *identifier=group.identifier;header.tapped=^{LMGridController *s=weak;if(!s)return;
        if([s.expanded containsObject:identifier])[s.expanded removeObject:identifier];else[s.expanded addObject:identifier];
        [s.collectionView reloadData];};return header;
}
- (CGSize)collectionView:(UICollectionView *)cv layout:(UICollectionViewLayout *)layout sizeForItemAtIndexPath:(NSIndexPath *)path {
    CGFloat width=cv.bounds.size.width;NSInteger columns=2;if(UIDevice.currentDevice.userInterfaceIdiom==UIUserInterfaceIdiomPad)columns=width>800?6:4;
    CGFloat w=floor((width-(columns+1)*5)/columns);return CGSizeMake(w,w*1.06);
}
- (CGSize)collectionView:(UICollectionView *)cv layout:(UICollectionViewLayout *)layout referenceSizeForHeaderInSection:(NSInteger)section {return CGSizeMake(cv.bounds.size.width,52);}
- (void)collectionView:(UICollectionView *)cv didSelectItemAtIndexPath:(NSIndexPath *)path {
    LMGroup *group=self.groups[path.section];LMItem *item=group.items[path.item];
    if(self.selecting){if([self.selected containsObject:item.URL.path])[self.selected removeObject:item.URL.path];else[self.selected addObject:item.URL.path];[cv reloadItemsAtIndexPaths:@[path]];return;}
    if(self.video){
        // Keep all recording groups available below the pinned video surface,
        // including folders containing only one recording. Switching a file
        // stays in this player instead of opening a single-item detail screen.
        NSMutableArray<LMItem *> *items=[NSMutableArray array];for(LMGroup *g in self.groups)[items addObjectsFromArray:g.items];
        NSUInteger index=[items indexOfObjectIdenticalTo:item];if(index==NSNotFound)return;
        LMPlaybackController *player=[LMPlaybackController new];player.groups=self.groups;player.items=items;player.index=index;player.expanded=[self.expanded mutableCopy];
        __weak typeof(self) weak=self;player.expandedDidChange=^(NSSet<NSString *> *expanded){weak.expanded=[expanded mutableCopy];};
        player.overrideUserInterfaceStyle=self.traitCollection.userInterfaceStyle;player.view.tintColor=self.view.tintColor;
        self.activeViewer=player;player.modalPresentationStyle=UIModalPresentationFullScreen;[self presentViewController:player animated:YES completion:nil];
    }
    else {LMPhotoController *photos=[[LMPhotoController alloc] initWithTransitionStyle:UIPageViewControllerTransitionStyleScroll navigationOrientation:UIPageViewControllerNavigationOrientationHorizontal options:nil];photos.items=group.items;photos.index=path.item;photos.overrideUserInterfaceStyle=self.traitCollection.userInterfaceStyle;photos.view.tintColor=self.view.tintColor;self.activeViewer=photos;photos.modalPresentationStyle=UIModalPresentationFullScreen;[self presentViewController:photos animated:NO completion:nil];}
}
- (void)toggleSelection {self.selecting=!self.selecting;if(!self.selecting)[self.selected removeAllObjects];self.navigationItem.rightBarButtonItem.title=self.selecting?@"完成":@"选择";[self.navigationController setToolbarHidden:!self.selecting animated:YES];[self.collectionView reloadData];}
- (void)selectAll {for(LMGroup *g in self.groups){[self.expanded addObject:g.identifier];for(LMItem *i in g.items)[self.selected addObject:i.URL.path];}[self.collectionView reloadData];}
- (NSArray<NSURL *> *)selectedURLs {
    NSMutableArray *urls=[NSMutableArray array];for(LMGroup *g in self.groups)for(LMItem *i in g.items)if([self.selected containsObject:i.URL.path]&&LMExistingFile(i.URL))[urls addObject:i.URL];return urls;
}
- (void)shareSelected:(UIBarButtonItem *)sender {
    NSArray *urls=[self selectedURLs];if(!urls.count)return;UIActivityViewController *share=[[UIActivityViewController alloc] initWithActivityItems:urls applicationActivities:nil];
    share.popoverPresentationController.barButtonItem=sender;[self presentViewController:share animated:YES completion:nil];
}
- (void)deleteSelected:(UIBarButtonItem *)sender {
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
    UICollectionViewFlowLayout *layout=[UICollectionViewFlowLayout new];layout.minimumInteritemSpacing=5;layout.minimumLineSpacing=5;
    layout.sectionInset=UIEdgeInsetsMake(0,5,0,5);layout.sectionHeadersPinToVisibleBounds=YES;
    LMGridController *controller=[[LMGridController alloc] initWithCollectionViewLayout:layout];controller.video=video;return controller;
}
