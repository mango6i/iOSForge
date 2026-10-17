// Free maintenance changes; original factory retained under reference/original-modules/320.js.
__d(320, function (e, t, n, r) {
  var __recoveryFreePolicy = t(9000);
  var i = t(311),
    o = (babelHelpers.interopRequireDefault(i), t(312)),
    s = t(314);
  t(314);
  n.exports = function (e) {
    e.updateFriendNames = function (t) {
      return 0 !== t.length ? new Promise(function (n, r) {
        try {
          e.sdb.transaction(function (n) {
            t.forEach(function (t) {
              var r = t.name,
                i = t.friendId;
              e.profiles[i] = babelHelpers["extends"]({}, e.profiles[i], {
                name: r
              }), n.executeSql("\n            INSERT OR REPLACE INTO SProfiles (userid, k, v) VALUES (?, ?, ?)\n          ", [i, "name", JSON.stringify(r)])["catch"](function (e) {
                (0, s.tlog)("error", "updateFriendNames SProfiles", i, r, e);
              }), n.executeSql("\n            UPDATE Friends SET name=? WHERE userid=? AND friendId=?\n          ", [r, e.userid, i])["catch"](function (e) {
                (0, s.tlog)("error", "updateFriendNames Friends", i, r, e);
              }), e.emit("userNameChanged_" + i, r);
            });
          }).then(function () {
            return n();
          })["catch"](function (e) {
            return (0, s.tlog)("error", "updateFriendNames setProfile", e);
          }), n();
        } catch (i) {
          (0, s.tlog)("error", "updateFriendNames", i);
        }
      }) : void 0;
    }, e.addUnreadCounter = function (e) {
      return 0 !== e.length ? s.db.transaction(function (t) {
        e.forEach(function (e) {
          e.uc && t.executeSql("\n          INSERT INTO UnreadCounter (c) VALUES (?)\n        ", [e.uc])["catch"](function (t) {
            (0, s.tlog)("error", "tx addUnreadCounter", e, t);
          });
        });
      })["catch"](function (t) {
        (0, s.tlog)("error", "addUnreadCounter", e, t);
      }) : void 0;
    }, e.updateFriendAvatars = function (t) {
      return 0 !== t.length ? new Promise(function (n, r) {
        try {
          t.forEach(function (t) {
            var n = t.avatar,
              r = t.friendId;
            s.dbs.setProfile(r, {
              avatar: n
            }), e.emit("userAvatarChanged_" + r);
          }), n();
        } catch (i) {
          (0, s.tlog)("error", "updateFriendAvatars", i);
        }
      }) : void 0;
    }, e.addSuidUnread = function (t) {
      s.dbs.setUserProfile({
        suid: t
      }).then()["catch"](function (e) {
        return (0, s.tlog)("error", "addSuidUnread", e);
      }), e.emit("aboutMeUnreadChanged");
    }, e.addToFetchUnreadParamsBuf = function (t) {
      var n = e.showCmdBall ? 20 : 3;
      e.fetchUnreadParamsBuf.length >= n && e.fetchUnreadParamsBuf.shift(), e.fetchUnreadParamsBuf.push(t);
    }, e.requestPermission = function (t) {
      var n = t.type,
        r = t.header,
        i = t.content,
        a = t.btn1,
        d = t.btn2,
        c = t.callback;
      return s.Permissions.check(n).then(function (t) {
        if ("ios" === o.Platform.OS && "denied" === t || "android" === o.Platform.OS && "restricted" === t) i ? e.closeDiag(function () {
          return e.diag({
            header: (0, s.tr)(r || "Tip"),
            content: i,
            buttons: [{
              text: (0, s.tr)(a || "Cancel"),
              onPress: function (t) {
                return e.closeDiag();
              }
            }, {
              text: (0, s.tr)(d || "OK"),
              onPress: function (t) {
                return e.closeDiag(function () {
                  s.Permissions.openSettings();
                });
              }
            }]
          });
        }) : s.Permissions.openSettings();else {
          if ("undetermined" === t || "android" === o.Platform.OS && "denied" === t) return "android" === o.Platform.OS && (e.tmpAppStateChange = "in"), s.Permissions.request(n).then(function (t) {
            var r = 0;
            return "authorized" === t ? r = 1 : ("ios" === o.Platform.OS && "denied" === t || "android" === o.Platform.OS && "restricted" === t) && (r = ""), e.permissions[n] = r, e.emit(n + "PermissionChanged"), "notification" === n && e.sendNotiOk(), c && c(), e.resetSharedParas("permissions");
          });
          e.permissions[n] = 1, e.emit(n + "PermissionChanged"), c && c();
        }
      })["catch"](function (e) {
        (0, s.tlog)("error", "request permission", e);
      });
    }, e.checkPermissions = function () {
      return s.Permissions.checkMultiple(["camera", "photo", "notification", "microphone", "contacts"]).then(function (t) {
        var n = {},
          r = !1;
        for (var i in t) {
          var a = 0,
            d = t[i];
          "authorized" === d ? a = 1 : ("ios" === o.Platform.OS && "denied" === d || "android" === o.Platform.OS && "restricted" === d) && (a = ""), n[i] = a, n[i] !== e.permissions[i] && (r = !0, (0, s.tlog)("permission changed", i, n[i], e.permissions[i]), e.permissions[i] = n[i], e.emit(i + "PermissionChanged"), "notification" === i && e.sendNotiOk());
        }
        return e.permissionChecked = !0, e.emit("permissionChecked"), r ? e.resetSharedParas("permissions") : void 0;
      })["catch"](function (e) {
        (0, s.tlog)("error", "Permissions.checkMultiple", e);
      });
    };
    var t = "ios" === o.Platform.OS ? "Access" : "Permissions";
    e.showFriendsInContactsDiag = function () {
      e.requestPermission({
        type: "contacts",
        content: (0, s.tr)("You need to allow " + t + " of Contacts before you can share to friends in contacts")
      }), e.on("contactsPermissionChanged", function () {
        e.unon("contactsPermissionChanged"), e.permissions.contacts && e.setSharedParas({
          contactsFirstChecked: 1
        }).then(function () {
          e.handleContacts();
        })["catch"](function (e) {
          (0, s.tlog)("error", "showFriendsInContactsDiag", e);
        });
      });
    }, e.requestPhotoDiag = function () {
      e.requestingPhotoPermission || (e.requestingPhotoPermission = !0, setTimeout(function () {
        delete e.requestingPhotoPermission;
      }, 2e3), e.requestPermission({
        type: "photo",
        content: (0, s.tr)("You need to allow " + t + " of " + ("ios" === o.Platform.OS ? "Photos" : "Storage") + " before you can select photos")
      }));
    }, e.requestCameraDiag = function (n) {
      e.requestingCamPermission || (e.requestingCamPermission = !0, setTimeout(function () {
        delete e.requestingCamPermission;
      }, 2e3), e.requestPermission({
        type: "camera",
        content: (0, s.tr)("You need to allow " + t + " of Camera before you could use it to take photos or videos"),
        callback: n
      }));
    }, e.requestMicDiag = function (n) {
      e.requestingMicPermission || (e.requestingMicPermission = !0, setTimeout(function () {
        delete e.requestingMicPermission;
      }, 2e3), e.requestPermission({
        type: "microphone",
        content: (0, s.tr)("You need to allow " + t + " of Microphone before you could use it to record audio"),
        callback: n
      }));
    }, e.requestCamMicDiag = function (t) {
      "ios" === o.Platform.OS ? e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("You need to turn on Access of Microphone in order to record sound in video"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (n) {
            return e.closeDiag(function () {
              return t(!0);
            });
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (n) {
            return e.closeDiag(function () {
              return e.requestPermission({
                type: "microphone",
                callback: function () {
                  return t(!0);
                }
              });
            });
          }
        }]
      }) : e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("You need to turn on Permissions of Microphone in order to record sound in video"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (n) {
            return e.closeDiag(function () {
              return t(!1);
            });
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (n) {
            return e.closeDiag(function () {
              return e.requestPermission({
                type: "microphone",
                callback: function () {
                  return t(e.permissions.microphone);
                }
              });
            });
          }
        }]
      });
    }, e.enableNotificationDiag = function (t) {
      if ("" === e.permissions.notification) {
        var n = (0, s.tr)("You should turn on App Notifications before you could set ## Notifications", t);
        e.diag({
          header: (0, s.tr)("Tip"),
          content: n,
          buttons: [{
            text: (0, s.tr)("Not Now"),
            onPress: function (t) {
              return e.closeDiag();
            }
          }, {
            text: (0, s.tr)("OK"),
            onPress: function (t) {
              return e.closeDiag(function () {
                return e.requestPermission({
                  type: "notification"
                });
              });
            }
          }]
        });
      } else e.requestPermission({
        type: "notification"
      });
    }, e.firstAskTurnOnNotificationDiag = function () {
      e.firstNoti && (e.setSharedParas({
        firstNoti: 1
      }), "ios" === o.Platform.OS && 0 === e.permissions.notification && e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("Please allow notifications or you will not be notified"),
        buttons: [{
          text: (0, s.tr)("Continue"),
          onPress: function (t) {
            return e.closeDiag(function () {
              return e.requestPermission({
                type: "notification"
              });
            });
          }
        }]
      }));
    }, e.__old_requestPhotoDiag = function () {
      if ("" === e.permissions.photo) {
        if ("ios" === o.Platform.OS) var t = "You need to allow Photos access before selecting photos";else t = "You need to allow `Permission of Storage`  before selecting photos";
        o.Alert.alert((0, s.tr)("Select Photos"), (0, s.tr)(t), [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {},
          style: "cancel"
        }, {
          text: "OK",
          onPress: function () {
            return e.requestPermission({
              type: "photo"
            });
          }
        }]);
      } else e.requestPermission({
        type: "photo"
      });
    }, e.__old_requestCameraDiag = function (t) {
      var n = "";
      e.permissions.camera || (n = "Camera"), e.permissions.microphone || (n && (n += " and "), n += "Microphone");
      var r = (0, s.tr)("You need to allow " + n + " access before you can use Camera to take photo or video");
      e.diag({
        header: (0, s.tr)("Camera"),
        content: r,
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("OK"),
          onPress: function (n) {
            return e.closeDiag(function () {
              if (e.permissions.camera) {
                if (!e.permissions.microphone) return e.requestPermission({
                  type: "microphone"
                }).then(function () {
                  return e.permissions.photo ? void 0 : e.requestPermission({
                    type: "photo"
                  });
                }).then(function () {
                  return t();
                });
                if (!e.permissions.photo) return e.requestPermission({
                  type: "photo"
                }).then(function () {
                  return t();
                });
              } else e.requestPermission({
                type: "camera"
              }).then(function () {
                return e.permissions.microphone ? void 0 : e.requestPermission({
                  type: "microphone"
                });
              }).then(function () {
                return e.permissions.photo ? void 0 : e.requestPermission({
                  type: "photo"
                });
              }).then(function () {
                return t();
              });
            });
          }
        }]
      });
    }, e.__old_requestMicDiag = function (t) {
      if ("" === e.permissions.microphone) {
        if ("ios" === o.Platform.OS) var n = (0, s.tr)("You need to allow Microphone access before you can recording audio");else n = (0, s.tr)("You need to allow `Permission of Microphone` before you can recording audio");
        e.diag({
          header: (0, s.tr)("Microphone"),
          content: n,
          buttons: [{
            text: (0, s.tr)("Cancel"),
            onPress: function (t) {
              return e.closeDiag();
            }
          }, {
            text: (0, s.tr)("OK"),
            onPress: function (n) {
              return e.closeDiag(function () {
                return e.requestPermission({
                  type: "microphone",
                  callback: t
                });
              });
            }
          }]
        });
      } else e.requestPermission({
        type: "microphone",
        callback: t
      });
    }, e.__old_turnOnNotificationDiag = function () {
      var t = (0, s.tr)("Turn on `Notifications` could let you be notified when you have new incoming messages");
      "" === e.permissions.notification ? e.diag({
        header: (0, s.tr)("Notifications"),
        content: t,
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("OK"),
          onPress: function (t) {
            return e.closeDiag(function () {
              return e.requestPermission({
                type: "notification"
              });
            });
          }
        }]
      }) : e.requestPermission({
        type: "notification"
      });
    }, e.testOldConnect = function (t) {
      return new Promise(function (n, r) {
        e.ws ? (e.testOldConnectCallback = function () {
          delete e.testOldConnectCallback, e.emit("msgsFetched"), t.backConnect || (t.testOldConnect = !0, e.fetchUnread(t)), n();
        }, e.ws.send("t")) : n();
      });
    }, e.launchConnect = function (t) {
      if (!e.dbIsReady) return void (0, s.tlog)("Db is not ready, return launchConnect");
      if (e.emit("msgsFetching"), e.isConnected) {
        var n = {
          backConnect: !1,
          testOldConnect: !1,
          testOcTime: e.now()
        };
        e.backConnectTime = Date.now(), s.wsc.connectToServer("backConnect", n), e.testOldConnect(n);
      } else s.wsc.connectToServer("launchConnect_" + t);
    }, e.filterUnread = function (t) {
      if (0 === t.length) return [];
      var n = [],
        r = !1,
        i = e.unreadCounter,
        o = i.counterList,
        s = i.counterMap;
      if (t.forEach(function (e) {
        s[e.uc] || (n.push(e), e.uc && (r = !0, s[e.uc] = 1, o.push(e.uc)));
      }), r) {
        o.sort(function (e, t) {
          return e - t;
        });
        var a = o.length;
        if (a > 300) {
          a -= 300;
          for (var d = 0; a > d; d++) {
            var c = o[d];
            delete s[c];
          }
          e.unreadCounter.counterList = o.slice(a);
        }
      }
      return n;
    }, e.splitMissingUnreads = function (e, t, n) {
      if (n || (n = 100), n > t - e) return [{
        start: e,
        end: t
      }];
      for (var r = [], i = 0; t > i;) i = e + n, i > t && (i = t), r.push({
        start: e,
        end: i
      }), e = i - 1;
      return r;
    }, e.checkUnreadMissing = function (t) {
      for (var n = e.unreadCounter.counterList, r = n.length - 1, i = n[r], o = r - 1; o >= 0; o--) {
        var s = n[o];
        if (i - s > 1) {
          t.missingUnreadItem = i - 1;
          break;
        }
        i = s;
      }
    }, e.checkUnreadRR = function (t) {
      if (!(e.unReadMissing.length > 0)) {
        var n = e.unreadCounter.counterList;
        if (n.length > 0) {
          var r = n[n.length - 1];
          t - 1 - r > 0 && (e.unReadMissing = e.unReadMissing.concat(e.splitMissingUnreads(r, t)));
        }
      }
    }, e.fetchUnread = function (t) {
      return new Promise(function (n, r) {
        if (e.isFetchingUnread) ;else {
          var i = {
            unReadShares: {},
            unReadShareMsgs: {},
            unReadReplyMsgs: {},
            unReadMsgs: [],
            unReadFriendReplyMsgs: {},
            unReadDeleteShares: {},
            unReadFriendDeleteMsgs: {},
            unReadDeleteMsgs: {},
            shareFriendsShareIds: {},
            newMsgs: {},
            friendsUpdates: {},
            shareFriendsUpdates: {},
            unReadDelete: [],
            unReadShareDelete: [],
            deleteDbShares: {},
            friends: [],
            followers: [],
            changedAvatars: [],
            changedNames: [],
            unReadDeleteShareMsgs: {},
            deleteMsgs: [],
            subtractShares: {},
            deleteDbMsgs: {},
            bufferedContacts: [],
            shouldUpdateCircleIds: [],
            addLucksLimit: 0,
            addTargetShares: [],
            debugControlCommandReq: [],
            addedGroupMembers: [],
            removedGroupMembers: [],
            sessionFilesDelete: [],
            atimeRecoil: [],
            unStares: [],
            unReadUpdates: {},
            changeMsgIds: {},
            changeAids: {},
            editMsgs: {},
            sessionMsgs: [],
            ureadOk: [],
            newFollowers: {}
          };
          e.isFetchingUnread = !0;
          var o,
            a = {
              sendTimeoutIntv: 15e3
            };
          a.act = "active" === e.appState ? 1 : 0, e.iosBg && (a.bg = 1);
          var d = function () {
              e.runUreadCallbacks && (e.runUreadCallbacks.forEach(function (e) {
                return e();
              }), delete e.runUreadCallbacks);
            },
            c = Date.now();
          (t && t.unRead ? Promise.resolve(t) : e.send("fetchUnread", a)).then(function (t) {
            if (t.time) {
              var n = Date.now(),
                r = Math.floor((n - c - (t.calTime || 0)) / 2);
              e.timeDiff = t.time - r - c;
            }
            t.ucs = t.unRead.map(function (e) {
              return e.uc;
            }), o = t, e.isLocking("dbDataIsLoading") ? e.addLockCb("dbDataIsLoading", function () {
              return u();
            }) : u();
          })["catch"](function (e) {
            return (0, s.tlog)("error", "send fetchUnread", t || "", e);
          });
          var u = function () {
            return Promise.resolve().then(function () {
              return o.unRead ? void e.lock("isHandlingUnread") : Promise.reject("__reject_break");
            }).then(function () {
              return o.shaM && e.shaM !== o.shaM && s.dbs.setUserProfile({
                shaM: o.shaM
              }).then(function () {
                e.emit("spaceUnreadChanged");
              })["catch"](function (e) {
                return (0, s.tlog)("error", "set shaM", o.shaM, e);
              }), o.syncVar && s.dbs.setUserProfile({
                syncVar: o.syncVar
              })["catch"](function (e) {
                return (0, s.tlog)("error", "set syncVar", o.syncVar, e);
              }), e.pkgvv !== o.pkgvv && (o.pkgvv ? e.setSharedParas({
                pkgvv: o.pkgvv
              })["catch"](function (e) {
                return (0, s.tlog)("error", "set pkgvv", o.pkgvv, e);
              }) : e.delSharedParas("pkgvv")["catch"](function (e) {
                return (0, s.tlog)("error", "del pkgvv", e);
              }), (0, s.tlog)("pkgvv changed", o.pkgvv, e.pkgvv), e.emit("pkgvvChanged")), i.unRead = e.filterUnread(o.unRead), 0 === i.unRead.length ? Promise.reject("__reject_break") : (e.addToFetchUnreadParamsBuf(i), e.traverseUnread(i), e.refreshUnreadMsgs(i), e.updateFriendsInDb(i));
            }).then(function () {
              return e.insertUnread(i);
            }).then(function () {
              return e.insertNewMsgs(i);
            }).then(function () {
              return e.deleteUnread(i);
            }).then(function () {
              return e.insertNewShares(i);
            }).then(function () {
              i.shouldUpdateCircleIds.length && (e.emit("forceRerenderAll_8:" + e.userid), i.shouldUpdateCircleIds.forEach(function (t) {
                e.emit("forceRerenderAll_" + t);
              }));
            }).then(function () {}).then(function () {
              return Promise.all([e.pseudoDeleteSharesInDb(i.deleteDbShares), e.pseudoDeleteMsgsInDb(i.deleteDbMsgs), e.saveFriends(i.friends), e.updateFriendAvatars(i.changedAvatars), e.updateFriendNames(i.changedNames), e._addGroupMembers(i.addedGroupMembers)]);
            }).then(function () {}).then(function () {
              i.suid && e.addSuidUnread(i.suid), i.debugControlCommandReq.length > 0 && e.handleDebugControlCommandReq(i.debugControlCommandReq), i.sessionMsgs.length && e.addSessionMsg(i.sessionMsgs, !0), i.sessionFilesDelete.length > 0 && e.deleteSessionMsg(i.sessionFilesDelete);
            }).then(function () {
              e.emit("friendsUnreadChanged"), e.emit("spaceUnreadChanged"), e.loadFriendsDataAsync();
            }).then(function () {
              i.shouldUpdateMsgFriends && e.loadMsgFriendsData("8:" + e.userid)["catch"](function (e) {
                return (0, s.tlog)("error", "load msg friends", e);
              });
            }).then(function () {
              i.hasBottle && e.loadFriendsDataAsync("3:" + e.userid), i.newFollowers.cnt > 0 && e.loadProfile(e.userid);
            }).then(function () {
              return i.unRead ? e.addUnreadCounter(i.unRead) : void 0;
            }).then(function () {
              e.isFetchingUnread = !1, e.unlock("isHandlingUnread"), e.isHandlingUnreadCallbacks.length && (e.isHandlingUnreadCallbacks.forEach(function (e) {
                return e();
              }), e.isHandlingUnreadCallbacks = []), d(), e.emit("msgsFetched"), e.storyPicking || e.lazyRefreshRun(), n();
            })["catch"](function (t) {
              try {
                e.isFetchingUnread = !1, e.unlock("isHandlingUnread"), e.isHandlingUnreadCallbacks.length && (e.isHandlingUnreadCallbacks.forEach(function (e) {
                  return e();
                }), e.isHandlingUnreadCallbacks = []), d(), e.emit("msgsFetched"), e.storyPicking || e.lazyRefreshRun(), "__reject_break" === t ? n() : ((0, s.tlog)("error", "fetchUnread break", t), i.fetchUnreadHandleError = t, r(t));
              } catch (t) {
                r(t);
              }
            }).then(function () {
              return o.ucs.length && !o.isMiss ? e.send("fetchUnreadFinished", {
                ucs: o.ucs
              }) : i.missingUnreadItem ? e.send("fetchUnreadMissing", {
                miss: i.missingUnreadItem
              }) : void 0;
            }, function (n) {
              return (0, s.tlog)("error", "fetchUnread error", o.ucs, t || "", e.fnow(), n), o.ucs.length && !o.isMiss ? e.send("fetchUnreadFinished", {
                ucs: o.ucs
              }) : i.missingUnreadItem ? e.send("fetchUnreadMissing", {
                miss: i.missingUnreadItem
              }) : void 0;
            }).then(function (t) {
              if (t && t.unRead) {
                if (t.unRead.length) return t.isMiss = !0, e.fetchUnread(t);
                var n = i.missingUnreadItem,
                  r = e.unreadCounter.counterList.findIndex(function (e) {
                    return e > n;
                  });
                return e.unreadCounter.counterList.splice(r, 0, n), e.unreadCounter.counterMap[n] = 1, e.addUnreadCounter([{
                  uc: n
                }]);
              }
            })["catch"](function (e) {
              (0, s.tlog)("error", "fetchUnread crash", t || "", e);
            });
          };
        }
      });
    }, e.introMsgs = ["Write a story you wanna tell.", "Choose who can pick up your story. It could be your friends or non-friends.", "The story will be anonymous in 24 hours when someone pick it up.", "When you send it to friends, it will have a chance to be posted to some non-friends in this app.", "So if your story get replied, who will you be chatting with ?", "You will find it after 24 hours.", "Take a try \ud83d\ude01"], e.introMsgs2 = [(0, s.tr)("The story you post will be anonymous in 24 hours when someone pick it up. And the message sent by them during this 24 hours will also be anonymous.")], e.howToIncreasePickChance = function () {
      e.tip((0, s.tr)("When you get more friends, you will get more chances to pick up the story."));
    }, e.pickupBottle = function (t) {
      if (e.tpwd) return void e.tip((0, s.tr)("Pickup cannot be used in teenager mode"));
      if (t || e.popProg((0, s.tr)("\u770b\u770b")), e.pickupBottleT || (e.pickupBottleT = 0), Date.now() - e.pickupBottleT < 550) {
        if (e.setTimeoutPickup) return;
        return e.setTimeoutPickup = !0, void setTimeout(function () {
          delete e.setTimeoutPickup, e.pickupBottle(!0);
        }, 550 - (Date.now() - e.pickupBottleT));
      }
      e.pickupBottleT = Date.now(), e.pickStartTime || (e.pickStartTime = Date.now(), e.send("pickupBottle", {
        tester: e.isTempUserid() ? 1 : void 0
      }).then(function (t) {
        if (e.pickStartTime = 0, clearTimeout(e.pickStartTimer), void 0 !== t.stars && (e.stars = t.stars, s.dbs.setUserProfile({
          stars: t.stars
        })["catch"](function (e) {
          return (0, s.tlog)("error", "pickupBottle setUserProfile", e);
        }), e.emit("userChanged")), t.insufficientStars) return e.popClose(), void e.diag({
          header: "提示",
          content: __recoveryFreePolicy.unavailableMessage,
          buttons: [{
            text: (0, s.tr)("Cancel"),
            onPress: function () {
              return e.closeDiag();
            }
          }]
        });
        if (t.over) setTimeout(function () {
          s.dbs.setUserProfile({
            pickupOver: t.over,
            nextBottleTime: t.nextPt || 3
          }), e.emit("pickupStateChanged");
        }, 800);else if (t.overNow) {
          if (s.dbs.setUserProfile({
            pickupOver: t.overNow,
            nextBottleTime: t.nextPt || 3
          }), e.emit("pickupStateChanged"), "^1" === e.userid.slice(-2)) e.popTip((0, s.tr)("The pickup chances used up."));else {
            var n = new Date(e.now()).getHours();
            e.popClose(function () {
              return e.diag({
                title: (0, s.tr)("Switch Shadow"),
                content: n < e.nextBottleTime ? (0, s.tr)("Pickup after ##:00 PM or switchShadow to get more chances", e.nextBottleTime) : (0, s.tr)("The pickup chances used up. Switch shadow to get more chances"),
                buttons: [{
                  text: (0, s.tr)("Cancel"),
                  onPress: function () {
                    return e.closeDiag();
                  }
                }, {
                  text: (0, s.tr)("Switch Shadow"),
                  onPress: function () {
                    return e.switchShadow(!0);
                  }
                }]
              });
            });
          }
        } else t.noPickupS ? (e.popClose(), e.pickupSettings(function () {
          return e.pickupBottle();
        }, !1)) : t.pop ? (e.popClose(), e.diag({
          header: (0, s.tr)("Tip"),
          content: (0, s.tr)("The pickup chances used up today. Rate us with 5 stars will double your daily chances."),
          buttons: [{
            text: (0, s.tr)("Not yet"),
            onPress: function (t) {
              t.isProgressing || (e.closeDiag(), e.send("pickupRateSet")["catch"](function (e) {
                return (0, s.tlog)("error", "pickupRateSet no", e);
              }));
            }
          }, {
            text: (0, s.tr)("5 stars"),
            onPress: function (t) {
              t.isProgressing || (t.progressing(!0), e.send("pickupRateSet", {
                yes: 1
              }).then(function () {
                setTimeout(function () {
                  return e.closeDiag();
                }, 3500), s.fs.requestReview();
              })["catch"](function (e) {
                t.progressing(!1), (0, s.tlog)("error", "pickupRateSet yes", e), t.setState({
                  infoTip: (0, s.tr)("Connection Failed")
                });
              }));
            }
          }]
        })) : t.nobottle && setTimeout(function () {
          e.popTip((0, s.tr)("Drift bottle has been banned"));
        }, 200);
      })["catch"](function (t) {
        (0, s.tlog)("error", "pickupBottle", t), e.popTip((0, s.tr)("Network Failed")), e.pickStartTime = 0, clearTimeout(e.pickStartTimer);
      }), e.pickStartTimer = setTimeout(function () {
        e.pickStartTime = 0;
      }, 8e3));
    }, e.pickupSettings = function (t, n) {
      var r = e.userid,
        i = function (t, n, r) {
          t.isProgressing || (t.progressing(!0), e.send("setPickup", {
            s: n
          }).then(function (e) {
            return s.dbs.setUserProfile({
              pickupGender: n
            });
          }).then(function () {
            e.closeDiag(function () {
              r && r();
            });
          })["catch"](function (r) {
            "needVip" == r ? e.diag({
              header: "提示",
              content: __recoveryFreePolicy.unavailableMessage,
              buttons: [{
                text: (0, s.tr)("Cancel"),
                onPress: function () {
                  return e.closeDiag();
                }
              }]
            }) : (t.progressing(!1), (0, s.tlog)("error", "setPickup", n, r), t.setState({
              infoTip: (0, s.tr)("Connection Failed")
            }));
          }));
        },
        o = function () {
          e.diag({
            locking: !0,
            header: (0, s.tr)("Your Gender"),
            upPadding: 7,
            downPadding: 8,
            infoColor: s.theme.deepGreen,
            infoTip: (0, s.tr)("Set only once. Choose carefully."),
            buttons: [{
              text: (0, s.tr)("Male"),
              onPress: function (t) {
                e.send("changeGender", {
                  userid: r,
                  g: 1
                }).then(function () {
                  e.closeDiag(function () {
                    return a();
                  }), e.loadProfile(r);
                })["catch"](function (e) {
                  (0, s.tlog)("error", "changeGender", e), t.setState({
                    infoTip: (0, s.tr)("Network Failed")
                  });
                });
              }
            }, {
              text: (0, s.tr)("Female"),
              onPress: function (t) {
                e.send("changeGender", {
                  userid: r,
                  g: 2
                }).then(function () {
                  e.closeDiag(function () {
                    return a();
                  }), e.loadProfile(r);
                })["catch"](function (e) {
                  (0, s.tlog)("error", "changeGender", e), t.setState({
                    infoTip: (0, s.tr)("Network Failed")
                  });
                });
              }
            }]
          });
        },
        a = function (n) {
          var r = [{
            text: (0, s.tr)("Prev"),
            onPress: function () {
              return o();
            }
          }, {
            text: (0, s.tr)("Male"),
            onPress: function (e) {
              return i(e, 1, t);
            }
          }, {
            text: (0, s.tr)("Female"),
            onPress: function (e) {
              return i(e, 2, t);
            }
          }, {
            text: (0, s.tr)("Both"),
            onPress: function (e) {
              return i(e, 3, t);
            }
          }];
          n && r.shift(), e.diag({
            header: (0, s.tr)("Secret match settings"),
            content: (0, s.tr)("Choose the gender of your secret match"),
            buttons: r
          });
        };
      n ? o() : a(!0);
    }, e.getContactsBoardData = function () {
      return ret = {
        selects: [],
        listData: {
          Circle: [],
          Myself: [{
            friendId: e.userid,
            name: (0, s.tr)("Drift Moment")
          }]
        },
        time: Date.now(),
        listSections: ["Circle", "Myself"]
      }, e.shouldShowShadow && (ret.listSections.unshift("Options"), ret.listData.Options = [{
        name: "Switch Shadow",
        type: -103,
        friendId: "-103:"
      }]), e.firstNotiTouched || (ret.listSections.unshift("NotiEn"), ret.listData.NotiEn = [{
        name: "ios" === o.Platform.OS ? "Notification disabled" : "Notification Alert",
        type: -102,
        friendId: "-102:"
      }]), e.showCmdBall, ret;
    }, e.addNewFriendDiag = function (t) {
      if (e.forbidExp || e.isForbided) return void e.forbidTip();
      var n = [{
        text: (0, s.tr)("Cancel"),
        onPress: function (t) {
          return e.closeDiag();
        }
      }, {
        text: (0, s.tr)("Ok"),
        onPress: function (t) {
          if (!t.isProgressing) {
            var n = t.state.textInputs[0].value.trim();
            if ("" === n) return void t.setState({
              infoTip: (0, s.tr)("Input cannot be empty")
            });
            if (!e.showCmdBall) {
              var r = e.checkSignupField(n);
              if (r.hasOther) return void t.setState({
                infoTip: (0, s.tr)("Account can only contain letter and number")
              });
              if (r.n < 8) return void t.setState({
                infoTip: (0, s.tr)("Account has to be more than 8 letters")
              });
              if (!r.hasNumber) return void t.setState({
                infoTip: (0, s.tr)("Account has to contain number")
              });
              if (!r.hasLetter) return void t.setState({
                infoTip: (0, s.tr)("Account has to contain letter")
              });
            }
            t.progressing(!0);
            var i = {
              name: n
            };
            e.showCmdBall && (i.re = 1), e.send("findFriend", i).then(function (n) {
              t.progressing(!1), n.notFind ? t.setState({
                infoTip: (0, s.tr)("User not exist")
              }) : n.over ? t.setState({
                infoTip: (0, s.tr)("Operation too frequently")
              }) : n.rs && n.rs.length > 1 ? e.closeDiag(function () {
                e.newRouteTo("suSelect", {
                  type: "auid",
                  rs: n.rs
                }), n.rs.length > 50 && e.popTip(n.rs.length);
              }) : n.userid && (e.navSwitchCb("friends"), e.closeDiag(function () {
                return e.curNavigator.navi.navForward(e.newRoute(e.curNavigator.routes, "about_", {
                  friendId: n.userid,
                  name: (0, s.tr)("Profile")
                }));
              }));
            })["catch"](function (e) {
              t.progressing(!1), (0, s.tlog)("error", "findFriend", e, n);
            });
          }
        }
      }];
      e.showCmdBall && n.push({
        text: (0, s.tr)("t"),
        onPress: function (t) {
          var n = t.state.textInputs[0].value.trim();
          e.closeDiag();
          var r = function (t, n) {
            e.emit("closeContextMenu", function () {
              return e.diag({
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
                  onPress: function (r) {
                    if (!r.isProgressing) if (r.progressing(!0), 4 === n) {
                      var i = t ? parseInt(t, 10) : e.CONS_FORBID_NORMAL,
                        o = parseInt(r.state.textInputs[0].value.trim(), 10);
                      e.send("findReportC", {
                        forbid: i,
                        gender: o
                      }).then(function (r) {
                        e.closeDiag(), r.rs ? e.newRouteTo("suSelect", {
                          type: "auid",
                          rs: r.rs
                        }) : (0, s.tlog)("error", "findReportC empty", t, n);
                      })["catch"](function (e) {
                        (0, s.tlog)("error", "findReportC", t, n, e);
                      });
                    } else {
                      var a = r.state.textInputs[0].value.trim().split(" ");
                      if (a[0]) var d = 24 * parseInt(a[0], 10) * 3600 * 1e3;
                      if (a[1]) var c = parseInt(a[1], 10);
                      e.send("findName", {
                        forb: c,
                        value: t,
                        type: n,
                        time: d
                      }).then(function (r) {
                        e.closeDiag(), r.rs ? e.newRouteTo("suSelect", {
                          type: "auid",
                          rs: r.rs
                        }) : (0, s.tlog)("error", "findName empty", t, n);
                      })["catch"](function (e) {
                        (0, s.tlog)("error", "findName", t, n, e);
                      });
                    }
                  }
                }]
              });
            });
          };
          e.emit("contextMenu", [[(0, s.tr)("match"), function () {
            return r(n, 1);
          }], [(0, s.tr)("prefix"), function () {
            return r(n, 2);
          }], [(0, s.tr)("contain"), function () {
            return r(n, 3);
          }], [(0, s.tr)("reportC"), function () {
            return r(n, 4);
          }], [(0, s.tr)("tmpCheck"), function () {
            e.emit("closeContextMenu"), e.send("findTmpChecker").then(function (t) {
              e.closeDiag(), t.rs ? e.newRouteTo("suSelect", {
                type: "auid",
                rs: t.rs,
                tmp: 1
              }) : (0, s.tlog)("error", "findTmpChecker empty", t);
            })["catch"](function (e) {
              (0, s.tlog)("error", "findTmpChecker", e);
            });
          }], [(0, s.tr)("uns"), function () {
            e.emit("closeContextMenu"), e.send("findUnsigned").then(function (t) {
              e.closeDiag(), t.rs ? e.newRouteTo("suSelect", {
                type: "auid",
                rs: t.rs,
                tmp: 1
              }) : (0, s.tlog)("error", "findUns empty", t);
            })["catch"](function (e) {
              (0, s.tlog)("error", "findUns", e);
            });
          }], [(0, s.tr)("obw"), function () {
            e.emit("closeContextMenu"), e.send("findObw").then(function (t) {
              e.closeDiag(), t.rs ? e.newRouteTo("suSelect", {
                type: "ouid",
                rs: t.rs
              }) : (0, s.tlog)("error", "findObw empty", t);
            })["catch"](function (e) {
              (0, s.tlog)("error", "findObw", e);
            });
          }]]);
        }
      });
      var r = {
        header: (0, s.tr)("Add Friends"),
        content: (0, s.tr)("You could find your friends through Account ID"),
        textInputs: [{
          placeholder: (0, s.tr)("Account ID"),
          value: "",
          maxLength: 250
        }],
        buttons: n
      };
      e.diag(r);
    }, e.removeNewFollowersUnread = function () {
      return new Promise(function (t, n) {
        e.newFollowers = {
          cnt: 0
        }, delete e.firstFollowerTime, s.dbs.delUserProfile("lastNewFollower").then(function () {
          return s.db.executeSql("DELETE FROM Unread WHERE category=?", [e.CONS_MSG_CAT_NEW_FOLLOWED]);
        }).then(function () {
          e.emit("spaceUnreadChanged"), e.loadProfile(e.userid), t();
        })["catch"](function (e) {
          (0, s.tlog)("error", "removeNewFollowersUnread", e), n(e);
        }), e.cachedFollowers.length && s.db.transaction(function (t) {
          e.cachedFollowers.forEach(function (n) {
            e.newFollowers.cnt += 1, e.newFollowers[n.follower] = 1, s.dbs.setUserProfile({
              lastNewFollower: n.follower
            })["catch"](function (e) {
              return (0, s.tlog)("error", "newFollower last", n.follower, e);
            }), e.followers.unshift({
              friendId: n.follower,
              time: n.time
            }), t.executeSql("\n            INSERT INTO Unread (\n              msgid, shareId, type, time, category, text, userid, \n              fromId, toId, shareFrom, ftype, atime, utab\n            ) \n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", ["", "", 1, 0, e.CONS_MSG_CAT_NEW_FOLLOWED, "", n.follower, "", "", "", 1, 0, 2])["catch"](function (e) {
              (0, s.tlog)("error", "removeNewFollowersUnread insertUnread newFollowers", n, e);
            });
          });
        }).then(function () {
          e.cachedFollowers = [];
        })["catch"](function (t) {
          e.cachedFollowers = [], (0, s.tlog)("error", "removeNewFollowersUnread 2", t);
        });
      });
    }, e.removeMySpaceMsgUnread = function (t, n) {
      e.spaceUnread[n] && e.spaceUnread[n][t] && 0 !== e.spaceUnread[n][t].length && (delete e.spaceUnread[n][t], e.circleMsgUnreadList = e.circleMsgUnreadList.filter(function (e) {
        return t !== e.fromId || n !== e.shareId;
      }), e.emit("spaceUnreadChanged"), s.db.transaction(function (r) {
        r.executeSql("\n      DELETE FROM Unread WHERE fromId=? AND shareId=?\n    ", [t, n])["catch"](function (e) {
          (0, s.tlog)("error", "removeMySpaceMsgUnread delete unread", e);
        });
        var i = e.now();
        r.executeSql("\n      UPDATE MsgFriends SET accessTime=? WHERE shareId=? AND friendId=?\n    ", [i, n, t])["catch"](function (e) {
          (0, s.tlog)("error", "removeMySpaceMsgUnread update MsgFriends", e);
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "removeMySpaceMsgUnread db", e);
      }));
    }, e.removeBottleMsgUnread = function () {
      s.db.transaction(function (t) {
        e.bottleMsgUnreadMap = {
          cnt: 0
        };
        for (var n in e.friendsUnread) try {
          var r = e.friendsUnread[n][0];
          r && 2 === r.utab && delete e.friendsUnread[n];
        } catch (i) {
          (0, s.tlog)("error", "removeBottleMsgUnread delete friendsUnread", i);
        }
        s.db.executeSql("DELETE FROM Unread WHERE utab=2")["catch"](function (t) {
          (0, s.tlog)("error", "removeBottleMsgUnread delete unread", "3:" + e.userid, t);
        }), e.emit("spaceUnreadChanged");
      })["catch"](function (e) {
        (0, s.tlog)("error", "removeBottleMsgUnread", e);
      });
    }, e.removeAllBottleUnread = function () {
      s.db.transaction(function (t) {
        var n = e.lastBottleUserid ? e.lastBottleUserid.split(",") : [];
        for (var r in e.bottleMsgUnreadMap) "cnt" === r || r.length < 5 && "-2" !== r || e.bottleResponseMap[r] || !function () {
          for (var i = e.bottleMsgUnreadMap[r], o = i.length, a = function (e) {
              t.executeSql("DELETE FROM Unread WHERE msgid=?", [i[e].msgid])["catch"](function (t) {
                (0, s.tlog)("error", "tx removeAllBottleUnread", i[e], t);
              });
            }, d = 0; o > d; d++) a(d);
          if (delete e.friendsUnread[r], delete e.bottleMsgUnreadMap[r], e.bottleMsgUnreadMap.cnt -= 1, n.length) {
            var c = n.indexOf(r);
            -1 !== c && n.splice(c, 1);
          }
        }();
        n.length && s.dbs.setUserProfile({
          lastBottleUserid: n.join(",")
        })["catch"](function (e) {
          (0, s.tlog)("error", "delLastBottleUserid", n, e);
        }), e.emit("spaceUnreadChanged");
      })["catch"](function (e) {
        (0, s.tlog)("error", "removeAllBottleUnread", e);
      });
    }, e.removeFriendsAllUnread = function (t) {
      delete e.friendsUnread[t], e.friendsUnreadList = e.friendsUnreadList.filter(function (e) {
        var n = "2:" === t.slice(0, 2) ? e.toId : e.fromId;
        return n !== t;
      }), e.bottleReplyUnreadList = e.bottleReplyUnreadList.filter(function (e) {
        return e.userid !== t;
      }), e.bottleMsgUnreadMap[t] && (e.bottleMsgUnreadMap.cnt -= 1, delete e.bottleMsgUnreadMap[t]), e.delLastBottleUserid(t), e.emit("friendsUnreadChanged"), e.emit("spaceUnreadChanged"), e.emit("selectViewLoaded_contactsBoard", !0), s.db.transaction(function (e) {
        e.executeSql("DELETE FROM Unread WHERE fromId=?", [t])["catch"](function (e) {
          (0, s.tlog)("error", "removeFriendsAllUnread delete unread", t, e);
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "removeFriendsAllUnread transaction", t, e);
      });
    }, e.removeLastStaredId = function (t) {
      s.dbs.delUserProfile("lastStaredId").then(function () {
        return s.db.executeSql("UPDATE Friends SET accessTime=?, atime=? WHERE userid=? AND friendId=?", [e.now(), 0, e.userid, t]);
      }).then(function () {
        e.emit("friendsUnreadChanged");
      })["catch"](function (e) {
        (0, s.tlog)("error", "removeLastStaredId", t, e);
      });
    }, e.removeFriendUnread = function (t) {
      (e.friendsUnread[t] && e.friendsUnread[t].length || e.bottleReplyUnreadList.length) && (e.friendsUnreadList = e.friendsUnreadList.filter(function (e) {
        return e.userid !== t;
      }), e.bottleReplyUnreadList = e.bottleReplyUnreadList.filter(function (e) {
        return e.userid !== t;
      }), e.friendsUnread[t] = [], e.bottleMsgUnreadMap[t] && (e.bottleMsgUnreadMap.cnt -= 1, delete e.bottleMsgUnreadMap[t]), e.delLastBottleUserid(t), e.emit("friendsUnreadChanged"), e.emit("spaceUnreadChanged"), s.db.executeSql("DELETE FROM Unread WHERE userid=?", [t])["catch"](function (e) {
        (0, s.tlog)("error", "removeFriendUnread delete unread", t, e);
      }), s.db.executeSql("UPDATE Friends SET accessTime=?, atime=? WHERE userid IN (?,?) AND friendId=?", [e.now(), 0, e.userid, "3:" + e.userid, t])["catch"](function (e) {
        (0, s.tlog)("error", "removeFriendUnread update friends", e);
      }));
    }, e.removeFriendAllCircleUnread = function (t) {
      e.circleShareUnreadList = e.circleShareUnreadList.filter(function (e) {
        return e.fromId !== t;
      }), e.circleMsgUnreadList = e.circleMsgUnreadList.filter(function (e) {
        return e.fromId !== t;
      }), e.emit("spaceUnreadChanged"), s.db.executeSql("DELETE FROM Unread WHERE fromId=?", [t])["catch"](function (e) {
        (0, s.tlog)("error", "removeFriendAllCircleUnread", e);
      });
    }, e.removeCircleShareUnread = function (t) {
      0 !== e.circleShareUnreadList.length && (e.circleShareUnreadList = [], e.emit("spaceUnreadChanged"), s.db.executeSql("\n    DELETE FROM Unread WHERE userid=? AND category=1\n  ", [t])["catch"](function (e) {
        (0, s.tlog)("error", "removeCircleShareUnread", e);
      }));
    }, e.removeCircleMsgUnread = function () {
      0 !== e.circleMsgUnreadList.length && (e.spaceUnread = {}, e.circleMsgUnreadList = [], e.emit("spaceUnreadChanged"), s.db.transaction(function (t) {
        t.executeSql("DELETE FROM Unread WHERE userid=?", ["8:" + e.userid])["catch"](function (e) {
          (0, s.tlog)("error", "removeCircleMsgUnread delete unread", e);
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "removeCircleMsgUnread", e);
      }));
    }, e.removeStockMsgUnread = function () {
      var t = "7:" + e.userid;
      if (e.friendsUnread[t]) {
        var n = e.friendsUnread[t].filter(function (e) {
            return t !== e.userid;
          }),
          r = e.friendsUnreadList.filter(function (e) {
            return t !== e.userid;
          });
        r.length !== e.friendsUnreadList.length && (e.friendsUnread[t] = n, e.friendsUnreadList = r, e.emit("friendsUnreadChanged"), s.db.executeSql("\n      DELETE FROM Unread WHERE userid=?", [t])["catch"](function (e) {
          (0, s.tlog)("error", "removeStockMsgUnread delete unread", e);
        }), s.db.executeSql("UPDATE Friends SET accessTime=? WHERE userid=? AND friendId=?", [e.now(), e.userid, t])["catch"](function (e) {
          (0, s.tlog)("error", "removeStockMsgUnread update friends", e);
        }));
      }
    }, e.handleUreadOk = function (e, t, n, r, i) {
      return;
    }, e.handleUreadOkRes = function (t, n) {
      var r = n.userid,
        i = n.ureadOk,
        o = {},
        a = 0;
      i.forEach(function (t) {
        var n = t.shareId,
          i = t.time,
          d = t.msgid;
        i > a && (a = i);
        var c = n + ";" + r;
        o[c] ? o[c].push(d) : o[c] = [d], e.__msgtt__msgid && e.__msgtt__msgid === d && e.__msgtt__cb(), s.db.transaction(function (e) {
          e.executeSql("UPDATE Msgs SET uread=2 WHERE msgid=?", [d])["catch"](function (e) {
            (0, s.tlog)("error", "tx handleUreadOkRes", t, e);
          });
        })["catch"](function (e) {
          (0, s.tlog)("error", "handleUreadOkRes", e);
        });
      });
      for (var d in o) {
        var c = e.msgsData[d];
        c && (c = [].concat(e.msgsData[d]), o[d].forEach(function (e) {
          var t = c.findIndex(function (t) {
            return t.msgid === e;
          });
          if (-1 !== t) {
            var n = babelHelpers["extends"]({}, c[t]);
            n.uread = 2, c.splice(t, 1, n);
          }
        }), e.msgsData[d] = c, e.lazyRefresh("rerenderMsgsData_" + d));
      }
    }, e._addGroupMembers = function (e) {
      return 0 !== e.length ? new Promise(function (t, n) {
        s.db.transaction(function (t) {
          e.forEach(function (e) {
            e.forEach(function (e) {
              var r = e.groupId,
                i = e.memberId,
                o = e.level,
                a = e.time;
              t.executeSql("INSERT INTO GroupMembers (groupId, userid, level, time) VALUES (?, ?, ?, ?)", [r, i, o, a])["catch"]((0, s.errCb)("1.addGroupMembers " + r + ", " + i, n));
            });
          });
        }).then(function () {
          return t();
        })["catch"]((0, s.errCb)("2.addGroupMembers"));
      }) : void 0;
    }, e.addLucksLimit = function (t) {
      return t ? new Promise(function (n, r) {
        var i = e.lucksLimit + t;
        s.dbs.setUserProfile({
          lucksLimit: i
        }).then(function () {
          return n();
        })["catch"]((0, s.errCb)("addLucksLimit " + t));
      }) : void 0;
    }, e.checkForRequestReview = function () {
      try {
        "ios" !== o.Platform.OS || e.hasRatedApp || s.fs.requestReview() && s.dbs.setUserProfile({
          hasRatedApp: 1
        });
      } catch (t) {
        (0, s.tlog)("error", "checkForRequestReview", t);
      }
    }, e.prepareSendShareReply = function (t, n) {
      var r = this,
        i = function (i, o) {
          i.forEach(function (i) {
            var o = 4,
              a = e.userid,
              d = i.friendId,
              c = e.getChatSession(d, a),
              u = function (t, n) {
                e.msgsData[r.fid];
                e.sendShareReply("newMsg", {
                  shareId: i.shareId,
                  msgid: e.getNewMsgId(c),
                  fromId: a,
                  toId: d,
                  chatSession: c,
                  shareFrom: i.shareFrom,
                  friendId: i.friendId,
                  type: t,
                  data: n,
                  category: o,
                  ftype: i.type,
                  fid: i.shareId + ":" + i.friendId,
                  seqi: 0
                })["catch"]((0, s.errCb)("interactView onInputSend"));
              };
            u(t, n);
          }), o();
        };
      e.on("friendsInputOnSend", i), e.friendsNavigator.navi.navForward(e.friendsNavigator.routes.linkSend, function () {
        return o.Navigator.SceneConfigs.VerticalUpSwipeJump;
      });
    }, e.prepareSendShareMsg = function (t, n) {
      var r = this,
        i = function (i, o) {
          var a = e.getNewShareId(o),
            d = e.getNewMsgId(),
            c = "newShare",
            u = function (t, n) {
              e.sharesData[r.friendId];
              e.sendShareMsg(c, {
                fromId: e.userid,
                toId: e.userid,
                shareFrom: e.userid,
                target: i,
                type: t,
                data: n,
                shareId: a,
                msgid: d,
                ftype: 1,
                sseqi: 0,
                mseqi: 0
              })["catch"]((0, s.errCb)("spaceView onInputSend"));
            };
          u(t, n);
        };
      e.on("mySpaceInputOnSend", i), e.mySpaceNavigator.navi.navForward(e.mySpaceNavigator.routes.shareSelect, function () {
        return o.Navigator.SceneConfigs.VerticalUpSwipeJump;
      });
    }, e.jumpToShareSelect = function (t) {
      return e.noNeedToJumpToShareSelect && !e.needToJumpToShareSelect ? void delete e.noNeedToJumpToShareSelect : (delete e.needToJumpToShareSelect, e.targetChangeShare[e.currentChangeTargetShareId] ? t.shareSelect.targetChangeShare = e.targetChangeShare[e.currentChangeTargetShareId] : t.shareSelect.targetChangeShare = {
        target: ["me"]
      }, void t.navi.navForward(t.shareSelect));
    }, e.sendShareMsg = function (t, n, r, i) {
      return new Promise(function (a, d) {
        var c,
          u,
          l,
          f,
          h = 0,
          g = {},
          p = {},
          m = e.now() + 1,
          S = n.type,
          I = n.data,
          v = n.fromId,
          P = n.toId,
          E = n.msgid,
          b = n.shareFrom,
          C = n.shareId,
          T = n.target,
          w = n.ftype,
          M = n.sseqi,
          F = n.mseqi,
          R = n.resendCnt;
        e.currentChangeTargetShareId = C, e.firstShared || (e.setSharedParas({
          firstShared: 1
        })["catch"](function (e) {
          return (0, s.tlog)("error", "firstShared", e);
        }), e.loadProfile(e.userid, "aboutMe"), e.emit("aboutMeUnreadChanged")), delete e.targetChangeShare[C], R || (R = 0);
        var D = e.splitShareId(C).time,
          U = function () {
            var t = e.sharesData[P];
            return t ? [].concat(t) : [];
          };
        c = U();
        var x = function (t, n) {
            var r,
              i = c.length;
            0 === i && (c = [e.tmpSendingShareMap[C]], i = 1);
            e: for (var o = 0; i > o; o++) {
              r = c[o].msgs.length;
              for (var s = 0; r > s; s++) if (c[o].msgs[s].msgid === E) break e;
            }
            c[o] && (l = babelHelpers["extends"]({}, c[o]), c.splice(o, 1, l)), f = n ? babelHelpers["extends"](l.msgs[s], f) : l.msgs[s], f.stat = t, 1 === t ? (f.resendCnt = R, delete f.timeoutFlag, f.timeoutFlagChecked = !0) : 2 === t && (f.data = "", delete e.shareMsgsSendMap[C][E], 0 === Object.keys(e.shareMsgsSendMap[C]).length && (e.targetChangeShare[C] = l, e.targetChangeShareCallback[C] && (e.targetChangeShareCallback[C](), delete e.targetChangeShareCallback[C]))), u = {
              i: o,
              j: s,
              len: r
            };
          },
          y = function (n) {
            n && x(n), e.sharesData[P] = c, e.firstDaily && s.dbs.setUserProfile({
              firstDaily: 0
            })["catch"]((0, s.errCb)("setFirstDaily")), e.isIn(n, 2, 3) && delete e.msgSendingMap[E], e.emit("rerenderSharesData_" + P, "newShare" === t && void 0 === n ? 1 : 0);
          };
        if (S === e.CONS_MSG_TYPE_VIDEO) {
          var k = I.path,
            N = I.uri,
            L = I.width,
            O = I.height,
            A = I.duration;
          l = {
            shareId: C,
            fromId: v,
            toId: P,
            commentNum: 0,
            newCommentNum: 0,
            praiseNum: 0,
            category: 1,
            seqi: M,
            msgs: [{
              msgid: E,
              shareId: C,
              stat: 1,
              type: S,
              category: 1,
              time: m,
              text: "[ " + (0, s.tr)("VIDEO") + " ]",
              ftype: w,
              seqi: F,
              fromId: v,
              toId: P,
              shareFrom: b,
              path: k,
              uri: N,
              width: L,
              height: O,
              duration: A
            }]
          };
        } else if (S === e.CONS_MSG_TYPE_GIF) {
          var N = I.uri,
            L = I.width,
            O = I.height,
            _ = I.size;
          l = {
            shareId: C,
            fromId: v,
            toId: P,
            commentNum: 0,
            newCommentNum: 0,
            praiseNum: 0,
            category: 1,
            seqi: M,
            msgs: [{
              msgid: E,
              shareId: C,
              stat: 1,
              type: S,
              category: 1,
              time: m,
              text: "[ " + (0, s.tr)("GIF") + " ]",
              height: O,
              width: L,
              uri: N,
              size: _,
              ftype: w,
              seqi: F,
              fromId: v,
              toId: P,
              shareFrom: b
            }]
          };
        } else if (S === e.CONS_MSG_TYPE_LINK) l = {
          shareId: C,
          fromId: v,
          toId: P,
          commentNum: 0,
          newCommentNum: 0,
          praiseNum: 0,
          category: 1,
          seqi: M,
          msgs: [{
            msgid: E,
            shareId: C,
            stat: 1,
            type: S,
            category: 1,
            time: m,
            text: I.status,
            uri: I.url,
            fromId: v,
            toId: P,
            shareFrom: b,
            ftype: w,
            seqi: F
          }]
        };else if (S === e.CONS_MSG_TYPE_EMOTION) l = {
          shareId: C,
          fromId: v,
          toId: P,
          commentNum: 0,
          newCommentNum: 0,
          praiseNum: 0,
          category: 1,
          seqi: M,
          msgs: [{
            msgid: E,
            shareId: C,
            stat: 1,
            type: S,
            category: 1,
            time: m,
            shareFrom: b,
            ftype: w,
            seqi: F,
            text: "[ " + (0, s.tr)("Sticker") + " ]",
            emoj: I,
            fromId: v,
            toId: P
          }]
        };else if (S === e.CONS_MSG_TYPE_IMAGE) {
          var q = I.ext,
            O = I.height,
            L = I.width,
            N = I.uri,
            _ = I.size,
            B = I.setbg;
          q = q.toLowerCase(), "jpeg" === q && (q = "jpg"), l = {
            shareId: C,
            fromId: v,
            toId: P,
            commentNum: 0,
            newCommentNum: 0,
            praiseNum: 0,
            category: 1,
            seqi: M,
            msgs: [{
              msgid: E,
              shareId: C,
              stat: 1,
              uri: N,
              ext: q,
              height: O,
              width: L,
              type: S,
              shareFrom: b,
              setbg: B,
              ftype: w,
              text: "[ " + (0, s.tr)("Picture") + " ]",
              category: 1,
              time: m,
              fromId: v,
              toId: P,
              size: _,
              seqi: F
            }]
          };
        } else if (S === e.CONS_MSG_TYPE_AUDIO) {
          var k = I.path,
            A = I.duration,
            _ = I.size;
          l = {
            shareId: C,
            fromId: v,
            toId: P,
            commentNum: 0,
            newCommentNum: 0,
            praiseNum: 0,
            category: 1,
            seqi: M,
            msgs: [{
              msgid: E,
              shareId: C,
              stat: 1,
              type: S,
              category: 1,
              time: m,
              path: k,
              duration: A,
              shareFrom: b,
              ftype: w,
              text: "[ " + (0, s.tr)("Audio") + " ]",
              fromId: v,
              toId: P,
              size: _,
              seqi: F
            }]
          };
        } else l = {
          shareId: C,
          fromId: v,
          toId: P,
          commentNum: 0,
          newCommentNum: 0,
          praiseNum: 0,
          category: 1,
          seqi: M,
          msgs: [{
            msgid: E,
            shareId: C,
            stat: 1,
            type: S,
            category: 1,
            time: m,
            text: I,
            fromId: v,
            toId: P,
            shareFrom: b,
            ftype: w,
            seqi: F
          }]
        };
        if (I.time = m, f = l.msgs[0], f.chatSession = e.getChatSession(P, v), f.data = I, l.target = T, l.time = D, l.atime = m, n.bdrop && (l.bdrop = 1), "newShare" === t) f.addIdx = 0, e.tmpSendingShareMap[C] = l, c.unshift(l);else if ("resend" === t) x(1, !0), h = u.j, t = 0 === h ? "resendShare" : "resendMsg";else if (e.isIn(t, "edit", "insert", "append")) {
          for (var H = 0; H < c.length && c[H].shareId !== C; H++);
          l = babelHelpers["extends"]({}, c[H]), delete l.changeMsgIds;
          var W = [].concat(babelHelpers.toConsumableArray(l.msgs)).sort(function (e, t) {
            return e.time - t.time;
          });
          if ("append" === t) f.msgid = e.getNewMsgId(), E = f.msgid, l.msgs.push(f), h = l.msgs.length - 1, f.addIdx = l.msgs[h - 1].addIdx + 1, 0 === f.addIdx && (f.addIdx = 1);else if ("edit" === t) h = W.findIndex(function (e) {
            return e.msgid === E;
          }), W[h].text = f.data, l.msgs = W;else if ("insert" === t) {
            h = W.findIndex(function (e) {
              return e.msgid === E;
            }), f.addIdx = W[h].addIdx, 0 === f.addIdx && (f.addIdx = -1), W.forEach(function (e) {
              e.addIdx > 0 && e.addIdx >= f.addIdx ? e.addIdx += 1 : e.addIdx < 0 && e.addIdx <= f.addIdx && (e.addIdx -= 1);
            });
            var G = W[h].time;
            f.time = G - 1, I.time = G - 1, f.showtime = m, f.msgid = e.getNewMsgId(), E = f.msgid, e.insertMsgid = E, W.splice(h, 0, f), l.msgs = W, e.findInsertMsgChanges(l, W, h);
          }
          c.splice(H, 1, l);
        }
        f.type !== e.CONS_MSG_TYPE_IMAGE && f.type !== e.CONS_MSG_TYPE_VIDEO || (f.uploading = !0), e.shareMsgsSendMap[C] || (e.shareMsgsSendMap[C] = {}), e.shareMsgsSendMap[C][E] = 1, e.msgSendingMap[E] = 1, y(), r && r(1);
        var V, Y, z;
        s.dbs.addShareMsg({
          action: t,
          newMsgIdx: h,
          addShare: l
        }).then(function () {
          Object.keys(l).forEach(function (e) {
            /msgs|jn/.test(e) || (g[e] = l[e]);
          }), f = l.msgs[h];
          for (var n in l.msgs[h]) n in {
            path: 1,
            stat: 1,
            resendCnt: 1,
            uploading: 1,
            data: 1
          } || "uri" === n && S !== e.CONS_MSG_TYPE_LINK && S !== e.CONS_MSG_TYPE_GIF || (p[n] = f[n]);
          if (f.type === e.CONS_MSG_TYPE_VIDEO) {
            var r = s.theme.winWidth,
              i = s.theme.winHeight - s.theme.statusHeightAll,
              a = L / O;
            if (L > r || O > i) {
              var d = r / i;
              a >= d ? (L = r, O = r / a) : (O = i, L = i * a);
            }
            return L = Math.round(L), O = Math.round(O), L % 2 === 1 && (L -= 1), O % 2 === 1 && (O -= 1), e.checkRawUriMapId(I.rawUri).then(function (n) {
              return n && n.imgId ? (z = !0, p.imgId = n.imgId, p.rawImgId = n.rawImgId, p.size = n.size, p.width = L, p.height = O, f.imgId = n.imgId, f.rawImgId = n.rawImgId, f.size = n.size, f.width = L, f.height = O, delete f.uploading, e.shareWaitForUpload(C, !0).then(function () {
                return e.send("shareMsg", {
                  action: t,
                  sendShare: g,
                  sendMsg: p,
                  resendCnt: R,
                  newMsgIdx: h,
                  sendTimeoutIntv: 500
                });
              })) : e.runSerialPromise("videoCompress", function () {
                var t;
                return "android" === o.Platform.OS && (t = function (t) {
                  var n = t.progress.match(/time=([^-]\w+):(\w+):(\d+)\.(\d+)/);
                  if (n) {
                    var r = parseInt(n[1], 10),
                      i = parseInt(n[2], 10),
                      o = parseInt(n[3], 10),
                      a = parseInt(n[4], 10),
                      d = 60 * r * 60 * 1e3 + 60 * i * 1e3 + 1e3 * o + a;
                    (0, s.tlog)("videoCompress", A, r, i, o, a), e.emit("imageIsUploading_" + f.msgid + "_" + f.uri, d / A / 1e3, !0);
                  }
                }), s.ProcessingManager.compress(k, {
                  width: L,
                  height: O,
                  bitrateMultiplier: 1e4,
                  saveToCameraRoll: !1,
                  saveWithCurrentDate: !0,
                  minimumBitrate: 1048576,
                  crf: 28
                }, t).then(function (e) {
                  return (0, s.tlog)("VideoProcessing", e), e;
                }, function (e) {
                  return (0, s.tlog)("error", "VideoProcessing", e), Promise.reject("sendShareMsg VideoProcessing Failed");
                });
              }).then(function (n) {
                return I.path = "ios" === o.Platform.OS ? n : n.source, I.uriExt = N.match(/.*\.(\w+)/)[1], I.pathExt = I.path.match(/.*\.(\w+)/)[1], I.width = L, I.height = O, I.isVideoThumb = !0, s.fs.stat(I.uri.replace(/^file:\/\//, "")).then(function (e) {
                  var t = e.size;
                  return _ = t, I.uriSize = t, s.fs.stat(I.path.replace(/^file:\/\//, ""));
                }).then(function (n) {
                  var r = n.size;
                  return I.pathSize = r, e.uploadFile(f.type, I, function (t) {
                    e.emit("imageIsUploading_" + f.msgid + "_" + f.uri, t);
                  }).then(function (n) {
                    return p.imgId = n.id, V = n.rawId, p.rawImgId = n.rawId, p.size = I.uriSize + I.pathSize, f.size = p.size, f.width = L, f.height = O, p.width = L, p.height = O, I.rawPath = I.path, I.rawSize = I.pathSize, e.shareWaitForUpload(C, !0).then(function () {
                      return e.send("shareMsg", {
                        action: t,
                        sendShare: g,
                        sendMsg: p,
                        resendCnt: R,
                        newMsgIdx: h,
                        sendTimeoutIntv: 500
                      });
                    });
                  });
                });
              });
            });
          }
          return (f.type === e.CONS_MSG_TYPE_IMAGE || f.type === e.CONS_MSG_TYPE_AUDIO) && _ > 0 ? e.checkRawUriMapId(I.rawUri).then(function (n) {
            if (n && n.imgId) {
              if (z = !0, p.imgId = n.imgId, f.imgId = n.imgId, n.rawImgId) {
                var r = I.rawWidth,
                  i = I.rawHeight,
                  o = I.rawSize;
                f.rawImgId = n.rawImgId + ":" + o + ":" + r + ":" + i, p.rawImgId = f.rawImgId;
              }
              return delete f.uploading, e.shareWaitForUpload(C, f.type === e.CONS_MSG_TYPE_IMAGE).then(function () {
                return e.send("shareMsg", {
                  action: t,
                  sendShare: g,
                  sendMsg: p,
                  resendCnt: R,
                  newMsgIdx: h,
                  sendTimeoutIntv: 500
                });
              });
            }
            return e.uploadFile(f.type, I, function (t) {
              e.emit("imageIsUploading_" + f.msgid + "_" + f.uri, t);
            }).then(function (n) {
              return n.id ? (f.type === e.CONS_MSG_TYPE_IMAGE ? (p.imgId = n.id, n.rawImgId && (V = n.rawId, p.rawImgId = n.rawImgId)) : f.type === e.CONS_MSG_TYPE_AUDIO && (p.audioId = n.id.split(".")[0]), e.shareWaitForUpload(C, f.type === e.CONS_MSG_TYPE_IMAGE).then(function () {
                return e.send("shareMsg", {
                  action: t,
                  sendShare: g,
                  sendMsg: p,
                  resendCnt: R,
                  newMsgIdx: h,
                  sendTimeoutIntv: 500
                });
              })) : Promise.reject("shareMsg uploadFile Failed");
            });
          }) : e.shareWaitForUpload(C).then(function () {
            return e.send("shareMsg", {
              action: t,
              sendShare: g,
              sendMsg: p,
              resendCnt: R,
              newMsgIdx: h,
              sendTimeoutIntv: 500
            });
          });
        }).then(function (t) {
          return Y = t, -1 !== T.indexOf("rand") && e.lucks.push(e.now()), "isBlocked" === t.replyReject ? (e.relationShips[p.toId].blocked = !0, e.groupBlockDiag(), Promise.reject("__break")) : t.nobottle ? Promise.reject("__break") : p.imgId && !z ? (f.imgId = p.imgId, e.imageIsMoving[p.imgId] = !0, (0, s.cacheImage)({
            imageId: p.imgId,
            localUri: N,
            size: _,
            isVideoThumb: I.isVideoThumb
          }).then(function () {
            if (B) {
              delete e.backgroundTypeIsUri[e.userid];
              var t = s.dbs.setProfile(e.userid, {
                background: p.imgId
              })["catch"](function (e) {
                return (0, s.tlog)("error", "sendShareMsg", e);
              });
              return e.emit("backgroundChanged_" + e.userid), t;
            }
          }).then(function () {
            return p.rawImgId ? (f.rawImgId = p.rawImgId, e.imageIsMoving[V] = !0, (0, s.cacheImage)({
              imageId: V,
              localUri: I.rawPath,
              size: I.rawSize
            })) : void 0;
          })) : p.audioId ? (f.audioId = p.audioId, (0, s.cacheAudio)({
            audioId: p.audioId,
            path: k,
            size: _
          })) : void 0;
        }).then(function () {
          return c = U(), y(2), i && i(l, Y), s.dbs.updateShareMsg(l);
        }).then(function () {
          return s.dbs.updateMsg(f);
        }).then(function () {}).then(function () {}).then(function () {
          return a(f);
        })["catch"](function (e) {
          "__break" !== e && (0, s.tlog)("error", "sendShareMsg", e), c = U(), y(3), i && i(l, Y);
        });
      });
    }, e.groupBlockDiag = function () {
      e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("You have been blocked"),
        buttons: [{
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            e.closeDiag(function () {
              e.curNavigator.navi.navToTop();
            });
          }
        }]
      });
    }, e.findInsertMsgChanges = function (e, t, n) {
      for (var r = t[n].time, i = n - 1; i >= 0 && t[i].time >= r;) {
        e.changeMsgIds || (e.changeMsgIds = {});
        var o = r - 1;
        e.changeMsgIds[t[i].msgid] = o, t[i].time = o, r = o, i -= 1;
      }
    }, e.shareWaitForUpload = function (t, n) {
      return new Promise(function (r, i) {
        var o = e.shareWaitForUploadCnt[t];
        o || (o = 0), n ? (o -= 1, e.shareWaitForUploadCnt[t] = o, 0 >= o ? (delete e.shareWaitForUploadCnt[t], e.emitOnce("shareWaitForUploadFinished_" + t), r()) : e.on("shareWaitForUploadFinished_" + t, function () {
          r();
        })) : o ? e.on("shareWaitForUploadFinished_" + t, function () {
          r();
        }) : r();
      });
    }, e.checkPrevMsgsData = function (t) {
      var n = t.friendId,
        r = t.time,
        i = t.shareId;
      return new Promise(function (t, o) {
        var a = e.userid;
        s.db.executeSql("\n      SELECT * FROM RecentMsgs WHERE time<? AND shareId!=? AND (\n        (toId=? AND fromId=?) OR (toId=? AND fromId=?)\n      ) LIMIT 5\n    ", [r, i, a, n, n, a]).then(function (o) {
          var d = o[0].rows,
            c = d.length;
          if (5 > c) if (d.item(0) && 0 === d.item(0).category) t({
            up: !1
          });else if (0 === c || 0 !== d.item(c - 1).category) return e.send("fetchMoreRecentMgs", {
            friendId: n,
            time: r,
            shareId: i,
            userid: a,
            limit: e.prevMsgsCheckLimit
          }).then(function (r) {
            var i = r.msgs;
            return 0 === i.length && t({
              up: !1
            }), i.length < e.prevMsgsCheckLimit && i.push({
              shareId: e.userid + ":0",
              fromId: e.userid,
              toId: n,
              category: 0,
              type: 1,
              shareFrom: e.userid,
              msgid: e.getNewMsgId(),
              time: e.getLowRandomTime()
            }), s.db.transaction(function (e) {
              i.forEach(function (t) {
                var n = t.msgid,
                  r = t.fromId,
                  i = t.toId,
                  o = t.shareId,
                  a = t.time,
                  d = t.type,
                  c = t.category,
                  u = t.shareFrom;
                e.executeSql("\n                  INSERT INTO RecentMsgs (msgid, fromId, toId, shareId, time, type, category, shareFrom)\n                  VALUES(?, ?, ?, ?, ?, ?, ?, ?)\n                ", [n, r, i, o, a, d, c, u])["catch"]((0, s.errCb)("syncRecentMsgs"));
              });
            });
          });
        }).then(function () {
          return t({
            up: !0
          });
        })["catch"]((0, s.errCb)("checkPrevMsgsData"));
      });
    }, e.loadPrevMsgsData = function (t) {
      var n = t.friendId,
        r = t.time,
        i = t.shareId;
      return new Promise(function (t, o) {
        s.db.executeSql("\n      SELECT * FROM RecentMsgs WHERE time<? AND (shareId NOT IN (?, ?))\n      AND (\n        (toId=? AND fromId=?) OR (toId=? AND fromId=?)\n      ) ORDER BY time DESC LIMIT 1\n    ", [r, i, e.userid + ":0", e.userid, n, n, e.userid]).then(function (e) {
          e[0].rows.length > 0 ? t(e[0].rows.item(0)) : o();
        })["catch"]((0, s.errCb)("loadPrevMsgsData"));
      });
    }, e.checkLastOptionTime = function (t, n) {
      var r = e.lastOptionTime[t];
      r && n.forEach(function (i, o) {
        if (e.notIn(i.category, 1, -2, 0) && r[r.length - 1] - i.time > 18e5) {
          if (o > 0) i.showLastTimeTime = n[o].time;else {
            var s = e.msgsData[t];
            s && s.length && (i.showLastTimeTime = s[s.length - 1].time);
          }
          r.push(i.time), i.showLastTime = !0;
        }
      });
    }, e.loadShareWithShareId = function (t) {
      return e.lock("loadShareWithShareId") ? new Promise(function (n, r) {
        s.db.executeSql("SELECT * FROM Shares WHERE shareId=?", [t]).then(function (r) {
          return r[0].rows.length ? (e.unlock("loadShareWithShareId"), void n(r[0].rows.item(0))) : e.send("loadShareWithShareId", {
            shareId: t
          }).then(function (t) {
            e.unlock("loadShareWithShareId"), n(t.share);
          });
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "loadShareWithShareId", t, e);
      }) : Promise.reject("locking");
    }, e.clearTraditionalShareMsgs = function (e) {
      s.db.executeSql("DELETE FROM Msgs WHERE shareId=?", [e.shareId])["catch"](function (t) {
        (0, s.tlog)("error", "clearTraditionalShareMsgs", e, t);
      });
    }, e.addFriend = function (t) {
      e.diag({
        header: (0, s.tr)("Friend Request"),
        content: (0, s.tr)("Send a friend request"),
        userid: t,
        textInputs: [{
          placeholder: (0, s.tr)("Say something..."),
          value: (0, s.tr)("Hi~I am ##", e.profiles[e.userid] ? e.profiles[e.userid].name : ""),
          maxLength: 100
        }],
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (n) {
            if (!n.isProgressing) {
              n.progressing(!0);
              var r = n.state.textInputs[0].value;
              e.send("friendAdd", {
                friendId: t,
                reason: r
              }).then(function (t) {
                t.added ? (n.progressing(!1), 5 === t.added.category ? n.setState({
                  infoTip: (0, s.tr)("Has sended same request before.")
                }) : n.setState({
                  infoTip: (0, s.tr)("You have already added this friend.")
                })) : e.closeDiag(function () {
                  return e.tip((0, s.tr)("Friend Request has been sent"));
                });
              })["catch"](function (e) {
                (0, s.tlog)("error", "addFriend", e), n.progressing(!1), n.setState({
                  infoTip: (0, s.tr)("Requesting Failed")
                });
              });
            }
          }
        }]
      });
    }, e.getDbItem = function (e, t) {
      return e[0].rows.length ? e[0].rows.item(t || 0) || {} : {};
    }, e.getDbItem0 = function (e) {
      return e[0].rows.length ? e[0].rows.item(0) : void 0;
    }, e.getRelationShip = function (t, n) {
      return new Promise(function (n, r) {
        e.getFriendCut(t).then(function (i) {
          var o = e.relationShips[t];
          o ? (o.isCut = i.isCut, o.isDropped = i.isDropped, n(o)) : e.send("getRelationShip", {
            friendId: t
          }).then(function (r) {
            delete r.proto, delete r.seq, r.isCut = i.isCut, r.isDropped = i.isDropped, e.relationShips[t] = r, n(r);
          })["catch"](function (e) {
            (0, s.tlog)("error", "getRelationShip", t, e), r(e);
          });
        })["catch"](function (e) {
          (0, s.tlog)("error", "getRelationShip", t, e), r(e);
        });
      });
    }, e.getFriendCut = function (t) {
      return new Promise(function (n, r) {
        Promise.all([s.db.executeSql("SELECT rtime FROM Friends WHERE userid IN (?, ?) AND friendId=?", ["3:" + e.userid, e.userid, t]), s.db.executeSql("SELECT adds FROM FriendShips WHERE friendId=?", [t]), s.db.executeSql("SELECT isCut FROM FriendDrops WHERE friendId=?", [t])]).then(function (t) {
          var r = e.getDbItem(t[0], 0).rtime,
            i = e.getDbItem(t[0], 1).rtime,
            o = e.getDbItem(t[1]).adds,
            s = e.getDbItem(t[2]);
          n({
            isCut: r || i || o || s.isCut ? 1 : 0,
            isDropped: e.isEmpty(s) ? 0 : 1
          });
        })["catch"](function (e) {
          (0, s.tlog)("error", "getFriendDrop", t, e), r(e);
        });
      });
    }, e.syncFriendDrops = function (t) {
      s.db.executeSql("SELECT * FROM FriendDrops WHERE friendId=?", [t]).then(function (n) {
        var r = e.getDbItem0(n);
        return r ? (r.isCut && s.db.executeSql("UPDATE Friends SET rtime=? WHERE userid IN (?, ?) AND friendId=?", [1, "3:" + e.userid, e.userid, t])["catch"](function (e) {
          return (0, s.tlog)("error", "syncFriendDrops update Friends", t, e);
        }), s.db.executeSql("DELETE FROM FriendDrops WHERE FriendId=?", [t])) : void 0;
      })["catch"](function (e) {
        (0, s.tlog)("error", "syncFriendDrops", t, e);
      });
    }, e.friendCut = function (t) {
      s.db.transaction(function (n) {
        n.executeSql("UPDATE Friends SET rtime=? WHERE userid IN (?, ?) AND friendId=?", [1, "3:" + e.userid, e.userid, t])["catch"](function (e) {
          return (0, s.tlog)("error", "friendCut update Friends", t, e);
        }), n.executeSql("UPDATE FriendShips SET adds=? WHERE friendId=?", ["1", t])["catch"](function (e) {
          return (0, s.tlog)("error", "friendCut update FriendShips", t, e);
        }), n.executeSql("UPDATE FriendDrops SET isCut=? WHERE friendId=?", [1, t])["catch"](function (e) {
          return (0, s.tlog)("error", "friendCut update FriendDrops", t, e);
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "friendCut", t, e);
      });
    }, e.friendNoCut = function (t) {
      s.db.transaction(function (n) {
        n.executeSql("UPDATE Friends SET rtime=? WHERE userid IN (?, ?) AND friendId=?", [0, "3:" + e.userid, e.userid, t])["catch"](function (e) {
          return (0, s.tlog)("error", "friendDropped update Friends", t, e);
        }), n.executeSql("UPDATE FriendShips SET adds=? WHERE friendId=?", ["", t])["catch"](function (e) {
          return (0, s.tlog)("error", "friendDropped update FriendShips", t, e);
        }), n.executeSql("UPDATE FriendDrops SET isCut=? WHERE friendId=?", [0, t])["catch"](function (e) {
          return (0, s.tlog)("error", "friendDropped update FriendDrops", t, e);
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "friendDropped update", e);
      });
    }, e.recoverFriendDiag = function (t) {
      e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("Recover delete this user?"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Next"),
          onPress: function (n) {
            n.isProgressing || (n.progressing(!0), e.send("recoverFriend2", {
              friendId: t
            }).then(function (n) {
              return s.db.executeSql("SELECT * FROM FriendDrops WHERE friendId=?", [t]).then(function (n) {
                var r = e.getDbItem(n);
                return e.relationShips[t] && 1 === r.type && (e.relationShips[t].isFriend = 1), e.saveFriends([{
                  friendId: t,
                  type: 1,
                  isBottle: 1 === r.type ? 0 : 1,
                  desc: (0, s.tr)("Recover Delete"),
                  isCut: r.isCut,
                  noRelDel: 1
                }]);
              }).then(function () {
                return s.db.executeSql("DELETE FROM FriendDrops WHERE friendId=?", [t]);
              }).then(function () {
                e.reloadFriendsData(), e.loadProfile(t), e.closeDiag();
              });
            })["catch"](function (e) {
              (0, s.tlog)("error", "recoverFriendDiag", t, e), n.progressing(!1), n.setState({
                infoTip: (0, s.tr)("Requesting Failed")
              });
            }));
          }
        }]
      });
    }, e.dropFriendDiag = function (t, n) {
      e.diag({
        header: (0, s.tr)("Fatal Tip"),
        content: (0, s.tr)("Unfollow this user?"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Next"),
          onPress: function (r) {
            e.diag({
              header: (0, s.tr)("Tip"),
              content: (0, s.tr)("Confirm block and delete?"),
              buttons: [{
                text: (0, s.tr)("Cancel"),
                onPress: function (t) {
                  return e.closeDiag();
                }
              }, {
                text: (0, s.tr)("Delete and Block"),
                onPress: function (r) {
                  if (!r.isProgressing) {
                    r.progressing(!0);
                    var i = n.isFriend ? 1 : 2;
                    e.dropFriend2(t, i, n.isCut).then(function () {
                      e.loadProfile(t), e.closeDiag();
                    })["catch"](function (e) {
                      (0, s.tlog)("error", "Delete friend", t, e), r.progressing(!1), r.setState({
                        infoTip: (0, s.tr)("Connection Failed")
                      });
                    });
                  }
                }
              }]
            });
          }
        }]
      });
    }, e.dropFriend2 = function (t, n, r) {
      return new Promise(function (i, o) {
        e.send("dropFriend2", {
          friendId: t,
          type: n
        }).then(function (i) {
          return s.db.transaction(function (i) {
            i.executeSql("DELETE FROM FriendShips WHERE friendId=?", [t])["catch"](function (e) {
              (0, s.tlog)("error", "dropFriend2 delete friendShips", t, e);
            }), i.executeSql("DELETE FROM Friends WHERE userid IN (?, ?) AND friendId=?", [e.userid, "3:" + e.userid, t])["catch"](function (e) {
              (0, s.tlog)("error", "dropFriend2 delete friends", t, e);
            }), n ? i.executeSql("INSERT OR REPLACE INTO FriendDrops(type, friendId, isCut, time) VALUES(?, ?, ?, ?)", [n, t, r, Date.now()])["catch"](function (e) {
              (0, s.tlog)("error", "dropFriend2 insert FriendDrops", n, t, r, e);
            }) : i.executeSql("DELETE FROM FriendDrops WHERE friendId=?", [t])["catch"](function (e) {
              (0, s.tlog)("error", "dropFriend2 delete FriendDrops", n, t, r, e);
            });
          });
        }).then(function () {
          e.removeFriendsAllUnread(t), e.reloadFriendsData(), e.relationShips[t] && delete e.relationShips[t].isFriend, e.friendShipLast.reload = 1, e.emit("selectViewLoaded_contactsBoard", !0), e.navBackAfterReport(), i();
        })["catch"](function (e) {
          (0, s.tlog)("error", "dropFriend2", t, e), o(e);
        });
      });
    }, e.addFriend2 = function (t) {
      return new Promise(function (n, r) {
        e.getFriendCut(t).then(function (n) {
          return e.send("addFriend2", {
            friendId: t,
            cut: n.isCut
          }).then(function () {
            var r = e.now();
            return n.isCut ? s.db.executeSql("INSERT OR REPLACE INTO FriendShips(friendId, adds, time) VALUES(?, ?, ?)", [t, n.isCut ? "1" : "", r]) : s.db.executeSql("INSERT OR REPLACE INTO FriendShips(friendId, time) VALUES(?, ?)", [t, r]);
          });
        }).then(function () {
          e.relationShips[t] && (e.relationShips[t].isFriend = 1), e.friendShipLast.reload = 1, e.emit("selectViewLoaded_contactsBoard", !0), e.emit("renderDroper_" + t, t), n();
        })["catch"](function (e) {
          (0, s.tlog)("error", "addFriend2", t, e), r(e);
        });
      });
    }, e.saveFriends = function (t) {
      return 0 !== t.length ? new Promise(function (n, r) {
        var i = !1;
        s.db.transaction(function (n) {
          t.forEach(function (t) {
            var r = t.friendId,
              o = t.descType || 1,
              a = t.descCategory || 3,
              d = t.name || "",
              c = t.avatar || "",
              u = t.chatId || "",
              l = t.phoneNum || "",
              f = t.desc || "",
              h = t.atime || 0,
              g = t.type || 1,
              p = 1 === g ? e.userid : "3:" + e.userid,
              m = r,
              S = e.userid,
              I = t.time || e.now(),
              v = t.shareFrom || r,
              P = t.pin || 0,
              E = t.msgid || "",
              b = /^(\d+):/.exec(r);
            if (b && (g = parseInt(b[1], 10), m = e.userid, S = r), t.noRelDel || delete e.relationShips[r], e.getRelationShip(r)["catch"](function (e) {
              return (0, s.tlog)("error", "saveFriends", r, e);
            }), !t.isBottle) {
              i = !0;
              var C = t.isCut ? "1" : "";
              n.executeSql("INSERT OR REPLACE INTO FriendShips(friendId, adds, time) VALUES(?, ?, ?)", [r, C, I])["catch"](function (e) {
                (0, s.tlog)("error", "saveFriends insert FriendShips", r, t.fword, d, e);
              }), "2:" === r.slice(0, 2) ? e.groupNumber += 1 : e.friendNumber += 1;
            }
            if (!t.nof) {
              var T = t.isCut ? 1 : 0;
              n.executeSql("\n            INSERT OR REPLACE INTO Friends (\n              userid, friendId, name, avatar, type, time, desc, descType, descCategory,\n              shareId, msgid, phoneNum, toId, fromId, shareFrom, atime, rtime, pin\n            )\n              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n          ", [p, r, d, c, g, I, f, o, a, u, E, l, S, m, v, h, T, P])["catch"](function (e) {
                return (0, s.tlog)("error", "1.saveFriends", e);
              });
            }
          });
        }).then(function () {
          i && (e.friendShipLast.reload = 1, e.emit("selectViewLoaded_contactsBoard", !0)), n();
        })["catch"](function (e) {
          (0, s.tlog)("error", "saveFriends", e), r(e);
        });
      }) : void 0;
    }, e.reloadFriendsData = function () {
      e.isLocking("navIsTrans") ? e.addLockCb("navIsTrans", function () {
        e.loadFriendsData(), e.loadFriendsData("3:" + e.userid);
      }) : (e.loadFriendsData(), e.loadFriendsData("3:" + e.userid)), delete e.lastFriendsTabCb;
    }, e.signupTooAlert = function () {
      e.diag({
        transp: !0,
        locking: !0,
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("Signup too frequently. Do it tomorrow."),
        buttons: [{
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            t.isProgressing || (t.progressing(!0), e.firstInstallCheck().then(function () {
              return e.closeDiag(function () {
                return e.signMenu();
              });
            })["catch"](function (e) {
              (0, s.tlog)("error", "signup too", e), t.setState({
                infoTip: (0, s.tr)("Connection Failed")
              });
            }));
          }
        }]
      });
    }, e.clearCurrentAccount = function () {
      e.diag({
        header: (0, s.tr)("Clear current account"),
        content: (0, s.tr)("You need to enter current account and password before your could clear it."),
        showPasswdButton: !0,
        textInputs: [{
          placeholder: (0, s.tr)("Account"),
          value: "",
          maxLength: 50
        }, {
          placeholder: (0, s.tr)("Password"),
          value: "",
          secureTextEntry: !0,
          maxLength: 50
        }],
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Clear & Quit"),
          onPress: function (t) {
            if (!t.isProgressing) {
              var n = t.state.textInputs[0].value;
              if (!n) return void t.setState({
                infoTip: (0, s.tr)("Account cannot be empty")
              });
              var r = t.state.textInputs[1].value;
              if (!r) return void t.setState({
                infoTip: (0, s.tr)("Password cannot be empty")
              });
              if (n !== e.account) return void t.setState({
                infoTip: (0, s.tr)("Account wrong")
              });
              t.progressing(!0), e.getPasswdSalt().then(function (i) {
                return r = (0, s.md5)(r + i), e.send("logoutClear", {
                  deviceId: e.deviceId,
                  account: n,
                  password: r
                }).then(function (n) {
                  if (t.progressing(!1), n.passwdWrong) t.setState({
                    infoTip: (0, s.tr)("Password wrong")
                  });else {
                    if (!n.accountWrong) return e["multiLoginCnts_" + e.dataCenter] = e.multiLoginCnts, e.resetSharedParas("multiLoginCnts_" + e.dataCenter).then(function () {
                      return e.delSharedParas("userid_" + e.dataCenter);
                    }).then(function () {
                      return s.dbs.delUserProfile("mpasswd");
                    }).then(function () {
                      e.closeDiag(function () {
                        return e.reloadHvdown();
                      });
                    });
                    t.setState({
                      infoTip: (0, s.tr)("Account not exists")
                    });
                  }
                });
              })["catch"](function (e) {
                t.progressing(!1), (0, s.tlog)("error", "Clear quit", e), t.setState({
                  infoTip: (0, s.tr)("Requesting Failed")
                });
              });
            }
          }
        }]
      });
    }, e.unsignAccount = function () {
      e.diag({
        header: (0, s.tr)("Unsign Request"),
        content: (0, s.tr)("In order to prevent wrong touch, please enter your account and password"),
        showPasswdButton: !0,
        textInputs: [{
          placeholder: (0, s.tr)("Account"),
          value: "",
          maxLength: 50
        }, {
          placeholder: (0, s.tr)("Password"),
          value: "",
          secureTextEntry: !0,
          maxLength: 50
        }],
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Submit"),
          onPress: function (t) {
            if (!t.isProgressing) {
              var n = t.state.textInputs[0].value;
              if (!n) return void t.setState({
                infoTip: (0, s.tr)("Account cannot be empty")
              });
              var r = t.state.textInputs[1].value;
              if (!r) return void t.setState({
                infoTip: (0, s.tr)("Password cannot be empty")
              });
              if (n !== e.account) return void t.setState({
                infoTip: (0, s.tr)("Account wrong")
              });
              t.progressing(!0), e.getPasswdSalt().then(function (i) {
                r = (0, s.md5)(r + i);
                var o = {
                  deviceId: e.deviceId,
                  account: n,
                  password: r
                };
                return e.isTempUserid() && (o.isT = 1), e.send("unsignAccount", o).then(function (n) {
                  t.progressing(!1), n.passwdWrong ? t.setState({
                    infoTip: (0, s.tr)("Password wrong")
                  }) : n.accountWrong ? t.setState({
                    infoTip: (0, s.tr)("Account not exists")
                  }) : n.unsignAready ? t.setState({
                    infoTip: (0, s.tr)("Account destroy request only once per 30 days")
                  }) : n.forbidden ? t.setState({
                    infoTip: (0, s.tr)("Your account has been forbided.")
                  }) : (s.dbs.setUserProfile({
                    frozen: 1
                  })["catch"](function (e) {
                    return (0, s.tlog)("error", "unsign frozen", e);
                  }), e.accountFrozen(), e.syncFriendProfile(e.userid, !0));
                });
              })["catch"](function (e) {
                t.progressing(!1), (0, s.tlog)("error", "Unsign Account", e), t.setState({
                  infoTip: (0, s.tr)("Requesting Failed")
                });
              });
            }
          }
        }]
      });
    }, e.accountFrozen = function () {
      e.frozen && !e.isFrozen && (e.isFrozen = !0, e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("You cannot operate when account is frozen"),
        buttons: [{
          text: (0, s.tr)("Cancel Frozen"),
          onPress: function () {
            e.diag({
              header: (0, s.tr)("Tip"),
              content: (0, s.tr)("Are you sure to cancel frozen?"),
              buttons: [{
                text: (0, s.tr)("No"),
                onPress: function () {
                  delete e.isFrozen, e.accountFrozen();
                }
              }, {
                text: (0, s.tr)("Yes"),
                onPress: function (t) {
                  e.send("cancelFrozen").then(function () {
                    return delete e.isFrozen, s.dbs.delUserProfile("frozen");
                  }).then(function () {
                    e.syncPushTokenRun && e.syncPushTokenRun(), e.closeDiag(function () {
                      e.popTip((0, s.tr)("You have canceled frozen"), function () {
                        e.syncFriendProfile(e.userid, !0);
                      });
                    });
                  })["catch"](function (e) {
                    (0, s.tlog)("error", "cancelFrozen", e), t.setState({
                      infoTip: (0, s.tr)("Requesting Failed")
                    });
                  });
                }
              }]
            });
          }
        }]
      }));
    }, e.needLoginingDiag = function (t) {
      e.diag({
        locking: !0,
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("The phone number has already been signuped."),
        link: {
          text: (0, s.tr)("Login this account?"),
          color: s.theme.deepGreen2,
          onPress: function (n) {
            n.isProgressing || (n.progressing(!0), e.logining2(n, t));
          }
        },
        buttons: [{
          text: (0, s.tr)("Sign up failed"),
          onPress: function () {}
        }]
      });
    }, e.getMsgscntFir = function (e, t, n, r) {
      return new Promise(function (i, o) {
        var s;
        s = e > t ? "1,0" : "0,1", i({
          msgscnt: s,
          text: n,
          shareFrom: r
        });
      });
    }, e.getMsgscnt = function (t, n) {
      return new Promise(function (r, i) {
        var o = e.getChatSession(t, n);
        s.db.executeSql("SELECT * FROM Msgscnts WHERE shareId=?", [o]).then(function (i) {
          var a = i[0].rows.item(0);
          if (!a) {
            if (t > n) var d = "1,0";else d = "0,1";
            return s.db.executeSql("SELECT * FROM Msgs WHERE shareId=? ORDER BY time ASC LIMIT 10", [o]).then(function (n) {
              for (var i, o, s = 0, a = n[0].rows, c = 0; c < a.length; c++) {
                var u = a.item(c);
                u.msgscnt === e.CONS_FIRST_BOTTLE_MSGSCNT && (i = u.text, o = u.shareFrom), u.fromId === t && u.category === e.CONS_MSG_CAT_MSG && (s += 1);
              }
              r(i && 1 === s ? {
                msgscnt: d,
                text: i,
                shareFrom: o
              } : d);
            });
          }
          var c = a.msgscnt.split(",");
          if (t > n) {
            var u = parseInt(c[0], 10) + 1;
            r(u + "," + c[1]);
          } else u = parseInt(c[1], 10) + 1, r(c[0] + "," + u);
        })["catch"](function (e) {
          (0, s.tlog)("error", "getMsgscnt", t, n, e);
        });
      });
    }, e.approvePeople = function (t) {
      s.db.executeSql("INSERT OR REPLACE INTO Approves(userid, time) VALUES(?, ?)", [t, Date.now()]).then(function () {
        return e.emit("renderApprove_" + t, t), s.db.executeSql("SELECT * FROM Approved WHERE userid=?", [t]);
      }).then(function (n) {
        var r = {
          friendId: t
        };
        return n[0].rows.item(0) || (r.a = 1), e.send("approvePeople", r);
      })["catch"](function (e) {
        (0, s.tlog)("error", "approvePeople", t, e);
      });
    }, e.isPeopleApproved = function (e) {
      return new Promise(function (t, n) {
        s.db.executeSql("SELECT * FROM Approved WHERE userid=?", [e]).then(function (e) {
          t(e[0].rows.item(0));
        })["catch"](function (e) {
          n(e);
        });
      });
    }, e.hasPeopleApproves = function (e) {
      return new Promise(function (t, n) {
        s.db.executeSql("SELECT * FROM Approves WHERE userid=?", [e]).then(function (e) {
          t(e[0].rows.item(0));
        })["catch"](function (e) {
          n(e);
        });
      });
    }, e.saveFs = function () {
      e.popSpin("", function () {
        return e.popClose();
      }), e.send("cpyFriends").then(function (t) {
        e.popTip("Save " + t.i);
      })["catch"](function (e) {
        return (0, s.tlog)("error", "saveFs", e);
      });
    }, e.unsignUser = function (t) {
      e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("Unsigned?"),
        buttons: [{
          text: (0, s.tr)("No"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Sig"),
          onPress: function (n) {
            n.isProgressing || (n.progressing(!0), e.send("unsignUser", {
              sig: 1,
              userid: t
            }).then(function () {
              e.closeDiag(function () {
                return e.popTip((0, s.tr)("Signed!!!!!"));
              });
            })["catch"](function (e) {
              n.progressing(!1), (0, s.tlog)("error", "sig unsignUser", e), n.setState({
                infoTip: (0, s.tr)("Requesting Failed")
              });
            }));
          }
        }, {
          text: (0, s.tr)("Uns"),
          onPress: function (n) {
            n.isProgressing || (n.progressing(!0), e.send("unsignUser", {
              uns: 1,
              userid: t
            }).then(function () {
              e.closeDiag(function () {
                return e.popTip((0, s.tr)("Unsigned!!!!!"));
              });
            })["catch"](function (e) {
              n.progressing(!1), (0, s.tlog)("error", "uns unsignUser", e), n.setState({
                infoTip: (0, s.tr)("Requesting Failed")
              });
            }));
          }
        }]
      });
    }, e.quitTeenagerMode = function () {
      e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("Enter teenager password"),
        showPasswdButton: !0,
        textInputs: [{
          placeholder: (0, s.tr)("Teenager Password"),
          value: "",
          secureTextEntry: !0,
          maxLength: 50
        }],
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            var n = t.state.textInputs[0].value;
            return n ? void (t.isProgressing || (t.progressing(!0), e.getPasswdSalt().then(function (t) {
              return n = (0, s.md5)(n + t), e.send("quitTeenagerMode", {
                pwd: n
              });
            }).then(function (n) {
              return n.no ? (t.progressing(!1), void t.setState({
                infoTip: (0, s.tr)("Password wrong")
              })) : (e.tipCb((0, s.tr)("Quit teenager mode ok"), function () {
                e.loadProfile(e.userid);
              }), s.dbs.delUserProfile("tpwd"));
            })["catch"](function (e) {
              (0, s.tlog)("error", "quitTeenagerMode", e), t.progressing(!1), t.setState({
                infoTip: (0, s.tr)("Connection Failed")
              });
            }))) : void t.setState({
              infoTip: (0, s.tr)("Password cannot be empty")
            });
          }
        }]
      });
    }, e.vipExpCheck = function (t) {
      e.vipExp && !e.vipExpD && -1 !== e.vipExp.indexOf(t) && e.send("vipExp").then(function () {
        return s.dbs.setUserProfile({
          vipExpD: 1
        }).then(function () {
          return s.dbs.delUserProfile("vipExp");
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "vipExpCheck", t, e);
      });
    }, e.vipExpDiag = function () {
      return __recoveryFreePolicy.notifyBackendRequired(e);
    }, e.teenagerMode = function () {
      var t,
        n = 0,
        r = function (e) {
          var n = e.state.textInputs[0].value;
          if (t && t !== n) e.setState({
            infoTip: (0, s.tr)("Two password not same")
          });else if (n.length < 12) e.setState({
            infoTip: (0, s.tr)("Password cannot be less than 12 letters")
          });else {
            if (/[A-Z]/.test(n) && /[a-z]/.test(n) && /[0-9]/.test(n)) return t = n, !0;
            e.setState({
              infoTip: (0, s.tr)("Password should contain upper and lower and alphabets")
            });
          }
        },
        i = function o(i) {
          e.diag({
            header: (0, s.tr)("Teenager Mode"),
            content: i,
            showPasswdButton: !0,
            textInputs: [{
              placeholder: (0, s.tr)("Teenager Password"),
              value: "",
              secureTextEntry: !0,
              maxLength: 50
            }],
            buttons: [{
              text: (0, s.tr)("Cancel"),
              onPress: function () {
                return e.closeDiag();
              }
            }, {
              text: (0, s.tr)("Next"),
              onPress: function (i) {
                if (r(i)) {
                  if (0 === n) o((0, s.tr)("Input teenager mode password again"));else if (1 === n) o((0, s.tr)("Input teenager mode password again and again"));else {
                    if (i.isProgressing) return;
                    i.progressing(!0), e.getPasswdSalt().then(function (n) {
                      var r = (0, s.md5)(t + n);
                      return e.send("teenagerMode", {
                        pwd: r
                      });
                    }).then(function () {
                      e.tipCb((0, s.tr)("You have set teenager mode"), function () {
                        "^1" === e.userid.slice(-2) ? e.switchShadow() : e.loadProfile(e.userid);
                      }), s.dbs.setUserProfile({
                        tpwd: 1
                      })["catch"](function (e) {
                        return (0, s.tlog)("error", "teenager mode tpwd", e);
                      });
                    })["catch"](function (e) {
                      (0, s.tlog)("error", "teenager mode", e), i.progressing(!1), i.setState({
                        infoTip: (0, s.tr)("Connection Failed")
                      });
                    });
                  }
                  n += 1;
                }
              }
            }]
          });
        };
      e.diag({
        header: (0, s.tr)("Teenager Mode"),
        content: (0, s.tr)("Turn on teenager mode"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Turn on"),
          onPress: function () {
            return i((0, s.tr)("Input teenager mode password"));
          }
        }]
      });
    }, e.needChangeAvatarDiag = function (t) {
      e.isChangingAvatar || (e.isChangingAvatar = !0, e.diag({
        header: (0, s.tr)("Avatar"),
        content: t,
        imagePicker: (0, s.tr)("Avatar"),
        buttons: [{
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            var n = t.state.imagePickerResult;
            n ? e.closeDiag(function () {
              return e.changeUserAvatar(n, function (t) {
                t.err && (delete e.isChangingAvatar, e.needChangeAvatarDiag((0, s.tr)("Set failed. Try again.")));
              });
            }) : t.setState({
              infoTip: (0, s.tr)("Select your avatar")
            });
          }
        }]
      }));
    }, e.loadFriendDrops = function () {
      s.db.executeSql("SELECT * FROM FriendDrops WHERE friendId=?", ["end"]).then(function (t) {
        return 0 === t[0].rows.length ? e.send("fetchFriendDrops").then(function (e) {
          return e.drops.push({
            f: "end"
          }), s.db.transaction(function (t) {
            for (var n = function (n) {
                var r = e.drops[n],
                  o = r.a,
                  a = r.f,
                  d = r.t;
                i = "end" === a ? [3, a, 0, 2 * Date.now()] : [1, a, o, d], t.executeSql("INSERT OR REPLACE INTO FriendDrops(type, friendId, isCut, time) VALUES(?,?,?,?)", i)["catch"](function (t) {
                  (0, s.tlog)("error", "loadFriendDrops insert FriendDrops", e.rs[n], t);
                });
              }, r = 0; r < e.drops.length; r++) {
              var i;
              n(r);
            }
          });
        }) : void 0;
      }).then(function () {
        return s.db.executeSql("SELECT * FROM FriendDrops ORDER BY type ASC, time DESC LIMIT 1000").then(function (t) {
          for (var n = t[0].rows, r = [], i = 0; i < n.length; i++) {
            var o = n.item(i);
            "end" !== o.friendId && (o.friendId.length < 5 || (o.u = o.friendId, delete o.friendId, r.push(o)));
          }
          e.navSwitchCb("aboutMe"), e.newRouteTo("suSelect", {
            type: "auid",
            rs: r,
            tmp: 1,
            name: (0, s.tr)("trash"),
            nosearch: 1,
            header: (0, s.tr)("In order to prevent mis-delete")
          });
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "loadFriendDrops", e);
      });
    }, e.goChecking = function () {
      e.goCheckingRun || (e.goCheckingRun = !0, o.Alert.alert((0, s.tr)("Tip"), (0, s.tr)("Network failed. Check your network settings."), [{
        text: (0, s.tr)("Cancel"),
        onPress: function () {
          delete e.goCheckingRun, e.emit("hideTermView", !1);
        }
      }, {
        text: (0, s.tr)("Go Checking"),
        onPress: function () {
          e.emit("hideTermView", !1), s.Permissions.openSettings();
        }
      }]));
    }, e.clearAllUnread = function () {
      e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("Clear all unread messages?"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            t.isProgressing || (t.progressing(!0), s.db.executeSql("DELETE FROM Unread").then(function () {
              return e.shaM ? s.dbs.setUserProfile({
                shaMClear: e.shaM
              }) : void 0;
            }).then(function () {
              return s.dbs.delUserProfile("lastBottleUserid");
            }).then(function () {
              e.closeDiag(function () {
                return e.reloadHvdown();
              });
            })["catch"](function (e) {
              t.progressing(!1), (0, s.tlog)("error", "clear all unread", e), t.setState({
                infoTip: (0, s.tr)("Requesting Failed")
              });
            }));
          }
        }]
      });
    }, e.fetchBrSend = function () {
      e.send("fetchBr")["catch"](function (e) {
        return (0, s.tlog)("error", "fetchBrSend", e);
      });
    }, e.clearUnreadDiag = function () {
      e.shaM && e.shaM !== e.shaMClear ? e.diag({
        header: (0, s.tr)("\u6e05\u7a7a\u672a\u8bfb"),
        content: (0, s.tr)("\u662f\u5426\u8981\u6e05\u7a7a\u672a\u8bfb\u7ea2\u70b9\u63d0\u793a?"),
        buttons: [{
          text: (0, s.tr)("\u4e0d\u6e05\u7a7a"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("\u6e05\u7a7a"),
          onPress: function (t) {
            t.isProgressing || (t.progressing(!0), s.db.executeSql("DELETE FROM Unread").then(function () {
              return e.shaM ? s.dbs.setUserProfile({
                shaMClear: e.shaM
              }) : void 0;
            }).then(function () {
              return s.dbs.delUserProfile("lastBottleUserid");
            }).then(function () {
              e.closeDiag(function () {
                return e.reloadHvdown();
              });
            })["catch"](function (e) {
              t.progressing(!1), (0, s.tlog)("error", "clear all unread", e), t.setState({
                infoTip: (0, s.tr)("Requesting Failed")
              });
            }));
          }
        }]
      }) : e.closeDiag();
    }, e.loadFriendShips = function () {
      return new Promise(function (t, n) {
        if (e.isLoadingFriendShips) e.loadFriendShipsPromises.push(function () {
          e.loadFriendShips().then(t, n);
        });else {
          if (e.isLoadingFriendShips = !0, -1 === e.friendShipLast.time && !e.friendShipLast.reload) {
            t(e.friendShipList), delete e.isLoadingFriendShips;
            var r = e.loadFriendShipsPromises.pop();
            return void (r && r());
          }
          var i = 10,
            o = 0;
          e.friendShipLast.reload && (o = e.friendShipList.length, e.friendShipLast = {
            friendId: "",
            time: e.HIGHESTTIME
          }, e.friendShipList = []), delete e.friendShipLast.reload;
          var a = e.friendShipLast,
            d = a.friendId,
            c = a.time;
          s.db.executeSql("SELECT * FROM FriendShips WHERE time < ? OR time = 0 AND friendId > ? ORDER BY time DESC, friendId ASC LIMIT ?", [c, d, i + o]).then(function (n) {
            for (var r = n[0].rows, o = 0; o < r.length; o++) {
              var a = r.item(o);
              e.friendShipList.push(a);
            }
            if (babelHelpers["extends"](e.friendShipLast, a), !a || r.length < i && -1 !== a.time) {
              var d = e.friendShipLast.time;
              return e.selectViewDis.contactsBoard = 10, e.send("fetchFriendShips3", {
                t: d,
                limit: i
              }).then(function (n) {
                var r = [],
                  o = n.ships,
                  a = o.length;
                return i > a && (o.push({
                  f: "\uffffend",
                  t: -1
                }), a += 1), s.db.transaction(function (t) {
                  for (var n = function (n) {
                      var i = o[n],
                        d = i.f,
                        c = i.a,
                        u = i.t,
                        l = c ? "1" : "";
                      r.push({
                        friendId: i.f,
                        time: i.t
                      }), t.executeSql("INSERT OR REPLACE INTO FriendShips (friendId, adds, time) VALUES (?, ?, ?)", [d, l, u])["catch"](function (e) {
                        (0, s.tlog)("error", "tx insert FriendShips", i, e);
                      }), n === a - 1 && babelHelpers["extends"](e.friendShipLast, {
                        friendId: i.f,
                        time: i.t
                      });
                    }, i = 0; a > i; i++) n(i);
                }).then(function () {
                  var n;
                  (n = e.friendShipList).push.apply(n, r), t(e.friendShipList);
                });
              });
            }
            -1 === a.time && (e.friendShipLast.time = -1), e.selectViewDis.contactsBoard = 2e3, t(e.friendShipList);
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
    }, e.bottleResTimer, e.bottleResIntv, e.bottleResLoopR, e.bottleResLoop = function () {
      if (!e.bottleResLoopR) {
        e.bottleResLoopR = !0;
        var t,
          n = 500,
          r = function i() {
            e.bottleResTimer = setTimeout(function () {
              !s.db || e.modelViewRef.state.showModelView || e.bottleResLock || e.pickingViewShowing || e.contextMenusRef.state.showContextMenu || e.modelImageViewRef[""].state.display || e.isKeyboardShow || e.isEmoShow || e.bottleResLater ? n = t || !s.db ? e.syncVar.bResBase1 || 1e3 : e.syncVar.bResBase2 || 2e3 : (e.bottleResponseMap.loaded ? Promise.resolve() : s.db.executeSql("SELECT * FROM Friends WHERE userid=?", [e.CONS_BOTTLE_RES_PREFIX + e.userid]).then(function (t) {
                for (var n = t[0].rows, r = 0; r < n.length; r++) {
                  var i = n.item(r);
                  e.bottleResponseMap[i.friendId] || (e.bottleResponseMap[i.friendId] = i, e.bottleResponseMap.cnt += 1);
                }
                e.bottleResponseMap.loaded = 1;
              })).then(function () {
                return s.db.executeSql("SELECT * FROM Friends WHERE userid=? ORDER BY time DESC LIMIT 1", [e.CONS_BOTTLE_RES_PREFIX + e.userid]);
              }).then(function (e) {
                var r = e[0].rows.item(0);
                return r ? t = !1 : (t = !0, n = 1e3), r;
              }).then(function (t) {
                return t ? s.db.executeSql("SELECT * FROM Friends WHERE userid=? AND friendId=?", [e.userid, e.USERID_RES]).then(function (t) {
                  return t[0].rows.item(0) ? s.db.executeSql("UPDATE Friends SET time=? WHERE userid=? AND friendId=?", [Date.now(), e.userid, e.USERID_RES]).then(function (t) {
                    e.emit("friendsUnreadChanged"), e.loadFriendsData();
                  }) : e.saveFriends([{
                    friendId: e.USERID_RES,
                    desc: (0, s.tr)("You have new response"),
                    type: 1,
                    time: e.now(),
                    pin: 9,
                    isBottle: 1
                  }]).then(function () {
                    e.emit("friendsUnreadChanged"), e.loadFriendsData();
                  });
                }) : void 0;
              })["catch"](function (e) {
                (0, s.tlog)("error", "bottleResLoop", e);
              }), i();
            }, n + Math.floor(Math.random() * n));
          };
        r();
      }
    }, e.restartBottleResLoop = function () {
      clearTimeout(e.bottleResTimer), clearInterval(e.bottleResIntv), delete e.bottleResLater, delete e.bottleResLock, delete e.bottleResLoopR, e.bottleResLoop();
    }, e.navToBottleRes = function (t, n) {
      s.db.executeSql("SELECT * FROM Friends WHERE userid=? ORDER BY time DESC LIMIT 1", [e.CONS_BOTTLE_RES_PREFIX + e.userid]).then(function (r) {
        var i = r[0].rows.item(0);
        i ? (e.bottleResponseMap[i.friendId] && (e.bottleResponseMap.cnt -= 1, delete e.bottleResponseMap[i.friendId]), e.newRouteTo("interact_", {
          friend: i,
          name: (0, s.tr)("Message"),
          navSwipeConfig: t
        }, function () {
          s.db.executeSql("DELETE FROM Friends WHERE userid=? AND friendId=?", [e.CONS_BOTTLE_RES_PREFIX + e.userid, i.friendId]).then(function () {
            return s.db.executeSql("UPDATE Friends SET accessTime=?, atime=? WHERE userid=? AND friendId=?", [e.now(), 0, e.userid, e.USERID_RES]);
          }).then(function () {
            n && n();
          })["catch"](function (e) {
            (0, s.tlog)("error", "bottleResLoop fn", e);
          });
        }), e.fetchBrSend()) : e.tip((0, s.tr)("There is no new response"));
      })["catch"](function (e) {
        (0, s.tlog)("error", "navToBottleRes db", e);
      });
    }, e.fauth = function () {
      e.post("/api/fusionAuthTokenFetch", {}).then(function (t) {
        o.NativeModules.RNDeviceInfo.aliAuth3({
          title: "",
          deviceId: e.deviceId,
          token: t.token
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "fusionAuthTokenFetch", e);
      });
    }, e.iosDvModelMapShort = {
      "iPhone 5s": "5s",
      "iPhone 6 Plus": "6p",
      "iPhone 6": "6",
      "iPhone 6s": "6s",
      "iPhone 6s Plus": "6sp",
      "iPhone SE": "se",
      "iPhone 7": "7",
      "iPhone 7 Plus": "7p",
      "iPhone X": "x",
      "iPhone 8": "8",
      "iPhone 8 Plus": "8p",
      "iPhone XS": "xs",
      "iPhone XS Max": "xsm",
      "iPhone XR": "xr",
      "iPhone 11": "11",
      "iPhone 11 Pro": "11p",
      "iPhone 11 Pro Max": "11pm",
      "iPhone SE2": "se2",
      "iPhone 12 mini": "12mi",
      "iPhone 12": "12",
      "iPhone 12 Pro": "12p",
      "iPhone 12 Pro Max": "12pm",
      "iPhone 13 mini": "13mi",
      "iPhone 13": "13",
      "iPhone 13 Pro": "13p",
      "iPhone 13 Pro Max": "13pm",
      "iPhone SE3": "se3",
      "iPhone 14": "14",
      "iPhone 14 Plus": "14pl",
      "iPhone 14 Pro": "14p",
      "iPhone 14 Pro Max": "14pm",
      "iPhone 15": "15",
      "iPhone 15 Plus": "15pl",
      "iPhone 15 Pro": "15p",
      "iPhone 15 Pro Max": "15pm"
    }, e.deviceTrans = function (t) {
      return t ? (t = t.replace(/Apple-/, ""), e.iosDvModelMap[t] && (t = e.iosDvModelMap[t]), e.iosDvModelMapShort[t] && (t = e.iosDvModelMapShort[t]), t.replace(/\sgeneration/, "")) : "";
    }, e.flagReport = function (t, n) {
      var r = function (r) {
        if (n || (n = ""), 4 > r) {
          var i = {
            1: "Horny >>> ",
            2: "Abuse >>> ",
            3: "Ads >>> "
          };
          e.reportPersonDiag(t, {
            type: r,
            text: i[r] + n
          });
        } else e.reportReasonDiag(t, r, n);
      };
      e.popSpin(), setTimeout(function () {
        e.popClose(function () {
          e.emit("contextMenu", [[(0, s.tr)("Sexual Harass"), function () {
            return e.emit("closeContextMenu", r(1));
          }], [(0, s.tr)("Abuses & Curses"), function () {
            return e.emit("closeContextMenu", r(2));
          }], [(0, s.tr)("Ads & Cheating"), function () {
            return e.emit("closeContextMenu", r(3));
          }], [(0, s.tr)("Others"), function () {
            return e.emit("closeContextMenu", r(4));
          }]]);
        });
      }, 3e3 + 2e3 * Math.random());
    }, e.showCaveTip = function () {
      e.isForbided || e.forbidExp ? e.forbidTip() : e.emit("showCave", {
        header: (0, s.tr)("\u661f\u7a7a"),
        content: (0, s.tr)("\u5411\u661f\u7a7a\u8bf4\u51fa\u4f60\u7684\u6084\u6084\u8bdd"),
        textInputs: [{
          placeholder: (0, s.tr)("\u6084\u6084\u8bdd"),
          value: "",
          maxLength: 2500
        }],
        link: {
          text: (0, s.tr)("\u770b\u770b\u522b\u4eba\u7684\u6084\u6084\u8bdd?"),
          color: s.theme.deepGreen2,
          onPress: function (t) {
            e.showNextCave();
          }
        },
        onChangeTextCb: function (e, t) {
          e.data.infoTip && (delete e.data.infoTip, e.setState({}));
        },
        onSubmitEditing: function (t) {
          e.caveGo(t);
        },
        buttons: [{
          text: (0, s.tr)("\u53d6\u6d88"),
          onPress: function (t) {
            e.emit("closeCave");
          }
        }, {
          text: (0, s.tr)("\u8bc9\u8bf4"),
          onPress: function (t) {
            e.caveGo(t);
          }
        }]
      });
    }, e.showNextCave = function () {
      return e.tpwd ? void e.tip((0, s.tr)("\u9752\u5c11\u5e74\u6a21\u5f0f\u4e0b\u53ea\u80fd\u67e5\u770b\u81ea\u5df1\u7684\u661f\u7a7a")) : (e.emit("showFullSpin", !0), void e.emit("hideCave", !0, function () {
        e.caveReplyCnt ? e.pickupReply() : e.pickupCave();
      }));
    }, e.sendBottleReply = function (t, n, r, i, o) {
      return new Promise(function (a, d) {
        var c = e.getChatSession(t, e.userid),
          u = e.getFid(t, e.userid, c);
        Promise.all([Promise.resolve(0), e.getRelationShip(t), e.getProfileK(t, "forbid"), e.getMsgscntFir(t, e.userid, i, r), e.isPeopleApproved(t)]).then(function (i) {
          var a = i[0] ? 1 : 0,
            d = i[1] || {},
            c = i[2] || e.CONS_FORBID_NORMAL,
            l = i[3],
            f = i[4];
          if (e.isUserForbided(c)) return void e.tip((0, s.tr)("This user has been forbidden."));
          var h = d.isFriend ? 1 : 0,
            g = d.isFollowed ? 1 : 0,
            p = d.isStared ? 1 : 0,
            m = d.isCut,
            S = e.userid;
          e.syncFriendDrops(t);
          var I = e.getChatSession(t, S),
            v = I,
            P = e.getNewMsgId(v, I);
          e.sendShareReply("newMsg", {
            shareId: v,
            msgid: P,
            msgscnt: l,
            fromId: S,
            toId: t,
            chatSession: I,
            shareFrom: r,
            friendId: t,
            type: e.CONS_MSG_TYPE_TEXT,
            data: n,
            category: 3,
            ftype: 1,
            fid: u,
            seqi: 0,
            atime: 0,
            isFriend: h,
            userid: "3:" + e.userid,
            isPraised: a,
            isStared: p,
            utab: g ? 1 : 2,
            isApproved: !!f,
            isCut: m
          }, o);
        }).then(function () {
          return a();
        })["catch"](function (e) {
          d(e);
        });
      });
    }, e.popFriendPickedDiag = function (t) {
      var n = t.friendId,
        r = t.shareId,
        i = t.time,
        o = t.descType;
      s.db.executeSql("SELECT * FROM Msgs WHERE shareId=? AND time=?", [r, i]).then(function (e) {
        var t = e[0].rows;
        return 0 === t.length ? {} : t.item(0) ? t.item(0) : {};
      }).then(function (r) {
        var i = r.shareFrom,
          a = r.text;
        if (i || (i = t.shareFrom, a = ""), o === e.CONS_FRIEND_REPLIED) return void e.diag({
          infoTip: (0, s.tr)("\u5df2\u56de\u590d\u8fc7\u8fd9\u6761\u6084\u6084\u8bdd"),
          bcontent: a,
          buserid: n,
          rightTop: {
            height: 20
          },
          onPressBcontentRp: function () {
            return e.closeDiag(function () {
              return e.flagReport(n, a);
            });
          },
          onUserPressed: function () {
            return e.closeDiag(function () {
              e.isInBottleMsg = !0, e.newRouteTo("about_", {
                friendId: n,
                name: (0, s.tr)("Profile")
              });
            });
          },
          buttons: [{
            text: (0, s.tr)("\u786e\u5b9a"),
            onPress: function () {
              return e.closeDiag();
            }
          }]
        });
        var d = function (t) {
          var r = t.state.textInputs[0].value.trim();
          return r ? e.ws ? void (t.isProgressing || (t.progressing(!0), s.db.executeSql("UPDATE Friends SET descType=? WHERE userid=? AND friendId=?", [e.CONS_FRIEND_REPLIED, "3:" + e.userid, n]).then(function () {
            return e.loadFriendsData("3:" + e.userid).then(function () {
              return e.closeDiag();
            });
          }, function (t) {
            (0, s.tlog)("error", "sendBottleReply 2", n, a, t), e.closeDiag();
          }), e.isTempUserid() || e.sendBottleReply(n, r, i, a, function () {})["catch"](function (e) {
            (0, s.tlog)("error", "sendBottleReply", n, a, e);
          }))) : void t.setState({
            infoTip: (0, s.tr)("Network Failed")
          }) : void t.setState({
            infoTip: (0, s.tr)("\u56de\u590d\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a")
          });
        };
        e.diag({
          bcontent: a,
          buserid: n,
          rightTop: {
            height: 20
          },
          onUserPressed: function () {
            return e.closeDiag(function () {
              e.isInBottleMsg = !0, e.newRouteTo("about_", {
                friendId: n,
                name: (0, s.tr)("Profile")
              });
            });
          },
          onPressBcontentRp: function () {
            return e.closeDiag(function () {
              return e.flagReport(n, a);
            });
          },
          textInputs: [{
            placeholder: (0, s.tr)("\u56de\u590d\u6587\u5b57"),
            onSubmitEditing: function (e) {
              return d(e);
            },
            value: "",
            maxLength: 300
          }],
          buttons: [{
            text: (0, s.tr)("\u53d6\u6d88"),
            onPress: function () {
              return e.closeDiag();
            }
          }, {
            text: (0, s.tr)("\u56de\u590d"),
            onPress: function (e) {
              return d(e);
            }
          }]
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "popFriendPickedDiag", e);
      });
    }, e.vfphone = function () {
      e.phoneVerify(null, "\u6ce8\u518c", function () {
        return e.closeDiag(function () {
          return e.signMenu();
        });
      }, function (t) {
        t.failed ? e.fauth() : t.uns ? (e.signuped = 1, e.diag({
          transp: !0,
          locking: !0,
          header: (0, s.tr)("Tip"),
          content: (0, s.tr)("Your phone number cannot be signuped"),
          buttons: [{
            text: (0, s.tr)("Ok"),
            onPress: function () {}
          }]
        })) : t.exists ? (e.firstInstallStepPost("phe"), e.signupT = e.getToday(), e.signupTooAlert()) : t.needUp ? (e.firstInstallStepPost("phu"), e.needUpdate()) : t.signuped ? (e.firstInstallStepPost("phs"), t.userid && t.mpasswd ? (e.userid = t.userid, e.mpasswd = t.mpasswd, e.phone = t.phone, e.signuped = 1, e.diag({
          transp: !0,
          locking: !0,
          header: (0, s.tr)("Tip"),
          content: (0, s.tr)("The phone number has already been signuped."),
          link: {
            text: (0, s.tr)("Login this account?"),
            color: s.theme.deepGreen2,
            onPress: function (t) {
              t.isProgressing || (t.progressing(!0), e.logining2(t));
            }
          },
          buttons: [{
            text: (0, s.tr)("Sign up failed"),
            onPress: function () {}
          }]
        })) : (e.firstInstallStepPost("pok"), e.phone = t.phone, e.showAvatarNameDiag())) : (e.firstInstallStepPost("pok"), e.phone = t.phone, e.showAvatarNameDiag());
      });
    };
  };
});
