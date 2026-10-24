// Recovered module 84; analysis path, not original filename.
// Original SHA-256 828af8cd817af1089ea0d477b358e87eef807cce92725f1e88b0edc3f21a08de; original byte range [152627, 153041).
__d(84, function (e, o, n, t) {
  "use strict";

  function r(e) {
    for (var o; o = e._renderedComponent;) e = o;
    return e;
  }
  function c(e, o) {
    var n = r(e);
    s[o] = n;
  }
  function d(e) {
    var o = e._rootNodeID;
    o && delete s[o];
  }
  function u(e) {
    return s[e] || null;
  }
  function a(e) {
    return e._rootNodeID ? void 0 : i(!1), e._rootNodeID;
  }
  var i = o(380),
    s = {},
    N = {
      getClosestInstanceFromNode: u,
      getInstanceFromNode: u,
      getNodeFromInstance: a,
      precacheNode: c,
      uncacheNode: d
    };
  n.exports = N;
});
