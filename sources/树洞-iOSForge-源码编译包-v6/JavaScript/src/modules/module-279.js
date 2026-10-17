// Recovered module 279; analysis path, not original filename.
// Original SHA-256 7df6e0777b458e2759b0fe5692547f17cbbabd25b610cbe9cf19d8169751411f; original byte range [555484, 555980).
__d(279, function (n, e, a, s) {
  "use strict";

  var o = e(201),
    t = e(380),
    l = {
      onMoveShouldSetPanResponder: null,
      onPanResponderGrant: null,
      onPanResponderMove: null,
      onPanResponderRelease: null,
      onPanResponderTerminate: null
    },
    r = function i() {
      var n = this;
      babelHelpers.classCallCheck(this, i);
      var e = {};
      Object.keys(l).forEach(function (a) {
        var s = n[a];
        t("function" == typeof s, "subclass of `NavigationAbstractPanResponder` must implement method %s", a), e[a] = s.bind(n);
      }, this), this.panHandlers = o.create(e).panHandlers;
    };
  a.exports = r;
});
