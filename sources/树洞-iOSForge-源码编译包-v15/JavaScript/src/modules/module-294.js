// Recovered module 294; analysis path, not original filename.
// Original SHA-256 c357798930115832c50cf688b56ccc50b751054acf45f0618d0d2f600a3f3a8d; original byte range [569339, 569945).
__d(294, function (e, r, n, t) {
  "use strict";

  function i(e) {
    var r = e.initialState,
      n = e.getReducerForState,
      t = e.getPushedReducerForAction,
      i = n || u;
    return function (e, n) {
      if (!e) return r;
      var u = c.getParent(e);
      if (!u) return e;
      var a = u.children[u.index],
        o = i(a),
        l = o(a, n);
      if (l !== a) {
        var d = [].concat(babelHelpers.toConsumableArray(u.children));
        return d[u.index] = l, babelHelpers["extends"]({}, u, {
          children: d
        });
      }
      var s = t(n, u);
      if (s) return c.push(u, s(null, n));
      switch (n.type) {
        case "back":
        case "BackAction":
          return 0 === u.index || 1 === u.children.length ? u : c.pop(u);
      }
      return u;
    };
  }
  var c = r(295),
    u = function (e) {
      return function (r) {
        return r || e;
      };
    };
  n.exports = i;
});
