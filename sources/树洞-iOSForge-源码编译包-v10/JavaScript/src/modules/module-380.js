// Recovered module 380; analysis path, not original filename.
// Original SHA-256 2db63807182e08d7e36d1017a5455b14834001e3db42620c9bba583c289aae36; original byte range [70833, 71221).
__d(380, function (e, n, r, i) {
  "use strict";

  function o(e, n, r, i, o, t, a, f) {
    if (!e) {
      var s;
      if (void 0 === n) s = new Error("Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings.");else {
        var d = [r, i, o, t, a, f],
          u = 0;
        s = new Error(n.replace(/%s/g, function () {
          return d[u++];
        })), s.name = "Invariant Violation";
      }
      throw s.framesToPop = 1, s;
    }
  }
  r.exports = o;
});
