// Recovered module 252; analysis path, not original filename.
// Original SHA-256 a2c9b8ece98196e2111d3a9d634190bfd7ca1c85a273a2c11ce55752ff0f077c; original byte range [526199, 526892).
__d(252, function (t, o, e, i) {
  "use strict";

  var n = o(31).ActionSheetManager,
    s = o(380),
    a = o(56),
    l = {
      showActionSheetWithOptions: function (t, o) {
        s("object" == typeof t && null !== t, "Options must be a valid object"), s("function" == typeof o, "Must provide a valid callback"), n.showActionSheetWithOptions(babelHelpers["extends"]({}, t, {
          tintColor: a(t.tintColor)
        }), o);
      },
      showShareActionSheetWithOptions: function (t, o, e) {
        s("object" == typeof t && null !== t, "Options must be a valid object"), s("function" == typeof o, "Must provide a valid failureCallback"), s("function" == typeof e, "Must provide a valid successCallback"), n.showShareActionSheetWithOptions(babelHelpers["extends"]({}, t, {
          tintColor: a(t.tintColor)
        }), o, e);
      }
    };
  e.exports = l;
});
