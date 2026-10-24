// Recovered module 135; analysis path, not original filename.
// Original SHA-256 7d809873d019914ed5c7e65074d8c718ee6931e5c5d200c51b1fc96c0c971035; original byte range [232009, 232577).
__d(135, function (r, i, n, e) {
  "use strict";

  function c(r, i) {
    try {
      var n = r.originalPositionFor({
        line: i.lineNumber,
        column: i.column
      });
      if (n) {
        var e = n.source.indexOf("?");
        i.file = -1 === e ? n.source : n.source.substring(0, e), i.lineNumber = n.line, i.column = n.column;
      }
    } catch (c) {}
  }
  function o(r, i) {
    if (!r || !r.stack) return [];
    for (var n = Array.isArray(r.stack) ? r.stack : f.parse(r.stack), e = r.framesToPop || 0; e--;) n.shift();
    return i && i.forEach(function (r, i) {
      n.forEach(function (i) {
        -1 === i.file.indexOf(r.file) && -1 === i.file.replace(".map", ".bundle").indexOf(r.file) || c(r, i);
      });
    }), n;
  }
  var f = i(409);
  n.exports = o;
});
