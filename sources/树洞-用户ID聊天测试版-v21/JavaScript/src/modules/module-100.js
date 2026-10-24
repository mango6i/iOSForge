// Recovered module 100; analysis path, not original filename.
// Original SHA-256 4c79e322b8b8e9d727643297d6c317b02f32ec3990510f0bd53c7c80f293db41; original byte range [166478, 166889).
__d(100, function (e, n, t, o) {
  "use strict";

  var i = n(380),
    c = {
      isValidOwner: function (e) {
        return !(!e || "function" != typeof e.attachRef || "function" != typeof e.detachRef);
      },
      addComponentAsRefTo: function (e, n, t) {
        c.isValidOwner(t) ? void 0 : i(!1), t.attachRef(n, e);
      },
      removeComponentAsRefFrom: function (e, n, t) {
        c.isValidOwner(t) ? void 0 : i(!1);
        var o = t.getPublicInstance();
        o && o.refs[n] === e.getPublicInstance() && t.detachRef(n);
      }
    };
  t.exports = c;
});
