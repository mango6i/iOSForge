// Recovered module 302; analysis path, not original filename.
// Original SHA-256 b14739ac60671d3f46027d6cc3b7d2145f9493f294739480fa8f49d01d5295c4; original byte range [580458, 580952).
__d(302, function (r, n, o, t) {
  "use strict";

  var e = n(31).Vibration,
    i = (n(29), {
      vibrate: function () {
        var r = arguments.length <= 0 || void 0 === arguments[0] ? 400 : arguments[0];
        arguments.length <= 1 || void 0 === arguments[1] ? !1 : arguments[1];
        if ("number" == typeof r) e.vibrate();else {
          if (!Array.isArray(r)) throw new Error("Vibration pattern should be a number or array");
          console.warn("Vibration patterns are not supported on iOS");
        }
      },
      cancel: function () {
        console.warn("Vibration.cancel is not supported on iOS");
      }
    });
  o.exports = i;
});
