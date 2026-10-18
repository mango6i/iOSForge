// Recovered module 297; analysis path, not original filename.
// Original SHA-256 d5d93fa07b1a736154468ab4dac011d8e44b2d54b057989ea32b0dd06a5865c6; original byte range [572782, 575780).
__d(297, function (e, t, n, i) {
  "use strict";

  function s(e) {
    return !e.isStale;
  }
  var a = t(243),
    r = t(245),
    o = t(275),
    l = t(276),
    u = t(1),
    c = t(43),
    h = t(67),
    p = u.PropTypes,
    v = {
      duration: 250,
      easing: r.inOut(r.ease)
    },
    d = function (e) {
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
          scenes: l([], i.props.navigationState)
        }, i;
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "componentWillMount",
        value: function () {
          this._onLayout = this._onLayout.bind(this), this._onTransitionEnd = this._onTransitionEnd.bind(this);
        }
      }, {
        key: "componentWillReceiveProps",
        value: function (e) {
          var t = l(this.state.scenes, e.navigationState, this.props.navigationState);
          if (t !== this.state.scenes) {
            var n = this.state,
              i = n.position,
              s = n.progress;
            this.setState({
              scenes: t
            });
            var r = e.configureTransition ? e.configureTransition() : null,
              o = babelHelpers["extends"]({}, v, r);
            s.setValue(0);
            var u = [a.timing(s, babelHelpers["extends"]({}, o, {
              toValue: 1
            }))];
            e.navigationState.index !== this.props.navigationState.index && u.push(a.timing(i, babelHelpers["extends"]({}, o, {
              toValue: e.navigationState.index
            }))), e.onTransitionStart && e.onTransitionStart(), a.parallel(u).start(this._onTransitionEnd);
          }
        }
      }, {
        key: "render",
        value: function () {
          var e = this._renderOverlay(),
            t = this._renderScenes();
          return u.createElement(h, {
            onLayout: this._onLayout,
            style: this.props.style
          }, u.createElement(h, {
            style: g.scenes,
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
            r = a.position,
            o = a.progress,
            l = a.scenes;
          return s({
            layout: this.state.layout,
            navigationState: n,
            onNavigate: i,
            position: r,
            progress: o,
            scene: e,
            scenes: l
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
              r = s.progress,
              o = s.scenes;
            return i({
              layout: this.state.layout,
              navigationState: t,
              onNavigate: n,
              position: a,
              progress: r,
              scene: o[t.index],
              scenes: o
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
      }, {
        key: "_onTransitionEnd",
        value: function () {
          var e = this.state.scenes.filter(s);
          e.length !== this.state.scenes.length && this.setState({
            scenes: e
          }), this.props.onTransitionEnd && this.props.onTransitionEnd();
        }
      }]), t;
    }(u.Component);
  d.propTypes = {
    configureTransition: p.func,
    navigationState: o.navigationState.isRequired,
    onNavigate: p.func.isRequired,
    onTransitionEnd: p.func,
    onTransitionStart: p.func,
    renderOverlay: p.func,
    renderScene: p.func.isRequired
  };
  var g = c.create({
    scenes: {
      flex: 1
    }
  });
  n.exports = d;
});
