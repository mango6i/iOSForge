// Recovered module 436; analysis path, not original filename.
// Original SHA-256 b9ee1079ac3c1c13a319af0fc5ddbf9077e49aa9a316f0a4996586db989beae6; original byte range [694854, 696803).
__d(436, function (e, t, r, l) {
  function o(e) {
    var t, r;
    return r = t = function (t) {
      function r() {
        return babelHelpers.classCallCheck(this, r), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(r).apply(this, arguments));
      }
      return babelHelpers.inherits(r, t), babelHelpers.createClass(r, [{
        key: "render",
        value: function () {
          var t = this.props,
            r = t.style,
            l = (t.iconStyle, t.children),
            o = babelHelpers.objectWithoutProperties(t, ["style", "iconStyle", "children"]),
            s = (0, c["default"])(o, Object.keys(f.Text.propTypes), "style", "name", "size", "color"),
            a = (0, c["default"])(o, Object.keys(f.TouchableHighlight.propTypes));
          o = (0, p["default"])(o, Object.keys(s), Object.keys(a), "iconStyle", "borderRadius", "backgroundColor"), s.style = this.props.iconStyle ? [y.icon, this.props.iconStyle] : y.icon;
          var i = (0, c["default"])(this.props, "color"),
            u = (0, c["default"])(this.props, "backgroundColor", "borderRadius");
          return (0, n["default"])(l) && (l = d["default"].createElement(f.Text, {
            style: [y.text, i]
          }, l)), d["default"].createElement(f.TouchableHighlight, babelHelpers["extends"]({
            style: [y.touchable, u]
          }, a), d["default"].createElement(f.View, babelHelpers["extends"]({
            style: [y.container, u, r]
          }, o), d["default"].createElement(e, s), l));
        }
      }]), r;
    }(b.Component), t.propTypes = {
      backgroundColor: b.PropTypes.string,
      borderRadius: b.PropTypes.number,
      color: b.PropTypes.string,
      size: b.PropTypes.number
    }, t.defaultProps = {
      backgroundColor: h,
      borderRadius: 5,
      color: "white",
      size: 20
    }, r;
  }
  Object.defineProperty(l, "__esModule", {
    value: !0
  }), l["default"] = o;
  var s = t(438),
    a = (babelHelpers.interopRequireDefault(s), t(517)),
    n = babelHelpers.interopRequireDefault(a),
    i = t(527),
    p = babelHelpers.interopRequireDefault(i),
    u = t(546),
    c = babelHelpers.interopRequireDefault(u),
    b = t(311),
    d = babelHelpers.interopRequireDefault(b),
    f = t(435),
    y = f.StyleSheet.create({
      container: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: 8
      },
      touchable: {
        overflow: "hidden"
      },
      icon: {
        marginRight: 10
      },
      text: {
        fontWeight: "600",
        backgroundColor: "transparent"
      }
    }),
    h = "#007AFF";
});
