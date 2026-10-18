// Recovered module 194; analysis path, not original filename.
// Original SHA-256 e74bf4978cd450250b3ccee75b55b2c72ddb9ce14607aff03d6415c238d7dc7e; original byte range [391286, 395498).
__d(194, function (t, e, r, s) {
  "use strict";

  var i = e(195),
    o = (e(198), e(196)),
    n = (e(29), e(1)),
    a = e(43),
    p = e(67),
    u = e(640),
    h = u.Map,
    c = e(151),
    f = e(380),
    l = i.Interpolators,
    d = o,
    _ = n.PropTypes,
    g = l.map(function () {
      return {
        style: {}
      };
    }),
    m = l.map(function () {
      return {
        style: {}
      };
    }),
    y = l.map(function () {
      return {
        style: {}
      };
    }),
    v = l.map(function () {
      return {
        style: {}
      };
    }),
    T = l.map(function () {
      return {
        style: {}
      };
    }),
    b = function (t) {
      return void 0 !== t.presentedIndex ? t.presentedIndex : t.observedTopOfStack;
    },
    x = function (t, e) {
      return t === e ? i.Center[t] : e > t ? i.Left[t] : i.Right[t];
    },
    R = n.createClass({
      displayName: "NavigatorBreadcrumbNavigationBar",
      propTypes: {
        navigator: _.shape({
          push: _.func,
          pop: _.func,
          replace: _.func,
          popToRoute: _.func,
          popToTop: _.func
        }),
        routeMapper: _.shape({
          rightContentForRoute: _.func,
          titleContentForRoute: _.func,
          iconForRoute: _.func
        }),
        navState: n.PropTypes.shape({
          routeStack: n.PropTypes.arrayOf(n.PropTypes.object),
          presentedIndex: n.PropTypes.number
        }),
        style: p.propTypes.style
      },
      statics: {
        Styles: i
      },
      _updateIndexProgress: function (t, e, r, s) {
        var i,
          o = s > r ? t : 1 - t,
          n = e - r,
          a = e - s;
        f(l[e], "Cannot find breadcrumb interpolators for " + e), i = n > 0 && 0 === a || a > 0 && 0 === n ? l[e].RightToCenter : 0 > n && 0 === a || 0 > a && 0 === n ? l[e].CenterToLeft : n === a ? l[e].RightToCenter : l[e].RightToLeft, i.Crumb(g[e].style, o) && this._setPropsIfExists("crumb_" + e, g[e]), i.Icon(m[e].style, o) && this._setPropsIfExists("icon_" + e, m[e]), i.Separator(y[e].style, o) && this._setPropsIfExists("separator_" + e, y[e]), i.Title(v[e].style, o) && this._setPropsIfExists("title_" + e, v[e]);
        var p = this.refs["right_" + e],
          u = T[e].style;
        p && i.RightItem(u, o) && p.setNativeProps({
          style: u,
          pointerEvents: 0 === u.opacity ? "none" : "auto"
        });
      },
      updateProgress: function (t, e, r) {
        for (var s = Math.max(e, r), i = Math.min(e, r), o = i; s >= o; o++) this._updateIndexProgress(t, o, e, r);
      },
      onAnimationStart: function (t, e) {
        for (var r = Math.max(t, e), s = Math.min(t, e), i = s; r >= i; i++) this._setRenderViewsToHardwareTextureAndroid(i, !0);
      },
      onAnimationEnd: function () {
        for (var t = this.props.navState.routeStack.length - 1, e = 0; t >= e; e++) this._setRenderViewsToHardwareTextureAndroid(e, !1);
      },
      _setRenderViewsToHardwareTextureAndroid: function (t, e) {
        var r = {
          renderToHardwareTextureAndroid: e
        };
        this._setPropsIfExists("icon_" + t, r), this._setPropsIfExists("separator_" + t, r), this._setPropsIfExists("title_" + t, r), this._setPropsIfExists("right_" + t, r);
      },
      componentWillMount: function () {
        this._reset();
      },
      render: function () {
        var t = this.props.navState,
          e = t && t.routeStack.map(this._getBreadcrumb),
          r = t.routeStack.map(this._getTitle),
          s = t.routeStack.map(this._getRightButton);
        return n.createElement(p, {
          key: this._key,
          style: [S.breadCrumbContainer, this.props.style]
        }, r, e, s);
      },
      immediatelyRefresh: function () {
        this._reset(), this.forceUpdate();
      },
      _reset: function () {
        this._key = c(), this._descriptors = {
          crumb: new h(),
          title: new h(),
          right: new h()
        };
      },
      _getBreadcrumb: function (t, e) {
        if (this._descriptors.crumb.has(t)) return this._descriptors.crumb.get(t);
        var r = this.props.routeMapper,
          s = x(e, b(this.props.navState)),
          i = n.createElement(p, {
            key: "crumb_" + e,
            ref: "crumb_" + e,
            style: s.Crumb
          }, n.createElement(p, {
            ref: "icon_" + e,
            style: s.Icon
          }, r.iconForRoute(t, this.props.navigator)), n.createElement(p, {
            ref: "separator_" + e,
            style: s.Separator
          }, r.separatorForRoute(t, this.props.navigator)));
        return this._descriptors.crumb = this._descriptors.crumb.set(t, i), i;
      },
      _getTitle: function (t, e) {
        if (this._descriptors.title.has(t)) return this._descriptors.title.get(t);
        var r = this.props.routeMapper.titleContentForRoute(this.props.navState.routeStack[e], this.props.navigator),
          s = x(e, b(this.props.navState)),
          i = n.createElement(p, {
            key: "title_" + e,
            ref: "title_" + e,
            style: s.Title
          }, r);
        return this._descriptors.title = this._descriptors.title.set(t, i), i;
      },
      _getRightButton: function (t, e) {
        if (this._descriptors.right.has(t)) return this._descriptors.right.get(t);
        var r = this.props.routeMapper.rightContentForRoute(this.props.navState.routeStack[e], this.props.navigator);
        if (!r) return this._descriptors.right = this._descriptors.right.set(t, null), null;
        var s = x(e, b(this.props.navState)),
          i = n.createElement(p, {
            key: "right_" + e,
            ref: "right_" + e,
            style: s.RightItem
          }, r);
        return this._descriptors.right = this._descriptors.right.set(t, i), i;
      },
      _setPropsIfExists: function (t, e) {
        var t = this.refs[t];
        t && t.setNativeProps(e);
      }
    }),
    S = a.create({
      breadCrumbContainer: {
        overflow: "hidden",
        position: "absolute",
        height: d.General.TotalNavHeight,
        top: 0,
        left: 0,
        right: 0
      }
    });
  r.exports = R;
});
