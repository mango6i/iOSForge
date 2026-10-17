// Maintenance: free local test stars; original code under reference/.
__d(329, function (t, e, n, i) {
  var __recoveryFreePolicy = e(9000);
  var o = e(311),
    s = babelHelpers.interopRequireDefault(o),
    a = e(312),
    p = e(314),
    r = 34,
    h = (p.theme.emoViewHeight, p.theme.emoCategoryHeight, p.theme.statusHeight),
    u = p.theme.winHeight - 44 - 36 - h,
    d = p.theme.winHeight - h + 50,
    l = (p.theme.winHeight - 44 - 36 - 195 - 36 - h, 1e3);
  i.MyInputView = s["default"].createClass({
    displayName: "MyInputView",
    getInitialState: function () {
      return this.emoCategoryIndex = 0, this.emoCategoryNames = [], this.emoCategoryIcons = [], this.emojs = [], this.isEmoShow = !1, this.curTop = d, this.diff = 0, {
        showPadding: !1,
        top: new a.Animated.Value(d),
        height: p.theme.myInputViewHeight,
        statusBarDiff: this.props.statusBarDiff
      };
    },
    componentWillReceiveProps: function (t) {
      this.setState({
        statusBarDiff: t.statusBarDiff
      }), a.Animated.timing(this.state.top, {
        toValue: this.curTop - t.statusBarDiff,
        duration: 50
      }).start(function () {});
    },
    onSend: function (t, e, n) {
      p.apps.emit("inputSend", t, e, n);
    },
    onEmoIconPress: function (t, e) {
      e ? p.apps.emit("inputSend", 4, t) : this.refs.inputView.changeText(t);
    },
    changePlaceHolder: function (t, e) {
      this.refs.inputView.changePlaceHolder(t, e);
    },
    onMyInputViewMoveToHigh: function (t) {
      this.curTop !== u && (this.curTop = u, this.setState({
        showPadding: !0
      }), p.apps.emit("embededBrowserFloatingButtonSettingChanged", 0), a.Animated.timing(this.state.top, {
        toValue: u - this.state.statusBarDiff - this.diff,
        duration: 10
      }).start(function () {
        t && t();
      }));
    },
    onMyInputViewMoveToLow: function (t) {
      this.curTop !== d && (this.curTop = d, this.setState({
        showPadding: !1
      }), p.apps.emit("embededBrowserFloatingButtonSettingChanged", 0), a.Animated.timing(this.state.top, {
        toValue: d - this.state.statusBarDiff,
        duration: 10
      }).start(function () {
        t && t();
      }));
    },
    onMyInputViewMoveTo: function (t, e) {
      var n = "ios" === a.Platform.OS ? 150 : 50;
      this.curTop !== t && (this.curTop = t, p.apps.sideEmoButtonPressed && delete p.apps.sideEmoButtonPressed, this.setState({
        showPadding: !1
      }), a.Animated.timing(this.state.top, {
        toValue: t - this.state.statusBarDiff,
        duration: n
      }).start(function () {
        e && e();
      }));
    },
    componentDidMount: function () {
      p.apps.on("myInputViewMoveToHigh", this.onMyInputViewMoveToHigh), p.apps.on("myInputViewMoveToLow", this.onMyInputViewMoveToLow), p.apps.on("myInputViewMoveTo", this.onMyInputViewMoveTo);
    },
    componentWillUnmount: function () {
      p.apps.unon("highViewMounted", this.onMyInputViewMoveToHigh), p.apps.unon("myInputViewMoveToLow", this.onMyInputViewMoveToLow), p.apps.unon("myInputViewMoveTo", this.onMyInputViewMoveTo);
    },
    onHeightChange: function (t) {
      this.diff = t;
      var e = p.theme.myInputViewHeight + t;
      e !== this.state.height && this.setState({
        height: e
      });
    },
    render: function () {
      var t = this;
      return s["default"].createElement(a.Animated.View, {
        style: [{
          position: "absolute",
          backgroundColor: p.apps.lightMode && p.apps.hasCustomBg ? p.theme.lightLessTrans5 : p.theme.transparent,
          width: p.theme.winWidth,
          height: this.state.height,
          top: this.state.top,
          left: 0
        }]
      }, s["default"].createElement(m, {
        ref: "inputView",
        onSend: this.onSend,
        placeholder: this.props.placeholder,
        onHeightChange: this.onHeightChange
      }), s["default"].createElement(c, {
        ref: function (e) {
          return t.dashboard = e;
        },
        onEmoIconPress: this.onEmoIconPress,
        onSend: this.onSend,
        showPadding: this.state.showPadding
      }));
    }
  });
  var c = s["default"].createClass({
      displayName: "Dashboard",
      getInitialState: function () {
        return {
          boardType: "emoj",
          showPadding: this.props.showPadding,
          tabIndex: 1
        };
      },
      onSetBoardType: function (t, e) {
        p.apps.boardType = t;
        var n = {
          picture: 0,
          emoj: 1,
          audio: 2
        };
        this.setState({
          boardType: t,
          tabIndex: n[t]
        }, function () {
          e && e();
        });
      },
      componentWillReceiveProps: function (t) {
        t.showPadding !== this.props.showPadding && this.setState({
          showPadding: t.showPadding
        });
      },
      renderBoard: function () {
        var t = this;
        return "emoj" === this.state.boardType ? s["default"].createElement(p.EmoView, {
          ref: function (e) {
            return t.emoView = e;
          },
          onEmoIconPress: this.props.onEmoIconPress
        }) : "picture" === this.state.boardType ? s["default"].createElement(p.PictureBoard, {
          ref: function (t) {
            p.apps.picBoardRef = t;
          }
        }) : "audio" === this.state.boardType ? s["default"].createElement(p.AudioBoard, {
          ref: function (t) {
            return p.apps.audioBoardRef = t;
          },
          onSend: this.props.onSend
        }) : void 0;
      },
      componentDidMount: function () {
        p.apps.on("setBoardType", this.onSetBoardType), p.apps.on("nullInputBoardTab", this.nullInputBoardTab);
      },
      componentWillUnmount: function () {
        p.apps.unon("setBoardType", this.onSetBoardType), p.apps.unon("nullInputBoardTab", this.nullInputBoardTab);
      },
      nullInputBoardTab: function (t) {
        t && !this.state.tabNull ? this.setState({
          tabNull: !0
        }) : this.state.tabNull && this.setState({
          tabNull: !1
        });
      },
      render: function () {
        var t = this;
        if (this.state.tabNull) var e = [];else e = [{
          ionicons: "ios-images-outline",
          size: 26,
          color: p.theme.deep9,
          onPress: function (t, e) {
            var n = p.apps.currentRoutes[p.apps.currentNavi],
              i = p.apps.atFriendId || n.userid;
            Promise.all([p.apps.isPeopleApproved(i), p.apps.getRelationShip(i)]).then(function (t) {
              return t[0] ? void ("ios" === a.Platform.OS ? p.ImagePicker.show(function (t) {
                p.apps.diag({
                  header: (0, p.tr)("Send"),
                  imagePicker: (0, p.tr)("Photo"),
                  imagePickerResult: t,
                  imageAdds: {
                    allowsEditing: !1
                  },
                  buttons: [{
                    text: (0, p.tr)("Cancel"),
                    onPress: function () {
                      return p.apps.closeDiag();
                    }
                  }, {
                    text: (0, p.tr)("Ok"),
                    onPress: function (e) {
                      p.apps.closeDiag(), t = e.state.imagePickerResult, t.uri = "file://" + t.uri, p.apps.selectedImageUris = [t], p.apps.emit("inputSend", p.apps.CONS_MSG_TYPE_TEXT, "");
                    }
                  }]
                });
              }, {
                allowsEditing: !1
              }) : p.apps.emit("setBoardType", "picture", function () {
                p.apps.emit("toggleEmo", !0);
              })) : void p.apps.tip((0, p.tr)("Cannot send photo or video to non-friend"));
            })["catch"](function (t) {
              (0, p.tlog)("error", "ios-folder-open-outline", i, t);
            });
          }
        }, {
          ionicons: "ios-star-outline",
          size: 26,
          color: p.theme.deep9,
          onPress: function () {
            return p.apps.addRecoveryTestStars();
          }
        }, {
          ionicons: "ios-microphone-outline",
          size: 25,
          color: p.theme.deep9,
          onPress: function (t, e) {
            var n = p.apps.currentRoutes[p.apps.currentNavi],
              i = p.apps.atFriendId || n.userid;
            Promise.all([p.apps.isPeopleApproved(i), p.apps.getRelationShip(i)]).then(function (t) {
              return t[0] ? void p.apps.emit("setBoardType", "audio", function () {
                p.apps.emit("toggleEmo", !0);
              }) : void p.apps.tip((0, p.tr)("You can only send audio message to friends"));
            })["catch"](function (t) {
              (0, p.tlog)("error", "ios-microphone-outline", i, t);
            });
          }
        }];
        var n = p.theme.tabHeight - 1;
        return this.state.showPadding && (n += 100), s["default"].createElement(a.View, {
          style: {
            flex: 1,
            backgroundColor: p.theme.transparent
          }
        }, s["default"].createElement(p.TabView, {
          ref: "tabview",
          tabIndex: this.state.tabIndex,
          buttons: e,
          noBorder: !0
        }), s["default"].createElement(a.View, {
          style: {
            position: "absolute",
            left: 0,
            height: p.theme.picBoardHeight,
            width: p.theme.winWidth,
            top: "emoj" === this.state.boardType ? n : p.theme.winHeight
          }
        }, s["default"].createElement(p.EmoView, {
          ref: function (e) {
            return t.emoView = e;
          },
          onEmoIconPress: this.props.onEmoIconPress
        })), s["default"].createElement(a.View, {
          style: {
            position: "absolute",
            left: 0,
            height: p.theme.picBoardHeight,
            width: p.theme.winWidth,
            top: "picture" === this.state.boardType ? n : p.theme.winHeight
          }
        }, s["default"].createElement(p.PictureBoard, {
          ref: function (t) {
            return p.apps.picBoardRef = t;
          }
        })), s["default"].createElement(a.View, {
          style: {
            position: "absolute",
            left: 0,
            height: p.theme.picBoardHeight,
            width: p.theme.winWidth,
            top: "audio" === this.state.boardType ? n : p.theme.winHeight
          }
        }, s["default"].createElement(p.AudioBoard, {
          ref: function (t) {
            return p.apps.audioBoardRef = t;
          },
          onSend: this.props.onSend
        })));
      }
    }),
    m = s["default"].createClass({
      displayName: "InputView",
      getInitialState: function () {
        return this._lastSelection = [0, 0], this._isManualChanging = !1, this.diffAddCnt = 0, this.prevTextInputHeight = this.props.textInputHeight, this.prevText = "", {
          editable: !0,
          value: "",
          textInputContainerHeight: r,
          textInputHeight: this.props.textInputHeight,
          sendButtonColor: p.theme.lighta,
          sendButtonName: "md-send",
          emoButtonType: "pic",
          sendButtonSize: 25,
          emoBorderWidth: 2,
          emoBorderColor: p.theme.lightc,
          isEmoShow: !1,
          placeholder: this.props.placeholder,
          placeholderTextColor: p.apps.darkTheme ? p.theme.deep3 : p.theme.lighta,
          sendButtonBounceValue: new a.Animated.Value(1),
          sideEmo: !1,
          showGif: !1,
          noEmoBtn: !1
        };
      },
      getDefaultProps: function () {
        return {
          sendButtonText: "\u27a4",
          placeholder: (0, p.tr)("Text..."),
          textInputHeight: p.theme.chatTextInputHeight - 10,
          maxTextInputHeight: 200
        };
      },
      propTypes: {
        sendButtonText: s["default"].PropTypes.string,
        placeholder: s["default"].PropTypes.string
      },
      onChangeMyInputPlaceHolder: function (t) {
        t ? t.words && t.color ? this.setState({
          placeholder: t.words,
          placeholderTextColor: t.color
        }) : t.words && !t.color && this.setState({
          placeholder: t.words,
          placeholderTextColor: p.theme.warnLight1
        }) : this.setState({
          placeholder: this.props.placeholder,
          placeholderTextColor: p.apps.darkTheme ? p.theme.deep3 : p.theme.lighta
        });
      },
      changePlaceHolder: function (t, e) {
        t && t !== this.state.placeholder && this.setState({
          placeholder: t,
          placeholderTextColor: e ? e : p.apps.darkTheme ? p.theme.deep3 : p.theme.lighta
        });
      },
      backspace: function () {
        var t = this.state.value || "";
        t && (t = p.util.codeSlice(t, 0, -1), p.apps.myInputTextValue = t, this.setState({
          value: t
        }), this._isManualChanging = !0);
      },
      changeText: function (t) {
        this.shouldAjustTextHeight || (p.apps.editMsgHasNotChanged = !1);
        var e = this.state.value || "";
        if (!(e.length > l)) {
          var n = e.slice(0, this._lastSelection[0]) + t + e.slice(this._lastSelection[1], e.length),
            i = this._lastSelection[0] + t.length;
          this._lastSelection = [i, i], p.apps.myInputTextValue = n, this.setState({
            value: n
          }), this._isManualChanging = !0;
        }
      },
      _onSelectChange: function (t) {
        var e = t.nativeEvent.selection;
        if (t.nativeEvent.sizeChanged) {
          var n = t.nativeEvent.contentSize.height;
          if (n < this.props.textInputHeight && (n = this.props.textInputHeight), !this.shouldAjustTextHeight && n === this.prevTextInputHeight) return;
          this.shouldAjustTextHeight && delete this.shouldAjustTextHeight, n > this.props.maxTextInputHeight && (n = this.props.maxTextInputHeight - 1);
          var i = n - this.props.textInputHeight;
          return p.apps.emit("textInputHeightChanged", i), this.setState({
            textInputHeight: n,
            textInputContainerHeight: p.theme.chatTextInputHeight - 10 + i
          }), this.props.onHeightChange(i), void (this.prevTextInputHeight = n);
        }
        this._isManualChanging ? this._isManualChanging = !1 : this._lastSelection = [e.start, e.end];
      },
      onChange: function (t) {
        if ("android" === a.Platform.OS && this.skipOnChange) return void delete this.skipOnChange;
        var e = t.nativeEvent.text;
        if ("ios" !== a.Platform.OS || -1 !== p.apps.versionCompare(p.apps.pkgVersion, "2.2.581") || !p.apps.isIn(e[e.length - 1], "\n", "\r")) {
          if (this.shouldAjustTextHeight || (p.apps.editMsgHasNotChanged = !1), this.state.sideEmo) return this.setState({
            value: e
          }), void p.apps.fetchWebServiceGifAutocomplete({
            type: "tenor",
            q: e,
            inputAction: !0
          });
          e || p.apps.emit("closeAtSignView");
          var n = e.match(/(.*)(@\S*)$/);
          n ? (p.apps.emit("showAtSignView", n[2], n[1]), this.prevHasAt = !0) : this.prevHasAt && (this.prevHasAt = !1, p.apps.emit("showAtSignView")), this.prevText = e;
          for (var i = [], o = 0; o < e.length; o += h) {
            var s = p.util.codePointAt(e, o),
              r = p.util.fromCodePoint(s),
              h = r.length;
            i.push(s.toString(16));
          }
          var u = t.nativeEvent.contentSize.height;
          if (p.apps.sideEmoViewRef.isShown || (e ? p.apps.userHasInputText = !0 : delete p.apps.userHasInputText), this.setState({
            value: e,
            sendButtonColor: e.trim().length > 0 && "bottleFriends" === p.apps.currentRoutes[p.apps.currentNavi].name ? p.theme.deepGreen : p.theme.lighta
          }), p.apps.myInputTextValue = e, u < this.props.textInputHeight && (u = this.props.textInputHeight), (this.shouldAjustTextHeight || u !== this.prevTextInputHeight) && (this.shouldAjustTextHeight && delete this.shouldAjustTextHeight, u > this.props.maxTextInputHeight && (u = this.props.maxTextInputHeight - 1), !("" === e && u > this.prevTextInputHeight))) {
            var d = u - this.props.textInputHeight;
            p.apps.emit("textInputHeightChanged", d), this.setState({
              textInputHeight: u,
              textInputContainerHeight: p.theme.chatTextInputHeight - 10 + d
            }), this.props.onHeightChange(d), this.prevTextInputHeight = u;
          }
        }
      },
      onSelectedPicturesChanged: function (t) {
        t > 0 ? this.setState({
          sendButtonColor: p.theme.deepGreen
        }) : this.setState({
          sendButtonColor: p.theme.lighta
        });
      },
      componentDidMount: function () {
        var t = this;
        p.apps.on("focusMyInputView", this.focusMyInputView), p.apps.on("toggleEmo", this.onToggleEmo), p.apps.on("changeSideEmoButton", this.onChangeSideButton), p.apps.on("pressSideEmoButton", this.onPressSideEmoButton), p.apps.on("blurMyInputView", this.onBlurMyInputView), p.apps.on("changeMyInputPlaceHolder", this.onChangeMyInputPlaceHolder), p.apps.on("changeMyInputViewEditable", function (e) {
          t.setState({
            editable: e
          }), p.apps.__editable = e;
        }), p.apps.on("selectedPicturesChanged", this.onSelectedPicturesChanged), p.apps.on("inputSendPress", this.onSendPress), p.apps.on("sideEmoGifAutoCompleteSelected", this.onSideEmoGifAutoCompleteSelected), p.apps.on("atSignSelected", this.atSignSelected), p.apps.on("dbIsReady", function () {
          t.setState({
            value: p.apps.myInputTextValue
          });
        }), p.apps.on("keyboardHide", this.keyboardHide), p.apps.on("showGif", this.showGif);
      },
      componentWillUnmount: function () {
        p.apps.unon("focusMyInputView", this.focusMyInputView), p.apps.unon("blurMyInputView", this.onBlurMyInputView), p.apps.unon("toggleEmo", this.onToggleEmo), p.apps.unon("changeSideEmoButton", this.onChangeSideButton), p.apps.unon("pressSideEmoButton", this.onPressSideEmoButton), p.apps.unon("changeMyInputPlaceHolder", this.onChangeMyInputPlaceHolder), p.apps.unon("changeMyInputViewEditable"), p.apps.unon("selectedPicturesChanged", this.onSelectedPicturesChanged), p.apps.unon("inputSendPress", this.onSendPress), p.apps.unon("sideEmoGifAutoCompleteSelected", this.onSideEmoGifAutoCompleteSelected), p.apps.unon("atSignSelected", this.atSignSelected), p.apps.unon("keyboardHide", this.keyboardHide), p.apps.unon("showGif", this.showGif);
      },
      keyboardHide: function () {
        this.setState({
          showGif: !1,
          noEmoBtn: !1
        });
      },
      showGif: function (t) {
        this.setState({
          showGif: t
        });
      },
      onKeyPress: function (t) {
        t.nativeEvent.text && this.setState({
          value: t.nativeEvent.text
        }), "md-return-left" !== this.state.sendButtonName && p.apps.shouldChangeReturnToSend() && p.apps.isIn(t.nativeEvent.key, "\n", "Enter") && this.onSendPress();
      },
      clearInput: function (t, e) {
        p.apps.myInputViewRef.diff = 0, p.apps.heightDiff = 0, this.props.onHeightChange(0), "android" === a.Platform.OS && this.state.value && (this.skipOnChange = t), p.apps.myInputTextValue = "", this.setState({
          textInputContainerHeight: r,
          textInputHeight: this.props.textInputHeight,
          value: "",
          sendButtonColor: p.theme.lighta
        }, function () {
          e && e();
        });
      },
      onSendPress: function (t, e, n) {
        var i = this;
        if (!p.apps.bottleThrowConfirmed && "friends" === p.apps.currentNavi && "3:" === p.apps.currentRoutes.friends.userid.slice(0, 2)) return p.apps.bottleThrowConfirmed = !0, void this.onSendPress(t, e, n);
        delete p.apps.userHasInputText, p.apps.emit("embededBrowserFloatingButtonSettingChanged", 0);
        var o = this.state.value;
        "" === o.trim() && (o = ""), p.apps.picBoardIsSending, p.apps.emitOnce("rowIsOnEditFinished"), p.apps.oldHeightDiff = p.apps.heightDiff, p.apps.emit("textInputHeightChanged", 0, function () {
          return e && e(o || p.apps.selectedImageUris.length);
        }, n), this.diffAddCnt = 0, this.prevTextInputHeight = this.props.textInputHeight, this.props.onHeightChange(0), p.apps.myInputTextValue = "", this.setState({
          textInputContainerHeight: r,
          textInputHeight: this.props.textInputHeight,
          value: "",
          sendButtonColor: p.theme.lighta
        }, function () {
          if (p.apps.gifSideEmoGifData) {
            var n = p.apps.gifSideEmoGifData,
              s = n.uri,
              a = n.width,
              r = n.height,
              h = n.size;
            i.props.onSend(p.apps.CONS_MSG_TYPE_GIF, {
              uri: s,
              width: a,
              height: r,
              size: h
            }), p.apps.emit("sideEmoButtonPressed", !1), p.apps.gifSideEmoGifData = null;
          } else e && p.apps.picBoardIsSending ? t && t() : i.props.onSend(p.apps.CONS_MSG_TYPE_TEXT, o);
          t && t();
        });
      },
      onChangeSideButton: function (t) {
        t ? this.setState({
          sideEmo: !0,
          placeholder: (0, p.tr)("Search GIF"),
          placeholderTextColor: p.theme.warnLight1
        }) : this.setState({
          sideEmo: !1,
          placeholder: (0, p.tr)("Text..."),
          placeholderTextColor: p.apps.darkTheme ? p.theme.deep3 : p.theme.lighta
        });
      },
      onPressSideEmoButton: function () {
        return "mySpace" === p.apps.currentNavi && "3:" === p.apps.currentRoutes.mySpace.userid.slice(0, 2) ? void p.apps.tip((0, p.tr)("Drifted bottle can only contain text")) : (p.apps.emit("embededBrowserFloatingButtonSettingChanged", 0), p.apps.sideEmoButtonPressed = !0, void (this.state.sideEmo ? (p.apps.userHasInputText || p.apps.myInputViewRef.refs.inputView.clearInput(!0), p.apps.emit("sideEmoButtonPressed", !1)) : (p.apps.emit("sideEmoButtonPressed", !0), p.apps.myInputViewComponent.focus())));
      },
      atSignSelected: function (t) {
        var e = this.state.value.replace(/(.*)(@\S*)$/, "$1@" + t);
        this.setState({
          value: e
        });
      },
      onSideEmoGifAutoCompleteSelected: function (t) {
        var e = this;
        "string" == typeof t ? this.setState({
          value: t
        }, function () {
          e.onSideEmoSearchButtonPress();
        }) : "object" == typeof t && (p.apps.sideEmoListView.scrollTo({
          y: 0,
          animated: !1
        }), p.apps.fetchWebServiceGifData({
          type: "favor",
          startup: !0
        }));
      },
      onSideEmoSearchButtonPress: function () {
        var t = this;
        p.apps.sideEmoListView.scrollTo({
          y: 0,
          animated: !1
        }), p.apps.sideEmoViewRef.reset(function () {
          var e = t.state.value.trim();
          p.apps.fetchWebServiceGifData({
            type: "tenor",
            searchKey: e
          });
        });
      },
      onPressEmoButton: function () {
        if ("aboutMe" !== p.apps.currentNavi) {
          var t = !this.state.isEmoShow;
          this.state.isEmoShow && (t = "emoj" !== p.apps.boardType), t && p.apps.isKeyboardShow && (p.apps.isKeyboardShow = !1, p.apps.isDismissingKeyboard = !0, (0, p.dismissKeyboard)()), p.apps.emit("setBoardType", "emoj"), p.apps.emit("toggleEmo", t);
        }
      },
      onToggleEmo: function (t) {
        p.apps.emit("emoStoreIconChanged", t ? null : "hide"), t && p.apps.isKeyboardShow && (p.apps.isKeyboardShow = !1, (0, p.dismissKeyboard)()), p.apps.isEmoShow = t, this.state.isEmoShow !== t && this.setState({
          isEmoShow: t
        });
      },
      focusMyInputView: function (t, e, n, i) {
        return p.apps.isKeyboardShow && "edit" !== e ? void 0 : "mySpace" === t || "friends" === t ? "first" === e ? (this.setState({
          placeholder: (0, p.tr)("What's your story?")
        }), p.apps.emit("setBoardType", "picture"), void p.apps.emit("toggleEmo", !0)) : "append" === e || "insert" === e ? (p.apps.emit("setBoardType", "picture"), void p.apps.emit("toggleEmo", !0)) : (n && "edit" === e ? (this.shouldAjustTextHeight = !0, p.apps.myInputTextValue = n, this.setState({
          value: n
        }, function () {})) : "bottle" === e ? this.setState({
          showGif: !1,
          noEmoBtn: !0
        }) : "thrownFailed" === e && (this.shouldAjustTextHeight = !0, p.apps.myInputTextValue = n || "", p.apps.heightDiff = p.apps.oldHeightDiff, delete p.apps.oldHeightDiff, this.setState({
          value: n || "",
          showGif: !1,
          noEmoBtn: !0
        })), p.apps.emit("setBoardType", "emoj"), void (i || p.apps.myInputViewComponent.focus())) : void p.apps.myInputViewComponent.focus();
      },
      onBlurMyInputView: function () {
        p.apps.myInputViewComponent.blur();
      },
      render: function () {
        var t = this;
        return s["default"].createElement(a.View, null, s["default"].createElement(a.View, {
          style: [{
            flex: 1,
            height: 5,
            backgroundColor: p.theme.myInputBorderBg
          }, p.apps.blackWhiteMode && {
            borderTopColor: "#ddd",
            borderTopWidth: p.theme.px1
          }]
        }), s["default"].createElement(a.View, {
          style: [g.textInputContainer, {
            height: this.state.textInputContainerHeight
          }]
        }, this.state.showGif ? s["default"].createElement(a.TouchableOpacity, {
          style: [g.emoButton, {
            paddingLeft: 15,
            paddingRight: 13
          }],
          onPress: this.onPressSideEmoButton
        }, s["default"].createElement(p.Ionicons, {
          name: "ios-ionitron-outline",
          color: p.theme.lighta,
          size: 24
        })) : s["default"].createElement(a.View, {
          style: {
            width: 1
          }
        }), s["default"].createElement(a.TextInput, {
          ref: function (t) {
            return p.apps.myInputViewComponent = t;
          },
          onFocus: function () {
            return p.apps.lastFocusTextInputRef = p.apps.myInputViewComponent;
          },
          onBlur: function () {
            return p.apps.lastFocusTextInputRef = null;
          },
          style: [g.textInput, {
            height: this.state.textInputHeight,
            paddingLeft: this.state.showGif ? 0 : 15
          }, "ios" == a.Platform.OS ? g.textInputIos : g.textInputAndroid],
          placeholder: this.state.placeholder,
          placeholderTextColor: this.state.placeholderTextColor,
          onChange: this.onChange,
          onSelectionChange: this._onSelectChange,
          value: this.state.value,
          multiline: !0,
          textAlignVertical: "center",
          imageFontSize: 18,
          editable: this.state.editable,
          onKeyPress: "md-return-left" !== this.state.sendButtonName && p.apps.shouldChangeReturnToSend() ? this.onKeyPress : function () {},
          returnKeyType: "md-return-left" !== this.state.sendButtonName && p.apps.shouldChangeReturnToSend() ? "send" : "default",
          noChangeOnReturn: !("md-return-left" === this.state.sendButtonName || !p.apps.shouldChangeReturnToSend()),
          selectionColor: p.theme.deepGreen2,
          maxLength: l
        }), this.state.noEmoBtn || this.state.sideEmo ? null : s["default"].createElement(a.TouchableOpacity, {
          style: [g.emoButton, {
            height: r,
            paddingTop: 1
          }],
          onPress: this.onPressEmoButton
        }, s["default"].createElement(p.Ionicons, {
          name: "ios-happy-outline",
          color: p.theme.lighta,
          size: 27
        })), this.state.sideEmo && this.state.sendButtonColor !== p.theme.deepGreen ? s["default"].createElement(a.TouchableOpacity, {
          style: [{
            backgroundColor: p.theme.deepGreen2Trans6,
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 10,
            paddingHorizontal: 10,
            marginVertical: 2,
            marginRight: 3
          }],
          onPress: function () {
            return t.onSideEmoSearchButtonPress();
          }
        }, s["default"].createElement(a.Text, {
          style: [{
            color: p.theme.white,
            fontSize: 14
          }, {
            paddingBottom: "ios" == a.Platform.OS ? 2 : 3
          }]
        }, (0, p.tr)("Search"))) : s["default"].createElement(a.TouchableOpacity, {
          style: [g.emoButton, "ios" == a.Platform.OS && {
            paddingRight: 7
          }],
          onPress: function () {
            return t.onSendPress();
          }
        }, s["default"].createElement(p.Ionicons, {
          name: this.state.sendButtonName,
          style: ["ios" == a.Platform.OS && {
            paddingTop: 2
          }],
          size: this.state.sendButtonSize,
          color: this.state.sendButtonColor
        }))), s["default"].createElement(a.View, {
          style: {
            flex: 1,
            height: 5,
            backgroundColor: p.theme.myInputBorderBg
          }
        }));
      }
    }),
    g = {
      textInputContainer: {
        flexDirection: "row",
        backgroundColor: p.theme.myInputBg
      },
      emoButton: {
        marginHorizontal: 0,
        backgroundColor: p.theme.emoButtonBg,
        paddingHorizontal: 10,
        alignSelf: "stretch",
        justifyContent: "center",
        alignItems: "center"
      },
      emoButtonInnerView: {
        width: 20,
        height: 20,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: p.theme.lighta
      },
      sendButtonWrapper: {
        justifyContent: "center",
        alignItems: "center",
        width: r - 4,
        backgroundColor: p.theme.transparent,
        alignSelf: "stretch",
        marginLeft: 4
      },
      sendButton: {
        fontSize: 26,
        backgroundColor: p.theme.transparent,
        textAlign: "center"
      },
      textInput: {
        flex: 1,
        backgroundColor: p.theme.transparent,
        paddingLeft: 4,
        fontSize: 17,
        color: p.theme.deep6
      },
      textInputAndroid: {
        paddingVertical: 3
      },
      textInputIos: {
        paddingTop: 1
      }
    };
});
