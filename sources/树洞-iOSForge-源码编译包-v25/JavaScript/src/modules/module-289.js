// Recovered module 289; analysis path, not original filename.
// Original SHA-256 9517d4497e07fdbe23dda95024e895a002a930bb5a9a37e2ddb11d21cf94cbfd; original byte range [566206, 566802).
__d(289, function (e, t, r, l) {
  "use strict";

  var i = t(311),
    n = t(312),
    s = (n.Platform, n.StyleSheet),
    o = n.View,
    p = n.Text,
    y = function (e) {
      var t = e.children,
        r = e.style,
        l = e.textStyle,
        n = e.viewProps;
      return i.createElement(o, babelHelpers["extends"]({
        style: [c.title, r]
      }, n), i.createElement(p, {
        style: [c.titleText, l]
      }, t));
    },
    c = s.create({
      title: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16
      },
      titleText: {
        flex: 1,
        fontSize: 18,
        fontWeight: "500",
        color: "rgba(0, 0, 0, .9)",
        textAlign: "center"
      }
    });
  y.propTypes = {
    children: i.PropTypes.string.isRequired,
    style: o.propTypes.style,
    textStyle: p.propTypes.style
  }, r.exports = y;
});
