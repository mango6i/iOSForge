// Recovered module 44; analysis path, not original filename.
// Original SHA-256 560c254e3fe8f3f98f97b179c7252b0e49b6e814f62662b0167463b80a191131; original byte range [115065, 115588).
__d(44, function (e, t, n, u) {
  "use strict";

  var r = t(45),
    a = function () {
      function e() {
        babelHelpers.classCallCheck(this, e);
      }
      return babelHelpers.createClass(e, null, [{
        key: "get",
        value: function () {
          return r.get("window").scale;
        }
      }, {
        key: "getFontScale",
        value: function () {
          return r.get("window").fontScale || e.get();
        }
      }, {
        key: "getPixelSizeForLayoutSize",
        value: function (t) {
          return Math.round(t * e.get());
        }
      }, {
        key: "roundToNearestPixel",
        value: function (t) {
          var n = e.get();
          return Math.round(t * n) / n;
        }
      }, {
        key: "startDetecting",
        value: function () {}
      }]), e;
    }();
  n.exports = a;
});
