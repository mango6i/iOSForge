// Recovered module 330; analysis path, not original filename.
// Original SHA-256 0e1867aa7459f81750d95dbad6afa3c47b7de7d5c0800259518127deb595c4ed; original byte range [1336180, 1341006).
__d(330, function (e, a, t, n) {
  Object.defineProperty(n, "__esModule", {
    value: !0
  }), n.MainTabView = void 0;
  var s = a(311),
    p = babelHelpers.interopRequireDefault(s),
    i = (a(312), a(314));
  n.MainTabView = p["default"].createClass({
    displayName: "MainTabView",
    getInitialState: function () {
      var e = (i.apps.friendsUnreadList.length || 0) + i.apps.bottleResponseMap.cnt,
        a = 0;
      i.apps.shaM && i.apps.shaM !== i.apps.shaMClear && (a = parseInt(i.apps.shaM.split(",").pop(), 10));
      var t = i.apps.circleMsgUnreadList.length + 0 + (i.apps.disableShadowRemind ? 0 : a),
        n = (i.apps.otherDataCenterUnreadCnt || 0) + (i.apps.suidCnt || 0) + (i.apps.multiLoginCntsSum || 0);
      return n > 99 && (n = 100), i.apps.firstNotiTouched && i.apps.firstShared && i.apps.permissionChecked && !i.apps.permissions.notification && (n = "?"), {
        friendsTabCount: e,
        spaceTabCount: t,
        aboutMeTabCount: n,
        friendsTabCountColor: i.theme.warn,
        tabIndex: this.props.tabIndex || 0
      };
    },
    onFriendsUnreadChanged: function () {
      var e = (i.apps.friendsUnreadList.length || 0) + i.apps.bottleResponseMap.cnt;
      this.setState({
        friendsTabCount: e
      });
    },
    onSpaceUnreadChanged: function () {
      var e = 0;
      i.apps.shaM && i.apps.shaM !== i.apps.shaMClear && (e = parseInt(i.apps.shaM.split(",").pop(), 10)), this.setState({
        spaceTabCount: i.apps.circleMsgUnreadList.length + 0 + (i.apps.disableShadowRemind ? 0 : e)
      });
    },
    onAboutMeUnreadChanged: function () {
      var e = (i.apps.otherDataCenterUnreadCnt || 0) + (i.apps.suidCnt || 0) + (i.apps.multiLoginCntsSum || 0);
      e > 99 && (e = 100), i.apps.firstNotiTouched && i.apps.firstShared && i.apps.permissionChecked && !i.apps.permissions.notification && (e = "?"), this.setState({
        aboutMeTabCount: e
      });
    },
    permissionChecked: function () {
      var e = (i.apps.otherDataCenterUnreadCnt || 0) + (i.apps.suidCnt || 0) + (i.apps.multiLoginCntsSum || 0);
      e > 99 && (e = 100), i.apps.firstNotiTouched && i.apps.firstShared && i.apps.permissionChecked && !i.apps.permissions.notification && (e = "?"), this.setState({
        aboutMeTabCount: e
      });
    },
    componentWillMount: function () {
      i.apps.on("friendsUnreadChanged", this.onFriendsUnreadChanged), i.apps.on("spaceUnreadChanged", this.onSpaceUnreadChanged), i.apps.on("aboutMeUnreadChanged", this.onAboutMeUnreadChanged), i.apps.on("permissionChecked", this.permissionChecked);
    },
    componentWillUnmount: function () {
      i.apps.unon("friendsUnreadChanged", this.onFriendsUnreadChanged), i.apps.unon("spaceUnreadChanged", this.onSpaceUnreadChanged), i.apps.unon("aboutMeUnreadChanged", this.onAboutMeUnreadChanged), i.apps.unon("permissionChecked", this.permissionChecked);
    },
    componentWillReceiveProps: function (e) {
      e.tabIndex !== this.props.tabIndex && this.setState({
        tabIndex: e.tabIndex
      });
    },
    onPressFriendsTab: function (e) {
      i.apps.curNavigator = i.apps.friendsNavigator, "friends" !== i.apps.currentNavi && (i.apps.emit("removeGifFromMySpace", !0), i.apps.myInputViewRef.changePlaceHolder(), i.apps.emit("switchMainTab", {
        friendsNavFlex: 1,
        mySpaceNavFlex: 0,
        aboutMeNavFlex: 0
      }, function () {
        i.apps.emit("friendsTabSwitched"), /^interact_/.test(i.apps.currentRoutes.friends.name) ? i.apps.emit("myInputViewMoveToHigh") : i.apps.emit("myInputViewMoveToLow"), e && e();
      })), i.apps.currentNavi = "friends";
    },
    onPressSpaceTab: function (e) {
      i.apps.curNavigator = i.apps.mySpaceNavigator, "mySpace" !== i.apps.currentNavi && (i.apps.emit("removeGifFromMySpace", !1), i.apps.emit("switchMainTab", {
        friendsNavFlex: 0,
        mySpaceNavFlex: 1,
        aboutMeNavFlex: 0
      }, function () {
        i.apps.emit("mySpaceTabSwitched"), /^interact_/.test(i.apps.currentRoutes.mySpace.name) ? i.apps.emit("myInputViewMoveToHigh") : i.apps.emit("myInputViewMoveToLow"), e && e();
      }), i.apps.emit("launchMySpaceNav"), i.apps.launchMySpaceNavEmitted = !0), i.apps.currentNavi = "mySpace";
    },
    onPressAboutMeTab: function (e) {
      i.apps.curNavigator = i.apps.aboutMeNavigator, "aboutMe" !== i.apps.currentNavi && ("mySpace" === i.apps.currentNavi && i.apps.emit("removeGifFromMySpace", !0), i.apps.emit("switchMainTab", {
        friendsNavFlex: 0,
        mySpaceNavFlex: 0,
        aboutMeNavFlex: 1
      }, function () {
        i.apps.emit("aboutMeTabSwitched"), i.apps.emit("myInputViewMoveToLow"), e && e();
      }), i.apps.emit("launchAboutMeNav"), i.apps.launchAboutMeNavEmitted = !0), i.apps.currentNavi = "aboutMe";
    },
    render: function () {
      var e = this,
        a = [{
          ionicons: "ios-chatbubbles-outline",
          count: this.state.friendsTabCount,
          countColor: this.state.friendsTabCountColor,
          onPress: function () {
            i.apps.emit("friendsTabPressed"), e.onPressFriendsTab();
          }
        }, {
          ionicons: "ios-timer-outline",
          count: this.state.spaceTabCount > i.apps.RECV_CNT_LIMIT ? "" + i.apps.RECV_CNT_LIMIT : this.state.spaceTabCount,
          countColor: i.theme.warn,
          nullView: !(!i.apps.firReg || i.apps.pkgvv === i.apps.version),
          onPress: function () {
            i.apps.emit("spaceTabPressed"), i.apps.clearDeletedShares(), e.onPressSpaceTab();
          }
        }, {
          ionicons: "ios-options-outline",
          count: this.state.aboutMeTabCount,
          onPress: function () {
            i.apps.emit("aboutMeTabPressed"), e.onPressAboutMeTab();
          }
        }];
      return i.apps.launchState && "normal" === i.apps.launchState ? p["default"].createElement(i.TabView, {
        ref: function (e) {
          return i.apps.rootTab = e;
        },
        tabIndex: this.props.tabIndex,
        noSwitch: this.props.noSwitch,
        style: {
          width: i.theme.winWidth,
          height: i.theme.tabHeight
        },
        buttons: a
      }) : null;
    }
  });
});
