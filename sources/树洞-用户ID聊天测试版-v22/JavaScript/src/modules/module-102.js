// Recovered module 102; analysis path, not original filename.
// Original SHA-256 0d6efd2dccc73b746863669dfc9de9e98cb935660380d7d467525b5486397da4; original byte range [168160, 170780).
__d(102, function (n, e, t, r) {
  "use strict";

  function o(n, e, t) {
    return {
      type: m.INSERT_MARKUP,
      content: n,
      fromIndex: null,
      fromNode: null,
      toIndex: t,
      afterNode: e
    };
  }
  function i(n, e, t) {
    return {
      type: m.MOVE_EXISTING,
      content: null,
      fromIndex: n._mountIndex,
      fromNode: c.getNativeNode(n),
      toIndex: t,
      afterNode: e
    };
  }
  function d(n, e) {
    return {
      type: m.REMOVE_NODE,
      content: null,
      fromIndex: n._mountIndex,
      fromNode: e,
      toIndex: null,
      afterNode: null
    };
  }
  function u(n) {
    return {
      type: m.SET_MARKUP,
      content: n,
      fromIndex: null,
      fromNode: null,
      toIndex: null,
      afterNode: null
    };
  }
  function l(n) {
    return {
      type: m.TEXT_CONTENT,
      content: n,
      fromIndex: null,
      fromNode: null,
      toIndex: null,
      afterNode: null
    };
  }
  function h(n, e) {
    return e && (n = n || [], n.push(e)), n;
  }
  function a(n, e) {
    f.processChildrenUpdates(n, e);
  }
  var f = e(103),
    m = (e(12), e(104)),
    c = (e(5), e(98)),
    s = e(105),
    C = (e(383), e(113)),
    _ = e(380),
    I = {
      Mixin: {
        _reconcilerInstantiateChildren: function (n, e, t) {
          return s.instantiateChildren(n, e, t);
        },
        _reconcilerUpdateChildren: function (n, e, t, r, o) {
          var i;
          return i = C(e), s.updateChildren(n, i, t, r, o), i;
        },
        mountChildren: function (n, e, t) {
          var r = this._reconcilerInstantiateChildren(n, e, t);
          this._renderedChildren = r;
          var o = [],
            i = 0;
          for (var d in r) if (r.hasOwnProperty(d)) {
            var u = r[d],
              l = c.mountComponent(u, e, this, this._nativeContainerInfo, t);
            u._mountIndex = i++, o.push(l);
          }
          return o;
        },
        updateTextContent: function (n) {
          var e = this._renderedChildren;
          s.unmountChildren(e, !1);
          for (var t in e) e.hasOwnProperty(t) && _(!1);
          var r = [l(n)];
          a(this, r);
        },
        updateMarkup: function (n) {
          var e = this._renderedChildren;
          s.unmountChildren(e, !1);
          for (var t in e) e.hasOwnProperty(t) && _(!1);
          var r = [u(n)];
          a(this, r);
        },
        updateChildren: function (n, e, t) {
          this._updateChildren(n, e, t);
        },
        _updateChildren: function (n, e, t) {
          var r = this._renderedChildren,
            o = {},
            i = this._reconcilerUpdateChildren(r, n, o, e, t);
          if (i || r) {
            var d,
              u = null,
              l = 0,
              f = 0,
              m = null;
            for (d in i) if (i.hasOwnProperty(d)) {
              var s = r && r[d],
                C = i[d];
              s === C ? (u = h(u, this.moveChild(s, m, f, l)), l = Math.max(s._mountIndex, l), s._mountIndex = f) : (s && (l = Math.max(s._mountIndex, l)), u = h(u, this._mountChildAtIndex(C, m, f, e, t))), f++, m = c.getNativeNode(C);
            }
            for (d in o) o.hasOwnProperty(d) && (u = h(u, this._unmountChild(r[d], o[d])));
            u && a(this, u), this._renderedChildren = i;
          }
        },
        unmountChildren: function (n) {
          var e = this._renderedChildren;
          s.unmountChildren(e, n), this._renderedChildren = null;
        },
        moveChild: function (n, e, t, r) {
          return n._mountIndex < r ? i(n, e, t) : void 0;
        },
        createChild: function (n, e, t) {
          return o(t, e, n._mountIndex);
        },
        removeChild: function (n, e) {
          return d(n, e);
        },
        _mountChildAtIndex: function (n, e, t, r, o) {
          var i = c.mountComponent(n, r, this, this._nativeContainerInfo, o);
          return n._mountIndex = t, this.createChild(n, e, i);
        },
        _unmountChild: function (n, e) {
          var t = this.removeChild(n, e);
          return n._mountIndex = null, t;
        }
      }
    };
  t.exports = I;
});
