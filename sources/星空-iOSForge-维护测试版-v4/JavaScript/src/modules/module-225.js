// Recovered module 225; analysis path, not original filename.
// Original SHA-256 5042ac41d1a29bdc7d8353e4aa812a2a78d0f2d906192b20c3620722a141c40b; original byte range [463635, 463937).
__d(225, function (t, o, e, i) {
  "use strict";

  function n(t, o) {
    this.width = t, this.height = o;
  }
  var h = o(3),
    r = h.twoArgumentPooler;
  n.prototype.destructor = function () {
    this.width = null, this.height = null;
  }, n.getPooledFromElement = function (t) {
    return n.getPooled(t.offsetWidth, t.offsetHeight);
  }, h.addPoolingTo(n, r), e.exports = n;
});
