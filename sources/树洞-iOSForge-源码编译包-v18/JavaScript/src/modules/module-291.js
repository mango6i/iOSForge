// Recovered module 291; analysis path, not original filename.
// Original SHA-256 746ca355133e9af858d5569e32506a483d352c9cc616ced0de4628d01a7b51b1; original byte range [568480, 569033).
__d(291, function (t, n, e, i) {
  "use strict";

  function o(t) {
    var n = t.position,
      e = t.scene,
      i = e.index;
    return {
      opacity: n.interpolate({
        inputRange: [i - 1, i, i + 1],
        outputRange: [0, 1, 0]
      })
    };
  }
  function r(t) {
    var n = t.position,
      e = t.scene,
      i = e.index;
    return {
      opacity: n.interpolate({
        inputRange: [i - 1, i, i + 1],
        outputRange: [0, 1, 0]
      }),
      transform: [{
        translateX: n.interpolate({
          inputRange: [i - 1, i + 1],
          outputRange: [200, -200]
        })
      }]
    };
  }
  function a(t) {
    var n = t.position,
      e = t.scene,
      i = e.index;
    return {
      opacity: n.interpolate({
        inputRange: [i - 1, i, i + 1],
        outputRange: [0, 1, 0]
      })
    };
  }
  e.exports = {
    forCenter: r,
    forLeft: o,
    forRight: a
  };
});
