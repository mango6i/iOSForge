// Recovered module 160; analysis path, not original filename.
// Original SHA-256 4a8b614427b96544ee78b0b7fa8b353d882afe110fe60e5cdb95e82f4e446f5b; original byte range [273554, 274712).
__d(160, function (t, a, e, s) {
  "use strict";

  function n(t, a, e) {
    var s = a.dispatchConfig.phasedRegistrationNames[e];
    return L(t, s);
  }
  function i(t, a, e) {
    var s = a ? I.bubbled : I.captured,
      i = n(t, e, s);
    i && (e._dispatchListeners = v(e._dispatchListeners, i), e._dispatchInstances = v(e._dispatchInstances, t));
  }
  function c(t) {
    t && t.dispatchConfig.phasedRegistrationNames && m.traverseTwoPhase(t._targetInst, i, t);
  }
  function r(t) {
    if (t && t.dispatchConfig.phasedRegistrationNames) {
      var a = t._targetInst,
        e = a ? m.getParentInstance(a) : null;
      m.traverseTwoPhase(e, i, t);
    }
  }
  function o(t, a, e) {
    if (e && e.dispatchConfig.registrationName) {
      var s = e.dispatchConfig.registrationName,
        n = L(t, s);
      n && (e._dispatchListeners = v(e._dispatchListeners, n), e._dispatchInstances = v(e._dispatchInstances, t));
    }
  }
  function h(t) {
    t && t.dispatchConfig.registrationName && o(t._targetInst, null, t);
  }
  function p(t) {
    l(t, c);
  }
  function u(t) {
    l(t, r);
  }
  function d(t, a, e, s) {
    m.traverseEnterLeave(e, s, o, t, a);
  }
  function f(t) {
    l(t, h);
  }
  var g = a(86),
    _ = a(87),
    m = a(89),
    v = a(91),
    l = a(92),
    I = (a(381), g.PropagationPhases),
    L = _.getListener,
    P = {
      accumulateTwoPhaseDispatches: p,
      accumulateTwoPhaseDispatchesSkipTarget: u,
      accumulateDirectDispatches: f,
      accumulateEnterLeaveDispatches: d
    };
  e.exports = P;
});
