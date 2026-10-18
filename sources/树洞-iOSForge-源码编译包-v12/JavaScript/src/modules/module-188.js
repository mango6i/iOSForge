// Recovered module 188; analysis path, not original filename.
// Original SHA-256 a8af6a78815de50ca61924fda2386d4be1fd481cbee6868005dfd9e36581b7dd; original byte range [326426, 328122).
__d(188, function (e, t, s, n) {
  "use strict";

  var u = t(380),
    a = !1,
    o = function () {
      function e(t) {
        var s = t.onMoreTasks;
        babelHelpers.classCallCheck(this, e), this._onMoreTasks = s, this._queueStack = [{
          tasks: [],
          popable: !1
        }];
      }
      return babelHelpers.createClass(e, [{
        key: "enqueue",
        value: function (e) {
          this._getCurrentQueue().push(e);
        }
      }, {
        key: "hasTasksToProcess",
        value: function () {
          return this._getCurrentQueue().length > 0;
        }
      }, {
        key: "processNext",
        value: function () {
          var e = this._getCurrentQueue();
          if (e.length) {
            var t = e.shift();
            try {
              t.gen ? (a && console.log("genPromise for task " + t.name), this._genPromise(t)) : t.run ? (a && console.log("run task " + t.name), t.run()) : (u("function" == typeof t, "Expected Function, SimpleTask, or PromiseTask, but got:\n" + JSON.stringify(t, null, 2)), a && console.log("run anonymous task"), t());
            } catch (s) {
              throw s.message = "TaskQueue: Error with task " + (t.name || "") + ": " + s.message, s;
            }
          }
        }
      }, {
        key: "_getCurrentQueue",
        value: function () {
          var e = this._queueStack.length - 1,
            t = this._queueStack[e];
          return t.popable && 0 === t.tasks.length && this._queueStack.length > 1 ? (this._queueStack.pop(), a && console.log("popped queue: ", {
            stackIdx: e,
            queueStackSize: this._queueStack.length
          }), this._getCurrentQueue()) : t.tasks;
        }
      }, {
        key: "_genPromise",
        value: function (e) {
          var t = this;
          this._queueStack.push({
            tasks: [],
            popable: !1
          });
          var s = this._queueStack.length - 1;
          a && console.log("push new queue: ", {
            stackIdx: s
          }), a && console.log("exec gen task " + e.name), e.gen().then(function () {
            a && console.log("onThen for gen task " + e.name, {
              stackIdx: s,
              queueStackSize: t._queueStack.length
            }), t._queueStack[s].popable = !0, t.hasTasksToProcess() && t._onMoreTasks();
          })["catch"](function (t) {
            throw t.message = "TaskQueue: Error resolving Promise in task " + e.name + ": " + t.message, t;
          }).done();
        }
      }]), e;
    }();
  s.exports = o;
});
