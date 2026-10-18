// Recovered module 81; analysis path, not original filename.
// Original SHA-256 794c552e3c20d28596068b73e95b76b29686fb9d2b4d9869f6c52f1080e66f68; original byte range [150298, 150661).
__d(81, function (e, t, r, i) {
  "use strict";

  var n = t(1),
    s = t(43),
    l = n.createClass({
      displayName: "UnimplementedView",
      setNativeProps: function () {},
      render: function () {
        var e = t(67);
        return n.createElement(e, {
          style: [a.unimplementedView, this.props.style]
        }, this.props.children);
      }
    }),
    a = s.create({
      unimplementedView: {
        borderWidth: 1,
        borderColor: "red",
        alignSelf: "flex-start"
      }
    });
  r.exports = l;
});
