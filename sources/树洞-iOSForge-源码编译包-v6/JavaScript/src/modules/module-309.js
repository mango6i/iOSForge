// Recovered module 309; analysis path, not original filename.
// Original SHA-256 71fab86a54a7a6c3f2f6c85dc9d9736c53d9f7e58ca469cd269e4cff57cc2bb2; original byte range [585510, 586611).
__d(309, function (r, o, n, t) {
  "use strict";

  function i(r) {
    return Array.isArray(r) ? r.concat() : r && "object" == typeof r ? l(new r.constructor(), r) : r;
  }
  function a(r, o, n) {
    Array.isArray(r) ? void 0 : u(!1);
    var t = o[n];
    Array.isArray(t) ? void 0 : u(!1);
  }
  function c(r, o) {
    if ("object" != typeof o ? u(!1) : void 0, f.call(o, v)) return 1 !== Object.keys(o).length ? u(!1) : void 0, o[v];
    var n = i(r);
    if (f.call(o, A)) {
      var t = o[A];
      t && "object" == typeof t ? void 0 : u(!1), n && "object" == typeof n ? void 0 : u(!1), l(n, o[A]);
    }
    f.call(o, y) && (a(r, o, y), o[y].forEach(function (r) {
      n.push(r);
    })), f.call(o, s) && (a(r, o, s), o[s].forEach(function (r) {
      n.unshift(r);
    })), f.call(o, p) && (Array.isArray(r) ? void 0 : u(!1), Array.isArray(o[p]) ? void 0 : u(!1), o[p].forEach(function (r) {
      Array.isArray(r) ? void 0 : u(!1), n.splice.apply(n, r);
    })), f.call(o, d) && ("function" != typeof o[d] ? u(!1) : void 0, n = o[d](n));
    for (var e in o) $.hasOwnProperty(e) && $[e] || (n[e] = c(r[e], o[e]));
    return n;
  }
  var l = o(379),
    e = o(405),
    u = o(380),
    f = {}.hasOwnProperty,
    y = e({
      $push: null
    }),
    s = e({
      $unshift: null
    }),
    p = e({
      $splice: null
    }),
    v = e({
      $set: null
    }),
    A = e({
      $merge: null
    }),
    d = e({
      $apply: null
    }),
    h = [y, s, p, v, A, d],
    $ = {};
  h.forEach(function (r) {
    $[r] = !0;
  }), n.exports = c;
});
