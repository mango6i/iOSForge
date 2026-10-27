// Recovered module 18; analysis path, not original filename.
// Original SHA-256 d63435276fd2d5fe7b3ccf2911fb89672f0c642058fa9eb6084703b079b96e3e; original byte range [83573, 85437).
__d(18, function (e, r, t, n) {
  "use strict";

  function a() {
    if (p.current) {
      var e = p.current.getName();
      if (e) return " Check the render method of `" + e + "`.";
    }
    return "";
  }
  function i(e, r) {
    if (e._store && !e._store.validated && null == e.key) {
      e._store.validated = !0;
      o("uniqueKey", e, r);
    }
  }
  function o(e, r, t) {
    var n = a();
    if (!n) {
      var i = "string" == typeof t ? t : t.displayName || t.name;
      i && (n = " Check the top-level render call using <" + i + ">.");
    }
    var o = d[e] || (d[e] = {});
    if (o[n]) return null;
    o[n] = !0;
    var f = {
      parentOrOwner: n,
      url: " See https://fb.me/react-warning-keys for more information.",
      childOwner: null
    };
    return r && r._owner && r._owner !== p.current && (f.childOwner = " It was passed a child from " + r._owner.getName() + "."), f;
  }
  function f(e, r) {
    if ("object" == typeof e) if (Array.isArray(e)) for (var t = 0; t < e.length; t++) {
      var n = e[t];
      c.isValidElement(n) && i(n, r);
    } else if (c.isValidElement(e)) e._store && (e._store.validated = !0);else if (e) {
      var a = v(e);
      if (a && a !== e.entries) for (var o, f = a.call(e); !(o = f.next()).done;) c.isValidElement(o.value) && i(o.value, r);
    }
  }
  function l(e, r, t, n) {
    for (var i in r) if (r.hasOwnProperty(i)) {
      var o;
      try {
        "function" != typeof r[i] ? y(!1) : void 0, o = r[i](t, i, e, n);
      } catch (f) {
        o = f;
      }
      if (o instanceof Error && !(o.message in m)) {
        m[o.message] = !0;
        a();
      }
    }
  }
  function u(e) {
    var r = e.type;
    if ("function" == typeof r) {
      var t = r.displayName || r.name;
      r.propTypes && l(t, r.propTypes, e.props, s.prop), "function" == typeof r.getDefaultProps;
    }
  }
  var c = r(4),
    s = r(15),
    p = (r(16), r(5)),
    v = (r(6), r(8)),
    y = r(380),
    d = (r(381), {}),
    m = {},
    h = {
      createElement: function (e, r, t) {
        var n = "string" == typeof e || "function" == typeof e,
          a = c.createElement.apply(this, arguments);
        if (null == a) return a;
        if (n) for (var i = 2; i < arguments.length; i++) f(arguments[i], e);
        return u(a), a;
      },
      createFactory: function (e) {
        var r = h.createElement.bind(null, e);
        return r.type = e, r;
      },
      cloneElement: function (e, r, t) {
        for (var n = c.cloneElement.apply(this, arguments), a = 2; a < arguments.length; a++) f(arguments[a], n.type);
        return u(n), n;
      }
    };
  t.exports = h;
});
