// Recovered module 428; analysis path, not original filename.
// Original SHA-256 134d235657e8bc29f8e6d809af3a99d5fad42018f262631a7a48660054d0a8e2; original byte range [464148, 464334).
__d(428, function (t, e, n, c) {
  "use strict";

  var r = {
    extractSingleTouch: function (t) {
      var e = t.touches,
        n = t.changedTouches,
        c = e && e.length > 0,
        r = n && n.length > 0;
      return !c && r ? n[0] : c ? e[0] : t;
    }
  };
  n.exports = r;
});
