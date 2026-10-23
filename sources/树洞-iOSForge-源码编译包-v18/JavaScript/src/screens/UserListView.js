// Maintenance source; recovered reference retained separately.
// Maintenance source; recovered reference retained separately.
__d(359, function (e, t, i, n) {
  var r = t(311),
    o = babelHelpers.interopRequireDefault(r),
    s = t(312),
    a = t(314);
  n.UserListView = o["default"].createClass({
    displayName: "UserListView",
    mixins: [a.ScrollResponder.Mixin],
    getInitialState: function () {
      return this.bottleBtnDiff = 15, this.dataSource = new s.ListView.DataSource({
        rowHasChanged: function (e, t) {
          return e.friendId !== t.friendId || e.pin !== t.pin || e.time !== t.time || e.accessTime !== t.accessTime || e.shouldUpdate !== t.shouldUpdate || e.isRemove !== t.isRemove || e.descType !== t.descType || e.recoverySelected !== t.recoverySelected;
        }
      }).cloneWithRows([]), this.viewMaxHeight = a.theme.winHeight - a.theme.statusHeightAll - a.theme.navHeight, "friends" === this.props.type && (this.viewMaxHeight -= a.theme.tabHeight), this.viewHeight = this.viewMaxHeight, this._viewHeight = this.viewMaxHeight, {
        userListData: [],
        viewHeight: new s.Animated.Value(this.viewMaxHeight),
        displaySortMenu: !1,
        sortSelected: [!0, !1, !1],
        interActionFinished: !1,
        statusBarDiff: a.apps.statusBarDiff
      };
    },
    getDefaultProps: function () {
      return {
        onPressTab2: function () {},
        onPressTab3: function () {},
        onPressTab4: function () {}
      };
    },
    myScrollResponderHandleStartShouldSetResponderCapture: function (e, t, i, n) {
      return this.viewHeight !== this.viewMaxHeight ? !0 : this.scrollResponderHandleStartShouldSetResponderCapture(t);
    },
    myScrollResponderHandleResponderRelease: function (e) {
      this.viewHeight !== this.viewMaxHeight ? a.apps.myInputViewComponent.blur() : this.scrollResponderHandleResponderRelease(e);
    },
    onInputSend: function (e, t, i) {
      var n = this;
      if (a.apps.currentNavi === this.props.tab && a.apps.currentRoutes[a.apps.currentNavi].name === this.props.iType && a.apps.currentRoutes[a.apps.currentNavi].uid === this.props.uid && (t || a.apps.selectedImageUris.length)) {
        if (a.apps.myInputViewComponent.blur(), !a.apps.ws) return void a.apps.tip((0, a.tr)("Network Failed"));
        if (!a.apps.gender) return void a.apps.changeGender(a.apps.userid, !0, function () {
          return n.onInputSend(e, t, i);
        });
        if (a.apps.popProg((0, a.tr)("Throwing")), a.apps.startBottleTime = Date.now(), a.apps.isTempUserid()) return void setTimeout(function () {
          return a.apps.popTip((0, a.tr)("Throw in the hole"));
        }, 2e3);
        a.dbs.setUserProfile({
          throwTime: a.apps.now()
        })["catch"](function (e) {
          return (0, a.tlog)("error", "set throwTime", e);
        });
        var r = a.apps.getNewShareId(3),
          o = a.apps.getNewMsgId(),
          s = 0;
        delete a.apps.tmpSayIt, t === a.apps.lastBottleData ? s = 1 : a.dbs.setUserProfile({
          lastBottleData: t
        })["catch"](function (e) {
          return (0, a.tlog)("error", "lastBottleData", t, e);
        }), t = t.trim(), !a.apps.firReg && Date.now() - a.apps.firstThrow > 3e4 && (delete a.apps.firstThrow, delete a.apps.firstThrowCnt), a.apps.has("bottleThrown") || a.apps.on("bottleThrown", function () {
          setTimeout(function () {
            return a.apps.popTip((0, a.tr)("Throw in the hole"), function () {
              a.apps.firstThrowTip(), n.setState({});
            });
          }, 1800);
        }), a.apps.sendShareMsg("newShare", {
          fromId: a.apps.userid,
          toId: "3:" + a.apps.userid,
          shareFrom: a.apps.userid,
          target: ["me"],
          bdrop: s,
          type: e,
          data: t,
          shareId: r,
          msgid: o,
          ftype: 3,
          sseqi: 0,
          mseqi: 0
        }, function () {}, function (e, i) {
          if (i.nobottle) setTimeout(function () {
            return a.apps.popTip((0, a.tr)("Drift bottle has been banned"));
          }, 200);else if (i.overNow) {
            if (a.dbs.setUserProfile({
              throwOver: i.overNow,
              nextBottleTime: i.nextPt || 3
            }), "^1" === a.apps.userid.slice(-2)) a.apps.popTip((0, a.tr)("Whisper tomorrow~"));else {
              var n = new Date(a.apps.now()).getHours();
              a.apps.popClose(function () {
                return a.apps.diag({
                  header: (0, a.tr)("Switch Shadow"),
                  content: n < a.apps.nextBottleTime ? (0, a.tr)("Throw after ##:00 PM or switchShadow to get more chances", a.apps.nextBottleTime) : (0, a.tr)("The pickup chances used up. Switch shadow to get more chances"),
                  buttons: [{
                    text: (0, a.tr)("Cancel"),
                    onPress: function () {
                      return a.apps.closeDiag();
                    }
                  }, {
                    text: (0, a.tr)("Switch Shadow"),
                    onPress: function () {
                      return a.apps.switchShadow(!0, t);
                    }
                  }]
                });
              });
            }
            a.apps.emit("throwStateChanged");
          } else i.over;
        })["catch"](function (e) {
          (0, a.tlog)("error", "spaceView onInputSend", e);
        });
      }
    },
    toggleSortMenu: function () {
      this.setState({
        displaySortMenu: !this.state.displaySortMenu
      });
    },
    renderRowLeftBlock: function (e) {
      var t = e.friendId.match(/^(\d+):/);
      if (t && (t = parseInt(t, 10), 8 === t)) var i = "/a/drift_circle_dark.png";
      if (a.apps.isSysUser(e.friendId) || t && t > 2) var n = "contain";else n = "cover";
      return o["default"].createElement(s.View, null, o["default"].createElement(s.View, {
        style: d.avatarContainer
      }, o["default"].createElement(a.CachedImage, {
        imageId: i,
        avatarId: i ? null : e.friendId,
        style: [d.avatarImage, /-|:/.test(e.friendId) ? {
          borderRadius: 10
        } : {}],
        resizeMode: n
      })), this.renderUnreadMsgNum(e));
    },
    renderRowRightBlock: function (e) {
      if (e.isRemove && this.recoveryBatchMode()) {
        var self = this;
        return o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            self.recoveryToggleRow(e);
          },
          style: {
            width: 55,
            height: a.theme.userListRowHeight,
            alignItems: "center",
            justifyContent: "center"
          }
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 24,
            color: a.theme.deepGreen
          }
        }, this.state.recoverySelected && this.state.recoverySelected[e.friendId] ? "☑" : "□"));
      }
      return e.isRemove ? o["default"].createElement(s.TouchableOpacity, {
        onPress: function () {
          return a.apps.removeFriend(e.friendId, e.userid);
        },
        style: {
          backgroundColor: a.theme.warnTrans6,
          width: a.theme.userListRowHeight,
          height: a.theme.userListRowHeight,
          justifyContent: "center",
          alignItems: "center"
        }
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 14,
          color: a.theme.white
        }
      }, (0, a.tr)("Remove"))) : o["default"].createElement(a.ShareBriefView, {
        style: {
          width: a.theme.userListRowHeight,
          height: a.theme.userListRowHeight
        },
        friend: e
      });
    },
    renderRowMiddleBlock: function (item) {
      var time = a.apps.recoveryValidTime(item.time);
      return o.default.createElement(s.View, {
        style: [d.rowMiddleContainer, {
          position: "relative",
          minWidth: 0
        }]
      }, o.default.createElement(s.View, {
        style: {
          paddingTop: 8,
          paddingLeft: 4,
          paddingRight: 6,
          alignItems: "flex-start"
        }
      }, o.default.createElement(a.NameText, {
        userid: item.friendId,
        imageFontSize: 15,
        style: d.rowUserNameText,
        numberOfLines: 1
      })), item.pin === 1 ? o.default.createElement(s.View, {
        style: {alignSelf:"flex-start",borderRadius:3,paddingVertical:3,paddingHorizontal:5,marginLeft:5,marginTop:5,backgroundColor:a.theme.steelBlueTrans8||"rgba(70,130,180,0.8)"}
      }, o.default.createElement(s.Text, {style:{fontSize:10,color:a.theme.white}}, "已置顶")) : null, time ? o.default.createElement(s.Text, {
        style: {
          position: "absolute",
          right: 6,
          bottom: 3,
          fontSize: 10,
          color: a.theme.lighta,
          textAlign: "right"
        }
      }, time) : null);
    },
    renderUnreadMsgNum: function (e) {
      var t = 0;
      if (e.friendId === a.apps.USERID_RES) t = a.apps.bottleResponseMap.cnt;else if (a.apps.isIn(this.props.type, "friends", "bottleFriends")) {
        var i = a.apps.friendsUnread[e.friendId];
        i && (t += i.length);
      } else if (/^msgFriends_/.test(this.props.type)) {
        var n = a.apps.spaceUnread[e.shareId];
        n && (i = n[e.fromId], i && (t += i.length));
      }
      return "3:" === this.props.uid.slice(0, 2) ? o["default"].createElement(s.View, {
        style: [d.unreadMsgNumView, {
          backgroundColor: e.descType === a.apps.CONS_FRIEND_REPLIED ? a.theme.deepGreen2Trans6 : a.theme.warnTrans6
        }]
      }, o["default"].createElement(s.Text, {
        style: {
          fontSize: 10,
          color: a.theme.lighte
        }
      }, (0, a.tr)(e.descType === a.apps.CONS_FRIEND_REPLIED ? "\u5df2\u56de" : "\u672a\u56de"))) : t ? o["default"].createElement(s.View, {
        style: [d.unreadMsgNumView, {
          backgroundColor: a.theme.warn
        }]
      }, o["default"].createElement(s.Text, {
        style: d.unreadMsgNumText
      }, t)) : void 0;
    },
    renderUnreadPhotoNum: function (e) {
      return e.unreadPhotoNum > 0 ? o["default"].createElement(s.View, {
        style: d.unreadPhotoNumView
      }, o["default"].createElement(s.Text, {
        style: d.unreadPhotoNumText
      }, e.unreadPhotoNum)) : void 0;
    },
    renderRow: function (e) {
      var t = this;
      if (e.isRemove && !this.recoveryBatchMode()) e = Object.assign({}, e, {isRemove:false});
      if (0 === e.friendId) return null;
      if ("3:" === e.friendId.slice(0, 2)) return null;
      if ("3:" === this.props.uid.slice(0, 2) && a.apps.notIn(e.descType, a.apps.CONS_FRIEND_REPLIED, a.apps.CONS_FRIEND_UNREPLIED)) return null;
      if (e.friendId === a.apps.userid && "shareFriends" !== this.props.type) return null;
      var i = [a.apps.showBackgroundImage ? {
        height: 1,
        backgroundColor: a.theme.transparent
      } : {
        height: a.theme.px1,
        backgroundColor: a.theme.lightd
      }];
      return e.isRemove ? o["default"].createElement(s.View, {
        style: {
          margin: 0,
          flex: 1
        }
      }, a.apps.showBackgroundImage ? o["default"].createElement(s.View, {
        style: i
      }) : null, o["default"].createElement(s.TouchableOpacity, {
        style: [d.rowContainer, a.apps.blackWhiteMode && {
          borderWidth: a.theme.px1,
          borderColor: "#ddd"
        }],
        onPress: function () {
          return t.recoveryBatchMode() && e.isRemove ? t.recoveryToggleRow(e) : t.props.onPressRowContent(e);
        },
        onLongPress: function () {
          return t.props.onLongPressRowContent(e);
        }
      }, this.renderRowLeftBlock(e), this.renderRowMiddleBlock(e), /^msgFriends_/.test(this.props.type) || e.isRemove ? this.renderRowRightBlock(e) : null), a.apps.showBackgroundImage ? null : o["default"].createElement(s.View, {
        style: i
      })) : o["default"].createElement(a.Swipeout, {
        style: {
          backgroundColor: a.theme.transparent
        },
        autoClose: !0,
        onOpenEnd: function (e) {
          t.swipeCtx && t.swipeCtx._close(), t.swipeCtx = e;
        },
        right: /msgFriends_/.test(this.props.type) ? [{
          text: (0, a.tr)("Remove"),
          backgroundColor: a.theme.warnTrans6,
          onPress: function () {
            a.apps.removeMsgFriend(e.shareId, e.friendId);
          }
        }] : "bottleFriends" === this.props.type ? [{
          text: (0, a.tr)("Remove"),
          backgroundColor: a.theme.warnTrans6,
          onPress: function () {
            return a.apps.removeFriend(e.friendId, e.userid);
          }
        }] : [{
          text: e.pin ? (0, a.tr)("Unpin on Top") : (0, a.tr)("Pin on Top"),
          backgroundColor: a.theme.deepGreen2Trans6,
          onPress: function () {
            (e.pin ? a.apps.unpinOnTop : a.apps.pinOnTop)(e.friendId, e.userid)["catch"](function (t) {
              (0, a.tlog)("error", "pin on top", e.friendId, t);
            });
          }
        }, {
          text: (0, a.tr)("Remove"),
          backgroundColor: a.theme.warnTrans6,
          onPress: function () {
            return a.apps.removeFriend(e.friendId, e.userid);
          }
        }]
      }, o["default"].createElement(s.View, {
        style: {
          margin: 0,
          flex: 1
        }
      }, a.apps.showBackgroundImage ? o["default"].createElement(s.View, {
        style: i
      }) : null, o["default"].createElement(s.TouchableOpacity, {
        style: [d.rowContainer, a.apps.blackWhiteMode && {
          borderWidth: a.theme.px1,
          borderColor: "#ddd"
        }],
        onPress: function () {
          t.recoveryBatchMode() && e.isRemove ? t.recoveryToggleRow(e) : t.props.onPressRowContent(e), t.swipeCtx && t.swipeCtx._close(), t.swipeCtx = null;
        },
        onLongPress: function () {
          return t.props.onLongPressRowContent(e);
        }
      }, this.renderRowLeftBlock(e), this.renderRowMiddleBlock(e), /^msgFriends_/.test(this.props.type) || e.isRemove ? this.renderRowRightBlock(e) : null), a.apps.showBackgroundImage ? null : o["default"].createElement(s.View, {
        style: i
      })));
    },
    onUserListViewDataChanged: function (e, t) {
      e === this.props.type && (this.setState({
        userListData: t,
        interActionFinished: !0
      }), this.props.onListDataChanged && this.props.onListDataChanged(t));
    },
    componentWillMount: function () {
      a.apps.on("userListViewDataChanged", this.onUserListViewDataChanged);
    },
    componentDidMount: function () {
      if (this.state.statusBarDiff) {
        var e = this.viewHeight - this.state.statusBarDiff;
        this._viewHeight !== e && (this._viewHeight = e, s.Animated.timing(this.state.viewHeight, {
          toValue: e,
          duration: "ios" === s.Platform.OS ? 150 : 50
        }).start());
      }
      a.apps.on("textInputHeightChanged", this.onTextInputHeightChanged), a.apps.on("inputSend", this.onInputSend), a.apps.on("keyboardShow", this.onKeyboardWillShow), a.apps.on("keyboardHide", this.onKeyboardWillHide), a.apps.on("statusBarDiffChanged", this.onStatusBarDiffChanged), a.apps.on("showBackgroundImageToggled", this.onShowBackgroundImageToggled), "bottleFriends" === this.props.type && a.apps.on("spaceUnreadChanged", this.spaceUnreadChanged), a.apps.on("pkgvvChanged", this.pkgvvChanged);
      a.apps.on("recoveryBatchChanged", this.recoveryBatchChanged);
    },
    componentWillUnmount: function () {
      a.apps.unon("textInputHeightChanged", this.onTextInputHeightChanged), a.apps.unon("keyboardShow", this.onKeyboardWillShow), a.apps.unon("keyboardHide", this.onKeyboardWillHide), a.apps.unon("inputSend", this.onInputSend), a.apps.unon("statusBarDiffChanged", this.onStatusBarDiffChanged), a.apps.unon("userListViewDataChanged", this.onUserListViewDataChanged), a.apps.unon("showBackgroundImageToggled", this.onShowBackgroundImageToggled), "bottleFriends" === this.props.type && a.apps.unon("spaceUnreadChanged", this.spaceUnreadChanged), a.apps.unon("pkgvvChanged", this.pkgvvChanged);
      a.apps.unon("recoveryBatchChanged", this.recoveryBatchChanged);
    },
    spaceUnreadChanged: function () {
      this.setState({});
    },
    pkgvvChanged: function () {
      this.setState({});
    },
    onTextInputHeightChanged: function (e, t, i) {
      if (!a.apps.cmdViewDisplay && a.apps.currentNavi === this.props.tab && a.apps.currentRoutes[a.apps.currentNavi].uid === this.props.uid && this.viewHeight !== this.viewMaxHeight) {
        a.apps.heightDiff = e;
        var n = this.viewHeight - e - this.state.statusBarDiff;
        a.apps.emit("myInputViewMoveTo", n + a.theme.navHeight + this.state.statusBarDiff, t), this._viewHeight !== n && (this._viewHeight = n, s.Animated.timing(this.state.viewHeight, {
          toValue: n,
          duration: "ios" === s.Platform.OS ? 250 : 50
        }).start(function () {
          i && i();
        }));
      }
    },
    onKeyboardWillShow: function (e) {
      var t = this;
      if (!a.apps.cmdViewDisplay && a.apps.currentNavi === this.props.tab && "friends" === a.apps.currentRoutes[a.apps.currentNavi].name && !a.apps.firReg) {
        a.apps.myInputFocusMode = "keyboard", a.apps.myInputViewRef && a.apps.myInputViewRef.changePlaceHolder((0, a.tr)("Throw a bottle..."));
        var i = a.theme.winHeight - (e.endCoordinates ? e.endCoordinates.screenY : e.end.screenY);
        a.theme.isIphoneX && (i -= a.theme.iphoneXDiff), a.apps.emit("myInputViewMoveTo", a.theme.winHeight - i - a.theme.chatTextInputHeight - a.apps.heightDiff), this.viewHeight = a.theme.winHeight - a.theme.navHeight - a.theme.statusHeightAll - a.theme.chatTextInputHeight - i;
        var n = this.viewHeight - this.state.statusBarDiff - a.apps.heightDiff;
        this._viewHeight !== n && (this._viewHeight = n, s.Animated.timing(this.state.viewHeight, {
          toValue: n,
          duration: "ios" === s.Platform.OS ? 150 : 50
        }).start(function () {
          return t.setState({});
        }));
      }
    },
    onKeyboardWillHide: function (e) {
      var t = this;
      if (!a.apps.cmdViewDisplay && a.apps.currentNavi === this.props.tab) {
        this.viewHeight = this.viewMaxHeight;
        var i = this.viewHeight - this.state.statusBarDiff;
        this._viewHeight !== i && (this._viewHeight = i, s.Animated.timing(this.state.viewHeight, {
          toValue: i,
          duration: "ios" === s.Platform.OS ? 150 : 50
        }).start(function () {
          return t.setState({});
        })), a.apps.emit("closeAtSignView"), a.apps.isEmoShow || (a.apps.emit("myInputViewMoveToLow"), a.apps.myInputViewRef.changePlaceHolder()), a.apps.myInputViewComponent.blur();
      }
    },
    pickupStateChanged: function () {},
    onShowBackgroundImageToggled: function () {
      var e = this.state.userListData.map(function (e) {
        return babelHelpers["extends"]({}, e, {
          shouldUpdate: !e.shouldUpdate
        });
      });
      this.setState({
        userListData: e
      });
    },
    onStatusBarDiffChanged: function (e) {
      if (this.state.statusBarDiff !== e) {
        this.setState({
          statusBarDiff: e
        });
        var t = this.viewHeight - e;
        this._viewHeight !== t && (this._viewHeight = t, s.Animated.timing(this.state.viewHeight, {
          toValue: t,
          duration: "ios" === s.Platform.OS ? 150 : 50
        }).start());
      }
    },
    renderRecoveryGlobalSearchBar: function () {
      if(this.props.tab!=="friends"||this.props.type!=="friends"||this.props.uid!==a.apps.userid)return null;
      if(this.recoveryBatchMode())return null;
      return o.default.createElement(s.View,{style:{height:44,flex:0,paddingHorizontal:12,paddingVertical:6,backgroundColor:a.theme.transparent}},
        o.default.createElement(s.TouchableOpacity,{accessibilityLabel:"全局搜索",activeOpacity:.75,onPress:function(){a.apps.openRecoveryGlobalSearch();},style:{height:32,borderRadius:8,borderWidth:.5,borderColor:a.theme.deep2,backgroundColor:a.theme.lightLessTrans6,flexDirection:"row",alignItems:"center",justifyContent:"center"}},
          o.default.createElement(a.Ionicons,{name:"ios-search",size:17,color:a.theme.deep6,style:{marginRight:5}}),
          o.default.createElement(s.Text,{style:{fontSize:14,color:a.theme.deep6}},"搜索")));
    },
    renderHeader: function () {
      return o["default"].createElement(s.View, {
        style: {
          height: 0
        }
      });
    },
    renderFooterTip: function () {
      return null;
    },
    renderHeaderTip: function () {
      var e = this;
      return a.apps.firstNotiTouched ? null : o["default"].createElement(s.View, {
        style: {
          flexDirection: "row",
          marginTop: 1,
          alignItems: "center",
          justifyContent: "center"
        }
      }, o["default"].createElement(s.TouchableOpacity, {
        onPress: function () {
          return a.apps.requestingNotiPermission ? !0 : (a.apps.setSharedParas({
            firstNotiTouched: 1
          }), a.apps.emit("selectViewLoaded_contactsBoard", !0), a.apps.requestingNotiPermission = !0, setTimeout(function () {
            delete a.apps.requestingNotiPermission;
          }, 2e3), void a.apps.requestPermission({
            type: "notification",
            header: (0, a.tr)("Tip"),
            content: (0, a.tr)("You will not be reminded unless turning on notifications."),
            btn1: (0, a.tr)("Later on"),
            btn2: (0, a.tr)("Allow now"),
            callback: function () {
              e.setState({});
            }
          }));
        },
        style: {
          height: 38,
          borderRadius: 5,
          marginTop: 5,
          backgroundColor: a.theme.replyBox,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 5,
          paddingRight: 10
        }
      }, o["default"].createElement(s.View, {
        style: {
          marginHorizontal: 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: a.theme.warn,
          justifyContent: "center",
          alignItems: "center"
        }
      }, o["default"].createElement(s.Text, {
        style: {
          color: a.theme.white,
          fontSize: 15,
          fontWeight: "bold",
          textAlignVertical: "center"
        }
      }, "?")), o["default"].createElement(s.View, {
        style: {
          flex: 1,
          marginLeft: 2,
          justifyContent: "center",
          alignItems: "center"
        }
      }, o["default"].createElement(s.Text, {
        style: {
          color: a.theme.white
        }
      }, (0, a.tr)("Notification disabled")))));
    },
    renderHeaderMsgbox: function () {
      var e = this;
      if ("bottleFriends" === this.props.type) {
        var t = a.apps.bottleReplyUnreadList,
          i = t[t.length - 1],
          n = t.length > 99 ? "99+" : t.length;
        return i ? o["default"].createElement(s.View, {
          style: {
            flexDirection: "row",
            marginTop: 1,
            alignItems: "center",
            justifyContent: "center"
          }
        }, o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            var t = i.msgid,
              n = i.shareId,
              r = i.type,
              o = i.time,
              s = i.category,
              p = i.text,
              l = (i.userid, i.fromId),
              h = i.toId,
              d = i.shareFrom,
              u = i.ftype,
              c = (i.atime, i.utab),
              f = {
                msgid: t,
                shareId: n,
                descType: r,
                time: o,
                descCategory: s,
                text: p,
                friendId: l,
                fromId: l,
                toId: h,
                shareFrom: d,
                type: u,
                atime: -910,
                utab: c
              },
              m = e.props.routes,
              g = a.apps.newRoute(m, "interact_", {
                friend: f,
                name: (0, a.tr)("Message")
              });
            a.apps.currentRoutes.mySpace.name = g.id, a.apps.currentRoutes.mySpace.shareId = f.shareId, m.navi.navForward(g);
          },
          style: {
            height: 38,
            borderRadius: 5,
            marginTop: 5,
            backgroundColor: a.theme.replyBox,
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 5,
            paddingRight: 10
          }
        }, o["default"].createElement(a.CachedImage, {
          avatarId: i.userid,
          style: {
            width: 30,
            height: 30,
            borderRadius: 5
          },
          resizeMode: "cover"
        }), o["default"].createElement(s.View, {
          style: {
            flex: 1,
            marginLeft: 7,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.Text, {
          style: {
            color: a.theme.white
          }
        }, n + ("zh" === a.apps.locale.slice(0, 2) ? "\u4e2a" : " ") + (n > 1 ? (0, a.tr)("Bottle Replies") : (0, a.tr)("Bottle Reply")))))) : null;
      }
      return null;
    },
    render: function () {
      var e = this;
      this.dataSource = this.dataSource.cloneWithRows(this.state.userListData.map(function (row) {
        return Object.assign({}, row, {
          recoverySelected: !!(e.state.recoverySelected && e.state.recoverySelected[row.friendId])
        });
      }));
      var t = "3:" !== this.props.uid.slice(0, 2);
      return o["default"].createElement(s.View, {
        style: {
          flex: 1,
          backgroundColor: a.theme.lightLess
        }
      }, o["default"].createElement(s.View, {
        style: {
          height: a.theme.navHeight
        }
      }), o["default"].createElement(a.BackgroundImageView, {
        shouldRender: !0,
        maskColor: a.theme.lightLessTrans6
      }), o["default"].createElement(s.View, {
        style: {
          height: this.viewMaxHeight - this.state.statusBarDiff
        }
      }, o["default"].createElement(s.Animated.View, {
        style: {
          height: this.state.viewHeight,
          backgroundColor: a.theme.userListBgColor
        }
      }, this.renderRecoveryBatch(), this.renderRecoveryGlobalSearchBar(), this.renderHeaderTip(), this.renderHeaderMsgbox(), this.state.interActionFinished ? o["default"].createElement(s.ListView, {
        ref: "listView",
        style: {
          flex: 1,
          backgroundColor: a.theme.transparent
        },
        initialListSize: 10,
        pageSize: 10,
        scrollRenderAheadDistance: 1e3,
        dataSource: this.dataSource,
        renderRow: this.renderRow,
        enableEmptySections: !0,
        scrollsToTop: !1,
        onResponderRelease: this.myScrollResponderHandleResponderRelease,
        onStartShouldSetResponderCapture: this.myScrollResponderHandleStartShouldSetResponderCapture,
        renderFooter: function () {
          return e.props.renderFooter ? e.props.renderFooter(e) : function () {};
        },
        renderHeader: function () {
          return e.props.renderHeader ? e.props.renderHeader(e) : e.renderHeader();
        }
      }) : o["default"].createElement(a.InterActionSpinner, {
        up: 60
      }), this.renderFooterTip()), a.apps.shouldShowBanner && s.UIManager.RNGADBannerView && "bottleFriends" === this.props.type ? o["default"].createElement(a.AdMobBanner, {
        style: {
          position: "absolute",
          left: (a.theme.winWidth - 320) / 2,
          bottom: this.bottleBtnDiff ? -100 : 0,
          width: 320,
          height: 50
        },
        adUnitID: "ca-app-pub-7694282362075022/5241939735",
        onAdLoaded: function () {
          e.bottleBtnDiff = 0, a.apps.emit("loadBottleResponse"), a.apps.emit("throwStateChanged"), a.apps.emit("pickupStateChanged"), e.setState({});
        },
        onAdFailedToLoad: function (t) {
          (0, a.tlog)("error", "AdMobBanner", t.message), e.bottleBtnDiff = 15, a.apps.emit("loadBottleResponse"), a.apps.emit("throwStateChanged"), a.apps.emit("pickupStateChanged"), e.setState({});
        }
      }) : null, t && a.apps.pkgvv !== a.apps.version ? o["default"].createElement(l, {
        ctx: this
      }) : null, t && "^1" === a.apps.userid.slice(-2) ? o["default"].createElement(p, {
        ctx: this
      }) : null, t && a.apps.pkgvv !== a.apps.version && !a.apps.firReg ? o["default"].createElement(h, {
        ctx: this
      }) : null), this.props.mainTab ? o["default"].createElement(a.MainTabView, {
        tabIndex: 0,
        noSwitch: !0
      }) : null);
    },
    recoveryBatchMode: function () {
      return this.props.uid && this.props.uid.slice(0, 2) === "3:" ? !!a.apps.gFriendRemove : !!a.apps.gFriendRemove2;
    },
    recoveryBatchChanged: function () {
      this.setState({
        recoverySelected: {}
      });
      this.onShowBackgroundImageToggled();
    },
    recoveryToggleRow: function (row) {
      var selected = Object.assign({}, this.state.recoverySelected || {});
      if (selected[row.friendId]) delete selected[row.friendId];else selected[row.friendId] = true;
      this.setState({
        recoverySelected: selected
      });
      this.onShowBackgroundImageToggled();
    },
    recoverySelectAll: function (invert) {
      var selected = {},
        old = this.state.recoverySelected || {};
      this.state.userListData.forEach(function (row) {
        if (row.isRemove && (!invert || !old[row.friendId])) selected[row.friendId] = true;
      });
      this.setState({
        recoverySelected: selected
      });
      this.onShowBackgroundImageToggled();
    },
    recoveryCancelBatch: function () {
      if (this.props.uid.slice(0, 2) === "3:") a.apps.gFriendRemove = false;else a.apps.gFriendRemove2 = false;
      this.setState({
        recoverySelected: {}
      });
      this.setState({userListData:this.state.userListData.map(function(row){return Object.assign({},row,{isRemove:false});})});
      if(a.apps.friendsNavigator)a.apps.friendsNavigator.setState({});
      a.apps.emit("recoveryBatchChanged");
      a.apps.loadFriendsData(this.props.uid);
    },
    recoveryDeleteSelected: function () {
      var self = this,
        selected = this.state.recoverySelected || {},
        rows = this.state.userListData.filter(function (row) {
          return row.isRemove && selected[row.friendId];
        });
      if (!rows.length) return a.apps.tip("请先选择要删除的记录");
      a.apps.diag({
        header: "删除记录",
        content: "确认删除选中的" + rows.length + "条记录？",
        buttons: [{
          text: "取消",
          onPress: function () {
            return a.apps.closeDiag();
          }
        }, {
          text: "删除",
          onPress: function (dialog) {
            if (dialog.isProgressing) return;
            dialog.progressing(true);
            var chain = Promise.resolve(),
              done = 0;
            rows.forEach(function (row) {
              chain = chain.then(function () {
                return a.apps.removeFriend(row.friendId, row.userid);
              }).then(function () {
                done++;
              });
            });
            chain.then(function () {
              a.apps.closeDiag();
              self.recoveryCancelBatch();
              a.apps.tip("已删除" + done + "条记录");
            }).catch(function (error) {
              dialog.progressing(false);
              dialog.setState({
                infoTip: "已删除" + done + "条，其余未完成，请重试"
              });
            });
          }
        }]
      });
    },
    renderRecoveryBatch: function () {
      if (!this.recoveryBatchMode()) return null;
      var self = this,
        button = function (label, press) {
          return o["default"].createElement(s.TouchableOpacity, {
            onPress: press,
            style: {
              paddingHorizontal: 10,
              paddingVertical: 10
            }
          }, o["default"].createElement(s.Text, {
            style: {
              fontSize: 13,
              color: a.theme.deep9
            }
          }, label));
        };
      return o["default"].createElement(s.View, {
        style: {
          height: 44,
          flex: 0,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "flex-end",
          backgroundColor: a.theme.transparent
        }
      }, button("全选", function () {
        self.recoverySelectAll(false);
      }), button("反选", function () {
        self.recoverySelectAll(true);
      }), button("取消", this.recoveryCancelBatch), button("删除(" + Object.keys(this.state.recoverySelected || {}).length + ")", this.recoveryDeleteSelected));
    }
  });
  var p = (o["default"].createClass({
      displayName: "ReplyCnt",
      loadBottleResponse: function () {
        this.setState({});
      },
      componentDidMount: function () {
        a.apps.on("loadBottleResponse", this.loadBottleResponse), this.setState({});
      },
      componentWillUnmount: function () {
        a.apps.unon("loadBottleResponse", this.loadBottleResponse);
      },
      render: function () {
        return a.apps.bottleResponseMap.cnt ? o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            return a.apps.emit("replyBtnPressed");
          },
          style: {
            position: "absolute",
            bottom: 85 - this.props.ctx.bottleBtnDiff,
            height: 20,
            right: (a.theme.winWidth - 79) / 2 - 8,
            paddingHorizontal: 8,
            borderRadius: 10,
            backgroundColor: a.theme.warn,
            justifyContent: "center",
            alignItems: "center"
          }
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 13,
            color: a.theme.white
          }
        }, a.apps.bottleResponseMap.cnt > a.apps.RECV_CNT_LIMIT ? a.apps.RECV_CNT_LIMIT + "+" : a.apps.bottleResponseMap.cnt)) : null;
      }
    }), o["default"].createClass({
      displayName: "ReplyBtn",
      getInitialState: function () {
        return {};
      },
      replyBtnPressed: function () {
        var e = this;
        return a.apps.forbidExp || a.apps.isForbided ? void a.apps.forbidTip() : void (a.apps.bottleResponseMap.cnt ? a.apps.diag({
          header: (0, a.tr)("Tip"),
          content: a.apps.bottleResponseMap.cnt > a.apps.RECV_CNT_LIMIT ? (0, a.tr)("You have received over 20 replies") : (0, a.tr)("Someone ## has replied your whisper", a.apps.bottleResponseMap.cnt),
          buttons: [{
            text: (0, a.tr)("No Check"),
            onPress: function () {
              return a.apps.closeDiag();
            }
          }, {
            text: (0, a.tr)("Check"),
            onPress: function () {
              return a.apps.closeDiag(function () {
                e.props.ctx.refs.listView && e.props.ctx.refs.listView.scrollTo({
                  y: 0
                }), a.apps.popProg((0, a.tr)("Check")), setTimeout(function () {
                  a.apps.popClose(), a.apps.fetchAllBottleResponse();
                }, 800);
              });
            }
          }]
        }) : a.apps.popTip((0, a.tr)("No reply yet")));
      },
      loadBottleResponse: function () {
        this.setState({});
      },
      componentDidMount: function () {
        a.apps.on("loadBottleResponse", this.loadBottleResponse), a.apps.on("replyBtnPressed", this.replyBtnPressed);
      },
      componentWillUnmount: function () {
        a.apps.unon("replyBtnPressed", this.replyBtnPressed), a.apps.unon("loadBottleResponse", this.loadBottleResponse);
      },
      render: function () {
        return o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            return a.apps.emit("replyBtnPressed");
          },
          style: ["ios" === s.Platform.OS ? {} : {}, {
            position: "absolute",
            bottom: 70 - this.props.ctx.bottleBtnDiff,
            height: 30,
            width: 79,
            left: (a.theme.winWidth - 79) / 2,
            borderRadius: 15,
            backgroundColor: a.apps.bottleResponseMap.cnt ? a.theme.deepGreen2Trans4 : a.theme.lightLessTrans4,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          }, a.apps.bottleResponseMap.cnt ? {
            borderColor: a.theme.white,
            borderWidth: 2
          } : {}]
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 13,
            fontWeight: "bold",
            color: a.theme.white,
            paddingBottom: 1
          }
        }, (0, a.tr)("Response")));
      }
    }), o["default"].createClass({
      displayName: "ShadowBtn",
      render: function () {
        return o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            return a.apps.popTip("\u5f53\u524d\u4e3a\u5206\u8eab");
          },
          style: ["ios" === s.Platform.OS ? {
            shadowColor: "#fff",
            shadowOffset: {
              width: 0,
              height: 0
            },
            shadowOpacity: .7,
            shadowRadius: 5
          } : {}, {
            position: "absolute",
            bottom: 70 - this.props.ctx.bottleBtnDiff,
            height: 30,
            width: 79,
            left: (a.theme.winWidth - 79) / 2,
            borderRadius: 15,
            backgroundColor: a.theme.lightLessTrans4,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          }]
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 13,
            fontWeight: "bold",
            color: a.theme.white,
            paddingBottom: 1
          }
        }, (0, a.tr)("\u5206\u8eab")));
      }
    })),
    l = o["default"].createClass({
      displayName: "ThrowBtn",
      getInitialState: function () {
        return {};
      },
      componentDidMount: function () {
        var e = this;
        a.apps.on("throwStateChanged", this.throwStateChanged), clearInterval(a.apps.throwRefreshTimer), a.apps.throwRefreshTimer = setInterval(function () {
          return e.throwStateChanged();
        }, 1e3);
      },
      componentWillUnmount: function () {
        a.apps.unon("throwStateChanged", this), clearInterval(a.apps.throwRefreshTimer);
      },
      throwStateChanged: function () {
        this.setState({});
      },
      render: function () {
        var e = this,
          t = new Date(a.apps.now()).getHours(),
          i = !1;
        if (a.apps.throwOver) {
          var n = a.apps.getToday(a.apps.now() - 3600 * a.apps.nextBottleTime * 1e3);
          a.apps.throwOver === n ? i = !0 : a.dbs.delUserProfile("throwOver");
        }
        if (i && "^1" !== a.apps.userid.slice(-2)) {
          i = !1;
          var r = !0;
        }
        return o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            if (a.apps.ws) {
              if (a.apps.forbidExp || a.apps.isForbided) a.apps.forbidTip();else if (r) a.apps.diag({
                heade: (0, a.tr)("Switch Shadow"),
                content: t < a.apps.nextBottleTime ? (0, a.tr)("Throw after ##:00 PM or switchShadow to get more chances", a.apps.nextBottleTime) : (0, a.tr)("The pickup chances used up. Switch shadow to get more chances"),
                buttons: [{
                  text: (0, a.tr)("Cancel"),
                  onPress: function () {
                    return a.apps.closeDiag();
                  }
                }, {
                  text: (0, a.tr)("Switch Shadow"),
                  onPress: function () {
                    return a.apps.switchShadow(!0);
                  }
                }]
              });else if (i) setTimeout(function () {
                a.apps.popTip(t < a.apps.nextBottleTime ? (0, a.tr)("Whisper after ##:00 PM", a.apps.nextBottleTime) : (0, a.tr)("Whisper tomorrow~"));
              }, 200);else if (a.apps.firReg) {
                var n = function o(t) {
                  a.apps.diag({
                    header: (0, a.tr)("\u661f\u7a7a"),
                    content: (0, a.tr)("\u5411\u661f\u7a7a\u7684\u964c\u751f\u4eba\u8bf4\u51fa\u4f60\u7684\u6084\u6084\u8bdd\uff0c\u4f60\u4f1a\u6536\u5230\u6765\u81ea\u4ed6\u4eec\u7684\u56de\u5e94"),
                    textInputs: [{
                      placeholder: (0, a.tr)("\u6084\u6084\u8bdd\u5185\u5bb9..."),
                      value: "",
                      maxLength: 500
                    }],
                    infoTip: t,
                    buttons: [{
                      text: (0, a.tr)("\u4e0b\u4e00\u6b65"),
                      onPress: function (t) {
                        var i = t.state.textInputs[0].value.trim();
                        if (i = i.replace(/\ufffc/, ""), !i) return void t.setState({
                          infoTip: (0, a.tr)("Cannot be empty")
                        });
                        var n = function () {
                          a.apps.closeDiag(function () {
                            a.apps.firstThrow = Date.now(), a.apps.firstThrowCnt = 0, setTimeout(function () {
                              delete a.apps.firstThrow, delete a.apps.firstThrowCnt;
                            }, 12e4), e.props.ctx.onInputSend(a.apps.CONS_MSG_TYPE_TEXT, i), a.apps.on("firRegThrown", function (e) {
                              o((0, a.tr)("Only normal Chinese(##)", e));
                            });
                          });
                        };
                        a.apps.gender ? n() : a.apps.changeGender(a.apps.userid, !0, function () {
                          return n();
                        });
                      }
                    }]
                  });
                };
                n();
              } else a.apps.diag({
                header: (0, a.tr)("\u8bf4\u8bf4"),
                content: (0, a.tr)("\u5411\u661f\u7a7a\u8bf4\u51fa\u4f60\u7684\u6084\u6084\u8bdd"),
                textInputs: [{
                  placeholder: (0, a.tr)("\u4f60\u7684\u6084\u6084\u8bdd..."),
                  value: a.apps.tmpSayIt || "",
                  multiline: !0,
                  height: 150,
                  onSelectionChange: function () {},
                  maxLength: 500
                }],
                buttons: [{
                  text: (0, a.tr)("\u53d6\u6d88"),
                  onPress: function () {
                    a.apps.closeDiag(), delete a.apps.tmpSayIt;
                  }
                }, {
                  text: (0, a.tr)("\u8bc9\u8bf4"),
                  onPress: function (t) {
                    var i = t.state.textInputs[0].value.trim();
                    return (i = i.replace(/\ufffc/, "")) ? (a.apps.closeDiag(), void e.props.ctx.onInputSend(a.apps.CONS_MSG_TYPE_TEXT, i)) : void t.setState({
                      infoTip: (0, a.tr)("Cannot be empty")
                    });
                  }
                }]
              });
            } else a.apps.tip((0, a.tr)("Network Failed"));
          },
          style: ["ios" === s.Platform.OS ? {
            shadowColor: "#fff",
            shadowOffset: {
              width: 0,
              height: 0
            },
            shadowOpacity: .7,
            shadowRadius: 5
          } : {}, {
            position: "absolute",
            backgroundColor: i ? a.theme.lightLessTrans4 : a.theme.deepGreen2Trans4,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            bottom: 70 - this.props.ctx.bottleBtnDiff
          }, a.apps.firReg ? {
            borderColor: a.theme.white,
            borderWidth: 5,
            height: 40,
            width: 120,
            left: (a.theme.winWidth - 120) / 2,
            borderRadius: 30,
            backgroundColor: a.theme.deepGreen2Trans6
          } : {
            borderColor: a.theme.white,
            borderWidth: 1,
            height: 30,
            width: 79,
            left: (a.theme.winWidth - 79) / 2 - ("^1" !== a.apps.userid.slice(-2) ? 85 : 95),
            borderRadius: 15
          }]
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: a.apps.firReg ? 14 : 13,
            fontWeight: "bold",
            color: a.theme.white,
            paddingBottom: 1
          }
        }, a.apps.firReg ? "\u8fdb\u5165\u661f\u7a7a" : (0, a.tr)("\u8bf4  \u8bf4")));
      }
    }),
    h = o["default"].createClass({
      displayName: "PickupBtn",
      getInitialState: function () {
        return {};
      },
      componentDidMount: function () {
        var e = this;
        a.apps.on("pickupStateChanged", this.pickupStateChanged), clearInterval(a.apps.pickupRefreshTimer), a.apps.pickupRefreshTimer = setInterval(function () {
          return e.pickupStateChanged();
        }, 1e3);
      },
      componentWillUnmount: function () {
        a.apps.unon("pickupStateChanged", this.pickupStateChanged), clearInterval(a.apps.pickupRefreshTimer);
      },
      pickupStateChanged: function () {
        this.setState({});
      },
      render: function () {
        var e = this,
          t = new Date(a.apps.now()).getHours(),
          i = !1;
        if (a.apps.pickupOver) {
          var n = a.apps.getToday(a.apps.now() - 3600 * a.apps.nextBottleTime * 1e3);
          a.apps.pickupOver === n ? i = !0 : a.dbs.delUserProfile("pickupOver");
        }
        if (i && "^1" !== a.apps.userid.slice(-2)) {
          i = !1;
          var r = !0;
        }
        return o["default"].createElement(s.TouchableOpacity, {
          onPress: function () {
            a.apps.ws ? a.apps.forbidExp || a.apps.isForbided ? a.apps.forbidTip() : r ? a.apps.diag({
              header: (0, a.tr)("Switch Shadow"),
              content: t < a.apps.nextBottleTime ? (0, a.tr)("Pickup after ##:00 PM or switchShadow to get more chances", a.apps.nextBottleTime) : (0, a.tr)("The pickup chances used up. Switch shadow to get more chances"),
              buttons: [{
                text: (0, a.tr)("Cancel"),
                onPress: function () {
                  return a.apps.closeDiag();
                }
              }, {
                text: (0, a.tr)("Switch Shadow"),
                onPress: function () {
                  return a.apps.switchShadow(!0);
                }
              }]
            }) : (e.props.ctx.refs.listView && e.props.ctx.refs.listView.scrollTo({
              y: 0
            }), a.apps.pickupBottle()) : a.apps.tip((0, a.tr)("Network Failed"));
          },
          style: ["ios" === s.Platform.OS ? {
            shadowColor: "#fff",
            shadowOffset: {
              width: 0,
              height: 0
            },
            shadowOpacity: .7,
            shadowRadius: 5
          } : {}, {
            position: "absolute",
            bottom: 70 - this.props.ctx.bottleBtnDiff,
            height: 30,
            width: 79,
            left: (a.theme.winWidth - 79) / 2 + ("^1" !== a.apps.userid.slice(-2) ? 85 : 95),
            borderRadius: 15,
            backgroundColor: i ? a.theme.lightLessTrans4 : a.theme.deepGreen2Trans4,
            flexDirection: "row",
            justifyContent: "center",
            borderColor: a.theme.white,
            borderWidth: 1,
            alignItems: "center"
          }]
        }, o["default"].createElement(s.Text, {
          style: {
            fontSize: 13,
            fontWeight: "bold",
            color: a.theme.white,
            paddingBottom: 1
          }
        }, (0, a.tr)("Pickup")));
      }
    }),
    d = {
      anonymousView: {
        backgroundColor: "rgba(0,0,0,0.05)",
        borderRadius: 4,
        paddingHorizontal: 5
      },
      anonymousText: {
        color: a.theme.white,
        fontSize: 11
      },
      rowContainer: {
        height: a.theme.userListRowHeight,
        backgroundColor: a.theme.userListRowColor,
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 7,
        marginTop: 6,
        borderRadius: 8
      },
      rowSeperator: {
        height: a.theme.px1
      },
      avatarContainer: {
        height: a.theme.userListRowHeight,
        width: a.theme.userListRowHeight,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 1
      },
      avatarImage: {
        height: a.theme.userListRowHeight - 12,
        width: a.theme.userListRowHeight - 12,
        borderRadius: (a.theme.userListRowHeight - 14) / 2
      },
      rowRightBlock: {
        width: a.theme.userListRowHeight,
        height: a.theme.userListRowHeight,
        backgroundColor: a.theme.warn,
        justifyContent: "center",
        alignItems: "center"
      },
      rowRightBlockViewUp: {
        backgroundColor: a.theme.deep,
        borderRadius: (a.theme.userListRowHeight - 12) / 2,
        width: a.theme.userListRowHeight - 12,
        height: a.theme.userListRowHeight - 12,
        justifyContent: "center",
        alignItems: "center"
      },
      rowRightBlockTextUp: {
        color: a.theme.lightb,
        fontSize: 13
      },
      rowRightBlockTextDown: {
        position: "relative",
        left: 7,
        top: 5,
        fontSize: 13,
        color: a.theme.lighta
      },
      rightBlockContainer: {
        height: a.theme.userListRowHeight,
        width: a.theme.userListRowHeight,
        justifyContent: "center",
        alignItems: "center"
      },
      rightBlockPhotoImage: {
        height: a.theme.userListRowHeight - 10,
        width: a.theme.userListRowHeight - 10
      },
      rowMiddleContainer: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "flex-start",
        height: a.theme.userListRowHeight,
        width: 100
      },
      rowUserTagViewType: {
        backgroundColor: a.theme.userTagColor0,
        borderRadius: 5,
        paddingHorizontal: 5,
        marginLeft: 5,
        height: 20,
        justifyContent: "center",
        alignItems: "center"
      },
      rowUserTagTextType: {
        fontSize: 9,
        color: a.theme.lighta,
        textAlign: "center"
      },
      rowMiddleBlockUpView: {
        flexDirection: "row",
        marginHorizontal: 4,
        height: a.theme.userListRowHeight / 2 - 5,
        flex: 1,
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 5
      },
      rowMiddleBlockSpacer: {
        width: a.theme.userListRowHeight,
        height: 1
      },
      rowMiddleBlockDownView: {
        paddingRight: 25,
        width: s.Dimensions.get("window").width - 67,
        marginHorizontal: 4,
        marginBottom: 3,
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        position: "relative",
        bottom: 1
      },
      rowMessageText: {
        color: a.theme.deep9,
        fontSize: 14,
        textAlignVertical: "center"
      },
      rowUserNameView: {
        borderRadius: 5,
        justifyContent: "center",
        alignItems: "center"
      },
      rowUserNameText: {
        fontSize: 15,
        color: a.theme.deep6,
        fontWeight: "400",
        textAlign: "center",
        textAlignVertical: "center"
      },
      unreadMsgNumView: {
        position: "absolute",
        top: 0,
        right: -5,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 6,
        backgroundColor: a.theme.shareUnreadColor,
        justifyContent: "center",
        alignItems: "center"
      },
      unreadMsgNumText: {
        color: "white",
        fontSize: 11,
        fontWeight: "bold",
        textAlignVertical: "center"
      },
      unreadPhotoNumView: {
        position: "absolute",
        top: 4,
        left: 0,
        width: "ios" == s.Platform.OS ? 16 : 12,
        height: "ios" == s.Platform.OS ? 16 : 12,
        borderRadius: "ios" == s.Platform.OS ? 8 : 6,
        backgroundColor: a.theme.warn,
        justifyContent: "center",
        alignItems: "center"
      },
      unreadPhotoNumText: {
        color: a.theme.white,
        fontSize: 8
      }
    };
});
