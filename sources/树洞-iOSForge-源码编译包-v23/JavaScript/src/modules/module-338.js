// Recovered module 338; analysis path, not original filename.
// Original SHA-256 aef39af90843d3f071a649b01d2ae5786a0d13c2da1d627606019b18256c3e25; original byte range [1475535, 1478066).
__d(338, function (t, o, r, e) {
  Object.defineProperty(e, "__esModule", {
    value: !0
  }), e.blog = e.slog = e.wlog = e.dlog = e.tlog = e.testlog = e.logFormat = e.terr = void 0;
  var n = o(314),
    a = (e.terr = function () {
      for (var t = arguments.length, o = Array(t), r = 0; t > r; r++) o[r] = arguments[r];
      a.apply(void 0, ["error"].concat(o));
    }, e.logFormat = function () {
      for (var t = "", o = arguments.length, r = Array(o), e = 0; o > e; e++) r[e] = arguments[e];
      return r.forEach(function (o) {
        t += "-", "object" == typeof o && (o = (0, n.inspect)(o, {
          depth: 1
        })), t += o + "-";
      }), t;
    }, e.testlog = function () {
      if (n.apps.showCmdBall) {
        for (var t = "---TESTER---", o = arguments.length, r = Array(o), e = 0; o > e; e++) r[e] = arguments[e];
        r.forEach(function (o) {
          t += "-", "object" == typeof o && (o = JSON.stringify(o)), t += o + "-";
        }), n.apps.showCmdBall && n.apps.send("testlog", {
          data: t,
          device: n.apps.deviceFrom + "-" + n.apps.deviceSys
        });
      }
    }, e.tlog = function () {
      try {
        for (var t, o = "*", r = arguments.length, e = Array(r), a = 0; r > a; a++) e[a] = arguments[a];
        if (e.forEach(function (r) {
          r && r.stack && (t = r), o += "-", "object" == typeof r && (r = (0, n.inspect)(r, {
            depth: 1
          })), o += r + "-";
        }), t && (t.message = o + t.message, console.error(t)), e.length > 0 && "string" == typeof e[0] && e[0].match(/^error$/i)) {
          n.apps.showCmdBall && n.apps.emit("warningBarShow", o), n.apps.showCmdBall && n.apps.logCnt(o, function () {
            n.apps.send("errlog", {
              data: o,
              device: n.apps.deviceFrom + "-" + n.apps.deviceSys
            });
          });
          var c = !0;
        }
        return n.dbs.addLog(c ? 2 : 1, o), n.apps.showCmdBall && console.log("eggf", o), n.apps.emit("cmdsChanged", o), o;
      } catch (i) {
        console.error(i);
      }
    });
  e.dlog = function () {
    for (var t = "*", o = arguments.length, r = Array(o), e = 0; o > e; e++) r[e] = arguments[e];
    r.forEach(function (o) {
      t += "-", "object" == typeof o && (o = (0, n.inspect)(o, {
        depth: 2
      })), t += o + "-";
    }), r.length > 0 && "string" == typeof r[0] && r[0].match(/^error$/i) && console.error(t), n.apps.emit("cmdsChanged", t);
  }, e.wlog = function c(t, o) {
    arguments.length > 0 ? n.apps.emit("interactionBar", t, "warn") : n.apps.emit("interactionBar", "", "close"), o && setTimeout(function () {
      return c();
    }, o);
  }, e.slog = function (t) {
    arguments.length > 0 ? n.apps.emit("interactionBar", t, "spin") : n.apps.emit("interactionBar", "", "close");
  }, e.blog = function (t) {
    arguments.length > 0 ? n.apps.emit("interactionBlockOpen", t) : n.apps.emit("interactionBlockClose");
  };
  e.errCb = function (t, o) {
    return function (r) {
      "__reject_break" !== r && a("error", r, JSON.stringify(t)), o && o(r);
    };
  }, e.wrapInCatch = function (t, o) {
    var r = {},
      e = function (e) {
        o.hasOwnProperty(e) && "function" == typeof o[e] && (r[e] = o[e], o[e] = function () {
          try {
            for (var o, n = arguments.length, a = Array(n), c = 0; n > c; c++) a[c] = arguments[c];
            return (o = r[e]).call.apply(o, [this].concat(a));
          } catch (i) {
            throw console.error(i, t, e), i;
          }
        });
      };
    for (var n in o) e(n);
    return o;
  };
});
