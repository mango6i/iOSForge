// Recovered module 570; analysis path, not original filename.
// Original SHA-256 2ef09115ecfa7737d9a389c3ff100035d151202a97a589bf94bcf20007d8d969; original byte range [743884, 750668).
__d(570, function (e, n, o, t) {
  Object.defineProperty(t, "__esModule", {
    value: !0
  });
  var a = n(311),
    s = babelHelpers.interopRequireDefault(a),
    l = n(555),
    r = babelHelpers.interopRequireDefault(l),
    i = n(312),
    u = n(117),
    d = babelHelpers.interopRequireDefault(u),
    c = n(565),
    f = babelHelpers.interopRequireDefault(c),
    p = i.StyleSheet.create({
      base: {
        overflow: "hidden"
      }
    }),
    y = function (e) {
      function n(e) {
        babelHelpers.classCallCheck(this, n);
        var o = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(n).call(this, e));
        return o.seek = function (e) {
          o.setNativeProps({
            seek: e
          });
        }, o.presentFullscreenPlayer = function () {
          o.setNativeProps({
            fullscreen: !0
          });
        }, o.dismissFullscreenPlayer = function () {
          o.setNativeProps({
            fullscreen: !1
          });
        }, o._assignRoot = function (e) {
          o._root = e;
        }, o._onLoadStart = function (e) {
          o.props.onLoadStart && o.props.onLoadStart(e.nativeEvent);
        }, o._onLoad = function (e) {
          o.props.onLoad && o.props.onLoad(e.nativeEvent);
        }, o._onError = function (e) {
          o.props.onError && o.props.onError(e.nativeEvent);
        }, o._onProgress = function (e) {
          o.props.onProgress && o.props.onProgress(e.nativeEvent);
        }, o._onSeek = function (e) {
          o.state.showPoster && o.setState({
            showPoster: !1
          }), o.props.onSeek && o.props.onSeek(e.nativeEvent);
        }, o._onEnd = function (e) {
          o.props.onEnd && o.props.onEnd(e.nativeEvent);
        }, o._onTimedMetadata = function (e) {
          o.props.onTimedMetadata && o.props.onTimedMetadata(e.nativeEvent);
        }, o._onFullscreenPlayerWillPresent = function (e) {
          o.props.onFullscreenPlayerWillPresent && o.props.onFullscreenPlayerWillPresent(e.nativeEvent);
        }, o._onFullscreenPlayerDidPresent = function (e) {
          o.props.onFullscreenPlayerDidPresent && o.props.onFullscreenPlayerDidPresent(e.nativeEvent);
        }, o._onFullscreenPlayerWillDismiss = function (e) {
          o.props.onFullscreenPlayerWillDismiss && o.props.onFullscreenPlayerWillDismiss(e.nativeEvent);
        }, o._onFullscreenPlayerDidDismiss = function (e) {
          o.props.onFullscreenPlayerDidDismiss && o.props.onFullscreenPlayerDidDismiss(e.nativeEvent);
        }, o._onReadyForDisplay = function (e) {
          o.props.onReadyForDisplay && o.props.onReadyForDisplay(e.nativeEvent);
        }, o._onPlaybackStalled = function (e) {
          o.props.onPlaybackStalled && o.props.onPlaybackStalled(e.nativeEvent);
        }, o._onPlaybackResume = function (e) {
          o.props.onPlaybackResume && o.props.onPlaybackResume(e.nativeEvent);
        }, o._onPlaybackRateChange = function (e) {
          o.state.showPoster && 0 !== e.nativeEvent.playbackRate && o.setState({
            showPoster: !1
          }), o.props.onPlaybackRateChange && o.props.onPlaybackRateChange(e.nativeEvent);
        }, o._onAudioBecomingNoisy = function () {
          o.props.onAudioBecomingNoisy && o.props.onAudioBecomingNoisy();
        }, o._onAudioFocusChanged = function (e) {
          o.props.onAudioFocusChanged && o.props.onAudioFocusChanged(e.nativeEvent);
        }, o._onBuffer = function (e) {
          o.props.onBuffer && o.props.onBuffer(e.nativeEvent);
        }, o.state = {
          showPoster: !0
        }, o;
      }
      return babelHelpers.inherits(n, e), babelHelpers.createClass(n, [{
        key: "setNativeProps",
        value: function (e) {
          this._root.setNativeProps(e);
        }
      }, {
        key: "render",
        value: function () {
          var e = this.props.resizeMode,
            n = (0, d["default"])(this.props.source) || {},
            o = n.uri || "";
          o && o.match(/^\//) && (o = "file://" + o);
          var t = !(!o || !o.match(/^https?:/)),
            a = !(!o || !o.match(/^(assets-library|file|content|ms-appx|ms-appdata):/)),
            l = void 0;
          l = e === f["default"].stretch ? i.NativeModules.UIManager.RCTVideo.Constants.ScaleToFill : e === f["default"].contain ? i.NativeModules.UIManager.RCTVideo.Constants.ScaleAspectFit : e === f["default"].cover ? i.NativeModules.UIManager.RCTVideo.Constants.ScaleAspectFill : i.NativeModules.UIManager.RCTVideo.Constants.ScaleNone;
          var r = babelHelpers["extends"]({}, this.props);
          if (babelHelpers["extends"](r, {
            style: [p.base, r.style],
            resizeMode: l,
            src: {
              uri: o,
              isNetwork: t,
              isAsset: a,
              type: n.type || "",
              mainVer: n.mainVer || 0,
              patchVer: n.patchVer || 0
            },
            onVideoLoadStart: this._onLoadStart,
            onVideoLoad: this._onLoad,
            onVideoError: this._onError,
            onVideoProgress: this._onProgress,
            onVideoSeek: this._onSeek,
            onVideoEnd: this._onEnd,
            onVideoBuffer: this._onBuffer,
            onTimedMetadata: this._onTimedMetadata,
            onVideoFullscreenPlayerWillPresent: this._onFullscreenPlayerWillPresent,
            onVideoFullscreenPlayerDidPresent: this._onFullscreenPlayerDidPresent,
            onVideoFullscreenPlayerWillDismiss: this._onFullscreenPlayerWillDismiss,
            onVideoFullscreenPlayerDidDismiss: this._onFullscreenPlayerDidDismiss,
            onReadyForDisplay: this._onReadyForDisplay,
            onPlaybackStalled: this._onPlaybackStalled,
            onPlaybackResume: this._onPlaybackResume,
            onPlaybackRateChange: this._onPlaybackRateChange,
            onAudioFocusChanged: this._onAudioFocusChanged,
            onAudioBecomingNoisy: this._onAudioBecomingNoisy
          }), this.props.poster && this.state.showPoster) {
            var u = {
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              resizeMode: "contain"
            };
            return s["default"].createElement(i.View, {
              style: r.style
            }, s["default"].createElement(P, babelHelpers["extends"]({
              ref: this._assignRoot
            }, r)), s["default"].createElement(i.Image, {
              style: u,
              source: {
                uri: this.props.poster
              }
            }));
          }
          return s["default"].createElement(P, babelHelpers["extends"]({
            ref: this._assignRoot
          }, r));
        }
      }]), n;
    }(a.Component);
  t["default"] = y, y.propTypes = babelHelpers["extends"]({
    src: r["default"].object,
    seek: r["default"].number,
    fullscreen: r["default"].bool,
    onVideoLoadStart: r["default"].func,
    onVideoLoad: r["default"].func,
    onVideoBuffer: r["default"].func,
    onVideoError: r["default"].func,
    onVideoProgress: r["default"].func,
    onVideoSeek: r["default"].func,
    onVideoEnd: r["default"].func,
    onTimedMetadata: r["default"].func,
    onVideoFullscreenPlayerWillPresent: r["default"].func,
    onVideoFullscreenPlayerDidPresent: r["default"].func,
    onVideoFullscreenPlayerWillDismiss: r["default"].func,
    onVideoFullscreenPlayerDidDismiss: r["default"].func,
    source: r["default"].oneOfType([r["default"].shape({
      uri: r["default"].string
    }), r["default"].number]),
    resizeMode: r["default"].string,
    poster: r["default"].string,
    repeat: r["default"].bool,
    paused: r["default"].bool,
    muted: r["default"].bool,
    volume: r["default"].number,
    rate: r["default"].number,
    playInBackground: r["default"].bool,
    playWhenInactive: r["default"].bool,
    ignoreSilentSwitch: r["default"].oneOf(["ignore", "obey"]),
    disableFocus: r["default"].bool,
    controls: r["default"].bool,
    currentTime: r["default"].number,
    progressUpdateInterval: r["default"].number,
    onLoadStart: r["default"].func,
    onLoad: r["default"].func,
    onBuffer: r["default"].func,
    onError: r["default"].func,
    onProgress: r["default"].func,
    onSeek: r["default"].func,
    onEnd: r["default"].func,
    onFullscreenPlayerWillPresent: r["default"].func,
    onFullscreenPlayerDidPresent: r["default"].func,
    onFullscreenPlayerWillDismiss: r["default"].func,
    onFullscreenPlayerDidDismiss: r["default"].func,
    onReadyForDisplay: r["default"].func,
    onPlaybackStalled: r["default"].func,
    onPlaybackResume: r["default"].func,
    onPlaybackRateChange: r["default"].func,
    onAudioFocusChanged: r["default"].func,
    onAudioBecomingNoisy: r["default"].func,
    scaleX: r["default"].number,
    scaleY: r["default"].number,
    translateX: r["default"].number,
    translateY: r["default"].number,
    rotation: r["default"].number
  }, i.View.propTypes);
  var P = (0, i.requireNativeComponent)("RCTVideo", y, {
    nativeOnly: {
      src: !0,
      seek: !0,
      fullscreen: !0
    }
  });
});
