// Recovered module 182; analysis path, not original filename.
// Original SHA-256 4fd4f307103654503a620b1c450522df85c0dab68e07fa7adb99191f85219136; original byte range [299565, 299868).
__d(182, function (e, r, s, t) {
  "use strict";

  var n = r(1),
    o = n.createClass({
      displayName: "StaticRenderer",
      propTypes: {
        shouldUpdate: n.PropTypes.bool.isRequired,
        render: n.PropTypes.func.isRequired
      },
      shouldComponentUpdate: function (e) {
        return e.shouldUpdate;
      },
      render: function () {
        return this.props.render();
      }
    });
  s.exports = o;
});
