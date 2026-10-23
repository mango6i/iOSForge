// Recovered module 361; analysis path, not original filename.
// Original SHA-256 b1f67cb995c496fb05b3bd6a18f61bf29ae9866e9b69cee568396620710fc2f5; original byte range [1799306, 1802461).
__d(361, function (e, t, i, n) {
  var a = t(311),
    r = babelHelpers.interopRequireDefault(a),
    s = t(312),
    l = t(314);
  n.FriendAcceptView = r["default"].createClass({
    displayName: "FriendAcceptView",
    getInitialState: function () {
      return this.height = l.theme.winHeight - l.theme.navHeight - l.theme.tabHeight - l.theme.statusHeightAll, this.friendId = this.props.friend.friendId, {
        accepting: !1,
        refusing: !1
      };
    },
    render: function () {
      var e = this,
        t = l.apps.hasCustomBg && l.apps.blackWhiteMode;
      return r["default"].createElement(s.View, null, r["default"].createElement(s.View, {
        style: {
          height: l.theme.navHeight
        }
      }), r["default"].createElement(l.BackgroundImageView, {
        shouldRender: !0,
        userid: l.apps.userid,
        shouldRender: !0,
        maskColor: t ? l.theme.chatBgMaskColorTrans : l.theme.chatBgMaskColor
      }), r["default"].createElement(s.View, {
        style: {
          flex: 1,
          height: this.height,
          backgroundColor: l.theme.transparent,
          justifyContent: "center",
          alignItems: "center"
        }
      }, r["default"].createElement(s.View, {
        style: {
          borderRadius: 10,
          paddingHorizontal: 10,
          width: l.theme.winWidth / 4 * 3,
          paddingVertical: 10,
          backgroundColor: l.theme.friendAcceptBg
        }
      }, r["default"].createElement(s.View, {
        style: {
          justifyContent: "center",
          alignItems: "center"
        }
      }, r["default"].createElement(s.TouchableOpacity, {
        style: {
          justifyContent: "center",
          alignItems: "center",
          width: 100,
          height: 100,
          borderRadius: 15,
          marginVertical: 2
        },
        onPress: function () {
          l.apps.getProfileK(e.friendId, "avatar").then(function (e) {
            l.apps.emit("showModelImage", {
              imgId: e + ".jpg",
              ratio: 1
            });
          });
        }
      }, this.state.accepting || this.state.refusing ? l.apps.spinner("large") : r["default"].createElement(l.CachedImage, {
        spinnerSize: 50,
        style: {
          width: 100,
          height: 100,
          borderRadius: 15
        },
        avatarId: this.friendId,
        resizeMode: "cover"
      }))), r["default"].createElement(l.NameText, {
        userid: this.friendId,
        imageFontSize: 15,
        style: {
          marginTop: 6,
          fontSize: 17,
          color: l.theme.deep7,
          textAlign: "center"
        },
        numberOfLines: 1
      }), r["default"].createElement(s.Text, {
        style: {
          fontSize: 17,
          marginTop: 2,
          color: this.state.failed ? l.theme.warn : l.theme.deep8,
          textAlign: "center"
        }
      }, this.state.accepting ? (0, l.tr)("Accepting...") : this.state.refusing ? (0, l.tr)("Refusing...") : this.state.failed ? (0, l.tr)("Connection Failed") : this.props.friend.desc), r["default"].createElement(s.View, {
        style: {
          flexDirection: "row",
          marginTop: 10,
          justifyContent: "space-between",
          alignItems: "center"
        }
      }, r["default"].createElement(s.TouchableOpacity, {
        style: {
          borderRadius: 10,
          paddingHorizontal: 5,
          paddingVertical: 5,
          marginVertical: 3,
          backgroundColor: l.theme.warnTrans6,
          width: l.theme.winWidth / 4 * 3 / 2 - 15
        },
        onPress: function () {
          e.setState({
            refusing: !0,
            accepting: !1,
            failed: !1
          }), e.props.onRefuse(function () {
            e.setState({
              failed: !0,
              accepting: !1,
              refusing: !1
            });
          });
        }
      }, r["default"].createElement(s.Text, {
        style: {
          fontSize: 20,
          color: l.theme.white,
          textAlign: "center"
        }
      }, (0, l.tr)("Refuse"))), r["default"].createElement(s.TouchableOpacity, {
        style: {
          borderRadius: 10,
          paddingHorizontal: 5,
          paddingVertical: 5,
          marginVertical: 3,
          backgroundColor: l.theme.deepGreen2Trans6,
          width: l.theme.winWidth / 4 * 3 / 2 - 15
        },
        onPress: function () {
          e.setState({
            accepting: !0,
            failed: !1,
            refusing: !1
          }), e.props.onAccept(function () {
            e.setState({
              failed: !0,
              accepting: !1,
              refusing: !1
            });
          });
        }
      }, r["default"].createElement(s.Text, {
        style: {
          fontSize: 20,
          color: l.theme.white,
          textAlign: "center"
        }
      }, (0, l.tr)("Agree")))))));
    }
  });
});
