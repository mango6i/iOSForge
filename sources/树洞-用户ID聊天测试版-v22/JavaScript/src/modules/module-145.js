// Recovered module 145; analysis path, not original filename.
// Original SHA-256 8f91d220bd40f3d192b110ef6123deb92db20e740ce4817552a04a93224b9d9a; original byte range [253304, 259109).
__d(145, function (t, e, r, o) {
  "use strict";

  var n = {};
  !function () {
    function t(t) {
      if ("string" != typeof t && (t = String(t)), /[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(t)) throw new TypeError("Invalid character in header field name");
      return t.toLowerCase();
    }
    function e(t) {
      return "string" != typeof t && (t = String(t)), t;
    }
    function r(t) {
      this.map = {}, t instanceof r ? t.forEach(function (t, e) {
        this.append(e, t);
      }, this) : t && Object.getOwnPropertyNames(t).forEach(function (e) {
        this.append(e, t[e]);
      }, this);
    }
    function o(t) {
      return t.bodyUsed ? Promise.reject(new TypeError("Already read")) : void (t.bodyUsed = !0);
    }
    function s(t) {
      return new Promise(function (e, r) {
        t.onload = function () {
          e(t.result);
        }, t.onerror = function () {
          r(t.error);
        };
      });
    }
    function i(t) {
      var e = new FileReader();
      return e.readAsArrayBuffer(t), s(e);
    }
    function a(t) {
      var e = new FileReader();
      return e.readAsText(t), s(e);
    }
    function u() {
      return this.bodyUsed = !1, this._initBody = function (t) {
        if (this._bodyInit = t, "string" == typeof t) this._bodyText = t;else if (c.blob && Blob.prototype.isPrototypeOf(t)) this._bodyBlob = t;else if (c.formData && FormData.prototype.isPrototypeOf(t)) this._bodyFormData = t;else if (t) {
          if (!c.arrayBuffer || !ArrayBuffer.prototype.isPrototypeOf(t)) throw new Error("unsupported BodyInit type");
        } else this._bodyText = "";
        this.headers.get("content-type") || ("string" == typeof t ? this.headers.set("content-type", "text/plain;charset=UTF-8") : this._bodyBlob && this._bodyBlob.type && this.headers.set("content-type", this._bodyBlob.type));
      }, c.blob ? (this.blob = function () {
        var t = o(this);
        if (t) return t;
        if (this._bodyBlob) return Promise.resolve(this._bodyBlob);
        if (this._bodyFormData) throw new Error("could not read FormData body as blob");
        return Promise.resolve(new Blob([this._bodyText]));
      }, this.arrayBuffer = function () {
        return this.blob().then(i);
      }, this.text = function () {
        var t = o(this);
        if (t) return t;
        if (this._bodyBlob) return a(this._bodyBlob);
        if (this._bodyFormData) throw new Error("could not read FormData body as text");
        return Promise.resolve(this._bodyText);
      }) : this.text = function () {
        var t = o(this);
        return t ? t : Promise.resolve(this._bodyText);
      }, c.formData && (this.formData = function () {
        return this.text().then(f);
      }), this.json = function () {
        return this.text().then(JSON.parse);
      }, this;
    }
    function h(t) {
      var e = t.toUpperCase();
      return y.indexOf(e) > -1 ? e : t;
    }
    function d(t, e) {
      e = e || {};
      var o = e.body;
      if (d.prototype.isPrototypeOf(t)) {
        if (t.bodyUsed) throw new TypeError("Already read");
        this.url = t.url, this.credentials = t.credentials, e.headers || (this.headers = new r(t.headers)), this.method = t.method, this.mode = t.mode, o || (o = t._bodyInit, t.bodyUsed = !0);
      } else this.url = t;
      if (this.credentials = e.credentials || this.credentials || "omit", !e.headers && this.headers || (this.headers = new r(e.headers)), this.method = h(e.method || this.method || "GET"), this.mode = e.mode || this.mode || null, this.referrer = null, ("GET" === this.method || "HEAD" === this.method) && o) throw new TypeError("Body not allowed for GET or HEAD requests");
      this._initBody(o);
    }
    function f(t) {
      var e = new FormData();
      return t.trim().split("&").forEach(function (t) {
        if (t) {
          var r = t.split("="),
            o = r.shift().replace(/\+/g, " "),
            n = r.join("=").replace(/\+/g, " ");
          e.append(decodeURIComponent(o), decodeURIComponent(n));
        }
      }), e;
    }
    function p(t) {
      var e = new r(),
        o = t.getAllResponseHeaders().trim().split("\n");
      return o.forEach(function (t) {
        var r = t.trim().split(":"),
          o = r.shift().trim(),
          n = r.join(":").trim();
        e.append(o, n);
      }), e;
    }
    function l(t, e) {
      e || (e = {}), this.type = "default", this.status = e.status, this.ok = this.status >= 200 && this.status < 300, this.statusText = e.statusText, this.headers = e.headers instanceof r ? e.headers : new r(e.headers), this.url = e.url || "", this._initBody(t);
    }
    if (!n.fetch) {
      r.prototype.append = function (r, o) {
        r = t(r), o = e(o);
        var n = this.map[r];
        n || (n = [], this.map[r] = n), n.push(o);
      }, r.prototype["delete"] = function (e) {
        delete this.map[t(e)];
      }, r.prototype.get = function (e) {
        var r = this.map[t(e)];
        return r ? r[0] : null;
      }, r.prototype.getAll = function (e) {
        return this.map[t(e)] || [];
      }, r.prototype.has = function (e) {
        return this.map.hasOwnProperty(t(e));
      }, r.prototype.set = function (r, o) {
        this.map[t(r)] = [e(o)];
      }, r.prototype.forEach = function (t, e) {
        Object.getOwnPropertyNames(this.map).forEach(function (r) {
          this.map[r].forEach(function (o) {
            t.call(e, o, r, this);
          }, this);
        }, this);
      };
      var c = {
          blob: "function" == typeof FileReader && "function" == typeof Blob && function () {
            try {
              return new Blob(), !0;
            } catch (t) {
              return !1;
            }
          }(),
          formData: "function" == typeof FormData,
          arrayBuffer: "function" == typeof ArrayBuffer
        },
        y = ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"];
      d.prototype.clone = function () {
        return new d(this);
      }, u.call(d.prototype), u.call(l.prototype), l.prototype.clone = function () {
        return new l(this._bodyInit, {
          status: this.status,
          statusText: this.statusText,
          headers: new r(this.headers),
          url: this.url
        });
      }, l.error = function () {
        var t = new l(null, {
          status: 0,
          statusText: ""
        });
        return t.type = "error", t;
      };
      var b = [301, 302, 303, 307, 308];
      l.redirect = function (t, e) {
        if (-1 === b.indexOf(e)) throw new RangeError("Invalid status code");
        return new l(null, {
          status: e,
          headers: {
            location: t
          }
        });
      }, n.Headers = r, n.Request = d, n.Response = l, n.fetch = function (t, e, r, o) {
        return new Promise(function (n, s) {
          function i() {
            return "responseURL" in u ? u.responseURL : /^X-Request-URL:/m.test(u.getAllResponseHeaders()) ? u.getResponseHeader("X-Request-URL") : void 0;
          }
          var a;
          a = d.prototype.isPrototypeOf(t) && !e ? t : new d(t, e);
          var u = new XMLHttpRequest();
          u.timeout = r || 1e4, u.pinCert = o, u.onload = function () {
            var t = 1223 === u.status ? 204 : u.status;
            if (100 > t || t > 599) return void s(new TypeError("Network request failed"));
            var e = {
                status: t,
                statusText: u.statusText,
                headers: p(u),
                url: i()
              },
              r = "response" in u ? u.response : u.responseText;
            n(new l(r, e));
          }, u.ontimeout = function () {
            s("timeout");
          }, u.onerror = function () {
            s(new TypeError("Network request failed " + u.responseText));
          }, u.open(a.method, a.url, !0), "include" === a.credentials && (u.withCredentials = !0), "responseType" in u && c.blob && (u.responseType = "blob"), a.headers.forEach(function (t, e) {
            u.setRequestHeader(e, t);
          }), u.send("undefined" == typeof a._bodyInit ? null : a._bodyInit);
        });
      }, n.fetch.polyfill = !0;
    }
  }(), r.exports = n;
});
