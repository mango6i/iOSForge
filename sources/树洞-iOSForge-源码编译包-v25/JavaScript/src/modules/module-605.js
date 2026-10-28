// Recovered module 605; analysis path, not original filename.
// Original SHA-256 829bb992a0d853991b61b271557816be03a03f1086ed110e42b41c9784787b73; original byte range [1629969, 1631267).
__d(605, function (r, n, t, o) {
  !function () {
    var r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
      n = {
        rotl: function (r, n) {
          return r << n | r >>> 32 - n;
        },
        rotr: function (r, n) {
          return r << 32 - n | r >>> n;
        },
        endian: function (r) {
          if (r.constructor == Number) return 16711935 & n.rotl(r, 8) | 4278255360 & n.rotl(r, 24);
          for (var t = 0; t < r.length; t++) r[t] = n.endian(r[t]);
          return r;
        },
        randomBytes: function (r) {
          for (var n = []; r > 0; r--) n.push(Math.floor(256 * Math.random()));
          return n;
        },
        bytesToWords: function (r) {
          for (var n = [], t = 0, o = 0; t < r.length; t++, o += 8) n[o >>> 5] |= r[t] << 24 - o % 32;
          return n;
        },
        wordsToBytes: function (r) {
          for (var n = [], t = 0; t < 32 * r.length; t += 8) n.push(r[t >>> 5] >>> 24 - t % 32 & 255);
          return n;
        },
        bytesToHex: function (r) {
          for (var n = [], t = 0; t < r.length; t++) n.push((r[t] >>> 4).toString(16)), n.push((15 & r[t]).toString(16));
          return n.join("");
        },
        hexToBytes: function (r) {
          for (var n = [], t = 0; t < r.length; t += 2) n.push(parseInt(r.substr(t, 2), 16));
          return n;
        },
        bytesToBase64: function (n) {
          for (var t = [], o = 0; o < n.length; o += 3) for (var e = n[o] << 16 | n[o + 1] << 8 | n[o + 2], u = 0; 4 > u; u++) 8 * o + 6 * u <= 8 * n.length ? t.push(r.charAt(e >>> 6 * (3 - u) & 63)) : t.push("=");
          return t.join("");
        },
        base64ToBytes: function (n) {
          n = n.replace(/[^A-Z0-9+\/]/gi, "");
          for (var t = [], o = 0, e = 0; o < n.length; e = ++o % 4) 0 != e && t.push((r.indexOf(n.charAt(o - 1)) & Math.pow(2, -2 * e + 8) - 1) << 2 * e | r.indexOf(n.charAt(o)) >>> 6 - 2 * e);
          return t;
        }
      };
    t.exports = n;
  }();
});
