// Recovered module 568; analysis path, not original filename.
// Original SHA-256 2581e1321025e0dd26b9db860ce50fb0929f997e1501892173ace7f151dc7edc; original byte range [1560126, 1563538).
__d(568, function (e, t, r, o) {
  Object.defineProperty(o, "__esModule", {
    value: !0
  }), o.ProgressCircle = void 0;
  var l = t(311),
    a = babelHelpers.interopRequireDefault(l),
    n = t(555),
    s = babelHelpers.interopRequireDefault(n),
    i = t(312),
    d = t(567),
    u = babelHelpers.interopRequireDefault(d),
    f = t(569),
    p = babelHelpers.interopRequireDefault(f),
    c = 2 * Math.PI,
    h = i.Animated.createAnimatedComponent(i.ART.Surface),
    b = i.Animated.createAnimatedComponent(u["default"]),
    m = i.StyleSheet.create({
      container: {
        backgroundColor: "transparent",
        overflow: "hidden"
      }
    }),
    g = o.ProgressCircle = function (e) {
      function t(e, r) {
        babelHelpers.classCallCheck(this, t);
        var o = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).call(this, e, r));
        return o.progressValue = 0, o;
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "componentWillMount",
        value: function () {
          var e = this;
          this.props.animated && this.props.progress.addListener(function (t) {
            e.progressValue = t.value, (e.props.showsText || 1 === e.progressValue) && e.forceUpdate();
          });
        }
      }, {
        key: "render",
        value: function () {
          var e = this.props,
            t = e.animated,
            r = e.borderColor,
            o = e.borderWidth,
            l = e.color,
            n = e.children,
            s = e.direction,
            d = e.formatText,
            f = e.indeterminate,
            p = e.progress,
            g = e.rotation,
            y = e.showsText,
            C = e.size,
            k = e.style,
            T = e.strokeCap,
            x = e.textStyle,
            A = e.thickness,
            w = e.unfilledColor,
            v = babelHelpers.objectWithoutProperties(e, ["animated", "borderColor", "borderWidth", "color", "children", "direction", "formatText", "indeterminate", "progress", "rotation", "showsText", "size", "style", "strokeCap", "textStyle", "thickness", "unfilledColor"]),
            H = o || (f ? 1 : 0),
            R = C / 2 - H,
            W = {
              top: H,
              left: H
            },
            P = H + A,
            V = C - 2 * P,
            S = g ? h : i.ART.Surface,
            E = t ? b : u["default"],
            O = t ? this.progressValue : p,
            M = t ? i.Animated.multiply(p, c) : p * c,
            z = d(O);
          return a["default"].createElement(i.View, babelHelpers["extends"]({
            style: [m.container, k]
          }, v), a["default"].createElement(S, {
            width: C,
            height: C,
            style: {
              transform: [{
                rotate: f && g ? g.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"]
                }) : "0deg"
              }]
            }
          }, w && 1 !== O ? a["default"].createElement(E, {
            radius: R,
            offset: W,
            startAngle: M,
            endAngle: c,
            direction: s,
            stroke: w,
            strokeWidth: A
          }) : !1, f ? !1 : a["default"].createElement(E, {
            radius: R,
            offset: W,
            startAngle: 0,
            endAngle: M,
            direction: s,
            stroke: l,
            strokeWidth: A
          }), H ? a["default"].createElement(u["default"], {
            radius: C / 2,
            startAngle: 0,
            endAngle: (f ? 1.8 : 2) * Math.PI,
            stroke: r || l,
            strokeCap: T,
            strokeWidth: H
          }) : !1), y ? a["default"].createElement(i.View, {
            style: {
              position: "absolute",
              left: P,
              top: P,
              width: V,
              height: V,
              borderRadius: V / 2,
              alignItems: "center",
              justifyContent: "center"
            }
          }, a["default"].createElement(i.Text, {
            style: [{
              color: l,
              fontSize: "Compress" === z ? 8 : Math.round(V / 4),
              fontWeight: "300"
            }, x]
          }, z)) : !1, n);
        }
      }]), t;
    }(l.Component);
  g.propTypes = {
    animated: s["default"].bool,
    borderColor: s["default"].string,
    borderWidth: s["default"].number,
    color: s["default"].string,
    children: a["default"].PropTypes.node,
    direction: s["default"].oneOf(["clockwise", "counter-clockwise"]),
    formatText: s["default"].func,
    indeterminate: s["default"].bool,
    progress: s["default"].oneOfType([s["default"].number, s["default"].instanceOf(i.Animated.Value)]),
    rotation: s["default"].instanceOf(i.Animated.Value),
    showsText: s["default"].bool,
    size: s["default"].number,
    style: i.View.propTypes.style,
    textStyle: i.Text.propTypes.style,
    thickness: s["default"].number,
    unfilledColor: s["default"].string
  }, g.defaultProps = {
    borderWidth: 1,
    color: "rgba(0, 122, 255, 1)",
    direction: "clockwise",
    formatText: function (e) {
      return Math.round(100 * e) + "%";
    },
    progress: 0,
    showsText: !1,
    size: 40,
    thickness: 3
  }, o["default"] = (0, p["default"])(g);
});
