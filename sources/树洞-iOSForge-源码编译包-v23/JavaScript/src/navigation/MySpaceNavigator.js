// Maintenance source; recovered reference retained separately.
__d(344, function (e, t, a, r) {
  var __recoveryFreePolicy = t(9000);
  Object.defineProperty(r, "__esModule", {
    value: !0
  }), r.MySpaceNavigator = void 0;
  var n = t(311),
    s = babelHelpers.interopRequireDefault(n),
    i = t(312),
    o = t(314),
    p = (r.MySpaceNavigator = s["default"].createClass({
      displayName: "MySpaceNavigator",
      getInitialState: function () {
        return this.routes = {
          empty: {
            id: "empty",
            name: ""
          },
          shareFriends: {
            id: "shareFriends",
            name: (0, o.tr)("Replies")
          },
          friends: {
            id: "friends",
            name: (0, o.tr)("Repliers")
          },
          bottleFriends: {
            id: "bottleFriends",
            name: (0, o.tr)("Secret Tree")
          },
          shareSelect: {
            id: "shareSelect",
            name: (0, o.tr)("Choose")
          },
          groupMembers: {
            id: "groupMembers",
            name: (0, o.tr)("Group Members")
          },
          addGroupMembers: {
            id: "addGroupMembers",
            name: (0, o.tr)("Add Group Members")
          },
          sessionPicBoard: {
            id: "sessionPicBoard",
            name: (0, o.tr)("Photos and Videos")
          },
          contactsBoard: {
            id: "contactsBoard",
            name: (0, o.tr)("\u661f\u7a7a")
          },
          imagePicker: {
            name: (0, o.tr)("Image Picker"),
            id: "imagePicker"
          }
        }, this.curRoute = this.routes.contactsBoard, o.apps.currentRoutes.mySpace.name = this.curRoute.id, o.apps.currentRoutes.mySpace.userid = o.apps.userid, this.isFoucusing = !1, this.changeDataCnt = 0, this.resetSelectData(), {
          launched: !1
        };
      },
      onSelectBackgroundSetting: function () {
        var e = o.apps.dataForBackgroundSetting.i,
          t = o.apps.picsForBackgroundSetting[e];
        t && e > 0 ? o.ImagePickerManager.pickFromUri(t, {
          maxHeight: 1280,
          maxWidth: 1280,
          quality: .6,
          noData: !0,
          rawfile: this.routes.shareSelect.rawOptionSelected,
          storageOptions: {
            skipBackup: !0
          }
        }, function (e) {
          e.error ? (0, o.tlog)("error", "onSelectBackgroundSetting pickFromUri", e.error) : (e.setbg = 1, o.apps.dataForBackgroundSetting.data = e, o.apps.tmpBackground && o.fs.unlink(o.apps.tmpBackground.replace(/^file:\/\//, ""))["catch"]((0, o.errCb)("Delete tmpBackground " + o.apps.tmpBackground)), o.apps.tmpBackground = e.uri, o.apps.profiles[o.apps.userid].background = e.uri, o.apps.backgroundTypeIsUri[o.apps.userid] = !0, o.apps.emit("backgroundChanged_" + o.apps.userid));
        }) : (o.apps.profiles[o.apps.userid].background = o.apps.picsForBackgroundSetting[0], o.apps.backgroundTypeIsUri[o.apps.userid] = !1, o.apps.emit("backgroundChanged_" + o.apps.userid));
      },
      mySpaceShareSelectInitDataChanged: function () {
        return;
      },
      initShareSelectChangeData: function () {
        this.changeData = {
          id: this.changeDataCnt++,
          selects: [],
          listData: {
            "Common Options": [{
              name: "All Friends",
              type: -1,
              friendId: "-1:"
            }, {
              name: "Non-friends",
              type: -3,
              friendId: "-3:",
              disabled: !1
            }],
            "Friends in this app": o.apps.friendsData.filter(function (e) {
              return 1 === e.type && e.friendId !== o.apps.userid;
            })
          },
          listSections: ["Common Options"]
        };
      },
      resetSelectData: function (e) {
        e && (o.apps.tmpBackground && (o.fs.unlink(o.apps.tmpBackground.replace(/^file:\/\//, ""))["catch"]((0, o.errCb)("Delete tmpBackground " + o.apps.tmpBackground)), o.apps.tmpBackground = ""), o.apps.picsForBackgroundSetting[0] && (o.apps.profiles[o.apps.userid].background = o.apps.picsForBackgroundSetting[0], o.apps.backgroundTypeIsUri[o.apps.userid] = !1, o.apps.emit("backgroundChanged_" + o.apps.userid)), o.apps.initForBackgroundSetting()), o.apps.tmpBackground = "", delete this.routes.shareSelect.targetChangeShare, delete this.routes.shareSelect.rawOptionSelected, o.apps.unon("mySpaceInputOnSend"), o.apps.anonymousChecked = !1, this.initShareSelectChangeData(), this.groupSelectData = {
          selects: [],
          listData: {
            Select: []
          },
          listSections: ["Select"]
        };
      },
      navbarMappers: function () {
        var e = this;
        return {
          Title: function (e, t, a, r) {
            var n, i, p;
            return /^interact_/.test(e.id) ? (n = "user", i = e.friend.friendId) : /^(space_|about_)/.test(e.id) ? (n = "user", i = e.friendId) : (n = "text", p = e.name), s["default"].createElement(o.NavTitleView, {
              type: n,
              userid: i,
              text: p
            });
          },
          LeftButton: function (t, a, r, n) {
            if (0 !== r) {
              if ("bottleFriends" === t.id) {
                var p,
                  d = function () {
                    p && p.setState({
                      cnt: o.apps.friendsUnreadList.length || 0
                    });
                  };
                return s["default"].createElement(o.BackButton, {
                  tag: "bottleFriends",
                  ctx: e,
                  cnt: o.apps.friendsUnreadList.length || 0,
                  onMount: function (e) {
                    p = e, o.apps.on("friendsUnreadChanged", d);
                  },
                  onUnMount: function () {
                    o.apps.unon("friendsUnreadChanged", d);
                  },
                  onPress: function () {
                    e.navi.navBack();
                  }
                });
              }
              return s["default"].createElement(i.TouchableOpacity, {
                style: [{
                  flex: 1,
                  width: 44,
                  height: 44,
                  justifyContent: "center",
                  alignItems: "center"
                }, o.theme.isIphoneX && {}],
                onPress: function () {
                  t.id in {
                    groupCreate: 1,
                    groupMembers: 1,
                    addGroupMembers: 1,
                    linkSend: 1,
                    shareSelect: 1
                  } ? (e.navi.navBack(), e.resetSelectData()) : e.navi.navBack();
                }
              }, s["default"].createElement(o.FontAwesome, {
                name: "angle-left",
                style: {
                  paddingBottom: "android" == i.Platform.OS ? 2 : 1
                },
                size: 35,
                color: o.theme.deep8
              }));
            }
          },
          RightButton: function (t, a, r, n) {
            if ("bottleFriends" === t.id) return o.apps.firReg ? s["default"].createElement(i.TouchableOpacity, {
              style: {
                flex: 1,
                width: 44,
                height: 44,
                justifyContent: "center",
                alignItems: "center"
              },
              onPress: function () {
                o.apps.navSwitch("aboutMe");
              }
            }, s["default"].createElement(o.Ionicons, {
              name: "ios-person-outline",
              size: 29,
              color: o.apps.gFriendRemove ? o.theme.deepGreen : o.theme.lighta
            })) : s["default"].createElement(i.TouchableOpacity, {
              style: {
                flex: 1,
                width: 44,
                height: 44,
                justifyContent: "center",
                alignItems: "center"
              },
              onPress: function () {
                var t = function () {
                  o.apps.gFriendRemove = (!o.apps.gFriendRemove, o.apps.emit("recoveryBatchChanged"), !o.apps.gFriendRemove), o.apps.loadFriendsData("3:" + o.apps.userid), e.setState({});
                };
                t();
              }
            }, s["default"].createElement(o.Ionicons, {
              name: "ios-trash-outline",
              size: 26,
              color: o.apps.gFriendRemove ? o.theme.deepGreen : o.theme.lighta
            }));
            if ("contactsBoard" === t.id) return s["default"].createElement(i.TouchableOpacity, {
              accessibilityLabel: "通过用户ID添加好友",
              style: {width:44,height:44,justifyContent:"center",alignItems:"center"},
              onPress:function () { o.apps.openRecoveryUserIdSearch(e); }
            }, s["default"].createElement(o.Ionicons,{name:"md-add",size:28,color:o.theme.lighta}));
            if (/^space_/.test(t.id)) {
              var d = t.friend ? t.friend.friendId : t.friendId;
              return "8:" === d.slice(0, 2) ? s["default"].createElement(i.TouchableOpacity, {
                style: p.navRightButton,
                onPress: function () {
                  e.routes.navi.navForward(o.apps.newRoute(e.routes, "msgFriends_", {
                    userid: d,
                    name: (0, o.tr)("Reply History")
                  }));
                }
              }, s["default"].createElement(o.Ionicons, {
                name: "ios-menu-outline",
                style: {
                  paddingTop: 1
                },
                size: 30,
                color: o.theme.deep8
              })) : null;
            }
            if (/^about_/.test(t.id)) return null;
            if (/^interact_/.test(t.id)) {
              var c = t.friend ? t.friend.friendId : t.friendId;
              return s["default"].createElement(i.View, {
                style: {
                  flexDirection: "row",
                  height: 44,
                  width: 88
                }
              }, s["default"].createElement(i.TouchableOpacity, {
                style: {
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center"
                },
                onPress: function () {
                  return o.apps.openRecoveryHistory(t.friend ? t.friend.friendId : t.friendId);
                }
              }, s["default"].createElement(i.Text, {
                style: {
                  fontSize: 23
                }
              }, "🔎")), o.apps.isSysUser(c) ? null : s["default"].createElement(i.TouchableOpacity, {
                style: p.navRightButton,
                onPress: function () {
                  var a = t.friend ? t.friend.friendId : t.friendId,
                    r = {
                      friendId: a,
                      name: (0, o.tr)("Profile")
                    };
                  t.friend && (r.shareId = t.friend.shareId), e.routes.navi.navForward(o.apps.newRoute(e.routes, "about_", r));
                }
              }, s["default"].createElement(o.Ionicons, {
                name: "ios-person-outline",
                style: {
                  paddingTop: 1
                },
                size: 30,
                color: o.theme.deep8
              })));
            }
            if (/^msgFriends_/.test(t.id)) return null;
            if ("shareSelect" === t.id) ;else {
              if ("groupMembers" === t.id) return s["default"].createElement(i.TouchableOpacity, {
                style: p.navRightButton,
                onPress: function () {
                  e.routes.addGroupMembers.friendId = t.friendId, e.routes.navi.navForward(o.apps.curNavigator.routes.addGroupMembers);
                }
              }, s["default"].createElement(o.Ionicons, {
                name: "md-add",
                size: 28,
                color: o.theme.lighta
              }));
              if ("addGroupMembers" === t.id) return s["default"].createElement(o.DoneButton, {
                text: (0, o.tr)("Add"),
                disabled: !e.groupSelectData.selects.length,
                tag: "addGroupMembers",
                onPress: function () {
                  var a = t.friendId,
                    r = e.groupSelectData.selects;
                  (0, o.blog)(""), o.apps.send("getGroupNum", {
                    groupId: a
                  }).then(function (t) {
                    (0, o.blog)(), t.num + r.length > o.apps.groupMemberLimit ? o.apps.tip((0, o.tr)("Group currently only support up to 500 group members")) : o.apps.diag({
                      header: (0, o.tr)("Tip"),
                      content: (0, o.tr)("Are you sure to add these group members?"),
                      buttons: [{
                        text: (0, o.tr)("Cancel"),
                        onPress: function (e) {
                          return o.apps.closeDiag();
                        }
                      }, {
                        text: (0, o.tr)("Ok"),
                        onPress: function (t) {
                          t.isProgressing || (t.progressing(!0), o.apps.addGroupMembers(a, r).then(function () {
                            o.apps.closeDiag(), e.navi.navBack(), o.apps.emit("selectViewLoaded_groupMembers", !0), e.resetSelectData();
                          })["catch"](function (e) {
                            t.progressing(!1), t.setState({
                              infoTip: (0, o.tr)("Requesting Failed")
                            }), (0, o.tlog)("error", "DoneButton addGroupMembers", e);
                          }));
                        }
                      }]
                    });
                  });
                },
                onDoneStateChanged: function (t) {
                  return t.setState({
                    disabled: !e.groupSelectData.selects.length
                  });
                }
              });
            }
          }
        };
      },
      onSpaceTabPressed: function () {},
      initialBackToNormal: function () {
        this.navi.immediatelyResetRouteStack([this.routes.contactsBoard, this.routes.bottleFriends]), this.shouldUpdate = !0;
      },
      onDidFocusCb: function () {
        o.apps.emitOnce("mySpaceNavigatorDidFocus");
      },
      addDidFocusCallback: function (e) {
        o.apps.on("mySpaceNavigatorDidFocus", e);
      },
      componentDidMount: function () {
        var e = this;
        o.apps.on("spaceTabPressed", this.onSpaceTabPressed), o.apps.on("launchMySpaceNav", function () {
          e.state.launched || e.setState({
            launched: !0
          }, function () {
            o.apps.emit("launchAboutMeNav");
          });
        }), o.apps.launchMySpaceNavEmitted && (this.state.launched || this.setState({
          launched: !0
        }, function () {
          o.apps.emit("launchAboutMeNav");
        }));
        o.apps.on("recoveryBatchChanged", this.recoveryBatchChanged);
      },
      componentWillUnmount: function () {
        o.apps.unon("spaceTabPressed", this.onSpaceTabPressed);
        o.apps.unon("recoveryBatchChanged", this.recoveryBatchChanged);
      },
      render: function () {
        var e = this;
        return this.state.launched ? s["default"].createElement(o.MyNavigator, babelHelpers["extends"]({}, this.props, {
          ref: function (t) {
            e.navi = t, e.routes.navi = t;
          },
          renderSceneContent: this.renderSceneContent,
          initialRoute: this.curRoute,
          navbarMappers: this.navbarMappers(),
          navBackCallback: function (t) {
            t.prevRoute && "imagePicker" === t.prevRoute.id && (o.apps.notCloseImagePickerDiag ? delete o.apps.notCloseImagePickerDiag : o.apps.modelViewRef.state.showModelView && !o.apps.modelViewRef.locking && o.apps.closeDiag()), 1 === t.routeList.length && (delete o.apps.bottleResLock, o.apps.groupMembers = {}, delete o.apps.firstSpaceRoute, delete e.curRouteGroupId, delete o.apps.gFriendRemove), o.apps.popNaviSwitch("mySpace"), "bottleFriends" === t.prevRoute.id ? delete o.apps.bottleFriendsRoute : /^msgFriends_/.test(t.prevRoute.id) ? (delete o.apps.msgFriendsRoute, o.apps.removeCircleMsgUnread()) : /^followers_/.test(t.prevRoute.id) && 2 === t.prevRoute.type ? o.apps.removeNewFollowersUnread()["catch"](function (e) {
              (0, o.tlog)("error", "mySpaceNavi removeNewFollowersUnread", e);
            }) : t.prevRoute.id in {
              groupCreate: 1,
              groupMembers: 1,
              addGroupMembers: 1,
              linkSend: 1,
              contactsBoard: 1,
              shareSelect: 1
            } && e.resetSelectData(), t.isNavbacking = !0, o.apps.deleteRoute(e.routes, t.prevRoute);
          },
          onDidFocus: function (t, a) {
            if (e.isFoucusing = !1, o.apps.unlock("navIsTrans"), o.apps.clearInputPanel(), o.apps.emit("stopAudioRecord"), a.prevRoute && "imagePicker" === a.prevRoute.id && (o.apps.unon("imagePicked"), o.apps.modelViewRef.unHide()), e.shouldUpdate && e.setState({}), e.onDidFocusCb(), /^space_/.test(t.id)) e.routes.removeShareId && (o.apps.removeMySpaceShareUnread(e.routes.removeShareId), delete e.routes.removeShareId, o.apps.emit("rerenderSharesData_" + t.friendId)), "8:" !== t.friendId.slice(0, 2) || a.isNavbacking || o.apps.removeCircleShareUnread(t.friendId), o.apps.clearDeletedMsgs(), o.apps.emit("spaceViewDidFocus_" + t.friendId), o.apps.myInputViewRef && o.apps.myInputViewRef.changePlaceHolder((0, o.tr)("What's your story?"));else if ("friends" === t.id) o.apps.loadShareFriendsData(t.shareId)["catch"]((0, o.errCb)("loadShareFriendsData"));else if ("bottleFriends" === t.id) o.apps.loadFriendsDataAsync("3:" + o.apps.userid), o.apps.shouldReloadFriends && (delete o.apps.shouldReloadFriends, o.apps.loadFriendsDataAsync(o.apps.userid));else if (/^interact_/.test(t.id)) {
              var r = t.friend,
                n = r.shareId,
                s = (r.friendId, r.fromId),
                i = r.toId,
                p = (r.category, o.apps.getFid(i, s, n));
              e.interactFid = p, o.apps.emit("interactViewDidFocus_" + p), o.apps.myInputViewRef.changePlaceHolder(), o.apps.emit("myInputViewMoveToHigh");
            } else "shareSelect" === t.id ? o.apps.emit("selectViewLoaded_shareSelect") : /^about_/.test(t.id) ? o.apps.emit("aboutMeViewLoaded_" + t.friendId, e.curRouteGroupId) : "groupMembers" === t.id ? o.apps.emit("selectViewLoaded_groupMembers") : /^followers_/.test(t.id) ? o.apps.emit("selectViewLoaded_followers") : "addGroupMembers" === t.id ? o.apps.emit("selectViewLoaded_addGroupMembers") : "sessionPicBoard" === t.id ? o.apps.emit("sessionPicBoardViewLoaded_" + o.apps.curSessionId) : /^msgFriends_/.test(t.id) ? o.apps.loadMsgFriendsData(t.userid)["catch"](function (e) {
              (0, o.tlog)("error", "mySpaceNavi loadMsgFriendsData", t.userid, e);
            }) : "contactsBoard" === t.id ? (a.isNavbacking && "bottleFriends" === a.prevRoute.id && o.apps.removeAllBottleUnread(), o.apps.emit("selectViewLoaded_contactsBoard")) : "shareFriends" === t.id && o.apps.loadShareFriendsData(t.shareId)["catch"]((0, o.errCb)("loadShareFriendsData"));
            delete a.isNavbacking;
          },
          onWillFocus: function (t) {
            if (e.curRoute = t, e.isFoucusing = !0, o.apps.lock("navIsTrans"), e.interactFid && (o.apps.emit("leaveInteractFocus_" + e.interactFid), delete e.interactFid), /^space_/.test(t.id)) o.apps.firstSpaceRoute || (o.apps.firstSpaceRoute = t), o.apps.currentRoutes.mySpace.name = t.id, o.apps.currentRoutes.mySpace.userid = t.friendId, o.apps.currentRoutes.mySpace.shareId = "", o.apps.emit("myInputViewMoveToLow");else if (/^interact_/.test(t.id)) {
              o.apps.currentRoutes.mySpace.name = t.id;
              var a = t.friend.shareId;
              o.apps.currentRoutes.mySpace.shareId = a, o.apps.currentRoutes.mySpace.uid = a;
              var r = o.apps.getRealFriendId(t.friend);
              o.apps.currentRoutes.mySpace.userid = r, o.apps.currentRoutes.mySpace.fid = o.apps.getFid(o.apps.userid, r, a);
              var n = r.slice(0, 2);
              "7:" === n && (o.apps.isInStock = !0), "2:" === n && (e.curRouteGroupId = r);
            } else if ("friends" === t.id) o.apps.currentRoutes.mySpace.name = "friends", o.apps.currentRoutes.mySpace.userid = o.apps.userid, o.apps.currentRoutes.mySpace.shareId = t.shareId, o.apps.emit("myInputViewMoveToLow");else if (/^about_/.test(t.id)) o.apps.currentRoutes.mySpace.name = t.id, o.apps.emit("myInputViewMoveToLow");else if ("shareSelect" === t.id) {
              var s = function (t) {
                if (!t) return [];
                var a = [],
                  r = [];
                return t.forEach(function (t) {
                  -1 !== e.changeData.selects.findIndex(function (e) {
                    return e.friendId === t.friendId;
                  }) ? a.push(t) : r.push(t);
                }), a.concat(r);
              };
              "me" === t.targetChangeShare.target[0] ? (e.changeData.oldSelects = e.changeData.selects.slice(), -1 === e.changeData.selects.findIndex(function (e) {
                return -3 === e.type;
              }) && e.changeData.selects.push({
                name: "Non-friends",
                type: -3,
                friendId: "-3:"
              }), o.apps.lastShareFriendIds.forEach(function (t) {
                "+" === t[0] || e.changeData.selects.push({
                  type: 1,
                  friendId: t
                });
              }), e.changeData.listData["Friends in this app"] = s(e.changeData.listData["Friends in this app"])) : (t.targetChangeShare.atime > 0 && e.changeData.selects.push({
                name: "Make it Anonymous",
                type: -5,
                friendId: "-5:"
              }), t.targetChangeShare.target.forEach(function (t) {
                if ("all" === t) e.changeData.selects.push({
                  name: "All Friends in this App (" + o.apps.friendNumber + " currently)",
                  type: -1,
                  friendId: "-1:"
                });else if ("me" === t) e.changeData.selects.push({
                  name: "No One (Only seen by yourself)",
                  type: -4,
                  friendId: "-4:"
                });else if ("rand" === t) e.changeData.selects.push({
                  name: "Non-friends",
                  type: -3,
                  friendId: "-3:"
                });else if ("+" === t[0]) e.changeData.selects.push({
                  type: -6,
                  friendId: t
                });else {
                  var a = /^(\d+):/.exec(t);
                  if (a) {
                    var r = parseInt(a[1], 10);
                    e.changeData.selects.push({
                      type: r,
                      friendId: t
                    });
                  } else e.changeData.selects.push({
                    type: 1,
                    friendId: t
                  });
                }
              }), e.changeData.listData["Friends in Contacts"] = s(e.changeData.listData["Friends in Contacts"]), e.changeData.listData["Friends in this app"] = s(e.changeData.listData["Friends in this app"]), e.changeData.oldSelects = e.changeData.selects.slice()), o.apps.currentRoutes.mySpace.name = "shareSelect", o.apps.emit("myInputViewMoveToLow");
            } else "groupMembers" === t.id ? (e.curRouteGroupId = t.friendId || t.friend.friendId, o.apps.currentRoutes.mySpace.name = "groupMembers", o.apps.emit("myInputViewMoveToLow")) : /^followers_/.test(t.id) ? (o.apps.currentRoutes.mySpace.name = "followers", o.apps.emit("myInputViewMoveToLow")) : "addGroupMembers" === t.id ? (o.apps.currentRoutes.mySpace.name = "addGroupMembers", o.apps.emit("myInputViewMoveToLow")) : "sessionPicBoard" === t.id ? (o.apps.currentRoutes.mySpace.name = "sessionPicBoard", o.apps.emit("myInputViewMoveToLow")) : /^msgFriends_/.test(t.id) ? (o.apps.msgFriendsRoute || (o.apps.msgFriendsRoute = t), o.apps.currentRoutes.mySpace.name = "msgFriends", o.apps.currentRoutes.mySpace.userid = t.userid, o.apps.emit("myInputViewMoveToLow")) : "contactsBoard" === t.id ? (o.apps.currentRoutes.mySpace.name = "contactsBoard", o.apps.emit("myInputViewMoveToLow")) : "shareFriends" === t.id ? (o.apps.currentRoutes.mySpace.name = "shareFriends", o.apps.currentRoutes.mySpace.userid = o.apps.userid, o.apps.currentRoutes.mySpace.shareId = t.shareId, o.apps.currentRoutes.mySpace.uid = t.shareId, o.apps.emit("myInputViewMoveToLow")) : "bottleFriends" === t.id && (o.apps.bottleFriendsRoute || (o.apps.bottleFriendsRoute = t), o.apps.currentRoutes.mySpace.name = "bottleFriends", o.apps.currentRoutes.mySpace.userid = "3:" + o.apps.userid, o.apps.currentRoutes.mySpace.shareId = "", o.apps.currentRoutes.mySpace.uid = "3:" + o.apps.userid, o.apps.emit("myInputViewMoveToLow"));
          }
        })) : null;
      },
      navToFriend: function (e) {
        var t = this;
        o.apps.lastSpaceTabCb = function () {
          if (e.friendId === o.apps.userid) {
            var a = o.apps.newRoute(t.routes, "about_", {
              friendId: o.apps.userid,
              name: (0, o.tr)("Profile")
            });
            t.routes.navi.navForward(a);
          } else if ("2:" === e.friendId.slice(0, 2)) e.descCategory = 4, e.shareFrom = e.friendId, e.shareId = e.friendId, t.navi.navForward(o.apps.newRoute(t.routes, "interact_", {
            friend: e,
            name: (0, o.tr)("Message")
          }));else {
            var r = e,
              n = r.toId,
              s = r.fromId,
              i = r.friendId,
              p = r.userid,
              d = s === o.apps.userid ? n : s;
            if (d !== i) {
              var c = new Error();
              (0, o.tlog)("error", "MySpaceNavigator navToFriend", e, c), o.apps.send("clientFatalLog", {
                msg: c.message,
                stack: c.stack
              })["catch"](function (e) {
                (0, o.tlog)("error", "MySpaceNavigator navToFriend", e);
              }), i = d;
            }
            var u = o.apps.friendsUnread[i],
              l = u && u.length > 0;
            if (l) {
              var m = u[u.length - 1],
                f = m.msgid,
                h = m.shareId,
                g = m.type,
                S = m.time,
                y = m.category,
                v = m.text,
                s = m.fromId,
                n = m.toId,
                w = m.shareFrom,
                b = m.ftype,
                I = m.atime;
              e = {
                msgid: f,
                shareId: h,
                descType: g,
                time: S,
                descCategory: y,
                userid: p,
                desc: v,
                friendId: i,
                fromId: s,
                toId: n,
                shareFrom: w,
                type: b,
                atime: I
              };
            }
            var F = i < o.apps.userid ? i + ":" + o.apps.userid : o.apps.userid + ":" + i;
            e.descCategory = 3, e.shareId = F, t.navi.navForward(o.apps.newRoute(t.routes, "interact_", {
              friend: e,
              name: (0, o.tr)("Message")
            }));
          }
        }, o.apps.lastSpaceTabCb();
      },
      renderSceneContent: function (e, t) {
        var a = this;
        if ("bottleFriends" === e.id) return s["default"].createElement(o.UserListView, {
          tab: "mySpace",
          routes: this.routes,
          uid: "3:" + o.apps.userid,
          type: "bottleFriends",
          iType: "bottleFriends",
          onListDataChanged: function (e) {
            return a.userListData = e;
          },
          route: e,
          renderFooter: function (e) {
            return s["default"].createElement(i.View, {
              style: {
                height: 110
              }
            });
          },
          renderHeader: function (e) {
            return null;
          },
          onLongPressRowContent: function (e) {
            var t = [[(0, o.tr)("Remove"), function () {
              o.apps.emit("closeContextMenu", function () {
                o.apps.removeFriend(e.friendId, e.userid);
              });
            }]];
            o.apps.emit("contextMenu", t);
          },
          onPressRowContent: function (e) {
            a.navToFriend(e);
          }
        });
        if (/^space_/.test(e.id)) {
          var r = e.friendId;
          return s["default"].createElement(o.SpaceView, {
            ref: function (e) {
              return a.spaceView = e;
            },
            fromId: o.apps.userid,
            toId: r,
            friendId: r,
            friendType: "2:" === r.slice(0, 2) ? 2 : 1,
            tab: "mySpace",
            spaceName: e.id,
            routes: this.routes,
            route: e
          });
        }
        if (/^interact_/.test(e.id)) return s["default"].createElement(o.InteractView, {
          route: e,
          friend: e.friend,
          routes: this.routes,
          iType: e.id,
          pickComment: e.pickComment,
          tab: "mySpace"
        });
        if (/^about_/.test(e.id)) return s["default"].createElement(o.AboutMeView, {
          tab: "mySpace",
          userid: e.friendId
        });
        if ("shareSelect" !== e.id) {
          if ("addGroupMembers" === e.id) return this.groupSelectData.listData.Select = [], s["default"].createElement(o.SelectView, {
            tag: "addGroupMembers",
            selectData: this.groupSelectData,
            showHeaderBtn: 0 === o.apps.friendNumber,
            renderHeaderButtonTip: function () {
              return s["default"].createElement(i.TouchableOpacity, {
                style: {
                  backgroundColor: "rgba(0,0,0,0.03)",
                  paddingHorizontal: 5,
                  borderRadius: 5
                }
              }, s["default"].createElement(o.MyTextView, {
                myTextValue: (0, o.tr)("No friends yet"),
                imageFontSize: 14,
                adjustsFontSizeToFit: !0,
                style: {
                  fontSize: 14,
                  color: o.theme.white,
                  paddingTop: 1,
                  paddingBottom: 1,
                  textAlign: "center"
                }
              }));
            },
            onSelectViewLoaded: function (t, a) {
              Promise.all([o.apps.loadGroupMembers(e.friendId)]).then(function (e) {
                var t = e[0].members,
                  r = e[1],
                  n = {};
                t.forEach(function (e) {
                  return n[e.friendId] = 1;
                });
                var s = [];
                r.forEach(function (e) {
                  n[e] || s.push({
                    type: 1,
                    friendId: e
                  });
                }), a({
                  listData: {
                    Select: s
                  },
                  listSections: ["Select"]
                });
              })["catch"](function (e) {
                (0, o.tlog)("error", "onSelectViewLoaded", e);
              });
            }
          });
          if ("groupMembers" === e.id) return s["default"].createElement(o.SelectView, {
            tag: "groupMembers",
            markColor: o.theme.warn,
            selectData: {
              selects: [],
              listData: {
                Select: []
              },
              listSections: ["Select"]
            },
            onSelectViewLoaded: function (t, a) {
              o.apps.loadGroupMembers(e.friendId).then(function (e) {
                var t = e.members;
                a({
                  listData: {
                    Select: t
                  },
                  listSections: ["Select"]
                });
              })["catch"]((0, o.errCb)("onSelectViewLoaded"));
            },
            onRowToggle: function (e) {
              var t = o.apps.newRoute(a.routes, "about_", {
                friendId: e.props.data.friendId,
                name: (0, o.tr)("Profile")
              });
              return a.routes.navi.navForward(t), !0;
            }
          });
          if (/^followers_/.test(e.id)) return s["default"].createElement(o.SelectView, {
            tag: "followers",
            markColor: o.theme.warn,
            noSearch: !0,
            selectData: {
              selects: [],
              listData: {
                Select: []
              },
              listSections: ["Select"]
            },
            renderFooter: function (t) {
              return 0 === o.apps.getLastFollowerTime(e.type) ? s["default"].createElement(i.View, {
                style: {
                  height: 20
                }
              }) : "android" === i.Platform.OS ? s["default"].createElement(i.ProgressBarAndroid, {
                style: {
                  height: 30
                },
                styleAttr: "Inverse"
              }) : s["default"].createElement(i.ActivityIndicatorIOS, {
                animating: !0,
                size: "small"
              });
            },
            onEndReached: function (t, a) {
              o.apps.loadFollowers(e.type, o.apps.getLastFollowerTime(e.type), e.userid).then(function (t) {
                var r = t.followers;
                a({
                  listData: {
                    Select: o.apps.catFollowers(e.type, r)
                  },
                  listSections: ["Select"]
                });
              })["catch"](function (e) {
                (0, o.tlog)("error", "mySpaceNavi onEndReached", e);
              });
            },
            onSelectViewLoaded: function (t, a) {
              return 0 !== o.apps.getFollowers(e.type).length ? void a({
                listData: {
                  Select: o.apps.catFollowers(e.type, [])
                },
                listSections: ["Select"]
              }) : (2 === e.type && o.apps.followers.length > 0 && (o.apps.firstFollowerTime = o.apps.followers[0].time), void o.apps.loadFollowers(e.type, o.apps.getLastFollowerTime(e.type), e.userid).then(function (t) {
                var r = t.followers;
                a({
                  listData: {
                    Select: o.apps.catFollowers(e.type, r)
                  },
                  listSections: ["Select"]
                });
              })["catch"](function (e) {
                (0, o.tlog)("error", "mySpaceNavi onSelectViewLoaded", e);
              }));
            },
            onUnmount: function (t) {
              (o.apps.getFollowers(e.type).length > 200 || e.userid) && o.apps.setFollowers(e.type, []);
            },
            onRowToggle: function (t) {
              if (e.userid) {
                var r = o.apps.newRoute(a.routes, "interact_", {
                    name: (0, o.tr)("Message")
                  }),
                  n = e.userid,
                  s = t.props.data.friendId,
                  i = o.apps.getChatSession(n, s);
                r.friend = {
                  shareId: i,
                  chatSession: i,
                  shareFrom: n,
                  fromId: n,
                  type: 1,
                  descCategory: 3,
                  friendId: s,
                  toId: s,
                  isReport: !0,
                  myselfId: n,
                  isStock: 1
                }, a.navi.navForward(r);
              } else a.navi.navForward(o.apps.newRoute(a.routes, "about_", {
                friendId: t.props.data.friendId,
                name: (0, o.tr)("Profile")
              }));
              return !0;
            }
          });
          if ("sessionPicBoard" === e.id) return s["default"].createElement(o.SessionPicBoard, null);
          if ("contactsBoard" === e.id) {
            var n = function (e) {
              var t = o.apps.getContactsBoardData();
              o.apps.loadFriendShips().then(function (a) {
                t.listSections = t.listSections.concat("{"), babelHelpers["extends"](t.listData, {
                  "{": a
                }), e(t);
              })["catch"](function (e) {
                (0, o.tlog)("error", "onSelectViewLoaded", e);
              });
            };
            return s["default"].createElement(o.SelectView, {
              tag: "contactsBoard",
              section: !0,
              selectData: o.apps.getContactsBoardData(),
              mainTab: !0,
              noSearch: !0,
              onEndReached: function (e, t) {
                return n(t);
              },
              onSelectViewLoaded: function (e, t) {
                return n(t);
              },
              renderHeaderButtonTip: function () {},
              renderFooter: function (e) {
                return -1 === o.apps.friendShipLast.time ? s["default"].createElement(i.View, {
                  style: {
                    height: 20
                  }
                }) : "android" === i.Platform.OS ? s["default"].createElement(i.ProgressBarAndroid, {
                  style: {
                    height: 30
                  },
                  styleAttr: "Inverse"
                }) : s["default"].createElement(i.ActivityIndicatorIOS, {
                  animating: !0,
                  size: "small"
                });
              },
              markColor: o.theme.warn,
              onRowToggle: function (e) {
                var t = babelHelpers["extends"]({}, e.props.data);
                if (-103 === t.type) o.apps.switchShadow();else if (-102 === t.type) {
                  if ("ios" === i.Platform.OS) {
                    if (o.apps.requestingNotiPermission) return !0;
                    o.apps.setSharedParas({
                      firstNotiTouched: 1
                    }), o.apps.emit("selectViewLoaded_contactsBoard", !0), o.apps.requestingNotiPermission = !0, setTimeout(function () {
                      delete o.apps.requestingNotiPermission;
                    }, 2e3), o.apps.requestPermission({
                      type: "notification",
                      header: (0, o.tr)("Tip"),
                      content: (0, o.tr)("You will not be reminded unless turning on notifications."),
                      btn1: (0, o.tr)("Later on"),
                      btn2: (0, o.tr)("Allow now"),
                      callback: function () {}
                    });
                  } else o.reactDevInfo.openNotiSettings();
                } else if (8 === t.type) {
                  if (o.apps.showCmdBall || o.apps.isTempUserid()) {
                    var r = o.apps.newRoute(a.routes, "space_", {
                      friendId: t.friendId,
                      name: (0, o.tr)("Space")
                    });
                    a.routes.navi.navForward(r);
                  } else o.apps.noCircleTip();
                } else if (3 === t.type) a.routes.navi.navForward(a.routes.bottleFriends);else if (t.type === o.apps.CONS_SEL_UNPURCHASE) {
                  return __recoveryFreePolicy.notifyBackendRequired(o.apps);
                } else {
                  var n = t.friendId;
                  a.routes.navi.navForward(o.apps.newRoute(a.routes, "about_", {
                    friendId: n,
                    name: (0, o.tr)("Profile")
                  }));
                }
                return !0;
              }
            });
          }
          return "shareFriends" === e.id ? s["default"].createElement(o.UserListView, {
            tab: "shareFriends",
            uid: e.shareId,
            type: "shareFriends",
            route: e,
            onListDataChanged: function (e) {},
            renderFooter: function (e) {
              return 0 === e.state.userListData.length ? s["default"].createElement(i.View, {
                style: {
                  flexDirection: "column",
                  alignItems: "center",
                  paddingHorizontal: o.theme.winWidth / 7,
                  paddingVertical: 8
                }
              }, s["default"].createElement(i.TouchableOpacity, {
                style: {
                  backgroundColor: o.apps.tipBackgroundColor(),
                  paddingHorizontal: 5,
                  borderRadius: 5
                }
              }, s["default"].createElement(o.MyTextView, {
                myTextValue: (0, o.tr)("No Replies"),
                imageFontSize: 14,
                adjustsFontSizeToFit: !0,
                style: {
                  fontSize: 14,
                  color: o.theme.white,
                  paddingTop: 1,
                  paddingBottom: 1,
                  textAlign: "center"
                }
              }))) : null;
            },
            onLongPressRowContent: function (e) {},
            onPressRowContent: function (e) {
              o.apps.lastFriendsTabCb = function () {
                a.navi.navForward(o.apps.newRoute(a.routes, "interact_", {
                  friend: e
                }));
              }, o.apps.lastFriendsTabCb();
            }
          }) : /^msgFriends_/.test(e.id) ? s["default"].createElement(o.UserListView, {
            type: "msgFriends_" + e.userid,
            route: e,
            onListDataChanged: function (e) {},
            renderFooter: function (e) {
              return 0 === e.state.userListData.length ? s["default"].createElement(i.View, {
                style: {
                  flexDirection: "column",
                  alignItems: "center",
                  paddingHorizontal: o.theme.winWidth / 7,
                  paddingVertical: 8
                }
              }, s["default"].createElement(i.TouchableOpacity, {
                style: {
                  backgroundColor: o.apps.tipBackgroundColor(),
                  paddingHorizontal: 5,
                  borderRadius: 5
                }
              }, s["default"].createElement(o.MyTextView, {
                myTextValue: (0, o.tr)("No Replies"),
                imageFontSize: 14,
                adjustsFontSizeToFit: !0,
                style: {
                  fontSize: 14,
                  color: o.theme.white,
                  paddingTop: 1,
                  paddingBottom: 1,
                  textAlign: "center"
                }
              }))) : null;
            },
            onLongPressRowContent: function (e) {},
            onPressRowContent: function (e) {
              o.apps.lastSpaceTabCb = function () {
                a.navi.navForward(o.apps.newRoute(a.routes, "interact_", {
                  friend: e,
                  msgFriends: 1
                }));
              }, o.apps.lastSpaceTabCb();
            }
          }) : "imagePicker" === e.id ? s["default"].createElement(o.MemTest, null) : null;
        }
        return e.targetChangeShare ? s["default"].createElement(o.SelectView, {
          firstShare: "me" === e.targetChangeShare.target[0],
          target: e.targetChangeShare.target,
          isChangeView: !0,
          tag: "shareSelect",
          noSearch: !0,
          selectData: this.changeData
        }) : void 0;
      },
      recoveryBatchChanged: function () {
        this.setState({});
      }
    }), {
      navRightButton: [{
        flex: 1,
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center"
      }, o.theme.isIphoneX && {}],
      navRightText: {
        fontSize: 13,
        color: o.theme.deep8
      },
      friendViewContainer: {
        backgroundColor: o.theme.light,
        flex: 1
      },
      navbarTitleContainerView: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
      },
      navbarTitle: {
        fontSize: 20,
        color: o.theme.deep6,
        paddingBottom: "android" == i.Platform.OS ? 3 : 0
      }
    });
});
