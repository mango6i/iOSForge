// Free maintenance changes; original factory retained under reference/original-modules/370.js.
__d(370, function (e, t, a, i) {
  var __recoveryFreePolicy = t(9000);
  var r = t(311),
    s = babelHelpers.interopRequireDefault(r),
    o = t(312),
    n = t(314),
    p = s["default"].createClass({
      displayName: "CheatTipView",
      getInitialState: function () {
        return this.data = this.props.data, {
          show: !1
        };
      },
      componentDidMount: function () {
        var e = this;
        n.apps.getRelationShip(this.data.fromId).then(function (t) {
          t.isFriend || !n.apps.isIn(e.data.type, n.apps.CONS_MSG_TYPE_CHEAT_WX, n.apps.CONS_MSG_TYPE_CHEAT_QQ) || n.apps.cheatTipMap[e.data.shareId] || (n.apps.cheatTipMap[e.data.shareId] = !0, e.setState({
            show: !0
          }));
        })["catch"](function (t) {
          (0, n.tlog)("error", "CheatTipView isFriend", e.data, t);
        });
      },
      componentWillUnmount: function () {
        this.state.show && delete n.apps.cheatTipMap[this.data.shareId];
      },
      render: function () {
        return this.state.show ? s["default"].createElement(o.View, {
          style: {
            flexDirection: "column",
            alignItems: "center",
            paddingHorizontal: n.theme.winWidth / 7,
            marginTop: 5
          }
        }, s["default"].createElement(n.MyTextView, {
          myTextValue: (0, n.tr)(this.data.type === n.apps.CONS_MSG_TYPE_CHEAT_QQ ? "The one request for qq may be cheating" : "The one request for wechat may be cheating"),
          adjustsFontSizeToFit: !0,
          style: {
            fontSize: 12,
            color: n.theme.deep8,
            textAlign: "center"
          }
        })) : null;
      }
    }),
    d = (s["default"].createClass({
      displayName: "DetectTipView",
      getInitialState: function () {
        return this.data = this.props.data, {
          show: !1
        };
      },
      componentDidMount: function () {
        this.check();
      },
      componentWillUnmount: function () {
        this.hasOn && n.apps.has("showDetectView_" + this.data.shareId) && (delete n.apps.shouldShowReportNow[this.data.shareId], n.apps.unon("showDetectView_" + this.data.shareId, this.showDetectView));
      },
      check: function () {
        n.apps.isIn(this.data.type, n.apps.CONS_MSG_TYPE_ABUSE) && (n.apps.has("showDetectView_" + this.data.shareId) || (this.hasOn = !0, n.apps.on("showDetectView_" + this.data.shareId, this.showDetectView), this.showDetectView()));
      },
      componentWillReceiveProps: function (e) {
        this.data = e.data, this.check();
      },
      showDetectView: function () {
        var e = this;
        n.apps.isNeverRemind(this.data.shareId).then(function (t) {
          var a = !t;
          a ? n.apps.shouldShowReportNow[e.data.shareId] = !0 : delete n.apps.shouldShowReportNow[e.data.shareId], n.apps.emit("showReportNow_" + e.data.shareId, a), e.setState({
            show: a
          });
        })["catch"](function (e) {
          (0, n.tlog)("error", "showDetectView", e);
        });
      },
      render: function () {
        return this.state.show ? s["default"].createElement(o.View, {
          style: {
            flexDirection: "column",
            alignItems: "center",
            paddingHorizontal: n.theme.winWidth / 7,
            marginTop: 5
          }
        }, s["default"].createElement(n.MyTextView, {
          myTextValue: (0, n.tr)("The system detect the user has some suspect abused words"),
          adjustsFontSizeToFit: !0,
          style: {
            fontSize: 12,
            color: n.theme.deep8,
            textAlign: "center"
          }
        })) : null;
      }
    }), s["default"].createClass({
      displayName: "MyTextCommentView",
      getName: function (e) {
        var t = e.toId;
        if (t === n.apps.userid) var a = (0, n.tr)("All");else {
          var i = n.apps.profiles && n.apps.profiles[t];
          a = i ? i.name : "";
        }
        return a;
      },
      setNameAsync: function (e) {
        var t = this;
        n.apps.getProfileK(e.toId, "name").then(function (e) {
          t.setState({
            name: e
          });
        })["catch"](function (t) {
          (0, n.tlog)("error", "ReplyTitleView get name", e.toId, t);
        });
      },
      getInitialState: function () {
        var e = this.getName(this.props);
        return {
          name: e
        };
      },
      componentDidMount: function () {
        this.state.name || this.setNameAsync(this.props);
      },
      componentWillReceiveProps: function (e) {
        var t = this.getName(e);
        t ? this.setState({
          name: t
        }) : this.setNameAsync(e);
      },
      render: function () {
        return s["default"].createElement(n.MyTextView, babelHelpers["extends"]({}, this.props, {
          myTextValue: "@" + this.state.name + " " + this.props.myTextValue
        }));
      }
    }));
  s["default"].createClass({
    displayName: "ReplyTitleView",
    getInitialState: function () {
      var e = this.props.toId;
      if (e === n.apps.userid) var t = (0, n.tr)("All");else {
        var a = n.apps.profiles && n.apps.profiles[e];
        t = a ? a.name : "";
      }
      return {
        title: t
      };
    },
    componentDidMount: function () {
      var e = this;
      this.state.title || n.apps.getProfileK(this.props.toId, "name").then(function (t) {
        e.setState({
          title: t
        });
      })["catch"](function (t) {
        (0, n.tlog)("error", "ReplyTitleView get name", e.props.toId, t);
      });
    },
    render: function () {
      return s["default"].createElement(o.View, {
        style: {
          marginRight: 7,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center"
        }
      }, s["default"].createElement(o.Text, {
        style: {
          fontSize: 12,
          fontWeight: "bold",
          color: n.theme.lighta
        }
      }, (0, n.tr)("Reply") + " "), s["default"].createElement(o.Text, {
        style: {
          fontSize: 12,
          color: n.theme.lighta
        }
      }, this.state.title));
    }
  });
  i.ChatBubbleView = s["default"].createClass({
    displayName: "ChatBubbleView",
    getInitialState: function () {
      return this.data = this.props.data, n.apps.isIn((this.props.friendId.match(/^\d+?:/) || [""])[0], "5:", "6:", "7:", "a:", "b:", "c:") && (this.isRand = !0), {
        entryDeleted: !1,
        imageNoRender: !1,
        notRenderGif: !1,
        editMode: !1,
        hasNotFullShown: this.props.hasNotFullShown
      };
    },
    getDefaultProps: function () {
      return {
        atime: 0,
        bubbleWidth: n.theme.bubbleWidth,
        imageSize: o.PixelRatio.roundToNearestPixel(36.5),
        bubbleTextColor: n.apps.blackWhiteMode ? n.theme.deep4 : n.theme.deep7,
        avatarTextFontSize: 15,
        avatarTextButtonBackground: n.theme.warn,
        avatarTextFontColor: n.theme.white,
        avatarSize: o.PixelRatio.roundToNearestPixel(36.5),
        direction: "left",
        onAvatarLongPress: function () {},
        hasNotFullShown: !1
      };
    },
    componentDidMount: function () {
      var e = this;
      "android" === o.Platform.OS && "mySpace" === this.props.tab && this.data.type === n.apps.CONS_MSG_TYPE_GIF && (this.removeGifFromMySpace = function (t) {
        e.setState({
          notRenderGif: t
        });
      }, n.apps.on("removeGifFromMySpace", this.removeGifFromMySpace), "mySpace" !== n.apps.currentNavi && this.setState({
        notRenderGif: !0
      }));
    },
    componentWillUnmount: function () {
      "android" === o.Platform.OS && "mySpace" === this.props.tab && this.removeGifFromMySpace && n.apps.unon("removeGifFromMySpace", this.removeGifFromMySpace);
    },
    componentWillReceiveProps: function (e) {
      var t = this;
      this.data = e.data, "android" === o.Platform.OS && "mySpace" === this.props.tab && (this.data.type === n.apps.CONS_MSG_TYPE_GIF && (this.removeGifFromMySpace = function (e) {
        t.setState({
          notRenderGif: e
        });
      }, n.apps.on("removeGifFromMySpace", this.removeGifFromMySpace)), this.data.type !== n.apps.CONS_MSG_TYPE_GIF && this.removeGifFromMySpace && (this.setState({
        notRenderGif: !1
      }), n.apps.unon("removeGifFromMySpace", this.removeGifFromMySpace), delete this.removeGifFromMySpace)), this.props.hasNotFullShown !== e.hasNotFullShown && this.setState({
        hasNotFullShown: e.hasNotFullShown
      }), this.state.imageNoRender && this.setState({
        imageNoRender: !1
      });
    },
    renderTitleView: function () {
      if (this.props.hideTitle) return null;
      if (1 !== this.props.data.category || 1 !== this.props.data.seqi) {
        if (!this.props.isReport && !this.props.friendIdIsStock && this.props.transTitle && !this.props.isGroup) return s["default"].createElement(o.View, {
          style: {
            height: 2
          }
        });
        var e = this.props.userid;
        if ("left" === this.props.direction) {
          var t = this.props.space && this.props.isReport;
          return s["default"].createElement(o.View, {
            style: [l.titleView, l.titleViewLeft]
          }, this.props.showTime && !t ? s["default"].createElement(o.Text, {
            style: l.titleDateText
          }, n.util.fmtDateTimeWithoutYear(new Date(this.props.space && !this.props.hideTitle && this.props.atime || this.data.time))) : null, this.props.showName && !t && s["default"].createElement(n.NameText, {
            userid: this.isRand ? this.props.data.fromId : e,
            style: [l.titleNameText, l.titleNameTextLeft],
            showGender: this.props.friendIdIsStock || this.props.isObMode || this.isRand || this.props.isReport,
            showCountry: !this.props.isReport && (this.props.friendIdIsStock || this.props.isObMode || this.isRand),
            showGroup: this.props.friendIdIsStock && "2:" === this.props.fid.slice(0, 2)
          }), t ? s["default"].createElement(n.NameText, {
            userid: this.props.data.toId,
            style: [l.titleNameText, l.titleNameTextLeft],
            showGender: this.props.friendIdIsStock || this.props.isObMode,
            isSpaceReport: t
          }) : null);
        }
        return s["default"].createElement(o.View, {
          style: [l.titleView, l.titleViewRight]
        }, this.props.showTime && s["default"].createElement(o.Text, {
          style: l.titleDateText
        }, n.util.fmtDateTimeWithoutYear(new Date(this.data.time))), this.props.showName && s["default"].createElement(n.NameText, {
          userid: this.props.userid,
          style: [l.titleNameText, l.titleNameTextRight],
          showGender: this.props.friendIdIsStock || this.props.isObMode || this.isRand || this.props.isReport,
          showCountry: !this.props.isReport && (this.props.friendIdIsStock || this.props.isObMode || this.isRand),
          showGroup: this.props.friendIdIsStock && "2:" === this.props.fid.slice(0, 2)
        }));
      }
    },
    renderReSendingButton: function () {
      return s["default"].createElement(o.View, {
        style: [l.avatarView, {
          width: this.props.avatarSize + 5,
          height: this.props.avatarSize + 5
        }]
      }, s["default"].createElement(o.TouchableOpacity, {
        onStartShouldSetResponder: function () {
          return "__eggfNoResponderCapture__";
        },
        onPress: this.props.onFailedPress
      }, s["default"].createElement(o.View, {
        style: l.resendingView
      }, s["default"].createElement(n.Ionicons, {
        style: {
          paddingTop: "ios" == o.Platform.OS ? 3 : 0
        },
        name: "ios-refresh",
        size: 22,
        color: n.theme.white
      })), s["default"].createElement(o.Text, {
        style: l.resendingInfo
      }, (0, n.tr)("Resend"))));
    },
    renderSendingSpinner: function () {
      return s["default"].createElement(o.View, {
        style: [l.avatarView, {
          width: this.props.avatarSize,
          height: this.props.avatarSize
        }]
      }, "android" === o.Platform.OS ? s["default"].createElement(o.ProgressBarAndroid, {
        style: {
          height: 25
        },
        styleAttr: "Inverse"
      }) : s["default"].createElement(o.ActivityIndicatorIOS, {
        animating: !0,
        size: "small"
      }));
    },
    onAvatarPress: function (e, t) {
      if (e || (e = this.props.userid), e && !n.apps.isSysUser(e)) if (n.apps.showCmdBall && this.props.space) n.apps.csInfoDiag("userCsInfo", e, "onAvatarPress" + (this.props.isReport ? "" : "2"), null, null, this.props.isReport && t);else {
        var a = this.props.routes,
          i = {
            friendId: e,
            name: (0, n.tr)("Profile")
          };
        i.shareId = this.props.data.shareId, a.navi.navForward(n.apps.newRoute(a, "about_", i));
      }
    },
    renderImageAvatar: function () {
      var e = this,
        t = this.props.shareData && this.props.shareData.target;
      if ("3:" === this.props.friendId.slice(0, 2) && "string" == typeof t && "2:" === t.slice(0, 2)) var a = t;else a = this.props.userid;
      return this.props.hideAvatar || 1 === this.props.data.category && 1 === this.props.data.seqi ? s["default"].createElement(o.View, {
        style: [l.avatarView, {
          width: this.props.avatarSize,
          height: 1
        }]
      }) : s["default"].createElement(o.View, {
        style: {
          flexDirection: "row"
        }
      }, s["default"].createElement(o.TouchableOpacity, {
        onStartShouldSetResponder: function () {
          return "__eggfNoResponderCapture__";
        },
        style: [l.avatarView, {
          width: this.props.avatarSize,
          height: this.props.avatarSize
        }],
        onPress: function () {
          return e.onAvatarPress(null, 1);
        },
        onLongPress: function () {
          e.props.onAvatarLongPress();
        }
      }, this.props.avatarText ? s["default"].createElement(o.View, {
        style: [l.avatarTextButton, {
          backgroundColor: this.props.avatarTextButtonBackground
        }]
      }, s["default"].createElement(o.Text, {
        style: [l.avatarTextButtonText, {
          fontSize: this.props.avatarTextFontSize,
          color: this.props.avatarTextFontColor
        }]
      }, this.props.avatarText)) : s["default"].createElement(n.CachedImage, {
        spinnerSize: 30,
        style: [l.avatarImage, {
          width: this.props.avatarSize,
          height: this.props.avatarSize
        }],
        avatarId: a,
        resizeMode: "cover"
      })), n.apps.showCmdBall && this.props.friendId.slice(0, 2) === n.apps.CONS_PREFIX_AUDIT && this.props.shareData.hasShadow ? s["default"].createElement(o.TouchableOpacity, {
        onStartShouldSetResponder: function () {
          return "__eggfNoResponderCapture__";
        },
        style: [l.avatarView, {
          marginLeft: 5,
          width: this.props.avatarSize,
          height: this.props.avatarSize
        }],
        onPress: function () {
          return e.onAvatarPress(a + "^1");
        },
        onLongPress: function () {
          e.props.onAvatarLongPress();
        }
      }, this.props.avatarText ? s["default"].createElement(o.View, {
        style: [l.avatarTextButton, {
          backgroundColor: this.props.avatarTextButtonBackground
        }]
      }, s["default"].createElement(o.Text, {
        style: [l.avatarTextButtonText, {
          fontSize: this.props.avatarTextFontSize,
          color: this.props.avatarTextFontColor
        }]
      }, this.props.avatarText)) : s["default"].createElement(n.CachedImage, {
        spinnerSize: 30,
        style: [l.avatarImage, {
          width: this.props.avatarSize,
          height: this.props.avatarSize
        }],
        avatarId: a + "^1",
        resizeMode: "cover"
      })) : null, n.apps.showCmdBall && this.props.friendId.slice(0, 2) === n.apps.CONS_PREFIX_REPORT && this.props.data.toId.slice(0, 2) !== n.apps.CONS_PREFIX_CIRCLE ? s["default"].createElement(o.TouchableOpacity, {
        onStartShouldSetResponder: function () {
          return "__eggfNoResponderCapture__";
        },
        style: [l.avatarView, {
          marginLeft: 5,
          width: this.props.avatarSize,
          height: this.props.avatarSize
        }],
        onPress: function () {
          return e.onAvatarPress(e.props.data.toId, 2);
        },
        onLongPress: function () {
          e.props.onAvatarLongPress();
        }
      }, this.props.avatarText ? s["default"].createElement(o.View, {
        style: [l.avatarTextButton, {
          backgroundColor: this.props.avatarTextButtonBackground
        }]
      }, s["default"].createElement(o.Text, {
        style: [l.avatarTextButtonText, {
          fontSize: this.props.avatarTextFontSize,
          color: this.props.avatarTextFontColor
        }]
      }, this.props.avatarText)) : s["default"].createElement(n.CachedImage, {
        spinnerSize: 30,
        style: [l.avatarImage, {
          width: this.props.avatarSize,
          height: this.props.avatarSize
        }],
        avatarId: this.props.data.toId,
        resizeMode: "cover"
      })) : null);
    },
    renderAvatar: function () {
      return "right" === this.props.direction && n.apps.isIn(this.data.type, n.apps.CONS_MSG_TYPE_ILLEGAL, n.apps.CONS_MSG_TYPE_WARN) && this.data.fromId === n.apps.userid ? this.renderReSendingButton() : -1 !== [1, 4].indexOf(this.data.stat) ? this.renderSendingSpinner() : -1 !== [3, 5].indexOf(this.data.stat) ? this.renderReSendingButton() : this.renderImageAvatar();
    },
    calcRawSize: function (e) {
      return 1048576 > e ? (e / 1024).toFixed(0) + " KB" : (e / 1024 / 1024).toFixed(2) + " MB";
    },
    onLongPress: function (e) {
      this.props.onLongPress && this.props.onLongPress(e);
    },
    renderContent: function () {
      var e = this,
        t = 1 === this.data.category;
      if ("file://undefined" === this.data.uri && (this.data.type = n.apps.CONS_MSG_TYPE_TEXT), !this.data.isDeleted || this.props.isReport || this.props.friendIdIsStock) {
        if (this.data.type === n.apps.CONS_MSG_TYPE_AUDIO) {
          if (this.props.data.duration <= 24) {
            var a = Math.floor((n.theme.winWidth - 130) * this.props.data.duration / 24);
            80 > a && (a = 80);
          } else a = n.theme.winWidth - 130;
          var i = this.props.space ? this.props.friendId : this.props.fid;
          if (this.data.isnew) if (n.apps.unReadNewAudioQueue[i]) {
            if (n.apps.unReadNewAudioMap[i][this.data.msgid]) {
              var r = n.apps.unReadNewAudioQueue[i].findIndex(function (t) {
                return t.data.msgid === e.data.msgid;
              });
              n.apps.unReadNewAudioQueue[i].splice(r, 1, this), n.apps.unReadNewAudioQueue[i].sort(function (e, t) {
                return e.data.time - t.data.time;
              });
            } else n.apps.unReadNewAudioQueue[i].push(this), n.apps.unReadNewAudioQueue[i].sort(function (e, t) {
              return e.data.time - t.data.time;
            }), n.apps.unReadNewAudioMap[i][this.data.msgid] = 1;
          } else n.apps.unReadNewAudioQueue[i] = [this], n.apps.unReadNewAudioMap[i] = {}, n.apps.unReadNewAudioMap[i][this.data.msgid] = 1;
          return s["default"].createElement(o.TouchableOpacity, {
            onStartShouldSetResponder: function () {
              return "__eggfNoResponderCapture__";
            },
            onPress: function () {
              return e.props.onAudioPress(e.audioController);
            },
            onLongPress: this.onLongPress
          }, s["default"].createElement(o.View, {
            style: [{
              paddingHorizontal: 8,
              paddingVertical: "ios" == o.Platform.OS ? 5 : 7,
              borderRadius: 7
            }, n.apps.blackWhiteMode && {
              borderWidth: n.theme.px1,
              borderColor: "left" == this.props.direction ? "#ddd" : "rgb(181,215,240)"
            }, "left" == this.props.direction ? {
              backgroundColor: n.theme.leftBubble,
              marginLeft: 7
            } : {
              backgroundColor: n.theme.rightBubble,
              marginRight: 7
            }, this.props.bubbleColor && {
              backgroundColor: this.props.bubbleColor
            }, {
              width: a,
              flex: 1,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 8
            }]
          }, "left" === this.props.direction ? s["default"].createElement(n.AudioController, {
            ref: function (t) {
              return e.audioController = t;
            },
            data: this.props.data,
            qid: i,
            space: this.props.space,
            direction: this.props.direction,
            duration: this.props.data.duration
          }) : s["default"].createElement(o.View, {
            style: {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start"
            }
          }, this.props.data.isnew ? s["default"].createElement(o.View, {
            style: {
              marginLeft: 2,
              marginRight: 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: n.theme.warn
            }
          }) : null, s["default"].createElement(o.Text, {
            style: {
              fontSize: 17,
              color: n.theme.deep9
            }
          }, this.props.data.duration + '"')), "left" === this.props.direction ? s["default"].createElement(o.View, {
            style: {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end"
            }
          }, s["default"].createElement(o.Text, {
            style: {
              fontSize: 17,
              color: n.theme.deep9
            }
          }, this.props.data.duration + '"'), this.props.data.isnew ? s["default"].createElement(o.View, {
            style: {
              marginLeft: 5,
              marginRight: 2,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: n.theme.warn
            }
          }) : null) : s["default"].createElement(n.AudioController, {
            ref: function (t) {
              return e.audioController = t;
            },
            data: this.props.data,
            qid: i,
            space: this.props.space,
            direction: this.props.direction,
            duration: this.props.data.duration
          })));
        }
        if (this.data.type === n.apps.CONS_MSG_TYPE_VIDEO) {
          var p = this.props.data,
            h = p.path,
            u = p.width,
            c = p.height,
            m = p.uri,
            f = p.msgid,
            g = p.imgId,
            w = p.rawImgId,
            b = p.shareId,
            S = p.size,
            y = p.duration,
            T = (p.ftype, p.chatSession, p.toId, p.category, n.apps.getImageSize(u, c, this.props.space)),
            u = T.width,
            c = T.height,
            I = T.ratio,
            C = u > c ? c : u;
          return C > 130 && (C = 130), this.state.hasNotFullShown ? null : s["default"].createElement(o.TouchableOpacity, {
            noOpacictyActive: !0,
            onLongPress: this.onLongPress,
            onPress: function () {
              if ("__cloudrepodeleted__" === n.apps.imageUriCache[g]) return void n.apps.tip((0, n.tr)("The video has been deleted by owner"));
              var a = function () {
                if (e.props.space ? (n.apps.curSessionId = e.props.friendId, n.apps.curSessionType = "share", n.apps.curSessionFriendId = e.props.friendId) : (n.apps.curSessionId = b, n.apps.curSessionType = "chat", n.apps.curSessionFriendId = e.props.friendId), n.apps.checkSessionFilesCleared(e.props.space), g) {
                  n.apps.send("checkCloudFileExist", {
                    name: g
                  }).then(function (e) {
                    e.exist || (n.dbs.markCachedAsDeleted(g)["catch"](function (e) {
                      return (0, n.tlog)("error", "chatbubble video markCachedAsDeleted", g, e);
                    }), n.apps.setImageUriCache(g, "__cloudrepodeleted__"), n.apps.tip((0, n.tr)("The video has been deleted by owner")), n.apps.closeAllModelView());
                  })["catch"](function (e) {
                    (0, n.tlog)("error", "chatbubble video checkCloudFileExist", g, e);
                  });
                  var a = n.apps.findAvailablePreVid(g, e.props.data),
                    i = a.mseq;
                  n.apps.emit("showModelImage" + i, {
                    imgId: g,
                    ratio: I,
                    rawImgId: w,
                    isVideo: !0,
                    nobar: t
                  });
                  var r = n.apps.sessionFilesCache[n.apps.curSessionId];
                  if (r) {
                    var s = r.findIndex(function (e) {
                        return e.imgId === g || e.rawImgId === g;
                      }),
                      o = r[s + 1];
                    if (o && o.type === n.apps.CONS_MSG_TYPE_VIDEO && o.rawImgId) {
                      var p = o.width,
                        d = o.height,
                        l = o.imgId,
                        u = o.rawImgId,
                        c = n.apps.findAvailablePreVid(l, o),
                        i = c.mseq,
                        f = c.isnew;
                      u && f && n.apps.emit("showModelImage" + i, {
                        imgId: l,
                        ratio: p / d,
                        rawImgId: u,
                        isVideo: !0,
                        preVideoLoad: !0
                      });
                    }
                  }
                } else n.apps.emit("showModelImage", {
                  uri: m,
                  path: h,
                  ratio: I,
                  isVideo: !0,
                  nobar: t
                });
              };
              a();
            }
          }, s["default"].createElement(o.View, {
            style: [l.tipImageView, "left" == this.props.direction ? {
              marginLeft: 7
            } : {
              marginRight: 7
            }, this.props.bubbleColor && {
              backgroundColor: this.props.bubbleColor
            }, n.apps.blackWhiteMode && {
              borderWidth: n.theme.px1,
              borderColor: "#ddd"
            }]
          }, s["default"].createElement(o.View, {
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            }
          }, this.state.imageNoRender ? null : g ? s["default"].createElement(n.CachedImage, {
            showProgress: !0,
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            },
            isVideo: !0,
            imageId: g,
            size: S,
            duration: y,
            onNoCloudRepo: function () {
              e.setState({
                entryDeleted: !0
              });
            }
          }) : m ? s["default"].createElement(n.CachedImage, {
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            },
            msgid: f,
            isVideo: !0,
            uploading: this.props.data.uploading || !1,
            uploadingFinished: function () {
              delete e.props.data.uploading;
            },
            defaultSource: {
              uri: m
            },
            size: S,
            duration: y
          }) : null, this.props.data.uploading || this.state.entryDeleted ? null : s["default"].createElement(o.View, {
            style: {
              position: "absolute",
              top: 3,
              left: 3,
              alignItems: "center",
              justifyContent: "center",
              width: u,
              height: c
            }
          }, s["default"].createElement(o.View, {
            style: {
              backgroundColor: "rgba(0,0,0,0.2)",
              width: C / 2,
              alignItems: "center",
              justifyContent: "center",
              height: C / 2,
              borderRadius: C / 4,
              borderWidth: 3,
              borderColor: n.theme.whiteTrans6
            }
          }, s["default"].createElement(n.Ionicons, {
            style: ["ios" === o.Platform.OS ? {
              paddingLeft: 5
            } : {
              marginLeft: 5
            }],
            name: "md-play",
            size: 23,
            color: n.theme.whiteTrans6
          }))))));
        }
        if (this.data.type === n.apps.CONS_MSG_TYPE_GIF) {
          var v = this.props.data,
            x = v.width,
            E = v.height,
            m = v.uri,
            S = v.size,
            b = v.shareId,
            _ = n.apps.getImageSize(x, E, this.props.space),
            u = _.width,
            c = _.height,
            I = _.ratio,
            C = u > c ? c : u;
          C > 130 && (C = 130);
          var R = m.match(/^https:\/\/media.tenor.com\/images\/([0-9a-f]{32})\/tenor.gif/);
          if (R) var V = "/tenor/" + R[1].slice(-2) + "/" + R[1] + ".gif";else {
            var P = m.split(":");
            if (2 === P.length) {
              V = P[1];
              var N = P[0];
            } else V = P[0];
          }
          return this.state.hasNotFullShown ? null : s["default"].createElement(o.TouchableOpacity, {
            onLongPress: this.onLongPress,
            noOpacictyActive: !0,
            onPress: function () {
              n.apps.emit("showModelImage", {
                imgId: N ? N : V,
                ratio: I,
                nobar: t,
                picboard: 4,
                addToFavor: function () {
                  return n.apps.addGifToFavor(m, x, E, S, function () {
                    return n.apps.tip((0, n.tr)("Added"), !0);
                  });
                }
              }), e.props.space ? (n.apps.curSessionId = e.props.friendId, n.apps.curSessionType = "share", n.apps.curSessionFriendId = e.props.friendId) : (n.apps.curSessionId = b, n.apps.curSessionType = "chat", n.apps.curSessionFriendId = e.props.friendId), n.apps.checkSessionFilesCleared(e.props.space);
            }
          }, s["default"].createElement(o.View, {
            style: [l.tipImageView, "left" == this.props.direction ? {
              marginLeft: 7
            } : {
              marginRight: 7
            }, this.props.bubbleColor && {
              backgroundColor: this.props.bubbleColor
            }, n.apps.blackWhiteMode && {
              borderWidth: n.theme.px1,
              borderColor: "#ddd"
            }]
          }, s["default"].createElement(o.View, {
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            }
          }, this.state.imageNoRender || this.state.notRenderGif ? null : R ? n.apps.tenorOutSrc ? s["default"].createElement(n.CachedImage, {
            showProgress: !0,
            outSrc: m,
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            }
          }) : s["default"].createElement(n.CachedImage, {
            emotion: V,
            showProgress: !0,
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            }
          }) : s["default"].createElement(n.CachedImage, {
            imageId: V,
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            }
          }), N ? s["default"].createElement(o.View, {
            style: {
              position: "absolute",
              top: 3,
              left: 3,
              alignItems: "center",
              justifyContent: "center",
              width: u,
              height: c
            }
          }, s["default"].createElement(o.View, {
            style: {
              backgroundColor: "rgba(0,0,0,0.2)",
              width: C / 2,
              alignItems: "center",
              justifyContent: "center",
              height: C / 2,
              borderRadius: C / 4,
              borderWidth: 3,
              borderColor: n.theme.whiteTrans6
            }
          }, s["default"].createElement(o.Text, {
            style: {
              color: n.theme.whiteTrans6,
              fontSize: 20
            }
          }, "GIF"))) : null)));
        }
        if (this.data.type === n.apps.CONS_MSG_TYPE_IMAGE) {
          var M = this.data,
            g = M.imgId,
            w = M.rawImgId,
            x = M.width,
            E = M.height,
            m = M.uri,
            f = M.msgid,
            b = (M.category, M.ftype, M.shareId),
            S = (M.toId, M.size),
            O = n.apps.getImageSize(x, E, this.props.space),
            u = O.width,
            c = O.height,
            I = O.ratio,
            C = u > c ? c : u;
          C > 130 && (C = 130);
          var N = !1;
          if (w) {
            var z = w.match(/^(\w+\.gif):/);
            if (z) {
              N = !0;
              var A = z[1],
                F = parseInt(w.split(":")[1], 10);
              if (2097152 > F) {
                g = z[1], w = "";
                var D = g;
              } else D = A + ":" + g;
              (0, n.tlog)("gif", g);
            } else if (.4 > I) var G = w.split(":")[0];
          } else D = g;
          var k = this.props.space || this.props.isReport || this.props.friendIdIsStock;
          return k || (u = 70, c = 70), this.state.hasNotFullShown ? null : s["default"].createElement(o.TouchableOpacity, {
            onLongPress: this.onLongPress,
            noOpacictyActive: !0,
            onStartShouldSetResponder: function () {
              return "__eggfNoResponderCapture__";
            },
            onPress: function () {
              if ("__cloudrepodeleted__" === n.apps.imageUriCache[g]) return void n.apps.tip((0, n.tr)("The image has been deleted by owner"));
              n.apps.closeInputPanel();
              var a = e.props.space,
                i = e.props.friendId,
                r = function () {
                  a ? (n.apps.curSessionId = i, n.apps.curSessionType = "share", n.apps.curSessionFriendId = i) : (n.apps.curSessionId = b, n.apps.curSessionType = "chat", n.apps.curSessionFriendId = i), n.apps.checkSessionFilesCleared(a), g ? n.apps.emit("showModelImage", {
                    imgId: N ? A : G || g,
                    ratio: I,
                    rawImgId: w,
                    nobar: t
                  }) : n.apps.emit("showModelImage", {
                    uri: m,
                    ratio: I,
                    nobar: t
                  });
                },
                s = e.props.fid,
                o = function () {
                  n.apps.snapDes(s, f);
                };
              if (__recoveryFreePolicy.freeEdition && __recoveryFreePolicy.localSnapPreview) {
                r();
                return;
              }
              k ? r() : e.data.fromId === n.apps.userid ? r() : e.data.isnew ? n.apps.diag({
                header: (0, n.tr)("Tip"),
                content: (0, n.tr)("Viewing this image costs 1 star. Continue?"),
                buttons: [{
                  text: (0, n.tr)("Cancel"),
                  onPress: function () {
                    return n.apps.closeDiag();
                  }
                }, {
                  text: (0, n.tr)("Ok"),
                  onPress: function () {
                    return n.apps.closeDiag(function () {
                      n.apps.send("viewSnap", {
                        msgid: f
                      }).then(function (e) {
                        void 0 !== e.stars && (n.apps.stars = e.stars, n.dbs.setUserProfile({
                          stars: e.stars
                        })["catch"](function (e) {
                          return (0, n.tlog)("error", "viewSnap setUserProfile", e);
                        }), n.apps.emit("userChanged")), r(), o();
                      })["catch"](function (e) {
                        "Insufficient stars" === e || e.err && "Insufficient stars" === e.err ? n.apps.diag({
                          header: "提示",
                          content: __recoveryFreePolicy.unavailableMessage,
                          buttons: [{
                            text: (0, n.tr)("Cancel"),
                            onPress: function () {
                              return n.apps.closeDiag();
                            }
                          }]
                        }) : n.apps.tip((0, n.tr)("Failed to view"));
                      });
                    });
                  }
                }]
              }) : r();
            }
          }, s["default"].createElement(o.View, {
            style: [l.tipImageView, "left" == this.props.direction ? {
              marginLeft: 7
            } : {
              marginRight: 7
            }, this.props.bubbleColor && {
              backgroundColor: this.props.bubbleColor
            }, n.apps.blackWhiteMode && {
              borderWidth: n.theme.px1,
              borderColor: "#ddd"
            }]
          }, s["default"].createElement(o.View, {
            style: babelHelpers["extends"]({
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            }, k ? {} : {
              borderWidth: n.theme.px1,
              borderColor: "left" === this.props.direction && this.data.isnew ? n.theme.deepGreen2 : n.theme.lightc
            })
          }, this.state.imageNoRender ? null : g ? s["default"].createElement(n.CachedImage, {
            showProgress: !0,
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            },
            imageId: g,
            imageSize: S,
            rowID: this.props.rowID,
            onlyText: k ? !1 : this.data.isnew ? (0, n.tr)("snapping") : (0, n.tr)("snapping"),
            onlyTextColor: this.data.isnew && "left" === this.props.direction ? n.theme.deepGreen2 : n.theme.lightc
          }) : s["default"].createElement(n.CachedImage, {
            style: {
              flex: 1,
              width: u,
              height: c,
              borderRadius: 4
            },
            rowID: this.props.rowID,
            msgid: f,
            uploading: this.props.data.uploading || !1,
            uploadingFinished: function () {
              delete e.props.data.uploading;
            },
            defaultSource: {
              uri: m
            },
            onlyText: k ? !1 : this.data.isnew ? (0, n.tr)("snapping") : (0, n.tr)("snapping"),
            onlyTextColor: this.data.isnew && "left" === this.props.direction ? n.theme.deepGreen2 : n.theme.lightc
          }), this.props.data.uploading || this.state.entryDeleted || !N || !w ? null : s["default"].createElement(o.View, {
            style: {
              position: "absolute",
              top: 3,
              left: 3,
              alignItems: "center",
              justifyContent: "center",
              width: u,
              height: c
            }
          }, s["default"].createElement(o.View, {
            style: {
              backgroundColor: "rgba(0,0,0,0.2)",
              width: C / 2,
              alignItems: "center",
              justifyContent: "center",
              height: C / 2,
              borderRadius: C / 4,
              borderWidth: 3,
              borderColor: n.theme.whiteTrans6
            }
          }, s["default"].createElement(o.Text, {
            style: {
              color: n.theme.whiteTrans6,
              fontSize: 20
            }
          }, "GIF"))))));
        }
        if (this.data.type === n.apps.CONS_MSG_TYPE_EMOTION) return s["default"].createElement(o.TouchableOpacity, {
          onLongPress: this.onLongPress
        }, s["default"].createElement(o.View, {
          style: [{
            flex: 1,
            width: 100,
            height: 100,
            marginTop: 5
          }, "left" === this.props.direction ? {
            marginLeft: 2
          } : {
            marginRight: 2
          }]
        }, s["default"].createElement(n.CachedImage, {
          style: {
            height: 100,
            width: 100
          },
          emotion: this.data.emoj,
          resizeMode: "contain"
        })));
        if (this.data.type === n.apps.CONS_MSG_TYPE_PRAISE) return s["default"].createElement(o.TouchableOpacity, {
          noOpacictyActive: !0,
          onLongPress: this.onLongPress,
          onPress: function () {
            "2:" === e.data.toId.slice(0, 2) && n.apps.getProfileK(e.data.fromId, "name").then(function (e) {
              n.apps.myInputViewRef.refs.inputView.changeText("@" + e + " "), n.apps.myInputViewComponent.focus();
            })["catch"](function (t) {
              (0, n.tlog)("error", "ChatBubbleView onPress praise", e.data, t);
            });
          }
        }, s["default"].createElement(o.View, {
          style: [{
            paddingHorizontal: 8,
            paddingVertical: "ios" == o.Platform.OS ? 5 : 7,
            borderRadius: 7
          }, "android" === o.Platform.OS && {
            paddingBottom: 5
          }, "left" == this.props.direction ? {
            backgroundColor: this.props.space ? n.theme.leftBubbleTrans : n.theme.leftBubble,
            marginLeft: this.props.space ? 3 : 7
          } : {
            backgroundColor: this.props.space ? n.theme.rightBubbleTrans : n.theme.rightBubble,
            marginRight: this.props.space ? 3 : 7
          }, this.props.bubbleColor && {
            backgroundColor: this.props.bubbleColor
          }]
        }, s["default"].createElement(n.FontAwesome, {
          style: {
            paddingBottom: 1
          },
          name: "heart-o",
          size: 17,
          color: n.theme.warn
        })));
        void 0 === this.data.text && (this.data.text = "");
        var L = "string" == typeof this.data.text ? this.data.text : this.data.text.toString();
        if (this.props.space && this.props.shareData.target && "me" === this.props.shareData.target[0]) var B = !0;
        var W = this.props.isCommentMode;
        this.data.type === n.apps.CONS_MSG_TYPE_SUBMIT_AUDIT && (n.apps.hasSubmitAuditFlag || (n.apps.hasSubmitAuditFlag = !0, n.apps.emit("submitAuditTipShow"))), this.props.space || this.data.fromId !== n.apps.userid || (this.data.type === n.apps.CONS_MSG_TYPE_WARN ? L = "[ \u4e0d\u53ef\u5e26\u6709\u654f\u611f\u8bcd ]  " + L : this.data.type === n.apps.CONS_MSG_TYPE_ILLEGAL && (L = "[ \u53ea\u53ef\u7528\u5e38\u7528\u5b57\u7b26 ]  " + L));
        var Y = {},
          H = {};
        return this.data.type === n.apps.CONS_MSG_TYPE_ILLEGAL ? (H = {
          backgroundColor: n.theme.darkMagenta
        }, n.apps.lightMode && (Y = {
          color: n.theme.white
        })) : n.apps.isIn(this.data.type, n.apps.CONS_MSG_TYPE_ABUSE, n.apps.CONS_MSG_TYPE_CHEAT_WX, n.apps.CONS_MSG_TYPE_CHEAT_QQ, n.apps.CONS_MSG_TYPE_WARN) ? (H = {
          backgroundColor: n.theme.warnTrans6
        }, n.apps.lightMode && (Y = {
          color: n.theme.white
        })) : !n.apps.showCmdBall || this.data.type !== n.apps.CONS_MSG_TYPE_TERM && this.data.msgscnt !== n.apps.CONS_MSGSCNT_TERM || (H = {
          backgroundColor: n.theme.steelBlue
        }, n.apps.lightMode && (Y = {
          color: n.theme.white
        })), s["default"].createElement(o.TouchableOpacity, {
          onStartShouldSetResponder: n.apps.showCmdBall || B && !this.state.editMode && (this.data.fullText ? this.data.fullText.length !== L.length : !0) ? function () {
            return "__eggfNoResponderCapture__";
          } : null,
          noOpacictyActive: !0,
          onLongPress: this.onLongPress,
          onPress: function () {
            e.props.onPress && e.props.onPress();
          }
        }, s["default"].createElement(o.View, {
          style: [{
            paddingHorizontal: 8,
            borderRadius: 7
          }, this.state.editMode && {
            borderWidth: n.theme.px1,
            borderColor: n.theme.deepGreen2
          }, "ios" === o.Platform.OS ? {
            paddingBottom: 5
          } : {
            paddingBottom: 6
          }, this.props.space ? {
            paddingTop: 2,
            paddingBottom: 0
          } : {
            paddingTop: "ios" == o.Platform.OS ? 5 : 7
          }, !this.props.space && n.apps.blackWhiteMode && {
            borderWidth: n.theme.px1,
            borderColor: "left" == this.props.direction ? "#ddd" : "rgb(181,215,240)"
          }, "left" == this.props.direction ? {
            backgroundColor: W || this.props.space ? n.theme.leftBubbleTrans : n.theme.leftBubble,
            marginLeft: this.props.space ? 3 : 7
          } : {
            backgroundColor: W || this.props.space ? n.theme.rightBubbleTrans : n.theme.rightBubble,
            marginRight: this.props.space ? 3 : 7
          }, this.props.bubbleColor && {
            backgroundColor: this.props.bubbleColor
          }, H]
        }, W && -1 === this.data.category && this.data.fromId === n.apps.userid && "8:" !== this.data.toId.slice(0, 2) ? s["default"].createElement(d, {
          toId: this.data.toId,
          fromId: this.data.fromId,
          myTextValue: L,
          imageFontSize: 19,
          adjustsFontSizeToFit: !0,
          style: [l.tipViewText, this.props.bubbleTextColor && {
            color: this.props.bubbleTextColor
          }, {
            paddingBottom: "ios" == o.Platform.OS ? 7 : 3
          }, this.state.editMode && {
            color: n.theme.fontTrans
          }, {
            lineHeight: 21
          }]
        }) : s["default"].createElement(n.MyTextView, {
          myTextValue: L,
          imageFontSize: 19,
          adjustsFontSizeToFit: !0,
          style: [l.tipViewText, this.props.bubbleTextColor && {
            color: this.props.bubbleTextColor
          }, {
            paddingBottom: "ios" == o.Platform.OS ? 7 : 3
          }, this.state.editMode && {
            color: n.theme.fontTrans
          }, {
            lineHeight: 21
          }, Y]
        })));
      }
      return s["default"].createElement(o.View, {
        style: {
          marginHorizontal: 10,
          marginTop: 5,
          backgroundColor: n.apps.tipBackgroundColor(),
          borderRadius: 3,
          justifyContent: "center",
          alignItems: "center",
          height: 20,
          paddingHorizontal: 5
        }
      }, s["default"].createElement(o.Text, {
        style: {
          fontSize: 11,
          color: n.theme.white
        }
      }, this.props.space ? (0, n.tr)("The content has been deleted") : (0, n.tr)("Retreated")));
    },
    renderTip: function () {
      return this.props.isCommentMode || this.props.space ? null : n.apps.isIn(this.data.type, n.apps.CONS_MSG_TYPE_CHEAT_QQ, n.apps.CONS_MSG_TYPE_CHEAT_WX) ? s["default"].createElement(p, {
        data: this.data
      }) : null;
    },
    renderOptionTime: function () {
      return null;
    },
    __renderOptionTime: function () {
      var e = this.data.category;
      if (!this.props.showTime && (this.data.showLastTime || -2 === e || 0 === e)) {
        var t = {
          marginTop: 18,
          marginBottom: 0
        };
        if (this.data.showLastTimeFirst) var a = {
          marginBottom: 1
        };
        if (-2 === e || 0 === e) var i = {
          color: n.theme.deepGreen2
        };
        return s["default"].createElement(o.View, {
          style: [{
            flexDirection: "column",
            alignItems: "center",
            paddingHorizontal: n.theme.winWidth / 7
          }, t, a]
        }, s["default"].createElement(o.View, {
          style: {
            backgroundColor: "rgba(50,50,50,0.1)",
            paddingVertical: 2,
            paddingHorizontal: 5,
            borderRadius: 3
          }
        }, s["default"].createElement(n.MyTextView, {
          myTextValue: n.util.fmtDateTimeWithoutYear(new Date(this.data.showLastTimeTime || this.data.time)),
          imageFontSize: 11,
          adjustsFontSizeToFit: !0,
          style: [{
            fontSize: 11,
            color: n.theme.white
          }, i]
        })));
      }
    },
    renderStamp: function () {
      var e = "right" === this.props.direction,
        t = this.data,
        a = t.fromId,
        i = t.shareId,
        r = t.msgid,
        p = t.time,
        d = t.msgscnt;
      e || 1 !== this.data.uread || this.data.category !== n.apps.CONS_MSG_CAT_MSG || n.apps.userid === a || i !== n.apps.getChatSession(n.apps.userid, a) || n.apps.handleUreadOk(a, i, r, p, this.props.fid);
      n.apps.isIn(d, n.apps.CONS_FIRST_BOTTLE_MSGSCNT, n.apps.CONS_FIRST_BOTTLE_MSGSCNT2);
      return !e || n.apps.showCmdBall ? s["default"].createElement(o.View, {
        style: {
          flexDirection: "row",
          alignItems: "center"
        }
      }, s["default"].createElement(o.Text, {
        style: [l.titleDateText, e ? {
          marginRight: this.data.uread ? 3 : 10
        } : {
          marginLeft: 10
        }, {
          marginTop: 3,
          color: n.apps.darkTheme ? "#ccc" : "#bbb"
        }]
      }, n.util.fmtDateTimeWithoutYear(new Date(this.data.time), !0)), null, null) : null;
    },
    renderContentContainer: function () {
      return s["default"].createElement(o.View, {
        style: [l.tipWrapperView, "left" == this.props.direction ? l.tipWrapperViewLeft : l.tipWrapperViewRight, {
          width: this.props.bubbleWidth
        }]
      }, this.renderTitleView(), this.renderContent(), this.renderStamp(), this.renderMoreImage(), this.renderMsgCnt());
    },
    renderMoreImage: function () {
      var e = this,
        t = this.props.moreImagesStuff;
      if (t) {
        var a = t.moreImages,
          i = t.hasNotFullShown,
          r = t.showFull,
          p = t.thumbSize,
          d = t.maxImageWidth,
          l = t.i;
        return 0 === l && n.apps.isIn(this.props.data.type, n.apps.CONS_MSG_TYPE_IMAGE, n.apps.CONS_MSG_TYPE_VIDEO) && (a.unshift(this.props.data), a.length > 3 && a.pop()), i && a.length > 0 ? s["default"].createElement(o.TouchableOpacity, {
          style: {},
          onPress: function () {
            return r();
          },
          onLongPress: function (t) {
            return e.props.onLongPress();
          }
        }, s["default"].createElement(o.View, {
          style: {
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center",
            marginLeft: 8,
            marginTop: 5,
            width: d,
            height: d / 3
          }
        }, a.map(function (e) {
          return s["default"].createElement(o.View, {
            key: e.imgId,
            style: [{
              borderRadius: 3,
              marginRight: 5,
              width: p,
              height: p
            }, n.apps.blackWhiteMode && {
              borderWidth: n.theme.px1,
              borderColor: "#ddd"
            }]
          }, s["default"].createElement(n.CachedImage, {
            resizeMode: "cover",
            style: {
              borderRadius: 3,
              width: p,
              height: p
            },
            imageId: e.imgId
          }), e.type === n.apps.CONS_MSG_TYPE_VIDEO ? s["default"].createElement(o.View, {
            style: {
              position: "absolute",
              top: 0,
              left: 1,
              alignItems: "center",
              justifyContent: "center",
              width: p,
              height: p
            }
          }, s["default"].createElement(o.View, {
            style: {
              backgroundColor: "rgba(0,0,0,0.2)",
              width: p / 2,
              alignItems: "center",
              justifyContent: "center",
              height: p / 2,
              borderRadius: p / 4,
              borderWidth: 1,
              borderColor: n.theme.whiteTrans6
            }
          }, s["default"].createElement(n.Ionicons, {
            style: ["ios" === o.Platform.OS ? {
              paddingLeft: 5
            } : {
              marginLeft: 5
            }],
            name: "md-play",
            size: 15,
            color: n.theme.whiteTrans6
          }))) : null);
        }))) : null;
      }
    },
    renderMsgCnt: function () {
      if (!n.apps.showCmdBall) return s["default"].createElement(o.View, {
        style: {
          height: 5
        }
      });
      var e = this.data.msgid.match(/^\S+:\S+/);
      return this.data.msgscnt || (this.data.msgscnt = "  "), e && !this.props.space ? s["default"].createElement(o.View, {
        style: {
          flexDirection: "row",
          marginTop: 2,
          marginHorizontal: 10
        }
      }, s["default"].createElement(o.View, {
        style: {
          paddingHorizontal: 7,
          height: 20,
          borderRadius: 10,
          backgroundColor: n.theme.deepGreen2Trans6,
          justifyContent: "center",
          alignItems: "center"
        }
      }, s["default"].createElement(o.Text, {
        style: {
          fontSize: 10,
          color: n.theme.white
        }
      }, this.data.msgscnt))) : void 0;
    },
    renderDebugId: function (e) {
      return n.apps.showShareAndMsgId ? s["default"].createElement(o.Text, {
        style: [{
          position: "absolute",
          bottom: 0
        }, e]
      }, this.data.msgid) : void 0;
    },
    render: function () {
      var e = this;
      try {
        var t = this.data.category;
        if (this.props.space) return "left" == this.props.direction ? s["default"].createElement(o.View, this.props, this.renderOptionTime(), -2 === t || 0 === t ? null : s["default"].createElement(o.View, {
          style: {
            flexDirection: "row",
            justifyContent: "flex-start"
          }
        }, this.renderAvatar(), this.renderContentContainer(), this.renderDebugId({
          right: 0
        })), this.renderTip()) : s["default"].createElement(o.View, this.props, this.renderOptionTime(), -2 === t || 0 === t ? null : s["default"].createElement(o.View, {
          style: {
            flexDirection: "row",
            justifyContent: "flex-end"
          }
        }, this.renderContentContainer(), this.renderAvatar(), this.renderDebugId({
          left: 0
        })));
        var a = this.props.isCommentMode,
          i = 1 === this.props.data.category && 1 === this.props.data.seqi;
        return a || "left" == this.props.direction ? s["default"].createElement(o.TouchableOpacity, babelHelpers["extends"]({
          noOpacictyActive: !a,
          onPress: function () {
            return e.props.onPress && e.props.onPress();
          }
        }, this.props), -2 === t || 0 === t ? null : s["default"].createElement(o.View, {
          style: {
            flexDirection: "row",
            justifyContent: "flex-start"
          }
        }, this.renderAvatar(), this.renderContentContainer(), this.renderDebugId({
          right: 0
        }), a && !i ? s["default"].createElement(o.View, {
          style: {
            position: "absolute",
            top: 0,
            right: 5
          }
        }, s["default"].createElement(o.Text, {
          style: {
            marginLeft: 10,
            marginTop: 3,
            fontSize: 11,
            color: n.theme.lighta
          }
        }, n.util.fmtReplyTime(new Date(this.data.time)))) : null), a ? null : this.renderOptionTime(), this.renderTip()) : s["default"].createElement(o.TouchableOpacity, babelHelpers["extends"]({
          noOpacictyActive: !a,
          onPress: function () {
            return e.props.onPress && e.props.onPress();
          }
        }, this.props), -2 === t || 0 === t ? null : s["default"].createElement(o.View, {
          style: {
            flexDirection: "row",
            justifyContent: "flex-end"
          }
        }, this.renderContentContainer(), this.renderAvatar(), this.renderDebugId({
          left: 0
        })), a ? null : this.renderOptionTime());
      } catch (r) {
        return (0, n.tlog)("error", "render ChatBubbleView", this.data, r), null;
      }
    }
  });
  var l = {
    anonymousViewLeft: {
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: 4,
      paddingHorizontal: 5,
      marginRight: 4
    },
    anonymousViewRight: {
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: 4,
      paddingHorizontal: 5,
      marginLeft: 4
    },
    anonymousText: {
      color: n.theme.white,
      fontSize: 11
    },
    avatarView: {
      justifyContent: "center",
      alignItems: "center"
    },
    avatarImage: {
      width: o.PixelRatio.roundToNearestPixel(36.5),
      height: o.PixelRatio.roundToNearestPixel(36.5),
      borderRadius: 10
    },
    avatarTextButton: {
      borderRadius: 10,
      flex: 1,
      paddingHorizontal: 8,
      justifyContent: "center",
      alignItems: "center"
    },
    avatarTextButtonText: {
      textAlign: "center"
    },
    tipWrapperView: {
      flexDirection: "column",
      paddingVertical: 0
    },
    tipWrapperViewLeft: {
      alignItems: "flex-start"
    },
    tipWrapperViewRight: {
      alignItems: "flex-end"
    },
    tipImageView: {
      borderRadius: 4,
      backgroundColor: n.theme.deepTrans1
    },
    angleView: {
      position: "absolute",
      transform: [{
        rotate: "45deg"
      }],
      width: 10,
      height: 10,
      backgroundColor: n.theme.deep,
      borderRadius: 2,
      top: 10,
      borderWidth: 1,
      borderColor: n.theme.angleBorder
    },
    _angleView: {
      position: "absolute",
      transform: [{
        rotate: "45deg"
      }],
      width: o.PixelRatio.roundToNearestPixel(9.5),
      height: o.PixelRatio.roundToNearestPixel(9.5),
      backgroundColor: n.theme.deep,
      borderRadius: 2,
      top: 10
    },
    angleViewLeft: {
      left: o.PixelRatio.roundToNearestPixel(6.5),
      backgroundColor: n.theme.leftBubble
    },
    angleViewRight: {
      right: o.PixelRatio.roundToNearestPixel(6.5),
      backgroundColor: n.theme.rightBubble
    },
    _angleViewLeft: {
      left: 7,
      backgroundColor: n.theme.leftBubble
    },
    _angleViewRight: {
      right: 7,
      backgroundColor: n.theme.rightBubble
    },
    tipViewText: {
      fontSize: 16,
      color: n.theme.deep6,
      textAlign: "left"
    },
    titleView: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 1,
      marginBottom: 4
    },
    titleViewLeft: {
      marginLeft: 10
    },
    titleViewRight: {
      marginRight: 10
    },
    titleDateText: {
      color: n.theme.lighta,
      fontSize: 9,
      textAlign: "center",
      marginHorizontal: 2
    },
    titleNameText: {
      fontWeight: "bold",
      color: n.theme.deep9,
      fontSize: 12,
      marginHorizontal: 2
    },
    titleNameTextLeft: {
      marginLeft: 2
    },
    titleNameTextRight: {
      marginRight: 2
    },
    resendingView: {
      justifyContent: "center",
      alignItems: "center",
      width: 30,
      height: 30,
      borderRadius: 17,
      backgroundColor: n.theme.warn,
      marginBottom: 2
    },
    resendingIcon: {
      fontSize: 17,
      color: n.theme.white,
      textAlign: "center"
    },
    resendingInfo: {
      paddingVertical: 3,
      fontSize: 11,
      color: n.theme.deep9,
      textAlign: "center"
    }
  };
});
