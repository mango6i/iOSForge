// Recovered module 586; analysis path, not original filename.
// Original SHA-256 938a3aafc4f20cb1ba4319be666262f965546643f7c01a47adb1e3f1f2588c08; original byte range [1597370, 1598762).
__d(586, function (e, n, r, t) {
  "use strict";

  function o(e) {
    if (!e) return null;
    var n = new Error(e.message);
    return n.key = e.key, n;
  }
  var i = n(312),
    s = i.NativeModules,
    u = s.RNKeychainManager,
    c = {
      setInternetCredentials: function (e, n, r, t) {
        return new Promise(function (i, s) {
          u.setInternetCredentialsForServer(e, n, r, function (e) {
            t && t(e && o(e) || null), e ? s(o(e)) : i();
          });
        });
      },
      getInternetCredentials: function (e, n) {
        return new Promise(function (r, t) {
          u.getInternetCredentialsForServer(e, function (i, s, u) {
            i = o(i), i || 1 !== arguments.length || (i = new Error('No keychain entry found for server "' + e + '"')), n && n(i && o(i) || null, s, u), i ? t(o(i)) : r({
              username: s,
              password: u
            });
          });
        });
      },
      resetInternetCredentials: function (e, n) {
        return new Promise(function (r, t) {
          u.resetInternetCredentialsForServer(e, function (e) {
            n && n(e && o(e) || null), e ? t(o(e)) : r();
          });
        });
      },
      setGenericPassword: function (e, n, r, t) {
        return new Promise(function (i, s) {
          u.setGenericPasswordForService(r, e, n, function (e) {
            t && t(e && o(e) || null), e ? s(o(e)) : i();
          });
        });
      },
      getGenericPassword: function (e, n) {
        return new Promise(function (r, t) {
          u.getGenericPasswordForService(e, function (i, s, u) {
            i = o(i), i || 1 !== arguments.length || (i = new Error("No keychain entry found" + (e ? ' for service "' + e + '"' : ""))), n && n(i && o(i) || null, s, u), i ? t(o(i)) : r({
              username: s,
              password: u
            });
          });
        });
      },
      resetGenericPassword: function (e, n) {
        return new Promise(function (r, t) {
          u.resetGenericPasswordForService(e, function (e) {
            n && n(e && o(e) || null), e ? t(o(e)) : r();
          });
        });
      }
    };
  r.exports = c;
});
