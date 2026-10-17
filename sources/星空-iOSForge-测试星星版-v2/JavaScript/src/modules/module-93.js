// Recovered module 93; analysis path, not original filename.
// Original SHA-256 5a18e49bfc51b253c87a7875dfae0d40ac5e261eead063a11bd789ef0a31f87e; original byte range [161217, 161412).
__d(93, function (e, n, t, u) {
  "use strict";

  function s(e) {
    c.enqueueEvents(e), c.processEventQueue(!1);
  }
  var c = n(87),
    o = {
      handleTopLevel: function (e, n, t, u) {
        var o = c.extractEvents(e, n, t, u);
        s(o);
      }
    };
  t.exports = o;
});
