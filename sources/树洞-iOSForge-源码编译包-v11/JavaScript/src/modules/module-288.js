// Recovered module 288; analysis path, not original filename.
// Original SHA-256 c5a2e257f3969df12bdf0e5913ebc7e5d49e07bf11c13c611f1bd791871676d5; original byte range [563682, 566205).
__d(288, function (e, t, n, r) {
  "use strict";

  var o = t(1),
    i = t(312),
    l = t(289),
    s = t(290),
    a = t(275),
    p = t(291),
    u = t(285),
    h = i.Animated,
    c = (i.Platform, i.StyleSheet),
    d = i.View,
    f = 44,
    b = 20,
    m = o.PropTypes,
    g = function (e) {
      function t() {
        return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "shouldComponentUpdate",
        value: function (e, t) {
          return u.shouldComponentUpdate.call(this, e, t);
        }
      }, {
        key: "render",
        value: function () {
          var e = this,
            t = this.props,
            n = t.scenes,
            r = t.style,
            i = t.viewProps,
            l = n.map(function (t) {
              var n = a.extractSceneRendererProps(e.props);
              return n.scene = t, n;
            });
          return o.createElement(d, babelHelpers["extends"]({
            style: [v.appbar, r]
          }, i), l.map(this._renderLeft, this), l.map(this._renderTitle, this), l.map(this._renderRight, this));
        }
      }, {
        key: "_renderLeft",
        value: function (e) {
          return this._renderSubView(e, "left", this.props.renderLeftComponent, p.forLeft);
        }
      }, {
        key: "_renderTitle",
        value: function (e) {
          return this._renderSubView(e, "title", this.props.renderTitleComponent, p.forCenter);
        }
      }, {
        key: "_renderRight",
        value: function (e) {
          return this._renderSubView(e, "right", this.props.renderRightComponent, p.forRight);
        }
      }, {
        key: "_renderSubView",
        value: function (e, t, n, r) {
          var i = e.scene,
            l = e.navigationState,
            s = i.index,
            a = i.isStale,
            p = i.key,
            u = l.index - s;
          if (Math.abs(u) > 2) return null;
          var c = n(e);
          if (null === c) return null;
          var d = 0 !== u || a ? "none" : "box-none";
          return o.createElement(h.View, {
            pointerEvents: d,
            key: t + "_" + p,
            style: [v[t], r(e)]
          }, c);
        }
      }]), t;
    }(o.Component);
  g.defaultProps = {
    renderTitleComponent: function (e) {
      var t = e.navigationState,
        n = String(t.title || "");
      return o.createElement(l, null, n);
    },
    renderLeftComponent: function (e) {
      return 0 === e.scene.index ? null : o.createElement(s, {
        onNavigate: e.onNavigate
      });
    },
    renderRightComponent: function (e) {
      return null;
    }
  }, g.propTypes = babelHelpers["extends"]({}, a.SceneRendererProps, {
    renderLeftComponent: m.func,
    renderRightComponent: m.func,
    renderTitleComponent: m.func,
    style: d.propTypes.style,
    viewProps: m.shape(d.propTypes)
  }), g.HEIGHT = f + b, g.Title = l, g.BackButton = s;
  var v = c.create({
    appbar: {
      alignItems: "center",
      backgroundColor: "#EFEFF2",
      borderBottomColor: "rgba(0, 0, 0, .15)",
      borderBottomWidth: c.hairlineWidth,
      elevation: 2,
      flexDirection: "row",
      height: f + b,
      justifyContent: "flex-start",
      left: 0,
      marginBottom: 16,
      position: "absolute",
      right: 0,
      top: 0
    },
    title: {
      bottom: 0,
      left: f,
      marginTop: b,
      position: "absolute",
      right: f,
      top: 0
    },
    left: {
      bottom: 0,
      left: 0,
      marginTop: b,
      position: "absolute",
      top: 0
    },
    right: {
      bottom: 0,
      marginTop: b,
      position: "absolute",
      right: 0,
      top: 0
    }
  });
  n.exports = g;
});
