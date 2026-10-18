// Recovered module 221; analysis path, not original filename.
// Original SHA-256 e967c94d576e0742eb21eb45b000ff1aae7f69ccd92b59591a402efa6f0a97a6; original byte range [449948, 450580).
__d(221, function (t, e, r, s) {
  "use strict";

  var o = e(54),
    p = e(1),
    l = e(43),
    n = e(222),
    a = e(67),
    i = e(80),
    c = p.createClass({
      displayName: "TabBarIOS",
      statics: {
        Item: n
      },
      propTypes: babelHelpers["extends"]({}, a.propTypes, {
        style: a.propTypes.style,
        unselectedTintColor: o,
        tintColor: o,
        barTintColor: o,
        translucent: p.PropTypes.bool
      }),
      render: function () {
        return p.createElement(u, {
          style: [T.tabGroup, this.props.style],
          unselectedTintColor: this.props.unselectedTintColor,
          tintColor: this.props.tintColor,
          barTintColor: this.props.barTintColor,
          translucent: this.props.translucent !== !1
        }, this.props.children);
      }
    }),
    T = l.create({
      tabGroup: {
        flex: 1
      }
    }),
    u = i("RCTTabBar", c);
  r.exports = c;
});
