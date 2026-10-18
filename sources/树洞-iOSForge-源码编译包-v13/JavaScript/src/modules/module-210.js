// Recovered module 210; analysis path, not original filename.
// Original SHA-256 c6ad42d75723f435120d6c877c8778ac32a2fd2a12c7fb45ac3135657796f09e; original byte range [441940, 442531).
__d(210, function (e, r, s, p) {
  "use strict";

  var t = r(125),
    o = r(23),
    i = r(19),
    n = r(1),
    a = r(43),
    g = r(67),
    l = r(80),
    c = n.createClass({
      displayName: "ProgressViewIOS",
      mixins: [o],
      propTypes: babelHelpers["extends"]({}, g.propTypes, {
        progressViewStyle: i.oneOf(["default", "bar"]),
        progress: i.number,
        progressTintColor: i.string,
        trackTintColor: i.string,
        progressImage: t.propTypes.source,
        trackImage: t.propTypes.source
      }),
      render: function () {
        return n.createElement(y, babelHelpers["extends"]({}, this.props, {
          style: [u.progressView, this.props.style]
        }));
      }
    }),
    u = a.create({
      progressView: {
        height: 2
      }
    }),
    y = l("RCTProgressView", c);
  s.exports = c;
});
