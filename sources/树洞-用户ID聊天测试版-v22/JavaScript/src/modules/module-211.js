// Recovered module 211; analysis path, not original filename.
// Original SHA-256 290db81627353bf5377604beba459e470a1ee60de14c11f49f211b593e7871bb; original byte range [442532, 443339).
__d(211, function (e, n, t, o) {
  "use strict";

  var s = n(23),
    r = n(19),
    a = n(1),
    l = n(43),
    p = n(67),
    i = n(80),
    g = "segmentedcontrol",
    h = a.createClass({
      displayName: "SegmentedControlIOS",
      mixins: [s],
      propTypes: babelHelpers["extends"]({}, p.propTypes, {
        values: r.arrayOf(r.string),
        selectedIndex: r.number,
        onValueChange: r.func,
        onChange: r.func,
        enabled: r.bool,
        tintColor: r.string,
        momentary: r.bool
      }),
      getDefaultProps: function () {
        return {
          values: [],
          enabled: !0
        };
      },
      _onChange: function (e) {
        this.props.onChange && this.props.onChange(e), this.props.onValueChange && this.props.onValueChange(e.nativeEvent.value);
      },
      render: function () {
        return a.createElement(C, babelHelpers["extends"]({}, this.props, {
          ref: g,
          style: [u.segmentedControl, this.props.style],
          onChange: this._onChange
        }));
      }
    }),
    u = l.create({
      segmentedControl: {
        height: 28
      }
    }),
    C = i("RCTSegmentedControl", h);
  t.exports = h;
});
