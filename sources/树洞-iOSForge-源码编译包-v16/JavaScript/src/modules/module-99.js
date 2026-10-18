// Recovered module 99; analysis path, not original filename.
// Original SHA-256 3c82f264025ae2cbbaad9c4ce44d8349242851c1839edeae350a6b9f23621564; original byte range [165935, 166477).
__d(99, function (n, e, o, t) {
  "use strict";

  function f(n, e, o) {
    "function" == typeof n ? n(e.getPublicInstance()) : r.addComponentAsRefTo(e, n, o);
  }
  function u(n, e, o) {
    "function" == typeof n ? n(null) : r.removeComponentAsRefFrom(e, n, o);
  }
  var r = e(100),
    l = {};
  l.attachRefs = function (n, e) {
    if (null !== e && e !== !1) {
      var o = e.ref;
      null != o && f(o, n, e._owner);
    }
  }, l.shouldUpdateRefs = function (n, e) {
    var o = null === n || n === !1,
      t = null === e || e === !1;
    return o || t || e._owner !== n._owner || e.ref !== n.ref;
  }, l.detachRefs = function (n, e) {
    if (null !== e && e !== !1) {
      var o = e.ref;
      null != o && u(o, n, e._owner);
    }
  }, o.exports = l;
});
