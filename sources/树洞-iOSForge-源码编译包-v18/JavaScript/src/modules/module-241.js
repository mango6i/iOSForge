// Recovered module 241; analysis path, not original filename.
// Original SHA-256 1ae3bfa1f621663f22cfebde5fd535873e19fa9e3457b21ec80ec3149604c009; original byte range [485014, 485536).
__d(241, function (e, t, r, n) {
  "use strict";

  var o = t(1),
    a = t(43),
    i = t(223),
    c = t(67),
    s = o.createClass({
      displayName: "DummyTouchableNativeFeedback",
      render: function () {
        return o.createElement(c, {
          style: [l.container, this.props.style]
        }, o.createElement(i, {
          style: l.info
        }, "TouchableNativeFeedback is not supported on this platform!"));
      }
    }),
    l = a.create({
      container: {
        height: 100,
        width: 300,
        backgroundColor: "#ffbcbc",
        borderWidth: 1,
        borderColor: "red",
        alignItems: "center",
        justifyContent: "center",
        margin: 10
      },
      info: {
        color: "#333333",
        margin: 20
      }
    });
  r.exports = s;
});
