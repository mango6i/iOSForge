// Recovered module 322; analysis path, not original filename.
// Original SHA-256 7c0df4c302584b4620e0fc040dcc24d61760d0e60c736de64a667647ed26a59c; original byte range [1237640, 1247560).
__d(322, function (t, e, n, i) {
  Object.defineProperty(i, "__esModule", {
    value: !0
  }), i.WebBrowserView = i.WebBrowserFloatingButton = void 0;
  var s = e(311),
    o = babelHelpers.interopRequireDefault(s),
    a = e(312),
    r = e(314);
  i.WebBrowserFloatingButton = o["default"].createClass({
    displayName: "WebBrowserFloatingButton",
    getInitialState: function () {
      return this.footerY = 0, this.prevDis = 0, this.left = r.theme.winWidth - 40, this.top = r.theme.winHeight / 3 * 2, this.isHide = !1, {
        iconIsEgg: !0,
        settingDisplay: r.apps.embededBrowserFloatingButton,
        setTop: 0
      };
    },
    open: function (t) {
      this.setState({
        settingDisplay: r.apps.embededBrowserFloatingButton,
        iconIsEgg: t
      });
    },
    onOpenLink: function () {
      this.open(!1);
    },
    onEmbededBrowserFloatingButtonSettingChanged: function (t) {
      this.state.setTop !== t && this.setState({
        setTop: t
      });
    },
    onDbIsReady: function () {},
    componentWillUnmount: function () {
      r.apps.unon("dbIsReady", this.onDbIsReady), r.apps.unon("openLink", this.onOpenLink), r.apps.unon("embededBrowserFloatingButtonSettingChanged", this.onEmbededBrowserFloatingButtonSettingChanged);
    },
    componentDidMount: function () {
      r.apps.on("dbIsReady", this.onDbIsReady), r.apps.on("openLink", this.onOpenLink), r.apps.on("embededBrowserFloatingButtonSettingChanged", this.onEmbededBrowserFloatingButtonSettingChanged);
    },
    render: function () {
      var t = this;
      return o["default"].createElement(r.MoveableView, {
        style: {
          position: "absolute",
          left: this.left,
          top: this.state.setTop || r.theme.winHeight + 50,
          height: 40,
          width: 40,
          backgroundColor: r.theme.terminal0,
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center"
        },
        onMove: function (e, n) {
          t.left = e, t.top = n;
        },
        onPress: function () {
          var e = r.apps.views.webBrowser;
          t.state.iconIsEgg ? (r.apps.openWebbrowserInEditMode = !0, (0, r.dismissKeyboard)(), e && e.show(!0), t.open(!1)) : (e && e.hide(), t.open(!0));
        }
      }, this.state.iconIsEgg ? o["default"].createElement(r.FontAwesome, {
        name: "internet-explorer",
        size: 17,
        style: {
          color: r.theme.white
        }
      }) : o["default"].createElement(r.Ionicons, {
        name: "ios-arrow-down",
        size: "ios" === a.Platform.OS ? 28 : 26,
        style: {
          color: r.theme.white,
          paddingTop: "ios" === a.Platform.OS ? 5 : 0
        }
      }));
    }
  }), i.WebBrowserView = o["default"].createClass({
    displayName: "WebBrowserView",
    getInitialState: function () {
      return this.maxHeight = r.theme.winHeight - r.theme.statusHeight, this.defaultScheme = "https://", this.scheme = "https://", this.notexisturl = "about:blank", this.prevUrl = "about:blank", this.isShow = !1, this.isCloseBlank = !1, this.mainPageHasSet = !1, {
        url: this.notexisturl,
        status: "No Page Loaded",
        backButtonEnabled: !1,
        forwardButtonEnabled: !1,
        loading: !1,
        scalesPageToFit: !0,
        top: r.theme.winHeight,
        height: new a.Animated.Value(this.maxHeight - r.apps.statusBarDiff),
        inputText: "",
        isInputFocusing: !1,
        newMsgs: !1,
        showToolbar: !0,
        canGoBack: !1,
        canGoForward: !1,
        firstStart: !0,
        title: ""
      };
    },
    onShouldStartLoadWithRequest: function (t) {
      return !0;
    },
    stopLoading: function () {
      this.webView.stopLoading();
    },
    onNavigationStateChange: function (t) {
      var e = t.url;
      this.prevUrl = e;
      var n = e.match(/(.*:\/\/)(.*)/);
      if (n) {
        this.scheme = n[1];
        var i = n[2];
      } else i = e;
      "/" === i[i.length - 1] && (i = i.slice(0, -1)), this.prevInputText = i, this.setState({
        inputText: i,
        status: t.title,
        loading: t.loading,
        canGoBack: t.canGoBack,
        canGoForward: t.canGoForward
      });
    },
    cancelInput: function () {
      this.setState({
        inputText: this.prevInputText
      }), this.textInput.blur();
    },
    onSubmitEditing: function (t) {
      if (this.state.inputText) {
        if (this.state.inputText === this.prevInputText) this.webView.reload();else {
          var e = this.state.inputText;
          if (/^[a-zA-Z-_]+:/.test(e)) n = e;else var n = this.defaultScheme + e;
          this.setState({
            url: n,
            inputText: e
          });
        }
      } else this.setState({
        inputText: this.prevInputText
      });
      this.textInput.blur();
    },
    handleTextInputChange: function (t) {
      this.setState({
        inputText: t.nativeEvent.text
      });
    },
    onKeyboardWillShow: function (t) {
      var e = this,
        n = t.endCoordinates ? t.endCoordinates.height : t.end.height;
      r.theme.isIphoneX && (n -= r.theme.iphoneXDiff), a.Animated.timing(this.state.height, {
        toValue: this.maxHeight - n - r.apps.statusBarDiff,
        duration: "ios" === a.Platform.OS ? 150 : 50
      }).start(function () {
        e.state.isInputFocusing || e.setState({
          showToolbar: !1
        });
      });
    },
    onKeyboardWillHide: function () {
      var t = this;
      this.textInput && this.textInput.blur(), a.Animated.timing(this.state.height, {
        toValue: this.maxHeight - r.apps.statusBarDiff,
        duration: "ios" === a.Platform.OS ? 150 : 50
      }).start(function () {
        t.setState({
          showToolbar: !0
        });
      });
    },
    onDbIsReady: function () {
      this.mainPageUrl = "China" === r.apps.country ? "https://m.sogou.com" : "https://www.google.com";
    },
    showActionMenu: function () {
      a.Linking.openURL(this.prevUrl), this.hide();
    },
    onTextinputFocus: function () {
      this.prevInputText = this.state.inputText, this.setState({
        isInputFocusing: !0
      });
    },
    onTextinputBlur: function () {
      this.setState({
        isInputFocusing: !1
      });
    },
    injectedJavaScript: function () {
      return "m.2345.com" === this.state.inputText ? "\n        (function() {\n          document.getElementById(\"download_dibu\").style.display = 'none';\n          document.getElementsByClassName('flow-module-1')[0].style.display='none';\n          document.getElementById('tuia-head-container').style.display='none';\n          document.getElementsByClassName('area-logo')[0].style.display='none';\n          document.getElementById('header').style.backgroundColor='rgb(241,244,220)'\n          return JSON.stringify({\n            title: document.getElementsByTagName(\"title\")[0].innerHTML,\n            image: document.getElementsByTagName(\"img\")[0].src\n          });\n        })();\n      " : void 0;
    },
    hide: function () {
      this.show(!1), this.setState({
        newMsgs: !1
      }), r.apps.views.webBrowserFloatingButton.open(!0);
    },
    close: function () {
      this.show(!1), this.stopLoading(), this.setState({
        newMsgs: !1,
        title: ""
      }), this.setBlankPage();
    },
    onOpenLink: function (t) {
      t.title && this.setState({
        title: t.title
      }), this.show(!0, t.uri);
    },
    openUrl: function () {
      a.Linking.openURL(this.prevUrl), this.hide();
    },
    goHome: function () {
      var t = this,
        e = "https://www.baidu.com";
      "China" === r.apps.country && (e = "https://m.sogou.com"), this.setState({
        url: this.prevUrl
      }, function () {
        t.setState({
          url: e
        });
      });
    },
    onNewReceivedMsgs: function () {
      this.setState({
        newMsgs: !0
      });
    },
    onError: function (t) {
      (0, r.tlog)("error", "webView", t), -2 === t.nativeEvent.code && (this.loadPageFailed = !0);
    },
    setBlankPage: function () {
      this.prevUrl !== this.notexisturl && (this.isCloseBlank = !0, this.setNewUrl(this.notexisturl));
    },
    setNewUrl: function (t) {
      var e = this;
      this.setState({
        url: this.prevUrl
      }, function () {
        e.setState({
          url: t
        });
      });
    },
    show: function (t, e) {
      var n = this;
      (0, r.tlog)("showBrowser", t, e, this.isCloseBlank, this.prevUrl), !t || e || this.isCloseBlank || this.prevUrl !== this.notexisturl || this.setState({
        url: this.mainPageUrl
      }), this.isShow = t, this.setState({
        top: t ? 0 : r.theme.winHeight + 100
      }), t ? (this.isCloseBlank && (this.isCloseBlank = !1, this.webView.goBack()), this.state.firstStart || this.setState({
        firstStart: !0
      }), e || a.Clipboard.getString().then(function (t) {
        if (t && "string" == typeof t) {
          var e = t.match(/^(http(s?):\/\/)(.*)/);
          if (e) {
            n.scheme = e[1];
            var i = e[3];
            n.setState({
              inputText: i,
              url: t
            }), a.Clipboard.setString("");
          }
        }
      }), r.apps.on("newReceivedMsgs", this.onNewReceivedMsgs), r.apps.on("keyboardShow", this.onKeyboardWillShow), r.apps.on("keyboardHide", this.onKeyboardWillHide)) : (r.apps.unon("newReceivedMsgs", this.onNewReceivedMsgs), r.apps.unon("keyboardShow", this.onKeyboardWillShow), r.apps.unon("keyboardHide", this.onKeyboardWillHide)), e ? this.setNewUrl(e) : this.loadPageFailed && (this.loadPageFailed = !1, this.webView.reload());
    },
    webBrowserAutoStart: function () {
      this.setState({
        firstStart: !0
      });
    },
    onStatusBarDiffChanged: function () {
      a.Animated.timing(this.state.height, {
        toValue: this.maxHeight - r.apps.statusBarDiff,
        duration: 10
      }).start();
    },
    componentDidMount: function () {
      r.apps.on("statusBarDiffChanged", this.onStatusBarDiffChanged), r.apps.on("openLink", this.onOpenLink), r.apps.on("dbIsReady", this.onDbIsReady), r.apps.on("webBrowserAutoStart", this.webBrowserAutoStart);
    },
    componentWillUnmount: function () {
      r.apps.unon("statusBarDiffChanged", this.onStatusBarDiffChanged), r.apps.unon("openLink", this.onOpenLink), r.apps.unon("dbIsReady", this.onDbIsReady), r.apps.unon("webBrowserAutoStart", this.webBrowserAutoStart);
    },
    render: function () {
      var t = this;
      return this.state.firstStart ? o["default"].createElement(a.Animated.View, {
        style: [{
          position: "absolute",
          left: 0,
          width: r.theme.winWidth
        }, {
          backgroundColor: r.theme.white,
          height: this.state.height,
          top: this.state.top
        }]
      }, o["default"].createElement(a.View, {
        style: {
          height: r.theme.realStatusHeight,
          backgroundColor: r.theme.transparent
        }
      }), this.state.newMsgs ? o["default"].createElement(a.TouchableOpacity, {
        onPress: this.hide,
        style: {
          position: "absolute",
          left: 0,
          bottom: 36,
          height: 30,
          width: r.theme.winWidth,
          backgroundColor: r.theme.replyBox,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 5,
          paddingRight: 10
        }
      }, o["default"].createElement(a.View, {
        style: {
          flex: 1,
          marginLeft: 9,
          justifyContent: "center",
          alignItems: "center"
        }
      }, o["default"].createElement(a.Text, {
        style: {
          color: r.theme.white
        }
      }, (0, r.tr)("You have new messages")))) : null, this.state.showToolbar ? o["default"].createElement(a.View, {
        style: {
          flexDirection: "row",
          height: 40,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: r.theme.lightTrans8
        }
      }, null, null, null, null, null, null, this.state.isInputFocusing ? null : o["default"].createElement(a.TouchableOpacity, {
        onPress: this.close,
        style: {
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 4,
          paddingBottom: 4
        }
      }, o["default"].createElement(r.FontAwesome, {
        name: "angle-left",
        style: {
          paddingBottom: "android" == a.Platform.OS ? 2 : 1
        },
        size: 35,
        color: r.theme.deep8
      })), o["default"].createElement(a.View, {
        style: {
          flex: 1
        }
      }, o["default"].createElement(a.Text, {
        style: {
          fontSize: 18,
          color: r.theme.lightc
        }
      }, this.state.title || "")), null) : null, o["default"].createElement(a.WebView, {
        style: {},
        ref: function (e) {
          return t.webView = e;
        },
        injectedJavaScript: this.injectedJavaScript(),
        automaticallyAdjustContentInsets: !1,
        source: {
          uri: this.state.url
        },
        javaScriptEnabled: !0,
        domStorageEnabled: !0,
        decelerationRate: "normal",
        onNavigationStateChange: this.onNavigationStateChange,
        onShouldStartLoadWithRequest: this.onShouldStartLoadWithRequest,
        startInLoadingState: !0,
        scalesPageToFit: this.state.scalesPageToFit,
        allowsInlineMediaPlayback: !1
      })) : null;
    }
  }), a.StyleSheet.create({
    statusBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 5,
      height: 22
    },
    statusBarText: {
      color: r.theme.deep8,
      fontSize: 13
    }
  });
});
