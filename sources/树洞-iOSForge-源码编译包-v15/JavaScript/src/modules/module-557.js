// Recovered module 557; analysis path, not original filename.
// Original SHA-256 cdca5c1b533c5481faf025fbf981c91a0b1c5d4c8cd7c6ff934aa0072be8e449; original byte range [751257, 751548).
__d(557, function (t, n, u, r) {
  "use strict";

  function e(t) {
    return function () {
      return t;
    };
  }
  var s = function () {};
  s.thatReturns = e, s.thatReturnsFalse = e(!1), s.thatReturnsTrue = e(!0), s.thatReturnsNull = e(null), s.thatReturnsThis = function () {
    return this;
  }, s.thatReturnsArgument = function (t) {
    return t;
  }, u.exports = s;
});
