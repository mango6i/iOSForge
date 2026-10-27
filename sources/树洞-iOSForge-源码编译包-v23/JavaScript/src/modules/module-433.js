// Recovered module 433; analysis path, not original filename.
// Original SHA-256 8602d6b1599ed22b67f89fd7f9dc32df06b1d4d0125890bec251490e08ad4eb1; original byte range [668606, 670583).
__d(433, function (r, n, t, e) {
  !function (n) {
    function o(r) {
      for (var n, t, e = [], o = 0, i = r.length; i > o;) n = r.charCodeAt(o++), n >= 55296 && 56319 >= n && i > o ? (t = r.charCodeAt(o++), 56320 == (64512 & t) ? e.push(((1023 & n) << 10) + (1023 & t) + 65536) : (e.push(n), o--)) : e.push(n);
      return e;
    }
    function i(r) {
      for (var n, t = r.length, e = -1, o = ""; ++e < t;) n = r[e], n > 65535 && (n -= 65536, o += g(n >>> 10 & 1023 | 55296), n = 56320 | 1023 & n), o += g(n);
      return o;
    }
    function f(r) {
      if (r >= 55296 && 57343 >= r) throw Error("Lone surrogate U+" + r.toString(16).toUpperCase() + " is not a scalar value");
    }
    function u(r, n) {
      return g(r >> n & 63 | 128);
    }
    function a(r) {
      if (0 == (4294967168 & r)) return g(r);
      var n = "";
      return 0 == (4294965248 & r) ? n = g(r >> 6 & 31 | 192) : 0 == (4294901760 & r) ? (f(r), n = g(r >> 12 & 15 | 224), n += u(r, 6)) : 0 == (4292870144 & r) && (n = g(r >> 18 & 7 | 240), n += u(r, 12), n += u(r, 6)), n += g(63 & r | 128);
    }
    function c(r) {
      for (var n, t = o(r), e = t.length, i = -1, f = ""; ++i < e;) n = t[i], f += a(n);
      return f;
    }
    function d() {
      if (w >= b) throw Error("Invalid byte index");
      var r = 255 & y[w];
      if (w++, 128 == (192 & r)) return 63 & r;
      throw Error("Invalid continuation byte");
    }
    function h() {
      var r, n, t, e, o;
      if (w > b) throw Error("Invalid byte index");
      if (w == b) return !1;
      if (r = 255 & y[w], w++, 0 == (128 & r)) return r;
      if (192 == (224 & r)) {
        if (n = d(), o = (31 & r) << 6 | n, o >= 128) return o;
        throw Error("Invalid continuation byte");
      }
      if (224 == (240 & r)) {
        if (n = d(), t = d(), o = (15 & r) << 12 | n << 6 | t, o >= 2048) return f(o), o;
        throw Error("Invalid continuation byte");
      }
      if (240 == (248 & r) && (n = d(), t = d(), e = d(), o = (7 & r) << 18 | n << 12 | t << 6 | e, o >= 65536 && 1114111 >= o)) return o;
      throw Error("Invalid UTF-8 detected");
    }
    function l(r) {
      y = o(r), b = y.length, w = 0;
      for (var n, t = []; (n = h()) !== !1;) t.push(n);
      return i(t);
    }
    var v = "object" == typeof e && e,
      s = "object" == typeof t && t && t.exports == v && t,
      p = "object" == typeof r && r;
    p.global !== p && p.window !== p || (n = p);
    var y,
      b,
      w,
      g = String.fromCharCode,
      E = {
        version: "2.1.2",
        encode: c,
        decode: l
      };
    if ("function" == typeof define && "object" == typeof define.amd && define.amd) define(function () {
      return E;
    });else if (v && !v.nodeType) {
      if (s) s.exports = E;else {
        var I = {},
          C = I.hasOwnProperty;
        for (var j in E) C.call(E, j) && (v[j] = E[j]);
      }
    } else n.utf8 = E;
  }(this);
});
