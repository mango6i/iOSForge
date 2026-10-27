// Recovered module 106; analysis path, not original filename.
// Original SHA-256 f106be1ed49aaa8410bad2187c3ccbedd99b7d122a312bd3cf9485418632113b; original byte range [172066, 172814).
__d(106, function (t, e, n, o) {
  "use strict";

  function p(t) {
    return "function" == typeof t && "undefined" != typeof t.prototype && "function" == typeof t.prototype.mountComponent && "function" == typeof t.prototype.receiveComponent;
  }
  function r(t) {
    var e,
      n = null === t || t === !1;
    if (n) e = u.create(r);else if ("object" == typeof t) {
      var o = t;
      !o || "function" != typeof o.type && "string" != typeof o.type ? c(!1) : void 0, e = "string" == typeof o.type ? y.createInternalComponent(o) : p(o.type) ? new o.type(o) : new a(o);
    } else "string" == typeof t || "number" == typeof t ? e = y.createInstanceForText(t) : c(!1);
    return e._mountIndex = 0, e._mountImage = null, e;
  }
  var i = e(379),
    f = e(107),
    u = e(111),
    y = e(112),
    c = (e(12), e(380)),
    a = (e(381), function (t) {
      this.construct(t);
    });
  i(a.prototype, f.Mixin, {
    _instantiateReactComponent: r
  });
  n.exports = r;
});
