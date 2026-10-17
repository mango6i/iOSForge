// Recovered module 26; analysis path, not original filename.
// Original SHA-256 925945fbb4e22779d89da89c57242f58eebfb28f88d115c0ccc2d2ef6fb9e257; original byte range [97467, 97959).
__d(26, function (r, t, n, e) {
  "use strict";

  var f = function i(r, t) {
    if (r === t) return !1;
    if ("function" == typeof r && "function" == typeof t) return !1;
    if ("object" != typeof r || null === r) return r !== t;
    if ("object" != typeof t || null === t) return !0;
    if (r.constructor !== t.constructor) return !0;
    if (Array.isArray(r)) {
      var n = r.length;
      if (t.length !== n) return !0;
      for (var e = 0; n > e; e++) if (i(r[e], t[e])) return !0;
    } else {
      for (var f in r) if (i(r[f], t[f])) return !0;
      for (var o in t) if (void 0 === r[o] && void 0 !== t[o]) return !0;
    }
    return !1;
  };
  n.exports = f;
});
