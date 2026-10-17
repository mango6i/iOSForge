// Recovered module 562; analysis path, not original filename.
// Original SHA-256 f78ee92cae153f079261104b35bbb1a408abf6267398a7e69227ed43bf1de382; original byte range [897219, 897498).
__d(562, function (r, n, a, o) {
  function t(r, n, a) {
    var o = n && a || 0;
    "string" == typeof r && (n = "binary" == r ? new Array(16) : null, r = null), r = r || {};
    var t = r.random || (r.rng || f)();
    if (t[6] = 15 & t[6] | 64, t[8] = 63 & t[8] | 128, n) for (var u = 0; 16 > u; ++u) n[o + u] = t[u];
    return n || i(t);
  }
  var f = n(563),
    i = n(564);
  a.exports = t;
});
