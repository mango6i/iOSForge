// Recovered module 108; analysis path, not original filename.
// Original SHA-256 7901ffd1ad7668c98bd3724d0af501b8ca6b3f86de888070e7a5ff49eae3e18a; original byte range [180264, 180501).
__d(108, function (t, e, n, i) {
  "use strict";

  var E = e(4),
    T = e(380),
    o = {
      NATIVE: 0,
      COMPOSITE: 1,
      EMPTY: 2,
      getType: function (t) {
        return null === t || t === !1 ? o.EMPTY : E.isValidElement(t) ? "function" == typeof t.type ? o.COMPOSITE : o.NATIVE : void T(!1);
      }
    };
  n.exports = o;
});
