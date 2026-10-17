// Recovered module 280; analysis path, not original filename.
// Original SHA-256 149081393b3f4e59a784bb0c011bbf546fd38da671fca5034925920e89ea96b1; original byte range [555981, 556927).
__d(280, function (t, n, e, a) {
  "use strict";

  function i(t) {
    var n = t.navigationState,
      e = t.scene,
      a = n.index === e.index,
      i = a ? 1 : 0,
      r = a ? 0 : 1e6;
    return {
      opacity: i,
      transform: [{
        translateX: r
      }, {
        translateY: r
      }]
    };
  }
  function r(t) {
    var n = t.layout,
      e = t.position,
      a = t.scene;
    if (!n.isMeasured) return i(t);
    var r = a.index,
      o = [r - 1, r, r + 1],
      u = n.initWidth,
      p = e.interpolate({
        inputRange: o,
        outputRange: [1, 1, .3]
      }),
      s = e.interpolate({
        inputRange: o,
        outputRange: [1, 1, .95]
      }),
      l = 0,
      c = e.interpolate({
        inputRange: o,
        outputRange: [u, 0, -10]
      });
    return {
      opacity: p,
      transform: [{
        scale: s
      }, {
        translateX: c
      }, {
        translateY: l
      }]
    };
  }
  function o(t) {
    var n = t.layout,
      e = t.position,
      a = t.scene;
    if (!n.isMeasured) return i(t);
    var r = a.index,
      o = [r - 1, r, r + 1],
      u = n.initHeight,
      p = e.interpolate({
        inputRange: o,
        outputRange: [1, 1, .3]
      }),
      s = e.interpolate({
        inputRange: o,
        outputRange: [1, 1, .95]
      }),
      l = 0,
      c = e.interpolate({
        inputRange: o,
        outputRange: [u, 0, -10]
      });
    return {
      opacity: p,
      transform: [{
        scale: s
      }, {
        translateX: l
      }, {
        translateY: c
      }]
    };
  }
  e.exports = {
    forHorizontal: r,
    forVertical: o
  };
});
