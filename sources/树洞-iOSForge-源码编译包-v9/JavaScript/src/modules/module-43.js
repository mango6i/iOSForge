// Recovered module 43; analysis path, not original filename.
// Original SHA-256 9fc1ab79fbb7c122936cdb7f6048f45b7537a7282e5ae32431d395a44abd7e58; original byte range [114805, 115064).
__d(43, function (e, t, r, i) {
  "use strict";

  var a = t(44),
    n = t(25),
    o = t(58),
    l = t(27),
    s = a.roundToNearestPixel(.4);
  0 === s && (s = 1 / a.get()), r.exports = {
    hairlineWidth: s,
    flatten: l,
    create: function (e) {
      var t = {};
      for (var r in e) o.validateStyle(r, e), t[r] = n.register(e[r]);
      return t;
    }
  };
});
