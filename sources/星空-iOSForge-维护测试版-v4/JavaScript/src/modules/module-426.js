// Recovered module 426; analysis path, not original filename.
// Original SHA-256 3d35832131e6e4eaf5cd190df20208241a6fdac88979d06a1190020d13b4197f; original byte range [520743, 520940).
__d(426, function (t, n, e, o) {
  "use strict";

  var a = n(383),
    r = n(429),
    u = 0,
    i = r || function (n) {
      var e = Date.now(),
        o = Math.max(0, 16 - (e - u));
      return u = e + o, t.setTimeout(function () {
        n(Date.now());
      }, o);
    };
  i(a), e.exports = i;
});
