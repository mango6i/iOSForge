// Recovered module 274; analysis path, not original filename.
// Original SHA-256 46bd350fb67183d14d4eb641490e4d0db0ddd8810447fa0201a2bae753769b62; original byte range [545898, 548892).
__d(274, function (e, t, n, i) {
  "use strict";

  function s(e, t) {
    a.spring(e, {
      bounciness: 0,
      toValue: t.index
    }).start();
  }
  var a = t(243),
    o = t(275),
    r = t(276),
    u = t(1),
    l = t(43),
    p = t(67),
    h = u.PropTypes,
    c = function (e) {
      function t(e, n) {
        babelHelpers.classCallCheck(this, t);
        var i = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).call(this, e, n)),
          s = {
            height: new a.Value(0),
            initHeight: 0,
            initWidth: 0,
            isMeasured: !1,
            width: new a.Value(0)
          };
        return i.state = {
          layout: s,
          position: new a.Value(i.props.navigationState.index),
          progress: new a.Value(1),
          scenes: r([], i.props.navigationState)
        }, i;
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "componentWillMount",
        value: function () {
          this._onLayout = this._onLayout.bind(this), this._onProgressChange = this._onProgressChange.bind(this);
        }
      }, {
        key: "componentDidMount",
        value: function () {
          this._positionListener = this.state.position.addListener(this._onProgressChange);
        }
      }, {
        key: "componentWillReceiveProps",
        value: function (e) {
          e.navigationState !== this.props.navigationState && this.setState({
            scenes: r(this.state.scenes, e.navigationState, this.props.navigationState)
          });
        }
      }, {
        key: "componentDidUpdate",
        value: function (e) {
          e.navigationState.index !== this.props.navigationState.index && this.props.applyAnimation(this.state.position, this.props.navigationState, e.navigationState);
        }
      }, {
        key: "componentWillUnmount",
        value: function () {
          this.state.position.removeListener(this._positionListener);
        }
      }, {
        key: "_onProgressChange",
        value: function (e) {
          var t = Math.abs(e.value - this.props.navigationState.index);
          if (!(t > Number.EPSILON)) {
            var n = this.state.scenes.filter(function (e) {
              return !e.isStale;
            });
            n.length !== this.state.scenes.length && this.setState({
              scenes: n
            });
          }
        }
      }, {
        key: "render",
        value: function () {
          var e = this._renderOverlay(),
            t = this._renderScenes();
          return u.createElement(p, {
            onLayout: this._onLayout,
            style: this.props.style
          }, u.createElement(p, {
            style: v.scenes,
            key: "scenes"
          }, t), e);
        }
      }, {
        key: "_renderScenes",
        value: function () {
          return this.state.scenes.map(this._renderScene, this);
        }
      }, {
        key: "_renderScene",
        value: function (e) {
          var t = this.props,
            n = t.navigationState,
            i = t.onNavigate,
            s = t.renderScene,
            a = this.state,
            o = a.position,
            r = a.progress,
            u = a.scenes;
          return s({
            layout: this.state.layout,
            navigationState: n,
            onNavigate: i,
            position: o,
            progress: r,
            scene: e,
            scenes: u
          });
        }
      }, {
        key: "_renderOverlay",
        value: function () {
          if (this.props.renderOverlay) {
            var e = this.props,
              t = e.navigationState,
              n = e.onNavigate,
              i = e.renderOverlay,
              s = this.state,
              a = s.position,
              o = s.progress,
              r = s.scenes;
            return i({
              layout: this.state.layout,
              navigationState: t,
              onNavigate: n,
              position: a,
              progress: o,
              scene: r[t.index],
              scenes: r
            });
          }
          return null;
        }
      }, {
        key: "_onLayout",
        value: function (e) {
          var t = e.nativeEvent.layout,
            n = t.height,
            i = t.width,
            s = babelHelpers["extends"]({}, this.state.layout, {
              initHeight: n,
              initWidth: i,
              isMeasured: !0
            });
          s.height.setValue(n), s.width.setValue(i), this.setState({
            layout: s
          });
        }
      }]), t;
    }(u.Component);
  c.propTypes = {
    applyAnimation: h.func,
    navigationState: o.navigationState.isRequired,
    renderOverlay: h.func,
    renderScene: h.func.isRequired
  }, c.defaultProps = {
    applyAnimation: s
  };
  var v = l.create({
    scenes: {
      flex: 1
    }
  });
  n.exports = c;
});
