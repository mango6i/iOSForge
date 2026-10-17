// Recovered module 276; analysis path, not original filename.
// Original SHA-256 d925530e641a03c7a9c71e36f2f1482bbb90bc93f031fa7913f312e118e934f9; original byte range [550375, 551393).
__d(276, function (e, n, t, a) {
  "use strict";

  function i(e, n) {
    var t = e.length - n.length;
    return t > 0 ? 1 : 0 > t ? -1 : e > n ? 1 : -1;
  }
  function r(e, n) {
    return e.index > n.index ? 1 : e.index < n.index ? -1 : i(e.key, n.key);
  }
  function o(e, n) {
    return e.key === n.key && e.index === n.index && e.isStale === n.isStale && e.navigationState === n.navigationState && e.navigationState.key === n.navigationState.key;
  }
  function c(e, n, t) {
    if (t === n) return e;
    var a = new Map(),
      i = new Map(),
      c = new Map();
    e.forEach(function (e) {
      var n = e.key;
      e.isStale && c.set(n, e), a.set(n, e);
    });
    var u = new Set();
    n.children.forEach(function (e, n) {
      var t = h + e.key,
        a = {
          index: n,
          isStale: !1,
          key: t,
          navigationState: e
        };
      s(!u.has(t), "navigationState.children[" + n + '].key "' + t + '" conflicts withanother child!'), u.add(t), c.has(t) && c["delete"](t), i.set(t, a);
    }), t && t.children.forEach(function (e, n) {
      var t = h + e.key;
      i.has(t) || c.set(t, {
        index: n,
        isStale: !0,
        key: t,
        navigationState: e
      });
    });
    var d = [],
      f = function (e) {
        var n = e.key,
          t = a.has(n) ? a.get(n) : null;
        t && o(t, e) ? d.push(t) : d.push(e);
      };
    return c.forEach(f), i.forEach(f), d.sort(r);
  }
  var s = n(380),
    h = "scene_";
  t.exports = c;
});
