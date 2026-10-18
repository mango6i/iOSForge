// Recovered module 619; analysis path, not original filename.
// Original SHA-256 6103c1d4b7022f3d8c5a27b6e299e84b139c7895fcb2977509ff620d8b483aad; original byte range [2005050, 2012560).
__d(619, function (t, e, n, o) {
  "use strict";

  function s(t) {
    return t && t.__esModule ? t : {
      default: t
    };
  }
  Object.defineProperty(o, "__esModule", {
    value: !0
  });
  var i = Object.assign || function (t) {
      for (var e = 1; e < arguments.length; e++) {
        var n = arguments[e];
        for (var o in n) Object.prototype.hasOwnProperty.call(n, o) && (t[o] = n[o]);
      }
      return t;
    },
    r = e(625),
    a = s(r),
    h = e(616),
    p = s(h),
    l = e(624),
    d = s(l),
    u = e(311),
    c = s(u),
    f = e(555),
    g = (s(f), e(617)),
    w = s(g),
    b = e(312),
    v = (0, w["default"])({
      displayName: "SwipeoutBtn",
      getDefaultProps: function () {
        return {
          backgroundColor: null,
          color: null,
          component: null,
          underlayColor: null,
          height: 0,
          onPress: null,
          disabled: !1,
          text: "Click me",
          type: "",
          width: 0
        };
      },
      render: function () {
        var t = this.props,
          e = [d["default"].swipeoutBtn];
        "delete" === t.type ? e.push(d["default"].colorDelete) : "primary" === t.type ? e.push(d["default"].colorPrimary) : "secondary" === t.type && e.push(d["default"].colorSecondary), t.backgroundColor && e.push([{
          backgroundColor: t.backgroundColor
        }]), e.push([{
          height: t.height,
          width: t.width
        }]);
        var n = [];
        n.push([{
          height: t.height,
          width: t.width
        }]);
        var o = [d["default"].swipeoutBtnText];
        return t.color && o.push({
          color: t.color
        }), c["default"].createElement(p["default"], {
          onPress: this.props.onPress,
          underlayColor: this.props.underlayColor,
          disabled: this.props.disabled,
          style: [d["default"].swipeoutBtnTouchable, e],
          textStyle: o
        }, t.component ? c["default"].createElement(b.View, {
          style: n
        }, t.component) : t.text);
      }
    }),
    _ = (0, w["default"])({
      displayName: "Swipeout",
      mixins: [a["default"].Mixin],
      getDefaultProps: function () {
        return {
          disabled: !1,
          rowID: -1,
          sectionID: -1,
          sensitivity: 50
        };
      },
      getInitialState: function () {
        return {
          autoClose: this.props.autoClose || !1,
          btnWidth: 0,
          btnsLeftWidth: 0,
          btnsRightWidth: 0,
          contentHeight: 0,
          contentPos: 0,
          contentWidth: 0,
          openedRight: !1,
          swiping: !1,
          tweenDuration: 160,
          timeStart: null
        };
      },
      componentWillMount: function () {
        var t = this;
        this._panResponder = b.PanResponder.create({
          onStartShouldSetPanResponder: function (t, e) {
            return !0;
          },
          onStartShouldSetPanResponderCapture: function (e, n) {
            return t.state.openedLeft || t.state.openedRight;
          },
          onMoveShouldSetPanResponderCapture: function (e, n) {
            return Math.abs(n.dx) > t.props.sensitivity && Math.abs(n.dy) <= t.props.sensitivity;
          },
          onPanResponderGrant: this._handlePanResponderGrant,
          onPanResponderMove: this._handlePanResponderMove,
          onPanResponderRelease: this._handlePanResponderEnd,
          onPanResponderTerminate: this._handlePanResponderEnd,
          onShouldBlockNativeResponder: function (t, e) {
            return !1;
          },
          onPanResponderTerminationRequest: function () {
            return !1;
          }
        });
      },
      componentWillReceiveProps: function (t) {
        t.close && this._close(), t.openRight && this._openRight(), t.openLeft && this._openLeft();
      },
      _handlePanResponderGrant: function (t, e) {
        var n = this;
        this.props.disabled || (this.state.openedLeft || this.state.openedRight ? this._callOnClose() : this._callOnOpen(), this.refs.swipeoutContent.measure(function (t, e, o, s) {
          var i = n.props.buttonWidth || o / 5;
          n.setState({
            btnWidth: i,
            btnsLeftWidth: n.props.left ? i * n.props.left.length : 0,
            btnsRightWidth: n.props.right ? i * n.props.right.length : 0,
            swiping: !0,
            timeStart: new Date().getTime()
          });
        }));
      },
      _handlePanResponderMove: function (t, e) {
        if (!this.props.disabled) {
          var n = e.dx,
            o = e.dy,
            s = this.state.btnsLeftWidth,
            i = this.state.btnsRightWidth;
          if (this.state.openedRight) var n = e.dx - i;else if (this.state.openedLeft) var n = e.dx + s;
          var r = Math.abs(n) > Math.abs(o);
          this.props.scroll && (r ? this.props.scroll(!1) : this.props.scroll(!0)), this.state.swiping && (0 > n && this.props.right ? this.setState({
            contentPos: Math.min(n, 0)
          }) : n > 0 && this.props.left && this.setState({
            contentPos: Math.max(n, 0)
          }));
        }
      },
      _handlePanResponderEnd: function (t, e) {
        if (!this.props.disabled) {
          var n = e.dx,
            o = this.state.contentPos,
            s = this.state.contentWidth,
            i = this.state.btnsLeftWidth,
            r = this.state.btnsRightWidth,
            a = .33 * s,
            h = n > a || n > i / 2,
            p = -a > n || -r / 2 > n;
          if (this.state.openedRight) var p = -a > n - a;
          if (this.state.openedLeft) var h = n + a > a;
          var l = new Date().getTime() - this.state.timeStart < 200;
          if (l) var p = -a / 10 > n && !this.state.openedLeft,
            h = n > a / 10 && !this.state.openedRight;
          this.state.swiping && (p && 0 > o && 0 > n ? this._open(-r, "right") : h && o > 0 && n > 0 ? this._open(i, "left") : this._close()), this.props.scroll && this.props.scroll(!0);
        }
      },
      _tweenContent: function (t, e, n) {
        this.tweenState(t, {
          easing: a["default"].easingTypes.easeInOutQuad,
          duration: 0 === e ? 1.5 * this.state.tweenDuration : this.state.tweenDuration,
          endValue: e,
          onEnd: n ? n : function () {}
        });
      },
      _rubberBandEasing: function (t, e) {
        return 0 > t && e > t ? e - Math.pow(e - t, .85) : t > 0 && t > e ? e + Math.pow(t - e, .85) : t;
      },
      _autoClose: function (t) {
        this.state.autoClose && this._close(function () {
          var e = t.onPress;
          e && e();
        });
      },
      _open: function (t, e) {
        var n = "left" === e,
          o = this.props,
          s = o.sectionID,
          i = o.rowID,
          r = o.onOpen;
        r && r(s, i, e), this._tweenContent("contentPos", t), this.setState({
          contentPos: t,
          openedLeft: n,
          openedRight: !n,
          swiping: !1
        });
      },
      _close: function (t) {
        var e = this.props,
          n = e.sectionID,
          o = e.rowID,
          s = e.onClose;
        if (s && (this.state.openedLeft || this.state.openedRight)) {
          var i = this.state.openedRight ? "right" : "left";
          s(n, o, i);
        }
        this._tweenContent("contentPos", 0, t), this._callOnClose(), this.setState({
          openedRight: !1,
          openedLeft: !1,
          swiping: !1
        });
      },
      _callOnClose: function () {
        this.props.onClose && this.props.onClose(this.props.sectionID, this.props.rowID);
      },
      _callOnOpen: function () {
        this.props.onOpen && this.props.onOpen(this.props.sectionID, this.props.rowID), this.props.onOpenEnd && this.props.onOpenEnd(this);
      },
      _openRight: function () {
        var t = this;
        this.refs.swipeoutContent.measure(function (e, n, o, s) {
          var i = t.props.buttonWidth || o / 5;
          t.setState({
            btnWidth: i,
            btnsRightWidth: t.props.right ? i * t.props.right.length : 0
          }, function () {
            t._tweenContent("contentPos", -t.state.btnsRightWidth), t._callOnOpen(), t.setState({
              contentPos: -t.state.btnsRightWidth,
              openedLeft: !1,
              openedRight: !0,
              swiping: !1
            });
          });
        });
      },
      _openLeft: function () {
        var t = this;
        this.refs.swipeoutContent.measure(function (e, n, o, s) {
          var i = t.props.buttonWidth || o / 5;
          t.setState({
            btnWidth: i,
            btnsLeftWidth: t.props.left ? i * t.props.left.length : 0
          }, function () {
            t._tweenContent("contentPos", t.state.btnsLeftWidth), t._callOnOpen(), t.setState({
              contentPos: t.state.btnsLeftWidth,
              openedLeft: !0,
              openedRight: !1,
              swiping: !1
            });
          });
        });
      },
      render: function () {
        var t = this,
          e = this.state.contentWidth,
          n = this.getTweeningValue("contentPos"),
          o = [d["default"].swipeout, this.props.style];
        this.props.backgroundColor && o.push([{
          backgroundColor: this.props.backgroundColor
        }]);
        var s = -this.state.btnsRightWidth;
        if (n > 0) var s = this.state.btnsLeftWidth;
        var r = {
            left: {
              left: 0,
              overflow: "hidden",
              width: Math.min(s * (n / s), s)
            }
          },
          a = {
            right: {
              left: Math.abs(e + Math.max(s, n)),
              right: 0
            }
          },
          h = {
            content: {
              transform: [{
                translateX: this._rubberBandEasing(n, s)
              }]
            }
          },
          p = [d["default"].swipeoutContent];
        p.push(h.content);
        var l = [d["default"].swipeoutBtns];
        l.push(a.right);
        var u = [d["default"].swipeoutBtns];
        u.push(r.left);
        var f = 0 > n,
          g = n > 0;
        return c["default"].createElement(b.View, {
          style: o,
          onLayout: function (e) {
            return t.props.onLayout && t.props.onLayout(e);
          }
        }, c["default"].createElement(b.View, i({
          ref: "swipeoutContent",
          style: p,
          onLayout: this._onLayout
        }, this._panResponder.panHandlers), this.props.children), this._renderButtons(this.props.right, f, l), this._renderButtons(this.props.left, g, u));
      },
      _onLayout: function (t) {
        var e = t.nativeEvent.layout,
          n = e.width,
          o = e.height;
        this.setState({
          contentWidth: n,
          contentHeight: o
        });
      },
      _renderButtons: function (t, e, n) {
        return t && e ? c["default"].createElement(b.View, {
          style: n
        }, t.map(this._renderButton)) : c["default"].createElement(b.View, null);
      },
      _renderButton: function (t, e) {
        var n = this;
        return c["default"].createElement(v, {
          backgroundColor: t.backgroundColor,
          color: t.color,
          component: t.component,
          disabled: t.disabled,
          height: this.state.contentHeight,
          key: e,
          onPress: function () {
            return n._autoClose(t);
          },
          text: t.text,
          type: t.type,
          underlayColor: t.underlayColor,
          width: this.state.btnWidth
        });
      }
    });
  _.NativeButton = p["default"], _.SwipeoutButton = v, o["default"] = _;
});
