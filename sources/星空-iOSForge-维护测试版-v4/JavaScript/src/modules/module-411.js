// Recovered module 411; analysis path, not original filename.
// Original SHA-256 0149b1a9cbddec45b609df4fd8ce74708b4ad2bfef6af2713225d3b466d8bc2a; original byte range [232624, 233375).
__d(411, function (e, n, t, l) {
  var o = "<unknown>",
    i = {
      parse: function (e) {
        for (var n, t, l = /^\s*at (?:(?:(?:Anonymous function)?|((?:\[object object\])?\S+(?: \[as \S+\])?)) )?\(?((?:file|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i, i = /^(?:\s*(\S*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i, u = /^\s*at (?:((?:\[object object\])?\S+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i, s = e.split("\n"), c = [], m = 0, f = s.length; f > m; ++m) {
          if (n = i.exec(s[m])) t = {
            file: n[3],
            methodName: n[1] || o,
            lineNumber: +n[4],
            column: n[5] ? +n[5] : null
          };else if (n = l.exec(s[m])) t = {
            file: n[2],
            methodName: n[1] || o,
            lineNumber: +n[3],
            column: n[4] ? +n[4] : null
          };else {
            if (!(n = u.exec(s[m]))) continue;
            t = {
              file: n[2],
              methodName: n[1] || o,
              lineNumber: +n[3],
              column: n[4] ? +n[4] : null
            };
          }
          c.push(t);
        }
        return c;
      }
    };
  t.exports = i;
});
