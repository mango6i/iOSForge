// Recovered module 3; analysis path, not original filename.
// Original SHA-256 08dc5a785f60a2e7fded0bbf7bcd6aaf623b3911ac635a24f14d0835d9410407; original byte range [69762, 70832).
__d(3, function (n, o, e, t) {
  "use strict";

  var r = o(380),
    i = function (n) {
      var o = this;
      if (o.instancePool.length) {
        var e = o.instancePool.pop();
        return o.call(e, n), e;
      }
      return new o(n);
    },
    l = function (n, o) {
      var e = this;
      if (e.instancePool.length) {
        var t = e.instancePool.pop();
        return e.call(t, n, o), t;
      }
      return new e(n, o);
    },
    a = function (n, o, e) {
      var t = this;
      if (t.instancePool.length) {
        var r = t.instancePool.pop();
        return t.call(r, n, o, e), r;
      }
      return new t(n, o, e);
    },
    c = function (n, o, e, t) {
      var r = this;
      if (r.instancePool.length) {
        var i = r.instancePool.pop();
        return r.call(i, n, o, e, t), i;
      }
      return new r(n, o, e, t);
    },
    u = function (n, o, e, t, r) {
      var i = this;
      if (i.instancePool.length) {
        var l = i.instancePool.pop();
        return i.call(l, n, o, e, t, r), l;
      }
      return new i(n, o, e, t, r);
    },
    s = function (n) {
      var o = this;
      n instanceof o ? void 0 : r(!1), n.destructor(), o.instancePool.length < o.poolSize && o.instancePool.push(n);
    },
    P = 10,
    f = i,
    p = function (n, o) {
      var e = n;
      return e.instancePool = [], e.getPooled = o || f, e.poolSize || (e.poolSize = P), e.release = s, e;
    },
    v = {
      addPoolingTo: p,
      oneArgumentPooler: i,
      twoArgumentPooler: l,
      threeArgumentPooler: a,
      fourArgumentPooler: c,
      fiveArgumentPooler: u
    };
  e.exports = v;
});
