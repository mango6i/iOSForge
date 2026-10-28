// Local storage management. Native core, account databases and server files are not removed.
__d(9005,function(global,require,module,exports){
 "use strict";
 module.exports=function installStorage(apps,ctx,RN){
  var active=null,sequence=0,folders=["cachedImages","outImages","cachedAudio","outAudio","outAudios","emotions"];
  function rows(result){var r=result[0].rows,out=[];for(var i=0;i<r.length;i++)out.push(r.item(i));return out;}
  function owner(){if(!apps.userid||!apps.dbIsReady||!ctx.db)throw new Error("请等待账号数据加载完成");return {id:apps.userid,db:ctx.db};}
  function same(value){if(value.id!==apps.userid||value.db!==ctx.db)throw new Error("账号已切换，请重新打开存储空间");}
  function cleanPath(value){if(typeof value!=="string")return "";var p=value.replace(/^file:\/\//,"");try{if(/^file:\/\//.test(value))p=decodeURIComponent(p);}catch(error){return "";}if(p.indexOf("\u0000")>=0||p.indexOf("\\")>=0||p.split("/").some(function(s){return s===".."||s===".";}))return "";return p.replace(/\/+$/,"");}
  function managed(value){var p=cleanPath(value),base=cleanPath(ctx.fs.DocumentDirectoryPath)+"/";if(!p||p.indexOf(base)!==0)return "";var suffix=p.slice(base.length),slash=suffix.indexOf("/");return slash>0&&folders.indexOf(suffix.slice(0,slash))>=0&&suffix.slice(slash+1)?p:"";}
  function regular(info){return info&&typeof info.isFile==="function"&&info.isFile()&&((Number(info.mode)||0)&61440)!==40960;}
  function kind(path){return /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(path)?"images":/\.(mp4|mov|m4v|avi)$/i.test(path)?"video":/\.(m4a|aac|mp3|wav|caf|amr|ogg)$/i.test(path)?"audio":"other";}
  function checked(token){if(!active||active.token!==token)throw new Error("列表已更新，请重新选择");same(active.owner);return active;}
  apps.recoveryStorageTimestamp=function(value){if(value===null||value===undefined||value==="")return 0;if(typeof value==="string"&&/^[0-9]+$/.test(value))value=Number(value);if(typeof value==="number"&&value>=1000000000&&value<100000000000)value*=1000;var time=new Date(value).getTime();return isFinite(time)&&time>=946684800000&&time<=4102444800000?time:0;};
  apps.recoveryFormatBytes=function(bytes){bytes=Math.max(0,Number(bytes)||0);if(bytes<1024)return bytes+" B";if(bytes<1048576)return (bytes/1024).toFixed(1)+" KB";if(bytes<1073741824)return (bytes/1048576).toFixed(2)+" MB";return (bytes/1073741824).toFixed(2)+" GB";};
  apps.openRecoveryStorage=function(){apps.closeInputPanel();apps.emit("openRecoveryStorage",{ownerId:apps.userid});};
  apps.recoveryStorageScan=function(options){
   options=options||{};
   var current=owner(),files={},byName={},issues=[],scanId=++sequence,chats={},records={},seen={},messageCount=0,fileCount=0;
   function check(){same(current);if(scanId!==sequence||options.isCancelled&&options.isCancelled())throw new Error("存储列表已重新加载或关闭");}
   function progress(){check();if(options.onProgress)options.onProgress({messageCount:messageCount,fileCount:fileCount});}
   function pause(){return new Promise(function(resolve){setTimeout(resolve,0);}).then(check);}
   function batches(list,action){var index=0;function next(){check();var stop=Math.min(index+100,list.length),until=Date.now()+8;for(;index<stop;index++){action(list[index]);if(Date.now()>=until){index++;break;}}return index<list.length?pause().then(next):Promise.resolve();}return next();}
   function chatFor(peer){return chats[peer]||(chats[peer]={key:peer||"__other__",peer:peer,messageIds:[],fileKeys:[],bytes:0,fileCount:0,messageCount:0,attachmentCount:0,time:0,messages:[]});}
   function addFile(item){var p=managed(item.path);if(!p||!regular(item)||files[p])return;var size=Number(item.size);if(!isFinite(size)||size<0){issues.push("无法读取文件大小");return;}var name=p.slice(p.lastIndexOf("/")+1);files[p]={key:p,path:p,name:name,size:size,kind:kind(p),time:apps.recoveryStorageTimestamp(item.mtime||item.ctime),refs:[]};(byName[name]||(byName[name]=[])).push(p);fileCount++;}
   function walkDir(dir,depth){check();if(depth>24){issues.push("缓存目录层数过多");return Promise.resolve();}return ctx.fs.readDir(dir).then(function(items){var directories=[];return batches(items,function(item){var p=managed(item.path);if(!p)return;if(((Number(item.mode)||0)&61440)===40960){issues.push("跳过符号链接缓存项");return;}if(item.isDirectory&&item.isDirectory())directories.push(p);else addFile(item);}).then(function(){var chain=Promise.resolve();directories.forEach(function(p){chain=chain.then(function(){return walkDir(p,depth+1);});});return chain;});}).catch(function(){check();issues.push("部分缓存目录无法读取");});}
   function addReference(record,reference){if(!reference||typeof reference!=="string")return;var paths=[],direct=managed(reference);if(direct&&files[direct])paths.push(direct);
    if(!/^https?:\/\//.test(reference)){var id=reference.split(":")[0],cached=apps.getImageUriCache&&managed(apps.getImageUriCache(id));if(cached&&files[cached])paths.push(cached);var name=id.slice(id.lastIndexOf("/")+1),names=[name];if(record.type===2&&!/\.[a-z0-9]+$/i.test(name))names=names.concat([name+".amr",name+".m4a",name+".caf",name+".aac",name+".mp3",name+".wav",name+".ogg"]);names.forEach(function(n){if(byName[n]&&byName[n].length===1)paths.push(byName[n][0]);});}
    paths.forEach(function(p){if(record.fileKeys.indexOf(p)>=0)return;record.fileKeys.push(p);files[p].refs.push(record.msgid);if(files[p].kind==="other")files[p].kind=record.type===3||record.type===10?"images":record.type===11?"video":record.type===2?"audio":"other";});
   }
   function addRecord(source){if(!source.msgid||seen[source.msgid])return;seen[source.msgid]=true;var data={};try{data=source.data?JSON.parse(source.data):{};}catch(error){}if(!data||typeof data!=="object")data={};var record=Object.assign({},data,source),peer=apps.recoveryPeerForMessage(record);if(!peer)return;record.peer=peer;record.fileKeys=[];record.imgId=source.imgId||data.imgId;record.rawImgId=source.rawImgId||data.rawImgId;record.path=source.path||data.path;record.uri=source.uri||data.uri;record.audioId=source.audioId||data.audioId;delete record.data;delete record.recoveryRowid;
    records[record.msgid]=record;messageCount++;
    [record.imgId,record.rawImgId,record.path,record.uri,record.audioId].forEach(function(ref){addReference(record,ref);});
    var chat=chatFor(peer);chat.messageIds.push(record.msgid);chat.messageCount++;if([2,3,10,11].indexOf(record.type)>=0)chat.attachmentCount++;chat.time=Math.max(chat.time,apps.recoveryStorageTimestamp(record.time));chat.messages.push({msgid:record.msgid,peer:peer,time:record.time,type:record.type,fileKeys:record.fileKeys});
   }
   function readMessages(cursor){check();return current.db.executeSql("SELECT rowid AS recoveryRowid,* FROM Msgs WHERE rowid<? AND COALESCE(isDeleted,0)=0 ORDER BY rowid DESC LIMIT 200",[cursor]).then(function(result){check();var page=rows(result);return batches(page,addRecord).then(function(){progress();if(page.length===200)return pause().then(function(){return readMessages(page[page.length-1].recoveryRowid);});});});}
   var reads=folders.map(function(folder){var root=cleanPath(ctx.fs.DocumentDirectoryPath)+"/"+folder;return ctx.fs.exists(root).then(function(exists){check();if(!exists)return;return ctx.fs.stat(root).then(function(info){check();if(!info.isDirectory||!info.isDirectory()||((Number(info.mode)||0)&61440)===40960){issues.push("跳过非普通缓存目录");return;}return walkDir(root,0);});}).catch(function(){check();issues.push("部分缓存目录无法读取");});});
   return Promise.all(reads).then(function(){progress();return pause();}).then(function(){return readMessages(9007199254740991);}).then(function(){
    var publicFiles=[],scopedFiles={},bytes=0;
    return batches(Object.keys(files),function(p){var file=files[p];if(!file.refs.length)return;scopedFiles[p]=file;var peers={},messages=file.refs.map(function(id){return records[id];});messages.sort(function(a,b){return apps.recoveryStorageTimestamp(b.time)-apps.recoveryStorageTimestamp(a.time);});var time=messages.length?0:file.time;messages.forEach(function(record){peers[record.peer]=true;time=Math.max(time,apps.recoveryStorageTimestamp(record.time));});if(!messages.length)peers[""]=true;
     Object.keys(peers).forEach(function(peer){var chat=chatFor(peer);chat.fileKeys.push(p);chat.bytes+=file.size;chat.fileCount++;if(!peer)chat.time=Math.max(chat.time,time);});
     publicFiles.push({key:p,name:file.name,path:p,size:file.size,kind:file.kind,time:time,messages:messages});bytes+=file.size;
    }).then(function(){check();var token="storage-"+scanId;active={token:token,owner:current,files:scopedFiles,records:records};return {token:token,ownerId:current.id,bytes:bytes,fileCount:publicFiles.length,messageCount:messageCount,chats:Object.keys(chats).map(function(peer){return chats[peer];}),files:publicFiles,issues:issues};});
   });
  };
  apps.recoveryCleanStorageFiles=function(token,keys){
   var scan=checked(token),selected={},result={removed:0,missing:0,failed:0,bytes:0,indexErrors:0};
   keys.forEach(function(key){if(!scan.files[key]||!managed(scan.files[key].path))throw new Error("选中的文件不在当前缓存列表中");selected[key]=scan.files[key];});
   var chain=Promise.resolve();Object.keys(selected).forEach(function(key){chain=chain.then(function(){same(scan.owner);var file=selected[key],p=managed(file.path);if(file.refs.some(function(id){return scan.records[id].stat===1;})){result.failed++;return;}return ctx.fs.exists(p).then(function(exists){if(!exists){result.missing++;return false;}return ctx.fs.stat(p).then(function(info){if(!regular(info))throw new Error("跳过非普通文件");same(scan.owner);return ctx.fs.unlink(p).then(function(){result.removed++;result.bytes+=Number(info.size)||0;return true;});});}).then(function(removed){
     if(!removed)return;same(scan.owner);Object.keys(apps.imageUriCache||{}).forEach(function(id){if(cleanPath(apps.imageUriCache[id])===p)delete apps.imageUriCache[id];});Object.keys(apps.audioUriCache||{}).forEach(function(id){if(cleanPath(apps.audioUriCache[id])===p)delete apps.audioUriCache[id];});
     if(!apps.sdb)return;return Promise.all([apps.sdb.executeSql("DELETE FROM CachedImages WHERE uri IN (?,?) OR imgId=?",[p,"file://"+p,file.name]),apps.sdb.executeSql("DELETE FROM CachedAudio WHERE uri IN (?,?) OR audioId=?",[p,"file://"+p,file.name])]).catch(function(){result.indexErrors++;});
    }).catch(function(){same(scan.owner);result.failed++;});});});
   return chain.then(function(){same(scan.owner);if(!apps.sdb||!apps.setSharedParas)return;return Promise.all([apps.sdb.executeSql("SELECT COALESCE(SUM(size),0) AS total FROM CachedImages",[]),apps.sdb.executeSql("SELECT COALESCE(SUM(size),0) AS total FROM CachedAudio",[])]).then(function(totals){same(scan.owner);return apps.setSharedParas({cachedImagesSize:Number(rows(totals[0])[0].total)||0,cachedAudiosSize:Number(rows(totals[1])[0].total)||0});}).catch(function(){same(scan.owner);result.indexErrors++;});}).then(function(){same(scan.owner);apps.emit("recoveryStorageFilesChanged");apps.emit("userChanged");return result;});
  };
  apps.recoveryDeleteStorageRecords=function(token,ids){
   var scan=checked(token),selected={},deleted=[],failed=0;ids.forEach(function(id){if(!scan.records[id])throw new Error("选中的记录不在当前账号列表中");selected[id]=true;});var list=Object.keys(selected),chain=Promise.resolve();
   for(var index=0;index<list.length;index+=200)(function(batch){chain=chain.then(function(){same(scan.owner);var statements=[],where=" WHERE msgid IN ("+batch.map(function(){return "?";}).join(",")+")";
    return scan.owner.db.transaction(function(tx){["Msgs","Unread","SessionFiles"].forEach(function(table){statements.push(tx.executeSql("DELETE FROM "+table+where,batch));});Promise.all(statements).catch(function(){});}).then(function(){return Promise.all(statements);}).then(function(){deleted=deleted.concat(batch);}).catch(function(){same(scan.owner);failed+=batch.length;});});})(list.slice(index,index+200));
   return chain.then(function(){same(scan.owner);var removed={};deleted.forEach(function(id){removed[id]=true;});Object.keys(apps.msgsData||{}).forEach(function(fid){apps.msgsData[fid]=apps.msgsData[fid].filter(function(message){return !removed[message.msgid];});apps.emit("msgsDataChanged_"+fid);apps.emit("rerenderMsgsData_"+fid);});
    function retainUnread(list){return Array.isArray(list)?list.filter(function(message){return !removed[message.msgid];}):list;}
    ["friendsUnreadList","circleMsgUnreadList","circleShareUnreadList","bottleReplyUnreadList"].forEach(function(name){if(apps[name])apps[name]=retainUnread(apps[name]);});
    Object.keys(apps.friendsUnread||{}).forEach(function(peer){apps.friendsUnread[peer]=retainUnread(apps.friendsUnread[peer]);});
    Object.keys(apps.spaceUnread||{}).forEach(function(topic){Object.keys(apps.spaceUnread[topic]||{}).forEach(function(peer){apps.spaceUnread[topic][peer]=retainUnread(apps.spaceUnread[topic][peer]);});});
    if(apps.bottleMsgUnreadMap){var count=0;Object.keys(apps.bottleMsgUnreadMap).forEach(function(peer){if(peer==="cnt")return;var unread=retainUnread(apps.bottleMsgUnreadMap[peer]);if(Array.isArray(unread)&&unread.length){apps.bottleMsgUnreadMap[peer]=unread;count++;}else delete apps.bottleMsgUnreadMap[peer];});apps.bottleMsgUnreadMap.cnt=count;}
    if(deleted.length){apps.emit("friendsUnreadChanged");apps.emit("spaceUnreadChanged");}
    (apps.recoveryChatViews||[]).forEach(function(view){if(view.myselfId!==apps.userid||!view.recoveryLocatedRows)return;view.recoveryLocatedRows=view.recoveryLocatedRows.filter(function(message){return !removed[message.msgid];});if(removed[view.recoveryLocatedMessage])view.recoveryReturnLatest();else view.rerender();});apps.emit("recoveryRecordsDeleted");return {deleted:deleted.length,failed:failed};
   });
  };
 };
});
