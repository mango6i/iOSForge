// Recovered module 431; analysis path, not original filename.
// Original SHA-256 0e299924f01708ee1ddf83b12d243935314ce6e26cb693b20b805bfc2b71343d; original byte range [561817, 562228).
__d(431, function (t, e, r, n) {
  "use strict";

  function o(t, e) {
    return t === e ? 0 !== t || 1 / t === 1 / e : t !== t && e !== e;
  }
  function u(t, e) {
    if (o(t, e)) return !0;
    if ("object" != typeof t || null === t || "object" != typeof e || null === e) return !1;
    var r = Object.keys(t),
      n = Object.keys(e);
    if (r.length !== n.length) return !1;
    for (var u = 0; u < r.length; u++) if (!c.call(e, r[u]) || !o(t[r[u]], e[r[u]])) return !1;
    return !0;
  }
  var c = Object.prototype.hasOwnProperty;
  r.exports = u;
});
