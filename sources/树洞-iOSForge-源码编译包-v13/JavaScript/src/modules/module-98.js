// Recovered module 98; analysis path, not original filename.
// Original SHA-256 6f21c5ed31a8c27351b309e5a81e7d793e131b84974b6b663ec0f232b8983798; original byte range [165061, 165934).
__d(98, function (e, t, n, u) {
  "use strict";

  function r() {
    o.attachRefs(this, this._currentElement);
  }
  var o = t(99),
    c = (t(12), t(380)),
    a = {
      mountComponent: function (e, t, n, u, o) {
        var c = e.mountComponent(t, n, u, o);
        return e._currentElement && null != e._currentElement.ref && t.getReactMountReady().enqueue(r, e), c;
      },
      getNativeNode: function (e) {
        return e.getNativeNode();
      },
      unmountComponent: function (e, t) {
        o.detachRefs(e, e._currentElement), e.unmountComponent(t);
      },
      receiveComponent: function (e, t, n, u) {
        var c = e._currentElement;
        if (t !== c || u !== e._context) {
          var a = o.shouldUpdateRefs(c, t);
          a && o.detachRefs(e, c), e.receiveComponent(t, n, u), a && e._currentElement && null != e._currentElement.ref && n.getReactMountReady().enqueue(r, e);
        }
      },
      performUpdateIfNecessary: function (e, t, n) {
        return e._updateBatchNumber !== n ? void (null != e._updateBatchNumber && e._updateBatchNumber !== n + 1 ? c(!1) : void 0) : void e.performUpdateIfNecessary(t);
      }
    };
  n.exports = a;
});
