// Recovered module 161; analysis path, not original filename.
// Original SHA-256 b335c5545fda685a805174be855cc3d29a02d811be1be3ba8e718e9a8c4932ae; original byte range [274713, 276455).
__d(161, function (t, e, n, r) {
  "use strict";

  function a(t, e, n, r) {
    this.dispatchConfig = t, this._targetInst = e, this.nativeEvent = n;
    var a = this.constructor.Interface;
    for (var s in a) if (a.hasOwnProperty(s)) {
      var i = a[s];
      i ? this[s] = i(n) : "target" === s ? this.target = r : this[s] = n[s];
    }
    var u = null != n.defaultPrevented ? n.defaultPrevented : n.returnValue === !1;
    return u ? this.isDefaultPrevented = o.thatReturnsTrue : this.isDefaultPrevented = o.thatReturnsFalse, this.isPropagationStopped = o.thatReturnsFalse, this;
  }
  var s = e(379),
    i = e(3),
    o = e(383),
    u = (e(381), "function" == typeof Proxy, ["dispatchConfig", "_targetInst", "nativeEvent", "isDefaultPrevented", "isPropagationStopped", "_dispatchListeners", "_dispatchInstances"]),
    l = {
      type: null,
      target: null,
      currentTarget: o.thatReturnsNull,
      eventPhase: null,
      bubbles: null,
      cancelable: null,
      timeStamp: function (t) {
        return t.timeStamp || Date.now();
      },
      defaultPrevented: null,
      isTrusted: null
    };
  s(a.prototype, {
    preventDefault: function () {
      this.defaultPrevented = !0;
      var t = this.nativeEvent;
      t && (t.preventDefault ? t.preventDefault() : t.returnValue = !1, this.isDefaultPrevented = o.thatReturnsTrue);
    },
    stopPropagation: function () {
      var t = this.nativeEvent;
      t && (t.stopPropagation ? t.stopPropagation() : t.cancelBubble = !0, this.isPropagationStopped = o.thatReturnsTrue);
    },
    persist: function () {
      this.isPersistent = o.thatReturnsTrue;
    },
    isPersistent: o.thatReturnsFalse,
    destructor: function () {
      var t = this.constructor.Interface;
      for (var e in t) this[e] = null;
      for (var n = 0; n < u.length; n++) this[u[n]] = null;
    }
  }), a.Interface = l, a.augmentClass = function (t, e) {
    var n = this,
      r = function () {};
    r.prototype = n.prototype;
    var a = new r();
    s(a, t.prototype), t.prototype = a, t.prototype.constructor = t, t.Interface = s({}, n.Interface, e), t.augmentClass = n.augmentClass, i.addPoolingTo(t, i.fourArgumentPooler);
  }, i.addPoolingTo(a, i.fourArgumentPooler), n.exports = a;
});
