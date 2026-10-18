// Recovered module 357; analysis path, not original filename.
// Original SHA-256 968cbc8fa89b0970ac234b953c01e6f43e4203898146f0e8648344b8ffba0411; original byte range [1699842, 1703576).
__d(357, function (e, t, n, i) {
  var s = t(311),
    a = babelHelpers.interopRequireDefault(s),
    o = t(312),
    l = t(314);
  i.NavTitleView = a["default"].createClass({
    displayName: "NavTitleView",
    getInitialState: function () {
      return {
        type: this.props.type ? this.props.type : "text",
        isFetching: l.apps.isFetching,
        text: this.props.text,
        userid: this.props.userid,
        customOption: {},
        networkFailed: l.apps.networkFailed
      };
    },
    onMsgsFetched: function () {
      l.apps.isFetching = !1, this.setState({
        isFetching: !1,
        networkFailed: !1
      });
    },
    onMsgsFetching: function () {
      l.apps.isFetching = !0, this.setState({
        isFetching: !0
      });
    },
    onNetworkFailed: function (e) {
      "active" === l.apps.appState && this.setState({
        networkFailed: e
      });
    },
    componentDidMount: function () {
      l.apps.on("msgsFetched", this.onMsgsFetched), l.apps.on("msgsFetching", this.onMsgsFetching), l.apps.on("networkFailed", this.onNetworkFailed), l.apps.on("customNavTitle", this.onCustomNavTitle), l.apps.on("cancelCustomNavTitle", this.onCancelCustomNavTitle);
    },
    componentWillUnmount: function () {
      l.apps.unon("msgsFetched", this.onMsgsFetched), l.apps.unon("msgsFetching", this.onMsgsFetching), l.apps.unon("networkFailed", this.onNetworkFailed), l.apps.unon("customNavTitle", this.onCustomNavTitle), l.apps.unon("cancelCustomNavTitle", this.onCancelCustomNavTitle);
    },
    onCustomNavTitle: function (e) {
      "custom" !== this.state.type && (this.prevType = this.state.type), this.setState({
        type: "custom",
        customOption: e
      });
    },
    onCancelCustomNavTitle: function () {
      this.customOption = {}, this.prevType && (this.setState({
        type: this.prevType
      }), this.prevType = null);
    },
    render: function () {
      return "custom" === this.state.type ? a["default"].createElement(o.View, {
        style: r.navbarTitleContainerView
      }, this.state.customOption.spinner ? a["default"].createElement(l.Spinner, {
        style: {
          width: 26,
          height: 26
        }
      }) : null, a["default"].createElement(o.Text, {
        style: {
          marginLeft: 5,
          color: l.theme.deep6,
          fontSize: 20
        }
      }, this.state.customOption.title)) : this.state.isFetching ? a["default"].createElement(o.View, {
        style: r.navbarTitleContainerView
      }, l.apps.spinner("small"), a["default"].createElement(o.Text, {
        style: {
          marginLeft: 5,
          color: l.theme.deep6,
          fontSize: 20
        }
      }, (0, l.tr)("Connecting..."))) : "user" === this.state.type ? a["default"].createElement(o.View, {
        style: r.navbarTitleContainerView
      }, this.state.networkFailed ? a["default"].createElement(o.TouchableOpacity, {
        style: {
          justifyContent: "center",
          alignItems: "center",
          height: 44,
          width: 34
        },
        onPress: function () {
          return l.apps.tip((0, l.tr)("Network Connection Failed. Please check your device network settings"));
        }
      }, a["default"].createElement(o.View, {
        style: {
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: l.theme.warn,
          justifyContent: "center",
          alignItems: "center"
        }
      }, a["default"].createElement(o.Text, {
        style: {
          color: l.theme.white,
          fontSize: 12,
          fontWeight: "bold",
          textAlignVertical: "center"
        }
      }, "!"))) : null, a["default"].createElement(l.NameText, {
        userid: this.props.userid,
        appends: this.props.space ? (0, l.tr)("") : "",
        style: r.navbarTitle
      })) : a["default"].createElement(o.View, {
        style: r.navbarTitleContainerView
      }, this.state.networkFailed ? a["default"].createElement(o.TouchableOpacity, {
        style: {
          justifyContent: "center",
          alignItems: "center",
          height: 44,
          width: 34
        },
        onPress: function () {
          return l.apps.tip((0, l.tr)("Network Connection Failed. Please check your device network settings"));
        }
      }, a["default"].createElement(o.View, {
        style: {
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: l.theme.warn,
          justifyContent: "center",
          alignItems: "center"
        }
      }, a["default"].createElement(o.Text, {
        style: {
          color: l.theme.white,
          fontSize: 12,
          fontWeight: "bold",
          textAlignVertical: "center"
        }
      }, "!"))) : null, a["default"].createElement(o.Text, {
        style: r.navbarTitle
      }, this.props.text));
    }
  });
  var r = {
    navbarTitleContainerView: [{
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center"
    }, l.theme.isIphoneX && {}],
    navbarTitle: {
      fontSize: 20,
      color: l.theme.deep6,
      paddingBottom: "android" == o.Platform.OS ? 3 : 0
    }
  };
});
