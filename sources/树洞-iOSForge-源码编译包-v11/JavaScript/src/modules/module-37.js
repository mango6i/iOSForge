// Recovered module 37; analysis path, not original filename.
// Original SHA-256 bd96739151a8f6d9f517bf0d4f85429d76d3abd15ccf5e0260d2bd48753a5432; original byte range [110332, 111859).
__d(37, function (e, t, r, i) {
  "use strict";

  var l = t(380),
    a = t(406),
    s = t(378),
    n = t(381),
    m = t(34),
    o = {
      GUID: 1,
      Type: a({
        setTimeout: null,
        setInterval: null,
        requestAnimationFrame: null,
        setImmediate: null
      }),
      callbacks: [],
      types: [],
      timerIDs: [],
      immediates: [],
      callTimer: function (e) {
        n(e <= o.GUID, "Tried to call timer with ID " + e + " but no such timer exists");
        var t = o.timerIDs.indexOf(e);
        if (-1 !== t) {
          var r = o.types[t],
            i = o.callbacks[t];
          r !== o.Type.setTimeout && r !== o.Type.setImmediate && r !== o.Type.requestAnimationFrame || o._clearIndex(t);
          try {
            if (r === o.Type.setTimeout || r === o.Type.setInterval || r === o.Type.setImmediate) i();else {
              if (r !== o.Type.requestAnimationFrame) return void console.error("Tried to call a callback with invalid type: " + r);
              var l = s();
              i(l);
            }
          } catch (a) {
            o.errors = o.errors || [], o.errors.push(a);
          }
        }
      },
      callTimers: function (e) {
        l(0 !== e.length, 'Probably shouldn\'t call "callTimers" with no timerIDs'), o.errors = null, e.forEach(o.callTimer);
        var r = o.errors;
        if (r) {
          var i = r.length;
          if (i > 1) for (var a = 1; i > a; a++) t(38).setTimeout(function (e) {
            throw e;
          }.bind(null, r[a]), 0);
          throw r[0];
        }
      },
      callImmediatesPass: function () {
        if (m.beginEvent("JSTimersExecution.callImmediatesPass()"), o.immediates.length > 0) {
          var e = o.immediates.slice();
          o.immediates = [];
          for (var t = 0; t < e.length; ++t) o.callTimer(e[t]);
        }
        return m.endEvent(), o.immediates.length > 0;
      },
      callImmediates: function () {
        for (o.errors = null; o.callImmediatesPass(););
        o.errors && o.errors.forEach(function (e) {
          return t(38).setTimeout(function () {
            throw e;
          }, 0);
        });
      },
      _clearIndex: function (e) {
        o.timerIDs[e] = null, o.callbacks[e] = null, o.types[e] = null;
      }
    };
  r.exports = o;
});
