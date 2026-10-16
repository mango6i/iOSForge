// Recovered module 560; analysis path, not original filename.
// Original SHA-256 fd23a39b434141b6ed56def522f5345ddae24f0e4600dbde6b06631d9e76c6ae; original byte range [752271, 752511).
__d(560, function (r, t, n, e) {
  "use strict";

  var o = function (r) {
    var t,
      n = {};
    if (!(r instanceof Object) || Array.isArray(r)) throw new Error("keyMirror(...): Argument must be an object.");
    for (t in r) r.hasOwnProperty(t) && (n[t] = t);
    return n;
  };
  n.exports = o;
});
