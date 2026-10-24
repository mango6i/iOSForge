// Recovered module 268; analysis path, not original filename.
// Original SHA-256 97c053810171921734642bc0dc20d7d7c918c737c7ba8f14d259f60e2ddd24b0; original byte range [541981, 542410).
__d(268, function (e, n, o, a) {
  "use strict";

  var r = n(31).ImagePickerIOS,
    t = {
      canRecordVideos: function (e) {
        return r.canRecordVideos(e);
      },
      canUseCamera: function (e) {
        return r.canUseCamera(e);
      },
      openCameraDialog: function (e, n, o) {
        return e = babelHelpers["extends"]({
          videoMode: !1
        }, e), r.openCameraDialog(e, n, o);
      },
      openSelectDialog: function (e, n, o) {
        return e = babelHelpers["extends"]({
          showImages: !0,
          showVideos: !1
        }, e), r.openSelectDialog(e, n, o);
      }
    };
  o.exports = t;
});
