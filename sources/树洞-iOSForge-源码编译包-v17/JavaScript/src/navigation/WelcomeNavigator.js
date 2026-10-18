// Recovered module 341; analysis path, not original filename.
// Original SHA-256 ce7882bc729292f6a8816c5529fdecee3abc4e628fd1e7b6a8ce8cbe4517f9f7; original byte range [1485460, 1489253).
__d(341, function (e, t, n, r) {
  Object.defineProperty(r, "__esModule", {
    value: !0
  }), r.WelcomeNavigator = void 0;
  var i = t(311),
    a = babelHelpers.interopRequireDefault(i),
    o = t(312),
    l = t(314),
    c = o.Navigator.NavigationBar.Styles,
    u = (c.General.TotalNavHeight, "android" === o.Platform.OS ? 25 : 0, r.WelcomeNavigator = a["default"].createClass({
      displayName: "WelcomeNavigator",
      getInitialState: function () {
        return this.routes = {
          welcome: {
            name: (0, l.tr)("Welcome"),
            id: "welcome"
          },
          reg: {
            name: (0, l.tr)("Sign Up / Log In"),
            id: "reg"
          },
          reg2: {
            name: (0, l.tr)("Sign Up / Log In"),
            id: "reg2"
          },
          cselect: {
            name: (0, l.tr)("Select Region"),
            id: "cselect"
          },
          imagePicker: {
            name: (0, l.tr)("Image Picker"),
            id: "imagePicker"
          }
        }, {};
      },
      onNavRightButtonPress: function (e, t) {},
      navbarMappers: function () {
        var e = this;
        return {
          Title: function (e, t, n, r) {
            return "reg2" === e.id ? null : a["default"].createElement(l.NavTitleView, {
              type: "text",
              text: e.name
            });
          },
          RightButton: function (t, n, r, i) {
            return a["default"].createElement(o.TouchableOpacity, {
              style: u.navRightButton,
              onPress: function () {
                return e.onNavRightButtonPress(t, n);
              }
            }, a["default"].createElement(o.Text, {
              style: u.navRightText
            }, t.rightButtonText));
          }
        };
      },
      render: function () {
        var e = this;
        return a["default"].createElement(l.MyNavigator, {
          ref: function (t) {
            return e.navi = t;
          },
          renderScene: this.renderScene,
          initialRoute: this.routes.reg2,
          navbarMappers: this.navbarMappers(),
          noNavBar: !0,
          renderSceneContent: this.renderSceneContent,
          onWillFocus: function (e) {
            l.apps.currentRoutes.welcome.name = e.id;
          },
          navBackCallback: function (e) {},
          onDidFocus: function (e, t) {
            t.prevRoute && "imagePicker" === t.prevRoute.id && (l.apps.unon("imagePicked"), l.apps.modelViewRef.unHide()), "cselect" === e.id ? l.apps.emit("loadRegionsPhoneCode") : (l.apps.quickLaunch = !1, l.apps.isInWelcomeNavi = !0, l.apps.emitOnce("quickStartFinished"), l.apps.checkForHvdown());
          }
        });
      },
      renderSceneContent: function (e, n) {
        var r = this;
        if ("reg" === e.id) return a["default"].createElement(l.SignView, {
          onCountrySelect: function () {
            return r.navi.navForward(r.routes.cselect);
          },
          country: this.routes.reg.country,
          phoneCode: this.routes.reg.phoneCode
        });
        if ("reg2" === e.id) return a["default"].createElement(l.SignView2, {
          ctx: this
        });
        if ("imagePicker" === e.id) return a["default"].createElement(l.MemTest, null);
        if ("webv" === e.id) ;else {
          if ("cselect" === e.id) return a["default"].createElement(l.SmsRegionView, {
            onRowPress: function (e) {
              var t = e.country,
                n = e.phoneCode;
              r.routes.reg.country = t, r.routes.reg.phoneCode = n, r.navi.navBack();
            }
          });
          if ("welcome" === e.id) return a["default"].createElement(o.View, {
            style: {
              flex: 1
            }
          }, a["default"].createElement(o.View, {
            style: {
              height: l.theme.navHeight
            }
          }), a["default"].createElement(l.BackgroundImageView, {
            maskColor: l.theme.lightLessTrans6
          }), a["default"].createElement(o.View, {
            style: {
              flex: 1,
              backgroundColor: l.theme.transparent,
              justifyContent: "center",
              alignItems: "center"
            }
          }, a["default"].createElement(o.View, {
            style: {
              marginTop: -100,
              justifyContent: "center",
              alignItems: "center"
            }
          }, a["default"].createElement(o.Image, {
            style: {
              flex: 1,
              width: l.theme.winWidth / 1.5,
              height: l.theme.winWidth / 1.5
            },
            source: t(388)
          }), a["default"].createElement(o.Text, {
            style: {
              fontSize: 35,
              color: "rgb(16,151,214)",
              marginBottom: 20
            }
          }, "Who U"), a["default"].createElement(o.Text, {
            style: {
              fontSize: 15,
              color: "rgb(16,151,214)"
            }
          }, "Make a new way to chat"), a["default"].createElement(o.Text, {
            style: {
              fontSize: 15,
              color: "rgb(16,151,214)"
            }
          }, "with who you like..."), a["default"].createElement(o.TouchableOpacity, {
            style: {
              marginTop: 50,
              paddingBottom: 11,
              paddingTop: 8,
              paddingHorizontal: 18,
              backgroundColor: "rgb(16,151,214)",
              borderRadius: 25,
              justifyContent: "center",
              alignItems: "center"
            }
          }, a["default"].createElement(o.Text, {
            style: {
              fontSize: 18,
              color: l.theme.white,
              fontWeight: "bold"
            }
          }, (0, l.tr)("Sign Up / Log In"))))));
        }
      }
    }), {
      navRightButton: {
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 10,
        height: l.theme.navHeight
      },
      navRightText: {
        fontSize: 13,
        color: l.theme.deep8
      }
    });
});
