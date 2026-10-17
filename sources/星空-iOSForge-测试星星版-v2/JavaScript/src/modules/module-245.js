// Recovered module 245; analysis path, not original filename.
// Original SHA-256 9483203fcd1686c79dd061dc8c1a02f83dc867d6f24e5428c4893a9745b0a9cf; original byte range [513634, 515128).
__d(245, function (e, n, u, t) {
  "use strict";

  var r = n(246),
    a = function () {
      function e() {
        babelHelpers.classCallCheck(this, e);
      }
      return babelHelpers.createClass(e, null, [{
        key: "step0",
        value: function (e) {
          return e > 0 ? 1 : 0;
        }
      }, {
        key: "step1",
        value: function (e) {
          return e >= 1 ? 1 : 0;
        }
      }, {
        key: "linear",
        value: function (e) {
          return e;
        }
      }, {
        key: "ease",
        value: function (e) {
          return c(e);
        }
      }, {
        key: "quad",
        value: function (e) {
          return e * e;
        }
      }, {
        key: "cubic",
        value: function (e) {
          return e * e * e;
        }
      }, {
        key: "poly",
        value: function (e) {
          return function (n) {
            return Math.pow(n, e);
          };
        }
      }, {
        key: "sin",
        value: function (e) {
          return 1 - Math.cos(e * Math.PI / 2);
        }
      }, {
        key: "circle",
        value: function (e) {
          return 1 - Math.sqrt(1 - e * e);
        }
      }, {
        key: "exp",
        value: function (e) {
          return Math.pow(2, 10 * (e - 1));
        }
      }, {
        key: "elastic",
        value: function () {
          var e = arguments.length <= 0 || void 0 === arguments[0] ? 1 : arguments[0],
            n = e * Math.PI;
          return function (e) {
            return 1 - Math.pow(Math.cos(e * Math.PI / 2), 3) * Math.cos(e * n);
          };
        }
      }, {
        key: "back",
        value: function (e) {
          return void 0 === e && (e = 1.70158), function (n) {
            return n * n * ((e + 1) * n - e);
          };
        }
      }, {
        key: "bounce",
        value: function (e) {
          return .36363636363636365 > e ? 7.5625 * e * e : .7272727272727273 > e ? (e -= .5454545454545454, 7.5625 * e * e + .75) : .9090909090909091 > e ? (e -= .8181818181818182, 7.5625 * e * e + .9375) : (e -= .9545454545454546, 7.5625 * e * e + .984375);
        }
      }, {
        key: "bezier",
        value: function (e, n, u, t) {
          return r(e, n, u, t);
        }
      }, {
        key: "in",
        value: function (e) {
          return e;
        }
      }, {
        key: "out",
        value: function (e) {
          return function (n) {
            return 1 - e(1 - n);
          };
        }
      }, {
        key: "inOut",
        value: function (e) {
          return function (n) {
            return .5 > n ? e(2 * n) / 2 : 1 - e(2 * (1 - n)) / 2;
          };
        }
      }]), e;
    }(),
    c = a.bezier(.42, 0, 1, 1);
  u.exports = a;
});
