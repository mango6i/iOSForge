// Recovered module 582; analysis path, not original filename.
// Original SHA-256 75b41009176ec362461d7c1d9a50e8f63e92fd9a7a1c2404f4bfcdb97d123740; original byte range [1587359, 1587894).
__d(582, function (t, n, o, r) {
  "use strict";

  var e = Object.prototype.hasOwnProperty,
    c = Object.prototype.toString,
    l = function (t) {
      return "function" == typeof t && !(t instanceof RegExp) || "[object Function]" === c.call(t);
    };
  o.exports = function (t, n) {
    if (!l(n)) throw new TypeError("iterator must be a function");
    var o,
      r,
      c = "string" == typeof t,
      i = t.length,
      a = arguments.length > 2 ? arguments[2] : null;
    if (i === +i) for (o = 0; i > o; o++) null === a ? n(c ? t.charAt(o) : t[o], o, t) : n.call(a, c ? t.charAt(o) : t[o], o, t);else for (r in t) e.call(t, r) && (null === a ? n(t[r], r, t) : n.call(a, t[r], r, t));
  };
});
