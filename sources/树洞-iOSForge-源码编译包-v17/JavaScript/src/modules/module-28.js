// Recovered module 28; analysis path, not original filename.
// Original SHA-256 870cb8be6519dbb5712dd2f26853d083214b8ed4ac2068bda9f7164bdd751702; original byte range [98276, 98660).
__d(28, function (u, t, n, c) {
  "use strict";

  var r = (t(29), t(30)),
    e = {
      _currentlyFocusedID: null,
      currentlyFocusedField: function () {
        return this._currentlyFocusedID;
      },
      focusTextInput: function (u) {
        this._currentlyFocusedID !== u && null !== u && (this._currentlyFocusedID = u, r.focus(u));
      },
      blurTextInput: function (u) {
        this._currentlyFocusedID === u && null !== u && (this._currentlyFocusedID = null, r.blur(u));
      }
    };
  n.exports = e;
});
