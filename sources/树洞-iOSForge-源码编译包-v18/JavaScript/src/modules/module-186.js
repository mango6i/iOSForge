// Recovered module 186; analysis path, not original filename.
// Original SHA-256 3fecd9b27280ef075ac906d4aeeebd94798893b2aed143709ed41962acce7335; original byte range [324732, 325303).
__d(186, function (n, t, i, e) {
  "use strict";

  var r = t(187),
    a = {
      componentWillUnmount: function () {
        for (; this._interactionMixinHandles.length;) r.clearInteractionHandle(this._interactionMixinHandles.pop());
      },
      _interactionMixinHandles: [],
      createInteractionHandle: function () {
        var n = r.createInteractionHandle();
        return this._interactionMixinHandles.push(n), n;
      },
      clearInteractionHandle: function (n) {
        r.clearInteractionHandle(n), this._interactionMixinHandles = this._interactionMixinHandles.filter(function (t) {
          return t !== n;
        });
      },
      runAfterInteractions: function (n) {
        r.runAfterInteractions(n);
      }
    };
  i.exports = a;
});
