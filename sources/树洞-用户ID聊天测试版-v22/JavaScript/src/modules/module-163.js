// Recovered module 163; analysis path, not original filename.
// Original SHA-256 873132e9b6a98562a500af31061d2e3ec00ff6eeefde481cf3a2fb9f0b690c6b; original byte range [276745, 277348).
__d(163, function (e, n, t, o) {
  "use strict";

  var r = n(84),
    s = n(104),
    a = n(30),
    i = function (e, n) {
      if (n.length) {
        for (var t, o, i, p, d, u = r.getNodeFromInstance(e), f = 0; f < n.length; f++) {
          var h = n[f];
          if (h.type === s.MOVE_EXISTING) (t || (t = [])).push(h.fromIndex), (o || (o = [])).push(h.toIndex);else if (h.type === s.REMOVE_NODE) (d || (d = [])).push(h.fromIndex);else if (h.type === s.INSERT_MARKUP) {
            var l = h.content,
              c = l;
            (p || (p = [])).push(h.toIndex), (i || (i = [])).push(c);
          }
        }
        a.manageChildren(u, t, o, i, p, d);
      }
    },
    p = {
      dangerouslyProcessChildrenUpdates: i,
      dangerouslyReplaceNodeWithMarkupByID: function (e, n) {
        var t = e;
        a.replaceExistingNonRootView(t, n);
      }
    };
  t.exports = p;
});
