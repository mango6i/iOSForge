// Recovered module 7; analysis path, not original filename.
// Original SHA-256 9105eb674aede1e0844bb8efb71dc6dfafd26573f072313c5c4f613fc00401a8; original byte range [73294, 74094).
__d(7, function (e, n, r, t) {
  "use strict";

  function l(e, n) {
    return e && "object" == typeof e && null != e.key ? s.escape(e.key) : n.toString(36);
  }
  function i(e, n, r, t) {
    var a = typeof e;
    if ("undefined" !== a && "boolean" !== a || (e = null), null === e || "string" === a || "number" === a || o.isValidElement(e)) return r(t, e, "" === n ? c + l(e, 0) : n), 1;
    var d,
      y,
      p = 0,
      b = "" === n ? c : n + v;
    if (Array.isArray(e)) for (var g = 0; g < e.length; g++) d = e[g], y = b + l(d, g), p += i(d, y, r, t);else {
      var x = u(e);
      if (x) {
        var j,
          k = x.call(e);
        if (x !== e.entries) for (var m = 0; !(j = k.next()).done;) d = j.value, y = b + l(d, m++), p += i(d, y, r, t);else for (; !(j = k.next()).done;) {
          var A = j.value;
          A && (d = A[1], y = b + s.escape(A[0]) + v + l(d, 0), p += i(d, y, r, t));
        }
      } else if ("object" === a) {
        String(e);
        f(!1);
      }
    }
    return p;
  }
  function a(e, n, r) {
    return null == e ? 0 : i(e, "", n, r);
  }
  var o = (n(5), n(4)),
    u = n(8),
    f = n(380),
    s = n(9),
    c = (n(381), "."),
    v = ":";
  r.exports = a;
});
