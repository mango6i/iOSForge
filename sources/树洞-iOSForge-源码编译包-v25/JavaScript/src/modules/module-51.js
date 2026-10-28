// Recovered module 51; analysis path, not original filename.
// Original SHA-256 203fc6fd44c92ed3d718a2b01d1350a24c472ac44f750549d3d407c53d9366eb; original byte range [120550, 121425).
__d(51, function (e, t, s, a) {
  "use strict";

  var i = t(52),
    r = t(53),
    n = t(31).StatusBarManager,
    l = function (e) {
      function t() {
        return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "setStyle",
        value: function (e, t) {
          console.warn("`StatusBarIOS.setStyle` is deprecated. Use `StatusBar.setBarStyle` instead."), r.setBarStyle(e, t);
        }
      }, {
        key: "setHidden",
        value: function (e, t) {
          console.warn("`StatusBarIOS.setHidden` is deprecated. Use `StatusBar.setHidden` instead."), r.setHidden(e, t);
        }
      }, {
        key: "setNetworkActivityIndicatorVisible",
        value: function (e) {
          console.warn("`StatusBarIOS.setNetworkActivityIndicatorVisible` is deprecated. Use `StatusBar.setNetworkActivityIndicatorVisible` instead."), r.setNetworkActivityIndicatorVisible(e);
        }
      }]), t;
    }(i);
  s.exports = new l(n);
});
