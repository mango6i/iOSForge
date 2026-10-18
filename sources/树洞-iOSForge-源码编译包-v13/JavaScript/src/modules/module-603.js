// Recovered module 603; analysis path, not original filename.
// Original SHA-256 a758b44c20218c0da9f7d0a2c3e9976bf8750faba5e32c5ec1c7368d1e7669db; original byte range [1631268, 1631708).
__d(603, function (n, t, e, o) {
  var r = {
    utf8: {
      stringToBytes: function (n) {
        return r.bin.stringToBytes(unescape(encodeURIComponent(n)));
      },
      bytesToString: function (n) {
        return decodeURIComponent(escape(r.bin.bytesToString(n)));
      }
    },
    bin: {
      stringToBytes: function (n) {
        for (var t = [], e = 0; e < n.length; e++) t.push(255 & n.charCodeAt(e));
        return t;
      },
      bytesToString: function (n) {
        for (var t = [], e = 0; e < n.length; e++) t.push(String.fromCharCode(n[e]));
        return t.join("");
      }
    }
  };
  e.exports = r;
});
