// Recovered module 231; analysis path, not original filename.
// Original SHA-256 5e4644a6091c14c27249c21de163c5063188867b82a6d930c20813a151789a37; original byte range [474288, 475941).
__d(231, function (e, t, n, r) {
  "use strict";

  var i = function () {
    function e(t, n) {
      babelHelpers.classCallCheck(this, e), this._emitter = t, this._eventHolder = n, this._currentEventToken = null, this._emittingHeldEvents = !1;
    }
    return babelHelpers.createClass(e, [{
      key: "addListener",
      value: function (e, t, n) {
        return this._emitter.addListener(e, t, n);
      }
    }, {
      key: "once",
      value: function (e, t, n) {
        return this._emitter.once(e, t, n);
      }
    }, {
      key: "addRetroactiveListener",
      value: function (e, t, n) {
        var r = this._emitter.addListener(e, t, n);
        return this._emittingHeldEvents = !0, this._eventHolder.emitToListener(e, t, n), this._emittingHeldEvents = !1, r;
      }
    }, {
      key: "removeAllListeners",
      value: function (e) {
        this._emitter.removeAllListeners(e);
      }
    }, {
      key: "removeCurrentListener",
      value: function () {
        this._emitter.removeCurrentListener();
      }
    }, {
      key: "listeners",
      value: function (e) {
        return this._emitter.listeners(e);
      }
    }, {
      key: "emit",
      value: function (e) {
        for (var t, n = arguments.length, r = Array(n > 1 ? n - 1 : 0), i = 1; n > i; i++) r[i - 1] = arguments[i];
        (t = this._emitter).emit.apply(t, [e].concat(babelHelpers.toConsumableArray(r)));
      }
    }, {
      key: "emitAndHold",
      value: function (e) {
        for (var t, n, r = arguments.length, i = Array(r > 1 ? r - 1 : 0), s = 1; r > s; s++) i[s - 1] = arguments[s];
        this._currentEventToken = (t = this._eventHolder).holdEvent.apply(t, [e].concat(babelHelpers.toConsumableArray(i))), (n = this._emitter).emit.apply(n, [e].concat(babelHelpers.toConsumableArray(i))), this._currentEventToken = null;
      }
    }, {
      key: "releaseCurrentEvent",
      value: function () {
        this._currentEventToken ? this._eventHolder.releaseEvent(this._currentEventToken) : this._emittingHeldEvents && this._eventHolder.releaseCurrentEvent();
      }
    }, {
      key: "releaseHeldEventType",
      value: function (e) {
        this._eventHolder.releaseEventType(e);
      }
    }]), e;
  }();
  n.exports = i;
});
