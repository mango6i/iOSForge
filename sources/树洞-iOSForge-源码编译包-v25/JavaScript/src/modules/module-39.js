// Recovered module 39; analysis path, not original filename.
// Original SHA-256 0bca95dc3f0dabf1e618bf0b8d34ca892004dc07e2649f1b51b0b35f4c94bfd6; original byte range [113499, 113886).
__d(39, function (t, n, i, e) {
  "use strict";

  function f(t) {
    var n,
      i = typeof t;
    if (void 0 === t) n = "undefined";else if (null === t) n = "null";else if ("string" === i) n = '"' + t + '"';else if ("function" === i) try {
      n = t.toString();
    } catch (e) {
      n = "[function unknown]";
    } else try {
      n = JSON.stringify(t);
    } catch (e) {
      if ("function" == typeof t.toString) try {
        n = t.toString();
      } catch (f) {}
    }
    return n || '["' + i + '" failed to stringify]';
  }
  i.exports = f;
});
