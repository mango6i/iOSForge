// Recovered module 416; analysis path, not original filename.
// Original SHA-256 04edbaa22bd2a0662bfe6c7c3dea5c53358e956e30a1226efb7fced96c302eb4; original byte range [249869, 250162).
__d(416, function (e, n, t, i) {
  "use strict";

  var r = i.createUniqueKey = "undefined" != typeof Symbol ? Symbol : function (e) {
    return "[[" + e + "_" + Math.random().toFixed(8).slice(2) + "]]";
  };
  i.LISTENERS = r("listeners"), i.CAPTURE = 1, i.BUBBLE = 2, i.ATTRIBUTE = 3, i.newNode = function (e, n) {
    return {
      listener: e,
      kind: n,
      next: null
    };
  };
});
