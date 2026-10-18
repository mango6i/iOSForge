// Recovered module 606; analysis path, not original filename.
// Original SHA-256 5b9d3f0d196bfac313a08de384ee50bbccaa403697b031be4c17cc01ddf54518; original byte range [1635436, 1636124).
__d(606, function (e, t, d, i) {
  Object.defineProperty(i, "__esModule", {
    value: !0
  }), i.addListener = i.startUpload = i.getFileInfo = void 0;
  var r = t(312),
    n = r.NativeModules.VydiaRNFileUploader || r.NativeModules.RNFileUploader,
    a = "RNFileUploader-";
  r.NativeModules.VydiaRNFileUploader && (n.addListener(a + "progress"), n.addListener(a + "error"), n.addListener(a + "completed"));
  var o = i.getFileInfo = function (e) {
      return n.getFileInfo(e).then(function (e) {
        return e.size && (e.size = +e.size), e;
      });
    },
    l = i.startUpload = function (e) {
      return n.startUpload(e);
    },
    s = i.addListener = function (e, t, d) {
      return r.DeviceEventEmitter.addListener(a + e, function (e) {
        t && e && e.id && e.id !== t || d(e);
      });
    };
  i["default"] = {
    startUpload: l,
    addListener: s,
    getFileInfo: o
  };
});
