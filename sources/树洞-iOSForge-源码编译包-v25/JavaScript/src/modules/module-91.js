// Recovered module 91; analysis path, not original filename.
// Original SHA-256 56bb9e4c0493bfe37aff5df37ea9a467b0b01a05e40bed865aae542d217a265c; original byte range [160857, 161093).
__d(91, function (r, n, u, a) {
  "use strict";

  function t(r, n) {
    if (null == n ? i(!1) : void 0, null == r) return n;
    var u = Array.isArray(r),
      a = Array.isArray(n);
    return u && a ? (r.push.apply(r, n), r) : u ? (r.push(n), r) : a ? [r].concat(n) : [r, n];
  }
  var i = n(380);
  u.exports = t;
});
