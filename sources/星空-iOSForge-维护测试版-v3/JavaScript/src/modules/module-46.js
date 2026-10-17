// Recovered module 46; analysis path, not original filename.
// Original SHA-256 be3747514294ee9bfd5d41bc07316515f78443d0e52ba40cea80549a9fa36b3e; original byte range [116245, 117690).
__d(46, function (e, t, r, s) {
  "use strict";

  var l = t(47),
    o = t(50),
    a = t(32),
    n = function (e) {
      function r() {
        babelHelpers.classCallCheck(this, r);
        var e = new o(),
          t = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(r).call(this, e));
        return t.sharedSubscriber = e, t;
      }
      return babelHelpers.inherits(r, e), babelHelpers.createClass(r, [{
        key: "addListener",
        value: function (e, s, l) {
          return 0 === e.lastIndexOf("statusBar", 0) ? (console.warn("`%s` event should be registered via the StatusBarIOS module", e), t(51).addListener(e, s, l)) : 0 === e.lastIndexOf("keyboard", 0) ? (console.warn("`%s` event should be registered via the Keyboard module", e), t(57).addListener(e, s, l)) : babelHelpers.get(Object.getPrototypeOf(r.prototype), "addListener", this).call(this, e, s, l);
        }
      }, {
        key: "removeAllListeners",
        value: function (e) {
          if (e) {
            if (0 === e.lastIndexOf("statusBar", 0)) return console.warn("statusBar events should be unregistered via the StatusBarIOS module"), t(51).removeAllListeners(e);
            if (0 === e.lastIndexOf("keyboard", 0)) return console.warn("keyboard events should be unregistered via the Keyboard module"), t(57).removeAllListeners(e);
          }
          babelHelpers.get(Object.getPrototypeOf(r.prototype), "removeAllListeners", this).call(this, e);
        }
      }, {
        key: "removeSubscription",
        value: function (e) {
          e.emitter !== this ? e.emitter.removeSubscription(e) : babelHelpers.get(Object.getPrototypeOf(r.prototype), "removeSubscription", this).call(this, e);
        }
      }]), r;
    }(l);
  n = new n(), a.registerCallableModule("RCTDeviceEventEmitter", n), r.exports = n;
});
