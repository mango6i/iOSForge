// Recovered module 601; analysis path, not original filename.
// Original SHA-256 ca060d68ccdfc51292024049c9901da7eb8053dc03714c92bf3341fa605f6948; original byte range [1610116, 1611389).
__d(601, function (e, n, t, i) {
  var r = n(312),
    o = r.NativeModules.ReactNativePermissions,
    s = ["location", "camera", "microphone", "photo", "contacts", "event", "reminder", "bluetooth", "notification", "backgroundRefresh", "speechRecognition"],
    c = {
      location: "whenInUse",
      notification: ["alert", "badge", "sound"]
    },
    a = function u() {
      var e = this;
      babelHelpers.classCallCheck(this, u), this.canOpenSettings = function () {
        return o.canOpenSettings();
      }, this.openSettings = function () {
        return o.openSettings();
      }, this.getTypes = function () {
        return s;
      }, this.check = function (e, n) {
        if (!s.includes(e)) {
          var t = new Error("ReactNativePermissions: " + e + " is not a valid permission type on iOS");
          return Promise.reject(t);
        }
        return o.getPermissionStatus(e, n || c[e]);
      }, this.request = function (e, n) {
        var t = void 0;
        if ("string" == typeof n ? t = n : n && n.type && (t = n.type), !s.includes(e)) {
          var i = new Error("ReactNativePermissions: " + e + " is not a valid permission type on iOS");
          return Promise.reject(i);
        }
        if ("backgroundRefresh" == e) {
          var r = new Error("ReactNativePermissions: You cannot request backgroundRefresh");
          return Promise.reject(r);
        }
        return o.requestPermission(e, t || c[e]);
      }, this.checkMultiple = function (n) {
        return Promise.all(n.map(function (n) {
          return e.check(n);
        })).then(function (e) {
          return e.reduce(function (e, t, i) {
            var r = n[i];
            return e[r] = t, e;
          }, {});
        });
      };
    };
  t.exports = new a();
});
