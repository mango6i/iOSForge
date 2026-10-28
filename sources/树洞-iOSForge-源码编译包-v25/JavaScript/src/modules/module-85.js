// Recovered module 85; analysis path, not original filename.
// Original SHA-256 f71908dd68582084da6101d1b0f4a1b3b258cf3a175539f291048d284bc1ccd5; original byte range [153042, 154254).
__d(85, function (e, t, r, n) {
  "use strict";

  var o = t(379),
    a = o || function (e) {
      for (var t = 1; t < arguments.length; t++) {
        var r = arguments[t];
        for (var n in r) Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
      }
      return e;
    },
    l = t(86),
    i = t(87),
    s = t(88),
    u = t(93),
    v = t(84),
    c = t(94),
    h = t(95),
    d = (t(381), l.topLevelTypes),
    g = {},
    f = function (e, t) {
      for (var r = [], n = 0; n < t.length; n++) r.push(e[t[n]]);
      return r;
    },
    p = function (e, t) {
      for (var r = [], n = e, o = 0; o < t.length; o++) {
        var a = t[o];
        r.push(e[a]), n[a] = null;
      }
      for (var l = 0, i = 0; i < n.length; i++) {
        var s = n[i];
        null !== s && (n[l++] = s);
      }
      return n.length = l, r;
    },
    L = a({}, u, {
      registrationNames: s.registrationNameModules,
      putListener: i.putListener,
      getListener: i.getListener,
      deleteListener: i.deleteListener,
      deleteAllListeners: i.deleteAllListeners,
      _receiveRootNodeIDEvent: function (e, t, r) {
        var n = r || g,
          o = v.getInstanceFromNode(e);
        o && h.batchedUpdates(function () {
          L.handleTopLevel(t, o, n, n.target);
        });
      },
      receiveEvent: function (e, t, r) {
        var n = e;
        L._receiveRootNodeIDEvent(n, t, r);
      },
      receiveTouches: function (e, t, r) {
        for (var n = e === d.topTouchEnd || e === d.topTouchCancel ? p(t, r) : f(t, r), o = 0; o < n.length; o++) {
          var a = n[o];
          a.changedTouches = n, a.touches = t;
          var l = a,
            i = null,
            s = l.target;
          null !== s && void 0 !== s && (s < c.tagsStartAt || (i = s)), L._receiveRootNodeIDEvent(i, e, l);
        }
      }
    });
  r.exports = L;
});
