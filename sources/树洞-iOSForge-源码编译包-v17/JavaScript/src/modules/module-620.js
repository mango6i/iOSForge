// Recovered module 620; analysis path, not original filename.
// Original SHA-256 58886f409c23f938647081f0a50acb4f39994593e9e4b9aef5cc6444dd61ce88; original byte range [2028144, 2029127).
__d(620, function (r, e, t, n) {
  "use strict";

  function o(r) {
    if (null === r || void 0 === r) throw new TypeError("Object.assign cannot be called with null or undefined");
    return Object(r);
  }
  function c() {
    try {
      if (!Object.assign) return !1;
      var r = new String("abc");
      if (r[5] = "de", "5" === Object.getOwnPropertyNames(r)[0]) return !1;
      for (var e = {}, t = 0; 10 > t; t++) e["_" + String.fromCharCode(t)] = t;
      var n = Object.getOwnPropertyNames(e).map(function (r) {
        return e[r];
      });
      if ("0123456789" !== n.join("")) return !1;
      var o = {};
      return "abcdefghijklmnopqrst".split("").forEach(function (r) {
        o[r] = r;
      }), "abcdefghijklmnopqrst" === Object.keys(babelHelpers["extends"]({}, o)).join("");
    } catch (c) {
      return !1;
    }
  }
  var a = Object.getOwnPropertySymbols,
    i = Object.prototype.hasOwnProperty,
    f = Object.prototype.propertyIsEnumerable;
  t.exports = c() ? Object.assign : function (r, e) {
    for (var t, n, c = o(r), s = 1; s < arguments.length; s++) {
      t = Object(arguments[s]);
      for (var b in t) i.call(t, b) && (c[b] = t[b]);
      if (a) {
        n = a(t);
        for (var l = 0; l < n.length; l++) f.call(t, n[l]) && (c[n[l]] = t[n[l]]);
      }
    }
    return c;
  };
});
