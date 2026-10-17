// Recovered module 532; analysis path, not original filename.
// Original SHA-256 c749064356efb0e7e40e30e7374c062400df12c1e555b1b474b49b6de155ec2c; original byte range [712465, 712675).
__d(532, function (n, r, t, e) {
  function o(n, r, t, e, u) {
    var v = -1,
      c = n.length;
    for (t || (t = f), u || (u = []); ++v < c;) {
      var g = n[v];
      r > 0 && t(g) ? r > 1 ? o(g, r - 1, t, e, u) : a(u, g) : e || (u[u.length] = g);
    }
    return u;
  }
  var a = r(528),
    f = r(529);
  t.exports = o;
});
