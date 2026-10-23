// Recovered module 414; analysis path, not original filename.
// Original SHA-256 4010fcbecbab6906910d035134521e9791b13128c53190967285f6bba55e052e; original byte range [239768, 239986).
__d(414, function (t, n, o, e) {
  "use strict";

  var i = n(415);
  o.exports = i, i.prototype.done = function (t, n) {
    var o = arguments.length ? this.then.apply(this, arguments) : this;
    o.then(null, function (t) {
      setTimeout(function () {
        throw t;
      }, 0);
    });
  };
});
