// Recovered module 536; analysis path, not original filename.
// Original SHA-256 42a1526764463e92e8521967d240fbc7496b0147df174354d1024ba6804b40cd; original byte range [713257, 713529).
__d(536, function (r, n, t, a) {
  function o(r, n) {
    return n = f(void 0 === n ? r.length - 1 : n, 0), function () {
      for (var t = arguments, a = -1, o = f(t.length - n, 0), i = Array(o); ++a < o;) i[a] = t[n + a];
      a = -1;
      for (var u = Array(n + 1); ++a < n;) u[a] = t[a];
      return u[n] = i, e(r, this, u);
    };
  }
  var e = n(533),
    f = Math.max;
  t.exports = o;
});
