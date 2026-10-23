// Recovered module 424; analysis path, not original filename.
// Original SHA-256 cc4bab351275ce7466232fafbd0e84d36a3adc6f680f76f2faf7e667e107da55; original byte range [301003, 301401).
__d(424, function (e, n, t, l) {
  "use strict";

  function c(e, n) {
    for (var t = n.ref, l = e.ref, c = arguments.length, r = Array(c > 2 ? c - 2 : 0), a = 2; c > a; a++) r[a - 2] = arguments[a];
    return null == l || null == t ? o.cloneElement.apply(o, [e, n].concat(r)) : "function" != typeof l ? o.cloneElement.apply(o, [e, n].concat(r)) : o.cloneElement.apply(o, [e, babelHelpers["extends"]({}, n, {
      ref: function (e) {
        t(e), l(e);
      }
    })].concat(r));
  }
  var o = n(311);
  t.exports = c;
});
