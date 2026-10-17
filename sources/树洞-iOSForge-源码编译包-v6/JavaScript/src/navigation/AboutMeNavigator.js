// Recovered module 343; analysis path, not original filename.
// Original SHA-256 d5beb948065efaa73f170071a8a7c7eadc8459702e2a146f05e069aaf6017a17; original byte range [1523700, 1529823).
__d(343, function (e, t, a, o) {
  Object.defineProperty(o, "__esModule", {
    value: !0
  }), o.AboutMeNavigator = void 0;
  var n = t(311),
    i = babelHelpers.interopRequireDefault(n),
    u = t(312),
    s = t(314),
    r = u.Navigator.NavigationBar.Styles,
    d = (r.General.TotalNavHeight, "android" === u.Platform.OS ? 25 : 0, o.AboutMeNavigator = i["default"].createClass({
      displayName: "AboutMeNavigator",
      getInitialState: function () {
        return this.isFoucusing = !1, this.routes = {
          aboutMe: {
            id: "aboutMe",
            name: (0, s.tr)("\u661f\u7a7a")
          },
          suSelect: {
            id: "suSelect",
            name: "suSelect"
          },
          cloudRepo: {
            id: "cloudRepo",
            name: (0, s.tr)("Cloud Files")
          },
          reg: {
            id: "reg",
            name: (0, s.tr)("Sign Up / Log In")
          },
          cselect: {
            name: (0, s.tr)("Select Region"),
            id: "cselect"
          },
          imagePicker: {
            name: (0, s.tr)("Image Picker"),
            id: "imagePicker"
          }
        }, {
          launched: !1
        };
      },
      onDidFocusCb: function () {
        s.apps.emitOnce("aboutMeNavigatorDidFocus");
      },
      addDidFocusCallback: function (e) {
        s.apps.on("aboutMeNavigatorDidFocus", e);
      },
      componentDidMount: function () {
        var e = this;
        s.apps.on("aboutMeTabPressed", function () {
          e.isFoucusing || "aboutMe" === s.apps.currentNavi && ("aboutMe" === s.apps.currentRoutes.aboutMe.name ? s.apps.showCmdBall && s.apps.newRouteTo("suSelect", {
            type: "muid"
          }) : e.navi.navBack());
        }), s.apps.on("launchAboutMeNav", function () {
          e.state.launched || e.setState({
            launched: !0
          });
        }), s.apps.launchAboutMeNavEmitted && (this.state.launched || this.setState({
          launched: !0
        }));
      },
      componentWillUnmount: function () {
        s.apps.unon("aboutMeTabPressed"), s.apps.unon("launchAboutMeNav");
      },
      navbarMappers: function () {
        var e = this;
        return {
          Title: function (e, t, a, o) {
            var n, u;
            return n = "text", u = e.name, e.id.match(/^suSelect_/) && "muid" === e.type && (u = (0, s.tr)("Multiple Login")), i["default"].createElement(s.NavTitleView, {
              type: n,
              text: u
            });
          },
          RightButton: function (t, a, o, n) {
            return s.apps.showCmdBall && t.id.match(/^suSelect_/) ? i["default"].createElement(u.TouchableOpacity, {
              style: d.navRightButton,
              onPress: function () {
                "suid" === t.type ? s.apps.suCreate() : e.navi.navForward(e.routes.reg);
              }
            }, i["default"].createElement(s.Ionicons, {
              name: "md-add",
              style: {
                paddingTop: 1
              },
              size: 29,
              color: s.theme.lighta
            })) : void 0;
          }
        };
      },
      suSelectLoaded: function (e, t) {
        "suid" === e.type ? s.apps.send("fetchSuList").then(function (e) {
          t.data = e.sus;
          var a = t.data.findIndex(function (e) {
              return /^=\w+$/.test(e.userid);
            }),
            o = t.data.splice(a, 1);
          t.data = o.concat(t.data), t.setState({
            loaded: !0,
            dataSource: t.state.dataSource.cloneWithRows(t.data)
          });
        })["catch"](function (e) {
          (0, s.tlog)("error", "suSelectLoaded", e);
        }) : s.apps.isIn(e.type, "auid", "ouid") ? (t.data = e.rs, t.setState({
          loaded: !0,
          dataSource: t.state.dataSource.cloneWithRows(t.data)
        }), "ouid" === e.type ? (s.apps.ouidData = t.data, s.apps.ouidViewRerender = function () {
          t.data = s.apps.ouidData, e.rs = t.data, t.setState({
            dataSource: t.state.dataSource.cloneWithRows(t.data)
          });
        }) : e.obw && (s.apps.obwData = t.data, s.apps.obwViewRerender = function () {
          t.data = s.apps.obwData, e.rs = t.data, t.setState({
            dataSource: t.state.dataSource.cloneWithRows(t.data)
          });
        })) : t.setState({
          loaded: !0,
          dataSource: t.state.dataSource.cloneWithRows(s.apps.multiLoginCnts)
        });
      },
      render: function () {
        var e = this;
        return this.state.launched ? i["default"].createElement(s.MyNavigator, babelHelpers["extends"]({}, this.props, {
          ref: function (t) {
            return e.navi = t;
          },
          renderSceneContent: this.renderSceneContent,
          navbarMappers: this.navbarMappers(),
          initialRoute: this.routes.aboutMe,
          onWillFocus: function (t) {
            e.isFoucusing = !0, s.apps.currentRoutes.aboutMe.name = t.id;
          },
          navBackCallback: function (t) {
            t.prevRoute && ("imagePicker" === t.prevRoute.id ? s.apps.notCloseImagePickerDiag ? delete s.apps.notCloseImagePickerDiag : s.apps.modelViewRef.state.showModelView && !s.apps.modelViewRef.locking && s.apps.closeDiag() : /^suSelect_/.test(t.prevRoute.id) && "auid" === t.prevRoute.type && /^suSelect_/.test(t.curRoute.id) && "ouid" === t.curRoute.type && (e.noOnDidFocus = !0)), s.apps.popNaviSwitch("aboutMe");
          },
          onDidFocus: function (t, a) {
            e.isFoucusing = !1, delete s.apps.multiLoginsRoute, e.onDidFocusCb(), a.prevRoute && "imagePicker" === a.prevRoute.id && (s.apps.unon("imagePicked"), s.apps.modelViewRef.unHide()), "cselect" === t.id ? s.apps.emit("loadRegionsPhoneCode") : t.id.match(/^suSelect_/) ? e.noOnDidFocus ? delete e.noOnDidFocus : s.apps.emit("suSelectViewLoaded_" + t.id, function (a) {
              return e.suSelectLoaded(t, a);
            }) : "cloudRepo" === t.id ? s.apps.emit("cloudRepoViewLoaded") : "aboutMe" === t.id ? s.apps.emit("aboutMeViewLoaded_" + s.apps.userid) : "cselect" === t.id ? s.apps.emit("loadRegionsPhoneCode") : "reg" === t.id && (s.apps.multiLoginsRoute = !0), s.apps.isIn(t.id, "cloudRepo", "cselect", "reg") ? s.apps.views.mainTabView && s.apps.views.mainTabView.show(!1) : s.apps.views.mainTabView && s.apps.views.mainTabView.show(!0);
          }
        })) : null;
      },
      renderSceneContent: function (e, t) {
        var a = this;
        return "aboutMe" === e.id ? i["default"].createElement(s.AboutMeView, {
          tab: "aboutMe",
          mainTab: !0,
          userid: s.apps.userid
        }) : "imagePicker" === e.id ? i["default"].createElement(s.MemTest, null) : e.id.match(/^suSelect_/) ? i["default"].createElement(s.SuSelectView, {
          type: e.type,
          route: e,
          onLongPressRow: function (t) {
            e.type && s.apps.addfTip(t.w, {
              pin: !0
            });
          },
          onPressRow: function (t) {
            if ("auid" === e.type || "muid" === e.type || "suid" === e.type) {
              var a = t.userid || t.u;
              e.tmp ? (s.apps.navSwitchCb("friends"), s.apps.newRouteTo("about", {
                friendId: a,
                name: (0, s.tr)("Profile")
              })) : s.apps.csInfoDiag("userCsInfo", a, "getProfMsgs");
            } else if ("ouid" === e.type) {
              var o = t.w,
                n = function (e) {
                  s.apps.closeDiag(function () {
                    s.apps.send("findObu", {
                      g: e,
                      w: o
                    }).then(function (e) {
                      s.apps.newRouteTo("suSelect", {
                        type: "auid",
                        obw: o,
                        rs: e.rs
                      });
                    })["catch"](function (e) {
                      (0, s.tlog)("error", "findObu", o, e);
                    });
                  });
                };
              s.apps.diag({
                header: (0, s.tr)("Tip"),
                content: o,
                buttons: [{
                  text: (0, s.tr)("No"),
                  onPress: function () {
                    return n();
                  }
                }, {
                  text: (0, s.tr)("1"),
                  onPress: function () {
                    return n(1);
                  }
                }, {
                  text: (0, s.tr)("2"),
                  onPress: function () {
                    return n(2);
                  }
                }]
              });
            }
          }
        }) : "reg" === e.id ? i["default"].createElement(s.SignView, {
          onCountrySelect: function () {
            return a.navi.navForward(a.routes.cselect);
          },
          country: this.routes.reg.country,
          phoneCode: this.routes.reg.phoneCode
        }) : "cselect" === e.id ? i["default"].createElement(s.SmsRegionView, {
          onRowPress: function (e) {
            var t = e.country,
              o = e.phoneCode;
            a.routes.reg.country = t, a.routes.reg.phoneCode = o, a.navi.navBack();
          }
        }) : "cloudRepo" === e.id ? i["default"].createElement(s.CloudRepoPicBoard, null) : null;
      }
    }), {
      navRightButton: [{
        flex: 1,
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center"
      }, s.theme.isIphoneX && {}]
    });
});
