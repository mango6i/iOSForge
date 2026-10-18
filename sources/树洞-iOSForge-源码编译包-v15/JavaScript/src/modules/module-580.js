// Recovered module 580; analysis path, not original filename.
// Original SHA-256 9ec4372f4f7f827f48e41187e11a9918ff731e13bea5a4570a8102d8b14fc2f7; original byte range [1585472, 1585671).
__d(580, function (r, t, n, a) {
  n.exports = function (r, t) {
    if (r.map) return r.map(t);
    for (var n = [], a = 0; a < r.length; a++) {
      var o = r[a];
      e.call(r, a) && n.push(t(o, a, r));
    }
    return n;
  };
  var e = Object.prototype.hasOwnProperty;
});
