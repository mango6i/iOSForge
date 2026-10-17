// Recovered module 121; analysis path, not original filename.
// Original SHA-256 72d2b5fafde640d809190cac7bca615cc812dfa07a3d6936d2d0d9f93b6e56ac; original byte range [187115, 192466).
__d(121, function (t, e, n, r) {
  "use strict";

  function i(t, e) {
    if (null == t || null == e) return !0;
    if (t.length !== e.length) return !0;
    for (var n = 0; n < t.length; n++) if (t[n] !== e[n]) return !0;
    return !1;
  }
  function l(t, e) {
    if (t === e) return !1;
    if (t.font !== e.font) {
      if (null === t.font) return !0;
      if (null === e.font) return !0;
      if (t.font.fontFamily !== e.font.fontFamily || t.font.fontSize !== e.font.fontSize || t.font.fontWeight !== e.font.fontWeight || t.font.fontStyle !== e.font.fontStyle) return !0;
    }
    return i(t.lines, e.lines);
  }
  function a(t) {
    return t ? "string" == typeof t ? t : t.length ? t.join("\n") : "" : "";
  }
  function o(t, e) {
    return null == t ? e : +t;
  }
  function s(t) {
    var e = null != t.scaleX ? t.scaleX : null != t.scale ? t.scale : 1,
      n = null != t.scaleY ? t.scaleY : null != t.scale ? t.scale : 1;
    return L.transformTo(1, 0, 0, 1, 0, 0).move(t.x || 0, t.y || 0).rotate(t.rotation || 0, t.originX, t.originY).scale(e, n, t.originX, t.originY), null != t.transform && L.transform(t.transform), [L.xx, L.yx, L.xy, L.yy, L.x, L.y];
  }
  function f(t) {
    return t.visible === !1 ? 0 : null == t.opacity ? 1 : +t.opacity;
  }
  function u(t, e, n) {
    var r = new T(t);
    e[n + 0] = r.red / 255, e[n + 1] = r.green / 255, e[n + 2] = r.blue / 255, e[n + 3] = r.alpha;
  }
  function c(t, e, n) {
    var r = 0;
    if ("length" in t) for (; r < t.length;) u(t[r], e, n + 4 * r), r++;else for (var i in t) u(t[i], e, n + 4 * r), r++;
    return n + 4 * r;
  }
  function h(t, e, n, r, i) {
    var l,
      a = 0;
    if ("length" in t) for (; a < t.length;) l = a / (t.length - 1) * r, e[n + a] = i ? 1 - l : l, a++;else for (var o in t) l = +o * r, e[n + a] = i ? 1 - l : l, a++;
    return n + a;
  }
  function p(t, e, n) {
    var r = c(t, e, n);
    h(t, e, r, 1, !1);
  }
  function d(t, e, n) {
    var r = c(t, e, n);
    r = c(t, e, r), r = h(t, e, r, .5, !1), h(t, e, r, .5, !0);
  }
  function m(t, e) {
    var n = t[0],
      r = +e.width,
      i = +e.height;
    n === H ? (t[1] *= r, t[2] *= i, t[3] *= r, t[4] *= i) : n === K && (t[1] *= r, t[2] *= i, t[3] *= r, t[4] *= i, t[5] *= r, t[6] *= i);
  }
  function g(t, e) {
    if (null == t) return null;
    if (t._brush) return t._bb && (m(t._brush, e), t._bb = !1), t._brush;
    var n = new T(t);
    return [B, n.red / 255, n.green / 255, n.blue / 255, n.alpha];
  }
  function y(t) {
    if (null == t) return null;
    var e = new T(t);
    return [e.red / 255, e.green / 255, e.blue / 255, e.alpha];
  }
  function b(t) {
    switch (t) {
      case "butt":
        return 0;
      case "square":
        return 2;
      default:
        return 1;
    }
  }
  function v(t) {
    switch (t) {
      case "miter":
        return 0;
      case "bevel":
        return 2;
      default:
        return 1;
    }
  }
  function k(t) {
    return t.split(",")[0].replace(et, "").replace(nt, "");
  }
  function w(t) {
    if (tt.hasOwnProperty(t)) return tt[t];
    var e = /^\s*((?:(?:normal|bold|italic)\s+)*)(?:(\d+(?:\.\d+)?)[ptexm\%]*(?:\s*\/.*?)?\s+)?\s*\"?([^\"]*)/i,
      n = e.exec(t);
    if (!n) return null;
    var r = k(n[3]),
      i = +n[2] || 12,
      l = /bold/.exec(n[1]),
      a = /italic/.exec(n[1]);
    return tt[t] = {
      fontFamily: r,
      fontSize: i,
      fontWeight: l ? "bold" : "normal",
      fontStyle: a ? "italic" : "normal"
    }, tt[t];
  }
  function S(t) {
    if (null == t) return null;
    if ("string" == typeof t) return w(t);
    var e = k(t.fontFamily),
      n = +t.fontSize || 12;
    return {
      fontFamily: e,
      fontSize: n,
      fontWeight: t.fontWeight,
      fontStyle: t.fontStyle
    };
  }
  function x(t, e) {
    return {
      font: S(t),
      lines: e.split(rt)
    };
  }
  function C(t) {
    switch (t) {
      case "right":
        return 1;
      case "center":
        return 2;
      default:
        return 0;
    }
  }
  function _(t, e, n, r, i) {
    var l = H;
    if (arguments.length < 5) {
      var a = (null == e ? 270 : e) * Math.PI / 180,
        o = Math.cos(a),
        s = -Math.sin(a),
        f = (Math.abs(o) + Math.abs(s)) / 2;
      o *= f, s *= f, e = .5 - o, r = .5 + o, n = .5 - s, i = .5 + s, this._bb = !0;
    } else this._bb = !1;
    var u = [l, +e, +n, +r, +i];
    p(t, u, 5), this._brush = u;
  }
  function N(t, e, n, r, i, l, a) {
    null == i && (i = r), null == l && (l = e), null == a && (a = n), null == e ? (e = n = r = i = l = a = .5, this._bb = !0) : this._bb = !1;
    var o = [K, +e, +n, 2 * +r, 2 * +i, +l, +a];
    d(t, o, 7), this._brush = o;
  }
  function W(t, e, n, r, i) {
    this._brush = [Q, t, +r || 0, +i || 0, +e, +n];
  }
  var T = e(412),
    A = e(122),
    J = e(413),
    R = e(1),
    V = e(78),
    z = e(82),
    D = e(70),
    E = D(V.UIView, {}),
    F = {
      transform: {
        diff: i
      },
      opacity: !0
    },
    G = D(F, {
      clipping: {
        diff: i
      }
    }),
    M = D(F, {
      fill: {
        diff: i
      },
      stroke: {
        diff: i
      },
      strokeWidth: !0,
      strokeCap: !0,
      strokeJoin: !0,
      strokeDash: {
        diff: i
      }
    }),
    P = D(M, {
      d: {
        diff: i
      }
    }),
    X = D(M, {
      alignment: !0,
      frame: {
        diff: l
      },
      path: {
        diff: i
      }
    }),
    Y = z({
      validAttributes: E,
      uiViewClassName: "ARTSurfaceView"
    }),
    O = z({
      validAttributes: G,
      uiViewClassName: "ARTGroup"
    }),
    I = z({
      validAttributes: P,
      uiViewClassName: "ARTShape"
    }),
    j = z({
      validAttributes: X,
      uiViewClassName: "ARTText"
    }),
    q = R.createClass({
      displayName: "Surface",
      render: function () {
        var t = this.props,
          e = o(t.width, 0),
          n = o(t.height, 0);
        return R.createElement(Y, {
          style: [t.style, {
            width: e,
            height: n
          }]
        }, this.props.children);
      }
    }),
    L = new J(),
    U = R.createClass({
      displayName: "Group",
      render: function () {
        var t = this.props;
        return R.createElement(O, {
          opacity: f(t),
          transform: s(t)
        }, this.props.children);
      }
    }),
    $ = R.createClass({
      displayName: "ClippingRectangle",
      render: function () {
        var t = this.props,
          e = o(t.x, 0),
          n = o(t.y, 0),
          r = o(t.width, 0),
          i = o(t.height, 0),
          l = [e, n, r, i],
          a = D(t);
        return delete a.x, delete a.y, R.createElement(O, {
          clipping: l,
          opacity: f(t),
          transform: s(a)
        }, this.props.children);
      }
    }),
    B = 0,
    H = 1,
    K = 2,
    Q = 3,
    Z = R.createClass({
      displayName: "Shape",
      render: function () {
        var t = this.props,
          e = t.d || a(t.children),
          n = new A(e).toJSON();
        return R.createElement(I, {
          fill: g(t.fill, t),
          opacity: f(t),
          stroke: y(t.stroke),
          strokeCap: b(t.strokeCap),
          strokeDash: t.strokeDash || null,
          strokeJoin: v(t.strokeJoin),
          strokeWidth: o(t.strokeWidth, 1),
          transform: s(t),
          d: n
        });
      }
    }),
    tt = {},
    et = /^[\s"']*/,
    nt = /[\s"']*$/,
    rt = /\n/g,
    it = R.createClass({
      displayName: "Text",
      render: function () {
        var t = this.props,
          e = t.path ? new A(t.path).toJSON() : null,
          n = x(t.font, a(t.children));
        return R.createElement(j, {
          fill: g(t.fill, t),
          opacity: f(t),
          stroke: y(t.stroke),
          strokeCap: b(t.strokeCap),
          strokeDash: t.strokeDash || null,
          strokeJoin: v(t.strokeJoin),
          strokeWidth: o(t.strokeWidth, 1),
          transform: s(t),
          alignment: C(t.alignment),
          frame: n,
          path: e
        });
      }
    }),
    lt = {
      LinearGradient: _,
      RadialGradient: N,
      Pattern: W,
      Transform: J,
      Path: A,
      Surface: q,
      Group: U,
      ClippingRectangle: $,
      Shape: Z,
      Text: it
    };
  n.exports = lt;
});
