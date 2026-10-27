// Recovered module 578; analysis path, not original filename.
// Original SHA-256 f700b7c8b74e08814cab60f7b90eecb07bd74c64d7aaf6c06ced8fc96a2fc356; original byte range [1585950, 1586273).
__d(578, function (t, r, o, e) {
  var n = Object.prototype.hasOwnProperty,
    a = Object.prototype.toString;
  o.exports = function (t, r, o) {
    if ("[object Function]" !== a.call(r)) throw new TypeError("iterator must be a function");
    var e = t.length;
    if (e === +e) for (var c = 0; e > c; c++) r.call(o, t[c], c, t);else for (var l in t) n.call(t, l) && r.call(o, t[l], l, t);
  };
});
