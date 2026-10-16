// Recovered module 293; analysis path, not original filename.
// Original SHA-256 4d2c6b981cb5e7d9d76b2d9d008da6ab8a1544f985260b9aade29bfcb4866929; original byte range [569166, 569338).
__d(293, function (r, n, t, u) {
  "use strict";

  function e(r, n) {
    return function (t, u) {
      for (var e = 0; e < r.length; e++) {
        var f = r[e],
          i = f(t, u);
        if (i !== t) return i || n;
      }
      return t || n;
    };
  }
  t.exports = e;
});
