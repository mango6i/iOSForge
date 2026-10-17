// New maintenance services. Original native APIs are reused; no media re-encoding.
__d(9004, function (global, require, module, exports) {
  "use strict";
  module.exports = function install(apps, rcfg, rn) {
    function rows(result) { var r = result[0].rows, out = []; for (var i = 0; i < r.length; i++) out.push(r.item(i)); return out; }
    function owner() { if (!apps.userid || !apps.dbIsReady || !rcfg.db) throw new Error("请等待账号数据加载完成"); return {id: apps.userid, db: rcfg.db}; }
    function same(o) { if (apps.userid !== o.id || rcfg.db !== o.db) throw new Error("账号已切换，请重新打开"); }
    function conversation(peer, o) {
      if (!peer) throw new Error("缺少聊天对象");
      if (peer.slice(0, 2) === "2:") return {sql: "(toId=? OR shareId=? OR chatSession=?)", params: [peer, peer, peer]};
      var session = apps.getChatSession(o.id, peer);
      return {sql: "((fromId=? AND toId=?) OR (fromId=? AND toId=?) OR chatSession=?)", params: [o.id, peer, peer, o.id, session]};
    }
    apps.recoveryFullTime = function (value) {
      var d = value instanceof Date ? value : new Date(value), pad = function (n) { return n < 10 ? "0" + n : String(n); };
      return isNaN(d.getTime()) ? "" : d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    };
    apps.openRecoveryHistory = function (peer) { apps.closeInputPanel(); apps.emit("openRecoveryHistory", {friendId: peer, ownerId: apps.userid}); };
    apps.recoveryHistoryQuery = function (peer, keyword, offset, images) {
      return Promise.resolve().then(function () {
        var o = owner(), c = conversation(peer, o), params = c.params.slice(), sql = "SELECT * FROM Msgs WHERE " + c.sql + " AND COALESCE(isDeleted,0)=0";
        if (images) sql += " AND type IN(3,10) AND (COALESCE(imgId,'')<>'' OR COALESCE(uri,'')<>'')";
        if (keyword) { sql += " AND instr(lower(COALESCE(text,'')),lower(?))>0"; params.push(keyword); }
        sql += " ORDER BY time DESC, msgid DESC";
        if (!images) { sql += " LIMIT 101 OFFSET ?"; params.push(offset || 0); }
        return o.db.executeSql(sql, params).then(function (result) {
          same(o); var list = rows(result), more = !images && list.length > 100;
          return {items: more ? list.slice(0, 100) : list, hasMore: more};
        });
      });
    };
    apps.recoveryMessageFid = function (message) { return apps.getFid(message.toId, message.fromId, message.shareId); };
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
          if (!list || list.some(function (item) { return item.msgid === message.msgid; })) apps.snapDes(fid, message.msgid);
          else apps.removeMsgNewMark(message.msgid).catch(function (error) { if (rcfg.tlog) rcfg.tlog("error", "history image read mark", error); });
          return true;
        }
        if (snapshot.spent && snapshot.spent[key]) return mark();
        return new Promise(function (resolve) {
          apps.diag({header: "提示", locking: true,
            content: "查看图片需要消耗一颗小星星，是否继续？当前剩余：" + snapshot.balance + "颗小星星",
            buttons: [{text: "取消", onPress: function () { apps.closeDiag(); resolve(false); }},
              {text: "继续", onPress: function (dialog) {
                if (dialog && dialog.isProgressing) return;
                if (dialog && dialog.progressing) dialog.progressing(true);
                if (apps.userid !== identity) { apps.closeDiag(); apps.tip("账号已切换"); resolve(false); return; }
                apps.consumeRecoveryTestStars(1, fid + ":" + message.msgid).then(function (result) {
                  apps.closeDiag();
                  if (!result.ok) { apps.tip("小星星不足，请到“我的小星星”领取"); resolve(false); }
                  else resolve(mark());
                }).catch(function (error) { apps.closeDiag(); apps.tip("扣星失败：" + error.message); resolve(false); });
              }}]});
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
        return rcfg.fs.exists(dir).then(function (exists) { return exists ? null : rcfg.fs.mkdir(dir, true); }).then(function () {
          if (!imageId) return uri;
          var site = rcfg.wsc.getRandUrl(-1, "durls");
          return rcfg.fs.greetings(JSON.stringify({d: apps.deviceId, t: apps.now()})).then(function (token) {
            return "https://" + site.url + (id.charAt(0) === "/" ? id : "/pic/" + id) + "?token=" + encodeURIComponent(token);
          });
        }).then(function (url) {
          return rcfg.fs.downloadFile({fromUrl: url, toFile: path, timeout: 180000, pinCert: !!imageId});
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
      if (raw) return imageFile(raw).then(function (path) { return {path: path, original: true}; }).catch(function () {
        return imageFile(message.imgId, message.uri).then(function (path) { return {path: path, original: false}; });
      });
      return imageFile(message.imgId, message.uri).then(function (path) { return {path: path, original: false}; });
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
      return apps.ensureRecoveryPhotoPermission().then(function () { return apps.recoveryImageFile(message); }).then(function (file) {
        return new Promise(function (resolve, reject) {
          rcfg.ImagePickerManager.saveImage(file.path, file.path.split("/").pop(), function (result) {
            if (!result || result.error) reject(new Error(result && result.error || "保存接口没有返回结果"));
            else { if (!quiet) apps.tip(file.original ? "原图已保存到相册" : "图片已保存到相册"); resolve(file); }
          });
        });
      });
    };
    apps.openRecoveryHistoryImage = function (message) {
      return apps.confirmRecoveryImage(message).then(function (allowed) {
        if (!allowed) return false;
        apps.emit("showModelImage", {imgId: message.imgId, uri: message.uri, rawImgId: message.rawImgId,
          ratio: message.width && message.height ? message.width / message.height : 1,
          recoveryMessage: message, recoveryResumeHistory: true});
        return true;
      });
    };
    apps.locateRecoveryMessage = function (peer, message) {
      var views = apps.recoveryChatViews || [], view = null;
      for (var i = views.length - 1; i >= 0; i--) if (views[i].getRealFriendId() === peer && views[i].myselfId === apps.userid) { view = views[i]; break; }
      apps.emit("closeRecoveryHistory");
      if (view) {
        if (/^about_/.test(apps.currentRoutes[apps.currentNavi].name)) apps.curNavigator.navi.navBack();
        return view.recoveryLocate(message);
      }
      apps.recoveryPendingLocate = {peer: peer, message: message, ownerId: apps.userid};
      var session = apps.getChatSession(apps.userid, peer);
      apps.curNavigator.navi.navForward(apps.newRoute(apps.curNavigator.routes, "interact_", {
        friend: {friendId: peer, fromId: apps.userid, toId: peer, shareId: session, shareFrom: session, descCategory: 3, type: 1}, name: "聊天"}));
      return Promise.resolve();
    };
    apps.recoveryChatContext = function (peer, message) {
      return Promise.resolve().then(function () {
        var o = owner(), c = conversation(peer, o);
        return o.db.executeSql("SELECT * FROM Msgs WHERE " + c.sql + " AND COALESCE(isDeleted,0)=0 ORDER BY CASE WHEN msgid=? THEN 0 ELSE 1 END, ABS(time-?), time DESC LIMIT 81", c.params.concat([message.msgid, message.time])).then(function (result) {
          same(o); return rows(result).sort(function (a, b) { return b.time - a.time || String(b.msgid).localeCompare(String(a.msgid)); });
        });
      });
    };
  };
});
