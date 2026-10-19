#import "AMExtraction.h"
#import "AMModels.h"
#include "archive.h"
#include "archive_entry.h"
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>

static NSString *CleanName(const char *raw) {
    if (!raw)
        return nil;
    NSString *name = [NSString stringWithUTF8String:raw];
    if (!name.length || [name hasPrefix:@"/"] || [name containsString:@"\\"])
        return nil;
    while ([name hasPrefix:@"./"])
        name = [name substringFromIndex:2];
    while ([name hasSuffix:@"/"])
        name = [name substringToIndex:name.length - 1];
    for (NSString *part in [name componentsSeparatedByString:@"/"])
        if (!part.length || [part isEqualToString:@".."] || [part isEqualToString:@"."])
            return nil;
    return name.length ? name : nil;
}
static BOOL ArchiveError(struct archive *a, NSError **error) {
    const char *message = archive_error_string(a);
    if (error)
        *error = AMError(60, message ? @(message) : @"ZIP 读取或校验失败");
    return NO;
}
static struct archive *Reader(NSURL *url, NSError **error) {
    struct archive *reader = archive_read_new();
    if (!reader) {
        if (error)
            *error = AMError(61, @"无法创建 ZIP 读取器");
        return NULL;
    }
    if (archive_read_support_format_zip(reader) != ARCHIVE_OK ||
        archive_read_open_filename(reader, url.fileSystemRepresentation, 65536) != ARCHIVE_OK) {
        ArchiveError(reader, error);
        archive_read_free(reader);
        return NULL;
    }
    return reader;
}
static BOOL Parents(NSURL *root, NSString *name, NSError **error) {
    NSFileManager *fm = NSFileManager.defaultManager;
    NSURL *parent = root;
    NSArray *parts = [name componentsSeparatedByString:@"/"];
    for (NSUInteger i = 0; i + 1 < parts.count; i++) {
        parent = [parent URLByAppendingPathComponent:parts[i] isDirectory:YES];
        struct stat st;
        if (lstat(parent.fileSystemRepresentation, &st) == 0) {
            if (!S_ISDIR(st.st_mode)) {
                if (error)
                    *error = AMError(62, @"归档路径经过非目录或符号链接");
                return NO;
            }
        } else if (errno != ENOENT || ![fm createDirectoryAtURL:parent
                                          withIntermediateDirectories:NO
                                                           attributes:@{
                                                               NSFilePosixPermissions : @0700
                                                           }
                                                                error:error])
            return NO;
    }
    return YES;
}
@implementation AMExtraction
+ (BOOL)verifyArchive:(NSURL *)url error:(NSError **)error {
    struct archive *reader = Reader(url, error);
    if (!reader)
        return NO;
    struct archive_entry *entry = NULL;
    int status;
    BOOL success = NO;
    NSMutableSet *names = [NSMutableSet set];
    while ((status = archive_read_next_header(reader, &entry)) == ARCHIVE_OK) {
        NSString *name =
            CleanName(archive_entry_pathname_utf8(entry) ?: archive_entry_pathname(entry));
        if (!name || [names containsObject:name]) {
            if (error)
                *error = AMError(76, @"归档含无效或重复路径");
            break;
        }
        [names addObject:name];
        uint8_t buffer[65536];
        la_ssize_t count;
        while ((count = archive_read_data(reader, buffer, sizeof(buffer))) > 0) {
        }
        if (count < 0) {
            ArchiveError(reader, error);
            break;
        }
    }
    success = status == ARCHIVE_EOF;
    if (status < ARCHIVE_OK)
        ArchiveError(reader, error);
    if (archive_read_free(reader) != ARCHIVE_OK)
        success = NO;
    return success;
}
+ (NSData *)readEntry:(NSString *)name
          fromArchive:(NSURL *)url
          maximumSize:(NSUInteger)maximum
                error:(NSError **)error {
    struct archive *reader = Reader(url, error);
    if (!reader)
        return nil;
    NSMutableData *data = nil;
    struct archive_entry *entry = NULL;
    int status;
    while ((status = archive_read_next_header(reader, &entry)) == ARCHIVE_OK) {
        NSString *path =
            CleanName(archive_entry_pathname_utf8(entry) ?: archive_entry_pathname(entry));
        if (![path isEqualToString:name])
            continue;
        la_int64_t declared = archive_entry_size(entry);
        if (archive_entry_filetype(entry) != AE_IFREG || declared < 0 ||
            (uint64_t)declared > maximum) {
            if (error)
                *error = AMError(63, @"归档信息文件过大或类型无效");
            break;
        }
        data = [NSMutableData data];
        uint8_t buffer[65536];
        la_ssize_t count;
        while ((count = archive_read_data(reader, buffer, sizeof(buffer))) > 0) {
            if ((NSUInteger)count > maximum - data.length) {
                if (error)
                    *error = AMError(63, @"归档信息文件超过限制");
                data = nil;
                break;
            }
            [data appendBytes:buffer length:(NSUInteger)count];
        }
        if (count < 0) {
            ArchiveError(reader, error);
            data = nil;
        } else if (data.length != (NSUInteger)declared) {
            if (error)
                *error = AMError(64, @"归档信息文件长度不符");
            data = nil;
        }
        break;
    }
    if (status < ARCHIVE_OK) {
        ArchiveError(reader, error);
        data = nil;
    }
    if (!data && error && !*error)
        *error = AMError(65, [NSString stringWithFormat:@"归档中缺少 %@", name]);
    archive_read_free(reader);
    return data;
}
+ (BOOL)extract:(NSURL *)url toEmptyDirectory:(NSURL *)root error:(NSError **)error {
    NSFileManager *fm = NSFileManager.defaultManager;
    struct stat rootStat;
    if (lstat(root.fileSystemRepresentation, &rootStat) || !S_ISDIR(rootStat.st_mode)) {
        if (error)
            *error = AMError(66, @"解压目标必须是新建的私有目录");
        return NO;
    }
    NSArray *existing = [fm contentsOfDirectoryAtURL:root
                          includingPropertiesForKeys:nil
                                             options:0
                                               error:error];
    if (!existing || existing.count) {
        if (error && !*error)
            *error = AMError(67, @"解压目标不是空目录");
        return NO;
    }
    struct archive *reader = Reader(url, error);
    if (!reader)
        return NO;
    BOOL success = NO;
    int status = ARCHIVE_OK;
    struct archive_entry *entry = NULL;
    NSMutableSet *names = [NSMutableSet set];
    NSMutableArray *links = [NSMutableArray array], *directoryModes = [NSMutableArray array];
    NSDictionary *disk = [fm attributesOfFileSystemForPath:root.path error:error];
    unsigned long long free = [disk[NSFileSystemFreeSize] unsignedLongLongValue];
    unsigned long long budget = free > 268435456 ? free - 268435456 : 0, total = 0;
    if (!budget) {
        if (error)
            *error = AMError(68, @"可用空间不足，至少需要额外预留 256 MB");
        archive_read_free(reader);
        return NO;
    }
    while ((status = archive_read_next_header(reader, &entry)) == ARCHIVE_OK) {
        NSString *name =
            CleanName(archive_entry_pathname_utf8(entry) ?: archive_entry_pathname(entry));
        if (!name || [names containsObject:name] || archive_entry_hardlink(entry) ||
            archive_entry_is_encrypted(entry) > 0) {
            if (error)
                *error = AMError(69, @"归档包含无效路径、重复文件、硬链接或加密项");
            break;
        }
        [names addObject:name];
        if (!Parents(root, name, error))
            break;
        NSURL *destination = [root URLByAppendingPathComponent:name];
        mode_t type = archive_entry_filetype(entry);
        if (type == AE_IFDIR) {
            struct stat st;
            if (lstat(destination.fileSystemRepresentation, &st) == 0) {
                if (!S_ISDIR(st.st_mode)) {
                    if (error)
                        *error = AMError(70, @"目录与已有文件冲突");
                    break;
                }
            } else if (![fm createDirectoryAtURL:destination
                           withIntermediateDirectories:NO
                                            attributes:@{NSFilePosixPermissions : @0700}
                                                 error:error])
                break;
            [directoryModes addObject:@{
                @"url" : destination,
                @"mode" : @((archive_entry_perm(entry) & 0777) ?: 0700)
            }];
            continue;
        }
        if (type == AE_IFLNK) {
            const char *raw = archive_entry_symlink_utf8(entry) ?: archive_entry_symlink(entry);
            NSString *target = raw ? @(raw) : nil;
            NSString *resolved = [[name.stringByDeletingLastPathComponent
                stringByAppendingPathComponent:target ?: @""] stringByStandardizingPath];
            if (!target.length || target.isAbsolutePath || !CleanName(resolved.UTF8String)) {
                if (error)
                    *error = AMError(71, @"归档包含指向容器外部的符号链接，已停止");
                break;
            }
            [links addObject:@{@"name" : name, @"target" : target}];
            continue;
        }
        la_int64_t size = archive_entry_size(entry);
        if (type != AE_IFREG || size < 0 || (uint64_t)size > budget - total) {
            if (error)
                *error = AMError(72, @"不支持的归档项或空间不足");
            break;
        }
        int fd = open(destination.fileSystemRepresentation,
                      O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0600);
        if (fd < 0) {
            if (error)
                *error = AMError(errno, @"无法安全创建解压文件");
            break;
        }
        uint8_t buffer[65536];
        la_ssize_t count = 0;
        uint64_t actual = 0;
        BOOL ok = YES;
        while ((count = archive_read_data(reader, buffer, sizeof(buffer))) > 0) {
            if ((uint64_t)count > (uint64_t)size - actual) {
                ok = NO;
                if (error)
                    *error = AMError(73, @"归档项实际大小超出声明");
                break;
            }
            size_t at = 0;
            while (at < (size_t)count) {
                ssize_t written = write(fd, buffer + at, (size_t)count - at);
                if (written < 0 && errno == EINTR)
                    continue;
                if (written <= 0) {
                    ok = NO;
                    if (error)
                        *error = AMError(errno, @"写入解压文件失败");
                    break;
                }
                at += (size_t)written;
            }
            if (!ok)
                break;
            actual += (uint64_t)count;
        }
        if (count < 0) {
            ok = ArchiveError(reader, error);
        }
        if (actual != (uint64_t)size) {
            ok = NO;
            if (error && !*error)
                *error = AMError(74, @"归档项长度校验失败");
        }
        if (fchmod(fd, (archive_entry_perm(entry) & 0777) ?: 0600) != 0 || fsync(fd) != 0) {
            ok = NO;
            if (error)
                *error = AMError(errno, @"解压文件权限设置或落盘失败");
        }
        if (close(fd) != 0) {
            ok = NO;
            if (error)
                *error = AMError(errno, @"关闭解压文件失败");
        }
        if (!ok)
            break;
        total += actual;
    }
    if (status == ARCHIVE_EOF) {
        success = YES;
        for (NSDictionary *link in links) {
            NSURL *path = [root URLByAppendingPathComponent:link[@"name"]];
            if (!Parents(root, link[@"name"], error) ||
                ![fm createSymbolicLinkAtPath:path.path
                          withDestinationPath:link[@"target"]
                                        error:error]) {
                success = NO;
                break;
            }
        }
        if (success)
            for (NSDictionary *directory in directoryModes.reverseObjectEnumerator)
                if (chmod([directory[@"url"] fileSystemRepresentation],
                          [directory[@"mode"] unsignedShortValue])) {
                    success = NO;
                    if (error)
                        *error = AMError(errno, @"无法还原归档目录权限");
                    break;
                }
    } else if (status < ARCHIVE_OK)
        ArchiveError(reader, error);
    if (archive_read_free(reader) != ARCHIVE_OK) {
        success = NO;
        if (error)
            *error = AMError(75, @"ZIP 关闭校验失败");
    }
    return success;
}
@end
