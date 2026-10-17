#import "LegacyMediaLibrary.h"
#import <CommonCrypto/CommonDigest.h>
#import <CommonCrypto/CommonCryptor.h>
#import <sqlite3.h>
#include <string.h>

// Indexes supply display names only. Actual files determine visibility/counts.
// No migration marker, index record or database write is required for discovery.
@implementation LMItem
@end
@implementation LMGroup
@end

static NSString *LMString(id value) {
    if([value isKindOfClass:NSString.class])return value;
    if([value isKindOfClass:NSNumber.class])return [value stringValue];
    return @"";
}
static NSString *LMMD5(NSString *text) {
    NSData *data=[text dataUsingEncoding:NSUTF8StringEncoding];if(!data)return @"";
    unsigned char bytes[CC_MD5_DIGEST_LENGTH];CC_MD5(data.bytes,(CC_LONG)data.length,bytes);
    NSMutableString *digest=[NSMutableString stringWithCapacity:32];
    for(NSUInteger i=0;i<CC_MD5_DIGEST_LENGTH;i++)[digest appendFormat:@"%02x",bytes[i]];return digest;
}

// 1.6.2 helper 0x10002ebdc maps each key character's index in the 71-byte
// alphabet to the UTF-8 string made by initializer 0x10002e320. The latter's
// static array at 0x1001bb200 contains 77 bytes; only indexes 0...70 are used.
static const char LMOldIVAlphabet[] = "0123456789*[abcdefghijkl<mnopqrstuvwxyz>^ABCDEFGHIJK$?LMNOPQRSTUV:;WXYZ";
static const char LMOldIVReplacement[] = "mnop01*[abcd3456efghijkMNlqrxyzABCDtuvE>^H27<XYZnoJKLOPQRswSTUVW$?89:;FGHIVW$";
static BOOL LMOldIVBytes(const unsigned char *key, size_t length, unsigned char output[16]) {
    if (!key || length != 16) return NO;
    for (size_t i = 0; i < length; i++) {
        const char *match = key[i] ? strchr(LMOldIVAlphabet, key[i]) : NULL;
        if (!match) return NO;
        output[i] = (unsigned char)LMOldIVReplacement[match - LMOldIVAlphabet];
    }
    return YES;
}

static NSString *LMResolvedLegacyURL(NSString *url, NSString *key) {
    if (!url.length || !key.length) return url;
    if ([key isEqualToString:@"base64"]) {
        NSData *data = [[NSData alloc] initWithBase64EncodedString:url options:0];
        NSString *plain = data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : nil;
        // The old Base64 branch accepts a result only if it contains "//".
        return [plain containsString:@"//"] ? plain : nil;
    }
    NSData *keyData = [key dataUsingEncoding:NSUTF8StringEncoding];
    if (keyData.length != 16) return url;
    unsigned char iv[kCCBlockSizeAES128];
    if (!LMOldIVBytes(keyData.bytes, keyData.length, iv)) return nil;
    NSData *encrypted = [[NSData alloc] initWithBase64EncodedString:url options:0];
    if (!encrypted.length || encrypted.length % kCCBlockSizeAES128) return nil;
    NSMutableData *clear = [NSMutableData dataWithLength:encrypted.length + kCCBlockSizeAES128];
    size_t written = 0;
    // The shipped CryptoSwift String initializer uses CBC, and its Padding
    // enum's case 2 is pkcs7 (the case passed by the old URL resolver).
    CCCryptorStatus status = CCCrypt(kCCDecrypt, kCCAlgorithmAES, kCCOptionPKCS7Padding,
                                    keyData.bytes, keyData.length, iv,
                                    encrypted.bytes, encrypted.length,
                                    clear.mutableBytes, clear.length, &written);
    if (status != kCCSuccess) return nil;
    clear.length = written;
    NSString *plain = [[NSString alloc] initWithData:clear encoding:NSUTF8StringEncoding];
    return plain.length ? plain : nil;
}

