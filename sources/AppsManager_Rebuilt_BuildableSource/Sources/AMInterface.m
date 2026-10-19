#import "AMBackup.h"
#import "AMKeychain.h"
#import "AMOperations.h"
#import "AMMaintenanceUI.h"
#import "AMBackupStore.h"
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#include <sys/stat.h>

static void Alert(UIViewController *view, NSString *title, NSString *message) {
    UIAlertController *alert =
        [UIAlertController alertControllerWithTitle:title
                                            message:message
                                     preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"确定"
                                              style:UIAlertActionStyleDefault
                                            handler:nil]];
    [view presentViewController:alert animated:YES completion:nil];
}
@interface AMAppsController : UITableViewController <UISearchResultsUpdating>
@property(nonatomic, copy) NSArray<AMApplication *> *applications;
@property(nonatomic, copy) NSArray<AMApplication *> *visibleApplications;
@property(nonatomic, strong) NSMutableSet<NSString *> *selectedIdentifiers;
@property(nonatomic, strong) UISearchController *search;
@property(nonatomic) BOOL busy;
@property(nonatomic) BOOL cancelRequested;
@end
@implementation AMAppsController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = @"应用";
    self.selectedIdentifiers = [NSMutableSet set];
    self.applications = @[];
    self.visibleApplications = @[];
    self.tableView.allowsMultipleSelectionDuringEditing = YES;
    self.tableView.rowHeight = UITableViewAutomaticDimension;
    self.tableView.estimatedRowHeight = 72;
    self.search = [[UISearchController alloc] initWithSearchResultsController:nil];
    self.search.searchResultsUpdater = self;
    self.search.obscuresBackgroundDuringPresentation = NO;
    self.search.searchBar.placeholder = @"搜索名称或标识符";
    self.navigationItem.searchController = self.search;
    self.definesPresentationContext = YES;
    self.refreshControl = [UIRefreshControl new];
    [self.refreshControl addTarget:self
                            action:@selector(reloadApplications)
                  forControlEvents:UIControlEventValueChanged];
    [self updateButtons];
    [self reloadApplications];
}
- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    [self.navigationController setToolbarHidden:!self.editing animated:animated];
}
- (void)reloadApplications {
    if (self.busy) {
        [self.refreshControl endRefreshing];
        return;
    }
    self.navigationItem.prompt = @"正在读取应用列表…";
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        NSError *error = nil;
        NSArray *apps = [AMApplicationRegistry applicationsWithError:&error];
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.refreshControl endRefreshing];
            self.navigationItem.prompt = nil;
            if (error) {
                Alert(self, @"读取失败", error.localizedDescription);
                return;
            }
            self.applications = apps;
            NSMutableSet *available = [NSMutableSet set];
            for (AMApplication *app in apps)
                [available addObject:app.identifier];
            [self.selectedIdentifiers intersectSet:available];
            [self filter];
        });
    });
}
- (void)updateSearchResultsForSearchController:(UISearchController *)searchController {
    (void)searchController;
    [self filter];
}
- (void)filter {
    NSString *query = self.search.searchBar.text ?: @"";
    self.visibleApplications =
        query.length ? [self.applications
                           filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:^BOOL(
                                                                        AMApplication *app,
                                                                        NSDictionary *bindings) {
                               (void)bindings;
                               return [app.name localizedCaseInsensitiveContainsString:query] ||
                                      [app.identifier localizedCaseInsensitiveContainsString:query];
                           }]]
                     : self.applications;
    [self.tableView reloadData];
    [self syncSelection];
    [self updateButtons];
}
- (void)syncSelection {
    if (!self.editing)
        return;
    [self.visibleApplications
        enumerateObjectsUsingBlock:^(AMApplication *app, NSUInteger index, BOOL *stop) {
            (void)stop;
            NSIndexPath *path = [NSIndexPath indexPathForRow:(NSInteger)index inSection:0];
            if ([self.selectedIdentifiers containsObject:app.identifier])
                [self.tableView selectRowAtIndexPath:path
                                            animated:NO
                                      scrollPosition:UITableViewScrollPositionNone];
            else
                [self.tableView deselectRowAtIndexPath:path animated:NO];
        }];
}
- (void)updateButtons {
    if (self.busy)
        return;
    if (self.editing) {
        self.navigationItem.leftBarButtonItems = @[
            [[UIBarButtonItem alloc] initWithTitle:@"全选"
                                             style:UIBarButtonItemStylePlain
                                            target:self
                                            action:@selector(selectAll)],
            [[UIBarButtonItem alloc] initWithTitle:@"反选"
                                             style:UIBarButtonItemStylePlain
                                            target:self
                                            action:@selector(invert)]
        ];
        self.navigationItem.rightBarButtonItem =
            [[UIBarButtonItem alloc] initWithTitle:@"取消"
                                             style:UIBarButtonItemStyleDone
                                            target:self
                                            action:@selector(toggleSelection)];
        UIBarButtonItem *backup = [[UIBarButtonItem alloc]
            initWithTitle:[NSString stringWithFormat:@"一键备份数据（%lu）",
                                                     (unsigned long)self.selectedIdentifiers.count]
                    style:UIBarButtonItemStyleDone
                   target:self
                   action:@selector(backupSelected)];
        backup.enabled = self.selectedIdentifiers.count > 0;
        self.toolbarItems = @[
            [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace
                                                          target:nil
                                                          action:nil],
            backup,
            [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace
                                                          target:nil
                                                          action:nil]
        ];
    } else {
        self.navigationItem.leftBarButtonItems = nil;
        self.navigationItem.rightBarButtonItem =
            [[UIBarButtonItem alloc] initWithTitle:@"多选"
                                             style:UIBarButtonItemStylePlain
                                            target:self
                                            action:@selector(toggleSelection)];
    }
}
- (void)toggleSelection {
    [self setEditing:!self.editing animated:YES];
    if (!self.editing)
        [self.selectedIdentifiers removeAllObjects];
    [self.navigationController setToolbarHidden:!self.editing animated:YES];
    [self syncSelection];
    [self updateButtons];
}
- (void)selectAll {
    for (AMApplication *app in self.visibleApplications)
        [self.selectedIdentifiers addObject:app.identifier];
    [self syncSelection];
    [self updateButtons];
}
- (void)invert {
    for (AMApplication *app in self.visibleApplications)
        if ([self.selectedIdentifiers containsObject:app.identifier])
            [self.selectedIdentifiers removeObject:app.identifier];
        else
            [self.selectedIdentifiers addObject:app.identifier];
    [self syncSelection];
    [self updateButtons];
}
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    (void)tableView;
    (void)section;
    return self.visibleApplications.count;
}
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)path {
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"Application"];
    if (!cell)
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle
                                      reuseIdentifier:@"Application"];
    AMApplication *app = self.visibleApplications[path.row];
    UIListContentConfiguration *content = [UIListContentConfiguration subtitleCellConfiguration];
    content.text = app.name;
    content.textProperties.numberOfLines = 2;
    content.secondaryTextProperties.numberOfLines = 2;
    content.secondaryText =
        [NSString stringWithFormat:@"应用 %@ · 数据 %@",
                                   [NSByteCountFormatter
                                       stringFromByteCount:(long long)app.codeBytes
                                                countStyle:NSByteCountFormatterCountStyleFile],
                                   [NSByteCountFormatter
                                       stringFromByteCount:(long long)app.dataBytes
                                                countStyle:NSByteCountFormatterCountStyleFile]];
    content.image = app.icon;
    content.imageProperties.maximumSize = CGSizeMake(40, 40);
    content.imageProperties.cornerRadius = 8;
    cell.contentConfiguration = content;
    cell.accessoryType = UITableViewCellAccessoryNone;
    cell.accessibilityLabel =
        [NSString stringWithFormat:@"%@，%@", app.name, content.secondaryText];
    return cell;
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)path {
    AMApplication *app = self.visibleApplications[path.row];
    if (self.editing) {
        [self.selectedIdentifiers addObject:app.identifier];
        [self updateButtons];
        return;
    }
    [tableView deselectRowAtIndexPath:path animated:YES];
    __weak AMAppsController *weakSelf = self;
    [self.navigationController
        pushViewController:AMApplicationDetails(app,
                                                ^{
                                                    [weakSelf.navigationController
                                                        popToViewController:weakSelf
                                                                   animated:NO];
                                                    dispatch_async(dispatch_get_main_queue(), ^{
                                                        [weakSelf beginBackup:@[ app ]];
                                                    });
                                                })
                  animated:YES];
}
- (void)tableView:(UITableView *)tableView didDeselectRowAtIndexPath:(NSIndexPath *)path {
    (void)tableView;
    if (self.editing) {
        [self.selectedIdentifiers removeObject:self.visibleApplications[path.row].identifier];
        [self updateButtons];
    }
}
- (void)backupSelected {
    NSMutableArray *selected = [NSMutableArray array];
    for (AMApplication *app in self.applications)
        if ([self.selectedIdentifiers containsObject:app.identifier])
            [selected addObject:app];
    [self beginBackup:selected];
}
- (void)beginBackup:(NSArray<AMApplication *> *)apps {
    if (self.busy || !apps.count)
        return;
    BOOL keychain = ![NSUserDefaults.standardUserDefaults boolForKey:@"DataOnly"];
    NSString *message = [NSString
        stringWithFormat:
            @"将备份 %lu "
            @"个应用%@"
            @"。请先关闭目标应用及共用同一数据容器的应用，解锁设备并保持本程序在前台。\n\n生成 "
            @".adbk 归档，可在备份页校验、导出或恢复。原版格式互通仍需通过测试应用的真机往返验证。",
            (unsigned long)apps.count,
            keychain ? @"的数据、钥匙串和专属剪贴板" : @"的数据（不含钥匙串和专属剪贴板）"];
    UIAlertController *confirmation =
        [UIAlertController alertControllerWithTitle:@"备份应用"
                                            message:message
                                     preferredStyle:UIAlertControllerStyleAlert];
    [confirmation addAction:[UIAlertAction actionWithTitle:@"取消"
                                                     style:UIAlertActionStyleCancel
                                                   handler:nil]];
    [confirmation addAction:[UIAlertAction actionWithTitle:@"开始备份"
                                                     style:UIAlertActionStyleDefault
                                                   handler:^(UIAlertAction *action) {
                                                       (void)action;
                                                       [self runBackup:apps keychain:keychain];
                                                   }]];
    [self presentViewController:confirmation animated:YES completion:nil];
}
- (void)runBackup:(NSArray<AMApplication *> *)apps keychain:(BOOL)keychain {
    self.busy = YES;
    self.cancelRequested = NO;
    self.tableView.userInteractionEnabled = NO;
    self.search.searchBar.userInteractionEnabled = NO;
    self.navigationItem.leftBarButtonItems = nil;
    self.navigationItem.rightBarButtonItem = nil;
    self.tabBarController.tabBar.userInteractionEnabled = NO;
    UIApplication.sharedApplication.idleTimerDisabled = YES;
    UIAlertController *progress =
        [UIAlertController alertControllerWithTitle:@"正在备份"
                                            message:@"正在准备…"
                                     preferredStyle:UIAlertControllerStyleAlert];
    [progress addAction:[UIAlertAction actionWithTitle:@"完成当前项后停止"
                                                 style:UIAlertActionStyleCancel
                                               handler:^(UIAlertAction *action) {
                                                   (void)action;
                                                   self.cancelRequested = YES;
                                                   self.navigationItem.prompt =
                                                       @"正在完成当前备份，随后停止…";
                                               }]];
    [self presentViewController:progress animated:YES completion:nil];
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        NSMutableArray *failures = [NSMutableArray array];
        __block NSUInteger success = 0;
        for (NSUInteger index = 0; index < apps.count; index++) {
            __block BOOL cancel = NO;
            dispatch_sync(dispatch_get_main_queue(), ^{
                cancel = self.cancelRequested;
            });
            if (cancel)
                break;
            AMApplication *app = apps[index];
            NSError *error = nil;
            BOOL ok = [AMBackup
                         backup:app
                includeKeychain:keychain
                       progress:^(NSString *message) {
                           dispatch_async(dispatch_get_main_queue(), ^{
                               progress.message = [NSString
                                   stringWithFormat:@"%lu/%lu %@\n%@", (unsigned long)(index + 1),
                                                    (unsigned long)apps.count, app.name, message];
                           });
                       }
                          error:&error];
            if (ok)
                success++;
            else
                [failures addObject:[NSString stringWithFormat:@"%@：%@", app.name,
                                                               error.localizedDescription
                                                                   ?: @"未知错误"]];
        }
        dispatch_async(dispatch_get_main_queue(), ^{
            self.busy = NO;
            self.navigationItem.prompt = nil;
            self.tableView.userInteractionEnabled = YES;
            self.search.searchBar.userInteractionEnabled = YES;
            self.tabBarController.tabBar.userInteractionEnabled = YES;
            UIApplication.sharedApplication.idleTimerDisabled = NO;
            [self updateButtons];
            NSString *result =
                [NSString stringWithFormat:@"成功 %lu，失败 %lu，未处理 %lu。%@",
                                           (unsigned long)success, (unsigned long)failures.count,
                                           (unsigned long)(apps.count - success - failures.count),
                                           keychain ? @"" : @"\n本次不包含钥匙串。"];
            if (failures.count)
                result = [result
                    stringByAppendingFormat:@"\n\n%@", [failures componentsJoinedByString:@"\n"]];
            if (self.presentedViewController == progress)
                [progress dismissViewControllerAnimated:YES
                                             completion:^{
                                                 Alert(self, @"备份结果", result);
                                             }];
            else
                Alert(self, @"备份结果", result);
        });
    });
}
@end

