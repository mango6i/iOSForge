// Recovered module 610; analysis path, not original filename.
// Original SHA-256 796fa635d1740cdeb2f076c3b075f365244df6bdd3ff010eec1b22dcbc430ee3; original byte range [1657274, 1658730).
__d(610, function (e, r, t, o) {
  function a(e) {
    e ? i() : n();
  }
  function n() {
    s.forEach(function (e) {
      var r = babelHelpers.slicedToArray(e, 5),
        t = (r[0], r[1]),
        o = r[2];
      r[3], r[4];
      c[t].prototype[o] = u[t + "." + o];
    }), console.log("Callback based runtime ready");
  }
  function i() {
    s.forEach(function (e) {
      var r = babelHelpers.slicedToArray(e, 5),
        t = r[0],
        o = r[1],
        a = r[2],
        n = r[3],
        i = r[4],
        l = c[o].prototype[a];
      c[o].prototype[a] = function () {
        for (var e = arguments.length, r = Array(e), o = 0; e > o; o++) r[o] = arguments[o];
        n && 1 == r.length && r.push([]);
        var c = new Promise(function (e, o) {
          var n = function () {
              if (!t) {
                for (var r = arguments.length, o = Array(r), a = 0; r > a; a++) o[a] = arguments[a];
                return e(o);
              }
            },
            c = function (e) {
              var t;
              return (t = console).log.apply(t, ["error: ", a].concat(babelHelpers.toConsumableArray(r), [arguments])), o(e), !1;
            },
            s = l.call.apply(l, [this].concat(babelHelpers.toConsumableArray(r), [i ? c : n, i ? n : c]));
          return t ? e(s) : void 0;
        }.bind(this));
        return c;
      };
    }), console.log("Promise based runtime ready");
  }
  var l,
    c = (l = r(636), SQLiteFactory = l.SQLiteFactory, l),
    s = [[!1, "SQLitePlugin", "transaction", !1, !0], [!1, "SQLitePlugin", "readTransaction", !1, !0], [!1, "SQLitePlugin", "close", !1, !1], [!1, "SQLitePlugin", "executeSql", !0, !1], [!1, "SQLitePluginTransaction", "executeSql", !0, !1], [!1, "SQLiteFactory", "deleteDatabase", !1, !1], [!0, "SQLiteFactory", "openDatabase", !1, !1]],
    u = {};
  s.forEach(function (e) {
    var r = babelHelpers.slicedToArray(e, 3),
      t = (r[0], r[1]),
      o = r[2],
      a = c[t].prototype[o];
    u[t + "." + o] = a;
  }), SQLiteFactory.prototype.enablePromise = a, t.exports = new SQLiteFactory();
});
