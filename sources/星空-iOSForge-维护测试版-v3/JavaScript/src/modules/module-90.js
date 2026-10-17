// Recovered module 90; analysis path, not original filename.
// Original SHA-256 84d9ac64ca6fedc5100c3056989596a5c500a726cb9e4b85408f3ee506487b76; original byte range [160594, 160856).
__d(90, function (r, t, n, u) {
  "use strict";

  function a(r, t, n, u) {
    try {
      return t(n, u);
    } catch (a) {
      return void (null === l && (l = a));
    }
  }
  var l = null,
    o = {
      invokeGuardedCallback: a,
      invokeGuardedCallbackWithCatch: a,
      rethrowCaughtError: function () {
        if (l) {
          var r = l;
          throw l = null, r;
        }
      }
    };
  n.exports = o;
});
