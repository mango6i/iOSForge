// Recovered module 143; analysis path, not original filename.
// Original SHA-256 9722bebbc4507e01206aa652c6ef3e006bafcf94d0223db49e8db88b91a0b743; original byte range [241528, 248192).
__d(143, function (e, t, s, r) {
  "use strict";

  function i(e, t) {
    var s = e.length;
    if (0 === s) return new ArrayBuffer(0);
    var r = t.match(/;\s*charset=([^;]*)/i),
      i = r ? r[1].trim() : "utf-8";
    if (/^utf-?8$/i.test(i)) return d.encode(e);
    for (var n = new Uint8Array(s), o = 0; s > o; o++) n[o] = e.charCodeAt(o);
    return n.buffer;
  }
  var n = t(142),
    o = t(46),
    a = t(421),
    h = t(380),
    d = t(144),
    u = t(381),
    p = 0,
    l = 1,
    c = 2,
    y = 3,
    _ = 4,
    b = {
      arraybuffer: "function" == typeof e.ArrayBuffer,
      blob: "function" == typeof e.Blob,
      document: !1,
      json: !0,
      text: !0,
      "": !0
    },
    f = ["abort", "error", "load", "loadstart", "progress", "timeout", "loadend"],
    E = f.concat("readystatechange"),
    v = function (e) {
      function t() {
        return babelHelpers.classCallCheck(this, t), babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(t).apply(this, arguments));
      }
      return babelHelpers.inherits(t, e), t;
    }(a.apply(void 0, f)),
    R = function (t) {
      function s() {
        babelHelpers.classCallCheck(this, s);
        var e = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(s).call(this));
        return e.UNSENT = p, e.OPENED = l, e.HEADERS_RECEIVED = c, e.LOADING = y, e.DONE = _, e.readyState = p, e.responseText = "", e.status = 0, e.timeout = 0, e.upload = new v(), e._aborted = !1, e._hasError = !1, e._method = null, e._url = null, e._timedOut = !1, e._incrementalEvents = !1, e._reset(), e;
      }
      return babelHelpers.inherits(s, t), babelHelpers.createClass(s, [{
        key: "_reset",
        value: function () {
          this.readyState = this.UNSENT, this.responseHeaders = void 0, this.responseText = "", this.status = 0, delete this.responseURL, this._requestId = null, this._cachedResponse = void 0, this._hasError = !1, this._headers = {}, this._responseType = "", this._sent = !1, this._lowerCaseResponseHeaders = {}, this._clearSubscriptions(), this._timedOut = !1;
        }
      }, {
        key: "didCreateRequest",
        value: function (e) {
          var t = this;
          this._requestId = e, this._subscriptions.push(o.addListener("didSendNetworkData", function (e) {
            return t.__didUploadProgress.apply(t, babelHelpers.toConsumableArray(e));
          })), this._subscriptions.push(o.addListener("didReceiveNetworkResponse", function (e) {
            return t._didReceiveResponse.apply(t, babelHelpers.toConsumableArray(e));
          })), this._subscriptions.push(o.addListener("didReceiveNetworkData", function (e) {
            return t._didReceiveData.apply(t, babelHelpers.toConsumableArray(e));
          })), this._subscriptions.push(o.addListener("didCompleteNetworkResponse", function (e) {
            return t.__didCompleteResponse.apply(t, babelHelpers.toConsumableArray(e));
          }));
        }
      }, {
        key: "__didUploadProgress",
        value: function (e, t, s) {
          e === this._requestId && this.upload.dispatchEvent({
            type: "progress",
            lengthComputable: !0,
            loaded: t,
            total: s
          });
        }
      }, {
        key: "_didReceiveResponse",
        value: function (e, t, s, r) {
          e === this._requestId && (this.status = t, this.setResponseHeaders(s), this.setReadyState(this.HEADERS_RECEIVED), r || "" === r ? this.responseURL = r : delete this.responseURL);
        }
      }, {
        key: "_didReceiveData",
        value: function (e, t) {
          e === this._requestId && (this.responseText ? this.responseText += t : this.responseText = t, this._cachedResponse = void 0, this.setReadyState(this.LOADING));
        }
      }, {
        key: "__didCompleteResponse",
        value: function (e, t, s) {
          e === this._requestId && (t && (this.responseText = t, this._hasError = !0, s && (this._timedOut = !0)), this._clearSubscriptions(), this._requestId = null, this.setReadyState(this.DONE));
        }
      }, {
        key: "_clearSubscriptions",
        value: function () {
          (this._subscriptions || []).forEach(function (e) {
            e.remove();
          }), this._subscriptions = [];
        }
      }, {
        key: "getAllResponseHeaders",
        value: function () {
          if (!this.responseHeaders) return null;
          var e = this.responseHeaders || {};
          return Object.keys(e).map(function (t) {
            return t + ": " + e[t];
          }).join("\n");
        }
      }, {
        key: "getResponseHeader",
        value: function (e) {
          var t = this._lowerCaseResponseHeaders[e.toLowerCase()];
          return void 0 !== t ? t : null;
        }
      }, {
        key: "setRequestHeader",
        value: function (e, t) {
          if (this.readyState !== this.OPENED) throw new Error("Request has not been opened");
          this._headers[e.toLowerCase()] = t;
        }
      }, {
        key: "open",
        value: function (e, t, s) {
          if (this.readyState !== this.UNSENT) throw new Error("Cannot open, already sending");
          if (void 0 !== s && !s) throw new Error("Synchronous http requests are not supported");
          if (!t) throw new Error("Cannot load an empty url");
          this._reset(), this._method = e.toUpperCase(), this._url = t, this._aborted = !1, this.setReadyState(this.OPENED);
        }
      }, {
        key: "sendImpl",
        value: function (e, t, s, r, i, n) {
          throw new Error("Subclass must define sendImpl method");
        }
      }, {
        key: "send",
        value: function (e) {
          if (this.readyState !== this.OPENED) throw new Error("Request has not been opened");
          if (this._sent) throw new Error("Request has already been sent");
          this._sent = !0;
          var t = this._incrementalEvents || !!this.onreadystatechange;
          this.sendImpl(this._method, this._url, this._headers, e, t, this.timeout, this.pinCert);
        }
      }, {
        key: "abort",
        value: function () {
          this._aborted = !0, this._requestId && n.abortRequest(this._requestId), this.readyState === this.UNSENT || this.readyState === this.OPENED && !this._sent || this.readyState === this.DONE || (this._reset(), this.setReadyState(this.DONE)), this._reset();
        }
      }, {
        key: "setResponseHeaders",
        value: function (e) {
          this.responseHeaders = e || null;
          var t = e || {};
          this._lowerCaseResponseHeaders = Object.keys(t).reduce(function (e, s) {
            return e[s.toLowerCase()] = t[s], e;
          }, {});
        }
      }, {
        key: "setReadyState",
        value: function (e) {
          this.readyState = e, this.dispatchEvent({
            type: "readystatechange"
          }), e !== this.DONE || this._aborted || (this._hasError ? this._timedOut ? this.dispatchEvent({
            type: "timeout"
          }) : this.dispatchEvent({
            type: "error"
          }) : this.dispatchEvent({
            type: "load"
          }));
        }
      }, {
        key: "addEventListener",
        value: function (e, t) {
          "readystatechange" === e && (this._incrementalEvents = !0), babelHelpers.get(Object.getPrototypeOf(s.prototype), "addEventListener", this).call(this, e, t);
        }
      }, {
        key: "responseType",
        get: function () {
          return this._responseType;
        },
        set: function (e) {
          if (this.readyState > c) throw new Error("Failed to set the 'responseType' property on 'XMLHttpRequest': The response type cannot be set if the object's state is LOADING or DONE");
          return b.hasOwnProperty(e) ? (h(b[e] || "document" === e, "The provided value '" + e + "' is unsupported in this environment."), void (this._responseType = e)) : void u("The provided value '" + e + "' is not a valid 'responseType'.");
        }
      }, {
        key: "response",
        get: function () {
          var t = this.responseType;
          if ("" === t || "text" === t) return this.readyState < y || this._hasError ? "" : this.responseText;
          if (this.readyState !== _) return null;
          if (void 0 !== this._cachedResponse) return this._cachedResponse;
          switch (this.responseType) {
            case "document":
              this._cachedResponse = null;
              break;
            case "arraybuffer":
              this._cachedResponse = i(this.responseText, this.getResponseHeader("content-type") || "");
              break;
            case "blob":
              this._cachedResponse = new e.Blob([this.responseText], {
                type: this.getResponseHeader("content-type") || ""
              });
              break;
            case "json":
              try {
                this._cachedResponse = JSON.parse(this.responseText);
              } catch (s) {
                this._cachedResponse = null;
              }
              break;
            default:
              this._cachedResponse = null;
          }
          return this._cachedResponse;
        }
      }]), s;
    }(a.apply(void 0, babelHelpers.toConsumableArray(E)));
  R.UNSENT = p, R.OPENED = l, R.HEADERS_RECEIVED = c, R.LOADING = y, R.DONE = _, s.exports = R;
});
