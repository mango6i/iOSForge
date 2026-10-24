// Recovered module 168; analysis path, not original filename.
// Original SHA-256 cbee7f190a364951c8f76ba13fae96e3ba22e5fb12dc8077e53e923eb0348172; original byte range [278981, 279849).
__d(168, function (n, r, t, e) {
  "use strict";

  function a(n, r) {
    for (var t = 0, e = n; e; e = e._nativeParent) t++;
    for (var a = 0, o = r; o; o = o._nativeParent) a++;
    for (; t - a > 0;) n = n._nativeParent, t--;
    for (; a - t > 0;) r = r._nativeParent, a--;
    for (var v = t; v--;) {
      if (n === r) return n;
      n = n._nativeParent, r = r._nativeParent;
    }
    return null;
  }
  function o(n, r) {
    for (; r;) {
      if (r === n) return !0;
      r = r._nativeParent;
    }
    return !1;
  }
  function v(n) {
    return n._nativeParent;
  }
  function f(n, r, t) {
    for (var e = []; n;) e.push(n), n = n._nativeParent;
    var a;
    for (a = e.length; a-- > 0;) r(e[a], !1, t);
    for (a = 0; a < e.length; a++) r(e[a], !0, t);
  }
  function i(n, r, t, e, o) {
    for (var v = n && r ? a(n, r) : null, f = []; n && n !== v;) f.push(n), n = n._nativeParent;
    for (var i = []; r && r !== v;) i.push(r), r = r._nativeParent;
    var u;
    for (u = 0; u < f.length; u++) t(f[u], !0, e);
    for (u = i.length; u-- > 0;) t(i[u], !1, o);
  }
  t.exports = {
    isAncestor: o,
    getLowestCommonAncestor: a,
    getParentInstance: v,
    traverseTwoPhase: f,
    traverseEnterLeave: i
  };
});
