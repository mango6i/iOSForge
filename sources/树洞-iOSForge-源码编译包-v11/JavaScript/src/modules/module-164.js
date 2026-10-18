// Recovered module 164; analysis path, not original filename.
// Original SHA-256 6bb3f40a920a6455ceea87fa57f7ae05cca7195e263fc94c967fa14730f78f23; original byte range [277349, 277868).
__d(164, function (t, e, n, i) {
  "use strict";

  function o() {
    this.reinitializeTransaction(), this.reactMountReady = r.getPooled(null);
  }
  var a = e(379),
    r = e(96),
    u = e(3),
    c = e(101),
    s = {
      initialize: function () {
        this.reactMountReady.reset();
      },
      close: function () {
        this.reactMountReady.notifyAll();
      }
    },
    d = [s],
    l = {
      getTransactionWrappers: function () {
        return d;
      },
      getReactMountReady: function () {
        return this.reactMountReady;
      },
      destructor: function () {
        r.release(this.reactMountReady), this.reactMountReady = null;
      }
    };
  a(o.prototype, c.Mixin, o, l), u.addPoolingTo(o), n.exports = o;
});
