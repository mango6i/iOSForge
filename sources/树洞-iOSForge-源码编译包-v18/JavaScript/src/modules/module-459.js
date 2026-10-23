// Recovered module 459; analysis path, not original filename.
// Original SHA-256 ee69dd8ffd267c13c22a06b8b37f1329e2081fc8d2d202aa020c67204afa844e; original byte range [699806, 700222).
__d(459, function (t, r, o, e) {
  function n(t) {
    if (!u(t) || a(t)) return !1;
    var r = c(t) || p(t) ? O : s;
    return r.test(i(t));
  }
  var c = r(458),
    p = r(462),
    a = r(463),
    u = r(461),
    i = r(467),
    f = /[\\^$.*+?()[\]{}|]/g,
    s = /^\[object .+?Constructor\]$/,
    $ = Function.prototype,
    g = Object.prototype,
    l = $.toString,
    y = g.hasOwnProperty,
    O = RegExp("^" + l.call(y).replace(f, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
  o.exports = n;
});
