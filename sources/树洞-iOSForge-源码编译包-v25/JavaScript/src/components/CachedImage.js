// Recovered module 327; analysis path, not original filename.
// Original SHA-256 c7bf2c11872b3cc394279a60194b69515b294ba9b51a22349175af3dc07e7718; original byte range [1293844, 1312579).
__d(327, function (e, t, o, a) {
  Object.defineProperty(a, "__esModule", {
    value: !0
  }), a.CachedImage = a.cacheImage = void 0;
  var i = t(311),
    r = babelHelpers.interopRequireDefault(i),
    s = t(312),
    n = t(314);
  a.cacheImage = function (e) {
    var t = e.imageId,
      o = e.localUri,
      a = e.size,
      i = e.isVideoThumb;
    return new Promise(function (e, r) {
      if (!t) return void (0, n.tlog)("error", "cacheImage imageId undefined");
      o = o.replace(/^file:\/\//, "");
      var s = n.apps.getImageIdSubDir(t);
      s = n.fs.DocumentDirectoryPath + "/cachedImages/" + s;
      var d = s + "/" + t;
      n.fs.exists(s).then(function (e) {
        return e ? void 0 : n.fs.mkdir(s, !0);
      }).then(function () {
        return n.dbs.isCachedImageExist(t, d);
      }).then(function (e) {
        return e ? Promise.reject("cacheImage image filepath[" + d + "] already exists") : (i ? n.fs.copyFile : n.fs.moveFile)(o, d);
      }).then(function () {
        return n.apps.setImageUriCache(t, d), n.dbs.addCachedImage(t, d, a);
      }).then(function () {
        n.apps.emitOnce("imageMoved_" + t, d, a), delete n.apps.imageIsMoving[t], e("file://" + d);
      })["catch"](function (e) {
        n.apps.unon("imageMoved_" + t), r(), (0, n.terr)("cacheImage", e);
      });
    });
  }, a.CachedImage = r["default"].createClass({
    displayName: "CachedImage",
    getDefaultProps: function () {
      return {
        spinnerSize: 33,
        showProgress: !1,
        defaultSource: void 0,
        localEmo: void 0,
        emotion: void 0,
        uploading: !1
      };
    },
    getInitialState: function () {
      return this.lastUploadingProgressTime = 0, this.filterProps(this.props), this.filterStyle(this.props.style), {
        loading: !1,
        localEmo: this.props.localEmo,
        defaultSource: this.props.defaultSource,
        loadingProgress: 0,
        uploading: this.props.uploading,
        uploadingProgress: 0,
        showProgress: this.props.showProgress,
        noEntry: this.props.noEntry,
        autoAnimation: !0
      };
    },
    filterProps: function (e) {
      this.filteredProps = {};
      for (var t in e) !e.hasOwnProperty(t) || t in {
        imageId: 1,
        recoveryKeepLoadedImage: 1,
        defaultSource: 1,
        spinnerSize: 1,
        ref: 1,
        avatarId: 1,
        outSrc: 1,
        emotion: 1
      } || (this.filteredProps[t] = e[t]);
    },
    progress: function (e) {
      var t = e.contentLength,
        o = e.bytesWritten;
      0 > t && (t = this.props.imageSize), o > t && (t = o);
    },
    setStateWrap: function (e) {
      e.localSource ? e.defaultSource = void 0 : e.defaultSource && (e.localSource = void 0), this.setState(e);
    },
    loadingVideoThumb: function (e, t, o, a) {
      var i = this,
        r = n.apps.getImageUriCache(e);
      r ? this.setState({
        noEntry: !1,
        loading: !1,
        localSource: {
          uri: "file://" + r
        },
        loadingProgress: 0,
        defaultSource: void 0
      }) : (this.setState({
        loading: !0
      }), n.dbs.isCachedVideoThumbExist(e).then(function (r) {
        var s = function () {
          n.apps.loadingVideoThumbIsRunning[e] ? n.apps.on("videoUriCached_" + e, function (e) {
            i.setState({
              noEntry: !1,
              loading: !1,
              localSource: {
                uri: "file://" + e
              },
              loadingProgress: 0,
              defaultSource: void 0
            });
          }) : (n.apps.loadingVideoThumbIsRunning[e] = !0, n.apps.runSerialTask(a ? "loadingPhotoThumb" : "loadingVideoThumb", function () {
            var r = e.split(";")[0];
            return (a ? n.apps.getPhotoThumb(r) : n.ProcessingManager.getPreviewForSecond(r, 0, {
              width: t,
              height: o
            }, "JPEG")).then(function (t) {
              if (delete n.apps.loadingVideoThumbIsRunning[e], !t.error) {
                var o = t.uri,
                  a = n.apps.myuuidGen(),
                  r = a.substr(-2, 2).toLowerCase();
                a += ".jpg";
                var s = n.fs.DocumentDirectoryPath + "/cachedImages/" + r + "/" + a;
                return n.fs.exists(n.fs.DocumentDirectoryPath + "/cachedImages/" + r).then(function (e) {
                  return e ? void 0 : n.fs.mkdir(n.fs.DocumentDirectoryPath + "/cachedImages/" + r, !0);
                }).then(function () {
                  return n.fs.moveFile(o.replace(/^file:\/\//, ""), s);
                }).then(function () {
                  return n.fs.stat(s).then(function (t) {
                    var o = t.size;
                    return n.dbs.addCachedImage(e, a, o);
                  });
                }).then(function () {
                  n.apps.setImageUriCache(e, s), n.apps.emitOnce("videoUriCached_" + e, s), i.setState({
                    noEntry: !1,
                    loading: !1,
                    localSource: {
                      uri: "file://" + s
                    },
                    loadingProgress: 0,
                    defaultSource: void 0
                  });
                });
              }
              n.apps.unon("videoUriCached_" + e), i.setState({
                noEntry: !0,
                loading: !1,
                loadingProgress: 0
              });
            })["catch"](function (e) {
              (0, n.tlog)("error", a ? "getPhotoThumb" : "ProcessingManager.getPreviewForSecond", e);
            });
          }));
        };
        if (r) {
          var d = r.filepath;
          n.apps.setImageUriCache(e, d), i.setState({
            noEntry: !1,
            loading: !1,
            localSource: {
              uri: "file://" + d
            },
            loadingProgress: 0,
            defaultSource: void 0
          }, function () {
            n.fs.stat(d).then(function (e) {
              e.size !== r.size && ((0, n.tlog)("error", "VideoThumb check failed", e.size, r.size, d), s());
            })["catch"](function (e) {
              (0, n.tlog)("error", "VideoThumb check failed", d, e), s();
            });
          });
        } else s();
      })["catch"](function (e) {
        (0, n.tlog)("error", "loadingVideoThumb", e);
      }));
    },
    imageLoaded: function (e) {
      var t = e.filepath,
        o = (e.fileSize, e.isEmo, e.imageId),
        a = e.avatarLoadFailedImageId;
      o !== this.imageId && a !== this.imageId || (o === n.apps.changeDefaultBackgroundLocked && delete n.apps.changeDefaultBackgroundLocked, "__cloudrepodeleted__" === t ? (this.props.onNoCloudRepo && this.props.onNoCloudRepo(), this.props.isbackground ? this.setState({
        noEntry: !1,
        localSource: n.apps.defaultBackground,
        loading: !1,
        loadingProgress: 0,
        defaultSource: void 0
      }) : this.setState({
        noEntry: !0,
        loading: !1,
        loadingProgress: 0
      })) : this.setState({
        noEntry: !1,
        loading: !1,
        loadingProgress: 0,
        localSource: {
          uri: "file://" + t
        },
        defaultSource: void 0
      }, function () {}));
    },
    loadingImage: function (e, t) {
      var o = this;
      if (!e) return void (0, n.tlog)("error", "cacheImage imageId undefined");
      /.*\.\w+$/.test(e) || (e += ".jpg"), "/" === e[0] && (t = !0, e = e.slice(1)), this.imageId && this.imageId !== e && n.apps.unon("downloadImage_" + this.imageId, this.imageLoaded), this.imageId = e;
      var a = this.prevId,
        i = n.apps.getImageUriCache(e);
      if (i) "__cloudrepodeleted__" === i ? (this.props.onNoCloudRepo && this.props.onNoCloudRepo(), this.props.isbackground ? this.setState({
        loading: !1,
        noEntry: !1,
        localSource: n.apps.defaultBackground,
        loadingProgress: 0,
        defaultSource: void 0
      }) : this.setState({
        noEntry: !0,
        loading: !1,
        loadingProgress: 0
      })) : (e === n.apps.changeDefaultBackgroundLocked && delete n.apps.changeDefaultBackgroundLocked, this.setState({
        noEntry: !1,
        loading: !1,
        localSource: {
          uri: "file://" + i
        },
        loadingProgress: 0,
        defaultSource: void 0
      }));else {
        var r, s, d;
        t ? (s = n.fs.DocumentDirectoryPath + "/emotions/" + e.match(/(.*)\//)[1].toLowerCase(), d = n.fs.DocumentDirectoryPath + "/emotions/" + e) : (r = n.apps.getImageIdSubDir(e), s = n.fs.DocumentDirectoryPath + "/cachedImages/" + r, d = s + "/" + e), n.fs.exists(s).then(function (e) {
          return e ? void 0 : n.fs.mkdir(s, !0);
        }).then(function () {
          return n.dbs.isCachedImageExist(e, d);
        }).then(function (i) {
          var r = 0,
            s = 0,
            l = function () {
              if (s += 1, o.imageId === e && (o.setState({
                loading: !0
              }), n.apps.has("downloadImage_" + e, o.imageLoaded) || n.apps.on("downloadImage_" + e, o.imageLoaded), !n.apps.isEventing("downloadImage_" + e))) {
                n.apps.startEvent("downloadImage_" + e);
                var i,
                  l,
                  p,
                  u,
                  h = -1,
                  g = 0,
                  c = function f(s) {
                    if (g > n.apps.durls.length) return void (0, n.tlog)("error", "Image downCnt exceed", n.apps.durls.length, p, e);
                    g += 1;
                    var c = 0,
                      m = n.wsc.getRandUrl(h, "durls");
                    n.fs.greetings(JSON.stringify({
                      d: n.apps.deviceId,
                      t: n.apps.now()
                    })).then(function (a) {
                      if (p = m.url, m.ridx === l) return Promise.reject("__retry_failed_");
                      h = m.ridx, void 0 === l && (l = m.ridx);
                      var g = t ? "/emo/" : "/pic/";
                      return i = "https://" + p + g + (u ? u : e) + ("?token=" + encodeURIComponent(a) + "&userid=" + encodeURIComponent(n.apps.userid) + "&tryCnt=" + r), o.props.avatarId && (i += "&avatarId=" + encodeURIComponent(o.props.avatarId)), n.fs.downloadFile({
                        fromUrl: i,
                        toFile: d,
                        timeout: s,
                        pinCert: !0,
                        progress: o.progress,
                        tryCnt: r,
                        downloadAgain: function () {
                          (0, n.tlog)("error", "Image download timeout", p, e), r += 1, f();
                        }
                      })["catch"](function (t) {
                        return (0, n.tlog)("error", "Image download", p, e, t), "retryTimesUp" === t ? Promise.reject(t) : Promise.reject("__retry_");
                      });
                    }).then(function (t) {
                      return !t || 200 === t.statusCode && 0 !== t.bytesWritten ? (c = t.bytesWritten, n.dbs.addCachedImage(e, d, c)) : ((0, n.tlog)("error", "image response", p, e, t), n.fs.unlink(d).then(function () {
                        return 404 === t.statusCode ? (d = "__cloudrepodeleted__", c = -1, n.dbs.markCachedAsDeleted(e)["catch"](function (e) {
                          return (0, n.tlog)("error", "markCachedAsDeleted", e);
                        }), Promise.reject("__404_")) : Promise.reject("__retry_");
                      }));
                    }).then(function () {
                      return n.apps.setImageUriCache(e, d), n.apps.eventEnd("downloadImage_" + e), n.apps.emitOnce("downloadImage_" + e, {
                        filepath: d,
                        fileSize: c,
                        curId: a,
                        imageId: e,
                        isEmo: t,
                        avatarLoadFailedImageId: o.avatarLoadFailedImageId
                      });
                    })["catch"](function (t) {
                      "break" !== t && ("__retry_" === t ? f() : ((0, n.tlog)("error", "loadingImage", p, e, t), n.apps.eventEnd("downloadImage_" + e), o.setState({
                        loading: !1
                      })));
                    });
                  };
                c();
              }
            };
          return "deleted" === i ? void o.imageLoaded({
            filepath: "__cloudrepodeleted__",
            fileSize: -1,
            curId: a,
            imageId: e,
            downloadStart: l,
            downloadCnt: s
          }) : void (n.apps.imageIsMoving[e] ? n.apps.on("imageMoved_" + e, o.imageLoaded) : n.apps.has("downloadImage_" + e) || !i ? l() : (n.apps.setImageUriCache(e, d), o.imageLoaded({
            filepath: d,
            fileSize: "object" == typeof i ? i.size : 0,
            curId: a,
            imageId: e,
            downloadStart: l,
            downloadCnt: s
          })));
        })["catch"](function (e) {
          (0, n.tlog)("error", "cachedImage loadingImage", d, e);
        });
      }
    },
    filterStyle: function (e) {
      var t = this;
      Array.isArray(e) && (e = Object.assign.apply(Object, [{}].concat(babelHelpers.toConsumableArray(e))));
      var o = Object.keys(e);
      o = o.filter(function (e) {
        return -1 === ["resizeMode", "overlayColor", "tintColor"].indexOf(e);
      }), this.loadingStyle = {}, o.forEach(function (o) {
        t.loadingStyle[o] = e[o];
      });
    },
    userAvatarChanged: function (e) {
      e ? this.setState({
        loading: !1
      }) : this.props.avatarId && this.loadAvatar(this.props.avatarId);
    },
    userAvatarUnChangedCb: function () {
      this.setState({
        loading: !1
      });
    },
    componentWillMount: function () {
      if (this.props.videoUri) {
        this.prevId = this.props.videoUri;
        var e = this.props,
          t = e.videoUri,
          o = e.videoThumbWidth,
          a = e.videoThumbHeight,
          i = e.isPhoto;
        this.loadingVideoThumb(t, o, a, i);
      } else if (this.props.imageId) this.prevId = this.props.imageId, this.props.onlyText || this.loadingImage(this.props.imageId);else if (this.props.avatarId) this.prevId = this.props.avatarId, n.apps.on("userAvatarChanged_" + this.props.avatarId, this.userAvatarChanged), this.loadAvatar(this.props.avatarId);else if (void 0 !== this.props.emotion) this.prevId = this.props.emotion, this.loadEmotion(this.props.emotion);else if (this.props.outSrc) this.prevId = this.props.outSrc, this.loadingOutSrc(this.props.outSrc);else if (void 0 !== this.props.defaultSource) {
        var r = this.props.defaultSource;
        if (this.props.uploading && "object" == typeof r && r.uri) {
          var s = "imageIsUploading_" + this.props.msgid + "_" + r.uri;
          this.prevId = r.uri, n.apps.unon(s), n.apps.on(s, this.onUploading), this.setState({
            uploading: !0,
            loading: !1
          });
        }
      }
    },
    autoGifAnimation: function () {
      this.setState({
        autoAnimation: n.apps.autoGifAnimation
      });
    },
    onUploading: function (e, t) {
      this.isCompress = t;
      var o = Date.now();
      1 !== e ? o - this.lastUploadingProgressTime > 350 && (this.lastUploadingProgressTime = o, this.setState({
        uploadingProgress: e,
        loading: !1
      })) : this.isCompress ? this.setState({
        uploadingProgress: 0,
        loading: !1
      }) : (this.props.uploadingFinished && this.props.uploadingFinished(), this.preProgress = 0, this.setState({
        uploadingProgress: 0,
        uploading: !1,
        loading: !1
      }), this.state.defaultSource && n.apps.unon("imageIsUploading_" + this.props.msgid + "_" + this.state.defaultSource.uri));
    },
    componentWillUnmount: function () {
      this.props.avatarId && n.apps.unon("userAvatarChanged_" + this.props.avatarId, this.userAvatarChanged), this.state.uploading && this.state.defaultSource && n.apps.unon("imageIsUploading_" + this.props.msgid + "_" + this.state.defaultSource.uri), this.imageId && n.apps.unon("downloadImage_" + this.imageId, this.imageLoaded);
    },
    loadEmotion: function (e) {
      /^\d+$/.test(e) ? this.setState({
        localEmo: n.apps.localEmos[e]
      }) : (this.setState({
        localEmo: void 0
      }), this.loadingImage(e, !0));
    },
    avatarLoaded: function (e, t) {
      return e ? (this.setState({
        isFd: !1
      }), -1 === e ? void this.loadingImage("/a/anon.png") : (t === n.apps.userid && "r" !== e[0].toLowerCase() && n.apps.needChangeAvatarDiag((0, n.tr)("You need to change avatar")), "R" === e[0] ? e = "r" + e.slice(1) : "T" === e[0] ? e = "t" + e.slice(1) : "N" === e[0] && (e = "n" + e.slice(1)), void ("/" === e[0] || 17 === e.length && "G" !== e[0] ? this.loadingImage(e) : this.loadingImage("/a/anon.png")))) : void this.setState({
        isFd: !0
      });
    },
    loadAvatar: function (e) {
      var t = this,
        o = n.apps.profiles[e];
      if (o && o.avatar) !n.apps.showCmdBall && n.apps.isUserForbided(o.forbid) ? this.avatarLoaded() : this.avatarLoaded(o.avatar, e);else {
        var a = "avatarLoaded_" + e;
        n.apps.has(a, this.avatarLoaded) || n.apps.on(a, this.avatarLoaded), n.apps.isEventing(a) || (n.apps.startEvent(a), n.apps.getProfile(e).then(function (t) {
          n.apps.eventEnd(a), !n.apps.showCmdBall && n.apps.isUserForbided(t.forbid) ? n.apps.emitOnce(a) : n.apps.emitOnce(a, t.avatar || -1, e);
        })["catch"](function (o) {
          n.apps.eventEnd(a), t.props.noAvatarErr || (0, n.tlog)("error", "avatar getProfileK", e, o);
        }));
      }
    },
    componentWillReceiveProps: function (e) {
      var t = this;
      if (this.filterProps(e), this.filterStyle(e.style), this.props.avatarId && e.avatarId !== this.props.avatarId && (n.apps.unon("userAvatarChanged_" + this.props.avatarId, this.userAvatarChanged), n.apps.unon("avatarLoaded_" + this.props.avatarId, this.avatarLoaded)), this.state.uploading && void 0 === e.defaultSource && void 0 !== this.state.defaultSource && (this.preProgress = 0, this.setState({
        uploadingProgress: 0,
        uploading: !1
      }), n.apps.unon("imageIsUploading_" + this.props.msgid + "_" + this.state.defaultSource.uri)), e.videoUri && e.videoUri !== this.props.videoUri) {
        this.state.noEntry && this.setState({
          noEntry: !1
        });
        var o = e.videoUri,
          a = e.videoThumbWidth,
          i = e.videoThumbHeight,
          r = e.isPhoto;
        this.prevId = o, this.setState({
          loading: !0
        }, function () {
          t.loadingVideoThumb(o, a, i, r);
        });
      } else if (e.imageId && e.imageId !== this.props.imageId) this.state.noEntry && this.setState({
        noEntry: !1
      }), this.prevId = e.imageId, e.onlyText ? this.setState({
        loading: !1
      }) : this.setState({
        loading: !0
      }, function () {
        t.loadingImage(e.imageId);
      });else if (void 0 !== e.emotion && e.emotion !== this.props.emotion) this.state.noEntry && this.setState({
        noEntry: !1
      }), this.prevId = e.emotion, this.setState({
        loading: !0
      }, function () {
        t.loadEmotion(e.emotion);
      });else if (e.avatarId && e.avatarId !== this.props.avatarId) this.state.noEntry && this.setState({
        noEntry: !1
      }), this.prevId = e.avatarId, n.apps.on("userAvatarChanged_" + e.avatarId, this.userAvatarChanged), this.setState({
        loading: !0
      }, function () {
        t.loadAvatar(e.avatarId);
      });else if (void 0 !== e.outSrc && e.outSrc !== this.props.outSrc) this.state.noEntry && this.setState({
        noEntry: !1
      }), this.prevId = e.outSrc, this.setState({
        loading: !0
      }, function () {
        t.loadingOutSrc(e.outSrc);
      });else if (void 0 !== e.defaultSource) if (this.state.noEntry && this.setState({
        noEntry: !1
      }), e.uploading && "object" == typeof e.defaultSource && e.defaultSource.uri) {
        var s = "imageIsUploading_" + e.msgid + "_" + e.defaultSource.uri;
        this.prevId = e.defaultSource.uri, n.apps.unon(s), n.apps.on(s, this.onUploading), this.setState({
          uploading: !0,
          defaultSource: e.defaultSource
        });
      } else this.prevId = e.defaultSource, this.setState({
        defaultSource: e.defaultSource
      });
    },
    calcTime: function (e) {
      var t = (e / 60).toFixed(0),
        o = (e % 60).toFixed(0);
      return t >= 0 && 9 >= t && (t = "0" + t), o >= 0 && 9 >= o && (o = "0" + o), t + ":" + o;
    },
    renderLoading: function () {
      return r["default"].createElement(s.View, {
        style: [this.loadingStyle, {
          justifyContent: "center",
          alignItems: "center"
        }]
      }, r["default"].createElement(s.Image, {
        style: {
          width: this.props.spinnerSize,
          height: this.props.spinnerSize,
          opacity: .5,
          backgroundColor: "transparent"
        },
        source: t(389),
        fadeDuration: 0
      }), this.props.children);
    },
    renderUnLoading: function () {
      return r["default"].createElement(s.View, {
        style: [this.loadingStyle, {
          justifyContent: "center",
          alignItems: "center"
        }]
      }, this.props.children);
    },
    renderNoEntry: function () {
      return r["default"].createElement(s.View, {
        style: [this.loadingStyle, {
          justifyContent: "center",
          alignItems: "center"
        }]
      }, r["default"].createElement(s.Text, {
        style: {
          color: n.theme.lighta,
          fontSize: 13
        }
      }, (0, n.tr)("Expired")));
    },
    calcRawSize: function (e) {
      return 1048576 > e ? (e / 1024).toFixed(0) + " KB" : (e / 1024 / 1024).toFixed(2) + " MB";
    },
    renderForbidedAvatar: function () {
      return r["default"].createElement(s.View, {
        style: [this.loadingStyle, {
          borderWidth: n.theme.px1,
          borderColor: n.theme.lighta,
          justifyContent: "center",
          alignItems: "center"
        }]
      }, r["default"].createElement(s.Text, {
        style: {
          fontSize: this.loadingStyle.width > 40 ? 14 : 10,
          color: n.theme.lighta
        }
      }, (0, n.tr)("Forbided")));
    },
    renderLocalFile: function (e) {
      var o = this,
        a = this.loadingStyle.width,
        i = this.loadingStyle.height,
        d = function () {
          return e && "number" != typeof e ? /(\.png|\.gif)$/.test(e.uri) ? !!/\/tenor\//.test(e.uri) : !0 : !1;
        };
      return r["default"].createElement(s.View, {
        style: [this.loadingStyle, {
          justifyContent: "center",
          alignItems: "center"
        }],
        onLayout: function (e) {
          return o.props.onLayout && o.props.onLayout(e);
        }
      }, this.state.noEntry ? r["default"].createElement(s.Text, {
        style: {
          color: n.theme.lighta,
          fontSize: 40 > a ? 10 : 13
        }
      }, (0, n.tr)("Expired")) : null, this.state.loading && !(this.props.recoveryKeepLoadedImage && e) || this.state.noEntry || this.props.onlyNull ? null : this.props.onlyText ? r["default"].createElement(s.Text, {
        style: {
          color: this.props.onlyTextColor || n.theme.lightb,
          fontSize: 13
        }
      }, this.props.onlyText) : r["default"].createElement(s.Image, babelHelpers["extends"]({}, this.filteredProps, {
        fadeDuration: 0,
        source: e,
        autoAnimation: this.state.autoAnimation
      }), this.props.children), !this.state.noEntry && this.state.loading ? r["default"].createElement(s.View, {
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: a,
          height: i,
          backgroundColor: n.theme.transparent,
          borderRadius: this.loadingStyle.borderRadius,
          justifyContent: "center",
          alignItems: "center"
        }
      }, r["default"].createElement(s.Image, {
        style: {
          width: this.props.spinnerSize,
          height: this.props.spinnerSize,
          opacity: .5,
          backgroundColor: "transparent"
        },
        source: t(389),
        fadeDuration: 0
      }), this.state.showProgress ? r["default"].createElement(s.View, {
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          height: 5,
          borderRadius: this.loadingStyle.borderRadius || 0,
          width: Math.round(this.loadingStyle.width * this.state.loadingProgress),
          backgroundColor: n.theme.green,
          borderWidth: this.state.loadingProgress ? 1 : 0,
          borderColor: n.theme.white
        }
      }) : null) : null, !this.state.noEntry && this.state.uploading ? r["default"].createElement(s.View, {
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: a,
          height: i,
          backgroundColor: n.theme.deepTrans2,
          borderRadius: this.loadingStyle.borderRadius,
          justifyContent: "center",
          alignItems: "center"
        }
      }, r["default"].createElement(n.Progress.Circle, {
        indeterminate: !this.state.uploadingProgress,
        color: n.theme.deepGreen2,
        progress: this.state.uploadingProgress,
        size: 50,
        showsText: !0,
        formatText: function (e) {
          var t = (100 * e).toFixed(0);
          return "100" === t && o.isCompress || e < o.preProgress ? (o.preProgress = e, "Upload") : (o.preProgress = e, o.props.isVideo && ("android" === s.Platform.OS && o.isCompress || "ios" === s.Platform.OS && "0" === t) ? "Compress" : "0" !== t ? t + "%" : "");
        }
      })) : null, n.apps.showCmdBall && !this.state.noEntry && this.props.isVideo && this.props.size ? r["default"].createElement(s.View, {
        style: {
          position: "absolute",
          left: 0,
          top: i - 20,
          width: a,
          height: 20,
          backgroundColor: "rgba(0,0,0,0)",
          justifyContent: "center",
          alignItems: "flex-end"
        }
      }, r["default"].createElement(s.View, {
        style: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderTopLeftRadius: 10,
          borderBottomRightRadius: this.loadingStyle.borderRadius,
          marginRight: 0,
          backgroundColor: "rgba(0,0,0,0.2)"
        }
      }, r["default"].createElement(s.Text, {
        style: {
          fontSize: 12,
          color: n.theme.white
        }
      }, this.calcRawSize(this.props.size)))) : null, n.apps.darkTheme && d() ? r["default"].createElement(s.View, {
        style: {
          position: "absolute",
          borderRadius: this.loadingStyle.borderRadius,
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.05)"
        }
      }) : null);
    },
    render: function () {
      if(this.props.recoveryKeepLoadedImage&&this.state.loading&&this.state.localSource&&!this.state.noEntry&&!this.state.isFd)return this.renderLocalFile(this.state.localSource);
      return this.state.isFd ? this.renderForbidedAvatar() : this.state.loading || this.state.noEntry || this.props.onlyText ? this.renderLocalFile() : void 0 !== this.state.defaultSource ? this.renderLocalFile(this.state.defaultSource) : void 0 !== this.state.localEmo ? this.renderLocalFile(this.state.localEmo) : this.state.localSource ? this.renderLocalFile(this.state.localSource) : this.renderUnLoading();
    }
  });
});
