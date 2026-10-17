// Recovered module 95; analysis path, not original filename.
// Original SHA-256 d0078a63a4eec7c6a149871c70b388c24727ac4816c9a58459f0a2d228c08562; original byte range [161766, 164203).
__d(95, function (e, n, t, i) {
  "use strict";

  function o() {
    P.ReactReconcileTransaction && _ ? void 0 : v(!1);
  }
  function c() {
    this.reinitializeTransaction(), this.dirtyComponentsLength = null, this.callbackQueue = h.getPooled(), this.reconcileTransaction = P.ReactReconcileTransaction.getPooled(!0);
  }
  function a(e, n, t, i, c, a) {
    o(), _.batchedUpdates(e, n, t, i, c, a);
  }
  function r(e, n) {
    return e._mountOrder - n._mountOrder;
  }
  function l(e) {
    var n = e.dirtyComponentsLength;
    n !== b.length ? v(!1) : void 0, b.sort(r), T++;
    for (var t = 0; n > t; t++) {
      var i = b[t],
        o = i._pendingCallbacks;
      i._pendingCallbacks = null;
      var c;
      if (f.logTopLevelRenders) {
        var a = i;
        i._currentElement.props === i._renderedComponent._currentElement && (a = i._renderedComponent), c = "React update: " + a.getName(), console.time(c);
      }
      if (g.performUpdateIfNecessary(i, e.reconcileTransaction, T), c && console.timeEnd(c), o) for (var l = 0; l < o.length; l++) e.callbackQueue.enqueue(o[l], i.getPublicInstance());
    }
  }
  function s(e) {
    return o(), _.isBatchingUpdates ? (b.push(e), void (null == e._updateBatchNumber && (e._updateBatchNumber = T + 1))) : void _.batchedUpdates(s, e);
  }
  function u(e, n) {
    _.isBatchingUpdates ? void 0 : v(!1), y.enqueue(e, n), R = !0;
  }
  var d = n(379),
    h = n(96),
    p = n(3),
    f = n(97),
    g = (n(12), n(98)),
    m = n(101),
    v = n(380),
    b = [],
    T = 0,
    y = h.getPooled(),
    R = !1,
    _ = null,
    C = {
      initialize: function () {
        this.dirtyComponentsLength = b.length;
      },
      close: function () {
        this.dirtyComponentsLength !== b.length ? (b.splice(0, this.dirtyComponentsLength), B()) : b.length = 0;
      }
    },
    U = {
      initialize: function () {
        this.callbackQueue.reset();
      },
      close: function () {
        this.callbackQueue.notifyAll();
      }
    },
    k = [C, U];
  d(c.prototype, m.Mixin, {
    getTransactionWrappers: function () {
      return k;
    },
    destructor: function () {
      this.dirtyComponentsLength = null, h.release(this.callbackQueue), this.callbackQueue = null, P.ReactReconcileTransaction.release(this.reconcileTransaction), this.reconcileTransaction = null;
    },
    perform: function (e, n, t) {
      return m.Mixin.perform.call(this, this.reconcileTransaction.perform, this.reconcileTransaction, e, n, t);
    }
  }), p.addPoolingTo(c);
  var B = function () {
      for (; b.length || R;) {
        if (b.length) {
          var e = c.getPooled();
          e.perform(l, null, e), c.release(e);
        }
        if (R) {
          R = !1;
          var n = y;
          y = h.getPooled(), n.notifyAll(), h.release(n);
        }
      }
    },
    L = {
      injectReconcileTransaction: function (e) {
        e ? void 0 : v(!1), P.ReactReconcileTransaction = e;
      },
      injectBatchingStrategy: function (e) {
        e ? void 0 : v(!1), "function" != typeof e.batchedUpdates ? v(!1) : void 0, "boolean" != typeof e.isBatchingUpdates ? v(!1) : void 0, _ = e;
      }
    },
    P = {
      ReactReconcileTransaction: null,
      batchedUpdates: a,
      enqueueUpdate: s,
      flushBatchedUpdates: B,
      injection: L,
      asap: u
    };
  t.exports = P;
});
