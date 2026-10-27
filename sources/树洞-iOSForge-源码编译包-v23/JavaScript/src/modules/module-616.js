// Recovered module 616; analysis path, not original filename.
// Original SHA-256 d25c65d2061bca69037a701834f5d361da1f394699b19f7beba694dc627d288b; original byte range [2020598, 2022845).
__d(616, function (e, t, s, r) {
  "use strict";

  function o(e) {
    return e && e.__esModule ? e : {
      default: e
    };
  }
  Object.defineProperty(r, "__esModule", {
    value: !0
  });
  var i = Object.assign || function (e) {
      for (var t = 1; t < arguments.length; t++) {
        var s = arguments[t];
        for (var r in s) Object.prototype.hasOwnProperty.call(s, r) && (e[r] = s[r]);
      }
      return e;
    },
    n = t(311),
    l = o(n),
    a = t(555),
    p = o(a),
    d = t(617),
    u = o(d),
    c = t(312),
    y = c.StyleSheet.create({
      button: {
        flexDirection: "row",
        alignSelf: "stretch",
        justifyContent: "center"
      },
      textButton: {
        fontSize: 14,
        alignSelf: "center"
      },
      opacity: {
        opacity: .8
      }
    }),
    h = (0, u["default"])({
      displayName: "NativeButton",
      propTypes: i({}, c.TouchableWithoutFeedback.propTypes, {
        textStyle: p["default"].any,
        disabledStyle: p["default"].any,
        children: p["default"].node.isRequired,
        underlayColor: p["default"].string,
        background: p["default"].any
      }),
      statics: {
        isAndroid: "android" === c.Platform.OS
      },
      getDefaultProps: function () {
        return {
          textStyle: null,
          disabledStyle: null,
          underlayColor: null
        };
      },
      _renderText: function () {
        return "string" != typeof this.props.children ? this.props.children : l["default"].createElement(c.Text, {
          numberOfLines: 1,
          ellipsizeMode: "ios" === c.Platform.OS ? "clip" : "tail",
          style: [y.textButton, this.props.textStyle]
        }, this.props.children);
      },
      render: function () {
        var e = this.props.disabled ? this.props.disabledStyle || y.opacity : {},
          t = {
            accessibilityComponentType: this.props.accessibilityComponentType,
            accessibilityTraits: this.props.accessibilityTraits,
            accessible: this.props.accessible,
            delayLongPress: this.props.delayLongPress,
            delayPressIn: this.props.delayPressIn,
            delayPressOut: this.props.delayPressOut,
            disabled: this.props.disabled,
            hitSlop: this.props.hitSlop,
            onLayout: this.props.onLayout,
            onPress: this.props.onPress,
            onPressIn: this.props.onPressIn,
            onPressOut: this.props.onPressOut,
            onLongPress: this.props.onLongPress,
            pressRetentionOffset: this.props.pressRetentionOffset
          };
        return h.isAndroid ? (t = babelHelpers["extends"](t, {
          background: this.props.background || c.TouchableNativeFeedback.SelectableBackground()
        }), l["default"].createElement(c.TouchableNativeFeedback, t, l["default"].createElement(c.View, {
          style: [y.button, this.props.style, e]
        }, this._renderText()))) : l["default"].createElement(c.TouchableHighlight, i({}, t, {
          style: [y.button, this.props.style, e],
          underlayColor: this.props.underlayColor
        }), this._renderText());
      }
    });
  r["default"] = h;
});
