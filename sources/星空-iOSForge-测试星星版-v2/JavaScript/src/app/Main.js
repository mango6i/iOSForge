// Free maintenance changes; original factory retained under reference/original-modules/310.js.
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
        }));
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
        }), r.apps.on("closePickingView", function (t) {
          r.apps.modelViewRef.unHide(), r.apps.contextMenusRef.unHide(), r.apps.emit("hideTermView", !1), r.apps.pickingViewShowing = !1, delete e.onTouch, r.apps.emit("closeModelImage"), delete e.pickupViewShown, e.onCloseCallback && (e.onCloseCallback(), delete e.onCloseCallback), e.setState({
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
        return this.downloadingMap = {}, {
          uri: "",
          imgId: "",
          ratio: 0,
          rawImgId: "",
          display: !1,
          isVideo: !1,
          isVideoPaused: !0
        };
      },
      showRaw: function (e) {
        this.setState({
          display: !0,
          rawId: e
        });
      },
      onDownloadPress: function () {
        var e = this,
          t = function () {
            var t = e.state.imgId;
            if ("/" === t[0]) {
              var a = r.apps.getImageUriCache(t.slice(1));
              t = t.match(/.*\/(.*)/)[1];
            } else {
              var i = r.apps.getImageIdSubDir(t),
                n = r.fs.DocumentDirectoryPath + "/cachedImages/" + i;
              a = n + "/" + t;
            }
            r.ImagePickerManager.saveImage(a, t, function (e) {
              e.error ? (0, r.tlog)("error", "save image", e.error) : r.apps.tip((0, r.tr)("Saved"), !0);
            });
          };
        r.apps.requestPhotoDiag(), r.apps.on("photoPermissionChanged", function () {
          r.apps.unon("photoPermissionChanged"), r.apps.permissions.photo ? t() : r.apps.tip((0, r.tr)("Saving eed access to Photo albums"));
        });
      },
      onRawPress: function () {
        var e = this;
        if (this.rawExist) this.modelImageViewBarRef.setNotShowRaw(), this.rawIdPrev = this.state.imgId, this.setState({
          imgId: this.rawId
        });else {
          if (this.modelImageViewBarRef.setState({
            showDownloadRawProgress: !0,
            downloadRawProgress: 0
          }), this.downloadingMap[this.rawId]) return;
          r.fs.exists(this.subdir).then(function (t) {
            return t ? void 0 : r.fs.mkdir(e.subdir, !0);
          }).then(function (t) {
            var a = -1,
              i = 0,
              n = function o() {
                var t = r.wsc.getRandUrl(a, "durls");
                r.fs.greetings(JSON.stringify({
                  d: r.apps.deviceId,
                  t: r.apps.now()
                })).then(function (n) {
                  a = t.ridx;
                  var s = "https://" + t.url + "/pic/" + e.rawId + ("?token=" + encodeURIComponent(n)),
                    l = e.rawId,
                    p = e.filepath;
                  return e.downloadingMap[l] = 1, r.fs.downloadFile({
                    fromUrl: s,
                    toFile: e.filepath,
                    timeout: 18e5,
                    pinCert: !0,
                    progress: function (t) {
                      var a = t.contentLength,
                        i = t.bytesWritten;
                      e.modelImageViewBarRef && l === e.rawId && e.modelImageViewBarRef.setState({
                        showDownloadRawProgress: !0,
                        downloadRawProgress: (i / a * 100).toFixed(0)
                      });
                    },
                    downloadAgain: function () {
                      i += 1, o();
                    },
                    tryCnt: i
                  }).then(function (t) {
                    return delete e.downloadingMap[l], (0, r.tlog)("raw image response", t), !t || 200 === t.statusCode && 0 !== t.bytesWritten ? (e.rawIdPrev = e.state.imgId, e.setState({
                      imgId: e.rawId
                    }), e.modelImageViewBarRef && e.modelImageViewBarRef.setNotShowRaw(), r.dbs.addCachedImage(l, p, t.bytesWritten)) : r.fs.unlink(p).then(function () {
                      return Promise.reject(t);
                    });
                  });
                });
              };
            n();
          })["catch"](function (e) {
            (0, r.tlog)("error", "onRawPress", e);
          });
        }
      },
      handleRaw: function (e) {
        var t = this;
        if (e) {
          var a = e.split(":");
          this.rawId = a[0], this.rawSize = a[1];
          var i = r.apps.getImageIdSubDir(this.rawId);
          this.subdir = r.fs.DocumentDirectoryPath + "/cachedImages/" + i, this.filepath = this.subdir + "/" + this.rawId, r.dbs.isCachedImageExist(this.rawId, this.filepath).then(function (e) {
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
            }), t.preVideoLoad || (r.apps.closeAllModelView(e.props.mseq), r.apps.curMseq = e.props.mseq), "ios" !== s.Platform.OS || t.preVideoLoad || s.StatusBarIOS.setHidden(!0), e.curProps = t, e.rawExist = !1, e.rawIdPrev = "", e.imageOpenInChatView = /^interact_/.test(r.apps.currentRoutes[r.apps.currentNavi].name) && !t.picboard;
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
            if (this.width / this.height < .4) return o["default"].createElement(s.ScrollView, {
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
              }
            }, o["default"].createElement(r.CachedImage, {
              style: {
                width: r.theme.winWidth,
                height: this.height / this.width * r.theme.winWidth
              },
              imageId: n,
              fadeDuration: 0
            })));
            if (this.state.checkBig) var c = r.apps.getImageSize(this.width, this.height),
              h = c.width,
              m = c.height;else h = this.width, m = this.height;
            return o["default"].createElement(s.View, {
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
              }
            }), o["default"].createElement(V, {
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
              }
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
            }));
          }
          return u && this.width / this.height < .4 ? o["default"].createElement(s.View, {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0
            }
          }, o["default"].createElement(s.ScrollView, {
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
            }
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
            }
          }), o["default"].createElement(V, {
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
            }
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
          }));
        }
        return null;
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
        r.apps.unon("resetScalable", this.resetScalable);
      },
      componentWillReceiveProps: function (e) {
        this.initMembers(!0), this.style = babelHelpers["extends"]({}, e.style), this.style.transform = e.style.transform.map(function (e) {
          return babelHelpers["extends"]({}, e);
        }), this.viewRef.setNativeProps({
          style: this.style
        });
      },
      render: function () {
        var e = this;
        return o["default"].createElement(s.View, {
          ref: function (t) {
            return e.viewRef = t;
          },
          style: this.props.style,
          onStartShouldSetResponder: function (e) {
            return !0;
          },
          onMoveShouldSetResponder: function (e) {
            return !0;
          },
          onResponderGrant: function (t) {
            if (1 === t.nativeEvent.touches.length) e.translateX = 0, e.translateY = 0, e.startPageX = t.nativeEvent.pageX, e.startPageY = t.nativeEvent.pageY, e.multiTouched = !1;else {
              var a = babelHelpers.slicedToArray(t.nativeEvent.touches, 2),
                i = a[0],
                n = a[1],
                o = n.pageX - i.pageX,
                s = n.pageY - i.pageY;
              e.initialDist = Math.sqrt(o * o + s * s), e.multiTouched = !0;
            }
          },
          onResponderMove: function (t) {
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
              }
            } else e.multiTouched = !1, e.translateX = t.nativeEvent.pageX - e.startPageX, e.translateY = t.nativeEvent.pageY - e.startPageY, e.style.transform[1].translateX = e.prevTranslateX + e.translateX, e.style.transform[2].translateY = e.prevTranslateY + e.translateY, e.viewRef.setNativeProps({
              style: e.style
            });
          },
          onResponderRelease: function (t) {
            if (!e.multiTouched) {
              var a = t.nativeEvent.pageX,
                i = t.nativeEvent.pageY,
                n = a - e.startPageX,
                o = i - e.startPageY;
              if (Math.abs(n) > Math.abs(o)) var s = n > 0 ? "prev" : "next";else s = o > 0 ? "prev" : "next";
              var r = Math.sqrt(n * n + o * o);
              r > 10 && 1 === e.scale ? "prev" === s ? e.props.onPrev() : e.props.onNext() : 10 > r && e.props.onPress(), e.prevTranslateX += e.translateX, e.prevTranslateY += e.translateY;
            }
            e.prevScale = e.scale, e.initialDist = 0;
          }
        }, this.props.children);
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
