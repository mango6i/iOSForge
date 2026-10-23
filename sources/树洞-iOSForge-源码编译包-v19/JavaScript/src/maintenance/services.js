// New maintenance services. Original native APIs are reused; no media re-encoding.
__d(9004, function (global, require, module, exports) {
  "use strict";

  module.exports = function install(apps, rcfg, rn) {
    apps.recoveryValidTime = function (value) {
      if (!value) return "";
      if (typeof value === "string" && /^[0-9]+$/.test(value)) value = Number(value);
      if (typeof value === "number" && value >= 1000000000 && value < 100000000000) value *= 1000;
      var date = new Date(value);
      return !isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100 ? apps.recoveryFullTime(date) : "";
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
    apps.confirmRecoveryImage = function (message, fid) {
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
                    apps.tip("小星星不足，请到“我的小星星”领取");
                    resolve(false);
                  } else resolve(mark());
                }).catch(function (error) {
                  apps.closeDiag();
                  apps.tip("扣星失败：" + error.message);
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
