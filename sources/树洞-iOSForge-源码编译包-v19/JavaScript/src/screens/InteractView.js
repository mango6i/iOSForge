// Maintenance source; recovered reference retained separately.
__d(362, function (e, t, i, s) {
  "use strict";

  var n = t(311),
    a = babelHelpers.interopRequireDefault(n),
    r = t(312),
    o = t(314),
    p = a["default"].createClass({
      displayName: "ConfirmBubble",
      render: function () {
        var e = this,
          t = o.apps.showBackgroundImage ? {
            borderColor: o.theme.white
          } : {
            borderWidth: o.theme.px1,
            borderColor: o.theme.bubbleBorder,
            borderBottomColor: o.theme.lightc,
            borderBottomWidth: o.theme.px1
          };
        return a["default"].createElement(r.View, {
          style: [{
            marginTop: 8,
            borderRadius: 7,
            borderWidth: o.theme.px1,
            paddingVertical: 5,
            paddingHorizontal: 8,
            backgroundColor: o.theme.deepTrans6,
            flexDirection: "column",
            alignItems: "center",
            marginHorizontal: o.theme.winWidth / 7,
            marginBottom: 3
          }, t]
        }, a["default"].createElement(o.MyTextView, {
          myTextValue: this.props.data.text || ".",
          imageFontSize: 15,
          adjustsFontSizeToFit: !0,
          style: {
            fontSize: 15,
            marginVertical: 8,
            color: o.theme.deep8,
            paddingTop: 1,
            paddingBottom: 1,
            textAlign: "center"
          }
        }), a["default"].createElement(r.View, {
          style: {
            flexDirection: "row",
            flex: 1,
            alignSelf: "stretch",
            marginBottom: 3
          }
        }, a["default"].createElement(r.TouchableOpacity, {
          onPress: function () {
            return e.props.yes();
          },
          style: {
            flex: 1,
            borderRadius: 5,
            paddingVertical: 4,
            marginVertical: 3,
            marginLeft: 6,
            marginRight: 4,
            backgroundColor: o.theme.deepGreen2Trans6
          }
        }, a["default"].createElement(r.Text, {
          style: {
            textAlign: "center",
            fontSize: 12,
            color: o.theme.white
          }
        }, (0, o.tr)("Yes"))), a["default"].createElement(r.TouchableOpacity, {
          onPress: function () {
            return e.props.no();
          },
          style: {
            flex: 1,
            borderRadius: 5,
            paddingVertical: 4,
            marginVertical: 3,
            marginLeft: 4,
            marginRight: 6,
            backgroundColor: o.theme.warnTrans6
          }
        }, a["default"].createElement(r.Text, {
          style: {
            textAlign: "center",
            fontSize: 12,
            color: o.theme.white
          }
        }, (0, o.tr)("No")))));
      }
    }),
    d = a["default"].createClass({
      displayName: "SubmitAuditTip",
      getInitialState: function () {
        return {
          shouldRender: !1
        };
      },
      componentDidMount: function () {
        o.apps.on("submitAuditTipShow", this.submitAuditTipShow);
      },
      componentWillUnmount: function () {
        o.apps.unon("submitAuditTipShow", this.submitAuditTipShow);
      },
      submitAuditTipShow: function () {
        this.setState({});
      },
      render: function () {
        return o.apps.hasSubmitAuditFlag ? this.props.ctx.buttonTip({
          text: (0, o.tr)("Submit Audit"),
          onPress: function () {
            o.apps.diag({
              header: (0, o.tr)("Submit Audit"),
              content: (0, o.tr)("Clear the abusing content before review"),
              buttons: [{
                text: (0, o.tr)("Cancel"),
                onPress: function () {
                  o.apps.closeDiag();
                }
              }, {
                text: (0, o.tr)("Submit"),
                onPress: function () {
                  o.apps.closeDiag(), o.apps.send("submitAudit").then(function () {
                    o.apps.popTip((0, o.tr)("Submitted"));
                  })["catch"](function (e) {
                    (0, o.tlog)("error", "submitAudit", e), o.apps.tip((0, o.tr)("Submit failed"), !0);
                  });
                }
              }]
            });
          }
        }) : null;
      }
    }),
    h = a["default"].createClass({
      displayName: "ReportFriendTip",
      getInitialState: function () {
        return this.friendId = this.props.ctx.getRealFriendId(), this.shareId = this.props.ctx.friend.shareId, {
          shouldRender: !1
        };
      },
      componentDidMount: function () {
        o.apps.on("showReportNow_" + this.shareId, this.showReportNow), o.apps.shouldShowReportNow[this.shareId] && this.setState({
          shouldRender: !0
        });
      },
      componentWillUnmount: function () {
        o.apps.unon("showReportNow_" + this.shareId, this.showReportNow);
      },
      showReportNow: function (e) {
        this.setState({
          shouldRender: e
        });
      },
      render: function () {
        var e = this;
        return this.state.shouldRender ? this.props.ctx.buttonTip({
          text: (0, o.tr)("Report Now?"),
          onPress: function () {
            o.apps.reportNow(e.friendId, e.shareId);
          }
        }) : null;
      }
    }),
    l = a["default"].createClass({
      displayName: "ForbidTipView",
      componentDidMount: function () {
        var e = this;
        o.apps.getProfileK(this.props.friendId, "forbid").then(function (t) {
          e.setState({});
        })["catch"](function (e) {
          (0, o.tlog)("error", "forbidTpView get", e);
        }), o.apps.on("forbidMsgRecved_" + this.props.friendId, this.recv);
      },
      componentWillUnmount: function () {
        o.apps.unon("forbidMsgRecved_" + this.props.friendId, this.recv);
      },
      recv: function () {
        var e = this,
          t = this.props.friendId;
        o.apps.getProfileK(t, "forbid").then(function (i) {
          i !== o.apps.CONS_FORBID_FAKE && (o.apps.profiles[t].forbid = o.apps.CONS_FORBID_FAKE, o.apps.emit("userNameChanged_" + t, null, !0), o.apps.emit("userAvatarChanged_" + t), e.setState({}));
        })["catch"](function (e) {
          (0, o.tlog)("error", "forbidTpView emit", e);
        });
      },
      render: function () {
        var e = o.apps.profiles[this.props.friendId];
        return e && e.forbid === o.apps.CONS_FORBID_FAKE ? a["default"].createElement(r.View, {
          style: {
            overflow: "hidden",
            flexDirection: "column",
            alignItems: "center",
            paddingHorizontal: o.theme.winWidth / 7,
            marginBottom: 10
          }
        }, a["default"].createElement(r.View, {
          style: [{
            backgroundColor: o.theme.warnTrans6,
            paddingHorizontal: 5,
            paddingBottom: 6,
            borderRadius: 5
          }]
        }, a["default"].createElement(o.MyTextView, {
          myTextValue: "\u8be5\u8d26\u53f7\u6709\u4e25\u91cd\u7684\u8bc8\u9a97\u98ce\u9669\uff0c\u8bf7\u52ff\u6dfb\u52a0\u5bf9\u65b9\u7684\u5176\u4ed6\u8054\u7cfb\u65b9\u5f0f\uff0c\u8bf7\u52ff\u76f8\u4fe1\u5bf9\u65b9\u8bf4\u7684\u4efb\u4f55\u8bdd\uff01\uff01\uff01",
          imageFontSize: 14,
          adjustsFontSizeToFit: !0,
          style: {
            fontSize: 14,
            color: o.theme.white,
            paddingTop: 1,
            paddingBottom: 1,
            textAlign: "center",
            lineHeight: 20
          }
        }))) : null;
      }
    }),
    c = a["default"].createClass({
      displayName: "GroupAtMemberList",
      getInitialState: function () {
        return this.members = null, this.nameMap = {}, {
          show: !1,
          keyboardHeight: 0,
          dataSource: new r.ListView.DataSource({
            rowHasChanged: function (e, t) {
              return e !== t;
            }
          })
        };
      },
      showAtSignView: function (e, t) {
        var i = this;
        if (e) {
          var s = e.slice(1).toLowerCase(),
            n = (o.apps.replyMembers[this.props.friend.shareId] || []).filter(function (e) {
              var t = (i.nameMap[e] || "").toLowerCase();
              return /^[a-z]/.test(t) ? t.startsWith(s) : -1 !== t.indexOf(s);
            });
          !t.replace(/\s/g, "") && this.props.friend.navFromSpace && 1 === n.length ? this.onPressRow(n[0]) : this.setState({
            show: n.length > 0,
            dataSource: this.state.dataSource.cloneWithRows(n)
          });
        } else this.setState({
          show: !1
        });
      },
      onKeyboardHeightChanged: function (e) {
        this.setState({
          keyboardHeight: e
        });
      },
      closeAtSignView: function () {
        this.state.show && this.setState({
          show: !1
        });
      },
      componentDidMount: function () {
        o.apps.on("showAtSignView", this.showAtSignView), o.apps.on("closeAtSignView", this.closeAtSignView);
      },
      componentWillUnmount: function () {
        o.apps.unon("showAtSignView", this.showAtSignView), o.apps.unon("closeAtSignView", this.closeAtSignView);
      },
      onPressRow: function (e) {
        var t = this;
        o.apps.getProfileK(e, "name").then(function (i) {
          t.props.friend.navFromSpace ? (o.apps.atFriendId = e, o.apps.myInputViewRef.refs.inputView.clearInput(!0, function () {
            o.apps.myInputViewRef.changePlaceHolder("@" + i, o.theme.warnLight1), o.apps.myInputViewComponent.focus();
          })) : o.apps.emit("atSignSelected", i + " "), t.setState({
            show: !1
          });
        })["catch"](function (e) {
          (0, o.tlog)("error", "GroupAtMemberList onPressRow", e);
        });
      },
      renderRow: function (e, t, i) {
        var s = this;
        return a["default"].createElement(r.TouchableOpacity, {
          style: {
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center",
            paddingVertical: 3,
            paddingHorizontal: 2,
            marginTop: 1,
            backgroundColor: o.theme.lighterTrans1
          },
          onPress: function () {
            return s.onPressRow(e);
          }
        }, a["default"].createElement(o.CachedImage, {
          avatarId: e,
          style: {
            width: 25,
            height: 25
          },
          resizeMode: "cover"
        }), a["default"].createElement(o.NameText, {
          userid: e,
          style: {
            marginLeft: 5,
            fontSize: 15,
            color: o.theme.deep6
          },
          onNameLoad: function (t) {
            s.nameMap[e] = t;
          }
        }));
      },
      render: function () {
        var e = this;
        return this.state.show ? a["default"].createElement(r.View, {
          style: {
            position: "absolute",
            backgroundColor: o.theme.lighterTrans1,
            borderRadius: 3,
            bottom: 1,
            left: 1,
            paddingVertical: 5,
            paddingHorizontal: 3,
            width: o.theme.winWidth / 3,
            height: 150
          }
        }, a["default"].createElement(r.ListView, {
          style: {
            backgroundColor: o.theme.transparent
          },
          ref: function (t) {
            return e.listViewRef = t;
          },
          initialListSize: 10,
          pageSize: 10,
          renderRow: this.renderRow,
          dataSource: this.state.dataSource,
          renderScrollComponent: function (e) {
            return a["default"].createElement(o.InvertibleScrollView, babelHelpers["extends"]({}, e, {
              inverted: !0
            }));
          }
        })) : null;
      }
    });
  s.InteractView = a["default"].createClass({
    displayName: "InteractView",
    mixins: [o.ScrollResponder.Mixin],
    myScrollResponderHandleStartShouldSetResponderCapture: function (e, t, i, s) {
      o.apps.modelImageViewRef[o.apps.curMseq] && o.apps.modelImageViewRef[o.apps.curMseq].state.display && o.apps.emit("resetScalable");
      var n = !1;
      return s.forEach(function (a, r) {
        r > i && "__eggfNoResponderCapture__" === a(e, t, i, s) && (n = !0);
      }), n ? !1 : o.apps.isEmoShow ? !0 : this.scrollResponderHandleStartShouldSetResponderCapture(t);
    },
    myScrollResponderHandleResponderRelease: function (e) {
      this.scrollResponderHandleResponderRelease(e), o.apps.isEmoShow && o.apps.emit("toggleEmo", !1);
    },
    getRealFriendId: function () {
      var e = this.friend,
        t = e.toId,
        i = e.fromId;
      return "2:" === t.slice(0, 2) || i === o.apps.userid ? t : i;
    },
    memberInit: function () {
      this._listViewHeight = o.theme.winHeight - o.theme.navHeight - o.theme.tabHeight - o.theme.statusHeightAll - o.theme.chatTextInputHeight, this._maxListViewHeight = this._listViewHeight, this.pos = 0, this.bpos = 0, this.bposes = [], this.nextpos = 0, this.posHist = [0], this.friend = babelHelpers["extends"]({}, this.props.friend), this.prevDis = 0, this.shouldInvert = !0, this.isInputMode = !1, this.inputLoadThreshold = Math.floor(o.theme.winHeight / 6 * 5), this.firstLoadThreshold = this._maxListViewHeight, this.otherLoadThreshold = 2 * this._maxListViewHeight, this.shouldRender = !1, this.firstRendered = !1, this.firstLoad = !0, this.scrollOffset = {
        x: 0,
        y: 0
      }, this.minimalRender = !1, this.interactFinished = !1, this.interactCallbacks = [], this.friendHist = [], this.isStarted = !1, this.realListViewHeight = this._listViewHeight, this.isEnd = !1, this.myselfId = o.apps.userid, this.interActionFinished = !1;
    },
    getInitialState: function () {
      return this.memberInit(), {
        dataSource: new r.ListView.DataSource({
          rowHasChanged: function (e, t) {
            var i = e !== t || e.time !== t.time;
            return i;
          }
        }),
        listViewHeight: new r.Animated.Value(this._listViewHeight),
        interActionFinished: !1,
        onEndReachedThreshold: 10,
        up: !1,
        statusBarDiff: o.apps.statusBarDiff,
        paddingTrans: o.theme.lightLessTrans6,
        removeClippedSubviews: !1,
        renderMoreLimit: !1,
        showList: !0,
        shouldRenderAddFriend: !1,
        renderDroper: !1
      };
    },
    onInputSend: function (e, t, i) {
      var s = this;
      if (o.apps.currentNavi === this.props.tab && o.apps.currentRoutes[o.apps.currentNavi].name === this.props.iType && !this.friendIdIsStock) {
        var n = this.friend.navFromSpace && o.apps.atFriendId || this.getRealFriendId();
        if (o.apps.isIn(n, o.apps.userid, "1", "-1", "-2")) return void o.apps.popTip((0, o.tr)("Don't reply system message"));
        if ("2:" === n.slice(0, 2)) return void o.apps.popTip((0, o.tr)("Group chat has been disabled"));
        if (o.apps.forbidExp || o.apps.isForbided) return void o.apps.forbidTip();
        if (this.friend.descCategory < 3) var a = o.apps.checkIfPraised(this.friend.shareId);else a = Promise.resolve(0);
        Promise.all([a, o.apps.getRelationShip(n), o.apps.getProfileK(n, "forbid"), o.apps.getMsgscnt(n, o.apps.userid), o.apps.isPeopleApproved(n)]).then(function (a) {
          var r = a[0] ? 1 : 0,
            p = a[1] || {},
            d = a[2] || o.apps.CONS_FORBID_NORMAL,
            h = a[3],
            l = a[4];
          if (o.apps.isUserForbided(d)) return void o.apps.tip((0, o.tr)("This user has been forbidden."));
          var c = p.isFriend ? 1 : 0,
            u = p.isFollowed ? 1 : 0,
            f = p.isStared ? 1 : 0,
            g = p.isCut;
          if (o.apps.syncFriendDrops(n), p.blocked) return void ("2:" === n.slice(0, 2) ? o.apps.diag({
            header: (0, o.tr)("Tip"),
            content: (0, o.tr)("You have been removed from the group"),
            buttons: [{
              text: (0, o.tr)("Ok"),
              onPress: function (e) {
                o.apps.closeDiag(function () {
                  o.apps.deleteGroup(n), o.apps.curNavigator.navi.navToTop();
                });
              }
            }]
          }) : o.apps.popTip((0, o.tr)("You have blocked this user")));
          if (-1 === s.friend.descCategory && n === o.apps.userid) {
            if (o.apps.selectedImageUris.length > 0) return o.apps.tip((0, o.tr)("You can only text @All")), void o.apps.deselectAllPictures();
            if (e === o.apps.CONS_MSG_TYPE_GIF && !/^https:/.test(t.uri)) return void o.apps.tip((0, o.tr)("Cannot send local gif to @all"));
          }
          s._onInputSend({
            type: e,
            data: t,
            friendId: n,
            isApproved: l,
            isCut: g,
            isFriend: c,
            isPraised: r,
            isStared: f,
            isFollowed: u,
            msgscnt: h,
            callback: i
          });
        })["catch"](function (i) {
          (0, o.tlog)("error", "onInputSend", e, t, i);
        });
      }
    },
    _onInputSend: function (e) {
      var t = this,
        i = e.type,
        s = e.data,
        n = e.friendId,
        a = e.isApproved,
        r = e.isCut,
        p = e.isFriend,
        d = e.isPraised,
        h = e.isStared,
        l = e.isFollowed,
        c = e.msgscnt,
        u = e.callback;
      if (s || o.apps.selectedImageUris.length) {
        if ("2:" === this.friend.friendId.slice(0, 2)) var f = 4;else if (3 === this.friend.descCategory) f = 3;else if ("3" === o.apps.splitShareId(this.friend.shareId).stype) {
          f = 3;
          var g = !0;
        } else f = o.apps.userid === this.friend.shareFrom ? -1 : 2;
        o.apps.clearAbuseMsg(this.fid), this.scrollToBottom({
          animated: !0
        });
        var m = o.apps.selectedImageUris,
          S = o.apps.rawOptionSelected,
          w = o.apps.userid,
          I = this.chatSession;
        this.friend.navFromSpace && o.apps.atFriendId && (I = o.apps.getChatSession(n, w));
        var y = function (e, i, s, m, S) {
          if (h) var y = o.apps.CONS_SEQI_MSGS_UNREAD_FLAG,
            v = o.apps.userid;else y = 0, v = "3:" + o.apps.userid;
          var b = g ? I : t.friend.shareId,
            T = o.apps.getNewMsgId(b, I);
          S && S(T), o.apps.sendShareReply("newMsg", {
            shareId: b,
            msgid: T,
            msgscnt: c,
            fromId: w,
            toId: n,
            chatSession: I,
            shareFrom: t.friend.shareFrom,
            friendId: t.friend.friendId,
            type: e,
            data: i,
            category: f,
            ftype: 1,
            fid: t.fid,
            seqi: y,
            atime: 0,
            isFriend: p,
            userid: v,
            isPraised: d,
            isStared: h,
            utab: l ? 1 : 2,
            isApproved: !!a,
            isCut: r
          }, function () {
            return setTimeout(s, 300);
          }, m).then(function (e) {
            u && u(e);
          })["catch"]((0, o.errCb)("interactView onInputSend"));
        };
        if (s) {
          if (o.apps.showCmdBall && i === o.apps.CONS_MSG_TYPE_TEXT) {
            if ("___msgtt" === s) {
              o.apps.__msgtt__ = 1;
              var v = function b() {
                o.apps.__msgtt__ && y(i, s + "__" + o.apps.__msgtt__++, function () {}, function () {}, function (e) {
                  o.apps.__msgtt__msgid = e, o.apps.__msgtt__cb = function () {
                    return b();
                  };
                });
              };
              return void v();
            }
            "___msgts" === s && (delete o.apps.__msgtt__, delete o.apps.__msgtt__cb, delete o.apps.__msgtt__msgid);
          }
          y(i, s, function () {
            m.length > 0 && o.apps.inputSend(m, S, y);
          });
        } else o.apps.inputSend(m, S, y);
      }
    },
    onFailedPress: function (e, t) {
      var i = this;
      if (t && o.apps.isIn(e.type, o.apps.CONS_MSG_TYPE_TEXT, o.apps.CONS_MSG_TYPE_WARN, o.apps.CONS_MSG_TYPE_ILLEGAL)) o.apps.emit("focusMyInputView", this.props.tab, "edit", e.text);else {
        var s = this.getRealFriendId(),
          n = 0,
          a = !1,
          r = " ";
        Promise.all([o.apps.getProfileK(s, "forbid"), o.apps.getRelationShip(s), o.apps.isPeopleApproved(s), o.apps.getMsgscnt(s, o.apps.userid)]).then(function (s) {
          var p = s[0] || o.apps.CONS_FORBID_NORMAL;
          return o.apps.isUserForbided(p) ? void o.apps.tip((0, o.tr)("This user has been forbidden.")) : (n = s[1].isFriend ? 1 : 0, a = s[2], r = s[3], void i._onFailedPress(e, n, t, a, r));
        })["catch"](function (t) {
          (0, o.tlog)("error", "onFailedPress", e, a, n, t);
        });
      }
    },
    _onFailedPress: function (e, t, i, s, n) {
      var a = {
        shareId: e.shareId,
        msgid: e.msgid,
        fromId: e.fromId,
        toId: e.toId,
        shareFrom: e.shareFrom,
        friendId: this.friend.friendId,
        type: e.type,
        category: e.category,
        ftype: e.ftype,
        seqi: e.seqi,
        fid: this.fid,
        data: e.data,
        text: e.text,
        atime: 0,
        chatSession: this.chatSession,
        isFriend: t,
        isApproved: s,
        msgscnt: n
      };
      a.data || (a.type === o.apps.CONS_MSG_TYPE_IMAGE ? (a.data = {}, a.data.ext = e.ext, a.data.height = e.height, a.data.width = e.width, a.data.uri = e.uri, a.data.size = e.size) : a.type === o.apps.CONS_MSG_TYPE_AUDIO && (a.data = {}, a.data.duration = e.duration, a.data.path = e.path, a.data.size = e.size)), e.resendCnt ? a.resendCnt = e.resendCnt + 1 : a.resendCnt = 1, o.apps.sendShareReply("resend", a)["catch"](function (e) {
        (0, o.tlog)("error", "InteractView failPress", e);
      });
    },
    checkForInvert: function (e) {
      return !0;
    },
    computeThreshold: function () {
      var e = o.theme.winHeight,
        t = 0;
      return this.minimalRender = !1, 0 === this.pos ? (this.minimalRender = !0, t = this.firstLoadThreshold, e = o.theme.winHeight) : (t = this.otherLoadThreshold, e = 2 * o.theme.winHeight), {
        onEndReachedThreshold: e,
        threshold: t
      };
    },
    rerender: function (e) {
      if (this.recoveryLocatedMessage) {
        this.setState({dataSource: this.state.dataSource.cloneWithRows(this.recoveryLocatedRows.slice().reverse())});
        return;
      }
      if (!o.apps.msgsData[this.fid]) return void (0, o.tlog)("error", "rerender msgsData null", this.fid);
      e || (e = 0), this.pos += e;
      var t = o.apps.msgsData[this.fid].slice(this.bpos, this.pos);
      this.shouldInvert || t.reverse(), this.setState({
        dataSource: this.state.dataSource.cloneWithRows(o.apps.filterRepeat(t, "msgid"))
      });
    },
    checkForSessionFiles: function (e) {
      o.apps.isIn(e.type, o.apps.CONS_MSG_TYPE_VIDEO, o.apps.CONS_MSG_TYPE_IMAGE) && (o.apps.sessionFilesCache && o.apps.sessionFilesCache[this.friend.shareId] ? (o.apps.sessionFileRenderedIndex[this.friend.shareId] += 1, 1 === e.category ? o.apps.addSessionMsgTx(null, [e], !0) : o.apps.fetchSessionFiles(this.friend.shareId, !0, this.friend.friendId)) : (0, o.tlog)("error", "InteractView sessionFilesCache null", this.chatSession, o.apps.sessionFilesCache));
    },
    checkForNotSended: function (e) {
      if (1 === e.stat) {
        var t = e.showtime || e.time;
        o.apps.now() - t > 864e5 && !e.timeoutFlagChecked && (e.timeoutFlag = !0);
      }
    },
    upPage: function () {
      var e = this;
      this.downPageMode = !1, this.shouldInvert = !0, this.setState({
        showList: !1
      }, function () {
        e.setState({
          showList: !0,
          renderMoreLimit: !1
        }, function () {
          e.renderMoreLimit = !1, e.bposes.push(e.bpos), e.bpos = e.nextpos, e.pos = e.bpos, e.renderMore("upPage");
        });
      });
    },
    downPage: function () {
      var e = this;
      this.setState({
        showList: !1
      }, function () {
        e.setState({
          showList: !0
        }, function () {
          e.pos = e.bpos + 1, e.nextpos = e.bpos, e.bpos = e.bposes.pop(), e.downPageMode = !0;
          var t = o.apps.msgsData[e.fid].slice(e.bpos, e.pos);
          t.reverse(), t = [{
            type: o.apps.CONS_MSG_TYPE_NEXTPAGE,
            text: (0, o.tr)("Up Page"),
            onPress: function () {
              return e.upPage();
            },
            onLayout: function () {}
          }].concat(t), 0 === e.bpos ? t.push({
            type: o.apps.CONS_MSG_TYPE_NEXTPAGE,
            text: "",
            onPress: function () {},
            onLayout: function () {}
          }) : t.push({
            type: o.apps.CONS_MSG_TYPE_NEXTPAGE,
            text: (0, o.tr)("Down Page"),
            onPress: function () {
              return e.downPage();
            },
            onLayout: function () {}
          }), e.shouldInvert = !1, e.setState({
            dataSource: e.state.dataSource.cloneWithRows(o.apps.filterRepeat(t, "msgid"))
          });
        });
      });
    },
    renderMore: function (e, t) {
      if (this.recoveryLocatedMessage) return null;
      var i = this,
        s = function () {
          if (i.isStarted && !i.renderMoreLimit && !i.downPageMode) {
            i.interActionFinished || (i.interActionFinished = !0, i.setState({
              interActionFinished: !0
            }));
            var e = o.apps.msgsData[i.fid];
            if (e) {
              var s = e.length;
              if (i.pos === s) return void (!i.isEnd && o.apps.msgsLoadPos[i.fid] && o.apps.msgsLoadPos[i.fid].isEnd && (i.isEnd = !0, i.setState({
                interActionFinished: !0
              })));
              var n = i.computeThreshold(),
                a = n.onEndReachedThreshold,
                r = n.threshold;
              if (i.shouldInvert) {
                for (var p, d = 0, h = i.pos; s > h; h++) if (p = e[h]) {
                  if (i.checkForNotSended(p), i.checkForSessionFiles(p), d += p.isDeleted ? 45 : p.type === o.apps.CONS_MSG_TYPE_TIP ? 20 : p.type === o.apps.CONS_MSG_TYPE_EMOTION ? 120 : p.type === o.apps.CONS_MSG_TYPE_IMAGE || p.type === o.apps.CONS_MSG_TYPE_VIDEO ? 20 + o.apps.getImageSize(p.width, p.height).height : 55, d > r) break;
                  d || (0, o.tlog)("error", "renderMore total", d);
                } else (0, o.tlog)("error", "msgsData[i] null", e, h);
                s - 1 > h ? i.pos = h + 1 : i.pos = s, e = e.slice(i.bpos, i.pos);
              } else e = e.slice(), e.reverse(), e.forEach(function (t) {
                return t ? (i.checkForNotSended(t), void i.checkForSessionFiles(t)) : void (0, o.tlog)("error", "msgsData[i] null", e, h);
              }), i.pos = e.length;
              i.renderMoreLimit = e.length > o.apps.listBlockLimit, i.renderMoreLimit && (i.nextpos = i.pos - 1, e = e.concat([{
                type: o.apps.CONS_MSG_TYPE_NEXTPAGE,
                text: (0, o.tr)("Up Page"),
                onPress: function () {
                  return i.upPage();
                },
                onLayout: function (e) {
                  var t = e.nativeEvent.layout;
                  i.nextPageLayout = t;
                }
              }])), i.setState({
                dataSource: i.state.dataSource.cloneWithRows(o.apps.filterRepeat(e, "msgid")),
                onEndReachedThreshold: a,
                interActionFinished: !0
              }, function () {
                t && t();
              });
            }
          }
        };
      s();
    },
    renderDroper: function (e) {
      var t = this;
      o.apps.getRelationShip(e).then(function (i) {
        t.setState({
          renderDroper: !i.isStared && !i.isFriend,
          renderStare: !i.isFriend && (o.apps.canStareMap[e] || o.apps.showCmdBall)
        });
      })["catch"](function (t) {
        (0, o.tlog)("error", "renderDroper getRelationShip", e, t);
      });
    },
    renderApprove: function (e) {
      var t = this;
      Promise.all([o.apps.hasPeopleApproves(e), o.apps.getRelationShip(e)]).then(function (e) {
        var i = e[0];
        t.setState({
          renderApprove: !i
        });
      })["catch"](function (t) {
        (0, o.tlog)("error", "render approvePeople", e, t);
      });
    },
    clearUnread: function () {
      try {
        var e = this.friend,
          t = e.descCategory,
          i = e.shareId,
          s = e.friendId,
          n = e.fromId,
          a = e.clearMsgFriendId;
        a && (s = a);
        var r = s.slice(0, 2);
        this.friendIdIsStock ? o.apps.removeStockMsgUnread() : "2:" === r ? o.apps.removeFriendsMsgUnread(s, i) : 2 === t || -1 === t ? o.apps.removeMySpaceMsgUnread(n, i) : o.apps.removeFriendUnread(s);
      } catch (p) {
        (0, o.tlog)("error", "clearUnread", p);
      }
    },
    msgChanged: function (e) {
      var t = this;
      this.msgDataChanged = !0, this.interactFinished ? this.renderMore("msgChanged", e) : this.interactCallbacks.push(function () {
        return t.renderMore("interactCallbacks", e);
      });
    },
    refreshMsgsData: function () {
      this.pos = this.bpos, this.posHist = [0], this.renderMore("refreshMsgsData");
    },
    rerenderMsgsData: function (e) {
      this.rerender(e);
    },
    checkIfShareMsgsHasChanged: function (e) {
      if (o.apps.shareMsgsChanged[this.friend.shareId]) {
        delete o.apps.shareMsgsChanged[this.friend.shareId];
        var t = o.apps.msgsDataBufferKeys.indexOf(e);
        -1 !== t && o.apps.msgsDataBufferKeys.splice(t, 1), delete o.apps.msgsData[this.fid], delete o.apps.msgsLoadPos[this.fid], delete o.apps.renderedMsgsMap[this.fid];
      }
    },
    cleanMsgsDataBuffer: function (e) {
      var t = o.apps.msgsDataBufferKeys.indexOf(e);
      if (-1 === t) {
        if (o.apps.msgsDataBufferKeys.length >= 5) {
          var i = o.apps.msgsDataBufferKeys.shift();
          delete o.apps.msgsData[i], delete o.apps.msgsLoadPos[i], delete o.apps.renderedMsgsMap[i], delete o.apps.ureadRenderMap[i];
        }
        o.apps.msgsDataBufferKeys.push(e);
      } else o.apps.msgsData[e] && o.apps.msgsData[e].length > 300 && (delete o.apps.msgsData[e], delete o.apps.msgsLoadPos[e], delete o.apps.renderedMsgsMap[e], delete o.apps.ureadRenderMap[e]), o.apps.msgsDataBufferKeys.splice(t, 1), o.apps.msgsDataBufferKeys.push(e);
    },
    fidInit: function (e) {
      var t = this;
      if (this.friend.myselfId && (this.myselfId = this.friend.myselfId), "7:" === this.friend.friendId.slice(0, 2)) this.friendIdIsStock = !0, o.apps.loadStockSession(this)["catch"](function (e) {
        (0, o.tlog)("error", "fidInit", e);
      });else {
        this.shouldInvert = !0;
        var i = this.friend,
          s = i.toId,
          n = i.fromId,
          a = i.shareId,
          r = i.isShareFriendStock,
          p = i.isReport;
        if (r) {
          this.chatSession = o.apps.getChatSession(s, n);
          var d = o.apps.splitShareId(a).shareFrom;
          this.myselfId = d === n ? s : n;
        } else this.friendIdIsStock || p ? this.chatSession = this.friend.chatSession : this.chatSession = o.apps.getChatSession(this.getRealFriendId(), o.apps.userid);
        this.friend.chatSession = this.chatSession, this.fid || (this.fid = o.apps.getFid(s, n, a)), o.apps.interactNaviCachedImages[this.fid] = [], o.apps.renderedMsgsMap[this.fid] = {}, o.apps.lastOptionTime[this.fid] = [Date.now()], this.checkIfShareMsgsHasChanged(this.fid), this.cleanMsgsDataBuffer(this.fid), o.apps.ureadRenderMap[this.fid] || (o.apps.ureadRenderMap[this.fid] = {}), o.apps.sessionFilesCache[this.friend.shareId] = [], o.apps.sessionFileRenderedIndex[this.friend.shareId] = 0, o.apps.loadNewMsgCounter(a, this.chatSession);
        var h = this.getRealFriendId();
        h === o.apps.userid || o.apps.isSysUser(h) || (o.apps.syncFriendProfile(h), o.apps.getRelationShip(h).then(function (e) {
          t.setState({
            renderDroper: !e.isStared && !e.isFriend,
            renderStare: !e.isFriend && (o.apps.canStareMap[h] || o.apps.showCmdBall)
          });
        })["catch"](function (e) {
          (0, o.tlog)("error", "fidInit getRelationShip", h, e);
        }), Promise.all([o.apps.hasPeopleApproves(h), o.apps.getRelationShip(h)]).then(function (e) {
          var i = e[0];
          t.setState({
            renderApprove: !i
          });
        })["catch"](function (e) {
          (0, o.tlog)("error", "fidInit renderApprove", h, e);
        })), o.apps.changeChatInputPlaceHolder(h, this.friend.descCategory), o.apps.on("interactViewDidFocus_" + this.fid, this.start), o.apps.on("leaveInteractFocus_" + this.fid, this.leaveInteractFocus), o.apps.on("msgsDataChanged_" + this.fid, this.msgChanged), o.apps.on("refreshMsgsData_" + this.fid, this.refreshMsgsData), o.apps.on("rerenderMsgsData_" + this.fid, this.rerenderMsgsData), o.apps.on("renderDroper_" + h, this.renderDroper), o.apps.on("renderApprove_" + h, this.renderApprove), this.friend.userid && this.friend.userid.slice(0, 2) === o.apps.CONS_BOTTLE_RES_PREFIX && o.apps.on("nextBtnChanged", this.nextBtnChanged), this.viewId = o.util.genViewId(), o.apps.msgsData[this.fid] && 0 !== o.apps.msgsData[this.fid].length || o.apps.loadMsgsData(this.friend, this.props.tab, this.fid, this.viewId);
      }
    },
    fidUninit: function () {
      (this.friendIdIsStock || this.friend.isReport || this.friend.isShareFriendStock || this.friend.isStock) && (delete o.apps.msgsData[this.fid], delete o.apps.msgsLoadPos[this.fid]), delete o.apps.atFriendId, delete o.apps.lastOptionTime[this.fid], delete o.apps.interactNaviCachedImages[this.fid], this.pos = 0, this.bpos = 0, this.posHist = [0], this.firstLoad = !0, delete o.apps.sessionFilesCache[this.friend.shareId], delete o.apps.sessionFilesCacheEnded[this.friend.shareId], delete o.apps.sessionFileRenderedIndex[this.friend.shareId], delete o.apps.unReadNewAudioMap[this.fid], delete o.apps.unReadNewAudioQueue[this.fid], delete o.apps.replyMembers[this.friend.shareId], this.shouldAlwaysClearBufferData && o.apps.clearMsgBufferData(this.fid), o.apps.unon("interactViewDidFocus_" + this.fid, this.start), o.apps.unon("leaveInteractFocus_" + this.fid, this.leaveInteractFocus), o.apps.unon("msgsDataChanged_" + this.fid, this.msgChanged), o.apps.unon("refreshMsgsData_" + this.fid, this.refreshMsgsData), o.apps.unon("rerenderMsgsData_" + this.fid, this.rerenderMsgsData);
      var e = this.getRealFriendId();
      o.apps.unon("renderDroper_" + e, this.renderDroper), o.apps.unon("renderApprove_" + e, this.renderApprove), this.friend.userid && this.friend.userid.slice(0, 2) === o.apps.CONS_BOTTLE_RES_PREFIX && o.apps.unon("nextBtnChanged", this.nextBtnChanged);
    },
    nextBtnChanged: function () {
      this.setState({});
    },
    leaveInteractFocus: function () {
      o.apps.currentNavi !== this.props.tab;
    },
    componentWillMount: function () {
      this.fidInit(), o.apps.on("toggleEmo", this.onToggleEmo), o.apps.on("textInputHeightChanged", this.onTextInputHeightChanged), o.apps.on("inputSend", this.onInputSend), o.apps.on("appStateChangeToActive", this.onAppStateChangeToActive), o.apps.on("keyboardShow", this.onKeyboardWillShow), o.apps.on("keyboardHide", this.onKeyboardWillHide), o.apps.on("showShareAndMsgIdToggled", this.onShowShareAndMsgIdToggled), o.apps.on("statusBarDiffChanged", this.onStatusBarDiffChanged), "friends" === this.props.tab ? o.apps.on("friendsTabSwitched", this.onTabSwitched) : "mySpace" === this.props.tab && o.apps.on("mySpaceTabSwitched", this.onTabSwitched);
    },
    onStatusBarDiffChanged: function (e) {
      if (this.state.statusBarDiff !== e) {
        this.setState({
          statusBarDiff: e
        });
        var t = this._listViewHeight - e;
        this.realListViewHeight !== t && (this.realListViewHeight = t, r.Animated.timing(this.state.listViewHeight, {
          toValue: t,
          duration: "ios" === r.Platform.OS ? 250 : 50
        }).start());
      }
    },
    componentDidMount: function () {
      if (this.state.statusBarDiff) {
        var e = this._listViewHeight - this.state.statusBarDiff;
        this.realListViewHeight !== e && (this.realListViewHeight = e, r.Animated.timing(this.state.listViewHeight, {
          toValue: e,
          duration: "ios" === r.Platform.OS ? 250 : 50
        }).start());
      }
      o.apps.recoveryChatViews = o.apps.recoveryChatViews || [];
      if (o.apps.recoveryChatViews.indexOf(this) < 0) o.apps.recoveryChatViews.push(this);
      var pending = o.apps.recoveryPendingLocate;
      if (pending && pending.ownerId === o.apps.userid && pending.peer === this.getRealFriendId() && (!pending.tab || pending.tab === this.props.tab) && (!pending.routeId || pending.routeId === this.props.route.id)) {
        delete o.apps.recoveryPendingLocate;
        this.recoveryLocate(pending.message, pending.rows)["catch"](function (error) { o.apps.tip(error.message || "定位失败"); });
      }
    },
    start: function () {
      var e = this;
      o.apps.currentNavi === this.props.tab && (this.clearUnread(), this.isStarted || (this.isStarted = !0, this.shouldAlwaysClearBufferData = !0, requestAnimationFrame(function () {
        e.interactFinished = !0, e.interactCallbacks.length > 0 ? e.interactCallbacks.forEach(function (e) {
          return e();
        }) : o.apps.msgsData[e.fid] ? (o.apps.msgsLoadPos[e.fid] || (o.apps.msgsLoadPos[e.fid] = {
          isEnd: 0,
          stage: 0
        }), e.renderMore("start")) : setTimeout(function () {
          e.msgDataChanged || e.setState({});
        }, 300), e.interactCallbacks = [];
      })));
    },
    componentWillUnmount: function () {
      this.recoveryUnmounted = true;
      var recoveryViews = o.apps.recoveryChatViews || [],
        recoveryIndex = recoveryViews.indexOf(this);
      if (recoveryIndex >= 0) recoveryViews.splice(recoveryIndex, 1);
      this.isStarted = !1, this.fidUninit(), this._listViewHeight = o.theme.winHeight - o.theme.navHeight - o.theme.tabHeight - o.theme.statusHeightAll - o.theme.chatTextInputHeight, this._maxListViewHeight = this._listViewHeight, o.apps.unon("keyboardShow", this.onKeyboardWillShow), o.apps.unon("keyboardHide", this.onKeyboardWillHide), o.apps.unon("textInputHeightChanged", this.onTextInputHeightChanged), o.apps.unon("showShareAndMsgIdToggled", this.onShowShareAndMsgIdToggled), o.apps.unon("toggleEmo", this.onToggleEmo), o.apps.unon("inputSend", this.onInputSend), o.apps.unon("statusBarDiffChanged", this.onStatusBarDiffChanged), "friends" === this.props.tab ? o.apps.unon("friendsTabSwitched", this.onTabSwitched) : "mySpace" === this.props.tab && o.apps.unon("mySpaceTabSwitched", this.onTabSwitched), o.apps.unon("appStateChangeToActive", this.onAppStateChangeToActive);
    },
    onToggleEmo: function (e) {
      o.apps.currentNavi === this.props.tab && o.apps.currentRoutes[o.apps.currentNavi].name === this.props.iType && "7:" !== this.friend.friendId.slice(0, 2) && this.toggleEmoHandle(e);
    },
    onTextInputHeightChanged: function (e) {
      if (o.apps.currentNavi === this.props.tab && o.apps.currentRoutes[o.apps.currentNavi].name === this.props.iType) {
        o.apps.heightDiff = e;
        var t = this._listViewHeight - e - this.state.statusBarDiff;
        o.apps.emit("myInputViewMoveTo", t + o.theme.navHeight + this.state.statusBarDiff), this.realListViewHeight !== t && (this.realListViewHeight = t, r.Animated.timing(this.state.listViewHeight, {
          toValue: t,
          duration: "ios" === r.Platform.OS ? 250 : 50
        }).start());
      }
    },
    onShowShareAndMsgIdToggled: function () {
      if (this.recoveryLocatedMessage) return this.rerender();
      var e = this;
      if (o.apps.msgsData[this.fid]) {
        var t = o.apps.msgsData[this.fid].slice(0, this.pos).map(function (e) {
            return babelHelpers["extends"]({}, e);
          }),
          i = o.apps.msgsData[this.fid].slice(this.pos);
        o.apps.msgsData[this.fid] = t.concat(i), this.setState({
          dataSource: this.state.dataSource.cloneWithRows(t)
        }, function () {
          e.setState({
            dataSource: e.state.dataSource.cloneWithRows([].concat(babelHelpers.toConsumableArray(t)))
          });
        });
      }
    },
    onAppStateChangeToActive: function () {},
    onTabSwitched: function () {
      var e = this.friend,
        t = e.shareId,
        i = e.friendId,
        s = e.fromId,
        n = e.clearMsgFriendId;
      "friends" === this.props.tab && o.apps.currentRoutes.friends.name === this.props.iType ? (n && (i = n), o.apps.removeFriendsMsgUnread(i, t)) : "mySpace" === this.props.tab && o.apps.currentRoutes.mySpace.name === this.props.iType && o.apps.removeMySpaceMsgUnread(s, t);
    },
    onEndReached: function () {
      if (this.recoveryLocatedMessage) return;
      this.isInputMode || this.downPageMode || o.apps.msgsData[this.fid] && o.apps.msgsLoadPos[this.fid] && (!o.apps.msgsLoadPos[this.fid].isEnd && this.pos + o.apps.fetchLimit > o.apps.msgsData[this.fid].length && !this.stopLoad ? o.apps.loadMsgsData(this.friend, this.props.tab, this.fid, this.viewId) : this.renderMore("onEndReached"));
    },
    scrollToBottom: function (e) {
      var t = this,
        i = e.animated;
      if (this.shouldInvert) requestAnimationFrame(function () {
        t.refs.listView && t.refs.listView.scrollTo({
          y: 0,
          animated: !1
        }), t.refs.listView && t.refs.listView.scrollTo({
          y: 0,
          animated: !1
        }), requestAnimationFrame(function () {
          return o.apps.emit("refreshMsgsData_" + t.fid);
        });
      });else {
        var s = this.footerY - this._listViewHeight;
        requestAnimationFrame(function () {
          t.refs.listView && t.refs.listView.scrollTo({
            y: s > 0 ? s : 0,
            animated: i
          });
        });
      }
    },
    toggleEmoHandle: function (e) {
      if (!o.apps.isKeyboardShow) {
        if (e) this._listViewHeight = this._maxListViewHeight - o.theme.dashboardHeight + o.theme.barHeight, this.isInputMode = !0, o.apps.emit("myInputViewMoveTo", this._listViewHeight + o.theme.navHeight - o.apps.heightDiff);else {
          if (!o.apps.myInputTextValue) {
            var t = this.getRealFriendId();
            o.apps.changeChatInputPlaceHolder(t, this.friend.descCategory), delete o.apps.atFriendId;
          }
          o.apps.emit("myInputViewMoveToHigh"), this._listViewHeight = this._maxListViewHeight, this.editMsgId = null, this.editShareId = null, this.editType = null, this.isInputMode = !1, o.apps.myInputViewRef.changePlaceHolder(), o.apps.deselectAllPictures();
        }
        var i = this._listViewHeight - this.state.statusBarDiff - o.apps.heightDiff;
        this.realListViewHeight !== i && (this.realListViewHeight = i, r.Animated.timing(this.state.listViewHeight, {
          toValue: i,
          duration: "ios" === r.Platform.OS ? 150 : 50
        }).start(function () {}));
      }
    },
    onKeyboardWillShow: function (e) {
      if (!o.apps.cmdViewDisplay && o.apps.currentNavi === this.props.tab && o.apps.currentRoutes[o.apps.currentNavi].name === this.props.iType) {
        o.apps.myInputFocusMode = "keyboard";
        var t = o.theme.winHeight - (e.endCoordinates ? e.endCoordinates.screenY : e.end.screenY);
        o.theme.isIphoneX && (t -= o.theme.iphoneXDiff), o.apps.emit("keyboardHeightChanged", t), this._listViewHeight = this._maxListViewHeight - t + o.theme.tabHeight, this.isInputMode = !0, o.apps.isKeyboardShow = !0, o.apps.emit("toggleEmo", !1), o.apps.emit("myInputViewMoveTo", this._listViewHeight + o.theme.navHeight - o.apps.heightDiff), o.apps.deselectAllPictures();
        var i = this._listViewHeight - this.state.statusBarDiff - o.apps.heightDiff;
        this.realListViewHeight !== i && (this.realListViewHeight = i, r.Animated.timing(this.state.listViewHeight, {
          toValue: i,
          duration: "ios" === r.Platform.OS ? 150 : 50
        }).start(function () {}));
      }
    },
    onKeyboardWillHide: function (e) {
      if (!o.apps.cmdViewDisplay && o.apps.currentNavi === this.props.tab && o.apps.currentRoutes[o.apps.currentNavi].name === this.props.iType && (o.apps.emit("closeAtSignView"), !o.apps.isEmoShow)) {
        if (!o.apps.myInputTextValue) {
          var t = this.getRealFriendId();
          o.apps.changeChatInputPlaceHolder(t, this.friend.descCategory), delete o.apps.atFriendId;
        }
        this._listViewHeight = this._maxListViewHeight, o.apps.emit("myInputViewMoveToHigh");
        var i = this._listViewHeight - this.state.statusBarDiff - o.apps.heightDiff;
        this.realListViewHeight !== i && (this.realListViewHeight = i, r.Animated.timing(this.state.listViewHeight, {
          toValue: i,
          duration: "ios" === r.Platform.OS ? 150 : 50
        }).start(function () {})), this.editMsgId = null, this.editShareId = null, this.editType = null, this.isInputMode = !1, o.apps.myInputViewRef.changePlaceHolder(), o.apps.deselectAllPictures();
      }
    },
    getDirection: function (e) {
      return o.apps.isIn(e.category, 3, 4) ? e.fromId !== this.myselfId ? "left" : "right" : 1 === e.category || e.fromId !== this.myselfId ? "left" : "right";
    },
    renderConfirm: function (e) {
      var t = this;
      return a["default"].createElement(p, {
        data: e,
        yes: function () {
          o.apps.agreeInviteConfirm(t.fid, e.msgid);
        },
        no: function () {
          o.apps.refuseInviteConfirm(t.fid, e.msgid);
        }
      });
    },
    renderButtonTip: function (e) {
      return a["default"].createElement(r.View, {
        style: {
          overflow: "hidden",
          marginTop: 8,
          flexDirection: "column",
          alignItems: "center",
          paddingHorizontal: o.theme.winWidth / 7,
          marginVertical: 3
        }
      }, a["default"].createElement(r.TouchableOpacity, {
        style: {
          borderColor: o.theme.white,
          borderWidth: o.theme.px1,
          backgroundColor: "rgba(0,0,0,0.2)",
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderRadius: 5
        },
        onPress: function () {}
      }, a["default"].createElement(o.MyTextView, {
        myTextValue: e.text || ".",
        imageFontSize: 14,
        adjustsFontSizeToFit: !0,
        style: {
          fontSize: 14,
          color: o.theme.white,
          paddingTop: 1,
          paddingBottom: 1,
          textAlign: "center"
        }
      })));
    },
    renderTip: function (e) {
      var t = e.text || ".";
      if (t.startsWith("STAR:")) {
        var i = t.split(":")[1];
        t = e.fromId === o.apps.userid ? (0, o.tr)("Successfully sent ## stars", i) : (0, o.tr)("Received ## stars", i);
      }
      var s = /^!!!/.test(t);
      return s && (t = t.slice(3), s = !1), a["default"].createElement(r.View, {
        style: {
          overflow: "hidden",
          flexDirection: "column",
          alignItems: "center",
          paddingHorizontal: o.theme.winWidth / 7,
          marginBottom: 10
        }
      }, a["default"].createElement(r.View, {
        style: [{
          backgroundColor: s ? o.theme.warnTrans6 : "rgba(0,0,0,0.03)",
          paddingHorizontal: 5,
          paddingBottom: 6,
          borderRadius: 5
        }]
      }, a["default"].createElement(o.MyTextView, {
        myTextValue: t,
        imageFontSize: 14,
        adjustsFontSizeToFit: !0,
        style: {
          fontSize: 14,
          color: o.theme.white,
          paddingTop: 1,
          paddingBottom: 1,
          textAlign: "center",
          lineHeight: 20
        }
      })));
    },
    renderBubble: function (e, t) {
      var i = this;
      if (e.fromId !== o.apps.userid) if (o.apps.replyMembers[this.friend.shareId]) {
        var s = o.apps.replyMembers[this.friend.shareId].findIndex(function (t) {
          return t === e.fromId;
        });
        -1 === s && o.apps.replyMembers[this.friend.shareId].push(e.fromId);
      } else o.apps.replyMembers[this.friend.shareId] = [e.fromId];
      var n = function () {
          return o.apps.showCmdBall ? void o.apps.addfTip(e.text) : void ("2:" === i.friend.friendId.slice(0, 2) ? o.apps.getProfileK(e.fromId, "name").then(function (e) {
            o.apps.myInputViewRef.refs.inputView.changeText("@" + e + " "), o.apps.myInputViewComponent.focus();
          })["catch"](function (e) {
            (0, o.tlog)("error", "1.atSignUser", e);
          }) : i.friend.navFromSpace && i.friend.friendId === o.apps.userid && (e.fromId === o.apps.userid ? o.apps.myInputViewComponent.focus() : o.apps.getProfileK(e.fromId, "name").then(function (t) {
            o.apps.atFriendId = e.fromId, o.apps.myInputViewRef.changePlaceHolder("@" + t, o.theme.warnLight1), o.apps.myInputViewComponent.focus();
          })["catch"](function (e) {
            (0, o.tlog)("error", "2.atSignUser", e);
          })));
        },
        p = this.friend.navFromSpace && this.friend.friendId === o.apps.userid;
      return a["default"].createElement(o.ChatBubbleView, {
        style: {
          overflow: "hidden",
          paddingVertical: 5,
          paddingHorizontal: 9
        },
        isGroup: "2:" === this.friend.friendId.slice(0, 2),
        onPress: function () {
          return n();
        },
        direction: p ? "left" : this.getDirection(e),
        userid: e.fromId,
        data: e,
        isCommentMode: p,
        iType: this.props.iType,
        avatarSize: 40,
        route: this.props.route,
        routes: this.props.routes,
        showName: !0,
        showTime: !1,
        rowID: t,
        friendId: this.friend.friendId,
        atime: this.friend.atime || 0,
        friendIdIsStock: o.apps.isIn(e.msgscnt, "1,0", "0,1") && 1 || this.friendIdIsStock || this.friend.isStock,
        isReport: this.friend.isReport,
        isShareFriendStock: this.friend.isShareFriendStock,
        fid: this.fid,
        tab: this.props.tab,
        transTitle: o.apps.isIn(e.msgscnt, "1,0", "0,1") ? !1 : !((e.fromId !== o.apps.userid || this.friend.navFromSpace) && !o.apps.isIn(e.category, 3)),
        onFailedPress: function () {
          return i.onFailedPress(e, !0);
        },
        onAudioPress: function (t) {
          if (t && t.toggle(), e.isnew) {
            var s = o.apps.msgsData[i.fid].findIndex(function (t) {
                return t.msgid === e.msgid;
              }),
              n = babelHelpers["extends"]({}, o.apps.msgsData[i.fid][s], {
                isnew: 0
              });
            o.apps.msgsData[i.fid].splice(s, 1, n), o.apps.emit("rerenderMsgsData_" + i.fid), o.apps.removeMsgNewMark(e.msgid), s = o.apps.unReadNewAudioQueue[i.fid].findIndex(function (t) {
              return t.data.msgid === e.msgid;
            }), o.apps.unReadNewAudioQueue[i.fid].splice(s, 1), delete o.apps.unReadNewAudioMap[i.fid][e.msgid];
          }
        },
        onAvatarLongPress: function () {
          return n();
        },
        onLongPress: function () {
          var t = [];
          o.apps.showCmdBall && o.apps.isIn(e.type, o.apps.CONS_MSG_TYPE_TEXT, o.apps.CONS_MSG_TYPE_WARN, o.apps.CONS_MSG_TYPE_TERM, o.apps.CONS_MSG_TYPE_ILLEGAL) && t.push([(0, o.tr)("Copy"), function () {
            o.apps.emit("closeContextMenu", function () {
              return r.Clipboard.setString(e.text);
            });
          }], [(0, o.tr)("Ccat"), function () {
            o.apps.contextMenuLock || (o.apps.contextMenuLock = !0, o.apps.send("catChats", {
              shareId: e.shareId,
              fromId: e.fromId
            }).then(function () {
              delete o.apps.contextMenuLock, o.apps.emit("closeContextMenu");
            })["catch"](function (e) {
              (0, o.tlog)("error", "catChats", e), delete o.apps.contextMenuLock;
            }));
          }]), t.length > 0 && o.apps.emit("contextMenu", t);
        }
      });
    },
    renderNextPageView: function (e) {
      return e.text ? a["default"].createElement(r.TouchableOpacity, {
        style: {
          overflow: "hidden",
          backgroundColor: "rgba(0,0,0,0.03)",
          paddingHorizontal: 5,
          borderRadius: 5
        },
        onLayout: function (t) {
          return e.onLayout(t);
        },
        onPress: function () {
          return e.onPress(e);
        }
      }, a["default"].createElement(o.MyTextView, {
        myTextValue: (0, o.tr)(e.text),
        imageFontSize: 14,
        adjustsFontSizeToFit: !0,
        style: {
          fontSize: 14,
          color: o.theme.white,
          paddingTop: 1,
          paddingBottom: 1,
          textAlign: "center"
        }
      })) : a["default"].createElement(r.View, {
        style: {
          overflow: "hidden",
          height: 10
        }
      });
    },
    renderRow: function (e, t, i) {
      var self = this,
        content = function (e, t, i) {
          try {
            return o.apps.showCmdBall || e.msgscnt !== o.apps.CONS_MSGSCNT_TERM && e.type !== o.apps.CONS_MSG_TYPE_TERM || e.fromId === o.apps.userid ? e.type === o.apps.CONS_MSG_TYPE_NEXTPAGE ? this.renderNextPageView(e) : e.type === o.apps.CONS_MSG_TYPE_TIP ? this.renderTip(e) : e.type === o.apps.CONS_MSG_TYPE_TIP_BUTTON ? this.renderButtonTip(e) : e.type === o.apps.CONS_MSG_TYPE_CONFIRM ? this.renderConfirm(e) : e.type !== o.apps.CONS_MSG_TYPE_NULL || this.friendIdIsStock ? this.renderBubble(e, i) : a["default"].createElement(r.View, null) : a["default"].createElement(r.View, null);
          } catch (s) {
            return (0, o.tlog)("error", "InteractView renderRow", e, s), o.apps.send("clientFatalLog", {
              msg: s.message,
              stack: s.stack
            })["catch"](function (e) {
              (0, o.tlog)("error", "InteractView renderRow clientFatalLog", e);
            }), a["default"].createElement(r.View, null);
          }
        }.call(this, e, t, i);
      return a["default"].createElement(r.View, {
        style: this.recoveryLocatedMessage === e.msgid ? {
          backgroundColor: "rgba(255,215,0,0.2)"
        } : null,
        onLayout: function (event) {
          if (self.recoveryLocatedMessage === e.msgid && self.refs.listView) {
            var y = event.nativeEvent.layout.y;
            setTimeout(function () {
              if (self.refs.listView) self.refs.listView.scrollTo({
                y: Math.max(0, y - 80),
                animated: false
              });
            }, 80);
          }
        }
      }, content);
    },
    isChatAbusing: function (e) {
      for (var t = 0; t < e.length; t++) {
        var i = e[t];
        if (i) {
          if (i.fromId === o.apps.userid && i.type !== o.apps.CONS_MSG_TYPE_TIP) return !1;
          if (i.type === o.apps.CONS_MSG_TYPE_WARN) return !0;
        }
      }
    },
    renderNextButton: function () {
      return o.apps.bottleResponseMap.cnt && this.friend.userid && this.friend.userid.slice(0, 2) === o.apps.CONS_BOTTLE_RES_PREFIX ? a["default"].createElement(r.View, {
        style: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 5
        }
      }, a["default"].createElement(r.TouchableOpacity, {
        onPress: function () {
          o.apps.myInputTextValue ? o.apps.diag({
            header: (0, o.tr)("Tip"),
            content: (0, o.tr)("\u8f93\u5165\u6846\u91cc\u8fd8\u6709\u6587\u5b57\u5185\u5bb9\u672a\u53d1\u9001\uff0c\u786e\u5b9a\u8981\u770b\u4e0b\u4e00\u6761\uff1f"),
            buttons: [{
              text: (0, o.tr)("Cancel"),
              onPress: function () {
                return o.apps.closeDiag();
              }
            }, {
              text: (0, o.tr)("Next Session"),
              onPress: function () {
                o.apps.closeDiag(function () {
                  o.apps.navToBottleRes(function () {
                    return r.Navigator.SceneConfigs.VerticalUpSwipeJump;
                  }, function () {
                    return o.apps.curNavigator.navi.navPopAtIndex(-2);
                  });
                });
              }
            }]
          }) : o.apps.navToBottleRes(function () {
            return r.Navigator.SceneConfigs.VerticalUpSwipeJump;
          }, function () {
            return o.apps.curNavigator.navi.navPopAtIndex(-2);
          });
        },
        style: [{
          flexDirection: "row",
          paddingVertical: 5,
          paddingHorizontal: 15,
          borderRadius: 15,
          backgroundColor: o.theme.deepGreen2Trans4
        }]
      }, a["default"].createElement(r.Text, {
        style: {
          fontSize: 13,
          fontWeight: "bold",
          color: o.theme.white,
          paddingBottom: 1
        }
      }, (0, o.tr)("Next Session") + (o.apps.showCmdBall ? "" + o.apps.bottleResponseMap.cnt : "")))) : null;
    },
    reportTipButton: function (e) {
      return a["default"].createElement(r.TouchableOpacity, {
        onPress: function () {
          o.apps.emit("toggleEmo", !1), (0, o.dismissKeyboard)();
        },
        style: {
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: o.theme.transparent
        }
      }, a["default"].createElement(r.TouchableOpacity, {
        style: ["ios" === r.Platform.OS ? {
          shadowColor: "#fff",
          shadowOffset: {
            width: 0,
            height: 0
          },
          shadowOpacity: .7,
          shadowRadius: 5
        } : {}, {
          backgroundColor: o.theme.lightLessTrans4,
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 15
        }],
        onPress: function () {
          return e.onPress && e.onPress();
        }
      }, a["default"].createElement(o.MyTextView, {
        myTextValue: e.text,
        imageFontSize: 11,
        adjustsFontSizeToFit: !0,
        style: {
          fontSize: 14,
          color: o.theme.lighte,
          paddingVertical: 1,
          textAlign: "center"
        }
      })));
    },
    renderCheatAlert: function () {
      var e = this;
      if (this.friend.userid && this.friend.userid.slice(0, 2) === o.apps.CONS_BOTTLE_RES_PREFIX) return null;
      var t = o.apps.msgsData[this.fid];
      o.apps.findLastMsg(t);
      return o.apps.isInBottleMsg ? null : this.friend.friendId.length > 5 && t && this.isChatAbusing(t) ? o.apps.viewTip({
        text: (0, o.tr)("\u5bf9\u65b9\u53d1\u9001\u7684\u6d88\u606f\u4e2d\u662f\u5426\u5305\u542b\u8fdd\u89c4\u5185\u5bb9\uff1f"),
        btn: [{
          text: (0, o.tr)("Yes"),
          textColor: o.theme.lighte,
          color: o.theme.warnTrans6,
          onPress: function () {
            return o.apps.flagReport(e.getRealFriendId());
          }
        }, {
          text: (0, o.tr)("No"),
          textColor: o.theme.lighte,
          color: o.theme.deepGreen2Trans4,
          onPress: function () {
            return o.apps.clearAbuseMsg(e.fid);
          }
        }]
      }) : !o.apps.isTempUserid() && !this.oldEnough && this.friend.friendId !== o.apps.userid && this.friend.friendId.length > 5 && t && t.length > 0 && this.notOldEnough(t[0]) ? 2 === o.apps.gender ? o.apps.viewTip({
        fontSize: 13,
        text: (0, o.tr)("\u9632\u9a97\u63d0\u9192\uff1a\u8981\u4f60\u52a0\u5176\u4ed6\u8054\u7cfb\u65b9\u5f0f\u5e76\u544a\u8bc9\u4f60\u6709\u67d0\u79cd\u8d5a\u94b1\u8def\u5b50\u7684\u4e00\u5b9a\u662f\u9a97\u5b50\uff01")
      }) : o.apps.viewTip({
        fontSize: 13,
        text: (0, o.tr)("\u9632\u9a97\u63d0\u9192\uff1a\u8981\u4f60\u52a0\u5176\u4ed6\u8054\u7cfb\u65b9\u5f0f\u8fdb\u884c\u88f8\u804a\u6216\u7ea6\u70ae\u7684\u6781\u6709\u53ef\u80fd\u662f\u9a97\u5b50\uff01")
      }) : null;
    },
    notOldEnough: function (e) {
      var t = e.msgscnt;
      if (e.type === o.apps.CONS_MSG_TYPE_TIP) return !1;
      if (!t || "string" != typeof t) return !0;
      var i = t.split(",");
      return parseInt(i[0], 10) > 300 && parseInt(i[1], 10) > 300 ? (this.oldEnough = !0, !1) : !0;
    },
    renderHeader: function () {
      if (this.recoveryLocatedMessage) return null;
      var e = this;
      try {
        return this.downPageMode ? null : this.bpos > 0 ? a["default"].createElement(r.TouchableOpacity, {
          style: {
            overflow: "hidden",
            backgroundColor: "rgba(0,0,0,0.03)",
            paddingHorizontal: 5,
            borderRadius: 5
          },
          onPress: function () {
            return e.downPage();
          }
        }, a["default"].createElement(o.MyTextView, {
          myTextValue: (0, o.tr)("Down Page"),
          imageFontSize: 14,
          adjustsFontSizeToFit: !0,
          style: {
            fontSize: 14,
            color: o.theme.white,
            paddingTop: 1,
            paddingBottom: 1,
            textAlign: "center"
          }
        })) : this.friend.navFromSpace && this.friend.friendId === o.apps.userid ? o.apps.viewTip({
          text: (0, o.tr)("Repliers cannot see each other"),
          topHeight: 10,
          bottomHeight: 25,
          fontColor: "#ddd",
          fontSize: 12
        }) : !this.oldEnough && this.friend.friendId !== o.apps.userid && this.friend.friendId.length > 5 && o.apps.msgsData[this.fid] && o.apps.msgsData[this.fid].length > 0 && this.notOldEnough(o.apps.msgsData[this.fid][0]) ? a["default"].createElement(r.View, {
          style: {
            height: 0
          }
        }) : a["default"].createElement(r.View, {
          style: {
            height: this.shouldInvert ? 10 : 30
          }
        });
      } catch (t) {
        return (0, o.tlog)("error", "InteractView renderHeader", t), o.apps.send("clientFatalLog", {
          msg: t.message,
          stack: t.stack
        })["catch"](function (e) {
          (0, o.tlog)("error", "InteractView renderHeader clientFatalLog", e);
        }), a["default"].createElement(r.View, null);
      }
    },
    renderFooterView: function () {
      if (this.recoveryLocatedMessage) return null;
      var e = this;
      try {
        if (this.state.renderMoreLimit) return null;
        if (this.shouldInvert) return this.isEnd ? a["default"].createElement(r.View, {
          style: {
            height: 10
          }
        }) : 0 === this.pos ? null : a["default"].createElement(r.View, {
          onLayout: function (t) {
            var i = t.nativeEvent.layout;
            e.prevFooterY !== i.y && i.y < e._maxListViewHeight + 100 && e.renderMore("footer"), e.prevFooterY = i.y;
          }
        }, "android" === r.Platform.OS ? a["default"].createElement(r.ProgressBarAndroid, {
          style: {
            height: 25
          },
          styleAttr: "Inverse"
        }) : a["default"].createElement(r.ActivityIndicatorIOS, {
          animating: !0,
          size: "small"
        }));
        var t = 10;
        return a["default"].createElement(r.View, {
          style: {
            height: t
          },
          onLayout: function (i) {
            e.footerY = i.nativeEvent.layout.y + t, e.downPageMode || setTimeout(function () {
              return e.scrollToBottom({
                animated: !0
              });
            }, 300);
          }
        });
      } catch (i) {
        return (0, o.tlog)("error", "InteractView renderFooterView", i), o.apps.send("clientFatalLog", {
          msg: i.message,
          stack: i.stack
        })["catch"](function (e) {
          (0, o.tlog)("error", "InteractView renderFooterView clientFatalLog", e);
        }), a["default"].createElement(r.View, null);
      }
    },
    onScroll: function (e) {
      if (this.recoveryLocatedMessage) return;
      var t = e.nativeEvent.contentOffset;
      this.scrollOffset.y <= 0 && t.y > 0 && this.minimalRender ? (o.apps.noOnScrollRenderMore || this.renderMore("onScroll"), o.apps.noOnScrollRenderMore = !1) : this.scrollOffset.y > 0 && t.y <= 0 && !this.minimalRender && o.apps.emit("refreshMsgsData_" + this.fid), this.scrollOffset = e.nativeEvent.contentOffset, this.prevFooterY && this.scrollOffset.y + this._listViewHeight > this.prevFooterY && o.apps.loadMsgsData(this.friend, this.props.tab, this.fid, this.viewId), this.nextPageLayout && this.scrollOffset.y + this._listViewHeight > this.nextPageLayout.y && this.setState({
        renderMoreLimit: !0
      }), "ios" == r.Platform.OS && (!this.state.removeClippedSubviews && this.scrollOffset.y > 2 * o.theme.winHeight ? this.setState({
        removeClippedSubviews: !0
      }) : this.state.removeClippedSubviews && this.scrollOffset.y < 2 * o.theme.winHeight && this.setState({
        removeClippedSubviews: !1
      }));
    },
    buttonTip: function (e) {
      return a["default"].createElement(r.TouchableOpacity, {
        style: {
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 25,
          width: o.theme.winWidth,
          backgroundColor: o.theme.transparent,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start"
        },
        noOpacictyActive: !0,
        onPress: function () {
          o.apps.emit("toggleEmo", !1), (0, o.dismissKeyboard)();
        }
      }, a["default"].createElement(r.TouchableOpacity, {
        style: {
          backgroundColor: e.backgroundColor || "rgba(0,0,0,0.02)",
          paddingHorizontal: 5,
          borderRadius: 5
        },
        onPress: function () {
          return e.onPress();
        }
      }, a["default"].createElement(o.MyTextView, {
        myTextValue: e.text,
        imageFontSize: 14,
        adjustsFontSizeToFit: !0,
        style: {
          fontSize: 14,
          color: ("dark" === o.theme.type, "#fff"),
          paddingTop: 1,
          paddingBottom: 1,
          textAlign: "center"
        }
      })));
    },
    renderStockBar: function () {
      var e = this;
      if (this.friendIdIsStock) {
        var t = {
          width: 40,
          flexDirection: "row",
          height: 30,
          alignItems: "center",
          justifyContent: "center"
        };
        return o.apps.emit("myInputViewMoveToLow"), a["default"].createElement(r.View, {
          style: {
            flexDirection: "row",
            backgroundColor: o.apps.tipBackgroundColor(),
            alignItems: "center",
            justifyContent: "space-between"
          }
        }, a["default"].createElement(r.TouchableOpacity, {
          style: t,
          onPress: function () {
            return o.apps.refuseStockMsg(e);
          }
        }, a["default"].createElement(o.Ionicons, {
          style: {},
          name: "md-close",
          size: 22,
          color: o.theme.warn
        })), a["default"].createElement(r.TouchableOpacity, {
          style: t,
          onPress: function () {
            return o.apps.stopStockMsg(e);
          }
        }, a["default"].createElement(o.Ionicons, {
          style: {},
          name: "ios-swap-outline",
          size: 20,
          color: o.theme.steelBlue
        })), a["default"].createElement(r.TouchableOpacity, {
          style: t,
          onPress: function () {
            return o.apps.passStockMsg(e);
          }
        }, a["default"].createElement(o.Ionicons, {
          style: {},
          name: "md-checkmark",
          size: 22,
          color: o.theme.deepGreen2
        })));
      }
    },
    renderPrivateMsgTip: function () {},
    render: function () {
      var e = this,
        t = o.apps.hasCustomBg && o.apps.blackWhiteMode;
      return a["default"].createElement(r.View, {
        style: {
          flex: 1,
          backgroundColor: o.theme.lightLess
        }
      }, a["default"].createElement(r.View, {
        style: {
          height: o.theme.navHeight
        }
      }), a["default"].createElement(o.BackgroundImageView, {
        shouldRender: !0,
        userid: o.apps.userid,
        maskColor: t ? o.theme.chatBgMaskColorTrans : o.theme.chatBgMaskColor
      }), this.state.interActionFinished ? a["default"].createElement(r.View, {
        style: {
          flexDirection: "column",
          width: r.Dimensions.get("window").width,
          flex: 1,
          backgroundColor: o.theme.transparent,
          height: this._maxListViewHeight - this.state.statusBarDiff
        }
      }, a["default"].createElement(r.Animated.View, {
        style: {
          height: this.state.listViewHeight,
          backgroundColor: t ? o.theme.transparent : o.theme.interactViewBg
        }
      }, this.state.showList ? a["default"].createElement(r.ListView, {
        ref: "listView",
        initialListSize: this.recoveryLocatedMessage ? 100 : 20,
        pageSize: 20,
        removeClippedSubviews: "ios" == r.Platform.OS ? this.state.removeClippedSubviews : !0,
        scrollRenderAheadDistance: 1e3,
        dataSource: this.state.dataSource,
        onEndReached: this.onEndReached,
        onEndReachedThreshold: this.state.onEndReachedThreshold,
        renderHeader: this.renderHeader,
        renderFooter: this.renderFooterView,
        enableEmptySections: !0,
        renderRow: this.renderRow,
        onScroll: this.onScroll,
        scrollsToTop: !1,
        onResponderRelease: this.myScrollResponderHandleResponderRelease,
        onStartShouldSetResponderCapture: this.myScrollResponderHandleStartShouldSetResponderCapture,
        renderScrollComponent: function (t) {
          return a["default"].createElement(o.InvertibleScrollView, babelHelpers["extends"]({}, t, {
            inverted: e.shouldInvert
          }));
        }
      }) : null, this.friend.navFromSpace || "2:" === this.friend.friendId.slice(0, 2) ? a["default"].createElement(c, {
        friend: this.friend
      }) : null, this.renderNextButton(), this.renderCheatAlert(), this.friend.isReport || this.friendIdIsStock ? null : a["default"].createElement(h, {
        ctx: this
      }), a["default"].createElement(l, {
        friendId: this.getRealFriendId()
      }), "1" === this.friend.friendId ? a["default"].createElement(d, {
        ctx: this
      }) : null, this.renderStockBar(), null, this.state.renderStare ? a["default"].createElement(r.TouchableOpacity, {
        onPress: function () {
          o.apps.diag({
            header: (0, o.tr)("Add New Friend"),
            content: (0, o.tr)("Add friend or not?"),
            buttons: [{
              text: (0, o.tr)("Cancel"),
              onPress: function () {
                return o.apps.closeDiag();
              }
            }, {
              text: (0, o.tr)("Ok"),
              onPress: function (t) {
                t.isProgressing || (t.progressing(!0), o.apps.addFriend2(e.getRealFriendId()).then(function () {
                  return o.apps.closeDiag();
                })["catch"](function (e) {
                  (0, o.tlog)("error", "renderStare addFriend2", e), t.progressing(!1), t.setState({
                    infoTip: (0, o.tr)("Connection Failed")
                  });
                }));
              }
            }]
          });
        },
        style: ["ios" === r.Platform.OS ? {
          shadowColor: "#fff",
          shadowOffset: {
            width: 0,
            height: 0
          },
          shadowOpacity: .7,
          shadowRadius: 5
        } : {}, {
          position: "absolute",
          right: 0,
          top: 100,
          width: 60,
          height: 36,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: o.theme.warnTrans6,
          borderTopLeftRadius: 18,
          borderBottomLeftRadius: 18
        }]
      }, a["default"].createElement(r.Text, {
        style: {
          fontSize: 16,
          color: o.theme.white,
          marginLeft: 5
        }
      }, (0, o.tr)("Friend"))) : null, this.friend.friendId.length > 5 && !o.apps.isInBottleMsg ? a["default"].createElement(r.TouchableOpacity, {
        onPress: function () {
          o.apps.diag({
            header: (0, o.tr)("Harass Alert"),
            content: (0, o.tr)("Approve or not?"),
            buttons: [{
              text: (0, o.tr)("Confirm no harass"),
              onPress: function () {
                return o.apps.closeDiag(function () {
                  return o.apps.approvePeople(e.getRealFriendId());
                });
              }
            }, {
              text: (0, o.tr)("Confirm later"),
              onPress: function () {
                return o.apps.closeDiag();
              }
            }]
          });
        },
        style: ["ios" === r.Platform.OS ? {
          shadowColor: "#fff",
          shadowOffset: {
            width: 0,
            height: 0
          },
          shadowOpacity: .7,
          shadowRadius: 5
        } : {}, {
          position: "absolute",
          right: 0,
          top: 50,
          width: 60,
          height: 36,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: this.state.renderApprove ? o.theme.deepGreen2Trans6 : o.theme.lightLessTrans4,
          borderTopLeftRadius: 18,
          borderBottomLeftRadius: 18
        }]
      }, a["default"].createElement(r.Text, {
        style: {
          fontSize: 16,
          color: o.theme.white,
          marginLeft: 5
        }
      }, (0, o.tr)("Approve"))) : null)) : o.apps.isLocking("navIsTrans") ? null : a["default"].createElement(o.InterActionSpinner, {
        upoff: 30,
        shouldSpin: !0
      }), null, this.recoveryLocatedMessage ? a["default"].createElement(r.TouchableOpacity, {
        onPress: this.recoveryReturnLatest,
        style: {
          position: "absolute",
          top: o.theme.navHeight + 4,
          left: (o.theme.winWidth - 140) / 2,
          width: 140,
          height: 32,
          backgroundColor: o.theme.deepGreen2,
          borderRadius: 6,
          justifyContent: "center",
          alignItems: "center"
        }
      }, a["default"].createElement(r.Text, {
        style: {
          color: "#fff",
          fontSize: 13
        }
      }, "返回最新消息")) : null);
    },
    recoveryLocate: function (message, loadedRows) {
      var self = this, identity = o.apps.userid;
      var request = this.recoveryLocateRequest = (this.recoveryLocateRequest || 0) + 1;
      var context = Array.isArray(loadedRows) ? Promise.resolve(loadedRows) : o.apps.recoveryChatContext(this.getRealFriendId(), message);
      return context.then(function (messages) {
        if (self.recoveryUnmounted || identity !== o.apps.userid || request !== self.recoveryLocateRequest) return;
        if (!self.fid || !messages.some(function (item) {
          return item.msgid === message.msgid;
        })) throw new Error("该记录已不在本机聊天数据中");
        self.recoveryLocatedRows = messages;
        self.recoveryLocatedMessage = message.msgid;
        self.shouldInvert = false;
        self.downPageMode = true;
        self.bpos = 0;
        self.pos = messages.length;
        self.renderMoreLimit = true;
        var ascending = messages.slice().reverse();
        self.setState({
          showList: true,
          interActionFinished: true,
          dataSource: self.state.dataSource.cloneWithRows(ascending)
        });
      });
    },
    recoveryReturnLatest: function () {
      var self = this;
      if (this.recoveryUnmounted || this.myselfId !== o.apps.userid) return;
      this.recoveryLocateRequest = (this.recoveryLocateRequest || 0) + 1;
      this.recoveryLocatedRows = null;
      this.recoveryLocatedMessage = null;
      this.shouldInvert = true;
      this.downPageMode = false;
      this.renderMoreLimit = false;
      this.bpos = this.pos = this.nextpos = 0;
      this.bposes = [];
      this.posHist = [0];
      this.isEnd = !!(o.apps.msgsLoadPos[this.fid] && o.apps.msgsLoadPos[this.fid].isEnd);
      // Remount just the list to apply its normal inverted direction. Keep the
      // current route and live message buffer, including arrivals during search.
      this.setState({showList: false, renderMoreLimit: false, dataSource: this.state.dataSource.cloneWithRows([])}, function () {
        if (self.recoveryUnmounted) return;
        self.setState({showList: true}, function () {
          if (o.apps.msgsData[self.fid]) self.renderMore("recoveryReturnLatest", function () { self.scrollToBottom({animated: false}); });
          else o.apps.loadMsgsData(self.friend, self.props.tab, self.fid, self.viewId);
        });
      });
    }
  });
});
