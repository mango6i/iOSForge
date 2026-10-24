// Recovered module 140; analysis path, not original filename.
// Original SHA-256 51ab4d07009d5ecd824d95782e930ed3f0b10945bc52ba3199e8ea9ae5879feb; original byte range [239987, 240552).
__d(140, function (e, t, s, r) {
  "use strict";

  var n = t(141),
    a = t(142),
    i = t(143),
    l = function (e) {
      function t() {
        return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "sendImpl",
        value: function (e, t, s, r, i, l, o) {
          "string" == typeof r ? r = {
            string: r
          } : r instanceof n && (r = {
            formData: r.getParts()
          }), a.sendRequest({
            method: e,
            url: t,
            data: r,
            headers: s,
            incrementalUpdates: i,
            timeout: l,
            pinCert: !!o
          }, this.didCreateRequest.bind(this));
        }
      }]), t;
    }(i);
  s.exports = l;
});
