// Recovered module 486; analysis path, not original filename.
// Original SHA-256 443507802c3a8befa81510fb2b59bd1676a457ebadad00b7d5e87759c411e8d3; original byte range [703620, 704162).
__d(486, function (e, r, t, i) {
  function n(e, r, t, i, n, d) {
    var u = n & v,
      l = e.length,
      s = r.length;
    if (l != s && !(u && s > l)) return !1;
    var c = d.get(e);
    if (c && d.get(r)) return c == r;
    var g = -1,
      b = !0,
      h = n & o ? new f() : void 0;
    for (d.set(e, r), d.set(r, e); ++g < l;) {
      var k = e[g],
        _ = r[g];
      if (i) var p = u ? i(_, k, g, r, e, d) : i(k, _, g, e, r, d);
      if (void 0 !== p) {
        if (p) continue;
        b = !1;
        break;
      }
      if (h) {
        if (!a(r, function (e, r) {
          return h.has(r) || k !== e && !t(k, e, i, n, d) ? void 0 : h.add(r);
        })) {
          b = !1;
          break;
        }
      } else if (k !== _ && !t(k, _, i, n, d)) {
        b = !1;
        break;
      }
    }
    return d["delete"](e), d["delete"](r), b;
  }
  var f = r(483),
    a = r(487),
    o = 1,
    v = 2;
  t.exports = n;
});
