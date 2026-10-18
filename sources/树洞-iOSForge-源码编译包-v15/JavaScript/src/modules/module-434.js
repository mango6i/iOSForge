// Recovered module 434; analysis path, not original filename.
// Original SHA-256 cff6498aa987a3d395346894db63c1e18a744e95198be017cef689f8df47e6c9; original byte range [692305, 694639).
__d(434, function (e, r, t, o) {
  function a(e, r, t) {
    function o(r) {
      var t = arguments.length <= 1 || void 0 === arguments[1] ? y : arguments[1],
        o = arguments.length <= 2 || void 0 === arguments[2] ? v : arguments[2];
      if (!b) {
        if ("android" === i.Platform.OS) throw new Error("RNVectorIconsModule not available, did you properly integrate the module?");
        throw new Error("RNVectorIconsManager not available, did you add the library to your project and link with libRNVectorIcons.a?");
      }
      var n = e[r] || "?";
      "number" == typeof n && (n = String.fromCharCode(n));
      var l = (0, i.processColor)(o),
        s = n + ":" + t + ":" + l,
        u = i.PixelRatio.get();
      return new Promise(function (e, r) {
        var o = f[s];
        "undefined" != typeof o ? ((!o || o instanceof Error) && r(o), e({
          uri: o,
          scale: u
        })) : b.getImageForFont(a, n, t, l, function (t, o) {
          var a = "string" == typeof t ? new Error(t) : t;
          f[s] = o || a || !1, !a && o ? e({
            uri: o,
            scale: u
          }) : r(a);
        });
      });
    }
    var a = r;
    "android" === i.Platform.OS && t && (a = t.replace(/\.(otf|ttf)$/, ""));
    var s = n.PropTypes.oneOf(Object.keys(e)),
      p = function (r) {
        function t() {
          return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
        }
        return babelHelpers.inherits(t, r), babelHelpers.createClass(t, [{
          key: "setNativeProps",
          value: function (e) {
            this._root && this._root.setNativeProps(e);
          }
        }, {
          key: "render",
          value: function () {
            var r = this,
              t = this.props,
              o = t.name,
              n = t.size,
              s = t.color,
              u = t.style,
              p = babelHelpers.objectWithoutProperties(t, ["name", "size", "color", "style"]),
              c = e[o] || "?";
            "number" == typeof c && (c = String.fromCharCode(c));
            var f = {
              fontSize: n,
              fontWeight: "normal",
              fontStyle: "normal",
              color: s
            };
            return p.style = [f, u], p.ref = function (e) {
              r._root = e;
            }, f.fontFamily = a, l["default"].createElement(i.Text, p, c, this.props.children);
          }
        }]), t;
      }(n.Component);
    p.propTypes = {
      name: s.isRequired,
      size: n.PropTypes.number,
      color: n.PropTypes.string
    }, p.defaultProps = {
      size: y,
      allowFontScaling: !1
    };
    var f = {};
    return p.Button = (0, u["default"])(p), p.TabBarItem = p.TabBarItemIOS = (0, c["default"])(s, o), p.ToolbarAndroid = (0, d["default"])(s, o), p.getImageSource = o, p;
  }
  Object.defineProperty(o, "__esModule", {
    value: !0
  }), o["default"] = a;
  var n = r(311),
    l = babelHelpers.interopRequireDefault(n),
    i = r(435),
    s = r(436),
    u = babelHelpers.interopRequireDefault(s),
    p = r(547),
    c = babelHelpers.interopRequireDefault(p),
    f = r(551),
    d = babelHelpers.interopRequireDefault(f),
    b = i.NativeModules && (i.NativeModules.RNVectorIconsManager || i.NativeModules.RNVectorIconsModule),
    y = 12,
    v = "black";
});
