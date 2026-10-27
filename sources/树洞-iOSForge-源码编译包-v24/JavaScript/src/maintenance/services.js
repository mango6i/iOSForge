// New maintenance services. Original native APIs are reused; no media re-encoding.
__d(9004, function (global, require, module, exports) {
  "use strict";

  module.exports = function install(apps, rcfg, rn) {
    apps.traceRecoveryDelivery = function (direction, protocol, packet) {
      try {
        var details;
        if (direction === "send" && protocol === "shareReply") {
          var msg=packet.sendMsg || packet;
          details={direction:direction,protocol:protocol,seq:packet.seq,compressed:!!packet.z,
            fromId:msg.fromId || apps.userid,toId:msg.toId || msg.t,messageId:msg.msgid || msg.m,
            shareId:msg.shareId,chatSession:msg.chatSession,category:msg.category,
            isFriend:packet.z ? msg.f : msg.isFriend,hasOriginalStory:!!(msg.mtext || msg.x)};
        } else if (direction === "receive" && protocol === "shareReplyRes") {
          details={direction:direction,protocol:protocol,seq:packet.seq,replyReject:packet.replyReject,
            err:packet.err,code:packet.code,success:packet.success,status:packet.status,
            responseKeys:Object.keys(packet).slice(0,30),meaning:"server response; delivery not confirmed"};
        } else if (direction === "receive" && Array.isArray(packet.unRead) && packet.unRead.length) {
          details={direction:direction,protocol:protocol,messages:packet.unRead.filter(function (item) { return !item.todo; }).slice(0,30).map(function (item) {
            return {fromId:item.fromId || (item.z ? item.f : undefined),toId:item.toId,messageId:item.msgid || item.m,
              shareId:item.shareId,category:item.category,compressed:!!item.z,hasOriginalStory:!!(item.mtext || item.x)};
          })};
          if (!details.messages.length) return;
        } else return;
        details.recordedAt=Date.now();details.ownerId=apps.userid;details.dataCenter=apps.dataCenter;
        var state=apps.recoveryDeliveryLog;
        if (!state || state.ownerId!==apps.userid) state=apps.recoveryDeliveryLog={ownerId:apps.userid,items:[],writes:Promise.resolve()};
        state.items.push(details);state.items=state.items.slice(-100);
        // Only transport metadata is written. Message bodies and credentials are omitted.
        if (typeof console!=="undefined" && console.log) console.log("[ShudongDelivery] "+JSON.stringify(details));
        if (rcfg.fs && rcfg.fs.DocumentDirectoryPath && typeof rcfg.fs.writeFile==="function") {
          var path=rcfg.fs.DocumentDirectoryPath+"/ShudongDelivery-"+encodeURIComponent(state.ownerId)+".json",content=JSON.stringify(state.items);
          state.writes=state.writes.then(function () { return rcfg.fs.writeFile(path,content,"utf8"); }).catch(function () {});
        }
      } catch (ignored) { /* Observing a packet must never interrupt messaging. */ }
    };
    apps.recoveryUserId = function (value) {
      var id = String(value || "").trim();
      if (!/^[^\s:\x00-\x1f\x7f]{6,128}$/.test(id)) throw new Error("请输入完整用户 ID，不能包含空格或聊天会话分隔符");
      return id;
    };
    apps.sendRecoveryTextReply = function (packet) {
      var identity=apps.userid,database=rcfg.db;
      return Promise.resolve().then(function () {
        if(identity!==apps.userid || database!==rcfg.db || packet.sendMsg.fromId!==identity)throw new Error("账号已切换，请重新发送");
        // ID lookups use the same unchanged encoder as ordinary text messages.
        // Real recipient-queue tests confirmed first-contact delivery with it.
        // A sender acknowledgement alone still does not establish delivery.
        return apps.send("shareReply",apps.zipSendReply(packet,1));
      });
    };
    apps.recoveryFindUserId = function (value) {
      return Promise.resolve().then(function () {
        var id = apps.recoveryUserId(value), identity = apps.userid;
        return apps.recoveryAccountRequest("fetchProfile", {userid:id}).then(function (profile) {
          if (identity !== apps.userid) throw new Error("账号已切换，请重新搜索");
          if (!profile || typeof profile !== "object" || Array.isArray(profile) || profile.notFind || profile.notFound || profile.notExist || profile.noUser || profile.error || profile.err || profile.replyReject) throw new Error("未找到用户，或服务器不允许查看该用户");
          if (profile.userid && profile.userid !== id) throw new Error("服务器返回的用户 ID 不匹配");
          if (!["name","avatar","gender","country","phoneNum"].some(function (key) { return Object.prototype.hasOwnProperty.call(profile,key) && profile[key] !== undefined && profile[key] !== null && profile[key] !== ""; })) throw new Error("服务器未返回有效用户资料");
          var stored = {};
          Object.keys(profile).forEach(function (key) { if (key !== "proto" && key !== "seq") stored[key] = profile[key]; });
          stored.fetchTime = apps.now();
          return rcfg.dbs.setProfile(id, stored).then(function () {
            if (identity !== apps.userid) throw new Error("账号已切换，请重新搜索");
            apps.profiles[id] = Object.assign({}, apps.profiles[id] || {}, stored);
            return {userid:id,profile:apps.profiles[id]};
          });
        });
      });
    };
    apps.openRecoveryUserIdSearch = function (navigator) {
      var identity = apps.userid, ticket = {}, active = function () { return apps.userid === identity && apps.recoveryIdSearchTicket === ticket; };
      apps.recoveryIdSearchTicket = ticket;
      function cancel() { if (active()) { apps.recoveryIdSearchTicket = null; apps.closeDiag(); } }
      function openProfile(id) {
        if (!active()) return;
        if (!navigator || !navigator.navi || navigator.navi.lock) { apps.tip("界面尚未就绪，请稍后重试"); return; }
        apps.closeDiag(function () {
          if (!active()) return;
          apps.recoveryIdSearchTicket = null;
          delete apps.isInBottleMsg;
          navigator.navi.navForward(apps.newRoute(navigator.routes,"about_",{friendId:id,name:rcfg.tr("Profile")}));
        });
      }
      function search(dialog) {
        if (!active() || dialog.isProgressing) return;
        dialog.progressing(true);
        apps.recoveryFindUserId(dialog.state.textInputs[0].value).then(function (result) {
          if (!active()) return;
          apps.diag({header:"搜索结果",buserid:result.userid,content:"用户 ID："+result.userid,columnButtons:false,
            onUserPressed:function () { openProfile(result.userid); },contentOnPress:function () { openProfile(result.userid); },
            buttons:[{text:"取消",onPress:cancel},{text:"查看资料",onPress:function () { openProfile(result.userid); }}]});
        }).catch(function (error) {
          if (active()) { dialog.progressing(false); dialog.setState({infoTip:error.message || "搜索失败，请检查网络后重试"}); }
        });
      }
      apps.diag({header:"通过用户 ID 查找",columnButtons:false,textInputs:[{placeholder:"输入完整用户 ID",value:"",maxLength:128,onSubmitEditing:search}],
        buttons:[{text:"取消",onPress:cancel},{text:"搜索",onPress:search}]});
    };
    apps.recoveryAddUserIdFriend = function (value) {
      var identity = apps.userid, database = rcfg.db, id;
      try { id = apps.recoveryUserId(value); } catch (error) { return Promise.reject(error); }
      if (id === identity) return Promise.reject(new Error("不能添加自己为好友"));
      var key = identity + ":" + id, pending = apps.recoveryIdAdds || (apps.recoveryIdAdds = {});
      if (pending[key]) return pending[key];
      function current() { if (identity !== apps.userid || database !== rcfg.db) throw new Error("账号已切换，请在当前账号重新操作"); }
      function friend(relation) { return relation && (relation.isFriend === true || relation.isFriend === 1 || relation.isFriend === "1"); }
      function relation() {
        current();
        return apps.recoveryAccountRequest("getRelationShip",{friendId:id}).then(function (value) {
          current();
          if (!value || typeof value !== "object" || Array.isArray(value) || value.error || value.err || value.notFind || value.replyReject) throw new Error("无法确认好友关系，请稍后重试");
          return value;
        });
      }
      var cut, task = Promise.resolve().then(function () {
        current();
        if (apps.forbidExp || apps.isForbided) throw new Error("当前账号受到限制，暂时无法添加好友");
        return apps.getFriendCut(id);
      }).then(function (value) { current(); cut = value || {}; return relation(); }).then(function (value) {
        if (value.blocked || value.isBlack || cut.isDropped) throw new Error("该用户存在屏蔽或删除记录，请先在资料页恢复后再添加");
        if (friend(value)) return value;
        return apps.recoveryAccountRequest("addFriend2",{friendId:id,cut:cut.isCut ? 1 : 0}).then(function (result) {
          current();
          if (result && (result.error || result.err || result.replyReject || result.isBlocked || result.blocked || result.locked || result.notFind || result.nobottle || result.needVip || result.over)) throw new Error("服务器未允许添加该用户，请确认好友条件或稍后重试");
          return relation();
        });
      }).then(function (value) {
        current();
        if (!friend(value)) throw new Error("服务器尚未确认好友关系，未加入好友列表，请稍后重试");
        return database.executeSql("INSERT OR IGNORE INTO FriendShips(friendId, adds, time) VALUES(?, ?, ?)",[id,cut.isCut ? "1" : "",apps.now()]).then(function () {
          current();
          apps.relationShips[id] = Object.assign({},value,{isCut:cut.isCut ? 1 : 0,isDropped:0});
          apps.friendShipLast.reload = 1;
          apps.emit("selectViewLoaded_contactsBoard",true);
          apps.emit("renderDroper_"+id,id);
          apps.emit("renderApprove_"+id,id);
          return {userid:id,isFriend:true};
        });
      });
      pending[key] = task.then(function (result) { delete pending[key]; return result; },function (error) { delete pending[key]; throw error; });
      return pending[key];
    };
    apps.confirmRecoveryAddUserIdFriend = function (id) {
      var identity = apps.userid;
      apps.diag({header:"加好友",content:"添加“"+apps.recoveryUserTitle(id)+"”为好友？",columnButtons:false,
        buttons:[{text:"取消",onPress:function (dialog) { if (!dialog.isProgressing) apps.closeDiag(); }},
          {text:"添加",onPress:function (dialog) {
            if (identity !== apps.userid || dialog.isProgressing) return;
            dialog.progressing(true);
            apps.recoveryAddUserIdFriend(id).then(function () {
              if (identity !== apps.userid) return;
              apps.closeDiag(function () { apps.loadProfile(id); apps.tip("已添加好友"); });
            }).catch(function (error) { if (identity === apps.userid) { dialog.progressing(false); dialog.setState({infoTip:error.message || "添加失败，请检查网络后重试"}); } });
          }}]});
    };
    apps.recoveryValidTime = function (value) {
      if (!value) return "";
      if (typeof value === "string" && /^[0-9]+$/.test(value)) value = Number(value);
      if (typeof value === "number" && value >= 1000000000 && value < 100000000000) value *= 1000;
      var date = new Date(value);
      return !isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100 ? apps.recoveryFullTime(date) : "";
    };
    apps.markRecoveryConversationUnread = function (row) {
      var identity = apps.userid, database = rcfg.db, peer = row && row.friendId;
      if (!peer || row.userid !== identity) return Promise.reject(new Error("请在当前账号的消息页操作"));
      var key = identity+":"+peer, pending = apps.recoveryUnreadPending || (apps.recoveryUnreadPending = {});
      if (pending[key]) return pending[key];
      function current() { if (identity !== apps.userid || database !== rcfg.db) throw new Error("账号已切换"); }
      var marker = {msgid:"recovery:manual-unread:"+key,userid:peer,shareId:row.shareId || apps.getChatSession(identity,peer),
        type:1,category:row.descCategory===4 ? 4 : 3,time:apps.now(),text:"",fromId:peer,toId:peer.slice(0,2)==="2:" ? peer : identity,shareFrom:peer,ftype:1,atime:0,utab:1};
      var task = Promise.resolve().then(function () {
        current();
        return database.executeSql("SELECT * FROM Unread WHERE userid=? AND COALESCE(utab,0)<>2 LIMIT 1",[peer]);
      }).then(function (result) {
        current();
        if (result[0].rows.length) return result[0].rows.item(0);
        return database.executeSql("INSERT INTO Unread(msgid,shareId,type,time,category,text,userid,fromId,toId,shareFrom,ftype,atime,utab) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [marker.msgid,marker.shareId,marker.type,marker.time,marker.category,marker.text,peer,peer,marker.toId,peer,1,0,1]).then(function () { return marker; });
      }).then(function (unread) {
        current();
        function matches(item) { return item.msgid===unread.msgid && item.shareId===unread.shareId && item.time===unread.time; }
        var list=apps.friendsUnread[peer] || (apps.friendsUnread[peer]=[]);
        if (!list.some(matches)) list.push(unread);
        if (!apps.friendsUnreadList.some(matches)) apps.friendsUnreadList.push(unread);
        apps.emit("friendsUnreadChanged");apps.emit("recoveryManualUnreadChanged",peer);
        return true;
      });
      pending[key] = task.then(function (result) { delete pending[key];return result; },function (error) { delete pending[key];throw error; });
      return pending[key];
    };
    apps.clearRecoveryConversationUnread = function (peer) {
      var identity=apps.userid,database=rcfg.db,key=identity+":"+peer,id="recovery:manual-unread:"+key;
      return Promise.resolve(apps.recoveryUnreadPending && apps.recoveryUnreadPending[key]).then(function () {
        if (identity!==apps.userid || database!==rcfg.db) return;
        return database.executeSql("DELETE FROM Unread WHERE userid=? AND msgid=?",[peer,id]).then(function () {
          if (identity!==apps.userid || database!==rcfg.db) return;
          if (apps.friendsUnread[peer]) apps.friendsUnread[peer]=apps.friendsUnread[peer].filter(function (item) { return item.msgid!==id; });
          apps.friendsUnreadList=apps.friendsUnreadList.filter(function (item) { return item.msgid!==id; });
          apps.emit("friendsUnreadChanged");apps.emit("recoveryManualUnreadChanged",peer);
        });
      }).catch(function (error) { rcfg.tlog("error","clear local unread marker",error); });
    };
    apps.recoveryFriendAddedTime = function (row) {
      var id = row.friendId || row.userid || row.u, relation = apps.relationShips && apps.relationShips[id] || {};
      // FriendShips.time was also backfilled with the current time by the old
      // client. Use explicitly named addition timestamps, never last-chat time.
      return apps.recoveryValidTime(row.addTime || row.friendAddTime || relation.addTime || relation.friendAddTime);
    };
    apps.recoveryPeerForMessage = function (message) {
      if (message.toId && message.toId.slice(0,2) === "2:") return message.toId;
      return message.fromId === apps.userid ? message.toId : message.fromId;
    };
    apps.recoveryUserTitle = function (id, fallback) {
      var profile = apps.profiles && apps.profiles[id] || {}, name = profile.name || fallback || "未设置昵称", note = profile.ftag || "";
      return name + (note ? "（" + note + "）" : "");
    };
    apps.openRecoveryAccountLoginMenu = function () {
      apps.diag({header: "添加账号", columnButtons: false, buttons: [
        {text: "取消", onPress: function () { apps.closeDiag(); }},
        {text: "账号密码登录", onPress: function () { apps.closeDiag(function () { apps.multiLoginsRoute = true; apps.showSignInDiag(); }); }},
        {text: "手机号登录", onPress: function () { apps.closeDiag(function () { apps.curNavigator.navi.navForward(apps.curNavigator.routes.reg); }); }}]});
    };
    apps.openRecoveryAvatar = function (id) {
      var identity = apps.userid;
      return apps.getProfileK(id, "avatar").then(function (imageId) {
        if (identity !== apps.userid) throw new Error("账号已切换");
        if (!imageId || typeof imageId !== "string") throw new Error("暂无可查看的头像");
        if (!/\.[a-zA-Z0-9]+$/.test(imageId)) imageId += ".jpg";
        apps.emit("showModelImage", {imgId:imageId, ratio:1, recoveryAvatar:true, recoveryOwnerId:identity});
      }).catch(function (error) { apps.tip(error.message || "头像加载失败"); });
    };
    apps.recoveryReturnTarget = function (event) {
      return {ownerId:apps.userid,tab:apps.currentNavi,event:event};
    };
    apps.completeRecoveryReturn = function (route) {
      var target=route&&route.recoveryReturnTo;
      if(!target)return false;
      delete route.recoveryReturnTo;
      if(target.ownerId!==apps.userid)return false;
      if(target.tab&&target.tab!==apps.currentNavi)apps.navSwitch(target.tab);
      apps.emit(target.event);return true;
    };
    apps.showRecoveryLocateDialog = function (peer, message, options) {
      options = options || {};
      var identity = apps.userid;
      apps.diag({header:"聊天记录", content:"定位到这条消息所在的聊天位置？", columnButtons:false, buttons:[
        {text:"取消", onPress:function(){ apps.closeDiag(function(){ if(options.cancel) options.cancel(); }); }},
        {text:"定位到聊天位置", onPress:function(){ apps.closeDiag(function(){
          Promise.resolve().then(function(){
            if(identity!==apps.userid)throw new Error("账号已切换，请重新打开聊天记录");
            return apps.locateRecoveryMessage(peer || apps.recoveryPeerForMessage(message),message,options.beforeLocate,options.returnTo);
          }).catch(function(error){ if(options.cancel&&identity===apps.userid)options.cancel();apps.tip(error.message || "定位失败"); });
        }); }}]});
    };
    apps.locateRecoveryImage = function (image, beforeLocate) {
      if (image.avatar) { apps.tip("头像没有对应的聊天位置"); return Promise.resolve(false); }
      if (image.ownerId && image.ownerId !== apps.userid) { apps.tip("账号已切换，请重新打开图片"); return Promise.resolve(false); }
      var hint=image.message, id=(image.imgId||"").split(":")[0], raw=(image.rawImgId||"").split(":")[0];
      function match(message){ return !!message && message.msgid && ([message.imgId,message.rawImgId].some(function(value){value=(value||"").split(":")[0];return value && (value===id || value===raw);}) || message.uri && message.uri===image.uri); }
      var query = match(hint) ? Promise.resolve([hint]) : Promise.resolve().then(function(){
        var current=owner(), c=image.peer?conversation(image.peer,current):{sql:"1=1",params:[]};
        return current.db.executeSql("SELECT * FROM Msgs WHERE "+c.sql+" AND COALESCE(isDeleted,0)=0 AND ((?<>'' AND substr(imgId,1,instr(imgId||':',':')-1)=?) OR (?<>'' AND substr(rawImgId,1,instr(rawImgId||':',':')-1)=?) OR (?<>'' AND uri=?)) ORDER BY time DESC LIMIT 2",c.params.concat([id,id,raw||id,raw||id,image.uri||"",image.uri||""])).then(function(result){same(current);return rows(result);});
      });
      return query.then(function(messages){
        if(!messages.length){apps.tip("本机未找到这张图片对应的聊天记录");return false;}
        if(messages.length>1){apps.tip("这张图片对应多条记录，请从聊天记录中选择定位");return false;}
        apps.showRecoveryLocateDialog(image.peer || apps.recoveryPeerForMessage(messages[0]),messages[0],{beforeLocate:beforeLocate,returnTo:image.returnTo});return true;
      }).catch(function(error){apps.tip(error.message || "无法定位图片");return false;});
    };
    apps.openRecoveryGlobalSearch = function () { apps.closeInputPanel(); apps.emit("openRecoveryGlobalSearch", {ownerId:apps.userid}); };
    apps.recoveryOpenConversation = function (peer, returnTo) {
      var navigator = apps.friendsNavigator;
      if (!navigator || !navigator.navi || navigator.navi.lock) { apps.tip("消息界面尚未就绪，请稍后重试"); return false; }
      apps.navSwitch("friends");
      apps.emit("closeRecoveryGlobalSearch",!!returnTo); apps.emit("closeRecoveryHistory", true,!!returnTo);
      var session=apps.getChatSession(apps.userid,peer);
      navigator.navi.navForward(apps.newRoute(navigator.routes,"interact_",{friend:{friendId:peer,fromId:apps.userid,toId:peer,shareId:session,shareFrom:session,descCategory:3,type:1},name:apps.recoveryUserTitle(peer),recoveryReturnTo:returnTo}));
    };
    apps.recoveryGlobalSearch = function (keyword, offset) {
      keyword=String(keyword||"").trim(); offset=Math.max(0,Number(offset)||0);
      if(!keyword)return Promise.resolve({contacts:[],messages:[],hasMore:false});
      return Promise.resolve().then(function(){
        var current=owner(), contactSql="SELECT f.friendId,f.name,f.ftag,p.v AS profileName,q.v AS profileTag FROM (SELECT friendId,name,ftag FROM FriendShips UNION ALL SELECT friendId,name,ftag FROM Friends WHERE userid IN (?,?)) f LEFT JOIN Profiles p ON p.userid=f.friendId AND p.k='name' LEFT JOIN Profiles q ON q.userid=f.friendId AND q.k='ftag'";
        var media={"图片":3,"照片":3,"语音":2,"视频":11,"gif":10},type=media[keyword.toLowerCase()];
        var where="COALESCE(isDeleted,0)=0 AND (instr(lower(COALESCE(text,'')||' '||COALESCE(imgId,'')||' '||COALESCE(audioId,'')),lower(?))>0"+(type?" OR type="+type:"")+")";
        return Promise.all([offset?Promise.resolve(null):current.db.executeSql(contactSql,[current.id,"3:"+current.id]),current.db.executeSql("SELECT * FROM Msgs WHERE "+where+" ORDER BY time DESC,msgid DESC LIMIT 101 OFFSET ?",[keyword,offset])]).then(function(results){
          same(current); var seen={}, contacts=[];
          function value(text){try{var parsed=JSON.parse(text);return typeof parsed==="string"?parsed:text||"";}catch(error){return text||"";}}
          if(results[0])rows(results[0]).forEach(function(row){
            var id=row.friendId;if(!id||id===current.id||id==="end"||id==="\uffffend"||seen[id])return;
            var profile=apps.profiles&&apps.profiles[id]||{},name=profile.name||value(row.profileName)||row.name||"未设置昵称",note=profile.ftag||value(row.profileTag)||row.ftag||"";
            if((name+" "+note+" "+id).toLowerCase().indexOf(keyword.toLowerCase())<0)return;
            seen[id]=true;contacts.push({friendId:id,name:name,note:note});
          });
          var messages=rows(results[1]);return {contacts:contacts,messages:messages.slice(0,100),hasMore:messages.length>100};
        });
      });
    };
    apps.recoveryAccountRequest = function (name, params) {
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          reject(new Error("服务器响应超时，请稍后重试"));
        }, 20000);
        Promise.resolve().then(function () {
          return apps.send(name, params);
        }).then(function (result) {
          clearTimeout(timer);
          resolve(result);
        }, function (error) {
          clearTimeout(timer);
          reject(error);
        });
      });
    };
    apps.getRecoveryAccounts = function () {
      var seen = {},
        counts = {},
        ids = [apps.userid].concat(apps.multiLogins || []);
      (apps.multiLoginCnts || []).forEach(function (item) {
        counts[item.userid || item.uid] = Math.max(0, Number(item.c) || 0);
      });
      return ids.filter(function (id) {
        if (!id || typeof id !== "string" || seen[id]) return false;
        seen[id] = true;
        return true;
      }).map(function (id) {
        return {
          userid: id,
          c: counts[id] || 0,
          account: id === apps.userid ? "当前账号" : "切换账号"
        };
      });
    };
    apps.selectRecoveryAccount = function (id) {
      if (id === apps.userid) {
        apps.tip("当前正在使用这个账号");
        return;
      }
      if (!apps.getRecoveryAccounts().some(function (item) {
        return item.userid === id;
      })) {
        apps.tip("请先登录这个账号");
        return;
      }
      var identity = apps.userid;
      apps.diag({
        header: "切换账号",
        content: "切换到账号 " + id + "？",
        locking: true,
        buttons: [{
          text: "取消",
          onPress: function (dialog) {
            if (!dialog || !dialog.isProgressing) apps.closeDiag();
          }
        }, {
          text: "重新登录",
          onPress: function (dialog) {
            if (dialog && dialog.isProgressing) return;
            apps.closeDiag(function () {
              apps.openRecoveryAccountLoginMenu();
            });
          }
        }, {
          text: "切换",
          onPress: function (dialog) {
            if (dialog.isProgressing || apps.userid !== identity) return;
            dialog.progressing(true);
            Promise.resolve().then(function () {
              return apps.switchAccount(id);
            }).catch(function (error) {
              if (apps.userid !== identity) return;
              dialog.progressing(false);
              dialog.setState({
                infoTip: error.message || "切换失败，请重新登录"
              });
            });
          }
        }]
      });
    };
    function rows(result) {
      var r = result[0].rows,
        out = [];
      for (var i = 0; i < r.length; i++) out.push(r.item(i));
      return out;
    }
    function owner() {
      if (!apps.userid || !apps.dbIsReady || !rcfg.db) throw new Error("请等待账号数据加载完成");
      return {
        id: apps.userid,
        db: rcfg.db
      };
    }
    function same(o) {
      if (apps.userid !== o.id || rcfg.db !== o.db) throw new Error("账号已切换，请重新打开");
    }
    function conversation(peer, o) {
      if (!peer) throw new Error("缺少聊天对象");
      if (peer.slice(0, 2) === "2:") return {
        sql: "(toId=? OR shareId=? OR chatSession=?)",
        params: [peer, peer, peer]
      };
      var session = apps.getChatSession(o.id, peer);
      return {
        sql: "((fromId=? AND toId=?) OR (fromId=? AND toId=?) OR chatSession=?)",
        params: [o.id, peer, peer, o.id, session]
      };
    }
    apps.recoveryFullTime = function (value) {
      var d = value instanceof Date ? value : new Date(value),
        pad = function (n) {
          return n < 10 ? "0" + n : String(n);
        };
      return isNaN(d.getTime()) ? "" : d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    };
    apps.openRecoveryHistory = function (peer) {
      apps.closeInputPanel();
      apps.emit("openRecoveryHistory", {
        friendId: peer,
        ownerId: apps.userid
      });
    };
    apps.recoveryHistoryQuery = function (peer, keyword, offset, images) {
      return Promise.resolve().then(function () {
        var o = owner(),
          c = conversation(peer, o),
          params = c.params.slice(),
          sql = "SELECT * FROM Msgs WHERE " + c.sql + " AND COALESCE(isDeleted,0)=0";
        if (images) sql += " AND type IN(3,10) AND (COALESCE(imgId,'')<>'' OR COALESCE(uri,'')<>'')";
        if (keyword) {
          sql += " AND instr(lower(COALESCE(text,'')),lower(?))>0";
          params.push(keyword);
        }
        sql += " ORDER BY time DESC, msgid DESC";
        if (!images) {
          sql += " LIMIT 101 OFFSET ?";
          params.push(offset || 0);
        }
        return o.db.executeSql(sql, params).then(function (result) {
          same(o);
          var list = rows(result),
            more = !images && list.length > 100;
          return {
            items: more ? list.slice(0, 100) : list,
            hasMore: more
          };
        });
      });
    };
    apps.recoveryMessageFid = function (message) {
      return apps.getFid(message.toId, message.fromId, message.shareId);
    };
    apps.recoveryAdjacentChatImage = function (message, peer, direction) {
      return Promise.resolve().then(function () {
        var current = owner();
        if (direction !== 1 && direction !== -1) throw new Error("图片翻页方向无效");
        if (!message || !message.msgid || message.type !== 3) return null;
        var scope = conversation(peer || apps.recoveryPeerForMessage(message), current);
        var where = scope.sql + " AND type=3 AND COALESCE(isDeleted,0)=0 AND (COALESCE(imgId,'')<>'' OR COALESCE(uri,'')<>'')";
        return current.db.executeSql("SELECT * FROM Msgs WHERE " + where + " AND msgid=? LIMIT 1", scope.params.concat([message.msgid])).then(function (result) {
          same(current);
          var selected = rows(result)[0];
          if (!selected) return null;
          var compare = direction > 0 ? ">" : "<", order = direction > 0 ? "ASC" : "DESC";
          // Match by message, not image ID: the same photo may have been sent twice.
          return current.db.executeSql("SELECT * FROM Msgs WHERE " + where + " AND (time" + compare + "? OR (time=? AND msgid" + compare + "?)) ORDER BY time " + order + ", msgid " + order + " LIMIT 1", scope.params.concat([selected.time, selected.time, selected.msgid])).then(function (next) {
            same(current);
            return rows(next)[0] || null;
          });
        });
      });
    };
    apps.recoveryImageTip = function (message) {
      apps.diag({header: "提示", content: message, recoveryKeepImagePreview: true,
        buttons: [{text: "确定", onPress: function () { apps.closeDiag(); }}]});
    };
    apps.confirmRecoveryImage = function (message, fid, options) {
      if (message.type && message.type !== 3 || message.fromId === apps.userid || !message.isnew) return Promise.resolve(true);
      if (!message.msgid) return Promise.reject(new Error("图片消息缺少标识"));
      var identity = apps.userid;
      fid = fid || apps.recoveryMessageFid(message);
      return apps.refreshRecoveryTestStars().then(function (snapshot) {
        if (!snapshot) throw new Error("小星星余额读取失败");
        if (apps.userid !== identity) throw new Error("账号已切换");
        var key = identity + ":" + fid + ":" + message.msgid;
        function mark() {
          message.isnew = 0;
          var list = apps.msgsData && apps.msgsData[fid];
          if (!list || list.some(function (item) {
            return item.msgid === message.msgid;
          })) apps.snapDes(fid, message.msgid);else apps.removeMsgNewMark(message.msgid).catch(function (error) {
            if (rcfg.tlog) rcfg.tlog("error", "history image read mark", error);
          });
          return true;
        }
        if (snapshot.spent && snapshot.spent[key]) return mark();
        return new Promise(function (resolve) {
          apps.diag({
            header: "提示",
            locking: true,
            recoveryKeepImagePreview: !!(options && options.keepImagePreview),
            content: "查看图片需要消耗1颗小星星，是否继续？当前剩余：" + snapshot.balance + "颗小星星",
            buttons: [{
              text: "取消",
              onPress: function () {
                apps.closeDiag();
                resolve(false);
              }
            }, {
              text: "继续",
              onPress: function (dialog) {
                if (dialog && dialog.isProgressing) return;
                if (dialog && dialog.progressing) dialog.progressing(true);
                if (apps.userid !== identity) {
                  apps.closeDiag();
                  apps.tip("账号已切换");
                  resolve(false);
                  return;
                }
                apps.consumeRecoveryTestStars(1, fid + ":" + message.msgid).then(function (result) {
                  apps.closeDiag();
                  if (!result.ok) {
                    if (options && options.keepImagePreview) apps.recoveryImageTip("小星星不足，请到“我的小星星”领取");
                    else apps.tip("小星星不足，请到“我的小星星”领取");
                    resolve(false);
                  } else resolve(mark());
                }).catch(function (error) {
                  apps.closeDiag();
                  if (options && options.keepImagePreview) apps.recoveryImageTip("扣星失败：" + error.message);
                  else apps.tip("扣星失败：" + error.message);
                  resolve(false);
                });
              }
            }]
          });
        });
      });
    };
    function imageFile(imageId, uri) {
      if (!imageId) {
        if (uri && /^file:\/\//.test(uri)) return Promise.resolve(uri.replace(/^file:\/\//, ""));
        if (uri && uri.charAt(0) === "/") return Promise.resolve(uri);
        if (!uri || !/^https?:\/\//.test(uri)) return Promise.reject(new Error("当前图片没有可保存的文件"));
      }
      var id = imageId ? imageId.split(":")[0] : "save-" + Date.now() + ".jpg";
      var cached = apps.getImageUriCache && apps.getImageUriCache(id);
      var filename = id.replace(/[^A-Za-z0-9_.-]/g, "_");
      if (!filename || filename === "." || filename === "..") throw new Error("图片标识无效");
      var dir = rcfg.fs.DocumentDirectoryPath + "/cachedImages/" + (imageId ? apps.getImageIdSubDir(filename) : "recovery");
      var path = cached && cached !== "__cloudrepodeleted__" ? cached.replace(/^file:\/\//, "") : dir + "/" + filename;
      return rcfg.fs.exists(path).then(function (exists) {
        if (exists) return path;
        if (cached === "__cloudrepodeleted__") throw new Error("图片已被删除");
        return rcfg.fs.exists(dir).then(function (exists) {
          return exists ? null : rcfg.fs.mkdir(dir, true);
        }).then(function () {
          if (!imageId) return uri;
          var site = rcfg.wsc.getRandUrl(-1, "durls");
          return rcfg.fs.greetings(JSON.stringify({
            d: apps.deviceId,
            t: apps.now()
          })).then(function (token) {
            return "https://" + site.url + (id.charAt(0) === "/" ? id : "/pic/" + id) + "?token=" + encodeURIComponent(token);
          });
        }).then(function (url) {
          return rcfg.fs.downloadFile({
            fromUrl: url,
            toFile: path,
            timeout: 180000,
            pinCert: !!imageId
          });
        }).then(function (response) {
          if (response && response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) throw new Error("图片下载失败（" + response.statusCode + "）");
          return rcfg.fs.stat(path);
        }).then(function (info) {
          if (!info || Number(info.size) <= 0) throw new Error("图片文件为空");
          if (imageId && apps.setImageUriCache) apps.setImageUriCache(id, path);
          return path;
        });
      });
    }
    apps.recoveryImageFile = function (message) {
      var raw = message.rawImgId && message.rawImgId.split(":")[0];
      if (raw) return imageFile(raw).then(function (path) {
        return {
          path: path,
          original: true
        };
      }).catch(function () {
        return imageFile(message.imgId, message.uri).then(function (path) {
          return {
            path: path,
            original: false
          };
        });
      });
      return imageFile(message.imgId, message.uri).then(function (path) {
        return {
          path: path,
          original: false
        };
      });
    };
    apps.ensureRecoveryPhotoPermission = function () {
      return rcfg.Permissions.check("photo").then(function (status) {
        return status === "undetermined" ? rcfg.Permissions.request("photo") : status;
      }).then(function (status) {
        if (status !== "authorized" && status !== "limited") throw new Error("请在系统设置中允许访问相册后再保存");
        if (apps.permissions) apps.permissions.photo = 1;
      });
    };
    apps.saveRecoveryImage = function (message, quiet) {
      return apps.ensureRecoveryPhotoPermission().then(function () {
        return apps.recoveryImageFile(message);
      }).then(function (file) {
        return new Promise(function (resolve, reject) {
          rcfg.ImagePickerManager.saveImage(file.path, file.path.split("/").pop(), function (result) {
            if (!result || result.error) reject(new Error(result && result.error || "保存接口没有返回结果"));else {
              if (!quiet) apps.tip(file.original ? "原图已保存到相册" : "图片已保存到相册");
              resolve(file);
            }
          });
        });
      });
    };
    apps.openRecoveryHistoryImage = function (message, options) {
      return apps.confirmRecoveryImage(message).then(function (allowed) {
        if (!allowed) return false;
        var video=!!(options&&options.video);
        apps.emit("showModelImage", {
          imgId: message.imgId,
          uri: message.uri,
          rawImgId: video?undefined:message.rawImgId,
          isVideo: video,
          path: video&&message.uri?message.uri.replace(/^file:\/\//,""):undefined,
          ratio: message.width && message.height ? message.width / message.height : 1,
          recoveryMessage: message,
          recoveryPeer: apps.recoveryPeerForMessage(message),
          recoveryOwnerId: apps.userid,
          recoveryReturnTo: apps.recoveryReturnTarget(options && options.storage ? "resumeRecoveryStorage" : "resumeRecoveryHistory"),
          recoveryResumeHistory: !(options && options.storage),
          recoveryResumeStorage: !!(options && options.storage)
        });
        return true;
      });
    };
    apps.locateRecoveryMessage = function (peer, message, beforeNavigate, returnTo) {
      return Promise.resolve().then(function () {
        var current=owner();
        if(typeof peer!=="string"||!peer||!message||!message.msgid)throw new Error("这条消息没有对应的本机聊天记录");
        return apps.recoveryChatContext(peer,message).then(function(messages){
          same(current);
          var selected=messages.filter(function(item){return item.msgid===message.msgid;})[0];
          if(!selected)throw new Error("该消息已被删除或不在本机，无法定位");
          var navigator=apps.friendsNavigator,navi=navigator&&navigator.navi;
          if(!navi||typeof navi.navForward!=="function"||navi.lock)throw new Error("消息界面正在切换，请稍后重试");
          var views=apps.recoveryChatViews||[],view=null;
          for(var i=views.length-1;i>=0;i--){
            var candidate=views[i],route=candidate.props&&candidate.props.route;
            if(!returnTo&&!candidate.recoveryUnmounted&&candidate.props&&candidate.props.tab==="friends"&&candidate.myselfId===current.id&&candidate.getRealFriendId()===peer&&route&&navi.routeList&&navi.routeList.indexOf(route)>=0){view=candidate;break;}
          }
          if(beforeNavigate)beforeNavigate();
          apps.navSwitch("friends");
          apps.emit("closeRecoveryGlobalSearch",!!returnTo);apps.emit("closeRecoveryStorage",!!returnTo);apps.emit("closeRecoveryHistory",true,!!returnTo);
          if(view){
            if(navi.curRoute!==view.props.route)navi.navToRoute(view.props.route);
            return view.recoveryLocate(selected,messages);
          }
          var session=selected.shareId||selected.chatSession||apps.getChatSession(current.id,peer),group=peer.slice(0,2)==="2:";
          var route=apps.newRoute(navigator.routes,"interact_",{friend:{friendId:peer,fromId:current.id,toId:peer,shareId:session,shareFrom:session,descCategory:group?4:3,type:group?2:1},name:apps.recoveryUserTitle(peer),recoveryReturnTo:returnTo});
          var pending={peer:peer,message:selected,rows:messages,ownerId:current.id,tab:"friends",routeId:route.id};
          apps.recoveryPendingLocate=pending;
          try{navi.navForward(route);}catch(error){if(apps.recoveryPendingLocate===pending)delete apps.recoveryPendingLocate;throw error;}
        });
      });
    };
    apps.recoveryChatContext = function (peer, message) {
      return Promise.resolve().then(function () {
        var o = owner(),
          c = conversation(peer, o);
        return o.db.executeSql("SELECT * FROM Msgs WHERE " + c.sql + " AND COALESCE(isDeleted,0)=0 ORDER BY CASE WHEN msgid=? THEN 0 ELSE 1 END, ABS(time-COALESCE((SELECT time FROM Msgs WHERE msgid=? LIMIT 1),time)), time DESC LIMIT 81", c.params.concat([message.msgid, message.msgid])).then(function (result) {
          same(o);
          return rows(result).sort(function (a, b) {
            return b.time - a.time || String(b.msgid).localeCompare(String(a.msgid));
          });
        });
      });
    };
  };
});
