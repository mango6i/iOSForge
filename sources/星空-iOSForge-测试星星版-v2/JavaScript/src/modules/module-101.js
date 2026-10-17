// Recovered module 101; analysis path, not original filename.
// Original SHA-256 c6e842b786fe9f1894284c5feb2aa93609a6fbaa1eefa78cf6ecab2ae0243c27; original byte range [166890, 168159).
__d(101, function (i, t, a, n) {
  "use strict";

  var r = t(380),
    s = {
      reinitializeTransaction: function () {
        this.transactionWrappers = this.getTransactionWrappers(), this.wrapperInitData ? this.wrapperInitData.length = 0 : this.wrapperInitData = [], this._isInTransaction = !1;
      },
      _isInTransaction: !1,
      getTransactionWrappers: null,
      isInTransaction: function () {
        return !!this._isInTransaction;
      },
      perform: function (i, t, a, n, s, l, e, c) {
        this.isInTransaction() ? r(!1) : void 0;
        var h, o;
        try {
          this._isInTransaction = !0, h = !0, this.initializeAll(0), o = i.call(t, a, n, s, l, e, c), h = !1;
        } finally {
          try {
            if (h) try {
              this.closeAll(0);
            } catch (p) {} else this.closeAll(0);
          } finally {
            this._isInTransaction = !1;
          }
        }
        return o;
      },
      initializeAll: function (i) {
        for (var t = this.transactionWrappers, a = i; a < t.length; a++) {
          var n = t[a];
          try {
            this.wrapperInitData[a] = l.OBSERVED_ERROR, this.wrapperInitData[a] = n.initialize ? n.initialize.call(this) : null;
          } finally {
            if (this.wrapperInitData[a] === l.OBSERVED_ERROR) try {
              this.initializeAll(a + 1);
            } catch (r) {}
          }
        }
      },
      closeAll: function (i) {
        this.isInTransaction() ? void 0 : r(!1);
        for (var t = this.transactionWrappers, a = i; a < t.length; a++) {
          var n,
            s = t[a],
            e = this.wrapperInitData[a];
          try {
            n = !0, e !== l.OBSERVED_ERROR && s.close && s.close.call(this, e), n = !1;
          } finally {
            if (n) try {
              this.closeAll(a + 1);
            } catch (c) {}
          }
        }
        this.wrapperInitData.length = 0;
      }
    },
    l = {
      Mixin: s,
      OBSERVED_ERROR: {}
    };
  a.exports = l;
});
