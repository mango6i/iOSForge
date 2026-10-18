// Recovered module 35; analysis path, not original filename.
// Original SHA-256 f18da00bd542d2671c469759263cb99339a4dff9fe84b7f2991be9088a69603f; original byte range [108602, 110280).
__d(35, function (n, t, e, o) {
  "use strict";

  function u(n, t) {
    c[n] || (c[n] = {
      parentID: null,
      ownerID: null,
      text: null,
      childIDs: [],
      displayName: "Unknown",
      isMounted: !1,
      updateCount: 0
    }), t(c[n]);
  }
  function r(n) {
    var t = c[n];
    if (t) {
      var e = t.childIDs;
      delete c[n], e.forEach(r);
    }
  }
  var i = t(380),
    c = {},
    f = [],
    a = {
      onSetDisplayName: function (n, t) {
        u(n, function (n) {
          return n.displayName = t;
        });
      },
      onSetChildren: function (n, t) {
        u(n, function (e) {
          var o = e.childIDs;
          e.childIDs = t, t.forEach(function (t) {
            var e = c[t];
            e ? void 0 : i(!1), null == e.displayName ? i(!1) : void 0, null == e.childIDs && null == e.text ? i(!1) : void 0, e.isMounted ? void 0 : i(!1), -1 === o.indexOf(t) && (e.parentID = n);
          });
        });
      },
      onSetOwner: function (n, t) {
        u(n, function (n) {
          return n.ownerID = t;
        });
      },
      onSetText: function (n, t) {
        u(n, function (n) {
          return n.text = t;
        });
      },
      onMountComponent: function (n) {
        u(n, function (n) {
          return n.isMounted = !0;
        });
      },
      onMountRootComponent: function (n) {
        f.push(n);
      },
      onUpdateComponent: function (n) {
        u(n, function (n) {
          return n.updateCount++;
        });
      },
      onUnmountComponent: function (n) {
        u(n, function (n) {
          return n.isMounted = !1;
        }), f = f.filter(function (t) {
          return t !== n;
        });
      },
      purgeUnmountedComponents: function () {
        a._preventPurging || Object.keys(c).filter(function (n) {
          return !c[n].isMounted;
        }).forEach(r);
      },
      isMounted: function (n) {
        var t = c[n];
        return t ? t.isMounted : !1;
      },
      getChildIDs: function (n) {
        var t = c[n];
        return t ? t.childIDs : [];
      },
      getDisplayName: function (n) {
        var t = c[n];
        return t ? t.displayName : "Unknown";
      },
      getOwnerID: function (n) {
        var t = c[n];
        return t ? t.ownerID : null;
      },
      getParentID: function (n) {
        var t = c[n];
        return t ? t.parentID : null;
      },
      getText: function (n) {
        var t = c[n];
        return t ? t.text : null;
      },
      getUpdateCount: function (n) {
        var t = c[n];
        return t ? t.updateCount : 0;
      },
      getRootIDs: function () {
        return f;
      },
      getRegisteredIDs: function () {
        return Object.keys(c);
      }
    };
  e.exports = a;
});
