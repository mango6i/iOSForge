// Recovered module 284; analysis path, not original filename.
// Original SHA-256 251568fff9a2711496ebbfcade1198df46e94c3e4a21a1ac430f651438d35577; original byte range [561289, 561569).
__d(284, function (e, t, s, n) {
  "use strict";

  var i = function () {
    function e(t, s) {
      babelHelpers.classCallCheck(this, e), this._value = t, this._token = t.addListener(s);
    }
    return babelHelpers.createClass(e, [{
      key: "remove",
      value: function () {
        this._value.removeListener(this._token);
      }
    }]), e;
  }();
  s.exports = i;
});
