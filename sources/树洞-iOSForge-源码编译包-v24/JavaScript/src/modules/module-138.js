// Recovered module 138; analysis path, not original filename.
// Original SHA-256 9883748c65a4bde8d358af35c1b11efec38af3497a6ab413f89e08386cfae289; original byte range [235001, 236488).
__d(138, function (t, e, a, n) {
  "use strict";

  var r = e(31).AlertManager,
    l = function () {
      function t() {
        babelHelpers.classCallCheck(this, t);
      }
      return babelHelpers.createClass(t, null, [{
        key: "alert",
        value: function (t, e, a, n) {
          return "undefined" != typeof n ? (console.warn('AlertIOS.alert() with a 4th "type" parameter is deprecated and will be removed. Use AlertIOS.prompt() instead.'), void this.prompt(t, e, a, n)) : void this.prompt(t, e, a, "default");
        }
      }, {
        key: "prompt",
        value: function (t, e, a) {
          var n = arguments.length <= 3 || void 0 === arguments[3] ? "plain-text" : arguments[3],
            l = arguments[4];
          if ("function" == typeof n) {
            console.warn('You passed a callback function as the "type" argument to AlertIOS.prompt(). React Native is assuming  you want to use the deprecated AlertIOS.prompt(title, defaultValue, buttons, callback) signature. The current signature is AlertIOS.prompt(title, message, callbackOrButtons, type, defaultValue) and the old syntax will be removed in a future version.');
            var i = n,
              l = e;
            return void r.alertWithArgs({
              title: t || void 0,
              type: "plain-text",
              defaultValue: l
            }, function (t, e) {
              i(e);
            });
          }
          var o,
            s,
            u = [],
            c = [];
          "function" == typeof a ? u = [a] : a instanceof Array && a.forEach(function (t, e) {
            if (u[e] = t.onPress, "cancel" === t.style ? o = String(e) : "destructive" === t.style && (s = String(e)), t.text || e < (a || []).length - 1) {
              var n = {};
              n[e] = t.text || "", c.push(n);
            }
          }), r.alertWithArgs({
            title: t || void 0,
            message: e || void 0,
            buttons: c,
            type: n || void 0,
            defaultValue: l,
            cancelButtonKey: o,
            destructiveButtonKey: s
          }, function (t, e) {
            var a = u[t];
            a && a(e);
          });
        }
      }]), t;
    }();
  a.exports = l;
});
