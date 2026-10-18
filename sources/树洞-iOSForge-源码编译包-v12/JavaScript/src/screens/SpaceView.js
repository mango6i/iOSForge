// Recovered module 360; analysis path, not original filename.
// Original SHA-256 463cefd7b024d31155fe1463fedc19f09dbbca127799ae151ff56416b1862c7c; original byte range [1746938, 1799305).
__d(360, function (e, t, s, a) {
  "use strict";

  var i = t(311),
    r = babelHelpers.interopRequireDefault(i),
    n = t(312),
    o = t(314);
  a.SpaceView = r["default"].createClass({
    displayName: "SpaceView",
    mixins: [o.ScrollResponder.Mixin],
    myScrollResponderHandleStartShouldSetResponderCapture: function (e, t, s, a) {
      return o.apps.modelImageViewRef[o.apps.curMseq] && o.apps.modelImageViewRef[o.apps.curMseq].state.display && o.apps.emit("resetScalable"), o.apps.isEmoShow ? !0 : this.scrollResponderHandleStartShouldSetResponderCapture(t);
    },
    myScrollResponderHandleResponderRelease: function (e) {
      this.scrollResponderHandleResponderRelease(e), o.apps.isEmoShow && o.apps.emit("toggleEmo", !1);
    },
    forceCleanSharesDataBuffer: function () {
      delete o.apps.sharesData[this.friendId], delete o.apps.sharesLoadPos[this.friendId], delete o.apps.prevShareloadTime[this.friendId];
    },
    memberInit: function () {
      this.fromId = this.props.fromId, this.toId = this.props.toId, this.friendId = this.props.friendId, this.friendType = this.props.friendType, this._listViewHeight = o.theme.winHeight - o.theme.navHeight - o.theme.statusHeightAll, this.realListViewHeight = this._listViewHeight, this._maxListViewHeight = this._listViewHeight, this.scrollOffset = {
        x: 0,
        y: 0
      }, this.dataChangeShouldRenderMore = !1, this.pos = 0, this.posHist = [0], this.rowLayout = {}, this.chatBubbleLayout = {}, this.appendButtonPressed = !1, this.insertModeOn = !1, this.isInputMode = !1, this.inputLoadThreshold = Math.floor(o.theme.winHeight / 6 * 5), this.firstLoadThreshold = 3 * o.theme.winHeight, this.otherLoadThreshold = 2 * o.theme.winHeight, this.fullDisplayRows = [], this.firstRendered = !1, this.firstRenderPos = 0, this.animDelayCallbacks = [], this.recoverY = null, this.minimalRender = !1, this.unReadLength = 0, this.interactFinished = !1, this.interactCallbacks = [], this.headerHeight = 8, this.viewId = o.util.genViewId(), this.interActionFinished = !1, this.isEnd = !1, this.shouldShowFoldButton = !1, this.chatBubbleRefs = {}, this.fullDisplayShares = {}, this.lastShowFullScrollOffset = {}, o.apps.isOb && ("4:" === this.friendId.slice(0, 2) && (this.isReport = !0), ":" === this.friendId[1] && o.apps.notIn(this.friendId[0], "2", "8") && (this.isObMode = !0));
    },
    getInitialState: function () {
      return this.memberInit(), {
        dataSource: new n.ListView.DataSource({
          rowHasChanged: function (e, t) {
            var s = e !== t || e.time !== t.time || e.fullDisplay !== t.fullDisplay || e.partRender !== t.partRender;
            return s;
          }
        }),
        listViewHeight: new n.Animated.Value(this._listViewHeight),
        emoViewHeight: 150,
        interActionFinished: !1,
        onEndReachedThreshold: 10,
        statusBarDiff: o.apps.statusBarDiff,
        removeClippedSubviews: !1,
        noPickupButton: !1,
        isFolded: !1,
        showList: !0
      };
    },
    rowIsOnEditChanged: function (e) {
      o.apps.editMsgHasNotChanged ? e() : o.apps.clearInputPanel(function () {
        return e();
      });
    },
    clearEditState: function () {
      o.apps.openWebbrowserInEditMode ? delete o.apps.openWebbrowserInEditMode : (this.editShare = null, this.editMsg = null, this.editType = null, this.appendButtonPressed = !1, this.insertModeOn = !1, this.isInputMode = !1, o.apps.myInputViewRef.changePlaceHolder((0, o.tr)("What's your story?")));
    },
    scrollToTop: function () {
      var e = this;
      0 !== this.scrollOffset.y && requestAnimationFrame(function () {
        e.refs.listView && e.refs.listView.scrollTo({
          y: 0,
          animated: !1
        }), e.refs.listView && e.refs.listView.scrollTo({
          y: 0,
          animated: !1
        }), requestAnimationFrame(function () {
          return o.apps.emit("refreshSharesData_" + e.friendId, !0);
        });
      });
    },
    mySpaceScrollToTop: function () {
      this.scrollToTop();
    },
    likeButtonPressed: function (e, t, s) {
      if (t) {
        var a = o.apps.getNewMsgId(),
          i = o.apps.splitShareId(a).time;
        o.apps.sendSharePraise({
          msgid: a,
          time: i,
          shareId: e.shareId,
          fromId: o.apps.userid,
          toId: e.fromId,
          shareFrom: e.fromId,
          type: 6,
          category: 2,
          friendId: this.friendId,
          text: "\u2764\ufe0f",
          ftype: this.friendType > 3 ? 1 : this.friendType,
          firstReply: 0 === e.commentNum ? 1 : 0,
          atime: e.atime,
          tapn: e.tapn
        }).then(function () {
          s(a, i);
        })["catch"](function (e) {
          (0, o.tlog)("error", "likeButtonPressed", e);
        });
      } else a = e.praiseMsgid, i = o.apps.splitShareId(a).time, o.apps.deleteSharePraise({
        msgid: a,
        time: i,
        shareId: e.shareId,
        fromId: o.apps.userid,
        toId: e.fromId,
        category: 2,
        friendId: this.friendId,
        ftype: this.friendType > 3 ? 1 : this.friendType,
        type: 6,
        shareFrom: e.fromId,
        firstReply: 0 === e.commentNum ? 1 : 0,
        seqi: 0
      }).then(function () {
        s && s();
      })["catch"](function (t) {
        (0, o.tlog)("error", "likeButtonPressed", e, t);
      });
    },
    onInputSend: function (e, t, s) {
      var a = o.apps.currentRoutes[o.apps.currentNavi];
      if (o.apps.currentNavi === this.props.tab && /space_/.test(a.name) && a.userid === this.friendId && (t || o.apps.selectedImageUris.length)) {
        e === o.apps.CONS_MSG_TYPE_GIF && o.apps.deselectAllPictures();
        var i = o.apps.selectedImageUris.length > 0 ? 1 : 0,
          r = o.apps.selectedImageUris.slice();
        t && (i += 1);
        var n = o.apps.getNewShareId();
        this.scrollToTop(), o.apps.closeInputPanel(!0);
        var d = {
            fromId: o.apps.userid,
            toId: this.friendId,
            shareFrom: o.apps.userid,
            target: ["me"],
            type: e,
            data: t,
            shareId: n,
            msgid: o.apps.getNewMsgId(),
            ftype: this.friendType,
            sseqi: 0,
            mseqi: 0
          },
          p = function (e, t) {
            t.nobottle ? (o.apps.tip((0, o.tr)("The account has been forbidden.")), o.dbs.deleteShare(e)["catch"]((0, o.errCb)("nobottle delete share"))) : (i -= 1, 0 === i && (o.apps.changeDispatch(e), delete o.apps.tmpSendingShareMap[e.shareId]));
          },
          h = function (e) {
            o.apps.inputSend(r, !1, function (t, s, a) {
              o.apps.sendShareMsg(e, babelHelpers["extends"]({}, d, {
                msgid: o.apps.getNewMsgId(),
                type: t,
                data: s
              }), function () {}, p);
            });
          };
        t ? o.apps.sendShareMsg("newShare", d, function () {
          r.length > 0 && h("append");
        }, p)["catch"](function (e) {
          (0, o.tlog)("error", "spaceView onInputSend", e);
        }) : h("newShare");
      }
    },
    onFailedPress: function (e, t) {
      var s = {
        shareId: e.shareId,
        msgid: t.msgid,
        fromId: e.fromId,
        toId: e.toId,
        shareFrom: e.fromId,
        type: t.type,
        ftype: t.ftype,
        seqi: t.seqi,
        data: t.data,
        target: e.target
      };
      t.resendCnt ? s.resendCnt = t.resendCnt + 1 : s.resendCnt = 1, o.apps.sendShareMsg("resend", s, function () {}, function () {
        for (var t = !0, s = e.msgs, a = 0; a < s.length; a++) 2 !== s[a].stat && (t = !1);
        t && (o.apps.changeDispatch(e), delete o.apps.tmpSendingShareMap[e.shareId]);
      })["catch"]((0, o.errCb)("SpaceView onFailedPress 2"));
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
      o.apps.shouldChangeSpaceViewHeaderHeight = !0, o.apps.sharesData[this.friendId] && (o.apps.shouldShowFoldButton[this.friendId] && (delete o.apps.shouldShowFoldButton[this.friendId], this.shouldShowFoldButton = !0), e || (e = 0), this.pos += e, this.setState({
        dataSource: this.state.dataSource.cloneWithRows(o.apps.filterRepeat(o.apps.sharesData[this.friendId].slice(0, this.pos), "shareId"))
      }));
    },
    traverseShareMsgs: function (e, t) {
      var s = 1,
        a = 0,
        i = !1;
      if (!e.msgs) return {
        jn: s,
        shouldBeSquare: i,
        more: a
      };
      for (var r = e.msgs.length, n = (e.msgs, 0), d = 0, p = 0; r > p; p++) {
        var h = e.msgs[p];
        this.checkForNotSended(h), 0 === p ? h.type === o.apps.CONS_MSG_TYPE_EMOTION ? a += 100 : h.type === o.apps.CONS_MSG_TYPE_TEXT && (a += 40) : d = 1, h.imgId && (n = 1);
      }
      return n && (d = 0), n && (a += Math.round(o.theme.squaredImageSize / 5)), d && (a += 15), {
        jn: s,
        shouldBeSquare: i,
        more: a
      };
    },
    checkForSessionFiles: function (e) {
      o.apps.isIn(e.type, o.apps.CONS_MSG_TYPE_VIDEO, o.apps.CONS_MSG_TYPE_IMAGE) && (o.apps.sessionFilesCache && o.apps.sessionFilesCache[this.friendId] ? (o.apps.sessionFileRenderedIndex[this.friendId] += 1, o.apps.fetchSessionFiles(this.friendId, !0)) : (0, o.tlog)("error", "SpaceView sessionFilesCache null", this.friendId, o.apps.sessionFilesCache));
    },
    renderMore: function (e) {
      var t = this,
        s = function () {
          if (t.isStarted) {
            t.interActionFinished || (t.interActionFinished = !0, t.setState({
              interActionFinished: !0
            }));
            var s = o.apps.sharesData[t.friendId];
            if (s) {
              var a = 0,
                i = t.pos,
                r = s.length;
              if (t.pos === r) return void (!t.isEnd && o.apps.sharesLoadPos[t.friendId] && o.apps.sharesLoadPos[t.friendId].isEnd && (t.isEnd = !0, t.setState({
                interActionFinished: !0
              })));
              var n = t.computeThreshold(),
                d = n.onEndReachedThreshold,
                p = n.threshold;
              e: for (var i = t.pos; r > i; i++) {
                a += 50;
                var h = s[i];
                if (h.msgs) {
                  var l = t.traverseShareMsgs(h, i),
                    u = l.jn,
                    c = (l.shouldBeSquare, l.more);
                  a += c, u = h.msgs.length, (u > 1 || o.apps.isIn(h.msgs[0].type, o.apps.CONS_MSG_TYPE_GIF, o.apps.CONS_MSG_TYPE_IMAGE, o.apps.CONS_MSG_TYPE_VIDEO)) && (t.shouldShowFoldButton = !0);
                  for (var f = 0; u > f; f++) {
                    var m = h.msgs[f];
                    if (m.isDeleted) {
                      a += 20;
                      break;
                    }
                    if (m.type === o.apps.CONS_MSG_TYPE_TIP ? a -= 20 : a += m.type === o.apps.CONS_MSG_TYPE_EMOTION ? 105 : m.type === o.apps.CONS_MSG_TYPE_GIF || m.type === o.apps.CONS_MSG_TYPE_IMAGE || m.type === o.apps.CONS_MSG_TYPE_VIDEO ? 5 + o.apps.getImageSize(m.width, m.height, !0).height : 40, a > p) break e;
                  }
                }
              }
              r - 1 > i ? t.pos = i + 1 : t.pos = r, t.setState({
                dataSource: t.state.dataSource.cloneWithRows(o.apps.filterRepeat(s.slice(0, t.pos), "shareId")),
                onEndReachedThreshold: d,
                interActionFinished: !0
              }, function () {
                e && e();
              });
            }
          }
        };
      s();
    },
    checkForNotSended: function (e) {
      if (1 === e.stat) {
        var t = e.showtime || e.time;
        o.apps.now() - t > 864e5 && !e.timeoutFlagChecked && (e.timeoutFlag = !0);
      }
    },
    sharesDataChanged: function () {
      var e = this;
      o.apps.friendIdRecords[this.friendId] = !0, this.shareDataChanged = !0, this.interactFinished ? this.renderMore() : this.interactCallbacks.push(function () {
        return e.renderMore();
      });
    },
    refreshSharesData: function (e) {
      this.pos = 0, this.posHist = [0];
      for (var t = 0; 100 > t; t++) {
        var s = o.apps.sharesData[this.friendId][t];
        if (!s) break;
        o.apps.sharesData[this.friendId][t] = babelHelpers["extends"]({}, s);
      }
      this.renderMore();
    },
    forceRerenderAll: function () {
      this.setState({});
    },
    rerenderSharesData: function (e) {
      this.rerender(e);
    },
    renderBlankSharesData: function () {
      this.setState({
        dataSource: this.state.dataSource.cloneWithRows([])
      });
    },
    componentWillMount: function () {
      this.forceCleanSharesDataBuffer(), o.apps.spaceNaviCachedImages[this.friendId] = [], o.apps.sessionFilesCache[this.friendId] = [], o.apps.sessionFileRenderedIndex[this.friendId] = 0, o.apps.on("clearSpaceEditMode", this.clearEditState), o.apps.on("rowIsOnEditChanged", this.rowIsOnEditChanged), "3:" === this.friendId.slice(0, 2) && o.apps.on("storyCntChanged", this.storyCntChanged), o.apps.on("sharesDataChanged_" + this.friendId, this.sharesDataChanged), o.apps.on("refreshSharesData_" + this.friendId, this.refreshSharesData), o.apps.on("forceRerenderAll_" + this.friendId, this.forceRerenderAll), o.apps.on("rerenderSharesData_" + this.friendId, this.rerenderSharesData), o.apps.on("renderBlankSharesData_" + this.friendId, this.renderBlankSharesData), o.apps.on("toggleEmo", this.onToggleEmo), o.apps.on("inputSend", this.onInputSend), o.apps.on("textInputHeightChanged", this.onTextInputHeightChanged), o.apps.on("appStateChangeToActive", this.onAppStateChangeToActive), o.apps.on("loadSharesDataFailed_" + this.friendId, function () {}), o.apps.on("spaceViewDidFocus_" + this.friendId, this.start), o.apps.sharesData[this.friendId] || o.apps.loadSharesData(o.apps.userid, this.friendId, this.viewId), o.apps.on("navToChat", this.navToChat);
    },
    onShowShareAndMsgIdToggled: function () {
      var e = this;
      if (o.apps.sharesData[this.friendId]) {
        var t = o.apps.sharesData[this.friendId].slice(0, this.pos).map(function (e) {
            return babelHelpers["extends"]({}, e);
          }),
          s = o.apps.sharesData[this.friendId].slice(this.pos);
        o.apps.sharesData[this.friendId] = t.concat(s), this.setState({
          dataSource: this.state.dataSource.cloneWithRows(t)
        }, function () {
          e.setState({
            dataSource: e.state.dataSource.cloneWithRows([].concat(babelHelpers.toConsumableArray(t)))
          });
        });
      }
    },
    onStatusBarDiffChanged: function (e) {
      if (this.state.statusBarDiff !== e) {
        this.setState({
          statusBarDiff: e
        });
        var t = this._listViewHeight - e;
        this.realListViewHeight !== t && (this.realListViewHeight = t, n.Animated.timing(this.state.listViewHeight, {
          toValue: t,
          duration: "ios" === n.Platform.OS ? 250 : 50
        }).start());
      }
    },
    componentDidMount: function () {
      if ("friends" === this.props.tab ? o.apps.on("friendsTabSwitched", this.onTabSwitched) : "mySpace" === this.props.tab && (o.apps.on("mySpaceTabSwitched", this.onTabSwitched), o.apps.on("mySpaceScrollToTop", this.mySpaceScrollToTop)), o.apps.on("keyboardShow", this.onKeyboardWillShow), o.apps.on("keyboardHide", this.onKeyboardWillHide), o.apps.on("relationShipChanged_" + this.friendId, this.relationShipChanged), o.apps.on("showShareAndMsgIdToggled", this.onShowShareAndMsgIdToggled), this.state.statusBarDiff) {
        var e = this._listViewHeight - this.state.statusBarDiff;
        this.realListViewHeight !== e && (this.realListViewHeight = e, n.Animated.timing(this.state.listViewHeight, {
          toValue: e,
          duration: "ios" === n.Platform.OS ? 250 : 50
        }).start());
      }
      o.apps.on("statusBarDiffChanged", this.onStatusBarDiffChanged);
    },
    start: function () {
      var e = this;
      this.isStarted || (requestAnimationFrame(function () {
        e.interactFinished = !0, e.interactCallbacks.length > 0 ? e.interactCallbacks.forEach(function (e) {
          return e();
        }) : o.apps.sharesData[e.friendId] ? (o.apps.sharesLoadPos[e.friendId] || (o.apps.sharesLoadPos[e.friendId] = {
          isEnd: !1
        }), e.renderMore()) : setTimeout(function () {
          e.shareDataChanged || e.setState({});
        }, 300);
      }), this.isStarted = !0);
    },
    componentWillUnmount: function () {
      this.isStarted = !1, delete o.apps.sessionFilesCache[this.friendId], delete o.apps.sessionFilesCacheEnded[this.friendId], delete o.apps.sessionFileRenderedIndex[this.friendId], this.forceCleanSharesDataBuffer(), o.apps.unon("relationShipChanged_" + this.friendId, this.relationShipChanged), delete o.apps.spaceNaviCachedImages[this.friendId], delete o.apps.unReadNewAudioQueue[this.friendId], delete o.apps.unReadNewAudioMap[this.friendId], o.apps.unon("refreshSharesData_" + this.friendId, this.refreshSharesData), o.apps.unon("rerenderSharesData_" + this.friendId, this.rerenderSharesData), o.apps.unon("forceRerenderAll_" + this.friendId, this.forceRerenderAll), o.apps.unon("renderBlankSharesData_" + this.friendId, this.renderBlankSharesData), o.apps.unon("sharesDataChanged_" + this.friendId, this.sharesDataChanged), o.apps.unon("keyboardShow", this.onKeyboardWillShow), o.apps.unon("keyboardHide", this.onKeyboardWillHide), o.apps.unon("textInputHeightChanged", this.onTextInputHeightChanged), o.apps.unon("toggleEmo", this.onToggleEmo), o.apps.unon("navToChat", this.navToChat), o.apps.unon("clearSpaceEditMode", this.clearEditState), o.apps.unon("rowIsOnEditChanged", this.rowIsOnEditChanged), o.apps.unon("inputSend", this.onInputSend), o.apps.unon("loadSharesDataFailed_" + this.friendId), o.apps.unon("showShareAndMsgIdToggled", this.onShowShareAndMsgIdToggled), o.apps.unon("spaceViewDidFocus_" + this.friendId, this.start), o.apps.unon("statusBarDiffChanged", this.onStatusBarDiffChanged), "3:" === this.friendId.slice(0, 2) && o.apps.unon("storyCntChanged", this.storyCntChanged), "friends" === this.props.tab ? o.apps.unon("friendsTabSwitched", this.onTabSwitched) : "mySpace" === this.props.tab && (o.apps.unon("mySpaceTabSwitched", this.onTabSwitched), o.apps.unon("mySpaceScrollToTop", this.mySpaceScrollToTop)), o.apps.unon("appStateChangeToActive", this.onAppStateChangeToActive);
    },
    storyCntChanged: function () {},
    onToggleEmo: function (e, t) {
      o.apps.currentNavi === this.props.tab && o.apps.currentRoutes[o.apps.currentNavi].name === this.props.spaceName && this.toggleEmoHandle(e, t);
    },
    onAppStateChangeToActive: function () {},
    onTabSwitched: function () {},
    onTextInputHeightChanged: function (e, t, s) {
      if (o.apps.currentNavi === this.props.tab && /^space_/.test(o.apps.currentRoutes[o.apps.currentNavi].name)) {
        o.apps.heightDiff = e;
        var a = this._listViewHeight - e - this.state.statusBarDiff;
        o.apps.emit("myInputViewMoveTo", a + o.theme.navHeight + this.state.statusBarDiff, t), this.realListViewHeight !== a && (this.realListViewHeight = a, n.Animated.timing(this.state.listViewHeight, {
          toValue: a,
          duration: "ios" === n.Platform.OS ? 250 : 50
        }).start(function () {
          s && s();
        }));
      }
    },
    onEndReached: function () {
      this.isInputMode || o.apps.sharesData[this.friendId] && o.apps.sharesLoadPos[this.friendId] && (!o.apps.sharesLoadPos[this.friendId].isEnd && this.pos + o.apps.fetchLimit > o.apps.sharesData[this.friendId].length ? -1 === o.apps.loadSharesData(o.apps.userid, this.friendId, this.viewId) && this.renderMore() : this.renderMore());
    },
    toggleEmoHandle: function (e, t) {
      var s = this;
      if (!o.apps.isKeyboardShow) {
        var a = function () {
          if (s.appendButtonPressed) {
            var t = s.rowLayout[s.editShare.shareId];
            if (!t) return void (0, o.tlog)("error", "toggleEmoHandle scrollRowLayout null", s.rowLayout, s.editShare.shareId);
            var a = t.height + t.y - s._listViewHeight - 5;
            a > 0 && requestAnimationFrame(function () {
              null === s.recoverY && (s.recoverY = s.scrollOffset.y), s.refs.listView && s.refs.listView.scrollTo({
                y: a
              });
            });
          } else if (s.insertModeOn) {
            var i = s.chatBubbleLayout[s.editMsg.msgid];
            if (t = s.rowLayout[s.editShare.shareId], !i) return;
            if (!t) return;
            a = t.y + i.y + (i.height > 60 ? 60 : i.height) - s._listViewHeight + 2, a > 0 && requestAnimationFrame(function () {
              null === s.recoverY && (s.recoverY = s.scrollOffset.y), s.refs.listView && s.refs.listView.scrollTo({
                y: a
              });
            });
          } else e || null === s.recoverY || o.apps.isEmoShow || requestAnimationFrame(function () {
            s.refs.listView && s.refs.listView.scrollTo({
              y: s.recoverY
            }), s.recoverY = null;
          });
        };
        e ? (this._listViewHeight = this._maxListViewHeight - o.theme.chatTextInputHeight - o.theme.dashboardHeight, this.isInputMode = !0, o.apps.myInputFocusMode = "dashboard", this.setState({
          noPickupButton: !0
        }), o.apps.emit("myInputViewMoveTo", this._listViewHeight + o.theme.navHeight - o.apps.heightDiff)) : (this._listViewHeight = this._maxListViewHeight, this.isInputMode = !1, o.apps.emitOnce("rowIsOnEditFinished"), this.setState({
          noPickupButton: !1
        }), o.apps.editMsgHasNotChanged ? (o.apps.editMsgHasNotChanged = !1, o.apps.myInputViewRef.refs.inputView.clearInput(!0), this.clearEditState(), o.apps.deselectAllPictures()) : t || (delete o.apps.noNeedToJumpToShareSelect, "edit" === this.editType ? o.apps.myInputViewRef.refs.inputView.onSendPress(function () {
          s.clearEditState(), o.apps.deselectAllPictures(), o.apps.myInputViewRef.refs.inputView.clearInput(!0);
        }, function (e) {
          setTimeout(function () {
            return s.shouldJumpToShareSelect(e);
          }, "ios" === n.Platform.OS ? 50 : 250);
        }, a) : (this.clearEditState(), setTimeout(function () {
          return s.shouldJumpToShareSelect();
        }, "ios" === n.Platform.OS ? 50 : 250))), o.apps.emit("myInputViewMoveToLow"));
        var i = this._listViewHeight - this.state.statusBarDiff;
        this.realListViewHeight !== i && (this.realListViewHeight = i, n.Animated.timing(this.state.listViewHeight, {
          toValue: i,
          duration: "ios" === n.Platform.OS ? 150 : 50
        }).start(function () {
          a();
        }));
      }
    },
    onKeyboardWillShow: function (e) {
      var t = this;
      if (o.apps.currentNavi === this.props.tab && /^space_/.test(o.apps.currentRoutes[o.apps.currentNavi].name) && !o.apps.cmdViewDisplay) {
        o.apps.myInputFocusMode = "keyboard";
        var s = e.endCoordinates ? e.endCoordinates.height : e.end.height;
        o.theme.isIphoneX && (s -= o.theme.iphoneXDiff), this._listViewHeight = this._maxListViewHeight - s - o.theme.chatTextInputHeight, this.isInputMode = !0, o.apps.isKeyboardShow = !0, o.apps.emit("toggleEmo", !1);
        var a = 0;
        o.apps.emit("myInputViewMoveTo", this._listViewHeight + o.theme.navHeight - o.apps.heightDiff - a);
        var i = this._listViewHeight - this.state.statusBarDiff - o.apps.heightDiff - a;
        this.realListViewHeight !== i && (this.realListViewHeight = i, n.Animated.timing(this.state.listViewHeight, {
          toValue: i,
          duration: "ios" === n.Platform.OS ? 150 : 50
        }).start(function () {
          if (t.appendButtonPressed) {
            var e = t.rowLayout[t.editShare.shareId];
            if (!e) return void (0, o.tlog)("error", "onKeyboardWillShow scrollRowLayout null", t.rowLayout, t.editShare.shareId);
            var s = e.height + e.y - t._listViewHeight - 5;
            s > 0 && requestAnimationFrame(function () {
              null === t.recoverY && (t.recoverY = t.scrollOffset.y), t.refs.listView && t.refs.listView.scrollTo({
                y: s
              });
            });
          } else if (t.insertModeOn) {
            var a = t.chatBubbleLayout[t.editMsg.msgid];
            if (e = t.rowLayout[t.editShare.shareId], !a) return;
            if (!e) return;
            s = e.y + a.y + (a.height > 60 ? 60 : a.height) - t._listViewHeight + 2, s > 0 && requestAnimationFrame(function () {
              null === t.recoverY && (t.recoverY = t.scrollOffset.y), t.refs.listView && t.refs.listView.scrollTo({
                y: s
              });
            });
          }
        }));
      }
    },
    onKeyboardWillHide: function (e) {
      var t = this;
      if (!o.apps.cmdViewDisplay && o.apps.currentNavi === this.props.tab && /^space_/.test(o.apps.currentRoutes[o.apps.currentNavi].name)) if (o.apps.isEmoShow) this.setState({
        noPickupButton: !0
      });else {
        this._listViewHeight = this._maxListViewHeight;
        var s = this._listViewHeight - this.state.statusBarDiff;
        this.realListViewHeight !== s && (this.realListViewHeight = s, n.Animated.timing(this.state.listViewHeight, {
          toValue: s,
          duration: "ios" === n.Platform.OS ? 150 : 50
        }).start(function () {
          null !== t.recoverY && requestAnimationFrame(function () {
            t.refs.listView && t.refs.listView.scrollTo({
              y: t.recoverY
            }), t.recoverY = null;
          });
        })), this.isInputMode = !1, o.apps.emitOnce("rowIsOnEditFinished"), o.apps.editMsgHasNotChanged ? o.apps.myInputViewComponent.isFocused() || (o.apps.editMsgHasNotChanged = !1, o.apps.myInputViewRef.refs.inputView.clearInput(!0), this.clearEditState(), o.apps.deselectAllPictures(), o.apps.myInputViewRef.refs.inputView.clearInput(!0)) : o.apps.myInputViewComponent.isFocused() || (delete o.apps.noNeedToJumpToShareSelect, "edit" === this.editType ? o.apps.myInputViewRef.refs.inputView.onSendPress(function () {
          t.clearEditState(), o.apps.deselectAllPictures(), o.apps.myInputViewRef.refs.inputView.clearInput(!0);
        }, function (e) {
          setTimeout(function () {
            return t.shouldJumpToShareSelect(e);
          }, "ios" === n.Platform.OS ? 50 : 250);
        }) : (this.clearEditState(), setTimeout(function () {
          return t.shouldJumpToShareSelect();
        }, "ios" === n.Platform.OS ? 50 : 250))), o.apps.emit("myInputViewMoveToLow"), this.setState({
          noPickupButton: !1
        });
      }
    },
    shouldJumpToShareSelect: function (e) {
      var t = this;
      if ("3:" === this.friendId.slice(0, 2)) return void (this.shareSended && (o.apps.bottleThrown || o.dbs.setUserProfile({
        bottleThrown: 1
      })));
      if (this.newShareSendingId) {
        var s = this.newShareSendingId;
        delete this.newShareSendingId;
        var a = function () {
          o.apps.changeDispatchCallback[s] ? ((0, o.tlog)("changeDispatchCallback", s), o.apps.changeDispatchCallback[s](), delete o.apps.changeDispatchCallback[s]) : ((0, o.tlog)("sharePostConfirmed", s), o.apps.sharePostConfirmed[s] = !0), o.apps.closeDiag(function () {
            return o.apps.emit("setBoardType", "emoj");
          });
        };
        a();
      } else e && (this.newShareSendingStartCallback = function () {
        return t.shouldJumpToShareSelect();
      }), o.apps.emit("setBoardType", "emoj");
    },
    onInsertNew: function (e, t) {
      this.editShare = e, this.editMsg = t, this.editType = "insert", this.insertModeOn = !0, o.apps.emit("focusMyInputView", this.props.tab, "insert"), o.apps.myInputViewRef.changePlaceHolder((0, o.tr)("Insert Row"));
    },
    onEditMsg: function (e, t) {
      this.editShare = e, this.editMsg = t, this.editType = "edit", this.insertModeOn = !0, o.apps.editMsgHasNotChanged = !0, o.apps.emit("focusMyInputView", this.props.tab, "edit", t.fullText || t.text);
    },
    renderDebugId: function (e) {
      return o.apps.showShareAndMsgId ? r["default"].createElement(n.Text, {
        style: {
          position: "absolute",
          right: 0,
          top: 0
        }
      }, e.shareId) : void 0;
    },
    renderLoadNextBtn: function (e) {
      var t = this;
      return r["default"].createElement(n.View, {
        style: {
          overflow: "hidden",
          marginTop: 8,
          flexDirection: "column",
          alignItems: "center",
          paddingHorizontal: o.theme.winWidth / 7,
          marginVertical: 3
        }
      }, r["default"].createElement(n.TouchableOpacity, {
        style: {
          backgroundColor: "rgba(0,0,0,0.1)",
          paddingHorizontal: 5,
          borderRadius: 5
        },
        onPress: function () {
          t.pos = 0, t.setState({
            showList: !1
          }, function () {
            o.apps.sharesData[t.friendId] = o.apps.sharesData[t.friendId].slice(-2, -1), t.setState({
              showList: !0
            }, function () {
              o.apps.loadSharesData(o.apps.userid, t.friendId, t.viewId);
            });
          });
        }
      }, r["default"].createElement(o.MyTextView, {
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
      })));
    },
    renderTip: function (e) {
      if (e && e.msgs && e.msgs[0]) var t = e.msgs[0].text || " ";
      return r["default"].createElement(n.View, {
        style: {
          overflow: "hidden",
          marginTop: 8,
          flexDirection: "column",
          alignItems: "center",
          paddingHorizontal: o.theme.winWidth / 7,
          marginVertical: 3
        }
      }, r["default"].createElement(n.View, {
        style: {
          backgroundColor: "rgba(0,0,0,0.1)",
          paddingHorizontal: 5,
          borderRadius: 5
        }
      }, r["default"].createElement(o.MyTextView, {
        myTextValue: t,
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
    navToDirectChat: function () {
      var e = o.apps.userid,
        t = this.friendId,
        s = t > e ? e + ":" + t : t + ":" + e,
        a = {
          shareId: s,
          shareFrom: s,
          fromId: e,
          toId: t,
          type: 1,
          descCategory: 3,
          friendId: t
        };
      this.props.routes.navi.navForward(o.apps.newRoute(this.props.routes, "interact_", {
        name: (0, o.tr)("Message"),
        friend: a
      }));
    },
    navToChat: function (e) {
      var t = e.toId.slice(0, 2);
      if (t === o.apps.CONS_PREFIX_MATCH) this.props.routes.navi.navForward(o.apps.newRoute(this.props.routes, "space_", {
        friendId: "3:" + e.fromId,
        name: (0, o.tr)("Space")
      }));else if (t === o.apps.CONS_PREFIX_CIRALL) this.props.routes.shareFriends.shareId = e.shareId, this.props.routes.navi.navForward(this.props.routes.shareFriends);else {
        t === o.apps.CONS_PREFIX_REPORT;
        var s = e.shareId,
          a = (e.chatSession, e.fromId),
          i = e.toId,
          r = e.target,
          n = e.atime,
          d = i.slice(0, 2),
          p = o.apps.newRoute(this.props.routes, "interact_", {
            name: (0, o.tr)("Message")
          });
        Array.isArray(r) && (r = r[1] || r[0]);
        var h = 1,
          l = a;
        if (o.apps.isIn(d, o.apps.CONS_PREFIX_REPORT)) {
          var u = e.msgs[0],
            c = u.fromId,
            f = u.toId,
            m = o.apps.getChatSession(f, c);
          e.newCommentNum ? p.friend = {
            shareId: s,
            chatSession: m,
            shareFrom: c,
            fromId: c,
            type: h,
            shareData: e,
            descCategory: 3,
            friendId: f,
            toId: f,
            isReport: !0,
            myselfId: c,
            isStock: 1
          } : p.friend = {
            shareId: m,
            chatSession: m,
            shareFrom: c,
            fromId: c,
            type: h,
            shareData: e,
            descCategory: 3,
            friendId: f,
            toId: f,
            isReport: !0,
            myselfId: c,
            isStock: 1
          };
        } else p.friend = {
          shareId: s,
          shareFrom: a,
          fromId: o.apps.userid,
          type: h,
          shareData: e,
          navFromSpace: 1,
          descCategory: -1,
          friendId: l,
          toId: a,
          clearMsgFriendId: l,
          atime: n
        }, o.apps.isIn(t, o.apps.CONS_PREFIX_BOTTLE, o.apps.CONS_PREFIX_RAND) && (p.friend.isStock = 1, p.friend.descCategory = 3);
        this.props.routes.navi.navForward(p);
      }
    },
    renderRow: function (e, t, s) {
      var a = this;
      try {
        if (e.isRepeated || !e.msgs) return r["default"].createElement(n.View, {
          style: {
            height: 0
          }
        });
        if (e.category === o.apps.CONS_MSG_CAT_SHARE_TIP) return this.renderTip(e);
        if (e.category === o.apps.CONS_MSG_CAT_LOAD_SHARE_LIMIT) return this.renderLoadNextBtn();
        if (e.isDeleted) {
          o.apps.shareIsDeletedHandled[e.shareId] = 1, o.apps.deleteShareInDb(e);
          var i = e.msgs[0];
          i.isDeleted = 1, i.text = "", i.fullText = "", e.msgs = [i], o.apps.sharesDataDeleted[this.friendId] ? o.apps.sharesDataDeleted[this.friendId][e.shareId] = 1 : (o.apps.sharesDataDeleted[this.friendId] = {}, o.apps.sharesDataDeleted[this.friendId][e.shareId] = 1);
        }
        var d = function (t) {
            var s = h[t].text;
            if (s && (s = o.util.codeSlice(s, 0, 100), s.length !== h[t].text.length && (h[t].fullText = h[t].text, h[t].text = s)), e.toId.slice(0, 2) === o.apps.CONS_PREFIX_AUDIT) {
              for (var a in o.apps.iosDvModelMap) s = s.replace(new RegExp("Apple-" + a), o.apps.iosDvModelMap[a]);
              s = s.replace(/Apple-i/, "i"), s = s.replace(/(iPadOS|iOS)-\S+/, ""), s = s.replace(/\s\s/, ""), s = s.replace(/Fraud\*+/, "Fraud--- "), h[t].text = s;
            }
          },
          h = [].concat(babelHelpers.toConsumableArray(e.msgs)).sort(function (e, t) {
            return e.time - t.time;
          });
        e.jn = 1, h[0].type === o.apps.CONS_MSG_TYPE_TEXT && d(0), e.newCommentNum === o.apps.CONS_SHARE_TYPE_INTRO && (e.jn = 999);
        var l,
          u = e.fromId === o.apps.userid,
          c = o.apps.isDataFromGroup(e),
          f = o.apps.isIn(e.toId.slice(0, 2), "8:"),
          m = [],
          g = o.theme.squaredImageSize,
          I = g / 3 - 4,
          S = [],
          w = !1,
          y = !1,
          v = this.friendId.slice(0, 2);
        if (h.forEach(function (t, s) {
          if ((t.type === o.apps.CONS_MSG_TYPE_VIDEO || t.rawImgId) && (y = !0), l) {
            if (l === t.time) return;
            l = t.time, S.push(t);
          } else l = t.time, S.push(t);
          t.fullText && t.fullText.length !== t.text.length && (w = !0), "android" === n.Platform.OS && (t.text = t.text.replace(/\r/g, "\n"), t.fullText && (t.fullText = t.fullText.replace(/\r/g, "\n"))), w && 1 === s && t.imgId && (m.push(t), e.jn = 1), t.imgId && s >= e.jn && m.length < 3 && m.push(t);
        }), h = S, y && !o.apps.showCmdBall) return r["default"].createElement(n.View, {
          style: {
            height: 0
          }
        });
        var T,
          C,
          E = -1 !== this.fullDisplayRows.indexOf(s);
        w && E && (h[0] && h[0].fullText && (h[0].text = h[0].fullText), T = !1), !E && (h.length > e.jn || w) ? (h = h.slice(0, e.jn), T = !0, (0 === m.length || w) && (C = !0)) : C = !1, !E && 1 === S.length && o.apps.isIn(h[0].type, o.apps.CONS_MSG_TYPE_GIF, o.apps.CONS_MSG_TYPE_IMAGE, o.apps.CONS_MSG_TYPE_VIDEO) && (T = !0, h[0].type === o.apps.CONS_MSG_TYPE_GIF && (C = !0));
        var b = function (e) {
            if (!o.apps.isTempUserid()) {
              var t = o.apps.sharesData[a.friendId].slice(),
                i = babelHelpers["extends"]({}, t[s]);
              if (i.newCommentNum === o.apps.CONS_SHARE_TYPE_INTRO) return void o.apps.helpEmailTip();
              var r = a.fullDisplayRows.indexOf(s);
              -1 !== r ? (a.fullDisplayRows.splice(r, 1), delete a.fullDisplayShares[i.shareId], i.fullDisplay = !1) : (a.fullDisplayRows.push(s), a.fullDisplayShares[i.shareId] = i.msgs.map(function (e) {
                return e.msgid;
              }), i.fullDisplay = !0), t.splice(0 | s, 1, i), o.apps.sharesData[a.friendId] = t, e && !i.fullDisplay ? (a.shouldFoldShareId = i.shareId, a.setState({
                dataSource: a.state.dataSource.cloneWithRows(o.apps.filterRepeat(t.slice(0, a.pos), "shareId"))
              }, function () {})) : (a.lastShowFullScrollOffset[i.shareId] = a.scrollOffset, a.setState({
                dataSource: a.state.dataSource.cloneWithRows(o.apps.filterRepeat(t.slice(0, a.pos), "shareId"))
              }));
            }
          },
          _ = function () {
            var e = o.apps.relationShips[a.friendId];
            return !(!e || !e.isCreator);
          },
          V = function (t) {
            var s = [];
            if ((u || _() || f) && (s = s.concat([[(0, o.tr)("Delete"), function () {
              o.apps.emit("closeContextMenu", function () {
                o.apps.deleteShare(e)["catch"]((0, o.errCb)("spaceView delete share"));
              });
            }]])), o.apps.isOb) if (v === o.apps.CONS_PREFIX_REPORT) s = s.concat([[(0, o.tr)("Report D..."), function () {
              o.apps.emit("closeContextMenu", function () {
                o.apps.send("delReport", {
                  rtime: e.rtime,
                  fromId: e.fromId
                }).then(function (t) {
                  t.notExist && o.apps.popTip("Not exists");
                  var s = o.apps.sharesData[a.friendId],
                    i = s.findIndex(function (t) {
                      return t.shareId === e.shareId;
                    });
                  -1 !== i && (s.splice(i, 1), o.apps.emit("rerenderSharesData_" + a.friendId));
                })["catch"](function (t) {
                  (0, o.tlog)("error", "delReport", e, t);
                });
              });
            }]]);else if (v === o.apps.CONS_PREFIX_CIRALL || ":" !== a.friendId[1]) {
              var i = function (t) {
                o.apps.emit("closeContextMenu", function () {
                  var s = e.shareId,
                    i = [],
                    r = [],
                    n = [];
                  e.msgs.forEach(function (e) {
                    e.type !== o.apps.CONS_MSG_TYPE_IMAGE && e.type !== o.apps.CONS_MSG_TYPE_VIDEO || (i.push(e.time), r.push({
                      addIdx: e.addIdx
                    }), n.push(e.imgId));
                  }), o.apps.send("randD2", {
                    forbid: t,
                    shareId: s,
                    dels: i,
                    msgs: r,
                    imgIds: n
                  }).then(function (e) {
                    e.notExist && o.apps.tip("Not exists", !0);
                    var t = o.apps.sharesData[a.friendId],
                      i = t.findIndex(function (e) {
                        return e.shareId === s;
                      });
                    -1 !== i && (t.splice(i, 1), o.apps.emit("rerenderSharesData_" + a.friendId));
                  })["catch"](function (t) {
                    (0, o.tlog)("error", "randD2", e.shareId, t);
                  });
                });
              };
              s = s.concat([[(0, o.tr)("Rand D..."), function () {
                return i();
              }]]);
            } else o.apps.isIn(v, o.apps.CONS_PREFIX_RAND, o.apps.CONS_PREFIX_BOTTLE) && (s = [].concat(["left" === t ? [(0, o.tr)("Re-Rand..."), function () {
              o.apps.emit("closeContextMenu", function () {
                o.apps.send("reRand", {
                  time: e.time,
                  shareId: e.shareId,
                  fromId: e.fromId,
                  text: e.msgs[0].text
                }).then(function () {
                  var t = o.apps.sharesData[a.friendId],
                    s = t.findIndex(function (t) {
                      return t.shareId === e.shareId;
                    });
                  if (-1 !== s) {
                    var i = t[s];
                    i.msgs[0].type = o.apps.CONS_MSG_TYPE_TEXT;
                    var r = babelHelpers["extends"]({}, i);
                    t.splice(s, 1, r), o.apps.emit("rerenderSharesData_" + a.friendId);
                  }
                })["catch"](function (e) {
                  (0, o.tlog)("error", "reRand", e);
                });
              });
            }] : [(0, o.tr)("Delete-Rand..."), function () {
              o.apps.emit("closeContextMenu", function () {
                o.apps.send("delRand", {
                  time: e.time,
                  fromId: e.fromId,
                  text: e.msgs[0].text
                }).then(function (t) {
                  var s = o.apps.sharesData[a.friendId],
                    i = s.findIndex(function (t) {
                      return t.shareId === e.shareId;
                    });
                  -1 !== i && (s.splice(i, 1), o.apps.emit("rerenderSharesData_" + a.friendId)), o.apps.diag({
                    header: (0, o.tr)("Tip"),
                    content: (0, o.tr)("Forbided ## times", t.forbidCnt || 1),
                    buttons: [{
                      text: (0, o.tr)("Check"),
                      onPress: function () {
                        return o.apps.closeDiag(function () {
                          o.apps.curNavigator.navi.navForward(o.apps.newRoute(o.apps.curNavigator.routes, "about_", {
                            friendId: e.fromId,
                            name: (0, o.tr)("Profile")
                          }));
                        });
                      }
                    }, {
                      text: (0, o.tr)("Ignore"),
                      onPress: function () {
                        return o.apps.closeDiag();
                      }
                    }]
                  });
                })["catch"](function (e) {
                  (0, o.tlog)("error", "delRand", e);
                });
              });
            }]]));
            o.apps.emit("contextMenu", s);
          },
          R = !1,
          D = e.commentNum.toString().length,
          P = (e.target && "me" === e.target[0], "3:" === v),
          M = (this.friendId === o.apps.userid || v === o.apps.CONS_PREFIX_CIRCLE && e.fromId === o.apps.userid || v === o.apps.CONS_PREFIX_REPORT || v === o.apps.CONS_PREFIX_RAND, function (e, t) {
            if (o.apps.isIn(e[t].type, o.apps.CONS_MSG_TYPE_GIF, o.apps.CONS_MSG_TYPE_IMAGE, o.apps.CONS_MSG_TYPE_VIDEO) && o.apps.isIn(e[t - 1].type, o.apps.CONS_MSG_TYPE_GIF, o.apps.CONS_MSG_TYPE_IMAGE, o.apps.CONS_MSG_TYPE_VIDEO)) {
              var s = {
                paddingTop: 20
              };
              return t === e.length - 1 && (s.paddingBottom = 5), s;
            }
          });
        return r["default"].createElement(n.TouchableOpacity, {
          style: {
            overflow: "hidden"
          },
          noOpacictyActive: !0,
          onPress: function () {
            return 0;
          },
          onLongPress: function () {},
          onLayout: function (t) {
            var s = t.nativeEvent.layout;
            if (a.rowLayout[e.shareId] = s, o.apps.videoPreloadLazyMap[e.shareId] && (o.apps.videoPreloadLazyMap[e.shareId].forEach(function (e) {
              var t = s.y + e.layout.y;
              o.apps.videoPreloadList[a.props.tab][a.friendId] || (o.apps.videoPreloadList[a.props.tab][a.friendId] = []), o.apps.videoPreloadList[a.props.tab][a.friendId].push({
                y: t,
                data: e.data
              });
            }), o.apps.videoPreloadList[a.props.tab][a.friendId].sort(function (e, t) {
              return e.y - t.y;
            }), delete o.apps.videoPreloadLazyMap[e.shareId], a.calcPreloadVideos()), e.shareId === a.shouldFoldShareId) {
              delete a.shouldFoldShareId;
              var i = s.y - 80;
              a.refs.listView && a.refs.listView.scrollTo({
                y: i > 0 ? i : 0,
                animated: !0
              });
            }
            if (a.inputShareId === e.shareId) {
              var r = s.height + s.y - a._listViewHeight - 10;
              a.inputShareId = null, r > 0 && requestAnimationFrame(function () {
                a.refs.listView && a.refs.listView.scrollTo({
                  y: r
                });
              });
            }
          }
        }, r["default"].createElement(n.View, {
          style: [p.spaceBlockViewContainer, R && {
            marginBottom: 0
          }, {
            backgroundColor: o.theme.spaceBlockViewBg
          }, o.apps.blackWhiteMode && {
            borderWidth: o.theme.px1,
            borderColor: "#ddd"
          }]
        }, e.lastBottlePt ? r["default"].createElement(n.View, {
          style: {
            height: 400,
            backgroundColor: "black"
          }
        }) : null, h.map(function (t, s, i) {
          return r["default"].createElement(o.ChatBubbleView, {
            ref: function (e) {
              return a.chatBubbleRefs[t.msgid] = e;
            },
            style: [{
              paddingHorizontal: 9,
              backgroundColor: o.theme.transparent,
              paddingTop: 5,
              marginVertical: 0
            }, 0 === s ? {
              paddingTop: 6,
              borderTopLeftRadius: 5,
              borderTopRightRadius: 5
            } : M(h, s)],
            space: !0,
            onPress: function () {
              o.apps.showCmdBall && (a.isReport || o.apps.addfTip(t.text));
            },
            hasNotFullShown: T,
            moreImagesStuff: s === i.length - 1 ? {
              moreImages: m,
              hasNotFullShown: T,
              showFull: b,
              thumbSize: I,
              maxImageWidth: g,
              i: s
            } : null,
            showName: !0,
            showTime: !0,
            isIntro: e.newCommentNum === o.apps.CONS_SHARE_TYPE_INTRO,
            onLayout: function (e) {
              var s = e.nativeEvent.layout;
              if (a.chatBubbleLayout[t.msgid] = s, t.type === o.apps.CONS_MSG_TYPE_VIDEO) if (a.rowLayout[t.shareId]) {
                var i = a.rowLayout[t.shareId].y + s.y;
                o.apps.videoPreloadList[a.props.tab][a.friendId] || (o.apps.videoPreloadList[a.props.tab][a.friendId] = []), o.apps.videoPreloadList[a.props.tab][a.friendId].push({
                  y: i,
                  data: t
                }), o.apps.videoPreloadList[a.props.tab][a.friendId].sort(function (e, t) {
                  return e.y - t.y;
                }), a.calcPreloadVideos();
              } else o.apps.videoPreloadLazyMap[t.shareId] ? o.apps.videoPreloadLazyMap[t.shareId].push({
                layout: s,
                data: t
              }) : o.apps.videoPreloadLazyMap[t.shareId] = [{
                layout: s,
                data: t
              }];
              if (o.apps.insertMsgid === t.msgid) {
                var r = s.height + s.y - a._listViewHeight + 5;
                o.apps.insertMsgid = null, r > 0 && requestAnimationFrame(function () {
                  a.refs.listView && a.refs.listView.scrollTo({
                    y: r
                  });
                });
              }
            },
            key: s,
            atime: c ? 0 : e.atime,
            tab: a.props.tab,
            direction: "left",
            userid: t.fromId,
            friendId: a.friendId,
            isObMode: a.isObMode,
            data: t,
            shareData: e,
            avatarSize: 40,
            bubbleWidth: o.theme.winWidth - 110,
            onFailedPress: function () {
              return a.onFailedPress(e, t);
            },
            hideAvatar: a.isReport ? t.fromId === t.toId && s > 0 : s > 0,
            hideTitle: a.isReport ? t.fromId === t.toId && s > 0 : s > 0,
            isReport: a.isReport,
            routes: a.props.routes,
            onAudioPress: function (e) {
              if (e && e.toggle(), t.isnew) {
                var s = o.apps.sharesData[a.friendId].findIndex(function (e) {
                    return e.shareId === t.shareId;
                  }),
                  i = babelHelpers["extends"]({}, o.apps.sharesData[a.friendId][s]);
                o.apps.sharesData[a.friendId].splice(s, 1, i), s = i.msgs.findIndex(function (e) {
                  return e.msgid === t.msgid;
                }), i.msgs[s].isnew = 0, o.apps.emit("rerenderSharesData_" + a.friendId), o.apps.removeShareNewMark(t.shareId, i.msgs), s = o.apps.unReadNewAudioQueue[a.friendId].findIndex(function (e) {
                  return e.data.msgid === t.msgid;
                }), o.apps.unReadNewAudioQueue[a.friendId].splice(s, 1), delete o.apps.unReadNewAudioMap[a.friendId][t.msgid];
              }
            },
            onLongPress: function (s) {
              if (o.apps.isIn(t.type, o.apps.CONS_MSG_TYPE_TEXT, o.apps.CONS_MSG_TYPE_WARN, o.apps.CONS_MSG_TYPE_TERM, o.apps.CONS_MSG_TYPE_ILLEGAL) && e.newCommentNum !== o.apps.CONS_SHARE_TYPE_INTRO) {
                var a = [];
                a.unshift([(0, o.tr)("Copy Row Text"), function () {
                  o.apps.emit("closeContextMenu", function () {
                    return n.Clipboard.setString(t.text);
                  });
                }]), o.apps.emit("contextMenu", a);
              }
            }
          });
        }), C ? r["default"].createElement(n.TouchableOpacity, {
          style: {},
          onPress: function () {
            return b();
          },
          onLongPress: V
        }, r["default"].createElement(n.Text, {
          style: {
            marginTop: 3,
            marginLeft: 57,
            right: 1,
            fontSize: "android" == n.Platform.OS ? 13 : 12,
            color: o.theme.lighta
          }
        }, (0, o.tr)(" More..."))) : null, e.isDeleted ? r["default"].createElement(n.View, {
          style: {
            height: 15
          }
        }) : r["default"].createElement(n.View, {
          style: [p.spaceCommentBlock, {
            backgroundColor: o.theme.transparent
          }]
        }, r["default"].createElement(n.View, {
          style: p.spaceLeftCommentBlock
        }, e.cdel ? r["default"].createElement(n.Text, {
          style: {
            fontSize: 12,
            color: o.theme.white,
            marginLeft: 5
          }
        }, "\u5df2\u5220\u9664") : null, o.apps.showCmdBall || o.apps.userid === e.fromId ? r["default"].createElement(n.TouchableOpacity, {
          style: p.touchButton,
          onPress: function () {
            return V("left");
          }
        }, r["default"].createElement(o.Ionicons, {
          style: {
            position: "relative",
            top: 1
          },
          name: "ios-more",
          size: ("android" == n.Platform.OS, 22),
          color: o.theme.lighta
        })) : null), r["default"].createElement(n.View, {
          style: p.spaceRightCommentBlock
        }, o.apps.isIn(this.friendId.slice(0, 2), o.apps.CONS_PREFIX_BOTTLE, o.apps.CONS_PREFIX_RAND) ? r["default"].createElement(n.TouchableOpacity, {
          style: p.touchButton,
          onPress: function () {
            return V("right");
          }
        }, r["default"].createElement(o.Ionicons, {
          style: {
            position: "relative",
            top: 1
          },
          name: "ios-more",
          size: ("android" == n.Platform.OS, 22),
          color: o.theme.lighta
        })) : null, P && c ? r["default"].createElement(n.TouchableOpacity, {
          style: [p.touchButton, {
            paddingTop: 0
          }],
          onPress: function () {
            var e = o.apps.newRoute(o.apps.curNavigator.routes, "space_", {
              friendId: c,
              name: (0, o.tr)("Space")
            });
            o.apps.curNavigator.navi.navForward(e);
          }
        }, r["default"].createElement(o.Ionicons, {
          name: "ios-arrow-round-forward",
          size: 26,
          color: o.theme.lighta
        })) : null, null, null, r["default"].createElement(n.TouchableOpacity, {
          style: [p.touchButton, {
            width: 40 + 10 * (0 > D - 2 ? 0 : D - 2)
          }],
          onPress: function () {
            return a.navToChat(e);
          }
        }, r["default"].createElement(o.FontAwesome, {
          style: {
            paddingBottom: 3
          },
          name: "comment-o",
          size: 13,
          color: o.theme.lightb
        }), e.commentNum ? r["default"].createElement(n.View, {
          style: p.countView
        }, r["default"].createElement(n.Text, {
          style: p.countText
        }, e.commentNum)) : null))), this.renderDebugId(e)), R ? r["default"].createElement(n.View, {
          style: {
            flexDirection: "column",
            alignItems: "center",
            paddingHorizontal: o.theme.winWidth / 7
          }
        }, r["default"].createElement(n.TouchableOpacity, {
          style: {
            paddingHorizontal: 20,
            paddingVertical: 5
          },
          onPress: function () {
            var t = e.target.findIndex(function (e) {
              return "+" === e[0];
            });
            -1 !== t && (0, o.textWithoutEncoding)(e.target[t], (0, o.tr)("Play with me in this new social app.\n\nIOS:\nhttps://itunes.apple.com/us/app/who-u-messenger/id1388152152?mt=8\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=co.whou.chat"));
          }
        }, r["default"].createElement(n.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.03)",
            paddingHorizontal: 8,
            paddingTop: 1,
            paddingBottom: 2,
            borderRadius: 5
          }
        }, r["default"].createElement(o.MyTextView, {
          myTextValue: (0, o.tr)("Invite friends could increase your chance to pick up the story. Tap..."),
          imageFontSize: 13,
          adjustsFontSizeToFit: !0,
          style: {
            fontSize: 13,
            color: o.theme.white,
            paddingTop: 1,
            paddingBottom: 1,
            textAlign: "center"
          }
        })))) : null);
      } catch (H) {
        return (0, o.tlog)("error", "SpaceView renderRow", e, H), o.apps.send("clientFatalLog", {
          msg: H.message,
          stack: H.stack
        })["catch"](function (e) {
          (0, o.tlog)("error", "SpaceView renderRow clientFatalLog", e);
        }), r["default"].createElement(n.View, null);
      }
    },
    navToFirstShare: function () {
      if (o.apps.sharesData[this.friendId]) {
        var e = o.apps.sharesData[this.friendId][0];
        if (e) {
          if (e.target && "me" === e.target[0]) return;
          this.navToChat(e);
        }
      }
    },
    renderHeaderMsgbox: function () {
      var e = this,
        t = this.props.routes;
      if ("mySpace" === this.props.tab) {
        this.unReadLength = o.apps.circleMsgUnreadList.length;
        var s = function () {
            var s = o.apps.circleMsgUnreadList[e.unReadLength - 1],
              a = s.msgid,
              i = s.shareId,
              r = s.type,
              n = s.time,
              d = s.category,
              p = s.text,
              h = (s.userid, s.fromId),
              l = s.toId,
              u = s.shareFrom,
              c = s.ftype,
              f = s.atime,
              m = s.utab,
              g = {
                msgid: a,
                shareId: i,
                descType: r,
                time: n,
                descCategory: d,
                text: p,
                friendId: h,
                fromId: h,
                toId: l,
                shareFrom: u,
                type: c,
                atime: f,
                utab: m
              },
              I = o.apps.circleMsgUnreadList.findIndex(function (e) {
                return e.shareId !== i || e.fromId !== h;
              });
            if (-1 !== I) t.navi.navForward(o.apps.newRoute(t, "msgFriends_", {
              userid: "8:" + o.apps.userid,
              name: (0, o.tr)("Reply History")
            }));else {
              var S = o.apps.newRoute(t, "interact_", {
                friend: g,
                name: (0, o.tr)("Message")
              });
              o.apps.currentRoutes.mySpace.name = S.id, o.apps.currentRoutes.mySpace.shareId = g.shareId, t.navi.navForward(S);
            }
          },
          a = function () {
            var t = o.apps.circleMsgUnreadList[e.unReadLength - 1];
            return {
              avatarId: t.fromId,
              atime: t.atime
            };
          };
      }
      var i = function () {
        o.apps.isKeyboardShow ? ((0, o.dismissKeyboard)(), e.onKeyboardWillHide()) : o.apps.isEmoShow && (o.apps.isEmoShow = !1, o.apps.emit("toggleEmo", !1));
      };
      if (this.unReadLength > 0) {
        var d = a(),
          p = d.avatarId;
        d.atime;
        return r["default"].createElement(n.View, {
          style: {
            flexDirection: "row",
            height: 50,
            marginTop: 1,
            alignItems: "center",
            justifyContent: "center"
          }
        }, r["default"].createElement(n.TouchableOpacity, {
          onPress: function () {
            i(), s();
          },
          style: {
            height: 38,
            borderRadius: 5,
            backgroundColor: o.theme.replyBox,
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 5,
            paddingRight: 10
          }
        }, r["default"].createElement(o.CachedImage, {
          avatarId: p,
          style: {
            width: 30,
            height: 30,
            borderRadius: 5
          },
          resizeMode: "cover"
        }), r["default"].createElement(n.View, {
          style: {
            flex: 1,
            marginLeft: 7,
            justifyContent: "center",
            alignItems: "center"
          }
        }, r["default"].createElement(n.Text, {
          style: {
            color: o.theme.white
          }
        }, this.unReadLength + ("zh" === o.apps.locale.slice(0, 2) ? "\u6761" : " ") + (this.unReadLength > 1 ? (0, o.tr)("Replies") : (0, o.tr)("Reply"))))));
      }
      return r["default"].createElement(n.View, {
        style: {
          height: 0
        }
      });
    },
    changeHeaderPlaceHolderHeight: function () {
      "ios" === n.Platform.OS && o.apps.shouldChangeSpaceViewHeaderHeight && (delete o.apps.shouldChangeSpaceViewHeaderHeight, 8 === this.headerHeight ? this.headerHeight = 9 : this.headerHeight = 8);
    },
    renderHeaderPlaceHolder: function () {
      try {
        return this.changeHeaderPlaceHolderHeight(), this.unReadLength > 0 ? null : r["default"].createElement(n.View, {
          style: {
            height: this.headerHeight
          },
          onLayout: function (e) {}
        });
      } catch (e) {
        return (0, o.tlog)("error", "SpaceView renderHeaderPlaceHolder", e), o.apps.send("clientFatalLog", {
          msg: e.message,
          stack: e.stack
        })["catch"](function (e) {
          (0, o.tlog)("error", "SpaceView renderHeaderPlaceHolder clientFatalLog", e);
        }), r["default"].createElement(n.View, null);
      }
    },
    renderFooterSpinner: function () {
      var e = this;
      try {
        if (this.isEnd && o.apps.sharesData[this.friendId] && o.apps.sharesData[this.friendId].length === this.pos) {
          o.apps.sharesData[this.friendId].length;
          return "8:" === this.friendId.slice(0, 2) ? null : this.friendId === o.apps.userid ? r["default"].createElement(n.View, {
            style: {
              height: 50
            }
          }) : ":" !== this.friendId[1] ? 0 === o.apps.sharesData[this.friendId].length ? o.apps.viewTip({
            text: (0, o.tr)("No moment yet..."),
            bottomHeight: 50
          }) : r["default"].createElement(n.View, {
            style: {
              height: 50
            }
          }) : "2:" === this.friendId.slice(0, 2) ? r["default"].createElement(n.View, {
            style: {
              height: 50
            }
          }) : null;
        }
        return 0 === this.pos ? null : r["default"].createElement(n.View, {
          onLayout: function (t) {
            var s = t.nativeEvent.layout;
            e.prevFooterY !== s.y && s.y < e._maxListViewHeight + 100 && ((0, o.tlog)("SpaceView footer layout", s, e.pos), e.renderMore()), e.prevFooterY = s.y;
          }
        }, "android" === n.Platform.OS ? r["default"].createElement(n.ProgressBarAndroid, {
          style: {
            height: 25
          },
          styleAttr: "Inverse"
        }) : r["default"].createElement(n.ActivityIndicatorIOS, {
          animating: !0,
          size: "small"
        }));
      } catch (t) {
        return (0, o.tlog)("error", "SpaceView renderFooterSpinner", t), o.apps.send("clientFatalLog", {
          msg: t.message,
          stack: t.stack
        })["catch"](function (e) {
          (0, o.tlog)("error", "SpaceView renderFooterSpinner clientFatalLog", e);
        }), r["default"].createElement(n.View, null);
      }
    },
    onChangeSearchText: function (e) {},
    calcPreloadVideos: function () {},
    onScroll: function (e) {
      var t = this,
        s = e.nativeEvent.contentOffset;
      this.scrollOffset.y <= 0 && s.y > 0 && this.minimalRender ? (o.apps.noOnScrollRenderMore || this.renderMore(), o.apps.noOnScrollRenderMore = !1) : this.scrollOffset.y > 0 && s.y <= 0 && !this.minimalRender, this.scrollOffset = e.nativeEvent.contentOffset, this.prevFooterY && this.scrollOffset.y + this._listViewHeight > this.prevFooterY && this.renderMore(), "ios" === n.Platform.OS && (!this.state.removeClippedSubviews && this.scrollOffset.y > 2 * o.theme.winHeight ? this.setState({
        removeClippedSubviews: !0
      }) : this.state.removeClippedSubviews && this.scrollOffset.y < 2 * o.theme.winHeight && this.setState({
        removeClippedSubviews: !1
      })), this.calcPreloadVideos();
      for (var a in this.fullDisplayShares) this.fullDisplayShares[a].forEach(function (e) {
        var i = t.chatBubbleLayout[e],
          r = t.rowLayout[a];
        if (i && r) {
          var n = r.y + i.y,
            o = n + i.height + 200;
          if (n > s.y + t._maxListViewHeight + 200 || o < s.y) {
            var d = t.chatBubbleRefs[e];
            d && !d.state.imageNoRender && d.setState({
              imageNoRender: !0
            });
          } else d = t.chatBubbleRefs[e], d && d.state.imageNoRender && d.setState({
            imageNoRender: !1
          });
        }
      });
    },
    relationShipChanged: function () {
      this.setState({});
    },
    renderAddNewShareButton: function () {
      return r["default"].createElement(n.TouchableOpacity, {
        style: {
          position: "absolute",
          left: o.theme.winWidth / 2 - 15,
          bottom: 15,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: o.theme.deepGreen2
        }
      }, r["default"].createElement(o.Ionicons, {
        name: "md-add",
        style: {
          paddingTop: 1
        },
        size: 29,
        color: o.theme.white
      }));
    },
    renderNewButton: function () {
      return this.state.noPickupButton ? void 0 : this.friendId === o.apps.userid || "8:" === this.friendId.slice(0, 2) ? r["default"].createElement(n.TouchableOpacity, {
        onPress: function () {
          return o.apps.forbidExp || o.apps.isForbided ? void o.apps.forbidTip() : void o.apps.emit("focusMyInputView", "friends", "first");
        },
        style: ["ios" === n.Platform.OS ? {
          shadowColor: "#fff",
          shadowOffset: {
            width: 0,
            height: 0
          },
          shadowOpacity: .7
        } : {}, {
          position: "absolute",
          top: this._maxListViewHeight - 70 - (o.theme.isIphoneX ? o.theme.iphoneXDiff : 0),
          height: 28,
          width: 79,
          left: (o.theme.winWidth - 79) / 2,
          borderRadius: 20,
          backgroundColor: o.theme.deepGreen2Trans4,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center"
        }]
      }, r["default"].createElement(o.Ionicons, {
        name: "md-add",
        style: {
          paddingTop: 1
        },
        size: 24,
        color: o.theme.white
      })) : null;
    },
    render: function () {
      var e = o.apps.firstDaily && o.apps.userid === this.friendId;
      e && (this.isEnd = !0);
      var t = o.apps.relationShips[this.friendId];
      return r["default"].createElement(n.View, {
        style: {
          flex: 1,
          backgroundColor: o.theme.lightLess
        }
      }, r["default"].createElement(n.View, {
        style: {
          height: o.theme.navHeight
        }
      }), r["default"].createElement(o.BackgroundImageView, {
        shouldRender: !0,
        userid: o.apps.userid,
        maskColor: o.theme.lightLessTrans6
      }), t && (t.isBlocked || t.isCloseGroup && !t.isInGroup && t.needPasswd) ? r["default"].createElement(n.TouchableWithoutFeedback, {
        onPress: function () {
          o.apps.isEmoShow && o.apps.emit("toggleEmo", !1), (0, o.dismissKeyboard)();
        }
      }, r["default"].createElement(n.Animated.View, {
        style: {
          justifyContent: "flex-start",
          height: this.state.listViewHeight,
          backgroundColor: o.theme.transparent
        }
      })) : this.state.interActionFinished ? r["default"].createElement(n.View, {
        style: {
          flexDirection: "column",
          width: n.Dimensions.get("window").width,
          flex: 1,
          backgroundColor: o.theme.transparent,
          height: this._maxListViewHeight - this.state.statusBarDiff
        }
      }, r["default"].createElement(n.Animated.View, {
        style: {
          height: this.state.listViewHeight,
          backgroundColor: o.theme.transparent
        }
      }, this.renderHeaderMsgbox(), this.state.showList ? r["default"].createElement(n.ListView, {
        ref: "listView",
        initialListSize: 10,
        pageSize: 10,
        removeClippedSubviews: "ios" == n.Platform.OS ? this.state.removeClippedSubviews : !0,
        dataSource: this.state.dataSource,
        onEndReached: this.onEndReached,
        onEndReachedThreshold: 100,
        renderFooter: this.renderFooterSpinner,
        renderHeader: this.renderHeaderPlaceHolder,
        enableEmptySections: !0,
        renderRow: this.renderRow,
        onScroll: this.onScroll,
        scrollsToTop: !1,
        onResponderRelease: this.myScrollResponderHandleResponderRelease,
        onStartShouldSetResponderCapture: this.myScrollResponderHandleStartShouldSetResponderCapture,
        renderScrollComponent: function (e) {
          return r["default"].createElement(o.InvertibleScrollView, babelHelpers["extends"]({}, e, {
            inverted: !1
          }));
        }
      }) : null), this.renderNewButton(), this.state.noPickupButton || "3:" !== this.friendId.slice(0, 2) ? null : r["default"].createElement(d, {
        topHeight: this._maxListViewHeight
      }), r["default"].createElement(n.View, {
        style: {
          flex: 1,
          backgroundColor: o.theme.transparent
        }
      })) : o.apps.isLocking("navIsTrans") ? null : r["default"].createElement(o.InterActionSpinner, {
        up: 50,
        glass: !0,
        shouldSpin: !o.apps.friendIdRecords[this.friendId]
      }));
    }
  });
  var d = r["default"].createClass({
      displayName: "PickupCount",
      componentDidMount: function () {
        o.apps.on("storyCntChanged", this.storyCntChanged);
      },
      componentWillUnmount: function () {
        o.apps.unon("storyCntChanged", this.storyCntChanged);
      },
      storyCntChanged: function () {
        this.setState({});
      },
      render: function () {
        return o.apps.storyCnt > 0 ? r["default"].createElement(n.View, {
          style: {
            position: "absolute",
            top: this.props.topHeight - 60 - (o.theme.isIphoneX ? o.theme.iphoneXDiff : 0) - 3,
            right: (o.theme.winWidth - 79) / 2 - 10 - 50,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: o.theme.warn,
            justifyContent: "center",
            alignItems: "center"
          }
        }) : null;
      }
    }),
    p = (r["default"].createClass({
      displayName: "LikeButtonView",
      getInitialState: function () {
        return this.shareData = this.props.shareData, {
          praised: this.shareData.praised,
          likeBounceValue: new n.Animated.Value(1),
          praiseNum: this.shareData.praiseNum,
          praiseMsgid: this.shareData.praiseMsgid,
          tapn: this.shareData.seqi || 0
        };
      },
      syncShareData: function () {},
      componentDidMount: function () {
        var e = this;
        (this.shareData.sync || this.shareData.toId === this.shareData.fromId) && o.apps.checkIfPraised(this.shareData.shareId).then(function (t) {
          if (t) {
            var s = {
              tapn: t.tapn,
              praiseMsgid: t.msgid,
              praised: t.msgid ? 1 : 0
            };
            e.setState(s), babelHelpers["extends"](e.shareData, s);
          }
        })["catch"](function (t) {
          (0, o.tlog)("error", "like button", e.shareData.shareId, t);
        });
      },
      componentWillReceiveProps: function (e) {
        this.shareData = e.shareData, this.setState({
          praised: this.shareData.praised,
          praiseNum: this.shareData.praiseNum,
          praiseMsgid: this.shareData.praiseMsgid,
          tapn: this.shareData.seqi || 0
        });
      },
      _render: function () {
        return null;
      },
      render: function () {
        var e = this;
        return r["default"].createElement(n.Animated.View, {
          style: [{
            transform: [{
              scale: this.state.likeBounceValue
            }]
          }]
        }, r["default"].createElement(n.TouchableOpacity, {
          style: p.touchButton,
          onPress: function () {
            if (e.state.tapn >= 3) return void o.apps.popTip((0, o.tr)("No more than 3 taps"));
            var t = e.state.praised ? 0 : 1,
              s = t ? e.state.praiseNum + 1 : e.state.praiseNum - 1,
              a = e.state.tapn + 1,
              i = e.props.friendId;
            e.shareData.praised = t, e.shareData.praiseNum = s, e.shareData.seqi = a, e.state.likeBounceValue.setValue(3), e.setState({
              praised: t,
              praiseNum: s,
              tapn: a
            });
            var r = e.shareData,
              d = r.shareId,
              p = r.fromId;
            if (t) {
              var h = o.apps.getNewMsgId();
              e.shareData.praiseMsgid = h, e.setState({
                praiseMsgid: h
              });
              var l = o.apps.getTimeFromMsgid(h);
              o.apps.sendSharePraise({
                msgid: h,
                time: l,
                shareId: d,
                fromId: o.apps.userid,
                tapn: a,
                toId: p,
                shareFrom: p,
                type: 6,
                category: p === o.apps.userid ? -1 : 2,
                friendId: i,
                text: "\u2764\ufe0f",
                ftype: 1
              })["catch"](function (e) {
                (0, o.tlog)("error", "like buttom sendSharePraise", e);
              });
            } else h = e.state.praiseMsgid, e.setState({
              praiseMsgid: ""
            }), l = o.apps.splitShareId(h).time, o.apps.deleteSharePraise({
              msgid: h,
              time: l,
              shareId: d,
              fromId: o.apps.userid,
              toId: p,
              category: 2,
              friendId: i,
              ftype: 1,
              type: 6,
              shareFrom: p
            })["catch"](function (e) {
              (0, o.tlog)("error", "like buttom deleteSharePraise", e);
            });
            n.Animated.spring(e.state.likeBounceValue, {
              toValue: 1,
              friction: 6,
              tension: 10
            }).start(function () {});
          }
        }, r["default"].createElement(o.FontAwesome, {
          style: {
            paddingBottom: 1
          },
          name: "heart-o",
          size: 13,
          color: this.state.praised ? o.theme.warn : o.theme.lightb
        }), "b:" === this.props.friendId.slice(0, 2) && this.state.praiseNum ? r["default"].createElement(n.View, {
          style: p.countView
        }, r["default"].createElement(n.Text, {
          style: [p.countText, {
            color: this.state.praised ? o.theme.warn : o.theme.lighta
          }]
        }, this.state.praiseNum)) : null));
      }
    }), {
      spaceBlockViewContainer: {
        overflow: "hidden",
        marginHorizontal: 9,
        marginBottom: 7,
        borderRadius: 5
      },
      spaceCommentBlock: {
        flexDirection: "row",
        paddingHorizontal: 2,
        paddingBottom: 2,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 5,
        marginVertical: 0,
        height: 30,
        justifyContent: "space-between",
        alignItems: "center"
      },
      spaceLeftCommentBlock: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center"
      },
      spaceRightCommentBlock: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end"
      },
      deleteAction: {
        position: "absolute",
        backgroundColor: "rgba(0,0,0,0)",
        paddingLeft: 15,
        right: "android" == n.Platform.OS ? 4 : 2,
        top: "android" == n.Platform.OS ? -3 : -2
      },
      deleteActionText: {
        color: o.theme.lightd,
        fontSize: "android" == n.Platform.OS ? 19 : 17
      },
      deleteActionLeftBorder: {
        position: "absolute",
        right: 18,
        top: 4,
        backgroundColor: o.theme.lightd,
        height: 11,
        width: 1
      },
      deleteActionBottomBorder: {
        position: "absolute",
        right: 4,
        top: 19,
        backgroundColor: o.theme.lightd,
        height: 1,
        width: 12
      },
      editButton: {
        paddingLeft: 10,
        paddingRight: 20,
        paddingVertical: 5,
        flexDirection: "row",
        alignItems: "center"
      },
      touchButton: {
        width: 40,
        flexDirection: "row",
        height: 30,
        alignItems: "center",
        justifyContent: "center"
      },
      touchText: {
        fontSize: "android" == n.Platform.OS ? 12 : 13,
        color: o.theme.lighta,
        marginLeft: 3,
        paddingBottom: "android" == n.Platform.OS ? 1 : 0
      },
      countView: {
        marginLeft: 4,
        paddingBottom: 1
      },
      countText: {
        color: o.theme.lightb,
        fontSize: 11,
        textAlignVertical: "center"
      },
      plusView: {
        marginHorizontal: 2,
        paddingBottom: 2
      },
      plusText: {
        color: o.theme.lighta,
        fontSize: 14
      },
      newCountView: {
        backgroundColor: o.theme.warn,
        borderRadius: 10,
        paddingHorizontal: 5
      },
      newCountText: {
        color: o.theme.light,
        fontSize: 11
      },
      rowSeperator: {
        height: o.theme.px1,
        backgroundColor: o.theme.lightd,
        marginVertical: 2
      }
    });
});
