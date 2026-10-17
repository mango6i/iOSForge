// Recovered module 571; analysis path, not original filename.
// Original SHA-256 b55aebb83d8bb4bdd8f511c2ea5e2e9e2de72121f32c6525a3e71c403b3c2374; original byte range [1570973, 1573196).
__d(571, function (e, t, r, l) {
  Object.defineProperty(l, "__esModule", {
    value: !0
  }), l.ProgressPie = void 0;
  var a = t(311),
    o = babelHelpers.interopRequireDefault(a),
    n = t(555),
    i = babelHelpers.interopRequireDefault(n),
    d = t(312),
    s = t(572),
    u = babelHelpers.interopRequireDefault(s),
    f = t(596),
    p = babelHelpers.interopRequireDefault(f),
    b = t(569),
    c = babelHelpers.interopRequireDefault(b),
    m = 2 * Math.PI,
    h = d.Animated.createAnimatedComponent(d.ART.Surface),
    g = d.Animated.createAnimatedComponent(p["default"]),
    y = d.StyleSheet.create({
      container: {
        backgroundColor: "transparent",
        overflow: "hidden"
      }
    }),
    C = l.ProgressPie = function (e) {
      function t() {
        return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "render",
        value: function () {
          var e = this.props,
            t = e.animated,
            r = e.borderColor,
            l = e.borderWidth,
            a = e.children,
            n = e.color,
            i = e.progress,
            s = e.rotation,
            f = e.size,
            b = e.style,
            c = e.unfilledColor,
            C = babelHelpers.objectWithoutProperties(e, ["animated", "borderColor", "borderWidth", "children", "color", "progress", "rotation", "size", "style", "unfilledColor"]),
            H = s ? h : d.ART.Surface,
            R = t ? g : p["default"],
            A = t ? d.Animated.multiply(i, m) : i * m,
            P = f / 2 - l,
            v = {
              top: l,
              left: l
            };
          return o["default"].createElement(d.View, babelHelpers["extends"]({
            style: [y.container, b]
          }, C), o["default"].createElement(H, {
            width: f,
            height: f,
            style: s ? {
              transform: [{
                rotate: s.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"]
                })
              }]
            } : void 0
          }, c ? o["default"].createElement(u["default"], {
            radius: P,
            offset: v,
            fill: c
          }) : !1, o["default"].createElement(R, {
            radius: P,
            angle: A,
            offset: v,
            fill: n
          }), l ? o["default"].createElement(u["default"], {
            radius: f / 2,
            stroke: r || n,
            strokeWidth: l
          }) : !1), a);
        }
      }]), t;
    }(a.Component);
  C.propTypes = {
    animated: i["default"].bool,
    borderColor: i["default"].string,
    borderWidth: i["default"].number,
    color: i["default"].string,
    children: i["default"].node,
    progress: i["default"].oneOfType([i["default"].number, i["default"].instanceOf(d.Animated.Value)]),
    rotation: i["default"].instanceOf(d.Animated.Value),
    size: i["default"].number,
    style: d.View.propTypes.style,
    unfilledColor: i["default"].string
  }, C.defaultProps = {
    borderWidth: 1,
    color: "rgba(0, 122, 255, 1)",
    progress: 0,
    size: 40
  }, l["default"] = (0, c["default"])(C, .2);
});
