// Recovered module 328; analysis path, not original filename.
// Original SHA-256 d28e16d4be2dd401b3a74c389dd0c9eee341a07e43abcb104e635c2783979389; original byte range [1312923, 1314778).
__d(328, function (e, t, r, n) {
  Object.defineProperty(n, "__esModule", {
    value: !0
  });
  var o = t(311),
    s = babelHelpers.interopRequireDefault(o),
    i = t(312),
    a = t(314),
    l = s["default"].createClass({
      displayName: "InterActionSpinner",
      getDefaultProps: function () {
        return {
          tips: "",
          glass: !0,
          backgroundColor: a.theme.spinBackground,
          show: !0
        };
      },
      getInitialState: function () {
        return {
          show: this.props.show
        };
      },
      componentWillReceiveProps: function () {
        this.setState({
          show: !this.props.notShow
        });
      },
      renderBlueSpin: function () {
        return s["default"].createElement(i.View, {
          style: [{
            backgroundColor: a.theme.transparent,
            width: 80,
            height: 80,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center"
          }, this.props.upoff && {
            marginTop: -this.props.upoff
          }]
        }, s["default"].createElement(i.Image, {
          style: {
            width: 40,
            height: 40,
            opacity: .2,
            backgroundColor: "transparent"
          },
          source: t(389),
          fadeDuration: 0
        }));
      },
      renderSystemSpin: function () {
        return s["default"].createElement(i.View, {
          style: [p.blackBlock, this.props.up && {
            marginTop: -this.props.up
          }]
        }, "android" === i.Platform.OS ? s["default"].createElement(i.ProgressBarAndroid, {
          styleAttr: "Inverse",
          color: a.theme.white
        }) : s["default"].createElement(i.ActivityIndicatorIOS, {
          animating: !0,
          size: "large",
          color: a.theme.white
        }), this.props.tips ? s["default"].createElement(i.Text, {
          style: p.tipsText
        }, this.props.tips) : null);
      },
      render: function () {
        var e = this;
        return this.state.show ? s["default"].createElement(i.TouchableOpacity, {
          style: p.spinner,
          onPress: function (t) {
            e.props.onPress && e.props.onPress(t);
          }
        }, this.props.shouldSpin ? this.props.sysSpin ? this.renderSystemSpin() : this.renderBlueSpin() : null) : null;
      }
    }),
    p = {
      blackBlock: {
        justifyContent: "center",
        alignItems: "center",
        width: 90,
        height: 90,
        borderRadius: 25
      },
      spinner: {
        position: "absolute",
        backgroundColor: "rgba(0,0,0,0)",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: "center",
        alignItems: "center"
      },
      tipsText: {
        color: a.theme.deep8,
        marginTop: "ios" == i.Platform.OS ? 5 : 0
      }
    };
  n["default"] = l;
});
