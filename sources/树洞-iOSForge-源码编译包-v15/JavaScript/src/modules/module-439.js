// Recovered module 439; analysis path, not original filename.
// Original SHA-256 369babd94a33b9fa5e1c770093b0527daf37e1e8cba6fada21d8c1d52b4dbb17; original byte range [697057, 697675).
__d(439, function (r, e, t, a) {
  function n(r, e, t, a, n, d) {
    var y = v(r),
      O = v(e),
      A = i,
      g = i;
    y || (A = u(r), A = A == f ? j : A), O || (g = u(e), g = g == f ? j : g);
    var h = A == j && !l(r),
      m = g == j && !l(e),
      x = A == g;
    if (x && !h) return d || (d = new _()), y || w(r) ? c(r, e, t, a, n, d) : o(r, e, A, t, a, n, d);
    if (!(n & b)) {
      var P = h && s.call(r, "__wrapped__"),
        k = m && s.call(e, "__wrapped__");
      if (P || k) {
        var q = P ? r.value() : r,
          z = k ? e.value() : e;
        return d || (d = new _()), t(q, z, a, n, d);
      }
    }
    return x ? (d || (d = new _()), p(r, e, t, a, n, d)) : !1;
  }
  var _ = e(440),
    c = e(486),
    o = e(492),
    p = e(495),
    u = e(514),
    v = e(504),
    l = e(462),
    w = e(515),
    b = 2,
    f = "[object Arguments]",
    i = "[object Array]",
    j = "[object Object]",
    d = Object.prototype,
    s = d.hasOwnProperty;
  t.exports = n;
});
