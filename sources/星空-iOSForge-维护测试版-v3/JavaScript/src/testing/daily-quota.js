// Local daily quotas. Real network responses and received content remain authoritative.
__d(9002, function (global, require, module, exports) {
  "use strict";
  var queues = Object.create(null);
  module.exports = function createDailyQuota(storage, options) {
    var queue = Promise.resolve(), pending = {send: {}, receive: {}};
    function serial(action) {
      var result = (storage.lockKey ? queues[storage.lockKey] || Promise.resolve() : queue).then(action);
      queue = result.then(function () {}, function () {});
      if (storage.lockKey) queues[storage.lockKey] = queue;
      return result;
    }
    function limits(value) {
      if (typeof value !== "number" || !isFinite(value) || value < 0 || value > 10000 || Math.floor(value) !== value) throw new Error("额度须为0至10000之间的整数");
    }
    function period() {
      var now = options.now(), hour = Number(options.resetHour());
      if (!isFinite(hour) || hour < 0 || hour > 23) hour = 3;
      var start = new Date(now); start.setHours(hour, 0, 0, 0);
      if (now < start.getTime()) start.setDate(start.getDate() - 1);
      var end = new Date(start.getTime()); end.setDate(end.getDate() + 1);
      return {start: start.getTime(), end: end.getTime(), now: now};
    }
    function kind(value) { if (value !== "send" && value !== "receive") throw new Error("Invalid quota direction"); }
    function load() {
      var p = period();
      return Promise.all([storage.read(), storage.history(p.start, p.end)]).then(function (values) {
        var state = values[0] || {sendLimit: 100, receiveLimit: 100, days: {}};
        limits(state.sendLimit); limits(state.receiveLimit);
        state.days = state.days || {};
        var day = state.days[p.start] || {send: {}, receive: {}};
        day.send = day.send || {}; day.receive = day.receive || {};
        ["send", "receive"].forEach(function (direction) {
          (values[1][direction] || []).forEach(function (id) { if (id) day[direction][id] = true; });
          Object.keys(pending[direction]).forEach(function (id) {
            if (pending[direction][id].end !== p.end || pending[direction][id].expires <= p.now) delete pending[direction][id];
          });
        });
        state.days[p.start] = day;
        Object.keys(state.days).forEach(function (key) { if (Number(key) < p.start - 8 * 86400000) delete state.days[key]; });
        return {state: state, day: day, period: p};
      });
    }
    function view(record) {
      var sent = Object.keys(record.day.send).length, received = Object.keys(record.day.receive).length;
      return {sendLimit: record.state.sendLimit, receiveLimit: record.state.receiveLimit,
        sent: sent, received: received,
        sendRemaining: Math.max(0, record.state.sendLimit - sent - Object.keys(pending.send).length),
        receiveRemaining: Math.max(0, record.state.receiveLimit - received - Object.keys(pending.receive).length),
        dayStart: record.period.start, resetAt: record.period.end};
    }
    function save(record) { return storage.write(record.state).then(function () { return view(record); }); }
    return {
      snapshot: function () { return serial(function () { return load().then(save); }); },
      setLimits: function (sendLimit, receiveLimit) {
        return serial(function () {
          limits(sendLimit); limits(receiveLimit);
          return load().then(function (r) { r.state.sendLimit = sendLimit; r.state.receiveLimit = receiveLimit; return save(r); });
        });
      },
      reserve: function (direction, id) {
        return serial(function () {
          kind(direction); if (!id) throw new Error("Missing operation identity");
          return load().then(function (r) {
            if (r.day[direction][id] || pending[direction][id]) return {ok: true, snapshot: view(r)};
            var remaining = direction === "send" ? view(r).sendRemaining : view(r).receiveRemaining;
            if (!remaining) return {ok: false, snapshot: view(r)};
            pending[direction][id] = {end: r.period.end, expires: r.period.now + 60000};
            return {ok: true, snapshot: view(r)};
          });
        });
      },
      commit: function (direction, id, reservationId) {
        return serial(function () {
          kind(direction); if (!id) throw new Error("Missing operation identity");
          return load().then(function (r) {
            var duplicateReceipt = direction === "receive" && !!(r.day.receiptHandled && r.day.receiptHandled[id]);
            if (direction === "receive") {
              r.day.receiptHandled = r.day.receiptHandled || {};
              r.day.receiptHandled[id] = true;
            }
            r.day[direction][id] = true;
            return storage.write(r.state).then(function () {
              if (!duplicateReceipt) delete pending[direction][reservationId || id];
              var result = view(r);
              if (direction === "receive") result.receiptDuplicate = duplicateReceipt;
              return result;
            });
          });
        });
      },
      release: function (direction, id) {
        return serial(function () { kind(direction); delete pending[direction][id]; return load().then(view); });
      }
    };
  };
});
