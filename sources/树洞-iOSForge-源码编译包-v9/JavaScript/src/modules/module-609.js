// Recovered module 609; analysis path, not original filename.
// Original SHA-256 56ce681c11b0f7efa844a88f2009af127aa892e28162310a72ef13bf38383c8e; original byte range [1645422, 1646749).
__d(609, function (e, n, t, r) {
  "use strict";

  var o = n(312),
    i = o.NativeModules.AudioRecorderManager,
    d = {
      prepareRecordingAtPath: function (e, n, t) {
        var r = {
            SampleRate: 44100,
            Channels: 2,
            AudioQuality: "High",
            AudioEncoding: "ima4"
          },
          o = babelHelpers["extends"]({}, r, n);
        i.prepareRecordingAtPath(e, o.SampleRate, o.Channels, o.AudioQuality, o.AudioEncoding);
      },
      startRecordingAt: function (e) {
        return new Promise(function (n, t) {
          i.startRecordingAt(e, function (e) {
            e ? t(e) : n();
          });
        });
      },
      playRecordingAt: function (e, n) {
        "android" == o.Platform.OS || i.ios13change ? i.playRecordingAt(e, n) : n("noIos13");
      },
      stopRecording: function (e) {
        i.stopRecording(function (n, t) {
          return e(n, t);
        });
      },
      playRecording: function () {
        i.playRecording();
      },
      stopPlaying: function (e) {
        "android" == o.Platform.OS || i.ios13change ? i.stopPlaying() : e("noIos13");
      },
      checkAuthorizationStatus: i.checkAuthorizationStatus,
      requestAuthorization: i.requestAuthorization
    };
  "android" == o.Platform.OS ? (o.DeviceEventEmitter.addListener("recordingProgress", function (e) {
    return d.onRecordingProgress(e);
  }), o.DeviceEventEmitter.addListener("recordingInterrupted", function (e) {
    return d.onRecordingInterrupted(e);
  })) : (o.NativeAppEventEmitter.addListener("recordingProgress", function (e) {
    return d.onRecordingProgress(e);
  }), o.NativeAppEventEmitter.addListener("recordingInterrupted", function (e) {
    return d.onRecordingInterrupted(e);
  })), t.exports = {
    AudioRecorder: d
  };
});
