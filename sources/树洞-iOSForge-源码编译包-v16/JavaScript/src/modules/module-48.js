// Recovered module 48; analysis path, not original filename.
// Original SHA-256 9c6f537609e582d31e284649497be47ed4fdc28516726fd107d1f87e2da766d3; original byte range [119016, 119426).
__d(48, function (e, t, r, s) {
  "use strict";

  var i = t(49),
    l = function (e) {
      function t(e, r, s, i) {
        babelHelpers.classCallCheck(this, t);
        var l = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).call(this, r));
        return l.emitter = e, l.listener = s, l.context = i, l;
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "remove",
        value: function () {
          this.emitter.removeSubscription(this);
        }
      }]), t;
    }(i);
  r.exports = l;
});
