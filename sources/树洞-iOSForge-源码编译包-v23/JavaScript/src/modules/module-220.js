// Recovered module 220; analysis path, not original filename.
// Original SHA-256 bef66160975b288a6931418732dc6ac8327f2792c137a8c766b4eef3dfda6f30; original byte range [449070, 449947).
__d(220, function (e, t, n, s) {
  "use strict";

  var o = t(54),
    a = t(23),
    i = t(19),
    r = t(1),
    p = t(43),
    h = t(67),
    l = t(80),
    u = "switch",
    c = r.createClass({
      displayName: "SwitchIOS",
      mixins: [a],
      propTypes: babelHelpers["extends"]({}, h.propTypes, {
        value: i.bool,
        disabled: i.bool,
        onValueChange: i.func,
        onTintColor: o,
        thumbTintColor: o,
        tintColor: o
      }),
      getDefaultProps: function () {
        return {
          value: !1,
          disabled: !1
        };
      },
      _onChange: function (e) {
        this.refs[u].setNativeProps({
          value: this.props.value
        }), this.props.value === e.nativeEvent.value || this.props.disabled || (this.props.onChange && this.props.onChange(e), this.props.onValueChange && this.props.onValueChange(e.nativeEvent.value));
      },
      render: function () {
        return r.createElement(C, babelHelpers["extends"]({}, this.props, {
          ref: u,
          onChange: this._onChange,
          style: [v.rkSwitch, this.props.style]
        }));
      }
    }),
    v = p.create({
      rkSwitch: {
        height: 31,
        width: 51
      }
    }),
    C = l("RCTSwitch", c, {
      nativeOnly: {
        onChange: !0
      }
    });
  n.exports = c;
});
