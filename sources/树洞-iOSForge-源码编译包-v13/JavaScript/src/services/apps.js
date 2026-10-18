// Maintenance source; recovered reference retained separately.
// Maintenance source; recovered reference retained separately.
__d(316, function (global, require, module, exports) {
  var __recoveryFreePolicy = require(9000);
  Object.defineProperty(exports, "__esModule", {
    value: !0
  });
  var _react = require(311),
    _react2 = babelHelpers.interopRequireDefault(_react),
    _reactNative = require(312),
    _requireConfig = require(314),
    rcfg = require(314),
    HIGHESTTIME = 5014573993851,
    PushNotification = _reactNative.PushNotificationIOS,
    platform = "ios" === _reactNative.Platform.OS ? 1 : 2,
    wslog = !1,
    appsInit = function () {
      babelHelpers["extends"](apps, {
        dbs: _requireConfig.dbs,
        rcfg: rcfg,
        RECV_CNT_LIMIT: 3,
        CONS_MSG_TYPE_TEXT: 1,
        CONS_MSG_TYPE_AUDIO: 2,
        CONS_MSG_TYPE_IMAGE: 3,
        CONS_MSG_TYPE_EMOTION: 4,
        CONS_MSG_TYPE_TIP: 5,
        CONS_MSG_TYPE_PRAISE: 6,
        CONS_MSG_TYPE_TIP_BUTTON: 7,
        CONS_MSG_TYPE_CONFIRM: 8,
        CONS_MSG_TYPE_LINK: 9,
        CONS_MSG_TYPE_GIF: 10,
        CONS_MSG_TYPE_VIDEO: 11,
        CONS_MSG_TYPE_NEXTPAGE: 12,
        CONS_MSG_TYPE_PREVPAGE: 13,
        CONS_MSG_TYPE_NULL: 14,
        CONS_MSG_TYPE_ABUSE: 15,
        CONS_MSG_TYPE_CHEAT_QQ: 16,
        CONS_MSG_TYPE_CHEAT_WX: 17,
        CONS_MSG_TYPE_WARN: 18,
        CONS_MSG_TYPE_TERM: 19,
        CONS_MSG_TYPE_SUBMIT_AUDIT: 20,
        CONS_MSG_TYPE_ILLEGAL: 21,
        CONS_MSG_CAT_LAST_MID_ITEM: -2,
        CONS_MSG_CAT_SHARE_REPLY_REPLY: -1,
        CONS_MSG_CAT_LAST_ITEM: 0,
        CONS_MSG_CAT_SHARE: 1,
        CONS_MSG_CAT_SHARE_REPLY: 2,
        CONS_MSG_CAT_MSG: 3,
        CONS_MSG_CAT_MSG_REPLY: 4,
        CONS_MSG_CAT_MSG_FRIEND_ADD_REQUEST: 5,
        CONS_MSG_CAT_SHARE_TIP: 6,
        CONS_MSG_CAT_NEW_FOLLOWED: 7,
        CONS_MSG_CAT_NEW_FOLLOW: 8,
        CONS_MSG_CAT_LOAD_SHARE_LIMIT: 9,
        CONS_MSG_CAT_BOTTLE_FIRST_REPLY: 10,
        CONS_MSG_STAT_SENDING: 1,
        CONS_MSG_STAT_SEND_OK: 2,
        CONS_MSG_STAT_SEND_FAILED: 3,
        CONS_MSG_STAT_DELETED: 4,
        CONS_MSG_STAT_DELETE_FAILED: 5,
        CONS_MSG_STAT_REPO_DELETED: 6,
        CONS_SEL_FRIEND: 1,
        CONS_SEL_GROUP: 2,
        CONS_SEL_BOTTLE: 3,
        CONS_SEL_REPORT: 4,
        CONS_SEL_RAND: 5,
        CONS_SEL_FORBID: 6,
        CONS_SEL_SMSG: 7,
        CONS_SEL_CIRCLE: 8,
        CONS_SEL_AUDIT: 10,
        CONS_SEL_CIRALL: 11,
        CONS_SEL_MATCH: 12,
        CONS_SEL_ALL: -1,
        CONS_SEL_WALLPAPER: -2,
        CONS_SEL_STRANGER: -3,
        CONS_SEL_ME: -4,
        CONS_SEL_ANON: -5,
        CONS_SEL_CONTACTS: -6,
        CONS_SEL_PUBLIC: -7,
        CONS_SEL_ADD_FRIEND: -100,
        CONS_SEL_NEW_GROUP: -101,
        CONS_SEL_FIRST_NOTI: -102,
        CONS_SEL_SHADOW: -103,
        CONS_SEL_UNPURCHASE: -104,
        CONS_PREFIX_GROUP: "2:",
        CONS_PREFIX_BOTTLE: "3:",
        CONS_PREFIX_REPORT: "4:",
        CONS_PREFIX_RAND: "5:",
        CONS_PREFIX_FORBID: "6:",
        CONS_PREFIX_SMSG: "7:",
        CONS_PREFIX_CIRCLE: "8:",
        CONS_PREFIX_AUDIT: "a:",
        CONS_PREFIX_CIRALL: "b:",
        CONS_PREFIX_MATCH: "c:",
        CONS_SHARE_TYPE_INTRO: -1,
        CONS_FIRST_BOTTLE_MSGSCNT: "-1,-1",
        CONS_FIRST_BOTTLE_MSGSCNT2: "-2,-2",
        CONS_MSGSCNT_TERM: "-3,-3",
        CONS_SEQI_MSGS_UNREAD_FLAG: -9,
        CONS_FORBID_IF: -4,
        CONS_FORBID_NORP: -3,
        CONS_FORBID_FAKE: -2,
        CONS_FORBID_CIRCAL: -1,
        CONS_FORBID_AVATAR: 1,
        CONS_FORBID_NORMAL: 2,
        CONS_FORBID_NAME: 3,
        CONS_FORBID_DELAY: 4,
        CONS_FORBID_BLOCK: 5,
        CONS_FORBID_PICK: 6,
        CONS_FORBID_ALL: 7,
        CONS_FORBID_DEVICE: 8,
        CONS_FORBID_LATER: 9,
        CONS_FORBID_CHEAT: 10,
        CONS_FORBID_DISABLE: 11,
        CONS_FORBID_UNS: 12,
        CONS_FORBID_TEEN: 13,
        CONS_FORBID_DEL: 14,
        CONS_FORBID_AVATAR_NAME: 100,
        CONS_BOTTLE_RES_PREFIX: "s:",
        CONS_FRIEND_LOAD_LIMIT: 600,
        CONS_FRIEND_UNREPLIED: 1997,
        CONS_FRIEND_REPLIED: 1998,
        USERID_ALERT: "-1",
        USERID_TIP: "-2",
        USERID_RES: "-3",
        gvars: {
          db: _requireConfig.db,
          fs: _requireConfig.fs
        },
        platform: "ios" === _reactNative.Platform.OS ? 1 : 2,
        friendIdRecords: {},
        views: {},
        events: {},
        eventing: {},
        sendEvents: {},
        locks: {},
        lockCb: {},
        logLevel: 0,
        showShareAndMsgId: 0,
        locale: _requireConfig.locale,
        imageUriCache: {},
        imageUriCacheRecords: [],
        timeZoneOffset: 60 * -new Date().getTimezoneOffset() * 1e3,
        lucks: [],
        lucksLimit: 0,
        pushNotification: PushNotification,
        launchState: "",
        currentNavi: "friends",
        currentRoutes: {
          welcome: {
            name: "reg"
          },
          friends: {
            name: "friends",
            shareId: "",
            userid: null
          },
          mySpace: {
            name: "space",
            shareId: "",
            userid: null
          },
          aboutMe: {
            name: "aboutMe",
            shareId: "",
            userid: null
          }
        },
        defaultBals: [],
        msgerUrls: null,
        lastSyncFriendProfileTime: {},
        picsForBackgroundSetting: [],
        dataForBackgroundSetting: {
          i: 0
        },
        showBackgroundImage: 1,
        ws: null,
        shareId: 0,
        msgid: 0,
        timeDiff: 0,
        emos: _requireConfig.emos.emos,
        emosOrder: _requireConfig.emos.emosOrder,
        myEmos: [],
        isFetching: !1,
        spaceNaviCachedImages: {},
        interactNaviCachedImages: {},
        picBoardCachedImages: [],
        selectedImageUris: [],
        deselectImageCallbacks: {},
        friendsData: [],
        bottleFriendsData: [],
        sharesData: {},
        sharesLoadPos: {},
        msgsData: {},
        msgsLoadPos: {},
        spaceSync: {},
        noMoreRemoteShares: {},
        isFetchingRemoteShares: {},
        isFetchingUnread: !1,
        sendMsgCallbacks: {},
        sendBufCbs: [],
        sendingQueue: [],
        sendWaitingQueue: [],
        bufferedDirectSends: [],
        msgTimer: {},
        friendsUnread: {},
        friendsUnreadList: [],
        spaceUnread: {},
        spaceUnreadList: [],
        circleMsgUnreadList: [],
        circleShareUnreadList: [],
        bottleMsgUnreadList: [],
        bottleMsgUnreadBackup: [],
        bottleMsgUnreadMap: {
          cnt: 0
        },
        bottleResponseMap: {
          cnt: 0
        },
        bottleReplyUnreadList: [],
        bottleReplyUnreadListLimit: 500,
        myselfUnreadCnt: 0,
        contacts: {},
        localEmos: {},
        downloadingTaskCnt: 0,
        downloadTaskPool: [],
        tabSwitched: !1,
        lastChangeToBackgroundTime: 0,
        userid: 0,
        token: "",
        username: "",
        user: {},
        backgroundTypeIsUri: {},
        fetchLimit: 10,
        listBlockLimit: 500,
        prevMsgsCheckLimit: 5,
        badgeNum: 0,
        appState: "active",
        isConnecting: !1,
        isConnected: !1,
        isEmoShow: !1,
        isKeyboardShow: !1,
        myInputFocusMode: "keyboard",
        dbIsReady: !1,
        dbReadyCallbacks: [],
        imageIsMoving: {},
        lazyRefreshBuf: {},
        onMsgDelayed: [],
        sendDelayCbMap: {},
        netSeq: 0,
        cancelId: 0,
        fetchCancelMap: {},
        lastOptionTime: {},
        profiles: {},
        deviceSys: _requireConfig.reactDevInfo.getSystemName() + "-" + _requireConfig.reactDevInfo.getSystemVersion(),
        ddversion: _requireConfig.reactDevInfo.getDdVersion(),
        importantSync: !1,
        lastReportTime: 0,
        lastRandTime: 0,
        networkFailed: !1,
        tmpBackground: "",
        statusBarDiff: 0,
        lastCheckForHvdownTime: Date.now(),
        prevErrlog: [],
        msgsDataBufferKeys: [],
        sharesDataBufferKeys: [],
        fetchUnreadParamsBuf: [],
        syncPushTokenDone: !1,
        gifSideEmoGifData: null,
        webGifAutoCompleteResults: [],
        msgsDataDeleted: {},
        msgIsDeletedHandled: {},
        sharesDataDeleted: {},
        shareIsDeletedHandled: {},
        audioIsLoading: {},
        audioIsFailed: {},
        isHandlingUnreadCallbacks: [],
        rawOptionSelected: !1,
        serialTask: {},
        serialTaskPaused: {},
        serialTaskPool: {},
        serialPromise: {},
        serialPromisePool: {},
        isSendUriVideo: {},
        selectedVideoCount: 0,
        shareWaitForUploadCnt: {},
        heightDiff: 0,
        runningAudioId: "",
        unReadNewAudioQueue: {},
        unReadNewAudioMap: {},
        loadingVideoThumbIsRunning: {},
        renderedMsgsMap: {},
        renderedSharesMap: {},
        isNetworkConnected: !0,
        prevNetworkType: "",
        audioPlayTime: 0,
        audioPlayTimer: null,
        sessionFilesCache: {},
        sessionFetchLimit: 18,
        sessionFilesCacheEnded: {},
        sessionFileRenderedIndex: {},
        picBoardFetchLimit: 18,
        dataCenter: "do",
        anonymousDuration: 864e5,
        anonymousChecked: !1,
        friendNumber: 0,
        groupNumber: 0,
        permissions: {},
        friendsInContacts: [],
        unreadCounter: {
          counterList: [],
          counterMap: {}
        },
        unReadMissing: [],
        shareMsgsChanged: {},
        backgroundImageBlurMax: "ios" === _reactNative.Platform.OS ? 42 : 14,
        backgroundImageBlur: 0,
        defaultBackgroundImageBlur: "ios" === _reactNative.Platform.OS ? 18 : 6,
        mistupBlur: "ios" === _reactNative.Platform.OS ? 27 : 10,
        ftagMap: {},
        quickLaunch: !0,
        autoGifAnimation: !0,
        groupMemberLimit: 500,
        bufferedUnReadShareMsgs: {},
        fetchUnreadPromises: [],
        newMsgCounter: {},
        keepAliveTimer: null,
        lastLoginTime: {},
        randomItemIdx: {},
        multiLogins: [],
        multiLoginCnts: [],
        multiLoginCntsSum: 0,
        msgRepeatCheckList: [],
        msgRepeatCheckMap: {},
        webServiceGifData: [],
        webServiceGifPos: "",
        webServiceGifSearchKey: "",
        unReadMissingHasFetched: {},
        pickStartTime: 0,
        storyCnt: 0,
        storyPickCnt: 0,
        lastShareFriendIds: [],
        targetChangeShare: {},
        targetChangeShareCallback: {},
        shareMsgsSendMap: {},
        sharePostConfirmed: {},
        newShareIsSending: {},
        pickUriErrorTry: {},
        changeDispatchCallback: {},
        relationShips: {},
        newFollowers: {
          cnt: 0
        },
        ureadOk: [],
        handleUreadCallbacks: [],
        ureadRenderMap: {},
        syncTimes: {},
        clearTime: {},
        changeDataTargets: ["all", "rand"],
        isLongLongPic: {},
        videoPreloadList: {
          friends: [],
          mySpace: []
        },
        videoPreloadLazyMap: {},
        videoPreloadCache: [],
        loadSharesDataCallback: {},
        replyMembers: {},
        modelImageViewRef: {},
        newCreatedGroups: {},
        shouldShowFoldButton: {},
        postWithBottle: {},
        bottleThrown: {},
        pickStoryTimeIntv: 1e3,
        groupMembers: {},
        msgSendingMap: {},
        tmpSendingShareMap: {},
        tmpSendingMsgMap: {},
        showStoryCnt: 0,
        prevShareloadTime: {},
        signupInfo: {},
        boardType: "emoj",
        stares: [],
        followers: [],
        blockFriends: [],
        cachedFollowers: [],
        neverRemindMap: {},
        shouldShowReportNow: {},
        cheatTipMap: {},
        isStaring: {},
        verifyVurlsFinishedCbs: [],
        lastVerifyVurlsTime: 0,
        purchaseTrans: [],
        friendShipList: [],
        friendShipLast: {
          f: "",
          name: "",
          friendId: "",
          time: HIGHESTTIME
        },
        selectViewDis: {
          contactsBoard: 2e3,
          followers: 10
        },
        canStareMap: {},
        fdropMap: {},
        purchaseCnt: 0,
        fipMap: {},
        loadFriendShipsPromises: [],
        avatarFailedCnt: {},
        fetchFollowerTimes: {},
        firstInstallSteps: {},
        resourceNotExists: {},
        syncVar: {},
        lastSt: 0,
        fetchMenu: [["Gender", function () {
          apps.emit("closeContextMenu", function () {
            apps.diag({
              header: (0, _requireConfig.tr)("Tip"),
              content: (0, _requireConfig.tr)("Choose gender"),
              buttons: [{
                text: "No",
                onPress: function () {
                  apps.closeDiag(function () {
                    delete apps.fetchGender;
                  });
                }
              }, {
                text: "1",
                onPress: function () {
                  return apps.closeDiag(function () {
                    return apps.fetchGender = 1;
                  });
                }
              }, {
                text: "2",
                onPress: function () {
                  return apps.closeDiag(function () {
                    return apps.fetchGender = 2;
                  });
                }
              }, {
                text: "3",
                onPress: function () {
                  return apps.closeDiag(function () {
                    return apps.fetchGender = 3;
                  });
                }
              }]
            });
          });
        }], ["Equip", function () {
          apps.diag({
            header: (0, _requireConfig.tr)("Equip"),
            content: (0, _requireConfig.tr)("Enter equip"),
            textInputs: [{
              value: apps.bottlePeopleEquip || ""
            }],
            buttons: [{
              text: (0, _requireConfig.tr)("Cancel"),
              onPress: function () {
                delete apps.bottlePeopleEquip, apps.closeDiag();
              }
            }, {
              text: (0, _requireConfig.tr)("Ok"),
              onPress: function (e) {
                var r = e.state.textInputs[0].value;
                r ? (apps.bottlePeopleEquip = r, apps.curNavigator.navi.navForward(apps.newRoute(apps.curNavigator.routes, "space_", {
                  friendId: apps.CONS_PREFIX_AUDIT + apps.userid + r,
                  name: (0, _requireConfig.tr)("Space")
                }))) : delete apps.bottlePeopleEquip, apps.closeDiag();
              }
            }]
          });
        }], ["Region", function () {
          apps.diag({
            header: (0, _requireConfig.tr)("Region"),
            content: (0, _requireConfig.tr)("Enter region"),
            textInputs: [{
              value: apps.bottlePeopleRegion || ""
            }],
            buttons: [{
              text: (0, _requireConfig.tr)("Cancel"),
              onPress: function () {
                delete apps.bottlePeopleRegion, apps.closeDiag();
              }
            }, {
              text: (0, _requireConfig.tr)("Ok"),
              onPress: function (e) {
                var r = e.state.textInputs[0].value;
                r ? (apps.bottlePeopleRegion = r, apps.curNavigator.navi.navForward(apps.newRoute(apps.curNavigator.routes, "space_", {
                  friendId: apps.CONS_PREFIX_AUDIT + apps.userid + r,
                  name: (0, _requireConfig.tr)("Space")
                }))) : delete apps.bottlePeopleRegion, apps.closeDiag();
              }
            }]
          });
        }]]
      });
    },
    apps = {
      fnow: function () {
        var e = new Date();
        return e.getHours() + ":" + e.getMinutes() + ":" + e.getSeconds() + "+" + e.getMilliseconds();
      },
      convertChangeDataTargets: function (e) {
        var r = [];
        return e.forEach(function (e) {
          if ("all" === e) r.push({
            name: "All Friends",
            type: -1,
            friendId: "-1:"
          });else if ("rand" === e) r.push({
            name: "Non-friends",
            type: -3,
            friendId: "-3:"
          });else {
            var t = /^(\d+):/.exec(e);
            if (t) {
              var n = parseInt(t[1], 10);
              r.push({
                type: n,
                friendId: e
              });
            } else r.push({
              type: 1,
              friendId: e
            });
          }
        }), r;
      },
      filterRepeat: function (e, r) {
        for (var t = [], n = new Set(), i = e.length, s = 0; i > s; s++) {
          var a = e[s];
          if (a) {
            var o = a[r];
            o ? n.has(o) ? (a.isRepeated = !0, t.push(a)) : (n.add(o), t.push(a)) : t.push(a);
          } else var p = !0;
        }
        if (p) {
          var u = new Error();
          (0, _requireConfig.tlog)("error", "filterRepeat", e, u), apps.send("clientFatalLog", {
            msg: u.message,
            stack: u.stack
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "filterRepeat clientFatalLog", e);
          });
        }
        return t;
      },
      calcRawSize: function (e) {
        return 1048576 > e ? (e / 1024).toFixed(0) + " KB" : (e / 1024 / 1024).toFixed(2) + " MB";
      },
      lockForTimeLock: {},
      lockForTimeCallbacks: {},
      lockForTime: function (e, r) {
        var t = this;
        this.lockForTimeLock[e] = !0, this.lockForTimeCallbacks[e] = [], setTimeout(function () {
          delete t.lockForTimeLock[e];
          var r = t.lockForTimeCallbacks[e];
          delete t.lockForTimeCallbacks[e], r.forEach(function (e) {
            return e();
          });
        }, r);
      },
      lockForTimeRun: function (e, r) {
        this.lockForTimeLock[e] ? this.lockForTimeCallbacks[e].push(r) : r();
      },
      renderMoreTask: {},
      addRenderMoreTask: function (e, r) {
        this.renderMoreTask[e] ? this.renderMoreTask[e].push(r) : this.renderMoreTask[e] = [r], 1 === this.renderMoreTask[e].length && this.runRenderMoreTask(e);
      },
      runRenderMoreTask: function (e) {
        var r = this;
        (0, _requireConfig.tlog)("runRenderMoreTask start", e, apps.fnow());
        var t = this.renderMoreTask[e][0];
        t ? (t(), setTimeout(function () {
          (0, _requireConfig.tlog)("runRenderMoreTask restart", e, apps.fnow()), r.renderMoreTask[e].shift(), r.runRenderMoreTask(e);
        }, 500)) : (0, _requireConfig.tlog)("runRenderMoreTask finish", e, apps.fnow());
      },
      taskRunningCnt: {},
      taskWaitingPool: {},
      consumeTask: function (e) {
        this.taskWaitingPool[e].length > 0 ? this.taskWaitingPool[e].shift()() : this.taskRunningCnt[e] > 0 && (this.taskRunningCnt[e] -= 1);
      },
      prepareTask: function (e, r) {
        this.taskRunningCnt[e] || (this.taskRunningCnt[e] = 0, this.taskWaitingPool[e] = {}), this.taskRunningCnt[e] < 10 ? (this.taskRunningCnt[e] += 1, r()) : this.taskWaitingPool[e].push(r);
      },
      runSerialTask: function (e, r) {
        apps.serialTask[e] ? apps.serialTaskPool[e].push(r) : (apps.serialTaskPool[e] || (apps.serialTaskPool[e] = []), apps.serialTaskPaused[e] ? apps.serialTaskPool[e].push(r) : (apps.serialTask[e] = r, r().then(function () {
          delete apps.serialTask[e];
          var r = apps.serialTaskPool[e];
          r.length > 0 && apps.runSerialTask(e, r.shift());
        })));
      },
      pauseSerialTask: function (e) {
        apps.serialTaskPaused[e] = !0;
      },
      continueSerialTask: function (e) {
        delete apps.serialTaskPaused[e];
        var r = apps.serialTaskPool[e];
        r && r.length > 0 && apps.runSerialTask(e, r.shift());
      },
      runSerialPromise: function (e, r) {
        return new Promise(function (t, n) {
          var i = function () {
              delete apps.serialPromise[e];
              var r = apps.serialPromisePool[e];
              r.length > 0 ? r.shift()() : delete apps.serialPromisePool[e];
            },
            s = function () {
              apps.serialPromise[e] = r, apps.serialPromisePool[e] || (apps.serialPromisePool[e] = []), r().then(function (e) {
                i(), t(e);
              })["catch"](function (e) {
                i(), n(e);
              });
            };
          apps.serialPromise[e] ? apps.serialPromisePool[e].push(s) : s();
        });
      },
      autoGifAnimationToggle: function (e) {
        apps.autoGifAnimation = e, apps.emit("autoGifAnimation");
      },
      numCompress: function (e, r, t) {
        r || (r = 62), t || (t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
        for (var n = []; e > 0;) n.unshift(t[e % r]), e = Math.floor(e / r);
        return n.join("");
      },
      numDecompress: function (e, r, t) {
        r || (r = 62), t || (t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
        for (var n = 0, i = 0; i < e.length; i++) n += t.indexOf(e[i]) * Math.pow(r, e.length - 1 - i);
        return n;
      },
      getToday: function (e) {
        var r = function (e) {
            return {
              d: e.getDate(),
              m: e.getMonth() + 1,
              y: e.getFullYear(),
              h: e.getHours()
            };
          },
          t = r(new Date(e || apps.now())),
          n = t.d,
          i = t.m,
          s = t.y,
          a = (t.h, s + "-" + i + "-" + n);
        return a;
      },
      shouldLoadTraditionalMsgs: function (e, r) {
        return !r && !apps.isShareIdFromSelf(e);
      },
      isShareIdFromSelf: function (e) {
        var r = apps.splitShareId(e);
        return r.id1 ? !0 : r.shareFrom === apps.userid;
      },
      isShareIdTraditional: function (e) {
        return "1" === apps.splitShareId(e).stype;
      },
      makeFidTraditional: function (e) {
        return "*" + e;
      },
      isFidTraditional: function (e) {
        return "*" === e[0];
      },
      myuuidGen: function () {
        var e = [],
          r = Date.now().toString().split("");
        return r.forEach(function (r) {
          return e.push(String.fromCharCode(65 + Math.floor(26 * Math.random())), r);
        }), e.join("");
      },
      genNetSeq: function () {
        return ++apps.netSeq;
      },
      genCancelId: function () {
        return ++apps.cancelId;
      },
      initForBackgroundSetting: function () {
        apps.picsForBackgroundSetting = [], apps.dataForBackgroundSetting = {
          i: 0
        };
      },
      _getNewShareId: function (e) {
        var r = apps.numCompress(apps.now());
        return e ? apps.userid + ":1:" + r : apps.userid + ":" + r;
      },
      getNewShareId: function (e) {
        var r = apps.numCompress(apps.now());
        return e ? apps.userid + ":" + e + ":" + r : apps.userid + ":" + r;
      },
      loadNewMsgCounter: function (e, r) {
        return new Promise(function (t, n) {
          var i = e === r ? e : e + ":" + r;
          void 0 === apps.newMsgCounter[i] && _requireConfig.db.executeSql("SELECT * FROM NewMsgCounter WHERE session=?", [i]).then(function (e) {
            var r = e[0].rows.item(0);
            r && r.cnt ? apps.newMsgCounter[i] = r.cnt : apps.newMsgCounter[i] = 0, t();
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "loadNewMsgCounter", i, e), n(e);
          });
        });
      },
      getNewMsgId: function (e, r) {
        var t = apps.numCompress(apps.now() + 10);
        if (e) {
          var n = e === r ? e : e + ":" + r,
            i = apps.newMsgCounter[n];
          if (i) {
            var s = apps.numCompress(i);
            _requireConfig.db.executeSql("UPDATE NewMsgCounter SET cnt=cnt+1 WHERE session=?", [n])["catch"](function (e) {
              return (0, _requireConfig.tlog)("error", "1.getNewMsgId", n, e);
            });
          } else s = apps.numCompress(1), i = 1, _requireConfig.db.executeSql("INSERT INTO NewMsgCounter(session, cnt) VALUES(?, ?)", [n, 1])["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "2.getNewMsgId", n, e), delete apps.newMsgCounter[n], apps.loadNewMsgCounter(n);
          });
          return apps.newMsgCounter[n] = i + 1, apps.userid + ":" + t + ":" + s;
        }
        return apps.userid + ":" + t;
      },
      splitShareId: function (e) {
        var r = e.split(":");
        if (3 === r.length) {
          if (13 === r[2].length) var t = parseInt(r[2], 10);else t = apps.numDecompress(r[2]);
          return {
            shareFrom: r[0],
            stype: r[1],
            time: t
          };
        }
        return 1 === r.length ? {
          shareFrom: e
        } : 2 === r.length ? 13 === r[1].length ? {
          shareFrom: r[0],
          time: parseInt(r[1], 10)
        } : r[1].length < 10 ? {
          shareFrom: r[0],
          time: apps.numDecompress(r[1])
        } : {
          id1: r[0],
          id2: r[1],
          shareFrom: r[0],
          isSession: !0
        } : void 0;
      },
      getTimeFromMsgid: function (e) {
        var r = e.split(":");
        return apps.numDecompress(r[1]);
      },
      parseShareFrom: function (e) {
        var r = e.split(":");
        return {
          fromId: r[0],
          time: apps.numDecompress(r[r.length - 1])
        };
      },
      getLowRandomTime: function () {
        return apps.lowRandomTime -= 1, apps.lowRandomTime < 5e11 && (apps.lowRandomTime = 1e12), _requireConfig.dbs.setUserProfile({
          lowRandomTime: apps.lowRandomTime
        }), apps.lowRandomTime;
      },
      getHighRandomTime: function () {
        return apps.highRandomTime || ((0, _requireConfig.terr)("getHighRandomTime", apps.highRandomTime), apps.highRandomTime = 8e12 + Math.floor(1e12 * Math.random())), apps.highRandomTime < 8e12 && ((0, _requireConfig.terr)("getHighRandomTime", apps.highRandomTime), apps.highRandomTime = 8e12), apps.highRandomTime += 1, apps.highRandomTime > 9e12 && (apps.highRandomTime = 8e12), _requireConfig.dbs.setUserProfile({
          highRandomTime: apps.highRandomTime
        }), apps.highRandomTime;
      },
      setImageUriCache: function (e, r) {
        apps.imageUriCache[e] = r, apps.imageUriCacheRecords.push(e), apps.imageUriCacheRecords.length > 300 && (e = apps.imageUriCacheRecords.shift(), delete apps.imageUriCache[e]);
      },
      getImageUriCache: function (e, r) {
        return r ? r + apps.imageUriCache[e] : apps.imageUriCache[e];
      },
      changeListData: function (e, r, t) {
        e = [].concat(babelHelpers.toConsumableArray(e));
        var n = e.findIndex(r),
          i = babelHelpers["extends"]({}, e[n]);
        return t(i), e.splice(n, 1, i), e;
      },
      changeAllListData: function (e, r, t) {
        var n = [];
        return e.forEach(function (e) {
          if (e) {
            var i = babelHelpers["extends"]({}, e);
            r && r(e) && t(i), n.push(i);
          }
        }), n;
      },
      now: function () {
        return Date.now() + apps.timeDiff;
      },
      logCnt: function (e, r) {
        for (var t = 0; t < apps.prevErrlog.length; t++) if (apps.prevErrlog[t][0] === e && Date.now() - apps.prevErrlog[t][1] < 6e4) return;
        apps.prevErrlog.push([e, Date.now()]), apps.prevErrlog.length >= 10 && apps.prevErrlog.shift(), r();
      },
      setDefaults: function (e, r) {
        for (var t in e) void 0 === e[t] && (e[t] = r[t]);
      },
      isEmpty: function (e) {
        for (var r in e) if (e.hasOwnProperty(r)) return !1;
        return !0;
      },
      isIn: function (e) {
        for (var r = arguments.length, t = Array(r > 1 ? r - 1 : 0), n = 1; r > n; n++) t[n - 1] = arguments[n];
        return -1 !== t.indexOf(e);
      },
      notIn: function (e) {
        for (var r = arguments.length, t = Array(r > 1 ? r - 1 : 0), n = 1; r > n; n++) t[n - 1] = arguments[n];
        return -1 === t.indexOf(e);
      },
      idPrefix: function (e) {
        return (e.match(/^\w+?:/) || [""])[0];
      },
      osv: function (e, r) {
        return "ios" === _reactNative.Platform.OS ? e : r;
      },
      send: function (e, r, t) {
        return new Promise(function (n, i) {
          r || (r = {});
          var s = apps.genNetSeq();
          r.seq = s;
          var a = e + "_" + s,
            o = apps.ws && apps.ws._mysecret__id || -1,
            p = r.sendTimeoutIntv;
          delete r.sendTimeoutIntv;
          var u = JSON.stringify(babelHelpers["extends"]({}, r, {
            proto: e + "Req"
          }));
          if (r.sendTimeoutIntv = (p || 0) + 1e4 + u.length, !apps.ws) return void apps.sendWaitingQueue.push([a, function () {
            return apps.send(e, r, t).then(n, i);
          }]);
          apps.sendingQueue.push([a, function () {
            return apps.send(e, r, t).then(n, i);
          }]);
          var d = function () {
            var t = apps.noSendTimeout ? null : setTimeout(function () {
              wslog && (0, _requireConfig.tlog)("ws=" + o, "send timeout", e, r, apps.sendTimeoutReconnecting);
              var t = apps.sendingQueue.findIndex(function (e) {
                return e[0] === a;
              });
              -1 !== t && apps.sendWaitingQueue.push(apps.sendingQueue.splice(t, 1)[0]), 0 === apps.sendingQueue.length && (apps.ws = null, apps.sendTimeoutReconnecting = !0, _requireConfig.wsc.connectToServer("sendTimeout"));
            }, r.sendTimeoutIntv);
            apps.onSendEvent(e + "Res_" + s, o, t, e, r, function (e) {
              var r = apps.sendingQueue.findIndex(function (e) {
                return e[0] === a;
              });
              -1 !== r && apps.sendingQueue.splice(r, 1);
              var t = !0;
              if (0 === apps.sendingQueue.length && (apps.shouldFetchUnreadReconnect ? (delete apps.shouldFetchUnreadReconnect, delete apps.autoChangeMsgerCb, apps.fetchUnreadReconnecting = !0, apps.isConnecting = !1, t = !1, _requireConfig.wsc.connectToServer("fetchUnreadReconnect")) : apps.autoChangeMsgerCb && (t = !1, apps.autoChangeMsgerCb(), delete apps.autoChangeMsgerCb)), t) {
                var s = apps.sendWaitingQueue.shift();
                s && s[1]();
              }
              e.err ? i(1 === e.err ? "serverErr" : e.err) : n(e);
            }), apps.ws.send(u), apps.lastSt = Date.now();
          };
          d();
        });
      },
      sendWaitings: function () {
        if (0 === apps.sendingQueue.length) {
          var e = apps.sendWaitingQueue.shift();
          e && e[1]();
        }
      },
      resetSendingQueue: function () {
        apps.sendWaitingQueue = apps.sendWaitingQueue.concat(apps.sendingQueue), apps.sendingQueue = [], apps.clearAllSendEvent();
      },
      sendBufferedDirectSend: function () {
        apps.bufferedDirectSends.forEach(function (e) {
          return e();
        }), apps.bufferedDirectSends = [];
      },
      onSendEvent: function (e, r, t, n, i, s) {
        this.sendEvents[e] = {
          id: r,
          timer: t,
          proto: n,
          data: i,
          callback: s
        };
      },
      emitSendEvent: function (e) {
        var r = this.sendEvents[e];
        if (r) {
          delete this.sendEvents[e], clearTimeout(r.timer);
          for (var t = arguments.length, n = Array(t > 1 ? t - 1 : 0), i = 1; t > i; i++) n[i - 1] = arguments[i];
          r.callback.apply(r, babelHelpers.toConsumableArray(n));
        } else (0, _requireConfig.tlog)("ws=null", "emitSendEvent not exist", e, apps.fnow());
      },
      clearAllSendEvent: function (e) {
        for (var r in this.sendEvents) {
          var t = this.sendEvents[r];
          (0, _requireConfig.tlog)("clear send event", r, t.id), clearTimeout(t.timer), delete this.sendEvents[r];
        }
      },
      delayPromise: function (e) {
        return new Promise(function (r, t) {
          setTimeout(function () {
            r();
          }, e);
        });
      },
      has: function (e, r) {
        return r ? !(!this.events[e] || !this.events[e].has(r)) : !!this.events[e];
      },
      onOnce: function (e, r) {
        this.events[e] && this.events[e].has(r) || (this.events[e] ? this.events[e].add(r) : this.events[e] = new Set([r]));
      },
      changeOn: function (e, r) {
        var t = this.events[e];
        this.events[r] ? this.events[r].add(t) : this.events[r] = new Set([t]), this.events[e]["delete"](t);
      },
      on: function (e, r) {
        this.events[e] ? this.events[e].add(r) : this.events[e] = new Set([r]);
      },
      unon: function (e, r) {
        r ? this.events[e] && (this.events[e]["delete"](r), 0 === this.events[e].size && delete this.events[e]) : delete this.events[e];
      },
      isEventing: function (e) {
        return apps.eventing[e];
      },
      eventEnd: function (e) {
        delete apps.eventing[e];
      },
      eventErr: function (e) {
        apps.eventing[e] = 0;
      },
      notEventErr: function (e) {
        return 0 !== apps.eventing[e];
      },
      startEvent: function (e) {
        apps.eventing[e] = 1;
      },
      emitOnce: function (e) {
        for (var r = arguments.length, t = Array(r > 1 ? r - 1 : 0), n = 1; r > n; n++) t[n - 1] = arguments[n];
        try {
          this.events[e] && (this.events[e].forEach(function (e) {
            e.apply(void 0, babelHelpers.toConsumableArray(t));
          }), delete this.events[e]);
        } catch (i) {
          delete this.events[e], (0, _requireConfig.tlog)("error", "event", e, i);
        }
      },
      emit: function (e) {
        for (var r = arguments.length, t = Array(r > 1 ? r - 1 : 0), n = 1; r > n; n++) t[n - 1] = arguments[n];
        try {
          this.events[e] && this.events[e].forEach(function (e, r) {
            e.apply(void 0, babelHelpers.toConsumableArray(t));
          });
        } catch (i) {
          (0, _requireConfig.tlog)("error", "event", e, i);
        }
      },
      lock: function (e) {
        return this.locks[e] ? !1 : (this.locks[e] = !0, !0);
      },
      isLocking: function (e) {
        return this.locks[e];
      },
      addLockCb: function (e, r) {
        this.lockCb[e] ? this.lockCb[e].push(r) : this.lockCb[e] = [r];
      },
      unlock: function (e) {
        if (delete this.locks[e], this.lockCb[e]) {
          var r = this.lockCb[e].slice();
          delete this.lockCb[e], r.forEach(function (e) {
            return e();
          });
        }
      },
      delayAsync: function (e) {
        return new Promise(function (r) {
          setTimeout(function () {
            r();
          }, e);
        });
      },
      genRowID: function (e) {
        for (var r = [], t = 0; e > t; t++) r.push(t.toString());
        return r;
      },
      getImageSize: function (e, r, t) {
        var n = Math.round(.69 * (_requireConfig.theme.winWidth - 20)),
          i = Math.round(1.2 * _requireConfig.theme.winHeight);
        r > i && (e = e * i / r, r = i), e > n && (r = r * n / e, e = n);
        var s = _requireConfig.theme.winHeight * _requireConfig.theme.winWidth / 50,
          a = e * r;
        a > s && (e *= Math.sqrt(s / a), r *= Math.sqrt(s / a));
        var o = e / r;
        return t && (r = _requireConfig.theme.squaredImageSize * r / e, e = _requireConfig.theme.squaredImageSize, .4 > o ? r = .6 * e : o >= .4 && .6 > o && (r = e / .6)), {
          width: e,
          height: r,
          ratio: o
        };
      },
      _old_handleAllDelayed: function () {
        for (var e in apps.sendDelayCbMap) apps.sendDelayCbMap[e]();
      },
      startKeepAlive: function () {
        if (!apps.keepAliveTimer) {
          var e = apps.msgerUrls.hs,
            r = function () {
              if ("active" === apps.appState) {
                var r = Math.floor(Math.random() * e.length),
                  t = e[r][0],
                  n = "https://" + t + "/test";
                (0, _requireConfig.tlog)("keepAlive", n, apps.fnow()), apps.fetch(n, {}, 6e4, !0).then(function (e) {
                  (0, _requireConfig.tlog)("keepAlive response", e.status, apps.fnow());
                })["catch"](function (e) {
                  (0, _requireConfig.tlog)("error", "keepAlive", t, apps.fnow(), e);
                });
              }
            };
          apps.keepAliveTimer = setInterval(function () {
            r();
          }, 5e4), r();
        }
      },
      post: function (e, r, t, n) {
        return apps.request(e, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: "string" == typeof r ? r : JSON.stringify(r)
        }, t, n).then(function (e) {
          return 200 === e.status ? e.json() : Promise.reject("status=" + e.status);
        });
      },
      request: function (e, r, t, n) {
        return new Promise(function (n, i) {
          var s,
            a = -1,
            o = 0,
            p = function u() {
              return o > apps.hurls.length ? void (0, _requireConfig.tlog)("error", "requestCnt exceed", apps.hurls.length) : (o += 1, void _requireConfig.wsc.getMsgerUrl(a, "hurls").then(function (o) {
                var p = "https://" + o.url + e;
                (0, _requireConfig.tlog)("apps.fetch " + p, apps.fnow());
                var d = t || 2e4;
                return apps.fetch(p, r, d, !0).then(function (e) {
                  (0, _requireConfig.tlog)("apps.fetch " + p + " Ok-!!!", apps.fnow()), n(e);
                }, function (e) {
                  (0, _requireConfig.tlog)("error", "apps.fetch(" + p + ")-" + apps.fnow(), e), o.ridx !== s ? (a = o.ridx, void 0 === s && (s = o.ridx), u()) : i(e);
                });
              })["catch"](function (n) {
                (0, _requireConfig.tlog)("error", "apps.request", e, r, t, n), i(n);
              }));
            };
          p();
        });
      },
      fetchWithTimoutRetry: function (e, r, t) {
        return new Promise(function (n, i) {
          var s = 5e4,
            a = function o() {
              return apps.fetch(e, r, s, t).then(function (r) {
                r && 200 !== r.status ? ((0, _requireConfig.tlog)("error", "fetchWithTimoutRetry", e, r.status), 12e4 >= s ? (s *= 2, o()) : i("fetch status=" + r.status)) : n(r);
              })["catch"](function (r) {
                (0, _requireConfig.tlog)("error", "fetchWithTimoutRetry", e, r), 12e4 >= s ? (s *= 2, o()) : i(r);
              });
            };
          a();
        });
      },
      fetch: function (e) {
        function r(r, t, n, i) {
          return e.apply(this, arguments);
        }
        return r.toString = function () {
          return e.toString();
        }, r;
      }(function (e, r, t, n) {
        var i = apps.genCancelId();
        return apps.fetchCancelMap[i] = !0, fetch(e, r, t, n).then(function (e) {
          return apps.fetchCancelMap[i] ? (delete apps.fetchCancelMap[i], e) : Promise.reject("fetch canceled");
        });
      }),
      wsClose: function () {
        apps.ws && apps.ws._mysecret__close();
      },
      lazyRefresh: function (e) {
        for (var r = arguments.length, t = Array(r > 1 ? r - 1 : 0), n = 1; r > n; n++) t[n - 1] = arguments[n];
        apps.lazyRefreshBuf[e] = t;
      },
      lazyRefreshRun: function () {
        for (var e in apps.lazyRefreshBuf) apps.emit.apply(apps, [e].concat(babelHelpers.toConsumableArray(apps.lazyRefreshBuf[e])));
        apps.lazyRefreshBuf = {};
      },
      closeInputPanel: function (e) {
        apps.isKeyboardShow && ((0, _requireConfig.dismissKeyboard)(), apps.isKeyboardShow = !1), apps.myInputViewComponent && apps.myInputViewComponent.blur(), apps.emit("toggleEmo", !1, !e);
      },
      clearInputPanel: function (e) {
        try {
          apps.deselectAllPictures(), apps.myInputViewRef.refs.inputView.clearInput(!0, e);
        } catch (r) {}
      },
      deselectAllPictures: function () {
        apps.selectedImageUris = [];
        for (var e in apps.deselectImageCallbacks) apps.deselectImageCallbacks.hasOwnProperty(e) && apps.deselectImageCallbacks[e]();
        apps.deselectImageCallbacks = {};
      },
      showStopPictureSendingDialog: function () {},
      isSpecialUserid: function (e) {
        return !!/^\d+:/.test(e);
      },
      tipBackgroundColor: function (e) {
        return apps.darkTheme ? "rgba(0,0,0,0.1)" : e ? "rgba(0,0,0,0.0)" : "rgba(0,0,0,0.06)";
      },
      tipFontColor: function (e) {
        return apps.darkTheme ? _requireConfig.theme.white : e ? "#aaa" : _requireConfig.theme.white;
      },
      newRouteId: 0,
      newRoute: function (e, r, t) {
        apps.newRouteId += 1;
        var n = r + apps.newRouteId,
          i = babelHelpers["extends"]({
            id: n,
            autoDelete: 1
          }, t);
        return e[n] = i, i;
      },
      deleteRoute: function (e, r) {
        r.autoDelete && delete e[r.id];
      }
    };
  appsInit(), apps.on("eval", function (cmd) {
    try {
      (0, _requireConfig.tlog)(eval(cmd));
    } catch (e) {}
  }), apps.testDbTransaction = function (e) {
    return _requireConfig.db.transaction(function (r) {
      var t = 1;
      for (r.executeSql('DELETE FROM UserProfile WHERE k="testDbTransaction"'), r.executeSql('INSERT INTO UserProfile(k, v) VALUES("testDbTransaction", ?)', [t]); e > t;) r.executeSql('UPDATE UserProfile SET v=? WHERE k="testDbTransaction" AND v=?', [t + 1, t]), t += 1;
    }).then(function () {
      return _requireConfig.db.executeSql('SELECT * FROM UserProfile WHERE k="testDbTransaction"').then(function (e) {
        var r = e[0].rows;
        return (0, _requireConfig.logFormat)("testDbTransaction finished ", r.item(0));
      });
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "testDbTransaction", e);
    });
  }, apps.isAnonymousEnabled = function () {
    return !0;
  }, apps.sql = function (e) {
    return _requireConfig.db.executeSql(e).then(function (e) {
      for (var r = e[0].rows, t = [], n = 0; n < r.length; n++) t.push((0, _requireConfig.inspect)(r.item(n), {
        depth: 0
      }));
      var i = "sql>>\n" + t.join("\n") + "\n<<sql";
      return (0, _requireConfig.tlog)(i), i;
    });
  }, apps.loghist = function () {
    var e,
      r = (0, _requireConfig.getCmdViewBuf)();
    return r = (e = r).slice.apply(e, arguments), r.reverse().join("\n");
  }, apps.switchDevMode = function () {
    apps.bals = apps.defaultBals, apps.msgerUrls = null;
  }, apps.clearDev = function () {
    apps.delSharedParas("isDev").then(function () {
      return apps.reloadHvdown();
    })["catch"](function (e) {
      return (0, _requireConfig.tlog)("error", "clearDev", e);
    });
  }, apps.trydev = function () {
    apps.isDev || apps.setSharedParas({
      isDev: 1
    }).then(function () {
      return apps.reloadHvdown();
    })["catch"](function (e) {
      return (0, _requireConfig.tlog)("error", "trydev", e);
    });
  }, apps.resetHvdown = function () {
    return apps.setSharedParas({
      noHvdown: 1
    }).then(function () {
      return _requireConfig.fs.resetHvdown();
    })["catch"]((0, _requireConfig.errCb)("resetHvdown"));
  }, apps.reloadHvdownDebug = function () {
    return _requireConfig.fs.reloadHvdownDebug()["catch"]((0, _requireConfig.errCb)("reloadHvdownDebug"));
  }, apps.reloadHvdown = function () {
    return apps.isReloadingHvdown ? void 0 : (apps.isReloadingHvdown = !0, _requireConfig.fs.reloadHvdown()["catch"]((0, _requireConfig.errCb)("reloadHvdown")));
  }, apps.setHvdown = function () {
    return apps.delSharedParas("noHvdown").then(function () {
      apps.checkForHvdown(1);
    })["catch"]((0, _requireConfig.errCb)("setHvdown"));
  }, apps.checkForHvdown = function (e) {
    if (!__recoveryFreePolicy.allowRemoteHotUpdates) return Promise.resolve({
      updatesDisabledForMaintenance: true
    });
    if (!apps.verifyVurlsFinished) return void apps.verifyVurlsFinishedCbs.push(function () {
      return apps.checkForHvdown();
    });
    var r = Date.now();
    if (!apps.checkingForHvdown) {
      apps.lastCheckForHvdownTime = r, apps.checkingForHvdown = !0;
      var t = function () {
        var r = _requireConfig.fs.DocumentDirectoryPath + "/dbundle";
        Promise.resolve(apps.noHvdown).then(function (e) {
          return e ? Promise.reject("break") : _requireConfig.fs.curHvdownVersion();
        }).then(function (t) {
          return (0, _requireConfig.tlog)("checkForHvdown Current HVersion", t), _requireConfig.fs.exists(r).then(function (e) {
            return e ? void 0 : _requireConfig.fs.mkdir(r, !0);
          }).then(function () {
            return apps.post("/api/check_for_hvdown", {
              version: t,
              userid: apps.userid,
              force: e,
              downFrom: apps.downFrom
            });
          });
        }).then(function (e) {
          if (e.ver) {
            (0, _requireConfig.tlog)("should update version: " + e.ver), apps.popProg((0, _requireConfig.tr)("Update"));
            var t = r + "/tmpdown.zip",
              n = -1,
              i = function () {
                var i = _requireConfig.wsc.getRandUrl(n, "durls");
                return _requireConfig.fs.greetings(JSON.stringify({
                  d: apps.deviceId,
                  t: apps.now()
                })).then(function (r) {
                  return n = i.ridx, (0, _requireConfig.tlog)("updateVer download", i.url), _requireConfig.fs.downloadFile({
                    fromUrl: "https://" + i.url + "/emo/hvdown/" + ("ios" === _reactNative.Platform.OS ? "ios." : "android.") + e.ver + ".zip?token=" + encodeURIComponent(r),
                    toFile: t,
                    timeout: 3e5,
                    pinCert: !0,
                    progress: function (e) {
                      e.contentLength, e.bytesWritten;
                    }
                  });
                }).then(function (e) {
                  if ((0, _requireConfig.tlog)("response", e), !e || 200 === e.statusCode && 0 !== e.bytesWritten) {
                    var n = require(561).unzip;
                    return n(t, r);
                  }
                  return Promise.reject("checkForHvdown downloadError status=" + e.statusCode);
                }).then(function () {
                  return _requireConfig.fs.exists(r + "/__hvdown__").then(function (e) {
                    return e ? _requireConfig.fs.moveFile(r + "/__hvdown__", r + "/__hvdown_old__") : void 0;
                  });
                }).then(function () {
                  return "ios" === _reactNative.Platform.OS ? _requireConfig.fs.moveFile(r + "/index.ios.bundle", r + "/__hvdown__") : _requireConfig.fs.moveFile(r + "/index.android.bundle", r + "/__hvdown__");
                }).then(function () {
                  return _requireConfig.fs.setHvdownMark(e.ver);
                }).then(function () {
                  delete apps.checkingForHvdown;
                  var e = 500;
                  3e3 > e ? setTimeout(function () {
                    apps.popTip((0, _requireConfig.tr)("Update finished!"), function () {
                      return apps.reloadHvdown(), !0;
                    });
                  }, 3e3 - e) : apps.popTip((0, _requireConfig.tr)("Update finished!"), function () {
                    return apps.reloadHvdown(), !0;
                  });
                })["catch"](function (e) {
                  (0, _requireConfig.tlog)("error", "download hvdown", e), apps.popClose(), delete apps.checkingForHvdown;
                });
              };
            return i();
          }
          e.reinstall && !apps.reinstallHasPopped ? (apps.reinstallHasPopped = !0, apps.diag({
            header: (0, _requireConfig.tr)("Update"),
            content: e.updateInfo || (0, _requireConfig.tr)("New Update on App Store"),
            buttons: [{
              text: (0, _requireConfig.tr)("Later"),
              onPress: function (e) {
                return apps.closeDiag(function () {
                  delete apps.checkingForHvdown;
                });
              }
            }, {
              text: (0, _requireConfig.tr)("Ok"),
              onPress: function (r) {
                apps.closeDiag(function () {
                  delete apps.checkingForHvdown, _reactNative.Linking.openURL(e.updateUrl);
                });
              }
            }]
          })) : ((0, _requireConfig.tlog)("no new hvdown"), delete apps.checkingForHvdown);
        })["catch"](function (e) {
          delete apps.checkingForHvdown, "break" !== e && ((0, _requireConfig.tlog)("error", "checkForHvdown", e), setTimeout(function () {
            return apps.checkForHvdown();
          }, 1e3));
        });
      };
      return apps.noHvdownTemp ? void delete apps.checkingForHvdown : void t();
    }
  }, apps.buttonTip = function (e) {
    return _react2["default"].createElement(_reactNative.View, {
      style: {
        flexDirection: "column",
        alignItems: "center",
        paddingHorizontal: _requireConfig.theme.winWidth / 7,
        paddingTop: 1,
        paddingBottom: 8
      }
    }, _react2["default"].createElement(_reactNative.TouchableOpacity, {
      style: {
        backgroundColor: e.bgColor || apps.tipBackgroundColor(e.isEmpty),
        paddingHorizontal: 5,
        borderRadius: 5
      },
      onPress: function () {
        return e.onPress && e.onPress();
      }
    }, _react2["default"].createElement(_requireConfig.MyTextView, {
      myTextValue: e.text,
      imageFontSize: e.fontSize || 14,
      adjustsFontSizeToFit: !0,
      style: {
        fontSize: e.fontSize || 14,
        color: e.fontColor || apps.tipFontColor(e.isEmpty),
        paddingTop: 1,
        paddingBottom: 1,
        textAlign: "center"
      }
    })), e.bottomHeight ? _react2["default"].createElement(_reactNative.View, {
      style: {
        height: e.bottomHeight
      }
    }) : null);
  }, apps.viewTip = function (e) {
    return _react2["default"].createElement(_reactNative.TouchableOpacity, {
      style: {
        flexDirection: "column",
        alignItems: "center",
        paddingHorizontal: _requireConfig.theme.winWidth / 7,
        paddingTop: void 0 !== e.topHeight ? e.topHeight : 1,
        paddingBottom: void 0 !== e.bottomHeight ? e.bottomHeight : 8
      },
      noOpacictyActive: !0,
      onPress: function () {
        apps.emit("toggleEmo", !1), (0, _requireConfig.dismissKeyboard)();
      }
    }, _react2["default"].createElement(_reactNative.View, {
      style: {
        backgroundColor: e.bgColor || apps.tipBackgroundColor(e.isEmpty),
        paddingHorizontal: 5,
        paddingVertical: 5,
        borderRadius: 5
      }
    }, _react2["default"].createElement(_requireConfig.MyTextView, {
      myTextValue: e.text,
      imageFontSize: e.fontSize || 14,
      adjustsFontSizeToFit: !0,
      style: [{
        fontSize: e.fontSize || 14,
        color: e.fontColor || apps.tipFontColor(e.isEmpty),
        paddingTop: 1,
        paddingBottom: 1,
        textAlign: "center"
      }, "ios" === _reactNative.Platform.OS ? {
        lineHeight: 16
      } : {}]
    }), e.btn ? _react2["default"].createElement(_reactNative.View, {
      style: {
        flexDirection: "row",
        marginTop: 3,
        width: _requireConfig.theme.winWidth / 7 * 5,
        justifyContent: "center",
        alignItems: "center"
      }
    }, e.btn.map(function (e) {
      return _react2["default"].createElement(_reactNative.TouchableOpacity, {
        onPress: function () {
          return e.onPress(e);
        },
        style: {
          backgroundColor: e.color,
          width: 50,
          height: 20,
          borderRadius: 10,
          justifyContent: "center",
          alignItems: "center",
          marginHorizontal: 20
        }
      }, _react2["default"].createElement(_reactNative.Text, {
        style: {
          fontSize: 15,
          color: e.textColor || _requireConfig.theme.lightb
        }
      }, e.text));
    })) : null));
  }, apps.fatalTip = function () {
    apps.showCmdBall && apps.diag({
      header: (0, _requireConfig.tr)("Fatal Problem"),
      content: (0, _requireConfig.tr)("The program has encountered a fatal problem"),
      buttons: [{
        text: "Ok",
        onPress: function (e) {
          return apps.closeDiag();
        }
      }]
    });
  }, apps.popTip = function (e, r, t) {
    apps.emit("showPickingView", "tip", e, r, t);
  }, apps.popProg = function (e, r, t) {
    apps.emit("showPickingView", "prog", e, r, t);
  }, apps.popSpin = function (e, r, t) {
    apps.emit("showPickingView", "spin", e, r, t);
  }, apps.popClose = function (e) {
    apps.emit("closePickingView", e);
  }, apps.reTryDiag = function (e) {
    apps.diag({
      header: (0, _requireConfig.tr)("Tip"),
      content: (0, _requireConfig.tr)("Request failed. Check your network and try again."),
      buttons: [{
        text: (0, _requireConfig.tr)("Cancel"),
        onPress: function () {
          return apps.closeDiag();
        }
      }, {
        text: (0, _requireConfig.tr)("Retry"),
        onPress: function () {
          return apps.closeDiag(function () {
            return e();
          });
        }
      }]
    });
  }, apps.tipCb = function (e, r) {
    apps.diag({
      header: (0, _requireConfig.tr)("Tip"),
      content: e,
      buttons: [{
        text: (0, _requireConfig.tr)("Ok"),
        onPress: function () {
          return apps.closeDiag(function () {
            return r();
          });
        }
      }]
    });
  }, apps.tip = function (e, r, t, n) {
    r ? apps.emit("showTipView", e, t, n) : apps.diag({
      header: (0, _requireConfig.tr)("Tip"),
      content: e,
      buttons: [{
        text: (0, _requireConfig.tr)("Ok"),
        onPress: function (e) {
          return apps.closeDiag();
        }
      }]
    });
  }, apps.tipc = function (e, r) {
    apps.diag({
      header: (0, _requireConfig.tr)("Tip"),
      content: e,
      buttons: [{
        text: (0, _requireConfig.tr)("Ok"),
        onPress: function (e) {
          return apps.closeDiag(r);
        }
      }]
    });
  }, apps.helpEmailTip = function () {
    apps.diag({
      header: (0, _requireConfig.tr)("Help"),
      content: (0, _requireConfig.tr)("If you have any further questions or suggestions, send us the email: help@whou.co"),
      buttons: [{
        text: (0, _requireConfig.tr)("Cancel"),
        onPress: function () {
          return apps.closeDiag();
        }
      }, {
        text: (0, _requireConfig.tr)("Send Now"),
        onPress: function () {
          return apps.closeDiag(function () {
            (0, _requireConfig.email)(["help@whou.co"], [], [], "", "");
          });
        }
      }]
    });
  }, apps.spinner = function (e) {
    return "android" === _reactNative.Platform.OS ? (e = "small" === e ? 29 : 40, _react2["default"].createElement(_reactNative.View, {
      style: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
      }
    }, _react2["default"].createElement(_reactNative.ProgressBarAndroid, {
      style: {
        width: e,
        height: e
      },
      styleAttr: "Inverse"
    }))) : _react2["default"].createElement(_reactNative.ActivityIndicatorIOS, {
      animating: !0,
      size: e,
      color: _requireConfig.theme.white
    });
  }, apps.filterLucks = function () {
    var e = function (e) {
        return {
          d: e.getDate(),
          m: e.getMonth() + 1,
          y: e.getFullYear(),
          h: e.getHours()
        };
      },
      r = e(new Date(apps.now())),
      t = r.d,
      n = r.m,
      i = r.y;
    return apps.lucks = apps.lucks.filter(function (r) {
      var s = e(new Date(r)),
        a = s.d,
        o = s.m,
        p = s.y;
      return t === a && n === o && i === p;
    }), apps.lucks;
  }, apps.diag = function (e) {
    apps.has("modelView") ? apps.emit("closeContextMenu", function () {
      return apps.popClose(function () {
        return apps.closeDiag(function () {
          return apps.emit("modelView", e);
        });
      });
    }) : apps.modelViewDelayParas = e;
  }, apps.closeDiag = function (e) {
    return apps.emit("triggerModelViewClose", e);
  }, apps.closeAllModelView = function (e) {
    void 0 !== apps.curMseq && apps.emit("closeModelImage" + apps.curMseq);
  }, apps.findAvailablePreVid = function (e, r) {
    for (var t = 0; t < apps.videoPreloadCache.length; t++) {
      var n = apps.videoPreloadCache[t];
      if (n.k === e) return {
        mseq: n.mseq,
        isnew: !1
      };
    }
    if (4 === apps.videoPreloadCache.length) {
      var i = apps.videoPreloadCache[0],
        s = 0;
      for (t = 1; t < apps.videoPreloadCache.length; t++) n = apps.videoPreloadCache[t], n.time < i.time && (i = n, s = t);
      var a = i.mseq;
      return apps.videoPreloadCache.splice(s, 1), apps.videoPreloadCache.push({
        mseq: a,
        data: r,
        k: r.imgId || r.uri,
        time: Date.now()
      }), {
        mseq: a,
        isnew: !0
      };
    }
    var o = [1, 2, 3, 4];
    return apps.videoPreloadCache.forEach(function (e) {
      var r = o.findIndex(function (r) {
        return e.mseq === r;
      });
      o.splice(r, 1);
    }), a = o.pop(), apps.videoPreloadCache.push({
      mseq: a,
      data: r,
      k: r.imgId || r.uri,
      time: Date.now()
    }), {
      mseq: a,
      isnew: !0
    };
  }, apps.findLastIndex = function (e, r) {
    for (var t = e.length - 1; t >= 0; t--) {
      var n = e[t];
      if (r(n)) return t;
    }
    return -1;
  }, apps.showNextCachedImage = function (e) {
    var r = e.imgId,
      t = (e.ratio, e.uri),
      n = e.isPhoto,
      i = (e.isVideo, e.curProps);
    apps.currentRoutes[apps.currentNavi];
    if (i.picboard) {
      if (1 !== i.picboard) return void apps.closeAllModelView();
      var s = apps.picBoardCachedImages;
      apps.lastPicBoardIdx || (apps.lastPicBoardIdx = s.findIndex(function (e) {
        return t && e.uri === t || r && (e.imgId === r || e.rawImgId === r);
      })), apps.lastPicBoardIdx += 1, s.length - apps.lastPicBoardIdx < apps.picBoardFetchLimit && apps.emit("picBoardFetchMore"), apps.lastPicBoardIdx >= s.length ? (apps.lastPicBoardIdx = 0, apps.closeAllModelView()) : apps.showImage(s[apps.lastPicBoardIdx], n, i.picboard);
    } else {
      if (s = apps.sessionFilesCache[apps.curSessionId], !s) return void apps.closeAllModelView();
      if (apps.lastSessionId === apps.curSessionId) apps.sessionCacheIdx += 1, apps.sessionCacheIdx >= s.length ? (apps.sessionCacheIdx = 0, apps.closeAllModelView()) : s[apps.sessionCacheIdx - 1].shareId === s[apps.sessionCacheIdx].shareId ? apps.showImage(s[apps.sessionCacheIdx], n) : apps.closeAllModelView();else {
        apps.lastSessionId = apps.curSessionId;
        var a = s.findIndex(function (e) {
          return t && e.uri === t || r && (e.imgId === r || e.rawImgId === r);
        });
        if (-1 === a) return void apps.closeAllModelView();
        for (;;) {
          var o = s[a + 1];
          if (!o || !(t && o.uri === t || r && (o.imgId === r || o.rawImgId === r))) break;
          a += 1;
        }
        if (apps.sessionCacheIdx = a + 1, !apps.sessionFilesCacheEnded[apps.curSessionId] && s.length - apps.sessionCacheIdx < apps.sessionFetchLimit && apps.fetchSessionFiles(apps.curSessionId, !1, "chat" === apps.curSessionType ? apps.curSessionFriendId : null), apps.sessionCacheIdx >= s.length) apps.sessionCacheIdx = 0, apps.closeAllModelView();else if (s[apps.sessionCacheIdx - 1].shareId === s[apps.sessionCacheIdx].shareId) {
          apps.showImage(s[apps.sessionCacheIdx], n);
          var p = s[apps.sessionCacheIdx + 1];
          if (p && p.type === apps.CONS_MSG_TYPE_VIDEO && p.rawImgId) {
            var u = p.width,
              d = p.height,
              r = p.imgId,
              c = p.rawImgId,
              f = apps.findAvailablePreVid(r, p),
              l = f.mseq,
              g = f.isnew;
            c && g && apps.emit("showModelImage" + l, {
              imgId: r,
              ratio: u / d,
              rawImgId: c,
              isVideo: !0,
              preVideoLoad: !0
            });
          }
        } else apps.closeAllModelView();
      }
    }
  }, apps.showImage = function (e, r, t) {
    if (e) {
      var n = e.type,
        i = e.uri,
        s = e.width,
        a = e.height,
        o = e.size,
        p = e.imgId,
        u = e.rawImgId,
        d = e.rawHeight,
        c = e.rawWidth,
        f = e.rawSize;
      if (i && n === apps.CONS_MSG_TYPE_GIF) var l = function () {
        return apps.addGifToFavor(i, s, a, o, function () {
          return apps.tip((0, _requireConfig.tr)("Added"), !0);
        });
      };else {
        if (u) {
          var g = u.match(/^(\w+\.gif):/);
          if (g) {
            var h = g[1],
              m = parseInt(u.split(":")[1], 10);
            if (2097152 > m) {
              p = g[1], u = "";
              var C = p;
            } else C = h + ":" + p;
            (0, _requireConfig.tlog)("gif", p);
          }
        } else C = p;
        n === apps.CONS_MSG_TYPE_GIF && (l = function () {
          return apps.addGifToFavor(C, s, a, o, function () {
            return apps.tip((0, _requireConfig.tr)("Added"), !0);
          });
        });
      }
      if (s) {
        if (n === apps.CONS_MSG_TYPE_VIDEO) {
          var _ = apps.getImageUriCache(i);
          if (u) {
            var S = apps.findAvailablePreVid(p, e),
              v = S.mseq;
            apps.emit("showModelImage" + v, {
              path: i,
              videoThumb: _,
              imgId: p,
              ratio: s / a,
              rawImgId: u,
              isVideo: !0,
              picboard: t
            });
          } else apps.emit("showModelImage", {
            path: i,
            videoThumb: _,
            imgId: p,
            ratio: s / a,
            rawImgId: u,
            isVideo: !0,
            picboard: t
          });
        } else u && (u = u + ":" + f + ":" + c + ":" + d), apps.emit("showModelImage", {
          uri: i,
          imgId: p,
          rawImgId: u,
          ratio: s / a,
          isPhoto: !0,
          addToFavor: l,
          picboard: t
        });
      } else n === apps.CONS_MSG_TYPE_VIDEO ? _requireConfig.ProcessingManager.getVideoInfo(i).then(function (e) {
        var r = e.size,
          n = r.width,
          s = r.height,
          a = apps.getImageUriCache(i);
        apps.emit("showModelImage", {
          path: i,
          videoThumb: a,
          imgId: p,
          rawImgId: u,
          ratio: n / s,
          isVideo: !0,
          picboard: t
        });
      }) : _reactNative.Image.getSize(i, function (e, r) {
        u && (u = u + ":" + f + ":" + c + ":" + d), apps.emit("showModelImage", {
          uri: i,
          imgId: p,
          rawImgId: u,
          ratio: e / r,
          isPhoto: !0,
          addToFavor: l,
          picboard: t
        });
      });
    }
  }, apps.showPrevCachedImage = function (e) {
    var r = e.imgId,
      t = (e.ratio, e.uri),
      n = e.isPhoto,
      i = (e.isVideo, e.curProps);
    apps.currentRoutes[apps.currentNavi];
    if (i.picboard) {
      if (1 !== i.picboard) return void apps.closeAllModelView();
      var s = apps.picBoardCachedImages;
      apps.lastPicBoardIdx || (apps.lastPicBoardIdx = s.findIndex(function (e) {
        return t && e.uri === t || r && (e.imgId === r || e.rawImgId === r);
      })), apps.lastPicBoardIdx -= 1, apps.lastPicBoardIdx < 0 ? (apps.lastPicBoardIdx = 0, apps.closeAllModelView()) : apps.showImage(s[apps.lastPicBoardIdx], n, i.picboard);
    } else {
      if (s = apps.sessionFilesCache[apps.curSessionId], !s) return void apps.closeAllModelView();
      if (apps.lastSessionId === apps.curSessionId) apps.sessionCacheIdx -= 1, apps.sessionCacheIdx < 0 ? (apps.sessionCacheIdx = 0, apps.closeAllModelView()) : s[apps.sessionCacheIdx].shareId === s[apps.sessionCacheIdx + 1].shareId ? apps.showImage(s[apps.sessionCacheIdx]) : apps.closeAllModelView();else {
        apps.lastSessionId = apps.curSessionId;
        var a = s.findIndex(function (e) {
          return t && e.uri === t || r && (e.imgId === r || e.rawImgId === r);
        });
        if (-1 === a) return void apps.closeAllModelView();
        apps.sessionCacheIdx = a - 1, apps.sessionCacheIdx < 0 ? (apps.sessionCacheIdx = 0, apps.closeAllModelView()) : s[apps.sessionCacheIdx].shareId === s[apps.sessionCacheIdx + 1].shareId ? apps.showImage(s[apps.sessionCacheIdx], n) : apps.closeAllModelView();
      }
    }
  }, apps.getShortPhoneNum = function () {
    if (apps.phoneNum) {
      var e = _requireConfig.smsPhoneCode[apps.country],
        r = apps.phoneNum.replace(e, "");
      return r;
    }
    return "";
  }, apps.sendVerificationCode = function (e, r, t) {
    return apps.request("/api/sms_verification", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: r,
        country: t,
        deviceUuid: apps.deviceUuid,
        smsCode: e
      })
    }).then(function (e) {
      return 200 === e.status ? e.json() : Promise.reject("resError");
    }).then(function (e) {
      return e.mismatch ? Promise.reject("mismatch") : e;
    });
  }, apps.getPasswdSalt = function () {
    return _requireConfig.fs.getPasswdSalt();
  }, apps.isSuid = function (e) {
    return apps.isOb;
  }, apps.fetchMultiLoginsCnt = function () {
    var e = apps.multiLogins.slice(0, 50).filter(function (e) {
      return e && apps.userid !== e;
    });
    e.length > 0 && e.length < 250 ? apps.request("/api/multi_logins_cnt", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(e)
    }).then(function (e) {
      return 200 === e.status ? e.json() : Promise.reject(e);
    }).then(function (e) {
      (0, _requireConfig.tlog)("multi_logins_cnt ok");
      var r = {},
        t = e.map(function (e) {
          return {
            userid: e.uid,
            c: e.c
          };
        });
      r["multiLoginCnts_" + apps.dataCenter] = t, apps.setSharedParas(r)["catch"](function (e) {
        return (0, _requireConfig.tlog)("error", "fetchMultiLoginsCnt", e);
      }), apps.multiLoginCnts = t, apps.multiLoginCntsSum = apps.multiLoginCnts.reduce(function (e, r) {
        return e + r.c;
      }, 0), apps.onChangeMultiLoginCnts && apps.onChangeMultiLoginCnts(), apps.emit("recoveryAccountsChanged"), apps.emit("aboutMeUnreadChanged");
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "fetchMultiLoginsCnt", e);
    }) : (apps.multiLoginCnts = [], apps.multiLoginCntsSum = 0, apps.onChangeMultiLoginCnts && apps.onChangeMultiLoginCnts(), apps.emit("recoveryAccountsChanged"), apps.emit("aboutMeUnreadChanged"));
  }, apps.loginPassword = function (e) {
    return apps.request("/api/login_password", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(e)
    }).then(function (e) {
      return 200 === e.status ? e.json() : Promise.reject("resError");
    }).then(function (r) {
      var t = r.userid,
        n = r.country,
        i = r.name,
        s = r.avatar,
        a = r.background,
        o = r.userRand,
        p = r.noOthersBg,
        u = r.pubid,
        d = r.gender,
        c = r.pickNoti,
        f = r.shareNoti,
        l = r.msgNoti,
        g = r.commentNoti,
        h = r.mismatch,
        m = r.account,
        C = r.lastLoginTime,
        _ = r.newLoginTime;
      p = p || 0;
      var S = r.disableBottle ? 1 : 0,
        v = r.disableShadow ? 1 : 0;
      return u || (u = t), h ? Promise.reject("__password_wrong_") : (apps.userid = t, apps["userid_" + apps.dataCenter] = t, apps.relogin = 1, apps.lastLoginTime[t] !== C && (apps.loginClear = !0), apps.lastLoginTime[t] = _, -1 === apps.multiLogins.indexOf(t) && apps.multiLogins.unshift(t), apps["multiLogins_" + apps.dataCenter] = apps.multiLogins, apps.resetSharedParas(["lastLoginTime", "relogin", "userid_" + apps.dataCenter, "multiLogins_" + apps.dataCenter]), apps.dataLaunch().then(function () {
        return Promise.all([_requireConfig.dbs.setUserProfile({
          phoneNum: e.phone,
          mpasswd: r.mpasswd,
          country: n,
          userRand: o,
          account: m,
          noOthersBg: p,
          gender: d,
          disableBottle: S,
          pickNoti: c,
          shareNoti: f,
          msgNoti: l,
          commentNoti: g,
          pubid: u,
          disableShadow: v
        }), _requireConfig.dbs.setProfile(t, {
          name: i,
          background: a,
          avatar: s,
          gender: d
        })])["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "loginPassword set", e);
        });
      }));
    }).then(function () {
      apps.multiLoginsRoute ? apps.reloadHvdown() : apps.emit("appLaunchEnd", "normal", function () {
        return apps.normalLaunch()["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "quickLaunch loginPassword", e);
        });
      });
    });
  }, apps.resetPassword = function (e) {
    return apps.request("/api/reset_password", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(e)
    }).then(function (e) {
      return 200 === e.status ? e.json() : Promise.reject("resError");
    }).then(function (r) {
      var t = r.userid,
        n = r.country,
        i = r.name,
        s = r.avatar,
        a = r.background,
        o = r.userRand,
        p = r.noOthersBg,
        u = r.pubid,
        d = r.gender,
        c = r.pickNoti,
        f = r.shareNoti,
        l = r.msgNoti,
        g = r.commentNoti,
        h = r.account,
        m = r.lastLoginTime,
        C = r.newLoginTime;
      p = p || 0;
      var _ = r.disableBottle ? 1 : 0,
        S = r.disableShadow ? 1 : 0;
      return u || (u = t), t ? (apps.userid = t, apps["userid_" + apps.dataCenter] = t, apps.relogin = 1, apps.lastLoginTime[t] !== m && (apps.loginClear = !0), apps.lastLoginTime[t] = C, -1 === apps.multiLogins.indexOf(t) && apps.multiLogins.unshift(t), apps["multiLogins_" + apps.dataCenter] = apps.multiLogins, apps.resetSharedParas(["lastLoginTime", "relogin", "userid_" + apps.dataCenter, "multiLogins_" + apps.dataCenter]), apps.dataLaunch().then(function () {
        return Promise.all([_requireConfig.dbs.setUserProfile({
          phoneNum: e.phone,
          mpasswd: r.mpasswd,
          country: n,
          userRand: o,
          account: h,
          noOthersBg: p,
          gender: d,
          disableBottle: _,
          pickNoti: c,
          shareNoti: f,
          msgNoti: l,
          commentNoti: g,
          pubid: u,
          disableShadow: S
        }), _requireConfig.dbs.setProfile(t, {
          name: i,
          background: a,
          avatar: s,
          gender: d
        })])["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "resetPassword set", e);
        });
      })) : Promise.reject("__resetPassword_failed_");
    }).then(function () {
      apps.multiLoginsRoute ? apps.reloadHvdown() : apps.emit("appLaunchEnd", "normal", function () {
        return apps.normalLaunch()["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "quickLaunch resetPassword", e);
        });
      });
    });
  }, apps.signup = function (e) {
    return apps.request("/api/signup", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(e)
    }).then(function (e) {
      return 200 === e.status ? e.json() : Promise.reject("resError");
    }).then(function (r) {
      var t = r.userid,
        n = r.avatar,
        i = r.userRand,
        s = r.lastLoginTime,
        a = r.pubid,
        o = r.username,
        p = r.mpasswd;
      return a || (a = t), apps.userid = t, apps["userid_" + apps.dataCenter] = t, apps.loginClear = !0, apps.lastLoginTime[t] = s, -1 === apps.multiLogins.indexOf(t) && apps.multiLogins.unshift(t), apps["multiLogins_" + apps.dataCenter] = apps.multiLogins, apps.resetSharedParas(["lastLoginTime", "userid_" + apps.dataCenter, "multiLogins_" + apps.dataCenter]), o !== e.username && apps.tip((0, _requireConfig.tr)("Name repeated"), !0), apps.dataLaunch().then(function () {
        return Promise.all([_requireConfig.dbs.setUserProfile({
          phoneNum: e.phone,
          mpasswd: p,
          country: e.country,
          userRand: i,
          account: "",
          pickNoti: 1,
          shareNoti: 1,
          msgNoti: 1,
          commentNoti: 1,
          firReg: 1,
          pubid: a,
          nopasswd: 1,
          gender: e.gender,
          friendsSync: 1
        }), _requireConfig.dbs.setProfile(t, {
          name: o,
          avatar: n,
          background: "",
          gender: e.gender
        })])["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "signup set", e);
        });
      });
    }).then(function () {
      apps.multiLoginsRoute ? apps.reloadHvdown() : apps.emit("appLaunchEnd", "normal", function () {
        return apps.normalLaunch()["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "quickLaunch signup", e);
        });
      });
    });
  }, apps.suCreate = function () {
    apps.diag({
      header: (0, _requireConfig.tr)("Gender"),
      content: (0, _requireConfig.tr)("Choose your gender"),
      buttons: [{
        text: (0, _requireConfig.tr)("Male"),
        onPress: function (r) {
          return apps.closeDiag(function () {
            return e(1);
          });
        }
      }, {
        text: (0, _requireConfig.tr)("Female"),
        onPress: function (r) {
          return apps.closeDiag(function () {
            return e(2);
          });
        }
      }]
    });
    var e = function (e) {
      return apps.diag({
        header: "Su Msg",
        content: "Create new suid",
        imagePicker: (0, _requireConfig.tr)("Avatar"),
        textInputs: [{
          placeholder: (0, _requireConfig.tr)("Shadow Tree"),
          value: "",
          maxLength: 20
        }],
        buttons: [{
          text: (0, _requireConfig.tr)("Cancel"),
          onPress: function () {
            return apps.closeDiag();
          }
        }, {
          text: "New",
          onPress: function (r) {
            if (!r.isProgressing) {
              var t = r.state.textInputs[0].value,
                n = apps.getCurrentCountry() || "China",
                i = r.state.imagePickerResult;
              if (t) {
                if (i) {
                  r.progressing(!0);
                  var s = apps.mpasswd;
                  apps.uploadAvatarT(i).then(function (r) {
                    return {
                      bText: t,
                      avatar: i,
                      deviceUuid: apps.deviceUuid,
                      platform: platform,
                      mpasswd: s,
                      gender: e,
                      imgId: r
                    };
                  }).then(function (e) {
                    return apps.send("suCreate", e);
                  }).then(function (t) {
                    t.nosu ? (r.progressing(!1), r.setState({
                      infoTip: (0, _requireConfig.tr)("nosu")
                    })) : apps.closeDiag(function () {
                      var r = t.userid,
                        i = t.imgId,
                        a = t.userRand,
                        o = t.phoneNum,
                        p = t.lastLoginTime,
                        u = t.pubid,
                        d = t.account,
                        c = t.tester;
                      apps.relogin = 1, apps.loginClear = !0, u || (u = r), apps.lastLoginTime[r] = p, apps.wsClose(), apps.profiles = {}, apps.userid = r, apps["userid_" + apps.dataCenter] = r, -1 === apps.multiLogins.indexOf(r) && apps.multiLogins.unshift(r), apps["multiLogins_" + apps.dataCenter] = apps.multiLogins, apps.resetSharedParas(["lastLoginTime", "relogin", "userid_" + apps.dataCenter, "multiLogins_" + apps.dataCenter]).then(function () {
                        return apps.dataLaunch();
                      }).then(function () {
                        return Promise.all([_requireConfig.dbs.setUserProfile({
                          mpasswd: s,
                          country: n,
                          userRand: a,
                          phoneNum: o,
                          account: d,
                          friendsSync: 1,
                          firReg: 1,
                          pickNoti: 1,
                          shareNoti: 1,
                          msgNoti: 1,
                          commentNoti: 1,
                          pubid: u,
                          tester: c,
                          gender: e
                        }), _requireConfig.dbs.setProfile(r, {
                          name: t.name,
                          background: i,
                          avatar: i,
                          gender: e
                        })])["catch"](function (e) {
                          (0, _requireConfig.tlog)("error", "suCreate set", e);
                        });
                      }).then(function () {
                        apps.reloadHvdown();
                      });
                    });
                  })["catch"](function (e) {
                    (0, _requireConfig.tlog)("error", "suCreate", e), r.progressing(!1), r.setState({
                      infoTip: (0, _requireConfig.tr)("suCreate failed")
                    });
                  });
                } else r.setState({
                  infoTip: (0, _requireConfig.tr)("Avatar not selected")
                });
              } else r.setState({
                infoTip: (0, _requireConfig.tr)("Tree cannot be empty")
              });
            }
          }
        }]
      });
    };
  }, apps.switchAccount = function (id) {
    if (id === apps.userid) return Promise.resolve({
      ok: true
    });
    if (!apps.getRecoveryAccounts().some(function (item) {
      return item.userid === id;
    })) return Promise.reject(new Error("请先登录这个账号"));
    if (apps.sutoing) return Promise.reject(new Error("账号正在切换，请稍候"));
    return _requireConfig.sqlite.openDatabase(id + ".db", "1.0", "userid[" + id + "] database", 2e5).then(function (database) {
      return database.executeSql("SELECT v FROM UserProfile WHERE k=?", ["mpasswd"]);
    }).then(function (result) {
      if (!result[0].rows.length) throw new Error("本机登录凭据已丢失，请点击重新登录");
      var credential;
      try {
        credential = JSON.parse(result[0].rows.item(0).v);
      } catch (error) {
        throw new Error("本机登录凭据无效，请点击重新登录");
      }
      if (!credential || typeof credential !== "string") throw new Error("本机登录凭据无效，请点击重新登录");
      return apps.suto(id, credential, true);
    }).then(function (result) {
      if (!result || !result.ok) throw new Error(result && result.error || "切换失败，请重新登录");
      return result;
    });
  }, apps.suto = function (e, r, recoveryQuiet) {
    return apps.sutoing ? Promise.resolve({
      ok: false,
      error: "账号正在切换，请稍候"
    }) : (apps.sutoing = !0, apps.recoveryAccountRequest("suto", {
      suid: e,
      mpasswd: r,
      platform: platform,
      deviceUuid: apps.deviceUuid
    }).then(function (r) {
      if (!r.rerr) {
        var t = r.avatar,
          n = r.country,
          i = r.name,
          s = r.background,
          a = r.phoneNum,
          o = r.userRand,
          p = r.gender,
          u = r.tester,
          d = r.pubid,
          c = r.passwd,
          f = r.account,
          l = r.pickNoti,
          g = r.shareNoti,
          h = r.msgNoti,
          m = r.commentNoti,
          C = r.lastLoginTime,
          _ = r.newLoginTime;
        return apps.lastLoginTime[e] !== C && (apps.loginClear = !0), apps.lastLoginTime[e] = _, apps.wsClose(), apps.userid = e, d || (d = e), apps.profiles = {}, delete apps.suid, apps["userid_" + apps.dataCenter] = e, -1 === apps.multiLogins.indexOf(e) && apps.multiLogins.unshift(e), apps.relogin = 1, apps["multiLogins_" + apps.dataCenter] = apps.multiLogins, apps.resetSharedParas(["lastLoginTime", "relogin", "multiLogins_" + apps.dataCenter, "userid_" + apps.dataCenter]).then(function () {
          return apps.dataLaunch();
        }).then(function () {
          return Promise.all([_requireConfig.dbs.setUserProfile({
            mpasswd: c,
            country: n,
            userRand: o,
            phoneNum: a,
            account: f,
            pickNoti: l,
            shareNoti: g,
            msgNoti: h,
            commentNoti: m,
            gender: p,
            tester: u ? 1 : 0
          }), _requireConfig.dbs.setProfile(e, {
            name: i,
            background: s,
            avatar: t,
            gender: p
          })]);
        }).then(function () {
          apps.reloadHvdown();
          return {
            ok: true
          };
        });
      }
      delete apps.sutoing;
      if (!recoveryQuiet) apps.closeDiag(function () { return apps.popTip(r.rerr); });
      return {
        ok: false,
        error: String(r.rerr)
      };
    })["catch"](function (r) {
      (0, _requireConfig.tlog)("error", "suto", e, r), delete apps.sutoing;
      return {
        ok: false,
        error: "账号切换失败，请检查网络或重新登录"
      };
    }));
  }, apps.userLoginVerification = function (e, r) {
    return apps.request("/api/user_login_verification", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: e,
        platform: platform,
        deviceUuid: apps.deviceUuid
      })
    }).then(function (e) {
      return 200 === e.status ? e.json() : Promise.reject("resError");
    }).then(function (e) {
      return e.type;
    });
  }, apps.prepareLaunching = function (e, r) {
    return _requireConfig.fs.greetings("prepareLaunching" + e).then(function (t) {
      return apps.request("/api/prepare_launching", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          greetings: t,
          phone: e,
          country: r,
          deviceUuid: apps.deviceUuid,
          platform: platform
        })
      }).then(function (e) {
        return 200 !== e.status ? Promise.reject("resError") : e.json();
      });
    });
  }, apps.launchTest = function () {
    _requireConfig.fs.gethostaddr("qxchat.cn").then(function (e) {
      (0, _requireConfig.tlog)("dns: ", e);
    });
  }, apps.shouldChangeReturnToSend = function () {
    return "ios" === _reactNative.Platform.OS && "zh" === apps.locale.slice(0, 2) && "bottleFriends" !== apps.currentRoutes[apps.currentNavi].name;
  }, apps.getDeviceUuid = function () {
    var e = require(562)();
    return e;
  }, apps.getDataCenterName = function () {
    return "do" === apps.dataCenter ? (0, _requireConfig.tr)("Now in Pro") : (0, _requireConfig.tr)("Now in Dev");
  }, apps.getTheOtherDataCenterName = function () {
    return "do" === apps.dataCenter ? (0, _requireConfig.tr)("China") : (0, _requireConfig.tr)("America");
  }, apps.transMinSec = function (e) {
    var r = e + 864e5 - apps.now(),
      t = Math.floor(r / 3600 / 1e3),
      n = Math.floor(r % 36e5 / 60 / 1e3),
      i = Math.floor(r % 6e4 / 1e3);
    return t + ":" + n + ":" + i;
  }, apps.checkOtherDataCenter = function () {
    try {
      if ("ali" === apps.dataCenter) var e = apps.userid_do,
        r = apps.hurls_do_pro;else e = apps.userid_ali, r = apps.hurls_ali_dev;
      if (e && r) {
        var t = apps.getRandomItem("checkOtherDataCenter", r);
        apps.fetch("https://" + t + "/api/tester_user_unread_msg_cnt/" + encodeURIComponent(e), {}, 3e4, !0).then(function (e) {
          return 200 === e.status ? e.json() : Promise.reject("checkOtherDataCenter resError");
        }).then(function (e) {
          (0, _requireConfig.tlog)("checkOtherDataCenter", e.cnt), apps.otherDataCenterUnreadCnt = e.cnt, apps.onChangeOtherDataCenterUnread && apps.onChangeOtherDataCenterUnread(), apps.emit("aboutMeUnreadChanged");
        })["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "checkOtherDataCenter", e);
        });
      }
    } catch (n) {
      (0, _requireConfig.tlog)("error", "checkOtherDataCenter", n);
    }
  }, apps.execSqliteCmd = function (e, r) {
    e.executeSql(r).then(function (e) {
      var r = e[0];
      (0, _requireConfig.dlog)(r);
      for (var t = r.rows.length, n = [], i = 0; t > i; i++) n.push((0, _requireConfig.inspect)(r.rows.item(i), {
        depth: 0
      }));
      (0, _requireConfig.dlog)("sql>>\n" + n.join("\n") + "\n<<sql");
    });
  }, apps.switchDataCenter = function () {
    if (!apps.switchingDataCenter) {
      if (apps.switchingDataCenter = !0, "ali" === apps.dataCenter) var e = "do";else e = "ali";
      apps.setSharedParas({
        dataCenter: e
      }).then(function () {
        return apps.closeDiag(), apps.reloadHvdown();
      })["catch"]((0, _requireConfig.errCb)("switchDataCenter"));
    }
  }, apps.getServerDomains = function () {
    var e = apps.durls;
    return e[Math.floor(Math.random() * e.length)];
  }, apps.delSharedParas = function (e) {
    return "string" == typeof e ? (delete apps[e], apps.sdb.executeSql("DELETE FROM SharedParas WHERE k=?", [e])["catch"](function (r) {
      (0, _requireConfig.tlog)("error", "delSharedParas", e, r);
    })) : apps.sdb.transaction(function (r) {
      e.forEach(function (e) {
        delete apps[e], r.executeSql("DELETE FROM SharedParas WHERE k=?", [e])["catch"](function (r) {
          (0, _requireConfig.tlog)("error", "delSharedParas", e, r);
        });
      });
    });
  }, apps.resetSharedParas = function (e) {
    return new Promise(function (r, t) {
      if ("string" == typeof e) {
        var n = JSON.stringify(apps[e]);
        apps.sdb.executeSql("INSERT OR REPLACE INTO SharedParas(k, v) VALUES(?, ?)", [e, n]).then(function () {
          r();
        }, function (r) {
          (0, _requireConfig.tlog)("error", "resetSharedParas", e, r), t(r);
        });
      } else apps.sdb.transaction(function (r) {
        e.forEach(function (e) {
          n = JSON.stringify(apps[e]), r.executeSql("INSERT OR REPLACE INTO SharedParas(k, v) VALUES(?, ?)", [e, n])["catch"](function (r) {
            (0, _requireConfig.tlog)("error", "resetSharedParas", e, r);
          });
        });
      }).then(function () {
        return r();
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "resetSharedParas", e);
      });
    });
  }, apps.setSharedParas = function (e) {
    return babelHelpers["extends"](apps, e), new Promise(function (r, t) {
      apps.sdb.transaction(function (r) {
        var t = function (t) {
          var n = JSON.stringify(e[t]);
          r.executeSql("\n          INSERT OR REPLACE INTO SharedParas(k, v) VALUES(?, ?)\n        ", [t, n])["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "setSharedParas", t, n, e);
          });
        };
        for (var n in e) t(n);
      }).then(function () {
        r();
      })["catch"](function (r) {
        (0, _requireConfig.tlog)("error", "setSharedParas", e, r), t(r);
      });
    });
  }, apps.shadowDb = function () {
    return _requireConfig.sqlite.openDatabase(apps.shadowId + ".db", "1.0", "userid[" + apps.shadowId + "] database", 2e5);
  }, apps.loadSharedDb = function () {
    return _requireConfig.sqlite.enablePromise(!0), _requireConfig.sqlite.openDatabase("mistShared.db", "1.0", "Mist Shared Database", 2e5).then(function (e) {
      return apps.sdb = e, e.transaction(function (e) {
        e.executeSql("CREATE TABLE IF NOT EXISTS SProfiles(\n        userid TEXT NOT NULL,\n        k TEXT NOT NULL,\n        v TEXT NOT NULL,\n        UNIQUE(userid, k) ON CONFLICT REPLACE\n      )")["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "create SProfiles table", e);
        });
      });
    }).then(function () {
      return apps.sdb.executeSql("SELECT * FROM SharedParas");
    }).then(function (e) {
      for (var r = e[0].rows, t = 0; t < r.length; t++) {
        var n = r.item(t);
        apps[n.k] = JSON.parse(n.v);
      }
    })["catch"](function (e) {
      return (0, _requireConfig.tlog)("error", "loadSharedDb", e), apps.sdb.transaction(function (e) {
        e.executeSql("CREATE TABLE IF NOT EXISTS SharedParas(\n        k TEXT NOT NULL,\n        v TEXT NOT NULL,\n        UNIQUE(k) ON CONFLICT REPLACE \n      )")["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "create SharedParas table", e);
        }), e.executeSql("CREATE TABLE IF NOT EXISTS CachedAudio(\n        audioId TEXT PRIMARY KEY,\n        uri TEXT NOT NULL,\n        size INTEGER NOT NULL)\n      ")["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "create CachedAudio", e);
        }), e.executeSql("CREATE TABLE IF NOT EXISTS CachedImages(\n        imgId TEXT PRIMARY KEY NOT NULL,\n        uri TEXT NOT NULL,\n        size INTEGER NOT NULL,\n        stats TEXT\n      )")["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "create CachedImages table", e);
        });
        var r = {
          cachedAudiosSize: 0,
          cachedImagesSize: 0,
          dataCenter: "do",
          deviceUuid: apps.getDeviceUuid(),
          themeMode: {
            darkTheme: 1
          },
          customBg: ""
        };
        for (var t in r) e.executeSql("\n          INSERT INTO SharedParas (k, v) VALUES (?, ?) \n        ", [t, JSON.stringify(r[t])])["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "init SharedParas", t, r[t], e);
        });
        babelHelpers["extends"](apps, r);
      });
    });
  }, apps.getRandomItem = function (e, r) {
    if (void 0 === apps.randomItemIdx[e]) {
      var t = Math.floor(Math.random() * r.length);
      apps.randomItemIdx[e] = t;
    } else t = apps.randomItemIdx[e], t += 1, t >= r.length && (t = 0), apps.randomItemIdx[e] = t;
    return r[t];
  }, apps.initTenorGif = function () {
    apps.tenorGifInited || (apps.tenorGifInited = !0, apps.fetchWebServiceGifData({
      type: "tenor",
      startup: !0
    }), apps.fetchWebServiceGifAutocomplete({
      type: "tenor",
      q: ""
    }));
  }, apps.usageTips = function () {
    return (0, _requireConfig.tr)("The new drift bottles will be discovered once in a while...");
  }, apps.usageSpecification = function () {
    apps.diag({
      header: (0, _requireConfig.tr)("Tips"),
      content: (0, _requireConfig.tr)("Your reply to the story will also be anonymous in this 24 hours."),
      buttons: [{
        text: (0, _requireConfig.tr)("OK"),
        onPress: function (e) {
          return apps.closeDiag();
        }
      }]
    });
  }, apps.getRealFriendId = function (e) {
    var r = e.toId,
      t = e.fromId;
    return r || t ? "2:" === r.slice(0, 2) || t === apps.userid ? r : t : e.friendId;
  }, apps.lightForCusbg = function () {
    apps.lightMode && (apps.hasCustomBg ? (_requireConfig.theme.leftBubble = _requireConfig.theme.leftBubble1, _requireConfig.theme.rightBubble = _requireConfig.theme.rightBubble1) : (_requireConfig.theme.leftBubble = _requireConfig.theme.leftBubble2, _requireConfig.theme.rightBubble = _requireConfig.theme.rightBubble2));
  }, apps.clientFatalLog = function (e, r) {
    var t = new Error();
    (0, _requireConfig.tlog)("error", e, r, t), apps.send("clientFatalLog", {
      msg: t.message,
      stack: t.stack
    })["catch"](function (r) {
      (0, _requireConfig.tlog)("error", "clientFatalLog " + e, r);
    });
  }, apps.launch = function () {
    (0, _requireConfig.tlog)(" "), (0, _requireConfig.tlog)(" "), (0, _requireConfig.tlog)(" "), (0, _requireConfig.tlog)(" "), (0, _requireConfig.tlog)(" "), (0, _requireConfig.tlog)("launch", apps.fnow(), apps.timeZoneOffset), (0, _requireConfig.tlog)(apps.deviceFrom + "---" + apps.deviceSys), (0, _requireConfig.tlog)("winWidth=" + _requireConfig.theme.winWidth + ", winHeight=" + _requireConfig.theme.winHeight + ", winPixelWidth=" + _requireConfig.theme.winPixelWidth + ", winPixelHeight=" + _requireConfig.theme.winPixelHeight), (0, _requireConfig.tlog)("locale", _requireConfig.I18n.rawLocale, apps.locale), (0, _requireConfig.tlog)("PixelRatio", _reactNative.PixelRatio.get()), (0, _requireConfig.tlog)("ddversion", apps.ddversion), _requireConfig.reactDevInfo.hasSimCard().then(function (e) {
      apps.hasSimCard = !!e, (0, _requireConfig.tlog)("SIM card", apps.hasSimCard);
    }), Promise.all([_requireConfig.fs.pkgVersion(), apps.loadSharedDb()]).then(function (e) {
      return apps.pkgVersion = e[0], apps.getKeyChain();
    }).then(function () {
      apps.themeMode = {
        darkTheme: 1
      }, apps.customBg = "/a/d22.jpg", apps.themeMode ? babelHelpers["extends"](apps, apps.themeMode) : apps.lightMode = 1, apps.lightForCusbg(), apps.version = "2.2.1163", apps.downloadSite = "http://qxchat.cn", apps.cdnSite = "http://cdn.qxchat.cn", apps.downloadStore = "https://itunes.apple.com/app/id1431465795?ls=1&mt=8", apps.auditMode && (apps.blackWhiteMode = 1), apps.firstThrowMax = 999 + Math.floor(3 * Math.random()), apps.HIGHESTTIME = HIGHESTTIME, apps.downFrom = "AppStore", apps.isDev ? (apps.runMode = "dev", apps.dataCenter = "ali") : "ali" === apps.dataCenter ? apps.runMode = "dev" : apps.runMode = "pro", apps.isAlid && (apps.dataCenter = "do", apps.runMode = "dev"), "ios" === _reactNative.Platform.OS && (apps.darkTheme ? _reactNative.StatusBarIOS.setStyle("light-content") : _reactNative.StatusBarIOS.setStyle("default"), _reactNative.StatusBarIOS.setHidden(!1));
      var e = {
        vurls_ali_dev: [0, 0, 0],
        murls_ali_dev: ["qxchat.cn:30001"],
        durls_ali_dev: ["qxchat.cn:40002"],
        hurls_ali_dev: ["qxchat.cn:50001"],
        vurls_do_pro: [0, 0, 0],
        murls_do_pro: ["qxchat.cn:30201"],
        durls_do_pro: ["qxchat.cn:40201"],
        hurls_do_pro: ["qxchat.cn:50201"],
        vurls_do_dev: [0, 0, 0],
        murls_do_dev: ["qxchat.cn:30901"],
        durls_do_dev: ["qxchat.cn:40901"],
        hurls_do_dev: ["qxchat.cn:50901"]
      };
      if (apps.defaultMurls = e["murls_" + apps.dataCenter + "_" + apps.runMode], apps.defaultDurls = e["durls_" + apps.dataCenter + "_" + apps.runMode], apps.defaultHurls = e["hurls_" + apps.dataCenter + "_" + apps.runMode], apps.defaultVurls = e["vurls_" + apps.dataCenter + "_" + apps.runMode], apps.userid = apps["userid_" + apps.dataCenter], apps.multiLogins = apps["multiLogins_" + apps.dataCenter] || [], apps.multiLoginCnts = apps["multiLoginCnts_" + apps.dataCenter] || [], apps.murls = apps["murls_" + apps.dataCenter + "_" + apps.runMode] || apps.defaultMurls, apps.durls = apps["durls_" + apps.dataCenter + "_" + apps.runMode] || apps.defaultDurls, apps.hurls = apps["hurls_" + apps.dataCenter + "_" + apps.runMode] || apps.defaultHurls, apps.vurls = apps["vurls_" + apps.dataCenter + "_" + apps.runMode] || apps.defaultVurls, apps.checkPermissions(), apps.multiLoginCnts.length > 0 && (apps.multiLoginCnts = apps.multiLoginCnts.filter(function (e) {
        return apps.userid !== e.uid;
      }), apps.multiLoginCntsSum = apps.multiLoginCnts.reduce(function (e, r) {
        return e + r.c;
      }, 0)), apps.emit("showCmdBallToggled", apps.showCmdBall), apps.verifyVurls(6e3), apps.showCmdBall && !apps.noDvcTest) {
        var r = 0,
          t = 0,
          n = 0;
        setInterval(function () {
          apps.post("/api/deviceCheckTest", {
            t: 1
          }, 2e3, !0)["catch"](function (e) {
            r += 1, (0, _requireConfig.tlog)("error", r + " http post failed", e);
          });
        }, 2e3);
        var i = function a() {
          apps.userid && (apps.workerTest = !0, apps.send("workerTest")["catch"](function (e) {}), setTimeout(function () {
            apps.workerTest && (t += 1, (0, _requireConfig.tlog)("error", t + " workerTest failed")), a();
          }, 3e3));
        };
        i();
        var s = function o() {
          apps.userid && (apps.pickerTest = !0, apps.send("pickerTest")["catch"](function (e) {}), setTimeout(function () {
            apps.pickerTest && (n += 1, (0, _requireConfig.tlog)("error", n + " pickerTest failed")), o();
          }, 3e3));
        };
        s();
      }
      apps.userid ? apps.emit("appLaunchEnd", "normal") : (apps.firstInstallCheck(), apps.emit("appLaunchEnd", "register"));
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "launch", e);
    });
  }, apps.normalLaunch = function (e) {
    return new Promise(function (e, r) {
      try {
        apps.emit("msgsFetching"), _requireConfig.wsc.connectToServer("launch"), apps.showCmdBall && apps.checkOtherDataCenter(), e();
      } catch (t) {
        r(t);
      }
    });
  }, apps.dataLaunch = function () {
    return (0, _requireConfig.tlog)("dataLaunch", _requireConfig.fs.DocumentDirectoryPath, apps.fnow()), apps.currentNavi = "friends", _requireConfig.fs.exists(_requireConfig.fs.DocumentDirectoryPath + "/cachedImages/").then(function (e) {
      return e ? void 0 : _requireConfig.fs.mkdir(_requireConfig.fs.DocumentDirectoryPath + "/cachedImages/", !0);
    }).then(function () {
      return _requireConfig.fs.exists(_requireConfig.fs.DocumentDirectoryPath + "/cachedAudio/");
    }).then(function (e) {
      return e ? void 0 : _requireConfig.fs.mkdir(_requireConfig.fs.DocumentDirectoryPath + "/cachedAudio/", !0);
    }).then(function () {
      return _requireConfig.dbs.startdb(apps.userid);
    })["catch"]((0, _requireConfig.errCb)("dataLaunch"));
  }, apps.myEmosChanged = function () {
    apps.send("myEmosChanged", {
      myEmos: apps.myEmos
    }).then(function () {
      return _requireConfig.dbs.setUserProfile({
        myEmosTrack: ++apps.myEmosTrack,
        myEmos: apps.myEmos
      });
    })["catch"]((0, _requireConfig.errCb)("myEmosChanged"));
  }, apps.preparePushNotification = function () {
    return new Promise(function (e, r) {
      if (apps.permissions.notification) {
        if ("ios" === _reactNative.Platform.OS) var t = 1;else t = 3;
        3 === t ? _requireConfig.EggNetService.getXiaomiRegID(function (e, r) {
          (0, _requireConfig.tlog)("getXiaomiRegID", r), r && (apps.xiaomiRegID = r, apps.syncPushToken(r));
        }) : 2 === t || (apps.notiPerRequested ? PushNotification.requestPermissions() : (apps.notiPerRequested = !0, PushNotification.requestPermissions(), PushNotification.checkPermissions(function (e) {}), PushNotification.addEventListener("notification", function () {}), PushNotification.addEventListener("localNotification", function () {}), PushNotification.addEventListener("register", function (e) {
          apps.syncPushToken(e);
        })));
      }
      e();
    });
  }, apps.syncPushToken = function (e) {
    apps.syncPushTokenRun = function () {
      apps.send("syncPushToken", {
        token: e,
        platform: platform
      }).then(function () {
        apps.syncPushTokenDone = !0;
      })["catch"](function (r) {
        (0, _requireConfig.tlog)("error", "syncPushToken " + e, r);
      }), "ios" === _reactNative.Platform.OS && PushNotification.setApplicationIconBadgeNumber(0);
    }, apps.syncPushTokenDone || apps.frozen || apps.syncPushTokenRun();
  }, apps.onopen = function () {}, apps.onclose = function () {}, apps.onerror = function () {}, apps.onmessage = function (e) {
    var r = {
      notsa: function () {
        apps.wsClose(), apps.emit("msgsFetched"), apps.tipCb((0, _requireConfig.tr)("Due to some system issue, current version cannot login account with different phone."), function () {
          apps.delSharedParas("userid_" + apps.dataCenter).then(function () {
            return apps.reloadHvdown();
          })["catch"](function (e) {
            return (0, _requireConfig.tlog)("error", "otherPlaceLogin", e);
          });
        });
      },
      otherPlaceLogin: function () {
        apps.wsClose(), apps.emit("msgsFetched"), apps.otherPlaceLogin = !0;
        var e = [{
          text: (0, _requireConfig.tr)("Quit"),
          onPress: function () {
            apps.delSharedParas("userid_" + apps.dataCenter).then(function () {
              return apps.reloadHvdown();
            })["catch"](function (e) {
              return (0, _requireConfig.tlog)("error", "otherPlaceLogin", e);
            });
          }
        }];
        apps.showCmdBall && e.push({
          text: (0, _requireConfig.tr)("Re-Login"),
          onPress: function () {
            apps.setSharedParas({
              relogin: 1,
              reloginClear: 1
            }).then(function () {
              return apps.reloadHvdown();
            })["catch"](function (e) {
              return (0, _requireConfig.tlog)("error", "otherPlaceLogin", e);
            });
          }
        }), apps.diag({
          header: (0, _requireConfig.tr)("Tip"),
          content: (0, _requireConfig.tr)("Your account have been logged in on other device."),
          buttons: e
        });
      },
      userConnConfirmed: function () {
        apps.initUmeng(), e.frozen ? 1 === e.frozen ? (_requireConfig.dbs.setUserProfile({
          frozen: 1
        })["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "set frozen", e, r);
        }), apps.accountFrozen()) : 2 === e.frozen && apps.getDeviceCheck().then(function (e) {
          return apps.send("unsignAccountDone", {
            deviceCheck: e
          });
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "unsignAccountDone", e);
        }) : apps.frozen && _requireConfig.dbs.delUserProfile("frozen")["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed del frozen", e);
        }), apps.relogin && apps.delSharedParas("relogin")["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed del relogin", e);
        }), e.mpasswd && _requireConfig.dbs.setUserProfile({
          mpasswd: e.mpasswd
        })["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "set mpasswd", e.mpasswd, r);
        }), e.shaExp && _requireConfig.dbs.setUserProfile({
          shaExp: e.shaExp
        })["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "set shaExp", e.shaExp, r);
        }), e.tpwd ? _requireConfig.dbs.setUserProfile({
          tpwd: 1
        })["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "set tpwd", e, r);
        }) : apps.tpwd && _requireConfig.dbs.delUserProfile("tpwd")["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "del tpwd", e, r);
        }), apps.vipExpD && !e.vipExpD && _requireConfig.dbs.delUserProfile("vipExpD")["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed del vipExpD", e, r);
        }), !apps.vipExpD && e.vipExpD && (_requireConfig.dbs.setUserProfile({
          vipExpD: 1
        })["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed set vipExpD", e, r);
        }), _requireConfig.dbs.delUserProfile("vipExp")["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed del vipExp", e, r);
        })), e.shadowId && !apps.shadowId && (_requireConfig.dbs.setUserProfile({
          shadowId: e.shadowId
        })["catch"](function (r) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed set shadowId", e.shadowId, r);
        }), apps.emit("selectViewLoaded_contactsBoard", !0)), e.isForbided ? (apps.isFrozen && apps.tip((0, _requireConfig.tr)("Your account has been forbided.")), apps.syncFriendProfile(apps.userid, !0), _requireConfig.dbs.setUserProfile({
          isForbided: e.isForbided
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed isForbided", e);
        })) : (apps.isForbided && apps.syncFriendProfile(apps.userid, !0), _requireConfig.dbs.delUserProfile("isForbided")["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed del isForbided", e);
        })), e.forbidExp ? (_requireConfig.dbs.setUserProfile({
          forbidCnt: e.forbidCnt,
          forbidExp: e.forbidExp
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed forbidExp", e);
        }), apps.expForbid(e.forbidExp), apps.syncFriendProfile(apps.userid, !0)) : apps.forbidExp && (_requireConfig.dbs.delUserProfile("forbidExp")["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed del forbidExp", e);
        }), apps.syncFriendProfile(apps.userid, !0)), e.shadowExpired ? apps.handleShadowExpired(e.shadowExpired) : apps.shadowExpired && _requireConfig.dbs.delUserProfile("shadowExpired")["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed del shadowExpired", e);
        }), void 0 !== e.stars && (apps.stars = e.stars, _requireConfig.dbs.setUserProfile({
          stars: e.stars
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "userConnConfirmed set stars", e);
        }), apps.emit("userChanged")), apps.isFetchingUnread = !1, apps.sendBufferedDirectSend();
        var r = function (e) {
            return apps.preparePushNotification().then(function () {
              return apps.startSync();
            }).then(function () {
              apps.checkForHvdown();
            })["catch"](function (r) {
              (0, _requireConfig.tlog)("error", "userConnConfirmed " + e, r), apps.checkForHvdown();
            });
          },
          t = function (e) {
            apps.importantSyncFirst ? apps.fetchUnread().then(function () {
              return apps.startImportantSync();
            }).then(function () {
              return r(e);
            }) : apps.startImportantSync().then(function () {
              return apps.fetchUnread();
            }).then(function () {
              return r(e);
            });
          };
        apps.sendTimeoutReconnecting ? ((0, _requireConfig.tlog)("userConnConfirmed sendTimeoutReconnecting", apps.fnow()), apps.sendTimeoutReconnecting = !1, apps.sendWaitings(), t("sendTimeoutReconnecting")) : apps.fetchUnreadReconnecting ? ((0, _requireConfig.tlog)("userConnConfirmed fetchUnreadReconnecting", apps.fnow()), delete apps.fetchUnreadReconnecting, apps.sendWaitings(), t("fetchUnreadReconnecting")) : ((0, _requireConfig.tlog)("userConnConfirmed", apps.fnow()), t("normal"));
      },
      hasNewMsg: function () {
        "active" !== apps.appState && e.desc && e.noti && apps.pushLocalNoti(e.fname, e.desc, e.size || 1), apps.fetchUnread()["catch"]((0, _requireConfig.errCb)("fetchUnread"));
      },
      starReceived: function () {
        e.amount && void 0 !== e.total && (apps.stars = e.total, _requireConfig.dbs.setUserProfile({
          stars: e.total
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "starReceived setUserProfile", e);
        }), apps.emit("userChanged"), apps.tip((0, _requireConfig.tr)("Received ## stars from a friend", e.amount) + "\n" + (0, _requireConfig.tr)("Current stars: ##", e.total)));
      },
      hasSuidRand: function () {
        apps.startImportantSync()["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "hasSuidRand", e);
        });
      },
      deleteCloudRepos: function () {
        apps.emitOnce("deleteCloudReposFinished");
      },
      debugControlCommandReq: function () {
        "cmd" === e.type ? apps.runningRmd(e.cmd) : "sql" === e.type && apps.runningRql(e.cmd);
      },
      trydev: function () {
        apps.trydev();
      },
      signout: function () {
        apps.wsClose(), apps.diag({
          header: (0, _requireConfig.tr)("Tip"),
          content: e.t ? (0, _requireConfig.tr)("Account login other place") : (0, _requireConfig.tr)("Account not exists"),
          buttons: [{
            text: (0, _requireConfig.tr)("Ok"),
            onPress: function (e) {
              apps["multiLoginCnts_" + apps.dataCenter] = apps.multiLoginCnts, apps.wsClose(), apps.resetSharedParas("multiLoginCnts_" + apps.dataCenter).then(function () {
                return apps.delSharedParas("userid_" + apps.dataCenter);
              }).then(function () {
                apps.closeDiag(function () {
                  return apps.reloadHvdown();
                });
              })["catch"](function (e) {
                (0, _requireConfig.tlog)("error", "", e);
              });
            }
          }]
        });
      }
    };
    try {
      if (e.proto) {
        var t = r[e.proto];
        t ? t(e) : apps.emitSendEvent(e.proto + "_" + e.seq, e);
      } else (0, _requireConfig.tlog)("error", "onmessage proto missing", e);
    } catch (n) {
      (0, _requireConfig.tlog)("error", "onmessage", e, n);
    }
  }, apps.pushLocalNoti = function (e, r, t) {
    apps.frozen || ("ios" === _reactNative.Platform.OS ? (e && (r = e + ": " + r), _reactNative.PushNotificationIOS.presentLocalNotification({
      alertBody: (0, _requireConfig.tr)("You have a new message"),
      applicationIconBadgeNumber: t
    })) : _requireConfig.PushNotificationAndroid.create({
      id: 1,
      subject: (0, _requireConfig.tr)("Who U"),
      message: (0, _requireConfig.tr)("New Message")
    }));
  }, apps.sendDbg = function (e) {
    _requireConfig.dbs.extractLog(e).then(function (e) {
      return apps.post("/api/sendDbg", {
        userid: apps.userid,
        data: e
      });
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "sendDbg", e);
    });
  }, apps.handleDebugControlCommandReq = function (e) {
    e.forEach(function (e) {
      "cmd" === e.type ? apps.runningRmd(e.cmd) : "sql" === e.type && apps.runningRql(e.cmd);
    });
  }, apps.runningRql = function (e) {
    Promise.resolve().then(function () {
      return ":" === e[0] ? (e = e.slice(1), apps.shadowDb()) : "," === e[0] ? (e = e.slice(1), apps.sdb) : _requireConfig.db;
    }).then(function (r) {
      return _requireConfig.dbs.execSqliteCmdStr(r, e).then(function (e) {
        apps.ws.send(JSON.stringify({
          proto: "debugControlCommandRes",
          data: e,
          userid: apps.userid
        }));
      });
    })["catch"](function (e) {
      apps.ws.send(JSON.stringify({
        proto: "debugControlCommandRes",
        data: (0, _requireConfig.logFormat)((0, _requireConfig.inspect)(e)),
        userid: apps.userid
      }));
    });
  }, apps.runningRmd = function (rmd) {
    var ret;
    try {
      ret = eval(rmd);
    } catch (err) {
      ret = (0, _requireConfig.inspect)(err) + "\n" + err.stack;
    }
    ret && "object" == typeof ret && (ret instanceof Promise || "_fulfillmentHandler0" in ret) ? ret.then(function (e) {
      apps.ws.send(JSON.stringify({
        proto: "debugControlCommandRes",
        data: (0, _requireConfig.logFormat)(e),
        userid: apps.userid
      }));
    })["catch"](function (e) {
      apps.ws.send(JSON.stringify({
        proto: "debugControlCommandRes",
        data: (0, _requireConfig.logFormat)((0, _requireConfig.inspect)(e)),
        userid: apps.userid
      }));
    }) : (ret = (0, _requireConfig.logFormat)(ret), apps.ws.send(JSON.stringify({
      proto: "debugControlCommandRes",
      data: ret,
      userid: apps.userid
    })));
  }, apps.calcStoryCnt = function (e) {
    apps.storyCnt !== e && (_requireConfig.dbs.setUserProfile({
      storyCnt: e,
      showStoryCnt: 1
    })["catch"](function (e) {
      return (0, _requireConfig.tlog)("error", "calcStoryCnt", e);
    }), apps.emit("spaceUnreadChanged"));
  }, apps.storyCntChanged = function () {
    apps.emit("storyCntChanged");
  }, apps.sendNotiOk = function () {
    apps.send("notifChanged", {
      notiOk: apps.permissions.notification
    })["catch"](function (e) {
      return (0, _requireConfig.tlog)("error", "sendNotiOk", e);
    });
  }, apps.startImportantSync = function () {
    return new Promise(function (e, r) {
      if (apps.needLogining) return void apps.needLoginingDiag(apps.needLogining);
      if (Date.now() - apps.lastChangeToBackgroundTime < 1e3) return void e();
      var t = {
        "/a/d1.jpg": 1,
        "/a/d0.jpg": 2,
        "/a/d3.jpg": 3,
        "/a/w0.jpg": 4
      };
      apps.send("importantSync", {
        vurls: apps.vurls,
        sendTimeoutIntv: 1e4,
        dev: "dev" === apps.runMode ? 1 : void 0,
        hver: apps.version,
        cusbg: apps.customBg ? t[apps.customBg] || 6 : 5
      }).then(function (e) {
        var r = (e.time, e.calTime, e.vurls, e.lucksLimit),
          t = e.lucks,
          n = e.cloudRepoSize,
          i = (e.specialOp, e.suidCnt),
          s = e.bgblur,
          a = e.tester,
          o = (e.storyCnt, e.isOb);
        return apps.lastPhoneVtime || (apps.lastPhoneVtime = 0), e.bphone && apps.now() - apps.lastPhoneVtime > 1e5 && (_requireConfig.dbs.setUserProfile({
          lastPhoneVtime: apps.now()
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "bphone", e);
        }), apps.phoneVerify(null, "\u6ce8\u518c", function () {}, function (e) {
          e.needLogining && (delete e.needLogining, _requireConfig.dbs.setUserProfile({
            needLogining: e
          }).then(function () {
            return apps.needLoginingDiag(e);
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "bphone", e);
          }));
        }, !0)), s && (s = "i" === s[0] && "android" === _reactNative.Platform.OS ? Math.round(parseInt(s.slice(1), 10) / 3) : "a" === s[0] && "ios" === _reactNative.Platform.OS ? 3 * parseInt(s.slice(1), 10) : parseInt(s.slice(1), 10), s !== apps.backgroundImageBlur && (_requireConfig.dbs.setUserProfile({
          backgroundImageBlur: s
        })["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "sync backgroundImageBlur", e);
        }), apps.emit("backgroundImageBlurChanged"))), !!a != !!apps.tester && ((0, _requireConfig.tlog)("tester mode change", a, apps.tester), _requireConfig.dbs.setUserProfile({
          tester: a ? 1 : 0
        }).then(function () {
          apps.reloadHvdown();
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "importantSync", e);
        })), void 0 === i && apps.suidCnt === i || (apps.suidCnt = 0, apps.emit("aboutMeUnreadChanged"), apps.onChangeSuidCnt && apps.onChangeSuidCnt()), !!o != !!apps.isOb && _requireConfig.dbs.setUserProfile({
          isOb: o ? 1 : 0
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "setUserProfile isOb", o, e);
        }), r !== apps.lucksLimit && _requireConfig.dbs.setUserProfile({
          lucksLimit: r
        })["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "startImportantSync lucksLimit=" + r, e);
        }), (t.length !== apps.lucks.length || t.some(function (e, r) {
          return e !== apps.lucks[r];
        })) && _requireConfig.dbs.setUserProfile({
          lucks: t
        })["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "startImportantSync lucks=" + t, e);
        }), n && (_requireConfig.dbs.setUserProfile({
          cloudRepoSize: n
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "setCloudRepoSize", e);
        }), apps.onChangeCloudRepoSize && apps.onChangeCloudRepoSize()), apps.importantSync = !0, apps.importantSyncFirst = !0, o && apps.startRandTimer(), apps.syncFriends({});
      }).then(function () {}).then(function () {
        return e();
      })["catch"](function (r) {
        (0, _requireConfig.tlog)("error", "importantSync", r), e();
      });
    });
  }, apps.handleMsgerUrls = function (e) {
    var r = [],
      t = [],
      n = [],
      i = {};
    i["vurls_" + apps.dataCenter + "_" + apps.runMode] = e.vurls, e.murls && (e.murls.forEach(function (e) {
      for (var r = e.split(":"), t = parseInt(r[2], 10), i = parseInt(r[1], 10), s = 0; t > s; s++) {
        var a = i + s;
        n.push(r[0] + ":" + a);
      }
    }), i["murls_" + apps.dataCenter + "_" + apps.runMode] = n, apps.murls = n, i.vurls = e.vurls), e.durls && (e.durls.forEach(function (e) {
      for (var t = e.split(":"), n = parseInt(t[2], 10), i = parseInt(t[1], 10), s = 0; n > s; s++) {
        var a = i + s;
        r.push(t[0] + ":" + a);
      }
    }), i["durls_" + apps.dataCenter + "_" + apps.runMode] = r, apps.durls = r, i.vurls = e.vurls), e.hurls && (e.hurls.forEach(function (e) {
      for (var r = e.split(":"), n = parseInt(r[2], 10), i = parseInt(r[1], 10), s = 0; n > s; s++) {
        var a = i + s;
        t.push(r[0] + ":" + a);
      }
    }), i["hurls_" + apps.dataCenter + "_" + apps.runMode] = t, apps.hurls = t, i.vurls = e.vurls), apps.setSharedParas(i)["catch"](function (e) {
      return (0, _requireConfig.tlog)("error", "handleMsgerUrls", e);
    });
  }, apps.addftagDiag = function (e) {
    apps.diag({
      header: (0, _requireConfig.tr)("Add Info"),
      content: (0, _requireConfig.tr)("Add some informations"),
      textInputs: [{
        placeholder: (0, _requireConfig.tr)("Info Name..."),
        value: apps.profiles[e] && apps.profiles[e].ftag || "",
        maxLength: 30
      }],
      buttons: [{
        text: (0, _requireConfig.tr)("Cancel"),
        onPress: function () {
          return apps.closeDiag();
        }
      }, {
        text: (0, _requireConfig.tr)("Ok"),
        onPress: function (r) {
          var t = r.state.textInputs[0].value;
          apps.closeDiag(function () {
            _requireConfig.dbs.setProfile(e, {
              ftag: t
            }).then(function () {
              apps.emit("userNameChanged_" + e, null, !0), apps.loadProfile(e);
            })["catch"](function (r) {
              (0, _requireConfig.tlog)("error", "addftagDiag", e, t, r);
            });
          });
        }
      }]
    });
  }, apps.refuseStockMsg = function (e) {
    var r = apps.msgsData[e.fid][0];
    apps.msgsData[e.fid] = [], e.stopLoad = !0, e.scrollToBottom({
      animated: !1
    }), apps.emit("msgsDataChanged_" + e.fid), e.fidUninit();
    var t = r.fromId;
    apps.send("refuseStockMsg", {
      fromId: t,
      type: apps.refuseStockType
    }).then(function (r) {
      return apps.refuseStockType = r.type, r.session ? _requireConfig.dbs.setUserProfile({
        stockSession: r.session
      }).then(function () {
        return apps.loadStockSession(e);
      }) : _requireConfig.dbs.delUserProfile("stockSession");
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "refuseStockMsg", e);
    });
  }, apps.stopStockMsg = function (e) {
    apps.msgsData[e.fid] = [], e.stopLoad = !0, e.scrollToBottom({
      animated: !1
    }), apps.emit("msgsDataChanged_" + e.fid), e.fidUninit();
    var r = e.friend.shareId,
      t = e.friend.stockSessionTime,
      n = e.chatSession;
    apps.send("stopStockMsg", {
      shareId: r,
      chatSession: n,
      time: t
    }).then(function (r) {
      return apps.refuseStockType = r.type, r.session ? _requireConfig.dbs.setUserProfile({
        stockSession: r.session
      }).then(function () {
        return apps.loadStockSession(e);
      }) : _requireConfig.dbs.delUserProfile("stockSession");
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "stopStockMsg", e);
    });
  }, apps.passStockMsg = function (e) {
    apps.msgsData[e.fid] = [], e.stopLoad = !0, e.scrollToBottom({
      animated: !1
    }), apps.emit("msgsDataChanged_" + e.fid), e.fidUninit();
    var r = e.friend.shareId,
      t = e.friend.stockSessionTime,
      n = e.chatSession;
    apps.send("passStockMsg", {
      shareId: r,
      chatSession: n,
      time: t
    }).then(function (r) {
      return apps.refuseStockType = r.type, r.session ? _requireConfig.dbs.setUserProfile({
        stockSession: r.session
      }).then(function () {
        return apps.loadStockSession(e);
      }) : _requireConfig.dbs.delUserProfile("stockSession");
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "passStockMsg", e);
    });
  }, apps.loadStockSession = function (e) {
    return new Promise(function (r, t) {
      var n = function (t) {
        var n = t.chatSession,
          i = t.shareId,
          s = t.time;
        if ("2:" === i.slice(0, 2)) {
          var a = i;
          d = i, i = i, n = i, u = apps.userid;
          var o = 4;
        } else {
          var p = n.split(":");
          if (a = apps.splitShareId(i).shareFrom, o = i === n ? 3 : 2, p[0] === a) var u = p[1] || p[0],
            d = p[0];else u = p[0], d = p[1] || p[0];
        }
        var c = {
          msgid: "",
          shareId: i,
          descType: 1,
          time: apps.now(),
          descCategory: o,
          desc: "",
          friendId: a,
          fromId: u,
          toId: d,
          shareFrom: a,
          type: 7,
          isStock: 1,
          chatSession: n,
          stockSessionTime: s
        };
        e.friend = c, e.myselfId = c.fromId, e.fid = c.shareId, e.props.route.friend = c, delete apps.msgsData[e.fid], delete apps.msgsLoadPos[e.fid], delete e.stopLoad, e.start(), e.fidInit(), r(c);
      };
      apps.stockSession ? n(apps.stockSession) : apps.send("fetchStockSession").then(function (e) {
        return e.session ? ((0, _requireConfig.tlog)("fetchStockSession", e), n(e.session), _requireConfig.dbs.setUserProfile({
          stockSession: e.session
        })) : void r();
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "loadStockSession", e), t(e);
      });
    });
  }, apps.startRandTimer = function () {
    var e = function () {
      return apps.noRandTimer ? void clearInterval(apps.randTimer) : void apps.send("fetchRandTime").then(function (e) {
        var r = !1,
          t = e.lastReportTime,
          n = e.lastRandTime,
          i = e.lastRegisterTime,
          s = e.lastCirallTime,
          a = e.lastForbidTime,
          o = e.lastStockMsgTime;
        if (t && t > (apps.lastReportTime || 0)) {
          var p = !0;
          r = !0, _requireConfig.dbs.setUserProfile({
            lastReportTime: t
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "lastReportTime", t, e);
          });
        }
        if (n && n > (apps.lastRandTime || 0)) {
          var u = !0;
          r = !0, _requireConfig.dbs.setUserProfile({
            lastRandTime: n
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "lastRandTime", n, e);
          });
        }
        if (i && i > (apps.lastRegisterTime || 0)) {
          var d = !0;
          r = !0, _requireConfig.dbs.setUserProfile({
            lastRegisterTime: i
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "lastRegisterTime", i, e);
          });
        }
        if (s && s > (apps.lastCirallTime || 0)) {
          var c = !0;
          r = !0, _requireConfig.dbs.setUserProfile({
            lastCirallTime: s
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "lastCircleTime", s, e);
          });
        }
        if (a && a > (apps.lastForbidTime || 0)) {
          var f = !0;
          r = !0, _requireConfig.dbs.setUserProfile({
            lastForbidTime: a
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "lastForbidTime", a, e);
          });
        }
        if (o && o > (apps.lastStockMsgTime || 0)) {
          var l = !0;
          r = !0, _requireConfig.dbs.setUserProfile({
            lastStockMsgTime: o
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "lastStockMsgTime", o, e);
          });
        }
        return r ? apps.syncFriends({
          shouldFetchReport: p,
          shouldFetchRand: u,
          shouldFetchReg: d,
          shouldFetchCirall: c,
          shouldFetchForbid: f,
          shouldFetchStockMsg: l
        }) : void 0;
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "startRandTimer", e);
      });
    };
    clearInterval(apps.randTimer), apps.randTimer = setInterval(e, apps.randTimerIntv || 1e3);
  }, apps.addObs = function (e) {
    return apps.isOb ? _requireConfig.db.transaction(function (r) {
      var t = function (t, n, i, s) {
        if (!e.hasSync) {
          var a = {
            msgid: "",
            shareId: "",
            type: 1,
            time: i,
            category: 1,
            fromId: "",
            toId: t,
            shareFrom: "",
            text: n,
            userid: t,
            ftype: s
          };
          apps.friendsUnread[t] ? apps.friendsUnread[t].push(a) : apps.friendsUnread[t] = [a], apps.friendsUnreadList.push(a);
        }
        r.executeSql("\n          INSERT OR REPLACE INTO Friends (\n            userid, friendId, name, avatar, type, time, desc, descType, descCategory,\n            shareId, msgid, phoneNum, toId, fromId, shareFrom)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n        ", [apps.userid, t, "", "", s, i, n, 1, 1, "", "", "", t, "", ""]);
      };
      (e.hasSync || e.shouldFetchReport) && t("4:" + apps.userid, "New Report", apps.now() + 1, apps.CONS_SEL_REPORT), (e.hasSync || e.shouldFetchRand) && (t("5:" + apps.userid, "New Rand", apps.now() + 2, apps.CONS_SEL_RAND), t("c:" + apps.userid, "New Match", apps.now() + 7, apps.CONS_SEL_MATCH)), (e.hasSync || e.shouldFetchForbid) && t("6:" + apps.userid, "New Forbid", apps.now() + 3, apps.CONS_SEL_FORBID), (e.hasSync || e.shouldFetchStockMsg) && t("7:" + apps.userid, "New Smsg", apps.now() + 4, apps.CONS_SEL_SMSG), (e.hasSync || e.shouldFetchReg) && t("a:" + apps.userid, "New Audit", apps.now() + 5, apps.CONS_SEL_AUDIT), (e.hasSync || e.shouldFetchCirall) && t("b:" + apps.userid, "New Cirall", apps.now() + 6, apps.CONS_SEL_CIRALL);
    }) : void 0;
  }, apps.syncFriends = function (e) {
    return new Promise(function (r, t) {
      _requireConfig.dbs.getUserProfile("friendsSync").then(function (r) {
        return !r && apps.showCmdBall ? (e.hasSync = !0, (0, _requireConfig.blog)("sys"), apps.send("syncFriends", {
          sendTimeoutIntv: 3e4
        }).then(function (e) {
          return _requireConfig.dbs.rebuildFriendsInDb(e.friends);
        }).then(function () {
          return _requireConfig.dbs.setUserProfile({
            friendsSync: 1
          });
        })) : void 0;
      }).then(function () {
        return "^1" === apps.userid.slice(-2) ? apps.addShadowTip() : void 0;
      }).then(function () {
        return apps.addObs(e);
      }).then(function () {
        return apps.loadFriendsData();
      }).then(function () {
        (0, _requireConfig.blog)(), apps.emit("friendsUnreadChanged"), r();
      })["catch"](function (e) {
        (0, _requireConfig.blog)(), (0, _requireConfig.tlog)("error", "syncFriends", e), t(e);
      });
    });
  }, apps.startSync = function () {
    return new Promise(function (e, r) {
      Date.now() - apps.lastChangeToBackgroundTime < 1e3 ? e() : Promise.resolve().then(function () {
        return apps.showCmdBall && Date.now() - apps.lastChangeToBackgroundTime > 1e3 ? apps.send("syncEmo", {
          emosTrack: apps.emosTrack,
          sendTimeoutIntv: 3e4
        }).then(function (e) {
          if (e.emosTrack) {
            var r = e.emosTrack,
              t = e.emos,
              n = e.emosOrder;
            return _requireConfig.dbs.setUserProfile({
              emosTrack: r,
              emos: t,
              emosOrder: n
            });
          }
        }).then(function () {
          return apps.send("syncMyEmo", {
            myEmosTrack: apps.myEmosTrack,
            sendTimeoutIntv: 1e4
          });
        }).then(function (e) {
          if (e.myEmosTrack) {
            var r = e.myEmosTrack,
              t = e.myEmos;
            return _requireConfig.dbs.setUserProfile({
              myEmosTrack: r,
              myEmos: t
            });
          }
        }) : void 0;
      }).then(function () {}).then(function () {
        apps.fetchMultiLoginsCnt(), apps.syncFinished = !0, e();
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "startSync", e);
      });
    });
  }, apps.fetchWebServiceGifAutocomplete = function (e) {
    var r = (e.type, e.q),
      t = e.reopen,
      n = e.inputAction;
    e.timer;
    if (apps.lastFetchWebServiceGifAutocompleteQ = r, t) return void apps.emit("webServiceGifAutoCompleteChanged");
    if (r) i = "https://api.tenor.com/v1/autocomplete?key=42XPBRAPAQS0&limit=50&tag=" + encodeURIComponent(r);else {
      (n || 0 === apps.webGifAutoCompleteResults.length) && (apps.webGifAutoCompleteResults = [{
        icon: "md-heart",
        text: (0, _requireConfig.tr)("My Favor")
      }]), apps.emit("webServiceGifAutoCompleteChanged");
      var i = "https://api.tenor.com/v1/autocomplete?key=42XPBRAPAQS0&limit=50";
    }
    i += "&locale=" + apps.locale, i += "&anon_id=" + apps.pubid, apps.lastWebGifAutoCompleteUrl = i, apps.fetchWithTimoutRetry(i, {}, !1).then(function (e) {
      return e.json();
    }).then(function (e) {
      apps.lastFetchWebServiceGifAutocompleteQ === r && (apps.webGifAutoCompleteResults = [{
        icon: "md-heart",
        text: (0, _requireConfig.tr)("My Favor")
      }].concat(e.results || []), apps.emit("webServiceGifAutoCompleteChanged"));
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "fetchTenor autocomplete url=" + i, e);
    });
  }, apps.deleteGifFavor = function (e) {
    return _requireConfig.db.executeSql("DELETE FROM GifFavor WHERE uri=?", [e]).then(function () {
      return apps.send("deleteGifFavor", {
        uri: e
      });
    })["catch"](function (r) {
      (0, _requireConfig.tlog)("error", "deleteGifFavor", e, r);
    });
  }, apps.addGifToFavor = function (e, r, t, n, i) {
    var s = Date.now(),
      a = apps.webServiceGifData.findIndex(function (r) {
        return r.url === e;
      });
    -1 !== a && apps.webServiceGifData.splice(a, 1), apps.webServiceGifData = [{
      url: e,
      dims: [r, t],
      size: n
    }].concat(apps.webServiceGifData), apps.emit("webServiceGifDataReady"), _requireConfig.db.executeSql("INSERT INTO GifFavor (uri, width, height, time, size) VALUES(?, ?, ?, ?, ?)", [e, r, t, s, n]).then(function () {
      return i && i(), apps.send("addGifToFavor", {
        uri: e,
        width: r,
        height: t,
        time: s,
        size: n
      });
    })["catch"](function (n) {
      (0, _requireConfig.tlog)("error", "addGifToFavor(" + e + ", " + r + ", " + t + ")", n);
    });
  }, apps.isGifFavor = function (e) {
    return new Promise(function (r, t) {
      _requireConfig.db.executeSql("SELECT * FROM GifFavor WHERE uri=?", [e]).then(function (e) {
        r(e[0].rows.length ? !0 : !1);
      })["catch"](function (t) {
        (0, _requireConfig.tlog)("error", "isGifFavor", e, t), r(!1);
      });
    });
  }, apps.fetchWebServiceGifData = function (e) {
    var r = e.type,
      t = e.startup,
      n = e.searchKey,
      i = e.reopen,
      s = Date.now();
    if (r && (r !== apps.webServiceGifType && (apps.webServiceGifData = [], "favor" === r ? apps.webServiceGifPos = 0 : apps.webServiceGifPos = ""), apps.webServiceGifType = r), t) {
      if ("favor" === r) apps.webServiceGifData = [], apps.webServiceGifPos = 0, apps.emit("webServiceGifDataReady");else if (apps.webServiceGifData && apps.webServiceGifData.length) {
        if (!(s - apps.lastWebServiceGifInitFetchTime > 72e5 || apps.webServiceGifData.length > 100)) return void apps.emit("webServiceGifDataReady");
        apps.webServiceGifData = [], apps.webServiceGifPos = "";
        var a = !0;
      }
    } else n && ((0, _requireConfig.blog)(""), apps.webServiceGifData = [], apps.webServiceGifPos = "", apps.webServiceGifSearchKey = n);
    if (i && apps.webServiceGifData && apps.webServiceGifData.length > 0) return void apps.emit("webServiceGifDataReady");
    if ("tenor" === apps.webServiceGifType) {
      var o = function () {
        apps.fetchWithTimoutRetry(p, {}, !1).then(function (e) {
          return e.json();
        }).then(function (e) {
          (0, _requireConfig.blog)();
          var r = [];
          if (e.results ? e.results.forEach(function (e) {
            -1 === apps.webServiceGifData.slice(-100).findIndex(function (r) {
              return r.nanogif && r.nanogif.url === e.media[0].nanogif.url;
            }) && r.push({
              nanogif: e.media[0].nanogif,
              tinygif: e.media[0].tinygif
            });
          }) : (0, _requireConfig.tlog)("error", "fetch Tenor failed"), apps.webServiceGifData = apps.webServiceGifData.concat(r), apps.webServiceGifPos = e.next, apps.emit("webServiceGifDataReady"), apps.nextWebGifFetchCallback) {
            var t = apps.nextWebGifFetchCallback;
            delete apps.nextWebGifFetchCallback, t();
          }
          return a ? _requireConfig.dbs.setUserProfile({
            webServiceGifData: apps.webServiceGifData,
            webServiceGifPos: apps.webServiceGifPos,
            lastWebServiceGifInitFetchTime: s
          }) : void 0;
        })["catch"](function (e) {
          (0, _requireConfig.tlog)("error", "fetchTenor", p, e);
        });
      };
      if (apps.webServiceGifSearchKey) var p = "https://api.tenor.com/v1/search?key=42XPBRAPAQS0&q=" + encodeURIComponent(apps.webServiceGifSearchKey) + "&limit=10";else p = "https://api.tenor.com/v1/trending?key=42XPBRAPAQS0&limit=10";
      apps.webServiceGifPos && (p += "&pos=" + apps.webServiceGifPos), p += "&locale=" + apps.locale, p += "&anon_id=" + encodeURIComponent(apps.pubid), p === apps.lastWebGifFetchUrl && (apps.nextWebGifFetchCallback = function () {
        return apps.fetchWebServiceGifData({
          type: r,
          startup: t,
          searchKey: n,
          reopen: i
        });
      }), apps.lastWebGifFetchUrl = p, o();
    } else if ("favor" === apps.webServiceGifType) {
      if (apps.lastWebGifFetchUrl = "", apps.webServiceGifPos || (apps.webServiceGifPos = apps.getHighRandomTime()), apps.lastWebGifFavorFetchTime && apps.lastWebGifFavorFetchTime === apps.webServiceGifPos) return;
      apps.lastWebGifFavorFetchTime = apps.webServiceGifPos, _requireConfig.db.executeSql("\n      SELECT * FROM GifFavor WHERE time < ? ORDER BY time DESC LIMIT ?\n    ", [apps.webServiceGifPos, 10]).then(function (e) {
        for (var r = [], t = !1, n = e[0].rows, i = n.length, s = 0; i > s; s++) {
          var a = n.item(s);
          s !== i - 1 || 0 !== a.time ? (apps.webServiceGifPos = a.time, r.push({
            url: a.uri,
            dims: [a.width, a.height],
            size: a.size
          })) : t = !0;
        }
        return r.length > 0 && (apps.webServiceGifData = apps.webServiceGifData.concat(r), apps.emit("webServiceGifDataReady")), 10 > i && !t ? apps.send("fetchMoreGifFavor", {
          time: apps.webServiceGifPos,
          sendTimeoutIntv: 2e4
        }).then(function (e) {
          return _requireConfig.db.transaction(function (r) {
            var t = [];
            e.results.forEach(function (e) {
              var n = e.uri,
                i = e.width,
                s = e.height,
                a = e.size,
                o = e.time;
              apps.webServiceGifPos = o, t.push({
                url: n,
                dims: [i, s],
                size: a
              }), r.executeSql("\n                INSERT INTO GifFavor(uri, width, height, size, time) VALUES(?, ?, ?, ?, ?)\n              ", [n, i, s, a, o]);
            }), t.length > 0 && (apps.webServiceGifData = apps.webServiceGifData.concat(t), apps.emit("webServiceGifDataReady"));
          }).then(function () {
            return e.results.length < 10 ? _requireConfig.db.executeSql("\n                INSERT INTO GifFavor(uri, width, height, size, time) VALUES(?, ?, ?, ?, ?)\n              ", ["", 0, 0, 0, 0]) : void 0;
          });
        }) : void 0;
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "fetchWebServiceGifData favor", e);
      });
    }
  }, apps.getDeviceContacts = function () {
    return new Promise(function (e, r) {
      if (apps.tmpContactMap) {
        var t = apps.tmpContactMap;
        delete apps.tmpContactMap, e(t);
      } else t = {}, _requireConfig.Contacts.getAll(function (n, i) {
        (0, _requireConfig.tlog)("getDeviceContacts", apps.fnow()), n ? r(n) : (apps.friendsInContacts = [], i.forEach(function (e) {
          e.phoneNumbers.forEach(function (r) {
            var n = r.number.replace(/[^+0-9]/g, "");
            if ("+" !== n[0] && (n = "+86" + n), n !== apps.phoneNum) {
              var i = [];
              e.familyName && i.push(e.familyName), e.middleName && i.push(e.middleName), e.givenName && i.push(e.givenName);
              var s = i.join(" ");
              t[n] = s, apps.friendsInContacts.push({
                type: -6,
                name: s,
                friendId: n,
                pNum: r.number
              }), apps.friendsInContacts.sort(function (e, r) {
                var t = e.name.toUpperCase(),
                  n = r.name.toUpperCase();
                return n > t ? -1 : t > n ? 1 : 0;
              }), s = "";
            }
          });
        }), apps.emit("selectDataPermissionChanged"), e(t));
      });
    });
  }, apps.handleContacts = function () {
    return new Promise(function (e, r) {
      (0, _requireConfig.tlog)("handleContacts", apps.fnow());
      var t = [];
      apps.getDeviceContacts().then(function (e) {
        return apps.contacts = e, _requireConfig.dbs.getUserProfile("contactsSync");
      }).then(function (e) {
        return e ? void 0 : apps.send("contactsSync", {
          sendTimeoutIntv: 2e4
        }).then(function (e) {
          var r = e.phoneNums;
          return _requireConfig.dbs.rebuildContactsInDb(r);
        });
      }).then(function () {
        return _requireConfig.dbs.readContacts();
      }).then(function (e) {
        var r = {};
        for (var n in apps.contacts) void 0 === e[n] && (r[n] = apps.contacts[n]);
        return t = Object.keys(r).sort(), t.length > 0 ? apps.send("handleContacts", {
          newPhoneNumbers: t,
          sendTimeoutIntv: 2e4
        }).then(function () {
          return _requireConfig.dbs.upsertContacts(r);
        })["catch"]((0, _requireConfig.errCb)("send handleContacts")) : void 0;
      }).then(function () {
        return e();
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "handleContacts", e);
      });
    });
  }, apps.updateFriendsAccessTime = function (e) {
    _requireConfig.db.executeSql("UPDATE Friends SET accessTime=? WHERE userid=? AND friendId=?", [apps.now(), apps.userid, e])["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "updateFriendsAccessTime", e);
    });
  }, apps.loadMsgFriendsData = function (e) {
    return new Promise(function (r, t) {
      (0, _requireConfig.tlog)("loadMsgFriendsData", e), _requireConfig.dbs.loadMsgFriendsDataFromDb(e).then(function (r) {
        var t = r[0];
        return t && "" === t.friendId ? (r.shift(), void apps.emit("userListViewDataChanged", "msgFriends_" + e, r)) : ((0, _requireConfig.blog)("sys"), apps.send("fetchMsgFriendsData", {
          userid: e
        }).then(function (r) {
          (0, _requireConfig.blog)(), apps.emit("userListViewDataChanged", "msgFriends_" + e, r.data);
          var t = [{
            userid: e,
            time: 5 * Date.now(),
            shareId: "",
            fromId: "",
            desc: "",
            type: 1,
            descCategory: 2,
            msgid: "",
            toId: "",
            shareFrom: "",
            descType: 1
          }].concat(r.data);
          return _requireConfig.db.transaction(function (e) {
            t.forEach(function (r) {
              var t = r.userid,
                n = r.time,
                i = r.shareId,
                s = r.fromId,
                a = r.desc,
                o = r.descType,
                p = r.descCategory,
                u = r.msgid,
                d = r.toId,
                s = r.fromId,
                c = r.shareFrom,
                f = r.type;
              e.executeSql("\n                INSERT INTO MsgFriends (userid, time, shareId, friendId, desc, descType, descCategory, msgid, toId, fromId, shareFrom, type)\n                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n              ", [t, n, i, s, a, o, p, u, d, s, c, f])["catch"](function (e) {
                (0, _requireConfig.tlog)("error", "loadMsgFriendsData MsgFriends", e);
              });
            });
          });
        }));
      }).then(function () {
        return r();
      }, function (r) {
        (0, _requireConfig.tlog)("error", "loadMsgFriendsData", e, r), (0, _requireConfig.blog)(), t(r);
      });
    });
  }, apps.loadShareFriendsData = function (e) {
    return new Promise(function (r, t) {
      apps.send("syncShareFriends", {
        shareId: e,
        sendTimeoutIntv: 15e3
      }).then(function (e) {
        apps.emit("userListViewDataChanged", "shareFriends", e.friends);
      }).then(r, function (r) {
        (0, _requireConfig.tlog)("error", "loadShareFriendsData", e, r);
      });
    });
  }, apps.loadFriendsData = function (e) {
    return new Promise(function (r, t) {
      e || (e = apps.userid);
      var n = e.slice(0, 2) === apps.CONS_PREFIX_BOTTLE ? "bottleFriends" : "friends";
      "bottleFriends" === n && apps.pickingViewShowing ? apps.loadFriendsDataCb = function () {
        delete apps.loadFriendsDataCb, apps.loadFriendsData(e).then(r, t);
      } : _requireConfig.dbs.loadFriendsDataFromDb(e).then(function (e) {
        var r = function () {
          if ("bottleFriends" === n) {
            var r = e[e.length - 1];
            r && 1 === r.time && e.pop(), apps.bottleFriendsData = e;
          } else apps.friendsData = e;
          apps.auditMode && (apps.friendsData = apps.friendsData.filter(function (e) {
            return !!apps.isIn(e.friendId.slice(0, 2), "4:", "5:", "a:");
          }), e = apps.friendsData), apps.emit("friendsDataLoaded"), apps.emit("userListViewDataChanged", n, e);
        };
        if (apps.showCmdBall && "bottleFriends" === n) {
          if (e.length === apps.CONS_FRIEND_LOAD_LIMIT) r();else {
            var t = e[e.length - 1];
            if (!t || 1 !== t.time) return (0, _requireConfig.blog)("sys"), apps.send("syncBottleFriends", {
              sendTimeoutIntv: 3e4
            }).then(function (t) {
              (0, _requireConfig.blog)(), e = e.concat(t.friends), r();
              var n = e.concat([{
                userid: "3:" + apps.userid,
                friendId: "e;" + apps.userid,
                name: "end",
                avatar: "",
                type: 3,
                time: 1,
                desc: "",
                descType: 1,
                descCategory: 1,
                shareId: "",
                msgid: "",
                phoneNum: "",
                toId: "d;" + apps.userid,
                fromId: "",
                shareFrom: ""
              }]);
              return _requireConfig.dbs.rebuildFriendsInDb(n, "3:" + apps.userid);
            });
            e.pop(), r();
          }
        } else r();
      }).then(function () {
        return r();
      }, function (r) {
        (0, _requireConfig.tlog)("error", "loadFriendsData", e, r), (0, _requireConfig.blog)(), t(r);
      });
    });
  }, apps.loadFriendsDataAsync = function (e) {
    apps.loadFriendsData(e)["catch"](function (r) {
      (0, _requireConfig.tlog)("error", "laodFriendsDataAsync", e, r);
    });
  }, apps.addSessionMsgTx = function (e, r, t) {
    e || (e = _requireConfig.db), r.forEach(function (r) {
      var n = function (r, n) {
        var p = r.type;
        if (p === apps.CONS_MSG_TYPE_IMAGE) {
          var u = r.shareId,
            d = r.msgid,
            c = r.category,
            f = r.imgId,
            l = r.ext,
            g = r.size,
            h = r.width,
            m = r.height,
            C = r.rawImgId,
            _ = r.time;
          r.uri;
          if (n ? (s = r.toId, a = r.fromId, i = r.sessionId || r.shareId) : _ = o - r.addIdx, !I) if (C) var S = C.split(":"),
            v = babelHelpers.slicedToArray(S, 4),
            I = v[0],
            w = v[1],
            q = v[2],
            b = v[3],
            T = I.split(".")[1];else I = "", T = "", w = 0, q = 0, b = 0;
          if (t && apps.sessionFilesCache[i]) {
            var E = {
                sessionId: i,
                type: p,
                imgId: f,
                ext: l,
                size: g,
                width: h,
                height: m,
                time: _,
                rawImgId: I,
                rawExt: T,
                rawSize: w,
                rawWidth: q,
                rawHeight: b,
                fromId: a,
                toId: s,
                shareId: u,
                msgid: d,
                category: c
              },
              P = apps.sessionFilesCache[i].findIndex(function (e) {
                return e.time <= _;
              });
            -1 !== P ? apps.sessionFilesCache[i][P].time !== _ && apps.sessionFilesCache[i].splice(P, 0, E) : apps.sessionFilesCache[i].push(E);
          }
          e.executeSql("\n          INSERT OR IGNORE INTO SessionFiles (\n            sessionId, type, imgId, ext, size, width, height, time,\n            rawImgId, rawExt, rawSize, rawWidth, rawHeight, fromId, \n            toId, shareId, msgid, category\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [i, p, f, l, g, h, m, _, I, T, w, q, b, a, s, u, d, c])["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "addSessionMsg 1", r, e);
          });
        } else if (p === apps.CONS_MSG_TYPE_VIDEO) {
          var u = r.shareId,
            d = r.msgid,
            c = r.category,
            f = r.imgId,
            g = r.size,
            h = r.width,
            m = r.height,
            C = r.rawImgId,
            _ = r.time;
          n ? (s = r.toId, a = r.fromId, i = r.sessionId || r.shareId) : _ = o - r.addIdx;
          var l = f.split(".")[1],
            T = C.split(".")[1];
          if (t && apps.sessionFilesCache[i]) {
            var E = {
                sessionId: i,
                type: p,
                imgId: f,
                ext: l,
                size: g,
                width: h,
                height: m,
                time: _,
                rawImgId: C,
                rawExt: T,
                rawSize: 0,
                rawWidth: 0,
                rawHeight: 0,
                fromId: a,
                toId: s,
                shareId: u,
                msgid: d,
                category: c
              },
              P = apps.sessionFilesCache[i].findIndex(function (e) {
                return e.time < _;
              });
            -1 !== P ? apps.sessionFilesCache[i][P].time !== _ && apps.sessionFilesCache[i].splice(P, 0, E) : apps.sessionFilesCache[i].push(E);
          }
          e.executeSql("\n          INSERT OR IGNORE INTO SessionFiles (\n            sessionId, type, imgId, ext, size, width, height, time,\n            rawImgId, rawExt, rawSize, rawWidth, rawHeight, fromId, \n            toId, shareId, msgid, category\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [i, p, f, l, g, h, m, _, C, T, 0, 0, 0, a, s, u, d, c])["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "addSessionMsg 2", r, e);
          });
        }
      };
      if (r.msgs) {
        var i = r.toId,
          s = r.toId,
          a = r.fromId,
          o = r.time;
        r.msgs.forEach(function (e) {
          return n(e);
        });
      } else n(r, !0);
    });
  }, apps.addSessionMsg = function (e, r) {
    return new Promise(function (t, n) {
      _requireConfig.db.transaction(function (t) {
        apps.addSessionMsgTx(t, e, r);
      }).then(function () {
        t();
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "addSessionMsg", e), t(e);
      });
    });
  }, apps.deleteSessionMsg = function (e) {
    return new Promise(function (r, t) {
      _requireConfig.db.transaction(function (r) {
        Array.isArray(e) || (e = [e]), e.forEach(function (e) {
          if (e.msgs) var t = e.toId,
            n = e.time,
            i = e.msgs;else {
            var t = e.shareId,
              s = e.time;
            i = [e];
          }
          i.forEach(function (i) {
            if (e.msgs && (s = n - i.addIdx), apps.sessionFilesCache[t]) {
              var a = apps.sessionFilesCache[t].findIndex(function (e) {
                return e.time === s;
              });
              -1 !== a && apps.sessionFilesCache[t].splice(a, 1);
            }
            r.executeSql("\n              DELETE FROM SessionFiles WHERE sessionId=? AND time=?\n            ", [t, s])["catch"](function (e) {
              (0, _requireConfig.tlog)("error", "1 deleteSessionMsg", i, e);
            });
          });
        });
      }).then(function () {
        r();
      })["catch"](function (t) {
        (0, _requireConfig.tlog)("error", "deleteSessionMsg", e, t), r(t);
      });
    });
  }, apps.loadSessionFiles = function (e) {
    return new Promise(function (r, t) {
      var n = apps.curSessionId,
        i = apps.sessionFetchLimit,
        s = apps.sessionFilesCache[n],
        a = s.length - e.index,
        o = "chat" === apps.curSessionType ? apps.curSessionFriendId : null;
      a >= i ? (r(s.slice(e.index, e.index + i)), !apps.sessionFilesCacheEnded[n] && i > a - i && apps.fetchSessionFiles(n, !1, o)["catch"](function (e) {
        return (0, _requireConfig.tlog)("error", "fetchSessionFiles 1", e);
      })) : apps.sessionFilesCacheEnded[n] ? r(s.slice(e.index, e.index + i)) : apps.fetchSessionFiles(n, !1, o).then(function () {
        r(s.slice(e.index, e.index + i));
      })["catch"](function (e) {
        return (0, _requireConfig.tlog)("error", "fetchSessionFiles 2", e);
      });
    });
  }, apps.checkSessionFilesCleared = function (e) {
    var r = apps.curSessionId;
    apps.sessionFilesCache[r] || (apps.sessionFilesCache[r] = [], delete apps.sessionFilesCacheEnded[r], apps.sessionFileRenderedIndex[r] = 0, e ? apps.fetchSessionFiles(r, !0) : apps.fetchSessionFiles(r, !0, apps.curSessionFriendId));
  }, apps.fetchSessionFiles = function (e, r, t) {
    return new Promise(function (n, i) {
      if (apps.lock(e)) {
        var s = apps.sessionFilesCache[e];
        if (r && s.length - apps.sessionFileRenderedIndex[e] > apps.sessionFetchLimit) return void apps.unlock(e);
        var a = s[s.length - 1],
          o = a ? a.time : apps.now();
        _requireConfig.db.executeSql("\n        SELECT * FROM SessionFiles WHERE sessionId = ? AND time < ? ORDER BY time DESC LIMIT ?\n      ", [e, o, apps.sessionFetchLimit]).then(function (r) {
          if (s === apps.sessionFilesCache[e]) {
            var i = r[0].rows,
              a = i.length;
            if (a > 0) for (var p = [], u = 0; a > u; u++) {
              var d = i.item(u);
              if (u === a - 1 && d && 0 === d.time) {
                apps.sessionFilesCacheEnded[e] = !0;
                break;
              }
              p.push(d);
            }
            if (a === apps.sessionFetchLimit || apps.sessionFilesCacheEnded[e]) s.push.apply(s, p), apps.unlock(e), n();else if (a < apps.sessionFetchLimit) {
              var c = {
                sessionId: e,
                time: o,
                limit: apps.sessionFetchLimit,
                sendTimeoutIntv: 15e3
              };
              return t && (c.friendId = t), (apps.showCmdBall ? apps.send("fetchSessionFiles", c) : Promise.resolve({
                files: []
              })).then(function (r) {
                return r.files ? (r.files.length < apps.sessionFetchLimit && (apps.sessionFilesCacheEnded[e] = !0, r.files.push({
                  sessionId: e,
                  time: 0,
                  type: apps.CONS_MSG_TYPE_IMAGE
                })), apps.addSessionMsg(r.files).then(function () {
                  s === apps.sessionFilesCache[e] && (r.files.pop(), s.push.apply(s, babelHelpers.toConsumableArray(r.files)));
                })) : void 0;
              }).then(function () {
                apps.unlock(e), n();
              });
            }
          }
        })["catch"](function (r) {
          apps.unlock(e), (0, _requireConfig.tlog)("error", "fetchSessionFiles", r), i(r);
        });
      } else apps.addLockCb(e, function () {
        return apps.fetchSessionFiles(e, r, t).then(n, i);
      });
    });
  }, apps.pinOnTop = function (e, r) {
    return apps.send("pinOnTop", {
      friendId: e,
      userid: r
    }).then(function (t) {
      return _requireConfig.db.executeSql("\n      UPDATE Friends SET pin=1, time=? WHERE userid=? AND friendId=?\n    ", [Date.now(), r, e]);
    }).then(function (e) {
      return apps.loadFriendsData(r);
    });
  }, apps.unpinOnTop = function (e, r) {
    return e === apps.USERID_ALERT ? (apps.tip((0, _requireConfig.tr)("Important alert cannot be unpined")), Promise.resolve()) : e === apps.USERID_RES ? (apps.tip((0, _requireConfig.tr)("User response session cannot be unpined")), Promise.resolve()) : apps.send("unpinOnTop", {
      friendId: e,
      userid: r
    }).then(function (t) {
      return _requireConfig.db.executeSql("\n      UPDATE Friends SET pin=0, time=? WHERE userid=? AND friendId=?\n    ", [Date.now(), r, e]);
    }).then(function (e) {
      return apps.loadFriendsData(r);
    });
  }, apps.clearDeletedMsgs = function () {
    apps.msgsDataDeletedFid && apps.msgsData[apps.msgsDataDeletedFid] && (apps.msgsData[apps.msgsDataDeletedFid] = apps.msgsData[apps.msgsDataDeletedFid].filter(function (e) {
      return !(e.msgid in apps.msgsDataDeleted[apps.msgsDataDeletedFid]);
    }), delete apps.msgsDataDeleted[apps.msgsDataDeletedFid], delete apps.msgsDataDeletedFid);
  }, apps.clearDeletedShares = function () {
    for (var e in apps.sharesDataDeleted) {
      if (apps.sharesData[e]) {
        var r = !1;
        apps.sharesData[e] = apps.sharesData[e].filter(function (t) {
          return t.shareId in apps.sharesDataDeleted[e] ? (r = !0, !1) : !0;
        }), r && apps.emit("rerenderSharesData_" + e);
      }
      delete apps.sharesDataDeleted[e];
    }
  }, apps.removeMsgNewMark = function (e) {
    return new Promise(function (r, t) {
      _requireConfig.db.executeSql("UPDATE Msgs SET isnew=? WHERE msgid=?", [0, e]).then(function () {
        return r();
      })["catch"]((0, _requireConfig.errCb)("removeMsgNewMark " + e));
    });
  }, apps.removeShareNewMark = function (e, r) {
    return new Promise(function (t, n) {
      r = JSON.stringify(r), _requireConfig.db.executeSql("UPDATE Shares SET msgs=? WHERE shareId=?", [r, e]).then(function () {
        return t();
      })["catch"]((0, _requireConfig.errCb)("removeShareNewMark " + e + " " + r));
    });
  }, apps.agreeInviteConfirm = function (e, r) {
    var t = apps.msgsData[e].findIndex(function (e) {
        return e.msgid === r;
      }),
      n = (0, _requireConfig.tr)("Agreed"),
      i = babelHelpers["extends"]({}, apps.msgsData[e][t], {
        text: n,
        type: 5
      });
    apps.msgsData[e].splice(t, 1, i), apps.emit("rerenderMsgsData_" + e), apps.send("agreeInviteConfirm", {
      friendId: i.fromId,
      msgid: apps.getNewMsgId(),
      shareId: apps.getNewShareId(),
      text: (0, _requireConfig.tr)("Approved your invitor request")
    }).then(function (e) {
      return _requireConfig.db.executeSql("\n      UPDATE Msgs SET type=5, text=? WHERE msgid=?\n    ", [n, r]);
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("error", "agreeInviteConfirm", e), apps.tip((0, _requireConfig.tr)("Connection Failed"), 1);
    });
  }, apps.refuseInviteConfirm = function (e, r) {
    var t = apps.msgsData[e].findIndex(function (e) {
        return e.msgid === r;
      }),
      n = (0, _requireConfig.tr)("Refused"),
      i = babelHelpers["extends"]({}, apps.msgsData[e][t], {
        text: n,
        type: 5
      });
    apps.msgsData[e].splice(t, 1, i), apps.emit("rerenderMsgsData_" + e), _requireConfig.db.executeSql("\n    UPDATE Msgs SET type=5, text=? WHERE msgid=?\n  ", [n, r])["catch"]((0, _requireConfig.errCb)("refuseInviteConfirm"));
  }, apps.serverRejectTrans = function (e, r) {
    if (!e.replyReject) return !1;
    if ("maxSend" === e.replyReject) r.text = (0, _requireConfig.tr)("Cannot send before reply"), apps.tip((0, _requireConfig.tr)("Cannot send before reply"));else if ("noConti" === e.replyReject) r.text = (0, _requireConfig.tr)("Can only send one message before mutual stared");else {
      if ("mutualNo" === e.replyReject) return void apps.tip((0, _requireConfig.tr)("Cannot send message before mutual stared"));
      if ("notInGroup" === e.replyReject) r.text = (0, _requireConfig.tr)("You have been removed from the group"), apps.diag({
        header: (0, _requireConfig.tr)("Tip"),
        content: (0, _requireConfig.tr)("You have been removed from the group"),
        buttons: [{
          text: (0, _requireConfig.tr)("Ok"),
          onPress: function () {
            apps.closeDiag(function () {
              apps.deleteGroup(r.toId), apps.curNavigator.navi.navToTop();
            });
          }
        }]
      });else if ("nobottle" === e.replyReject) r.text = (0, _requireConfig.tr)("The account has been forbidden."), apps.popTip((0, _requireConfig.tr)("The account has been forbidden."));else if ("blockInGroup" === e.replyReject) r.text = (0, _requireConfig.tr)("You are blocked in the group");else if ("shareDeleted" === e.replyReject) r.text = (0, _requireConfig.tr)("The sender has deleted this story");else {
        if ("isBlocked" === e.replyReject) return void apps.tip((0, _requireConfig.tr)("You have been blocked"));
        if ("firstNo" === e.replyReject) return void apps.tip((0, _requireConfig.tr)("Can only send one message when first reply"));
        "notFriend" === e.replyReject ? r.text = (0, _requireConfig.tr)("You have been deleted") : "isRC" === e.replyReject ? r.text = (0, _requireConfig.tr)("isRC") : "notMatch" === e.replyReject ? r.text = (0, _requireConfig.tr)("Not match") : "overflow" === e.replyReject && (r.text = (0, _requireConfig.tr)("overflow"));
      }
    }
    return !0;
  }, apps.isDataFromGroup = function (e) {
    if ("2:" === e.toId.slice(0, 2)) return e.toId;
    if ("string" == typeof e.target && "2:" === e.target.slice(0, 2)) return e.target;
    if (Array.isArray(e.target)) for (var r = 0; r < e.target.length; r++) if ("2:" === e.target[r].slice(0, 2)) return e.target[r];
    return !1;
  }, apps.handleServerReject = function (e, r) {
    if (e.replyReject) {
      var t = r.fromId,
        n = r.toId,
        i = r.category,
        s = r.shareId,
        a = r.fid,
        o = {
          msgid: apps.getNewMsgId(),
          fromId: t,
          toId: n,
          shareId: s,
          stat: 2,
          time: apps.now(),
          category: i,
          type: apps.CONS_MSG_TYPE_TIP,
          shareFrom: t
        };
      return o.chatSession = apps.getChatSession(n, t), apps.serverRejectTrans(e, o) && (apps.msgsData[a] && (apps.msgsData[a] = [o].concat(apps.msgsData[a]), apps.emit("rerenderMsgsData_" + a)), _requireConfig.dbs.insertNewMsg(o)["catch"]((0, _requireConfig.errCb)("handleServerReject")), "nobottle" === e.replyReject && _requireConfig.dbs.deleteMsg(r).then(function () {
        return apps.deleteSessionMsg(r);
      })["catch"](function (t) {
        (0, _requireConfig.tlog)("error", "handleServerReject nobottle", e, r, t);
      })), !0;
    }
  }, apps.createGroup = function (e) {
    var r = e.members,
      t = e.name,
      n = e.avatarData;
    return new Promise(function (e, i) {
      r = r.map(function (e) {
        return e.friendId;
      });
      var s = apps.getNewMsgId(),
        a = apps.profiles[apps.userid].background;
      apps.send("createGroup", {
        msgid: s,
        members: r,
        name: t,
        avatarData: n,
        background: a
      }).then(function (e) {
        if (e.overflow || e.nameExist) return void i(e);
        var n = e.groupId;
        e.chatId;
        return apps.newCreatedGroups[n] = !0, _requireConfig.db.transaction(function (e) {
          var s = (0, _requireConfig.tr)("New created group");
          e.executeSql("\n          INSERT OR REPLACE INTO Friends \n            (userid, friendId, type, time, desc, descType, descCategory,\n            shareId, msgid, phoneNum, toId, fromId, shareFrom, name)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n        ", [apps.userid, n, 2, apps.now(), s, 1, 4, n, "", "", n, apps.userid, apps.userid, t])["catch"]((0, _requireConfig.errCb)("create group friend(" + n + ") failed", i));
          var a = apps.now(),
            o = function (r, t, s) {
              e.executeSql("INSERT INTO GroupMembers (groupId, userid, level, time) VALUES (?, ?, ?, ?)", [n, r, t, s++])["catch"]((0, _requireConfig.errCb)("insert groupId(" + n + ") userid(" + r + " failed", i));
            };
          o(apps.userid, 0, a++), r.forEach(function (e) {
            return o(e, 1, a);
          });
        }).then(function () {
          return apps.loadFriendsData();
        });
      }).then(function () {
        return e();
      })["catch"]((0, _requireConfig.errCb)("createGroup", i));
    });
  }, apps.deleteGroupDiag = function (e) {
    apps.diag({
      header: (0, _requireConfig.tr)("Tip"),
      content: (0, _requireConfig.tr)("Are you sure to quit the group?"),
      buttons: [{
        text: (0, _requireConfig.tr)("Cancel"),
        onPress: function (e) {
          return apps.closeDiag();
        }
      }, {
        text: (0, _requireConfig.tr)("Ok"),
        onPress: function (r) {
          r.isProgressing || (r.progressing(!0), apps.deleteGroup(e).then(function () {
            apps.closeDiag(), apps.curNavigator.navi.navToTop();
          })["catch"](function (e) {
            r.progressing(!1), r.setState({
              infoTip: (0, _requireConfig.tr)("Requesting Failed")
            });
          }));
        }
      }]
    });
  }, apps.deleteGroup = function (e) {
    return new Promise(function (r, t) {
      apps.send("quitGroup", {
        groupId: e
      }).then(function (t) {
        return r(), apps.removeFriendsAllUnread(e), _requireConfig.db.transaction(function (r) {
          r.executeSql("DELETE FROM Friends WHERE userid=? AND friendId=?", [apps.userid, e])["catch"]((0, _requireConfig.errCb)("1 deleteGroup"));
        });
      }).then(function () {
        return apps.loadFriendsData();
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "deleteGroup", e), t(e);
      });
    });
  }, apps.loadGroupMembers = function (e) {
    return new Promise(function (r, t) {
      apps.groupMembers[e] ? r({
        members: apps.groupMembers[e].slice()
      }) : apps.send("fetchGroupMembers", {
        groupId: e
      }).then(function (t) {
        var n = [];
        t.members.forEach(function (r, t) {
          if ("2:" === e.slice(0, 2)) var i = r.memberId,
            s = (r.level, r.time);else var i = r.follower,
            s = r.time;
          var a = {
            friendId: i,
            time: s
          };
          n.push(a);
        }), apps.groupMembers[e] = n.slice(), r({
          members: n
        });
      })["catch"](function (r) {
        (0, _requireConfig.tlog)("error", "fetchGroupMembers", e, r);
      });
    });
  }, apps.addGroupMembers = function (e, r) {
    return new Promise(function (t, n) {
      var i = [],
        s = [],
        a = apps.now();
      r.forEach(function (e, r) {
        i.push(e.friendId), s.push({
          friendId: e.friendId,
          time: a + r
        });
      }), apps.groupMembers[e] && (apps.groupMembers[e] = apps.groupMembers[e].concat(s));
      var o = apps.getNewMsgId();
      return apps.send("addGroupMembers", {
        groupId: e,
        members: i,
        msgid: o
      }).then(function () {
        apps.emit("selectViewLoaded_groupMembers", !0), t();
      })["catch"]((0, _requireConfig.errCb)("addGroupMembers", n));
    });
  }, apps.removeGroupMembers = function (e, r) {
    return new Promise(function (t, n) {
      var i = [],
        s = {};
      r.forEach(function (r) {
        if (i.push(apps.profiles[r.friendId].name), s[r.friendId] = 1, apps.groupMembers[e]) {
          var t = apps.groupMembers[e].findIndex(function (e) {
            return e.friendId === r.friendId;
          });
          apps.groupMembers[e].splice(t, 1);
        }
      });
      var a = apps.getNewMsgId(),
        o = (0, _requireConfig.tr)("## remove ## from group", apps.profiles[apps.userid].name, i.join(", "));
      _requireConfig.dbs.getDefaultShareId(apps.userid, e).then(function (r) {
        return apps.send("removeGroupMembers", {
          groupId: e,
          shareId: r,
          members: s,
          msgid: a,
          text: o
        });
      }).then(function () {
        apps.curNavigator.navi.navBack(), apps.emit("selectViewLoaded_groupMembers", !0), t();
      })["catch"]((0, _requireConfig.errCb)("removeGroupMembers", n));
    });
  }, apps.removeMsgFriend = function (e, r) {
    _requireConfig.db.executeSql("DELETE FROM MsgFriends Where shareId=? AND FriendId=?", [e, r]).then(function () {
      return apps.loadMsgFriendsData("8:" + apps.userid);
    }).then(function () {
      return apps.send("removeMsgFriend", {
        shareId: e,
        friendId: r
      });
    })["catch"](function (t) {
      (0, _requireConfig.tlog)("error", "removeMsgFriend", e, r, t);
    });
  }, apps.removeFriend = function (e, r, t, n) {
    var i = function (r) {
      apps.getRelationShip(e).then(function (r) {
        return _requireConfig.db.executeSql("INSERT OR REPLACE INTO FriendDrops(type, friendId, isCut, time) VALUES(?, ?, ?, ?)", [2, e, r.isCut, Date.now()]);
      }).then(function () {
        return _requireConfig.db.executeSql("DELETE FROM Friends WHERE userid IN (?,?) AND friendId=?", ["3:" + apps.userid, apps.userid, e]);
      }).then(function () {
        apps.removeFriendsAllUnread(e), apps.reloadFriendsData();
      }).then(function () {
        r && r();
      })["catch"](function (r) {
        (0, _requireConfig.tlog)("error", "apps.removeFriend", e, r);
      });
    };
    "-1" === e ? apps.tip((0, _requireConfig.tr)("Cannot remomve important tip!")) : apps.isIn(e, "1", "-2") ? (apps.clearChatMessages(e), i(t)) : e === apps.USERID_RES ? apps.diag({
      header: (0, _requireConfig.tr)("Alert"),
      content: (0, _requireConfig.tr)("This operation will remove all the unread whisper response. Be careful to do it"),
      buttons: [{
        text: (0, _requireConfig.tr)("Cancel"),
        onPress: function () {
          return apps.closeDiag();
        }
      }, {
        text: (0, _requireConfig.tr)("Confirm Remove"),
        onPress: function () {
          apps.closeDiag(function () {
            _requireConfig.db.executeSql("DELETE FROM Friends WHERE userid=?", [apps.CONS_BOTTLE_RES_PREFIX + apps.userid]).then(function (e) {
              apps.bottleResponseMap = {
                cnt: 0
              }, i(t);
            })["catch"](function (e) {
              (0, _requireConfig.tlog)("error", "USERID_RES remove", e);
            });
          });
        }
      }]
    }) : i(t);
  }, apps.mapFriendShips = function (e) {
    var r = {};
    return e.forEach(function (e) {
      "\uffffend" !== e.f && (e.f = "{", r[e.f] ? r[e.f].push(e) : r[e.f] = [e]);
    }), r;
  }, apps.getFollowers = function (e) {
    return 1 === e ? apps.stares : 2 === e ? apps.followers : 3 === e ? apps.blockFriends : void 0;
  }, apps.getLastFollowerTime = function (e) {
    var r = apps.getFollowers(e);
    if (0 === r.length) var t = 3 === e ? "{" : apps.now();else t = r[r.length - 1].time;
    return t;
  }, apps.catFollowers = function (e, r) {
    return 1 === e ? (apps.stares = apps.stares.concat(r), apps.stares) : 2 === e ? (apps.followers = apps.followers.concat(r), apps.followers) : 3 === e ? (apps.blockFriends = apps.blockFriends.concat(r), apps.blockFriends) : void 0;
  }, apps.setFollowers = function (e, r) {
    return 1 === e ? (apps.stares = r, apps.stares) : 2 === e ? (apps.followers = r, apps.followers) : 3 === e ? (apps.blockFriends = r, apps.blockFriends) : void 0;
  }, apps.loadFollowers = function (e, r, t) {
    var n = 10;
    return new Promise(function (i, s) {
      return apps.isLocking("loadFollowers_" + e) ? void (apps.fetchFollowerTimes[e] !== r && apps.addLockCb("loadFollowers_" + e, function () {
        apps.loadFollowers(e, r, t).then(i, s);
      })) : r ? (apps.lock("loadFollowers_" + e), apps.fetchFollowerTimes[e] = r, void apps.send("fetchFollowers", {
        type: e,
        time: r,
        limit: n,
        userid: t
      }).then(function (r) {
        var s = [];
        r.followers.forEach(function (r) {
          var n = r.time;
          if (1 === e) var i = r.stareId;else 2 === e ? i = r.follower : 3 === e && (i = r.friendId, n = r.friendId);
          var a = {
            friendId: i,
            time: n,
            userid: t
          };
          s.push(a);
        }), s.length < n && s.push({
          friendId: "end",
          time: 0
        }), apps.unlock("loadFollowers_" + e), i({
          followers: s
        });
      })["catch"](function (r) {
        apps.unlock("loadFollowers_" + e), (0, _requireConfig.tlog)("error", "fetchFollowers", r), s(r);
      })) : void i({
        followers: []
      });
    });
  }, apps.removeShare = function (e) {
    _requireConfig.dbs.deleteShare(e).then(function () {
      var r = "8:" + apps.userid,
        t = e.shareId,
        n = apps.sharesData[r],
        i = n.findIndex(function (e) {
          return e.shareId === t;
        });
      return -1 !== i && (n.splice(i, 1), apps.emit("rerenderSharesData_" + r)), apps.send("removeShare", {
        time: e.time
      });
    })["catch"](function (r) {
      (0, _requireConfig.tlog)("error", "removeShare", e, r);
    });
  }, apps.deleteShare = function (e) {
    return new Promise(function (r, t) {
      var n = e.shareId,
        i = e.toId,
        s = e.fromId,
        a = e.time,
        o = e.category,
        p = e.target,
        u = e.msgs,
        d = function (e) {
          var r = apps.sharesData[i],
            t = r.findIndex(function (e) {
              return e.shareId === n;
            });
          if (-1 !== t) {
            if (e) {
              var s = babelHelpers["extends"]({}, r[t]);
              s.msgs[0] && (s.msgs[0].stat = e), r.splice(t, 1, s);
            } else r.splice(t, 1);
            apps.emit("rerenderSharesData_" + i);
          }
        },
        c = [],
        f = [];
      u.forEach(function (e) {
        e.type !== apps.CONS_MSG_TYPE_IMAGE && e.type !== apps.CONS_MSG_TYPE_VIDEO || (c.push(e.time), f.push(e.imgId));
      });
      var l = {
        shareId: n,
        toId: i,
        fromId: s,
        time: a,
        category: o,
        target: p,
        dels: c,
        imgIds: f
      };
      d(4), apps.send("deleteShare", l).then(function (t) {
        return d(), t.notExist && apps.tip("notExist", !0), _requireConfig.dbs.deleteMsgFriendsData(n), _requireConfig.dbs.deleteShare(e).then(function () {
          return r();
        });
      }).then(r)["catch"](function (e) {
        apps.popTip((0, _requireConfig.tr)("Delete failed. Please check your connection.")), "serverErr" === e || "timeout" === e ? d(2) : t(e);
      });
    });
  }, apps.deleteShareOb = function (e) {
    _requireConfig.dbs.deleteShare({
      shareId: e
    }).then(function () {
      return _requireConfig.dbs.deleteMsgFriendsData(e);
    })["catch"](function (r) {
      (0, _requireConfig.tlog)("error", "deleteShareOb", e, r);
    });
  }, apps.deleteMsg = function (e) {
    return new Promise(function (r, t) {
      var n = e.fid,
        i = e.msgid,
        s = (e.shareId, e.category),
        a = e.friendId,
        o = e.userid,
        p = e.toId;
      if (e.isDeleted) return void r();
      -1 !== s && 2 !== s || (a = "8:" + apps.userid);
      var u = function (e) {
        if (apps.msgsData[n]) {
          var r = [].concat(apps.msgsData[n]),
            t = r.findIndex(function (e) {
              return e.msgid === i;
            }),
            s = babelHelpers["extends"]({}, r[t], e);
          r.splice(t, 1, s), apps.msgsData[n] = r, apps.emit("rerenderMsgsData_" + n);
        }
      };
      u({
        stat: 4
      }), e.delmsg = 1, apps.getRelationShip(p).then(function (r) {
        return r.isFollowed ? e.utab = 1 : e.utab = 2, apps.send("shareReply", e).then(function () {
          return u({
            stat: 2,
            isDeleted: 1
          }), e.isDeleted = 1, apps.deleteSessionMsg(e), _requireConfig.dbs.updateMsg(e);
        }).then(function () {
          return apps.isIn(s, 3, 4) ? _requireConfig.db.executeSql("UPDATE Friends SET desc=?, accessTime=? WHERE userid=? AND friendId=?", [(0, _requireConfig.tr)("[ Retreated ]"), apps.now(), o, p]).then(function () {
            return apps.loadFriendsData(o);
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "apps.deleteMsg", e);
          }) : void 0;
        });
      }).then(function () {
        return r();
      })["catch"](function (e) {
        apps.popTip((0, _requireConfig.tr)("Delete failed. Please check your connection.")), "serverErr" === e || "timeout" === e ? u({
          stat: 2
        }) : t(e);
      });
    });
  }, apps.deleteShareMsg = function (e, r) {
    return new Promise(function (t, n) {
      var i = r.shareId,
        s = r.msgid,
        a = r.toId,
        o = r.fid,
        p = function (e) {
          var r = apps.sharesData[a];
          if (r) {
            var t = r.findIndex(function (e) {
              return e.shareId === i;
            });
            if (-1 !== t) {
              var n = babelHelpers["extends"]({}, r[t]);
              if (e) {
                var p = n.msgs.findIndex(function (e) {
                  return e.msgid === s;
                });
                n.msgs[p].stat = e, r.splice(t, 1, n);
              } else {
                var u = n.msgs.filter(function (e) {
                  return e.msgid !== s;
                });
                n.msgs = u, r.splice(t, 1, n);
              }
              apps.emit("rerenderSharesData_" + a);
            }
          }
          if (o && apps.msgsData[o]) {
            var d = [].concat(apps.msgsData[o]);
            if (p = d.findIndex(function (e) {
              return e.msgid === s;
            }), e) {
              var c = babelHelpers["extends"]({}, d[p]);
              c.stat = 4, d.splice(p, 1, c);
            } else d.splice(p, 1);
            apps.msgsData[o] = d, apps.emit("rerenderMsgsData_" + o);
          }
          return u;
        };
      p(4), apps.send("deleteShareMsg", r).then(function (n) {
        if ("ok" === n.result) {
          var i = p();
          return apps.deleteSessionMsg(babelHelpers["extends"]({}, e, {
            msgs: [r]
          })), _requireConfig.dbs.deleteShareMsg(r, i).then(function () {
            return t();
          });
        }
        p(2), (0, _requireConfig.wlog)((0, _requireConfig.tr)("Delete failed. Please check your connection."), 5e3);
      }).then(function () {
        return t();
      })["catch"](function (e) {
        (0, _requireConfig.wlog)((0, _requireConfig.tr)("Delete failed. Please check your connection."), 5e3), "serverErr" === e || "timeout" === e ? p(2) : n(e);
      });
    });
  }, apps.deleteSharePraise = function (e) {
    return new Promise(function (r, t) {
      var n = e.shareId,
        i = e.toId,
        s = e.fromId,
        a = e.msgid,
        o = e.friendId,
        p = apps.getFid(i, s, n);
      e.chatSession = apps.getChatSession(i, s), e.delPraise = 1, (":" === o[1] && "8" !== o[0] ? Promise.resolve({}) : apps.send("shareReply", e)).then(function (r) {
        var t = {};
        if (!apps.serverRejectTrans(r, t)) {
          var n = apps.msgsData[p];
          return n && (apps.msgsData[p] = n.filter(function (e) {
            return e.msgid !== a;
          }), apps.emit("rerenderMsgsData_" + p)), _requireConfig.dbs.deleteMsg(e).then(function () {
            return _requireConfig.db.executeSql("UPDATE Shares SET praised=0, seqi=seqi+1, praiseMsgid=? WHERE shareId=?", ["", e.shareId])["catch"](function (e) {
              return (0, _requireConfig.tlog)("error", "sharePraiseDel 1", e);
            });
          });
        }
        apps.emit("showTipView", t.text);
      }).then(function () {
        return _requireConfig.db.executeSql('UPDATE Praises SET msgid="", tapn=tapn+1 WHERE shareId=?', [n])["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "sharePraiseDel 2", e);
        });
      }).then(function () {
        return r();
      })["catch"](function (e) {
        t(e);
      });
    });
  }, apps.checkIfPraised = function (e) {
    return new Promise(function (r, t) {
      _requireConfig.db.executeSql("SELECT * FROM Praises WHERE ShareId=?", [e]).then(function (e) {
        r(e[0].rows.item(0));
      })["catch"](function (r) {
        (0, _requireConfig.tlog)("error", "checkIfPraised", e, r), t(r);
      });
    });
  }, apps.sendSharePraise = function (e) {
    return apps.isForbided || apps.forbidExp ? (apps.forbidTip(), Promise.reject("isForbided")) : new Promise(function (r, t) {
      var n = e.shareId,
        i = e.msgid,
        s = e.tapn,
        a = e.toId,
        o = e.fromId,
        p = e.friendId,
        u = apps.getFid(a, o, n);
      e.chatSession = apps.getChatSession(a, o), (":" === p[1] && "8" !== p[0] ? Promise.resolve({}) : apps.send("shareReply", {
        sendMsg: e,
        sendTimeoutIntv: 500
      })).then(function (r) {
        var t = {};
        if (!apps.serverRejectTrans(r, t)) {
          var n = apps.msgsData[u];
          return n && (n = [e].concat(n), apps.msgsData[u] = n, apps.emit("rerenderMsgsData_" + u, 1)), _requireConfig.dbs.addSharePraise(e).then(function () {
            return _requireConfig.dbs.updateShareAddPraise(e);
          });
        }
        apps.emit("showTipView", t.text);
      }).then(function () {
        return _requireConfig.db.executeSql("INSERT OR REPLACE INTO Praises(shareId, msgid, tapn) VALUES(?,?,?)", [n, i, s]);
      }).then(function () {
        r();
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "sendSharePraise", e), apps.emit("showTipView", (0, _requireConfig.tr)("Praise Failed")), t(e);
      });
    });
  }, apps.getChatSession = function (e, r) {
    var t = e.slice(0, 2);
    return t === apps.CONS_PREFIX_GROUP ? e : t === apps.CONS_PREFIX_CIRCLE ? e.slice(2) : e > r ? r + ":" + e : r > e ? e + ":" + r : "" + e;
  }, apps.getFid = function (e, r, t) {
    if ("2:" === e.slice(0, 2)) return t;
    var n = apps.userid === e ? r : e;
    return t + ";" + n;
  }, apps.rateUsPrompt = function () {}, apps.changeDispatch = function (e, r) {
    var t = e.toId.slice(0, 2),
      n = e,
      i = n.time,
      s = n.shareId,
      a = n.toId;
    if ("3:" === t) var o = ["rand"],
      p = e.msgs[0],
      u = p.text,
      d = p.msgid,
      c = {
        time: i,
        target: o,
        toId: a,
        shareId: s,
        msgid: d,
        text: u
      };else "8:" !== t && a !== apps.userid || (o = ["all"], c = {
      time: i,
      target: o,
      toId: "8:" + apps.userid,
      shareId: s
    });
    apps.send("changeTarget", c).then(function (r) {
      e = babelHelpers["extends"]({}, e), o = apps.userid, e.target = o;
      var t = apps.sharesData[a].slice(),
        n = t.findIndex(function (e) {
          return e.shareId === s;
        });
      return -1 !== n && (t.splice(n, 1), t.unshift(e), apps.sharesData[a] = t, apps.emit("rerenderSharesData_" + a)), _requireConfig.db.executeSql("UPDATE Shares SET target=? WHERE shareId=?", [o, s]);
    })["catch"](function (e) {
      (0, _requireConfig.tlog)("changeTarget", e), apps.tip((0, _requireConfig.tr)("Change Failed"), 1);
    });
  }, apps.shareDispatch = function (e) {
    var r = [],
      t = !1;
    e.forEach(function (e) {
      -1 === e.type ? r.push("all") : 1 === e.type || 2 === e.type ? r.push(e.friendId) : -6 === e.type ? r.push(e.friendId) : -3 === e.type ? r.push("rand") : -4 === e.type ? r.push("me") : -7 === e.type && (t = !0);
    }), apps.emitOnce("mySpaceInputOnSend", r, t);
  }, apps.getPhotoThumb = function (e) {
    return new Promise(function (r, t) {
      _requireConfig.ImagePickerManager.pickFromUri(e, {
        maxHeight: 1280,
        maxWidth: 1280,
        quality: .6,
        noData: !0,
        rawfile: !1,
        storageOptions: {
          skipBackup: !0
        }
      }, function (t) {
        if (t.imageWidthNil || t.imageHeightNil || t.uriNil || t.mimeNil || t.kbSizeNil || t.assetNil) {
          "\n          imageWidthNil = " + t.imageWidthNil + "\n          imageHeightNil = " + t.imageHeightNil + "\n          uriNil = " + t.uriNil + "\n          mimeNil = " + t.mimeNil + "\n          kbSizeNil = " + t.kbSizeNil + "\n          uri = " + t.uri + "\n          asset = " + t.assetNil + "\n        ";
          r({
            error: e + " nil"
          });
        } else r(t);
      });
    });
  }, apps.inputSend = function (e, r, t) {
    e.length > 1 && (apps.emit("customNavTitle", {
      spinner: !0,
      title: (0, _requireConfig.tr)("Sending...")
    }), apps.picBoardIsSending = !0, apps.noOnScrollRenderMore = !0);
    var n = function i() {
      var n = e.shift();
      if (n) {
        var s = apps.CONS_MSG_TYPE_IMAGE,
          a = function (r) {
            r.error ? ((0, _requireConfig.tlog)("error", "sendImage pickFromUri", r.error), apps.pickUriErrorTry[n] || (apps.pickUriErrorTry[n] = !0, e.unshift(apps.getImageUriCache(n)), i())) : (r.rawUri = n + ";" + r.size, t(s, r, function () {
              return i();
            }));
          };
        if ("object" == typeof n) {
          var o = n;
          o.ext || (o.ext = "jpg"), n = o.assetUri, a(o);
        } else if (apps.isSendUriVideo[n]) {
          var p = apps.isSendUriVideo[n],
            u = (p.width, p.height, p.size);
          s = apps.CONS_MSG_TYPE_VIDEO;
          var d = n + ";" + u,
            c = apps.getImageUriCache(d),
            f = function () {
              return new Promise(function (e, r) {
                c ? (c = "file://" + c, e()) : apps.has("videoUriCached_" + d) ? r("video processing") : apps.on("videoUriCached_" + d, function () {
                  c = "file://" + apps.getImageUriCache(d), e();
                });
              });
            };
          Promise.resolve().then(function () {
            return f();
          }).then(function () {
            return _requireConfig.ProcessingManager.getVideoInfo(n).then(function (e) {
              var r = e.size,
                t = r.width,
                i = r.height;
              a({
                path: n,
                uri: c,
                width: t,
                height: i,
                duration: e.duration
              });
            });
          })["catch"](function (e) {
            (0, _requireConfig.tlog)("error", "inputSend video", e);
          });
        } else apps.picsForBackgroundSetting[apps.dataForBackgroundSetting.i] === n ? a(apps.dataForBackgroundSetting.data) : (apps.isLongLongPic[n] && (delete apps.isLongLongPic[n], r = !0), _requireConfig.ImagePickerManager.pickFromUri(n, {
          maxHeight: 1280,
          maxWidth: 1280,
          quality: .6,
          noData: !0,
          storageOptions: {
            skipBackup: !0
          }
        }, function (e) {
          a(e);
        }));
        apps.deselectImageCallbacks[n] && (apps.deselectImageCallbacks[n](), delete apps.deselectImageCallbacks[n]);
      } else apps.picBoardIsSending = !1, apps.emit("cancelCustomNavTitle"), apps.noOnScrollRenderMore = !1, apps.initForBackgroundSetting();
    };
    n();
  }, apps.uploadStart = function (e, r) {
    return new Promise(function (t, n) {
      _requireConfig.Upload.startUpload(e).then(function (i) {
        _requireConfig.Upload.addListener("progress", i, function (e) {
          var t = e.progress / 100;
          r && r(t);
        }), _requireConfig.Upload.addListener("error", i, function (r) {
          (0, _requireConfig.tlog)("error", "uploadStart", r.error, e), n(r.error);
        }), _requireConfig.Upload.addListener("completed", i, function (r) {
          try {
            if (200 === r.responseCode) {
              var i = JSON.parse(r.responseBody);
              t(i);
            } else (0, _requireConfig.tlog)("error", "uploadStart", r), n(new Error(r.responseBody));
          } catch (s) {
            (0, _requireConfig.tlog)("error", "uploadStart", r, e, s), n(s);
          }
        });
      })["catch"](function (r) {
        (0, _requireConfig.tlog)("error", "uploadStart", e, r);
      });
    });
  }, apps.uploadFile = function (e, r, t) {
    return new Promise(function (n, i) {
      var s = r.rawUri ? {
        rawUri: encodeURIComponent(r.rawUri)
      } : {};
      if (r.per && (s.per = 1), e === apps.CONS_MSG_TYPE_VIDEO) {
        var a = r.time,
          o = r.uri,
          p = r.path,
          u = r.width,
          d = r.height,
          c = r.uriSize,
          f = r.pathSize,
          l = r.uriExt,
          g = r.pathExt;
        if (!a) return void i("uploadFile video time cannot be null");
        var h = f,
          m = c,
          C = {
            time: a,
            type: e,
            ext: l,
            size: m,
            width: u,
            height: d
          },
          _ = {
            time: a,
            type: e,
            rawWidth: u,
            rawHeight: d,
            ext: g,
            rawSize: h
          },
          S = "android" === _reactNative.Platform.OS ? p.replace(/^file:\/\//, "") : p;
        p = "android" === _reactNative.Platform.OS ? o.replace(/^file:\/\//, "") : o, s = babelHelpers["extends"](s, {
          time: a,
          type: e,
          ext: l,
          size: m,
          width: u,
          height: d,
          rawExt: g,
          rawSize: h,
          rawWidth: I,
          rawHeight: w
        });
      } else if (e === apps.CONS_MSG_TYPE_IMAGE) {
        var a = r.time,
          v = r.ext,
          d = r.height,
          u = r.width,
          o = r.uri,
          m = r.size;
        if (!a) return void i("uploadFile image time cannot be null");
        var C = {
            time: a,
            type: e,
            ext: v,
            size: m,
            width: u,
            height: d
          },
          p = "android" === _reactNative.Platform.OS ? o.replace(/^file:\/\//, "") : o;
        if (s = babelHelpers["extends"](s, {
          time: a,
          type: e,
          ext: v,
          size: m,
          width: u,
          height: d
        }), r.rawPath) {
          var I = r.rawWidth,
            w = r.rawHeight,
            S = r.rawPath,
            h = r.rawSize,
            q = r.rawExt;
          S = "android" === _reactNative.Platform.OS ? S.replace(/^file:\/\//, "") : "file://" + S;
          var _ = {
            time: a,
            rawWidth: I,
            rawHeight: w,
            ext: q,
            rawSize: h,
            type: e
          };
          s = babelHelpers["extends"](s, {
            rawExt: q,
            rawSize: h,
            rawWidth: I,
            rawHeight: w
          });
        }
        if (r.uriT) {
          var b = r.thumbW,
            T = r.thumbH,
            E = r.sizeT,
            P = {
              time: a,
              thumbW: b,
              thumbH: T,
              sizeT: E,
              type: e,
              ext: "jpg"
            };
          r.per && (P.per = 1);
          var y = "android" === _reactNative.Platform.OS ? r.uriT.replace(/^file:\/\//, "") : r.uriT;
        }
      } else if (e === apps.CONS_MSG_TYPE_AUDIO) {
        var p = r.path,
          N = r.duration,
          m = r.size;
        C = {
          type: e,
          duration: N,
          size: m,
          ext: "amr"
        }, p = ("android" === _reactNative.Platform.OS ? p : "file://" + p) + ".amr", s = C;
      }
      var R = -1,
        D = function (e) {
          return e.overflow ? (apps.tip((0, _requireConfig.tr)("Send too much files. Try another day.")), void i("cloudRepoSizeOverflow")) : (_requireConfig.dbs.setUserProfile({
            cloudRepoSize: apps.cloudRepoSize + e.cloudRepoSize
          })["catch"](function (e) {
            return (0, _requireConfig.tlog)("error", "setCloudRepoSize", e);
          }), void (apps.onChangeCloudRepoSize && apps.onChangeCloudRepoSize()));
        };
      _requireConfig.wsc.getMsgerUrl(R, "durls").then(function (e) {
        var o = function () {
            return new Promise(function (t, n) {
              r.uriT ? apps.uploadStart({
                url: "https://" + e.url + "/uploadstuff",
                path: y,
                method: "POST",
                headers: babelHelpers["extends"]({
                  mycustomheader: JSON.stringify({
                    userid: apps.userid,
                    passwd: apps.passwd,
                    mpasswd: apps.mpasswd,
                    ext: "jpg",
                    metadata: P,
                    thumb: 1
                  })
                }, "ios" === _reactNative.Platform.OS ? {
                  "Content-Length": P.sizeT,
                  "Content-Type": "application/octet-stream"
                } : {}),
                notification: {
                  enabled: !1
                }
              }).then(function (e) {
                e.notoday ? n(e) : (e.thumbId = e.id, delete e.id, t(e));
              }, function (e) {
                n(e);
              }) : t({});
            });
          },
          u = function (r) {
            return C.time = a, r.thumbId && (s.thumbId = r.thumbId), apps.uploadStart({
              url: "https://" + e.url + "/uploadstuff",
              path: p,
              method: "POST",
              headers: babelHelpers["extends"]({
                mycustomheader: JSON.stringify({
                  userid: apps.userid,
                  passwd: apps.passwd,
                  mpasswd: apps.mpasswd,
                  ext: C.ext,
                  metadata: s
                })
              }, "ios" === _reactNative.Platform.OS ? {
                "Content-Length": s.size,
                "Content-Type": "application/octet-stream"
              } : {}),
              notification: {
                enabled: !1
              }
            }, function (e) {
              t && (_ ? 1 !== e && t(h / (m + h) + e * m / (m + h)) : t(e));
            }).then(function (e) {
              e.notoday ? i(e) : (t && t(1), D(e), r && r.id && (e.rawId = r.id, e.rawImgId = r.id + ":" + h + ":" + I + ":" + w), r.thumbId && (e.thumbId = r.thumbId), n(e));
            })["catch"](function (e) {
              i(e);
            });
          };
        return _ ? apps.uploadStart({
          url: "https://" + e.url + "/uploadstuff",
          path: S,
          method: "POST",
          headers: babelHelpers["extends"]({
            mycustomheader: JSON.stringify({
              userid: apps.userid,
              passwd: apps.passwd,
              mpasswd: apps.mpasswd,
              ext: _.ext,
              metadata: s,
              raw: 1
            })
          }, "ios" === _reactNative.Platform.OS ? {
            "Content-Length": s.rawSize,
            "Content-Type": "application/octet-stream"
          } : {}),
          notification: {
            enabled: !1
          }
        }, function (e) {
          t && t(e * h / (m + h));
        }).then(function (e) {
          return D(e), s.rawImgId = e.id, o().then(function (r) {
            return u(babelHelpers["extends"](e, r));
          });
        }) : o().then(function (e) {
          return u(e);
        });
      })["catch"](function (e) {
        (0, _requireConfig.tlog)("error", "upload", e), i(e);
      });
    });
  }, apps.getPrevText = function (e) {
    for (var r = "", t = 0; 100 > t; t++) {
      var n = e[t];
      if (!n) break;
      if (1 === n.type && 2 === n.stat && n.fromId === apps.userid && (r = n.text + r), _requireConfig.util.codeLength(r) > 3) break;
    }
    return r;
  }, apps.checkRawUriMapId = function (e) {
    return new Promise(function (r, t) {
      e ? apps.send("checkRawUriMapId", {
        uri: e
      }).then(function (e) {
        r(e);
      })["catch"](function (r) {
        (0, _requireConfig.tlog)("error", "checkRawUriMapId", e, r), t(r);
      }) : r();
    });
  }, apps.sendShareReply = function (e, r, t, n) {
    return new Promise(function (i, s) {
      var a,
        o,
        p = r.type,
        u = r.category,
        d = r.data,
        c = r.fromId,
        f = r.toId,
        l = r.msgid,
        g = (r.friendId, r.chatSession),
        h = r.newMsgid,
        m = r.shareId,
        C = r.shareFrom,
        _ = r.fid,
        S = r.ftype,
        v = r.seqi,
        I = r.resendCnt,
        w = r.atime,
        q = r.isFriend,
        b = r.isStared,
        T = r.isApproved,
        E = r.isCut;
      I || (I = 0);
      var P = apps.getTimeFromMsgid(h || l);
      apps.firstShared || (apps.setSharedParas({
        firstShared: 1
      })["catch"](function (e) {
        return (0, _requireConfig.tlog)("error", "firstShared", e);
      }), apps.loadProfile(apps.userid, "aboutMe"), apps.emit("aboutMeUnreadChanged"));
      var y = function () {
          var e = apps.msgsData[_];
          return e ? [].concat(e) : [];
        },
        N = y(),
        R = function (r) {
          for (var t = 0; t < N.length && N[t].msgid !== l; t++);
          var n = N[t];
          n || t === N.length || (apps.fatalTip(), (0, _requireConfig.tlog)("error", "fatal error", N, t)), n && "resend" === e ? (h && (a.oldMsgid = a.msgid, a.msgid = h, l = h, h = null), a = babelHelpers["extends"]({}, n, a)) : a = babelHelpers["extends"]({}, n, a), a.stat = r, 1 === r && (a.resendCnt = I, delete a.timeoutFlag, a.timeoutFlagChecked = !0), N.splice(t, 1), N.unshift(a);
        },
        D = function (e) {
          e && R(e), apps.msgsData[_] = N, apps.emit("rerenderMsgsData_" + _, 1), apps.isIn(e, 2, 3) && delete apps.msgSendingMap[l], 2 === e && 6 !== a.type && n && n(a);
        };
      if (p === apps.CONS_MSG_TYPE_VIDEO) {
        var M = d.path,
          F = d.uri,
          O = d.width,
          k = d.height,
          x = d.duration;
        a = {
          msgid: l,
          shareId: m,
          stat: 1,
          type: p,
          category: u,
          time: P,
          text: "[ " + (0, _requireConfig.tr)("VIDEO") + " ]",
          ftype: S,
          seqi: v,
          fromId: c,
          toId: f,
          shareFrom: C,
          path: M,
          uri: F,
          width: O,
          height: k,
          duration: x
        };
      } else if (p === apps.CONS_MSG_TYPE_GIF) {
        var F = d.uri,
          O = d.width,
          k = d.height,
          L = d.size;
        a = {
          msgid: l,
          shareId: m,
          stat: 1,
          type: p,
          category: u,
          time: P,
          text: "[ " + (0, _requireConfig.tr)("GIF") + " ]",
          height: k,
          width: O,
          uri: F,
          size: L,
          ftype: S,
          seqi: v,
          fromId: c,
          toId: f,
          shareFrom: C
        };
      } else if (p === apps.CONS_MSG_TYPE_LINK) a = {
        msgid: l,
        shareId: m,
        stat: 1,
        type: p,
        category: u,
        time: P,
        text: d.status,
        uri: d.url,
        ftype: S,
        seqi: v,
        shareFrom: C,
        fromId: c,
        toId: f
      };else if (p === apps.CONS_MSG_TYPE_EMOTION) a = {
        msgid: l,
        shareId: m,
        stat: 1,
        type: p,
        category: u,
        time: P,
        ftype: S,
        seqi: v,
        text: "[ " + (0, _requireConfig.tr)("Sticker") + " ]",
        emoj: d,
        fromId: c,
        toId: f,
        shareFrom: C
      };else if (p === apps.CONS_MSG_TYPE_IMAGE) {
        var A = d.ext,
          k = d.height,
          O = d.width,
          F = d.uri,
          L = d.size;
        A = A.toLowerCase(), "jpeg" === A && (A = "jpg"), a = {
          msgid: l,
          shareId: m,
          stat: 1,
          uri: F,
          ext: A,
          height: k,
          width: O,
          type: p,
          ftype: S,
          seqi: v,
          isnew: 1,
          text: "[ " + (0, _requireConfig.tr)("Picture") + " ]",
          category: u,
          time: P,
          fromId: c,
          toId: f,
          shareFrom: C,
          size: L
        };
      } else if (p === apps.CONS_MSG_TYPE_AUDIO) {
        var M = d.path,
          x = d.duration,
          L = d.size;
        a = {
          msgid: l,
          shareId: m,
          stat: 1,
          type: p,
          category: u,
          time: P,
          path: M,
          duration: x,
          ftype: S,
          seqi: v,
          text: "[ " + (0, _requireConfig.tr)("Audio") + " ]",
          fromId: c,
          toId: f,
          shareFrom: C,
          size: L
        };
      } else a = {
        msgid: l,
        shareId: m,
        stat: 1,
        type: p,
        category: u,
        time: P,
        text: d,
        ftype: S,
        seqi: v,
        shareFrom: C,
        fromId: c,
        toId: f
      }, apps.lastSendReplyText = d;
      if (a.type === apps.CONS_MSG_TYPE_TEXT && _requireConfig.util.codeLength(a.text) < 3) var U = apps.getPrevText(N);
      if (d.time = P, a.chatSession = g, a.data = d, a.userid = r.userid, a.utab = r.utab, "object" == typeof r.msgscnt) {
        var G = r.msgscnt;
        r.msgscnt = r.msgscnt.msgscnt;
      }
      if (G ? G.msgscnt = apps.CONS_FIRST_BOTTLE_MSGSCNT : G = apps.findLastMsg(N), G && G.msgscnt === apps.CONS_FIRST_BOTTLE_MSGSCNT ? (a.mtext = G.text, a.utab = 2, a.text = a.text.trim(), a.shareFrom = G.shareFrom) : a.utab = 1, q) u === apps.CONS_MSG_CAT_MSG && (a.uread = 1);else if (G && apps.isSessionTermed(G)) {
        var H = 0;
        a.msgscnt = apps.CONS_MSGSCNT_TERM, r.msgscnt = apps.CONS_MSGSCNT_TERM;
      }
      w && (a.atime = w), a.type !== apps.CONS_MSG_TYPE_IMAGE && a.type !== apps.CONS_MSG_TYPE_VIDEO || (a.uploading = !0), "newMsg" === e ? (N.unshift(a), apps.renderedMsgsMap[_] && (apps.renderedMsgsMap[_][a.msgid] = 1)) : "resend" === e && (a.type === apps.CONS_MSG_TYPE_TEXT && (a.text = r.text), R(1)), D(), t && t(1);
      var B,
        z = {
          isStared: b,
          isFriend: q,
          isOb: apps.isOb
        };
      T && (z.isFriend = 1), E && (z.isCut = 1), apps.msgSendingMap[l] = 1;
      var V, W;
      _requireConfig.dbs.addShareReply({
        action: e,
        actionData: r,
        addMsg: a
      }).then(function (t) {
        for (var n in a) n in {
          isnew: 1,
          path: 1,
          stat: 1,
          resendCnt: 1,
          uploading: 1,
          data: 1,
          oldMsgid: 1
        } || "uri" === n && p !== apps.CONS_MSG_TYPE_LINK && p !== apps.CONS_MSG_TYPE_GIF || (z[n] = a[n]);
        if (z.msgscnt = r.msgscnt, r.isPraised && (z.isPraised = 1), z.toName = apps.profiles[f] && apps.profiles[f].name, U && (z.prevText = U), a.type === apps.CONS_MSG_TYPE_VIDEO) {
          var i = _requireConfig.theme.winWidth,
            s = _requireConfig.theme.winHeight - _requireConfig.theme.statusHeightAll,
            o = O / k;
          if (O > i || k > s) {
            var u = i / s;
            o >= u ? (O = i, k = i / o) : (k = s, O = s * o);
          }
          return O = Math.round(O), k = Math.round(k), O % 2 === 1 && (O -= 1), k % 2 === 1 && (k -= 1), apps.checkRawUriMapId(d.rawUri).then(function (r) {
            return r && r.imgId ? (W = !0, z.imgId = r.imgId, z.rawImgId = r.rawImgId, z.size = r.size, z.width = O, z.height = k, a.imgId = r.imgId, a.rawImgId = r.rawImgId, a.size = r.size, a.width = O, a.height = k, delete a.uploading, apps.send("shareReply", {
              action: e,
              sendMsg: z,
              resendCnt: I,
              sendTimeoutIntv: 500
            })) : apps.runSerialPromise("videoCompress", function () {
              apps.autoGifAnimationToggle(!1);
              var r;
              return "android" === _reactNative.Platform.OS && (r = function (e) {
                var r = e.progress.match(/time=([^-]\w+):(\w+):(\d+)\.(\d+)/);
                if (r) {
                  var t = parseInt(r[1], 10),
                    n = parseInt(r[2], 10),
                    i = parseInt(r[3], 10),
                    s = parseInt(r[4], 10),
                    o = 60 * t * 60 * 1e3 + 60 * n * 1e3 + 1e3 * i + s;
                  apps.emit("imageIsUploading_" + a.msgid + "_" + a.uri, o / x / 1e3, !0);
                }
              }), _requireConfig.ProcessingManager.compress(M, {
                width: O,
                height: k,
                bitrateMultiplier: 1e4,
                saveToCameraRoll: !1,
                saveWithCurrentDate: !0,
                minimumBitrate: 1048576,
                crf: 28
              }, r).then(function (r) {
                return (0, _requireConfig.tlog)("VideoProcessing", r), d.path = "ios" === _reactNative.Platform.OS ? r : r.source, d.uriExt = d.uri.match(/.*\.(\w+)/)[1], d.pathExt = d.path.match(/.*\.(\w+)/)[1], d.width = O, d.height = k, d.isVideoThumb = !0, _requireConfig.fs.stat(d.uri.replace(/^file:\/\//, "")).then(function (e) {
                  var r = e.size;
                  return L = r, d.uriSize = r, _requireConfig.fs.stat(d.path.replace(/^file:\/\//, ""));
                }).then(function (r) {
                  var t = r.size;
                  return d.pathSize = t, apps.uploadFile(a.type, d, function (e) {
                    apps.emit("imageIsUploading_" + a.msgid + "_" + a.uri, e);
                  }).then(function (r) {
                    return z.imgId = r.id, V = r.rawId, z.rawImgId = r.rawId, z.size = d.uriSize + d.pathSize, a.size = z.size, a.width = O, a.height = k, z.width = O, z.height = k, d.rawPath = d.path, d.rawSize = d.pathSize, apps.send("shareReply", {
                      action: e,
                      sendMsg: z,
                      resendCnt: I,
                      sendTimeoutIntv: 500
                    });
                  });
                });
              })["catch"](function (e) {
                return (0, _requireConfig.tlog)("error", "VideoProcessing", e), Promise.reject("shareReply uploadFile Failed");
              });
            }).then(function (e) {
              return apps.autoGifAnimationToggle(!0), e;
            })["catch"](function (e) {
              return apps.autoGifAnimationToggle(!0), (0, _requireConfig.tlog)("error", "VideoProcessing", e), Promise.reject("shareReply uploadFile Failed");
            });
          });
        }
        return (a.type === apps.CONS_MSG_TYPE_IMAGE || a.type === apps.CONS_MSG_TYPE_AUDIO) && L > 0 ? apps.checkRawUriMapId(d.rawUri).then(function (r) {
          if (r && r.imgId) {
            if (W = !0, z.imgId = r.imgId, a.imgId = r.imgId, r.rawImgId) {
              var t = d.rawWidth,
                n = d.rawHeight,
                i = d.rawSize;
              a.rawImgId = r.rawImgId + ":" + i + ":" + t + ":" + n, z.rawImgId = a.rawImgId;
            }
            return delete a.uploading, apps.send("shareReply", {
              action: e,
              sendMsg: z,
              resendCnt: I,
              sendTimeoutIntv: 500
            });
          }
          return apps.uploadFile(a.type, d, function (e) {
            apps.emit("imageIsUploading_" + a.msgid + "_" + a.uri, e);
          }).then(function (r) {
            return r.id ? (a.type === apps.CONS_MSG_TYPE_IMAGE ? (z.imgId = r.id, r.rawImgId && (z.rawImgId = r.rawImgId, V = r.rawId)) : a.type === apps.CONS_MSG_TYPE_AUDIO && (z.audioId = r.id.split(".")[0]), apps.send("shareReply", {
              action: e,
              sendMsg: z,
              resendCnt: I,
              sendTimeoutIntv: 500
            })) : Promise.reject("shareReply uploadFile Failed");
          });
        }) : H ? Promise.resolve({}) : apps.send("shareReply", apps.zipSendReply({
          action: e,
          sendMsg: z,
          resendCnt: I,
          sendTimeoutIntv: 500
        }, 1));
      }).then(function (e) {
        return a.msgscnt = r.msgscnt, e.slock && _requireConfig.dbs.setUserProfile({
          canStareLimit: e.slock
        })["catch"](function (e) {
          return (0, _requireConfig.tlog)("error", "set canStareLimit", e);
        }), e.shadowExpired && apps.handleShadowExpired(e.shadowExpired), e.vipExp && apps.handleVipExp(e.vipExp), B = apps.handleServerReject(e, r), apps.isIn(e.replyReject, "maxSend", "isBlocked", "firstNo", "mutualNo") ? Promise.reject("isBlocked") : z.imgId && !W ? (a.imgId = z.imgId, apps.imageIsMoving[z.imgId] = !0, (0, _requireConfig.cacheImage)({
          imageId: z.imgId,
          localUri: F,
          size: L,
          isVideoThumb: d.isVideoThumb
        }).then(function () {
          return z.rawImgId ? (a.rawImgId = z.rawImgId, apps.imageIsMoving[V] = !0, (0, _requireConfig.cacheImage)({
            imageId: V,
            localUri: d.rawPath,
            size: d.rawSize
          })) : void 0;
        })) : z.audioId ? (a.audioId = z.audioId, (0, _requireConfig.cacheAudio)({
          audioId: z.audioId,
          path: M,
          size: L
        })) : void 0;
      }).then(function () {
        if (N = y(), D(B ? 3 : 2), apps.addSessionMsg([a], !0), apps.multiLoginCnts.length > 0) {
          var r = apps.multiLoginCnts.findIndex(function (e) {
            return e.uid === f;
          });
          -1 !== r && (apps.multiLoginCnts[r].c += 1, apps.multiLoginCntsSum += 1, apps.onChangeMultiLoginCnts && apps.onChangeMultiLoginCnts(), apps.emit("aboutMeUnreadChanged"));
        }
        return _requireConfig.dbs.updateMsg(a, e);
      }).then(function () {
        i(o);
      })["catch"](function (r) {
        try {
          if ("isBlocked" === r) {
            if (apps.msgsData[_]) {
              var t = [].concat(apps.msgsData[_]),
                n = t.findIndex(function (e) {
                  return e.msgid === l;
                });
              t.splice(n, 1), apps.msgsData[_] = t, apps.emit("rerenderMsgsData_" + _);
            }
            _requireConfig.dbs.deleteMsg(a)["catch"](function (e) {
              return (0, _requireConfig.tlog)("error", "catch shareReply deleteMsg", e);
            });
          } else N = y(), D(3), _requireConfig.dbs.updateMsg(a, e)["catch"](function (e) {
            return (0, _requireConfig.tlog)("error", "catch shareReply updateMsg", e);
          }), (0, _requireConfig.tlog)("error", "sendShareReply", r);
        } catch (r) {
          (0, _requireConfig.tlog)("error", "sendShareReply catch", r);
        }
      });
    });
  }, require(317)(apps), require(318)(apps), require(320)(apps), exports["default"] = apps;
});
