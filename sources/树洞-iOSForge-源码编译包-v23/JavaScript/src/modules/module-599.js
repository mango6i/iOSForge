// Recovered module 599; analysis path, not original filename.
// Original SHA-256 20f21b7369f1dfa3a089af795953e3484af3685fa7e8fd47880d425c083f04e8; original byte range [1617042, 1617451).
__d(599, function (e, l, a, o) {
  "use strict";

  var c = l(312),
    t = (c.Platform, c.NativeModules),
    r = t.RNI18n,
    p = l(613);
  p.rawLocale = r.locale, p.locale = r.locale.toLowerCase().replace(/-/g, "_"), p.locale = p.locale.replace(/#/g, "");
  var s = p.locale.split("_");
  3 === s.length ? ("zh" === s[0] && "cn" !== s[2] && (s[2] = "cn"), p.locale = s[0] + "_" + s[2].toUpperCase()) : 2 === s.length ? p.locale = s[0] + "_" + s[1].toUpperCase() : p.locale = s[0] + "_US", a.exports = p;
});
