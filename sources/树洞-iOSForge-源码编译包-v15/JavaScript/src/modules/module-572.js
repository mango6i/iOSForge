// Recovered module 572; analysis path, not original filename.
// Original SHA-256 34dca25b4ae86913262dab878a790580cf82ba8f359b7a70bff5bc28d17b429d; original byte range [1573197, 1574436).
__d(572, function (e, t, r, o) {
  function s(e, t, r, o) {
    var s = "counter-clockwise" === o ? "counterArc" : "arc";
    return n.ART.Path().moveTo(e, t).move(r, 0)[s](0, 2 * r, r, r)[s](0, -2 * r, r, r).close();
  }
  Object.defineProperty(o, "__esModule", {
    value: !0
  });
  var l = t(311),
    i = babelHelpers.interopRequireDefault(l),
    u = t(555),
    a = babelHelpers.interopRequireDefault(u),
    n = t(312),
    c = function (e) {
      function t() {
        return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "render",
        value: function () {
          var e = this.props,
            t = e.radius,
            r = e.offset,
            o = e.strokeWidth,
            l = e.direction,
            u = babelHelpers.objectWithoutProperties(e, ["radius", "offset", "strokeWidth", "direction"]),
            a = s((r.left || 0) + o / 2, (r.top || 0) + o / 2, t - o / 2, l);
          return i["default"].createElement(n.ART.Shape, babelHelpers["extends"]({
            d: a,
            strokeCap: "butt",
            strokeWidth: o
          }, u));
        }
      }]), t;
    }(l.Component);
  c.propTypes = {
    radius: a["default"].number.isRequired,
    offset: a["default"].shape({
      top: a["default"].number,
      left: a["default"].number
    }),
    strokeWidth: a["default"].number,
    direction: a["default"].oneOf(["clockwise", "counter-clockwise"])
  }, c.defaultProps = {
    offset: {
      top: 0,
      left: 0
    },
    strokeWidth: 0,
    direction: "clockwise"
  }, o["default"] = c;
});
