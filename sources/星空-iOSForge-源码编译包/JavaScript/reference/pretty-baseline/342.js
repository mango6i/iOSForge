__d(342, function (e, t, r, a) {
  Object.defineProperty(a, "__esModule", {
    value: !0
  }), a.FriendsNavigator = void 0;
  var n = t(311),
    s = babelHelpers.interopRequireDefault(n),
    i = t(312),
    o = t(314),
    d = i.Navigator.NavigationBar.Styles,
    p = (d.General.TotalNavHeight, "android" === i.Platform.OS ? 25 : 0, a.FriendsNavigator = s["default"].createClass({
      displayName: "FriendsNavigator",
      getInitialState: function () {
        return this.routes = {
          friends: {
            id: "friends",
            name: (0, o.tr)("\u661f\u7a7a"),
            tabIndex: 2
          },
          bottleFriends: {
            id: "bottleFriends",
            name: (0, o.tr)("\u770b\u8fc7\u7684\u4eba")
          },
          shareFriends: {
            id: "shareFriends",
            name: (0, o.tr)("Replies")
          },
          groupCreate: {
            id: "groupCreate",
            name: (0, o.tr)("Create Group")
          },
          groupMembers: {
            id: "groupMembers",
            name: (0, o.tr)("Group Members")
          },
          addGroupMembers: {
            id: "addGroupMembers",
            name: (0, o.tr)("Add Group Members")
          },
          shareSelect: {
            id: "shareSelect",
            name: (0, o.tr)("Choose Send Target")
          },
          friendAccept: {
            id: "friendAccept",
            name: (0, o.tr)("Add Friend")
          },
          linkSend: {
            id: "linkSend",
            name: (0, o.tr)("Send Link")
          },
          sessionPicBoard: {
            id: "sessionPicBoard",
            name: (0, o.tr)("Photos and Videos")
          },
          contactsBoard: {
            id: "contactsBoard",
            name: (0, o.tr)("Contacts")
          },
          imagePicker: {
            name: (0, o.tr)("Image Picker"),
            id: "imagePicker"
          }
        }, this.changeDataCnt = 0, this.curRoute = this.routes.friends, this.userListData = [], this.isFoucusing = !1, this.resetSelectData(), {};
      },
      initShareSelectChangeData: function () {
        this.changeData = {
          id: this.changeDataCnt++,
          selects: o.apps.convertChangeDataTargets(o.apps.changeDataTargets),
          oldSelects: [],
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
            "Friends in this app": this.changeData ? this.changeData.listData["Friends in this app"] : []
          },
          listSections: ["Common Options", "Friends in this app"]
        };
      },
      dbIsReady: function () {
        this.changeData.selects = o.apps.convertChangeDataTargets(o.apps.changeDataTargets);
      },
      friendsDataLoaded: function () {
        this.changeData.listData["Friends in this app"] = o.apps.friendsData.filter(function (e) {
          return e.friendId === o.apps.userid ? !1 : ":" === e.friendId[1] ? ("2" === e.friendId[0], !1) : !0;
        });
      },
      resetSelectData: function () {
        this.selectData = {
          selects: [],
          listData: {
            Select: []
          },
          listSections: ["Select"]
        }, this.initShareSelectChangeData(), delete this.routes.shareSelect.targetChangeShare, o.apps.unon("friendsInputOnSend");
      },
      findGroupDiag: function () {
        var e = this,
          t = {
            header: (0, o.tr)("Find Group"),
            content: (0, o.tr)(""),
            textInputs: [{
              placeholder: (0, o.tr)("Group Name"),
              value: "",
              maxLength: 30
            }],
            buttons: [{
              text: (0, o.tr)("Cancel"),
              onPress: function (e) {
                return o.apps.closeDiag();
              }
            }, {
              text: (0, o.tr)("Ok"),
              onPress: function (t) {
                if (!t.isProgressing) {
                  var r = t.state.textInputs[0].value;
                  if ("" === r) return void t.setState({
                    infoTip: (0, o.tr)("Input cannot be empty")
                  });
                  t.progressing(!0), o.apps.send("findGroup", {
                    name: r
                  }).then(function (r) {
                    t.progressing(!1), r.notFind ? t.setState({
                      infoTip: (0, o.tr)("Group not exist")
                    }) : r.over ? t.setState({
                      infoTip: (0, o.tr)("Operation too frequently")
                    }) : r.userid && o.apps.closeDiag(function () {
                      return e.navi.navForward(o.apps.newRoute(e.routes, "space_", {
                        autoJoinGroup: !0,
                        friendId: r.userid,
                        name: (0, o.tr)("Space")
                      }));
                    });
                  })["catch"](function (e) {
                    t.progressing(!1), (0, o.tlog)("error", "findGroupDiag", e, r);
                  });
                }
              }
            }]
          };
        o.apps.diag(t);
      },
      navbarMappers: function () {
        var e = this;
        return {
          Title: function (e, t, r, a) {
            var n, i, d;
            return /^interact_/.test(e.id) ? (n = "user", i = e.friend.friendId) : /^(space_|about_)/.test(e.id) ? (n = "user", i = e.friendId) : (n = "text", d = e.name), s["default"].createElement(o.NavTitleView, {
              type: n,
              userid: i,
              text: d
            });
          },
          LeftButton: function (t, r, a, n) {
            if (0 !== a) {
              var i,
                d = function () {
                  i && i.setState({
                    cnt: o.apps.friendsUnreadList.length || 0
                  });
                };
              return s["default"].createElement(o.BackButton, {
                tag: "bottleFriends",
                ctx: e,
                cnt: o.apps.friendsUnreadList.length || 0,
                onMount: function (e) {
                  i = e, o.apps.on("friendsUnreadChanged", d);
                },
                onUnMount: function () {
                  o.apps.unon("friendsUnreadChanged", d);
                },
                onPress: function () {
                  e.navi.navBack();
                }
              });
            }
            return null;
          },
          RightButton: function (t, r, a, n) {
            if ("bottleFriends" === t.id) ;else {
              if ("friends" === t.id) return s["default"].createElement(i.TouchableOpacity, {
                style: {
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  width: 44,
                  height: 44
                },
                onPress: function () {
                  var t = function () {
                    o.apps.gFriendRemove2 = !o.apps.gFriendRemove2, o.apps.loadFriendsData(o.apps.userid), e.setState({});
                  };
                  t();
                }
              }, s["default"].createElement(o.Ionicons, {
                name: "ios-trash-outline",
                size: 26,
                color: o.apps.gFriendRemove2 ? o.theme.deepGreen : o.theme.lighta
              }));
              if (/^interact_/.test(t.id)) {
                var d = t.friend ? t.friend.friendId : t.friendId;
                return d.length > 5 ? s["default"].createElement(i.TouchableOpacity, {
                  style: p.navRightButton,
                  onPress: function () {
                    var r = t.friend ? t.friend.friendId : t.friendId,
                      a = o.apps.newRoute(e.routes, "about_", {
                        friendId: r,
                        name: (0, o.tr)("Profile")
                      });
                    e.routes.navi.navForward(a);
                  }
                }, s["default"].createElement(o.Ionicons, {
                  name: "ios-more",
                  style: {
                    paddingTop: 1
                  },
                  size: 30,
                  color: o.theme.deep8
                })) : null;
              }
              if (/^space_/.test(t.id)) return null;
              if (/^msgFriends_/.test(t.id)) return s["default"].createElement(i.TouchableOpacity, {
                style: p.navRightButton,
                onPress: function () {
                  var r = o.apps.newRoute(e.routes, "about_", {
                    friendId: t.userid,
                    name: (0, o.tr)("Profile")
                  });
                  e.routes.navi.navForward(r);
                }
              }, s["default"].createElement(o.Ionicons, {
                name: "ios-person-outline",
                style: {
                  paddingTop: 1
                },
                size: 30,
                color: o.theme.deep8
              }));
              if (/^about_/.test(t.id)) return null;
              if ("linkSend" === t.id) return s["default"].createElement(o.DoneButton, {
                disabled: !e.selectData.selects.length,
                tag: "linkSend",
                onPress: function () {
                  o.apps.emitOnce("friendsInputOnSend", e.selectData.selects, function () {
                    e.navi.navBack(), e.resetSelectData();
                  });
                },
                onDoneStateChanged: function (t) {
                  return t.setState({
                    disabled: !e.selectData.selects.length
                  });
                }
              });
              if ("groupCreate" === t.id) ;else if ("shareSelect" === t.id) ;else {
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
                  disabled: !e.selectData.selects.length,
                  tag: "addGroupMembers",
                  onPress: function () {
                    var r = t.friend.toId,
                      a = e.selectData.selects;
                    return 0 === a.length ? void o.apps.tip((0, o.tr)("Select at least one friend...")) : ((0, o.blog)(""), void o.apps.send("getGroupNum", {
                      groupId: r
                    }).then(function (t) {
                      (0, o.blog)(), t.num + a.length > o.apps.groupMemberLimit ? o.apps.tip((0, o.tr)("Group currently only support up to 500 group members")) : o.apps.diag({
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
                            t.isProgressing || (t.progressing(!0), o.apps.addGroupMembers(r, a).then(function () {
                              o.apps.closeDiag(), e.navi.navBack(), e.resetSelectData();
                            })["catch"](function (e) {
                              t.progressing(!1), t.setState({
                                infoTip: (0, o.tr)("Requesting Failed")
                              }), (0, o.tlog)("error", "DoneButton removeGroupMembers", e);
                            }));
                          }
                        }]
                      });
                    }));
                  },
                  onDoneStateChanged: function (t) {
                    return t.setState({
                      disabled: !e.selectData.selects.length
                    });
                  }
                });
              }
            }
          }
        };
      },
      onFriendsTabPressed: function () {
        var e = this;
        if (!this.isFoucusing && "friends" === o.apps.currentNavi && !(o.apps.vipExpD || o.apps.isForbided || o.apps.forbidExp)) {
          if (o.apps.bottleResponseMap.cnt) return void o.apps.navToBottleRes();
          var t, r;
          if ("friends" === o.apps.currentRoutes.friends.name) {
            if (r = o.apps.friendsUnreadList, o.apps.lastStaredId) {
              var a = this.userListData.findIndex(function (e) {
                  return e.friendId === o.apps.lastStaredId;
                }),
                n = this.userListData[a];
              n ? o.apps.removeLastStaredId(n.friendId) : (o.dbs.delUserProfile("lastStaredId"), o.apps.emit("friendsUnreadChanged"));
            }
            if (r && r.length > 0) {
              var s = r[r.length - 1],
                i = s.msgid,
                d = s.shareId,
                p = s.type,
                u = s.time,
                c = s.category,
                l = s.text,
                f = s.userid,
                m = s.fromId,
                g = s.toId,
                h = s.shareFrom,
                v = s.ftype,
                I = s.atime,
                F = s.utab;
              if ("2:" === g.slice(0, 2)) var w = g;else w = ":" === f[1] ? f : m;
              t = {
                msgid: i,
                shareId: d,
                descType: p,
                time: u,
                descCategory: c,
                userid: o.apps.userid,
                desc: l,
                friendId: w,
                fromId: m,
                toId: g,
                shareFrom: h,
                type: v,
                atime: I,
                utab: F
              }, "3:" === f.slice(0, 2) && (t.clearMsgFriendId = f);
              o.apps.getFid(g, m, d);
              o.apps.lastFriendsTabCb = function (r) {
                var a = o.apps.newRoute(e.routes, "interact_", {
                  friend: t,
                  name: (0, o.tr)("Message")
                });
                if (e.routes.groupMembers.friend = t, e.routes.addGroupMembers.friend = t, e.routes.friendAccept.friend = t, 4 === t.descCategory || "2:" === t.friendId.slice(0, 2)) e.navi.navForward(a);else if (5 === t.descCategory) e.navi.navForward(e.routes.friendAccept);else if (7 === t.descCategory) "2:" === t.friendId.slice(0, 2) ? e.navi.navForward(e.routes.groupMembers) : e.navi.navForward(o.apps.newRoute(e.routes, "followers_", {
                  type: 2,
                  friend: t,
                  name: (0, o.tr)("Followers")
                }));else if (4 === c) e.navi.navForward(o.apps.newRoute(e.routes, "interact_", {
                  friend: t,
                  name: (0, o.tr)("Message")
                }));else if (3 === c) {
                  var n = t,
                    s = n.toId,
                    i = n.fromId,
                    d = n.friendId,
                    p = i === o.apps.userid ? s : i;
                  if (p !== d) {
                    var u = new Error();
                    (0, o.tlog)("error", "FriendsNavigator onFriendsTabPressed", t, u), o.apps.send("clientFatalLog", {
                      msg: u.message,
                      stack: u.stack
                    })["catch"](function (e) {
                      (0, o.tlog)("error", "FriendsNavigator onFriendsTabPressed", e);
                    }), d = p;
                  }
                  if (d === o.apps.curDropFriendId && !r) return;
                  var l = d < o.apps.userid ? d + ":" + o.apps.userid : o.apps.userid + ":" + d;
                  t.descCategory = 3, t.shareFrom = l, t.shareId = l, e.navi.navForward(o.apps.newRoute(e.routes, "interact_", {
                    friend: t,
                    name: (0, o.tr)("Message")
                  }));
                } else "7:" === g.slice(0, 2) ? e.navi.navForward(o.apps.newRoute(e.routes, "interact_", {
                  friend: {
                    friendId: "7:" + o.apps.userid
                  },
                  name: (0, o.tr)("Message")
                })) : 1 === c && ":" !== t.friendId[1] ? e.navi.navForward(o.apps.newRoute(e.routes, "space_", {
                  friendId: t.friendId,
                  name: (0, o.tr)("Space")
                })) : e.navi.navForward(o.apps.newRoute(e.routes, "space_", {
                  friendId: t.friendId,
                  name: (0, o.tr)("Space")
                }));
              }, o.apps.lastFriendsTabCb(!0);
            } else o.apps.lastFriendsTabCb ? o.apps.lastFriendsTabCb() : this.userListData[0] && (t = this.userListData[0], this.routes.friendAccept.friend = t, this.routes.groupMembers.friend = t, this.routes.addGroupMembers.friend = t, o.apps.isIn(t.descCategory, 3, 4) ? this.navi.navForward(o.apps.newRoute(this.routes, "interact_", {
              friend: t,
              name: (0, o.tr)("Message")
            })) : 5 === t.descCategory && this.navi.navForward(this.routes.friendAccept));
          } else if (/^space_/.test(o.apps.currentRoutes.friends.name)) {
            if (r = o.apps.friendsUnread[o.apps.currentRoutes.friends.userid], r && (r = r.filter(function (e) {
              return !o.apps.isIn(e.category, o.apps.CONS_MSG_CAT_SHARE, o.apps.CONS_MSG_CAT_NEW_FOLLOWED, o.apps.CONS_MSG_CAT_NEW_FOLLOW);
            })), r && r.length > 0) {
              var b = r[r.length - 1],
                S = b.msgid,
                y = b.shareId,
                R = b.type,
                C = b.time,
                M = b.category,
                T = b.text,
                D = b.userid,
                L = b.fromId,
                _ = b.toId,
                P = b.shareFrom,
                V = b.ftype,
                N = b.atime,
                E = b.utab,
                k = D;
              if ("3:" === D.slice(0, 2) && (t.clearMsgFriendId = D, k = L), t = {
                msgid: S,
                shareId: y,
                descType: R,
                time: C,
                descCategory: M,
                userid: D,
                desc: T,
                friendId: k,
                fromId: L,
                toId: _,
                shareFrom: P,
                type: V,
                atime: N,
                utab: E
              }, k === o.apps.userid || ":" === k[1]) for (var B = r.length - 2; B >= 0; --B) {
                var x = r[B];
                if (x.shareId !== y || x.fromId !== L) {
                  this.routes.msgFriendId = D;
                  break;
                }
              }
              "8:" === k.slice(0, 2) && (t.friendId = L), o.apps.lastFriendsTabCb = function () {
                if (e.routes.msgFriendId) e.routes.navi.navForward(o.apps.newRoute(e.routes, "msgFriends_", {
                  userid: e.routes.msgFriendId,
                  name: (0, o.tr)("Reply History")
                }));else {
                  var r = o.apps.newRoute(e.routes, "interact_", {
                    friend: t,
                    name: (0, o.tr)("Message")
                  });
                  o.apps.currentRoutes.friends.name = r.id, o.apps.currentRoutes.friends.shareId = t.shareId, e.navi.navForward(r);
                }
              }, o.apps.lastFriendsTabCb();
            } else this.navi.navBack();
          } else o.apps.currentRoutes.friends.name in {
            groupCreate: 1,
            groupMembers: 1,
            addGroupMembers: 1,
            linkSend: 1,
            contactsBoard: 1,
            shareSelect: 1
          } && this.resetSelectData(), this.navi.navBack();
        }
      },
      notificationPermissionChanged: function () {
        this.forceUpdate(), o.apps.permissions.notification && o.apps.preparePushNotification()["catch"](function (e) {
          return (0, o.tlog)("error", "preparePushNotification", e);
        });
      },
      friendNumberReady: function () {},
      onDidFocusCb: function () {
        o.apps.emitOnce("friendsNavigatorDidFocus");
      },
      addDidFocusCallback: function (e) {
        o.apps.on("friendsNavigatorDidFocus", e);
      },
      componentDidMount: function () {
        o.apps.on("friendsTabPressed", this.onFriendsTabPressed), o.apps.on("notificationPermissionChanged", this.notificationPermissionChanged), o.apps.on("friendNumberReady", this.friendNumberReady), o.apps.on("friendsDataLoaded", this.friendsDataLoaded), o.apps.on("dbIsReady", this.dbIsReady);
      },
      componentWillUnmount: function () {
        o.apps.unon("friendsTabPressed", this.onFriendsTabPressed), o.apps.unon("notificationPermissionChanged", this.notificationPermissionChanged), o.apps.unon("friendNumberReady"), o.apps.unon("friendsDataLoaded", this.friendsDataLoaded), o.apps.unon("dbIsReady", this.dbIsReady);
      },
      render: function () {
        var e = this;
        return s["default"].createElement(o.MyNavigator, babelHelpers["extends"]({}, this.props, {
          ref: function (t) {
            e.navi = t, e.routes.navi = t;
          },
          renderSceneContent: this.renderSceneContent,
          initialRoute: this.curRoute,
          navbarMappers: this.navbarMappers(),
          onDidFocus: function (t, r) {
            if (e.isFoucusing = !1, o.apps.unlock("navIsTrans"), o.apps.clearInputPanel(), o.apps.emit("stopAudioRecord"), e.onDidFocusCb(), r.prevRoute && "imagePicker" === r.prevRoute.id && (o.apps.unon("imagePicked"), o.apps.modelViewRef.unHide()), "friends" !== t.id ? o.apps.views.mainTabView && o.apps.views.mainTabView.show(!1) : o.apps.views.mainTabView && o.apps.views.mainTabView.show(!0), "bottleFriends" === t.id) o.apps.loadFriendsDataAsync("3:" + o.apps.userid), o.apps.shouldReloadFriends && (delete o.apps.shouldReloadFriends, o.apps.loadFriendsDataAsync(o.apps.userid));else if ("friends" === t.id) o.apps.isInWelcomeNavi ? (o.apps.loadFriendsDataAsync(), o.apps.emit("friendsUnreadChanged"), o.apps.emit("launchMySpaceNav"), o.apps.launchMySpaceNavEmitted = !0, o.apps.bottleResLoop()) : o.apps.quickLaunch ? (o.apps.quickLaunch = !1, o.apps.dataLaunch().then(function () {
              o.apps.emitOnce("quickStartFinished"), o.apps.loadFriendsDataAsync(), o.apps.pubid || (o.apps.pubid = o.apps.userid), o.apps.normalLaunch()["catch"](function (e) {
                return (0, o.tlog)("error", "quickLaunch normalLaunch", e);
              }), o.apps.bottleResLoop(), o.apps.shaSS && (o.dbs.delUserProfile("shaSS")["catch"](function (e) {
                return (0, o.tlog)("error", "run shaSS", e);
              }), o.apps.runPurchase()), o.apps.emit("launchMySpaceNav"), o.apps.launchMySpaceNavEmitted = !0, o.apps.loadAboutMeFirst ? (o.apps.delSharedParas("loadAboutMeFirst")["catch"](function (e) {
                return (0, o.tlog)("error", "del loadAboutMeFirst", e);
              }), o.apps.curNavigator = o.apps.aboutMeNavigator, o.apps.emit("switchMainTab", {
                friendsNavFlex: 0,
                mySpaceNavFlex: 0,
                aboutMeNavFlex: 1
              }, function () {}), o.apps.emit("launchAboutMeNav"), o.apps.launchAboutMeNavEmitted = !0, o.apps.currentNavi = "aboutMe") : o.apps.loadMySpaceFirst && (o.dbs.delUserProfile("loadMySpaceFirst")["catch"](function (e) {
                return (0, o.tlog)("error", "del loadMySpaceFirst", e);
              }), o.apps.curNavigator = o.apps.mySpaceNavigator, o.apps.emit("switchMainTab", {
                friendsNavFlex: 0,
                mySpaceNavFlex: 1,
                aboutMeNavFlex: 0
              }, function () {
                o.apps.emit("mySpaceTabSwitched");
              }), o.apps.currentNavi = "mySpace"), o.apps.defaultBackgroundImageBlur !== o.apps.backgroundImageBlur && o.apps.emit("backgroundImageBlurChanged");
            })["catch"](function (e) {
              (0, o.tlog)("error", "quickLaunch", e);
            })) : (o.apps.loadFriendsDataAsync(), o.apps.clearDeletedMsgs(), o.apps.clearDeletedShares(), o.apps.emit("friendsUnreadChanged"));else if (/^interact_/.test(t.id)) {
              var a = t.friend,
                n = a.shareId,
                s = a.fromId,
                i = a.toId;
              a.category;
              if (n) {
                var d = o.apps.getFid(i, s, n);
                e.interactFid = d, o.apps.emit("interactViewDidFocus_" + d), o.apps.emit("myInputViewMoveToHigh"), o.apps.newCreatedGroups[t.friendId] && (delete o.apps.newCreatedGroups[t.friendId], o.apps.diag({
                  header: (0, o.tr)("Tip"),
                  content: (0, o.tr)("Will you add members to this new created group?"),
                  buttons: [{
                    text: (0, o.tr)("Cancel"),
                    onPress: function () {
                      return o.apps.closeDiag();
                    }
                  }, {
                    text: (0, o.tr)("Ok"),
                    onPress: function () {
                      o.apps.closeDiag(function () {
                        e.routes.addGroupMembers.friendId = t.friendId, e.routes.navi.navForward(o.apps.curNavigator.routes.addGroupMembers);
                      });
                    }
                  }]
                })), o.apps.myInputViewRef.changePlaceHolder();
              }
            } else if (/^space_/.test(t.id)) {
              if (e.routes.msgFriendId && (delete e.routes.msgFriendId, o.apps.emit("rerenderSharesData_" + t.friendId)), o.apps.clearDeletedMsgs(), o.apps.emit("spaceViewDidFocus_" + t.friendId), o.apps.removeFriendsShareUnread(t.friendId), o.apps.emit("friendsUnreadChanged"), o.apps.reportShareNav) {
                var p;
                !function () {
                  var e = o.apps.reportShareNav;
                  delete o.apps.reportShareNav;
                  var t = e.rtime,
                    r = e.fromId,
                    a = e.shareId;
                  o.apps.send("delReport", {
                    rtime: t,
                    fromId: r
                  })["catch"](function (t) {
                    return (0, o.tlog)("error", "nav delReport", e, t);
                  });
                  var n = "4:" + o.apps.userid;
                  p = o.apps.sharesData[n], p && (o.apps.sharesData[n] = p.filter(function (e) {
                    return e.shareId !== a;
                  }), o.apps.emit("rerenderSharesData_" + n));
                }();
              }
              o.apps.myInputViewRef && o.apps.myInputViewRef.changePlaceHolder((0, o.tr)("What's your story?"));
            } else "linkSend" === t.id ? o.apps.emit("selectViewLoaded_linkSend") : /^followers_/.test(t.id) ? o.apps.emit("selectViewLoaded_followers") : "shareSelect" === t.id ? o.apps.emit("selectViewLoaded_shareSelect") : "groupCreate" === t.id ? o.apps.emit("selectViewLoaded_groupCreate") : "groupMembers" === t.id ? o.apps.emit("selectViewLoaded_groupMembers") : "addGroupMembers" === t.id ? o.apps.emit("selectViewLoaded_addGroupMembers") : "friendAccept" === t.id ? (o.apps.removeFriendsMsgUnread(t.friend.friendId, "friendAccept"), delete o.apps.lastFriendsTabCb) : /^about_/.test(t.id) ? o.apps.emit("aboutMeViewLoaded_" + t.friendId, e.curRouteGroupId) : "sessionPicBoard" === t.id ? o.apps.emit("sessionPicBoardViewLoaded_" + o.apps.curSessionId) : "contactsBoard" === t.id ? o.apps.emit("selectViewLoaded_contactsBoard") : "shareFriends" === t.id ? o.apps.loadShareFriendsData(t.shareId)["catch"]((0, o.errCb)("loadShareFriendsData")) : /^msgFriends_/.test(t.id) && o.apps.loadMsgFriendsData(t.userid)["catch"](function (e) {
              (0, o.tlog)("error", "friendNavi loadMsgFriendsData", t.userid, e);
            });
          },
          navBackCallback: function (t) {
            t.prevRoute && "imagePicker" === t.prevRoute.id && (o.apps.notCloseImagePickerDiag ? delete o.apps.notCloseImagePickerDiag : o.apps.modelViewRef.state.showModelView && !o.apps.modelViewRef.locking && o.apps.closeDiag()), 1 === t.routeList.length && (delete o.apps.bottleResLock, delete e.curRouteGroupId, delete o.apps.gFriendRemove2, delete o.apps.isInBottleMsg, o.apps.emit("nullInputBoardTab", !1), o.apps.groupMembers = {}, o.apps.addBottleAlert()), o.apps.popNaviSwitch("friends"), /^followers_/.test(t.prevRoute.id) && 2 === t.prevRoute.type && o.apps.removeNewFollowersUnread()["catch"](function (e) {
              (0, o.tlog)("error", "friendsNavi removeNewFollowersUnread", e);
            }), "bottleFriends" === t.prevRoute.id && delete o.apps.bottleFriendsRoute, t.prevRoute.id in {
              groupCreate: 1,
              groupMembers: 1,
              addGroupMembers: 1,
              linkSend: 1,
              contactsBoard: 1,
              shareSelect: 1
            } && e.resetSelectData(), o.apps.deleteRoute(e.routes, t.prevRoute), o.apps.clearTmpSharesCb && o.apps.clearTmpSharesCb();
          },
          onWillFocus: function (t) {
            if (e.curRoute = t, t) {
              if (e.isFoucusing = !0, o.apps.lock("navIsTrans"), e.interactFid && (o.apps.emit("leaveInteractFocus_" + e.interactFid), delete e.interactFid), /^space_/.test(t.id)) o.apps.currentRoutes.friends.name = t.id, o.apps.currentRoutes.friends.userid = t.friendId, o.apps.currentRoutes.friends.shareId = "", "6:" === t.friendId.slice(0, 2) && (o.apps.isInStock = !0), o.apps.emit("myInputViewMoveToLow");else if (/^interact_/.test(t.id)) {
                o.apps.currentRoutes.friends.name = t.id;
                var r = t.friend.shareId;
                o.apps.currentRoutes.friends.shareId = r, o.apps.currentRoutes.friends.uid = r;
                var a = o.apps.getRealFriendId(t.friend);
                o.apps.currentRoutes.friends.userid = a, o.apps.currentRoutes.friends.fid = o.apps.getFid(o.apps.userid, a, r);
                var n = a.slice(0, 2);
                "7:" === n && (o.apps.isInStock = !0), "2:" === n && (e.curRouteGroupId = a);
              } else "friends" === t.id ? (o.apps.currentRoutes.friends.name = "friends", o.apps.currentRoutes.friends.userid = o.apps.userid, o.apps.currentRoutes.friends.shareId = "", o.apps.currentRoutes.friends.uid = o.apps.userid, o.apps.emit("myInputViewMoveToLow"), delete o.apps.isInStock) : "aboutMe" === t.id ? (o.apps.currentRoutes.friends.name = "aboutMe", o.apps.emit("myInputViewMoveToLow")) : /^about_/.test(t.id) ? (o.apps.currentRoutes.friends.name = t.id, o.apps.emit("myInputViewMoveToLow")) : "linkSend" === t.id ? (o.apps.currentRoutes.friends.name = "linkSend", o.apps.emit("myInputViewMoveToLow")) : /^followers_/.test(t.id) ? (o.apps.currentRoutes.friends.name = "followers", o.apps.emit("myInputViewMoveToLow")) : "groupCreate" === t.id ? (o.apps.currentRoutes.friends.name = "groupCreate", o.apps.emit("myInputViewMoveToLow")) : "shareSelect" === t.id ? (o.apps.currentRoutes.friends.name = "shareSelect", o.apps.emit("myInputViewMoveToLow")) : "groupMembers" === t.id ? (e.curRouteGroupId = t.friendId || t.friend.friendId, o.apps.currentRoutes.friends.name = "groupMembers", o.apps.emit("myInputViewMoveToLow")) : "addGroupMembers" === t.id ? (o.apps.currentRoutes.friends.name = "addGroupMembers", o.apps.emit("myInputViewMoveToLow")) : "friendAccept" === t.id ? (o.apps.currentRoutes.friends.name = "friendAccept", o.apps.emit("myInputViewMoveToLow")) : "sessionPicBoard" === t.id ? (o.apps.currentRoutes.friends.name = "sessionPicBoard", o.apps.emit("myInputViewMoveToLow")) : "contactsBoard" === t.id ? (o.apps.currentRoutes.friends.name = "contactsBoard", o.apps.emit("myInputViewMoveToLow")) : "shareFriends" === t.id ? (o.apps.currentRoutes.friends.name = "shareFriends", o.apps.currentRoutes.friends.userid = o.apps.userid, o.apps.currentRoutes.friends.shareId = t.shareId, o.apps.currentRoutes.friends.uid = t.shareId, o.apps.emit("myInputViewMoveToLow")) : /^msgFriends_/.test(t.id) ? (o.apps.currentRoutes.friends.name = t.id, o.apps.currentRoutes.friends.userid = t.userid, o.apps.currentRoutes.friends.uid = t.userid, o.apps.emit("myInputViewMoveToLow")) : "bottleFriends" === t.id && (o.apps.bottleFriendsRoute || (o.apps.bottleFriendsRoute = t), o.apps.currentRoutes.mySpace.name = "bottleFriends", o.apps.currentRoutes.mySpace.userid = "3:" + o.apps.userid, o.apps.currentRoutes.mySpace.shareId = "", o.apps.currentRoutes.mySpace.uid = "3:" + o.apps.userid, o.apps.emit("myInputViewMoveToLow"));
            } else (0, o.tlog)("route error");
          }
        }));
      },
      navToFriend: function (e) {
        var t = this;
        if (e.friendId === o.apps.USERID_RES) return void o.apps.navToBottleRes();
        o.apps.lastStaredId === e.friendId && o.apps.removeLastStaredId(e.friendId);
        var r = e,
          a = o.apps.friendsUnread[e.friendId],
          n = e.friendId,
          s = a && a.length > 0;
        if (s) {
          var i = a[a.length - 1],
            d = i.msgid,
            p = i.shareId,
            u = i.type,
            c = i.time,
            l = i.category,
            f = i.text,
            n = i.userid,
            m = i.fromId,
            g = i.toId,
            h = i.shareFrom,
            v = i.ftype,
            I = i.atime,
            F = 2 === l && h === o.apps.userid ? h : n;
          "3:" === n.slice(0, 2) && (F = n), e = {
            msgid: d,
            shareId: p,
            descType: u,
            time: c,
            descCategory: l,
            userid: r.userid,
            desc: f,
            friendId: F,
            fromId: m,
            toId: g,
            shareFrom: h,
            type: v,
            atime: I
          }, "3:" === n.slice(0, 2) && (e.clearMsgFriendId = n);
          o.apps.getFid(g, m, p);
        }
        o.apps.lastFriendsTabCb = function () {
          if (t.routes.groupMembers.friend = r, t.routes.addGroupMembers.friend = r, t.routes.friendAccept.friend = e, 7 === e.descCategory) "2:" === e.friendId.slice(0, 2) ? t.navi.navForward(t.routes.groupMembers) : t.navi.navForward(o.apps.newRoute(t.routes, "followers_", {
            type: 2,
            friend: e,
            name: (0, o.tr)("Followers")
          }));else if (5 === e.descCategory) t.navi.navForward(t.routes.friendAccept);else if (1 === l && ":" !== e.friendId[1]) t.navi.navForward(o.apps.newRoute(t.routes, "space_", {
            friendId: e.friendId,
            name: (0, o.tr)("Space")
          }));else {
            var a = e.friendId.slice(0, 2);
            if ("2:" === a) t.navi.navForward(o.apps.newRoute(t.routes, "interact_", {
              friend: e,
              name: (0, o.tr)("Message")
            }));else if ("7:" === a) t.navi.navForward(o.apps.newRoute(t.routes, "interact_", {
              friend: {
                friendId: "7:" + o.apps.userid
              },
              name: (0, o.tr)("Message")
            }));else if (":" === e.friendId[1]) t.navi.navForward(o.apps.newRoute(t.routes, "space_", {
              friendId: n,
              name: (0, o.tr)("Space")
            }));else {
              var s = e,
                i = s.toId,
                d = s.fromId,
                p = s.friendId,
                u = d === o.apps.userid ? i : d;
              if (u !== p) {
                var c = new Error();
                (0, o.tlog)("error", "FriendsNavigator navToFriend", e, c), o.apps.send("clientFatalLog", {
                  msg: c.message,
                  stack: c.stack
                })["catch"](function (e) {
                  (0, o.tlog)("error", "FriendsNavigator navToFriend", e);
                }), p = u;
              }
              if (p === o.apps.curDropFriendId) return;
              var f = p < o.apps.userid ? p + ":" + o.apps.userid : o.apps.userid + ":" + p;
              e.descCategory = 3, e.shareFrom = f, e.shareId = f, t.navi.navForward(o.apps.newRoute(t.routes, "interact_", {
                friend: e,
                name: (0, o.tr)("Message")
              }));
            }
          }
        }, o.apps.lastFriendsTabCb();
      },
      renderSceneContent: function (e, t) {
        var r = this;
        if ("friends" === e.id) return s["default"].createElement(o.UserListView, {
          tab: "friends",
          uid: o.apps.userid,
          type: "friends",
          iType: "friends",
          onListDataChanged: function (e) {
            return r.userListData = e;
          },
          route: e,
          mainTab: !0,
          naviToContacts: function () {
            return r.navi.navForward(r.routes.contactsBoard, function () {
              return i.Navigator.SceneConfigs.VerticalUpSwipeJump;
            });
          },
          renderFooter: function (e) {
            return s["default"].createElement(i.View, {
              style: {
                height: 35
              }
            });
          },
          onLongPressRowContent: function (e) {
            var t = e.friendId.slice(0, 2);
            if (e.friendId !== o.apps.userid && t !== o.apps.CONS_PREFIX_BOTTLE) {
              var r = [[e.pin ? (0, o.tr)("Unpin on Top") : (0, o.tr)("Pin on Top"), function () {
                (0, o.blog)(""), (e.pin ? o.apps.unpinOnTop : o.apps.pinOnTop)(e.friendId, e.userid).then(function () {
                  (0, o.blog)(), o.apps.emit("closeContextMenu");
                })["catch"](function (e) {
                  (0, o.tlog)("error", "stickOnTop", e), (0, o.blog)(), o.apps.emit("closeContextMenu");
                });
              }], [(0, o.tr)("Remove"), function () {
                o.apps.emit("closeContextMenu", function () {
                  o.apps.removeFriend(e.friendId, e.userid);
                });
              }]];
              e.pin > 1 && r.shift(), o.apps.showCmdBall && (r = r.concat(o.apps.fetchMenu)), o.apps.emit("contextMenu", r);
            }
          },
          onPressRowContent: function (e) {
            r.navToFriend(e);
          }
        });
        if ("shareFriends" === e.id) return s["default"].createElement(o.UserListView, {
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
          onLongPressRowContent: function (e) {
            o.apps.emit("contextMenu", [[(0, o.tr)("Profile"), function () {
              o.apps.emit("closeContextMenu", function () {
                r.routes.navi.navForward(o.apps.newRoute(r.routes, "about_", {
                  friendId: e.friendId,
                  name: (0, o.tr)("Profile")
                }));
              });
            }]]);
          },
          onPressRowContent: function (e) {
            o.apps.lastFriendsTabCb = function () {
              e.isShareFriendStock = !0, r.navi.navForward(o.apps.newRoute(r.routes, "interact_", {
                friend: e
              }));
            }, o.apps.lastFriendsTabCb();
          }
        });
        if ("bottleFriends" === e.id) return s["default"].createElement(o.UserListView, {
          tab: "friends",
          routes: this.routes,
          uid: "3:" + o.apps.userid,
          type: "bottleFriends",
          iType: "bottleFriends",
          onListDataChanged: function (e) {
            return r.userListData = e;
          },
          route: e,
          renderFooter: function (e) {
            return s["default"].createElement(i.View, {
              style: {
                height: 110
              }
            });
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
            o.apps.popFriendPickedDiag(e);
          }
        });
        if (/^msgFriends_/.test(e.id)) return s["default"].createElement(o.UserListView, {
          tab: "friends",
          uid: e.userid,
          type: "msgFriends_" + e.userid,
          route: e,
          onListDataChanged: function (e) {},
          onLongPressRowContent: function (e) {
            o.apps.emit("contextMenu", [[(0, o.tr)("Profile"), function () {
              o.apps.emit("closeContextMenu", function () {
                r.routes.navi.navForward(o.apps.newRoute(r.routes, "about_", {
                  friendId: e.friendId,
                  name: (0, o.tr)("Profile")
                }));
              });
            }]]);
          },
          onPressRowContent: function (e) {
            o.apps.lastFriendsTabCb = function () {
              r.navi.navForward(o.apps.newRoute(r.routes, "interact_", {
                friend: e,
                msgFriends: 1
              }));
            }, o.apps.lastFriendsTabCb();
          }
        });
        if (/^interact_/.test(e.id)) return e.friend ? s["default"].createElement(o.InteractView, {
          route: e,
          friend: e.friend,
          tab: "friends",
          iType: e.id,
          routes: this.routes
        }) : null;
        if (/^space_/.test(e.id)) {
          var a = e.friendId;
          return s["default"].createElement(o.SpaceView, {
            ref: function (e) {
              return r.spaceView = e;
            },
            fromId: o.apps.userid,
            toId: a,
            friendId: a,
            friendType: "2:" === a.slice(0, 2) ? 2 : 1,
            tab: "friends",
            spaceName: e.id,
            routes: this.routes,
            route: e
          });
        }
        if (/^about_/.test(e.id)) return s["default"].createElement(o.AboutMeView, {
          tab: "friends",
          userid: e.friendId
        });
        if ("groupCreate" === e.id) return this.selectData.listData.Select = [], s["default"].createElement(o.SelectView, {
          tag: "groupCreate",
          section: !0,
          renderHeaderButtonTip: function () {
            return s["default"].createElement(i.TouchableOpacity, {
              style: {
                backgroundColor: "rgba(0,0,0,0.03)",
                paddingHorizontal: 5,
                borderRadius: 5
              }
            }, s["default"].createElement(o.MyTextView, {
              myTextValue: (0, o.tr)("## friends currently", o.apps.friendNumber),
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
          selectData: this.selectData
        });
        if ("addGroupMembers" === e.id) return s["default"].createElement(o.SelectView, {
          tag: "addGroupMembers",
          section: !0,
          selectData: this.selectData,
          showHeaderBtn: !0,
          renderHeaderButtonTip: function () {
            return 0 === o.apps.friendNumber ? s["default"].createElement(i.TouchableOpacity, {
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
            })) : null;
          },
          onSelectViewLoaded: function (t, r) {
            Promise.all([o.apps.loadGroupMembers(e.friendId)]).then(function (e) {
              var t = e[0].members,
                a = e[1],
                n = {};
              t.forEach(function (e) {
                return n[e.friendId] = 1;
              });
              var s = [];
              a.forEach(function (e) {
                n[e] || s.push({
                  type: 1,
                  friendId: e
                });
              }), r({
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
          onSelectViewLoaded: function (t, r) {
            o.apps.loadGroupMembers(e.friendId).then(function (e) {
              var t = e.members;
              r({
                listData: {
                  Select: t
                },
                listSections: ["Select"]
              });
            })["catch"]((0, o.errCb)("onSelectViewLoaded"));
          },
          onRowToggle: function (e) {
            var t = o.apps.newRoute(r.routes, "about_", {
              friendId: e.props.data.friendId,
              name: (0, o.tr)("Profile")
            });
            return r.routes.navi.navForward(t), !0;
          }
        });
        if (/^followers_/.test(e.id)) return s["default"].createElement(o.SelectView, {
          tag: "followers",
          noSearch: !0,
          markColor: o.theme.warn,
          selectData: this.selectData,
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
          onEndReached: function (t, r) {
            o.apps.loadFollowers(e.type, o.apps.getLastFollowerTime(e.type), e.userid).then(function (t) {
              var a = t.followers;
              r({
                listData: {
                  Select: o.apps.catFollowers(e.type, a)
                },
                listSections: ["Select"]
              });
            })["catch"](function (e) {
              (0, o.tlog)("error", "friendsNavi onEndReached", e);
            });
          },
          onSelectViewLoaded: function (t, r) {
            return 0 !== o.apps.getFollowers(e.type).length ? void r({
              listData: {
                Select: o.apps.catFollowers(e.type, [])
              },
              listSections: ["Select"]
            }) : (2 === e.type && o.apps.followers.length > 0 && (o.apps.firstFollowerTime = o.apps.followers[0].time), void o.apps.loadFollowers(e.type, o.apps.getLastFollowerTime(e.type), e.userid).then(function (t) {
              var a = t.followers;
              r({
                listData: {
                  Select: o.apps.catFollowers(e.type, a)
                },
                listSections: ["Select"]
              });
            })["catch"](function (e) {
              (0, o.tlog)("error", "friendsNavi onSelectViewLoaded", e);
            }));
          },
          onUnmount: function (t) {
            (o.apps.getFollowers(e.type).length > 200 || e.userid) && o.apps.setFollowers(e.type, []);
          },
          onRowToggle: function (t) {
            if (e.userid) {
              var a = o.apps.newRoute(r.routes, "interact_", {
                  name: (0, o.tr)("Message")
                }),
                n = e.userid,
                s = t.props.data.friendId,
                i = o.apps.getChatSession(n, s);
              a.friend = {
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
              }, r.navi.navForward(a);
            } else r.navi.navForward(o.apps.newRoute(r.routes, "about_", {
              friendId: t.props.data.friendId,
              name: (0, o.tr)("Profile")
            }));
            return !0;
          }
        });
        if ("contactsBoard" === e.id) ;else {
          if ("friendAccept" === e.id) return s["default"].createElement(o.FriendAcceptView, {
            friend: e.friend,
            onRefuse: function (t) {
              o.apps.ignoreFriendRequest(e.friend.friendId).then(function () {
                return r.navi.navBack();
              })["catch"](function (e) {
                (0, o.tlog)("error", "refuseFriendAdd", e), t();
              });
            },
            onAccept: function (t) {
              var a = e.friend.friendId;
              o.apps.send("acceptFriendAdd", {
                friendId: a
              }).then(function (e) {
                var t = e.chatId,
                  n = e.name,
                  s = e.fword;
                return o.apps.saveFriends([{
                  friendId: a,
                  desc: (0, o.tr)("New Friend"),
                  chatId: t,
                  name: n,
                  fword: s
                }]).then(function () {
                  r.navi.navBack();
                });
              })["catch"](function (e) {
                (0, o.tlog)("error", "acceptFriendAdd", e), t();
              });
            }
          });
          if ("linkSend" === e.id) return this.selectData.listData.Select = o.apps.friendsData.filter(function (e) {
            return 1 === e.type || 2 === e.type;
          }), s["default"].createElement(o.SelectView, {
            tag: "linkSend",
            section: !0,
            selectData: this.selectData
          });
          if ("sessionPicBoard" === e.id) return s["default"].createElement(o.SessionPicBoard, null);
          if ("imagePicker" === e.id) return s["default"].createElement(o.MemTest, null);
          if ("shareSelect" === e.id && e.targetChangeShare) return s["default"].createElement(o.SelectView, {
            firstShare: "me" === e.targetChangeShare.target[0],
            target: e.targetChangeShare.target,
            renderHeaderButtonTip: function (e) {
              return s["default"].createElement(i.View, {
                style: {
                  justifyContent: "center",
                  alignItems: "center"
                }
              }, s["default"].createElement(i.TouchableOpacity, {
                style: {
                  backgroundColor: o.theme.deepGreen2Trans6,
                  marginBottom: 5,
                  paddingVertical: 3,
                  paddingHorizontal: 10,
                  borderRadius: 10
                },
                onPress: function () {
                  e.setState({
                    showHeaderBtn: !1
                  });
                  var t = [];
                  e.selectData.selects.forEach(function (e) {
                    e.type === o.apps.CONS_SEL_ALL ? t.push("all") : e.type === o.apps.CONS_SEL_FRIEND || e.type === o.apps.CONS_SEL_GROUP ? t.push(e.friendId) : e.type === o.apps.CONS_SEL_STRANGER && t.push("rand");
                  }), o.dbs.setUserProfile({
                    changeDataTargets: t
                  })["catch"](function (e) {
                    return (0, o.tlog)("error", "changeDataTargets", t, e);
                  });
                }
              }, s["default"].createElement(o.MyTextView, {
                myTextValue: (0, o.tr)("Set current targets as default"),
                imageFontSize: 12,
                adjustsFontSizeToFit: !0,
                style: {
                  fontSize: 12,
                  color: o.theme.white,
                  paddingTop: 1,
                  paddingBottom: 1,
                  textAlign: "center"
                }
              })));
            },
            onRowToggle: function (e, t) {
              t.setState({
                showHeaderBtn: !0
              });
            },
            isChangeView: !0,
            tag: "shareSelect",
            selectData: this.changeData
          });
        }
      }
    }), {
      navRightButton: [{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: 44,
        height: 44
      }, o.theme.isIphoneX && {}],
      navRightText: {
        fontSize: 13,
        color: o.theme.deep8
      },
      friendViewContainer: {
        backgroundColor: o.theme.light,
        flex: 1
      }
    });
});
