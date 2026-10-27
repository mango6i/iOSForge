// Maintenance source; recovered reference retained separately.
// Free maintenance changes; original factory retained under reference/original-modules/363.js.
__d(363, function (e, t, a, s) {
  var __recoveryFreePolicy = t(9000);
  var n = t(311),
    i = babelHelpers.interopRequireDefault(n),
    r = t(312),
    o = t(314),
    l = i["default"].createClass({
      displayName: "SelectRow",
      getInitialState: function () {
        var e = this;
        this.selectData = this.props.selectData;
        var t = this.selectData.selects.findIndex(function (t) {
          return t.friendId === e.props.data.friendId || t.name === e.props.data.name;
        });
        return {
          renderNameFail: !1,
          selected: -1 !== t,
          markColor: this.props.markColor || o.theme.deepGreen
        };
      },
      componentWillReceiveProps: function (e) {
        this.selectData = e.selectData;
        var t = this.props.data,
          a = (t.name, t.friendId),
          s = e.data,
          n = s.name,
          i = s.friendId;
        if (a !== i) {
          var r = this.selectData.selects.findIndex(function (e) {
            return e.friendId === i || e.name === n;
          });
          this.setState({
            selected: -1 !== r
          });
        }
      },
      renderRedCnt: function () {
        var e,
          t = this.props.data,
          a = t.type,
          s = t.friendId;
        return o.apps.isIn(a, 3, 8, -103, -104) || s === o.apps.userid ? (-103 !== a || o.apps.disableShadowRemind ? 8 === a ? e = o.apps.circleMsgUnreadList.length + o.apps.circleShareUnreadList.length : 3 === a || o.apps.newFollowers.cnt || false : o.apps.shaM && o.apps.shaM !== o.apps.shaMClear && (e = o.apps.shaM.split(",").pop()), e ? i["default"].createElement(r.View, {
          style: {
            backgroundColor: o.theme.warn,
            marginLeft: 8,
            marginRight: 10,
            paddingVertical: 1,
            paddingHorizontal: 6,
            borderRadius: 11
          }
        }, i["default"].createElement(r.Text, {
          style: {
            color: o.theme.white,
            fontSize: 14
          }
        }, e > o.apps.RECV_CNT_LIMIT ? "" + o.apps.RECV_CNT_LIMIT : e)) : null) : void 0;
      },
      renderSubAvatar: function () {
        try {
          var e,
            t = this.props.data.type;
          return -103 !== t || o.apps.disableShadowRemind ? 8 === t ? o.apps.circleMsgUnreadList.length ? e = o.apps.circleMsgUnreadList[o.apps.circleMsgUnreadList.length - 1].fromId : o.apps.circleShareUnreadList.length && (e = o.apps.circleShareUnreadList[o.apps.circleShareUnreadList.length - 1].fromId) : 3 === t && o.apps.lastBottleUserid || this.props.data.friendId === o.apps.userid && o.apps.lastNewFollower : o.apps.shaM && o.apps.shaM !== o.apps.shaMClear && (e = o.apps.shaM.split(",").slice(-4, -1)), e ? i["default"].createElement(r.View, {
            style: {
              flexDirection: "row",
              marginRight: 6,
              justifyContent: "center",
              alignItems: "center"
            }
          }, "string" == typeof e ? i["default"].createElement(o.CachedImage, {
            avatarId: e,
            style: {
              height: 30,
              width: 30,
              borderRadius: 5
            },
            resizeMode: "cover"
          }) : e.map(function (t) {
            return t ? i["default"].createElement(o.CachedImage, {
              avatarId: t,
              style: {
                height: 30,
                width: 30,
                borderRadius: 5,
                marginLeft: 3
              },
              resizeMode: "cover"
            }) : ((0, o.tlog)("error", "selectView avatarId null", e, t), null);
          }), i["default"].createElement(o.FontAwesome, {
            name: "angle-right",
            style: {
              marginLeft: 6,
              paddingBottom: "ios" == r.Platform.OS ? 2 : 0
            },
            size: 24,
            color: o.theme.deep8
          })) : null;
        } catch (a) {
          return (0, o.tlog)("error", "renderSubAvatar", a), null;
        }
      },
      renderAvatar: function () {
        var e = this.props.data.type;
        if (-3 > e) return o.apps.isIn(e, o.apps.CONS_SEL_FIRST_NOTI) ? i["default"].createElement(r.View, {
          style: {
            marginHorizontal: 10,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: o.theme.warn,
            justifyContent: "center",
            alignItems: "center"
          }
        }, i["default"].createElement(r.Text, {
          style: {
            color: o.theme.white,
            fontSize: 15,
            fontWeight: "bold",
            textAlignVertical: "center"
          }
        }, "?")) : -103 === e ? (s = "/a/anon.png", i["default"].createElement(o.CachedImage, {
          imageId: s,
          style: {
            height: 35,
            width: 35,
            borderRadius: 5,
            marginLeft: 6,
            marginRight: 6
          },
          resizeMode: "cover"
        })) : i["default"].createElement(r.View, {
          style: {
            width: 10
          }
        });
        var t = this.props.data.friendId,
          a = t.match(/^(\d+):/);
        if (a = parseInt(a, 10), 8 === a) {
          var s = "/a/drift_circle_dark.png";
          return i["default"].createElement(o.CachedImage, {
            imageId: s,
            style: {
              height: 35,
              width: 35,
              borderRadius: 5,
              marginLeft: 6,
              marginRight: 6
            },
            resizeMode: "cover"
          });
        }
        return 3 === a ? (s = "/a/tree.png", i["default"].createElement(o.CachedImage, {
          imageId: s,
          style: {
            height: 35,
            width: 35,
            borderRadius: 5,
            marginLeft: 6,
            marginRight: 6
          },
          resizeMode: "cover"
        })) : i["default"].createElement(o.CachedImage, {
          avatarId: t,
          style: {
            height: 35,
            width: 35,
            borderRadius: 5,
            marginLeft: 9,
            marginRight: 7
          },
          resizeMode: "cover"
        });
      },
      renderName: function () {
        return this.props.data.type < 0 ? i["default"].createElement(r.Text, {
          style: {
            fontSize: 17,
            color: o.theme.deep7
          }
        }, (0, o.tr)(this.props.data.name)) : i["default"].createElement(o.NameText, {
          userid: this.props.data.friendId,
          imageFontSize: 15,
          style: {
            fontSize: 15,
            color: o.theme.deep7
          },
          numberOfLines: 1,
          showCountry: !!o.apps.showCmdBall
        });
      },
      selectedToggle: function () {
        var e = this;
        if (!(this.props.onToggle && this.props.onToggle(this) || this.props.data.onToggle && this.props.data.onToggle(this))) {
          if (this.props.data.type === o.apps.CONS_SEL_WALLPAPER) {
            if (0 === o.apps.picsForBackgroundSetting.length || 0 === o.apps.picsForBackgroundSetting.slice(1).filter(function (e) {
              return !o.apps.isSendUriVideo[e];
            }).length) o.apps.tip("You should have some pictures selected for share set as wallpaper");else {
              for (var t = o.apps.dataForBackgroundSetting.i + 1; o.apps.isSendUriVideo[o.apps.picsForBackgroundSetting[t]];) t += 1;
              o.apps.dataForBackgroundSetting.i = t === o.apps.picsForBackgroundSetting.length ? 0 : t, this.setState({
                selected: !!o.apps.dataForBackgroundSetting.i
              }, function () {
                return e.props.data.onSelect();
              });
            }
          } else if (this.props.data.type === o.apps.CONS_SEL_STRANGER) {
            (0, o.tr)("This option means your story may be picked up by non-friends");
            this.state.selected ? (this.selectData.selects = this.selectData.selects.filter(function (e) {
              return e.type !== o.apps.CONS_SEL_STRANGER;
            }), o.apps.emit("doneButtonStateChanged_" + this.props.tag), this.setState({
              selected: !this.state.selected
            })) : (o.apps.emit("toggleOnlyMeSelected", !1), this.selectData.selects = this.selectData.selects.filter(function (e) {
              return e.type !== o.apps.CONS_SEL_ME;
            }), this.selectData.selects.push(this.props.data), o.apps.emit("doneButtonStateChanged_" + this.props.tag), this.setState({
              selected: !this.state.selected
            }));
          } else if (this.props.data.type === o.apps.CONS_SEL_ANON) {
            if (!this.props.firstShare) return void o.apps.tip("You could not change this option on an already sent story");
            var a = this.selectData.selects.findIndex(function (e) {
              return e.type === o.apps.CONS_SEL_PUBLIC;
            });
            -1 !== a && (o.apps.emit("togglePublicCommentSelected", !1), this.selectData.selects.splice(a, 1)), o.apps.anonymousChecked = !this.state.selected, this.setState({
              selected: !this.state.selected
            }, function () {
              if (e.state.selected) o.apps.tip((0, o.tr)("This option means when people receive your story, it will be anonymous to him or her in the next 24 hours.")), e.selectData.selects.push(e.props.data);else {
                var t = e.selectData.selects.findIndex(function (t) {
                  return t.friendId === e.props.data.friendId;
                });
                e.selectData.selects.splice(t, 1);
              }
            });
          } else this.props.data.type === o.apps.CONS_SEL_CONTACTS ? "shareSelect" === this.props.tag && -1 !== this.props.target.indexOf(this.props.data.friendId) ? o.apps.tip("Cannot uncheck a friend that has already been sent this story") : this.setState({
            selected: !this.state.selected
          }, function () {
            if (e.state.selected) {
              (0, o.dismissKeyboard)(), e.selectData.selects.push(e.props.data);
              var t = e.selectData.selects.filter(function (e) {
                return e.type !== o.apps.CONS_SEL_ME;
              });
              t.length !== e.selectData.selects.length && (e.selectData.selects = t, o.apps.emit("toggleOnlyMeSelected", !1)), e.onToggleContactsFriendSelected = function (t) {
                return e.setState({
                  selected: t
                });
              }, o.apps.on("toggleContactsFriendSelected", e.onToggleContactsFriendSelected);
            } else {
              var a = e.selectData.selects.findIndex(function (t) {
                return t.friendId === e.props.data.friendId;
              });
              e.selectData.selects.splice(a, 1), o.apps.unon("toggleContactsFriendSelected", e.onToggleContactsFriendSelected);
            }
            o.apps.emit("doneButtonStateChanged_" + e.props.tag);
          }) : this.props.data.type === o.apps.CONS_SEL_PUBLIC ? this.setState({
            selected: !this.state.selected
          }, function () {
            if (e.state.selected) o.apps.diag({
              header: (0, o.tr)("Tips"),
              content: (0, o.tr)("When you check Public Reply Mode, people could see each other's replies. So in this mode replies are just like a group chat."),
              buttons: [{
                text: (0, o.tr)("OK"),
                onPress: function (t) {
                  return o.apps.closeDiag(function () {
                    o.apps.emit("toggleAnonymousShare", !1), o.apps.anonymousChecked = !1;
                    var t = e.selectData.selects.findIndex(function (e) {
                      return e.type === o.apps.CONS_SEL_ANON;
                    });
                    e.selectData.selects.splice(t, 1), e.selectData.selects.push(e.props.data), o.apps.emit("doneButtonStateChanged_" + e.props.tag);
                  });
                }
              }]
            });else {
              var t = e.selectData.selects.findIndex(function (t) {
                return t.friendId === e.props.data.friendId;
              });
              e.selectData.selects.splice(t, 1), o.apps.emit("doneButtonStateChanged_" + e.props.tag);
            }
          }) : "shareSelect" === this.props.tag && -1 !== this.props.target.indexOf(this.props.data.friendId) ? o.apps.tip("Cannot uncheck a friend that has already been sent this story") : this.setState({
            selected: !this.state.selected
          }, function () {
            if (e.state.selected) {
              if (e.selectData.selects.push(e.props.data), "shareSelect" === e.props.tag) if (1 === e.props.data.type || 2 === e.props.data.type) {
                var t = e.selectData.selects.filter(function (e) {
                  return e.type !== o.apps.CONS_SEL_ALL && e.type !== o.apps.CONS_SEL_ME;
                });
                t.length !== e.selectData.selects.length && (e.selectData.selects = t, o.apps.emit("toggleAllFriendsSelected", !1), o.apps.emit("toggleOnlyMeSelected", !1)), e.onToggleSingleFriendSelected = function (t) {
                  return e.setState({
                    selected: t
                  });
                }, o.apps.on("toggleSingleFriendSelected", e.onToggleSingleFriendSelected);
              } else e.props.data.type === o.apps.CONS_SEL_ALL ? (o.apps.emit("toggleOnlyMeSelected", !1), o.apps.emitOnce("toggleSingleFriendSelected", !1), e.selectData.selects = e.selectData.selects.filter(function (e) {
                return 1 !== e.type && 2 !== e.type && e.type !== o.apps.CONS_SEL_ME;
              })) : e.props.data.type === o.apps.CONS_SEL_ME && (o.apps.emit("toggleAllFriendsSelected", !1), o.apps.emit("togglePostSomeonSelected", !1), o.apps.emitOnce("toggleSingleFriendSelected", !1), o.apps.emitOnce("toggleContactsFriendSelected", !1), o.apps.emit("toggleAnonymousShare", !1), o.apps.anonymousChecked = !1, e.selectData.selects = e.selectData.selects.filter(function (e) {
                return o.apps.notIn(e.type, 1, 2, o.apps.CONS_SEL_ALL, o.apps.CONS_SEL_STRANGER, o.apps.CONS_SEL_ANON, o.apps.CONS_SEL_CONTACTS);
              }));
            } else {
              var a = e.selectData.selects.findIndex(function (t) {
                return t.friendId === e.props.data.friendId;
              });
              e.selectData.selects.splice(a, 1), "shareSelect" === e.props.tag && (1 !== e.props.data.type && 2 !== e.props.data.type || o.apps.unon("toggleSingleFriendSelected", e.onToggleSingleFriendSelected));
            }
            o.apps.emit("doneButtonStateChanged_" + e.props.tag);
          });
          setTimeout(function () {
            return (0, o.tlog)("SelectView selects", e.selectData.selects.map(function (e) {
              return e.name || e.friendId;
            }));
          }, 1e3);
        }
      },
      componentDidMount: function () {
        var e = this,
          t = this.props.data,
          a = t.type,
          s = t.friendId;
        (o.apps.isIn(a, 3, 8, -103, -104) || s === o.apps.userid) && o.apps.on("spaceUnreadChanged", this.spaceUnreadChanged), "shareSelect" === this.props.tag && (a === o.apps.CONS_SEL_ALL ? (this.onToggleAllFriendsSelected = function (t) {
          return e.setState({
            selected: t
          });
        }, o.apps.on("toggleAllFriendsSelected", this.onToggleAllFriendsSelected)) : a === o.apps.CONS_SEL_STRANGER ? (this.onTogglePostSomeone = function (t) {
          return e.setState({
            selected: t
          });
        }, o.apps.on("togglePostSomeonSelected", this.onTogglePostSomeone)) : a === o.apps.CONS_SEL_ME ? (this.onToggleOnlyMeSelected = function (t) {
          return e.setState({
            selected: t
          });
        }, o.apps.on("toggleOnlyMeSelected", this.onToggleOnlyMeSelected)) : a === o.apps.CONS_SEL_ANON ? (this.onToggleAnonymousShare = function (t) {
          return e.setState({
            selected: t
          });
        }, o.apps.on("toggleAnonymousShare", this.onToggleAnonymousShare)) : a === o.apps.CONS_SEL_PUBLIC ? (this.togglePublicCommentSelected = function (t) {
          return e.setState({
            selected: t
          });
        }, o.apps.on("togglePublicCommentSelected", this.togglePublicCommentSelected)) : this.state.selected && a === o.apps.CONS_SEL_CONTACTS ? (this.onToggleContactsFriendSelected = function (t) {
          return e.setState({
            selected: t
          });
        }, o.apps.on("toggleContactsFriendSelected", this.onToggleContactsFriendSelected)) : this.state.selected && (this.onToggleSingleFriendSelected = function (t) {
          return e.setState({
            selected: t
          });
        }, o.apps.on("toggleSingleFriendSelected", this.onToggleSingleFriendSelected)));
      },
      spaceUnreadChanged: function () {
        o.apps.switchingShadow || this.setState({});
      },
      componentWillUnmount: function () {
        var e = this.props.data,
          t = e.type,
          a = e.friendId;
        (o.apps.isIn(t, 3, 8, -103, -104) || a === o.apps.userid) && o.apps.unon("spaceUnreadChanged", this.spaceUnreadChanged), "shareSelect" === this.props.tag && (t === o.apps.CONS_SEL_ALL && this.onToggleAllFriendsSelected ? o.apps.unon("toggleAllFriendsSelected", this.onToggleAllFriendsSelected) : t === o.apps.CONS_SEL_STRANGER && this.onTogglePostSomeone ? o.apps.unon("togglePostSomeonSelected", this.onTogglePostSomeone) : t === o.apps.CONS_SEL_ME ? o.apps.unon("toggleOnlyMeSelected") : t === o.apps.CONS_SEL_ANON ? o.apps.unon("toggleAnonymousShare") : this.onToggleSingleFriendSelected && o.apps.unon("toggleSingleFriendSelected", this.onToggleSingleFriendSelected));
      },
      render: function () {
        var e = this;
        if (this.state.renderNameFail) return null;
        if (o.apps.isIn(this.props.data.friendId, "-2", "-1", "1", "end", "\uffffend")) return null;
        if (o.apps.showBackgroundImage) var t = o.theme.selectRowBg,
          a = {
            height: 1,
            backgroundColor: o.theme.transparent
          };else t = o.theme.selectViewItemBackground, a = {
          height: o.theme.px1,
          backgroundColor: o.theme.lightd
        };
        var addedTime=this.props.tag === "contactsBoard" ? o.apps.recoveryFriendAddedTime(this.props.data) : "";
        var s = addedTime ? 65 : this.props.data.type < 0 ? 40 : 45;
        if (this.props.data.pNum) var n = this.props.data.pNum.replace(/[^0-9+]/g, "");
        return i["default"].createElement(r.View, {
          style: {
            flex: 1
          }
        }, o.apps.showBackgroundImage ? i["default"].createElement(r.View, {
          style: a
        }) : null, n ? i["default"].createElement(r.TouchableOpacity, {
          onStartShouldSetResponder: function () {
            return "__eggfNoResponderCapture__";
          },
          style: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: t,
            height: s,
            width: o.theme.winWidth
          },
          onPress: function () {
            return e.selectedToggle();
          }
        }, i["default"].createElement(r.View, {
          style: {
            flex: 1,
            marginHorizontal: 7,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between"
          }
        }, this.renderName(), i["default"].createElement(r.Text, {
          style: {
            fontSize: 17,
            color: o.theme.deep7
          }
        }, n)), this.state.selected && i["default"].createElement(o.Ionicons, {
          name: "md-checkmark",
          style: {
            marginHorizontal: 7
          },
          size: 25,
          color: this.state.markColor
        })) : i["default"].createElement(r.TouchableOpacity, {
          onStartShouldSetResponder: function () {
            return "__eggfNoResponderCapture__";
          },
          style: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            backgroundColor: t,
            height: s,
            width: o.theme.winWidth
          },
          onPress: function () {
            return e.selectedToggle();
          }
        }, i["default"].createElement(r.View, {
          style: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center"
          }
        }, this.renderAvatar(), this.renderName(), this.renderRedCnt()), this.renderSubAvatar(), this.state.selected && i["default"].createElement(o.Ionicons, {
          name: "md-checkmark",
          style: {
            marginHorizontal: 7
          },
          size: 25,
          color: this.state.markColor
        })), this.props.tag === "contactsBoard" && o.apps.recoveryFriendAddedTime(this.props.data) ? i.default.createElement(r.Text, {
          style: {
            fontSize: 10,
            color: o.theme.deep6,
            textAlign: "right",
            position: "absolute",
            right: 10,
            bottom: 3
          }
        }, "添加于：" + o.apps.recoveryFriendAddedTime(this.props.data)) : null, o.apps.showBackgroundImage ? null : i["default"].createElement(r.View, {
          style: a
        }));
      }
    });
  s.DoneButton = i["default"].createClass({
    displayName: "DoneButton",
    getInitialState: function () {
      return this.changeData = this.props.selectData, {
        text: this.props.text || (0, o.tr)("Done"),
        disabled: this.props.disabled,
        enableColor: this.props.enableColor || o.theme.deepGreen2
      };
    },
    componentDidMount: function () {
      o.apps.on("doneButtonStateChanged_" + this.props.tag, this.onDoneButtonStateChanged);
    },
    componentWillReceiveProps: function (e) {
      this.changeData = e.selectData;
    },
    componentWillUnmount: function () {
      o.apps.unon("doneButtonStateChanged_" + this.props.tag, this.onDoneButtonStateChanged);
    },
    onDoneButtonStateChanged: function () {
      this.props.onDoneStateChanged(this);
    },
    render: function () {
      var e = this;
      return i["default"].createElement(r.TouchableOpacity, {
        style: [{
          flex: 1,
          width: 44,
          height: 44,
          justifyContent: "center",
          alignItems: "center"
        }, o.theme.isIphoneX && {}],
        onPress: function () {
          return e.props.onPress(e);
        }
      }, i["default"].createElement(r.Text, {
        style: {
          fontSize: 18,
          color: this.state.disabled ? o.theme.fontLight : this.state.enableColor
        }
      }, this.state.text));
    }
  }), s.SelectView = i["default"].createClass({
    displayName: "SelectView",
    mixins: [o.ScrollResponder.Mixin],
    getInitialState: function () {
      return this.selectData = this.props.selectData, this.viewMaxHeight = o.theme.winHeight - o.theme.statusHeightAll - o.theme.navHeight - (this.props.mainTab ? o.theme.tabHeight : 0), this.viewHeight = this.viewMaxHeight, this._viewHeight = this.viewMaxHeight, {
        searchKeyValue: "",
        noSearch: this.props.noSearch,
        viewHeight: new r.Animated.Value(this.viewMaxHeight),
        statusBarDiff: o.apps.statusBarDiff,
        showHeaderBtn: this.props.showHeaderBtn,
        dataSource: new r.ListView.DataSource({
          rowHasChanged: function (e, t) {
            return e !== t;
          },
          sectionHeaderHasChanged: function (e, t) {
            return e !== t;
          }
        }).cloneWithRowsAndSections(this.selectData.listData, this.selectData.listSections)
      };
    },
    selectDataPermissionChanged: function () {
      var e = this;
      "addGroupMembers" === this.props.tag && this.props.onSelectViewLoaded && this.props.onSelectViewLoaded(this, function (t) {
        e.selectData.selects ? t.selects = e.selectData.selects : t.selects = [], e.setState({
          dataSource: e.state.dataSource.cloneWithRowsAndSections(t.listData, t.listSections)
        }), e.setState({
          loaded: !0
        });
      });
    },
    onSelectViewLoaded: function (e) {
      var t = this;
      !e && this.state.loaded || !this.props.onSelectViewLoaded ? this.setState({
        loaded: !0
      }) : this.props.onSelectViewLoaded(this, function (e) {
        t.selectData.selects ? e.selects = t.selectData.selects : e.selects = [];
        var a = 0,
          s = !0;
        e: for (var n in e.listData) for (var i in e.listData[n]) if (a += 1, a > 15) {
          s = !1;
          break e;
        }
        t.selectData = e, t.setState({
          dataSource: t.state.dataSource.cloneWithRowsAndSections(e.listData, e.listSections),
          loaded: !0,
          noSearch: s
        });
      });
    },
    onEndReached: function () {
      var e = this;
      o.apps.searchKey || this.props.onEndReached && this.props.onEndReached(this, function (t) {
        e.selectData.selects ? t.selects = e.selectData.selects : t.selects = [], e.selectData = t, e.setState({
          dataSource: e.state.dataSource.cloneWithRowsAndSections(t.listData, t.listSections),
          loaded: !0
        });
      });
    },
    componentWillReceiveProps: function (e) {
      o.apps.isIn(e.tag, "addGroupMembers", "groupMembers", "followers", "contactsBoard") || (this.selectData = e.selectData, this.setState({
        dataSource: this.state.dataSource.cloneWithRowsAndSections(this.selectData.listData, this.selectData.listSections)
      }));
    },
    componentDidMount: function () {
      if (o.apps.on("statusBarDiffChanged", this.onStatusBarDiffChanged), o.apps.on("showBackgroundImageToggled", this.onShowBackgroundImageToggled), o.apps.on("selectViewLoaded_" + this.props.tag, this.onSelectViewLoaded), o.apps.on("clearSearchKey", this.clearSearchKey), o.apps.on("selectDataPermissionChanged", this.selectDataPermissionChanged), this.state.statusBarDiff) {
        var e = this.viewHeight - this.state.statusBarDiff;
        this._viewHeight !== e && (this._viewHeight = e, r.Animated.timing(this.state.viewHeight, {
          toValue: e,
          duration: "ios" === r.Platform.OS ? 150 : 50
        }).start());
      }
    },
    componentWillUnmount: function () {
      this.props.onUnmount && this.props.onUnmount(this), o.apps.unon("statusBarDiffChanged", this.onStatusBarDiffChanged), o.apps.unon("showBackgroundImageToggled", this.onShowBackgroundImageToggled), o.apps.unon("selectViewLoaded_" + this.props.tag, this.onSelectViewLoaded), o.apps.unon("clearSearchKey", this.clearSearchKey), o.apps.unon("selectDataPermissionChanged", this.selectDataPermissionChanged);
    },
    onKeyboardWillShow: function (e) {
      if (!o.apps.cmdViewDisplay && "shareSelect" === o.apps.currentRoutes[o.apps.currentNavi].name) {
        var t = e.endCoordinates ? e.endCoordinates.height : e.end.height;
        o.theme.isIphoneX && (t -= o.theme.iphoneXDiff), this.viewHeight = this.viewMaxHeight - t + (this.props.mainTab ? o.theme.tabHeight : 0);
        var a = this.viewHeight - this.state.statusBarDiff;
        this._viewHeight !== a && (this._viewHeight = a, r.Animated.timing(this.state.viewHeight, {
          toValue: a,
          duration: "ios" === r.Platform.OS ? 150 : 50
        }).start());
      }
    },
    onKeyboardWillHide: function (e) {
      if (!o.apps.cmdViewDisplay && "shareSelect" === o.apps.currentRoutes[o.apps.currentNavi].name) {
        this.viewHeight = this.viewMaxHeight;
        var t = this.viewHeight - this.state.statusBarDiff;
        this._viewHeight !== t && (this._viewHeight = t, r.Animated.timing(this.state.viewHeight, {
          toValue: t,
          duration: "ios" === r.Platform.OS ? 150 : 50
        }).start());
      }
    },
    onShowBackgroundImageToggled: function () {
      var e = {};
      for (var t in this.selectData.listData) e[t] || (e[t] = []), this.selectData.listData[t].forEach(function (a) {
        e[t].push(babelHelpers["extends"]({}, a));
      });
      this.setState({
        dataSource: this.state.dataSource.cloneWithRowsAndSections(e, this.selectData.listSections)
      });
    },
    renderSectionHeader: function (e, t) {
      var a,
        s = [o.apps.showBackgroundImage ? {
          height: 1,
          backgroundColor: o.theme.transparent
        } : {
          height: o.theme.px1,
          backgroundColor: o.theme.lightd
        }],
        n = "  ";
      return /^[a-z]$/.test(t) ? n = t.toUpperCase() : "{" === t ? n = "  " : a = !0, i["default"].createElement(r.View, null, o.apps.showBackgroundImage ? i["default"].createElement(r.View, {
        style: s
      }) : null, i["default"].createElement(r.Text, {
        style: {
          marginLeft: 12,
          marginVertical: 2,
          fontSize: a ? 10 : 13,
          color: o.theme.lighta
        }
      }, " ", n), o.apps.showBackgroundImage ? null : i["default"].createElement(r.View, {
        style: s
      }));
    },
    renderRow: function (e, t) {
      var a = this;
      return e.type !== o.apps.CONS_SEL_CONTACTS || e.name ? i["default"].createElement(l, {
        target: this.props.target,
        firstShare: this.props.firstShare,
        data: e,
        markColor: this.props.markColor,
        selectData: this.selectData,
        tag: this.props.tag,
        isChangeView: this.props.isChangeView,
        onToggle: function (e) {
          return a.props.onRowToggle && a.props.onRowToggle(e, a);
        }
      }) : null;
    },
    onStatusBarDiffChanged: function (e) {
      this.setState({
        statusBarDiff: e
      });
    },
    onChangeText: function (e) {
      o.apps.searchKey = e.trim().toLowerCase(), this.filterData();
    },
    clearSearchKey: function () {
      o.apps.searchKey = "", this.searchKeyInput.blur(), this.filterData();
    },
    filterData: function () {
      var e = this,
        t = {},
        a = o.apps.searchKey || "";
      this.selectData.listSections.forEach(function (s) {
        t[s] = e.selectData.listData[s].filter(function (e) {
          if (e.name) s = e.name.toLowerCase();else if (e.friendId) {
            var t = o.apps.profiles[e.friendId];
            if (!t || !t.name) return !1;
            var s = t.name.toLowerCase();
          }
          var n = s.split(" "),
            i = function () {
              for (var e = 0; e < n.length; e++) if (n[e].startsWith(a)) return !0;
              return !1;
            },
            r = function () {
              for (var e = 0; e < n.length; e++) if (-1 !== n[e].indexOf(a)) return !0;
              return !1;
            };
          return /^[a-z0-9\s()]+$/.test(s) ? i(a) : r(a);
        });
      }), this.setState({
        dataSource: this.state.dataSource.cloneWithRowsAndSections(t, this.selectData.listSections),
        searchKeyValue: a
      }, function () {
        e.refs.listView && e.refs.listView.scrollTo({
          y: 0,
          animated: !1
        });
      });
    },
    renderFooterButtonTip: function () {
      return this.props.renderFooterButtonTip && this.props.renderFooterButtonTip();
    },
    renderHeaderButtonTip: function () {
      return this.state.showHeaderBtn ? this.props.renderHeaderButtonTip && this.props.renderHeaderButtonTip(this) : void 0;
    },
    render: function () {
      var e = this;
      return i["default"].createElement(r.View, {
        style: {
          flex: 1
        }
      }, i["default"].createElement(r.View, {
        style: {
          height: o.theme.navHeight
        }
      }), i["default"].createElement(o.BackgroundImageView, {
        shouldRender: !0,
        maskColor: o.theme.lightLessTrans6
      }), i["default"].createElement(r.View, {
        style: {
          height: o.theme.mainAreaHeight - this.state.statusBarDiff + (this.props.mainTab ? 0 : o.theme.tabHeight),
          backgroundColor: o.theme.selectViewBackground
        }
      }, this.state.loaded ? i["default"].createElement(r.Animated.View, {
        style: {
          height: this.state.viewHeight,
          backgroundColor: o.theme.transparent
        }
      }, null, o.apps.showCmdBall ? i["default"].createElement(r.View, {
        style: {
          backgroundColor: o.theme.selectViewSearchBg,
          paddingTop: 3,
          paddingBottom: 2
        }
      }, i["default"].createElement(r.TextInput, {
        ref: function (t) {
          return e.searchKeyInput = t;
        },
        value: this.state.searchKeyValue,
        style: {
          height: 30,
          fontSize: 14,
          backgroundColor: o.theme.transparent,
          paddingVertical: 0,
          paddingHorizontal: 10,
          color: o.theme.deep8
        },
        placeholder: (0, o.tr)("Search"),
        placeholderTextColor: o.apps.darkTheme ? o.theme.deep2 : o.theme.lightb,
        onChangeText: this.onChangeText,
        selectionColor: o.theme.deepGreen2
      }), !o.apps.showBackgroundImage && i["default"].createElement(r.View, {
        style: {
          height: o.theme.px1,
          backgroundColor: o.theme.lightd
        }
      })) : null, this.renderHeaderButtonTip(), i["default"].createElement(r.ListView, {
        ref: "listView",
        style: {
          flex: 1,
          backgroundColor: o.theme.transparent
        },
        dataSource: this.state.dataSource,
        renderRow: this.renderRow,
        renderFooter: function () {
          return e.props.renderFooter ? e.props.renderFooter(e) : i["default"].createElement(r.View, {
            style: {
              height: 1
            }
          });
        },
        pageSize: 10,
        initialListSize: 10,
        scrollsToTop: !1,
        onEndReached: this.onEndReached,
        renderSectionHeader: this.props.section && this.renderSectionHeader,
        scrollRenderAheadDistance: o.apps.selectViewDis[this.props.tag],
        onStartShouldSetResponderCapture: function (t, a, s, n) {
          var i = !1;
          return n.forEach(function (e, r) {
            r > s && "__eggfNoResponderCapture__" === e(t, a, s, n) && (i = !0);
          }), i ? !1 : e.scrollResponderHandleStartShouldSetResponderCapture(a);
        },
        onResponderRelease: function (t) {
          o.apps.myInputViewComponent.blur(), e.scrollResponderHandleResponderRelease(t);
        }
      }), this.renderFooterButtonTip()) : i["default"].createElement(o.InterActionSpinner, {
        glass: !1
      })), this.props.mainTab ? i["default"].createElement(o.MainTabView, {
        tabIndex: 1,
        noSwitch: !0
      }) : null);
    }
  });
});
