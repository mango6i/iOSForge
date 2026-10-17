// Recovered module 636; analysis path, not original filename.
// Original SHA-256 662dab2b6b4e69cf9b2bfc31f4144cbd464bf43ed42b67d26de1d82c4084741a; original byte range [1658731, 1667901).
__d(636, function (t, e, n, o) {
  var r,
    a,
    s,
    i,
    c,
    d,
    l,
    u,
    h,
    p,
    f,
    b = e(312).NativeModules,
    g = {};
  s = /^\s*(?:drop|delete|insert|update|create)\s/i, r = "INIT", a = "OPEN", f = {}, h = function (t, e) {
    var n;
    return n = t, e || (e = 0), n || (n = new Error("a plugin had an error but provided no response"), n.code = e), "string" == typeof n && (n = new Error(t), n.code = e), !n.code && n.message && (n.code = e), n.code || n.message || (n = new Error("an unknown error was returned: " + JSON.stringify(n)), n.code = e), n;
  }, p = window.setImmediate || function (t) {
    window.setTimeout(t, 0);
  }, l = function (t) {
    return function () {
      var e, n, o;
      if (o = arguments.length) {
        for (e = [], n = -1; ++n < o;) e[n] = arguments[n];
        return t.call(this, e);
      }
      return t.call(this, []);
    };
  }, g.exec = function (t, e, n, o) {
    g.sqlitePlugin.DEBUG && console.log("SQLite." + t + "(" + JSON.stringify(e) + ")"), b.SQLite[t](e, n, o);
  }, c = function (t, e, n) {
    var o;
    if (!t || !t.name) throw h("Cannot create a SQLitePlugin db instance without a db name");
    if (o = t.name, "string" != typeof o) throw h("sqlite plugin database name must be a string");
    this.openargs = t, this.dbname = o, this.openSuccess = e, this.openError = n, this.openSuccess || (this.openSuccess = function () {
      console.log("DB opened: " + o);
    }), this.openError || (this.openError = function (t) {
      console.log(t.message);
    }), this.open(this.openSuccess, this.openError);
  }, c.prototype.databaseFeatures = {
    isSQLitePluginDatabase: !0
  }, c.prototype.openDBs = {}, c.prototype.addTransaction = function (t) {
    f[this.dbname] || (f[this.dbname] = {
      queue: [],
      inProgress: !1
    }), f[this.dbname].queue.push(t), this.dbname in this.openDBs && this.openDBs[this.dbname] !== r ? this.startNextTransaction() : this.dbname in this.openDBs ? console.log("new transaction is waiting for open operation") : console.log("database is closed, new transaction is [stuck] waiting until db is opened again!");
  }, c.prototype.transaction = function (t, e, n) {
    return this.openDBs[this.dbname] ? void this.addTransaction(new d(this, t, e, n, !0, !1)) : void e(h("database not open"));
  }, c.prototype.readTransaction = function (t, e, n) {
    return this.openDBs[this.dbname] ? void this.addTransaction(new d(this, t, e, n, !1, !0)) : void e(h("database not open"));
  }, c.prototype.startNextTransaction = function () {
    var t;
    t = this, p(function (e) {
      return function () {
        var n;
        return e.dbname in e.openDBs && e.openDBs[e.dbname] === a ? (n = f[t.dbname]) ? void (n.queue.length > 0 && !n.inProgress && (n.inProgress = !0, n.queue.shift().start())) : void console.log("cannot start next transaction: database connection is lost") : void console.log("cannot start next transaction: database not open");
      };
    }(this));
  }, c.prototype.abortAllPendingTransactions = function () {
    var t, e, n, o, r;
    if (r = f[this.dbname], r && r.queue.length > 0) {
      for (n = r.queue, t = 0, e = n.length; e > t; t++) o = n[t], o.abortFromQ(h("Invalid database handle"));
      r.queue = [], r.inProgress = !1;
    }
  }, c.prototype.open = function (t, e) {
    var n, o;
    this.dbname in this.openDBs ? (console.log("database already open: " + this.dbname), p(function (e) {
      return function () {
        t(e);
      };
    }(this))) : (console.log("OPEN database: " + this.dbname), o = function (e) {
      return function () {
        var n;
        e.openDBs[e.dbname] || console.log("database was closed during open operation"), e.dbname in e.openDBs && (e.openDBs[e.dbname] = a), t && t(e), n = f[e.dbname], n && n.queue.length > 0 && !n.inProgress && e.startNextTransaction();
      };
    }(this), n = function (t) {
      return function () {
        console.log("OPEN database: " + t.dbname + " failed, aborting any pending transactions"), e && e(h("Could not open database")), delete t.openDBs[t.dbname], t.abortAllPendingTransactions();
      };
    }(this), this.openDBs[this.dbname] = r, g.exec("open", this.openargs, o, n));
  }, c.prototype.close = function (t, e) {
    if (this.dbname in this.openDBs) {
      if (f[this.dbname] && f[this.dbname].inProgress) return console.log("cannot close: transaction is in progress"), void e(h("database cannot be closed while a transaction is in progress"));
      console.log("CLOSE database: " + this.dbname), delete this.openDBs[this.dbname], f[this.dbname] ? console.log("closing db with transaction queue length: " + f[this.dbname].queue.length) : console.log("closing db with no transaction lock state");
      var n = function (e, n) {
          return t ? t(n) : void 0;
        },
        o = function (t, n) {
          return e ? e(n) : void console.log("Error handler not provided: ", n);
        };
      g.exec("close", {
        path: this.dbname
      }, n, o);
    } else {
      var r = "cannot close: database is not open";
      console.log(r), e && p(function () {
        return e(r);
      });
    }
  }, c.prototype.executeSql = function (t, e, n, o) {
    var r, a, s;
    s = function (t, e) {
      return n ? n(e) : void 0;
    }, r = function (t, e) {
      return o ? o(e) : void console.log("Error handler not provided: ", e);
    }, a = function (n) {
      n.addStatement(t, e, s, r);
    }, this.addTransaction(new d(this, a, null, null, !1, !1));
  }, d = function (t, e, n, o, r, a) {
    if ("function" != typeof e) {
      var s = h("transaction expected a function");
      if (n) return n(s);
      throw s;
    }
    this.db = t, this.fn = e, this.error = n, this.success = o, this.txlock = r, this.readOnly = a, this.executes = [], r && this.addStatement("BEGIN", [], null, function (t, e) {
      throw h("unable to begin transaction: " + e.message, e.code);
    });
  }, d.prototype.start = function () {
    var t;
    try {
      this.fn(this), this.run();
    } catch (e) {
      t = e, f[this.db.dbname].inProgress = !1, this.db.startNextTransaction(), this.error && this.error(h(t));
    }
  }, d.prototype.executeSql = function (t, e, n, o) {
    var r = this;
    if (r.finalized) throw {
      message: "InvalidStateError: DOM Exception 11: This transaction is already finalized. Transactions are committed after its success or failure handlers are called. If you are using a Promise to handle callbacks, be aware that implementations following the A+ standard adhere to run-to-completion semantics and so Promise resolution occurs on a subsequent tick and therefore after the transaction commits.",
      code: 11
    };
    if (r.readOnly && s.test(t)) return void r.handleStatementFailure(o, {
      message: "invalid sql for a read-only transaction"
    });
    var a = function (t, e) {
        return n ? n(t, e) : void 0;
      },
      i = function (t, e) {
        return o ? o(e) : void console.log("Error handler not provided: ", e);
      };
    r.addStatement(t, e, a, i);
  }, d.prototype.addStatement = function (t, e, n, o) {
    try {
      var r, a, s, i, c;
      if (s = [], e && e.constructor === Array) for (r = 0, a = e.length; a > r; r++) c = e[r], i = typeof c, null === c || void 0 === c || "number" === i || "string" === i ? s.push(c) : "boolean" === i ? s.push(~~c) : s.push(c.toString());
      this.executes.push({
        success: n,
        error: o,
        sql: t,
        params: s
      });
    } catch (d) {
      console.error(d);
    }
  }, d.prototype.handleStatementSuccess = function (t, e) {
    var n, o;
    t && (o = e.rows || [], n = {
      rows: {
        item: function (t) {
          return o[t];
        },
        length: o.length
      },
      rowsAffected: e.rowsAffected || 0,
      insertId: e.insertId || void 0
    }, t(this, n));
  }, d.prototype.handleStatementFailure = function (t, e) {
    if (!t) throw h("a statement with no error handler failed: " + e.message, e.code);
    if (t(this, e) !== !1) throw h("a statement error callback did not return false: " + e.message, e.code);
  }, d.prototype.run = function () {
    var t, e, n, o, r, a, s, i, c, d;
    for (c = null, s = [], t = this.executes, d = t.length, this.executes = [], i = this, e = function (e, n) {
      return function (o) {
        var r;
        try {
          n ? i.handleStatementSuccess(t[e].success, o) : i.handleStatementFailure(t[e].error, h(o));
        } catch (a) {
          r = a, c || (c = h(r));
        }
        0 === --d && (c ? i.abort(c) : i.executes.length > 0 ? i.run() : i.finish());
      };
    }, n = 0, r = {}; n < t.length;) a = t[n], r[n] = {
      success: e(n, !0),
      error: e(n, !1)
    }, s.push({
      qid: 1111,
      sql: a.sql,
      params: a.params
    }), n++;
    o = function (t) {
      var e, o, a, s, i, c, d;
      for (o = t.length - 1, n = e = 0, i = o; i >= 0 ? i >= e : e >= i; n = i >= 0 ? ++e : --e) s = t[n], d = s.type, c = s.result, a = r[n], a && a[d] && a[d](c);
    };
    var l = function (t) {
      console.log("batch execution error: ", t);
    };
    g.exec("backgroundExecuteSqlBatch", {
      dbargs: {
        dbname: this.db.dbname
      },
      executes: s
    }, o, l);
  }, d.prototype.abort = function (t) {
    var e, n, o;
    this.finalized || (o = this, n = function (e) {
      f[e.db.dbname].inProgress = !1, e.db.startNextTransaction(), e.error && e.error(t);
    }, e = function (t, e) {
      f[t.db.dbname].inProgress = !1, t.db.startNextTransaction(), t.error && t.error(h("error while trying to roll back: " + e.message, e.code));
    }, this.finalized = !0, this.txlock ? (this.addStatement("ROLLBACK", [], n, e), this.run()) : n(o));
  }, d.prototype.finish = function () {
    var t, e, n;
    this.finalized || (n = this, e = function (t) {
      f[t.db.dbname].inProgress = !1, t.db.startNextTransaction(), t.success && t.success();
    }, t = function (t, e) {
      f[t.db.dbname].inProgress = !1, t.db.startNextTransaction(), t.error && t.error(h("error while trying to commit: " + e.message, e.code));
    }, this.finalized = !0, this.txlock ? (this.addStatement("COMMIT", [], e, t), this.run()) : e(n));
  }, d.prototype.abortFromQ = function (t) {
    this.error && this.error(t);
  }, u = ["docs", "libs", "nosync"], i = function () {}, i.prototype.DEBUG = function (t) {
    console.log("Setting debug to:", t), g.sqlitePlugin.DEBUG = t;
  }, i.prototype.sqliteFeatures = function () {
    return {
      isSQLitePlugin: !0
    };
  }, i.prototype.openDatabase = l(function (t) {
    var e, n, o, r, a;
    return t.length < 1 ? null : (o = t[0], a = null, r = null, n = null, o.constructor === String ? (a = {
      name: o
    }, t.length >= 5 && (r = t[4], t.length > 5 && (n = t[5]))) : (a = o, t.length >= 2 && (r = t[1], t.length > 2 && (n = t[2]))), e = a.location ? u[a.location] : null, a.dblocation = e || u[0], a.createFromLocation && 1 === a.createFromLocation && (a.createFromResource = "1"), a.androidDatabaseImplementation && 2 === a.androidDatabaseImplementation && (a.androidOldDatabaseImplementation = 1), a.androidLockWorkaround && 1 === a.androidLockWorkaround && (a.androidBugWorkaround = 1), new c(a, r, n));
  }), i.prototype.deleteDatabase = function (t, e, n) {
    var o, r;
    if (o = {}, t.constructor === String) o.path = t, o.dblocation = u[0];else {
      if (!t || !t.name) throw new Error("Please specify db name");
      o.path = t.name, r = t.location ? u[t.location] : null, o.dblocation = r || u[0];
    }
    delete c.prototype.openDBs[o.path], e = e || function () {}, n = n || function () {}, g.exec("delete", o, e, n);
  }, g.sqlitePlugin = {
    SQLiteFactory: i,
    SQLitePluginTransaction: d,
    SQLitePlugin: c
  }, n.exports = g.sqlitePlugin;
});
