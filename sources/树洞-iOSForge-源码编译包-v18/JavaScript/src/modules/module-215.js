// Recovered module 215; analysis path, not original filename.
// Original SHA-256 489e30c8816acbb993fbd00e7b598a3d4bb99f9baa4a0abab4e9a3de7879f7ac; original byte range [446587, 447641).
__d(215, function (e, t, n, o) {
  "use strict";

  var r = t(54),
    s = t(23),
    i = (t(29), t(1)),
    p = t(43),
    a = t(67),
    h = t(80),
    l = i.createClass({
      displayName: "Switch",
      propTypes: babelHelpers["extends"]({}, a.propTypes, {
        value: i.PropTypes.bool,
        disabled: i.PropTypes.bool,
        onValueChange: i.PropTypes.func,
        testID: i.PropTypes.string,
        tintColor: r,
        onTintColor: r,
        thumbTintColor: r
      }),
      getDefaultProps: function () {
        return {
          value: !1,
          disabled: !1
        };
      },
      mixins: [s],
      _rctSwitch: {},
      _onChange: function (e) {
        this._rctSwitch.setNativeProps({
          value: this.props.value
        }), this.props.onChange && this.props.onChange(e), this.props.onValueChange && this.props.onValueChange(e.nativeEvent.value);
      },
      render: function () {
        var e = this,
          t = babelHelpers["extends"]({}, this.props);
        return t.onStartShouldSetResponder = function () {
          return !0;
        }, t.onResponderTerminationRequest = function () {
          return !1;
        }, t.style = [u.rctSwitchIOS, this.props.style], i.createElement(c, babelHelpers["extends"]({}, t, {
          ref: function (t) {
            e._rctSwitch = t;
          },
          onChange: this._onChange
        }));
      }
    }),
    u = p.create({
      rctSwitchIOS: {
        height: 31,
        width: 51
      }
    }),
    c = h("RCTSwitch", l, {
      nativeOnly: {
        onChange: !0
      }
    });
  n.exports = l;
});
