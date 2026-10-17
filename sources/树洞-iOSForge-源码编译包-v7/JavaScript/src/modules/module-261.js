// Recovered module 261; analysis path, not original filename.
// Original SHA-256 728564ceb09cfd62a0359e659b2d7553d4df53fbc405a7d9bfc1bf8beec69230; original byte range [535629, 536407).
__d(261, function (e, n, t, a) {
  "use strict";

  var r = n(31),
    i = n(46),
    o = r.AppState,
    s = n(149),
    p = n(380),
    c = {
      change: new Map(),
      memoryWarning: new Map()
    },
    g = {
      addEventListener: function (e, n) {
        p(-1 !== ["change", "memoryWarning"].indexOf(e), 'Trying to subscribe to unknown event: "%s"', e), "change" === e ? c[e].set(n, i.addListener("appStateDidChange", function (e) {
          n(e.app_state);
        })) : "memoryWarning" === e && c[e].set(n, i.addListener("memoryWarning", n));
      },
      removeEventListener: function (e, n) {
        p(-1 !== ["change", "memoryWarning"].indexOf(e), 'Trying to remove listener for unknown event: "%s"', e), c[e].has(n) && (c[e].get(n).remove(), c[e]["delete"](n));
      },
      currentState: "active"
    };
  i.addListener("appStateDidChange", function (e) {
    g.currentState = e.app_state;
  }), o.getCurrentAppState(function (e) {
    g.currentState = e.app_state;
  }, s), t.exports = g;
});
