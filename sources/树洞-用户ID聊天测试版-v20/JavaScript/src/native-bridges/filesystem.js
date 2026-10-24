// Recovered module 437; analysis path, not original filename.
// Original SHA-256 06054eaf754687bc3c5f957fbabae3ff1351ddfa72575b04a55840437cf1d608; original byte range [591346, 598323).
__d(437, function (e, r, o, n) {
  "use strict";

  "undefined" == typeof self && (e.self = e);
  var t = r(312).NativeModules.RNFSManager,
    i = r(312).NativeAppEventEmitter,
    a = r(600),
    u = r(432),
    d = r(433),
    l = a.promisify(t.readDir),
    f = a.promisify(t.exists),
    s = a.promisify(t.stat),
    c = a.promisify(t.readFile),
    p = a.promisify(t.writeFile),
    h = a.promisify(t.moveFile),
    m = a.promisify(t.copyFile),
    y = a.promisify(t.unlink),
    w = a.promisify(t.mkdir),
    v = a.promisify(t.downloadFile),
    g = t.uploadFiles ? a.promisify(t.uploadFiles) : function () {
      return a.reject("Not implemented on Android");
    },
    F = a.promisify(t.pathForBundle),
    b = a.promisify(t.getFSInfo),
    D = function (e) {
      e.isOperational && e.cause && (e = e.cause);
      var r = new Error(e.description || e.message);
      throw r.code = e.code, r;
    },
    E = t.NSFileTypeRegular,
    I = t.NSFileTypeDirectory,
    k = 0,
    P = function () {
      return k += 1;
    },
    S = {},
    U = {},
    N = function (e) {
      e || (e = "0"), U[e].length > 0 ? U[e].shift()() : S[e] > 0 && (S[e] -= 1);
    },
    L = function (e, r) {
      e || (e = "0"), U[e] || (U[e] = []), S[e] || (S[e] = 0), S[e] < 10 ? (S[e] += 1, r()) : U[e].push(r);
    },
    j = {
      gethostaddr: function (e) {
        return t.gethostaddr ? a.promisify(t.gethostaddr)(e) : a.resolve([e]);
      },
      getSizeFromUri: function (e) {
        return a.promisify(t.getSizeFromUri)(e);
      },
      getPasswdSalt: function () {
        return a.promisify(t.getPasswdSalt)();
      },
      greetings: function (e) {
        return a.promisify(t.greetings)(e);
      },
      blurImage: function (e, r, o, n, i, a) {
        t.processImage(e, r, o, n, i, function (e) {
          console.log("blurImage DONE");
        });
      },
      pkgVersion: function () {
        return a.promisify(t.pkgVersion)();
      },
      requestReview: function () {
        return t.requestReview ? (t.requestReview(function () {}), !0) : !1;
      },
      reloadHvdown: function () {
        return a.promisify(t.reloadHvdown)();
      },
      reloadHvdownDebug: function () {
        return t.reloadHvdownDebug ? a.promisify(t.reloadHvdownDebug)() : void 0;
      },
      resetHvdown: function () {
        return a.promisify(t.resetHvdown)();
      },
      setHvdownMark: function (e) {
        return a.promisify(t.setHvdownMark)(e);
      },
      curHvdownVersion: function () {
        return a.promisify(t.curHvdownVersion)();
      },
      firstLoadSuccessful: function () {
        return a.promisify(t.firstLoadSuccessful)();
      },
      readDir: function (e) {
        return l(e).then(function (e) {
          return e.map(function (e) {
            return {
              name: e.name,
              path: e.path,
              size: e.size,
              isFile: function () {
                return e.type === E;
              },
              isDirectory: function () {
                return e.type === I;
              }
            };
          });
        })["catch"](D);
      },
      readdir: function (e) {
        return j.readDir(e).then(function (e) {
          return e.map(function (e) {
            return e.name;
          });
        });
      },
      stat: function (e) {
        return s(e).then(function (e) {
          return {
            ctime: new Date(1e3 * e.ctime),
            mtime: new Date(1e3 * e.mtime),
            size: e.size,
            mode: e.mode,
            isFile: function () {
              return e.type === E;
            },
            isDirectory: function () {
              return e.type === I;
            }
          };
        })["catch"](D);
      },
      exists: function (e) {
        return f(e)["catch"](D);
      },
      readFile: function (e, r) {
        return r || (r = "utf8"), c(e).then(function (e) {
          var o;
          if ("utf8" === r) o = d.decode(u.decode(e));else if ("ascii" === r) o = u.decode(e);else {
            if ("base64" !== r) throw new Error('Invalid encoding type "' + r + '"');
            o = e;
          }
          return o;
        })["catch"](D);
      },
      writeFile: function (e, r, o, n) {
        var t;
        if (o || (o = "utf8"), "utf8" === o) t = u.encode(d.encode(r));else if ("ascii" === o) t = u.encode(r);else {
          if ("base64" !== o) throw new Error('Invalid encoding type "' + o + '"');
          t = r;
        }
        return p(e, t, n)["catch"](D);
      },
      moveFile: function (e, r) {
        return h(e, r)["catch"](D);
      },
      copyFile: function (e, r) {
        return m(e, r)["catch"](D);
      },
      pathForBundle: function (e) {
        return F(e);
      },
      getFSInfo: function () {
        return b()["catch"](D);
      },
      unlink: function (e) {
        return y(e)["catch"](D);
      },
      mkdir: function (e, r) {
        return r = !!r, w(e, r)["catch"](D);
      },
      downloadFile: function (e) {
        return new a(function (r, o) {
          var n = function () {
            if ("object" != typeof e) throw new Error("downloadFile: Invalid value for argument `options`");
            if ("string" != typeof e.fromUrl) throw new Error("downloadFile: Invalid value for property `fromUrl`");
            if ("string" != typeof e.toFile) throw new Error("downloadFile: Invalid value for property `toFile`");
            if (e.headers && "object" != typeof e.headers) throw new Error("downloadFile: Invalid value for property `headers`");
            if (e.background && "boolean" != typeof e.background) throw new Error("downloadFile: Invalid value for property `background`");
            var n,
              t = P(),
              a = [],
              u = 0;
            a.push(i.addListener("DownloadBegin-" + t, function (r) {
              e.begin && e.begin(r), r.headers && (u = parseInt(r.headers["Content-Length"], 10));
            })), a.push(i.addListener("DownloadProgress-" + t, function (r) {
              e.progress && e.progress(r);
            }));
            var d = {
              jobId: t,
              fromUrl: e.fromUrl,
              toFile: e.toFile,
              headers: e.headers || {},
              background: !!e.background,
              pinCert: !!e.pinCert
            };
            v(d).then(function (o) {
              u && (o.contentLength = u), clearTimeout(n), a.forEach(function (e) {
                return e.remove();
              }), N(e.taskName), r(o);
            }, function (r) {
              clearTimeout(n), N(e.taskName), a.forEach(function (e) {
                return e.remove();
              }), o(r);
            });
          };
          L(e.taskName, n);
        });
      },
      __old_downloadFile: function (e) {
        if ("object" != typeof e) throw new Error("downloadFile: Invalid value for argument `options`");
        if ("string" != typeof e.fromUrl) throw new Error("downloadFile: Invalid value for property `fromUrl`");
        if ("string" != typeof e.toFile) throw new Error("downloadFile: Invalid value for property `toFile`");
        if (e.headers && "object" != typeof e.headers) throw new Error("downloadFile: Invalid value for property `headers`");
        if (e.background && "boolean" != typeof e.background) throw new Error("downloadFile: Invalid value for property `background`");
        var r = P(),
          o = [];
        e.begin && o.push(i.addListener("DownloadBegin-" + r, e.begin)), e.progress && o.push(i.addListener("DownloadProgress-" + r, e.progress));
        var n = {
            jobId: r,
            fromUrl: e.fromUrl,
            toFile: e.toFile,
            headers: e.headers || {},
            background: !!e.background,
            pinCert: !!e.pinCert
          },
          t = e.timeout || 2e4;
        return j.downloadFileWithTimer(n, t).then(function (e) {
          return o.forEach(function (e) {
            return e.remove();
          }), e;
        }, function (e) {
          throw o.forEach(function (e) {
            return e.remove();
          }), e;
        });
      },
      downloadFileWithTimer: function (e, r) {
        return new a(function (o, n) {
          setTimeout(function () {
            return n("__download_timeout__");
          }, r), v(e).then(o, n);
        });
      },
      stopDownload: function (e) {
        t.stopDownload(e);
      },
      uploadFiles: function (e) {
        var r = P(),
          o = [];
        if ("object" != typeof e) throw new Error("uploadFiles: Invalid value for argument `options`");
        if ("string" != typeof e.toUrl) throw new Error("uploadFiles: Invalid value for property `toUrl`");
        if (!Array.isArray(e.files)) throw new Error("uploadFiles: Invalid value for property `files`");
        if (e.headers && "object" != typeof e.headers) throw new Error("uploadFiles: Invalid value for property `headers`");
        if (e.fields && "object" != typeof e.fields) throw new Error("uploadFiles: Invalid value for property `fields`");
        if (e.method && "string" != typeof e.method) throw new Error("uploadFiles: Invalid value for property `method`");
        e.beginCallback && o.push(i.addListener("UploadBegin-" + r, e.beginCallback)), e.progressCallback && o.push(i.addListener("UploadProgress-" + r, e.progressCallback));
        var n = {
          jobId: r,
          toUrl: e.toUrl,
          files: e.files,
          headers: e.headers || {},
          fields: e.fields || {},
          method: e.method || "POST"
        };
        return g(n).then(function (e) {
          return o.forEach(function (e) {
            return e.remove();
          }), e;
        });
      },
      stopUpload: function (e) {
        t.stopUpload(e);
      },
      MainBundlePath: t.MainBundlePath,
      CachesDirectoryPath: t.NSCachesDirectoryPath,
      DocumentDirectoryPath: t.NSDocumentDirectoryPath,
      ExternalDirectoryPath: t.NSExternalDirectoryPath,
      TemporaryDirectoryPath: t.NSTemporaryDirectoryPath,
      LibraryDirectoryPath: t.NSLibraryDirectoryPath,
      PicturesDirectoryPath: t.NSPicturesDirectoryPath
    };
  o.exports = j;
});
