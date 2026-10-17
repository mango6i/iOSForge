// Recovered module 249; analysis path, not original filename.
// Original SHA-256 5e18320561ce26d32d8832c82e2e0dc16955fece97327414a5c151c0ea14f625; original byte range [519217, 520742).
__d(249, function (e, t, n, o) {
  "use strict";

  function i(e) {
    for (var t in e) if (!A.hasOwnProperty(t)) throw new Error("Property '" + t + "' is not supported by native animated module");
  }
  function a(e) {
    var t = A.style || {};
    for (var n in e) if (!t.hasOwnProperty(n)) throw new Error("Style property '" + n + "' is not supported by native animated module");
  }
  function r(e) {
    var t = {
      inputRange: !0,
      outputRange: !0
    };
    for (var n in e) if (!t.hasOwnProperty(n)) throw new Error("Interpolation property '" + n + "' is not supported by native animated module");
  }
  function d() {
    return p++;
  }
  function c() {
    return l++;
  }
  function s() {
    m(u, "Native animated module is not available");
  }
  var u = t(31).NativeAnimatedModule,
    m = t(380),
    p = 1,
    l = 1,
    f = {
      createAnimatedNode: function (e, t) {
        s(), u.createAnimatedNode(e, t);
      },
      connectAnimatedNodes: function (e, t) {
        s(), u.connectAnimatedNodes(e, t);
      },
      disconnectAnimatedNodes: function (e, t) {
        s(), u.disconnectAnimatedNodes(e, t);
      },
      startAnimatingNode: function (e, t, n, o) {
        s(), u.startAnimatingNode(e, t, n, o);
      },
      stopAnimation: function (e) {
        s(), u.stopAnimation(e);
      },
      setAnimatedNodeValue: function (e, t) {
        s(), u.setAnimatedNodeValue(e, t);
      },
      connectAnimatedNodeToView: function (e, t) {
        s(), u.connectAnimatedNodeToView(e, t);
      },
      disconnectAnimatedNodeFromView: function (e, t) {
        s(), u.disconnectAnimatedNodeFromView(e, t);
      },
      dropAnimatedNode: function (e) {
        s(), u.dropAnimatedNode(e);
      }
    },
    A = {
      style: {
        opacity: !0,
        scaleX: !0,
        scaleY: !0,
        rotation: !0,
        translateX: !0,
        translateY: !0
      }
    };
  n.exports = {
    API: f,
    validateProps: i,
    validateStyles: a,
    validateInterpolation: r,
    generateNewNodeTag: d,
    generateNewAnimationId: c,
    assertNativeAnimatedModule: s
  };
});
