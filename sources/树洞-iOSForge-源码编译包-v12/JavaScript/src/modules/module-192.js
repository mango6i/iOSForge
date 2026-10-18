// Recovered module 192; analysis path, not original filename.
// Original SHA-256 7df86e437714d899b19c4add66f5dbd734e626b3dc3d622d22246bb8ef3f952e; original byte range [332395, 333333).
__d(192, function (t, e, i, r) {
  "use strict";

  var s = e(47),
    a = e(191),
    l = function (t) {
      function e(t) {
        babelHelpers.classCallCheck(this, e);
        var i = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(e).call(this));
        return i._emitting = !1, i._emitQueue = [], i._target = t, i;
      }
      return babelHelpers.inherits(e, t), babelHelpers.createClass(e, [{
        key: "emit",
        value: function (t, i, r, s) {
          if (this._emitting) {
            var l = Array.prototype.slice.call(arguments);
            return void this._emitQueue.push(l);
          }
          this._emitting = !0;
          var n = a.pool(t, this._target, i);
          for (s && (s.target && (n.target = s.target), s.eventPhase && (n.eventPhase = s.eventPhase), s.defaultPrevented && n.preventDefault(), s.propagationStopped && n.stopPropagation()), babelHelpers.get(Object.getPrototypeOf(e.prototype), "emit", this).call(this, String(t), n), "function" == typeof r && r.call(this._target, n), n.dispose(), this._emitting = !1; this._emitQueue.length;) {
            var l = this._emitQueue.shift();
            this.emit.apply(this, l);
          }
        }
      }]), e;
    }(s);
  i.exports = l;
});
