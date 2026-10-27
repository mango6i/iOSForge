// Recovered module 345; analysis path, not original filename.
// Original SHA-256 8c3ece0d54d0e54a0b663b857983deda4a38b5bb445f53e1e71a730fa2825059; original byte range [1575704, 1579319).
__d(345, function (e, t, a, n) {
  var r = t(311),
    i = babelHelpers.interopRequireDefault(r),
    o = t(312),
    s = t(314),
    h = !1,
    l = i["default"].createClass({
      displayName: "PictureElem",
      render: function () {
        var e = this.props.node;
        if (!e) return null;
        var t = e.image.uri + ";" + e.size;
        return i["default"].createElement(o.TouchableOpacity, {
          onPress: function () {
            h || (h = !0, s.apps.pauseSerialTask("loadingPhotoThumb"), s.ImagePickerManager.pickFromUri(e.image.uri, {
              maxHeight: 1280,
              maxWidth: 1280,
              thumbW: 120,
              thumbH: 120,
              quality: .6,
              noData: !1,
              storageOptions: {
                skipBackup: !0
              }
            }, function (e) {
              h = !1, s.apps.continueSerialTask("loadingPhotoThumb"), e.didCancel || (s.apps.notCloseImagePickerDiag = !0, s.apps.curNavigator.navi.navBack(), s.apps.emitOnce("imagePicked", e));
            }));
          },
          style: {
            paddingLeft: 6,
            alignItems: "center",
            justifyContent: "center"
          }
        }, i["default"].createElement(s.CachedImage, {
          videoUri: t,
          isPhoto: !0,
          style: {
            width: s.theme.dashboardImageSize,
            height: s.theme.dashboardImageSize,
            backgroundColor: s.theme.transparent
          },
          resizeMode: "cover"
        }));
      }
    });
  n.MemTest = i["default"].createClass({
    displayName: "MemTest",
    getInitialState: function () {
      return this.loadingLock = !1, this.lastCursor = null, this.assets = [], this.noMore = !1, this.options = o.CameraRoll.GroupTypesOptions, {
        step: "select",
        dataSource: new o.ListView.DataSource({
          rowHasChanged: this.rowHasChanged
        })
      };
    },
    rowHasChanged: function (e, t) {
      if (e.length !== t.length) return !0;
      for (var a = 0; a < e.length; a++) if (e[a] !== t[a]) return !0;
      return !1;
    },
    renderImage: function (e) {
      return i["default"].createElement(l, {
        node: e
      });
    },
    renderRow: function (e) {
      return i["default"].createElement(o.View, {
        style: {
          overflow: "hidden",
          flexDirection: "row",
          height: s.theme.dashboardImageSize + 6,
          justifyContent: "flex-start"
        }
      }, this.renderImage(e[0]), this.renderImage(e[1]), this.renderImage(e[2]));
    },
    componentDidMount: function () {
      this.fetchImages();
    },
    fetchImages: function () {
      var e = this;
      if (!this.loadingLock) {
        this.loadingLock = !0;
        var t = {
          first: 9,
          assetType: "Photos",
          groupTypes: "SavedPhotos"
        };
        "android" === o.Platform.OS && delete t.groupTypes, this.lastCursor && (t.after = this.lastCursor);
        var a = t;
        o.CameraRoll.getPhotos(t).then(function (n) {
          if (e.loadingLock = !1, a === t) {
            var r = n.edges;
            if (n.page_info.has_next_page || (e.noMore = !0), r.length > 0) {
              e.lastCursor = n.page_info.end_cursor;
              var i = [];
              n.edges.forEach(function (e) {
                var t = e.node.image,
                  a = t.width,
                  n = t.height;
                e.node.size || (e.node.size = 1), n > 0 && a > 0 && i.push(e.node);
              }), e.setState({
                dataSource: e.state.dataSource.cloneWithRows(s.util.groupByEveryNewN(e.assets, i, 3).slice())
              });
            }
          }
        })["catch"](function (e) {
          console.error(e);
        });
      }
    },
    renderFooterSpinner: function () {
      return this.noMore || 0 === this.assets.length ? null : "android" === o.Platform.OS ? i["default"].createElement(o.ProgressBarAndroid, {
        style: {
          height: 30
        },
        styleAttr: "Inverse"
      }) : i["default"].createElement(o.ActivityIndicatorIOS, {
        animating: !0,
        size: "small"
      });
    },
    onEndReached: function () {
      this.noMore || this.fetchImages();
    },
    render: function () {
      var e = this;
      return i["default"].createElement(o.View, {
        style: {
          flex: 1,
          height: s.theme.winHeight
        }
      }, i["default"].createElement(o.View, {
        style: {
          height: s.theme.navHeight
        }
      }), i["default"].createElement(s.BackgroundImageView, {
        shouldRender: !0,
        maskColor: s.theme.lightLessTrans6
      }), i["default"].createElement(o.ListView, {
        ref: function (t) {
          return e.listViewRef = t;
        },
        renderRow: this.renderRow,
        renderHeader: function () {
          return i["default"].createElement(o.View, {
            style: {
              height: 8
            }
          });
        },
        renderFooter: this.renderFooterSpinner,
        onEndReached: this.onEndReached,
        dataSource: this.state.dataSource,
        removeClippedSubviews: !0,
        onEndReachedThreshold: 2 * s.theme.winHeight,
        initialListSize: 10,
        pageSize: 10,
        onScroll: function (t) {
          var a = t.nativeEvent,
            n = a.contentSize,
            r = a.layoutMeasurement,
            i = a.contentOffset;
          i.y + r.height >= n.height - 36 && (e.noMore || e.fetchImages());
        }
      }));
    }
  });
});
