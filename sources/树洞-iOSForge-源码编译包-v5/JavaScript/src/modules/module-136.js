// Recovered module 136; analysis path, not original filename.
// Original SHA-256 844f7e6044ba1d5bc6c1d28048e243f58bbf9b3d952034b853ab0c4bfacd833b; original byte range [233376, 233896).
__d(136, function (e, o, r, l) {
  "use strict";

  var n = o(32),
    t = o(380),
    a = {
      log: "log",
      info: "info",
      warn: "warn",
      error: "error",
      fatal: "error"
    },
    s = function () {
      function o() {
        babelHelpers.classCallCheck(this, o);
      }
      return babelHelpers.createClass(o, null, [{
        key: "logIfNoNativeHook",
        value: function () {
          var o = Array.prototype.slice.call(arguments),
            r = o.shift(),
            l = a[r];
          return t(l, 'Level "' + r + '" not one of ' + Object.keys(a)), "undefined" == typeof e.nativeLoggingHook && console[l].apply(console, o), !0;
        }
      }]), o;
    }();
  n.registerCallableModule("RCTLog", s), r.exports = s;
});
