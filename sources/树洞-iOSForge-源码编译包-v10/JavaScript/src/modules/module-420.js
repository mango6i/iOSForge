// Recovered module 420; analysis path, not original filename.
// Original SHA-256 12a8433fe28bb69a7c20d1c92e85266c91d4f669abdeb99120c1eeaf4cc4df05; original byte range [250163, 250869).
__d(420, function (n, t, e, u) {
  "use strict";

  function r(n, t) {
    for (var e = n[i][t]; null != e;) {
      if (e.kind === c) return e.listener;
      e = e.next;
    }
    return null;
  }
  function o(n, t, e) {
    "function" != typeof e && "object" != typeof e && (e = null);
    for (var u = null, r = n[i][t]; null != r;) r.kind === c ? null == u ? n[i][t] = r.next : u.next = r.next : u = r, r = r.next;
    null != e && (null == u ? n[i][t] = f(e, c) : u.next = f(e, c));
  }
  var l = t(416),
    i = l.LISTENERS,
    c = l.ATTRIBUTE,
    f = l.newNode;
  u.defineCustomEventTarget = function (n, t) {
    function e() {
      n.call(this);
    }
    var u = {
      constructor: {
        value: e,
        configurable: !0,
        writable: !0
      }
    };
    return t.forEach(function (n) {
      u["on" + n] = {
        get: function () {
          return r(this, n);
        },
        set: function (t) {
          o(this, n, t);
        },
        configurable: !0,
        enumerable: !0
      };
    }), e.prototype = Object.create(n.prototype, u), e;
  };
});