@interface AMArchivesController : UITableViewController <UIDocumentPickerDelegate>
@property(nonatomic, copy) NSArray<NSURL *> *items;
@end
@implementation AMArchivesController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = @"备份";
    self.navigationItem.prompt = @"原版目录只读；管理归档可先导入维护版";
    self.tableView.rowHeight = UITableViewAutomaticDimension;
    self.tableView.estimatedRowHeight = 75;
    self.navigationItem.rightBarButtonItem =
        [[UIBarButtonItem alloc] initWithTitle:@"导入"
                                         style:UIBarButtonItemStylePlain
                                        target:self
                                        action:@selector(importBackup)];
    self.navigationItem.leftBarButtonItem =
        [[UIBarButtonItem alloc] initWithTitle:@"保留区"
                                         style:UIBarButtonItemStylePlain
                                        target:self
                                        action:@selector(showRetained)];
}
- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    self.items = AMBackup.archives;
    [self.tableView reloadData];
}
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    (void)tableView;
    (void)section;
    return self.items.count;
}
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)path {
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"Backup"];
    if (!cell)
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle
                                      reuseIdentifier:@"Backup"];
    NSURL *url = self.items[path.row];
    NSDictionary *attributes = [NSFileManager.defaultManager attributesOfItemAtPath:url.path
                                                                              error:nil];
    cell.textLabel.text = url.lastPathComponent;
    cell.textLabel.numberOfLines = 2;
    cell.detailTextLabel.text =
        [NSByteCountFormatter stringFromByteCount:[attributes[NSFileSize] longLongValue]
                                       countStyle:NSByteCountFormatterCountStyleFile];
    cell.accessoryType = UITableViewCellAccessoryDisclosureIndicator;
    return cell;
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)path {
    [tableView deselectRowAtIndexPath:path animated:YES];
    [self.navigationController pushViewController:AMArchiveDetails(self.items[path.row])
                                         animated:YES];
}
- (void)importBackup {
    UIDocumentPickerViewController *picker =
        [[UIDocumentPickerViewController alloc] initForOpeningContentTypes:@[ UTTypeData ]
                                                                    asCopy:YES];
    picker.delegate = self;
    [self presentViewController:picker animated:YES completion:nil];
}
- (void)showRetained {
    [self.navigationController pushViewController:AMRetainedBackups() animated:YES];
}
- (UISwipeActionsConfiguration *)tableView:(UITableView *)tableView
    trailingSwipeActionsConfigurationForRowAtIndexPath:(NSIndexPath *)path {
    NSURL *url = self.items[path.row];
    if (![AMBackupStore isOwnedActiveArchive:url])
        return [UISwipeActionsConfiguration configurationWithActions:@[]];
    UIContextualAction *retire = [UIContextualAction
        contextualActionWithStyle:UIContextualActionStyleDestructive
                            title:@"移出"
                          handler:^(UIContextualAction *action, UIView *source,
                                    void (^done)(BOOL)) {
                              (void)action;
                              (void)source;
                              UIAlertController *confirm = [UIAlertController
                                  alertControllerWithTitle:@"移入保留区"
                                                   message:@"归档会从活动列表移出，仍占用空间，可以"
                                                           @"从保留区找回。"
                                            preferredStyle:UIAlertControllerStyleAlert];
                              [confirm
                                  addAction:[UIAlertAction actionWithTitle:@"取消"
                                                                     style:UIAlertActionStyleCancel
                                                                   handler:^(UIAlertAction *item) {
                                                                       (void)item;
                                                                       done(NO);
                                                                   }]];
                              [confirm
                                  addAction:[UIAlertAction
                                                actionWithTitle:@"移入保留区"
                                                          style:UIAlertActionStyleDestructive
                                                        handler:^(UIAlertAction *item) {
                                                            (void)item;
                                                            NSError *error = nil;
                                                            BOOL ok = [AMBackupStore retire:url
                                                                                      error:&error];
                                                            done(ok);
                                                            self.items = AMBackup.archives;
                                                            [tableView reloadData];
                                                            if (!ok)
                                                                Alert(self, @"未完成",
                                                                      error.localizedDescription);
                                                        }]];
                              [self presentViewController:confirm animated:YES completion:nil];
                          }];
    UIContextualAction *rename = [UIContextualAction
        contextualActionWithStyle:UIContextualActionStyleNormal
                            title:@"改名"
                          handler:^(UIContextualAction *action, UIView *source,
                                    void (^done)(BOOL)) {
                              (void)action;
                              (void)source;
                              UIAlertController *edit = [UIAlertController
                                  alertControllerWithTitle:@"重命名归档"
                                                   message:
                                                       @"保留 .adbk 扩展名；同名文件不会被覆盖。"
                                            preferredStyle:UIAlertControllerStyleAlert];
                              [edit addTextFieldWithConfigurationHandler:^(UITextField *field) {
                                  field.text = url.lastPathComponent;
                              }];
                              [edit
                                  addAction:[UIAlertAction actionWithTitle:@"取消"
                                                                     style:UIAlertActionStyleCancel
                                                                   handler:^(UIAlertAction *item) {
                                                                       (void)item;
                                                                       done(NO);
                                                                   }]];
                              [edit addAction:[UIAlertAction
                                                  actionWithTitle:@"保存"
                                                            style:UIAlertActionStyleDefault
                                                          handler:^(UIAlertAction *item) {
                                                              (void)item;
                                                              NSError *error = nil;
                                                              BOOL ok = [AMBackupStore
                                                                    rename:url
                                                                  filename:edit.textFields
                                                                                   .firstObject.text
                                                                               ?: @""
                                                                     error:&error];
                                                              done(ok);
                                                              self.items = AMBackup.archives;
                                                              [tableView reloadData];
                                                              if (!ok)
                                                                  Alert(self, @"未完成",
                                                                        error.localizedDescription);
                                                          }]];
                              [self presentViewController:edit animated:YES completion:nil];
                          }];
    UISwipeActionsConfiguration *config =
        [UISwipeActionsConfiguration configurationWithActions:@[ retire, rename ]];
    config.performsFirstActionWithFullSwipe = NO;
    return config;
}
- (void)documentPicker:(UIDocumentPickerViewController *)controller
    didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls {
    (void)controller;
    NSURL *url = urls.firstObject;
    if (!url)
        return;
    UIAlertController *waiting =
        [UIAlertController alertControllerWithTitle:@"导入并校验"
                                            message:@"原文件保持不变…"
                                     preferredStyle:UIAlertControllerStyleAlert];
    [self presentViewController:waiting animated:YES completion:nil];
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        BOOL scoped = [url startAccessingSecurityScopedResource];
        NSError *error = nil;
        NSURL *imported = [AMOperations importArchive:url error:&error];
        if (scoped)
            [url stopAccessingSecurityScopedResource];
        dispatch_async(dispatch_get_main_queue(), ^{
            self.items = AMBackup.archives;
            [self.tableView reloadData];
            [waiting dismissViewControllerAnimated:YES
                                        completion:^{
                                            Alert(self, imported ? @"已导入" : @"导入失败",
                                                  imported ? @"归档已经读回校验并保存。"
                                                           : error.localizedDescription);
                                        }];
        });
    });
}
@end

