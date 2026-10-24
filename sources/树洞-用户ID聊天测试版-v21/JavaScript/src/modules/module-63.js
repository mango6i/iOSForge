// Recovered module 63; analysis path, not original filename.
// Original SHA-256 864c239229810ccd3a43fa2a880ad652c62eb287f882b933b31d7c8506289710; original byte range [133233, 134295).
__d(63, function (e, r, t, s) {
  "use strict";

  var a = r(19),
    n = r(64),
    o = (a.arrayOf(a.number), function (e, r, t) {
      return e[r] ? new Error("The transformMatrix style property is deprecated. Use `transform: [{ matrix: ... }]` instead.") : void 0;
    }),
    p = function (e, r, t) {
      return e[r] ? new Error("The decomposedMatrix style property is deprecated. Use `transform: [...]` instead.") : void 0;
    },
    i = {
      transform: a.arrayOf(a.oneOfType([a.shape({
        perspective: a.number
      }), a.shape({
        rotate: a.string
      }), a.shape({
        rotateX: a.string
      }), a.shape({
        rotateY: a.string
      }), a.shape({
        rotateZ: a.string
      }), a.shape({
        scale: a.number
      }), a.shape({
        scaleX: a.number
      }), a.shape({
        scaleY: a.number
      }), a.shape({
        translateX: a.number
      }), a.shape({
        translateY: a.number
      }), a.shape({
        skewX: a.string
      }), a.shape({
        skewY: a.string
      })])),
      transformMatrix: o,
      decomposedMatrix: p,
      scaleX: n(a.number, "Use the transform prop instead."),
      scaleY: n(a.number, "Use the transform prop instead."),
      rotation: n(a.number, "Use the transform prop instead."),
      translateX: n(a.number, "Use the transform prop instead."),
      translateY: n(a.number, "Use the transform prop instead.")
    };
  t.exports = i;
});
