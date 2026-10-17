// Recovered module 298; analysis path, not original filename.
// Original SHA-256 b8a485be79e6e433090184297da693c6652a8c976cf11628d080aa6d7df147c0; original byte range [575781, 576933).
__d(298, function (e, n, t, r) {
  "use strict";

  var o = n(150),
    i = n(31),
    u = (n(29), n(46)),
    c = i.NetInfo,
    s = n(266),
    v = "networkStatusDidChange",
    f = new o(),
    a = void 0;
  a = function (e) {
    return "none" !== e && "unknown" !== e;
  };
  var d = new o(),
    l = {
      addEventListener: function (e, n) {
        var t = u.addListener(v, function (e) {
          n(e.network_info);
        });
        return f.set(n, t), {
          remove: function () {
            return l.removeEventListener(e, n);
          }
        };
      },
      removeEventListener: function (e, n) {
        var t = f.get(n);
        t && (t.remove(), f["delete"](n));
      },
      fetch: function () {
        return c.getCurrentConnectivity().then(function (e) {
          return e.network_info;
        });
      },
      isConnected: {
        addEventListener: function (e, n) {
          var t = function (e) {
            n(a(e));
          };
          return d.set(n, t), l.addEventListener(e, t), {
            remove: function () {
              return l.isConnected.removeEventListener(e, n);
            }
          };
        },
        removeEventListener: function (e, n) {
          var t = d.get(n);
          l.removeEventListener(e, t), d["delete"](n);
        },
        fetch: function () {
          return l.fetch().then(function (e) {
            return a(e);
          });
        }
      },
      isConnectionExpensive: function () {
        return s(Promise.reject(new Error("Currently not supported on iOS")), Array.prototype.slice.call(arguments), "single-callback-value-first", "NetInfo.isConnectionMetered(callback) is deprecated. Use the returned Promise instead.");
      }
    };
  t.exports = l;
});
