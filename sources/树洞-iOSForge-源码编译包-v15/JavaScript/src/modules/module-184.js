// Recovered module 184; analysis path, not original filename.
// Original SHA-256 ccbe2b87fe8375ffb1a0f7f4b48369295aaba47ec87166faa07d1bab20b70cb7; original byte range [306468, 307717).
__d(184, function (e, t, o, n) {
  "use strict";

  var s = (t(29), t(19)),
    r = t(1),
    a = t(43),
    i = (t(30), t(67)),
    p = t(64),
    l = t(80),
    u = l("RCTModalHostView", null),
    h = function (e) {
      function t() {
        return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "render",
        value: function () {
          if (this.props.visible === !1) return null;
          var e = {
              backgroundColor: this.props.transparent ? "transparent" : "white",
              top: 0
            },
            t = this.props.animationType;
          return t || (t = "none", this.props.animated && (t = "slide")), r.createElement(u, {
            animationType: t,
            transparent: this.props.transparent,
            onRequestClose: this.props.onRequestClose,
            onShow: this.props.onShow,
            style: c.modal,
            onStartShouldSetResponder: this._shouldSetResponder
          }, r.createElement(i, {
            style: [c.container, e]
          }, this.props.children));
        }
      }, {
        key: "_shouldSetResponder",
        value: function () {
          return !0;
        }
      }]), t;
    }(r.Component);
  h.propTypes = {
    animated: p(s.bool, "Use the `animationType` prop instead."),
    animationType: s.oneOf(["none", "slide", "fade"]),
    transparent: s.bool,
    visible: s.bool,
    onRequestClose: s.func,
    onShow: s.func
  }, h.defaultProps = {
    visible: !0
  };
  var c = a.create({
    modal: {
      position: "absolute"
    },
    container: {
      position: "absolute",
      left: 0,
      top: 0
    }
  });
  o.exports = h;
});
