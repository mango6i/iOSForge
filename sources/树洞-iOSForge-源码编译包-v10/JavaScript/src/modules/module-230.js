// Recovered module 230; analysis path, not original filename.
// Original SHA-256 2e4000d192396724fcd721c80bcd6a41e9e00dc43483308871f67d9b8a74df72; original byte range [472810, 474287).
__d(230, function (t, e, n, i) {
  function r(t, e) {
    E(e, "Must supply set of valid event types");
    var n = t.prototype || t;
    E(!n.__eventEmitter, "An active emitter is already mixed in");
    var i = t.constructor;
    i && E(i === Object || i === Function, "Mix EventEmitter into a class, not an instance"), n.hasOwnProperty(u) ? v(n.__types, e) : n.__types ? n.__types = v({}, n.__types, e) : n.__types = e, v(n, m);
  }
  var s = e(47),
    _ = e(231),
    o = e(232),
    a = e(233),
    v = e(234),
    E = e(380),
    d = e(405),
    u = d({
      __types: !0
    }),
    m = {
      emit: function (t, e, n, i, r, s, _) {
        return this.__getEventEmitter().emit(t, e, n, i, r, s, _);
      },
      emitAndHold: function (t, e, n, i, r, s, _) {
        return this.__getEventEmitter().emitAndHold(t, e, n, i, r, s, _);
      },
      addListener: function (t, e, n) {
        return this.__getEventEmitter().addListener(t, e, n);
      },
      once: function (t, e, n) {
        return this.__getEventEmitter().once(t, e, n);
      },
      addRetroactiveListener: function (t, e, n) {
        return this.__getEventEmitter().addRetroactiveListener(t, e, n);
      },
      addListenerMap: function (t, e) {
        return this.__getEventEmitter().addListenerMap(t, e);
      },
      addRetroactiveListenerMap: function (t, e) {
        return this.__getEventEmitter().addListenerMap(t, e);
      },
      removeAllListeners: function () {
        this.__getEventEmitter().removeAllListeners();
      },
      removeCurrentListener: function () {
        this.__getEventEmitter().removeCurrentListener();
      },
      releaseHeldEventType: function (t) {
        this.__getEventEmitter().releaseHeldEventType(t);
      },
      __getEventEmitter: function () {
        if (!this.__eventEmitter) {
          var t = new s();
          t = a.addValidation(t, this.__types);
          var e = new o();
          this.__eventEmitter = new _(t, e);
        }
        return this.__eventEmitter;
      }
    };
  n.exports = r;
});
