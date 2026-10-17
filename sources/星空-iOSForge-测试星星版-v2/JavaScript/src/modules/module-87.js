// Recovered module 87; analysis path, not original filename.
// Original SHA-256 89939e3d56abd5f6b759d96669e454eb48846a2cf77e0768cfa623d0b3ad4779; original byte range [155581, 156911).
__d(87, function (e, t, n, r) {
  "use strict";

  var i = t(88),
    o = t(89),
    u = t(90),
    s = t(91),
    l = t(92),
    c = t(380),
    a = {},
    d = null,
    v = function (e, t) {
      e && (o.executeDispatchesInOrder(e, t), e.isPersistent() || e.constructor.release(e));
    },
    f = function (e) {
      return v(e, !0);
    },
    g = function (e) {
      return v(e, !1);
    },
    L = {
      injection: {
        injectEventPluginOrder: i.injectEventPluginOrder,
        injectEventPluginsByName: i.injectEventPluginsByName
      },
      putListener: function (e, t, n) {
        "function" != typeof n ? c(!1) : void 0;
        var r = a[t] || (a[t] = {});
        r[e._rootNodeID] = n;
        var o = i.registrationNameModules[t];
        o && o.didPutListener && o.didPutListener(e, t, n);
      },
      getListener: function (e, t) {
        var n = a[t];
        return n && n[e._rootNodeID];
      },
      deleteListener: function (e, t) {
        var n = i.registrationNameModules[t];
        n && n.willDeleteListener && n.willDeleteListener(e, t);
        var r = a[t];
        r && delete r[e._rootNodeID];
      },
      deleteAllListeners: function (e) {
        for (var t in a) if (a[t][e._rootNodeID]) {
          var n = i.registrationNameModules[t];
          n && n.willDeleteListener && n.willDeleteListener(e, t), delete a[t][e._rootNodeID];
        }
      },
      extractEvents: function (e, t, n, r) {
        for (var o, u = i.plugins, l = 0; l < u.length; l++) {
          var c = u[l];
          if (c) {
            var a = c.extractEvents(e, t, n, r);
            a && (o = s(o, a));
          }
        }
        return o;
      },
      enqueueEvents: function (e) {
        e && (d = s(d, e));
      },
      processEventQueue: function (e) {
        var t = d;
        d = null, e ? l(t, f) : l(t, g), d ? c(!1) : void 0, u.rethrowCaughtError();
      },
      __purge: function () {
        a = {};
      },
      __getListenerBank: function () {
        return a;
      }
    };
  n.exports = L;
});
