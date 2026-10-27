// Recovered module 306; analysis path, not original filename.
// Original SHA-256 5bbc4eada6cc7b04691431a9bf4c29722df6665e41267cba9c9e2c9f933e3145; original byte range [584404, 584688).
__d(306, function (e, r, s, i) {
  "use strict";

  function u(e, r) {
    this.value = e, this.requestChange = r;
  }
  function n(e) {
    var r = {
      value: void 0 === e ? t.PropTypes.any.isRequired : e.isRequired,
      requestChange: t.PropTypes.func.isRequired
    };
    return t.PropTypes.shape(r);
  }
  var t = r(1);
  u.PropTypes = {
    link: n
  }, s.exports = u;
});
