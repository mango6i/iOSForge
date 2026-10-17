// Recovered module 579; analysis path, not original filename.
// Original SHA-256 3a06e853c8b2648c9c43fac896a85676a1e2f43e93278e60b09fe6ceeb9cea54; original byte range [1586274, 1586541).
__d(579, function (r, e, t, n) {
  var u = Object.prototype.hasOwnProperty;
  t.exports = function (r, e, t) {
    var n = arguments.length >= 3;
    if (n && r.reduce) return r.reduce(e, t);
    if (r.reduce) return r.reduce(e);
    for (var c = 0; c < r.length; c++) u.call(r, c) && (n ? t = e(t, r[c], c) : (t = r[c], n = !0));
    return t;
  };
});
