// Recovered module 94; analysis path, not original filename.
// Original SHA-256 91b770cd430b856dfef08731776b02555639e10df6631e7627403e578c25e8cb; original byte range [161413, 161765).
__d(94, function (t, o, a, n) {
  "use strict";

  var r = o(380),
    e = 1,
    u = {
      tagsStartAt: e,
      tagCount: e,
      allocateTag: function () {
        for (; this.reactTagIsNativeTopRootID(u.tagCount);) u.tagCount++;
        var t = u.tagCount;
        return u.tagCount++, t;
      },
      assertRootTag: function (t) {
        this.reactTagIsNativeTopRootID(t) ? void 0 : r(!1);
      },
      reactTagIsNativeTopRootID: function (t) {
        return t % 10 === 1;
      }
    };
  a.exports = u;
});