@interface AMSettingsController : UITableViewController
@end
@implementation AMSettingsController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = @"设置";
    self.tableView.rowHeight = UITableViewAutomaticDimension;
    self.tableView.estimatedRowHeight = 90;
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
    cell.selectionStyle = UITableViewCellSelectionStyleNone;
    cell.detailTextLabel.numberOfLines = 0;
    if (path.row == 0) {
        cell.textLabel.text = @"包含钥匙串和专属剪贴板";
        cell.detailTextLabel.text = @"关闭后仅备份数据容器；归档会明确标记省略的部分。";
        UISwitch *toggle = [UISwitch new];
        toggle.on = ![NSUserDefaults.standardUserDefaults boolForKey:@"DataOnly"];
        [toggle addTarget:self
                      action:@selector(changeKeychain:)
            forControlEvents:UIControlEventValueChanged];
        cell.accessoryView = toggle;
    } else if (path.row == 1) {
        cell.textLabel.text = @"钥匙串签名工具";
        cell.detailTextLabel.text = AMKeychain.signerDescription;
    } else if (path.row == 2) {
        cell.textLabel.text = @"允许数据写入（候选版）";
        cell.detailTextLabel.text =
            @"用于恢复、擦除和偏好设置编辑。请先在无重要数据的测试应用验证。";
        UISwitch *toggle = [UISwitch new];
        toggle.on = [NSUserDefaults.standardUserDefaults boolForKey:@"EnableDataChanges"];
        [toggle addTarget:self
                      action:@selector(changeDataWrites:)
            forControlEvents:UIControlEventValueChanged];
        cell.accessoryView = toggle;
    } else if (path.row == 3) {
        cell.textLabel.text = @"恢复记录";
        cell.detailTextLabel.text = AMOperations.hasPendingRecovery
                                        ? @"有未结束的操作，恢复和擦除已被阻止。"
                                        : @"没有待处理操作；已成功操作的旧数据仍会保留。";
    } else if (path.row == 4) {
        cell.textLabel.text = @"每个应用的活动备份上限";
        NSInteger maximum = [NSUserDefaults.standardUserDefaults integerForKey:@"max-backups"];
        cell.detailTextLabel.text =
            maximum
                ? [NSString stringWithFormat:@"%ld；超出后移入保留区，不永久删除", (long)maximum]
                : @"无限制；所有归档保留";
        cell.accessoryType = UITableViewCellAccessoryDisclosureIndicator;
        cell.selectionStyle = UITableViewCellSelectionStyleDefault;
    } else {
        cell.textLabel.text = @"源码维护版";
        cell.detailTextLabel.text = @"依据原版恢复参考重建，可编译。支持 .adbk "
                                    @"结构、单项和多选备份、导入导出、受保护的恢复/"
                                    @"擦除和偏好设置编辑。身份凭据、跨签名团队迁移、专属剪贴板写入"
                                    @"尚未完成验证，会停止相关操作。";
    }
    return cell;
}
- (void)changeKeychain:(UISwitch *)sender {
    [NSUserDefaults.standardUserDefaults setBool:!sender.on forKey:@"DataOnly"];
}
- (void)changeDataWrites:(UISwitch *)sender {
    [NSUserDefaults.standardUserDefaults setBool:sender.on forKey:@"EnableDataChanges"];
}
- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    [self.tableView reloadData];
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)path {
    [tableView deselectRowAtIndexPath:path animated:YES];
    if (path.row == 3) {
        [self.navigationController pushViewController:AMRecoveryRecords() animated:YES];
        return;
    }
    if (path.row == 4) {
        UIAlertController *choose = [UIAlertController
            alertControllerWithTitle:@"活动备份上限"
                             message:@"新备份校验成功后，超出上限的旧归档移入保留区。"
                      preferredStyle:UIAlertControllerStyleActionSheet];
        for (NSInteger count = 0; count <= 10; count++)
            [choose addAction:[UIAlertAction
                                  actionWithTitle:count ? [NSString
                                                              stringWithFormat:@"%ld", (long)count]
                                                        : @"无限制"
                                            style:UIAlertActionStyleDefault
                                          handler:^(UIAlertAction *action) {
                                              (void)action;
                                              [NSUserDefaults.standardUserDefaults
                                                  setInteger:count
                                                      forKey:@"max-backups"];
                                              [tableView reloadData];
                                          }]];
        [choose addAction:[UIAlertAction actionWithTitle:@"取消"
                                                   style:UIAlertActionStyleCancel
                                                 handler:nil]];
        choose.popoverPresentationController.sourceView = tableView;
        choose.popoverPresentationController.sourceRect = [tableView rectForRowAtIndexPath:path];
        [self presentViewController:choose animated:YES completion:nil];
    }
}
@end

