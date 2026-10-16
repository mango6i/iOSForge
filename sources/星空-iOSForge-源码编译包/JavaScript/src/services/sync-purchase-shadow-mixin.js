// Free maintenance changes; original factory retained under reference/original-modules/318.js.
__d(318, function (e, t, n, r) {
  var __recoveryFreePolicy = t(9000);
  var i = t(311),
    o = babelHelpers.interopRequireDefault(i),
    a = t(312),
    s = t(314),
    u = t(319);
  t(314);
  n.exports = function (e) {
    e.loadMsgsData = function (t, n, r, i) {
      var o = (t.shareFrom, t.descCategory);
      return e.isLocking("isHandlingUnread") ? void e.addLockCb("isHandlingUnread", function () {
        return e.loadMsgsData(t, n, r, i);
      }) : e.isLocking("navIsTrans") ? void e.addLockCb("navIsTrans", function () {
        return e.loadMsgsData(t, n, r, i);
      }) : void (t.isReport ? e.loadSessionMsgsData(t, r, i) : 3 > o ? e.loadMySpaceMsgsData(t, r, i) : e.loadFriendsMsgsData(t, r, i));
    }, e.loadSessionMsgsData = function (t, n, r) {
      if (e.isLocking("loadSessionMsgsDataLocking_" + n)) return void e.addLockCb("loadSessionMsgsDataLocking_" + n, function () {
        return e.loadSessionMsgsData(t, n, r);
      });
      if (e.msgsLoadPos[n]) {
        if (e.msgsLoadPos[n].isEnd) return;
      } else e.msgsLoadPos[n] = {
        isEnd: 0
      };
      if (e.msgsData[n]) {
        var i = e.msgsData[n];
        o = i && i.length ? i[i.length - 1].time : e.getHighRandomTime();
      } else {
        e.msgsData[n] = [];
        var o = e.getHighRandomTime();
      }
      e.lock("loadSessionMsgsDataLocking_" + n);
      var a = t.shareId,
        u = {
          shareId: a,
          chatSession: a,
          time: o,
          sendTimeoutIntv: 1e4
        };
      return e.send("fetchMoreSessionMsgs", u).then(function (t) {
        var r = t.msgs;
        t.old;
        e.msgsLoadPos[n] && (r.length < e.fetchLimit && (e.msgsLoadPos[n].isEnd = !0), e.checkLastOptionTime(n, r), e.msgsData[n] = e.msgsData[n].concat(r), e.emit("msgsDataChanged_" + n), e.unlock("loadSessionMsgsDataLocking_" + n));
      })["catch"](function (t) {
        e.unlock("loadSessionMsgsDataLocking_" + n), (0, s.tlog)("error", "loadSessionMsgsData", t);
      });
    }, e.loadFriendsMsgsData = function (t, n, r) {
      if (e.isLocking("loadFriendsMsgsDataLocking_" + n)) return void e.addLockCb("loadFriendsMsgsDataLocking_" + n, function () {
        return e.loadFriendsMsgsData(t, n, r);
      });
      var i = t.friendId,
        o = t.shareId,
        a = (t.descCategory, t.descType, t.fromId),
        u = t.toId;
      if (e.msgsLoadPos[n] || (e.msgsLoadPos[n] = {
        isEnd: 0
      }), !e.msgsLoadPos[n].isEnd) {
        var c = function (t) {
            var r = e.msgsData[n];
            return r || (r = []), t || (t = []), e.renderedMsgsMap[n] && t.forEach(function (t) {
              return e.renderedMsgsMap[n][t.msgid] = 1;
            }), r.concat(t);
          },
          d = e.msgsData[n] || [],
          l = e.getHighRandomTime(),
          f = d.length;
        if (f > 0) for (var h = f - 1; h >= 0; h--) if (d[h] && d[h].type !== e.CONS_MSG_TYPE_TIP_BUTTON) {
          l = d[h].time;
          break;
        }
        var g = function (t) {
          e.msgsData[n] = t, e.emit("msgsDataChanged_" + n);
        };
        e.lock("loadFriendsMsgsDataLocking_" + n), e.lock("dbDataIsLoading");
        var p = (t.shareData && t.shareData.newCommentNum, e.getChatSession(u, a));
        t.isStock || (o = p);
        var m = e.clearTime[p];
        return (t.isStock ? Promise.resolve([]) : s.dbs.loadMySpaceMsgsDataFromDb({
          shareId: o,
          userid: e.userid,
          friendId: i,
          limit: e.fetchLimit,
          time: l,
          chatSession: p
        })).then(function (r) {
          e.unlock("dbDataIsLoading");
          var f,
            h = [];
          if (r.length > 0) for (var P = r.length - 1; P >= 0; P--) {
            var v = r[P];
            v.type !== e.CONS_MSG_TYPE_TIP_BUTTON && (v.category === e.CONS_MSG_CAT_LAST_ITEM ? (f = v, v.msgscnt === e.CONS_MSGSCNT_TERM && (v.data && (v.data = JSON.parse(v.data)), h.unshift(v))) : (v.data && (v.data = JSON.parse(v.data)), h.unshift(v)));
          }
          if (e.checkLastOptionTime(n, h), d = c(h), r.length > 0 && (f && (e.msgsLoadPos[n].isEnd = !0), g(d), (f || r.length === e.fetchLimit) && e.unlock("loadFriendsMsgsDataLocking_" + n)), !f && r.length < e.fetchLimit) {
            f = d[d.length - 1], l = f && f.time || e.getHighRandomTime(), (0, s.tlog)("fetchMoreFriendsMsgs req", l);
            var S = {
              time: l,
              shareId: o,
              toId: i,
              isStock: t.isStock,
              sendTimeoutIntv: 1e4
            };
            return m && (S.ctime = m), (e.showCmdBall ? e.send("fetchMoreFriendsMsgs", S) : Promise.resolve({
              msgs: []
            })).then(function (r) {
              var i = r.msgs,
                l = r.ctime;
              r.old;
              e.fetchMoreFriendsMsgsData_tmp = i, l && (e.clearTime[p] = l), (0, s.tlog)("fetchMoreFriendsMsgs res", i.length);
              var f = i,
                h = !1;
              i.length < e.fetchLimit && (h = !0, d = c(i), f = i.concat([{
                msgid: e.getNewMsgId(),
                fromId: a,
                toId: u,
                category: 0,
                chatSession: e.getChatSession(u, a),
                time: e.getLowRandomTime(),
                shareId: o,
                shareFrom: a,
                stat: 2,
                type: 1
              }])), e.addSessionMsg(f);
              t.shareData && t.shareData.newCommentNum;
              return (t.isStock ? Promise.resolve() : s.dbs.insertFetchedMsgs(f)).then(function () {
                e.checkLastOptionTime(n, i), e.msgsLoadPos[n] && (e.msgsLoadPos[n].isEnd = h), g(c(i)), e.unlock("loadFriendsMsgsDataLocking_" + n);
              });
            });
          }
        })["catch"](function (t) {
          e.unlock("dbDataIsLoading"), e.unlock("loadFriendsMsgsDataLocking_" + n), (0, s.tlog)("error", "loadFriendsMsgsData", t);
        });
      }
    }, e.loadMySpaceMsgsData = function (t, n, r) {
      if (e.isLocking("loadMySpaceMsgsDataLocking_" + n)) return void e.addLockCb("loadMySpaceMsgsDataLocking_" + n, function () {
        return e.loadMySpaceMsgsData(t, n, r);
      });
      if (e.msgsLoadPos[n] || (e.msgsLoadPos[n] = {
        isEnd: 0,
        len: 0,
        last: e.getHighRandomTime()
      }), !e.msgsLoadPos[n].isEnd) {
        var i = t.toId,
          o = t.shareId,
          a = t.fromId,
          u = e.splitShareId(o).shareFrom,
          c = t.isStock || t.isShareFriendStock,
          d = t.chatSession,
          l = i === a ? 1 : 0,
          f = function (t) {
            var r = e.msgsData[n];
            return r || (r = []), t || (t = []), e.renderedMsgsMap[n] && t.forEach(function (t) {
              return e.renderedMsgsMap[n][t.msgid] = 1;
            }), r.concat(t);
          },
          h = e.msgsData[n] || [],
          g = function (t) {
            e.msgsData[n] = t, e.emit("msgsDataChanged_" + n);
          };
        return e.lock("loadMySpaceMsgsDataLocking_" + n), e.lock("dbDataIsLoading"), (c ? Promise.resolve([]) : s.dbs.loadMySpaceMsgsDataFromDb({
          shareId: o,
          time: e.msgsLoadPos[n].last,
          limit: e.fetchLimit
        })).then(function (i) {
          e.unlock("dbDataIsLoading");
          var a,
            p = [];
          if (i.length > 0) {
            for (var m = 0; m < i.length; m++) {
              var P = i[m];
              if (m === i.length - 1 && (e.msgsLoadPos[n].last = P.time), P.type !== e.CONS_MSG_TYPE_TIP_BUTTON) if (P.category === e.CONS_MSG_CAT_LAST_ITEM) a = P, P.msgscnt === e.CONS_MSGSCNT_TERM && (P.data && (P.data = JSON.parse(P.data)), p.unshift(P));else {
                if (!l && P.chatSession !== d && P.chatSession !== u) continue;
                P.data && (P.data = JSON.parse(P.data)), p.push(P);
              }
            }
            if (e.msgsLoadPos[n].len += p.length, e.checkLastOptionTime(n, i), h = f(p), a) return e.msgsLoadPos[n].isEnd = !0, e.msgsLoadPos[n].len = 0, e.unlock("loadMySpaceMsgsDataLocking_" + n), void g(h);
            if (i.length === e.fetchLimit) return e.unlock("loadMySpaceMsgsDataLocking_" + n), g(h), void (e.msgsLoadPos[n].len < e.fetchLimit ? e.loadMySpaceMsgsData(t, n, r) : e.msgsLoadPos[n].len = 0);
          }
          var v = {
            time: e.msgsLoadPos[n].last,
            isStock: e.isOb ? 1 : 0,
            shareId: o,
            sendTimeoutIntv: 1e4,
            flimit: e.fetchLimit
          };
          return e.send("fetchMoreMySpaceMsgs", v).then(function (i) {
            var a = i.msgs;
            (0, s.tlog)("fetchMoreMySpaceMsgs res", a.length);
            for (var h = 0; h < a.length; h++) {
              var m = a[h];
              h === a.length - 1 && (e.msgsLoadPos[n].last = m.time), (l || m.chatSession === d || m.chatSession === u) && (m.data && (m.data = JSON.parse(m.data)), p.push(m));
            }
            if (a.length < e.fetchLimit) {
              var P = !0;
              a = a.concat([{
                msgid: e.getNewMsgId(),
                fromId: e.userid,
                chatSession: d,
                shareFrom: u,
                toId: e.userid,
                category: e.CONS_MSG_CAT_LAST_ITEM,
                time: e.getLowRandomTime(),
                shareId: o,
                stat: 2,
                type: 1
              }]);
            }
            return (c ? Promise.resolve([]) : s.dbs.insertFetchedMsgs(a)).then(function () {
              e.msgsLoadPos[n] && (e.checkLastOptionTime(n, a), e.msgsLoadPos[n].isEnd = P ? 1 : 0, e.msgsLoadPos[n].len += p.length, e.msgsLoadPos[n].len < e.fetchLimit && e.loadMySpaceMsgsData(t, n, r), g(f(p))), e.unlock("loadMySpaceMsgsDataLocking_" + n);
            });
          });
        })["catch"](function (t) {
          e.unlock("loadMySpaceMsgsDataLocking_" + n), e.unlock("dbDataIsLoading"), (0, s.tlog)("error", "loadMySpaceMsgsData", t);
        });
      }
    }, e.changeChatInputPlaceHolder = function (t, n) {
      try {
        3 === n || 4 === n ? e.myInputViewRef.changePlaceHolder((0, s.tr)("Text...")) : t === e.userid ? e.myInputViewRef.changePlaceHolder("@" + (0, s.tr)("All")) : e.myInputViewRef.changePlaceHolder((0, s.tr)("Reply..."));
      } catch (r) {
        (0, s.tlog)("error", "catch changeChatInputPlaceHolder", r);
      }
    }, e.friendNameChanged = function (t, n) {
      e.getRelationShip(t).then(function (r) {
        r.isFriend && e.send("friendNameChanged", {
          friendId: t,
          name: n
        }).then(function (r) {
          return s.db.executeSql("UPDATE FriendShips SET f=?, name=? WHERE friendId=?", [r.f, n, t]).then(function () {
            var i = e.friendShipList.findIndex(function (e) {
              return e.friendId === t;
            });
            -1 !== i && (babelHelpers["extends"](e.friendShipList[i], {
              f: r.f,
              name: n
            }), e.emit("selectViewLoaded_contactsBoard", !0));
          });
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "friendNameChanged", t, n, e);
      });
    }, e.accountStoped = function (t) {
      return !!e.isIn(t.forbid, 1, 3, 5);
    }, e.reportNow = function (e, t) {}, e.isNeverRemind = function (t) {
      return new Promise(function (n, r) {
        e.neverRemindMap[t] ? n(!0) : e.everGet("neverRemind_" + t).then(function (r) {
          var i = !!r;
          i ? (e.neverRemindMap[t] = !0, n(!0)) : n(!1);
        })["catch"](function (e) {
          (0, s.tlog)("error", "isNeverRemind", t, e), r(e);
        });
      });
    }, e.navBackAfterReport = function () {
      "friends" === e.currentNavi ? e.curNavigator.navi.navToTop() : e.msgFriendsRoute ? e.curNavigator.navi.navToRoute(e.msgFriendsRoute) : e.bottleFriendsRoute ? e.curNavigator.navi.navToRoute(e.bottleFriendsRoute) : e.firstSpaceRoute ? e.curNavigator.navi.navToRoute(e.firstSpaceRoute) : e.curNavigator.navi.navToTop(), e.friendsNavigator.navi.navToTop(), e.aboutMeNavigator.navi.navToTop(), e.bottleFriendsRoute ? e.mySpaceNavigator.navi.navToRoute(e.bottleFriendsRoute) : e.mySpaceNavigator.navi.navToTop();
    }, e.everSet = function (e, t) {
      return new Promise(function (n, r) {
        s.db.executeSql("INSERT OR REPLACE INTO EverStore(k, v) VALUES(?, ?)", [e, t]).then(function () {
          n();
        })["catch"](function (n) {
          (0, s.tlog)("error", "everSet", e, t, n), r(n);
        });
      });
    }, e.everGet = function (e) {
      return new Promise(function (t, n) {
        s.db.executeSql("SELECT * FROM EverStore WHERE k=?", [e]).then(function (e) {
          t(e[0].rows.item(0));
        })["catch"](function (t) {
          (0, s.tlog)("error", "everGet", e, t), n(t);
        });
      });
    }, e.changeAvatarDiag = function (t, n) {
      e.diag({
        header: (0, s.tr)("Avatar"),
        content: (0, s.tr)("Set this avatar?"),
        imagePicker: (0, s.tr)("Avatar"),
        imagePickerResult: t,
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            e.changeUserAvatar(t.state.imagePickerResult), n && n.avatarRef && n.avatarRef.setState({
              loading: !0
            }), e.closeDiag();
          }
        }]
      });
    }, e.loadAboutMeProfile = function (t, n, r) {
      var i = e.isIn(e.account, e.userid, e.userid.slice(0, -2)),
        c = [{
          type: "bar"
        }, {
          type: "myAvatar",
          userid: e.userid,
          onPress: function (t) {
            return e.changeMyAvatar(t);
          },
          label: (0, s.tr)("Avatar")
        }, {
          type: "bar"
        }, {
          type: "btn",
          name: "Account",
          label: (0, s.tr)("Account ID"),
          value: i ? " " : e.account,
          onPress: function (n, r) {
            t === e.userid && e.setAccount(n);
          }
        }, {
          type: "bar"
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("Password"),
          value: " ",
          onPress: function (t, n) {
            return e.changePassword();
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("Nickname"),
          onPress: function (t, n) {
            return e.changeNameDiag(n);
          },
          userid: e.userid,
          isName: !0
        }, {
          type: "bar"
        }, e.showCmdBall || e.pkgvv === e.version || e.isTempUserid() ? {
          type: "btn",
          label: (0, s.tr)("Add Friends"),
          value: " ",
          onPress: function () {
            return e.addNewFriendDiag();
          }
        } : null, e.showCmdBall || e.pkgvv === e.version || e.isTempUserid() ? {
          type: "bar"
        } : null, e.permissions.notification ? {
          type: "swi",
          name: "msgNotiSwitch",
          label: (0, s.tr)("Message Notification"),
          value: e.permissions.notification ? e.msgNoti : 0,
          onValueChange: function (t, n, r) {
            if (e.permissions.notification) {
              r = r ? 1 : 0, t.setListData(e.changeAllListData(t.listData, function (e) {
                return "msgNotiSwitch" === e.name;
              }, function (e) {
                return e.value = r;
              }));
              var i = function () {
                e.send("changeUserMsgNoti", {
                  value: r
                }).then(function () {
                  return s.dbs.setUserProfile({
                    msgNoti: r,
                    commentNoti: r
                  });
                }).then(function () {
                  return e.shadowId ? e.shadowDb().then(function (e) {
                    return e.executeSql("INSERT OR REPLACE INTO UserProfile (k, v) VALUES (?, ?)", ["msgNoti", JSON.stringify(r)])["catch"](function (e) {
                      (0, s.tlog)("error", "shadowDb setUserProfile msgNoti, " + r, e);
                    });
                  }) : void 0;
                })["catch"](function (n) {
                  (0, s.tlog)("error", "changeUserMsgNoti", n), e.emit("showTipView", (0, s.tr)("Change Failed")), t.setListData(e.changeAllListData(t.listData, function (e) {
                    return "msgNotiSwitch" === e.name;
                  }, function (e) {
                    return e.value = !r;
                  }));
                });
              };
              r ? i() : e.diag({
                header: (0, s.tr)("Tip"),
                content: (0, s.tr)("Are you sure to disable the Notification?"),
                buttons: [{
                  text: (0, s.tr)("Cancel"),
                  onPress: function () {
                    return e.closeDiag(function () {
                      t.setListData(e.changeAllListData(t.listData, function (e) {
                        return "msgNotiSwitch" === e.name;
                      }, function (e) {
                        return e.value = !0;
                      }));
                    });
                  }
                }, {
                  text: (0, s.tr)("Ok"),
                  onPress: function () {
                    return e.closeDiag(i);
                  }
                }]
              });
            } else e.enableNotificationDiag((0, s.tr)("Message"));
          }
        } : {
          type: "btn",
          label: (0, s.tr)("Notification disabled"),
          value: e.firstShared && e.firstNotiTouched ? "" : " ",
          onPress: function () {
            e.requestingNotiPermission || (e.requestingNotiPermission = !0, setTimeout(function () {
              delete e.requestingNotiPermission;
            }, 2e3), e.requestPermission({
              type: "notification",
              header: (0, s.tr)("Tip"),
              content: (0, s.tr)("You will not be reminded unless turning on notifications."),
              btn1: (0, s.tr)("Later on"),
              btn2: (0, s.tr)("Allow now"),
              callback: function () {
                return e.emit("aboutMeUnreadChanged");
              }
            }));
          }
        }, {
          type: "bar"
        }, e.showCmdBall ? {
          type: "btn",
          value: " ",
          onPress: function () {
            var t = [[(0, s.tr)("Silent Tree Hole"), function () {
              e.emit("closeContextMenu", function () {
                return e.changeBackground("d1");
              });
            }], [(0, s.tr)("Dark Night Earth"), function () {
              e.emit("closeContextMenu", function () {
                return e.changeBackground("d0");
              });
            }], [(0, s.tr)("Cloud Sky Mystery"), function () {
              e.emit("closeContextMenu", e.changeBackground("d3"));
            }], [(0, s.tr)("Emerald Fantasy"), function () {
              e.emit("closeContextMenu", e.changeBackground("w0"));
            }], [(0, s.tr)("\u7cfb\u7edf\u9ed8\u8ba4"), function () {
              e.emit("closeContextMenu", function () {
                return e.changeBackground("");
              });
            }]];
            if (e.customBg) {
              var n = {
                  d1: 0,
                  d0: 1,
                  d3: 2,
                  w0: 3
                },
                r = e.customBg.match(/^\/a\/(\w+)\.jpg$/);
              r && n[r[1]] ? t[n[r[1]]][2] = !0 : t[0][2] = !0;
            } else t[4][2] = !0;
            e.emit("contextMenu", t);
          },
          name: "changeTheme",
          label: (0, s.tr)("Change Theme")
        } : null, e.showCmdball ? {
          type: "bar"
        } : null, null, null, {
          type: "btn",
          name: "CacheSize",
          label: (0, s.tr)("\u6e05\u7406\u5185\u5b58"),
          value: " ",
          onPress: function () {
            e.diag({
              header: (0, s.tr)("\u6e05\u7406\u5185\u5b58\uff08" + e.cacheFilesSize() + "\uff09"),
              content: (0, s.tr)("\u53ef\u51cf\u5c11\u5185\u5b58\u7684\u5360\u7528\uff0c\u4f46\u6e05\u7406\u540e\u4f1a\u91cd\u65b0\u4e0b\u8f7d\u4e00\u4e9b\u6570\u636e\uff0c\u5e76\u6d88\u8017\u4e00\u5b9a\u7684\u6d41\u91cf"),
              buttons: [{
                text: (0, s.tr)("Cancel"),
                onPress: function (t) {
                  t.isProgressing || e.closeDiag();
                }
              }, {
                text: (0, s.tr)("Ok"),
                onPress: function (t) {
                  t.isProgressing || (t.progressing(!0), t.setState({
                    infoTip: (0, s.tr)("Clearing...Don't quit!")
                  }, function () {
                    setTimeout(function () {
                      s.fs.unlink(s.fs.DocumentDirectoryPath + "/cachedImages/")["catch"](function () {}).then(function () {
                        return s.fs.unlink(s.fs.DocumentDirectoryPath + "/outImages/")["catch"](function () {});
                      }).then(function () {
                        return s.fs.unlink(s.fs.DocumentDirectoryPath + "/emotions/")["catch"](function () {});
                      }).then(function () {
                        return s.fs.unlink(s.fs.DocumentDirectoryPath + "/cachedAudio/")["catch"](function () {});
                      }).then(function () {
                        return Promise.all([e.sdb.executeSql("DROP TABLE IF EXISTS CachedImages"), e.sdb.executeSql("DROP TABLE IF EXISTS CachedAudio"), e.sdb.executeSql("DROP TABLE IF EXISTS SProfiles")]);
                      }).then(function () {
                        return Promise.all([e.sdb.executeSql("CREATE TABLE IF NOT EXISTS CachedAudio(\n                        audioId TEXT PRIMARY KEY NOT NULL,\n                        uri TEXT NOT NULL,\n                        size INTEGER NOT NULL\n                      )"), e.sdb.executeSql("CREATE TABLE IF NOT EXISTS CachedImages(\n                        imgId TEXT PRIMARY KEY NOT NULL,\n                        uri TEXT NOT NULL,\n                        size INTEGER NOT NULL\n                      )"), e.sdb.executeSql("CREATE TABLE IF NOT EXISTS SProfiles(\n                        userid TEXT NOT NULL,\n                        k TEXT NOT NULL,\n                        v TEXT NOT NULL,\n                        UNIQUE(userid, k) ON CONFLICT REPLACE\n                      )")]);
                      }).then(function () {
                        return e.setSharedParas({
                          cachedAudiosSize: 0,
                          cachedImagesSize: 0,
                          reloginClear: 1
                        });
                      }).then(function () {
                        e.closeDiag(function () {
                          return e.diag({
                            header: (0, s.tr)("Tip"),
                            content: (0, s.tr)("Clearing finished!"),
                            buttons: [{
                              text: (0, s.tr)("Ok"),
                              onPress: function (t) {
                                e.closeDiag(function () {
                                  return e.reloadHvdown();
                                });
                              }
                            }]
                          });
                        });
                      })["catch"](function (e) {
                        return (0, s.tlog)("error", "clear cachedImages", e);
                      });
                    }, 1e3);
                  }));
                }
              }]
            });
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("Clear All Unread"),
          value: " ",
          onPress: function () {
            return e.clearAllUnread();
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("\u8054\u7cfb\u6211\u4eec"),
          value: " ",
          onPress: function () {
            e.diag({
              header: (0, s.tr)("\u8054\u7cfb\u6211\u4eec"),
              content: (0, s.tr)("\u5982\u679c\u60a8\u9047\u5230\u95ee\u9898\uff0c\u53ef\u901a\u8fc7\u4ee5\u4e0b\u90ae\u4ef6\u5411\u6211\u4eec\u53cd\u9988\uff0c\u4f46\u90ae\u4ef6\u4e0d\u53d7\u7406\u8bf8\u5982\u8d26\u53f7\u89e3\u5c01\uff0c\u5bfb\u627e\u5931\u8054\u597d\u53cb\u8fd9\u7c7b\u4e0d\u5408\u7406\u7684\u8981\u6c42\uff0c\u656c\u8bf7\u7406\u89e3\u3002\nhelp@qxchat.cn"),
              buttons: [{
                text: (0, s.tr)("\u786e\u5b9a"),
                onPress: function () {
                  return e.closeDiag();
                }
              }]
            });
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)(e.tpwd ? "Quit Teenager Mode" : "Teenager Mode"),
          value: " ",
          onPress: function () {
            e.tpwd ? e.quitTeenagerMode() : e.teenagerMode();
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("App\u540d\u79f0\u53d8\u66f4\u58f0\u660e"),
          value: " ",
          rightIcon: "exclamation-circle",
          rightIconColor: s.theme.warn,
          onPress: function () {
            e.diag({
              header: (0, s.tr)("App\u540d\u79f0\u53d8\u66f4\u58f0\u660e"),
              content: (0, s.tr)("\u672c\u8f6f\u4ef6\u66f4\u540d\u4e3a\u201c\u661f\u7a7a\u201d\uff0c\u4e14\u53ea\u5728\u4e2d\u56fd\u5927\u9646\u4ee5\u5916\u5730\u533a\u8fd0\u8425\uff0c\u4e5f\u4ec5\u80fd\u4ece\u4e2d\u56fd\u5927\u9646\u4ee5\u5916\u5730\u533a\u7684App Store\u5e94\u7528\u5546\u5e97\u4e0b\u8f7d"),
              buttons: [{
                text: (0, s.tr)("\u786e\u5b9a"),
                onPress: function () {
                  return e.closeDiag();
                }
              }]
            });
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("\u9690\u79c1\u653f\u7b56"),
          value: " ",
          onPress: function () {
            e.diag({
              header: (0, s.tr)("\u9690\u79c1\u653f\u7b56"),
              scrollableContent: u.privacyPolicy,
              buttons: [{
                text: (0, s.tr)("Ok"),
                onPress: function () {
                  return e.closeDiag();
                }
              }]
            });
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("\u7528\u6237\u534f\u8bae"),
          value: " ",
          onPress: function () {
            var t = "**\u7279\u522b\u63d0\u793a\uff1a\u96f6\u5bb9\u5fcd\u653f\u7b56 (No Tolerance Policy)**",
              n = "5. \u77e5\u8bc6\u4ea7\u6743 (Intellectual Property)",
              r = u.userAgreement.split(t),
              i = u.userAgreement;
            if (r.length > 1) {
              var c = r[0],
                d = r[1],
                l = d.split(n);
              if (l.length > 1) {
                var f = t + l[0],
                  h = n + l[1];
                i = [o["default"].createElement(a.Text, {
                  key: "1"
                }, c), o["default"].createElement(a.Text, {
                  key: "2",
                  style: {
                    color: s.theme.warn,
                    fontWeight: "bold"
                  }
                }, f), o["default"].createElement(a.Text, {
                  key: "3"
                }, h)];
              }
            }
            e.diag({
              header: (0, s.tr)("\u7528\u6237\u534f\u8bae"),
              scrollableContent: i,
              buttons: [{
                text: (0, s.tr)("Ok"),
                onPress: function () {
                  return e.closeDiag();
                }
              }]
            });
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("trash"),
          value: " ",
          onPress: function () {
            e.loadFriendDrops();
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("Log Out"),
          value: " ",
          onPress: function () {
            var t = e.userid;
            "^1" === e.userid.slice(-2) && (t = e.userid.slice(0, -2)), e.showCmdBall || e.account && e.account !== t ? e.diag({
              header: (0, s.tr)("Log Out"),
              content: (0, s.tr)("Are you sure for signing out ?"),
              contentStyle: {
                paddingBottom: 0
              },
              link: {
                text: (0, s.tr)("Clear current account"),
                color: s.theme.deepGreen2,
                onPress: function () {
                  e.clearCurrentAccount();
                }
              },
              buttons: [{
                text: (0, s.tr)("Cancel"),
                onPress: function () {
                  return e.closeDiag();
                }
              }, {
                text: (0, s.tr)("Ok"),
                onPress: function (t) {
                  t.isProgressing || (t.progressing(!0), e.send("logout").then(function () {
                    return t.progressing(!1), e["multiLoginCnts_" + e.dataCenter] = e.multiLoginCnts, e.resetSharedParas("multiLoginCnts_" + e.dataCenter);
                  }).then(function () {
                    return e.delSharedParas("userid_" + e.dataCenter);
                  }).then(function () {
                    e.closeDiag(function () {
                      return e.reloadHvdown();
                    });
                  })["catch"](function (e) {
                    t.progressing(!1), (0, s.tlog)("error", "logout", e), t.setState({
                      infoTip: (0, s.tr)("Requesting Failed")
                    });
                  }));
                }
              }]
            }) : e.tip((0, s.tr)("Set your account and password first"));
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          name: "appSettings",
          label: (0, s.tr)("Permission Settings"),
          arrow: !0,
          value: " ",
          onPress: function () {
            return s.Permissions.openSettings();
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          name: "Version",
          label: (0, s.tr)("Version"),
          value: e.version,
          onPress: function () {
            (0, s.tlog)("apps.version = "), e.showCmdBall && e.diag({
              header: (0, s.tr)("Tip"),
              content: (0, s.tr)("Get Version"),
              textInputs: [{
                value: "",
                maxLength: 20
              }],
              buttons: [{
                text: (0, s.tr)("Cancel"),
                onPress: function () {
                  return e.closeDiag();
                }
              }, {
                text: (0, s.tr)("Ok"),
                onPress: function (t) {
                  var n = t.state.textInputs[0].value.trim();
                  e.post("/api/fetchCheckPVesion", {
                    d: e.deviceId,
                    v: n
                  }).then(function (e) {})["catch"](function (e) {
                    (0, s.tlog)("error", "fetchCheckPVesion", e);
                  }), e.closeDiag();
                }
              }]
            });
          }
        }, {
          type: "bar"
        }];
      e.showCmdBall && c.push({
        type: "btn",
        name: "HVersion",
        label: (0, s.tr)("HVersion"),
        value: e.pkgVersion
      }, {
        type: "btn",
        label: (0, s.tr)("Reload"),
        value: " ",
        onPress: function () {
          return s.fs.reloadHvdown();
        }
      }, {
        name: "multiLoginCnts",
        type: "asyncBtn",
        label: (0, s.tr)("Multiple Login"),
        value: " ",
        arrow: !0,
        cnt: e.multiLoginCntsSum,
        onDidMount: function (t, n) {
          e.onChangeMultiLoginCnts = function () {
            t.setListData(e.changeAllListData(t.listData, function (e) {
              return "multiLoginCnts" === e.name;
            }, function (t) {
              return t.cnt = e.multiLoginCntsSum;
            }));
          }, e.onChangeMultiLoginCnts();
        },
        onPress: function () {
          e.newRouteTo("suSelect", {
            type: "muid"
          });
        }
      }, {
        type: "asyncBtn",
        value: e.getDataCenterName(),
        cnt: e.otherDataCenterUnreadCnt,
        onDidMount: function (t, n) {
          e.onChangeOtherDataCenterUnread = function () {
            t.setListData(e.changeAllListData(t.listData, function (e) {
              return "switchDataCenter" === e.name;
            }, function (t) {
              return t.cnt = e.otherDataCenterUnreadCnt;
            }));
          }, e.onChangeOtherDataCenterUnread(), e.loadProfile(e.userid, "aboutMe");
        },
        onPress: function () {
          e.switchDataCenter();
        },
        name: "switchDataCenter",
        label: (0, s.tr)("Server")
      }, {
        name: "suidCnt",
        type: "asyncBtn",
        label: (0, s.tr)("Su List"),
        value: " ",
        arrow: !0,
        cnt: e.suidCnt,
        onDidMount: function (t, n) {
          e.onChangeSuidCnt = function () {
            t.setListData(e.changeAllListData(t.listData, function (e) {
              return "suidCnt" === e.name;
            }, function (t) {
              return t.cnt = e.suidCnt;
            }));
          }, e.onChangeSuidCnt();
        },
        onPress: function () {
          e.newRouteTo("suSelect", {
            type: "suid"
          });
        }
      }, {
        type: "swi",
        label: (0, s.tr)("Show Share and Msg ID"),
        name: "showShareAndMsgId",
        value: e.showShareAndMsgId,
        onValueChange: function (t, n, r) {
          r = r ? 1 : 0, s.dbs.setUserProfile({
            showShareAndMsgId: r
          })["catch"]((0, s.errCb)("showShareAndMsgId")), t.setListData(e.changeAllListData(t.listData, function (e) {
            return "showShareAndMsgId" === e.name;
          }, function (e) {
            return e.value = r;
          })), e.emit("showShareAndMsgIdToggled");
        }
      }, {
        type: "swi",
        label: (0, s.tr)("Show Cmd Ball"),
        name: "showCmdBall",
        value: e.showCmdBall,
        onValueChange: function (t, n, r) {
          r = r ? 1 : 0, e.setSharedParas({
            showCmdBall: r
          })["catch"](function (e) {
            return (0, s.tlog)("error", "showCmdBall", e);
          }), t.setListData(e.changeAllListData(t.listData, function (e) {
            return "showCmdBall" === e.name;
          }, function (e) {
            return e.value = r;
          })), e.emit("showCmdBallToggled", r);
        }
      }, {
        type: "asyncBtn",
        name: "CloudRepo",
        label: (0, s.tr)("Cloud Files"),
        value: e.cloudFilesSize(),
        arrow: !0,
        onDidMount: function (t, n) {
          e.onChangeCloudRepoSize = function () {
            t.setListData(e.changeAllListData(t.listData, function (e) {
              return "CloudRepo" === e.name;
            }, function (t) {
              return t.value = e.cloudFilesSize();
            }));
          }, e.onChangeCloudRepoSize();
        },
        onPress: function () {
          e.curNavigator.navi.navForward(e.curNavigator.routes.cloudRepo);
        }
      }, {
        type: "swi",
        label: (0, s.tr)("iosdevmode"),
        name: "iosdevmode",
        value: e.iosdevmode,
        onValueChange: function (t, n, r) {
          r = r ? 1 : 0, e.setSharedParas({
            iosdevmode: r
          })["catch"](function (e) {
            return (0, s.tlog)("error", "iosdevmode", e);
          }), e.send("iosdevmode", {
            iosDevMode: r
          })["catch"](function (e) {
            return (0, s.tlog)("error", "send iosdevmode", e);
          }), t.setListData(e.changeAllListData(t.listData, function (e) {
            return "iosdevmode" === e.name;
          }, function (e) {
            return e.value = r;
          }));
        }
      }, {
        type: "bar"
      }), e.emit("profileLoaded_" + t, c, n);
    }, e.loadProfile = function (t, n, r) {
      n || (n = e.currentNavi), "aboutMe" === n ? e.loadAboutMeProfile(t, n, r) : Promise.all([e.getRelationShip(t), e.getProfile(t)]).then(function (i) {
        var o = i[0],
          a = i[1],
          u = "2:" === t.slice(0, 2),
          c = e.showCmdBall ? [{
            type: "bar"
          }, {
            type: "friendAvatar",
            userid: t,
            canBeModify: o.isCreator,
            changeAvatar: function (n) {
              return s.ImagePicker.show(function (r) {
                e.changeGroupAvatar(r, t), n.friendAvatarRef.setState({
                  loading: !0
                });
              });
            }
          }, {
            type: "bar"
          }] : [{
            type: "bar"
          }, {
            type: "myAvatar",
            userid: t,
            onPress: function (n) {
              t === e.userid && e.changeMyAvatar(n);
            },
            label: (0, s.tr)("Avatar")
          }, {
            type: "bar"
          }];
        u || c.push({
          type: "btn",
          label: (0, s.tr)("Nickname"),
          gender: !0,
          onPress: function (n, r) {
            e.showCmdBall ? e.getProfileK(t, "name").then(function (n) {
              return e.addfTip(n, {
                genderId: t
              });
            })["catch"](function (e) {
              return (0, s.tlog)("error", "nickname addfTip", e);
            }) : t === e.userid && e.changeNameDiag(r);
          },
          userid: t,
          isName: !0
        }, {
          type: "btn",
          label: (0, s.tr)("\u7528\u6237ID"),
          value: t.slice(0, 6)
        }, {
          type: "bar"
        }, e.userid === t ? null : {
          type: "btn",
          label: (0, s.tr)("Add Tip"),
          onPress: function () {
            return e.addftagDiag(t);
          },
          value: e.profiles[t] && e.profiles[t].ftag || " "
        }, {
          type: "bar"
        }), e.showCmdBall && (e.send("userDeviceInfo", {
          friendId: t
        }).then(function (r) {
          var i,
            o,
            a,
            u,
            d,
            l,
            f,
            h,
            g,
            p,
            m,
            P,
            v = [],
            S = [],
            b = c.slice();
          r.info.forEach(function (n) {
            var r = n[0],
              c = n[1];
            if ("createAt" === r) c = s.util.dateTime(c);else if ("bottles" === r) {
              var b = c.map(function (e) {
                return e.text;
              });
              c = s.util.codeSlice(b.join("\u2014\u2014"), 0, 10);
            }
            var I = {
              type: "btn",
              name: "info__" + r,
              label: r,
              value: "    " + c,
              onPress: function () {
                return e.popTip(c);
              }
            };
            if (r in {
              phoneNum: 1,
              account: 1,
              ip: 1,
              brCnt: 1,
              region: 1,
              deviceFrom: 1,
              openT: 1,
              forbidExp: 1,
              forbidCnt: 1,
              shaExp: 1,
              userid: 1,
              pornInfo: 1,
              bottles: 1,
              reportT: 1,
              reportC: 1,
              mcnt: 1,
              pickupC: 1,
              bnum: 1,
              fnum: 1,
              fsnum: 1,
              stareNum: 1,
              followNum: 1,
              notiOk: 1,
              cnts: 1,
              createAt: 1,
              frozen: 1
            }) {
              if ("phoneNum" === r) p = I;else if ("forbidCnt" === r) i = I;else if ("forbidExp" === r) c && (I.value = s.util.dateTime(c)), o = I;else if ("shaExp" === r) c > 1e3 && (I.value = s.util.dateTime(c), c > e.now() && (a = I.value)), v.push(I);else if ("reportT" === r) u = I;else if ("reportC" === r) d = I, I.onPress = function () {
                e.csInfoDiag("userReportsInfo", t, "reportC");
              }, I.onLongPress = function () {
                e.diag({
                  header: (0, s.tr)("Tip"),
                  textInputs: [{
                    value: "",
                    maxLength: 250
                  }],
                  buttons: [{
                    text: (0, s.tr)("Cancel"),
                    onPress: function () {
                      return e.closeDiag();
                    }
                  }, {
                    text: (0, s.tr)("Ok"),
                    onPress: function (n) {
                      var r = parseInt(n.state.textInputs[0].value.trim(), 10);
                      e.send("setReportC", {
                        reportC: r,
                        userid: t
                      }).then(function () {
                        return e.closeDiag(function () {
                          e.loadProfile(t);
                        });
                      })["catch"](function (e) {
                        (0, s.tlog)("error", "setReportC", r, e);
                      });
                    }
                  }]
                });
              };else if ("brCnt" === r) l = I;else if ("region" === r) P = I, I.onPress = function () {
                e.bottlePeopleRegion = c, e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "space_", {
                  friendId: e.CONS_PREFIX_AUDIT + e.userid + c,
                  name: (0, s.tr)("Space")
                }));
              }, I.onLongPress = function () {
                e.emit("contextMenu", e.fetchMenu);
              };else if ("pickupC" === r) f = I;else {
                if ("userid" === r) I.onPress = function () {
                  return e.unsignUser(t);
                };else if ("frozen" === r) I.onPress = function () {
                  return e.unsignUser(t);
                }, m = I;else if ("mcnt" === r) I.onPress = function () {
                  e.csInfoDiag("userCsInfo", t, "mcnt");
                }, h = I;else if ("ip" === r) g = I, I.onPress = function () {
                  e.findIp({
                    ip: c,
                    userid: t
                  });
                }, I.onLongPress = function () {
                  e.diag({
                    header: (0, s.tr)("Tip"),
                    content: "Ip: " + c + " cnt: " + (e.fipMap[c] || 0),
                    textInputs: [{
                      value: "",
                      maxLength: 20
                    }],
                    buttons: [{
                      text: (0, s.tr)("Cancel"),
                      onPress: function () {
                        return e.closeDiag();
                      }
                    }, {
                      text: (0, s.tr)("Where"),
                      onPress: function (n) {
                        e.popProg("IP");
                        var r = n.state.textInputs[0].value;
                        e.post("/api/fetchIpLoc", {
                          ip: r || c,
                          userid: t,
                          d: e.deviceId
                        }).then(function (n) {
                          e.popTip(n), e.loadProfile(t), e.closeDiag();
                        })["catch"](function (e) {
                          (0, s.tlog)("error", e);
                        });
                      }
                    }, {
                      text: (0, s.tr)("Regions"),
                      onPress: function () {
                        e.closeDiag(), e.send("fetchUserRgs", {
                          userid: t
                        }).then(function (t) {
                          e.popTip(t.rs);
                        })["catch"](function (e) {
                          (0, s.tlog)("error", "fetchUserRgs", t, e);
                        });
                      }
                    }]
                  });
                };else if ("openT" === r) I.value = s.util.dateTime(c);else if ("bottles" === r) I.onPress = function () {
                  e.popTip(b);
                };else if ("deviceFrom" === r) {
                  var T = c.split("-")[1];
                  T && e.iosDvModelMap[T] && (I.value = "    " + c.split("-")[0] + "-" + e.iosDvModelMap[T]), I.onPress = function () {
                    e.bottlePeopleEquip = c, e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "space_", {
                      friendId: e.CONS_PREFIX_AUDIT + e.userid + c,
                      name: (0, s.tr)("Space")
                    }));
                  }, I.onLongPress = function () {
                    e.emit("contextMenu", e.fetchMenu);
                  };
                }
                v.push(I);
              }
            } else S.push(I);
          }), l && v.unshift(l), f && v.unshift(f), d && v.unshift(d), i && v.unshift(i), o && v.unshift(o), a && v.unshift({
            type: "btn",
            name: "info__paidUser",
            label: "paidUser",
            value: "    " + a,
            onPress: function () {
              return e.popTip(a);
            }
          }), p && v.unshift(p), h && v.unshift(h), P && v.unshift(P), g && v.unshift(g), m && v.unshift(m), v.push({
            type: "btn",
            name: "append",
            label: "append",
            value: " ",
            onPress: function () {
              e.emit("profileLoaded_" + t, c.concat(S), n);
            }
          }, {
            type: "btn",
            name: "switch",
            label: "switch",
            value: " ",
            onPress: function () {
              e.diag({
                header: "Switch",
                content: "suto",
                buttons: [{
                  text: (0, s.tr)("Cancel"),
                  onPress: function () {
                    return e.closeDiag();
                  }
                }, {
                  text: (0, s.tr)("Ok"),
                  onPress: function (n) {
                    n.isProgressing || (n.progressing(!0), e.suto(t));
                  }
                }]
              });
            }
          }), c = b.concat(v), e.emit("profileLoaded_" + t, c, n);
        })["catch"](function (e) {
          (0, s.tlog)("error", "userDeviceInfo", t, e);
        }), c.splice(4, 0, {
          type: "btn",
          label: (0, s.tr)("Forbid"),
          value: a.forbid || " ",
          onPress: function () {
            for (var n = function (n, r) {
                return e.forbidUser(t, n, r);
              }, r = [], i = function (t) {
                return 0 === t ? "continue" : void r.push([(0, s.tr)(t + ""), function () {
                  return e.emit("closeContextMenu", function () {
                    return n(t);
                  });
                }]);
              }, o = -1; 5 >= o; o++) {
              i(o);
            }
            r.unshift([(0, s.tr)("ipfa"), function () {
              return e.emit("closeContextMenu", function () {
                return n(e.CONS_FORBID_FAKE);
              });
            }]), r.push([(0, s.tr)("noRp"), function () {
              return e.emit("closeContextMenu", function () {
                return n(e.CONS_FORBID_NORP);
              });
            }]), r.push([(0, s.tr)("pick"), function () {
              return e.emit("closeContextMenu", function () {
                return n(e.CONS_FORBID_PICK);
              });
            }]), r.push([(0, s.tr)("cheat"), function () {
              return e.emit("closeContextMenu", function () {
                return n(e.CONS_FORBID_CHEAT);
              });
            }]), e.emit("contextMenu", r);
          }
        }, {
          type: "btn",
          label: (0, s.tr)("Hist"),
          value: "",
          onPress: function () {
            e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "space_", {
              friendId: "3:" + t,
              name: (0, s.tr)("Space")
            }));
          }
        }));
        var d = function () {
          c.push({
            type: "btn",
            label: (0, s.tr)("Friend"),
            value: " ",
            arrow: !0,
            onPress: function () {
              var n = {
                type: 3,
                name: (0, s.tr)("Friend")
              };
              t !== e.userid && e.showCmdBall && (n.userid = t), e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "followers_", n));
            }
          }, {
            type: "bar"
          });
        };
        if (t === e.userid) ;else if (u) o && o.isInGroup ? c.push({
          type: "btn",
          label: (0, s.tr)(u ? "Group Name" : "Nickname"),
          userid: t,
          isName: !0,
          onPress: function () {
            o.isCreator && e.getProfileK(t, "name").then(function (n) {
              e.diag({
                header: (0, s.tr)("Name"),
                content: (0, s.tr)("Change group name"),
                textInputs: [{
                  placeholder: (0, s.tr)("Name"),
                  value: n,
                  maxLength: 20
                }],
                buttons: [{
                  text: (0, s.tr)("Cancel"),
                  onPress: function (t) {
                    return e.closeDiag();
                  }
                }, {
                  text: (0, s.tr)("Ok"),
                  onPress: function (r) {
                    r.isProgressing || (n = r.state.textInputs[0].value.trim(), n ? (r.progressing(!0), e.request("/api/nameAbuseCheck", {
                      method: "POST",
                      headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        name: n
                      })
                    }).then(function (e) {
                      return 200 === e.status ? e.json() : Promise.reject("resError");
                    }).then(function (r) {
                      return r.abuse ? Promise.reject("abuse") : e.changeGroupName(t, n);
                    }).then(function () {
                      e.closeDiag();
                    })["catch"](function (e) {
                      r.progressing(!1), "abuse" === e ? r.setState({
                        infoTip: (0, s.tr)("Username abuse!")
                      }) : ((0, s.tlog)("error", "changeGroupName", e), r.setState({
                        infoTip: (0, s.tr)("Change Failed")
                      }));
                    })) : r.setState({
                      infoTip: (0, s.tr)("Input cannot be empty")
                    }));
                  }
                }]
              });
            })["catch"](function (e) {
              (0, s.tlog)("error", "group name onPress", t, e);
            });
          }
        }, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("Group Members"),
          value: " ",
          arrow: !0,
          onPress: function () {
            e.curNavigator.routes.groupMembers.friendId = t, e.curNavigator.navi.navForward(e.curNavigator.routes.groupMembers);
          }
        }, e.permissions.notification && e.msgNoti ? {
          type: "swi",
          name: "msgNotiSwitch",
          label: (0, s.tr)("No Group Notification"),
          value: e.permissions.notification && o.noMsgNoti ? 1 : 0,
          onValueChange: function (n, r, i) {
            e.permissions.notification ? (i = i ? 1 : 0, n.setListData(e.changeAllListData(n.listData, function (e) {
              return "msgNotiSwitch" === e.name;
            }, function (e) {
              return e.value = i;
            })), e.send("changeFriendMsgNoti", {
              friendId: t,
              value: i ? 0 : 1
            }).then(function (e) {
              o.noMsgNoti = i ? 1 : 0;
            })["catch"](function (t) {
              (0, s.tlog)("error", "changeFriendMsgNoti", t), e.emit("showTipView", (0, s.tr)("Change Failed")), n.setListData(e.changeAllListData(n.listData, function (e) {
                return "msgNotiSwitch" === e.name;
              }, function (e) {
                return e.value = !i;
              }));
            })) : e.enableNotificationDiag((0, s.tr)("Message"));
          }
        } : {}, {
          type: "bar"
        }, {
          type: "btn",
          label: (0, s.tr)("Clear Chat Messages"),
          value: " ",
          onPress: function () {
            e.diag({
              header: (0, s.tr)("Tip"),
              content: (0, s.tr)("Are you sure to clear chat messages within this group?"),
              buttons: [{
                text: (0, s.tr)("Cancel"),
                onPress: function (t) {
                  return e.closeDiag();
                }
              }, {
                text: (0, s.tr)("Ok"),
                onPress: function (n) {
                  e.closeDiag(function () {
                    return e.clearChatMessages(t);
                  });
                }
              }]
            });
          }
        }, {
          type: "bar"
        }, {
          type: "pbtn",
          style: {
            marginTop: 30
          },
          color: s.theme.deepGreen2Trans6,
          textColor: s.theme.white,
          text: (0, s.tr)("Send Message"),
          onPress: function () {
            e.forbidExp || e.isForbided ? e.forbidTip() : e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "interact_", {
              friend: {
                type: 2,
                fromId: e.userid,
                toId: t,
                friendId: t,
                descCategory: 4,
                shareFrom: t,
                shareId: t
              },
              name: (0, s.tr)("Message")
            }));
          }
        }, {
          type: "pbtn",
          style: {
            marginTop: 20,
            marginBottom: 30
          },
          color: s.theme.warningButton,
          textColor: s.theme.white,
          text: (0, s.tr)("Quit Group"),
          onPress: function () {
            e.deleteGroupDiag(t);
          }
        }, {
          type: "bar"
        }, {
          type: "bar"
        }) : e.diag({
          header: (0, s.tr)("Tip"),
          content: (0, s.tr)("You have been removed from the group"),
          buttons: [{
            text: (0, s.tr)("Ok"),
            onPress: function (n) {
              e.closeDiag(function () {
                e.deleteGroup(t), e.curNavigator.navi.navToTop();
              });
            }
          }]
        });else {
          e.showCmdBall && d();
          var l = {
            friendId: t
          };
          t !== e.userid && r && "2:" === r.slice(0, 2) && e.relationShips[r] && e.relationShips[r].isCreator && (l.groupId = r), (l.groupId ? e.send("groupBlockStatus", l) : Promise.resolve({})).then(function (n) {
            c.push(o.isDropped ? null : {
              type: "bar"
            }, o.isDropped ? null : {
              type: "btn",
              label: (0, s.tr)("Report"),
              value: " ",
              onPress: function () {
                return e.forbidExp || e.isForbided ? void e.forbidTip() : void e.getProfileK(t, "forbid").then(function (n) {
                  n || e.CONS_FORBID_NORMAL;
                  e.flagReport(t);
                })["catch"](function (e) {
                  (0, s.tlog)("error", "Report get forbid", e);
                });
              }
            }, o.isDropped ? null : {
              type: "bar"
            }, e.isInBottleMsg || o.isDropped ? null : {
              type: "btn",
              label: (0, s.tr)("Clear Chat Messages"),
              value: " ",
              onPress: function () {
                e.diag({
                  header: (0, s.tr)("Tip"),
                  content: (0, s.tr)("Are you sure to clear chat messages with this user?"),
                  buttons: [{
                    text: (0, s.tr)("Cancel"),
                    onPress: function (t) {
                      return e.closeDiag();
                    }
                  }, {
                    text: (0, s.tr)("Ok"),
                    onPress: function (n) {
                      e.closeDiag(function () {
                        return e.clearChatMessages(t);
                      });
                    }
                  }]
                });
              }
            }), l.groupId && (c.push({
              type: "bar"
            }), n.isInGroup && c.push({
              type: "btn",
              label: (0, s.tr)("Remove from Group"),
              value: " ",
              onPress: function () {
                e.diag({
                  header: (0, s.tr)("Tip"),
                  content: (0, s.tr)("Are you sure to remove this user from current group?"),
                  buttons: [{
                    text: (0, s.tr)("Cancel"),
                    onPress: function (t) {
                      return e.closeDiag();
                    }
                  }, {
                    text: (0, s.tr)("Ok"),
                    onPress: function (n) {
                      n.isProgressing || (n.progressing(!0), e.removeGroupMembers(r, [{
                        friendId: t
                      }]).then(function () {
                        e.closeDiag();
                      })["catch"](function (e) {
                        n.progressing(!1), n.setState({
                          infoTip: (0, s.tr)("Requesting Failed")
                        }), (0, s.tlog)("error", "loadProfile removeGroupMembers", e);
                      }));
                    }
                  }]
                });
              }
            })), c.push(e.isInBottleMsg || o.isDropped && !o.isFriend ? null : {
              type: "pbtn",
              style: {
                marginTop: 30
              },
              color: s.theme.deepGreen2Trans6,
              textColor: s.theme.white,
              text: (0, s.tr)("Send Message"),
              onPress: function () {
                if (e.forbidExp || e.isForbided) return void e.forbidTip();
                var n = t < e.userid ? t + ":" + e.userid : e.userid + ":" + t;
                e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "interact_", {
                  friend: {
                    type: 1,
                    fromId: e.userid,
                    toId: t,
                    friendId: t,
                    descCategory: 3,
                    shareFrom: n,
                    shareId: n
                  },
                  name: (0, s.tr)("Message")
                }));
              }
            }, {
              type: "pbtn",
              style: {
                marginTop: 20,
                marginBottom: 30
              },
              color: s.theme.warningButton,
              textColor: s.theme.white,
              text: !o.isDropped || o.isFriend || e.isInBottleMsg ? (0, s.tr)("Delete and Block") : (0, s.tr)("Recover Delete"),
              onPress: function () {
                !o.isDropped || o.isFriend || e.isInBottleMsg ? e.dropFriendDiag(t, o) : e.recoverFriendDiag(t);
              }
            });
          }).then(function () {
            e.emit("profileLoaded_" + t, c, n);
          })["catch"](function (e) {
            (0, s.tlog)("error", "groupBlockStatus", r, t, e);
          });
        }
        return e.emit("profileLoaded_" + t, c, n), e.syncFriendProfile(t).then(function () {
          var r = [];
          c.forEach(function (e) {
            r.push(babelHelpers["extends"]({}, e));
          }), e.emit("profileLoaded_" + t, r, n);
        });
      })["catch"](function (e) {
        return (0, s.tlog)("error", "apps.loadProfile", n, t, e);
      });
    }, e._deleteMsg = function (t, n) {
      try {
        var r = n.shareId,
          i = n.fromId,
          o = n.toId,
          a = n.category,
          u = n.msgid;
        t.sessionFilesDelete.push(n);
        var c = "2:" === o.slice(0, 2) ? o : i,
          d = e.getFid(o, i, r);
        if (n.text = (0, s.tr)("[ Retreated ]"), n.type = e.CONS_MSG_TYPE_TEXT, t.newMsgs[u]) {
          t.newMsgs[u].isDeleted = 1;
          var l = t.unReadReplyMsgs[d].findIndex(function (e) {
            return e.msgid === u;
          });
          -1 !== l && (t.unReadReplyMsgs[d][l].isDeleted = 1);
          var f = t.friendsUpdates[c];
          if (f) for (var h = 0; h < f.length; h++) f[h].msgid === u && (f[h].text = (0, s.tr)("[ Retreated ]"), f[h].type = e.CONS_MSG_TYPE_TEXT);
          var g = t.unReadMsgs.findIndex(function (e) {
            return e.msgid === u;
          });
          -1 !== g && (t.unReadMsgs[g].text = (0, s.tr)("[ Retreated ]"), t.unReadMsgs[g].type = e.CONS_MSG_TYPE_TEXT);
        } else t.deleteDbMsgs[u] = !1, t.unReadDeleteMsgs[d] || (t.unReadDeleteMsgs[d] = []), t.unReadDeleteMsgs[d].push(n), t.unReadUpdates[n.msgid] = n, 2 === a ? (g = e.circleMsgUnreadList.findIndex(function (e) {
          return e.msgid === u;
        }), -1 !== g && (e.circleMsgUnreadList[g].text = (0, s.tr)("[ Retreated ]"), e.circleMsgUnreadList.type = e.CONS_MSG_TYPE_TEXT), n.isDeleted = 1, n.userid = "8:" + e.userid, t.unReadMsgs.push(n)) : (g = e.friendsUnreadList.findIndex(function (e) {
          return e.msgid === u;
        }), -1 !== g && (e.friendsUnreadList[g].text = (0, s.tr)("[ Retreated ]"), e.friendsUnreadList.type = e.CONS_MSG_TYPE_TEXT), t.friendsUpdates[c] ? t.friendsUpdates[c].push(n) : t.friendsUpdates[c] = [n]);
      } catch (p) {
        (0, s.tlog)("error", "deleteMsg", n, p);
      }
    }, e.updateFriendsInDb = function (t) {
      return new Promise(function (n, r) {
        var i = [];
        s.db.transaction(function (n) {
          var r = e.now(),
            o = function (o) {
              var a = t.friendsUpdates[o].sort(function (e, t) {
                return t.time - e.time;
              });
              if (a.length > 0) {
                var u = function () {
                  var t = a[0],
                    u = t.msgid,
                    c = t.shareId,
                    d = t.type,
                    l = t.time,
                    f = t.text,
                    h = t.category,
                    g = t.fromId,
                    p = t.toId,
                    m = t.shareFrom,
                    P = t.addIdx,
                    v = e.userid;
                  return o === e.USERID_ALERT && (l += 8639136e5), 1 === h && P > 0 ? {
                    v: "continue"
                  } : void n.executeSql("UPDATE Friends SET desc=?, descType=?, time=?, accessTime=?, msgid=?, fromId=?, toId=? WHERE userid=? AND friendId=?", [f, d, l, r, u, g, p, v, o]).then(function (n) {
                    if (0 === n[1].rowsAffected) {
                      var r = e.now();
                      t.mtext && (v = e.CONS_BOTTLE_RES_PREFIX + e.userid, e.bottleResponseMap[o] || (e.bottleResponseMap.cnt += 1, e.bottleResponseMap[o] = t, e.emit("loadBottleResponse"), e.emit("nextBtnChanged")), r = t.time, i.push(["UPDATE Friends SET time=? WHERE userid=? AND friendId=?", [r, e.userid, e.USERID_RES]])), o === e.USERID_ALERT && (r += 8639136e5);
                      var a = 1,
                        s = new RegExp("^(\\d+:)" + e.userid).exec(o);
                      s && (a = parseInt(s[1], 10)), i.push(["\n                  INSERT OR REPLACE INTO Friends \n                    (userid, friendId, name, avatar, type, time, desc, descType, descCategory,\n                    shareId, msgid, phoneNum, toId, fromId, shareFrom, pin, atime)\n                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n                ", [v, o, "", "", a, r, f, d, h, c, u, "", p, g, m, 0, t.atime || 0]]);
                    }
                  })["catch"](function (e) {
                    return (0, s.tlog)("error", "friendsUnread update", e);
                  });
                }();
                if ("object" == typeof u) return u.v;
              }
            };
          for (var a in t.friendsUpdates) {
            o(a);
          }
        }).then(function () {
          return s.db.transaction(function (e) {
            i.forEach(function (t) {
              return e.executeSql(t[0], t[1])["catch"]((0, s.errCb)("updateFriendsInDb ins", r));
            });
          });
        }).then(function () {
          return n();
        })["catch"](function (e) {
          return (0, s.tlog)("error", "updateFriendsInDb", e);
        });
      });
    }, e.getPendingPurchasesIOS = function () {
      return Promise.resolve([]);
    }, e.verifyPurchase = function (t, n, r) {
      return Promise.resolve({
        purchasesDisabled: true
      });
    }, e.purchaseActionLog = function () {
      return void 0;
    }, e.purchase = function (t) {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e.buy30dayVIP = function () {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e.buyStars = function () {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e.sendStar = function (t, n) {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e.onStarButtonPress = function (t) {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e.shadowPurchaseMenu = function () {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e.runPurchase = function () {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e.popPurchaseShadowDiag = function (t) {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e._switchShadow = function (t, n) {
      if (!e.switchingShadow) {
        if (e.switchingShadow = !0, e.shaM) var r = e.shaM;
        s.dbs.delUserProfiles(["shaM", "shaMClear", "disableShadowRemind"]).then(function () {
          var t = e.mpasswd,
            i = e.gender,
            o = e.country,
            a = e.phoneNum,
            u = e.account,
            c = e.pubid,
            d = e.msgNoti,
            l = e.shadowId;
          e["userid_" + e.dataCenter] = l;
          var f = ["userid_" + e.dataCenter, "relogin"];
          return e.showCmdBall && -1 === e.multiLogins.indexOf(l) && (e.multiLogins.unshift(l), e["multiLogins_" + e.dataCenter] = e.multiLogins, f.push("multiLogins_" + e.dataCenter)), e.relogin = 1, e.wsClose(), e.resetSharedParas(f).then(function () {
            return e.shadowDb().then(function (f) {
              return s.dbs.shadowInitDb(f).then(function () {
                return f.transaction(function (f) {
                  var h = {
                    mpasswd: t,
                    gender: i,
                    country: o,
                    phoneNum: a,
                    account: u,
                    pubid: c,
                    msgNoti: d,
                    shadowId: e.userid
                  };
                  n && (h.shaSS = 1);
                  var g = function (e) {
                    var t = JSON.stringify(h[e]);
                    f.executeSql("\n                INSERT OR REPLACE INTO UserProfile (k, v) VALUES (?, ?)\n              ", [e, t])["catch"](function (n) {
                      (0, s.tlog)("error", "setUserProfile " + e + "=" + t, n);
                    });
                  };
                  for (var p in h) g(p);
                  if (r) {
                    var m = r.split(",").slice(0, -1);
                    m.forEach(function (t) {
                      [l].forEach(function (n) {
                        f.executeSql("\n                    INSERT OR REPLACE INTO Friends (\n                      userid, friendId, name, avatar, type, time, desc, descType, descCategory,\n                      shareId, msgid, phoneNum, toId, fromId, shareFrom, atime, rtime\n                    )\n                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n                  ", [n, t, "", "", 3, e.now(), "", 1, 3, e.getChatSession(l, t), "", a, l, t, t, 0, 0])["catch"](function (e) {
                          return (0, s.tlog)("error", "1.saveFriends", e);
                        });
                      });
                    });
                  }
                });
              });
            });
          }).then(function () {
            e.reloadHvdown();
          });
        })["catch"](function (e) {
          (0, s.tlog)("error", "switchShadow", e);
        });
      }
    }, e.createShadow = function (t, n) {
      t && t.progressing(!0), e.send("createShadow2", {
        bottle: n
      }).then(function (n) {
        if (n.shadowId) e._switchShadow(e.shadowExpired);else {
          if (!n.forbid) {
            var r = n.userid;
            return e.closeDiag(), s.dbs.setUserProfile({
              shadowId: r
            }).then(function () {
              return e.wsClose(), e["userid_" + e.dataCenter] = r, e.relogin = 1, e.resetSharedParas(["userid_" + e.dataCenter, "relogin"]).then(function () {
                var t = e.gender,
                  n = e.country,
                  i = e.phoneNum,
                  o = e.account,
                  a = e.pubid;
                return e.shadowDb().then(function (u) {
                  return s.dbs.shadowInitDb(u).then(function () {
                    return u.transaction(function (u) {
                      var c = {
                          mpasswd: e.mpasswd,
                          country: n,
                          phoneNum: i,
                          account: o,
                          friendsSync: 1,
                          pickNoti: 1,
                          shareNoti: 1,
                          msgNoti: 1,
                          commentNoti: 1,
                          pubid: a,
                          gender: t,
                          shadowId: r.slice(0, -2),
                          disableShadowRemind: 1
                        },
                        d = function (e) {
                          var t = JSON.stringify(c[e]);
                          u.executeSql("\n                    INSERT OR REPLACE INTO UserProfile (k, v) VALUES (?, ?)\n                  ", [e, t])["catch"](function (n) {
                            (0, s.tlog)("error", "setUserProfile " + e + "=" + t, n);
                          });
                        };
                      for (var l in c) d(l);
                    });
                  });
                });
              }).then(function () {
                e.reloadHvdown();
              });
            });
          }
          t && t.progressing(!1), t && t.setState({
            infoTip: (0, s.tr)("The account has been forbidden.")
          });
        }
      })["catch"](function (e) {
        t && t.progressing(!1), (0, s.tlog)("error", "switchShadow2", e);
      });
    }, e.switchShadow = function (t, n) {
      if (e.tpwd && "^1" !== e.userid.slice(-2)) return void e.tip((0, s.tr)("Shadow cannot be used in teenager mode"));
      if (e.shadowId) e._switchShadow(e.shadowExpired);else {
        if (e.forbidExp || e.isForbided) return void e.forbidTip();
        t ? e.createShadow(null, n) : e.diag({
          header: (0, s.tr)("Switch Shadow"),
          content: (0, s.tr)("Shadow could have more whispers, switch to it?"),
          buttons: [{
            text: (0, s.tr)("Cancel"),
            onPress: function () {
              return e.closeDiag();
            }
          }, {
            text: (0, s.tr)("Switch"),
            onPress: function (t) {
              return e.createShadow(t);
            }
          }]
        });
      }
    }, e.isTempUserid = function () {
      return !!e.userid.match(/^(8ZkE8EDVNbIrN2Xu|uAA8GkrjscBvAfRN)/);
    }, e.noCircleTip = function () {
      e.tip((0, s.tr)("Due to the horny content floods in the circle, we close it temporarily."));
    }, e.loadFriendShips_old = function () {
      return new Promise(function (t, n) {
        if (e.isLoadingFriendShips) e.loadFriendShipsPromises.push(function () {
          e.loadFriendShips().then(t, n);
        });else {
          if (e.isLoadingFriendShips = !0, "\uffffend" === e.friendShipLast.f && !e.friendShipLast.reload) {
            t(e.mapFriendShips(e.friendShipList)), delete e.isLoadingFriendShips;
            var r = e.loadFriendShipsPromises.pop();
            return void (r && r());
          }
          var i = 10,
            o = 0;
          e.friendShipLast.reload && (o = e.friendShipList.length, e.friendShipLast = {
            f: "",
            name: "",
            friendId: ""
          }, e.friendShipList = []), delete e.friendShipLast.reload;
          var a = e.friendShipLast,
            u = a._f,
            c = a._name,
            d = a._friendId,
            l = a.f,
            f = a.name,
            h = a.friendId;
          if (u === l && c === f && d === h) return t(e.mapFriendShips(e.friendShipList)), delete e.isLoadingFriendShips, r = e.loadFriendShipsPromises.pop(), void (r && r());
          babelHelpers["extends"](e.friendShipLast, {
            _f: l,
            _name: f,
            _friendId: h
          }), s.db.executeSql("SELECT * FROM FriendShips WHERE friendId > ? ORDER BY friendId ASC LIMIT ?", [h, i + o]).then(function (n) {
            for (var r = n[0].rows, o = 0; o < r.length; o++) {
              var a = r.item(o);
              e.friendShipList.push(a);
            }
            if (a && babelHelpers["extends"](e.friendShipLast, a), !a || r.length < i && "\uffffend" !== a.f) {
              var u = e.friendShipLast,
                c = (u.f, u.name, u.friendId);
              return e.selectViewDis.contactsBoard = 10, e.send("fetchFriendShips2", {
                userid: c,
                limit: i
              }).then(function (n) {
                var r = n.ships,
                  o = r.length;
                return i > o && (r.push({
                  friendId: "\uffffend",
                  f: "\uffffend",
                  name: ""
                }), o += 1), s.db.transaction(function (t) {
                  for (var n = function (n) {
                      var i = r[n],
                        a = i.friendId,
                        u = i.f,
                        c = i.name,
                        d = i.a,
                        l = d ? "1" : "";
                      t.executeSql("INSERT INTO FriendShips (friendId, f, name, adds) VALUES (?, ?, ?, ?)", [a, u, c, l])["catch"](function (e) {
                        (0, s.tlog)("error", "tx insert FriendShips", i, e);
                      }), n === o - 1 && (a ? babelHelpers["extends"](e.friendShipLast, i) : e.friendShipLast.f = "\uffffend");
                    }, i = 0; o > i; i++) n(i);
                }).then(function () {
                  var n;
                  (n = e.friendShipList).push.apply(n, babelHelpers.toConsumableArray(r)), t(e.mapFriendShips(e.friendShipList));
                });
              });
            }
            "\uffffend" === a.f && (e.friendShipLast.f = "\uffffend"), e.selectViewDis.contactsBoard = 2e3, t(e.mapFriendShips(e.friendShipList));
          }).then(function () {
            delete e.isLoadingFriendShips;
            var t = e.loadFriendShipsPromises.pop();
            t && t();
          })["catch"](function (t) {
            delete e.isLoadingFriendShips, (0, s.tlog)("error", "loadFriendShips", t), n(t);
            var r = e.loadFriendShipsPromises.pop();
            r && r();
          });
        }
      });
    }, e.testAccountTheme = function () {
      e.isTempUserid() && !e.customBg && e.changeBackground("w0");
    }, e.changeBackground = function (t) {
      if (t) {
        var n = "/a/" + t + ".jpg";
        if (e.customBg === n) return;
        if (e.changeDefaultBackgroundLocked) return;
        var r,
          i = {
            customBg: n
          };
        "w" === t[0] ? (i.themeMode = {
          lightMode: 1
        }, e.darkTheme && (r = !0, i.loadAboutMeFirst = 1)) : (i.themeMode = {
          darkTheme: 1
        }, e.lightMode && (r = !0, i.loadAboutMeFirst = 1)), e.changeDefaultBackgroundLocked = n.slice(1), e.setSharedParas(i).then(function () {
          r ? e.reloadHvdown() : e.emit("backgroundChanged");
        })["catch"](function (e) {
          (0, s.tlog)("error", "changeBackground", e);
        });
      } else e.delSharedParas("customBg").then(function () {
        e.darkTheme ? e.emit("backgroundChanged") : e.setSharedParas({
          themeMode: {
            darkTheme: 1
          },
          loadAboutMeFirst: 1
        }).then(function () {
          e.reloadHvdown();
        })["catch"](function (e) {
          (0, s.tlog)("error", "changeBackground", e);
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "changeBackground", e);
      });
    }, e.changeDefaultBackground = function () {
      if (e.changeDefaultBackgroundLocked) return Promise.resolve("locked");
      var t = {
          background: ""
        },
        n = e.darkTheme ? 1 : 4;
      return e.getProfileK(e.userid, "background").then(function (r) {
        r || (r = e.customBg);
        var i = r ? r.match(/^\/a\/(\w)(\d+)\.jpg$/) : null;
        if (i && (e.darkTheme ? "d" === i[1] : "w" === i[1])) {
          var o = parseInt(i[2], 10) + 1;
          o > n && (o = 0);
        } else o = 0;
        return t.background = "/a/" + (e.darkTheme ? "d" : "w") + o + ".jpg", e.changeDefaultBackgroundLocked = t.background.slice(1), s.dbs.setProfile(e.userid, t).then(function () {
          return e.setSharedParas(e.lightMode ? {
            customBg: t.background
          } : {
            customBgd: t.background
          });
        }).then(function () {
          return e.shadowId ? e.sdb.executeSql("INSERT OR REPLACE INTO SProfiles (userid, k, v) VALUES (?, ?, ?)", [e.shadowId, "background", JSON.stringify(t.background)])["catch"](function (n) {
            (0, s.tlog)("error", "shadowDb setProfile " + e.shadowId + ", background, " + t.background, n);
          }) : void 0;
        });
      }).then(function () {
        return e.emit("backgroundChanged_" + e.userid), e.send("updateBackgroundImage", t);
      })["catch"](function (e) {
        (0, s.tlog)("error", "changeDefaultBackground", e);
      });
    }, e.fetchOneBottleResponse = function () {
      e.send("fetchBr").then(function () {
        return s.db.executeSql("SELECT friendId FROM Friends WHERE userid=? ORDER BY time DESC LIMIT 1", [e.CONS_BOTTLE_RES_PREFIX + e.userid]);
      }).then(function (t) {
        var n = t[0].rows.item(0);
        return n ? s.db.executeSql("UPDATE Friends SET userid=?, time=? WHERE userid=? AND friendId=?", ["3:" + e.userid, e.now(), e.CONS_BOTTLE_RES_PREFIX + e.userid, n.friendId]).then(function (t) {
          return e.bottleResponseMap.cnt -= 1, delete e.bottleResponseMap[n.friendId], e.emit("loadBottleResponse"), e.loadFriendsData("3:" + e.userid);
        }) : void 0;
      })["catch"](function (e) {
        (0, s.tlog)("error", "fetchOneBottleResponse", e);
      });
    }, e.fetchAllBottleResponse = function () {
      var t = 0;
      s.db.executeSql("SELECT friendId FROM Friends WHERE userid=? ORDER BY time ASC LIMIT 300", [e.CONS_BOTTLE_RES_PREFIX + e.userid]).then(function (n) {
        var r = n[0].rows;
        return s.db.transaction(function (n) {
          for (var i = e.now(), o = 0; o < r.length; o++) {
            var a = r.item(o);
            n.executeSql("UPDATE Friends SET userid=?, time=? WHERE userid=? AND friendId=?", ["3:" + e.userid, i + o, e.CONS_BOTTLE_RES_PREFIX + e.userid, a.friendId])["catch"](function (e) {
              (0, s.tlog)("error", "tx fetchAllBottleResponse", e);
            }), e.bottleResponseMap.cnt -= 1, t += 1, delete e.bottleResponseMap[a.friendId];
          }
        });
      }).then(function () {
        return s.dbs.delUserProfile("lastBottleUserid");
      }).then(function () {
        return e.emit("loadBottleResponse"), e.loadFriendsData("3:" + e.userid);
      }).then(function () {
        return e.send("fetchBr");
      })["catch"](function (e) {
        (0, s.tlog)("error", "fetchAllBottleResponse", e);
      });
    }, e.leftTime = function (e) {
      if (e) {
        var t = s.util.formatNum(Math.floor(e / 3600)),
          n = s.util.formatNum(Math.floor(e / 60 % 60)),
          r = s.util.formatNum(Math.floor(e % 60));
        return t + "\u5c0f\u65f6" + n + "\u5206" + r + "\u79d2";
      }
      return "0\u5c0f\u65f60\u52060\u79d2";
    }, e.forbidTip = function () {
      if (e.forbidExp) {
        clearInterval(e.forbidTipTimer);
        var t = function () {
          return e.forbidCnt > 2 ? (0, s.tr)("Your account will be banned for ## days due to violation. Left time ##", e.forbidCnt - 2, e.leftTime(e.forbidExp / 1e3)) : (0, s.tr)("Your account will be banned for ## hours due to violation. Left time ##", 12 * (e.forbidCnt - 1), e.leftTime(e.forbidExp / 1e3));
        };
        e.popTip(t(), null, function (n) {
          var r = function () {
            return n.setState({
              text: t()
            });
          };
          e.forbidTipTimer = setInterval(r, 1e3), r(), n.onCloseCallback = function () {
            clearInterval(e.forbidTipTimer);
          };
        });
      } else if (e.isForbided === e.CONS_FORBID_AVATAR) {
        var n = [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Change Avatar"),
          onPress: function () {
            e.closeDiag(function () {
              return e.changeMyAvatar();
            });
          }
        }];
        e.diag({
          header: (0, s.tr)("Tip"),
          content: (0, s.tr)("Your avatar is not allowed"),
          buttons: n
        });
      } else e.isForbided === e.CONS_FORBID_NAME ? e.tip((0, s.tr)("Your name is not allowed")) : e.isForbided === e.CONS_FORBID_AVATAR_NAME ? e.tip((0, s.tr)("Your avatar and name is not allowed")) : e.tip((0, s.tr)("Your account has been forbided."));
    }, e.getUserShadowId = function (e) {
      if ("^1" === e.slice(-2)) var t = e.slice(0, -2),
        n = e;else t = e, n = e + "^1";
      return {
        userid: t,
        shadowId: n
      };
    }, e.getShadowId = function (e) {
      return "^1" === e.slice(-2) ? e.slice(0, -2) : e + "^1";
    }, e.getRandomHurls = function () {
      return e.getRandomItem("getFastAddr", e.hurls);
    }, e.gethostaddr = function (e) {
      return new Promise(function (t, n) {
        /\d+\.\d+\.\d+\.\d+/.test(e) ? t([e]) : s.fs.gethostaddr(e).then(function (e) {
          t(e);
        })["catch"](function (t) {
          (0, s.tlog)("error", "apps.gethostaddr", e, t), n(t);
        });
      });
    }, e.fastAddrs = ["106.15.133.99", "qxchat.cn", "qxchat.co", "whou.co"], e.getFastAddr2 = function () {
      return new Promise(function (t, n) {
        void 0 === e.fastAddrIdx ? e.fastAddrIdx = 0 : e.fastAddrIdx += 1, e.fastAddrIdx >= e.fastAddrs.length && (e.fastAddrIdx = 0);
        var r = e.fastAddrs[e.fastAddrIdx];
        e.gethostaddr(r).then(function (e) {
          t(e);
        })["catch"](function (e) {
          (0, s.tlog)("error", "getFastAddr2", e), n(e);
        });
      });
    }, e.randPost = function () {
      return new Promise(function (t, n) {
        var r = e.getRandomHurls();
        fetch("https://" + r + "/api/deviceCheckTest", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            t: 1
          })
        }, 1e4, !0).then(function (e) {
          200 === e.status ? t() : ((0, s.tlog)("randPost " + r + " Failed -!!!", e.status), n(e.status));
        })["catch"](function (e) {
          n(e);
        });
      });
    }, e.getFastAddr = function () {
      return new Promise(function (t, n) {
        var r = 0,
          i = 0,
          o = 0,
          a = {},
          u = function d() {
            var n = e.getRandomHurls();
            r += 1, fetch("https://" + n + "/api/deviceCheckTest", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                t: 1
              })
            }, 1e4, !0).then(function (e) {
              200 === e.status ? ((0, s.tlog)(r + ".fetch " + n + " Ok-!!!"), o += 1, a.f = ["106.15.133.99"], o >= 2 && t(a.f.length > a.d.length ? a.f : a.d)) : setTimeout(function () {
                return d();
              }, 1e3);
            })["catch"](function (e) {
              setTimeout(function () {
                return d();
              }, 1e3);
            });
          },
          c = function l() {
            i += 1, e.gethostaddr("qxchat.cn").then(function (e) {
              (0, s.tlog)(i + ".DNS fetch Ok-!!!"), o += 1, a.d = e, o >= 2 && t(a.f.length > a.d.length ? a.f : a.d);
            })["catch"](function (e) {
              setTimeout(function () {
                return l();
              }, 1e3);
            });
          };
        u(), c();
      });
    }, e.verifyVurls = function (t) {
      t > 3e4 && (t = 3e4), (0, s.tlog)("gethostaddr"), e.getFastAddr2().then(function (t) {
        if ((0, s.tlog)("gethostaddr", t), 0 !== t.length) {
          if ("ali" === e.dataCenter) var n = "murls_ali_dev",
            r = "durls_ali_dev",
            i = "hurls_ali_dev",
            o = 30001,
            a = [],
            u = 40002,
            c = [],
            d = 50001,
            l = [];else "dev" === e.runMode ? (n = "murls_do_dev", r = "durls_do_dev", i = "hurls_do_dev", o = 30901, a = [40021, 50021, 60021], u = 40901, c = [30023, 50023, 60023], d = 50901, l = [30022, 40022, 60022]) : (n = "murls_do_pro", r = "durls_do_pro", i = "hurls_do_pro", o = 30201, a = [40223, 50223, 60223, 30200], u = 40201, c = [30213, 50213, 60213], d = 50201, l = [30233, 40233, 60233]);
          var f = {};
          return f[n] = [], f[r] = [], f[i] = [], [o].concat(a).forEach(function (e) {
            t.forEach(function (t) {
              f[n].push(t + ":" + e);
            });
          }), [u].concat(c).forEach(function (e) {
            t.forEach(function (t) {
              f[r].push(t + ":" + e);
            });
          }), [d].concat(l).forEach(function (e) {
            t.forEach(function (t) {
              f[i].push(t + ":" + e);
            });
          }), e.murls = f[n], e.durls = f[r], e.hurls = f[i], e.setSharedParas(f)["catch"](function (e) {
            return (0, s.tlog)("error", "verifyVurls", e);
          }), e.randPost();
        }
      }).then(function () {
        e.verifyVurlsFinished = !0, delete e.verifyVurlsFailed, e.verifyVurlsFinishedCbs.length > 0 && (e.verifyVurlsFinishedCbs.forEach(function (e) {
          return e();
        }), e.verifyVurlsFinishedCbs = []);
      }, function (n) {
        e.verifyVurlsFailed = !0, setTimeout(function () {
          return e.verifyVurls(t + 5e3);
        }, 500);
        var r = Date.now();
        r - e.lastVerifyVurlsTime > 2e3 && (e.lastVerifyVurlsTime = r, (0, s.tlog)("error", "verifyVurls", n));
      });
    }, e.isUserForbided = function (t) {
      return t ? e.notIn(t, e.CONS_FORBID_NORMAL, e.CONS_FORBID_CHEAT, e.CONS_FORBID_UNS) : !1;
    }, e.needUpdate = function () {
      e.diag({
        locking: !0,
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("\u8be5\u529f\u80fd\u9700\u8981\u524d\u5f80App Store\uff08\u975e\u4e2d\u56fd\u5927\u9646\u5730\u533a\uff09\u66f4\u65b0\u8f6f\u4ef6"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function () {
            a.Linking.openURL(e.downloadStore);
          }
        }]
      });
    }, e.zipSendReply = function (t, n) {
      var r = {
        z: n
      };
      t = t.sendMsg;
      var i = {
        f: t.isFriend || void 0,
        t: t.toId,
        m: t.msgid.split(":").slice(-2).join(":"),
        e: t.text,
        b: t.utab,
        c: t.msgscnt
      };
      if (t.mtext && (i.x = t.mtext, t.shareFrom !== t.shareId)) {
        var o = t.shareFrom.split(":");
        i.s = o[o.length - 1];
      }
      return t.type === e.CONS_MSG_TYPE_TERM && (i.y = e.CONS_MSG_TYPE_TERM), t.prevText && (i.p = t.prevText), t.isCut && (i.d = t.isCut), r.sendMsg = i, r.sendTimeoutIntv = t.sendTimeoutIntv, r;
    }, e.unzipSendReply = function (t, n) {
      var r = n.b,
        i = n.c,
        o = n.f,
        a = n.e,
        s = n.u,
        u = n.m,
        c = n.x,
        d = n.y,
        l = n.s,
        f = e.numDecompress(u.split(":")[0]),
        h = e.getChatSession(t, o);
      return {
        category: 3,
        chatSession: h,
        fromId: o,
        ftype: 1,
        utab: r,
        msgid: o + ":" + u,
        msgscnt: i,
        seqi: -9,
        shareFrom: l ? t + ":3:" + l : h,
        shareId: h,
        text: a,
        time: f,
        toId: t,
        type: d || 1,
        uread: s,
        mtext: c
      };
    }, e.addShadowTip = function () {
      return new Promise(function (t, n) {
        if (e.isTempUserid() || "^1" !== e.userid.slice(-2)) return void t();
        var r = "-2";
        s.dbs.getUserProfile("hasBottleAlert").then(function (t) {
          return t ? void 0 : ((0, s.tlog)("addShadowTip", e.fnow()), s.dbs.setUserProfile({
            hasBottleAlert: 1
          })["catch"](function (e) {
            return (0, s.tlog)("error", "set addShadowTip", e);
          }), e.send("fetchBottleAlert", {
            tag: "shadowTip"
          }).then(function (t) {
            var n = t.desc,
              i = t.text,
              o = t.v;
            o ? (i = o, n = o) : i = n + i;
            var a = e.getChatSession(e.userid, r);
            return e.saveFriends([{
              friendId: r,
              isBottle: 1,
              desc: (0, s.tr)(n),
              type: 1,
              time: e.now()
            }]).then(function () {
              return s.dbs.insertNewMsg({
                msgid: e.getNewMsgId(),
                fromId: r,
                toId: e.userid,
                shareId: a,
                stat: 2,
                time: e.now(),
                category: 3,
                text: i,
                type: 1,
                shareFrom: a,
                chatSession: a
              });
            }).then(function () {
              e.addFakeUnread(null, {
                userid: r,
                text: (0, s.tr)(n),
                shareId: a,
                ftype: 1,
                category: 3,
                utab: 1
              }), e.emit("spaceUnreadChanged");
            });
          }));
        }).then(t)["catch"](function (e) {
          (0, s.tlog)("error", "addShadowTip", e), t();
        });
      });
    };
    var t = "\u8bf7\u52a1\u5fc5\u4ed4\u7ec6\u9605\u8bfb\uff01\uff01\uff01\n\n\u661f\u7a7a\u6084\u6084\u8bdd\u662f\u4e00\u4e2a\u503e\u8bc9\u4e0e\u4ea4\u6d41\u7684\u5730\u65b9\uff0c\u8bf7\u52ff\u5411\u4ed6\u4eba\u53d1\u9001\u8272\u60c5\uff0c\u8fb1\u9a82\uff0c\u6d89\u653f\u7b49\u8fdd\u89c4\u4fe1\u606f\uff0c\u4e25\u91cd\u8fdd\u89c4\u5c06\u4f1a\u6c38\u4e45\u5c01\u53f7\u3002\n  \n\u8bf7\u7279\u522b\u6ce8\u610f\u4ee5\u4e0b\u51e0\u79cd\u8bc8\u9a97\uff1a\n\n1. \u8981\u4f60\u52a0\u5176\u4ed6\u8054\u7cfb\u65b9\u5f0f\u5e76\u544a\u8bc9\u4f60\u67d0\u79cd\u8d5a\u5927\u94b1\u8def\u5b50\u7684\u4e00\u5b9a\u662f\u9a97\u5b50\uff0c\u6295\u8d44\u7406\u8d22\uff0c\u7092\u5e01\u6316\u77ff\uff0c\u535a\u5f69\u6e38\u620f\uff0c\u5237\u5355\u6d17\u94b1\u90fd\u662f\u9a97\u5c40\u3002\n\n2. \u4efb\u4f55\u58f0\u79f0\u662f\u6211\u4eec\u5185\u90e8\u5de5\u4f5c\u4eba\u5458\u7684\u90fd\u662f\u9a97\u5b50\uff0c\u5343\u4e07\u522b\u4fe1\u3002\n\n3. \u8ba9\u4f60\u767b\u5f55\u5979\uff08\u4ed6\uff09\u7684\u82f9\u679c\u8d26\u53f7\u7684\uff0c\u4e00\u65e6\u767b\u5f55\u5c31\u4f1a\u88ab\u5bf9\u65b9\u9501\u624b\u673a\uff0c\u8981\u4f60\u7ed9\u94b1\u624d\u66ff\u4f60\u89e3\u9501\uff0c\u9047\u5230\u8fd9\u79cd\u627e\u82f9\u679c\u5b98\u65b9\u89e3\u9501\u3002\n\n4. \u8981\u4f60\u4e0b\u8f7d\u5176\u4ed6\u8f6f\u4ef6\u8bf1\u9a97\u4f60\u88f8\u804a\u7684\uff0c\u6781\u6709\u53ef\u80fd\u662f\u88f8\u804a\u8bc8\u9a97\uff0c\u4f1a\u7528\u88f8\u804a\u89c6\u9891\u6572\u8bc8\u5a01\u80c1\u4f60\u3002";
    e.addBottleAlert = function () {
      return new Promise(function (n, r) {
        if (e.isTempUserid()) return void n();
        var i = "-1";
        s.dbs.getUserProfiles(["currentBottleAlert", "bottleAlertMyear"]).then(function (n) {
          var r = s.util.yeardate();
          if (n.currentBottleAlert !== t || n.bottleAlertMyear !== r) {
            s.dbs.setUserProfile({
              currentBottleAlert: t,
              bottleAlertMyear: r
            })["catch"](function (e) {
              return (0, s.tlog)("error", "set addBottleAlert", e);
            });
            var o = e.getChatSession(e.userid, i);
            return e.saveFriends([{
              friendId: i,
              desc: t,
              type: 1,
              time: e.now(),
              isBottle: 1,
              pin: 9999
            }]).then(function () {
              return s.db.executeSql("DELETE FROM Msgs WHERE shareId=?", [o]);
            }).then(function () {
              return s.dbs.insertNewMsg({
                msgid: e.getNewMsgId(),
                fromId: i,
                toId: e.userid,
                shareId: o,
                stat: 2,
                time: e.now(),
                category: 3,
                text: t,
                type: 1,
                shareFrom: o,
                chatSession: o
              });
            }).then(function () {
              e.addFakeUnread(null, {
                userid: i,
                text: t,
                shareId: o,
                ftype: 1,
                category: 3,
                utab: 1
              });
            });
          }
        }).then(n)["catch"](function (e) {
          (0, s.tlog)("error", "addBottleAlert", e), n();
        });
      });
    }, e.addNewUnreadMsg = function (t, n) {
      var r = e.getChatSession(e.userid, t);
      e.saveFriends([{
        friendId: t,
        desc: (0, s.tr)(n),
        type: 1,
        time: e.now()
      }]).then(function () {
        return s.dbs.insertNewMsg({
          msgid: e.getNewMsgId(),
          fromId: t,
          toId: e.userid,
          shareId: r,
          stat: 2,
          time: e.now(),
          category: 3,
          text: n,
          type: 1,
          shareFrom: r,
          chatSession: r
        });
      }).then(function () {
        e.addFakeUnread(null, {
          userid: t,
          text: (0, s.tr)(n),
          shareId: r,
          ftype: 1,
          category: 3,
          utab: 1
        }), e.emit("friendsUnreadChanged"), e.loadFriendsData();
      });
    }, e.isSysUser = function (e) {
      return e.length < 4;
    }, e.expForbid = function (t) {
      e.forbidExp = t, clearInterval(e.forbidExpIntv), e.forbidExpIntv = setInterval(function () {
        e.forbidExp > 0 ? (e.forbidExp -= 1e3, s.dbs.setUserProfile({
          forbidExp: e.forbidExp
        })["catch"](function (e) {
          return (0, s.tlog)("error", "expForbid set forbidExp", e);
        })) : (clearInterval(e.forbidExpIntv), e.ws.close());
      }, 1e3);
    }, e.addfTip = function (t, n) {
      var r,
        i = function (t, n, i, o) {
          e.emit("closeContextMenu", function () {
            e.send("addfTip", {
              r: t,
              t: n,
              v: i,
              s: o,
              isEnd: r
            })["catch"](function (e) {
              return (0, s.tlog)("error", "addfTip", e);
            });
          });
        };
      n || (n = {});
      var o = [{
        text: (0, s.tr)("Cancel"),
        onPress: function () {
          return e.closeDiag();
        }
      }, {
        text: (0, s.tr)("Pin"),
        onPress: function (n) {
          var r = n.state.textInputs[1].value.trim();
          e.closeDiag(), e.send("pinObw", {
            w: r
          }).then(function (t) {
            return e.popTip(t.p);
          })["catch"](function (e) {
            return (0, s.tlog)("error", "pinObw", t, e);
          });
        }
      }, {
        text: "Test",
        onPress: function (t) {
          var n = t.state.textInputs[1].value.trim();
          e.closeDiag(), e.send("addfTip", {
            r: n
          })["catch"](function (e) {
            return (0, s.tlog)("error", "test addfTip", e);
          });
        }
      }, {
        text: (0, s.tr)("Ok"),
        onPress: function (t) {
          var n = t.state.textInputs[0].value.trim(),
            o = t.state.textInputs[1].value.trim();
          e.closeDiag();
          var a = [[(0, s.tr)("whole"), function () {
              e.emit("closeContextMenu", function () {
                return c([[(0, s.tr)("hornyW"), function () {
                  return i(o, n, 1);
                }], [(0, s.tr)("white"), function () {
                  return i(o, n, 2);
                }], [(0, s.tr)("adsW"), function () {
                  return i(o, n, 11);
                }], [(0, s.tr)("abuseW"), function () {
                  return i(o, n, 17);
                }], [(0, s.tr)("obW"), function () {
                  return i(o, n, 27);
                }], [(0, s.tr)("delT"), function () {
                  return i(o, n, 7);
                }]]);
              });
            }]],
            u = [[(0, s.tr)("obk"), function () {
              e.emit("closeContextMenu", function () {
                return c([[(0, s.tr)("abuseB"), function () {
                  return i(o, n, 16);
                }], [(0, s.tr)("hornyB"), function () {
                  return i(o, n, 12);
                }], [(0, s.tr)("adsB"), function () {
                  return i(o, n, 13);
                }], [(0, s.tr)("normalB"), function () {
                  return i(o, n, 14);
                }], [(0, s.tr)("obB"), function () {
                  return i(o, n, 15);
                }]]);
              });
            }], [(0, s.tr)("abuseK"), function () {
              return i(o, n, 3);
            }], [(0, s.tr)("hornyK"), function () {
              return i(o, n, 4);
            }], [(0, s.tr)("adsK"), function () {
              return i(o, n, 5);
            }], [(0, s.tr)("normalK"), function () {
              return i(o, n, 6);
            }], [(0, s.tr)("delK"), function () {
              return i(o, n, 8);
            }], [(0, s.tr)("endK"), function () {
              r = 1, e.emit("closeContextMenu", function () {
                return c(u.slice(0, -1));
              });
            }]],
            c = function (t) {
              return e.emit("contextMenu", t);
            };
          c(a.concat(u));
        }
      }];
      n.genderId && o.splice(1, 1, {
        text: (0, s.tr)("Gender"),
        onPress: function () {
          return e.closeDiag(function () {
            return e.changeGender(n.genderId);
          });
        }
      }), n.pin && o.splice(0, 1, {
        text: (0, s.tr)("Cob"),
        onPress: function (t) {
          var n = t.state.textInputs[0].value.trim();
          e.diag({
            header: (0, s.tr)("Tip"),
            content: (0, s.tr)("Clear or Delete"),
            buttons: [{
              text: (0, s.tr)("Clear"),
              onPress: function () {
                return r();
              }
            }, {
              text: (0, s.tr)("Delete"),
              onPress: function () {
                return r(1);
              }
            }]
          });
          var r = function (t) {
            var r = {
              w: n
            };
            t && (r.d = 1), e.send("clearObw", r).then(function (t) {
              e.closeDiag(function () {
                t ? e.popTip((0, s.tr)("ClearOb " + t.c)) : (0, s.tlog)("error", "clearObw failed", n);
              });
            })["catch"](function (e) {
              (0, s.tlog)("error", "clearObw", n, e);
            });
          };
        }
      }), e.diag({
        header: (0, s.tr)("Addf"),
        link: {
          text: "addWord",
          color: s.theme.deepGreen2,
          onPress: function (t) {
            var n = t.state.textInputs[0].value.trim(),
              r = t.state.textInputs[1].value.trim();
            e.closeDiag(), e.emit("contextMenu", [[(0, s.tr)("spec"), function () {
              return i(r, n, 9, 1);
            }], [(0, s.tr)("normal"), function () {
              return i(r, n, 9, 2);
            }], [(0, s.tr)("del"), function () {
              return i(r, n, 10, 3);
            }], [(0, s.tr)("null"), function () {
              return i(r, n, 9, 4);
            }], [(0, s.tr)("jump"), function () {
              return i(r, n, 9, 5);
            }], [(0, s.tr)("symbol"), function () {
              return i(r, n, 9, 6);
            }]]);
          }
        },
        textInputs: [{
          placeholder: (0, s.tr)("raw"),
          value: t,
          maxLength: 5e3
        }, {
          placeholder: (0, s.tr)("test"),
          value: t,
          maxLength: 5e3
        }],
        buttons: o
      });
    }, e.addNewTipMsg = function (t, n, r) {
      var i = e.now(),
        o = e.getChatSession(t, e.userid),
        a = e.getFid(t, e.userid, o),
        u = e.createSysTipMsg({
          time: i,
          text: n,
          shareId: o
        });
      void 0 !== r && (u.category = r);
      var c = e.msgsData[a];
      c && (e.msgsData[a] = [u].concat(c), e.emit("rerenderMsgsData_" + a, 1)), s.dbs.insertNewMsg(u)["catch"](function (e) {
        return (0, s.tlog)("errror", "addNewTipMsg", t, n, e);
      });
    }, e.handleMsgBanned = function (t) {
      var n = t.shareId,
        r = t.msgid,
        i = t.toId,
        o = e.getFid(i, e.userid, n),
        a = e.msgsData[o];
      if (t.illegal) {
        var u = Object.keys(t.illegal).join("\uff0c");
        if (e.diag({
          header: (0, s.tr)("Send Failed"),
          darker: !0,
          content: (0, s.tr)("The message contains illegal words") + "\uff08" + u + "\uff09",
          buttons: [{
            text: (0, s.tr)("Ok"),
            onPress: function () {
              return e.closeDiag();
            }
          }]
        }), a) {
          var c = a.findIndex(function (e) {
            return e.msgid === r;
          });
          -1 !== c && (a.splice(c, 1), e.msgsData[o] = a, e.lazyRefresh("rerenderMsgsData_" + o));
        }
        e.myInputViewRef.refs.inputView.changeText(e.lastSendReplyText), s.db.executeSql("DELETE FROM Msgs WHERE msgid=?", [r]).then(function () {
          return s.db.executeSql("DELETE FROM Msgscnts WHERE shareId=?", [n]);
        })["catch"](function (e) {
          (0, s.tlog)("error", "handleMsgBanned illegal", t, e);
        });
      } else if (a) {
        var d = a.findIndex(function (e) {
          return e.msgid === r;
        });
        if (-1 !== d) {
          var l = [],
            f = e.now();
          if (t.illegal) var h = "\u9996\u6b21\u56de\u590d\u53ea\u53ef\u7528\u5e38\u7528\u5b57\u7b26";else h = "\u672a\u4e92\u76f8\u5173\u6ce8\u7684\u964c\u751f\u4eba\u4e4b\u95f4\u4f1a\u6709\u654f\u611f\u8bcd\u68c0\u67e5";
          l.push(e.createSysTipMsg({
            time: f + 2,
            text: h,
            shareId: n
          }));
          var g = t.illegal ? e.CONS_MSG_TYPE_ILLEGAL : e.CONS_MSG_TYPE_WARN;
          l.push(babelHelpers["extends"]({}, a[d], {
            type: g
          })), e.msgsData[o] = a.slice(0, d).concat(l).concat(a.slice(d + 1)), e.lazyRefresh("rerenderMsgsData_" + o, 3), s.db.executeSql("UPDATE Msgs SET type=? WHERE msgid=?", [g, r])["catch"](function (e) {
            (0, s.tlog)("error", "handleMsgBanned", t, e);
          }), s.dbs.insertFetchedMsgs(l.slice(0, 1));
        }
      }
    }, e.handleMsgTermed = function (t) {
      var n = t.shareId,
        r = t.msgid,
        i = t.toId,
        o = e.getFid(i, e.userid, n),
        a = e.msgsData[o];
      if (a) {
        var u = a.findIndex(function (e) {
          return e.msgid === r;
        });
        -1 !== u && (e.msgsData[o] = a.slice(0, u).concat([babelHelpers["extends"]({}, a[u], {
          msgscnt: e.CONS_MSGSCNT_TERM
        })]).concat(a.slice(u + 1)), e.lazyRefresh("rerenderMsgsData_" + o, 3), s.db.executeSql("UPDATE Msgs SET msgscnt=? WHERE msgid=?", [e.CONS_MSGSCNT_TERM, r])["catch"](function (e) {
          (0, s.tlog)("error", "handleMsgBanned", t, e);
        }));
      }
    }, e.createSysTipMsg = function (t) {
      var n = t.shareId,
        r = t.time,
        i = t.text;
      return {
        msgid: e.getNewMsgId(),
        fromId: e.userid,
        chatSession: n,
        toId: e.userid,
        category: 3,
        shareFrom: e.userid,
        text: i,
        time: r,
        shareId: n,
        stat: 2,
        type: e.CONS_MSG_TYPE_TIP
      };
    }, e.findLastMsg = function (t) {
      if (t) for (var n = t.length || 0, r = 0; n > r; r++) {
        var i = t[r];
        if (e.notIn(i.type, e.CONS_MSG_TYPE_TIP, e.CONS_MSG_TYPE_ILLEGAL)) return i;
      }
    }, e.isLastMsgFirst = function (t) {
      if (t && t.msgscnt && t.fromId === e.userid) {
        var n = t.msgscnt.split(",");
        if ("0" === n[0] || "0" === n[1]) return !0;
      }
    }, e.isSessionTermed = function (t) {
      return t && t.msgscnt === e.CONS_MSGSCNT_TERM ? !0 : void 0;
    }, e.rateUs = function () {
      e.send("rateUsCheck").then(function () {
        setTimeout(function () {
          return e.closeDiag();
        }, 3500), s.fs.requestReview();
      })["catch"](function (e) {
        (0, s.tlog)("error", "pickupRateSet yes", e);
      });
    }, e.firstThrowTip = function () {
      e.firReg && (e.addBottleAlert().then(function () {
        e.emit("friendsUnreadChanged"), e.loadFriendsData(e.userid);
      })["catch"](function (e) {
        (0, s.tlog)("error", "firstThrowTip", e);
      }), s.dbs.delUserProfile("firReg")["catch"](function (e) {
        return (0, s.tlog)("error", "del firstReg", e);
      }), e.emit("selectViewLoaded_contactsBoard", !0), e.emit("spaceUnreadChanged"));
    }, e.getImageIdSubDir = function (t) {
      return e.isIn(t[0], "R", "t", "n") ? t.match(/.*(...)\./)[1].toLowerCase() : t.match(/.*(..)\./)[1].toLowerCase();
    }, e.addLastBottleUserid = function (t) {
      if (e.lastBottleUserid) var n = e.lastBottleUserid.split(",");else n = [];
      var r = n.indexOf(t);
      -1 === r ? (n.push(t), n.length > 5 && n.shift()) : (n.splice(r, 1), n.push(t)), s.dbs.setUserProfile({
        lastBottleUserid: n.join(",")
      })["catch"](function (e) {
        (0, s.tlog)("error", "addLastBottleUserid", t, e);
      });
    }, e.delLastBottleUserid = function (t) {
      if (e.lastBottleUserid) {
        var n = e.lastBottleUserid.split(","),
          r = n.indexOf(t);
        -1 !== r && (n.splice(r, 1), s.dbs.setUserProfile({
          lastBottleUserid: n.join(",")
        })["catch"](function (e) {
          (0, s.tlog)("error", "delLastBottleUserid", t, e);
        }));
      }
    }, e.handleVipExp = function (t) {
      e.vipExp ? -1 === e.vipExp.indexOf(t) && (e.vipExp.push(t), e.vipExp.length > 10 && e.vipExp.shift()) : e.vipExp = [t], s.dbs.setUserProfileK("vipExp")["catch"](function (e) {
        return (0, s.tlog)("error", "handleVipExp", t, e);
      });
    }, e.handleShadowExpired = function (t) {
      "^1" === e.userid.slice(-2) ? (e.shadowExpired = t, e.shadowDb().then(function (e) {
        return e.executeSql("INSERT OR REPLACE INTO UserProfile (k, v) VALUES (?, ?)", ["shadowExpired", JSON.stringify(t)]);
      })["catch"](function (e) {
        (0, s.tlog)("error", "handleShadowExpired open database", e);
      })) : s.dbs.setUserProfile({
        shadowExpired: t
      })["catch"](function (e) {
        return (0, s.tlog)("error", "userConnConfirmed set shadowExpired", e);
      });
    }, e.addShaMM = function (t) {
      var n;
      if ("^1" === e.userid.slice(-2) && !e.notIn(e.shadowExpired, 1, 3)) {
        if (e.shaMM) {
          n = e.shaMM.split(",");
          var r = parseInt(n.pop(), 10),
            i = n.indexOf(t);
          -1 === i ? (n.push(t), n.length > 5 && n.shift()) : (n.splice(i, 1), n.push(t)), n.push(r + 1);
        } else n = [t, 1];
        e.shaMM = n.join(","), s.dbs.setUserProfileK("shaMM")["catch"](function (e) {
          return (0, s.tlog)("error", "addShaMM", n, e);
        });
      }
    }, e.shaMMDiag = function () {
      return void 0;
    }, e.renderSpinner = function () {
      return "android" === a.Platform.OS ? o["default"].createElement(a.ProgressBarAndroid, {
        style: {
          width: 29,
          height: 29
        },
        styleAttr: "Inverse"
      }) : o["default"].createElement(a.ActivityIndicatorIOS, {
        animating: !0,
        size: "small",
        color: e.darkTheme ? s.theme.white : s.theme.steelBlue
      });
    }, e.iosDvModelMap = {
      i386: "Simulator",
      x86_64: "Simulator",
      "iPod1,1": "iPod Touch",
      "iPod2,1": "iPod Touch",
      "iPod3,1": "iPod Touch",
      "iPod4,1": "iPod Touch",
      "iPod5,1": "iPod Touch",
      "iPod7,1": "iPod Touch",
      "iPhone1,1": "iPhone",
      "iPhone1,2": "iPhone 3G",
      "iPhone2,1": "iPhone 3GS",
      "iPad1,1": "iPad",
      "iPad2,1": "iPad 2",
      "iPad2,2": "iPad 2",
      "iPad2,3": "iPad 2",
      "iPad2,4": "iPad 2",
      "iPad3,1": "iPad",
      "iPad3,2": "iPad",
      "iPad3,3": "iPad",
      "iPhone3,1": "iPhone 4",
      "iPhone3,2": "iPhone 4",
      "iPhone3,3": "iPhone 4",
      "iPhone4,1": "iPhone 4S",
      "iPhone5,1": "iPhone 5",
      "iPhone5,2": "iPhone 5",
      "iPad3,4": "iPad",
      "iPad3,5": "iPad",
      "iPad3,6": "iPad",
      "iPad2,5": "iPad Mini",
      "iPad2,6": "iPad Mini",
      "iPad2,7": "iPad Mini",
      "iPhone5,3": "iPhone 5c",
      "iPhone5,4": "iPhone 5c",
      "iPhone6,1": "iPhone 5s",
      "iPhone6,2": "iPhone 5s",
      "iPhone7,1": "iPhone 6 Plus",
      "iPhone7,2": "iPhone 6",
      "iPhone8,1": "iPhone 6s",
      "iPhone8,2": "iPhone 6s Plus",
      "iPhone8,4": "iPhone SE",
      "iPhone9,1": "iPhone 7",
      "iPhone9,3": "iPhone 7",
      "iPhone9,2": "iPhone 7 Plus",
      "iPhone9,4": "iPhone 7 Plus",
      "iPhone10,3": "iPhone X",
      "iPhone10,6": "iPhone X",
      "iPhone10,1": "iPhone 8",
      "iPhone10,4": "iPhone 8",
      "iPhone10,2": "iPhone 8 Plus",
      "iPhone10,5": "iPhone 8 Plus",
      "iPhone11,2": "iPhone XS",
      "iPhone11,4": "iPhone XS Max",
      "iPhone11,6": "iPhone XS Max",
      "iPhone11,8": "iPhone XR",
      "iPhone12,1": "iPhone 11",
      "iPhone12,3": "iPhone 11 Pro",
      "iPhone12,5": "iPhone 11 Pro Max",
      "iPhone12,8": "iPhone SE2",
      "iPhone13,1": "iPhone 12 mini",
      "iPhone13,2": "iPhone 12",
      "iPhone13,3": "iPhone 12 Pro",
      "iPhone13,4": "iPhone 12 Pro Max",
      "iPhone14,4": "iPhone 13 mini",
      "iPhone14,5": "iPhone 13",
      "iPhone14,2": "iPhone 13 Pro",
      "iPhone14,3": "iPhone 13 Pro Max",
      "iPhone14,6": "iPhone SE3",
      "iPhone14,7": "iPhone 14",
      "iPhone14,8": "iPhone 14 Plus",
      "iPhone15,2": "iPhone 14 Pro",
      "iPhone15,3": "iPhone 14 Pro Max",
      "iPhone15,4": "iPhone 15",
      "iPhone15,5": "iPhone 15 Plus",
      "iPhone16,1": "iPhone 15 Pro",
      "iPhone16,2": "iPhone 15 Pro Max",
      "iPad4,1": "iPad Air",
      "iPad4,2": "iPad Air",
      "iPad4,3": "iPad Air",
      "iPad4,4": "iPad Mini 2",
      "iPad4,5": "iPad Mini 2",
      "iPad4,6": "iPad Mini 2",
      "iPad4,7": "iPad Mini 3",
      "iPad4,8": "iPad Mini 3",
      "iPad4,9": "iPad Mini 3",
      "iPad5,1": "iPad Mini 4",
      "iPad5,2": "iPad Mini 4",
      "iPad5,3": "iPad Air 2",
      "iPad5,4": "iPad Air 2",
      "iPad6,3": "iPad Pro 9.7",
      "iPad6,4": "iPad Pro 9.7",
      "iPad6,7": "iPad Pro 12.9",
      "iPad6,8": "iPad Pro 12.9",
      "iPad7,1": "iPad Pro 12.9",
      "iPad7,2": "iPad Pro 12.9",
      "iPad7,3": "iPad Pro 10.5",
      "iPad7,4": "iPad Pro 10.5",
      "iPad7,5": "iPad 6",
      "iPad7,6": "iPad 6",
      "iPad7,11": "iPad 7",
      "iPad7,12": "iPad 7",
      "iPad8,1": "iPad Pro 11",
      "iPad8,2": "iPad Pro 11",
      "iPad8,3": "iPad Pro 11",
      "iPad8,4": "iPad Pro 11",
      "iPad8,5": "iPad Pro 12.9",
      "iPad8,6": "iPad Pro 12.9",
      "iPad8,7": "iPad Pro 12.9",
      "iPad8,8": "iPad Pro 12.9",
      "iPad11,1": "iPad Mini 5",
      "iPad11,2": "iPad Mini 5",
      "iPad11,3": "iPad Air 3",
      "iPad11,4": "iPad Air 3",
      "AppleTV2,1": "Apple TV",
      "AppleTV3,1": "Apple TV",
      "AppleTV3,2": "Apple TV",
      "AppleTV5,3": "Apple TV",
      "AppleTV6,2": "Apple TV 4K"
    }, e.getModel = function () {
      if ("ios" === a.Platform.OS) {
        var t = s.reactDevInfo.getDeviceId();
        return e.iosDvModelMap[t] || t;
      }
      return s.reactDevInfo.getModel();
    }, e.deviceFrom = s.reactDevInfo.getManufacturer() + "-" + e.getModel(), e.firstInstallStepPost = function (t) {
      if (!e.firstInstallSteps[t]) {
        var n = 0,
          r = function i() {
            e.post("/api/firstInstallStep", {
              deviceId: e.deviceId,
              step: t
            }).then(function () {
              e.firstInstallSteps[t] = 1;
            })["catch"](function (r) {
              (0, s.tlog)("error", "firstInstallStep", t, r), n += 1, setTimeout(function () {
                return i();
              }, 1e3), n > 5 && !e.goCheckingRun && (e.goChecking(), n = 0);
            });
          };
        r();
      }
    }, e.throwBanned = function (t) {
      var n = Object.keys(t.illegal).join("\uff0c");
      e.has("firRegThrown") ? e.popClose(function () {
        return e.emitOnce("firRegThrown", n);
      }) : (e.tmpSayIt = e.lastBottleData, e.popClose(function () {
        return e.diag({
          header: (0, s.tr)("Send Failed"),
          content: (0, s.tr)("The bottle contains illegal words") + "\uff08" + n + "\uff09",
          buttons: [{
            text: (0, s.tr)("Ok"),
            onPress: function () {
              return e.closeDiag();
            }
          }]
        });
      }));
    }, e.clearAbuseMsg = function (t) {
      for (var n = [], r = e.msgsData[t].slice(), i = 0; i < r.length; i++) {
        var o = r[i];
        if (o) {
          if (o.fromId === e.userid && o.type !== e.CONS_MSG_TYPE_TIP) break;
          if (o.type === e.CONS_MSG_TYPE_WARN) {
            var a = babelHelpers["extends"]({}, o, {
              type: e.CONS_MSG_TYPE_TEXT
            });
            n.push([i, a]);
          }
        }
      }
      n.length && (n.forEach(function (e) {
        return r.splice(e[0], 1, e[1]);
      }), e.msgsData[t] = r, e.emit("rerenderMsgsData_" + t)), s.db.transaction(function (e) {
        n.forEach(function (n) {
          e.executeSql("UPDATE Msgs SET type=1 WHERE msgid=?", [n[1].msgid])["catch"](function (e) {
            (0, s.tlog)("error", "tx clearAbuseMsg", t, n, e);
          });
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "clearAbuseMsg", t, n, e);
      });
    }, e.reportReasonDiag = function (t, n, r) {
      e.popSpin(""), setTimeout(function () {
        e.diag({
          header: (0, s.tr)("Report..."),
          content: (0, s.tr)("Are you sure to report this guy?"),
          textInputs: [{
            placeholder: (0, s.tr)("Report reason"),
            value: ""
          }],
          buttons: [{
            text: (0, s.tr)("Cancel"),
            onPress: function () {
              return e.closeDiag();
            }
          }, {
            text: (0, s.tr)("Report"),
            onPress: function (i) {
              if (!i.isProgressing) {
                var o = {
                  type: n
                };
                o.text = i.state.textInputs[0].value.trim() + " >>> " + r, o.text ? e.closeDiag(function () {
                  return e.reportPersonDiag(t, o);
                }) : i.setState({
                  infoTip: (0, s.tr)("Input cannot be empty")
                });
              }
            }
          }]
        });
      }, 3e3 + 2e3 * Math.random());
    }, e.reportPersonDiag = function (t, n) {
      e.popSpin(""), setTimeout(function () {
        e.diag({
          header: (0, s.tr)("\u6c38\u4e45\u5220\u9664"),
          content: (0, s.tr)("\u63d0\u4ea4\u6295\u8bc9\u4f1a\u6c38\u4e45\u6027\u5220\u9664\u62c9\u9ed1\u5bf9\u65b9\uff0c\u8bf7\u8c28\u614e\u64cd\u4f5c"),
          buttons: [{
            text: (0, s.tr)("Cancel"),
            onPress: function () {
              return e.closeDiag();
            }
          }, {
            text: (0, s.tr)("\u63d0\u4ea4\u6295\u8bc9"),
            onPress: function (r) {
              r.progressing(!0);
              var i = e.currentRoutes[e.currentNavi];
              e.reportPerson(t, n, i.shareId).then(function (t) {
                e.closeDiag(function () {
                  setTimeout(function () {
                    e.tip((0, s.tr)("Thank you for your report"), !0);
                  }, 1500);
                });
              })["catch"](function (e) {
                (0, s.tlog)("error", "Report user", e), r.progressing(!1), r.setState({
                  infoTip: (0, s.tr)("Sending Failed")
                });
              });
            }
          }]
        });
      }, 3e3 + 2e3 * Math.random());
    }, e.changeMyAvatar = function (t) {
      if (e.avatarChangeDate !== e.getToday() || e.showCmdBall) {
        if (e.forbidExp || e.isForbided && e.notIn(e.isForbided, e.CONS_FORBID_AVATAR, e.CONS_FORBID_AVATAR_NAME)) e.forbidTip();else if ("ios" === a.Platform.OS) {
          var n = {
            thumbW: 100,
            thumbH: 100
          };
          "ios" === a.Platform.OS && (n.allowsEditing = !0), s.ImagePicker.show(function (n) {
            return e.changeAvatarDiag(n, t);
          }, n);
        } else {
          var r = function () {
            e.on("imagePicked", function (n) {
              e.changeAvatarDiag(n, t);
            }), e.curNavigator.navi.navForward(e.curNavigator.routes.imagePicker, function () {
              return a.Navigator.SceneConfigs.VerticalUpSwipeJump;
            });
          };
          e.permissions.photo ? r() : (e.requestPhotoDiag(), e.on("photoPermissionChanged", function () {
            e.unon("photoPermissionChanged"), e.permissions.photo && r();
          }));
        }
      } else e.popTip((0, s.tr)("Avatar could be changed only once a day"));
    }, e.naviSwitchBackCbs = [], e.naviSwitchBackTags = [], e.navSwitch = function (t) {
      "friends" === t ? (e.curNavigator = e.friendsNavigator, e.emit("switchMainTab", {
        friendsNavFlex: 1,
        mySpaceNavFlex: 0,
        aboutMeNavFlex: 0
      }, function () {
        e.emit("friendsTabSwitched");
      }), e.currentNavi = "friends") : "mySpace" === t ? (e.curNavigator = e.mySpaceNavigator, e.emit("switchMainTab", {
        friendsNavFlex: 0,
        mySpaceNavFlex: 1,
        aboutMeNavFlex: 0
      }, function () {
        e.emit("mySpaceTabSwitched");
      }), e.currentNavi = "mySpace") : (e.curNavigator = e.aboutMeNavigator, e.emit("switchMainTab", {
        friendsNavFlex: 0,
        mySpaceNavFlex: 0,
        aboutMeNavFlex: 1
      }, function () {
        e.emit("aboutMeTabSwitched");
      }), e.currentNavi = "aboutMe");
    }, e.navSwitchCb = function (t, n) {
      var r = e.currentNavi;
      e.naviSwitchBackTags.push(e.getNaviTag(t)), e.naviSwitchBackCbs.push(function () {
        e.navSwitch(r), n && n();
      }), e.navSwitch(t);
    }, e.getLastNaviSwitchTag = function () {
      return e.naviSwitchBackTags.length ? e.naviSwitchBackTags[e.naviSwitchBackTags.length - 1] : "";
    }, e.popNaviSwitch = function (t) {
      e.getLastNaviSwitchTag() === e.getNaviTag(t) && (e.naviSwitchBackCbs.pop()(), e.naviSwitchBackTags.pop());
    }, e.getNaviTag = function (t) {
      return "friends" === t ? t + "-" + e.friendsNavigator.navi.routeList.map(function (e) {
        return e.id;
      }).join("-") : "mySpace" === t ? t + "-" + e.mySpaceNavigator.navi.routeList.map(function (e) {
        return e.id;
      }).join("-") : t + "-" + e.aboutMeNavigator.navi.routeList.map(function (e) {
        return e.id;
      }).join("-");
    }, e.newRouteTo = function (t, n, r) {
      e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, t + "_", n), n.navSwipeConfig), r && e.curNavigator.addDidFocusCallback(r);
    }, e.clearInputTextSpace = function (t) {
      var n,
        r = e.currentRoutes[e.currentNavi].fid;
      if (r) {
        var i = e.msgsData[r];
        i && i[0] && i[0].msgscnt === e.CONS_FIRST_BOTTLE_MSGSCNT && (n = !0);
      }
      if ("mySpace" === e.currentNavi && "bottleFriends" === e.currentRoutes[e.currentNavi].name && (n = !0), t && n) {
        for (var o, a, u, c = [], d = 0; d < t.length;) {
          o = s.util.codePointAt(t, d), a = s.util.fromCodePoint(o), u || (u = a), 65279 === o || o >= 8192 && 8207 >= o || !/[A-Za-z0-9,.!?]/.test(u) && /\s/.test(a) || c.push(a);
          var l = a.length;
          d += l, u = a;
        }
        t = c.join("");
      }
      return t;
    }, e.snapDes = function (t, n) {
      var r = e.msgsData[t];
      if (r && r.length) {
        var i = r.findIndex(function (e) {
            return e.msgid === n;
          }),
          o = babelHelpers["extends"]({}, r[i], {
            isnew: 0
          });
        r.splice(i, 1, o), e.emit("rerenderMsgsData_" + t);
      }
      e.removeMsgNewMark(n);
    }, e.forbidUser = function (t, n, r, i, o) {
      n === e.CONS_FORBID_PICK ? e.send("pickupUser", {
        friendId: t
      }).then(function (t) {
        t.notExist ? e.tip("notExist", !0) : t.pickupSelf && e.tip("pickupSelf", !0);
      })["catch"](function (e) {
        return (0, s.tlog)("error", "pickupUser", t, e);
      }) : (e.noAutoChangeMsger = 1, e.send("forbidUser", {
        userid: t,
        forbid: n,
        force: r,
        obw: i,
        sendTimeoutIntv: 6e6
      }).then(function (r) {
        if (o && o(), delete e.noAutoChangeMsger, r.notYet) return void e.tip((0, s.tr)("Not yet"));
        r.forbidCnt ? e.popTip(r.forbidCnt) : r.del ? e.popTip("del") : r.noReport ? e.popTip("noRp") : e.popTip("forbid " + n);
        var i = e.profiles[t];
        if (r.fip && (e.fipMap[r.fip] ? e.fipMap[r.fip] += 1 : e.fipMap[r.fip] = 1), n === e.CONS_FORBID_NORP) {
          var a = "4:" + e.userid,
            u = e.sharesData[a];
          u && (e.sharesData[a] = u.filter(function (n) {
            if (n.category === e.CONS_MSG_CAT_LOAD_SHARE_LIMIT || n.msgs[0].fromId) {
              var r = e.getUserShadowId(n.msgs[0].fromId),
                i = r.userid,
                o = e.getUserShadowId(t),
                a = o.userid;
              return i !== a;
            }
            return (0, s.tlog)("error", "forbidUser.1", t, n), !0;
          }), e.emit("rerenderSharesData_" + a));
        } else if (i && i.forbid === e.CONS_FORBID_NORMAL && i.ip && e.isIn(n, e.CONS_FORBID_CIRCAL, e.CONS_FORBID_FAKE, e.CONS_FORBID_BLOCK)) {
          var c = function (t) {
            for (var n in e.profiles) {
              var r = e.profiles[n];
              r.ip === t && (r.ipCnt -= 1, e.emit("userNameChanged_" + n, null, !0));
            }
          };
          c(i.ip);
          var d = e.getShadowId(t),
            l = e.profiles[d];
          l && l.ip && c(l.ip);
        }
        if (!r.paidUser) {
          var f = "4:" + e.userid,
            h = e.sharesData[f];
          return n === e.CONS_FORBID_DEL && h && (e.sharesData[f] = h.filter(function (n) {
            if (n.category === e.CONS_MSG_CAT_LOAD_SHARE_LIMIT || n.msgs[0].toId) {
              var r = e.getUserShadowId(n.msgs[0].toId),
                i = r.userid,
                o = e.getUserShadowId(t),
                a = o.userid;
              return i !== a;
            }
            return (0, s.tlog)("error", "forbidUser.2", t, n), !0;
          }), e.emit("rerenderSharesData_" + f)), s.dbs.setProfile(t, {
            forbid: n
          });
        }
        if (r.shaExp) var g = Math.floor((r.shaExp - e.now()) / 24 / 3600 / 1e3);else g = -1;
        var c = function () {};
        e.diag({
          header: (0, s.tr)("Tip"),
          content: (0, s.tr)("Paid user, ## left", g),
          buttons: [{
            text: (0, s.tr)("Force"),
            onPress: function () {
              return e.closeDiag(function () {
                return c(n, 1);
              });
            }
          }, {
            text: (0, s.tr)("Ok"),
            onPress: function () {
              return e.closeDiag();
            }
          }]
        });
      }).then(function () {
        e.emit("userNameChanged_" + t, null, !0), e.emit("userAvatarChanged_" + t), e.loadProfile(t);
        var r = e.getShadowId(t);
        s.dbs.delAllProfile(r).then(function () {
          return e.getProfile(r);
        }).then(function () {
          return s.dbs.setProfile(r, {
            forbid: n
          });
        }).then(function () {
          e.emit("userNameChanged_" + r, null, !0);
        })["catch"](function (e) {
          (0, s.tlog)("error", "forbid change shadow", e);
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "forbidUser", e);
      }));
    }, e.csInfoDiag = function (t, n, r, i, o, u) {
      e.send(t, {
        userid: n
      }).then(function (c) {
        var d = c.s,
          l = c.country,
          f = c.cnt,
          h = c.ip,
          g = c.mcnt,
          p = c.reportC,
          m = c.phoneNum,
          P = c.pickupC,
          v = c.brCnt;
        f && o && o();
        var S = "-" + (g || 0) + "-" + (P || 0) + "-" + (v || 0);
        if (e.profiles[n]) {
          var b = e.profiles[n];
          S = e.deviceTrans(b.deviceFrom) + S;
        }
        m && "+86" === m.slice(0, 3) && (S = "+" + S), S = " " + S, i || (e.syncFriendProfile(n), e.closeDiag(function () {
          return e.diag({
            header: (0, s.tr)("Tip"),
            scontent: d.reverse(),
            content: (p || "") + " " + (l || "") + S,
            contentStyle: {
              paddingBottom: 0
            },
            content2: f || "",
            contentOnPress: function () {
              return e.findIp({
                rg: l
              });
            },
            contentOnLongPress: function () {
              e.diag({
                header: (0, s.tr)("Tip"),
                textInputs: [{
                  value: l
                }],
                buttons: [{
                  text: (0, s.tr)("Cancel"),
                  onPress: function () {
                    return e.closeDiag();
                  }
                }, {
                  text: (0, s.tr)("Ok"),
                  onPress: function (t) {
                    var n = t.state.textInputs[0].value.trim();
                    e.findIp({
                      rg: n
                    });
                  }
                }]
              });
            },
            content2OnPress: function () {
              e.findIp({
                ip: h,
                userid: n
              });
            },
            content2OnLongPress: function () {
              e.findIp({
                ip: h,
                userid: n
              });
            },
            scontentOnPress: function (t) {
              var n = t.t || t;
              e.lastAddfTest = n, e.send("addfTip", {
                r: n
              })["catch"](function (e) {
                return (0, s.tlog)("error", "csInfoDiag addfTip", n, e);
              });
            },
            noModel: "android" !== a.Platform.OS,
            scontentOnLongPress: function (t) {
              if (t.f) if (e.modelViewRef.hide(), e.navSwitchCb("friends", function () {
                return e.modelViewRef.unHide();
              }), t.t && "^^^" === t.t.slice(0, 3)) e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "space_", {
                friendId: "3:" + n,
                name: (0, s.tr)("Space")
              }));else {
                var r = e.newRoute(e.curNavigator.routes, "interact_", {
                    name: (0, s.tr)("Message")
                  }),
                  i = n,
                  o = t.f,
                  a = e.getChatSession(i, o);
                r.friend = {
                  shareId: a,
                  chatSession: a,
                  shareFrom: i,
                  fromId: i,
                  type: 1,
                  descCategory: 3,
                  friendId: o,
                  toId: o,
                  isReport: !0,
                  myselfId: i,
                  isStock: 1
                }, e.curNavigator.navi.navForward(r);
              }
            },
            link: {
              text: (0, s.tr)("showA"),
              style: {
                paddingTop: 2
              },
              onPress: function (t) {
                e.showChaa = !e.showChaa, t.setState({});
              }
            },
            buttons: [{
              text: "Re",
              onPress: function () {
                return e.closeDiag(function () {
                  return e.forbidUser(n, e.CONS_FORBID_NORMAL);
                });
              }
            }, {
              text: "Ab",
              onPress: function () {
                return e.closeDiag(function () {
                  e.navSwitchCb("friends"), e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "about_", {
                    friendId: n,
                    name: (0, s.tr)("Profile")
                  }));
                });
              }
            }, {
              text: "Ca",
              onPress: function () {
                return e.closeDiag(function () {
                  return u && e.forbidUser(n, 1 === u ? e.CONS_FORBID_NORP : e.CONS_FORBID_DEL);
                });
              }
            }, {
              text: "No",
              onPress: function () {
                return e.closeDiag(function () {
                  e.forbidUser(n, e.CONS_FORBID_FAKE, null, null, function () {
                    f && "onAvatarPress" === r && e.csInfoDiag(t, n, r, !0, function () {
                      return e.findIp({
                        ip: h,
                        userid: n
                      });
                    });
                  });
                });
              }
            }, {
              text: "Ch",
              onPress: function () {
                return e.closeDiag(function () {
                  return e.forbidUser(n, e.CONS_FORBID_CIRCAL);
                });
              }
            }, {
              text: "Bl",
              onPress: function () {
                e.closeDiag(function () {
                  return e.forbidUser(n, e.CONS_FORBID_BLOCK);
                });
              }
            }]
          });
        }));
      })["catch"](function (e) {
        (0, s.tlog)("error", "csInfoDiag " + r, e);
      });
    }, e.markObu = function (t) {
      if (e.obwData) {
        for (var n = e.obwData.slice(), r = e.getShadowId(t), i = 0, o = [], a = n.length, s = 0; a > s; s++) {
          var u = n[s];
          if (e.isIn(u.u, t, r) && (i += 1, o.push(s)), i > 1) break;
        }
        o.forEach(function (e) {
          n.splice(e, 1, babelHelpers["extends"]({}, n[e], {
            r: 1
          }));
        }), e.obwData = n, e.obwViewRerender();
      }
    }, e.decOuid = function (t, n) {
      if (e.ouidData) {
        var r = e.ouidData.slice();
        for (var t in n) {
          var i = r.findIndex(function (e) {
            return e.w === t;
          });
          if (-1 !== i) {
            var o = r[i];
            r.splice(i, 1, babelHelpers["extends"]({}, r[i], {
              c: o.c - n[t]
            }));
          }
        }
        e.ouidData = r, e.ouidViewRerender();
      }
    }, e.initUmeng = function () {}, e.versionCompare = function (e, t) {
      var n = e.split(".").map(function (e) {
          return parseInt(e, 10);
        }),
        r = t.split(".").map(function (e) {
          return parseInt(e, 10);
        });
      return n[0] > r[0] ? 1 : n[0] < r[0] ? -1 : n[1] > r[1] ? 1 : n[1] < r[1] ? -1 : n[2] > r[2] ? 1 : n[2] < r[2] ? -1 : 0;
    }, e.findIp = function (t) {
      var n = t.ip,
        r = t.rg,
        i = t.userid;
      e.send("findIp", {
        ip: n,
        rg: r,
        userid: i
      }).then(function (t) {
        e.closeDiag(), e.navSwitchCb("aboutMe"), t.rs ? e.newRouteTo("suSelect", {
          type: "auid",
          rs: t.rs
        }) : (0, s.tlog)("error", "findIp empty", n);
      })["catch"](function (e) {
        (0, s.tlog)("error", "findIp", n, e);
      });
    };
  };
});
