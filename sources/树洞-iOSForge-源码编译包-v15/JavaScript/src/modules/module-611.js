// Recovered module 611; analysis path, not original filename.
// Original SHA-256 2f8e8382e637916505b31461048acb7327cbb5cdb76dd1aefa8d35773ea6ddc4; original byte range [1918398, 1920053).
__d(611, function (e, r, t, n) {
  "use strict";

  var o = r(311),
    l = babelHelpers.interopRequireDefault(o),
    i = r(312),
    s = r(612),
    p = babelHelpers.interopRequireDefault(s),
    a = r(424),
    d = babelHelpers.interopRequireDefault(a),
    c = l["default"].createClass({
      displayName: "InvertibleScrollView",
      mixins: [p["default"]],
      propTypes: babelHelpers["extends"]({}, i.ScrollView.propTypes, {
        inverted: o.PropTypes.bool,
        renderScrollComponent: o.PropTypes.func.isRequired
      }),
      getDefaultProps: function () {
        return {
          renderScrollComponent: function (e) {
            return l["default"].createElement(i.ScrollView, e);
          }
        };
      },
      getScrollResponder: function () {
        return this._scrollComponent && this._scrollComponent.getScrollResponder();
      },
      setNativeProps: function (e) {
        this._scrollComponent.setNativeProps(e);
      },
      render: function () {
        var e = this,
          r = this.props,
          t = r.inverted,
          n = r.renderScrollComponent,
          o = babelHelpers.objectWithoutProperties(r, ["inverted", "renderScrollComponent"]);
        return t && (this.props.horizontal ? (o.style = [u.horizontallyInverted, o.style], o.children = this._renderInvertedChildren(o.children, u.horizontallyInverted)) : (o.style = [u.verticallyInverted, o.style], o.children = this._renderInvertedChildren(o.children, u.verticallyInverted))), (0, d["default"])(n(o), {
          ref: function (r) {
            e._scrollComponent = r;
          }
        });
      },
      _renderInvertedChildren: function (e, r) {
        return l["default"].Children.map(e, function (e) {
          return e ? l["default"].createElement(i.View, {
            onLayout: function (r) {
              if (e.props.onLayout) e.props.onLayout(r);else if (e.props.render) {
                var t = e.props.render();
                t.props.onLayout && t.props.onLayout(r);
              }
            },
            style: [r, {
              overflow: "hidden"
            }]
          }, e) : e;
        });
      }
    }),
    u = i.StyleSheet.create({
      verticallyInverted: {
        transform: [{
          scaleY: -1
        }]
      },
      horizontallyInverted: {
        transform: [{
          scaleX: -1
        }]
      }
    });
  t.exports = c;
});
