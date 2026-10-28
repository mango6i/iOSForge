// Recovered module 122; analysis path, not original filename.
// Original SHA-256 01376c8f4a837cabfbbd615b9fd45ce3e4c5c201e56c791ed819babffc9dbfc6; original byte range [196455, 197133).
__d(122, function (t, i, n, h) {
  "use strict";

  var o = i(408),
    s = i(430),
    e = 0,
    p = 1,
    u = 2,
    a = 3,
    r = 4,
    c = o(s, {
      initialize: function (t) {
        this.reset(), t instanceof c ? this.path = t.path.slice(0) : t && (t.applyToPath ? t.applyToPath(this) : this.push(t));
      },
      onReset: function () {
        this.path = [];
      },
      onMove: function (t, i, n, h) {
        this.path.push(e, n, h);
      },
      onLine: function (t, i, n, h) {
        this.path.push(u, n, h);
      },
      onBezierCurve: function (t, i, n, h, o, s, e, p) {
        this.path.push(a, n, h, o, s, e, p);
      },
      _arcToBezier: s.prototype.onArc,
      onArc: function (t, i, n, h, o, s, e, p, u, a, c, f) {
        return e !== p || f ? this._arcToBezier(t, i, n, h, o, s, e, p, u, a, c, f) : void this.path.push(r, o, s, e, u, a, c ? 0 : 1);
      },
      onClose: function () {
        this.path.push(p);
      },
      toJSON: function () {
        return this.path;
      }
    });
  n.exports = c;
});
