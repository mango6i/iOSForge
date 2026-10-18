// Recovered module 65; analysis path, not original filename.
// Original SHA-256 418648a3df7ac9802e293aa6bf56949093162e43f622880e4ce304930c1c5cd2; original byte range [134506, 135301).
__d(65, function (e, t, o, n) {
  "use strict";

  var r = t(19),
    i = t(54),
    l = t(66),
    a = babelHelpers["extends"](Object.create(l), {
      color: i,
      fontFamily: r.string,
      fontSize: r.number,
      fontStyle: r.oneOf(["normal", "italic"]),
      fontWeight: r.oneOf(["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]),
      textShadowOffset: r.shape({
        width: r.number,
        height: r.number
      }),
      textShadowRadius: r.number,
      textShadowColor: i,
      letterSpacing: r.number,
      lineHeight: r.number,
      textAlign: r.oneOf(["auto", "left", "right", "center", "justify"]),
      textAlignVertical: r.oneOf(["auto", "top", "bottom", "center"]),
      textDecorationLine: r.oneOf(["none", "underline", "line-through", "underline line-through"]),
      textDecorationStyle: r.oneOf(["solid", "double", "dotted", "dashed"]),
      textDecorationColor: i,
      writingDirection: r.oneOf(["auto", "ltr", "rtl"])
    });
  o.exports = a;
});
