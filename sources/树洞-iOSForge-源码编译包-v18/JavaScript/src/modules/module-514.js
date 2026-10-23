// Recovered module 514; analysis path, not original filename.
// Original SHA-256 46a32bd104ff9c556e754fa5a8ab9b72ff49948ebb0e14063f34ddc381720441; original byte range [708646, 709231).
__d(514, function (e, t, r, c) {
  var o = t(511),
    n = t(455),
    a = t(510),
    s = t(509),
    u = t(513),
    i = t(512),
    b = t(467),
    j = "[object Map]",
    w = "[object Object]",
    f = "[object Promise]",
    p = "[object Set]",
    v = "[object WeakMap]",
    d = "[object DataView]",
    l = Object.prototype,
    y = l.toString,
    M = b(o),
    O = b(n),
    S = b(a),
    _ = b(s),
    g = b(u),
    h = i;
  (o && h(new o(new ArrayBuffer(1))) != d || n && h(new n()) != j || a && h(a.resolve()) != f || s && h(new s()) != p || u && h(new u()) != v) && (h = function (e) {
    var t = y.call(e),
      r = t == w ? e.constructor : void 0,
      c = r ? b(r) : void 0;
    if (c) switch (c) {
      case M:
        return d;
      case O:
        return j;
      case S:
        return f;
      case _:
        return p;
      case g:
        return v;
    }
    return t;
  }), r.exports = h;
});
