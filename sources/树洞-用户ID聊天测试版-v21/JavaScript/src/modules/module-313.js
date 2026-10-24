// Recovered module 313; analysis path, not original filename.
// Original SHA-256 42f39b7dce3c32b90af48009498b794b5c256c567a4da567f635cbfcfe83ac69; original byte range [185713, 186386).
__d(313, function (e, r, t, n) {
  "use strict";

  function a(e) {
    switch (e) {
      case .75:
        return "ldpi";
      case 1:
        return "mdpi";
      case 1.5:
        return "hdpi";
      case 2:
        return "xhdpi";
      case 3:
        return "xxhdpi";
      case 4:
        return "xxxhdpi";
    }
  }
  function i(e, r) {
    var t = a(r);
    if (!t) throw new Error("Don't know which android drawable suffix to use for asset: " + JSON.stringify(e));
    var n = "drawable-" + t;
    return n;
  }
  function s(e) {
    var r = o(e);
    return (r + "/" + e.name).toLowerCase().replace(/\//g, "_").replace(/([^a-z0-9_])/g, "").replace(/^assets_/, "");
  }
  function o(e) {
    var r = e.httpServerLocation;
    return "/" === r[0] && (r = r.substr(1)), r;
  }
  t.exports = {
    getAndroidAssetSuffix: a,
    getAndroidDrawableFolderName: i,
    getAndroidResourceIdentifier: s,
    getBasePath: o
  };
});
