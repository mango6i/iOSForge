// Recovered module 144; analysis path, not original filename.
// Original SHA-256 db85f6a1d0675c3d1c60bf22e269a733f83826fe7b28b61e0bd9d4f75967ea4f; original byte range [252291, 253303).
__d(144, function (t, e, s, r) {
  "use strict";

  function i(t) {
    return t % 8 ? Math.floor(t / 8) + 1 << 3 : t;
  }
  var n = function () {
    function t(e) {
      babelHelpers.classCallCheck(this, t), this._storage = new Uint8Array(e), this._sizeWritten = 0;
    }
    return babelHelpers.createClass(t, [{
      key: "push",
      value: function (t) {
        var e = this._sizeWritten;
        return e === this._storage.length && this._realloc(), this._storage[e] = t, this._sizeWritten = e + 1, this;
      }
    }, {
      key: "getBuffer",
      value: function () {
        return this._storage.buffer.slice(0, this._sizeWritten);
      }
    }, {
      key: "_realloc",
      value: function () {
        var t = this._storage;
        this._storage = new Uint8Array(i(1.5 * t.length)), this._storage.set(t);
      }
    }]), t;
  }();
  r.encode = function (t) {
    for (var e = t.length, s = new n(e), r = t.charCodeAt(0), i = 0; e > i; i++) {
      var h = r;
      r = t.charCodeAt(i + 1), 128 > h ? s.push(h) : 2048 > h ? s.push(192 | h >>> 6).push(128 | 63 & h) : h >>> 10 === 54 && r >>> 10 === 55 ? (h = 65536 + ((1023 & h) << 10 | 1023 & r), s.push(240 | h >>> 18 & 7).push(128 | h >>> 12 & 63).push(128 | h >>> 6 & 63).push(128 | 63 & h), i += 1, r = t.charCodeAt(i + 1)) : s.push(224 | h >>> 12).push(128 | h >>> 6 & 63).push(128 | 63 & h);
    }
    return s.getBuffer();
  };
});
