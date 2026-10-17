// Recovered module 214; analysis path, not original filename.
// Original SHA-256 80b38a0de699024bdd148470944dc87a930a52206cb0a864e25bb9964004faa1; original byte range [445938, 446586).
__d(214, function (e, t, s, n) {
  "use strict";

  var p = t(1),
    o = t(43),
    a = t(31),
    r = a.TestModule,
    i = t(30),
    d = t(67),
    h = t(80),
    l = p.createClass({
      displayName: "SnapshotViewIOS",
      onDefaultAction: function (e) {
        r.verifySnapshot(r.markTestPassed);
      },
      render: function () {
        var e = this.props.testIdentifier || "test",
          t = this.props.onSnapshotReady || this.onDefaultAction;
        return p.createElement(c, babelHelpers["extends"]({
          style: f.snapshot
        }, this.props, {
          onSnapshotReady: t,
          testIdentifier: e
        }));
      },
      propTypes: babelHelpers["extends"]({}, d.propTypes, {
        onSnapshotReady: p.PropTypes.func,
        testIdentifier: p.PropTypes.string
      })
    }),
    f = o.create({
      snapshot: {
        flex: 1
      }
    }),
    c = i.RCTSnapshot ? h("RCTSnapshot", l) : d;
  s.exports = l;
});
