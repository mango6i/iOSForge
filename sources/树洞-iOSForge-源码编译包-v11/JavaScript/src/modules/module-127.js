// Recovered module 127; analysis path, not original filename.
// Original SHA-256 a227f8ff284053c9e044290024fbc3a00d1cfecb98bab01120667d42d0614a0e; original byte range [207320, 207934).
__d(127, function (e, a, o, r) {
  "use strict";

  var n = a(31).ImageStoreManager,
    g = function () {
      function e() {
        babelHelpers.classCallCheck(this, e);
      }
      return babelHelpers.createClass(e, null, [{
        key: "hasImageForTag",
        value: function (e, a) {
          n.hasImageForTag ? n.hasImageForTag(e, a) : console.warn("hasImageForTag() not implemented");
        }
      }, {
        key: "removeImageForTag",
        value: function (e) {
          n.removeImageForTag ? n.removeImageForTag(e) : console.warn("removeImageForTag() not implemented");
        }
      }, {
        key: "addImageFromBase64",
        value: function (e, a, o) {
          n.addImageFromBase64(e, a, o);
        }
      }, {
        key: "getBase64ForTag",
        value: function (e, a, o) {
          n.getBase64ForTag(e, a, o);
        }
      }]), e;
    }();
  o.exports = g;
});
