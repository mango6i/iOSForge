// Maintenance source; recovered reference retained separately.
// Maintenance source; recovered reference retained separately.
__d(310, function (e, t, a, i) {
  var __recoveryFreePolicy = t(9000);
  Object.defineProperty(i, "__esModule", {
    value: !0
  });
  var n = t(311),
    o = babelHelpers.interopRequireDefault(n),
    s = t(312),
    r = t(314),
    l = s.Navigator.NavigationBar.Styles;
  l.General.TotalNavHeight, "android" === s.Platform.OS ? 25 : 0;
  try {
    "ios" === s.Platform.OS && r.StatusBarManager.getHeight(function (e) {
      s.StatusBarIOS.currentHeight = e.height;
    });
  } catch (p) {
    console.error(p);
  }
  console.disableYellowBox = !0, i.MemTest = o["default"].createClass({
    displayName: "MemTest",
    render: function () {
      return o["default"].createElement(r.MemTest, null);
    }
  });
  var u = (o["default"].createClass({
      displayName: "ThemeChanger",
      getInitialState: function () {
        return this.footerY = 0, this.prevDis = 0, this.left = 0, {
          noThemeChangerButton: r.apps.noThemeChangerButton
        };
      },
      themeChangerButtonChanged: function () {
        this.setState({
          noThemeChangerButton: r.apps.noThemeChangerButton
        });
      },
      onDbIsReady: function () {
        this.setState({});
      },
      componentDidMount: function () {
        r.apps.on("themeChangerButtonChanged", this.themeChangerButtonChanged), r.apps.on("dbIsReady", this.onDbIsReady);
      },
      render: function () {
        return null;
      }
    }), o["default"].createClass({
      displayName: "Main",
      getInitialState: function () {
        return this.welcomeRouteHist = [], this.tabState = {
          index: 0,
          onPressBack: null
        }, {
          interActionFinished: !0,
          interActionTips: "",
          rootNavigator: "",
          interactionBarInfoText: "",
          interactionBarInfoType: "spin",
          friendsNavFlex: 1,
          mySpaceNavFlex: 0,
          aboutMeNavFlex: 0,
          statusBarDiff: 0,
          quickLaunch: !0
        };
      },
      onKeyboardWillShow: function (e) {
        r.apps.isDismissingKeyboard || (r.apps.isKeyboardShow = !0, r.apps.emit("keyboardShow", e));
      },
      onKeyboardWillHide: function (e) {
        r.apps.isDismissingKeyboard = !1, r.apps.isKeyboardShow = !1, r.apps.emit("keyboardHide", e);
      },
      androidBackButtonHandle: function () {
        "android" == s.Platform.OS && s.BackAndroid.addEventListener("hardwareBackPress", function () {
          if (r.apps.pickingViewShowing) return r.apps.popClose(), !0;
          if (r.apps.contextMenusRef.state.showContextMenu) {
            if (!r.apps.contextMenusRef.modal) return r.apps.emit("closeContextMenu"), !0;
          } else {
            if (r.apps.modelImageViewRef[r.apps.curMseq] && r.apps.modelImageViewRef[r.apps.curMseq].state.display) return r.apps.closeAllModelView(), !0;
            if (!r.apps.modelViewRef.state.showModelView || r.apps.modelViewRef.state.mtop) return r.apps.views.webBrowser.isShow ? (r.apps.views.webBrowser && r.apps.views.webBrowser.close(), !0) : r.apps.searchKey ? (r.apps.emit("clearSearchKey"), !0) : r.apps.suSearchKey && /^suSelect_/.test(r.apps.curNavigator.navi.curRoute.id) && "ouid" === r.apps.curNavigator.navi.curRoute.type ? (r.apps.emit("clearSuSearchKey"), !0) : r.apps.curNavigator && r.apps.curNavigator.navi.routeList.length > 1 ? (r.apps.curNavigator.navi.navBack(), !0) : (s.NativeModules.FrescoModule.clearCache(), !1);
            if (!r.apps.modelViewRef.locking) return r.apps.closeDiag(), !0;
          }
        });
      },
      keyboardHandle: function () {
        "android" === s.Platform.OS ? (s.Keyboard.addListener("keyboardDidShow", this.onKeyboardWillShow), s.Keyboard.addListener("keyboardDidHide", this.onKeyboardWillHide)) : (s.Keyboard.addListener("keyboardWillShow", this.onKeyboardWillShow), s.Keyboard.addListener("keyboardWillHide", this.onKeyboardWillHide));
      },
      addIosStatusBarChangeEvent: function () {
        var e = this;
        if ("ios" === s.Platform.OS) {
          var t = function (t) {
              r.apps.statusBarDiff = t, e.setState({
                statusBarDiff: t
              }), r.apps.emit("statusBarDiffChanged", t);
            },
            a = s.StatusBarIOS.currentHeight - 20;
          a > 0 && t(a), s.StatusBarIOS.addListener("statusBarFrameWillChange", function (e) {
            var a = e.frame.height;
            (0, r.tlog)("status height will change: " + a), t(a - 20);
          });
        }
      },
      componentWillUnmount: function () {
        r.apps.unon("appLaunchEnd"), r.apps.unon("closeModelView"), s.AppState.removeEventListener("change", this.handleAppStateChange);
      },
      componentDidMount: function () {
        var e = this;
        "ios" === s.Platform.OS && r.SplashScreen.hide(), r.apps.on("quickStartFinished", function () {
          e.lazy_componentWillMount(), e.lazy_componentDidMount(), e.setState({
            quickLaunch: !1
          });
        }), r.apps.on("switchMainTab", function (t, a) {
          e.setState(t, a);
        }), r.apps.on("appLaunchEnd", function (t, a) {
          (0, r.tlog)("appLaunchEnd", t, r.apps.fnow()), r.apps.launchState = t, "normal" === t ? (r.apps.friendsUnread[r.apps.userid] = [], r.apps.currentNavi = "friends", e.setState({
            rootNavigator: "friends",
            friendsNavFlex: 1,
            mySpaceNavFlex: 0,
            aboutMeNavFlex: 0
          }, function () {
            r.apps.isInWelcomeNavi && delete r.apps.isInWelcomeNavi, r.apps.curNavigator = r.apps.friendsNavigator, a && a();
          })) : "register" === t && (r.apps.currentNavi = "welcome", e.setState({
            rootNavigator: "welcome"
          }, function () {
            a && a();
          }));
        }), r.apps.launch();
      },
      lazy_componentWillMount: function () {
        r.fs.firstLoadSuccessful(), s.AppState.addEventListener("change", this.handleAppStateChange), s.AppState.addEventListener("memoryWarning", function () {
          r.apps.showCmdBall && r.apps.tip("Memory running low !!!");
        }), s.NetInfo.fetch().then(function (e) {
          e = e.toLowerCase(), r.apps.prevNetworkType = e, r.apps.isWifi = !1, r.apps.isNetworkConnected = "none" !== e && "unknown" !== e, (0, r.tlog)("netInfo fetch", e, r.apps.prevNetworkType, r.apps.isNetworkConnected, r.apps.fnow());
          var t = function (e) {
            e = e.toLowerCase(), r.apps.isWifi = !1, r.apps.isNetworkConnected = "none" !== e && "unknown" !== e, (0, r.tlog)("netInfo fetch", e, r.apps.prevNetworkType, r.apps.isNetworkConnected, r.apps.fnow()), "none" === e && (0, r.tlog)("error", "netchange none"), r.apps.prevNetworkType = e;
          };
          s.NetInfo.addEventListener("change", t);
        })["catch"](function (e) {
          (0, r.tlog)("error", "NetInfo fetch", e);
        }), s.NativeAppEventEmitter.addListener("appCrash", function (e) {
          (0, r.tlog)("appCrash", e);
        }), s.NativeAppEventEmitter.addListener("aliAuth", function (e) {
          if ((0, r.tlog)("aliAuth", e), e.token) {
            if (e.phn) {
              if (r.apps.userid) var t = r.apps.getUserShadowId(r.apps.userid),
                a = t.userid;
              r.fs.greetings("aliAuth_" + r.apps.deviceUuid).then(function (t) {
                return r.apps.post("/api/aliAuth", {
                  token: e.token,
                  phn: e.phn,
                  deviceId: r.apps.deviceId,
                  userid: a,
                  passwd: r.apps.mpasswd,
                  greetings: t
                });
              }).then(function (t) {
                r.apps.popClose(function () {
                  return r.apps.emit("aliAuthOk", e, t);
                });
              })["catch"](function (e) {
                (0, r.tlog)("error", "aliAuth", e), r.apps.popClose(function () {
                  return r.apps.diag({
                    header: (0, r.tr)("Tip"),
                    content: (0, r.tr)("Connection Failed"),
                    buttons: [{
                      text: (0, r.tr)("Try Again"),
                      onPress: function (e) {
                        r.apps.closeDiag(function () {
                          return r.apps.emit("aliAuthErr");
                        });
                      }
                    }]
                  });
                });
              });
            } else r.apps.needUpdate();
          } else r.apps.emit("aliAuthOk", e);
        }), s.NativeAppEventEmitter.addListener("audioInterrupted", function () {
          r.apps.tip("Audio play interrupted"), r.apps.emitOnce("stopAudioPlay");
        }), s.ExceptionsManager.ExceptionEventEmitter.addListener("jsRuntimeException", function (e, t) {
          var a = (0, r.tr)("An error occurred and the app needs to be restarted");
          r.apps.showCmdBall && (a += "\n" + e + "\n" + t[0].methodName + ":" + t[0].lineNumber), e = "ExceptionsManager " + e, t = "\n" + t.map(function (e) {
            return e.methodName + ":" + e.lineNumber;
          }).join("\n"), (0, r.tlog)("error", "clientFatalLog", {
            message: e,
            stack: t
          }), r.apps.lastClientFatalTime && Date.now() - r.apps.lastClientFatalTime < 1e3 && e === r.apps.lastClientFatalMsg || (r.apps.lastClientFatalMsg = e, r.apps.lastClientFatalTime = Date.now(), r.apps.send("clientFatalLog", {
            msg: e,
            stack: t
          }).then(function () {
            /but only one callback may/.test(e) ? (0, r.tlog)("error", e, t) : r.apps.diag({
              header: (0, r.tr)("Error"),
              content: a,
              buttons: [{
                text: (0, r.tr)("Cancel"),
                onPress: function () {
                  return r.apps.closeDiag();
                }
              }, {
                text: (0, r.tr)("Ok"),
                onPress: function () {
                  r.apps.reloadHvdown();
                }
              }]
            });
          })["catch"](function (e) {
            (0, r.tlog)("error", "send clientFatalLog", e);
          }));
        });
      },
      lazy_componentDidMount: function () {
        this.androidBackButtonHandle(), this.keyboardHandle(), this.addIosStatusBarChangeEvent(), "ios" === s.Platform.OS && r.apps.pushNotification.setApplicationIconBadgeNumber(0);
      },
      handleAppStateChange: function (e) {
        var t = Date.now();
        return (0, r.tlog)("Change appstate", e, r.apps.fnow()), "iosWillBg" === e ? void (r.apps.isPurchasing && void 0) : "iosDidActive" === e ? void (r.apps.isPurchasing && void 0) : (r.apps.appState = e, delete r.apps.lastPickOk, "in" === r.apps.tmpAppStateChange ? void (r.apps.tmpAppStateChange = "out") : "out" === r.apps.tmpAppStateChange ? void delete r.apps.tmpAppStateChange : ("iosBg" === e && (r.apps.iosBg = 1, r.apps.lastChangeToBackgroundTime = t, r.apps.isPurchasing && void 0), void ("active" === e ? ((0, r.tlog)("appState", e, this.state.rootNavigator), "/a/d22.jpg" !== r.apps.customBg && r.apps.reloadHvdown(), r.apps.clearDeletedShares(), r.apps.showCmdBall && r.apps.checkOtherDataCenter(), r.apps.checkPermissions(), r.apps.iosBg = 0, setTimeout(function () {
          delete r.apps.goCheckingRun;
        }, 7e3), "ios" === s.Platform.OS ? (s.StatusBarIOS.setHidden(!1), r.apps.pushNotification.setApplicationIconBadgeNumber(0)) : r.PushNotificationAndroid.clearAll(), r.apps.isFetchingUnread = !1, r.apps.deletedShareId = {}, r.apps.restartBottleResLoop(), r.apps.handleUreadCallbacks.length && (r.apps.runUreadCallbacks = r.apps.handleUreadCallbacks, r.apps.handleUreadCallbacks = []), "welcome" !== this.state.rootNavigator && r.apps.launchConnect("active")) : (r.apps.emitOnce("stopAudioPlay"), r.apps.emit("stopAudioRecord"), r.apps.pickStoryTimeIntv = 1e3, r.dbs.clearOldLog(), "background" === e && ("android" === s.Platform.OS && (r.apps.lastChangeToBackgroundTime = t, /xiaomi/i.test(r.apps.deviceFrom) && r.EggNetService.clearXiaomiNotification()), (0, r.tlog)("appState", e, r.apps.lastChangeToBackgroundTime), r.apps.msgerUrlsIsNew = !1, r.apps.importantSync = !1, r.apps.emit("toggleEmo", !1), r.apps.isSendUriVideo = {}, clearTimeout(r.apps.onCloseReconnectTimer), r.apps.webServiceGifData.length > 200 && (r.apps.webServiceGifData = [], r.apps.webServiceGifPos = "", r.apps.webServiceGifSearchKey = ""))))));
      },
      renderRootNavigator: function () {
        return "welcome" === this.state.rootNavigator ? o["default"].createElement(r.WelcomeNavigator, {
          ref: function (e) {
            return r.apps.curNavigator = e;
          }
        }) : "friends" === this.state.rootNavigator ? o["default"].createElement(s.View, {
          style: {
            flex: 1
          }
        }, o["default"].createElement(r.FriendsNavigator, {
          ref: function (e) {
            return r.apps.friendsNavigator = e;
          },
          style: {
            position: "absolute",
            top: this.state.friendsNavFlex ? 0 : r.theme.winHeight,
            left: 0,
            height: r.theme.winHeight,
            width: r.theme.winWidth
          }
        }), o["default"].createElement(r.MySpaceNavigator, {
          ref: function (e) {
            return r.apps.mySpaceNavigator = e;
          },
          style: {
            position: "absolute",
            top: this.state.mySpaceNavFlex ? 0 : r.theme.winHeight,
            left: 0,
            height: r.theme.winHeight,
            width: r.theme.winWidth
          }
        }), o["default"].createElement(r.AboutMeNavigator, {
          ref: function (e) {
            return r.apps.aboutMeNavigator = e;
          },
          style: {
            position: "absolute",
            top: this.state.aboutMeNavFlex ? 0 : r.theme.winHeight,
            left: 0,
            height: r.theme.winHeight,
            width: r.theme.winWidth
          }
        })) : void 0;
      },
      render: function () {
        return o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: r.theme.winWidth,
            backgroundColor: r.theme.light,
            height: r.theme.mainHeight
          }
        }, this.renderRootNavigator(), this.state.quickLaunch ? null : o["default"].createElement(r.SideEmoView, {
          ref: function (e) {
            return r.apps.sideEmoViewRef = e;
          }
        }), this.state.quickLaunch ? null : o["default"].createElement(r.SideEmoSuggestionView, null), this.state.rootNavigator && "welcome" !== this.state.rootNavigator ? o["default"].createElement(r.MyInputView, {
          statusBarDiff: this.state.statusBarDiff,
          ref: function (e) {
            return r.apps.myInputViewRef = e;
          }
        }) : null, this.state.quickLaunch ? null : o["default"].createElement(r.WebBrowserView, {
          ref: function (e) {
            return r.apps.views.webBrowser = e;
          }
        }), this.state.quickLaunch ? null : o["default"].createElement(r.MyCameraView, null), this.state.quickLaunch ? null : o["default"].createElement(y, babelHelpers["extends"]({
          mseq: "",
          ref: function (e) {
            return r.apps.modelImageViewRef[""] = e;
          }
        }, this.state.modelImageProps)), this.state.quickLaunch ? null : o["default"].createElement(y, babelHelpers["extends"]({
          mseq: "1",
          ref: function (e) {
            return r.apps.modelImageViewRef[1] = e;
          }
        }, this.state.modelImageProps)), this.state.quickLaunch ? null : o["default"].createElement(y, babelHelpers["extends"]({
          mseq: "2",
          ref: function (e) {
            return r.apps.modelImageViewRef[2] = e;
          }
        }, this.state.modelImageProps)), this.state.quickLaunch ? null : o["default"].createElement(y, babelHelpers["extends"]({
          mseq: "3",
          ref: function (e) {
            return r.apps.modelImageViewRef[3] = e;
          }
        }, this.state.modelImageProps)), this.state.quickLaunch ? null : o["default"].createElement(y, babelHelpers["extends"]({
          mseq: "4",
          ref: function (e) {
            return r.apps.modelImageViewRef[4] = e;
          }
        }, this.state.modelImageProps)), this.state.quickLaunch ? null : o["default"].createElement(m, {
          ref: function (e) {
            return r.apps.progressingView = e;
          }
        }), this.state.quickLaunch ? null : o["default"].createElement(r.ModelView, babelHelpers["extends"]({
          ref: function (e) {
            return r.apps.modelViewRef = e;
          }
        }, this.state.modelViewProps)), this.state.quickLaunch ? null : o["default"].createElement(r.CaveView, {
          ref: function (e) {
            return r.apps.caveViewRef = e;
          }
        }), this.state.quickLaunch ? null : o["default"].createElement(g, {
          ref: function (e) {
            return r.apps.contextMenusRef = e;
          },
          menus: this.state.contextMenus
        }), this.state.quickLaunch ? null : o["default"].createElement(f, {
          ref: function (e) {
            return r.apps.pickingView = e;
          }
        }), this.state.quickLaunch ? null : o["default"].createElement(h, null), o["default"].createElement(r.CmdView, {
          onEnter: function (e) {
            return r.apps.emit("cmd", e, function () {});
          },
          store: r.apps
        }), this.state.quickLaunch ? null : o["default"].createElement(d, null), this.state.quickLaunch ? null : o["default"].createElement(c, null), "ios" === s.Platform.OS ? null : o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: r.theme.winWidth,
            backgroundColor: "dark" === r.theme.type ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.07)",
            height: r.theme.androidStatusHeight
          }
        }), this.state.quickLaunch ? null : o["default"].createElement(t(9007), null), this.state.quickLaunch ? null : o["default"].createElement(t(9006), null), this.state.quickLaunch ? null : o["default"].createElement(t(9003), null));
      }
    })),
    d = o["default"].createClass({
      displayName: "WarningBar",
      getInitialState: function () {
        return this.timer = null, {
          show: !1,
          info: ""
        };
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("warningBarShow", function (t) {
          clearTimeout(e.timer), e.setState({
            show: !0,
            info: t
          }, function () {
            e.timer = setTimeout(function () {
              e.setState({
                show: !1,
                info: ""
              });
            }, 5e3);
          });
        });
      },
      componentWillUnmount: function () {
        r.apps.unon("warningBarShow");
      },
      render: function () {
        return this.state.show ? o["default"].createElement(s.ScrollView, {
          horizontal: !0,
          contentContainerStyle: {
            paddingHorizontal: 10,
            paddingTop: 8
          },
          style: {
            position: "absolute",
            width: r.theme.winWidth,
            height: r.theme.barHeight,
            backgroundColor: r.theme.warn,
            left: 0,
            top: r.theme.navHeight
          }
        }, o["default"].createElement(s.Text, {
          style: {
            color: r.theme.white,
            fontSize: 15
          }
        }, this.state.info)) : null;
      }
    }),
    c = o["default"].createClass({
      displayName: "GlobalSpinner",
      getInitialState: function () {
        return this.modal = !1, {
          tips: "",
          show: !1
        };
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("interactionBlockOpen", function (t) {
          "modal" === t && (e.modal = !0), "sys" === t && (e.sysSpin = !0), e.setState({
            show: !0
          });
        }), r.apps.on("interactionBlockClose", function () {
          e.modal = !1, delete e.sysSpin, e.setState({
            show: !1
          });
        });
      },
      componentWillUnmount: function () {
        r.apps.unon("interactionBlockOpen"), r.apps.unon("interactionBlockClose");
      },
      render: function () {
        var e = this;
        return this.state.show ? o["default"].createElement(r.InterActionSpinner, {
          ref: function (e) {
            return r.apps.views.globalSpinner = e;
          },
          onPress: function () {
            e.modal || e.setState({
              show: !1
            });
          },
          glass: !1,
          shouldSpin: !0,
          sysSpin: this.sysSpin,
          tips: this.state.interActionTips
        }) : null;
      }
    }),
    h = o["default"].createClass({
      displayName: "TipView",
      getInitialState: function () {
        return {
          tip: "",
          display: !1,
          top: (r.theme.winHeight - r.theme.statusHeightAll) / 2 - 15
        };
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("showTipView", function (t, a, i) {
          var n = {
            display: !0,
            tip: t
          };
          a && (n.top = a), e.setState(n, function () {
            setTimeout(function () {
              return e.setState({
                display: !1,
                tip: "",
                top: (r.theme.winHeight - r.theme.statusHeightAll) / 2 - 15
              });
            }, i || 1e3);
          });
        });
      },
      componentWillUnmount: function () {
        r.apps.unon("showTipView");
      },
      render: function () {
        return this.state.display ? o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            top: this.state.top,
            height: 30,
            width: r.theme.winWidth,
            backgroundColor: r.theme.transparent,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.1)",
            paddingHorizontal: 15,
            paddingVertical: 2,
            borderRadius: 3
          }
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 18,
            color: r.theme.white,
            paddingBottom: 1
          }
        }, this.state.tip))) : null;
      }
    }),
    m = (o["default"].createClass({
      displayName: "WelcomeView",
      getInitialState: function () {
        return {
          bounceValue: new s.Animated.Value(0),
          bounceValueOpacity: new s.Animated.Value(1)
        };
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("showWelcomeView", function (t) {
          e.state.bounceValue.setValue(1.8), s.Animated.spring(e.state.bounceValue, {
            toValue: 1,
            friction: 35,
            tension: 90
          }).start(), e.setState({
            showWelcomeView: !0
          });
        }), r.apps.on("closeWelcomeView", function (t) {
          s.Animated.spring(e.state.bounceValue, {
            toValue: 0,
            friction: 25,
            tension: 90
          }).start(function () {
            e.setState({
              showWelcomeView: !1
            }, function () {
              return t && t();
            });
          });
        }), r.apps.isInWelcomeNavi && r.apps.emit("showWelcomeView");
      },
      render: function () {
        return this.state.showWelcomeView ? o["default"].createElement(s.Animated.View, {
          style: [{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            backgroundColor: r.theme.transparentDeep,
            justifyContent: "center",
            alignItems: "center"
          }, {
            transform: [{
              scale: this.state.bounceValue
            }]
          }]
        }, o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
          }
        }, o["default"].createElement(r.BackgroundImageView, {
          maskColor: r.theme.lightLessTrans6
        }), o["default"].createElement(s.View, {
          style: {
            flex: 1,
            backgroundColor: r.theme.transparent,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.View, {
          style: {
            marginTop: -50,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.Image, {
          style: {
            flex: 1,
            width: r.theme.winWidth / 1.5,
            height: r.theme.winWidth / 1.5,
            marginBottom: 20
          },
          source: t(388)
        }), o["default"].createElement(s.Text, {
          style: {
            fontSize: 42,
            color: "rgb(16,151,214)",
            fontWeight: "bold",
            marginBottom: 20
          }
        }, (0, r.tr)("Who U")), o["default"].createElement(s.Text, {
          style: {
            fontSize: 20,
            color: "rgb(16,151,214)",
            fontWeight: "bold",
            marginBottom: 15
          }
        }, (0, r.tr)("Pick to Chat")), o["default"].createElement(s.TouchableOpacity, {
          style: {
            marginLeft: 5,
            borderColor: r.theme.white,
            borderWidth: 3,
            marginTop: 30,
            paddingBottom: 11,
            paddingTop: 8,
            paddingHorizontal: 18,
            backgroundColor: "rgb(16,151,214)",
            borderRadius: 25,
            justifyContent: "center",
            alignItems: "center"
          },
          onPress: function () {
            return r.apps.emit("closeWelcomeView");
          }
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 18,
            color: r.theme.white,
            fontStyle: "italic",
            fontWeight: "bold",
            paddingHorizontal: 2
          }
        }, (0, r.tr)("Sign Up / Log In"))))))) : null;
      }
    }), o["default"].createClass({
      displayName: "ProgressingView",
      getInitialState: function () {
        return {
          show: !1,
          text: "",
          progress: 0,
          bounceValue: new s.Animated.Value(0),
          bounceValueOpacity: new s.Animated.Value(1)
        };
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("showProgressingView", function (t, a) {
          e.state.bounceValue.setValue(1.8), s.Animated.spring(e.state.bounceValue, {
            toValue: 1,
            friction: 13,
            tension: 90
          }).start(function () {
            a && a();
          }), e.setState({
            show: !0,
            text: t
          });
        }), r.apps.on("closeProgressingView", function (t) {
          delete e.pickupViewShown, e.setState({
            show: !1,
            text: "",
            progress: 0,
            bounceValue: new s.Animated.Value(0),
            bounceValueOpacity: new s.Animated.Value(1)
          }, function () {
            t && t();
          });
        });
      },
      render: function () {
        var e = this;
        return this.state.show ? o["default"].createElement(s.TouchableWithoutFeedback, {
          onPress: function () {}
        }, o["default"].createElement(s.Animated.View, {
          style: [{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            backgroundColor: r.theme.transparentDeep,
            justifyContent: "center",
            alignItems: "center"
          }, {
            transform: [{
              scale: this.state.bounceValue
            }],
            opacity: this.state.bounceValueOpacity
          }]
        }, o["default"].createElement(r.Progress.Circle, {
          indeterminate: !this.state.progress,
          color: r.theme.deepGreen2,
          progress: this.state.progress,
          size: 90,
          showsText: !0,
          formatText: function (t) {
            return e.state.text;
          }
        }))) : null;
      }
    })),
    f = o["default"].createClass({
      displayName: "PickingView",
      getInitialState: function () {
        return this.showStartTime = 0, {
          show: !1,
          text: "",
          type: "tip",
          userid: "",
          bounceValue: new s.Animated.Value(0),
          bounceValueOpacity: new s.Animated.Value(1),
          showPickupButton: !1
        };
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("showPickingView", function (t, a, i, n) {
          r.apps.modelViewRef.hide(), r.apps.contextMenusRef.hide(), r.apps.emit("hideTermView", !0), e.showStartTime = "tip" === t ? 0 : Date.now(), i ? e.onTouch = i : delete e.onTouch, r.apps.pickingViewShowing = !0, delete e.pickupViewShown, e.state.bounceValue.setValue(1.8), s.Animated.spring(e.state.bounceValue, {
            toValue: 1,
            friction: 13,
            tension: 90
          }).start(function () {
            n && n(e);
          }), "string" != typeof a && (a = JSON.stringify(a)), e.setState({
            show: !0,
            text: a,
            userid: "",
            type: t
          });
        }), r.apps.on("closePickingView", function (t, a) {
          r.apps.modelViewRef.unHide(), r.apps.contextMenusRef.unHide(), r.apps.emit("hideTermView", !1), r.apps.pickingViewShowing = !1, delete e.onTouch, a && a.keepImagePreview || r.apps.emit("closeModelImage"), delete e.pickupViewShown, e.onCloseCallback && (e.onCloseCallback(), delete e.onCloseCallback), e.setState({
            show: !1,
            text: "",
            showPickupButton: !1,
            bounceValue: new s.Animated.Value(0),
            type: "tip",
            bounceValueOpacity: new s.Animated.Value(1)
          }, function () {
            t && t(), r.apps.loadFriendsDataCb && r.apps.loadFriendsDataCb(), r.apps.friendsUnreadChangedCb && r.apps.friendsUnreadChangedCb();
          });
        });
      },
      calcBarTop: function () {
        return r.theme.winHeight - (r.theme.winHeight - r.theme.winWidth) / 4 - 20;
      },
      renderTip: function () {
        var e = this;
        return "tip" === this.state.type ? o["default"].createElement(s.View, {
          style: {
            paddingHorizontal: 30
          }
        }, o["default"].createElement(s.Text, {
          style: {
            color: r.theme.deepGreen2,
            fontSize: 20,
            textAlign: "center"
          }
        }, this.state.text)) : "prog" === this.state.type ? o["default"].createElement(r.Progress.Circle, {
          showsText: !0,
          formatText: function (t) {
            return e.state.text;
          },
          indeterminate: !0,
          color: r.theme.deepGreen2,
          size: 60
        }) : "spin" === this.state.type ? o["default"].createElement(s.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            paddingVertical: 12,
            paddingHorizontal: 15,
            borderRadius: 10
          }
        }, r.apps.spinner("large"), this.state.text ? o["default"].createElement(s.Text, {
          style: {
            fontSize: 14,
            color: r.apps.darkTheme ? r.theme.deep4 : r.theme.white,
            marginTop: 5
          }
        }, this.state.text) : null) : void 0;
      },
      render: function () {
        var e = this;
        return this.state.show ? o["default"].createElement(s.TouchableWithoutFeedback, {
          onPress: function () {
            e.onTouch && e.onTouch() || Date.now() - e.showStartTime > 5e3 && r.apps.emit("closePickingView");
          }
        }, o["default"].createElement(s.Animated.View, {
          style: [{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            backgroundColor: r.theme.transparentDeep,
            justifyContent: "center",
            alignItems: "center"
          }, {
            transform: [{
              scale: this.state.bounceValue
            }],
            opacity: this.state.bounceValueOpacity
          }]
        }, this.renderTip(), this.state.showPickupButton ? o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            top: this.calcBarTop(),
            left: 0,
            width: r.theme.winWidth,
            height: 40,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            return r.apps.emit("closePickingView");
          },
          style: ["ios" === s.Platform.OS ? {
            shadowColor: "#fff",
            shadowOffset: {
              width: 0,
              height: 0
            },
            shadowOpacity: .7
          } : {}, {
            paddingVertical: 5,
            paddingHorizontal: 20,
            borderRadius: 15,
            marginRight: 20,
            backgroundColor: r.theme.lightLessTrans4,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          }]
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 15,
            color: r.theme.white,
            paddingBottom: 1
          }
        }, (0, r.tr)("Discard"))), o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            r.apps.emit("closePickingView", function () {
              return r.apps.emit("navToChat", e.state.data);
            });
          },
          style: ["ios" === s.Platform.OS ? {
            shadowColor: "#fff",
            shadowOffset: {
              width: 0,
              height: 0
            },
            shadowOpacity: .7
          } : {}, {
            paddingVertical: 5,
            paddingHorizontal: 20,
            borderRadius: 15,
            marginLeft: 20,
            backgroundColor: r.theme.lightLessTrans4,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          }]
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 15,
            color: r.theme.white,
            paddingBottom: 1
          }
        }, (0, r.tr)("Response")))) : null)) : null;
      }
    }),
    g = o["default"].createClass({
      displayName: "ContextMenu",
      getInitialState: function () {
        return {
          mtop: 0,
          contextMenus: {},
          showContextMenu: !1,
          bounceValue: new s.Animated.Value(0),
          bounceValueOpacity: new s.Animated.Value(1)
        };
      },
      hide: function () {
        this.setState({
          mtop: 3e3
        });
      },
      unHide: function () {
        this.setState({
          mtop: 0
        });
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("contextMenu", function (t, a, i) {
          a && (e.modal = !0), i && (e.transp = !0), e.state.bounceValue.setValue(1.2), s.Animated.spring(e.state.bounceValue, {
            toValue: 1,
            friction: 13,
            tension: 90
          }).start(), e.setState({
            showContextMenu: !0,
            contextMenus: t
          });
        }), r.apps.on("closeContextMenu", function (t) {
          delete e.modal, delete e.transp, e.setState({
            contextMenus: {},
            showContextMenu: !1,
            bounceValue: new s.Animated.Value(0),
            bounceValueOpacity: new s.Animated.Value(1)
          }, function () {
            return t && t();
          });
        });
      },
      renderButton: function (e, t, a) {
        return o["default"].createElement(s.View, {
          key: t
        }, o["default"].createElement(s.TouchableOpacity, {
          style: {
            paddingVertical: 10,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          },
          onPress: function () {
            return e[1]();
          }
        }, o["default"].createElement(s.Text, {
          style: {
            color: r.apps.darkTheme ? r.theme.deep6 : r.theme.deep7,
            fontSize: 15
          }
        }, " ", e[0], " "), e[2] ? o["default"].createElement(r.Ionicons, {
          name: "md-checkmark",
          style: {
            marginHorizontal: 7
          },
          size: 25,
          color: r.theme.deepGreen
        }) : null), t < a.length - 1 ? o["default"].createElement(s.View, {
          style: {
            height: 1,
            backgroundColor: r.theme.contextMenuSep
          }
        }) : null);
      },
      render: function () {
        var e = this;
        return this.state.showContextMenu ? o["default"].createElement(s.TouchableWithoutFeedback, {
          onPress: function () {
            e.modal || r.apps.emit("closeContextMenu");
          }
        }, o["default"].createElement(s.View, {
          style: {
            width: r.theme.winWidth,
            height: r.theme.winHeight
          }
        }, o["default"].createElement(r.BackgroundImageView, {
          shouldRender: !0,
          maskColor: r.theme.lightLessTrans6
        }), o["default"].createElement(s.Animated.View, {
          style: [{
            position: "absolute",
            top: this.state.mtop,
            left: 0,
            bottom: 0,
            right: 0,
            backgroundColor: this.transp ? r.theme.transparent : r.theme.transparentDeep,
            justifyContent: "center",
            alignItems: "center"
          }, {
            transform: [{
              scale: this.state.bounceValue
            }],
            opacity: this.state.bounceValueOpacity
          }]
        }, o["default"].createElement(s.View, {
          style: {
            padding: 5,
            borderWidth: 2,
            borderColor: r.apps.darkTheme ? r.theme.lighta : r.theme.white,
            borderRadius: 6
          }
        }, o["default"].createElement(s.View, {
          style: {
            backgroundColor: this.transp ? r.theme.transparent : r.theme.contextMenuRowBg,
            width: r.theme.winWidth / 4 * 3
          }
        }, this.state.contextMenus.map(function (t, a, i) {
          return e.renderButton(t, a, i);
        })))))) : null;
      }
    }),
    w = o["default"].createClass({
      displayName: "ModelImageViewBar",
      getInitialState: function () {
        return {
          display: !0,
          rawExist: !1,
          displayRaw: !1,
          rawSize: 0,
          showDownloadRawProgress: !1,
          downloadRawProgress: 0
        };
      },
      setNotShowRaw: function () {
        this.setState({
          showDownloadRawProgress: !1,
          displayRaw: !1,
          rawExist: !1,
          rawSize: 0
        });
      },
      setShowRaw: function () {
        this.setState({
          showDownloadRawProgress: !1,
          rawExist: !0,
          displayRaw: !0
        });
      },
      setDownloadRaw: function (e) {
        this.setState({
          showDownloadRawProgress: !1,
          displayRaw: !0,
          rawExist: !1,
          rawSize: e
        });
      },
      calcRawSize: function (e) {
        return e ? 1048576 > e ? "(" + (e / 1024).toFixed(0) + "KB)" : "(" + (e / 1024 / 1024).toFixed(2) + "MB)" : ((0, r.tlog)("error", "calcRawSize", e), "");
      },
      render: function () {
        var e = this,
          t = 0;
        return r.theme.isIphoneX && (t = r.theme.iphoneXDiff), this.state.display ? o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            return r.apps.closeAllModelView();
          },
          noOpacictyActive: !0,
          style: {
            position: "absolute",
            top: r.theme.winHeight - r.theme.statusHeightAll - 36 - t,
            left: 0,
            width: r.theme.winWidth,
            height: 36,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: r.theme.transparent
          }
        }, r.apps.showCmdBall && !this.props.nobar && !this.props.addToFavor && r.apps.curNavigator.routes.sessionPicBoard ? o["default"].createElement(s.TouchableOpacity, {
          style: {
            position: "absolute",
            justifyContent: "center",
            alignItems: "center",
            left: 0,
            top: 0,
            width: 50,
            height: 36
          },
          onPress: function () {
            "sessionPicBoard" !== r.apps.currentRoutes[r.apps.currentNavi].name && r.apps.curNavigator.navi.navForward(r.apps.curNavigator.routes.sessionPicBoard, function () {
              return s.Navigator.SceneConfigs.VerticalUpSwipeJump;
            }), r.apps.closeAllModelView();
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 3,
            width: 24,
            height: 24
          }
        }, o["default"].createElement(r.Ionicons, {
          name: "ios-folder-open",
          style: {
            paddingTop: 2
          },
          size: 18,
          color: r.theme.white
        }))) : null, this.state.showDownloadRawProgress ? o["default"].createElement(s.TouchableOpacity, {
          style: {
            justifyContent: "center",
            height: 36,
            paddingHorizontal: 10
          },
          onPress: function () {
            return e.props.onRawPress();
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: 5,
            paddingHorizontal: this.state.showDownloadRawProgress ? 20 : 6,
            paddingVertical: 4
          }
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 14,
            color: r.theme.white
          }
        }, this.state.showDownloadRawProgress ? this.state.downloadRawProgress + "%" : this.state.rawExist ? "Show Raw" : "Raw" + this.calcRawSize(this.state.rawSize)))) : null, this.props.nobar || this.state.showDownloadRawProgress || !this.props.addToFavor ? null : o["default"].createElement(s.TouchableOpacity, {
          style: {
            justifyContent: "center",
            height: 36,
            paddingHorizontal: 10
          },
          onPress: function () {
            e.props.addToFavor();
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: 5,
            paddingHorizontal: 8,
            height: 24,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 14,
            color: r.theme.white
          }
        }, (0, r.tr)("Add to Favor")))), this.props.checkBig ? o["default"].createElement(s.TouchableOpacity, {
          style: {
            justifyContent: "center",
            height: 36,
            paddingHorizontal: 10,
            backgroundColor: r.theme.deepGreen2Trans4,
            borderRadius: 5
          },
          onPress: function () {
            e.props.parent.setState({
              checkBig: 0
            });
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: 5,
            paddingHorizontal: 8,
            height: 24,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 14,
            color: r.theme.white
          }
        }, (0, r.tr)("Check Big Picture")))) : null, r.apps.showCmdBall ? o["default"].createElement(s.TouchableOpacity, {
          style: {
            position: "absolute",
            justifyContent: "center",
            alignItems: "center",
            right: 0,
            top: 0,
            width: 50,
            height: 36
          },
          onPress: function () {
            e.props.onDownloadPress();
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 3,
            width: 24,
            height: 24
          }
        }, o["default"].createElement(r.Ionicons, {
          name: "md-download",
          size: 20,
          color: r.theme.white
        }))) : null) : null;
      }
    }),
    y = o["default"].createClass({
      displayName: "ModelImageView",
      getInitialState: function () {
        var self = this;
        this.downloadingMap = {};
        var horizontal = function (event) {
          var touch = event.nativeEvent;
          if (touch.touches.length !== 1) self.recoveryLongMultiTouch = true;
          var start = self.recoveryLongSwipeStart;
          return !!(start && !self.recoveryLongMultiTouch && self.recoveryCanPagePhotos() && Math.abs(touch.pageX - start.x) > 16 && Math.abs(touch.pageX - start.x) > Math.abs(touch.pageY - start.y) * 1.3);
        };
        this.recoveryLongPhotoPan = s.PanResponder.create({
          onStartShouldSetPanResponderCapture: function (event) {
            var touch = event.nativeEvent;
            if (touch.touches.length === 1) {
              self.recoveryLongSwipeStart = {x: touch.pageX, y: touch.pageY};
              self.recoveryLongMultiTouch = false;
            } else self.recoveryLongMultiTouch = true;
            return false;
          },
          onMoveShouldSetPanResponderCapture: horizontal,
          onMoveShouldSetPanResponder: horizontal,
          onPanResponderStart: function (event) { if (event.nativeEvent.touches.length !== 1) self.recoveryLongMultiTouch = true; },
          onPanResponderMove: function (event) { if (event.nativeEvent.touches.length !== 1) self.recoveryLongMultiTouch = true; },
          onPanResponderRelease: function (event) {
            var start = self.recoveryLongSwipeStart, touch = event.nativeEvent;
            self.recoveryLongSwipeStart = null;
            if (!start || self.recoveryLongMultiTouch || !self.recoveryCanPagePhotos()) return;
            var dx = touch.pageX - start.x, dy = touch.pageY - start.y;
            if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.3) self.onRecoveryImageSwipe(dx < 0 ? 1 : -1);
          },
          onPanResponderTerminationRequest: function () { return true; },
          onPanResponderTerminate: function () { self.recoveryLongSwipeStart = null; }
        });
        return {
          uri: "",
          imgId: "",
          ratio: 0,
          rawImgId: "",
          display: !1,
          isVideo: !1,
          isVideoPaused: !0
        };
      },
      recoveryCanPagePhotos: function () {
        var props = this.curProps || {}, message = props.recoveryMessage;
        return !!(this.state.display && !this.state.isVideo && !props.recoveryAvatar && message && message.type === 3 && message.msgid && props.recoveryOwnerId === r.apps.userid);
      },
      renderRecoveryPhotoPager: function () {
        var self=this;
        return o["default"].createElement(s.View,{style:{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"#000"}},
          o["default"].createElement(RecoveryPhotoPager,{
            message:this.curProps.recoveryMessage,peer:this.curProps.recoveryPeer,ownerId:this.curProps.recoveryOwnerId,database:r.db,
            width:r.theme.winWidth,height:r.theme.winHeight,image:{imgId:this.state.imgId,uri:this.state.uri,ratio:this.state.ratio,width:this.width,height:this.height},
            onPage:this.onRecoveryImageSwipe,onLongPress:this.onRecoveryImageLongPress,
            onPress:function(){r.apps.emit("closeModelImage"+self.props.mseq);}
          }),
          this.state.imgId&&this.width/this.height>=.4?o["default"].createElement(w,{
            ref:function(bar){self.modelImageViewBarRef=bar;},parent:this,nobar:this.localProps&&this.localProps.nobar,
            addToFavor:this.state.addToFavor,checkBig:this.state.checkBig,onRawPress:this.onRawPress,onDownloadPress:this.onDownloadPress,
            downloadRawProgress:this.state.downloadRawProgress
          }):null,
          o["default"].createElement(s.TouchableOpacity,{onPress:this.onDownloadPress,style:{position:"absolute",bottom:(r.theme.iphoneXDiff||0)+44,left:(r.theme.winWidth-150)/2,width:150,height:38,borderRadius:8,backgroundColor:"rgba(20,35,40,0.88)",alignItems:"center",justifyContent:"center"}},
            o["default"].createElement(s.Text,{style:{color:"#fff",fontSize:15}},this.state.recoverySaveError||this.state.recoverySaveStatus||"保存到本地")));
      },
      onRecoveryImageSwipe: function (direction) {
        if (!this.recoveryCanPagePhotos()) return Promise.resolve(false);
        var self = this, props = this.curProps, identity = r.apps.userid, database = r.db;
        if (this.recoveryPaging && this.recoveryPaging.props === props) return this.recoveryPaging.promise;
        var token = {props: props};
        this.recoveryPaging = token;
        function active() { return self.curProps === props && self.state.display && r.apps.userid === identity && r.db === database; }
        token.promise = r.apps.recoveryAdjacentChatImage(props.recoveryMessage, props.recoveryPeer, direction).then(function (message) {
          if (!active() || !message) return false;
          return r.apps.confirmRecoveryImage(message, undefined, {keepImagePreview: true}).then(function (allowed) {
            if (!allowed || !active()) return false;
            var ratio = message.width > 0 && message.height > 0 ? message.width / message.height : 1;
            var imageId = message.imgId || "", raw = message.rawImgId || "";
            if (raw && (/^(\w+\.gif):/.test(raw) || ratio < .4)) imageId = raw.split(":")[0];
            r.apps.emit("showModelImage" + self.props.mseq, Object.assign({}, props, {
              imgId: imageId, uri: message.uri || "", rawImgId: raw, ratio: ratio,
              isVideo: false, isPhoto: !imageId && !!message.uri, path: undefined,
              videoThumb: undefined, addToFavor: undefined, checkBig: undefined,
              recoveryMessage: message, recoveryPeer: props.recoveryPeer || r.apps.recoveryPeerForMessage(message),
              recoveryOwnerId: identity, recoveryPageUpdate: true
            }));
            return true;
          });
        }).catch(function (error) {
          if (active()) r.apps.recoveryImageTip(error.message || "图片切换失败，请重试");
          return false;
        }).then(function (moved) {
          if (self.recoveryPaging === token) self.recoveryPaging = null;
          return moved;
        });
        return token.promise;
      },
      showRaw: function (e) {
        this.setState({
          display: !0,
          rawId: e
        });
      },
      onDownloadPress: function () {
        if(this.recoverySaving)return;
        this.recoverySaving=true;
        var self=this,props=this.curProps||{},identity=r.apps.userid,message=Object.assign({},props.recoveryMessage||{},{imgId:this.state.imgId,uri:this.state.uri,rawImgId:props.rawImgId});
        this.setState({recoverySaveStatus:"正在保存…",recoverySaveError:""});
        return r.apps.saveRecoveryImage(message,true).then(function(result){
          self.recoverySaving=false;
          if(self.curProps===props&&identity===r.apps.userid&&self.state.display)self.setState({recoverySaveStatus:"已保存到相册",recoverySaveError:""});
          return result;
        }).catch(function(error){
          self.recoverySaving=false;
          if(self.curProps===props&&identity===r.apps.userid&&self.state.display)self.setState({recoverySaveStatus:"保存失败，点击重试",recoverySaveError:error.message||"保存失败"});
        });
      },
      onRawPress: function () {
        var e = this, props = this.curProps, identity = r.apps.userid, database = r.db;
        var rawId = this.rawId, filepath = this.filepath, subdir = this.subdir;
        function active() { return e.curProps === props && e.state.display && r.apps.userid === identity && r.db === database; }
        if (!rawId || !active()) return;
        if (this.rawExist) this.modelImageViewBarRef && this.modelImageViewBarRef.setNotShowRaw(), this.rawIdPrev = this.state.imgId, this.setState({
          imgId: rawId
        });else {
          if (this.modelImageViewBarRef && this.modelImageViewBarRef.setState({
            showDownloadRawProgress: !0,
            downloadRawProgress: 0
          }), this.downloadingMap[rawId]) return;
          return r.fs.exists(subdir).then(function (t) {
            return t ? void 0 : r.fs.mkdir(subdir, !0);
          }).then(function (t) {
            if (!active()) return;
            var a = -1,
              i = 0,
              n = function o() {
                if (!active()) return;
                var t = r.wsc.getRandUrl(a, "durls");
                return r.fs.greetings(JSON.stringify({
                  d: r.apps.deviceId,
                  t: r.apps.now()
                })).then(function (n) {
                  if (!active()) return;
                  a = t.ridx;
                  var s = "https://" + t.url + "/pic/" + rawId + ("?token=" + encodeURIComponent(n)),
                    l = rawId,
                    p = filepath;
                  return e.downloadingMap[l] = 1, r.fs.downloadFile({
                    fromUrl: s,
                    toFile: filepath,
                    timeout: 18e5,
                    pinCert: !0,
                    progress: function (t) {
                      var a = t.contentLength,
                        i = t.bytesWritten;
                      active() && e.modelImageViewBarRef && l === e.rawId && e.modelImageViewBarRef.setState({
                        showDownloadRawProgress: !0,
                        downloadRawProgress: (i / a * 100).toFixed(0)
                      });
                    },
                    downloadAgain: function () {
                      i += 1, o();
                    },
                    tryCnt: i
                  }).then(function (t) {
                    return delete e.downloadingMap[l], (0, r.tlog)("raw image response", t), !t || 200 === t.statusCode && 0 !== t.bytesWritten ? (active() && (e.rawIdPrev = e.state.imgId, e.setState({
                      imgId: rawId
                    }), e.modelImageViewBarRef && e.modelImageViewBarRef.setNotShowRaw()), r.dbs.addCachedImage(l, p, t && t.bytesWritten)) : r.fs.unlink(p).then(function () {
                      return Promise.reject(t);
                    });
                  });
                });
              };
            return n();
          })["catch"](function (error) {
            delete e.downloadingMap[rawId];
            (0, r.tlog)("error", "onRawPress", error);
          });
        }
      },
      handleRaw: function (e) {
        var t = this, props = this.curProps, identity = r.apps.userid, database = r.db;
        if (e) {
          var a = e.split(":");
          this.rawId = a[0], this.rawSize = a[1];
          var i = r.apps.getImageIdSubDir(this.rawId);
          this.subdir = r.fs.DocumentDirectoryPath + "/cachedImages/" + i, this.filepath = this.subdir + "/" + this.rawId, r.dbs.isCachedImageExist(this.rawId, this.filepath).then(function (e) {
            if (t.curProps !== props || !t.state.display || r.apps.userid !== identity || r.db !== database) return;
            e ? (t.rawExist = !0, t.modelImageViewBarRef && t.modelImageViewBarRef.setShowRaw()) : t.modelImageViewBarRef && t.modelImageViewBarRef.setDownloadRaw(t.rawSize), t.onRawPress();
          });
        } else this.modelImageViewBarRef && this.modelImageViewBarRef.setNotShowRaw();
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("modelImageTopOffset", function (t) {
          e.setState({
            topOffset: t
          });
        }), r.apps.on("showModelImage" + this.props.mseq, function (t) {
          if (!t.preVideoLoad || r.apps.isWifi) {
            e.localProps = t, t.topOffset && e.setState({
              topOffset: t.topOffset
            }), t.preVideoLoad || ((t.recoveryPageUpdate && r.apps.curMseq === e.props.mseq && e.state.display) || r.apps.closeAllModelView(e.props.mseq), r.apps.curMseq = e.props.mseq), "ios" !== s.Platform.OS || t.preVideoLoad || s.StatusBarIOS.setHidden(!0), e.setState({recoverySaveStatus:"",recoverySaveError:""}), e.curProps = t, e.rawExist = !1, e.rawIdPrev = "", e.imageOpenInChatView = /^interact_/.test(r.apps.currentRoutes[r.apps.currentNavi].name) && !t.picboard;
            var a = t.ratio,
              i = t.imgId,
              n = t.uri,
              o = t.path,
              l = t.rawImgId,
              p = t.isVideo,
              u = t.isPhoto,
              d = t.videoThumb,
              c = t.addToFavor,
              h = t.checkBig,
              m = r.theme.winWidth,
              f = r.theme.winHeight - r.theme.statusHeightAll,
              g = m / f;
            if (a >= g ? (e.width = m, e.height = m / a) : (e.height = f, e.width = f * a), p) {
              if (l) {
                if (e.prevVideoId !== l) {
                  var w = r.apps.getImageIdSubDir(l),
                    y = r.fs.DocumentDirectoryPath + "/cachedImages/" + w + "/" + l;
                  return r.fs.exists(y).then(function (a) {
                    a ? (n = y, t.preVideoLoad || e.setState({
                      display: !0,
                      isVideo: p,
                      imgId: i,
                      uri: n,
                      videoThumb: d,
                      isVideoPaused: !1
                    })) : Promise.resolve().then(function () {
                      n = r.apps.downloadSite + "/vid/" + l, e.prevVideoId = l, e.prevVideoUri = n, t.preVideoLoad && n !== e.state.uri ? e.setState({
                        display: !1,
                        isVideo: p,
                        uri: n,
                        imgId: i,
                        isVideoPaused: !0
                      }) : t.preVideoLoad || e.setState({
                        display: !0,
                        isVideo: p,
                        uri: n,
                        imgId: i,
                        isVideoPaused: !1
                      });
                    });
                  });
                }
                t.preVideoLoad || e.setState({
                  display: !0,
                  isVideo: p,
                  uri: e.prevVideoUri,
                  imgId: i,
                  isVideoPaused: !1
                });
              } else e.setState({
                display: !t.preVideoLoad,
                isVideo: p,
                uri: o,
                imgId: i,
                videoThumb: d,
                isVideoPaused: !1
              });
            } else {
              if (l) {
                var b = l.match(/^(\w+\.gif):/);
                b && (i = b[1]);
              }
              e.setState({
                display: !0,
                imgId: i,
                uri: n,
                isVideo: !1,
                isPhoto: u,
                checkBig: h,
                addToFavor: c
              }, function () {
                i && e.handleRaw(l);
              });
            }
          }
        }), r.apps.on("closeModelImage" + this.props.mseq, function () {
          "ios" === s.Platform.OS && s.StatusBarIOS.setHidden(!1), e.props.mseq === r.apps.curMseq && delete r.apps.curMseq;
          var t = e.state,
            a = t.imgId,
            i = t.isVideo,
            n = t.display;
          a && e.modelImageViewBarRef && e.modelImageViewBarRef.setNotShowRaw(), delete r.apps.pictureBoardShow, r.apps.lastSessionId = null, r.apps.lastPicBoardIdx = null, r.apps.pictureBoardPicPressed = null, i ? e.setState({
            display: !1
          }) : n && e.setState({
            display: !1,
            isVideo: !1,
            uri: "",
            imgId: "",
            ratio: 0,
            checkBig: 0
          });
          if (e.curProps && e.curProps.recoveryResumeHistory) {
            e.curProps.recoveryResumeHistory = false;
            r.apps.emit("resumeRecoveryHistory");
          }
          if (e.curProps && e.curProps.recoveryResumeStorage) {
            e.curProps.recoveryResumeStorage = false;
            r.apps.emit("resumeRecoveryStorage");
          }
        });
      },
      render: function () {
        var e = this,
          t = this.state,
          a = t.uri,
          i = t.ratio,
          n = t.imgId,
          l = t.isVideo,
          p = t.display,
          u = t.isPhoto,
          d = t.videoThumb;
        if(this.recoveryCanPagePhotos())return this.renderRecoveryPhotoPager();
        if (l) return o["default"].createElement(V, {
          smallSizeDocken: !0,
          onPress: function () {
            return r.apps.emit("closeModelImage" + e.props.mseq);
          },
          onNext: function () {
            e.imageOpenInChatView ? r.apps.showPrevCachedImage({
              imgId: e.rawIdPrev || n,
              ratio: i,
              uri: a,
              isVideo: l,
              curProps: e.curProps
            }) : r.apps.showNextCachedImage({
              imgId: e.rawIdPrev || n,
              ratio: i,
              uri: a,
              isVideo: l,
              curProps: e.curProps
            });
          },
          onPrev: function () {
            e.imageOpenInChatView ? r.apps.showNextCachedImage({
              imgId: e.rawIdPrev || n,
              ratio: i,
              uri: a,
              isVideo: l,
              curProps: e.curProps
            }) : r.apps.showPrevCachedImage({
              imgId: e.rawIdPrev || n,
              ratio: i,
              uri: a,
              isVideo: l,
              curProps: e.curProps
            });
          },
          style: {
            position: "absolute",
            top: p ? 0 : r.theme.winHeight + 1e3,
            left: 0,
            bottom: 0,
            right: 0,
            backgroundColor: r.theme.dark,
            justifyContent: "center",
            alignItems: "center",
            transform: [{
              scale: 1
            }, {
              translateX: 0
            }, {
              translateY: 0
            }]
          }
        }, a ? o["default"].createElement(S, {
          ref: function (e) {
            return r.apps.cachedVideoViewRef = e;
          },
          width: this.width,
          height: this.height,
          imgId: n,
          videoThumb: d,
          uri: a,
          picboard: this.curProps.picboard,
          isVideoPaused: p ? this.state.isVideoPaused : !0,
          display: p
        }) : null);
        if (p) {
          if (n) {
            if (this.width / this.height < .4) return o["default"].createElement(s.View, Object.assign({}, this.recoveryLongPhotoPan ? this.recoveryLongPhotoPan.panHandlers : {}, {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }
            }), o["default"].createElement(s.ScrollView, {
              key: (this.curProps.recoveryMessage || {}).msgid || n,
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                right: 0
              }
            }, o["default"].createElement(s.TouchableOpacity, {
              noOpacictyActive: !0,
              onPress: function () {
                return r.apps.emit("closeModelImage" + e.props.mseq);
              },
              onLongPress: this.onRecoveryImageLongPress
            }, o["default"].createElement(r.CachedImage, {
              style: {
                width: r.theme.winWidth,
                height: this.height / this.width * r.theme.winWidth
              },
              imageId: n,
              fadeDuration: 0
            }))), o["default"].createElement(s.TouchableOpacity, {
              onPress: this.onDownloadPress,
              style: {
                position: "absolute",
                bottom: (r.theme.iphoneXDiff || 0) + 44,
                left: (r.theme.winWidth - 150) / 2,
                width: 150,
                height: 38,
                borderRadius: 8,
                backgroundColor: "rgba(20,35,40,0.88)",
                alignItems: "center",
                justifyContent: "center"
              }
            }, o["default"].createElement(s.Text, {
              style: {
                color: "#fff",
                fontSize: 15
              }
            }, this.state.recoverySaveError || this.state.recoverySaveStatus || "保存到本地")));
            if (this.state.checkBig) var c = r.apps.getImageSize(this.width, this.height),
              h = c.width,
              m = c.height;else h = this.width, m = this.height;
            return o["default"].createElement(s.View, {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }
            }, o["default"].createElement(s.View, {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                backgroundColor: "#000"
              }
            }, o["default"].createElement(s.TouchableOpacity, {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                backgroundColor: "#000"
              },
              noOpacictyActive: !0,
              onPress: function () {
                return r.apps.emit("closeModelImage" + e.props.mseq);
              },
              onLongPress: this.onRecoveryImageLongPress
            }), o["default"].createElement(V, {
              onHorizontalSwipe: this.recoveryCanPagePhotos() ? this.onRecoveryImageSwipe : undefined,
              onPress: function () {
                return r.apps.emit("closeModelImage" + e.props.mseq);
              },
              onNext: function () {
                return r.apps.emit("closeModelImage" + e.props.mseq);
              },
              onPrev: function () {
                return r.apps.emit("closeModelImage" + e.props.mseq);
              },
              style: {
                position: "absolute",
                top: this.state.topOffset || 0,
                left: 0,
                bottom: this.state.checkBig ? 36 : 0,
                right: 0,
                backgroundColor: r.theme.dark,
                justifyContent: "center",
                alignItems: "center",
                transform: [{
                  scale: 1
                }, {
                  translateX: 0
                }, {
                  translateY: 0
                }]
              },
              onLongPress: this.onRecoveryImageLongPress
            }, o["default"].createElement(r.CachedImage, {
              style: {
                width: h,
                height: m
              },
              imageId: n,
              fadeDuration: 0
            })), o["default"].createElement(w, {
              ref: function (t) {
                return e.modelImageViewBarRef = t;
              },
              parent: this,
              nobar: this.localProps.nobar,
              addToFavor: this.state.addToFavor,
              checkBig: this.state.checkBig,
              onRawPress: this.onRawPress,
              onDownloadPress: this.onDownloadPress,
              downloadRawProgress: this.state.downloadRawProgress
            })), o["default"].createElement(s.TouchableOpacity, {
              onPress: this.onDownloadPress,
              style: {
                position: "absolute",
                bottom: (r.theme.iphoneXDiff || 0) + 44,
                left: (r.theme.winWidth - 150) / 2,
                width: 150,
                height: 38,
                borderRadius: 8,
                backgroundColor: "rgba(20,35,40,0.88)",
                alignItems: "center",
                justifyContent: "center"
              }
            }, o["default"].createElement(s.Text, {
              style: {
                color: "#fff",
                fontSize: 15
              }
            }, this.state.recoverySaveError || this.state.recoverySaveStatus || "保存到本地")));
          }
          return o["default"].createElement(s.View, {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }
          }, u && this.width / this.height < .4 ? o["default"].createElement(s.View, Object.assign({}, this.recoveryLongPhotoPan ? this.recoveryLongPhotoPan.panHandlers : {}, {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0
            }
          }), o["default"].createElement(s.ScrollView, {
            key: (this.curProps.recoveryMessage || {}).msgid || a,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0
            }
          }, o["default"].createElement(s.TouchableOpacity, {
            noOpacictyActive: !0,
            onPress: function () {
              return r.apps.emit("closeModelImage" + e.props.mseq);
            },
            onLongPress: this.onRecoveryImageLongPress
          }, o["default"].createElement(r.CachedImage, {
            style: {
              width: r.theme.winWidth,
              height: this.height / this.width * r.theme.winWidth
            },
            defaultSource: {
              uri: a
            },
            isPhoto: !0,
            fadeDuration: 0
          }))), o["default"].createElement(b, {
            uri: a
          })) : o["default"].createElement(s.View, {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              backgroundColor: "#000"
            }
          }, o["default"].createElement(s.TouchableOpacity, {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              backgroundColor: "#000"
            },
            noOpacictyActive: !0,
            onPress: function () {
              return r.apps.emit("closeModelImage" + e.props.mseq);
            },
            onLongPress: this.onRecoveryImageLongPress
          }), o["default"].createElement(V, {
            onHorizontalSwipe: this.recoveryCanPagePhotos() ? this.onRecoveryImageSwipe : undefined,
            onPress: function () {
              return r.apps.emit("closeModelImage" + e.props.mseq);
            },
            onNext: function () {
              return e.imageOpenInChatView ? r.apps.showPrevCachedImage({
                uri: a,
                ratio: i,
                isPhoto: u,
                curProps: e.curProps
              }) : r.apps.showNextCachedImage({
                uri: a,
                ratio: i,
                isPhoto: u,
                curProps: e.curProps
              });
            },
            onPrev: function () {
              return e.imageOpenInChatView ? r.apps.showNextCachedImage({
                uri: a,
                ratio: i,
                isPhoto: u,
                curProps: e.curProps
              }) : r.apps.showPrevCachedImage({
                uri: a,
                ratio: i,
                isPhoto: u,
                curProps: e.curProps
              });
            },
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              backgroundColor: r.theme.dark,
              justifyContent: "center",
              alignItems: "center",
              transform: [{
                scale: 1
              }, {
                translateX: 0
              }, {
                translateY: 0
              }]
            },
            onLongPress: this.onRecoveryImageLongPress
          }, u && !/=gif|\.gif/i.test(a) ? o["default"].createElement(r.CachedImage, {
            style: {
              width: this.width,
              height: this.height
            },
            defaultSource: {
              uri: a
            },
            isPhoto: !0,
            fadeDuration: 0
          }) : o["default"].createElement(s.Image, {
            style: {
              width: this.width,
              height: this.height
            },
            source: {
              uri: a
            },
            fadeDuration: 0
          })), o["default"].createElement(b, {
            uri: a
          })), o["default"].createElement(s.TouchableOpacity, {
            onPress: this.onDownloadPress,
            style: {
              position: "absolute",
              bottom: (r.theme.iphoneXDiff || 0) + 44,
              left: (r.theme.winWidth - 150) / 2,
              width: 150,
              height: 38,
              borderRadius: 8,
              backgroundColor: "rgba(20,35,40,0.88)",
              alignItems: "center",
              justifyContent: "center"
            }
          }, o["default"].createElement(s.Text, {
            style: {
              color: "#fff",
              fontSize: 15
            }
          }, this.state.recoverySaveError || this.state.recoverySaveStatus || "保存到本地")));
        }
        return null;
      },
      onRecoveryImageLongPress: function () {
        var self = this,
          props = this.curProps || {};
        return r.apps.locateRecoveryImage({
          imgId: this.state.imgId,
          uri: this.state.uri,
          rawImgId: props.rawImgId,
          message: props.recoveryMessage,
          peer: props.recoveryPeer,
          ownerId: props.recoveryOwnerId,
          avatar: props.recoveryAvatar,
          returnTo: props.recoveryReturnTo
        }, function () {
          props.recoveryResumeHistory = false;
          props.recoveryResumeStorage = false;
          r.apps.emit("closeModelImage" + self.props.mseq);
        });
      }
    }),
    b = o["default"].createClass({
      displayName: "PicBoardSelectBar",
      getInitialState: function () {
        return {
          selected: -1 !== r.apps.selectedImageUris.indexOf(this.props.uri)
        };
      },
      componentWillReceiveProps: function (e) {
        -1 !== r.apps.selectedImageUris.indexOf(e.uri) ? this.setState({
          selected: !0
        }) : this.setState({
          selected: !1
        });
      },
      onPress: function () {
        var e = this;
        this.setState({
          selected: !this.state.selected
        }, function () {
          r.apps.emit("picboardElemSelectChanged_" + e.props.uri, e.state.selected);
        });
      },
      render: function () {
        var e = 0;
        return r.theme.isIphoneX && (e = r.theme.iphoneXDiff), o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            flexDirection: "row",
            top: r.theme.winHeight - r.theme.statusHeightAll - 36 - e,
            backgroundColor: "rgba(0,0,0,0.6)",
            left: 0,
            width: r.theme.winWidth,
            height: 36,
            justifyContent: "flex-end",
            alignItems: "center"
          }
        }, o["default"].createElement(s.TouchableOpacity, {
          rejectResponderTermination: !0,
          onPress: this.onPress,
          style: {
            height: 36,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 8
          }
        }, o["default"].createElement(r.FontAwesome, {
          style: {
            backgroundColor: r.theme.transparent,
            marginRight: 5
          },
          name: "check-circle",
          size: 23,
          color: this.state.selected ? r.theme.deepGreen : "#ccc"
        }), o["default"].createElement(s.Text, {
          style: {
            fontSize: 18,
            color: r.theme.white
          }
        }, (0, r.tr)("Select"))));
      }
    }),
    v = o["default"].createClass({
      displayName: "CachedVideoBar",
      getInitialState: function () {
        this.parent = this.props.parent;
        var e = {
          videoSliderValue: this.props.videoSliderValue
        };
        return 1 === this.parent.props.picboard && (e.selected = -1 !== r.apps.selectedImageUris.indexOf(this.parent.state.uri)), e;
      },
      setSliderValue: function (e) {
        this.setState({
          videoSliderValue: e
        });
      },
      onPressSelect: function () {
        var e = this;
        this.setState({
          selected: !this.state.selected
        }, function () {
          r.apps.emit("picboardElemSelectChanged_" + e.parent.state.uri, e.state.selected);
        });
      },
      componentWillReceiveProps: function (e) {
        -1 !== r.apps.selectedImageUris.indexOf(this.parent.state.uri) ? this.setState({
          selected: !0
        }) : this.setState({
          selected: !1
        });
      },
      render: function () {
        var e = this,
          t = !r.apps.pictureBoardPicPressed && r.apps.curNavigator.routes.sessionPicBoard,
          a = 0;
        return r.theme.isIphoneX && (a = r.theme.iphoneXDiff), o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            flexDirection: "row",
            top: r.theme.winHeight - r.theme.statusHeightAll - 36 - a,
            backgroundColor: "rgba(0,0,0,0.2)",
            left: 0,
            width: r.theme.winWidth,
            height: 36,
            justifyContent: "center",
            alignItems: "center"
          }
        }, !this.parent.props.picboard && t ? o["default"].createElement(s.TouchableOpacity, {
          style: {
            justifyContent: "center",
            alignItems: "center",
            width: 36,
            height: 36
          },
          onPress: function () {
            r.apps.closeAllModelView(), r.apps.curNavigator.navi.navForward(r.apps.curNavigator.routes.sessionPicBoard, function () {
              return s.Navigator.SceneConfigs.VerticalUpSwipeJump;
            });
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.View, {
          style: {
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 3,
            width: 24,
            height: 24
          }
        }, o["default"].createElement(r.Ionicons, {
          name: "ios-folder-open",
          style: {
            paddingTop: 2
          },
          size: 18,
          color: r.theme.white
        }))) : null, o["default"].createElement(s.TouchableOpacity, {
          style: {
            justifyContent: "center",
            alignItems: t ? "flex-start" : "center",
            width: t ? 30 : 36,
            height: 36
          },
          onPress: function () {
            e.parent.setState({
              isVideoPaused: !e.parent.state.isVideoPaused
            });
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.View, {
          style: {
            justifyContent: "center",
            alignItems: "center",
            width: 24,
            height: 24,
            paddingTop: 2,
            paddingLeft: 5
          }
        }, o["default"].createElement(r.Ionicons, {
          style: {},
          name: this.parent.state.isVideoPaused ? "md-play" : "md-pause",
          size: 20,
          color: r.theme.white
        }))), o["default"].createElement(s.TouchableOpacity, {
          style: {
            width: 36,
            height: 36,
            justifyContent: "center",
            alignItems: "center"
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 12,
            color: r.theme.white
          }
        }, this.parent.calcTime(this.parent.videoCurrentTime))), o["default"].createElement(s.TouchableOpacity, {
          style: {
            flex: 1,
            height: 36,
            marginHorizontal: 5
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(r.Slider, {
          style: {
            flex: 1
          },
          onValueChange: function (t) {
            e.parent.videoCurrentTime = Math.round(e.parent.videoDuration * t), e.parent.videoPlayer.seek(e.parent.videoCurrentTime), e.setState({
              videoSliderValue: t
            });
          },
          onSlidingStart: this.parent.onVideoSlideStart,
          onSlidingComplete: this.parent.onVideoSlideComplete,
          value: this.parent.state.videoSliderValue,
          minimumTrackTintColor: r.theme.deepGreen2,
          maximumTrackTintColor: r.theme.white,
          thumbTintColor: r.theme.white,
          thumbTouchSize: {
            width: 36,
            height: 36
          },
          thumbStyle: {
            width: 17,
            height: 17
          },
          trackStyle: {
            height: 2
          }
        })), o["default"].createElement(s.TouchableOpacity, {
          style: {
            width: 36,
            height: 36,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 5
          },
          rejectResponderTermination: !0
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 12,
            color: r.theme.white
          }
        }, this.parent.calcTime(this.parent.videoDuration))), 1 === this.parent.props.picboard ? o["default"].createElement(s.TouchableOpacity, {
          rejectResponderTermination: !0,
          onPress: this.onPressSelect,
          style: {
            height: 36,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 8
          }
        }, o["default"].createElement(r.FontAwesome, {
          style: {
            backgroundColor: r.theme.transparent,
            marginRight: 5
          },
          name: "check-circle",
          size: 23,
          color: this.state.selected ? r.theme.deepGreen : "#ccc"
        }), o["default"].createElement(s.Text, {
          style: {
            fontSize: 18,
            color: r.theme.white
          }
        }, (0, r.tr)("Select"))) : null);
      }
    }),
    S = o["default"].createClass({
      displayName: "CachedVideo",
      getInitialState: function () {
        this.videoDuration = 0, this.timer = null, this.thumbRendered = !1, this.firstPlay = !0, this.videoCurrentTime = 0;
        var e = this.props,
          t = e.display,
          a = e.isVideoPaused,
          i = e.videoThumb,
          n = e.imgId,
          o = e.uri;
        return {
          imgId: n,
          uri: o,
          videoThumb: i,
          isVideoPaused: a,
          display: t,
          isBuffering: !1,
          videoSliderValue: 0,
          show: !0
        };
      },
      calcTime: function (e) {
        var t = Math.floor(e / 60),
          a = e.toFixed(0) % 60;
        return t >= 0 && 9 >= t && (t = "0" + t), a >= 0 && 9 >= a && (a = "0" + a), t + ":" + a;
      },
      onVideoLoad: function (e) {
        this.videoDuration = e.duration;
      },
      setBufferSpinTimer: function (e) {
        var t = this;
        clearTimeout(this.timer), this.state.isVideoPaused && !e || (this.timer = setTimeout(function () {
          t.state.isVideoPaused || t.setState({
            isBuffering: !0
          });
        }, 1e3));
      },
      onVideoProgress: function (e) {
        this.state.isVideoPaused || (this.videoCurrentTime = e.currentTime, this.videoCurrentTime > 0 && (this.firstPlay = !1), this.videoCurrentTime > this.videoDuration || (this.setState({
          isBuffering: !1,
          videoSliderValue: this.videoCurrentTime / this.videoDuration
        }), this.setBufferSpinTimer()));
      },
      onVideoEnd: function () {
        this.videoPlayer.seek(0);
      },
      onVideoError: function (e) {
        (0, r.tlog)("error", "onVideoError", e);
      },
      onVideoBuffer: function (e) {},
      onVideoSlideStart: function () {
        this.setState({
          isVideoPaused: !0
        });
      },
      onVideoSlideComplete: function () {
        this.setState({
          isVideoPaused: !1
        });
      },
      changeState: function (e) {
        var t = this,
          a = e.isVideoPaused,
          i = e.videoThumb,
          n = e.imgId,
          o = e.uri,
          s = e.display,
          r = !1;
        this.thumbRendered = !1;
        var l = {
          isVideoPaused: a,
          imgId: n,
          uri: o,
          videoThumb: i,
          display: s
        };
        e.uri !== this.props.uri && (this.firstPlay = !0, l.show = !1, r = !0), this.setState(l, function () {
          r && t.setState({
            show: !0
          });
        });
      },
      componentDidMount: function () {
        this.setBufferSpinTimer(!this.props.isVideoPaused), this.changeState(this.props);
      },
      componentWillReceiveProps: function (e) {
        this.setBufferSpinTimer(!e.isVideoPaused), this.changeState(e);
      },
      renderBufferingSpin: function () {
        var e = 0;
        return r.theme.isIphoneX && (e = r.theme.iphoneXDiff), this.state.display && this.state.isBuffering ? o["default"].createElement(r.Progress.Bar, {
          style: {
            position: "absolute",
            left: 0,
            bottom: 36 + e,
            borderWidth: 0,
            height: 1
          },
          indeterminate: !0,
          color: r.theme.deepGreen2,
          width: r.theme.winWidth
        }) : null;
      },
      renderStartImage: function () {
        return this.state.show && this.firstPlay ? this.state.imgId ? o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            backgroundColor: r.theme.dark,
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(r.CachedImage, {
          style: {
            width: this.props.width,
            height: this.props.height,
            borderRadius: 4
          },
          imageId: this.state.imgId,
          fadeDuration: 0
        })) : this.state.videoThumb ? o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            backgroundColor: r.theme.dark,
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.Image, {
          style: {
            width: this.props.width,
            height: this.props.height,
            borderRadius: 4
          },
          source: {
            uri: "file://" + this.state.videoThumb
          },
          fadeDuration: 0
        })) : null : null;
      },
      render: function () {
        var e = this;
        return this.state.show ? o["default"].createElement(s.View, {
          style: {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
          }
        }, o["default"].createElement(r.Video, {
          style: [{
            flex: 1
          }, "ios" === s.Platform.OS && {
            backgroundColor: r.theme.transparent
          }],
          ref: function (t) {
            return e.videoPlayer = t;
          },
          source: {
            uri: this.state.uri
          },
          resizeMode: "contain",
          muted: !1,
          ignoreSilentSwitch: "ignore",
          repeat: !0,
          paused: this.state.isVideoPaused,
          onLoad: this.onVideoLoad,
          onBuffer: this.onVideoBuffer,
          onProgress: this.onVideoProgress,
          onEnd: this.onVideoEnd,
          onError: this.onVideoError
        }), this.renderStartImage(), this.renderBufferingSpin(), o["default"].createElement(v, {
          ref: function (t) {
            return e.cachedVideoBar = t;
          },
          parent: this
        })) : null;
      }
    }),
    V = o["default"].createClass({
      displayName: "ScalableView",
      initMembers: function (e) {
        clearTimeout(this.recoveryLongTimer);
        this.recoveryNativeTouch=null;this.recoveryNativeHandled=false;this.recoveryNativeMoved=false;
        this.startPageX = 0, this.startPageY = 0, e && (this.style = {}), this.translateX = 0, this.translateY = 0, this.prevTranslateX = 0, this.prevTranslateY = 0, this.prevTime = 0, this.closeTimer = null, this.initialDist = 0, this.prevScale = 1, this.scale = 1, this.multiTouched = !1;
      },
      getInitialState: function () {
        return this.initMembers(!0), {};
      },
      resetScalable: function () {
        this.props.onPress();
      },
      componentWillMount: function () {
        this.style = babelHelpers["extends"]({}, this.props.style), this.style.transform = this.props.style.transform.map(function (e) {
          return babelHelpers["extends"]({}, e);
        }), r.apps.on("resetScalable", this.resetScalable);
      },
      componentWillUnmount: function () {
        clearTimeout(this.recoveryLongTimer);
        r.apps.unon("resetScalable", this.resetScalable);
      },
      componentWillReceiveProps: function (e) {
        if(e.nativePaging&&this.props.nativePaging&&e.recoveryImageKey===this.props.recoveryImageKey&&e.recoveryPageActive===this.props.recoveryPageActive)return;
        this.initMembers(!0), this.style = babelHelpers["extends"]({}, e.style), this.style.transform = e.style.transform.map(function (e) {
          return babelHelpers["extends"]({}, e);
        }), this.viewRef.setNativeProps({
          style: this.style
        });
        if(e.nativePaging&&e.recoveryPageActive&&e.onScaleChange)e.onScaleChange(1);
      },
      render: function () {
        var e = this;
        return o["default"].createElement(s.View, {
          ref: function (t) {
            return e.viewRef = t;
          },
          style: this.props.style,
          onStartShouldSetResponder: function (event) {
            return !e.props.nativePaging||e.scale>1.01||event.nativeEvent.touches.length>1;
          },
          onMoveShouldSetResponder: function (event) {
            return !e.props.nativePaging||e.scale>1.01||event.nativeEvent.touches.length>1;
          },
          onMoveShouldSetResponderCapture:e.props.nativePaging?function(event){return e.scale>1.01||event.nativeEvent.touches.length>1;}:undefined,
          onTouchStart:function(event){
            if(!e.props.nativePaging)return;clearTimeout(e.recoveryLongTimer);var touch=event.nativeEvent;
            if(touch.touches.length!==1){e.recoveryNativeMoved=true;return;}if(e.scale>1.01)return;
            e.recoveryNativeHandled=false;e.recoveryNativeMoved=false;e.recoveryLongPressed=false;e.recoveryNativeTouch={x:touch.pageX,y:touch.pageY};
            if(e.props.onLongPress)e.recoveryLongTimer=setTimeout(function(){e.recoveryLongPressed=true;e.props.onLongPress();},600);
          },
          onTouchMove:function(event){
            if(!e.props.nativePaging)return;var start=e.recoveryNativeTouch,touch=event.nativeEvent;
            if(touch.touches.length!==1||start&&(Math.abs(touch.pageX-start.x)>10||Math.abs(touch.pageY-start.y)>10)){e.recoveryNativeMoved=true;clearTimeout(e.recoveryLongTimer);}
          },
          onTouchEnd:function(event){
            if(!e.props.nativePaging)return;clearTimeout(e.recoveryLongTimer);if(event.nativeEvent.touches.length)return;
            var start=e.recoveryNativeTouch,touch=event.nativeEvent.changedTouches&&event.nativeEvent.changedTouches[0]||event.nativeEvent;
            if(start&&!e.recoveryNativeHandled&&!e.recoveryNativeMoved&&!e.recoveryLongPressed&&Math.abs(touch.pageX-start.x)<10&&Math.abs(touch.pageY-start.y)<10)e.props.onPress();
            e.recoveryNativeTouch=null;e.recoveryNativeHandled=false;e.recoveryLongPressed=false;
          },
          onTouchCancel:function(){if(e.props.nativePaging){clearTimeout(e.recoveryLongTimer);e.recoveryNativeTouch=null;}},
          onResponderTerminationRequest:e.props.nativePaging?function(){return e.scale<=1.01&&!e.multiTouched;}:undefined,
          onResponderTerminate:function(){clearTimeout(e.recoveryLongTimer);e.recoveryNativeTouch=null;},
          onResponderGrant: function (t) {
            if(e.props.nativePaging){e.recoveryNativeHandled=true;if(e.props.onScaleChange)e.props.onScaleChange(t.nativeEvent.touches.length>1?Math.max(e.scale,1.02):e.scale);}
            if (1 === t.nativeEvent.touches.length) e.translateX = 0, e.translateY = 0, e.startPageX = t.nativeEvent.pageX, e.startPageY = t.nativeEvent.pageY, e.multiTouched = !1;else {
              var a = babelHelpers.slicedToArray(t.nativeEvent.touches, 2),
                i = a[0],
                n = a[1],
                o = n.pageX - i.pageX,
                s = n.pageY - i.pageY;
              e.initialDist = Math.sqrt(o * o + s * s), e.multiTouched = !0;
            }
            e.recoveryLongPressed = false;
            clearTimeout(e.recoveryLongTimer);
            if (e.props.onLongPress && t.nativeEvent.touches.length === 1) e.recoveryLongTimer = setTimeout(function () {
              e.recoveryLongPressed = true;
              e.props.onLongPress();
            }, 600);
          },
          onResponderMove: function (t) {
            if (t.nativeEvent.touches.length !== 1 || Math.abs(t.nativeEvent.pageX - e.startPageX) > 10 || Math.abs(t.nativeEvent.pageY - e.startPageY) > 10) clearTimeout(e.recoveryLongTimer);
            if (1 !== t.nativeEvent.touches.length || e.multiTouched) {
              if (2 === t.nativeEvent.touches.length) {
                e.multiTouched = !0;
                var a = babelHelpers.slicedToArray(t.nativeEvent.touches, 2),
                  i = a[0],
                  n = a[1],
                  o = n.pageX - i.pageX,
                  s = n.pageY - i.pageY,
                  r = Math.sqrt(o * o + s * s);
                0 === e.initialDist && (e.initialDist = r), e.scale = e.prevScale * r / e.initialDist, e.style.transform[0].scale = e.scale, e.viewRef.setNativeProps({
                  style: e.style
                });
                if(e.props.nativePaging&&e.props.onScaleChange)e.props.onScaleChange(e.scale);
              }
            } else e.multiTouched = !1, e.translateX = t.nativeEvent.pageX - e.startPageX, e.translateY = t.nativeEvent.pageY - e.startPageY, e.style.transform[1].translateX = e.prevTranslateX + e.translateX, e.style.transform[2].translateY = e.prevTranslateY + e.translateY, e.viewRef.setNativeProps({
              style: e.style
            });
          },
          onResponderRelease: function (t) {
            clearTimeout(e.recoveryLongTimer);
            if (e.recoveryLongPressed) {
              e.recoveryLongPressed = false;
              return;
            }
            if(e.props.nativePaging){
              if(e.scale<=1.01){e.translateX=e.translateY=e.prevTranslateX=e.prevTranslateY=0;e.scale=e.prevScale=1;e.style.transform[0].scale=1;e.style.transform[1].translateX=e.style.transform[2].translateY=0;e.viewRef.setNativeProps({style:e.style});}
              else{if(!e.multiTouched){e.prevTranslateX+=e.translateX;e.prevTranslateY+=e.translateY;}e.prevScale=e.scale;}
              e.initialDist=0;if(e.props.onScaleChange)e.props.onScaleChange(e.scale);return;
            }
            if (!e.multiTouched) {
              var a = t.nativeEvent.pageX,
                i = t.nativeEvent.pageY,
                n = a - e.startPageX,
                o = i - e.startPageY;
              if (e.props.onHorizontalSwipe && Math.abs(e.scale - 1) < .01) {
                // Return to the current photo while the adjacent record or its
                // viewing confirmation is pending. Vertical drags are not pages.
                e.translateX = e.translateY = e.prevTranslateX = e.prevTranslateY = 0;
                e.scale = e.prevScale = 1;
                e.initialDist = 0;
                e.style.transform[0].scale = 1;
                e.style.transform[1].translateX = 0;
                e.style.transform[2].translateY = 0;
                e.viewRef.setNativeProps({style: e.style});
                if (Math.abs(n) >= 48 && Math.abs(n) > Math.abs(o) * 1.3) e.props.onHorizontalSwipe(n < 0 ? 1 : -1);
                else if (Math.sqrt(n * n + o * o) < 10) e.props.onPress();
                return;
              }
              if (Math.abs(n) > Math.abs(o)) var s = n > 0 ? "prev" : "next";else s = o > 0 ? "prev" : "next";
              var r = Math.sqrt(n * n + o * o);
              r > 10 && 1 === e.scale ? "prev" === s ? e.props.onPrev() : e.props.onNext() : 10 > r && e.props.onPress(), e.prevTranslateX += e.translateX, e.prevTranslateY += e.translateY;
            }
            e.prevScale = e.scale, e.initialDist = 0;
          }
        }, this.props.children);
      }
    });
  // A bounded native scroll window keeps decoded neighboring photos alive.
  // Its drag and deceleration run in UIScrollView without per-frame JS work.
  var RecoveryPhotoPager=o["default"].createClass({
    displayName:"RecoveryPhotoPager",
    getInitialState:function(){return {previous:null,next:null,error:""};},
    valid:function(){return !this.closed&&this.props.ownerId===r.apps.userid&&this.props.database===r.db;},
    samePhoto:function(a,b){return !!a&&!!b&&a.msgid===b.msgid;},
    centerIndex:function(){return this.state.previous?1:0;},
    enabled:function(){return this.valid()&&!this.zoomed&&!this.turning&&!this.awaitingCommit&&!!(this.state.previous||this.state.next);},
    syncScroll:function(){var enabled=this.enabled();if(this.scrollRef&&this.lastEnabled!==enabled){this.lastEnabled=enabled;this.scrollRef.setNativeProps({scrollEnabled:enabled});}},
    center:function(animated){if(!this.valid()||!this.scrollRef)return;this.scrollRef.scrollTo({x:this.centerIndex()*this.props.width,y:0,animated:!!animated});},
    setZoomed:function(scale){var zoomed=scale>1.01;if(zoomed===this.zoomed)return;this.zoomed=zoomed;this.syncScroll();},
    subscribe:function(props){var event="msgsDataChanged_"+r.apps.recoveryMessageFid(props.message);if(event===this.messageEvent)return;if(this.messageEvent)r.apps.unon(this.messageEvent,this.reload);this.messageEvent=event;r.apps.on(event,this.reload);},
    componentDidMount:function(){this.subscribe(this.props);r.apps.on("recoveryRecordsDeleted",this.reload);this.reload();},
    componentWillUnmount:function(){this.closed=true;this.request=(this.request||0)+1;clearTimeout(this.endDragTimer);clearTimeout(this.commitTimer);if(this.messageEvent)r.apps.unon(this.messageEvent,this.reload);r.apps.unon("recoveryRecordsDeleted",this.reload);},
    componentWillReceiveProps:function(next){
      if(this.samePhoto(next.message,this.props.message)&&next.ownerId===this.props.ownerId&&next.database===this.props.database&&next.peer===this.props.peer)return;
      var sameOwner=next.ownerId===this.props.ownerId&&next.database===this.props.database&&next.peer===this.props.peer;
      var previous=sameOwner&&this.samePhoto(next.message,this.state.next)?this.props.message:null;
      var following=sameOwner&&this.samePhoto(next.message,this.state.previous)?this.props.message:null;
      this.turning=this.awaitingCommit=this.pendingGesture=null;this.zoomed=false;this.dragging=false;clearTimeout(this.commitTimer);clearTimeout(this.endDragTimer);
      this.setState({previous:previous,next:following,error:""});this.subscribe(next);this.loadNeighbors(next);
    },
    componentDidUpdate:function(previousProps,previousState){
      if(!this.samePhoto(previousProps.message,this.props.message)||previousProps.width!==this.props.width||!!previousState.previous!==!!this.state.previous)this.center(false);
      this.syncScroll();
    },
    reload:function(){return this.loadNeighbors(this.props);},
    loadNeighbors:function(props){
      var self=this,request=this.request=(this.request||0)+1,identity=props.ownerId,database=props.database,message=props.message;
      function current(){return self.valid()&&request===self.request&&self.props.ownerId===identity&&self.props.database===database&&self.samePhoto(self.props.message,message);}
      return Promise.resolve().then(function(){if(!current())return null;return Promise.all([r.apps.recoveryAdjacentChatImage(message,props.peer,-1),r.apps.recoveryAdjacentChatImage(message,props.peer,1)]);}).then(function(messages){
        if(!messages||!current())return;var previous=messages[0],next=messages[1];if(self.samePhoto(previous,message))previous=null;if(self.samePhoto(next,message)||self.samePhoto(next,previous))next=null;
        self.setState({previous:previous,next:next,error:""});
      }).catch(function(){if(current())self.setState({error:"相邻照片读取失败，请重新打开后重试"});});
    },
    locked:function(message){return !!message&&message.type===3&&message.fromId!==this.props.ownerId&&!!message.isnew;},
    beginDrag:function(){this.dragging=true;this.momentum=false;this.pendingGesture={};clearTimeout(this.endDragTimer);},
    endDrag:function(event){
      var self=this,offset=event.nativeEvent.contentOffset.x,gesture=this.pendingGesture;clearTimeout(this.endDragTimer);
      this.endDragTimer=setTimeout(function(){if(self.closed||self.momentum||!gesture||gesture!==self.pendingGesture)return;self.pendingGesture=null;self.dragging=false;if(Math.abs(offset/ self.props.width-Math.round(offset/self.props.width))<.01)self.settle(offset);else self.center(true);},120);
    },
    beginMomentum:function(){this.momentum=!!this.pendingGesture;clearTimeout(this.endDragTimer);},
    endMomentum:function(event){this.momentum=false;this.dragging=false;clearTimeout(this.endDragTimer);if(!this.pendingGesture)return Promise.resolve(false);this.pendingGesture=null;return this.settle(event.nativeEvent.contentOffset.x);},
    settle:function(offset){
      if(!this.valid()||this.turning||this.awaitingCommit||this.zoomed)return Promise.resolve(false);
      var index=Math.round(offset/this.props.width),center=this.centerIndex();if(index===center)return Promise.resolve(false);
      var direction=index>center?1:-1,target=direction>0?this.state.next:this.state.previous;
      if(!target){this.center(true);return Promise.resolve(false);}
      var self=this,token={message:this.props.message,ownerId:this.props.ownerId,database:this.props.database};this.turning=token;this.syncScroll();
      // Unviewed photos are never decoded or revealed before star confirmation.
      if(this.locked(target))this.center(false);
      return Promise.resolve().then(function(){if(!self.valid()||self.turning!==token)return false;return self.props.onPage(direction);}).then(function(moved){
        if(!self.valid()||self.turning!==token)return !!moved;self.turning=null;
        if(moved&&self.samePhoto(self.props.message,token.message)){
          self.awaitingCommit=token;self.commitTimer=setTimeout(function(){if(self.awaitingCommit!==token||!self.valid())return;self.awaitingCommit=null;self.center(false);self.syncScroll();},700);
        }else{self.center(!moved);self.syncScroll();}return !!moved;
      },function(){if(self.valid()&&self.turning===token){self.turning=null;self.center(true);self.syncScroll();}return false;});
    },
    press:function(longPress){if(this.valid()&&!this.dragging&&!this.turning&&!this.awaitingCommit)(longPress?this.props.onLongPress:this.props.onPress)();},
    renderPage:function(message){
      var self=this,current=this.samePhoto(message,this.props.message),width=this.props.width,height=this.props.height;
      var pageStyle={width:width,height:height,backgroundColor:"#000"};
      if(!current&&this.locked(message))return o["default"].createElement(s.View,{key:this.props.ownerId+":"+message.msgid,pointerEvents:"none",style:Object.assign({},pageStyle,{alignItems:"center",justifyContent:"center"})},o["default"].createElement(s.Text,{style:{color:"#aaa",fontSize:14}},"松开后确认查看"));
      var image=current?this.props.image:null,ratio=image&&image.ratio||message.width>0&&message.height>0&&message.width/message.height||1;
      var imageId=image?image.imgId:message.imgId||"",uri=image?image.uri:message.uri||"",fitHeight=Math.max(1,height-(r.theme.statusHeightAll||0));
      var raw=(message.rawImgId||"").split(":")[0],cachedRaw=raw&&r.apps.getImageUriCache&&r.apps.getImageUriCache(raw);
      if(imageId&&cachedRaw&&cachedRaw!=="__cloudrepodeleted__")imageId=raw;
      var imageWidth=image&&image.width||Math.min(width,fitHeight*ratio),imageHeight=image&&image.height||imageWidth/ratio;
      var imageProps={style:{width:ratio<.4?width:imageWidth,height:ratio<.4?width/ratio:imageHeight},resizeMode:"contain",fadeDuration:0};
      var picture=imageId?o["default"].createElement(r.CachedImage,Object.assign({},imageProps,{imageId:imageId,recoveryKeepLoadedImage:true})):
        /=gif|\.gif/i.test(uri)?o["default"].createElement(s.Image,Object.assign({},imageProps,{source:{uri:uri}})):
        o["default"].createElement(r.CachedImage,Object.assign({},imageProps,{defaultSource:{uri:uri},isPhoto:true,recoveryKeepLoadedImage:true}));
      var press=function(){if(current)self.press(false);},longPress=function(){if(current)self.press(true);};
      return o["default"].createElement(s.View,{key:this.props.ownerId+":"+message.msgid,pointerEvents:current?"auto":"none",style:pageStyle},ratio<.4?
        o["default"].createElement(s.ScrollView,{style:{flex:1},automaticallyAdjustContentInsets:false,directionalLockEnabled:true,alwaysBounceHorizontal:false},o["default"].createElement(s.TouchableOpacity,{noOpacictyActive:true,onPress:press,onLongPress:longPress},picture)):
        o["default"].createElement(V,{nativePaging:true,recoveryImageKey:this.props.ownerId+":"+message.msgid+":"+width,recoveryPageActive:current,onScaleChange:this.setZoomed,onPress:press,onLongPress:longPress,onNext:function(){},onPrev:function(){},style:{position:"absolute",top:0,left:0,right:0,bottom:0,alignItems:"center",justifyContent:"center",transform:[{scale:1},{translateX:0},{translateY:0}]}},picture));
    },
    render:function(){
      var self=this,pages=[];if(this.state.previous)pages.push(this.state.previous);pages.push(this.props.message);if(this.state.next)pages.push(this.state.next);
      return o["default"].createElement(s.View,{style:{flex:1}},o["default"].createElement(s.ScrollView,{
        ref:function(view){self.scrollRef=view;self.lastEnabled=undefined;self.syncScroll();},horizontal:true,pagingEnabled:true,directionalLockEnabled:true,
        decelerationRate:"fast",bounces:true,alwaysBounceVertical:false,alwaysBounceHorizontal:false,automaticallyAdjustContentInsets:false,
        removeClippedSubviews:false,showsHorizontalScrollIndicator:false,showsVerticalScrollIndicator:false,scrollEnabled:this.enabled(),
        contentOffset:{x:this.centerIndex()*this.props.width,y:0},style:{flex:1},contentContainerStyle:{height:this.props.height},
        onScrollBeginDrag:this.beginDrag,onScrollEndDrag:this.endDrag,onMomentumScrollBegin:this.beginMomentum,onMomentumScrollEnd:this.endMomentum
      },pages.map(this.renderPage)),this.state.error?o["default"].createElement(s.Text,{pointerEvents:"none",style:{position:"absolute",top:12,left:12,right:12,textAlign:"center",color:"#aaa",fontSize:12}},this.state.error):null);
    }
  });
  ({
    faqNumView: {
      position: "absolute",
      left: 6,
      top: 9,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: r.theme.warn,
      justifyContent: "center",
      alignItems: "center"
    },
    faqNumText: {
      color: r.theme.white,
      fontSize: 8
    },
    interactionBarView: {
      position: "absolute",
      width: r.theme.winWidth,
      height: r.theme.barHeight,
      left: 0,
      top: r.theme.navHeight,
      backgroundColor: r.theme.info,
      justifyContent: "center",
      alignItems: "center",
      paddingLeft: 20
    },
    interactionBarViewInner: {
      position: "relative",
      left: -25,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center"
    },
    interactionBarIconView: {
      marginRight: 15
    },
    interactionBarText: {
      marginLeft: "ios" == s.Platform.OS ? 10 : -10,
      color: r.theme.deep7,
      fontSize: 15,
      paddingBottom: "android" == s.Platform.OS ? 1 : 0
    }
  });
  i["default"] = u;
});
