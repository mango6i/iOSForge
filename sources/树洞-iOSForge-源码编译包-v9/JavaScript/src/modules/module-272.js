// Recovered module 272; analysis path, not original filename.
// Original SHA-256 0ab4b44e6374bfbabe2b5f14d7589e7c9d6dc499e97f4b152108d397faef293b; original byte range [544530, 545670).
__d(272, function (e, n, i, t) {
  "use strict";

  var a = n(271),
    s = n(31).LinkingManager,
    r = n(380),
    o = s && s.initialURL,
    L = function () {
      function e() {
        babelHelpers.classCallCheck(this, e);
      }
      return babelHelpers.createClass(e, null, [{
        key: "addEventListener",
        value: function (e, n) {
          console.warn('"LinkingIOS.addEventListener" is deprecated. Use "Linking.addEventListener" instead.'), a.addEventListener(e, n);
        }
      }, {
        key: "removeEventListener",
        value: function (e, n) {
          console.warn('"LinkingIOS.removeEventListener" is deprecated. Use "Linking.removeEventListener" instead.'), a.removeEventListener(e, n);
        }
      }, {
        key: "openURL",
        value: function (e) {
          console.warn('"LinkingIOS.openURL" is deprecated. Use the promise based "Linking.openURL" instead.'), a.openURL(e);
        }
      }, {
        key: "canOpenURL",
        value: function (e, n) {
          console.warn('"LinkingIOS.canOpenURL" is deprecated. Use the promise based "Linking.canOpenURL" instead.'), r("function" == typeof n, "A valid callback function is required"), a.canOpenURL(e).then(n);
        }
      }, {
        key: "popInitialURL",
        value: function () {
          console.warn('"LinkingIOS.popInitialURL" is deprecated. Use the promise based "Linking.getInitialURL" instead.');
          var e = o;
          return o = null, e;
        }
      }]), e;
    }();
  i.exports = L;
});
