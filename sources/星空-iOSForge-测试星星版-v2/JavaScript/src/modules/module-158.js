// Recovered module 158; analysis path, not original filename.
// Original SHA-256 201a7b544e3d13d4429833453f4fe426bfb6297e2c02548c11378907dc66cc3d; original byte range [272488, 272979).
__d(158, function (i, t, n, a) {
  "use strict";

  function e() {
    this.reinitializeTransaction();
  }
  var s = t(379),
    c = t(95),
    r = t(101),
    o = t(383),
    p = {
      initialize: o,
      close: function () {
        l.isBatchingUpdates = !1;
      }
    },
    d = {
      initialize: o,
      close: c.flushBatchedUpdates.bind(c)
    },
    u = [d, p];
  s(e.prototype, r.Mixin, {
    getTransactionWrappers: function () {
      return u;
    }
  });
  var h = new e(),
    l = {
      isBatchingUpdates: !1,
      batchedUpdates: function (i, t, n, a, e, s) {
        var c = l.isBatchingUpdates;
        l.isBatchingUpdates = !0, c ? i(t, n, a, e, s) : h.perform(i, null, t, n, a, e, s);
      }
    };
  n.exports = l;
});
