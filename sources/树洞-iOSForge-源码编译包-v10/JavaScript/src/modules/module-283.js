// Recovered module 283; analysis path, not original filename.
// Original SHA-256 395bcbf72c8a8c915262126dc5599868edc5bf93f0f4ee00ea1a80d7dcb4cdc3; original byte range [559477, 561288).
__d(283, function (e, n, t, o) {
  "use strict";

  function i(e) {
    var n = function (n) {
      function t(e, n) {
        babelHelpers.classCallCheck(this, t);
        var o = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).call(this, e, n));
        return o._pointerEvents = o._computePointerEvents(), o;
      }
      return babelHelpers.inherits(t, n), babelHelpers.createClass(t, [{
        key: "componentWillMount",
        value: function () {
          this._onPositionChange = this._onPositionChange.bind(this), this._onComponentRef = this._onComponentRef.bind(this);
        }
      }, {
        key: "componentDidMount",
        value: function () {
          this._bindPosition(this.props);
        }
      }, {
        key: "componentWillUnmount",
        value: function () {
          this._positionListener && this._positionListener.remove();
        }
      }, {
        key: "componentWillReceiveProps",
        value: function (e) {
          this._bindPosition(e);
        }
      }, {
        key: "render",
        value: function () {
          return this._pointerEvents = this._computePointerEvents(), s.createElement(e, babelHelpers["extends"]({}, this.props, {
            pointerEvents: this._pointerEvents,
            onComponentRef: this._onComponentRef
          }));
        }
      }, {
        key: "_onComponentRef",
        value: function (e) {
          this._component = e, e && p("function" == typeof e.setNativeProps, "component must implement method `setNativeProps`");
        }
      }, {
        key: "_bindPosition",
        value: function (e) {
          this._positionListener && this._positionListener.remove(), this._positionListener = new r(e.position, this._onPositionChange);
        }
      }, {
        key: "_onPositionChange",
        value: function () {
          if (this._component) {
            var e = this._computePointerEvents();
            this._pointerEvents !== e && (this._pointerEvents = e, this._component.setNativeProps({
              pointerEvents: e
            }));
          }
        }
      }, {
        key: "_computePointerEvents",
        value: function () {
          var e = this.props,
            n = e.navigationState,
            t = e.position,
            o = e.scene;
          if (o.isStale || n.index !== o.index) return o.index > n.index ? "box-only" : "none";
          var i = t.__getAnimatedValue() - n.index;
          return Math.abs(i) > a ? "box-only" : "auto";
        }
      }]), t;
    }(s.Component);
    return n;
  }
  var s = n(1),
    r = n(284),
    p = n(380),
    a = .01;
  t.exports = {
    create: i
  };
});
