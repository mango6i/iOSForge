// Recovered module 563; analysis path, not original filename.
// Original SHA-256 05f69ce2812a027edbfab972dffa357cc708a1aee2e5d7482523ec8be38f1608; original byte range [897499, 897799).
__d(563, function (r, n, a, t) {
  var o,
    e = r.crypto || r.msCrypto;
  if (e && e.getRandomValues) {
    var u = new Uint8Array(16);
    o = function () {
      return e.getRandomValues(u), u;
    };
  }
  if (!o) {
    var f = new Array(16);
    o = function () {
      for (var r, n = 0; 16 > n; n++) 0 === (3 & n) && (r = 4294967296 * Math.random()), f[n] = r >>> ((3 & n) << 3) & 255;
      return f;
    };
  }
  a.exports = o;
});
