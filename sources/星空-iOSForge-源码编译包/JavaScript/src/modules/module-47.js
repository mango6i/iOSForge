// Recovered module 47; analysis path, not original filename.
// Original SHA-256 1af1d18364614ca0bed2c5b3751c97d6168f9ab58418f2dd472a3b69335c4c1d; original byte range [117691, 119015).
__d(47, function (e, r, t, i) {
  var n = r(48),
    s = r(50),
    u = r(383),
    c = r(380),
    o = function () {
      function e(r) {
        babelHelpers.classCallCheck(this, e), this._subscriber = r || new s();
      }
      return babelHelpers.createClass(e, [{
        key: "addListener",
        value: function (e, r, t) {
          return this._subscriber.addSubscription(e, new n(this, this._subscriber, r, t));
        }
      }, {
        key: "once",
        value: function (e, r, t) {
          var i = this,
            n = arguments;
          return this.addListener(e, function () {
            i.removeCurrentListener(), r.apply(t, n);
          });
        }
      }, {
        key: "removeAllListeners",
        value: function (e) {
          this._subscriber.removeAllSubscriptions(e);
        }
      }, {
        key: "removeCurrentListener",
        value: function () {
          c(!!this._currentSubscription, "Not in an emitting cycle; there is no current subscription"), this.removeSubscription(this._currentSubscription);
        }
      }, {
        key: "removeSubscription",
        value: function (e) {
          c(e.emitter === this, "Subscription does not belong to this emitter."), this._subscriber.removeSubscription(e);
        }
      }, {
        key: "listeners",
        value: function (e) {
          var r = this._subscriber.getSubscriptionsForType(e);
          return r ? r.filter(u.thatReturnsTrue).map(function (e) {
            return e.listener;
          }) : [];
        }
      }, {
        key: "emit",
        value: function (e) {
          var r = this._subscriber.getSubscriptionsForType(e);
          if (r) {
            for (var t = 0, i = r.length; i > t; t++) {
              var n = r[t];
              n && (this._currentSubscription = n, n.listener.apply(n.context, Array.prototype.slice.call(arguments, 1)));
            }
            this._currentSubscription = null;
          }
        }
      }]), e;
    }();
  t.exports = o;
});
