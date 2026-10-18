// Recovered module 27; analysis path, not original filename.
// Original SHA-256 ee7c15f396256daea535a2139a162026c145d7e3939808abb117a071d6d55df7; original byte range [97960, 98275).
__d(27, function (r, t, e, n) {
  "use strict";

  function f(r) {
    return "number" == typeof r ? i.getByID(r) : r;
  }
  function u(r) {
    if (r) {
      if (a(r !== !0, "style may be false but not true"), !Array.isArray(r)) return f(r);
      for (var t = {}, e = 0, n = r.length; n > e; ++e) {
        var i = u(r[e]);
        if (i) for (var o in i) t[o] = i[o];
      }
      return t;
    }
  }
  var i = t(25),
    a = t(380);
  e.exports = u;
});
