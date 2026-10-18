// Recovered module 222; analysis path, not original filename.
// Original SHA-256 1f14c3e47c56900e52c3c116a1242e50e5dcc410d3e70b47dd0fe9802b131b38; original byte range [450581, 451889).
__d(222, function (e, t, s, r) {
  "use strict";

  var o = t(125),
    p = t(1),
    n = t(205),
    l = t(43),
    a = t(67),
    c = t(80),
    i = p.createClass({
      displayName: "TabBarItemIOS",
      propTypes: babelHelpers["extends"]({}, a.propTypes, {
        badge: p.PropTypes.oneOfType([p.PropTypes.string, p.PropTypes.number]),
        systemIcon: p.PropTypes.oneOf(["bookmarks", "contacts", "downloads", "favorites", "featured", "history", "more", "most-recent", "most-viewed", "recents", "search", "top-rated"]),
        icon: o.propTypes.source,
        selectedIcon: o.propTypes.source,
        onPress: p.PropTypes.func,
        renderAsOriginal: p.PropTypes.bool,
        selected: p.PropTypes.bool,
        style: a.propTypes.style,
        title: p.PropTypes.string
      }),
      getInitialState: function () {
        return {
          hasBeenSelected: !1
        };
      },
      componentWillMount: function () {
        this.props.selected && this.setState({
          hasBeenSelected: !0
        });
      },
      componentWillReceiveProps: function (e) {
        (this.state.hasBeenSelected || e.selected) && this.setState({
          hasBeenSelected: !0
        });
      },
      render: function () {
        var e = this.props,
          t = e.style,
          s = e.children,
          r = babelHelpers.objectWithoutProperties(e, ["style", "children"]);
        if (this.state.hasBeenSelected) var o = p.createElement(n, {
          shouldUpdate: this.props.selected
        }, s);else var o = p.createElement(a, null);
        return p.createElement(y, babelHelpers["extends"]({}, r, {
          style: [d.tab, t]
        }), o);
      }
    }),
    d = l.create({
      tab: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    }),
    y = c("RCTTabBarItem", i);
  s.exports = i;
});
