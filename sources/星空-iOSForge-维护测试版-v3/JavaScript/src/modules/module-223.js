// Recovered module 223; analysis path, not original filename.
// Original SHA-256 d447b8ddedf409a853abdf985772413beb028d80fa2c1f75180d5bbc3242bc20; original byte range [451890, 455114).
__d(223, function (e, s, n, t) {
  "use strict";

  var o = s(23),
    r = (s(29), s(1)),
    i = s(78),
    p = s(79),
    a = s(65),
    l = s(224),
    h = s(82),
    u = s(70),
    d = p(a),
    c = {
      validAttributes: u(i.UIView, {
        isHighlighted: !0,
        numberOfLines: !0,
        allowFontScaling: !1,
        imageFontSize: !0
      }),
      uiViewClassName: "RCTText"
    },
    P = r.createClass({
      displayName: "Text",
      propTypes: {
        numberOfLines: r.PropTypes.number,
        onLayout: r.PropTypes.func,
        onPress: r.PropTypes.func,
        onLongPress: r.PropTypes.func,
        suppressHighlighting: r.PropTypes.bool,
        style: d,
        testID: r.PropTypes.string,
        allowFontScaling: r.PropTypes.bool
      },
      getDefaultProps: function () {
        return {
          accessible: !0,
          allowFontScaling: !0
        };
      },
      getInitialState: function () {
        return u(l.Mixin.touchableGetInitialState(), {
          isHighlighted: !1
        });
      },
      mixins: [o],
      viewConfig: c,
      getChildContext: function () {
        return {
          isInAParentText: !0
        };
      },
      childContextTypes: {
        isInAParentText: r.PropTypes.bool
      },
      contextTypes: {
        isInAParentText: r.PropTypes.bool
      },
      _handlers: null,
      _hasPressHandler: function () {
        return !!this.props.onPress || !!this.props.onLongPress;
      },
      touchableHandleActivePressIn: null,
      touchableHandleActivePressOut: null,
      touchableHandlePress: null,
      touchableHandleLongPress: null,
      touchableGetPressRectOffset: null,
      render: function () {
        var e = this,
          s = this.props;
        return (this.props.onStartShouldSetResponder || this._hasPressHandler()) && (this._handlers || (this._handlers = {
          onStartShouldSetResponder: function () {
            var s = e.props.onStartShouldSetResponder && e.props.onStartShouldSetResponder(),
              n = s || e._hasPressHandler();
            if (n && !e.touchableHandleActivePressIn) {
              for (var t in l.Mixin) "function" == typeof l.Mixin[t] && (e[t] = l.Mixin[t].bind(e));
              e.touchableHandleActivePressIn = function () {
                !e.props.suppressHighlighting && e._hasPressHandler() && e.setState({
                  isHighlighted: !0
                });
              }, e.touchableHandleActivePressOut = function () {
                !e.props.suppressHighlighting && e._hasPressHandler() && e.setState({
                  isHighlighted: !1
                });
              }, e.touchableHandlePress = function () {
                e.props.onPress && e.props.onPress();
              }, e.touchableHandleLongPress = function () {
                e.props.onLongPress && e.props.onLongPress();
              }, e.touchableGetPressRectOffset = function () {
                return g;
              };
            }
            return n;
          },
          onResponderGrant: function (e, s) {
            this.touchableHandleResponderGrant(e, s), this.props.onResponderGrant && this.props.onResponderGrant.apply(this, arguments);
          }.bind(this),
          onResponderMove: function (e) {
            this.touchableHandleResponderMove(e), this.props.onResponderMove && this.props.onResponderMove.apply(this, arguments);
          }.bind(this),
          onResponderRelease: function (e) {
            this.touchableHandleResponderRelease(e), this.props.onResponderRelease && this.props.onResponderRelease.apply(this, arguments);
          }.bind(this),
          onResponderTerminate: function (e) {
            this.touchableHandleResponderTerminate(e), this.props.onResponderTerminate && this.props.onResponderTerminate.apply(this, arguments);
          }.bind(this),
          onResponderTerminationRequest: function () {
            var e = this.touchableHandleResponderTerminationRequest();
            return e && this.props.onResponderTerminationRequest && (e = this.props.onResponderTerminationRequest.apply(this, arguments)), e;
          }.bind(this)
        }), s = babelHelpers["extends"]({}, this.props, this._handlers, {
          isHighlighted: this.state.isHighlighted
        })), l.TOUCH_TARGET_DEBUG && s.onPress && (s = babelHelpers["extends"]({}, s, {
          style: [this.props.style, {
            color: "magenta"
          }]
        })), this.context.isInAParentText ? r.createElement(R, s) : r.createElement(b, s);
      }
    }),
    g = {
      top: 20,
      left: 20,
      right: 20,
      bottom: 30
    },
    b = h(c),
    R = b;
  n.exports = P;
});
