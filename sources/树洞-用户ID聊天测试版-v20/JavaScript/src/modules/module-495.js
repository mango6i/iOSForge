// Recovered module 495; analysis path, not original filename.
// Original SHA-256 73d86419df00e2ccf7f7ffdfffc7209f435f650a2ebc84d2008fa64ddc45e5dc; original byte range [706028, 706730).
__d(495, function (r, t, n, e) {
  function o(r, t, n, e, o, i) {
    var u = o & f,
      s = c(r),
      v = s.length,
      l = c(t),
      p = l.length;
    if (v != p && !u) return !1;
    for (var d = v; d--;) {
      var g = s[d];
      if (!(u ? g in t : a.call(t, g))) return !1;
    }
    var y = i.get(r);
    if (y && i.get(t)) return y == t;
    var h = !0;
    i.set(r, t), i.set(t, r);
    for (var b = u; ++d < v;) {
      g = s[d];
      var O = r[g],
        _ = t[g];
      if (e) var j = u ? e(_, O, g, t, r, i) : e(O, _, g, r, t, i);
      if (!(void 0 === j ? O === _ || n(O, _, e, o, i) : j)) {
        h = !1;
        break;
      }
      b || (b = "constructor" == g);
    }
    if (h && !b) {
      var k = r.constructor,
        w = t.constructor;
      k != w && "constructor" in r && "constructor" in t && !("function" == typeof k && k instanceof k && "function" == typeof w && w instanceof w) && (h = !1);
    }
    return i["delete"](r), i["delete"](t), h;
  }
  var c = t(497),
    f = 2,
    i = Object.prototype,
    a = i.hasOwnProperty;
  n.exports = o;
});
