// Recovered module 213; analysis path, not original filename.
// Original SHA-256 9d24b4072fc9e746127bced02844a7ecc4e164ecdde8f6226b6e06ff8348a055; original byte range [444640, 445937).
__d(213, function (e, n, r, t) {
  "use strict";

  var o = n(125),
    i = n(23),
    a = n(19),
    s = n(1),
    l = n(43),
    u = n(67),
    p = n(80),
    m = s.createClass({
      displayName: "SliderIOS",
      mixins: [i],
      propTypes: babelHelpers["extends"]({}, u.propTypes, {
        style: u.propTypes.style,
        value: a.number,
        step: a.number,
        minimumValue: a.number,
        maximumValue: a.number,
        minimumTrackTintColor: a.string,
        maximumTrackTintColor: a.string,
        disabled: a.bool,
        trackImage: o.propTypes.source,
        minimumTrackImage: o.propTypes.source,
        maximumTrackImage: o.propTypes.source,
        thumbImage: o.propTypes.source,
        onValueChange: a.func,
        onSlidingComplete: a.func
      }),
      getDefaultProps: function () {
        return {
          disabled: !1
        };
      },
      render: function () {
        console.warn("SliderIOS is deprecated and will be removed in future versions of React Native. Use the cross-platform Slider as a drop-in replacement.");
        var e = this.props,
          n = e.style,
          r = e.onValueChange,
          t = e.onSlidingComplete,
          o = babelHelpers.objectWithoutProperties(e, ["style", "onValueChange", "onSlidingComplete"]);
        return o.style = [c.slider, n], o.onValueChange = r && function (e) {
          r && r(e.nativeEvent.value);
        }, o.onSlidingComplete = t && function (e) {
          t && t(e.nativeEvent.value);
        }, s.createElement(d, babelHelpers["extends"]({}, o, {
          onStartShouldSetResponder: function () {
            return !0;
          },
          onResponderTerminationRequest: function () {
            return !1;
          }
        }));
      }
    }),
    c = l.create({
      slider: {
        height: 40
      }
    }),
    d = p("RCTSlider", m);
  r.exports = m;
});
