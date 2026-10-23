// Recovered module 159; analysis path, not original filename.
// Original SHA-256 e046bb18e60626c6d0c9b776f42a18cff0d9372542b8b3b959e1929fd18def2f; original byte range [272980, 273553).
__d(159, function (e, t, r, n) {
  "use strict";

  var a = t(379),
    c = a || function (e) {
      for (var t = 1; t < arguments.length; t++) {
        var r = arguments[t];
        for (var n in r) Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
      }
      return e;
    },
    o = t(160),
    s = t(161),
    u = t(30),
    i = (t(381), u.customBubblingEventTypes),
    v = u.customDirectEventTypes,
    l = {};
  for (var f in i) l[f] = i[f];
  for (var p in v) l[p] = v[p];
  var h = {
    eventTypes: c({}, i, v),
    extractEvents: function (e, t, r, n) {
      var a = i[e],
        c = v[e],
        u = s.getPooled(a || c, t, r, n);
      if (a) o.accumulateTwoPhaseDispatches(u);else {
        if (!c) return null;
        o.accumulateDirectDispatches(u);
      }
      return u;
    }
  };
  r.exports = h;
});
