// Recovered module 265; analysis path, not original filename.
// Original SHA-256 40766e9cebb5e2a5e16cabf4ec0811d46238231093252e50bf280037d029fcfd; original byte range [540504, 540806).
__d(265, function (t, e, r, i) {
  "use strict";

  var n = e(31).Clipboard,
    s = e(266);
  r.exports = {
    getString: function () {
      return s(n.getString(), Array.prototype.slice.call(arguments), "success-first", "Clipboard.getString(callback) is deprecated. Use the returned Promise instead");
    },
    setString: function (t) {
      n.setString(t);
    }
  };
});
