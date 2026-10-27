// Recovered module 326; analysis path, not original filename.
// Original SHA-256 1759fda8c56c7a4d718a2ba5f3c262da1c09dd89e7a7d0b1b00c464e25f201f2; original byte range [1280129, 1293843).
__d(326, function (t, e, i, a) {
  Object.defineProperty(a, "__esModule", {
    value: !0
  }), a.CaveView = void 0;
  var n = e(311),
    o = babelHelpers.interopRequireDefault(n),
    s = e(312),
    r = e(314),
    h = 500;
  a.CaveView = o["default"].createClass({
    displayName: "CaveView",
    getInitialState: function () {
      return this.show = 0, this.data = {}, this.raiseUpBottom1 = 0, this.raiseUpBottom2 = 0, this.atop1 = 0, this.atop2 = 0, this.dis1 = 0, this.dis2 = 0, this.showData1 = {}, this.showData2 = {}, this.textInputRef = {}, {
        curText: "",
        transCave: !1,
        top: r.theme.winHeight,
        atop1: new s.Animated.Value(0),
        atop2: new s.Animated.Value(0),
        hide: !1
      };
    },
    componentDidMount: function () {
      r.apps.on("showCave", this.showCave), r.apps.on("hideCave", this.hideCave), r.apps.on("closeCave", this.closeCave), r.apps.on("transCave", this.transCave), r.apps.on("prevCave", this.prevCave), r.apps.on("caveReplyCntChanged", this.caveReplyCntChanged), r.apps.onOnce("keyboardShow", this.onKeyboardWillShow), r.apps.onOnce("keyboardHide", this.onKeyboardWillHide);
    },
    componentWillUnmount: function () {
      r.apps.unon("showCave", this.showCave), r.apps.unon("hideCave", this.hideCave), r.apps.unon("closeCave", this.closeCave), r.apps.unon("transCave", this.transCave), r.apps.unon("prevCave", this.prevCave), r.apps.unon("caveReplyCntChanged", this.caveReplyCntChanged), r.apps.unon("keyboardShow", this.onKeyboardWillShow), r.apps.unon("keyboardHide", this.onKeyboardWillHide);
    },
    caveReplyCntChanged: function () {
      this.setState({});
    },
    onKeyboardWillShow: function (t) {
      var e, i;
      1 === this.show ? (this.dis1 = r.apps.keyboardHeight - this.raiseUpBottom1 + 50, this.animMove = "atop1", i = this.atop1 - this.dis1, e = this.state.atop1) : 2 === this.show && (this.dis2 = r.apps.keyboardHeight - this.raiseUpBottom2 + 50, this.animMove = "atop2", i = this.atop2 - this.dis2, e = this.state.atop2), this.setState({}), e && s.Animated.timing(e, {
        toValue: i,
        duration: h,
        useNativeDriver: !1
      }).start();
    },
    onKeyboardWillHide: function () {
      var t, e;
      this.dis1 = 0, this.dis2 = 0, "atop1" === this.animMove ? (t = this.state.atop1, e = this.atop1) : "atop2" === this.animMove && (e = this.atop2, t = this.state.atop2), this.setState({}), t && s.Animated.timing(t, {
        toValue: e,
        duration: h,
        useNativeDriver: !1
      }).start();
    },
    hideCave: function (t, e) {
      1 === this.show ? (this.atop1 = t ? 2 * -r.theme.winHeight : -r.theme.winHeight, s.Animated.timing(this.state.atop1, {
        toValue: this.atop1 - this.dis1,
        duration: h,
        useNativeDriver: !1
      }).start(function () {
        e && e();
      }), this.setState({
        hide: !0
      })) : 2 === this.show ? (this.atop2 = t ? 2 * -r.theme.winHeight : -r.theme.winHeight, s.Animated.timing(this.state.atop2, {
        toValue: this.atop2 - this.dis2,
        duration: h,
        useNativeDriver: !1
      }).start(function () {
        e && e();
      }), this.setState({
        hide: !0
      })) : (this.setState({
        hide: !0
      }), e && e());
    },
    closeCave: function () {
      var t = this;
      this.show = 0, this.data = {}, this.showData1 = {}, this.showData2 = {}, this.atop1 = 0, this.atop2 = 0, r.apps.emit("showFullSpin", !1), this.setState({
        top: r.theme.winHeight,
        transCave: !1
      }, function () {
        t.state.atop1.setValue(0), t.state.atop2.setValue(0);
      });
    },
    transCave: function (t) {
      t ? this.setState({
        transCave: !0
      }) : this.setState({
        transCave: !1
      });
    },
    prevCave: function () {
      1 === this.show ? (this.atop1 = 0, s.Animated.timing(this.state.atop1, {
        toValue: this.atop1,
        duration: h,
        useNativeDriver: !1
      }).start(function () {}), this.atop2 = -r.theme.winHeight, this.show = 2, this.state.atop2.setValue(2 * -r.theme.winHeight), s.Animated.timing(this.state.atop2, {
        toValue: this.atop2 - this.dis2,
        duration: h,
        useNativeDriver: !1
      }).start(function () {})) : 2 === this.show && (this.atop1 = -r.theme.winHeight, this.show = 1, this.state.atop1.setValue(2 * -r.theme.winHeight), s.Animated.timing(this.state.atop1, {
        toValue: this.atop1 - this.dis1,
        duration: h,
        useNativeDriver: !1
      }).start(function () {}), this.atop2 = 0, s.Animated.timing(this.state.atop2, {
        toValue: this.atop2,
        duration: h,
        useNativeDriver: !1
      }).start(function () {}));
    },
    showCave: function (t) {
      var e = this;
      t ? (this.data = t, this.onChangeTextCb = t.onChangeTextCb, this.show ? 1 === this.show ? (this.show = 2, this.showData2 = t, this.state.atop2.setValue(0), this.atop2 = 0, r.apps.isKeyboardShowing && (this.animMove = "atop2"), this.state.hide ? this.setState({
        hide: !1
      }, function () {
        e.state.atop1.setValue(0), e.atop1 = 0, e.atop2 = -r.theme.winHeight, s.Animated.timing(e.state.atop2, {
          toValue: e.atop2 - e.dis2,
          duration: h,
          useNativeDriver: !1
        }).start(function () {});
      }) : this.setState({}, function () {
        e.atop1 = 2 * -r.theme.winHeight, s.Animated.timing(e.state.atop1, {
          toValue: e.atop1,
          duration: h,
          useNativeDriver: !1
        }).start(function () {}), e.atop2 = -r.theme.winHeight, s.Animated.timing(e.state.atop2, {
          toValue: e.atop2 - e.dis2,
          duration: h,
          useNativeDriver: !1
        }).start(function () {});
      })) : 2 === this.show && (this.show = 1, this.showData1 = t, this.state.atop1.setValue(0), this.atop1 = 0, r.apps.isKeyboardShowing && (this.animMove = "atop1"), this.state.hide ? this.setState({
        hide: !1
      }, function () {
        e.state.atop2.setValue(0), e.atop2 = 0, e.atop1 = -r.theme.winHeight, s.Animated.timing(e.state.atop1, {
          toValue: e.atop1 - e.dis1,
          duration: h,
          useNativeDriver: !1
        }).start(function () {});
      }) : this.setState({}, function () {
        e.atop1 = -r.theme.winHeight, s.Animated.timing(e.state.atop1, {
          toValue: e.atop1 - e.dis1,
          duration: h,
          useNativeDriver: !1
        }).start(function () {}), e.atop2 = 2 * -r.theme.winHeight, s.Animated.timing(e.state.atop2, {
          toValue: e.atop2,
          duration: h,
          useNativeDriver: !1
        }).start(function () {});
      })) : (this.show = 1, this.showData1 = t, this.setState({
        top: -r.theme.winHeight,
        hide: !1
      }, function () {
        e.atop1 = -r.theme.winHeight, s.Animated.timing(e.state.atop1, {
          toValue: -r.theme.winHeight,
          duration: h,
          useNativeDriver: !1
        }).start(function () {});
      }))) : this.closeCave();
    },
    onChangeText: function (t, e, i) {
      i.maxLength && (t = r.apps.lengthFilter(t, i.maxLength)), i.value = t, this.onChangeTextCb && this.onChangeTextCb(this, t), this.setState({
        curText: t
      });
    },
    renderTextInputs: function (t, e, i, a) {
      var n = this;
      return o["default"].createElement(s.TextInput, babelHelpers["extends"]({}, t, {
        ref: function (t) {
          n.textInputRef[a] ? n.textInputRef[a][e] = t : (n.textInputRef[a] = [], n.textInputRef[a][e] = t);
        },
        selectionColor: r.theme.deepGreen2,
        key: e,
        style: [{
          marginHorizontal: 15,
          paddingHorizontal: 10,
          borderRadius: 9,
          color: r.theme.deep6
        }, "ios" == s.Platform.OS ? {
          backgroundColor: !r.apps.darkTheme && this.state.transp ? r.theme.lightLessTrans7 : r.theme.modelViewInputBg,
          borderRadius: 5,
          marginTop: 5,
          height: 30,
          borderWidth: 1,
          borderColor: r.apps.darkTheme ? r.theme.lighta : r.theme.white
        } : {
          height: 40,
          marginTop: 0
        }],
        onChangeText: function (i) {
          return n.onChangeText(i, e, t);
        },
        value: t.value,
        underlineColorAndroid: r.theme.lighta,
        placeholderTextColor: r.apps.darkTheme ? r.theme.deep2 : r.theme.lightc,
        multiline: !!t.multiline
      }));
    },
    renderButtons: function (t, e, i) {
      var a = this;
      return o["default"].createElement(s.View, {
        key: e,
        style: {
          flex: 1,
          flexDirection: "row",
          borderRadius: 10
        }
      }, o["default"].createElement(s.TouchableOpacity, {
        onPress: function () {
          t.onPress(a);
        },
        style: [{
          flex: 1,
          paddingHorizontal: 10,
          paddingVertical: 5,
          justifyContent: "center",
          alignItems: "center"
        }, t.bgColor ? {
          backgroundColor: t.bgColor
        } : {}]
      }, o["default"].createElement(s.Text, {
        style: {
          textAlign: "center",
          fontSize: 15,
          color: r.theme.deep7
        }
      }, t.text)), t.bgColor ? null : e < i.length - 1 && o["default"].createElement(s.View, {
        style: [{
          backgroundColor: r.theme.dialogButtonSep,
          alignSelf: "stretch"
        }, {
          width: 1
        }]
      }));
    },
    renderUser: function (t) {
      return "string" == typeof t.cont && (t.cont = JSON.parse(t.cont)), o["default"].createElement(s.View, null, o["default"].createElement(s.View, {
        style: {
          flexDirection: "row",
          marginHorizontal: 16,
          marginTop: 10,
          justifyContent: "center"
        }
      }, o["default"].createElement(AvatarView, {
        style: {
          width: 60,
          height: 60,
          borderRadius: 30
        },
        userid: t.uid,
        showGender: !0,
        resizeMode: "cover"
      })), t.cont.reply ? o["default"].createElement(s.View, {
        style: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center"
        }
      }, o["default"].createElement(s.View, {
        style: {
          marginTop: 8,
          borderRadius: 8,
          paddingVertical: 5,
          paddingHorizontal: 12,
          backgroundColor: r.theme.transparent
        }
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 14,
          color: r.theme.lighta
        }
      }, (0, r.tr)("\u56de\u590d\u4f60")))) : null, t.cont.reply ? o["default"].createElement(s.ScrollView, {
        keyboardShouldPersistTaps: "always",
        persistentScrollbar: !0,
        centerContent: !0,
        contentContainerStyle: {
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center"
        },
        style: {
          height: 70,
          backgroundColor: r.theme.deepTrans2,
          marginTop: 10,
          marginBottom: 12,
          marginHorizontal: 17,
          borderWidth: r.theme.px1,
          borderColor: r.theme.lightc,
          borderRadius: 8
        }
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 15,
          textAlign: "center",
          color: r.theme.deep6,
          marginHorizontal: 10,
          marginTop: 8,
          marginBottom: 8
        }
      }, t.cont.reply)) : null, t.cont.text ? o["default"].createElement(s.ScrollView, {
        keyboardShouldPersistTaps: "always",
        persistentScrollbar: !0,
        centerContent: !0,
        contentContainerStyle: {
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center"
        },
        style: {
          height: 70,
          backgroundColor: r.theme.deepTrans2,
          marginTop: 10,
          marginHorizontal: 17,
          borderWidth: r.theme.px1,
          borderColor: r.theme.lightc,
          borderRadius: 8
        }
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 15,
          textAlign: "center",
          color: r.theme.deep6,
          marginHorizontal: 10,
          marginTop: 8,
          marginBottom: 8
        }
      }, t.cont.text)) : null);
    },
    renderReportButton: function (t) {
      var e = this;
      return o["default"].createElement(s.TouchableOpacity, {
        onPress: function () {
          t.onPress(e);
        },
        style: {
          left: r.theme.winWidth / 4 * 3 - 40,
          top: 0,
          width: 40,
          height: 20,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: r.theme.deepGreen2Trans6,
          borderTopRightRadius: 9,
          borderBottomLeftRadius: 9
        }
      }, o["default"].createElement(s.Text, {
        style: {
          color: r.theme.white,
          fontSize: 12
        }
      }, t.text));
    },
    renderCaveReplyButton: function () {
      var t = this;
      return r.apps.caveReplyCnt ? o["default"].createElement(s.TouchableOpacity, {
        onPress: function () {
          t.data.infoTip = {
            text: (0, r.tr)("\u56de\u5e94\u4f1a\u5728\u4e0b\u4e00\u6761\u5c55\u793a"),
            color: r.theme.warn
          }, t.setState({});
        },
        style: {
          shadowColor: "#fff",
          shadowOffset: {
            width: 0,
            height: 0
          },
          shadowOpacity: .7,
          shadowRadius: 5,
          position: "absolute",
          backgroundColor: r.theme.deepGreen2Trans4,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          borderColor: r.theme.white,
          borderWidth: 2,
          height: 40,
          width: 120,
          left: r.theme.winWidth / 4 * 3 / 2 - 60,
          top: -60,
          borderRadius: 30,
          backgroundColor: r.theme.warnTrans9
        }
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 14,
          fontWeight: "bold",
          color: r.theme.white,
          paddingBottom: 1
        }
      }, (0, r.tr)("\u6536\u5230\u56de\u5e94"))) : null;
    },
    renderAnim: function (t, e) {
      var i = this;
      return o["default"].createElement(s.View, {
        onLayout: function (t) {
          var a = t.nativeEvent.layout,
            n = (a.x, a.y),
            o = (a.width, a.height);
          1 === e ? (i.raiseUpBottom1 = r.theme.winHeight - n - o, r.apps.isKeyboardShowing && r.apps.keyboardHeight && (i.dis1 = r.apps.keyboardHeight - i.raiseUpBottom1 + 50, s.Animated.timing(i.state.atop1, {
            toValue: i.atop1 - i.dis1,
            duration: h,
            useNativeDriver: !1
          }).start(function () {}))) : (i.raiseUpBottom2 = r.theme.winHeight - n - o, r.apps.isKeyboardShowing && r.apps.keyboardHeight && (i.dis2 = r.apps.keyboardHeight - i.raiseUpBottom2 + 50, s.Animated.timing(i.state.atop2, {
            toValue: i.atop2 - i.dis2,
            duration: h,
            useNativeDriver: !1
          }).start(function () {})));
        },
        style: {
          borderRadius: 9,
          backgroundColor: r.theme.dialogInnerViewBg,
          width: r.theme.winWidth / 4 * 3
        }
      }, this.renderCaveReplyButton(), t.rightTop ? this.renderReportButton(t.rightTop) : null, t.header && !t.uid ? o["default"].createElement(s.View, {
        style: {
          paddingTop: 10,
          paddingBottom: 5,
          paddingHorizontal: 10,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10
        }
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 18,
          fontWeight: "bold",
          textAlign: "center",
          color: r.theme.deep6
        }
      }, t.header)) : null, t.content && !t.uid ? o["default"].createElement(s.View, {
        style: {
          paddingTop: 10,
          paddingBottom: 5,
          paddingHorizontal: 10,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10
        }
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 15,
          textAlign: "center",
          color: r.theme.deep6
        }
      }, t.content)) : null, t.uid ? this.renderUser(t) : null, t.textInputs ? t.textInputs.map(function (t, a, n) {
        return i.renderTextInputs(t, a, n, e);
      }) : null, t.link ? o["default"].createElement(s.View, {
        style: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center"
        }
      }, o["default"].createElement(s.TouchableOpacity, {
        onPress: function () {
          t.link.onPress(t);
        },
        style: [{
          paddingTop: 10,
          paddingBottom: 3,
          paddingHorizontal: 20,
          borderRadius: 5
        }, t.link.style]
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 13,
          color: t.link.color || r.theme.fontLight
        }
      }, t.link.text))) : null, t.infoTip ? o["default"].createElement(s.View, {
        style: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center"
        }
      }, o["default"].createElement(s.View, {
        style: [{
          paddingTop: 10,
          paddingBottom: 3,
          paddingHorizontal: 20,
          borderRadius: 5
        }, t.infoTip.style]
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 13,
          color: t.infoTip.color || r.theme.fontLight
        }
      }, t.infoTip.text))) : null, o["default"].createElement(s.View, {
        style: {
          height: 1,
          marginTop: 10,
          backgroundColor: r.theme.dialogSep,
          alignSelf: "stretch"
        }
      }), t.buttons ? o["default"].createElement(s.View, {
        style: [{
          flexDirection: "row",
          height: 40,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
          justifyContent: "space-around"
        }]
      }, t.buttons.map(function (t, e, a) {
        return i.renderButtons(t, e, a);
      })) : null);
    },
    render: function () {
      var t = this;
      return o["default"].createElement(s.View, {
        style: {
          backgroundColor: this.state.transCave ? r.theme.transparent : r.theme.transparentDeep,
          position: "absolute",
          left: 0,
          top: this.state.top,
          width: r.theme.winWidth,
          height: 3 * r.theme.winHeight
        }
      }, o["default"].createElement(s.TouchableOpacity, {
        noOpacictyActive: !0,
        style: {
          backgroundColor: r.theme.transparent,
          flex: 1
        },
        onPress: function () {
          (0, r.dismissKeyboard)(), t.state.hide && t.closeCave();
        }
      }), o["default"].createElement(s.Animated.View, {
        style: {
          transform: [{
            translateY: this.state.atop1
          }],
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: r.theme.transparent,
          position: "absolute",
          left: 0,
          top: 2 * r.theme.winHeight,
          width: r.theme.winWidth,
          height: r.theme.winHeight
        }
      }, this.renderAnim(this.showData1, 1)), o["default"].createElement(s.Animated.View, {
        style: {
          transform: [{
            translateY: this.state.atop2
          }],
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: r.theme.transparent,
          position: "absolute",
          left: 0,
          top: 2 * r.theme.winHeight,
          width: r.theme.winWidth,
          height: r.theme.winHeight
        }
      }, this.renderAnim(this.showData2, 2)));
    }
  });
});
