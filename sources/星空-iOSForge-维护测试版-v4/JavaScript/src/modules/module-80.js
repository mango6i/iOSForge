// Recovered module 80; analysis path, not original filename.
// Original SHA-256 140471df7c207925a695d80fde4278920f346ac575b4e4ad4c7512d0c71ef9a9; original byte range [149531, 150297).
__d(80, function (r, e, o, t) {
  "use strict";

  function a(r, e, o) {
    var t = n[r];
    if (!t || !t.NativeProps) return c(!1, 'Native component for "%s" does not exist', r), C;
    var a = babelHelpers["extends"]({}, n.RCTView.NativeProps, t.NativeProps);
    t.uiViewClassName = r, t.validAttributes = {}, t.propTypes = e && e.propTypes;
    for (var s in a) {
      var l = !1,
        v = {},
        u = m[a[s]];
      u && (v.diff = u, l = !0);
      var f = A[a[s]];
      f && (v.process = f, l = !0), t.validAttributes[s] = l ? v : !0;
    }
    return t.validAttributes.style = i, p(t);
  }
  function s(r) {
    return r && r.map(f);
  }
  var i = e(73),
    n = e(30),
    C = e(81),
    p = e(82),
    l = e(115),
    v = e(116),
    u = e(74),
    f = e(56),
    d = e(117),
    I = e(77),
    c = (e(120), e(381)),
    m = {
      CATransform3D: u,
      CGPoint: v,
      CGSize: I,
      UIEdgeInsets: l
    },
    A = {
      CGColor: f,
      CGColorArray: s,
      UIColor: f,
      UIColorArray: s,
      CGImage: d,
      UIImage: d,
      RCTImageSource: d,
      Color: f,
      ColorArray: s
    };
  o.exports = a;
});
