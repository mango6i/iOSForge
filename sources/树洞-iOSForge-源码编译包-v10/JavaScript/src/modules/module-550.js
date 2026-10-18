// Recovered module 550; analysis path, not original filename.
// Original SHA-256 b51fc70b427794956cc266cafbdcad53c89c341ed819081608d517f5c4c78b38; original byte range [742671, 743089).
__d(550, function (t, e, r, n) {
  "use strict";

  function o(t, e) {
    return t === e ? 0 !== t || 0 !== e || 1 / t === 1 / e : t !== t && e !== e;
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
