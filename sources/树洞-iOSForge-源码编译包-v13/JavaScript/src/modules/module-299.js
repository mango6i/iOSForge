// Recovered module 299; analysis path, not original filename.
// Original SHA-256 d50e37e3deefa16514e7f49e064716ba6978edb6100ed315a1aeb79bbac9951f; original byte range [576934, 579369).
__d(299, function (e, t, i, n) {
  "use strict";

  var o = t(46),
    a = t(31).PushNotificationManager,
    c = t(380),
    s = new Map(),
    l = a && a.initialNotification,
    u = "remoteNotificationReceived",
    r = "remoteNotificationsRegistered",
    f = "localNotificationReceived",
    d = function () {
      function e(t) {
        var i = this;
        babelHelpers.classCallCheck(this, e), this._data = {}, Object.keys(t).forEach(function (e) {
          var n = t[e];
          "aps" === e ? (i._alert = n.alert, i._sound = n.sound, i._badgeCount = n.badge) : i._data[e] = n;
        });
      }
      return babelHelpers.createClass(e, null, [{
        key: "presentLocalNotification",
        value: function (e) {
          a.presentLocalNotification(e);
        }
      }, {
        key: "scheduleLocalNotification",
        value: function (e) {
          a.scheduleLocalNotification(e);
        }
      }, {
        key: "cancelAllLocalNotifications",
        value: function () {
          a.cancelAllLocalNotifications();
        }
      }, {
        key: "setApplicationIconBadgeNumber",
        value: function (e) {
          a.setApplicationIconBadgeNumber(e);
        }
      }, {
        key: "getApplicationIconBadgeNumber",
        value: function (e) {
          a.getApplicationIconBadgeNumber(e);
        }
      }, {
        key: "cancelLocalNotifications",
        value: function (e) {
          a.cancelLocalNotifications(e);
        }
      }, {
        key: "addEventListener",
        value: function (t, i) {
          c("notification" === t || "register" === t || "localNotification" === t, "PushNotificationIOS only supports `notification`, `register` and `localNotification` events");
          var n;
          "notification" === t ? n = o.addListener(u, function (t) {
            i(new e(t));
          }) : "localNotification" === t ? n = o.addListener(f, function (t) {
            i(new e(t));
          }) : "register" === t && (n = o.addListener(r, function (e) {
            i(e.deviceToken);
          })), s.set(i, n);
        }
      }, {
        key: "requestPermissions",
        value: function (e) {
          var t = {};
          t = e ? {
            alert: !!e.alert,
            badge: !!e.badge,
            sound: !!e.sound
          } : {
            alert: !0,
            badge: !0,
            sound: !0
          }, a.requestPermissions(t);
        }
      }, {
        key: "abandonPermissions",
        value: function () {
          a.abandonPermissions();
        }
      }, {
        key: "checkPermissions",
        value: function (e) {
          c("function" == typeof e, "Must provide a valid callback"), a.checkPermissions(e);
        }
      }, {
        key: "removeEventListener",
        value: function (e, t) {
          c("notification" === e || "register" === e || "localNotification" === e, "PushNotificationIOS only supports `notification`, `register` and `localNotification` events");
          var i = s.get(t);
          i && (i.remove(), s["delete"](t));
        }
      }, {
        key: "popInitialNotification",
        value: function () {
          var t = l && new e(l);
          return l = null, t;
        }
      }]), babelHelpers.createClass(e, [{
        key: "getMessage",
        value: function () {
          return this._alert;
        }
      }, {
        key: "getSound",
        value: function () {
          return this._sound;
        }
      }, {
        key: "getAlert",
        value: function () {
          return this._alert;
        }
      }, {
        key: "getBadgeCount",
        value: function () {
          return this._badgeCount;
        }
      }, {
        key: "getData",
        value: function () {
          return this._data;
        }
      }]), e;
    }();
  i.exports = d;
});
