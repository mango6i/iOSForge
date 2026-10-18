// Recovered module 13; analysis path, not original filename.
// Original SHA-256 08cdc38a95dda4a233b5e72b43be7fe9ff2751feb7fdf661828774d709841207; original byte range [75579, 77006).
__d(13, function (n, o, e, t) {
  "use strict";

  function i(n, o, e, t, i, c) {}
  function c(n) {}
  var u = (o(377), o(378), o(381), []),
    f = {
      addDevtool: function (n) {
        u.push(n);
      },
      removeDevtool: function (n) {
        for (var o = 0; o < u.length; o++) u[o] === n && (u.splice(o, 1), o--);
      },
      beginProfiling: function () {},
      endProfiling: function () {},
      getFlushHistory: function () {},
      onBeginFlush: function () {
        i("onBeginFlush");
      },
      onEndFlush: function () {
        i("onEndFlush");
      },
      onBeginLifeCycleTimer: function (n, o) {
        c(n), i("onBeginLifeCycleTimer", n, o);
      },
      onEndLifeCycleTimer: function (n, o) {
        c(n), i("onEndLifeCycleTimer", n, o);
      },
      onBeginReconcilerTimer: function (n, o) {
        c(n), i("onBeginReconcilerTimer", n, o);
      },
      onEndReconcilerTimer: function (n, o) {
        c(n), i("onEndReconcilerTimer", n, o);
      },
      onBeginProcessingChildContext: function () {
        i("onBeginProcessingChildContext");
      },
      onEndProcessingChildContext: function () {
        i("onEndProcessingChildContext");
      },
      onNativeOperation: function (n, o, e) {
        c(n), i("onNativeOperation", n, o, e);
      },
      onSetState: function () {
        i("onSetState");
      },
      onSetDisplayName: function (n, o) {
        c(n), i("onSetDisplayName", n, o);
      },
      onSetChildren: function (n, o) {
        c(n), i("onSetChildren", n, o);
      },
      onSetOwner: function (n, o) {
        c(n), i("onSetOwner", n, o);
      },
      onSetText: function (n, o) {
        c(n), i("onSetText", n, o);
      },
      onMountRootComponent: function (n) {
        c(n), i("onMountRootComponent", n);
      },
      onMountComponent: function (n) {
        c(n), i("onMountComponent", n);
      },
      onUpdateComponent: function (n) {
        c(n), i("onUpdateComponent", n);
      },
      onUnmountComponent: function (n) {
        c(n), i("onUnmountComponent", n);
      }
    };
  e.exports = f;
});
