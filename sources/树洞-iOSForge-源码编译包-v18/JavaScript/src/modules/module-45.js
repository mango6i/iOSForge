// Recovered module 45; analysis path, not original filename.
// Original SHA-256 8eb4d191bef9e622bb3756126fddb017d09386873928061e3e6162023c22ad13; original byte range [115589, 116244).
__d(45, function (e, s, i, n) {
  "use strict";

  var t = (s(29), s(30)),
    l = s(46),
    a = s(380),
    c = {},
    o = function () {
      function e() {
        babelHelpers.classCallCheck(this, e);
      }
      return babelHelpers.createClass(e, null, [{
        key: "set",
        value: function (e) {
          if (e && e.windowPhysicalPixels) {
            e = JSON.parse(JSON.stringify(e));
            var s = e.windowPhysicalPixels;
            e.window = {
              width: s.width / s.scale,
              height: s.height / s.scale,
              scale: s.scale,
              fontScale: s.fontScale
            }, e.screen = e.window, delete e.windowPhysicalPixels;
          }
          babelHelpers["extends"](c, e);
        }
      }, {
        key: "get",
        value: function (e) {
          return a(c[e], "No dimension set for key " + e), c[e];
        }
      }]), e;
    }();
  o.set(t.Dimensions), l.addListener("didUpdateDimensions", function (e) {
    o.set(e);
  }), i.exports = o;
});
