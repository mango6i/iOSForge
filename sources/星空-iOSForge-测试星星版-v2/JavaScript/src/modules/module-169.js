// Recovered module 169; analysis path, not original filename.
// Original SHA-256 76faccb76e846e0ae7e16d92c545c78f266316a676988c0b2bffb53564fd96b1; original byte range [279850, 280310).
__d(169, function (n, e, t, o) {
  "use strict";

  var r = e(379),
    u = e(98),
    i = function (n, e) {
      this._currentElement = null, this._renderedComponent = e(n);
    };
  r(i.prototype, {
    mountComponent: function (n, e, t, o) {
      return u.mountComponent(this._renderedComponent, n, e, t, o);
    },
    receiveComponent: function () {},
    getNativeNode: function () {
      return u.getNativeNode(this._renderedComponent);
    },
    unmountComponent: function () {
      u.unmountComponent(this._renderedComponent), this._renderedComponent = null;
    }
  }), t.exports = i;
});
