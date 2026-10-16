// Recovered module 569; analysis path, not original filename.
// Original SHA-256 932bec87240437e356388c1a3fea2d77b3fd0b4a76a23698c1d692cf2f3e5a39; original byte range [1565279, 1567617).
__d(569, function (e, t, s, i) {
  function a(e, t) {
    var s,
      i,
      a = e.displayName || e.name || "Component";
    return i = s = function (s) {
      function i(e) {
        babelHelpers.classCallCheck(this, i);
        var t = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(i).call(this, e));
        return t.progressValue = Math.min(Math.max(e.progress, 0), 1), t.rotationValue = 0, t.state = {
          progress: new u.Animated.Value(t.progressValue),
          rotation: new u.Animated.Value(t.rotationValue)
        }, t;
      }
      return babelHelpers.inherits(i, s), babelHelpers.createClass(i, [{
        key: "componentDidMount",
        value: function () {
          var e = this;
          this.state.progress.addListener(function (t) {
            e.progressValue = t.value;
          }), this.state.rotation.addListener(function (t) {
            e.rotationValue = t.value;
          }), this.props.indeterminate && (this.spin(), t && u.Animated.spring(this.state.progress, {
            toValue: t
          }).start());
        }
      }, {
        key: "componentWillUnmount",
        value: function () {
          this.state.progress.removeAllListeners(), this.state.rotation.removeAllListeners();
        }
      }, {
        key: "componentWillReceiveProps",
        value: function (e) {
          var s = this;
          e.indeterminate !== this.props.indeterminate && (e.indeterminate ? this.spin() : u.Animated.spring(this.state.rotation, {
            toValue: this.rotationValue > .5 ? 1 : 0
          }).start(function (e) {
            e.finished && s.state.rotation.setValue(0);
          }));
          var i = e.indeterminate ? t || 0 : Math.min(Math.max(e.progress, 0), 1);
          i !== this.progressValue && (e.animated ? u.Animated.spring(this.state.progress, {
            toValue: i,
            bounciness: 0
          }).start() : this.state.progress.setValue(i));
        }
      }, {
        key: "spin",
        value: function () {
          var e = this;
          this.state.rotation.setValue(0), u.Animated.timing(this.state.rotation, {
            toValue: "counter-clockwise" === this.props.direction ? -1 : 1,
            duration: 1e3,
            easing: u.Easing.linear,
            isInteraction: !1
          }).start(function (t) {
            t.finished && e.spin();
          });
        }
      }, {
        key: "render",
        value: function () {
          return r["default"].createElement(e, babelHelpers["extends"]({}, this.props, {
            progress: this.props.animated ? this.state.progress : this.props.progress,
            rotation: this.state.rotation
          }));
        }
      }]), i;
    }(n.Component), s.displayName = "withAnimation(" + a + ")", s.propTypes = {
      animated: l["default"].bool,
      direction: l["default"].oneOf(["clockwise", "counter-clockwise"]),
      indeterminate: l["default"].bool,
      progress: l["default"].number.isRequired
    }, s.defaultProps = {
      animated: !0,
      indeterminate: !1,
      progress: 0
    }, i;
  }
  Object.defineProperty(i, "__esModule", {
    value: !0
  }), i["default"] = a;
  var n = t(311),
    r = babelHelpers.interopRequireDefault(n),
    o = t(555),
    l = babelHelpers.interopRequireDefault(o),
    u = t(312);
});
