// Recovered module 25; analysis path, not original filename.
// Original SHA-256 4c24609627a64152d5a0a01e8ff7763eb157e5b7b721bcce7fa307980247ec34; original byte range [97080, 97466).
__d(25, function (n, t, r, i) {
  "use strict";

  function e(n, t) {
    if (!(n instanceof t)) throw new TypeError("Cannot call a class as a function");
  }
  var o = {},
    a = 1,
    c = {},
    u = function () {
      function n() {
        e(this, n);
      }
      return n.register = function (n) {
        var t = ++a;
        return o[t] = n, t;
      }, n.getByID = function (n) {
        if (!n) return c;
        var t = o[n];
        return t ? t : (console.warn("Invalid style with id `" + n + "`. Skipping ..."), c);
      }, n;
    }();
  r.exports = u;
});
