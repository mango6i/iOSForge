// Recovered module 585; analysis path, not original filename.
// Original SHA-256 adab028a375a68a8a2f6ef1aecc58fdebdbec134d57fa32a0d0cebba3fc41023; original byte range [1595934, 1597369).
__d(585, function (e, n, t, u) {
  var i = n(312),
    r = n(312).NativeModules.RNDeviceInfo;
  t.exports = {
    exitApp: function () {
      r.exitApp();
    },
    getUniqueID: function () {
      return r.uniqueId;
    },
    getUniqueID2: function () {
      return r.uniqueId2;
    },
    getDeviceCheck: function () {
      return new Promise(function (e, n) {
        "ios" === i.Platform.OS ? r.getDeviceCheck().then(function (n) {
          e(n);
        })["catch"](function () {
          e("");
        }) : e("");
      });
    },
    openNotiSettings: function () {
      r.openNotiSettings();
    },
    aliAuth: function (e) {
      return r.aliAuth2 ? (r.aliAuth2(e), Promise.resolve()) : Promise.reject("nofunction");
    },
    hasSimCard: function () {
      return new Promise(function (e, n) {
        r.hasSimCard ? r.hasSimCard().then(function (n) {
          return e(n);
        }) : e(!0);
      });
    },
    umengInit: function () {
      r.umengInit && r.umengInit();
    },
    umengInit_rct: function (e) {
      r.umengInit_rct ? r.umengInit_rct(e) : r.umengInit && r.umengInit();
    },
    getDeviceId: function () {
      return r.deviceId;
    },
    getManufacturer: function () {
      return r.systemManufacturer;
    },
    getModel: function () {
      return r.model;
    },
    getSystemName: function () {
      return r.systemName;
    },
    getSystemVersion: function () {
      return r.systemVersion;
    },
    getBundleId: function () {
      return r.bundleId;
    },
    getBuildNumber: function () {
      return r.buildNumber;
    },
    getVersion: function () {
      return r.appVersion;
    },
    getReadableVersion: function () {
      return r.appVersion + "." + r.buildNumber;
    },
    getDeviceName: function () {
      return r.deviceName;
    },
    getUserAgent: function () {
      return r.userAgent;
    },
    getDeviceLocale: function () {
      return r.deviceLocale;
    },
    getToken: function () {
      return r.token;
    },
    getDdVersion: function () {
      return r.ddversion;
    }
  };
});
