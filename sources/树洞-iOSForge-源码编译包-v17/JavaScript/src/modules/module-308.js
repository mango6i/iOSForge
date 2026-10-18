// Recovered module 308; analysis path, not original filename.
// Original SHA-256 2d4e1da6d1516ff7641e7d2a944511a487422460b7f39e605275011c514c6c77; original byte range [585178, 585509).
__d(308, function (r, t, e, n) {
  "use strict";

  var i = t(2),
    a = t(4),
    o = t(383),
    u = t(380),
    f = (t(381), {
      create: function (r) {
        if ("object" != typeof r || !r || Array.isArray(r)) return r;
        if (a.isValidElement(r)) return r;
        1 === r.nodeType ? u(!1) : void 0;
        var t = [];
        for (var e in r) i.mapIntoWithKeyPrefixInternal(r[e], t, e, o.thatReturnsArgument);
        return t;
      }
    });
  e.exports = f;
});
