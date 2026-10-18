// Recovered module 260; analysis path, not original filename.
// Original SHA-256 54d8b1cd6bc0d7ebf448aef42f2f8a615be5955a3d2a85a9dd8db30e0387b6f4; original byte range [534845, 535628).
__d(260, function (e, n, t, r) {
  "use strict";

  var a = n(150),
    i = n(31),
    o = n(46),
    s = i.AppState,
    c = n(149),
    g = n(380),
    p = {
      change: new a(),
      memoryWarning: new a()
    },
    d = {
      addEventListener: function (e, n) {
        g(-1 !== ["change", "memoryWarning"].indexOf(e), 'Trying to subscribe to unknown event: "%s"', e), "change" === e ? p[e].set(n, o.addListener("appStateDidChange", function (e) {
          n(e.app_state);
        })) : "memoryWarning" === e && p[e].set(n, o.addListener("memoryWarning", n));
      },
      removeEventListener: function (e, n) {
        g(-1 !== ["change", "memoryWarning"].indexOf(e), 'Trying to remove listener for unknown event: "%s"', e), p[e].has(n) && (p[e].get(n).remove(), p[e]["delete"](n));
      },
      currentState: "active"
    };
  o.addListener("appStateDidChange", function (e) {
    d.currentState = e.app_state;
  }), s.getCurrentAppState(function (e) {
    d.currentState = e.app_state;
  }, c), t.exports = d;
});
