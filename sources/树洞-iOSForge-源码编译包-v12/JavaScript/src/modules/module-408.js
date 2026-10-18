// Recovered module 408; analysis path, not original filename.
// Original SHA-256 15e40ded2daa0c0d688075ad185e683513ec7c5234bcbf957c4720c8603607de; original byte range [197134, 197506).
__d(408, function (t, i, n, o) {
  n.exports = function (t) {
    for (var i = {}, n = 0, o = arguments.length; o > n; n++) {
      var r = arguments[n];
      "function" == typeof r && (r = r.prototype);
      for (var e in r) i[e] = r[e];
    }
    return i.initialize || (i.initialize = function () {}), i.constructor = function (t, n, o, r, e, c, u, f) {
      return new i.initialize(t, n, o, r, e, c, u, f);
    }, i.constructor.prototype = i.initialize.prototype = i, i.constructor;
  };
});
