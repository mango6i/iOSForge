// Recovered module 323; analysis path, not original filename.
// Original SHA-256 c979d08e103a36c9a8bfd6175540f18fbe1503eacd3cab54c6b41c08d633d2f7; original byte range [1247561, 1252622).
__d(323, function (global, require, module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: !0
  }), exports.TabView = void 0;
  var _react = require(311),
    _react2 = babelHelpers.interopRequireDefault(_react),
    _reactNative = require(312),
    _requireConfig = require(314),
    BUTTON_HEIGHT = _requireConfig.theme.tabHeight - 1,
    TabView = exports.TabView = _react2["default"].createClass({
      displayName: "TabView",
      getDefaultProps: function () {
        return {
          selectedColor: _requireConfig.theme.deep7,
          tabIndex: 0
        };
      },
      getInitialState: function () {
        return {
          tabIndex: this.props.tabIndex,
          selectedColor: this.props.selectedColor,
          display: !0
        };
      },
      componentDidMount: function componentDidMount() {
        var _this = this;
        this.evalCallback = function (cmd) {
          var tab = _this;
          try {
            (0, _requireConfig.tlog)(eval(cmd));
          } catch (e) {}
        }, _requireConfig.apps.on("eval", this.evalCallback);
      },
      componentWillUnmount: function () {
        _requireConfig.apps.unon("eval", this.evalCallback);
      },
      componentWillReceiveProps: function (e) {
        e.tabIndex !== this.props.tabIndex && this.setState({
          tabIndex: e.tabIndex
        });
      },
      renderButtons: function (e, t, r) {
        var i = this;
        return e.nullView ? null : _react2["default"].createElement(_reactNative.View, {
          key: t,
          style: styles.buttonWithSep
        }, _react2["default"].createElement(_reactNative.TouchableOpacity, {
          style: [styles.button, !_requireConfig.apps.blackWhiteMode && !this.props.noBorder && this.state.tabIndex === t && {
            backgroundColor: _requireConfig.theme.tabButtonBg
          }],
          onPress: function () {
            var r = e.onPress(i, t);
            r === !1 || i.props.noSwitch || i.setState({
              tabIndex: t
            });
          }
        }, _react2["default"].createElement(_reactNative.View, {
          style: this.state.tabIndex === t && !this.props.noBorder && {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 1,
            backgroundColor: _requireConfig.apps.darkTheme ? _requireConfig.theme.lighte : "#bbb"
          }
        }), _react2["default"].createElement(_reactNative.View, null, e.ionicons ? _react2["default"].createElement(_requireConfig.Ionicons, {
          name: e.ionicons,
          size: e.size ? e.size : 26,
          color: e.color ? e.color : this.state.tabIndex === t ? this.state.selectedColor : _requireConfig.theme.deep8
        }) : null, e.fontawesome ? _react2["default"].createElement(_requireConfig.FontAwesome, {
          name: e.fontawesome,
          size: e.size ? e.size : 26,
          color: e.color ? e.color : this.state.tabIndex === t ? this.state.selectedColor : _requireConfig.theme.deep8
        }) : null, e.text ? _react2["default"].createElement(_reactNative.Text, {
          style: [styles.buttonText, this.state.tabIndex === t && {
            color: this.state.selectedColor
          }]
        }, e.text) : null, e.count ? -1 === e.count ? _react2["default"].createElement(_reactNative.View, {
          style: {
            position: "absolute",
            top: -1,
            right: -13,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: _requireConfig.theme.deepGreen2Trans6,
            justifyContent: "center",
            alignItems: "center"
          }
        }) : _react2["default"].createElement(_reactNative.View, {
          style: {
            position: "absolute",
            top: -1,
            right: -13,
            paddingHorizontal: 5,
            height: 16,
            borderRadius: 8,
            backgroundColor: e.countColor ? e.countColor : _requireConfig.theme.warn,
            justifyContent: "center",
            alignItems: "center"
          }
        }, _react2["default"].createElement(_reactNative.Text, {
          style: {
            color: "white",
            fontSize: 9,
            fontWeight: "bold",
            textAlignVertical: "center"
          }
        }, e.count)) : null)), t < r.length - 1 && !this.props.noBorder && _react2["default"].createElement(_reactNative.View, {
          style: [{
            width: 1,
            marginVertical: 0,
            alignSelf: "stretch"
          }, {
            backgroundColor: _requireConfig.apps.darkTheme ? _requireConfig.theme.transparent : _requireConfig.apps.blackWhiteMode ? _requireConfig.theme.light : _requireConfig.theme.white
          }]
        }));
      },
      renderBackButton: function () {
        return _react2["default"].createElement(_reactNative.TouchableOpacity, {
          style: {
            height: BUTTON_HEIGHT,
            paddingTop: 9
          },
          onPress: this.state.onPressBack || function () {}
        }, _react2["default"].createElement(_requireConfig.FontAwesome, {
          name: "reply",
          size: 24,
          color: this.state.onPressBack ? _requireConfig.theme.deep9 : _requireConfig.theme.light
        }));
      },
      renderSep: function () {
        return _react2["default"].createElement(_reactNative.View, {
          style: styles.sep
        });
      },
      render: function () {
        var e = this;
        return this.state.display ? _react2["default"].createElement(_reactNative.View, {
          style: [this.props.style, {
            backgroundColor: _requireConfig.theme.transparent
          }]
        }, _react2["default"].createElement(_reactNative.View, {
          style: {
            width: _requireConfig.theme.winWidth,
            height: _requireConfig.theme.px1,
            backgroundColor: _requireConfig.apps.darkTheme ? _requireConfig.theme.transparent : _requireConfig.apps.blackWhiteMode ? "#ddd" : _requireConfig.theme.white
          }
        }), _react2["default"].createElement(_reactNative.View, {
          style: {
            height: BUTTON_HEIGHT,
            backgroundColor: "transparent",
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center"
          }
        }, this.props.buttons.map(function (t, r, i) {
          return e.renderButtons(t, r, i);
        }))) : _react2["default"].createElement(_reactNative.View, null);
      }
    }),
    styles = {
      sep: {
        alignSelf: "stretch",
        backgroundColor: _requireConfig.theme.transparent,
        width: 1,
        marginVertical: 9
      },
      tabText: {
        color: _requireConfig.theme.lighta,
        textAlign: "center",
        fontSize: 13
      },
      button: {
        flex: 1,
        backgroundColor: _requireConfig.theme.tabButtonBg,
        justifyContent: "center",
        alignItems: "center"
      },
      buttonWithSep: {
        flex: 1,
        flexDirection: "row",
        height: BUTTON_HEIGHT,
        backgroundColor: "transparent"
      },
      buttonText: {
        textAlign: "center",
        fontSize: 14,
        color: _requireConfig.theme.deep6,
        paddingBottom: "android" == _reactNative.Platform.OS ? 2 : 0
      }
    };
});