@interface AMAppDelegate : UIResponder <UIApplicationDelegate>
@property(nonatomic, strong) UIWindow *window;
@end
@implementation AMAppDelegate
- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)options {
    (void)application;
    (void)options;
    self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
    UITabBarController *tabs = [UITabBarController new];
    NSArray *controllers = @[
        [AMAppsController new], [[AMArchivesController alloc] initWithStyle:UITableViewStylePlain],
        [[AMSettingsController alloc] initWithStyle:UITableViewStyleInsetGrouped]
    ];
    NSArray *titles = @[ @"应用", @"备份", @"设置" ],
            *icons = @[ @"square.grid.2x2", @"archivebox", @"gearshape" ];
    NSMutableArray *navigation = [NSMutableArray array];
    for (NSUInteger i = 0; i < controllers.count; i++) {
        UINavigationController *nav =
            [[UINavigationController alloc] initWithRootViewController:controllers[i]];
        nav.tabBarItem = [[UITabBarItem alloc] initWithTitle:titles[i]
                                                       image:[UIImage systemImageNamed:icons[i]]
                                                         tag:(NSInteger)i];
        [navigation addObject:nav];
    }
    tabs.viewControllers = navigation;
    self.window.rootViewController = tabs;
    [self.window makeKeyAndVisible];
    return YES;
}
- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
    (void)application;
    (void)options;
    if (!url.isFileURL)
        return NO;
    dispatch_async(dispatch_get_main_queue(), ^{
        UITabBarController *tabs = (UITabBarController *)self.window.rootViewController;
        UIViewController *view =
            ((UINavigationController *)tabs.selectedViewController).topViewController;
        if (view.presentedViewController) {
            Alert(view.presentedViewController, @"暂不能导入",
                  @"请完成当前操作，再从备份页选择导入。");
            return;
        }
        UIAlertController *waiting =
            [UIAlertController alertControllerWithTitle:@"导入归档"
                                                message:@"正在读取和校验…"
                                         preferredStyle:UIAlertControllerStyleAlert];
        [view presentViewController:waiting animated:YES completion:nil];
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
            BOOL scoped = [url startAccessingSecurityScopedResource];
            NSError *error = nil;
            NSURL *imported = [AMOperations importArchive:url error:&error];
            if (scoped)
                [url stopAccessingSecurityScopedResource];
            dispatch_async(dispatch_get_main_queue(), ^{
                [waiting dismissViewControllerAnimated:YES
                                            completion:^{
                                                Alert(view, imported ? @"已导入" : @"导入失败",
                                                      imported ? @"归档已校验并保存在备份列表。"
                                                               : error.localizedDescription);
                                            }];
            });
        });
    });
    return YES;
}
@end
int main(int argc, char **argv) {
    @autoreleasepool {
        umask(077);
        return UIApplicationMain(argc, argv, nil, NSStringFromClass(AMAppDelegate.class));
    }
}
