// Recovered module 9; analysis path, not original filename.
// Original SHA-256 cc50eb00cca213a228e17fe42a1a227fe56f995a8c2485fb5b3abcff6b058780; original byte range [74327, 74670).
__d(9, function (n, r, e, t) {
  "use strict";

  function u(n) {
    var r = /[=:]/g,
      e = {
        "=": "=0",
        ":": "=2"
      },
      t = ("" + n).replace(r, function (n) {
        return e[n];
      });
    return "$" + t;
  }
  function c(n) {
    var r = /(=0|=2)/g,
      e = {
        "=0": "=",
        "=2": ":"
      },
      t = "." === n[0] && "$" === n[1] ? n.substring(2) : n.substring(1);
    return ("" + t).replace(r, function (n) {
      return e[n];
    });
  }
  var s = {
    escape: u,
    unescape: c
  };
  e.exports = s;
});
