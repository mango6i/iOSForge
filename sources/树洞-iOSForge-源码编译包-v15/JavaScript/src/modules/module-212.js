// Recovered module 212; analysis path, not original filename.
// Original SHA-256 03ab7900c48f2c64e98c1d0394d60812db8dd2dc7f3ac19fdeb2f41b1170935c; original byte range [443340, 444639).
__d(212, function (e, n, r, t) {
  "use strict";

  var a = n(125),
    i = n(23),
    o = (n(29), n(19)),
    l = n(1),
    s = n(43),
    u = n(67),
    m = n(80),
    p = l.createClass({
      displayName: "Slider",
      mixins: [i],
      propTypes: babelHelpers["extends"]({}, u.propTypes, {
        style: u.propTypes.style,
        value: o.number,
        step: o.number,
        minimumValue: o.number,
        maximumValue: o.number,
        minimumTrackTintColor: o.string,
        maximumTrackTintColor: o.string,
        disabled: o.bool,
        trackImage: a.propTypes.source,
        minimumTrackImage: a.propTypes.source,
        maximumTrackImage: a.propTypes.source,
        thumbImage: a.propTypes.source,
        onValueChange: o.func,
        onSlidingComplete: o.func,
        testID: o.string
      }),
      getDefaultProps: function () {
        return {
          disabled: !1,
          value: 0,
          minimumValue: 0,
          maximumValue: 1,
          step: 0
        };
      },
      render: function () {
        var e = this.props,
          n = e.style,
          r = e.onValueChange,
          t = e.onSlidingComplete,
          a = babelHelpers.objectWithoutProperties(e, ["style", "onValueChange", "onSlidingComplete"]);
        return a.style = [d.slider, n], a.onValueChange = r && function (e) {
          var n = !0;
          r && n && r(e.nativeEvent.value);
        }, a.onChange = a.onValueChange, a.onSlidingComplete = t && function (e) {
          t && t(e.nativeEvent.value);
        }, l.createElement(g, babelHelpers["extends"]({}, a, {
          enabled: !this.props.disabled,
          onStartShouldSetResponder: function () {
            return !0;
          },
          onResponderTerminationRequest: function () {
            return !1;
          }
        }));
      }
    }),
    d = void 0;
  d = s.create({
    slider: {
      height: 40
    }
  });
  var c = {},
    g = m("RCTSlider", p, c);
  r.exports = p;
});
