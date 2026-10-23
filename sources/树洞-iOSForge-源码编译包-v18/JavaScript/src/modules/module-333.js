// Recovered module 333; analysis path, not original filename.
// Original SHA-256 60008e9c2729ce0bfe83ea38fb3e73cd221bf09f9953e900b9f36570e909bd42; original byte range [1355343, 1356757).
__d(333, function (e, t, i, a) {
  var n = t(311),
    r = babelHelpers.interopRequireDefault(n),
    d = t(312),
    s = t(314);
  a.ShareBriefView = r["default"].createClass({
    displayName: "ShareBriefView",
    getInitialState: function () {
      return {
        loaded: !1,
        data: {}
      };
    },
    componentWillReceiveProps: function (e) {
      var t = e.friend,
        i = t.shareId,
        a = t.friendId;
      this.props.shareId === i && this.props.friendId === a || this.load(e.friend);
    },
    load: function (e) {
      var t = this;
      s.apps.getShareContent(e).then(function (e) {
        if (e) i = {}, e.msgs.forEach(function (e) {
          s.apps.isIn(e.type, s.apps.CONS_MSG_TYPE_IMAGE, s.apps.CONS_MSG_TYPE_VIDEO) ? i.imgId = e.imgId : i.text = e.text;
        });else var i = {
          text: ""
        };
        t.setState({
          data: i,
          loaded: !0
        });
      })["catch"](function (t) {
        (0, s.tlog)("error", "ShareBriefView ShareBriefView", e, t);
      });
    },
    componentDidMount: function () {
      this.load(this.props.friend);
    },
    render: function () {
      var e = this.props.style,
        t = e.width,
        i = e.height;
      return this.state.loaded ? this.state.data.imgId ? r["default"].createElement(d.View, {
        style: {
          width: t,
          height: i,
          justifyContent: "center",
          alignItems: "center"
        }
      }, r["default"].createElement(s.CachedImage, {
        resizeMode: "cover",
        style: {
          width: t - 12,
          height: i - 12
        },
        imageId: this.state.data.imgId
      })) : r["default"].createElement(d.View, {
        style: {
          width: t,
          height: i,
          overflow: "hidden",
          paddingHorizontal: 6,
          paddingVertical: 5
        }
      }, r["default"].createElement(d.Text, {
        style: {
          lineHeight: 19,
          color: s.theme.deep8,
          fontSize: 13
        }
      }, this.state.data.text)) : r["default"].createElement(d.View, {
        style: {
          width: t,
          height: i
        }
      });
    }
  });
});
