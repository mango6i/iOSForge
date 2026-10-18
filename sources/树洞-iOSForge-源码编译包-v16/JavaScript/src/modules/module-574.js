// Recovered module 574; analysis path, not original filename.
// Original SHA-256 37c885e470e2328b9d149b329146f6eda37b98cd70cd020aa4620292a025ff1a; original byte range [1557167, 1560125).
__d(574, function (e, t, a, r) {
  Object.defineProperty(r, "__esModule", {
    value: !0
  });
  var i = t(311),
    n = babelHelpers.interopRequireDefault(i),
    o = t(555),
    s = babelHelpers.interopRequireDefault(o),
    l = t(312),
    d = .3,
    u = d / (1 + d),
    p = function (e) {
      function t(e) {
        babelHelpers.classCallCheck(this, t);
        var a = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).call(this, e));
        a.handleLayout = function (e) {
          a.props.width || a.setState({
            width: e.nativeEvent.layout.width
          }), a.props.onLayout && a.props.onLayout(e);
        };
        var r = Math.min(Math.max(e.progress, 0), 1);
        return a.state = {
          width: 0,
          progress: new l.Animated.Value(e.indeterminate ? d : r),
          animationValue: new l.Animated.Value(u)
        }, a;
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "componentDidMount",
        value: function () {
          this.props.indeterminate && this.animate();
        }
      }, {
        key: "componentWillReceiveProps",
        value: function (e) {
          if (e.indeterminate !== this.props.indeterminate && (e.indeterminate ? this.animate() : l.Animated.spring(this.state.animationValue, {
            toValue: u
          }).start()), e.indeterminate !== this.props.indeterminate || e.progress !== this.props.progress) {
            var t = e.indeterminate ? d : Math.min(Math.max(e.progress, 0), 1);
            e.animated ? l.Animated.spring(this.state.progress, {
              toValue: t,
              bounciness: 0
            }).start() : this.state.progress.setValue(t);
          }
        }
      }, {
        key: "animate",
        value: function () {
          var e = this;
          this.state.animationValue.setValue(0), l.Animated.timing(this.state.animationValue, {
            toValue: 1,
            duration: 1e3,
            easing: l.Easing.linear,
            isInteraction: !1
          }).start(function (t) {
            t.finished && e.animate();
          });
        }
      }, {
        key: "render",
        value: function () {
          var e = this.props,
            t = e.borderColor,
            a = e.borderRadius,
            r = e.borderWidth,
            i = e.children,
            o = e.color,
            s = e.height,
            u = e.style,
            p = e.unfilledColor,
            h = e.width,
            b = babelHelpers.objectWithoutProperties(e, ["borderColor", "borderRadius", "borderWidth", "children", "color", "height", "style", "unfilledColor", "width"]),
            m = Math.max(0, h || this.state.width) - 2 * r,
            f = {
              width: h,
              borderWidth: r,
              borderColor: t || o,
              borderRadius: a,
              overflow: "hidden",
              backgroundColor: p
            },
            c = {
              backgroundColor: o,
              height: s,
              transform: [{
                translateX: this.state.animationValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [m * -d, m]
                })
              }, {
                translateX: this.state.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [m / -2, 0]
                })
              }, {
                scaleX: this.state.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1e-4, 1]
                })
              }]
            };
          return n["default"].createElement(l.View, babelHelpers["extends"]({
            style: [f, u],
            onLayout: this.handleLayout
          }, b), n["default"].createElement(l.Animated.View, {
            style: c
          }), i);
        }
      }]), t;
    }(i.Component);
  p.propTypes = {
    animated: s["default"].bool,
    borderColor: s["default"].string,
    borderRadius: s["default"].number,
    borderWidth: s["default"].number,
    children: s["default"].node,
    color: s["default"].string,
    height: s["default"].number,
    indeterminate: s["default"].bool,
    onLayout: s["default"].func,
    progress: s["default"].number,
    style: l.View.propTypes.style,
    unfilledColor: s["default"].string,
    width: s["default"].number
  }, p.defaultProps = {
    animated: !0,
    borderRadius: 4,
    borderWidth: 1,
    color: "rgba(0, 122, 255, 1)",
    height: 6,
    indeterminate: !1,
    progress: 0,
    width: 150
  }, r["default"] = p;
});
