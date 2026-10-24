// Recovered module 368; analysis path, not original filename.
// Original SHA-256 3b1811366ed5bbfea3fdd08906af0ed8ff31475d2c8bfd525de9ccaf0b983bef; original byte range [1907183, 1909676).
__d(368, function (e, t, i, o) {
  var h = t(311),
    a = babelHelpers.interopRequireDefault(h),
    n = t(312),
    r = t(314);
  o.BackgroundImageView = a["default"].createClass({
    displayName: "BackgroundImageView",
    getDefaultProps: function () {
      return {
        height: r.theme.backgroundHeight,
        maskColor: r.theme.transparent
      };
    },
    getInitialState: function () {
      return {};
    },
    componentWillMount: function () {
      r.apps.on("backgroundChanged", this.onBackgroundChanged);
    },
    componentWillUnmount: function () {
      r.apps.unon("backgroundChanged", this.onBackgroundChanged);
    },
    onBackgroundChanged: function () {
      this.setState({});
    },
    renderDefault: function () {
      return a["default"].createElement(r.CachedImage, {
        defaultSource: t(r.apps.darkTheme ? 403 : 402),
        resizeMode: "cover",
        isbackground: !0,
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: r.theme.winWidth,
          height: this.props.height
        },
        fadeDuration: 0
      });
    },
    render: function () {
      if (r.apps.showBackgroundImage) {
        if (this.props.bgImage) return a["default"].createElement(n.View, {
          style: {
            position: "absolute",
            left: 0,
            top: 0,
            width: r.theme.winWidth,
            height: this.props.height,
            backgroundColor: r.theme.deep
          }
        }, a["default"].createElement(r.CachedImage, {
          defaultSource: t(403),
          resizeMode: "cover",
          isbackground: !0,
          style: {
            position: "absolute",
            left: 0,
            top: 0,
            width: r.theme.winWidth,
            height: this.props.height
          },
          fadeDuration: 0
        }), a["default"].createElement(n.View, {
          style: {
            position: "absolute",
            left: 0,
            top: 0,
            width: r.theme.winWidth,
            height: this.props.height,
            backgroundColor: this.props.maskColor
          }
        }));
        if (r.apps.customBg) {
          var e = r.apps.customBg;
          return a["default"].createElement(n.View, {
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              width: r.theme.winWidth,
              height: this.props.height,
              backgroundColor: r.theme.deep
            }
          }, r.apps.backgroundTypeIsUri[this.userid] ? a["default"].createElement(n.Image, {
            source: {
              uri: e
            },
            resizeMode: "cover",
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              width: r.theme.winWidth,
              height: this.props.height
            }
          }) : a["default"].createElement(r.CachedImage, {
            resizeMode: "cover",
            imageId: e,
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              width: r.theme.winWidth,
              height: this.props.height
            }
          }), a["default"].createElement(n.View, {
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              width: r.theme.winWidth,
              height: this.props.height,
              backgroundColor: this.props.maskColor
            }
          }));
        }
        return a["default"].createElement(n.View, {
          style: {
            position: "absolute",
            left: 0,
            top: 0,
            width: r.theme.winWidth,
            height: this.props.height,
            backgroundColor: r.theme.deep
          }
        }, this.renderDefault(), a["default"].createElement(n.View, {
          style: {
            position: "absolute",
            left: 0,
            top: 0,
            width: r.theme.winWidth,
            height: this.props.height,
            backgroundColor: this.props.maskColor
          }
        }));
      }
      return null;
    }
  });
});
