// Recovered module 67; analysis path, not original filename.
// Original SHA-256 8d189a2ca8731d9d4e758bdc0ce1358c6997a444c91c619a191d6afbd6aa129a; original byte range [135985, 137741).
__d(67, function (e, n, o, t) {
  "use strict";

  var s = n(68),
    i = n(23),
    a = n(19),
    r = n(1),
    c = (n(73), n(78)),
    l = n(79),
    d = n(30),
    u = n(66),
    p = n(80),
    b = l(u),
    f = ["none", "button", "link", "header", "search", "image", "selected", "plays", "key", "text", "summary", "disabled", "frequentUpdates", "startsMedia", "adjustable", "allowsDirectInteraction", "pageTurn"],
    y = ["none", "button", "radiobutton_checked", "radiobutton_unchecked"],
    R = d.RCTView.Constants && d.RCTView.Constants.forceTouchAvailable || !1,
    T = {
      AccessibilityTraits: f,
      AccessibilityComponentType: y,
      forceTouchAvailable: R
    },
    C = r.createClass({
      displayName: "View",
      mixins: [i],
      viewConfig: {
        uiViewClassName: "RCTView",
        validAttributes: c.RCTView
      },
      statics: babelHelpers["extends"]({}, T),
      propTypes: {
        accessible: a.bool,
        accessibilityLabel: a.string,
        accessibilityComponentType: a.oneOf(y),
        accessibilityLiveRegion: a.oneOf(["none", "polite", "assertive"]),
        importantForAccessibility: a.oneOf(["auto", "yes", "no", "no-hide-descendants"]),
        accessibilityTraits: a.oneOfType([a.oneOf(f), a.arrayOf(a.oneOf(f))]),
        onAccessibilityTap: a.func,
        onMagicTap: a.func,
        testID: a.string,
        onResponderGrant: a.func,
        onResponderMove: a.func,
        onResponderReject: a.func,
        onResponderRelease: a.func,
        onResponderTerminate: a.func,
        onResponderTerminationRequest: a.func,
        onStartShouldSetResponder: a.func,
        onStartShouldSetResponderCapture: a.func,
        onMoveShouldSetResponder: a.func,
        onMoveShouldSetResponderCapture: a.func,
        hitSlop: s,
        onLayout: a.func,
        pointerEvents: a.oneOf(["box-none", "none", "box-only", "auto"]),
        style: b,
        removeClippedSubviews: a.bool,
        renderToHardwareTextureAndroid: a.bool,
        shouldRasterizeIOS: a.bool,
        collapsable: a.bool,
        needsOffscreenAlphaCompositing: a.bool
      },
      render: function () {
        return r.createElement(h, this.props);
      }
    }),
    h = p("RCTView", C, {
      nativeOnly: {
        nativeBackgroundAndroid: !0
      }
    }),
    v = h;
  babelHelpers["extends"](h, T), o.exports = v;
});
