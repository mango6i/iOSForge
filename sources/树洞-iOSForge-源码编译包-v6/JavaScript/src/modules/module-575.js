// Recovered module 575; analysis path, not original filename.
// Original SHA-256 009c9cb5e697fc587a6b52dbfae147327b6e210029ffc7e592be261621549ecb; original byte range [1579320, 1580021).
__d(575, function (i, e, n, t) {
  var o = e(312),
    r = {};
  "android" === o.Platform.OS && !function () {
    var i = {
        refreshToken: "FCMTokenRefreshed",
        notification: "FCMNotificationReceived"
      },
      e = o.NativeModules.RNFIRMessaging;
    r.getFCMToken = function () {
      return e.getFCMToken();
    }, r.requestPermissions = function () {
      return e.requestPermissions();
    }, r.on = function (e, n) {
      var t = i[e],
        r = o.DeviceEventEmitter.addListener(t, n);
      return function () {
        r.remove();
      };
    }, r.subscribeToTopic = function (i) {
      e.subscribeToTopic(i);
    }, r.unsubscribeFromTopic = function (i) {
      e.unsubscribeFromTopic(i);
    }, r.clearNotification = function () {
      e.clearNotification();
    }, o.DeviceEventEmitter.addListener("FCMInitData", function (i) {
      r.initialData = i;
    }), r.initialData = e.initialData;
  }(), n.exports = r;
});
