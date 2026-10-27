// Local maintenance wallet. No Apple, payment, HTTP or WebSocket calls.
__d(9001, function (global, require, module, exports) {
  "use strict";
  var queues = Object.create(null);
  module.exports = function createTestWallet(storage) {
    var queue = Promise.resolve();
    function load() {
      return Promise.resolve().then(storage.read).then(function (value) {
        if (!value) return {balance: 0, spent: {}, migratedSources: {}};
        if (typeof value.balance !== "number" || !isFinite(value.balance) || value.balance < 0 || Math.floor(value.balance) !== value.balance) throw new Error("Invalid test wallet balance");
        return {balance: value.balance, spent: value.spent || {}, migratedSources: value.migratedSources || {}};
      });
    }
    function serial(action) {
      var result = (storage.lockKey ? queues[storage.lockKey] || Promise.resolve() : queue).then(action);
      queue = result.then(function () {}, function () {});
      if (storage.lockKey) queues[storage.lockKey] = queue;
      return result;
    }
    function amount(value) {
      if (typeof value !== "number" || !isFinite(value) || value <= 0 || Math.floor(value) !== value) throw new Error("Invalid test star amount");
    }
    return {
      balance: function () { return serial(load); },
      migrate: function (sourceId, legacy, messagePrefix) {
        return serial(function () {
          return load().then(function (state) {
            if (state.migratedSources[sourceId]) return state;
            if (legacy) {
              if (typeof legacy.balance !== "number" || !isFinite(legacy.balance) || legacy.balance < 0 || Math.floor(legacy.balance) !== legacy.balance) throw new Error("Invalid legacy test wallet balance");
              state.balance += legacy.balance;
              Object.keys(legacy.spent || {}).forEach(function (key) { state.spent[messagePrefix + key] = true; });
            }
            state.migratedSources[sourceId] = true;
            return storage.write(state).then(function () { return state; });
          });
        });
      },
      grant: function (count) {
        return serial(function () {
          amount(count);
          return load().then(function (state) {
            state.balance += count;
            return storage.write(state).then(function () { return {ok: true, balance: state.balance}; });
          });
        });
      },
      claim: function (count) {
        return serial(function () {
          amount(count);
          return load().then(function (state) {
            if (state.balance > 0) return {ok: false, balance: state.balance};
            state.balance = count;
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
