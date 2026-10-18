// Recovered module 103; analysis path, not original filename.
// Original SHA-256 bc0fdb011966729b8f32078cf29cbecfc7893152ece6bdff4e4c81b5bb3b6a4a; original byte range [170781, 171156).
__d(103, function (n, e, r, o) {
  "use strict";

  var t = e(380),
    i = !1,
    u = {
      unmountIDFromEnvironment: null,
      replaceNodeWithMarkup: null,
      processChildrenUpdates: null,
      injection: {
        injectEnvironment: function (n) {
          i ? t(!1) : void 0, u.unmountIDFromEnvironment = n.unmountIDFromEnvironment, u.replaceNodeWithMarkup = n.replaceNodeWithMarkup, u.processChildrenUpdates = n.processChildrenUpdates, i = !0;
        }
      }
    };
  r.exports = u;
});
