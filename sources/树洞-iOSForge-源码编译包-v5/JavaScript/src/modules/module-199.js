// Recovered module 199; analysis path, not original filename.
// Original SHA-256 9a3831177a203b8dadf5540fa8e05c3b4d169c9e192ed5c4baf9553b4354efbe; original byte range [406417, 409275).
__d(199, function (t, e, s, r) {
  "use strict";

  var n = e(1),
    o = e(198),
    i = e(196),
    a = (e(29), e(43)),
    p = e(67),
    u = e(151),
    h = e(640),
    c = h.Map,
    l = ["Title", "LeftButton", "RightButton"],
    y = i,
    v = function (t) {
      return void 0 !== t.presentedIndex ? t.presentedIndex : t.observedTopOfStack;
    },
    f = n.createClass({
      displayName: "NavigatorNavigationBar",
      propTypes: {
        navigator: n.PropTypes.object,
        routeMapper: n.PropTypes.shape({
          Title: n.PropTypes.func.isRequired,
          LeftButton: n.PropTypes.func.isRequired,
          RightButton: n.PropTypes.func.isRequired
        }).isRequired,
        navState: n.PropTypes.shape({
          routeStack: n.PropTypes.arrayOf(n.PropTypes.object),
          presentedIndex: n.PropTypes.number
        }),
        navigationStyles: n.PropTypes.object,
        style: p.propTypes.style
      },
      statics: {
        Styles: y,
        StylesAndroid: o,
        StylesIOS: i
      },
      getDefaultProps: function () {
        return {
          navigationStyles: y
        };
      },
      componentWillMount: function () {
        this._reset();
      },
      immediatelyRefresh: function () {
        this._reset(), this.forceUpdate();
      },
      _reset: function () {
        var t = this;
        this._key = u(), this._reusableProps = {}, this._components = {}, this._descriptors = {}, l.forEach(function (e) {
          t._components[e] = new c(), t._descriptors[e] = new c();
        });
      },
      _getReusableProps: function (t, e) {
        var s = this._reusableProps[t];
        s || (s = this._reusableProps[t] = []);
        var r = s[e];
        return r || (r = s[e] = {
          style: {}
        }), r;
      },
      _updateIndexProgress: function (t, e, s, r) {
        var n,
          o = r > s ? t : 1 - t,
          i = e - s,
          a = e - r;
        n = i > 0 && 0 === a || a > 0 && 0 === i ? this.props.navigationStyles.Interpolators.RightToCenter : 0 > i && 0 === a || 0 > a && 0 === i ? this.props.navigationStyles.Interpolators.CenterToLeft : i === a ? this.props.navigationStyles.Interpolators.RightToCenter : this.props.navigationStyles.Interpolators.RightToLeft, l.forEach(function (t) {
          var s = this._components[t].get(this.props.navState.routeStack[e]),
            r = this._getReusableProps(t, e);
          s && n[t](r.style, o) && (r.pointerEvents = 0 === r.style.opacity ? "none" : "box-none", s.setNativeProps(r));
        }, this);
      },
      updateProgress: function (t, e, s) {
        for (var r = Math.max(e, s), n = Math.min(e, s), o = n; r >= o; o++) this._updateIndexProgress(t, o, e, s);
      },
      render: function () {
        var t = this,
          e = {
            height: this.props.navigationStyles.General.TotalNavHeight
          },
          s = this.props.navState,
          r = s.routeStack.map(function (e, s) {
            return l.map(function (r) {
              return t._getComponent(r, e, s);
            });
          });
        return n.createElement(p, {
          key: this._key,
          style: [g.navBarContainer, e, this.props.style]
        }, r);
      },
      _getComponent: function (t, e, s) {
        var r = this;
        if (this._descriptors[t].includes(e)) return this._descriptors[t].get(e);
        var o = null,
          i = this.props.routeMapper[t](this.props.navState.routeStack[s], this.props.navigator, s, this.props.navState);
        if (!i) return null;
        var a = s === v(this.props.navState),
          u = a ? this.props.navigationStyles.Stages.Center : this.props.navigationStyles.Stages.Left;
        return o = n.createElement(p, {
          ref: function (s) {
            r._components[t] = r._components[t].set(e, s);
          },
          pointerEvents: a ? "box-none" : "none",
          style: u[t]
        }, i), this._descriptors[t] = this._descriptors[t].set(e, o), o;
      }
    }),
    g = a.create({
      navBarContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "transparent"
      }
    });
  s.exports = f;
});
