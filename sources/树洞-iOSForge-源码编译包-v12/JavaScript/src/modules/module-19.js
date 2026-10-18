// Recovered module 19; analysis path, not original filename.
// Original SHA-256 6bb48c17e57b9da5cd3aa939b4e309cd23685342eaee73c94a01fe94eeb5b088; original byte range [85638, 89638).
__d(19, function (r, n, e, t) {
  "use strict";

  function o(r, n) {
    return r === n ? 0 !== r || 1 / r === 1 / n : r !== r && n !== n;
  }
  function u(r) {
    function n(n, e, t, o, u, i) {
      if (o = o || O, i = i || t, null == e[t]) {
        var a = g[u];
        return n ? new Error("Required " + a + " `" + i + "` was not specified in " + ("`" + o + "`.")) : null;
      }
      return r(e, t, o, u, i);
    }
    var e = n.bind(null, !1);
    return e.isRequired = n.bind(null, !0), e;
  }
  function i(r) {
    function n(n, e, t, o, u) {
      var i = n[e],
        a = b(i);
      if (a !== r) {
        var f = g[o],
          c = w(i);
        return new Error("Invalid " + f + " `" + u + "` of type " + ("`" + c + "` supplied to `" + t + "`, expected ") + ("`" + r + "`."));
      }
      return null;
    }
    return u(n);
  }
  function a() {
    return u(j.thatReturns(null));
  }
  function f(r) {
    function n(n, e, t, o, u) {
      if ("function" != typeof r) return new Error("Property `" + u + "` of component `" + t + "` has invalid PropType notation inside arrayOf.");
      var i = n[e];
      if (!Array.isArray(i)) {
        var a = g[o],
          f = b(i);
        return new Error("Invalid " + a + " `" + u + "` of type " + ("`" + f + "` supplied to `" + t + "`, expected an array."));
      }
      for (var c = 0; c < i.length; c++) {
        var l = r(i, c, t, o, u + "[" + c + "]");
        if (l instanceof Error) return l;
      }
      return null;
    }
    return u(n);
  }
  function c() {
    function r(r, n, e, t, o) {
      if (!m.isValidElement(r[n])) {
        var u = g[t];
        return new Error("Invalid " + u + " `" + o + "` supplied to " + ("`" + e + "`, expected a single ReactElement."));
      }
      return null;
    }
    return u(r);
  }
  function l(r) {
    function n(n, e, t, o, u) {
      if (!(n[e] instanceof r)) {
        var i = g[o],
          a = r.name || O,
          f = x(n[e]);
        return new Error("Invalid " + i + " `" + u + "` of type " + ("`" + f + "` supplied to `" + t + "`, expected ") + ("instance of `" + a + "`."));
      }
      return null;
    }
    return u(n);
  }
  function p(r) {
    function n(n, e, t, u, i) {
      for (var a = n[e], f = 0; f < r.length; f++) if (o(a, r[f])) return null;
      var c = g[u],
        l = JSON.stringify(r);
      return new Error("Invalid " + c + " `" + i + "` of value `" + a + "` " + ("supplied to `" + t + "`, expected one of " + l + "."));
    }
    return u(Array.isArray(r) ? n : function () {
      return new Error("Invalid argument supplied to oneOf, expected an instance of array.");
    });
  }
  function s(r) {
    function n(n, e, t, o, u) {
      if ("function" != typeof r) return new Error("Property `" + u + "` of component `" + t + "` has invalid PropType notation inside objectOf.");
      var i = n[e],
        a = b(i);
      if ("object" !== a) {
        var f = g[o];
        return new Error("Invalid " + f + " `" + u + "` of type " + ("`" + a + "` supplied to `" + t + "`, expected an object."));
      }
      for (var c in i) if (i.hasOwnProperty(c)) {
        var l = r(i, c, t, o, u + "." + c);
        if (l instanceof Error) return l;
      }
      return null;
    }
    return u(n);
  }
  function d(r) {
    function n(n, e, t, o, u) {
      for (var i = 0; i < r.length; i++) {
        var a = r[i];
        if (null == a(n, e, t, o, u)) return null;
      }
      var f = g[o];
      return new Error("Invalid " + f + " `" + u + "` supplied to " + ("`" + t + "`."));
    }
    return u(Array.isArray(r) ? n : function () {
      return new Error("Invalid argument supplied to oneOfType, expected an instance of array.");
    });
  }
  function v() {
    function r(r, n, e, t, o) {
      if (!E(r[n])) {
        var u = g[t];
        return new Error("Invalid " + u + " `" + o + "` supplied to " + ("`" + e + "`, expected a ReactNode."));
      }
      return null;
    }
    return u(r);
  }
  function y(r) {
    function n(n, e, t, o, u) {
      var i = n[e],
        a = b(i);
      if ("object" !== a) {
        var f = g[o];
        return new Error("Invalid " + f + " `" + u + "` of type `" + a + "` " + ("supplied to `" + t + "`, expected `object`."));
      }
      for (var c in r) {
        var l = r[c];
        if (l) {
          var p = l(i, c, t, o, u + "." + c);
          if (p) return p;
        }
      }
      return null;
    }
    return u(n);
  }
  function E(r) {
    switch (typeof r) {
      case "number":
      case "string":
      case "undefined":
        return !0;
      case "boolean":
        return !r;
      case "object":
        if (Array.isArray(r)) return r.every(E);
        if (null === r || m.isValidElement(r)) return !0;
        var n = I(r);
        if (!n) return !1;
        var e,
          t = n.call(r);
        if (n !== r.entries) {
          for (; !(e = t.next()).done;) if (!E(e.value)) return !1;
        } else for (; !(e = t.next()).done;) {
          var o = e.value;
          if (o && !E(o[1])) return !1;
        }
        return !0;
      default:
        return !1;
    }
  }
  function b(r) {
    var n = typeof r;
    return Array.isArray(r) ? "array" : r instanceof RegExp ? "object" : n;
  }
  function w(r) {
    var n = b(r);
    if ("object" === n) {
      if (r instanceof Date) return "date";
      if (r instanceof RegExp) return "regexp";
    }
    return n;
  }
  function x(r) {
    return r.constructor && r.constructor.name ? r.constructor.name : O;
  }
  var m = n(4),
    g = n(16),
    j = n(383),
    I = n(8),
    O = "<<anonymous>>",
    A = {
      array: i("array"),
      bool: i("boolean"),
      func: i("function"),
      number: i("number"),
      object: i("object"),
      string: i("string"),
      any: a(),
      arrayOf: f,
      element: c(),
      instanceOf: l,
      node: v(),
      objectOf: s,
      oneOf: p,
      oneOfType: d,
      shape: y
    };
  e.exports = A;
});
