// Recovered module 4; analysis path, not original filename.
// Original SHA-256 febcbde7faf3055aa949362a77ed5c0f66858b51ced4ec765ce4de23dd652162; original byte range [71222, 72801).
__d(4, function (e, r, n, o) {
  "use strict";

  var l = r(379),
    t = r(5),
    f = (r(381), r(6), "function" == typeof Symbol && Symbol["for"] && Symbol["for"]("react.element") || 60103),
    u = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    },
    i = function (e, r, n, o, l, t, u) {
      var i = {
        $$typeof: f,
        type: e,
        key: r,
        ref: n,
        props: u,
        _owner: t
      };
      return i;
    };
  i.createElement = function (e, r, n) {
    var o,
      l = {},
      f = null,
      a = null,
      c = null,
      y = null;
    if (null != r) {
      a = void 0 === r.ref ? null : r.ref, f = void 0 === r.key ? null : "" + r.key, c = void 0 === r.__self ? null : r.__self, y = void 0 === r.__source ? null : r.__source;
      for (o in r) r.hasOwnProperty(o) && !u.hasOwnProperty(o) && (l[o] = r[o]);
    }
    var p = arguments.length - 2;
    if (1 === p) l.children = n;else if (p > 1) {
      for (var s = Array(p), d = 0; p > d; d++) s[d] = arguments[d + 2];
      l.children = s;
    }
    if (e && e.defaultProps) {
      var v = e.defaultProps;
      for (o in v) void 0 === l[o] && (l[o] = v[o]);
    }
    return i(e, f, a, c, y, t.current, l);
  }, i.createFactory = function (e) {
    var r = i.createElement.bind(null, e);
    return r.type = e, r;
  }, i.cloneAndReplaceKey = function (e, r) {
    var n = i(e.type, r, e.ref, e._self, e._source, e._owner, e.props);
    return n;
  }, i.cloneElement = function (e, r, n) {
    var o,
      f = l({}, e.props),
      a = e.key,
      c = e.ref,
      y = e._self,
      p = e._source,
      s = e._owner;
    if (null != r) {
      void 0 !== r.ref && (c = r.ref, s = t.current), void 0 !== r.key && (a = "" + r.key);
      var d;
      e.type && e.type.defaultProps && (d = e.type.defaultProps);
      for (o in r) r.hasOwnProperty(o) && !u.hasOwnProperty(o) && (void 0 === r[o] && void 0 !== d ? f[o] = d[o] : f[o] = r[o]);
    }
    var v = arguments.length - 2;
    if (1 === v) f.children = n;else if (v > 1) {
      for (var _ = Array(v), h = 0; v > h; h++) _[h] = arguments[h + 2];
      f.children = _;
    }
    return i(e.type, a, c, y, p, s, f);
  }, i.isValidElement = function (e) {
    return "object" == typeof e && null !== e && e.$$typeof === f;
  }, n.exports = i;
});