static BOOL LMHashLike(NSString *text) {
    NSString *value = [text stringByReplacingOccurrencesOfString:@"-" withString:@""];
    if (value.length != 32) return NO;
    return [value rangeOfCharacterFromSet:[NSCharacterSet characterSetWithCharactersInString:@"0123456789abcdefABCDEF"].invertedSet].location == NSNotFound;
}

static NSString *LMDisplayString(id object) {
    NSString *text = [LMString(object) stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    return LMHashLike(text) ? @"" : text;
}

static NSString *LMURLTitle(NSString *url) {
    if (!url.length) return @"";
    NSURLComponents *parts = [NSURLComponents componentsWithString:url];
    if (!parts) return @"";
    NSString *host = LMDisplayString(parts.host);
    NSString *component = LMDisplayString(parts.path.lastPathComponent.stringByDeletingPathExtension);
    if (host.length && component.length) return [NSString stringWithFormat:@"%@ / %@", host, component];
    return host.length ? host : (parts.scheme.length ? component : @"");
}

static NSString *LMDateLabel(NSDate *date, BOOL video) {
    if (!date || [date compare:[NSDate dateWithTimeIntervalSince1970:0]] == NSOrderedAscending) return @"";
    NSDateFormatter *formatter = [NSDateFormatter new];
    formatter.locale = [NSLocale localeWithLocaleIdentifier:@"zh_CN"];
    formatter.dateFormat = @"yyyy-MM-dd HH:mm:ss";
    return [NSString stringWithFormat:@"%@ · %@", video ? @"录像" : @"截图", [formatter stringFromDate:date]];
}

static NSString *LMGroupFallback(NSURL *folder, NSArray<LMItem *> *items, BOOL video) {
    NSString *actualFolderName = LMDisplayString(folder.lastPathComponent);
    if (actualFolderName.length) return actualFolderName;
    NSDate *latest = nil;
    for (LMItem *item in items) if (!latest || [item.modifiedDate compare:latest] == NSOrderedDescending) latest = item.modifiedDate;
    NSString *dateTitle = LMDateLabel(latest, video);
    if (dateTitle.length) return dateTitle;
    NSString *actualFilename = LMDisplayString(items.firstObject.URL.lastPathComponent.stringByDeletingPathExtension);
    return actualFilename.length ? actualFilename : (video ? @"录像分组" : @"截图分组");
}
static NSData *LMContentDigest(LMItem *item) {
    static NSCache *cache;static dispatch_once_t once;
    dispatch_once(&once,^{cache=[NSCache new];cache.countLimit=1024;});
    NSString *key=[NSString stringWithFormat:@"%@|%.6f|%llu",item.URL.path,item.modifiedDate.timeIntervalSince1970,item.byteSize];
    NSData *cached=[cache objectForKey:key];if(cached)return cached;
    NSInputStream *stream=[NSInputStream inputStreamWithURL:item.URL];[stream open];
    CC_SHA256_CTX context;CC_SHA256_Init(&context);uint8_t buffer[65536];NSInteger length;unsigned long long total=0;
    while((length=[stream read:buffer maxLength:sizeof(buffer)])>0){CC_SHA256_Update(&context,buffer,(CC_LONG)length);total+=(unsigned long long)length;}
    [stream close];if(length<0||total!=item.byteSize)return nil;
    NSNumber *size=nil;NSDate *date=nil;[item.URL getResourceValue:&size forKey:NSURLFileSizeKey error:NULL];[item.URL getResourceValue:&date forKey:NSURLContentModificationDateKey error:NULL];
    if(size.unsignedLongLongValue!=item.byteSize||![date isEqualToDate:item.modifiedDate])return nil;
    uint8_t bytes[CC_SHA256_DIGEST_LENGTH];CC_SHA256_Final(bytes,&context);NSData *digest=[NSData dataWithBytes:bytes length:sizeof(bytes)];[cache setObject:digest forKey:key];return digest;
}
static NSArray<LMItem *> *LMUniqueCopies(NSArray<LMItem *> *items) {
    NSMutableDictionary<NSString *,NSMutableArray<LMItem *> *> *buckets=[NSMutableDictionary dictionary];NSMutableArray *result=[NSMutableArray array];
    for(LMItem *item in items){NSString *key=[NSString stringWithFormat:@"%@|%llu",item.URL.lastPathComponent,item.byteSize];NSMutableArray<LMItem *> *candidates=buckets[key];BOOL duplicate=NO;
        for(LMItem *previous in candidates){NSData *a=LMContentDigest(previous),*b=LMContentDigest(item);if(a&&b&&[a isEqualToData:b]){duplicate=YES;break;}}
        if(!duplicate){if(!candidates){candidates=[NSMutableArray array];buckets[key]=candidates;}[candidates addObject:item];[result addObject:item];}
    }return result;
}
static BOOL LMInsideRoots(NSURL *url,NSArray<NSURL *> *roots) {
    if(!url.isFileURL)return NO;NSString *path=url.URLByResolvingSymlinksInPath.path.stringByStandardizingPath;
    for(NSURL *root in roots){NSString *base=root.URLByResolvingSymlinksInPath.path.stringByStandardizingPath;
        if([path isEqualToString:base]||[path hasPrefix:[base stringByAppendingString:@"/"]])return YES;}
    return NO;
}
static BOOL LMRealDirectory(NSURL *url,NSArray<NSURL *> *roots) {
    NSNumber *directory=nil,*link=nil;
    [url getResourceValue:&directory forKey:NSURLIsDirectoryKey error:NULL];
    [url getResourceValue:&link forKey:NSURLIsSymbolicLinkKey error:NULL];
    return directory.boolValue&&!link.boolValue&&LMInsideRoots(url,roots);
}
static id LMPropertyList(NSData *data) {
    if(!data.length||data.length>32*1024*1024)return nil;
    return [NSPropertyListSerialization propertyListWithData:data options:NSPropertyListImmutable format:NULL error:NULL];
}
static NSArray *LMModelRows(id object) {
    if([object isKindOfClass:NSArray.class])return object;
    if([object isKindOfClass:NSDictionary.class]){
        for(NSString *key in @[@"models",@"items",@"data",@"list"]){id candidate=object[key];if([candidate isKindOfClass:NSArray.class])return candidate;}
    }
    return nil;
}
static NSArray *LMReadLegacyIndex(NSURL *url) {
    @try {
        NSNumber *size=nil;[url getResourceValue:&size forKey:NSURLFileSizeKey error:NULL];
        if(size.unsignedLongLongValue>32*1024*1024)return @[];
        NSData *raw=[NSData dataWithContentsOfURL:url options:NSDataReadingMappedIfSafe error:NULL];
        if(!raw)return @[];id plist=LMPropertyList(raw);NSArray *rows=LMModelRows(plist);if(rows)return rows;
        if([plist isKindOfClass:NSDictionary.class]&&[plist[@"$archiver"] isEqual:@"NSKeyedArchiver"]){
            // 1.6.2 archives the encoded plist as NSData using the older
            // archiveRootObject API. Read its data carriers directly: a secure
            // unarchive attempt can throw before a compatibility fallback runs.
            // No archived application class is instantiated.
            id objects=plist[@"$objects"];
            if([objects isKindOfClass:NSArray.class])for(id entry in objects){
                NSData *candidate=[entry isKindOfClass:NSData.class]?entry:nil;
                if([entry isKindOfClass:NSDictionary.class]&&[entry[@"NS.data"] isKindOfClass:NSData.class])candidate=entry[@"NS.data"];
                if(candidate){rows=LMModelRows(LMPropertyList(candidate));if(rows)return rows;}
            }
        }
        rows=LMModelRows([NSJSONSerialization JSONObjectWithData:raw options:0 error:NULL]);return rows?:@[];
    } @catch(NSException *exception){return @[];}
}

static void LMAddMetadata(NSDictionary *row,NSMutableDictionary *aliases,BOOL database) {
    // The old Decodable witness 0x10001b6f0 requests String.self for these
    // keyed fields. Optional storage in Swift memory is not a {some:...} or
    // {value:...} wrapper in the persisted plist; do not guess such wrappers.
    NSString *url=LMString(row[@"url"]);NSString *name=LMDisplayString(row[@"name"]);
    if(!name.length)name=LMDisplayString(row[@"anchorName"]);if(!name.length)name=LMDisplayString(row[@"roomName"]);
    if(!name.length)name=LMDisplayString(row[@"roomId"]);
    NSString *physicalID=LMString(row[@"id"]);NSString *platform=LMDisplayString(row[@"platform"]);
    NSMutableArray<NSString *> *variants=[NSMutableArray array];if(url.length)[variants addObject:url];
    NSString *key=LMString(row[@"aesKey"]);
    NSString *resolved=LMResolvedLegacyURL(url,key);
    if(resolved.length&&![variants containsObject:resolved])[variants addObject:resolved];
    if(!name.length)name=LMURLTitle(resolved);
    NSString *canonical=url.length?LMMD5(resolved.length?resolved:url):physicalID.lowercaseString;
    if(!canonical.length)return;
    NSMutableArray<NSString *> *keys=[NSMutableArray array];if(physicalID.length)[keys addObject:physicalID.lowercaseString];
    for(NSString *variant in variants){[keys addObject:LMMD5(variant)];[keys addObject:variant.lowercaseString];}
    // Prefer an actual saved name over a URL-derived title. In particular, a
    // newer database row with blank names must not erase a valid old alias.
    BOOL savedName=LMDisplayString(row[@"name"]).length||LMDisplayString(row[@"anchorName"]).length||LMDisplayString(row[@"roomName"]).length||LMDisplayString(row[@"roomId"]).length;
    NSDictionary *best=nil;
    for(NSString *alias in keys){NSDictionary *existing=aliases[alias];
        if(LMString(existing[@"title"]).length&&(!best||[existing[@"savedName"] boolValue]))best=existing;}
    if(best&&(!name.length||(!savedName&&[best[@"savedName"] boolValue]))){name=best[@"title"];savedName=[best[@"savedName"] boolValue];}
    if(!platform.length&&best)platform=LMString(best[@"platform"]);
    if(database&&LMString(best[@"identity"]).length)canonical=best[@"identity"];
    NSDictionary *metadata=@{@"identity":canonical,@"title":name?:@"",@"platform":platform?:@"",@"savedName":@(savedName)};
    for(NSString *alias in keys)if(alias.length)aliases[alias]=metadata;
}

static void LMReadDatabase(NSURL *url,NSMutableDictionary *aliases) {
    sqlite3 *db=NULL;
    if(sqlite3_open_v2(url.fileSystemRepresentation,&db,SQLITE_OPEN_READONLY|SQLITE_OPEN_FULLMUTEX,NULL)!=SQLITE_OK){if(db)sqlite3_close(db);return;}
    sqlite3_busy_timeout(db,50);
    NSMutableSet *columns=[NSMutableSet set];sqlite3_stmt *statement=NULL;
    if(sqlite3_prepare_v2(db,"PRAGMA table_info(room_models)",-1,&statement,NULL)==SQLITE_OK){
        while(sqlite3_step(statement)==SQLITE_ROW){const unsigned char *text=sqlite3_column_text(statement,1);if(text)[columns addObject:@((const char *)text)];}
    }
    sqlite3_finalize(statement);statement=NULL;
    NSMutableArray *selected=[NSMutableArray array];for(NSString *field in @[@"id",@"url",@"anchorName",@"roomName",@"roomId",@"platform"])
        if([columns containsObject:field])[selected addObject:field];
    if(selected.count){NSString *sql=[NSString stringWithFormat:@"SELECT %@ FROM room_models",[selected componentsJoinedByString:@","]];
        if(sqlite3_prepare_v2(db,sql.UTF8String,-1,&statement,NULL)==SQLITE_OK){
            while(sqlite3_step(statement)==SQLITE_ROW){NSMutableDictionary *row=[NSMutableDictionary dictionary];
                for(NSUInteger i=0;i<selected.count;i++){const unsigned char *text=sqlite3_column_text(statement,(int)i);if(text)row[selected[i]]=@((const char *)text);}
                LMAddMetadata(row,aliases,YES);
            }
        }sqlite3_finalize(statement);
    }sqlite3_close(db);
}

static void LMDiscover(NSURL *directory,NSArray<NSURL *> *roots,NSUInteger depth,BOOL video,
                       NSMutableArray *mediaRoots,NSMutableArray *indexFiles,NSMutableArray *databases) {
    if(depth>5||!LMRealDirectory(directory,roots))return;
    NSArray *keys=@[NSURLIsDirectoryKey,NSURLIsSymbolicLinkKey,NSURLIsRegularFileKey];
    NSArray<NSURL *> *children=[NSFileManager.defaultManager contentsOfDirectoryAtURL:directory includingPropertiesForKeys:keys options:NSDirectoryEnumerationSkipsHiddenFiles error:NULL];
    for(NSURL *child in children){NSString *name=child.lastPathComponent.lowercaseString;NSNumber *isDir=nil,*link=nil,*regular=nil;
        [child getResourceValue:&isDir forKey:NSURLIsDirectoryKey error:NULL];[child getResourceValue:&link forKey:NSURLIsSymbolicLinkKey error:NULL];
        [child getResourceValue:&regular forKey:NSURLIsRegularFileKey error:NULL];if(link.boolValue||!LMInsideRoots(child,roots))continue;
        if(isDir.boolValue){BOOL record=[name isEqualToString:@"records"],image=[name isEqualToString:@"images"]||[name isEqualToString:@"snapshots"];
            if((video&&record)||(!video&&image)){[mediaRoots addObject:child];continue;}
            if(record||image)continue;
            LMDiscover(child,roots,depth+1,video,mediaRoots,indexFiles,databases);
        } else if(regular.boolValue){if([name isEqualToString:@"model.data"]||[name isEqualToString:@"iplayertempmodel.iplayer"])[indexFiles addObject:child];
            if([name isEqualToString:@"playerx_v1.sqlite"])[databases addObject:child];}
    }
}

static NSArray<LMItem *> *LMReadFiles(NSURL *directory,BOOL video,NSArray<NSURL *> *roots,BOOL recursive) {
    NSSet *extensions=[NSSet setWithArray:video?@[@"mp4",@"mov",@"m4v",@"ts",@"mkv",@"flv",@"webm"]:@[@"jpg",@"jpeg",@"png",@"heic",@"heif",@"gif",@"webp",@"bmp"]];
    NSArray *keys=@[NSURLIsDirectoryKey,NSURLIsSymbolicLinkKey,NSURLIsRegularFileKey,NSURLContentModificationDateKey,NSURLFileSizeKey];
    NSDirectoryEnumerator<NSURL *> *enumerator=[NSFileManager.defaultManager enumeratorAtURL:directory includingPropertiesForKeys:keys options:NSDirectoryEnumerationSkipsHiddenFiles errorHandler:^BOOL(NSURL *url,NSError *error){return YES;}];
    NSMutableArray<LMItem *> *items=[NSMutableArray array];
    for(NSURL *url in enumerator){NSNumber *link=nil,*regular=nil,*isDir=nil;[url getResourceValue:&link forKey:NSURLIsSymbolicLinkKey error:NULL];
        if(link.boolValue||!LMInsideRoots(url,roots)){[enumerator skipDescendants];continue;}
        [url getResourceValue:&isDir forKey:NSURLIsDirectoryKey error:NULL];
        if(isDir.boolValue&&!recursive){[enumerator skipDescendants];continue;}
        [url getResourceValue:&regular forKey:NSURLIsRegularFileKey error:NULL];if(!regular.boolValue||![extensions containsObject:url.pathExtension.lowercaseString])continue;
        NSNumber *size=nil;NSDate *date=nil;[url getResourceValue:&size forKey:NSURLFileSizeKey error:NULL];if(size.unsignedLongLongValue==0)continue;
        [url getResourceValue:&date forKey:NSURLContentModificationDateKey error:NULL];
        LMItem *item=[LMItem new];item.URL=url;item.modifiedDate=date?:NSDate.distantPast;
        item.name=LMHashLike(url.lastPathComponent.stringByDeletingPathExtension)?LMDateLabel(item.modifiedDate,video):url.lastPathComponent;
        if(!item.name.length)item.name=video?@"录像片段":@"截图";
        item.byteSize=size.unsignedLongLongValue;item.video=video;[items addObject:item];
    }return items;
}

@implementation LMLibrary
+ (NSArray<LMGroup *> *)groupsForVideo:(BOOL)video roots:(NSArray<NSURL *> *)roots {
    @autoreleasepool {
        NSMutableArray *mediaRoots=[NSMutableArray array],*indexFiles=[NSMutableArray array],*databases=[NSMutableArray array];
        for(NSURL *root in roots)LMDiscover(root,roots,0,video,mediaRoots,indexFiles,databases);
        NSMutableDictionary *aliases=[NSMutableDictionary dictionary];
        for(NSURL *index in indexFiles)for(id row in LMReadLegacyIndex(index))if([row isKindOfClass:NSDictionary.class])LMAddMetadata(row,aliases,NO);
        for(NSURL *db in databases)LMReadDatabase(db,aliases);
        NSMutableDictionary<NSString *,LMGroup *> *groups=[NSMutableDictionary dictionary];NSMutableSet *seen=[NSMutableSet set];
        for(NSURL *root in mediaRoots){NSArray<NSURL *> *folders=[NSFileManager.defaultManager contentsOfDirectoryAtURL:root includingPropertiesForKeys:@[NSURLIsDirectoryKey,NSURLIsSymbolicLinkKey] options:NSDirectoryEnumerationSkipsHiddenFiles error:NULL];
            // Some early versions put media directly in the media root.
            NSMutableArray *containers=[NSMutableArray arrayWithObject:root];for(NSURL *folder in folders)if(LMRealDirectory(folder,roots))[containers addObject:folder];
            for(NSURL *folder in containers){NSArray<LMItem *> *found=LMReadFiles(folder,video,roots,folder!=root);
                if(folder==root){NSMutableArray *direct=[NSMutableArray array];for(LMItem *item in found)if([item.URL.URLByDeletingLastPathComponent.path isEqualToString:root.path])[direct addObject:item];found=direct;}
                if(!found.count)continue;NSString *key=folder.lastPathComponent.lowercaseString;NSDictionary *metadata=aliases[key];
                NSString *identity=metadata[@"identity"]?:folder.URLByResolvingSymlinksInPath.path;
                LMGroup *group=groups[identity];if(!group){group=[LMGroup new];group.identifier=identity;group.title=[LMDisplayString(metadata[@"title"]) length]?LMDisplayString(metadata[@"title"]):LMGroupFallback(folder,found,video);
                    if(folder==root)group.title=video?@"录像":@"截图";group.platform=LMString(metadata[@"platform"]);group.items=@[];groups[identity]=group;}
                NSMutableArray *merged=[group.items mutableCopy];for(LMItem *item in found){NSString *path=item.URL.URLByResolvingSymlinksInPath.path;
                    if(![seen containsObject:path]){[seen addObject:path];[merged addObject:item];}}
                group.items=[merged sortedArrayUsingComparator:^NSComparisonResult(LMItem *a,LMItem *b){NSComparisonResult order=[b.modifiedDate compare:a.modifiedDate];return order==NSOrderedSame?[a.name localizedStandardCompare:b.name]:order;}];
            }
        }
        NSMutableArray *result=[NSMutableArray array];for(LMGroup *group in groups.allValues)if(group.items.count){group.items=LMUniqueCopies(group.items);[result addObject:group];}
        return [result sortedArrayUsingComparator:^NSComparisonResult(LMGroup *a,LMGroup *b){NSDate *ad=a.items.firstObject.modifiedDate,*bd=b.items.firstObject.modifiedDate;NSComparisonResult order=[bd compare:ad];return order==NSOrderedSame?[a.title localizedStandardCompare:b.title]:order;}];
    }
}
@end
