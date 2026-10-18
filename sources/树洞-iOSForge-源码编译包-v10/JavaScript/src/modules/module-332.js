// Recovered module 332; analysis path, not original filename.
// Original SHA-256 ae9e974dbe80f1bee0e69abbe91e3428dba9164f26cdc2b2752937ae70ba3a31; original byte range [1346265, 1355342).
__d(332, function (e, t, i, n) {
  var o = t(311),
    a = babelHelpers.interopRequireDefault(o),
    s = t(312),
    r = t(314),
    d = a["default"].createClass({
      displayName: "GifTouchView",
      getInitialState: function () {
        var e = this.props.gif,
          t = e.dims[1] / e.dims[0],
          i = r.theme.winWidth / 3,
          n = i * t;
        return {
          gif: e,
          width: i,
          height: n,
          selected: !1,
          deleting: !1
        };
      },
      onSideEmoGifLongPressed: function () {
        var e = this;
        r.apps.isGifFavor(this.state.gif.url).then(function (t) {
          t && (r.apps.emitOnce("sideEmoGifSelected", !1), r.apps.gifSideEmoGifData = {
            uri: e.state.gif.url,
            width: e.state.gif.dims[0],
            height: e.state.gif.dims[1],
            size: e.state.gif.size
          }, r.apps.on("sideEmoGifSelected", e.onSideEmoGifSelected), e.setState({
            selected: !0,
            deleting: !0
          }));
        });
      },
      onSideEmoGifPressed: function () {
        var e = this.state.gif.url,
          t = this.state.gif.dims[0],
          i = this.state.gif.dims[1],
          n = this.state.gif.size;
        r.apps.gifSideEmoGifData && r.apps.gifSideEmoGifData.uri === e ? this.state.deleting ? r.apps.deleteGifFavor(e).then(function () {
          r.apps.webServiceGifData = r.apps.webServiceGifData.filter(function (t) {
            return t.url !== e;
          }), r.apps.sideEmoViewRef && r.apps.sideEmoViewRef.onWebServiceGifDataReady();
        }) : (r.apps.myInputViewRef.refs.inputView.onSendPress(), "favor" === r.apps.webServiceGifType && r.apps.addGifToFavor(e, t, i, n)) : (r.apps.emitOnce("sideEmoGifSelected", !1), r.apps.gifSideEmoGifData = {
          uri: e,
          width: t,
          height: i,
          size: n
        }, this.setState({
          selected: !0
        }), r.apps.on("sideEmoGifSelected", this.onSideEmoGifSelected));
      },
      renderSelectedMark: function () {
        return this.state.selected ? a["default"].createElement(s.View, {
          style: {
            position: "absolute",
            right: 0,
            top: 0,
            left: 0,
            bottom: 0,
            backgroundColor: r.theme.deepTrans8,
            justifyContent: "center",
            alignItems: "center"
          }
        }, a["default"].createElement(r.Ionicons, {
          name: this.state.deleting ? "ios-close-circle" : "md-send",
          size: 30,
          color: this.state.deleting ? r.theme.warn : r.theme.deepGreen2
        })) : void 0;
      },
      onSideEmoGifSelected: function (e) {
        e || (r.apps.gifSideEmoGifData = null, this.setState({
          selected: !1,
          deleting: !1
        }));
      },
      componentWillReceiveProps: function (e) {
        if (e.gif.url !== this.state.gif.url) {
          var t = e.gif,
            i = t.dims[1] / t.dims[0],
            n = r.theme.winWidth / 3,
            o = n * i;
          this.setState({
            gif: t,
            width: n,
            height: o,
            selected: !1,
            deleting: !1
          });
        }
      },
      render: function () {
        var e = this,
          t = this.state,
          i = t.width,
          n = t.height,
          o = this.state.gif.url,
          d = o.match(/^https:\/\/media.tenor.com\/images\/([0-9a-f]{32})\/tenor.gif/);
        if (d) var h = "/tenor/" + d[1].slice(-2) + "/" + d[1] + ".gif";else {
          var l = o.split(":");
          if (2 === l.length) {
            h = l[1];
            var c = l[0];
          } else h = l[0];
        }
        return a["default"].createElement(s.TouchableOpacity, {
          style: {
            overflow: "hidden",
            backgroundColor: r.theme.transparent,
            marginTop: 2,
            width: i,
            height: n,
            justifyContent: "center",
            alignItems: "center"
          },
          onPress: function () {
            return e.onSideEmoGifPressed();
          },
          onLongPress: function () {
            return e.onSideEmoGifLongPressed();
          }
        }, d ? r.apps.tenorOutSrc ? a["default"].createElement(r.CachedImage, {
          outSrc: o,
          style: {
            width: i,
            height: n
          }
        }) : a["default"].createElement(r.CachedImage, {
          emotion: h,
          style: {
            width: i,
            height: n
          }
        }) : a["default"].createElement(r.CachedImage, {
          imageId: h,
          style: {
            width: i,
            height: n
          }
        }), c ? a["default"].createElement(s.View, {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            width: i,
            height: n
          }
        }, a["default"].createElement(s.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            width: i / 2.5,
            alignItems: "center",
            justifyContent: "center",
            height: i / 2.5,
            borderRadius: i / 5,
            borderWidth: 3,
            borderColor: r.theme.whiteTrans6
          }
        }, a["default"].createElement(s.Text, {
          style: {
            color: r.theme.whiteTrans6,
            fontSize: 20
          }
        }, "GIF"))) : null, this.renderSelectedMark());
      }
    });
  n.SideEmoSuggestionView = a["default"].createClass({
    displayName: "SideEmoSuggestionView",
    getInitialState: function () {
      return {
        hide: !0,
        dataSource: new s.ListView.DataSource({
          rowHasChanged: function (e, t) {
            return e !== t;
          }
        })
      };
    },
    webServiceGifAutoCompleteChanged: function (e) {
      this.listViewRef && this.listViewRef.scrollTo({
        y: 0,
        animated: !1
      }), this.setState({
        dataSource: this.state.dataSource.cloneWithRows(r.apps.webGifAutoCompleteResults.slice()),
        hide: e
      });
    },
    componentDidMount: function () {
      r.apps.on("webServiceGifAutoCompleteChanged", this.webServiceGifAutoCompleteChanged);
    },
    componentWillUnmount: function () {
      r.apps.unon("webServiceGifAutoCompleteChanged", this.webServiceGifAutoCompleteChanged);
    },
    onPressRow: function (e) {
      r.apps.emit("sideEmoGifAutoCompleteSelected", e);
    },
    renderRow: function (e) {
      var t = this;
      return "string" == typeof e ? a["default"].createElement(s.TouchableOpacity, {
        style: {
          paddingVertical: 3,
          paddingHorizontal: 5,
          marginTop: 1,
          backgroundColor: r.theme.SideEmoSuggestion
        },
        onPress: function () {
          return t.onPressRow(e);
        }
      }, a["default"].createElement(s.Text, {
        style: {
          fontSize: 15,
          color: r.theme.deep6
        }
      }, e)) : a["default"].createElement(s.TouchableOpacity, {
        style: {
          flexDirection: "row",
          paddingVertical: 3,
          paddingHorizontal: 5,
          marginTop: 1,
          backgroundColor: r.theme.SideEmoSuggestion
        },
        onPress: function () {
          return t.onPressRow(e);
        }
      }, a["default"].createElement(s.Text, {
        style: {
          fontSize: 15,
          color: "#8DB6CD"
        }
      }, e.text));
    },
    render: function () {
      var e = this;
      return !this.state.hide && r.apps.sideEmoViewRef && r.apps.sideEmoViewRef.isShown && r.apps.webGifAutoCompleteResults.length ? a["default"].createElement(s.View, {
        style: {
          position: "absolute",
          backgroundColor: r.theme.sideEmoPanel,
          borderRadius: 3,
          bottom: r.apps.sideEmoViewRef.panelHeight + r.theme.chatTextInputHeight + 1 + (r.theme.isIphoneX ? 24 : 0),
          left: 1,
          paddingVertical: 5,
          paddingHorizontal: 3,
          width: r.theme.winWidth / 3,
          height: r.apps.sideEmoViewRef.maxHeight - r.apps.sideEmoViewRef.panelHeight - r.apps.statusBarDiff
        }
      }, a["default"].createElement(s.ListView, {
        style: {
          backgroundColor: r.theme.transparent
        },
        ref: function (t) {
          return e.listViewRef = t;
        },
        initialListSize: 10,
        pageSize: 10,
        scrollsToTop: !1,
        renderRow: this.renderRow,
        dataSource: this.state.dataSource,
        renderScrollComponent: function (e) {
          return a["default"].createElement(r.InvertibleScrollView, babelHelpers["extends"]({}, e, {
            inverted: !0
          }));
        }
      })) : null;
    }
  }), n.SideEmoView = a["default"].createClass({
    displayName: "SideEmoView",
    getInitialState: function () {
      return this.isShown = !1, this.buttonAction = !1, this.maxHeight = r.theme.winHeight - r.theme.navHeight - r.theme.statusHeightAll - r.theme.chatTextInputHeight, this.panelHeight = 0, {
        height: 0,
        top: r.theme.navHeight + r.theme.winHeight,
        dataSource: new s.ListView.DataSource({
          rowHasChanged: function (e, t) {
            return e !== t;
          }
        })
      };
    },
    onWebServiceGifDataReady: function (e) {
      this.isShown && (e || this.setState({
        dataSource: this.state.dataSource.cloneWithRows(r.apps.webServiceGifData.slice())
      }, function () {}));
    },
    onScroll: function (e) {
      this.scrollOffset = e.nativeEvent.contentOffset;
    },
    onSideEmoButtonPressed: function (e) {
      this.buttonAction = !0, r.apps.isKeyboardShow && (e ? this.showSideEmo() : this.hideSideEmo());
    },
    showSideEmo: function () {
      this.buttonAction && (this.isShown = !0), this.buttonAction = !1, this.isShown && (r.apps.emit("toggleEmo", !1), r.apps.emit("changeSideEmoButton", !0), this.setState({
        height: this.maxHeight - this.panelHeight - r.apps.statusBarDiff,
        top: r.theme.navHeight
      }), r.apps.fetchWebServiceGifData({
        reopen: !0
      }), r.apps.fetchWebServiceGifAutocomplete({
        type: "tenor",
        reopen: !0
      }));
    },
    hideSideEmo: function (e) {
      if (this.buttonAction = !1, 0 !== this.state.height) {
        this.isShown = !1, r.apps.emit("changeSideEmoButton", !1), r.apps.emitOnce("sideEmoGifSelected", !1), r.apps.emit("selectedPicturesChanged", r.apps.selectedImageUris.length);
        var t = {
          top: r.theme.navHeight + r.theme.winHeight
        };
        r.apps.emit("webServiceGifAutoCompleteChanged", !0), e && (t.height = 0, t.dataSource = this.state.dataSource.cloneWithRows([])), this.setState(t), r.apps.fetchWebServiceGifAutocomplete({
          type: "tenor",
          q: ""
        });
      }
    },
    reset: function (e) {
      this.setState({
        dataSource: this.state.dataSource.cloneWithRows([])
      }, function () {
        return e();
      });
    },
    onKeyboardWillShow: function (e) {
      this.panelHeight = e.endCoordinates ? e.endCoordinates.height : e.end.height, r.theme.isIphoneX && (this.panelHeight -= r.theme.iphoneXDiff), this.showSideEmo();
    },
    onKeyboardWillHide: function () {
      this.panelHeight = 0, this.hideSideEmo(!0);
    },
    componentDidMount: function () {
      r.apps.on("keyboardShow", this.onKeyboardWillShow), r.apps.on("keyboardHide", this.onKeyboardWillHide), r.apps.on("sideEmoButtonPressed", this.onSideEmoButtonPressed), r.apps.on("webServiceGifDataReady", this.onWebServiceGifDataReady);
    },
    componentWillUnmount: function () {
      r.apps.unon("keyboardShow", this.onKeyboardWillShow), r.apps.unon("keyboardHide", this.onKeyboardWillHide), r.apps.unon("sideEmoButtonPressed", this.onSideEmoButtonPressed), r.apps.unon("webServiceGifDataReady", this.onWebServiceGifDataReady);
    },
    onEndReached: function () {
      this.isShown && r.apps.fetchWebServiceGifData({});
    },
    renderRow: function (e) {
      var t = e.tinygif || e;
      return a["default"].createElement(d, {
        gif: t
      });
    },
    render: function () {
      return a["default"].createElement(s.View, {
        style: [{
          position: "absolute",
          right: 0,
          paddingHorizontal: 3,
          top: this.state.top,
          width: r.theme.winWidth / 3
        }, {
          backgroundColor: r.theme.SideEmoBg,
          height: this.state.height
        }]
      }, this.state.height ? a["default"].createElement(s.ListView, {
        style: {
          backgroundColor: r.theme.transparent
        },
        ref: function (e) {
          return r.apps.sideEmoListView = e;
        },
        initialListSize: 10,
        pageSize: 10,
        removeClippedSubviews: !0,
        scrollsToTop: !1,
        renderRow: this.renderRow,
        onEndReached: this.onEndReached,
        onScroll: this.onScroll,
        dataSource: this.state.dataSource,
        scrollRenderAheadDistance: r.theme.winHeight,
        renderScrollComponent: function (e) {
          return a["default"].createElement(r.InvertibleScrollView, babelHelpers["extends"]({}, e, {
            inverted: !0
          }));
        }
      }) : null);
    }
  });
});
