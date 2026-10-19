#import "AMMaintenanceUI.h"
#import "AMBackup.h"
#import "AMOperations.h"
#import "AMPreferences.h"
#import "AMExtraction.h"
#import "AMBackupStore.h"
static void Show(UIViewController *vc, NSString *title, NSString *message) {
    UIAlertController *alert =
        [UIAlertController alertControllerWithTitle:title
                                            message:message
                                     preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"确定"
                                              style:UIAlertActionStyleDefault
                                            handler:nil]];
    [vc presentViewController:alert animated:YES completion:nil];
}
static void Share(UIViewController *vc, NSURL *url, UITableView *table, NSIndexPath *path) {
    UIActivityViewController *activity =
        [[UIActivityViewController alloc] initWithActivityItems:@[ url ] applicationActivities:nil];
    activity.popoverPresentationController.sourceView = table;
    activity.popoverPresentationController.sourceRect = [table rectForRowAtIndexPath:path];
    [vc presentViewController:activity animated:YES completion:nil];
}
@interface AMTextController : UIViewController
@property(nonatomic, copy) NSString *text;
@property(nonatomic, strong) UITextView *editor;
@property(nonatomic, copy, nullable) void (^save)(NSString *text);
@end
@implementation AMTextController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.editor = [[UITextView alloc] initWithFrame:self.view.bounds];
    self.editor.autoresizingMask =
        UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.editor.backgroundColor = UIColor.systemBackgroundColor;
    self.editor.textColor = UIColor.labelColor;
    self.editor.font = [UIFont monospacedSystemFontOfSize:14 weight:UIFontWeightRegular];
    self.editor.text = self.text;
    self.editor.editable = self.save != nil;
    self.view = self.editor;
    if (self.save)
        self.navigationItem.rightBarButtonItem =
            [[UIBarButtonItem alloc] initWithTitle:@"保存"
                                             style:UIBarButtonItemStyleDone
                                            target:self
                                            action:@selector(saveText)];
}
- (void)saveText {
    self.save(self.editor.text);
}
@end
@interface AMTreeController : UITableViewController
@property(nonatomic, strong) id value;
@property(nonatomic, copy) NSArray *keys;
@end
@implementation AMTreeController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.tableView.rowHeight = UITableViewAutomaticDimension;
    self.tableView.estimatedRowHeight = 60;
    self.keys = [self.value isKindOfClass:NSDictionary.class]
                    ? [[self.value allKeys] sortedArrayUsingSelector:@selector(compare:)]
                    : @[];
}
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    (void)tableView;
    (void)section;
    return [self.value isKindOfClass:NSArray.class] ? [self.value count] : self.keys.count;
}
- (id)item:(NSIndexPath *)path {
    return [self.value isKindOfClass:NSArray.class] ? self.value[path.row]
                                                    : self.value[self.keys[path.row]];
}
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)path {
    (void)tableView;
    UITableViewCell *cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle
                                                   reuseIdentifier:nil];
    id value = [self item:path];
    cell.textLabel.text = self.keys.count ? [self.keys[path.row] description]
                                          : [NSString stringWithFormat:@"[%ld]", (long)path.row];
    cell.detailTextLabel.text = [value isKindOfClass:NSDictionary.class] ? @"Dictionary"
                                : [value isKindOfClass:NSArray.class]    ? @"Array"
                                                                         : [value description];
    cell.detailTextLabel.numberOfLines = 3;
    cell.accessoryType = UITableViewCellAccessoryDisclosureIndicator;
    return cell;
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)path {
    [tableView deselectRowAtIndexPath:path animated:YES];
    NSString *title = self.keys.count ? [self.keys[path.row] description]
                                      : [NSString stringWithFormat:@"[%ld]", (long)path.row];
    [self.navigationController pushViewController:AMPropertyListViewer([self item:path], title)
                                         animated:YES];
}
@end
UIViewController *AMPropertyListViewer(id value, NSString *title) {
    UIViewController *view = nil;
    if ([value isKindOfClass:NSDictionary.class] || [value isKindOfClass:NSArray.class]) {
        AMTreeController *tree =
            [[AMTreeController alloc] initWithStyle:UITableViewStyleInsetGrouped];
        tree.value = value;
        view = tree;
    } else {
        AMTextController *text = [AMTextController new];
        text.text = [value description];
        view = text;
    }
    view.title = title;
    return view;
}
static void RunMutation(UIViewController *view, AMApplication *app, NSURL *archive, BOOL wipe) {
    if (![NSUserDefaults.standardUserDefaults boolForKey:@"EnableDataChanges"]) {
        Show(view, @"恢复/擦除未启用",
             @"这是尚未完成真机往返验证的源码候选版。只有在测试应用验证后，再在设置中启用数据写入。"
             @"当前未修改数据。");
        return;
    }
    UIAlertController *confirm = [UIAlertController
        alertControllerWithTitle:wipe ? @"擦除应用数据" : @"恢复应用数据"
                         message:[NSString
                                     stringWithFormat:@"目标：%@"
                                                      @"\n请先彻底关闭目标应用及使用同一共享容器的"
                                                      @"应用。此操作会修改数据和可能共享的钥匙串访"
                                                      @"问组；旧数据会保留在恢复记录中。%@",
                                                      app.name,
                                                      wipe ? @"擦除前必须先完成完整备份。"
                                                           : @"请确认选择了正确备份。"]
                  preferredStyle:UIAlertControllerStyleAlert];
    [confirm addAction:[UIAlertAction actionWithTitle:@"取消"
                                                style:UIAlertActionStyleCancel
                                              handler:nil]];
    [confirm
        addAction:[UIAlertAction
                      actionWithTitle:wipe ? @"备份后擦除" : @"确认恢复"
                                style:UIAlertActionStyleDestructive
                              handler:^(UIAlertAction *action) {
                                  (void)action;
                                  UIAlertController *progress = [UIAlertController
                                      alertControllerWithTitle:@"正在处理"
                                                       message:@"正在预检…"
                                                preferredStyle:UIAlertControllerStyleAlert];
                                  [view presentViewController:progress animated:YES completion:nil];
                                  view.tabBarController.tabBar.userInteractionEnabled = NO;
                                  UIApplication.sharedApplication.idleTimerDisabled = YES;
                                  dispatch_async(
                                      dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
                                          NSError *error = nil;
                                          void (^update)(NSString *) = ^(NSString *message) {
                                              dispatch_async(dispatch_get_main_queue(), ^{
                                                  progress.message = message;
                                              });
                                          };
                                          BOOL ok = wipe ? [AMOperations wipeApplication:app
                                                                                progress:update
                                                                                   error:&error]
                                                         : [AMOperations restoreArchive:archive
                                                                            application:app
                                                                               progress:update
                                                                                  error:&error];
                                          dispatch_async(dispatch_get_main_queue(), ^{
                                              view.tabBarController.tabBar.userInteractionEnabled =
                                                  YES;
                                              UIApplication.sharedApplication.idleTimerDisabled =
                                                  NO;
                                              [progress dismissViewControllerAnimated:YES
                                                                           completion:^{
                                                                               Show(view,ok?@"操作完成":@"操作未完成",ok?@"旧数据和日志仍保留在恢复记录目录。请先验证应用数据，再考虑后续维护。":error.localizedDescription?:@"未知错误");
                                                                           }];
                                          });
                                      });
                              }]];
    [view presentViewController:confirm animated:YES completion:nil];
}
@interface AMArchiveController : UITableViewController
@property(nonatomic, strong) NSURL *archive;
@property(nonatomic, strong) NSDictionary *info;
@property(nonatomic, strong) NSError *loadError;
@end
@implementation AMArchiveController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = @"备份详情";
    self.tableView.rowHeight = UITableViewAutomaticDimension;
    self.tableView.estimatedRowHeight = 60;
    self.navigationItem.prompt = @"正在读取备份信息…";
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        NSError *error = nil;
        NSDictionary *info = [AMOperations infoForArchive:self.archive error:&error];
        dispatch_async(dispatch_get_main_queue(), ^{
            self.info = info;
            self.loadError = error;
            self.navigationItem.prompt = nil;
            [self.tableView reloadData];
        });
    });
}
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    (void)tableView;
    (void)section;
    return 6;
}
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)path {
    (void)tableView;
    UITableViewCell *cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle
                                                   reuseIdentifier:nil];
    NSArray *titles =
        @[ @"归档", @"应用", @"标识符", @"导出", @"恢复到已安装应用", @"重新校验归档" ];
    cell.textLabel.text = titles[path.row];
    cell.detailTextLabel.numberOfLines = 0;
    if (path.row == 0)
        cell.detailTextLabel.text = self.archive.lastPathComponent;
    if (path.row == 1)
        cell.detailTextLabel.text =
            self.info[@"displayName"] ?: self.loadError.localizedDescription;
    if (path.row == 2)
        cell.detailTextLabel.text = self.info[@"id"];
    return cell;
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)path {
    [tableView deselectRowAtIndexPath:path animated:YES];
    if (path.row == 3) {
        Share(self, self.archive, tableView, path);
        return;
    }
    if (path.row == 4) {
        if (!self.info) {
            Show(self, @"无法恢复", self.loadError.localizedDescription ?: @"备份信息未就绪");
            return;
        }
        NSError *error = nil;
        NSArray *apps = [AMApplicationRegistry applicationsWithError:&error];
        for (AMApplication *app in apps)
            if ([app.identifier isEqual:self.info[@"id"]]) {
                RunMutation(self, app, self.archive, NO);
                return;
            }
        Show(self, @"目标未安装",
             error.localizedDescription ?: @"请先安装同一应用标识的目标程序。");
    }
    if (path.row == 5) {
        UIAlertController *waiting =
            [UIAlertController alertControllerWithTitle:@"正在校验"
                                                message:@"读取完整归档并检查 ZIP 数据…"
                                         preferredStyle:UIAlertControllerStyleAlert];
        [self presentViewController:waiting animated:YES completion:nil];
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
            NSError *error = nil;
            BOOL ok = [AMExtraction verifyArchive:self.archive error:&error];
            dispatch_async(dispatch_get_main_queue(), ^{
                [waiting dismissViewControllerAnimated:YES
                                            completion:^{
                                                Show(self, ok ? @"校验通过" : @"校验失败",
                                                     ok ? @"归档可完整读取，ZIP "
                                                          @"校验通过。此结果不能代替真机恢复验证。"
                                                        : error.localizedDescription);
                                            }];
            });
        });
    }
}
@end
UIViewController *AMArchiveDetails(NSURL *archive) {
    AMArchiveController *view =
        [[AMArchiveController alloc] initWithStyle:UITableViewStyleInsetGrouped];
    view.archive = archive;
    return view;
}
@interface AMDetailsController : UITableViewController
@property(nonatomic, strong) AMApplication *app;
@property(nonatomic, copy) void (^backup)(void);
@property(nonatomic, copy) NSArray<NSDictionary *> *rows;
@end
@implementation AMDetailsController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = self.app.name;
    self.tableView.rowHeight = UITableViewAutomaticDimension;
    self.tableView.estimatedRowHeight = 60;
    NSMutableArray *rows = [NSMutableArray array];
    for (NSArray *pair in @[
             @[ @"标识符", self.app.identifier ],
             @[ @"版本", [AMRead(self.app.proxy, @"shortVersionString") description] ?: @"未知" ],
             @[
                 @"应用大小",
                 [NSByteCountFormatter
                     stringFromByteCount:[AMRead(self.app.proxy, @"staticDiskUsage") longLongValue]
                              countStyle:NSByteCountFormatterCountStyleFile]
             ],
             @[
                 @"数据大小",
                 [NSByteCountFormatter stringFromByteCount:(long long)self.app.dataBytes
                                                countStyle:NSByteCountFormatterCountStyleFile]
             ],
             @[ @"数据容器", self.app.dataURL.path ?: @"无" ]
         ])
        [rows addObject:@{@"title" : pair[0], @"value" : pair[1]}];
    [rows addObject:@{@"title" : @"权限信息", @"object" : self.app.entitlements}];
    [rows addObject:@{@"title" : @"共享容器", @"object" : [self.app.groupURLs description]}];
    [rows addObject:@{@"title" : @"扩展容器", @"object" : [self.app.extensionURLs description]}];
    [rows addObject:@{@"title" : @"偏好设置（XML 编辑）", @"action" : @"preferences"}];
    [rows addObject:@{@"title" : @"备份应用数据", @"action" : @"backup"}];
    [rows addObject:@{@"title" : @"查看备份 / 恢复", @"action" : @"backups"}];
    [rows addObject:@{@"title" : @"擦除应用数据", @"action" : @"wipe"}];
    self.rows = rows;
}
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    (void)tableView;
    (void)section;
    return self.rows.count;
}
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)path {
    (void)tableView;
    UITableViewCell *cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle
                                                   reuseIdentifier:nil];
    NSDictionary *row = self.rows[path.row];
    cell.textLabel.text = row[@"title"];
    cell.detailTextLabel.text = row[@"value"];
    cell.detailTextLabel.numberOfLines = 0;
    cell.accessoryType = row[@"action"] || row[@"object"]
                             ? UITableViewCellAccessoryDisclosureIndicator
                             : UITableViewCellAccessoryNone;
    return cell;
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)path {
    [tableView deselectRowAtIndexPath:path animated:YES];
    NSDictionary *row = self.rows[path.row];
    NSString *action = row[@"action"];
    if (row[@"object"]) {
        [self.navigationController
            pushViewController:AMPropertyListViewer(row[@"object"], row[@"title"])
                      animated:YES];
        return;
    }
    if ([action isEqual:@"backup"]) {
        self.backup();
        return;
    }
    if ([action isEqual:@"wipe"]) {
        RunMutation(self, self.app, nil, YES);
        return;
    }
    if ([action isEqual:@"backups"]) {
        UIAlertController *choose =
            [UIAlertController alertControllerWithTitle:@"选择备份"
                                                message:nil
                                         preferredStyle:UIAlertControllerStyleActionSheet];
        for (NSURL *url in AMBackup.archives) {
            NSDictionary *info = [AMOperations infoForArchive:url error:nil];
            if ([info[@"id"] isEqual:self.app.identifier])
                [choose addAction:[UIAlertAction
                                      actionWithTitle:url.lastPathComponent
                                                style:UIAlertActionStyleDefault
                                              handler:^(UIAlertAction *item) {
                                                  (void)item;
                                                  [self.navigationController
                                                      pushViewController:AMArchiveDetails(url)
                                                                animated:YES];
                                              }]];
        }
        [choose addAction:[UIAlertAction actionWithTitle:@"取消"
                                                   style:UIAlertActionStyleCancel
                                                 handler:nil]];
        choose.popoverPresentationController.sourceView = tableView;
        choose.popoverPresentationController.sourceRect = [tableView rectForRowAtIndexPath:path];
        [self presentViewController:choose animated:YES completion:nil];
        return;
    }
    if ([action isEqual:@"preferences"]) {
        [self editPreferences];
        return;
    }
    if (row[@"value"]) {
        UIPasteboard.generalPasteboard.string = row[@"value"];
        Show(self, @"已复制", row[@"title"]);
    }
}
- (void)editPreferences {
    NSError *error = nil;
    NSDictionary *values = [AMPreferences readDomain:self.app.identifier
                                           container:self.app.dataURL
                                               error:&error];
    if (!values) {
        Show(self, @"读取失败", error.localizedDescription);
        return;
    }
    NSData *xml = [NSPropertyListSerialization dataWithPropertyList:values
                                                             format:NSPropertyListXMLFormat_v1_0
                                                            options:0
                                                              error:&error];
    if (!xml) {
        Show(self, @"无法编辑", error.localizedDescription);
        return;
    }
    AMTextController *editor = [AMTextController new];
    editor.title = @"偏好设置";
    editor.text = [[NSString alloc] initWithData:xml encoding:NSUTF8StringEncoding];
    __weak AMTextController *weakEditor = editor;
    editor.save = ^(NSString *text) {
        if (![NSUserDefaults.standardUserDefaults boolForKey:@"EnableDataChanges"]) {
            Show(weakEditor, @"数据写入未启用",
                 @"请先在测试应用完成验证，再在设置中启用数据写入。");
            return;
        }
        NSError *failure = nil;
        id updated = [NSPropertyListSerialization
            propertyListWithData:[text dataUsingEncoding:NSUTF8StringEncoding]
                         options:NSPropertyListImmutable
                          format:NULL
                           error:&failure];
        if (![updated isKindOfClass:NSDictionary.class]) {
            Show(weakEditor, @"未保存", failure.localizedDescription ?: @"根节点必须是 Dictionary");
            return;
        }
        UIAlertController *confirm = [UIAlertController
            alertControllerWithTitle:@"保存偏好设置"
                             message:@"请先关闭目标应用。将先生成完整备份，再写入和读回验证。"
                      preferredStyle:UIAlertControllerStyleAlert];
        [confirm addAction:[UIAlertAction actionWithTitle:@"取消"
                                                    style:UIAlertActionStyleCancel
                                                  handler:nil]];
        [confirm
            addAction:
                [UIAlertAction
                    actionWithTitle:@"备份并保存"
                              style:UIAlertActionStyleDestructive
                            handler:^(UIAlertAction *item) {
                                (void)item;
                                UIAlertController *waiting = [UIAlertController
                                    alertControllerWithTitle:@"正在备份并保存"
                                                     message:nil
                                              preferredStyle:UIAlertControllerStyleAlert];
                                [weakEditor presentViewController:waiting
                                                         animated:YES
                                                       completion:nil];
                                dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
                                    NSError *saveError = nil;
                                    BOOL ok =
                                        [AMBackup backup:self.app
                                            includeKeychain:YES
                                                   progress:^(NSString *message) {
                                                       dispatch_async(dispatch_get_main_queue(), ^{
                                                           waiting.message = message;
                                                       });
                                                   }
                                                      error:&saveError];
                                    if (ok) {
                                        NSDictionary *beforeSave =
                                            [AMPreferences readDomain:self.app.identifier
                                                            container:self.app.dataURL
                                                                error:&saveError];
                                        ok = beforeSave != nil;
                                        if (ok) {
                                            ok = [AMPreferences writeDomain:self.app.identifier
                                                                  container:self.app.dataURL
                                                                     values:updated
                                                                      error:&saveError];
                                            if (!ok) {
                                                NSError *rollbackError = nil;
                                                if (![AMPreferences writeDomain:self.app.identifier
                                                                      container:self.app.dataURL
                                                                         values:beforeSave
                                                                          error:&rollbackError])
                                                    saveError = AMError(
                                                        116,
                                                        [NSString stringWithFormat:
                                                                      @"偏好设置回退失败：%@"
                                                                      @"。完整备份已保留。",
                                                                      rollbackError
                                                                          .localizedDescription]);
                                            }
                                        }
                                    }
                                    dispatch_async(dispatch_get_main_queue(), ^{
                                        [waiting
                                            dismissViewControllerAnimated:YES
                                                               completion:^{
                                                                   Show(
                                                                       weakEditor,
                                                                       ok ? @"已保存" : @"未完成",
                                                                       ok ? @"偏好设置读回一致，完"
                                                                            @"整备份已保留。"
                                                                          : saveError
                                                                                .localizedDescription);
                                                               }];
                                    });
                                });
                            }]];
        [weakEditor presentViewController:confirm animated:YES completion:nil];
    };
    [self.navigationController pushViewController:editor animated:YES];
}
@end
UIViewController *AMApplicationDetails(AMApplication *app, void (^backup)(void)) {
    AMDetailsController *view =
        [[AMDetailsController alloc] initWithStyle:UITableViewStyleInsetGrouped];
    view.app = app;
    view.backup = backup;
    return view;
}
@interface AMRecoveryController : UITableViewController
@property(nonatomic, copy) NSArray<NSURL *> *records;
@end
@implementation AMRecoveryController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = @"恢复记录";
    self.tableView.rowHeight = UITableViewAutomaticDimension;
    self.tableView.estimatedRowHeight = 70;
}
- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    self.records = [NSFileManager.defaultManager
                         contentsOfDirectoryAtURL:AMOperations.recoveryDirectory
                       includingPropertiesForKeys:nil
                                          options:NSDirectoryEnumerationSkipsHiddenFiles
                                            error:nil]
                       ?: @[];
    [self.tableView reloadData];
}
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    (void)tableView;
    (void)section;
    return self.records.count;
}
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)path {
    (void)tableView;
    UITableViewCell *cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle
                                                   reuseIdentifier:nil];
    NSDictionary *journal = [NSDictionary
        dictionaryWithContentsOfURL:[self.records[path.row]
                                        URLByAppendingPathComponent:@"Journal.plist"]];
    cell.textLabel.text = journal[@"application"] ?: self.records[path.row].lastPathComponent;
    cell.detailTextLabel.text = [NSString
        stringWithFormat:@"%@ · %@", journal[@"date"] ?: @"", journal[@"state"] ?: @"无日志"];
    cell.detailTextLabel.numberOfLines = 0;
    return cell;
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)path {
    [tableView deselectRowAtIndexPath:path animated:YES];
    NSURL *url = [self.records[path.row] URLByAppendingPathComponent:@"Journal.plist"];
    NSDictionary *journal = [NSDictionary dictionaryWithContentsOfURL:url];
    NSString *state = journal[@"state"];
    if (![@[ @"movingFiles", @"changingPreferences", @"changingKeychain", @"needsRecovery" ]
            containsObject:state]) {
        NSDictionary *summary = @{
            @"应用" : journal[@"application"] ?: @"未知",
            @"状态" : state ?: @"无日志",
            @"记录目录" : self.records[path.row].path,
            @"保留旧数据的目录" : journal[@"retainedDirectories"] ?: @[]
        };
        [self.navigationController pushViewController:AMPropertyListViewer(summary, @"记录详情")
                                             animated:YES];
        return;
    }
    NSError *error = nil;
    AMApplication *target = nil;
    for (AMApplication *app in [AMApplicationRegistry applicationsWithError:&error])
        if ([app.identifier isEqual:journal[@"application"]])
            target = app;
    if (!target) {
        Show(self, @"无法自动回退",
             error.localizedDescription ?: @"原目标应用或容器不可用。请保留记录目录和原数据。");
        return;
    }
    UIAlertController *confirm = [UIAlertController
        alertControllerWithTitle:@"回退未完成的操作"
                         message:
                             @"请先关闭目标应用。将按日志恢复旧数据，不会永久删除保留的恢复记录。"
                  preferredStyle:UIAlertControllerStyleAlert];
    [confirm addAction:[UIAlertAction actionWithTitle:@"取消"
                                                style:UIAlertActionStyleCancel
                                              handler:nil]];
    [confirm
        addAction:
            [UIAlertAction
                actionWithTitle:@"回退旧数据"
                          style:UIAlertActionStyleDestructive
                        handler:^(UIAlertAction *action) {
                            (void)action;
                            UIAlertController *waiting = [UIAlertController
                                alertControllerWithTitle:@"正在回退"
                                                 message:@"请保持程序在前台…"
                                          preferredStyle:UIAlertControllerStyleAlert];
                            [self presentViewController:waiting animated:YES completion:nil];
                            self.tabBarController.tabBar.userInteractionEnabled = NO;
                            dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
                                NSError *failure = nil;
                                BOOL ok = [AMOperations recoverJournal:url
                                                           application:target
                                                                 error:&failure];
                                dispatch_async(dispatch_get_main_queue(), ^{
                                    self.tabBarController.tabBar.userInteractionEnabled = YES;
                                    [self.tableView reloadData];
                                    [waiting
                                        dismissViewControllerAnimated:YES
                                                           completion:^{
                                                               Show(self,
                                                                    ok ? @"已回退" : @"未完成",
                                                                    ok ? @"旧数据已回退。恢复记录仍"
                                                                         @"保留，请继续验证目标应用"
                                                                         @"。"
                                                                       : failure
                                                                             .localizedDescription);
                                                           }];
                                });
                            });
                        }]];
    [self presentViewController:confirm animated:YES completion:nil];
}
@end
UIViewController *AMRecoveryRecords(void) {
    return [[AMRecoveryController alloc] initWithStyle:UITableViewStyleInsetGrouped];
}
@interface AMRetainedController : UITableViewController
@property(nonatomic, copy) NSArray<NSURL *> *items;
@end
@implementation AMRetainedController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = @"保留区";
    self.tableView.rowHeight = UITableViewAutomaticDimension;
    self.tableView.estimatedRowHeight = 65;
    self.navigationItem.prompt = @"已移出的归档仍保留，可重新加入备份列表";
}
- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    self.items = AMBackupStore.retainedArchives;
    [self.tableView reloadData];
}
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    (void)tableView;
    (void)section;
    return self.items.count;
}
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)path {
    (void)tableView;
    UITableViewCell *cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault
                                                   reuseIdentifier:nil];
    cell.textLabel.numberOfLines = 0;
    cell.textLabel.text = self.items[path.row].lastPathComponent;
    return cell;
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)path {
    [tableView deselectRowAtIndexPath:path animated:YES];
    NSURL *url = self.items[path.row];
    UIAlertController *choose =
        [UIAlertController alertControllerWithTitle:url.lastPathComponent
                                            message:nil
                                     preferredStyle:UIAlertControllerStyleActionSheet];
    [choose addAction:[UIAlertAction actionWithTitle:@"查看详情"
                                               style:UIAlertActionStyleDefault
                                             handler:^(UIAlertAction *action) {
                                                 (void)action;
                                                 [self.navigationController
                                                     pushViewController:AMArchiveDetails(url)
                                                               animated:YES];
                                             }]];
    [choose
        addAction:[UIAlertAction actionWithTitle:@"重新加入备份列表"
                                           style:UIAlertActionStyleDefault
                                         handler:^(UIAlertAction *action) {
                                             (void)action;
                                             NSError *error = nil;
                                             BOOL ok = [AMBackupStore reactivate:url error:&error];
                                             self.items = AMBackupStore.retainedArchives;
                                             [tableView reloadData];
                                             if (!ok)
                                                 Show(self, @"未完成", error.localizedDescription);
                                         }]];
    [choose addAction:[UIAlertAction actionWithTitle:@"取消"
                                               style:UIAlertActionStyleCancel
                                             handler:nil]];
    choose.popoverPresentationController.sourceView = tableView;
    choose.popoverPresentationController.sourceRect = [tableView rectForRowAtIndexPath:path];
    [self presentViewController:choose animated:YES completion:nil];
}
@end
UIViewController *AMRetainedBackups(void) {
    return [[AMRetainedController alloc] initWithStyle:UITableViewStyleInsetGrouped];
}
