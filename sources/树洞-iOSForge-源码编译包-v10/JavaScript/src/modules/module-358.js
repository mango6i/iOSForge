// Maintenance source; recovered reference retained separately.
// Recovered module 358; analysis path, not original filename.
// Original SHA-256 4a07625d58f92eb34817e7315333e38ca5fdf6ab00a3674c08043b20df948019; original byte range [1703577, 1715147).
__d(358, function (e, t, i, s) {
  var a = t(311),
    n = babelHelpers.interopRequireDefault(a),
    o = t(312),
    r = t(314),
    c = n["default"].createClass({
      displayName: "PictureElem",
      getInitialState: function () {
        return babelHelpers["extends"](this, this.props.node), this.board = this.props.board, {
          selected: -1 !== this.board.selectPics.indexOf(this.imgId)
        };
      },
      onPicPress: function () {
        var e = this.width,
          t = this.height,
          i = this.imgId,
          s = this.rawImgId,
          a = this.rawHeight,
          n = this.rawWidth,
          o = this.rawSize,
          c = e / t;
        if (-1 !== this.board.selectPics.indexOf(this.imgId)) {
          if (e) if (this.type === r.apps.CONS_MSG_TYPE_VIDEO) {
            var l = r.apps.findAvailablePreVid(i, this),
              d = l.mseq;
            r.apps.emit("showModelImage" + d, {
              imgId: i,
              ratio: c,
              rawImgId: s,
              isVideo: !0,
              picboard: 3
            });
          } else s && (s = s + ":" + o + ":" + n + ":" + a), r.apps.emit("showModelImage", {
            imgId: i,
            ratio: c,
            rawImgId: s
          });
        } else this.select();
      },
      componentDidMount: function () {},
      render: function () {
        var e = r.theme.dashboardImageSize,
          t = r.theme.dashboardImageSize;
        return n["default"].createElement(o.TouchableOpacity, {
          style: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center"
          },
          onPress: this.onPicPress
        }, n["default"].createElement(r.CachedImage, {
          style: {
            width: e,
            height: t,
            backgroundColor: r.theme.transparent
          },
          imageId: this.imgId,
          resizeMode: "cover"
        }), this.type === r.apps.CONS_MSG_TYPE_VIDEO ? n["default"].createElement(o.View, {
          style: {
            position: "absolute",
            top: 3,
            left: 3,
            alignItems: "center",
            justifyContent: "center",
            width: e,
            height: t
          }
        }, n["default"].createElement(o.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            width: e / 2,
            alignItems: "center",
            justifyContent: "center",
            height: t / 2,
            borderRadius: e / 4,
            borderWidth: 3,
            borderColor: r.theme.whiteTrans6
          }
        }, n["default"].createElement(r.Ionicons, {
          style: ["ios" === o.Platform.OS ? {
            paddingLeft: 5
          } : {
            marginLeft: 5
          }],
          name: "md-play",
          size: 23,
          color: r.theme.whiteTrans6
        }))) : null, n["default"].createElement(o.View, {
          style: {
            position: "absolute",
            left: 3,
            top: t - 17,
            width: e,
            height: 20,
            backgroundColor: r.theme.transparent,
            justifyContent: "center",
            alignItems: "flex-end"
          }
        }, n["default"].createElement(o.View, {
          style: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderTopLeftRadius: 10,
            marginRight: 0,
            backgroundColor: "rgba(0,0,0,0.2)"
          }
        }, n["default"].createElement(o.Text, {
          style: {
            fontSize: 12,
            color: r.theme.white
          }
        }, r.apps.calcRawSize(this.size)))), "gif" === this.rawExt ? n["default"].createElement(o.View, {
          style: {
            position: "absolute",
            top: 3,
            left: 3,
            alignItems: "center",
            justifyContent: "center",
            width: e,
            height: t
          }
        }, n["default"].createElement(o.View, {
          style: {
            backgroundColor: "rgba(0,0,0,0.2)",
            width: e / 2,
            alignItems: "center",
            justifyContent: "center",
            height: e / 2,
            borderRadius: e / 4,
            borderWidth: 3,
            borderColor: r.theme.whiteTrans6
          }
        }, n["default"].createElement(o.Text, {
          style: {
            color: r.theme.whiteTrans6,
            fontSize: 20
          }
        }, "GIF"))) : null, this.renderSelectedMark());
      },
      select: function () {
        var e = this;
        -1 === this.board.selectPics.indexOf(this.imgId) && (this.board.selectPics.push(this.imgId), this.board.selectNodes.push(this.props.node)), this.board.selectPicsDeselectCallbacks[this.imgId] = function () {
          return e.deselect();
        }, this.props.onSelectedPicsChanged(this.board.selectPics.length), this.setState({
          selected: !0
        });
      },
      deselect: function () {
        var e = this;
        this.board.selectPics = this.board.selectPics.filter(function (t) {
          return t !== e.imgId;
        }), this.board.selectNodes = this.board.selectNodes.filter(function (t) {
          return t.imgId !== e.imgId;
        }), delete this.board.selectPicsDeselectCallbacks[this.imgId], this.props.onSelectedPicsChanged(this.board.selectPics.length), this.setState({
          selected: !1
        });
      },
      componentWillMount: function () {
        this.state.selected && this.select();
      },
      componentWillUnmount: function () {},
      renderSelectedMark: function () {
        var e = this;
        return this.state.selected ? n["default"].createElement(o.TouchableOpacity, {
          onPress: function () {
            return e.deselect();
          },
          style: {
            position: "absolute",
            right: 3,
            top: r.theme.dashboardImageSize - 23,
            width: 26,
            height: 26,
            backgroundColor: r.theme.transparent
          }
        }, n["default"].createElement(o.View, {
          style: {
            position: "absolute",
            right: 1,
            top: 8,
            width: 16,
            height: 16,
            backgroundColor: r.theme.light,
            borderRadius: 8
          }
        }), n["default"].createElement(r.FontAwesome, {
          style: {
            position: "absolute",
            right: -2,
            top: 4,
            width: 22,
            height: 22,
            backgroundColor: r.theme.transparent
          },
          name: "check-circle",
          size: 23,
          color: r.theme.deepGreen
        })) : void 0;
      }
    });
  s.CloudRepoPicBoard = n["default"].createClass({
    displayName: "CloudRepoPicBoard",
    getInitialState: function () {
      this.ownerId = r.apps.userid;
      this.cloudClosed = false;
      return this.loadingLock = !1, this.assets = [], this.dataMap = {}, this.noMore = !1, this.selectPicsDeselectCallbacks = {}, this.selectPics = [], this.selectNodes = [], this.fetchParams = {
        limit: r.apps.picBoardFetchLimit,
        time: Date.now()
      }, this.sortType = 1, {
        step: "select",
        picSelectedNum: 0,
        loadError: "",
        deleting: false,
        interActionFinished: !1,
        dataSource: new o.ListView.DataSource({
          rowHasChanged: this.rowHasChanged
        })
      };
    },
    rowHasChanged: function (e, t) {
      if (e !== t || e.length !== t.length) return !0;
      for (var i = 0; i < e.length; i++) if (e[i] !== t[i]) return !0;
      return !1;
    },
    renderImage: function (e) {
      return e ? n["default"].createElement(c, {
        key: e.imgId,
        node: e,
        board: this,
        onSelectedPicsChanged: this.onSelectedPicsChanged
      }) : n["default"].createElement(o.View, {
        style: {
          flex: 1
        }
      });
    },
    renderRow: function (e) {
      return n["default"].createElement(o.View, {
        style: {
          flexDirection: "row",
          justifyContent: "flex-start",
          paddingHorizontal: 3,
          height: r.theme.dashboardImageSize + 6
        }
      }, this.renderImage(e[0]), this.renderImage(e[1]), this.renderImage(e[2]));
    },
    onSelectedPicsChanged: function (e) {
      this.setState({
        picSelectedNum: e
      });
    },
    componentWillUnmount: function () {
      this.cloudClosed = true;
      if (this.cloudDeleteCancel) this.cloudDeleteCancel();
      r.apps.unon("recoveryCloudRefresh", this.refreshCloud);
      this.assets = [], this.dataMap = {}, this.fetchParams = {}, this.noMore = !1, this.loadingLock = !1, r.apps.picBoardCachedImages = [], r.apps.unon("cloudRepoViewLoaded", this.onViewLoad), r.apps.unon("picBoardFetchMore", this.fetchImages);
    },
    componentWillMount: function () {
      r.apps.on("recoveryCloudRefresh", this.refreshCloud);
      r.apps.picBoardCachedImages = [], r.apps.on("cloudRepoViewLoaded", this.onViewLoad), r.apps.on("picBoardFetchMore", this.fetchImages);
    },
    onViewLoad: function () {
      this.fetchImages();
    },
    refreshCloud: function () { this.resetSort(this.sortType); },
    fetchImages: function () {
      var e = this;
      if (!this.loadingLock && !this.noMore) {
        this.loadingLock = !0;
        var t = this.fetchParams;
        this.setState({
          loadError: ""
        });
      return this.cloudRequest("fetchMoreCloudRepo", Object.assign({}, t)).then(function (i) {
          if (!e.cloudClosed && e.ownerId === r.apps.userid && t === e.fetchParams) {
            e.loadingLock = false;
            var s = i.data,
              a = i.end;
            if (!Array.isArray(s)) throw new Error("云文件列表返回异常，请重试");
            if (!s.length) a = true;
            e.setState({
              interActionFinished: true
            });
            a && (e.noMore = !0, e.setState({
              interActionFinished: !0
            })), s.length > 0 && (t.time ? t.time = s[s.length - 1].time : t.size = s[s.length - 1].size, s.forEach(function (t) {
              r.apps.picBoardCachedImages.push(t), e.dataMap[t.time] = t;
            }), e.setState({
              interActionFinished: !0,
              dataSource: e.state.dataSource.cloneWithRows(e.groupByEveryN(e.assets, s, 3).slice())
            }));
          }
        })["catch"](function (error) {
          if (!e.cloudClosed && e.ownerId === r.apps.userid && t === e.fetchParams) {
            e.loadingLock = false;
            e.setState({
              interActionFinished: true,
              loadError: error.message || "云文件加载失败，点击重试"
            });
          }
        });
      }
    },
    cloudRequest: function (name, params) {
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          reject(new Error("服务器响应超时，请稍后重试"));
        }, 20000);
        Promise.resolve().then(function () {
          return r.apps.send(name, params);
        }).then(function (result) {
          clearTimeout(timer);
          resolve(result);
        }, function (error) {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error("服务器请求失败，请稍后重试"));
        });
      });
    },
    resetSort: function (sort) {
      if (this.state.deleting) {
        r.apps.tip("正在删除，请稍候");
        return;
      }
      this.sortType = sort;
      this.assets = [];
      this.dataMap = {};
      this.selectNodes = [];
      this.selectPics = [];
      this.selectPicsDeselectCallbacks = {};
      this.fetchParams = {
        limit: r.apps.picBoardFetchLimit
      };
      if (sort < 3) this.fetchParams.time = sort === 1 ? Date.now() : 1;else this.fetchParams.size = sort === 3 ? 1099511627776 : 1;
      if (sort === 2 || sort === 4) this.fetchParams.asc = 1;
      this.noMore = false;
      this.loadingLock = false;
      r.apps.picBoardCachedImages = [];
      if (this.listViewRef) this.listViewRef.scrollTo({
        y: 0
      });
      this.setState({
        picSelectedNum: 0,
        loadError: "",
        dataSource: this.state.dataSource.cloneWithRows([])
      }, this.fetchImages);
    },
    deleteSelected: function (dialog) {
      var self = this,
        selected = this.selectNodes.slice(),
        identity = r.apps.userid;
      if (this.state.deleting || !selected.length) return;
      if (identity !== this.ownerId) {
        r.apps.tip("账号已切换，请重新打开云文件");
        return;
      }
      dialog.progressing(true);
      this.setState({
        deleting: true
      });
      var complete, cancel, timer;
      var finished = new Promise(function (resolve, reject) {
        complete = resolve;
        cancel = function () {
          reject(new Error("删除结果未确认，请刷新云文件后查看"));
        };
        timer = setTimeout(cancel, 20000);
      });
      this.cloudDeleteCancel = cancel;
      r.apps.on("deleteCloudReposFinished", complete);
      return Promise.all([finished, this.cloudRequest("deleteCloudRepos", {
        dels: selected.map(function (item) {
          return item.time;
        })
      })]).then(function () {
        if (self.cloudClosed || r.apps.userid !== identity) return;
        var size = 0;
        selected.forEach(function (item) {
          size += Number(item.size) || 0;
          delete self.dataMap[item.time];
        });
        var items = Object.keys(self.dataMap).map(function (key) {
          return self.dataMap[key];
        });
        items.sort(function (a, b) {
          return self.sortType === 1 ? b.time - a.time : self.sortType === 2 ? a.time - b.time : self.sortType === 3 ? b.size - a.size : a.size - b.size;
        });
        self.assets = [];
        self.selectNodes = [];
        self.selectPics = [];
        self.selectPicsDeselectCallbacks = {};
        r.apps.picBoardCachedImages = items.slice();
        self.setState({
          picSelectedNum: 0,
          dataSource: self.state.dataSource.cloneWithRows(self.groupByEveryN(self.assets, items, 3).slice())
        });
        r.apps.cloudRepoSize = Math.max(0, (Number(r.apps.cloudRepoSize) || 0) - size);
        r.dbs.setUserProfile({
          cloudRepoSize: r.apps.cloudRepoSize
        })["catch"](function (error) {
          (0, r.tlog)("error", "setCloudRepoSize", error);
        });
        if (r.apps.onChangeCloudRepoSize) r.apps.onChangeCloudRepoSize();
        r.apps.closeDiag();
        r.apps.tip("云文件已删除");
      }).catch(function (error) {
        if (!self.cloudClosed && r.apps.userid === identity) {
          dialog.progressing(false);
          dialog.setState({
            infoTip: error.message || "删除失败，请稍后重试"
          });
        }
      }).then(function () {
        clearTimeout(timer);
        r.apps.unon("deleteCloudReposFinished", complete);
        self.cloudDeleteCancel = null;
        if (!self.cloudClosed) self.setState({
          deleting: false
        });
      });
    },
    groupByEveryN: function (e, t, i) {
      var s = [],
        a = [],
        n = e[e.length - 1];
      if (n) {
        var o = i - n.length;
        if (o > 0) {
          var r = t.slice(0, o);
          t = t.slice(o), n = n.concat(r), e[e.length - 1] = n;
        }
      }
      for (var c = 0; c < t.length; ++c) c > 0 && c % i === 0 && (s.push(a), a = []), a.push(t[c]);
      return a.length > 0 && s.push(a), e.push.apply(e, s), e;
    },
    onEndReached: function () {
      this.noMore || this.state.loadError || this.fetchImages();
    },
    renderFooterSpinner: function () {
      if (this.state.loadError) return n["default"].createElement(o.TouchableOpacity, {
        onPress: this.fetchImages,
        style: {
          padding: 20
        }
      }, n["default"].createElement(o.Text, {
        style: {
          color: r.theme.deep9,
          textAlign: "center"
        }
      }, this.state.loadError + "\n点击重试"));
      if (!this.assets.length) return n["default"].createElement(o.Text, {
        style: {
          padding: 24,
          color: r.theme.deep9,
          textAlign: "center"
        }
      }, "暂无云文件");
      return this.noMore || 0 === this.assets.length ? null : "android" === o.Platform.OS ? n["default"].createElement(o.ProgressBarAndroid, {
        style: {
          height: 30
        },
        styleAttr: "Inverse"
      }) : n["default"].createElement(o.ActivityIndicatorIOS, {
        animating: !0,
        size: "small"
      });
    },
    render: function () {
      var e = this,
        t = r.theme.winHeight - r.theme.statusHeight,
        bottomInset = r.theme.isIphoneX ? r.theme.iphoneXDiff || 24 : 0;
      return n["default"].createElement(o.View, {
        style: {
          height: t,
          justifyContent: "center",
          paddingTop: 3,
          paddingBottom: 3,
          backgroundColor: r.theme.deepTrans8
        }
      }, n["default"].createElement(o.View, {
        style: {
          height: r.theme.navHeight
        }
      }), n["default"].createElement(r.BackgroundImageView, {
        shouldRender: !0,
        userid: r.apps.userid,
        maskColor: r.theme.lightLessTrans6
      }), this.state.interActionFinished ? n["default"].createElement(o.ListView, {
        ref: function (t) {
          return e.listViewRef = t;
        },
        renderRow: this.renderRow,
        renderFooter: this.renderFooterSpinner,
        onEndReached: this.onEndReached,
        enableEmptySections: true,
        style: {
          marginBottom: 36 + bottomInset
        },
        dataSource: this.state.dataSource,
        removeClippedSubviews: !0,
        onEndReachedThreshold: 2e3,
        onScroll: function (t) {
          var i = t.nativeEvent,
            s = i.contentSize,
            a = i.layoutMeasurement,
            n = i.contentOffset;
          n.y + a.height >= s.height - 36 && (e.noMore || e.state.loadError || e.fetchImages());
        }
      }) : n["default"].createElement(r.InterActionSpinner, {
        up: 60,
        shouldSpin: !0
      }), n["default"].createElement(o.View, {
        style: {
          position: "absolute",
          bottom: bottomInset,
          left: 0,
          height: 30,
          width: r.theme.winWidth,
          backgroundColor: r.theme.deepTrans9,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center"
        }
      }, n["default"].createElement(o.TouchableOpacity, {
        style: {
          justifyContent: "center",
          alignItems: "center",
          marginLeft: 5,
          width: 30,
          height: 30
        },
        onPress: function () {
          r.apps.emit("contextMenu", [[(0, r.tr)("Sort by time \u2193"), function () {
            r.apps.emit("closeContextMenu", function () {
              e.resetSort(1);
            });
          }], [(0, r.tr)("Sort by time \u2191"), function () {
            r.apps.emit("closeContextMenu", function () {
              e.resetSort(2);
            });
          }], [(0, r.tr)("Sort by size \u2193"), function () {
            r.apps.emit("closeContextMenu", function () {
              e.resetSort(3);
            });
          }], [(0, r.tr)("Sort by size \u2191"), function () {
            r.apps.emit("closeContextMenu", function () {
              e.resetSort(4);
            });
          }]]);
        }
      }, n["default"].createElement(r.Ionicons, {
        name: "ios-menu-outline",
        size: 27,
        color: r.theme.deep9
      })), this.state.picSelectedNum ? n["default"].createElement(o.TouchableOpacity, {
        style: {
          height: 30,
          paddingHorizontal: 10,
          justifyContent: "center",
          alignItems: "center"
        },
        onPress: function () {
          r.apps.diag({
            header: (0, r.tr)("Delete"),
            content: (0, r.tr)("Do you want to delete all selected items from cloud ?"),
            buttons: [{
              text: (0, r.tr)("Cancel"),
              onPress: function (dialog) {
                if (!dialog || !dialog.isProgressing) r.apps.closeDiag();
              }
            }, {
              text: (0, r.tr)("Ok"),
              onPress: function (dialog) {
                return e.deleteSelected(dialog);
              }
            }]
          });
        }
      }, n["default"].createElement(r.Ionicons, {
        name: "ios-trash-outline",
        size: 27,
        color: r.theme.deep9
      })) : n["default"].createElement(o.View, {
        style: {
          height: 30,
          width: 30
        }
      }), this.state.picSelectedNum ? n["default"].createElement(o.TouchableOpacity, {
        style: {
          height: 30,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 8
        },
        onPress: function () {
          var t = e.selectPics[e.selectPics.length - 1];
          e.selectPicsDeselectCallbacks[t]();
        }
      }, n["default"].createElement(o.View, {
        style: {
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 10,
          backgroundColor: r.theme.deepGreen,
          width: 20,
          height: 20
        }
      }, n["default"].createElement(o.Text, {
        style: {
          color: r.theme.white,
          fontSize: 12
        }
      }, this.state.picSelectedNum))) : n["default"].createElement(o.View, {
        style: {
          height: 30,
          width: 30
        }
      })));
    }
  });
});
