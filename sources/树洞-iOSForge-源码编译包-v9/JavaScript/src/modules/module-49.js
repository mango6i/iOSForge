// Recovered module 49; analysis path, not original filename.
// Original SHA-256 6c0859d6d3bad1d898fc63789753aa9cfcb5f5fe53a8b0b8c0f300346b758ca9; original byte range [119427, 119680).
__d(49, function (e, s, r, t) {
  "use strict";

  var i = function () {
    function e(s) {
      babelHelpers.classCallCheck(this, e), this.subscriber = s;
    }
    return babelHelpers.createClass(e, [{
      key: "remove",
      value: function () {
        this.subscriber.removeSubscription(this);
      }
    }]), e;
  }();
  r.exports = i;
});
