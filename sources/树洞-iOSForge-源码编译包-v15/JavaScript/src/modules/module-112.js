// Recovered module 112; analysis path, not original filename.
// Original SHA-256 3c736bf30ca3201bf9ccac6bdbc97d92a4e1c9f4204e0005297105ce9e031c6a; original byte range [181938, 182507).
__d(112, function (n, t, e, o) {
  "use strict";

  function i(n) {
    if ("function" == typeof n.type) return n.type;
    var t = n.type,
      e = p[t];
    return null == e && (p[t] = e = f(t)), e;
  }
  function r(n) {
    return a ? void 0 : l(!1), new a(n);
  }
  function c(n) {
    return new C(n);
  }
  function u(n) {
    return n instanceof C;
  }
  var s = t(379),
    l = t(380),
    f = null,
    a = null,
    p = {},
    C = null,
    m = {
      injectGenericComponentClass: function (n) {
        a = n;
      },
      injectTextComponentClass: function (n) {
        C = n;
      },
      injectComponentClasses: function (n) {
        s(p, n);
      }
    },
    j = {
      getComponentClassForElement: i,
      createInternalComponent: r,
      createInstanceForText: c,
      isTextComponent: u,
      injection: m
    };
  e.exports = j;
});
