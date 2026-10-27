// Recovered module 204; analysis path, not original filename.
// Original SHA-256 b86ba5faa2ed8966f6fb3af76f6e2fdd6b4c7beb15249839fa5a95733fdaafa6; original byte range [431509, 439019).
__d(204, function (t, e, o, i) {
  "use strict";

  function s() {
    return T++;
  }
  var a = e(47),
    n = e(125),
    r = e(190),
    u = e(31).NavigatorManager,
    c = e(1),
    p = e(131),
    l = e(205),
    d = e(43),
    h = e(67),
    g = e(380),
    f = e(149),
    v = e(80),
    k = (e(117), "transitionerRef"),
    S = c.PropTypes,
    T = 0,
    m = c.createClass({
      displayName: "NavigatorTransitionerIOS",
      requestSchedulingNavigation: function (t) {
        u.requestSchedulingJavaScriptNavigation(p.findNodeHandle(this), f, t);
      },
      render: function () {
        return c.createElement(y, this.props);
      }
    }),
    O = c.createClass({
      displayName: "NavigatorIOS",
      propTypes: {
        initialRoute: S.shape({
          component: S.func.isRequired,
          title: S.string.isRequired,
          passProps: S.object,
          backButtonIcon: n.propTypes.source,
          backButtonTitle: S.string,
          leftButtonIcon: n.propTypes.source,
          leftButtonTitle: S.string,
          onLeftButtonPress: S.func,
          rightButtonIcon: n.propTypes.source,
          rightButtonTitle: S.string,
          onRightButtonPress: S.func,
          wrapperStyle: h.propTypes.style,
          navigationBarHidden: S.bool,
          shadowHidden: S.bool,
          tintColor: S.string,
          barTintColor: S.string,
          titleTextColor: S.string,
          translucent: S.bool
        }).isRequired,
        navigationBarHidden: S.bool,
        shadowHidden: S.bool,
        itemWrapperStyle: h.propTypes.style,
        tintColor: S.string,
        barTintColor: S.string,
        titleTextColor: S.string,
        translucent: S.bool,
        interactivePopGestureEnabled: S.bool
      },
      navigator: void 0,
      navigationContext: new r(),
      componentWillMount: function () {
        this.navigator = {
          push: this.push,
          pop: this.pop,
          popN: this.popN,
          replace: this.replace,
          replacePrevious: this.replacePrevious,
          replacePreviousAndPop: this.replacePreviousAndPop,
          resetTo: this.resetTo,
          popToRoute: this.popToRoute,
          popToTop: this.popToTop,
          navigationContext: this.navigationContext
        }, this._emitWillFocus(this.state.routeStack[this.state.observedTopOfStack]);
      },
      componentDidMount: function () {
        this._emitDidFocus(this.state.routeStack[this.state.observedTopOfStack]);
      },
      componentWillUnmount: function () {
        this.navigationContext.dispose(), this.navigationContext = new r();
      },
      getDefaultProps: function () {
        return {
          translucent: !0
        };
      },
      getInitialState: function () {
        return {
          idStack: [s()],
          routeStack: [this.props.initialRoute],
          requestedTopOfStack: 0,
          observedTopOfStack: 0,
          progress: 1,
          fromIndex: 0,
          toIndex: 0,
          makingNavigatorRequest: !1,
          updatingAllIndicesAtOrBeyond: 0
        };
      },
      _toFocusOnNavigationComplete: void 0,
      _handleFocusRequest: function (t) {
        this.state.makingNavigatorRequest ? this._toFocusOnNavigationComplete = t : this._getFocusEmitter().emit("focus", t);
      },
      _focusEmitter: void 0,
      _getFocusEmitter: function () {
        var t = this._focusEmitter;
        return t || (t = new a(), this._focusEmitter = t), t;
      },
      getChildContext: function () {
        return {
          onFocusRequested: this._handleFocusRequest,
          focusEmitter: this._getFocusEmitter()
        };
      },
      childContextTypes: {
        onFocusRequested: c.PropTypes.func,
        focusEmitter: c.PropTypes.instanceOf(a)
      },
      _tryLockNavigator: function (t) {
        this.refs[k].requestSchedulingNavigation(function (e) {
          return e && t();
        });
      },
      _handleNavigatorStackChanged: function (t) {
        var e = t.nativeEvent.stackLength - 1;
        this._emitDidFocus(this.state.routeStack[e]), g(e <= this.state.requestedTopOfStack, "No navigator item should be pushed without JS knowing about it %s %s", e, this.state.requestedTopOfStack);
        var o = this.state.requestedTopOfStack !== this.state.observedTopOfStack;
        o && g(e === this.state.requestedTopOfStack, "If waiting for observedTopOfStack to reach requestedTopOfStack, the only valid observedTopOfStack should be requestedTopOfStack.");
        var i = {
          observedTopOfStack: e,
          makingNavigatorRequest: !1,
          updatingAllIndicesAtOrBeyond: null,
          progress: 1,
          toIndex: e,
          fromIndex: e
        };
        this.setState(i, this._eliminateUnneededChildren);
      },
      _eliminateUnneededChildren: function () {
        var t = this.state.routeStack.length > this.state.observedTopOfStack + 1 ? this.state.observedTopOfStack + 1 : null;
        this.setState({
          idStack: this.state.idStack.slice(0, this.state.observedTopOfStack + 1),
          routeStack: this.state.routeStack.slice(0, this.state.observedTopOfStack + 1),
          requestedTopOfStack: this.state.observedTopOfStack,
          makingNavigatorRequest: !0,
          updatingAllIndicesAtOrBeyond: t
        });
      },
      _emitDidFocus: function (t) {
        this.navigationContext.emit("didfocus", {
          route: t
        });
      },
      _emitWillFocus: function (t) {
        this.navigationContext.emit("willfocus", {
          route: t
        });
      },
      push: function (t) {
        var e = this;
        g(!!t, "Must supply route to push"), this.state.requestedTopOfStack === this.state.observedTopOfStack && this._tryLockNavigator(function () {
          e._emitWillFocus(t);
          var o = e.state.routeStack.concat([t]),
            i = e.state.idStack.concat([s()]);
          e.setState({
            idStack: i,
            routeStack: o,
            requestedTopOfStack: o.length - 1,
            makingNavigatorRequest: !0,
            updatingAllIndicesAtOrBeyond: o.length - 1
          });
        });
      },
      popN: function (t) {
        var e = this;
        0 !== t && this.state.requestedTopOfStack === this.state.observedTopOfStack && this.state.requestedTopOfStack > 0 && this._tryLockNavigator(function () {
          var o = e.state.requestedTopOfStack - t;
          g(o >= 0, "Cannot pop below 0"), e._emitWillFocus(e.state.routeStack[o]), e.setState({
            requestedTopOfStack: o,
            makingNavigatorRequest: !0,
            updatingAllIndicesAtOrBeyond: e.state.requestedTopOfStack - t
          });
        });
      },
      pop: function () {
        this.popN(1);
      },
      replaceAtIndex: function (t, e) {
        if (g(!!t, "Must supply route to replace"), 0 > e && (e += this.state.routeStack.length), !(this.state.routeStack.length <= e)) {
          var o = this.state.idStack.slice(),
            i = this.state.routeStack.slice();
          o[e] = s(), i[e] = t, this.setState({
            idStack: o,
            routeStack: i,
            makingNavigatorRequest: !1,
            updatingAllIndicesAtOrBeyond: e
          }), this._emitWillFocus(t), this._emitDidFocus(t);
        }
      },
      replace: function (t) {
        this.replaceAtIndex(t, -1);
      },
      replacePrevious: function (t) {
        this.replaceAtIndex(t, -2);
      },
      popToTop: function () {
        this.popToRoute(this.state.routeStack[0]);
      },
      popToRoute: function (t) {
        var e = this.state.routeStack.indexOf(t);
        g(-1 !== e, "Calling pop to route for a route that doesn't exist!");
        var o = this.state.routeStack.length - e - 1;
        this.popN(o);
      },
      replacePreviousAndPop: function (t) {
        var e = this;
        this.state.requestedTopOfStack === this.state.observedTopOfStack && (this.state.routeStack.length < 2 || this._tryLockNavigator(function () {
          e.replacePrevious(t), e.setState({
            requestedTopOfStack: e.state.requestedTopOfStack - 1,
            makingNavigatorRequest: !0
          });
        }));
      },
      resetTo: function (t) {
        g(!!t, "Must supply route to push"), this.state.requestedTopOfStack === this.state.observedTopOfStack && (this.replaceAtIndex(t, 0), this.popToRoute(t));
      },
      _handleNavigationComplete: function (t) {
        this._toFocusOnNavigationComplete && (this._getFocusEmitter().emit("focus", this._toFocusOnNavigationComplete), this._toFocusOnNavigationComplete = null), this._handleNavigatorStackChanged(t);
      },
      _routeToStackItem: function (t, e) {
        var o = t.component,
          i = t.wrapperStyle,
          s = t.passProps,
          a = babelHelpers.objectWithoutProperties(t, ["component", "wrapperStyle", "passProps"]),
          n = this.props,
          r = n.itemWrapperStyle,
          u = babelHelpers.objectWithoutProperties(n, ["itemWrapperStyle"]),
          p = null != this.state.updatingAllIndicesAtOrBeyond && this.state.updatingAllIndicesAtOrBeyond >= e,
          d = o;
        return c.createElement(l, {
          key: "nav" + e,
          shouldUpdate: p
        }, c.createElement(N, babelHelpers["extends"]({}, u, a, {
          style: [b.stackItem, r, i]
        }), c.createElement(d, babelHelpers["extends"]({
          navigator: this.navigator,
          route: a
        }, s))));
      },
      _renderNavigationStackItems: function () {
        var t = this.state.makingNavigatorRequest || null !== this.state.updatingAllIndicesAtOrBeyond,
          e = t ? this.state.routeStack.map(this._routeToStackItem) : null;
        return c.createElement(l, {
          shouldUpdate: t
        }, c.createElement(m, {
          ref: k,
          style: b.transitioner,
          vertical: this.props.vertical,
          requestedTopOfStack: this.state.requestedTopOfStack,
          onNavigationComplete: this._handleNavigationComplete,
          interactivePopGestureEnabled: this.props.interactivePopGestureEnabled
        }, e));
      },
      render: function () {
        return c.createElement(h, {
          style: this.props.style
        }, this._renderNavigationStackItems());
      }
    }),
    b = d.create({
      stackItem: {
        backgroundColor: "white",
        overflow: "hidden",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      },
      transitioner: {
        flex: 1
      }
    }),
    y = v("RCTNavigator"),
    N = v("RCTNavItem");
  o.exports = O;
});
