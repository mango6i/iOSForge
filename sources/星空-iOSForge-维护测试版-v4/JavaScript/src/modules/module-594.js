// Recovered module 594; analysis path, not original filename.
// Original SHA-256 58c05c097b95cbdf69a7ae287d5baff267b2546b35b0fe0974737dab3a3a9d1f; original byte range [1606278, 1608415).
__d(594, function (e, r, o, n) {
  Object.defineProperty(n, "__esModule", {
    value: !0
  }), n.Trimmer = void 0;
  var t = r(311),
    a = babelHelpers.interopRequireDefault(t),
    s = r(312),
    i = r(590),
    p = "RNTrimmerView",
    l = n.Trimmer = function (e) {
      function r() {
        var e;
        babelHelpers.classCallCheck(this, r);
        for (var o = arguments.length, n = Array(o), t = 0; o > t; t++) n[t] = arguments[t];
        var a = babelHelpers.possibleConstructorReturn(this, (e = Object.getPrototypeOf(r)).call.apply(e, [this].concat(n)));
        return a.state = {}, a._onChange = a._onChange.bind(a), a._handleTrackerMove = a._handleTrackerMove.bind(a), a;
      }
      return babelHelpers.inherits(r, e), babelHelpers.createClass(r, [{
        key: "_onChange",
        value: function (e) {
          this.props.onChange && this.props.onChange(e.nativeEvent);
        }
      }, {
        key: "_handleTrackerMove",
        value: function (e) {
          var r = e.nativeEvent,
            o = this.props.onTrackerMove,
            n = r.currentTime;
          "function" == typeof o && o({
            currentTime: n
          });
        }
      }, {
        key: "render",
        value: function () {
          var e = this.props,
            r = e.source,
            o = e.width,
            n = e.height,
            t = e.themeColor,
            p = e.minLength,
            l = e.maxLength,
            c = e.currentTime,
            u = e.trackerColor,
            T = e.thumbWidth,
            m = e.borderWidth,
            d = e.showTrackerHandle,
            b = e.trackerHandleColor,
            g = (0, i.getActualSource)(r);
          return a["default"].createElement(h, {
            source: g,
            width: o,
            height: n,
            currentTime: c,
            themeColor: (0, s.processColor)(t).toString(),
            trackerColor: (0, s.processColor)(u).toString(),
            showTrackerHandle: d,
            trackerHandleColor: (0, s.processColor)(b).toString(),
            onTrackerMove: this._handleTrackerMove,
            pointerEvents: "box-none",
            onChange: this._onChange,
            minLength: p,
            maxLength: l,
            thumbWidth: T,
            borderWidth: m
          });
        }
      }]), r;
    }(t.Component);
  l.propTypes = {
    source: t.PropTypes.oneOfType([t.PropTypes.string, t.PropTypes.number]).isRequired,
    width: t.PropTypes.number,
    height: t.PropTypes.number,
    showTrackerHandle: t.PropTypes.bool,
    trackerHandleColor: t.PropTypes.string,
    themeColor: t.PropTypes.string,
    onChange: t.PropTypes.func,
    onTrackerMove: t.PropTypes.func,
    minLength: t.PropTypes.number,
    maxLength: t.PropTypes.number,
    currentTime: t.PropTypes.number,
    trackerColor: t.PropTypes.string,
    thumbWidth: t.PropTypes.number,
    borderWidth: t.PropTypes.number
  }, l.defaultProps = {
    themeColor: "gray",
    trackerColor: "black",
    trackerHandleColor: "gray",
    showTrackerHandle: !1
  };
  var h = (0, s.requireNativeComponent)(p, l);
});
