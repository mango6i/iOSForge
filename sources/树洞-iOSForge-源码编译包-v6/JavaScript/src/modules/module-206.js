// Recovered module 206; analysis path, not original filename.
// Original SHA-256 be608c450bf18ce34d25db9bff79445b131c2bb12104c427916678ac4095add2; original byte range [439487, 440339).
__d(206, function (e, r, p, s) {
  "use strict";

  var o = r(54),
    t = r(207),
    n = (r(208), r(29), r(1)),
    l = (r(43), r(79)),
    a = r(65),
    i = (r(81), r(67)),
    d = r(66),
    y = l(a),
    c = l(babelHelpers["extends"]({}, d, {
      color: o
    })),
    u = "dialog",
    P = "dropdown",
    T = n.createClass({
      displayName: "Picker",
      statics: {
        MODE_DIALOG: u,
        MODE_DROPDOWN: P
      },
      getDefaultProps: function () {
        return {
          mode: u
        };
      },
      propTypes: babelHelpers["extends"]({}, i.propTypes, {
        style: c,
        selectedValue: n.PropTypes.any,
        onValueChange: n.PropTypes.func,
        enabled: n.PropTypes.bool,
        mode: n.PropTypes.oneOf(["dialog", "dropdown"]),
        itemStyle: y,
        prompt: n.PropTypes.string,
        testID: n.PropTypes.string
      }),
      render: function () {
        return n.createElement(t, this.props, this.props.children);
      }
    });
  T.Item = n.createClass({
    displayName: "Item",
    propTypes: {
      label: n.PropTypes.string.isRequired,
      value: n.PropTypes.any,
      color: o,
      testID: n.PropTypes.string
    },
    render: function () {
      throw null;
    }
  }), p.exports = T;
});
