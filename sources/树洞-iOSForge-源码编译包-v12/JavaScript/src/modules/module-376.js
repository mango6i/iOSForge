// Recovered module 376; analysis path, not original filename.
// Original SHA-256 c04d04757811160f73576fbeb6ecb1eebc5c41f6ffc659a30d93b60ffeacec29; original byte range [2048309, 2050234).
__d(376, function (e, n, a, t) {
  Object.defineProperty(t, "__esModule", {
    value: !0
  });
  var o = n(555),
    i = n(311),
    r = babelHelpers.interopRequireDefault(i),
    d = n(312),
    s = function (e) {
      var n = e || {},
        a = n.message,
        t = babelHelpers.objectWithoutProperties(n, ["message"]),
        o = new Error(a);
      return o.framesToPop = 1, babelHelpers["extends"](o, t);
    },
    l = function (e) {
      function n() {
        babelHelpers.classCallCheck(this, n);
        var e = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(n).call(this));
        return e.handleSizeChange = e.handleSizeChange.bind(e), e.handleAdFailedToLoad = e.handleAdFailedToLoad.bind(e), e.state = {
          style: {}
        }, e;
      }
      return babelHelpers.inherits(n, e), babelHelpers.createClass(n, [{
        key: "componentDidMount",
        value: function () {
          this.loadBanner();
        }
      }, {
        key: "loadBanner",
        value: function () {
          d.UIManager.dispatchViewManagerCommand((0, d.findNodeHandle)(this._bannerView), d.UIManager.RNGADBannerView.Commands.loadBanner, null);
        }
      }, {
        key: "handleSizeChange",
        value: function (e) {
          var n = e.nativeEvent,
            a = n.height,
            t = n.width;
          this.setState({
            style: {
              width: t,
              height: a
            }
          }), this.props.onSizeChange && this.props.onSizeChange({
            width: t,
            height: a
          });
        }
      }, {
        key: "handleAdFailedToLoad",
        value: function (e) {
          this.props.onAdFailedToLoad && this.props.onAdFailedToLoad(s(e.nativeEvent.error));
        }
      }, {
        key: "render",
        value: function () {
          var e = this;
          return r["default"].createElement(h, babelHelpers["extends"]({}, this.props, {
            style: [this.props.style, this.state.style],
            onAdLoaded: function () {
              return e.props.onAdLoaded && e.props.onAdLoaded();
            },
            onSizeChange: this.handleSizeChange,
            onAdFailedToLoad: this.handleAdFailedToLoad,
            ref: function (n) {
              return e._bannerView = n;
            }
          }));
        }
      }]), n;
    }(i.Component);
  l.simulatorId = "SIMULATOR", l.propTypes = babelHelpers["extends"]({}, d.ViewPropTypes, {
    adSize: o.string,
    adUnitID: o.string,
    testDevices: (0, o.arrayOf)(o.string),
    onSizeChange: o.func,
    onAdLoaded: o.func,
    onAdFailedToLoad: o.func,
    onAdOpened: o.func,
    onAdClosed: o.func,
    onAdLeftApplication: o.func
  });
  var h = (0, d.requireNativeComponent)("RNGADBannerView", l);
  t["default"] = l;
});
