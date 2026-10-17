// Recovered module 547; analysis path, not original filename.
// Original SHA-256 a51c0b95a9061713d163be700fc58081a5b73e8b205e905a2bcc2cd9faec6540; original byte range [715327, 716773).
__d(547, function (e, t, o, n) {
  function r(e, t) {
    var o, n;
    return n = o = function (e) {
      function o() {
        return babelHelpers.classCallCheck(this, o), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(o).apply(this, arguments));
      }
      return babelHelpers.inherits(o, e), babelHelpers.createClass(o, [{
        key: "updateIconSources",
        value: function (e) {
          var o = this;
          if (e.iconName && t(e.iconName, e.iconSize, e.iconColor).then(function (e) {
            return o.setState({
              icon: e
            });
          }), e.selectedIconName || e.selectedIconColor) {
            var n = e.selectedIconName || e.iconName,
              r = e.selectedIconColor || e.iconColor;
            t(n, e.iconSize, r).then(function (e) {
              return o.setState({
                selectedIcon: e
              });
            });
          }
        }
      }, {
        key: "componentWillMount",
        value: function () {
          this.updateIconSources(this.props);
        }
      }, {
        key: "componentWillReceiveProps",
        value: function (e) {
          var t = Object.keys(o.propTypes);
          (0, s["default"])((0, c["default"])(e, t), (0, c["default"])(this.props, t)) || this.updateIconSources(e);
        }
      }, {
        key: "render",
        value: function () {
          return u["default"].createElement(p.TabBarIOS.Item, babelHelpers["extends"]({}, this.props, this.state));
        }
      }]), o;
    }(a.Component), o.propTypes = {
      iconName: e.isRequired,
      selectedIconName: e,
      iconSize: a.PropTypes.number,
      iconColor: a.PropTypes.string,
      selectedIconColor: a.PropTypes.string
    }, o.defaultProps = {
      iconSize: 30
    }, n;
  }
  Object.defineProperty(n, "__esModule", {
    value: !0
  }), n["default"] = r;
  var l = t(438),
    s = babelHelpers.interopRequireDefault(l),
    i = t(546),
    c = babelHelpers.interopRequireDefault(i),
    a = t(311),
    u = babelHelpers.interopRequireDefault(a),
    p = t(435);
});
