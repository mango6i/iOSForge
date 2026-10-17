// Local maintenance wallet. No Apple, payment, HTTP or WebSocket calls.
__d(9001, function (global, require, module, exports) {
  "use strict";
  module.exports = function createTestWallet(storage) {
    var queue = Promise.resolve();
    function load() {
      return Promise.resolve().then(storage.read).then(function (value) {
        if (!value) return {balance: 0, spent: {}};
        if (typeof value.balance !== "number" || !isFinite(value.balance) || value.balance < 0 || Math.floor(value.balance) !== value.balance) throw new Error("Invalid test wallet balance");
        return {balance: value.balance, spent: value.spent || {}};
      });
    }
    function serial(action) {
      var result = queue.then(action);
      queue = result.then(function () {}, function () {});
      return result;
    }
    function amount(value) {
      if (typeof value !== "number" || !isFinite(value) || value <= 0 || Math.floor(value) !== value) throw new Error("Invalid test star amount");
    }
    return {
      balance: function () { return serial(load); },
      grant: function (count) {
        return serial(function () {
          amount(count);
          return load().then(function (state) {
            state.balance += count;
            return storage.write(state).then(function () { return {ok: true, balance: state.balance}; });
          });
        });
      },
      spend: function (count, messageKey) {
        return serial(function () {
          amount(count);
          if (!messageKey) throw new Error("Missing image message identity");
          return load().then(function (state) {
            if (state.spent[messageKey]) return {ok: true, alreadySpent: true, balance: state.balance};
            if (state.balance < count) return {ok: false, balance: state.balance};
            state.balance -= count;
            state.spent[messageKey] = true;
            return storage.write(state).then(function () { return {ok: true, alreadySpent: false, balance: state.balance}; });
          });
        });
      }
    };
  };
});
