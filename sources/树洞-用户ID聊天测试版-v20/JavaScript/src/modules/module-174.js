// Recovered module 174; analysis path, not original filename.
// Original SHA-256 13b13e8e4024d22b6f5520905abdf18dd9349420bebacd3d7214409c36cfad0e; original byte range [286373, 287963).
__d(174, function (n, e, o, t) {
  "use strict";

  function r(n, e, o) {
    var t = l.mountComponent(n, o, null, i(e), d);
    n._renderedComponent._topLevelWrapper = n, f._mountImageIntoNode(t, e);
  }
  function a(n, e) {
    var o = s.ReactReconcileTransaction.getPooled();
    o.perform(r, null, n, e, o), s.ReactReconcileTransaction.release(o);
  }
  var u = e(4),
    i = (e(12), e(175)),
    c = e(94),
    l = e(98),
    m = e(109),
    s = e(95),
    p = e(30),
    d = e(404),
    C = e(106),
    v = e(110),
    I = function () {};
  I.prototype.isReactComponent = {}, I.prototype.render = function () {
    return this.props;
  };
  var f = {
    _instancesByContainerID: {},
    findNodeHandle: e(41),
    renderComponent: function (n, e, o) {
      var t = new u(I, null, null, null, null, null, n),
        r = e,
        i = f._instancesByContainerID[r];
      if (i) {
        var l = i._currentElement,
          p = l.props;
        if (v(p, n)) return m.enqueueElementInternal(i, t), o && m.enqueueCallbackInternal(i, o), i;
        f.unmountComponentAtNode(e);
      }
      if (!c.reactTagIsNativeTopRootID(e)) return console.error("You cannot render into anything but a top root"), null;
      c.assertRootTag(e);
      var d = C(t);
      f._instancesByContainerID[e] = d, s.batchedUpdates(a, d, e);
      var _ = d.getPublicInstance();
      return o && o.call(_), _;
    },
    _mountImageIntoNode: function (n, e) {
      var o = n;
      p.setChildren(e, [o]);
    },
    unmountComponentAtNodeAndRemoveContainer: function (n) {
      f.unmountComponentAtNode(n), p.removeRootView(n);
    },
    unmountComponentAtNode: function (n) {
      if (!c.reactTagIsNativeTopRootID(n)) return console.error("You cannot render into anything but a top root"), !1;
      var e = f._instancesByContainerID[n];
      return e ? (f.unmountComponentFromNode(e, n), delete f._instancesByContainerID[n], !0) : !1;
    },
    unmountComponentFromNode: function (n, e) {
      l.unmountComponent(n), p.removeSubviewsFromContainerWithID(e);
    }
  };
  o.exports = f;
});
