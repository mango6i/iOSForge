// Recovered module 233; analysis path, not original filename.
// Original SHA-256 1fdd0df270b4141ae844d08745551f2b4f130f1bc76b2f206ffaa6fb49bf7c75; original byte range [476963, 477361).
__d(233, function (n, t, e, r) {
  "use strict";

  function i(n, t) {
    if (-1 === t.indexOf(n)) throw new TypeError(o(n, t));
  }
  function o(n, t) {
    var e = 'Unknown event type "' + n + '". ';
    return e += "Known event types: " + t.join(", ") + ".";
  }
  var c = t(234),
    u = {
      addValidation: function (n, t) {
        var e = Object.keys(t),
          r = Object.create(n);
        return c(r, {
          emit: function (t, r, o, c, u, a, f) {
            return i(t, e), n.emit.call(this, t, r, o, c, u, a, f);
          }
        }), r;
      }
    };
  e.exports = u;
});
