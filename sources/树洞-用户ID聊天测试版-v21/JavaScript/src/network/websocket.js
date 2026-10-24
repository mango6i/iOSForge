// Recovered module 339; analysis path, not original filename.
// Original SHA-256 1e1a37fe7eb366efe6e3fb9348c9dfa39f3eec7b295fc331e70c27c94fdd4074; original byte range [1478067, 1483328).
__d(339, function (e, s, n, t) {
  Object.defineProperty(t, "__esModule", {
    value: !0
  }), t.connectToServer = void 0;
  var o = s(312),
    p = s(314),
    a = "android----" === o.Platform.OS ? s(340).sWebSocket : WebSocket,
    r = 0,
    c = -1,
    i = 0,
    l = 0,
    g = "ios" === o.Platform.OS ? 1 : 2;
  t.connectToServer = function d(e, s) {
    if ((0, p.tlog)("Prepare connectToServer", e, s, p.apps.fnow()), p.apps.cheobv && (g += 2), p.apps.lastConnectToServerTime = Date.now(), "background" === p.apps.appState || "iosBg" === p.apps.appState) return void (0, p.tlog)("No connect in background");
    if ("welcome" === p.apps.currentNavi) return void (0, p.tlog)("No connect in welcome");
    if (p.apps.otherPlaceLogin) return void (0, p.tlog)("No connect otherPlaceLogin");
    if (p.apps.isConnecting) return void (p.apps.isConnectingTimer || (p.apps.isConnectingTimer = setTimeout(function () {
      delete p.apps.isConnectingTimer, p.apps.isConnecting = !1, d("timeout-reconnect");
    }, 5e3), (0, p.tlog)("ws[" + l + "] isConnecting setTimeout")));
    p.apps.isConnected = !1, p.apps.isConnecting = !0, delete p.apps.manualClose;
    var n = ++r;
    l = n, p.apps.emit("msgsFetching");
    var o = function (e) {
      (0, p.tlog)("ws[" + n + "] open end >>>", e._mysecret__msgerUrl, p.apps.fnow()), p.apps.resetSendingQueue(), p.apps.isConnecting = !1, p.apps.isConnected = !0, p.apps.ws = e, p.apps.networkFailed = !1, p.apps.emit("networkFailed", !1), p.apps.onopen();
    };
    t.getMsgerUrl(c, "murls").then(function (t) {
      var r = t.url;
      c = t.ridx;
      var l = "wss://" + r + "?userid=" + encodeURIComponent(p.apps.userid) + "&locale=" + p.locale + "&deviceUuid=" + p.apps.deviceUuid + "&tzo=" + p.apps.timeZoneOffset + "&deviceId=" + p.apps.deviceId + "&platform=" + g;
      s && (l = l + "&backC=" + s.testOcTime), p.apps.relogin && (l += "&relogin=1"), p.apps.passwd && (l += "&passwd=" + p.apps.passwd), p.apps.mpasswd && (l += "&mpasswd=" + p.apps.mpasswd);
      var u = new a(l);
      (0, p.tlog)("ws[" + n + "] connect", r, p.apps.fnow()), u._mysecret__id = n, u._mysecret__msgerUrl = r, u._mysecret__close = function () {
        (0, p.tlog)("ws[" + n + "] _mysecret__close", r), p.apps.ws = null, p.apps.manualClose = !0, p.apps.resetSendingQueue(), u.close(1001, "secret close");
      }, u.onopen = function () {
        (0, p.tlog)("ws[" + n + "] open start", u._mysecret__msgerUrl, p.apps.fnow()), p.apps.isConnected = !0, p.apps.isConnecting = !1, clearTimeout(p.apps.isConnectingTimer), delete p.apps.isConnectingTimer, s ? (delete p.apps.backConnectTime, s.backConnect = !0, s.testOldConnect ? u.send("backConnectClose") : ((0, p.tlog)("ws[" + n + "] backConnect---faster"), p.apps.ws = u, e = "backConnectOk", delete p.apps.firstHbTime, u.send("backConnectOk"))) : o(u);
      }, u.onmessage = function (e) {
        if ("t" === e.data) p.apps.testOldConnectCallback && p.apps.testOldConnectCallback();else if ("hb" === e.data) u.send("hb"), p.apps.firstHbTime ? p.apps.now() - p.apps.firstHbTime > 36e4 && (0 === p.apps.sendingQueue.length ? u.close(1001, "change msger") : p.apps.autoChangeMsgerCb = function () {
          u.close(1001, "change msger");
        }) : p.apps.firstHbTime = p.apps.now();else {
          var t = JSON.parse(e.data);
          "userConnConfirmed" === t.proto && (i = 0, s && ((0, p.tlog)("ws[" + n + "] backConnectFirst"), s.backConnectFirst = !0, o(u))), p.apps.onmessage(t);
        }
      }, u.onclose = function (t) {
        if ((0, p.tlog)("ws[" + n + "] onclose", r, t.code, s, t.reason, p.apps.fnow()), delete p.apps.firstHbTime, "backConnect" === e) delete p.apps.backConnectTime;else if (p.apps.backConnectTime) return p.apps.ws = null, void (p.apps.isConnected = !1);
        /^closeOldWs/.test(t.reason) || (p.apps.manualClose || (!p.apps.ws || u !== p.apps.ws) && p.apps.ws ? p.apps.ws && (0, p.tlog)("ws[" + n + "] stop", r) : (p.apps.ws = null, p.apps.isConnected = !1, p.apps.isConnecting = !1, i ? setTimeout(function () {
          return d("onclose-reconnect");
        }, 3e3) : (i += 1, d("onclose-reconnect >>>"))));
      }, u.onerror = function (s) {
        (0, p.tlog)("ws[" + n + "] error", u._mysecret__msgerUrl, e, s.message);
      };
    })["catch"](function (t) {
      (0, p.tlog)("error", "ws[" + n + "] connectToServer", e, s, t), p.apps.isConnecting = !1;
    });
  };
  t.getRandUrl = function (e, s) {
    p.apps.msgerUrlsChanged && ((0, p.tlog)("msgerUrls Changed"), e = -1, p.apps.msgerUrlsChanged = !1);
    var n = p.apps[s];
    -1 === e ? e = Math.floor(Math.random() * n.length) : e >= n.length && (e %= n.length);
    var t = n[e];
    return e += 1, e === n.length && (e = 0), {
      url: t,
      ridx: e
    };
  }, t.getMsgerUrl = function (e, s) {
    return new Promise(function (n, t) {
      p.apps.msgerUrlsChanged && ((0, p.tlog)("msgerUrls Changed"), e = -1, p.apps.msgerUrlsChanged = !1);
      var o = function () {
        var t = p.apps[s];
        -1 === e ? e = Math.floor(Math.random() * t.length) : e >= t.length && (e %= t.length);
        var o = t[e];
        e += 1, e === t.length && (e = 0), n({
          url: o,
          ridx: e
        });
      };
      o();
    });
  }, t.fetchMsgerUrls = function (e) {
    return new Promise(function (s, n) {
      var t = function () {
        s(p.apps.msgerUrls);
      };
      if (p.apps.has("fetchMsgerUrls")) p.apps.on("fetchMsgerUrls", t);else {
        var o = p.reactDevInfo.getToken(),
          a = -1,
          r = 15e3,
          c = function i() {
            p.apps.on("fetchMsgerUrls", t), -1 === a ? a = Math.floor(Math.random() * p.apps.defaultHurls.length) : (a += 1, a === p.apps.defaultHurls.length && (a = 0), r += 15e3);
            var s = p.apps.defaultDurls[a];
            (0, p.tlog)("fetchMsgerUrls", s, p.apps.fnow()), Promise.resolve().then(function () {
              var n = "https://" + s + "/api/msgerurls";
              return p.apps.fetch(n, {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  fields: e,
                  token: o,
                  dev: "dev" === p.apps.runMode ? 1 : void 0
                })
              }, r);
            }).then(function (e) {
              return e.json();
            }).then(function (e) {
              (0, p.tlog)("fetch msgerUrl end", p.apps.fnow(), e, p.apps.msgerUrls), p.apps.msgerUrlsChanged = !0, p.apps.handleMsgerUrls(e), p.apps.emitOnce("fetchMsgerUrls");
            })["catch"](function (e) {
              (0, p.tlog)("error", "fetchMsgerUrls", s, e), p.apps.unon("fetchMsgerUrls", t), p.apps.fetchMsgerUrlsTimer = setTimeout(i, 2e3);
            });
          };
        c();
      }
    });
  };
});
