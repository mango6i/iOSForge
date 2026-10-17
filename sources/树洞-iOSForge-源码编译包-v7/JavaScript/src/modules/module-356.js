// Recovered module 356; analysis path, not original filename.
// Original SHA-256 fd51d864ba51fafae34b6a56243ba62f76d0dc269de5e880c94c6370254ec16e; original byte range [1694605, 1699841).
__d(356, function (t, e, n, o) {
  Object.defineProperty(o, "__esModule", {
    value: !0
  }), o.MyNavigator = void 0;
  var i = e(311),
    a = babelHelpers.interopRequireDefault(i),
    s = e(312),
    r = e(314),
    u = s.Navigator.NavigationBar.Styles,
    l = (u.General.TotalNavHeight, "android" === s.Platform.OS ? 25 : 0, o.MyNavigator = a["default"].createClass({
      displayName: "MyNavigator",
      renderTipInfoIcon: function () {
        return "warn" == this.state.envInfoType ? a["default"].createElement(r.FontAwesome, {
          name: "warning",
          size: 23,
          color: r.theme.warningIcon
        }) : a["default"].createElement(s.ActivityIndicator, {
          animating: !0,
          size: "small"
        });
      },
      renderScene: function (t, e) {
        return a["default"].createElement(s.View, {
          style: l.navScene
        }, this.state.envInfo ? a["default"].createElement(s.View, {
          style: l.navSceneUp
        }, a["default"].createElement(s.ScrollView, {
          style: l.tipInfoContainer,
          contentContainerStyle: l.tipInfoContainerContent,
          horizontal: !0
        }, this.renderTipInfoIcon(), a["default"].createElement(s.Text, {
          style: l.tipInfoText
        }, this.state.envInfo))) : null, a["default"].createElement(s.View, {
          style: l.navSceneDown
        }, this.props.renderSceneContent(t, e)));
      },
      getInitialState: function () {
        if (this.props.initialRouteStack) {
          var t = this.props.initialRouteStack;
          this.routeList = t, this.curRoute = t[t.length - 1];
        } else this.routeList = [this.props.initialRoute], this.curRoute = this.props.initialRoute;
        return {
          envInfo: "",
          envInfoType: "warn"
        };
      },
      getDefaultProps: function () {
        return {
          navbarMappers: {},
          onDidFocus: function () {},
          onWillFocus: function () {}
        };
      },
      componentDidMount: function () {
        var t = this;
        r.apps.on("envInfoShow", function (e, n) {
          t.setState({
            envInfo: e + "",
            envInfoType: n
          });
        }), r.apps.on("envInfoClose", function () {
          t.setState({
            envInfo: ""
          });
        });
      },
      componentWillUnmount: function () {
        r.apps.unon("envInfoShow"), r.apps.unon("envInfoClose");
      },
      navToTop: function () {
        this.routeList = [this.props.initialRoute], this.curRoute = this.props.initialRoute, r.apps.closeInputPanel(), this.navi.popToTop();
      },
      navToRoute: function (t) {
        for (var e = [], n = !1, o = 0; o < this.routeList.length; o++) {
          var i = this.routeList[o];
          if (e.push(i), i === t) {
            n = !0;
            break;
          }
        }
        return n ? (this.curRoute = e[e.length - 1], this.routeList = e, r.apps.closeInputPanel(), void this.navi.popToRoute(t)) : (this.navToTop(), void r.apps.closeInputPanel());
      },
      immediatelyResetRouteStack: function (t) {
        this.routeList = t, this.navi.immediatelyResetRouteStack(t);
      },
      navForward: function (t, e) {
        if (!this.lock) {
          r.apps.closeInputPanel(), this.prevRoute = this.curRoute;
          var n = this.routeList.indexOf(t);
          -1 !== n ? (0, r.tlog)("error", "navForward route exists", this.routeList, t) : (this.routeList.push(t), this.curRoute = t, this.naviLock(), this.navi.push(t, e));
        }
      },
      navPopAtIndex: function (t) {
        this.routeList.splice(t, 1), this.navi.popAtIndex(t);
      },
      navReplace: function (t) {
        this.routeList.pop(), this.routeList.push(t), this.curRoute = t, r.apps.closeInputPanel(), this.navi.replace(t);
      },
      navBack: function () {
        this.lock || this.routeList.length > 1 && (this.naviLock(), this.prevRoute = this.routeList.pop(), this.curRoute = this.routeList[this.routeList.length - 1], r.apps.closeInputPanel(), this.navi.pop(), this.props.navBackCallback && this.props.navBackCallback(this));
      },
      onWillFocus: function (t) {
        this.props.onWillFocus(t, this);
      },
      onDidFocus: function (t) {
        this.lock = !1, this.props.onDidFocus(t, this);
      },
      naviLock: function () {
        this.lock = !0;
      },
      onGesturePop: function () {
        return this.lock ? void (0, r.tlog)("error", "onGesturePop locking") : void (this.routeList.length > 1 && (this.naviLock(), this.prevRoute = this.routeList.pop(), this.curRoute = this.routeList[this.routeList.length - 1], r.apps.closeInputPanel(), this.props.navBackCallback && this.props.navBackCallback(this), this.props.onGesturePop && this.props.onGesturePop(this.curRoute, this.prevRoute)));
      },
      render: function () {
        var t = this;
        return a["default"].createElement(s.Navigator, babelHelpers["extends"]({
          ref: function (e) {
            return t.navi = e;
          }
        }, this.props, {
          onWillFocus: this.onWillFocus,
          onDidFocus: this.onDidFocus,
          onGesturePop: this.onGesturePop,
          renderScene: this.renderScene,
          navigationBar: this.props.noNavBar ? null : this.renderNavbar(this.props.navbarMappers)
        }));
      },
      renderNavbar: function (t) {
        var e = this,
          n = babelHelpers["extends"]({
            Title: function (t, e, n, o) {
              return a["default"].createElement(r.NavTitleView, {
                type: "text",
                text: t.name
              });
            },
            LeftButton: function (t, n, o, i) {
              return t !== e.routeList[0] ? a["default"].createElement(s.TouchableOpacity, {
                style: l.navLeftButton,
                onPress: function () {
                  return e.navBack();
                }
              }, a["default"].createElement(r.FontAwesome, {
                name: "angle-left",
                style: {
                  paddingBottom: "android" == s.Platform.OS ? 2 : 1
                },
                size: 35,
                color: r.theme.deep8
              })) : void 0;
            },
            RightButton: function (t, e, n, o) {}
          }, t);
        return a["default"].createElement(s.Navigator.NavigationBar, {
          style: [{
            backgroundColor: r.theme.navbarBgColor
          }, r.apps.blackWhiteMode && {
            borderBottomColor: "#ddd",
            borderBottomWidth: r.theme.px1
          }],
          routeMapper: n
        });
      }
    }), {
      navScene: {
        flex: 1,
        backgroundColor: r.theme.light
      },
      navSceneUp: {
        height: 35
      },
      navSceneDown: {
        flex: 1
      },
      navbarTitleContainerView: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
      },
      navbarTitle: {
        fontSize: 20,
        color: r.theme.deep6,
        paddingBottom: "android" == s.Platform.OS ? 3 : 0
      },
      navLeftButton: [{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center"
      }, r.theme.isIphoneX && {}],
      tipInfoContainer: {
        width: r.theme.winWidth,
        height: 35,
        backgroundColor: r.theme.info
      },
      tipInfoContainerContent: {
        justifyContent: "center",
        alignItems: "center",
        height: 35,
        paddingHorizontal: 15
      },
      tipInfoText: {
        marginLeft: 10,
        color: r.theme.deep5,
        fontSize: 15
      }
    });
});
