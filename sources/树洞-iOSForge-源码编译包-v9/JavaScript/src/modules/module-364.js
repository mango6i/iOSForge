// Recovered module 364; analysis path, not original filename.
// Original SHA-256 53d2601951fa7443d818c61a8bf3eb88af7c062a27f08328ccc9c63acbe97ffe; original byte range [1877194, 1878225).
__d(364, function (t, e, n, o) {
  var i = e(311),
    r = babelHelpers.interopRequireDefault(i),
    a = e(312),
    s = e(314);
  o.BackButton = r["default"].createClass({
    displayName: "BackButton",
    getInitialState: function () {
      return {
        cnt: this.props.cnt
      };
    },
    componentDidMount: function () {
      this.props.onMount(this);
    },
    componentWillUnmount: function () {
      this.props.onUnMount(this);
    },
    render: function () {
      var t = this;
      return r["default"].createElement(a.TouchableOpacity, {
        style: [{
          flex: 1,
          flexDirection: "row",
          width: 44,
          height: 44,
          justifyContent: "center",
          alignItems: "center"
        }, s.theme.isIphoneX && {}],
        onPress: function () {
          return t.props.onPress(t);
        }
      }, r["default"].createElement(s.FontAwesome, {
        name: "angle-left",
        style: {
          paddingBottom: "android" == a.Platform.OS ? 2 : 1
        },
        size: 35,
        color: s.theme.deep8
      }), this.state.cnt ? r["default"].createElement(a.View, {
        style: {
          marginLeft: 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: s.theme.warn,
          justifyContent: "center",
          alignItems: "center"
        }
      }, r["default"].createElement(a.Text, {
        style: {
          fontSize: 12,
          color: s.theme.white
        }
      }, this.state.cnt > 99 ? "99" : this.state.cnt)) : null);
    }
  });
});
