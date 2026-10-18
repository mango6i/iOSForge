// Recovered module 295; analysis path, not original filename.
// Original SHA-256 3e2895c0ab46a483167c6c5345c8b9beddff0ac25e082493a4246e54c6847981; original byte range [569946, 571944).
__d(295, function (e, n, r, i) {
  "use strict";

  function t(e) {
    return e instanceof Object && e.children instanceof Array && void 0 !== e.children[0] && "number" == typeof e.index && void 0 !== e.children[e.index] ? e : null;
  }
  function l(e, n) {
    var r = t(e);
    if (!r) return null;
    var i = r.children.find(function (e) {
      return e.key === n;
    });
    return i || null;
  }
  function d(e, n) {
    var r = t(e);
    if (!r) return null;
    var i = r.children.map(function (e) {
      return e.key;
    }).indexOf(n);
    return -1 === i ? null : i;
  }
  function c(e, n) {
    var r = e.children;
    return babelHelpers["extends"]({}, e, {
      children: [].concat(babelHelpers.toConsumableArray(r), [n]),
      index: r.length
    });
  }
  function a(e) {
    var n = e.children;
    return babelHelpers["extends"]({}, e, {
      children: n.slice(0, n.length - 1),
      index: n.length - 2
    });
  }
  function u(e, n, r) {
    var i = t(e);
    if (!i) return e;
    var l = n || i.children,
      d = null == r ? i.index : r;
    return l === i.children && d === i.index ? e : babelHelpers["extends"]({}, i, {
      children: l,
      index: d
    });
  }
  function o(e, n, r, i) {
    if (!e) return {
      children: r,
      index: i,
      key: n
    };
    var l = t(e);
    return l ? r === l.children && i === l.index && n === l.key ? l : babelHelpers["extends"]({}, l, {
      children: r,
      index: i,
      key: n
    }) : {
      children: r,
      index: i,
      key: n
    };
  }
  function h(e, n) {
    var r = t(e);
    return r && r.index === n ? r : babelHelpers["extends"]({}, r, {
      index: n
    });
  }
  function f(e, n) {
    var r = t(e);
    if (!r) return e;
    var i = r.children.indexOf(r.children.find(function (e) {
      return e.key === n;
    }));
    return b(-1 !== i, "Cannot find child with matching key in this NavigationState"), babelHelpers["extends"]({}, r, {
      index: i
    });
  }
  function s(e, n, r) {
    var i = t(e);
    if (!i) return e;
    var l = [].concat(babelHelpers.toConsumableArray(i.children)),
      d = i.children.indexOf(i.children.find(function (e) {
        return e.key === n;
      }));
    return b(-1 !== d, "Cannot find child with matching key in this NavigationState"), l[d] = r, babelHelpers["extends"]({}, i, {
      children: l
    });
  }
  function x(e, n, r) {
    var i = t(e);
    if (!i) return e;
    var l = [].concat(babelHelpers.toConsumableArray(i.children));
    return l[n] = r, babelHelpers["extends"]({}, i, {
      children: l
    });
  }
  var b = n(380),
    p = {
      getParent: t,
      get: l,
      indexOf: d,
      push: c,
      pop: a,
      reset: u,
      set: o,
      jumpToIndex: h,
      jumpTo: f,
      replaceAt: s,
      replaceAtIndex: x
    };
  r.exports = p;
});
