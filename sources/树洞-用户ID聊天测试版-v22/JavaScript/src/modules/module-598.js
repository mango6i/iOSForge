// Recovered module 598; analysis path, not original filename.
// Original SHA-256 eef1baf61bf379c89d9d9474ffaede3014ac9b77d9cfb1c11580aaf181879184; original byte range [1600804, 1605282).
__d(598, function (e, r, t, o) {
  Object.defineProperty(o, "__esModule", {
    value: !0
  }), o.VideoPlayer = void 0;
  var n = r(311),
    i = babelHelpers.interopRequireDefault(n),
    s = r(312),
    a = r(590),
    l = "RNVideoProcessing",
    p = s.NativeModules.RNVideoTrimmer,
    u = o.VideoPlayer = function (e) {
      function r() {
        var e;
        babelHelpers.classCallCheck(this, r);
        for (var t = arguments.length, o = Array(t), n = 0; t > n; n++) o[n] = arguments[n];
        var i = babelHelpers.possibleConstructorReturn(this, (e = Object.getPrototypeOf(r)).call.apply(e, [this].concat(o)));
        return i.state = {}, i.trim = i.trim.bind(i), i.compress = i.compress.bind(i), i.getPreviewForSecond = i.getPreviewForSecond.bind(i), i.getVideoInfo = i.getVideoInfo.bind(i), i._onChange = i._onChange.bind(i), i;
      }
      return babelHelpers.inherits(r, e), babelHelpers.createClass(r, [{
        key: "getPreviewForSecond",
        value: function () {
          var e = arguments.length <= 0 || void 0 === arguments[0] ? 0 : arguments[0],
            r = arguments[1],
            t = arguments.length <= 2 || void 0 === arguments[2] ? "base64" : arguments[2],
            o = (0, a.getActualSource)(this.props.source);
          return new Promise(function (n, i) {
            p.getPreviewImageAtPosition(o, e, r, t, function (e, r) {
              return e ? i(e) : n(r);
            });
          });
        }
      }, {
        key: "getVideoInfo",
        value: function () {
          var e = (0, a.getActualSource)(this.props.source);
          return new Promise(function (r, t) {
            p.getAssetInfo(e, function (e, o) {
              return e ? t(e) : r(o);
            });
          });
        }
      }, {
        key: "_onChange",
        value: function (e) {
          this.props.onChange && this.props.onChange(e);
        }
      }, {
        key: "trim",
        value: function () {
          var e = arguments.length <= 0 || void 0 === arguments[0] ? {} : arguments[0],
            t = Object.values(r.Constants.quality);
          e.hasOwnProperty("startTime") || console.warn("Start time is not specified"), e.hasOwnProperty("endTime") || console.warn("End time is not specified"), e.hasOwnProperty("quality") && !t.includes(e.quality) && console.warn("Quality is wrong, Please use VideoPlayer.Constants.quality");
          var o = (0, a.getActualSource)(this.props.source);
          return new Promise(function (r, t) {
            p.trim(o, e, function (e, o) {
              return e ? t(e) : r(o);
            });
          });
        }
      }, {
        key: "compress",
        value: function () {
          var e = arguments.length <= 0 || void 0 === arguments[0] ? {} : arguments[0],
            r = babelHelpers["extends"]({}, e);
          r.hasOwnProperty("bitrateMultiplier") && r.bitrateMultiplier <= 0 && (r.bitrateMultiplier = 1, console.warn("bitrateMultiplier cannot be less than zero")), r.hasOwnProperty("height") && r.height <= 0 && (delete r.height, console.warn("height cannot be less than zero")), r.hasOwnProperty("width") && r.width <= 0 && (delete r.width, console.warn("width cannot be less than zero")), r.hasOwnProperty("minimumBitrate") && r.minimumBitrate <= 0 && (delete r.minimumBitrate, console.warn("minimumBitrate cannot be less than zero"));
          var t = (0, a.getActualSource)(this.props.source);
          return new Promise(function (e, o) {
            p.compress(t, r, function (r, t) {
              return r ? o(r) : e(t);
            });
          });
        }
      }, {
        key: "render",
        value: function () {
          var e = this.props,
            r = e.source,
            t = e.play,
            o = e.replay,
            n = e.rotate,
            s = e.currentTime,
            l = e.backgroundColor,
            p = e.startTime,
            u = e.endTime,
            d = e.playerWidth,
            h = e.playerHeight,
            m = e.volume,
            y = e.resizeMode,
            g = babelHelpers.objectWithoutProperties(e, ["source", "play", "replay", "rotate", "currentTime", "backgroundColor", "startTime", "endTime", "playerWidth", "playerHeight", "volume", "resizeMode"]),
            b = (0, a.getActualSource)(r);
          return i["default"].createElement(c, babelHelpers["extends"]({
            source: b,
            play: t,
            replay: o,
            rotate: n,
            volume: m,
            playerWidth: d,
            playerHeight: h,
            currentTime: s,
            background_Color: l,
            startTime: p,
            endTime: u,
            onChange: this._onChange,
            resizeMode: y
          }, g));
        }
      }]), r;
    }(n.Component);
  u.propTypes = babelHelpers["extends"]({
    source: n.PropTypes.oneOfType([n.PropTypes.string, n.PropTypes.number]).isRequired,
    play: n.PropTypes.bool,
    replay: n.PropTypes.bool,
    rotate: n.PropTypes.bool,
    currentTime: n.PropTypes.number,
    volume: n.PropTypes.number,
    startTime: n.PropTypes.number,
    background_Color: n.PropTypes.string,
    endTime: n.PropTypes.number,
    playerWidth: n.PropTypes.number,
    playerHeight: n.PropTypes.number,
    onChange: n.PropTypes.func,
    resizeMode: n.PropTypes.string
  }, s.View.propTypes), u.defaultProps = {
    play: !1,
    replay: !1,
    rotate: !1,
    resizeMode: s.UIManager.RNVideoProcessing.Constants.ScaleNone,
    volume: 0,
    currentTime: 0,
    startTime: 0
  }, u.Constants = {
    quality: {
      QUALITY_LOW: "low",
      QUALITY_MEDIUM: "medium",
      QUALITY_HIGHEST: "highest",
      QUALITY_640x480: "640x480",
      QUALITY_960x540: "960x540",
      QUALITY_1280x720: "1280x720",
      QUALITY_1920x1080: "1920x1080",
      QUALITY_3840x2160: "3840x2160",
      QUALITY_PASS_THROUGH: "passthrough"
    },
    resizeMode: {
      CONTAIN: s.UIManager.RNVideoProcessing.Constants.ScaleAspectFit,
      COVER: s.UIManager.RNVideoProcessing.Constants.ScaleAspectFill,
      STRETCH: s.UIManager.RNVideoProcessing.Constants.ScaleToFill,
      NONE: s.UIManager.RNVideoProcessing.Constants.ScaleNone
    }
  };
  var c = (0, s.requireNativeComponent)(l, u);
});
