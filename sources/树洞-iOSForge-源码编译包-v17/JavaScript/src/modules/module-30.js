// Recovered module 30; analysis path, not original filename.
// Original SHA-256 ab8a151549b82aac72c8fcc2d321f8eb98c7b6a44799b21e60ab7a31145a495e; original byte range [98764, 99844).
__d(30, function (n, e, r, t) {
  "use strict";

  var a = (e(29), e(31)),
    o = a.UIManager,
    u = e(41),
    c = o.takeSnapshot;
  o.takeSnapshot = function (n, e) {
    return regeneratorRuntime.async(function (r) {
      for (;;) switch (r.prev = r.next) {
        case 0:
          if (c) {
            r.next = 3;
            break;
          }
          return console.warn("UIManager.takeSnapshot is not available on this platform"), r.abrupt("return");
        case 3:
          return "number" != typeof n && "window" !== n && (n = u(n) || "window"), r.abrupt("return", c(n, e));
        case 5:
        case "end":
          return r.stop();
      }
    }, null, this);
  }, !function () {
    function n(n) {
      return n.replace(/^(RCT|RK)/, "");
    }
    Object.keys(o).forEach(function (e) {
      var r = o[e];
      r.Manager && !function () {
        var e = void 0;
        Object.defineProperty(r, "Constants", {
          configurable: !0,
          enumerable: !0,
          get: function () {
            if (e) return e;
            e = {};
            var t = a[n(r.Manager)];
            return t && Object.keys(t).forEach(function (n) {
              var r = t[n];
              "function" != typeof r && (e[n] = r);
            }), e;
          }
        });
        var t = void 0;
        Object.defineProperty(r, "Commands", {
          configurable: !0,
          enumerable: !0,
          get: function () {
            if (t) return t;
            t = {};
            var e = a[n(r.Manager)],
              o = 0;
            return e && Object.keys(e).forEach(function (n) {
              var r = e[n];
              "function" == typeof r && (t[n] = o++);
            }), t;
          }
        });
      }();
    });
  }(), r.exports = o;
});
