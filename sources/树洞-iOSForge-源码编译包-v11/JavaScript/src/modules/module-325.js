// Recovered module 325; analysis path, not original filename.
// Original SHA-256 8f135fa6269ab8c285b15032c8a9b01f52fc6f3dcaa3675ce38d3103331c1925; original byte range [1260018, 1280128).
__d(325, function (e, t, n, o) {
  Object.defineProperty(o, "__esModule", {
    value: !0
  }), o.ModelView = void 0;
  var i = t(311),
    r = babelHelpers.interopRequireDefault(i),
    a = t(312),
    l = t(314),
    s = (o.ModelView = r["default"].createClass({
      displayName: "ModelView",
      getInitialState: function () {
        return this.keyboardHasShown = !1, this.modelViewId = 0, this.raiseUpBottom = 0, {
          buttonDirection: "row",
          showModelView: !1,
          textInputs: [],
          bounceValue: new a.Animated.Value(0),
          raiseUpHeight: new a.Animated.Value(0),
          bounceValueOpacity: new a.Animated.Value(1),
          infoTip: "",
          infoColor: l.theme.deepGreen,
          noModel: !1,
          spin: !1,
          content: "",
          content2: "",
          buttons: [],
          header: "",
          imagePicker: "",
          imagePickerResult: null,
          showPasswd: !1,
          showPasswdButton: null,
          showChecked: !1,
          showCheckButton: null,
          link: null,
          showDatepicker: null,
          datePickerValue: null,
          mtop: 0,
          tmtop: 0,
          upPadding: null,
          downPadding: null,
          transp: null
        };
      },
      onlyLetters: function (e, t) {
        var n = "",
          o = 0;
        if ("ios" === a.Platform.OS) {
          for (var i = e, r = Array.isArray(i), s = 0, i = r ? i : i["function" == typeof Symbol ? Symbol.iterator : "@@iterator"]();;) {
            var d;
            if (r) {
              if (s >= i.length) break;
              d = i[s++];
            } else {
              if (s = i.next(), s.done) break;
              d = s.value;
            }
            var u = d,
              h = u.codePointAt(0);
            if (h > 47 && 58 > h || h > 64 && 91 > h || h > 96 && 123 > h) {
              if (o += 1, o > t.maxLength) break;
              n += u;
            }
          }
          return n;
        }
        for (var c = 0; c < e.length;) {
          var h = l.util.codePointAt(e, c),
            m = l.util.fromCodePoint(h),
            p = m.length;
          if (c += p, h > 47 && 58 > h || h > 64 && 91 > h || h > 96 && 123 > h) {
            if (o += 1, o > t.maxLength) break;
            n += m;
          }
        }
        return n;
      },
      onlyHans: function (e, t) {
        var n = "",
          o = 0;
        if ("ios" === a.Platform.OS) {
          for (var i = e, r = Array.isArray(i), s = 0, i = r ? i : i["function" == typeof Symbol ? Symbol.iterator : "@@iterator"]();;) {
            var d;
            if (r) {
              if (s >= i.length) break;
              d = i[s++];
            } else {
              if (s = i.next(), s.done) break;
              d = s.value;
            }
            var u = d,
              h = u.codePointAt(0);
            if (h > 47 && 58 > h || h > 64 && 91 > h || h > 96 && 123 > h) {
              if (o += 1, o > t.maxLength) break;
              n += u;
            } else if (h >= 19968 && 40959 >= h) {
              if (o += 2, o > t.maxLength) break;
              n += u;
            }
          }
          return n;
        }
        for (var c = 0; c < e.length;) {
          var h = l.util.codePointAt(e, c),
            m = l.util.fromCodePoint(h),
            p = m.length;
          if (c += p, h > 47 && 58 > h || h > 64 && 91 > h || h > 96 && 123 > h) {
            if (o += 1, o > t.maxLength) break;
            n += m;
          } else if (h >= 19968 && 40959 >= h) {
            if (o += 2, o > t.maxLength) break;
            n += m;
          }
        }
        return n;
      },
      lengthFilter: function (e, t) {
        var n = "",
          o = 0;
        if ("ios" === a.Platform.OS) {
          for (var i = e, r = Array.isArray(i), s = 0, i = r ? i : i["function" == typeof Symbol ? Symbol.iterator : "@@iterator"]();;) {
            var d;
            if (r) {
              if (s >= i.length) break;
              d = i[s++];
            } else {
              if (s = i.next(), s.done) break;
              d = s.value;
            }
            var u = d,
              h = u.codePointAt(0);
            if (o += 128 > h ? 1 : 2, o > t.maxLength) break;
            n += u;
          }
          return n;
        }
        for (var c = 0; c < e.length;) {
          var h = l.util.codePointAt(e, c),
            m = l.util.fromCodePoint(h),
            p = m.length;
          if (c += p, o += 128 > h ? 1 : 2, o > t.maxLength) break;
          n += m;
        }
        return n;
      },
      onChangeText: function (e, t, n) {
        n.onlyLetters && (e = this.onlyLetters(e, n)), n.onlyHans && (e = this.onlyHans(e, n)), n.maxLength && (e = this.lengthFilter(e, n)), n.onlyLowercase && (e = e.toLowerCase()), this.state.textInputs[t].value = e, this.setState({
          textInput: this.state.textInput,
          infoTip: ""
        });
      },
      renderButtons: function (e, t, n) {
        var o = this;
        return r["default"].createElement(a.View, {
          key: t,
          style: {
            flex: 1,
            flexDirection: this.state.buttonDirection,
            borderRadius: 10
          }
        }, r["default"].createElement(a.TouchableOpacity, {
          style: [s.button, e.bgColor ? {
            backgroundColor: e.bgColor
          } : {}],
          onPress: function () {
            return e.onPress(o);
          }
        }, r["default"].createElement(a.Text, {
          style: s.buttonText
        }, e.text)), e.bgColor ? null : t < n.length - 1 && r["default"].createElement(a.View, {
          style: [{
            backgroundColor: l.theme.dialogButtonSep,
            alignSelf: "stretch"
          }, "row" === this.state.buttonDirection ? {
            width: l.theme.px1
          } : {
            height: l.theme.px1
          }]
        }), t === n.length - 1 && "column" === this.state.buttonDirection && r["default"].createElement(a.View, {
          style: {
            height: 3
          }
        }));
      },
      onKeyboardWillShow: function (e) {
        var t = this;
        if (this.keyboardIsShowing = !0, !this.raiseUpBottom) return void (this.onKeyboardWillShowCb = function () {
          return t.onKeyboardWillShow(e);
        });
        this.keyboardHasShown = !0;
        var n = e.endCoordinates ? e.endCoordinates.height : e.end.height;
        l.theme.isIphoneX && (n -= l.theme.iphoneXDiff);
        var o = n - this.raiseUpBottom;
        0 > o && (o = 0), a.Animated.timing(this.state.raiseUpHeight, {
          toValue: -o,
          duration: 250
        }).start();
      },
      onKeyboardWillHide: function () {
        this.keyboardHasShown = !1, delete this.keyboardIsShowing, a.Animated.timing(this.state.raiseUpHeight, {
          toValue: 0,
          duration: 250
        }).start();
      },
      componentWillUnmount: function () {
        l.apps.unon("triggerModelViewClose"), l.apps.unon("modelView"), l.apps.unon("closeModelView");
      },
      keyboardEvent: function (e) {
        e ? (l.apps.onOnce("keyboardShow", this.onKeyboardWillShow), l.apps.onOnce("keyboardHide", this.onKeyboardWillHide)) : (l.apps.unon("keyboardShow", this.onKeyboardWillShow), l.apps.unon("keyboardHide", this.onKeyboardWillHide));
      },
      componentDidMount: function () {
        var e = this;
        this.keyboardEvent(!0), l.apps.on("modelView", function (t) {
          e.locking = t.locking, e.modelViewId += 1, e.curProps = t;
          var n = function () {
            e.state.bounceValue.setValue(1.2), e.setState({
              buttonDirection: t.columnButtons ? "column" : "row",
              showModelView: !0,
              mtop: 0,
              noModel: t.noModel,
              infoColor: t.infoColor || l.theme.deepGreen,
              infoTip: t.infoTip || "",
              textInputs: t.textInputs || [],
              buttons: t.buttons || [],
              content: t.content || "",
              content2: t.content2 || "",
              scontent: t.scontent || "",
              bcontent: t.bcontent || "",
              header: t.header || "",
              imagePicker: t.imagePicker || "",
              imagePickerResult: t.imagePickerResult || null,
              link: t.link || null,
              showPasswdButton: t.showPasswdButton || null,
              showCheckButton: t.showCheckButton || null,
              showDatepicker: t.showDatepicker || null,
              upPadding: t.upPadding || null,
              downPadding: t.downPadding || null,
              imageAdds: t.imageAdds || null,
              transp: t.transp || null,
              darker: t.darker || null,
              scrollableContent: t.scrollableContent || null
            }, function () {
              a.Animated.spring(e.state.bounceValue, {
                toValue: 1,
                friction: 13,
                tension: 90
              }).start(function () {
                requestAnimationFrame(function () {
                  return e.refs.dialogView && e.refs.dialogView.measure(function (e, t, n, o, i, r) {});
                }), t.onCreate && t.onCreate(e), e.onKeyboardWillShowCb && (e.keyboardIsShowing && e.onKeyboardWillShowCb(), delete e.onKeyboardWillShowCb);
              });
            });
          };
          e.state.showModelView || n();
        }), l.apps.on("closeModelView", function (t) {
          delete e.locking, delete e.curProps, delete l.apps.continueNextBottle, e.keyboardHasShown = !1, e.setState({
            showModelView: !1,
            textInputs: [],
            buttons: [],
            bounceValue: new a.Animated.Value(0),
            bounceValueOpacity: new a.Animated.Value(1),
            infoTip: "",
            content: "",
            content2: "",
            scontent: "",
            bcontent: "",
            header: "",
            infoColor: l.theme.deepGreen,
            noModel: !1,
            spin: !1,
            imagePicker: "",
            link: null,
            showPasswd: !1,
            showPasswdButton: null,
            showChecked: !1,
            showCheckButton: null,
            imagePickerResult: null,
            showDatepicker: null,
            datePickerValue: null,
            upPadding: null,
            downPadding: null,
            imageAdds: null,
            transp: null,
            scrollableContent: null,
            darker: null
          }, function () {
            e.isProgressing = !1, t && t();
          });
        }), l.apps.on("triggerModelViewClose", function (e) {
          l.apps.emit("closeModelView", e);
        }), l.apps.modelViewDelayParas && (l.apps.emit("modelView", l.apps.modelViewDelayParas), delete l.apps.modelViewDelayParas);
      },
      progressing: function (e) {
        this.isProgressing = e, this.setState({
          spin: e,
          infoTip: ""
        });
      },
      renderTextInputs: function (e, t, n) {
        var o = this,
          i = void 0 !== e.secureTextEntry;
        i && (e.secureTextEntry = !this.state.showPasswd);
        var d = this.state.textInputs[t],
          u = [s.textInput, "ios" == a.Platform.OS && {
            backgroundColor: "rgba(0,0,0,0.1)",
            borderRadius: 5,
            borderWidth: 0,
            borderColor: l.apps.darkTheme ? l.theme.lighta : l.theme.white
          }, d.height ? {
            height: d.height,
            fontSize: 16
          } : {}];
        return i && this.state.showPasswdButton ? r["default"].createElement(a.View, {
          key: t,
          style: {
            marginHorizontal: 15,
            marginTop: "ios" === a.Platform.OS ? 5 : 0
          }
        }, r["default"].createElement(a.View, {
          style: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "ios" == a.Platform.OS ? "rgba(0,0,0,0.1)" : "transparent",
            borderRadius: 5
          }
        }, r["default"].createElement(a.TextInput, babelHelpers["extends"]({}, e, {
          selectionColor: l.theme.deepGreen2,
          style: [s.textInput, {
            flex: 1,
            marginHorizontal: 0,
            marginTop: 0,
            backgroundColor: "transparent"
          }],
          onChangeText: function (n) {
            return o.onChangeText(n, t, e);
          },
          value: d.value,
          underlineColorAndroid: "transparent",
          placeholderTextColor: l.apps.darkTheme ? l.theme.deep2 : l.theme.lightc,
          returnKeyType: d.onSubmitEditing ? "send" : "default",
          onSubmitEditing: d.onSubmitEditing ? function () {
            return d.onSubmitEditing(o, d.value);
          } : void 0
        })), r["default"].createElement(a.TouchableOpacity, {
          onPress: function () {
            o.setState({
              showPasswd: !o.state.showPasswd
            });
          },
          style: {
            paddingHorizontal: 10
          }
        }, r["default"].createElement(l.Ionicons, {
          name: this.state.showPasswd ? "md-eye" : "md-eye-off",
          size: 20,
          color: this.state.showPasswd ? l.theme.deepGreen2 : l.theme.lightb
        }))), "android" === a.Platform.OS && r["default"].createElement(a.View, {
          style: {
            height: 1,
            backgroundColor: l.theme.lighta
          }
        })) : r["default"].createElement(a.TextInput, babelHelpers["extends"]({}, e, {
          selectionColor: l.theme.deepGreen2,
          key: t,
          style: u,
          onChangeText: function (n) {
            return o.onChangeText(n, t, e);
          },
          value: d.value,
          underlineColorAndroid: l.theme.lighta,
          placeholderTextColor: l.apps.darkTheme ? l.theme.deep2 : l.theme.lightc,
          returnKeyType: d.onSubmitEditing ? "send" : "default",
          onSubmitEditing: d.onSubmitEditing ? function () {
            return d.onSubmitEditing(o, d.value);
          } : void 0
        }));
      },
      renderBUser: function () {
        var e = this,
          t = this.curProps.buserid;
        return t ? r["default"].createElement(a.TouchableOpacity, {
          onPress: function () {
            return e.curProps.onUserPressed(e);
          },
          style: {
            marginBottom: 7,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          }
        }, r["default"].createElement(l.CachedImage, {
          avatarId: t,
          style: {
            width: 40,
            height: 40,
            borderRadius: 5
          },
          resizeMode: "cover"
        }), r["default"].createElement(l.NameText, {
          userid: t,
          showGender: 1,
          style: {
            marginLeft: 10,
            fontSize: 18,
            color: l.theme.deep6
          }
        })) : void 0;
      },
      renderUser: function () {
        var e = this.curProps.userid;
        return e ? r["default"].createElement(a.View, {
          style: {
            marginBottom: 7,
            justifyContent: "center",
            alignItems: "center"
          }
        }, r["default"].createElement(l.NameText, {
          userid: e,
          style: {
            marginTop: 5,
            fontSize: 15,
            color: l.theme.deep6
          }
        }), r["default"].createElement(l.CachedImage, {
          avatarId: e,
          style: {
            width: 90,
            height: 90,
            borderRadius: 10,
            marginTop: 5
          },
          resizeMode: "cover"
        })) : void 0;
      },
      renderDatePicker: function () {
        var e = this;
        return this.state.showDatepicker ? r["default"].createElement(l.DatePickerView, {
          style: {},
          textStyle: {
            color: l.theme.white
          },
          onChange: function (t, n, o) {
            var i = t + "-" + n + "-" + o;
            e.setState({
              datePickerValue: i
            });
          },
          pickerPrompt: (0, l.tr)("Set up your birthday")
        }) : void 0;
      },
      renderBcontent: function () {
        var e = this;
        return this.state.bcontent ? r["default"].createElement(a.View, null, r["default"].createElement(a.View, {
          style: {
            height: 30,
            justifyContent: "center",
            alignItems: "center"
          }
        }, r["default"].createElement(a.TouchableOpacity, {
          style: {},
          onPress: function () {
            return e.curProps.onPressBcontentRp(e);
          }
        }, r["default"].createElement(a.Text, {
          style: {
            fontSize: 13,
            color: "rgb(180,180,180)"
          }
        }, (0, l.tr)("\u6295\u8bc9\u4e3e\u62a5\uff1f")))), r["default"].createElement(a.View, {
          style: {
            marginTop: 15,
            marginHorizontal: 15,
            borderTopWidth: l.theme.px1,
            borderBottomWidth: 0,
            borderColor: l.theme.lightb
          }
        }), r["default"].createElement(a.ScrollView, {
          ref: function (t) {
            return e.bscroll = t;
          },
          removeClippedSubviews: !0,
          style: {
            height: 100,
            marginBottom: 15,
            paddingHorizontal: 15
          }
        }, r["default"].createElement(a.TouchableOpacity, null, r["default"].createElement(a.Text, {
          style: {
            paddingVertical: 10,
            textAlign: "center",
            textAlignVertical: "center",
            fontSize: 18,
            lineHeight: 25,
            color: l.theme.lighta
          }
        }, this.state.bcontent)))) : void 0;
      },
      renderScontent: function () {
        var e = this;
        return this.state.scontent ? r["default"].createElement(a.ScrollView, {
          ref: function (t) {
            return e.scroll = t;
          },
          removeClippedSubviews: !0,
          style: {
            height: l.theme.winHeight / 2
          }
        }, this.state.scontent.map(function (t, n) {
          return r["default"].createElement(a.TouchableOpacity, {
            onPress: function () {
              return e.curProps.scontentOnPress(t);
            },
            onLongPress: function () {
              return e.curProps.scontentOnLongPress(t);
            },
            key: n,
            style: {
              overflow: "hidden",
              flex: 1,
              flexDirection: "row",
              paddingVertical: 3
            }
          }, l.apps.showChaa ? r["default"].createElement(l.CachedImage, {
            style: {
              height: 25,
              width: 25,
              borderRadius: 5,
              marginLeft: 9,
              marginRight: 7
            },
            resizeMode: "cover",
            avatarId: t.f || "1"
          }) : r["default"].createElement(a.View, {
            style: {
              width: 10
            }
          }), r["default"].createElement(a.Text, {
            style: {
              fontSize: 18,
              color: l.theme.lighta
            }
          }, t.t ? t.t.replace(/\s/g, "") : t.replace(/\s/g, "")));
        })) : void 0;
      },
      renderRightTop: function (e) {
        var t = this,
          n = this.curProps.rightTop;
        return n && !n.height ? r["default"].createElement(a.TouchableOpacity, {
          onPress: function () {
            n.onPress(t);
          },
          style: {
            left: l.theme.winWidth / 4 * 3 - 40,
            top: 0,
            width: 40,
            height: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: l.theme.transparent,
            borderTopRightRadius: 9,
            borderBottomLeftRadius: 9
          }
        }, r["default"].createElement(a.Text, {
          style: {
            color: "rgb(180,180,180)",
            fontSize: 12
          }
        }, n.text)) : n && n.height ? r["default"].createElement(a.View, {
          style: {
            height: n.height
          }
        }) : null;
      },
      renderImagePicker: function () {
        var e = this;
        return this.state.imagePicker ? r["default"].createElement(a.View, {
          style: {
            height: 100,
            justifyContent: "center",
            alignItems: "center"
          }
        }, r["default"].createElement(a.TouchableOpacity, {
          style: {
            borderWidth: 1,
            borderRadius: 15,
            borderColor: l.apps.darkTheme ? l.theme.lighta : l.theme.white,
            backgroundColor: this.state.transp ? l.theme.modelViewAvatarBgTransp : l.theme.modelViewAvatarBg,
            height: 90,
            width: 90,
            justifyContent: "center",
            alignItems: "center"
          },
          onPress: function () {
            if ("ios" === a.Platform.OS) l.ImagePicker.show(function (t) {
              e.setState({
                imagePickerResult: t
              }), e.curProps.onImagePicked && e.curProps.onImagePicked(t);
            }, babelHelpers["extends"]({
              noData: !1,
              thumbW: 100,
              thumbH: 100
            }, "ios" === a.Platform.OS ? {
              allowsEditing: !0
            } : {}, e.state.imageAdds));else {
              var t = function () {
                l.apps.on("imagePicked", function (t) {
                  t.data || (0, l.tlog)("error", "imagePicked noData", t), e.setState({
                    mtop: 0,
                    tmtop: 0,
                    imagePickerResult: t
                  }), e.curProps.onImagePicked && e.curProps.onImagePicked(t);
                }), e.hide(), l.apps.curNavigator.navi.navForward(l.apps.curNavigator.routes.imagePicker, function () {
                  return a.Navigator.SceneConfigs.VerticalUpSwipeJump;
                });
              };
              l.apps.permissions.photo ? t() : (l.apps.requestPhotoDiag(), l.apps.on("photoPermissionChanged", function () {
                l.apps.unon("photoPermissionChanged"), l.apps.permissions.photo && t();
              }));
            }
          }
        }, this.state.imagePickerResult ? r["default"].createElement(a.Image, {
          source: {
            uri: this.state.imagePickerResult.uri
          },
          style: {
            width: 70,
            height: 70,
            borderRadius: 12
          },
          resizeMode: "cover"
        }) : r["default"].createElement(a.Text, {
          style: {
            fontSize: 18,
            color: l.theme.lightc
          }
        }, this.state.imagePicker))) : void 0;
      },
      hide: function () {
        this.setState({
          mtop: 3 * l.theme.winHeight,
          tmtop: 3 * l.theme.winHeight
        });
      },
      unHide: function () {
        this.setState({
          mtop: 0,
          tmtop: 0
        });
      },
      render: function () {
        var e = this;
        return this.state.showModelView ? r["default"].createElement(a.TouchableWithoutFeedback, {
          onPress: function () {
            (0, l.dismissKeyboard)(), e.state.noModel && l.apps.emit("triggerModelViewClose");
          }
        }, r["default"].createElement(a.View, {
          style: {
            position: "absolute",
            left: 0,
            top: this.state.tmtop,
            width: l.theme.winWidth,
            height: l.theme.winHeight
          }
        }, r["default"].createElement(l.BackgroundImageView, {
          shouldRender: !0,
          maskColor: l.theme.lightLessTrans6
        }), r["default"].createElement(a.Animated.View, {
          style: [s.modelView, {
            transform: [{
              scale: this.state.bounceValue
            }],
            opacity: this.state.bounceValueOpacity,
            marginTop: this.state.raiseUpHeight,
            top: this.state.mtop,
            backgroundColor: this.state.transp ? l.theme.transparent : this.state.darker ? l.theme.transparentDeep3 : l.theme.transparentDeep
          }]
        }, r["default"].createElement(a.View, {
          ref: "dialogView",
          style: s.dialogView,
          onLayout: function (t) {
            if (!e.raiseUpBottom || !e.keyboardIsShowing) {
              var n = t.nativeEvent.layout,
                o = (n.x, n.y),
                i = (n.width, n.height);
              e.raiseUpBottom = l.theme.winHeight - o - i - l.theme.navHeight, "android" === a.Platform.OS ? e.raiseUpBottom -= 100 : e.raiseUpBottom -= 90;
            }
          }
        }, r["default"].createElement(a.View, {
          style: {
            backgroundColor: this.state.transp ? l.theme.deepTrans3 : l.theme.dialogInnerViewBg,
            width: l.theme.winWidth / 4 * 3,
            borderRadius: 9,
            borderWidth: l.theme.px1,
            borderColor: l.theme.lighte
          }
        }, this.renderRightTop(), this.state.header ? r["default"].createElement(a.View, {
          style: s.header
        }, r["default"].createElement(a.Text, {
          style: s.headerText
        }, this.state.header), r["default"].createElement(a.View, {
          style: {
            marginLeft: 5
          }
        }, this.state.spin ? l.apps.renderSpinner() : null)) : null, this.state.upPadding ? r["default"].createElement(a.View, {
          style: {
            height: this.state.upPadding
          }
        }) : null, this.renderUser(), this.renderBUser(), this.renderScontent(), this.renderBcontent(), this.state.scrollableContent ? r["default"].createElement(a.View, {
          style: {
            height: .6 * l.theme.winHeight,
            paddingHorizontal: 15
          }
        }, r["default"].createElement(a.View, {
          style: {
            flex: 1,
            borderWidth: l.theme.px1,
            borderColor: l.theme.lightb,
            borderRadius: 5,
            padding: 5
          }
        }, r["default"].createElement(a.ScrollView, {
          style: {
            flex: 1
          },
          showsVerticalScrollIndicator: !0,
          indicatorStyle: "white"
        }, r["default"].createElement(a.TouchableOpacity, {
          activeOpacity: 1
        }, r["default"].createElement(a.Text, {
          style: {
            fontSize: 14,
            color: l.theme.deep6,
            lineHeight: 20
          }
        }, this.state.scrollableContent)))), r["default"].createElement(a.Text, {
          style: {
            textAlign: "center",
            fontSize: 12,
            color: l.theme.lightb,
            marginTop: 5
          }
        }, "\u2193 \u4e0b\u6ed1\u67e5\u770b\u66f4\u591a")) : null, this.state.content ? this.curProps.contentOnPress ? r["default"].createElement(a.View, {
          style: [s.content, this.curProps.contentStyle, {
            flexDirection: "row"
          }]
        }, r["default"].createElement(a.TouchableOpacity, {
          onPress: function () {
            return e.curProps.contentOnPress(e);
          },
          onLongPress: function () {
            return e.curProps.contentOnLongPress(e);
          },
          style: {}
        }, r["default"].createElement(a.Text, {
          style: s.contentText
        }, this.state.content)), this.state.content2 ? r["default"].createElement(a.TouchableOpacity, {
          onPress: function () {
            return e.curProps.content2OnPress(e);
          },
          onLongPress: function () {
            return e.curProps.content2OnLongPress(e);
          },
          style: [{
            marginLeft: 15,
            backgroundColor: l.theme.warnTrans9,
            borderRadius: 5,
            paddingHorizontal: 15,
            paddingBottom: 2
          }]
        }, r["default"].createElement(a.Text, {
          style: [s.contentText, {
            color: l.theme.lighte
          }]
        }, this.state.content2)) : null) : r["default"].createElement(a.View, {
          style: [s.content, this.curProps.contentStyle]
        }, r["default"].createElement(a.Text, {
          style: s.contentText
        }, this.state.content)) : null, this.renderImagePicker(), this.renderDatePicker(), this.state.textInputs.length ? r["default"].createElement(a.View, {
          style: {
            height: 5
          }
        }) : null, this.state.textInputs.map(function (t, n, o) {
          return e.renderTextInputs(t, n, o);
        }), this.state.textInputs.length ? r["default"].createElement(a.View, {
          style: {
            height: 10
          }
        }) : null, this.state.link ? r["default"].createElement(a.View, {
          style: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          }
        }, r["default"].createElement(a.TouchableOpacity, {
          onPress: function () {
            e.state.link.onPress(e);
          },
          style: [{
            paddingTop: 10,
            paddingBottom: 13,
            paddingHorizontal: 20,
            borderRadius: 5
          }, this.state.link.style]
        }, r["default"].createElement(a.Text, {
          style: {
            fontSize: 12,
            color: this.state.link.color || l.theme.fontLight
          }
        }, this.state.link.text))) : null, this.state.textInputs.length ? r["default"].createElement(a.View, {
          style: {
            height: 5
          }
        }) : null, this.state.infoTip ? r["default"].createElement(a.View, {
          style: s.infoView
        }, r["default"].createElement(a.Text, {
          style: [s.infoViewText, {
            color: this.state.infoColor
          }]
        }, this.state.infoTip)) : null, this.state.link && !this.state.infoTip ? null : r["default"].createElement(a.View, {
          style: {
            height: 10
          }
        }), r["default"].createElement(a.View, {
          style: {
            height: l.theme.px1,
            backgroundColor: l.theme.dialogSep,
            alignSelf: "stretch"
          }
        }), r["default"].createElement(a.View, {
          style: [{
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            justifyContent: "space-around"
          }, "row" === this.state.buttonDirection ? {
            flexDirection: "row",
            height: 35
          } : {
            flexDirection: "column"
          }]
        }, this.state.buttons.map(function (t, n, o) {
          return e.renderButtons(t, n, o);
        }))))))) : null;
      }
    }), {
      modelView: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        backgroundColor: l.theme.transparentDeep,
        justifyContent: "center",
        alignItems: "center"
      },
      dialogView: {
        padding: 5
      },
      header: {
        paddingTop: 10,
        paddingBottom: 5,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10
      },
      headerText: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
        color: l.theme.deep6
      },
      content: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 15,
        paddingTop: 3,
        paddingBottom: 5,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10
      },
      contentText: {
        textAlign: "center",
        fontSize: 15,
        lineHeight: 20,
        color: l.theme.deep6
      },
      infoView: {
        marginTop: 5,
        justifyContent: "center",
        alignItems: "center"
      },
      infoViewText: {
        textAlign: "center"
      },
      button: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        justifyContent: "center",
        alignItems: "center"
      },
      buttonText: {
        textAlign: "center",
        fontSize: 15,
        color: l.theme.deep7
      },
      textInput: {
        marginHorizontal: 15,
        marginTop: "ios" === a.Platform.OS ? 5 : 0,
        paddingHorizontal: 10,
        height: "ios" === a.Platform.OS ? 30 : 40,
        borderRadius: 9,
        color: l.theme.deep6
      }
    });
});
