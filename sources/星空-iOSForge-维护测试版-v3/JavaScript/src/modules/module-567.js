// Recovered module 567; analysis path, not original filename.
// Original SHA-256 8a7d6af576ebd95e66512bcebce93768428861ae4cac65a730c50c1eb601f01f; original byte range [1563539, 1565278).
__d(567, function (e, t, r, s) {
  function a(e, t, r, s, a, o) {
    var l = r,
      n = s;
    n - l >= d ? n = d + n % d : n %= d, l %= d;
    var i = l > n ? d - l + n : n - l;
    if (i >= d) return u.ART.Path().moveTo(e + a, t).arc(0, 2 * a, a, a).arc(0, -2 * a, a, a).close();
    var c = "counter-clockwise" === o ? -1 : 1;
    n *= c, l *= c;
    var f = Math.sin(l),
      p = Math.cos(l),
      b = Math.sin(n),
      h = Math.cos(n),
      k = i > Math.PI ? 1 : 0,
      A = "counter-clockwise" === o ? 0 : 1;
    return "M" + (e + a * (1 + f)) + " " + (t + a - a * p) + "\n          A" + a + " " + a + " 0 " + k + " " + A + " " + (e + a * (1 + b)) + " " + (t + a - a * h);
  }
  Object.defineProperty(s, "__esModule", {
    value: !0
  });
  var o = t(311),
    l = babelHelpers.interopRequireDefault(o),
    n = t(555),
    i = babelHelpers.interopRequireDefault(n),
    u = t(312),
    d = 2 * Math.PI,
    c = function (e) {
      function t() {
        return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "render",
        value: function () {
          var e = this.props,
            t = e.startAngle,
            r = e.endAngle,
            s = e.radius,
            o = e.offset,
            n = e.direction,
            i = e.strokeCap,
            d = e.strokeWidth,
            c = babelHelpers.objectWithoutProperties(e, ["startAngle", "endAngle", "radius", "offset", "direction", "strokeCap", "strokeWidth"]),
            f = a((o.left || 0) + d / 2, (o.top || 0) + d / 2, t, r, s - d / 2, n);
          return l["default"].createElement(u.ART.Shape, babelHelpers["extends"]({
            d: f,
            strokeCap: i,
            strokeWidth: d
          }, c));
        }
      }]), t;
    }(o.Component);
  c.propTypes = {
    startAngle: i["default"].number.isRequired,
    endAngle: i["default"].number.isRequired,
    radius: i["default"].number.isRequired,
    offset: i["default"].shape({
      top: i["default"].number,
      left: i["default"].number
    }),
    strokeCap: i["default"].string,
    strokeWidth: i["default"].number,
    direction: i["default"].oneOf(["clockwise", "counter-clockwise"])
  }, c.defaultProps = {
    startAngle: 0,
    offset: {
      top: 0,
      left: 0
    },
    strokeCap: "butt",
    strokeWidth: 0,
    direction: "clockwise"
  }, s["default"] = c;
});
