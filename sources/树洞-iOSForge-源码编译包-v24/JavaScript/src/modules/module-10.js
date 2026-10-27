// Recovered module 10; analysis path, not original filename.
// Original SHA-256 b3bf73837243b3e1ba88ceea0b6d43950439ac0708b05006971b724c982de205; original byte range [74671, 75197).
__d(10, function (t, e, o, i) {
  "use strict";

  function p(t, e, o) {
    this.props = t, this.context = e, this.refs = u, this.updater = o || s;
  }
  var s = e(11),
    u = (e(12), e(6), e(404)),
    n = e(380);
  e(381);
  p.prototype.isReactComponent = {}, p.prototype.setState = function (t, e) {
    "object" != typeof t && "function" != typeof t && null != t ? n(!1) : void 0, this.updater.enqueueSetState(this, t), e && this.updater.enqueueCallback(this, e, "setState");
  }, p.prototype.forceUpdate = function (t) {
    this.updater.enqueueForceUpdate(this), t && this.updater.enqueueCallback(this, t, "forceUpdate");
  }, o.exports = p;
});
