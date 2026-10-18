// Recovered module 88; analysis path, not original filename.
// Original SHA-256 8e11fd887977fe5d5a02dee260a9dfd50e22900cb1974723c3a2f9de54d2fd62; original byte range [156912, 158587).
__d(88, function (e, n, i, r) {
  "use strict";

  function t() {
    if (v) for (var e in u) {
      var n = u[e],
        i = v.indexOf(e);
      if (i > -1 ? void 0 : o(!1), !l.plugins[i]) {
        n.extractEvents ? void 0 : o(!1), l.plugins[i] = n;
        var r = n.eventTypes;
        for (var t in r) a(r[t], n, t) ? void 0 : o(!1);
      }
    }
  }
  function a(e, n, i) {
    l.eventNameDispatchConfigs.hasOwnProperty(i) ? o(!1) : void 0, l.eventNameDispatchConfigs[i] = e;
    var r = e.phasedRegistrationNames;
    if (r) {
      for (var t in r) if (r.hasOwnProperty(t)) {
        var a = r[t];
        s(a, n, i);
      }
      return !0;
    }
    return e.registrationName ? (s(e.registrationName, n, i), !0) : !1;
  }
  function s(e, n, i) {
    l.registrationNameModules[e] ? o(!1) : void 0, l.registrationNameModules[e] = n, l.registrationNameDependencies[e] = n.eventTypes[i].dependencies;
  }
  var o = n(380),
    v = null,
    u = {},
    l = {
      plugins: [],
      eventNameDispatchConfigs: {},
      registrationNameModules: {},
      registrationNameDependencies: {},
      possibleRegistrationNames: null,
      injectEventPluginOrder: function (e) {
        v ? o(!1) : void 0, v = Array.prototype.slice.call(e), t();
      },
      injectEventPluginsByName: function (e) {
        var n = !1;
        for (var i in e) if (e.hasOwnProperty(i)) {
          var r = e[i];
          u.hasOwnProperty(i) && u[i] === r || (u[i] ? o(!1) : void 0, u[i] = r, n = !0);
        }
        n && t();
      },
      getPluginModuleForEvent: function (e) {
        var n = e.dispatchConfig;
        if (n.registrationName) return l.registrationNameModules[n.registrationName] || null;
        for (var i in n.phasedRegistrationNames) if (n.phasedRegistrationNames.hasOwnProperty(i)) {
          var r = l.registrationNameModules[n.phasedRegistrationNames[i]];
          if (r) return r;
        }
        return null;
      },
      _resetEventPlugins: function () {
        v = null;
        for (var e in u) u.hasOwnProperty(e) && delete u[e];
        l.plugins.length = 0;
        var n = l.eventNameDispatchConfigs;
        for (var i in n) n.hasOwnProperty(i) && delete n[i];
        var r = l.registrationNameModules;
        for (var t in r) r.hasOwnProperty(t) && delete r[t];
      }
    };
  i.exports = l;
});
