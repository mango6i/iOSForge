// Recovered module 69; analysis path, not original filename.
// Original SHA-256 4fbd5a87ad27062f363d3f146a48e6ffee6a57ffd0a5f54a2ac5aa9956d305b0; original byte range [137880, 138613).
__d(69, function (n, e, i, t) {
  "use strict";

  function r(n) {
    function e(e, i, t, r, d) {
      if (!i[t]) return void (e && u(!1, "Required object `" + t + "` was not specified in " + ("`" + r + "`.")));
      var a = i[t],
        c = typeof a,
        l = d && o[d] || "(unknown)";
      "object" !== c && u(!1, "Invalid " + l + " `" + t + "` of type `" + c + "` " + ("supplied to `" + r + "`, expected `object`."));
      var f = s(i[t], n);
      for (var p in f) {
        var v = n[p];
        v || u(!1, "Invalid props." + t + " key `" + p + "` supplied to `" + r + "`.\nBad object: " + JSON.stringify(i[t], null, "  ") + "\nValid keys: " + JSON.stringify(Object.keys(n), null, "  "));
        var y = v(a, p, r, d);
        y && u(!1, y.message + "\nBad object: " + JSON.stringify(i[t], null, "  "));
      }
    }
    function i(n, i, t, r) {
      return e(!1, n, i, t, r);
    }
    return i.isRequired = e.bind(null, !0), i;
  }
  var o = e(16),
    u = e(380),
    s = e(70);
  i.exports = r;
});
