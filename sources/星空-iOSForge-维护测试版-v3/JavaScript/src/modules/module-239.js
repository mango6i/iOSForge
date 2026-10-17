// Recovered module 239; analysis path, not original filename.
// Original SHA-256 315f7fc68583931ed86061b801934c485b5af8b3ee27d89b4ff9f1a10590bac8; original byte range [480981, 484801).
__d(239, function (e, t, s, i) {
  "use strict";

  var o = t(54),
    r = t(23),
    n = t(1),
    a = t(78),
    p = t(43),
    l = t(422),
    h = t(224),
    u = t(235),
    c = t(67),
    d = t(240),
    y = t(236),
    f = t(405),
    P = t(70),
    b = t(21),
    m = {
      activeOpacity: .8,
      underlayColor: "black"
    },
    S = {
      top: 20,
      left: 20,
      right: 20,
      bottom: 30
    },
    T = n.createClass({
      displayName: "TouchableHighlight",
      propTypes: babelHelpers["extends"]({}, u.propTypes, {
        activeOpacity: n.PropTypes.number,
        underlayColor: o,
        style: c.propTypes.style,
        onShowUnderlay: n.PropTypes.func,
        onHideUnderlay: n.PropTypes.func
      }),
      mixins: [r, l, h.Mixin],
      getDefaultProps: function () {
        return m;
      },
      _computeSyntheticState: function (e) {
        return {
          activeProps: {
            style: {
              opacity: e.activeOpacity
            }
          },
          activeUnderlayProps: {
            style: {
              backgroundColor: e.underlayColor
            }
          },
          underlayStyle: [_.style, e.style]
        };
      },
      getInitialState: function () {
        return P(this.touchableGetInitialState(), this._computeSyntheticState(this.props));
      },
      componentDidMount: function () {
        y(this.props), d(this.refs[R]);
      },
      componentDidUpdate: function () {
        d(this.refs[R]);
      },
      componentWillReceiveProps: function (e) {
        y(e), e.activeOpacity === this.props.activeOpacity && e.underlayColor === this.props.underlayColor && e.style === this.props.style || this.setState(this._computeSyntheticState(e));
      },
      viewConfig: {
        uiViewClassName: "RCTView",
        validAttributes: a.RCTView
      },
      touchableHandleActivePressIn: function (e) {
        this.clearTimeout(this._hideTimeout), this._hideTimeout = null, this._showUnderlay(), this.props.onPressIn && this.props.onPressIn(e);
      },
      touchableHandleActivePressOut: function (e) {
        this._hideTimeout || this._hideUnderlay(), this.props.onPressOut && this.props.onPressOut(e);
      },
      touchableHandlePress: function (e) {
        this.clearTimeout(this._hideTimeout), this._showUnderlay(), this._hideTimeout = this.setTimeout(this._hideUnderlay, this.props.delayPressOut || 100), this.props.onPress && this.props.onPress(e);
      },
      touchableHandleLongPress: function (e) {
        this.props.onLongPress && this.props.onLongPress(e);
      },
      touchableGetPressRectOffset: function () {
        return this.props.pressRetentionOffset || S;
      },
      touchableGetHitSlop: function () {
        return this.props.hitSlop;
      },
      touchableGetHighlightDelayMS: function () {
        return this.props.delayPressIn;
      },
      touchableGetLongPressDelayMS: function () {
        return this.props.delayLongPress;
      },
      touchableGetPressOutDelayMS: function () {
        return this.props.delayPressOut;
      },
      _showUnderlay: function () {
        this.isMounted() && this._hasPressHandler() && (this.refs[v].setNativeProps(this.state.activeUnderlayProps), this.refs[R].setNativeProps(this.state.activeProps), this.props.onShowUnderlay && this.props.onShowUnderlay());
      },
      _hideUnderlay: function () {
        this.clearTimeout(this._hideTimeout), this._hideTimeout = null, this._hasPressHandler() && this.refs[v] && (this.refs[R].setNativeProps(H), this.refs[v].setNativeProps(babelHelpers["extends"]({}, _, {
          style: this.state.underlayStyle
        })), this.props.onHideUnderlay && this.props.onHideUnderlay());
      },
      _hasPressHandler: function () {
        return !!(this.props.onPress || this.props.onPressIn || this.props.onPressOut || this.props.onLongPress);
      },
      render: function () {
        return n.createElement(c, {
          accessible: !0,
          accessibilityLabel: this.props.accessibilityLabel,
          accessibilityComponentType: this.props.accessibilityComponentType,
          accessibilityTraits: this.props.accessibilityTraits,
          ref: v,
          style: this.state.underlayStyle,
          onLayout: this.props.onLayout,
          hitSlop: this.props.hitSlop,
          onStartShouldSetResponder: this.touchableHandleStartShouldSetResponder,
          onResponderTerminationRequest: this.touchableHandleResponderTerminationRequest,
          onResponderGrant: this.touchableHandleResponderGrant,
          onResponderMove: this.touchableHandleResponderMove,
          onResponderRelease: this.touchableHandleResponderRelease,
          onResponderTerminate: this.touchableHandleResponderTerminate,
          testID: this.props.testID
        }, n.cloneElement(b(this.props.children), {
          ref: R
        }), h.renderDebugView({
          color: "green",
          hitSlop: this.props.hitSlop
        }));
      }
    }),
    R = f({
      childRef: null
    }),
    v = f({
      underlayRef: null
    }),
    H = {
      style: p.create({
        x: {
          opacity: 1
        }
      }).x
    },
    _ = {
      style: p.create({
        x: {
          backgroundColor: "transparent"
        }
      }).x
    };
  s.exports = T;
});
