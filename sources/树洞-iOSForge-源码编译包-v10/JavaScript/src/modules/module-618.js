// Recovered module 618; analysis path, not original filename.
// Original SHA-256 ecf951ba8c38b4504122dc2ad2a64d77ac0284547007267d70100967eb89ea31; original byte range [1993747, 1999735).
__d(618, function (e, t, a, r) {
  function o(e) {
    var t = babelHelpers["extends"]({}, e);
    return "string" == typeof e.aspect && (t.aspect = c.constants.Aspect[e.aspect]), "string" == typeof e.flashMode && (t.flashMode = c.constants.FlashMode[e.flashMode]), "string" == typeof e.orientation && (t.orientation = c.constants.Orientation[e.orientation]), "string" == typeof e.torchMode && (t.torchMode = c.constants.TorchMode[e.torchMode]), "string" == typeof e.type && (t.type = c.constants.Type[e.type]), "string" == typeof e.captureQuality && (t.captureQuality = c.constants.CaptureQuality[e.captureQuality]), "string" == typeof e.captureMode && (t.captureMode = c.constants.CaptureMode[e.captureMode]), "string" == typeof e.captureTarget && (t.captureTarget = c.constants.CaptureTarget[e.captureTarget]), "function" != typeof e.onBarCodeRead && (t.barCodeTypes = []), t.barcodeScannerEnabled = "function" == typeof e.onBarCodeRead, t;
  }
  Object.defineProperty(r, "__esModule", {
    value: !0
  }), r.constants = void 0;
  var n = t(311),
    i = babelHelpers.interopRequireDefault(n),
    s = t(555),
    u = babelHelpers.interopRequireDefault(s),
    d = t(312),
    p = d.NativeModules.CameraManager || d.NativeModules.CameraModule,
    l = "camera",
    c = function (e) {
      function t() {
        babelHelpers.classCallCheck(this, t);
        var e = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).call(this));
        return e._onBarCodeRead = function (t) {
          e.props.onBarCodeRead && e.props.onBarCodeRead(t);
        }, e.state = {
          isAuthorized: !1,
          isRecording: !1
        }, e;
      }
      return babelHelpers.inherits(t, e), babelHelpers.createClass(t, [{
        key: "setNativeProps",
        value: function (e) {
          this.refs[l].setNativeProps(e);
        }
      }]), babelHelpers.createClass(t, [{
        key: "componentWillMount",
        value: function () {
          var e, a, r, n, i;
          return regeneratorRuntime.async(function (s) {
            for (;;) switch (s.prev = s.next) {
              case 0:
                if (this._addOnBarCodeReadListener(), e = o({
                  captureMode: this.props.captureMode
                }), a = e.captureMode, r = this.props.captureAudio && a === t.constants.CaptureMode.video, n = r ? t.checkDeviceAuthorizationStatus : t.checkVideoAuthorizationStatus, !n) {
                  s.next = 10;
                  break;
                }
                return s.next = 8, regeneratorRuntime.awrap(n());
              case 8:
                i = s.sent, this.setState({
                  isAuthorized: i
                });
              case 10:
              case "end":
                return s.stop();
            }
          }, null, this);
        }
      }, {
        key: "componentWillUnmount",
        value: function () {
          this._removeOnBarCodeReadListener(), this.state.isRecording && this.stopCapture();
        }
      }, {
        key: "componentWillReceiveProps",
        value: function (e) {
          var t = this.props.onBarCodeRead;
          t !== e.onBarCodeRead && this._addOnBarCodeReadListener(e);
        }
      }, {
        key: "_addOnBarCodeReadListener",
        value: function (e) {
          var t = e || this.props,
            a = t.onBarCodeRead;
          this._removeOnBarCodeReadListener(), a && (this.cameraBarCodeReadListener = d.Platform.select({
            ios: d.NativeAppEventEmitter.addListener("CameraBarCodeRead", this._onBarCodeRead),
            android: d.DeviceEventEmitter.addListener("CameraBarCodeReadAndroid", this._onBarCodeRead)
          }));
        }
      }, {
        key: "_removeOnBarCodeReadListener",
        value: function () {
          var e = this.cameraBarCodeReadListener;
          e && e.remove();
        }
      }, {
        key: "render",
        value: function () {
          var e = ([y.base, this.props.style], o(this.props));
          return i["default"].createElement(f, babelHelpers["extends"]({
            ref: l
          }, e));
        }
      }, {
        key: "capture",
        value: function (e) {
          var a = o(this.props);
          return e = babelHelpers["extends"]({
            audio: a.captureAudio,
            barCodeTypes: a.barCodeTypes,
            mode: a.captureMode,
            playSoundOnCapture: a.playSoundOnCapture,
            target: a.captureTarget,
            quality: a.captureQuality,
            type: a.type,
            title: "",
            description: "",
            mirrorImage: a.mirrorImage,
            fixOrientation: a.fixOrientation
          }, e), e.mode === t.constants.CaptureMode.video && (e.totalSeconds = e.totalSeconds > -1 ? e.totalSeconds : -1, e.preferredTimeScale = e.preferredTimeScale || 30, this.setState({
            isRecording: !0
          })), p.capture(e);
        }
      }, {
        key: "stopCapture",
        value: function () {
          return this.state.isRecording ? (this.setState({
            isRecording: !1
          }), p.stopCapture()) : Promise.resolve("Not Recording.");
        }
      }, {
        key: "getFOV",
        value: function () {
          return p.getFOV();
        }
      }, {
        key: "hasFlash",
        value: function () {
          if ("android" === d.Platform.OS) {
            var e = o(this.props);
            return p.hasFlash({
              type: e.type
            });
          }
          return p.hasFlash();
        }
      }]), t;
    }(n.Component);
  c.constants = {
    Aspect: p.Aspect,
    BarCodeType: p.BarCodeType,
    Type: p.Type,
    CaptureMode: p.CaptureMode,
    CaptureTarget: p.CaptureTarget,
    CaptureQuality: p.CaptureQuality,
    Orientation: p.Orientation,
    FlashMode: p.FlashMode,
    TorchMode: p.TorchMode
  }, c.propTypes = babelHelpers["extends"]({}, d.ViewPropTypes, {
    aspect: u["default"].oneOfType([u["default"].string, u["default"].number]),
    captureAudio: u["default"].bool,
    captureMode: u["default"].oneOfType([u["default"].string, u["default"].number]),
    captureQuality: u["default"].oneOfType([u["default"].string, u["default"].number]),
    captureTarget: u["default"].oneOfType([u["default"].string, u["default"].number]),
    defaultOnFocusComponent: u["default"].bool,
    flashMode: u["default"].oneOfType([u["default"].string, u["default"].number]),
    keepAwake: u["default"].bool,
    onBarCodeRead: u["default"].func,
    barcodeScannerEnabled: u["default"].bool,
    onFocusChanged: u["default"].func,
    onZoomChanged: u["default"].func,
    mirrorImage: u["default"].bool,
    fixOrientation: u["default"].bool,
    barCodeTypes: u["default"].array,
    orientation: u["default"].oneOfType([u["default"].string, u["default"].number]),
    playSoundOnCapture: u["default"].bool,
    torchMode: u["default"].oneOfType([u["default"].string, u["default"].number]),
    type: u["default"].oneOfType([u["default"].string, u["default"].number])
  }), c.defaultProps = {
    aspect: p.Aspect.fill,
    type: p.Type.back,
    orientation: p.Orientation.auto,
    fixOrientation: !1,
    captureAudio: !1,
    captureMode: p.CaptureMode.still,
    captureTarget: p.CaptureTarget.cameraRoll,
    captureQuality: p.CaptureQuality.high,
    defaultOnFocusComponent: !0,
    flashMode: p.FlashMode.off,
    playSoundOnCapture: !0,
    torchMode: p.TorchMode.off,
    mirrorImage: !1,
    barCodeTypes: Object.values(p.BarCodeType)
  }, c.checkDeviceAuthorizationStatus = p.checkDeviceAuthorizationStatus, c.checkVideoAuthorizationStatus = p.checkVideoAuthorizationStatus, c.checkAudioAuthorizationStatus = p.checkAudioAuthorizationStatus, r["default"] = c;
  var f = (r.constants = c.constants, (0, d.requireNativeComponent)("RCTCamera", c, {
      nativeOnly: {
        testID: !0,
        renderToHardwareTextureAndroid: !0,
        accessibilityLabel: !0,
        importantForAccessibility: !0,
        accessibilityLiveRegion: !0,
        accessibilityComponentType: !0,
        onLayout: !0
      }
    })),
    y = d.StyleSheet.create({
      base: {}
    });
});
