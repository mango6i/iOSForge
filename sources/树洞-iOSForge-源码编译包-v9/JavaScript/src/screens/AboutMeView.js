// Recovered module 354; analysis path, not original filename.
// Original SHA-256 1827ed45e08b62be719cd9a45ab06b3528e64ef7442b01d999d84222457ea160; original byte range [1671937, 1687907).
__d(354, function (e, t, a, n) {
  var r = t(311),
    i = babelHelpers.interopRequireDefault(r),
    o = t(312),
    l = t(314),
    s = i["default"].createClass({
      displayName: "AsyncBtn",
      getInitialState: function () {
        var e = this.props.data,
          t = e.label,
          a = e.value,
          n = e.cnt;
        return {
          label: t,
          value: a,
          cnt: n
        };
      },
      componentDidMount: function () {
        this.props.onDidMount && this.props.onDidMount(this.props.ctx, this.props.data, this);
      },
      componentWillReceiveProps: function (e) {
        if (!this.noUpdate) {
          var t = e.data,
            a = t.label,
            n = t.value,
            r = t.cnt;
          this.setState({
            label: a,
            value: n,
            cnt: r
          });
        }
      },
      render: function () {
        var e = this;
        return i["default"].createElement(o.TouchableOpacity, {
          style: this.props.style,
          onPress: function () {
            return e.props.onPress && e.props.onPress(e.props.ctx, e.props.data, e);
          }
        }, i["default"].createElement(o.Text, {
          style: u.settingButtonText
        }, this.state.label), i["default"].createElement(o.View, {
          style: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end"
          }
        }, this.state.cnt ? i["default"].createElement(o.View, {
          style: {
            backgroundColor: l.theme.warn,
            paddingVertical: 1,
            paddingHorizontal: 6,
            borderRadius: 11
          }
        }, i["default"].createElement(o.Text, {
          style: {
            color: l.theme.white,
            fontSize: 14
          }
        }, this.state.cnt)) : null, i["default"].createElement(o.Text, {
          style: {
            fontSize: 15,
            color: l.theme.deep7,
            marginLeft: 5
          }
        }, this.state.value), this.props.data.arrow && i["default"].createElement(l.FontAwesome, {
          name: "angle-right",
          style: {
            paddingBottom: "ios" == o.Platform.OS ? 2 : 0
          },
          size: 24,
          color: l.theme.deep8
        })));
      }
    }),
    d = i["default"].createClass({
      displayName: "Album",
      getInitialState: function () {
        var e = this.props.data,
          t = e.label,
          a = e.album;
        return {
          label: t,
          album: a
        };
      },
      componentDidMount: function () {
        this.props.onDidMount && this.props.onDidMount(this, this.props.data);
      },
      componentWillReceiveProps: function (e) {
        var t = e.data,
          a = t.label,
          n = t.album;
        this.setState({
          label: a,
          album: n
        });
      },
      render: function () {
        var e = this,
          t = Math.floor((l.theme.winWidth - 130) / 4);
        return i["default"].createElement(o.TouchableOpacity, {
          style: [this.props.style, {
            height: t + 10
          }],
          onPress: function () {
            return e.props.data.onPress && e.props.data.onPress(e);
          }
        }, i["default"].createElement(o.View, {
          style: [u.avatarImageView, {
            paddingVertical: 5,
            flexDirection: "row"
          }]
        }, i["default"].createElement(o.Text, {
          style: u.settingButtonText
        }, this.state.label), i["default"].createElement(o.View, {
          style: {
            width: 10
          }
        }), this.state.album.map(function (e) {
          return i["default"].createElement(l.CachedImage, {
            imageId: e,
            spinnerSize: 50,
            style: [{
              width: t,
              height: t,
              marginLeft: 5
            }],
            resizeMode: "cover"
          });
        })), i["default"].createElement(l.FontAwesome, {
          name: "angle-right",
          style: {
            paddingBottom: "ios" == o.Platform.OS ? 2 : 0
          },
          size: 24,
          color: l.theme.deep8
        }));
      }
    });
  n.AboutMeView = i["default"].createClass({
    displayName: "AboutMeView",
    getInitialState: function () {
      return this.listData = this.props.myProfile ? this.props.myProfile : [], {
        statusBarDiff: l.apps.statusBarDiff,
        changeUsername: !1,
        userName: this.props.userName,
        selfDesDelShow: !1,
        avatarImageName: l.apps.userAvatar + ".jpg",
        selfDes: this.props.selfDes,
        autoDiscover: !0,
        autoBeDiscovered: !0,
        dataSource: new o.ListView.DataSource({
          rowHasChanged: function (e, t) {
            return e !== t;
          }
        }).cloneWithRows(this.listData)
      };
    },
    myScrollResponderHandleStartShouldSetResponderCapture: function () {
      l.apps.closeAllModelView();
    },
    onProfileLoaded: function (e, t) {
      t === this.props.tab && (e = e.slice(), this.listData = e, this.setState({
        loaded: !0,
        dataSource: this.state.dataSource.cloneWithRows(e)
      }));
    },
    onAboutMeViewLoaded: function (e) {
      this.friendId = e, l.apps.loadProfile(this.props.userid, this.props.tab, e);
    },
    onUserChanged: function () {
      this.props.userid === l.apps.userid && l.apps.loadProfile(this.props.userid, this.props.tab, this.friendId);
    },
    notificationPermissionChanged: function () {
      l.apps.loadProfile(this.props.userid, this.props.tab, this.friendId);
    },
    componentDidMount: function () {
      l.apps.on("statusBarDiffChanged", this.onStatusBarDiffChanged), l.apps.on("showBackgroundImageToggled", this.onShowBackgroundImageToggled), l.apps.on("aboutMeViewLoaded_" + this.props.userid, this.onAboutMeViewLoaded), l.apps.on("profileLoaded_" + this.props.userid, this.onProfileLoaded), l.apps.on("notificationPermissionChanged", this.notificationPermissionChanged), l.apps.on("userChanged", this.onUserChanged);
    },
    componentWillUnmount: function () {
      l.apps.unon("statusBarDiffChanged", this.onStatusBarDiffChanged), l.apps.unon("showBackgroundImageToggled", this.onShowBackgroundImageToggled), l.apps.unon("aboutMeViewLoaded_" + this.props.userid, this.onAboutMeViewLoaded), l.apps.unon("profileLoaded_" + this.props.userid, this.onProfileLoaded), l.apps.unon("notificationPermissionChanged", this.notificationPermissionChanged), l.apps.unon("userChanged", this.onUserChanged);
    },
    onShowBackgroundImageToggled: function () {
      this.setListData(l.apps.changeAllListData(this.listData));
    },
    setListData: function (e) {
      this.listData = e, this.setState({
        dataSource: this.state.dataSource.cloneWithRows(e)
      });
    },
    renderSubTitleView: function (e) {
      return i["default"].createElement(o.View, {
        style: u.subTitleView
      }, i["default"].createElement(o.Text, {
        style: u.subTitleText
      }, e));
    },
    renderSep: function () {
      return l.apps.showBackgroundImage ? i["default"].createElement(o.View, {
        style: {
          backgroundColor: l.theme.transparent,
          width: l.theme.winWidth,
          height: 1
        }
      }) : i["default"].createElement(o.View, {
        style: {
          backgroundColor: l.theme.lightd,
          width: l.theme.winWidth,
          height: l.theme.px1
        }
      });
    },
    renderNil: function () {
      return i["default"].createElement(o.View, {
        style: {
          height: 0
        }
      });
    },
    renderBar: function () {
      return i["default"].createElement(o.View, null, i["default"].createElement(o.View, {
        style: {
          backgroundColor: l.theme.transparent,
          width: l.theme.winWidth,
          height: 10
        }
      }), this.renderSep());
    },
    onSwitchValueChange: function (e, t, a) {
      this.setListData(l.apps.changeListData(this.listData, function (e) {
        return e.name === t.name;
      }, function (e) {
        return e.value = a;
      }));
    },
    resizeMode: function (e) {
      var t = e.match(/^(\d+):/);
      return t && parseInt(t, 10) > 2 ? "contain" : "cover";
    },
    renderRow: function (e) {
      var t = this;
      if (!e) return null;
      var a = {
          backgroundColor: l.apps.showBackgroundImage ? l.theme.aboutRowBg : l.theme.aboutMeViewItemBackground
        },
        n = {
          paddingHorizontal: 10,
          paddingVertical: 5,
          justifyContent: "space-between",
          alignItems: "center",
          height: 37,
          flexDirection: "row",
          backgroundColor: l.theme.aboutSettingButton
        },
        r = {
          paddingLeft: 10,
          paddingRight: 9,
          paddingVertical: 5,
          justifyContent: "space-between",
          alignItems: "center",
          flexDirection: "row",
          backgroundColor: l.theme.aboutAvatarButton
        };
      return "myAvatar" === e.type ? i["default"].createElement(o.View, null, i["default"].createElement(o.TouchableOpacity, {
        style: [r, a],
        onPress: function () {
          return e.onPress(t);
        }
      }, i["default"].createElement(o.Text, {
        style: u.settingButtonText
      }, e.label), i["default"].createElement(o.View, {
        style: [u.avatarImageView, {
          paddingLeft: 30
        }]
      }, i["default"].createElement(l.CachedImage, {
        ref: function (e) {
          return t.avatarRef = e;
        },
        spinnerSize: 50,
        style: [u.avatarImage],
        avatarId: e.userid,
        resizeMode: "cover"
      }))), this.renderSep()) : "album" === e.type ? i["default"].createElement(o.View, null, i["default"].createElement(d, {
        style: [r, a],
        data: e,
        onDidMount: e.onDidMount,
        ctx: this
      }), this.renderSep()) : "friendAvatar" === e.type ? i["default"].createElement(o.View, null, i["default"].createElement(o.View, {
        style: [r, a, {
          backgroundColor: l.theme.transparent,
          justifyContent: "center",
          alignItems: "flex-start"
        }]
      }, i["default"].createElement(o.TouchableOpacity, {
        style: u.avatarImageView,
        onPress: function () {
          e.canBeModify ? e.changeAvatar(t) : l.apps.getProfileK(e.userid, "avatar").then(function (e) {
            /.*\.\w+$/.test(e) || (e += ".jpg"), l.apps.emit("showModelImage", {
              imgId: e,
              ratio: 1,
              nobar: 1
            });
          })["catch"](function (t) {
            (0, l.tlog)("error", "friendAvatar", e.userid, t);
          });
        }
      }, i["default"].createElement(l.CachedImage, {
        ref: function (e) {
          return t.friendAvatarRef = e;
        },
        spinnerSize: 50,
        style: [u.friendAvatarImage],
        avatarId: e.userid,
        resizeMode: this.resizeMode(e.userid)
      })), i["default"].createElement(o.View, {
        style: {
          width: 20
        }
      }), l.apps.showCmdBall ? i["default"].createElement(o.TouchableOpacity, {
        style: u.avatarImageView,
        onPress: function () {
          l.apps.curNavigator.navi.navForward(l.apps.newRoute(l.apps.curNavigator.routes, "about_", {
            friendId: l.apps.getShadowId(e.userid),
            name: (0, l.tr)("Profile")
          }));
        }
      }, i["default"].createElement(l.CachedImage, {
        ref: function (e) {
          return t.friendAvatarRef = e;
        },
        spinnerSize: 50,
        style: [u.friendAvatarImage],
        avatarId: l.apps.getShadowId(e.userid),
        noAvatarErr: !0,
        resizeMode: this.resizeMode(e.userid)
      })) : null), this.renderSep()) : "swi" === e.type ? i["default"].createElement(o.View, null, i["default"].createElement(o.View, {
        style: ["ios" == o.Platform.OS ? {
          paddingRight: 0
        } : {
          paddingRight: 5
        }].concat([n, a])
      }, i["default"].createElement(o.Text, {
        style: u.settingButtonText
      }, e.label), "ios" === o.Platform.OS ? i["default"].createElement(o.Switch, {
        onValueChange: function (a) {
          e.onValueChange ? e.onValueChange(t, e, a) : t.onSwitchValueChange(t, e, a);
        },
        value: !!e.value
      }) : i["default"].createElement(l.MySwitch, {
        value: !!e.value,
        name: e.name,
        onSyncPress: function (a) {
          e.onValueChange && e.onValueChange(t, e, a);
        }
      })), this.renderSep()) : "sep" === e.type ? this.renderSep() : "nil" === e.type ? this.renderNil() : "bar" === e.type ? this.renderBar() : "btn" === e.type ? i["default"].createElement(o.View, {
        onLayout: function () {
          return e.onLayout && e.onLayout(t, e);
        }
      }, e.explanation && i["default"].createElement(o.View, {
        style: {
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 5,
          paddingVertical: 3,
          backgroundColor: l.apps.tipBackgroundColor()
        }
      }, i["default"].createElement(o.Text, {
        style: {
          textAlign: "ios" === o.Platform.OS ? "justify" : "left",
          marginVertical: 2,
          fontSize: 12,
          color: l.theme.white
        }
      }, e.explanation)), i["default"].createElement(o.TouchableOpacity, {
        style: [n, a, e.fullValue ? {height: undefined, minHeight: 37, alignItems: "flex-start"} : null],
        onPress: function () {
          return e.onPress && e.onPress(t, e);
        },
        onLongPress: function () {
          return e.onLongPress && e.onLongPress(t, e);
        }
      }, i["default"].createElement(l.MyTextView, {
        myTextValue: e.label,
        imageFontSize: 16,
        style: u.settingButtonText
      }), i["default"].createElement(o.View, {
        style: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          flex: e.fullValue ? 1 : undefined,
          minWidth: 0,
          marginLeft: e.fullValue ? 8 : 0
        }
      }, e.isName ? i["default"].createElement(l.NameText, {
        style: {
          fontSize: 17,
          color: l.theme.deep7
        },
        userid: e.userid,
        showCountry: !!l.apps.showCmdBall
      }) : e.value || 0 === e.value ? i["default"].createElement(o.Text, {
        selectable: !!e.fullValue,
        style: {
          fontSize: 17,
          color: l.theme.deep7,
          flexShrink: e.fullValue ? 1 : undefined,
          textAlign: e.fullValue ? "right" : undefined
        }
      }, e.value) : i["default"].createElement(o.View, {
        style: {
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: l.theme.warn,
          justifyContent: "center",
          alignItems: "center"
        }
      }, i["default"].createElement(o.Text, {
        style: {
          color: l.theme.white,
          fontSize: 15,
          fontWeight: "bold",
          textAlignVertical: "center"
        }
      }, "?")), e.gender && l.apps.profiles[e.userid] && l.apps.profiles[e.userid].gender ? l.apps.showCmdBall ? i["default"].createElement(l.CachedImage, {
        imageId: l.apps.getGenderImageId(e.userid),
        resizeMode: "cover",
        fadeDuration: 0,
        style: {
          width: 20,
          height: 20
        }
      }) : i["default"].createElement(l.CachedImage, {
        defaultSource: l.apps.getGenderSource(e.userid),
        resizeMode: "cover",
        fadeDuration: 0,
        style: {
          width: 20,
          height: 20
        }
      }) : null, e.redMark ? i["default"].createElement(o.View, {
        style: {
          backgroundColor: l.theme.warn,
          marginLeft: 5,
          marginRight: 0,
          paddingVertical: 1,
          paddingHorizontal: 6,
          borderRadius: 11
        }
      }, i["default"].createElement(o.Text, {
        style: {
          color: l.theme.white,
          fontSize: 14
        }
      }, e.redMark)) : null, e.rightIcon && i["default"].createElement(l.FontAwesome, {
        name: e.rightIcon,
        style: {
          paddingBottom: "ios" == o.Platform.OS ? 2 : 0,
          marginLeft: 5
        },
        size: 24,
        color: e.rightIconColor || l.theme.deep8
      }), e.arrow && i["default"].createElement(l.FontAwesome, {
        name: "angle-right",
        style: {
          paddingBottom: "ios" == o.Platform.OS ? 2 : 0
        },
        size: 24,
        color: l.theme.deep8
      }))), e.bottomBar ? i["default"].createElement(o.View, {
        style: {
          backgroundColor: l.theme.transparent,
          width: l.theme.winWidth,
          height: 10
        }
      }) : null, this.renderSep()) : "lab" === e.type ? i["default"].createElement(o.View, null, i["default"].createElement(o.View, {
        style: [n, a]
      }, i["default"].createElement(o.Text, {
        style: u.settingButtonText
      }, e.label), e.value || 0 === e.value ? i["default"].createElement(o.Text, {
        style: {
          fontSize: 17,
          color: l.theme.deep7
        }
      }, e.value) : i["default"].createElement(o.View, {
        style: {
          paddingHorizontal: 5,
          height: 16,
          borderRadius: 8,
          backgroundColor: l.theme.warn,
          justifyContent: "center",
          alignItems: "center"
        }
      }, i["default"].createElement(o.Text, {
        style: {
          color: l.theme.white,
          fontSize: 9,
          fontWeight: "bold",
          textAlignVertical: "center"
        }
      }, "?"))), this.renderSep()) : "pbtn" === e.type ? i["default"].createElement(o.TouchableOpacity, {
        onPress: function () {
          return e.onPress && e.onPress(t, e);
        },
        style: [{
          marginVertical: 3,
          marginHorizontal: 7,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 15,
          backgroundColor: e.color
        }, e.style]
      }, i["default"].createElement(o.Text, {
        style: [u.settingButtonText, {
          color: e.textColor
        }]
      }, e.text)) : "asyncBtn" === e.type ? i["default"].createElement(o.View, null, i["default"].createElement(s, {
        onPress: e.onPress,
        style: [n, a],
        onDidMount: e.onDidMount,
        ctx: this,
        data: e
      }), e.bottomBar ? i["default"].createElement(o.View, {
        style: {
          backgroundColor: l.theme.transparent,
          width: l.theme.winWidth,
          height: 10
        }
      }) : null, this.renderSep()) : "slider" === e.type ? i["default"].createElement(o.View, null, i["default"].createElement(o.View, {
        style: [n, a]
      }, i["default"].createElement(o.Text, {
        style: [u.settingButtonText]
      }, e.label), i["default"].createElement(l.Slider, {
        style: {
          flex: 1,
          marginLeft: 10
        },
        onSlidingComplete: function (a) {
          return e.onValueChange(t, e, a);
        },
        value: e.value,
        minimumTrackTintColor: l.theme.deepGreen2,
        maximumTrackTintColor: l.theme.transparent,
        thumbTintColor: l.theme.white,
        thumbTouchSize: {
          width: 36,
          height: 36
        },
        thumbStyle: {
          width: 17,
          height: 17
        },
        trackStyle: {
          height: 2
        }
      })), this.renderSep()) : null;
    },
    onStatusBarDiffChanged: function (e) {
      this.setState({
        statusBarDiff: e
      });
    },
    render: function () {
      return i["default"].createElement(o.View, {
        style: {
          flex: 1
        }
      }, i["default"].createElement(o.View, {
        style: {
          height: l.theme.navHeight
        }
      }), i["default"].createElement(l.BackgroundImageView, {
        shouldRender: !0,
        userid: l.apps.userid,
        maskColor: l.theme.lightLessTrans6
      }), i["default"].createElement(o.View, {
        style: {
          height: l.theme.mainAreaHeight - this.state.statusBarDiff + (this.props.mainTab ? 0 : l.theme.tabHeight),
          backgroundColor: l.theme.transparent
        }
      }, this.state.loaded ? i["default"].createElement(o.ListView, {
        ref: "listView",
        style: {
          flex: 1,
          backgroundColor: l.theme.aboutMeViewBackground
        },
        dataSource: this.state.dataSource,
        renderRow: this.renderRow,
        initialListSize: 20,
        pageSize: 20,
        onStartShouldSetResponderCapture: this.myScrollResponderHandleStartShouldSetResponderCapture
      }) : i["default"].createElement(l.InterActionSpinner, {
        glass: !0
      })), this.props.mainTab ? i["default"].createElement(l.MainTabView, {
        tabIndex: 2,
        noSwitch: !0
      }) : null);
    }
  });
  var u = {
    avatarContainer: {
      borderWidth: l.theme.px1,
      borderColor: l.theme.bubbleBorder,
      marginHorizontal: 10,
      marginTop: 7,
      backgroundColor: l.theme.lighterTrans5,
      borderRadius: 3,
      flexDirection: "row",
      justifyContent: "space-between"
    },
    userNameContainer: {
      paddingVertical: 10,
      borderWidth: l.theme.px1,
      borderColor: l.theme.bubbleBorder,
      marginTop: 7,
      marginHorizontal: 10,
      backgroundColor: l.theme.lighterTrans5,
      borderRadius: 3,
      flexDirection: "row",
      justifyContent: "space-between"
    },
    labelView: {
      justifyContent: "center",
      alignItems: "center"
    },
    labelText: {
      marginHorizontal: 10,
      color: l.theme.deep6,
      fontSize: 15
    },
    settingsContainer: {
      borderWidth: l.theme.px1,
      borderColor: l.theme.bubbleBorder,
      marginTop: 7,
      marginHorizontal: 10,
      paddingBottom: 2,
      backgroundColor: l.theme.lighterTrans5,
      borderRadius: 3
    },
    subTitleView: {
      backgroundColor: l.theme.deep,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: 2
    },
    subTitleText: {
      color: l.theme.deep6,
      fontSize: 15
    },
    userNameText: {
      color: l.theme.deep7,
      fontSize: 14
    },
    selfDesView: {
      marginHorizontal: 20
    },
    avatarImageView: {
      justifyContent: "center",
      alignItems: "center"
    },
    avatarChangeButton: {
      borderRadius: 5
    },
    avatarImage: {
      width: l.theme.userListRowHeight - 12,
      height: l.theme.userListRowHeight - 12,
      borderRadius: (l.theme.userListRowHeight - 14) / 2,
      marginVertical: 2
    },
    friendAvatarImage: {
      width: 100,
      height: 100,
      borderRadius: 20
    },
    userNameContentView: {
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 5,
      height: 33
    },
    passwordContainer: {
      borderWidth: 1,
      borderColor: l.theme.deep,
      marginHorizontal: 20
    },
    passwordContentView: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 5
    },
    settingButtonText: {
      fontSize: 16,
      color: l.theme.deep7,
      textAlign: "center"
    },
    settingBtn: {
      marginHorizontal: 20,
      borderRadius: 5,
      backgroundColor: l.theme.deep,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 15,
      paddingVertical: 2
    },
    settingBtnText: {
      color: l.theme.deep6,
      textAlign: "center",
      fontSize: 14
    },
    sep: {
      height: l.theme.px1,
      marginHorizontal: 0,
      backgroundColor: l.theme.bubbleBorder
    }
  };
});
