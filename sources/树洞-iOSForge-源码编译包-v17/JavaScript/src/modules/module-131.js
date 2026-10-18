// Recovered module 131; analysis path, not original filename.
// Original SHA-256 ee26c478cbd8b9fd6f01ef9fe502bca626c2172e8f005f02042dd05c429d2c3e; original byte range [220931, 221728).
__d(131, function (e, n, t, o) {
  "use strict";

  var d = n(84),
    r = n(132),
    _ = (n(4), n(174)),
    u = n(95),
    a = n(41);
  r.inject();
  var c = function (e, n, t) {
      return _.renderComponent(e, n, t);
    },
    i = {
      hasReactNativeInitialized: !1,
      findNodeHandle: a,
      render: c,
      unmountComponentAtNode: _.unmountComponentAtNode,
      unstable_batchedUpdates: u.batchedUpdates,
      unmountComponentAtNodeAndRemoveContainer: _.unmountComponentAtNodeAndRemoveContainer
    };
  "undefined" != typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" == typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.inject && __REACT_DEVTOOLS_GLOBAL_HOOK__.inject({
    ComponentTree: {
      getClosestInstanceFromNode: function (e) {
        return d.getClosestInstanceFromNode(e);
      },
      getNodeFromInstance: function (e) {
        for (; e._renderedComponent;) e = e._renderedComponent;
        return e ? d.getNodeFromInstance(e) : null;
      }
    },
    Mount: _,
    Reconciler: n(98)
  }), t.exports = i;
});
