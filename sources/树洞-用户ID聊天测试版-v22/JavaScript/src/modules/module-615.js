// Recovered module 615; analysis path, not original filename.
// Original SHA-256 ff27d84f304cacc42bbbe04a2d82957d3bd49b896dc0e5738af72a5c8bd2966d; original byte range [1588184, 1595933).
__d(615, function (t, e, r, n) {
  !function (e) {
    function r(t, n) {
      function o(t) {
        if (o[t] !== y) return o[t];
        var e;
        if ("bug-string-char-index" == t) e = "a" != "a"[0];else if ("json" == t) e = o("json-stringify") && o("json-parse");else {
          var r,
            a = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
          if ("json-stringify" == t) {
            var l = n.stringify,
              u = "function" == typeof l && v;
            if (u) {
              (r = function () {
                return 1;
              }).toJSON = r;
              try {
                u = "0" === l(0) && "0" === l(new c()) && '""' == l(new i()) && l(d) === y && l(y) === y && l() === y && "1" === l(r) && "[1]" == l([r]) && "[null]" == l([y]) && "null" == l(null) && "[null,null,null]" == l([y, d, null]) && l({
                  a: [r, !0, !1, null, "\x00\b\n\f\r	"]
                }) == a && "1" === l(null, r) && "[\n 1,\n 2\n]" == l([1, 2], null, 1) && '"-271821-04-20T00:00:00.000Z"' == l(new f(-864e13)) && '"+275760-09-13T00:00:00.000Z"' == l(new f(864e13)) && '"-000001-01-01T00:00:00.000Z"' == l(new f(-621987552e5)) && '"1969-12-31T23:59:59.999Z"' == l(new f(-1));
              } catch (s) {
                u = !1;
              }
            }
            e = u;
          }
          if ("json-parse" == t) {
            var h = n.parse;
            if ("function" == typeof h) try {
              if (0 === h("0") && !h(!1)) {
                r = h(a);
                var p = 5 == r.a.length && 1 === r.a[0];
                if (p) {
                  try {
                    p = !h('"	"');
                  } catch (s) {}
                  if (p) try {
                    p = 1 !== h("01");
                  } catch (s) {}
                  if (p) try {
                    p = 1 !== h("1.");
                  } catch (s) {}
                }
              }
            } catch (s) {
              p = !1;
            }
            e = p;
          }
        }
        return o[t] = !!e;
      }
      t || (t = e.Object()), n || (n = e.Object());
      var c = t.Number || e.Number,
        i = t.String || e.String,
        a = t.Object || e.Object,
        f = t.Date || e.Date,
        l = t.SyntaxError || e.SyntaxError,
        u = t.TypeError || e.TypeError,
        s = t.Math || e.Math,
        h = t.JSON || e.JSON;
      "object" == typeof h && h && (n.stringify = h.stringify, n.parse = h.parse);
      var p,
        g,
        y,
        b = a.prototype,
        d = b.toString,
        v = new f(-0xc782b5b800cec);
      try {
        v = -109252 == v.getUTCFullYear() && 0 === v.getUTCMonth() && 1 === v.getUTCDate() && 10 == v.getUTCHours() && 37 == v.getUTCMinutes() && 6 == v.getUTCSeconds() && 708 == v.getUTCMilliseconds();
      } catch (C) {}
      if (!o("json")) {
        var j = "[object Function]",
          S = "[object Date]",
          O = "[object Number]",
          T = "[object String]",
          _ = "[object Array]",
          A = "[object Boolean]",
          w = o("bug-string-char-index");
        if (!v) var N = s.floor,
          U = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334],
          J = function (t, e) {
            return U[e] + 365 * (t - 1970) + N((t - 1969 + (e = +(e > 1))) / 4) - N((t - 1901 + e) / 100) + N((t - 1601 + e) / 400);
          };
        (p = b.hasOwnProperty) || (p = function (t) {
          var e,
            r = {};
          return (r.__proto__ = null, r.__proto__ = {
            toString: 1
          }, r).toString != d ? p = function (t) {
            var e = this.__proto__,
              r = t in (this.__proto__ = null, this);
            return this.__proto__ = e, r;
          } : (e = r.constructor, p = function (t) {
            var r = (this.constructor || e).prototype;
            return t in this && !(t in r && this[t] === r[t]);
          }), r = null, p.call(this, t);
        });
        var x = {
            boolean: 1,
            number: 1,
            string: 1,
            undefined: 1
          },
          M = function (t, e) {
            var r = typeof t[e];
            return "object" == r ? !!t[e] : !x[r];
          };
        if (g = function (t, e) {
          var r,
            n,
            o,
            c = 0;
          (r = function () {
            this.valueOf = 0;
          }).prototype.valueOf = 0, n = new r();
          for (o in n) p.call(n, o) && c++;
          return r = n = null, c ? g = 2 == c ? function (t, e) {
            var r,
              n = {},
              o = d.call(t) == j;
            for (r in t) o && "prototype" == r || p.call(n, r) || !(n[r] = 1) || !p.call(t, r) || e(r);
          } : function (t, e) {
            var r,
              n,
              o = d.call(t) == j;
            for (r in t) o && "prototype" == r || !p.call(t, r) || (n = "constructor" === r) || e(r);
            (n || p.call(t, r = "constructor")) && e(r);
          } : (n = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"], g = function (t, e) {
            var r,
              o,
              c = d.call(t) == j,
              i = !c && "function" != typeof t.constructor && M(t, "hasOwnProperty") ? t.hasOwnProperty : p;
            for (r in t) c && "prototype" == r || !i.call(t, r) || e(r);
            for (o = n.length; r = n[--o]; i.call(t, r) && e(r));
          }), g(t, e);
        }, !o("json-stringify")) {
          var m = {
              92: "\\\\",
              34: '\\"',
              8: "\\b",
              12: "\\f",
              10: "\\n",
              13: "\\r",
              9: "\\t"
            },
            k = "000000",
            D = function (t, e) {
              return (k + (e || 0)).slice(-t);
            },
            E = "\\u00",
            P = function (t) {
              for (var e = '"', r = 0, n = t.length, o = !w || n > 10, c = o && (w ? t.split("") : t); n > r; r++) {
                var i = t.charCodeAt(r);
                switch (i) {
                  case 8:
                  case 9:
                  case 10:
                  case 12:
                  case 13:
                  case 34:
                  case 92:
                    e += m[i];
                    break;
                  default:
                    if (32 > i) {
                      e += E + D(2, i.toString(16));
                      break;
                    }
                    e += o ? c[r] : t.charAt(r);
                }
              }
              return e + '"';
            },
            Z = function G(t, e, r, n, o, c, i) {
              var a, f, l, s, h, b, v, C, j, w, U, x, M, m, k, E;
              try {
                a = e[t];
              } catch (Z) {}
              if ("object" == typeof a && a) if (f = d.call(a), f != S || p.call(a, "toJSON")) "function" == typeof a.toJSON && (f != O && f != T && f != _ || p.call(a, "toJSON")) && (a = a.toJSON(t));else if (a > -1 / 0 && 1 / 0 > a) {
                if (J) {
                  for (h = N(a / 864e5), l = N(h / 365.2425) + 1970 - 1; J(l + 1, 0) <= h; l++);
                  for (s = N((h - J(l, 0)) / 30.42); J(l, s + 1) <= h; s++);
                  h = 1 + h - J(l, s), b = (a % 864e5 + 864e5) % 864e5, v = N(b / 36e5) % 24, C = N(b / 6e4) % 60, j = N(b / 1e3) % 60, w = b % 1e3;
                } else l = a.getUTCFullYear(), s = a.getUTCMonth(), h = a.getUTCDate(), v = a.getUTCHours(), C = a.getUTCMinutes(), j = a.getUTCSeconds(), w = a.getUTCMilliseconds();
                a = (0 >= l || l >= 1e4 ? (0 > l ? "-" : "+") + D(6, 0 > l ? -l : l) : D(4, l)) + "-" + D(2, s + 1) + "-" + D(2, h) + "T" + D(2, v) + ":" + D(2, C) + ":" + D(2, j) + "." + D(3, w) + "Z";
              } else a = null;
              if (r && (a = r.call(e, t, a)), null === a) return "null";
              if (f = d.call(a), f == A) return "" + a;
              if (f == O) return a > -1 / 0 && 1 / 0 > a ? "" + a : "null";
              if (f == T) return P("" + a);
              if ("object" == typeof a) {
                for (m = i.length; m--;) if (i[m] === a) throw u();
                if (i.push(a), U = [], k = c, c += o, f == _) {
                  for (M = 0, m = a.length; m > M; M++) x = G(M, a, r, n, o, c, i), U.push(x === y ? "null" : x);
                  E = U.length ? o ? "[\n" + c + U.join(",\n" + c) + "\n" + k + "]" : "[" + U.join(",") + "]" : "[]";
                } else g(n || a, function (t) {
                  var e = G(t, a, r, n, o, c, i);
                  e !== y && U.push(P(t) + ":" + (o ? " " : "") + e);
                }), E = U.length ? o ? "{\n" + c + U.join(",\n" + c) + "\n" + k + "}" : "{" + U.join(",") + "}" : "{}";
                return i.pop(), E;
              }
            };
          n.stringify = function (t, e, r) {
            var n, o, c, i;
            if ("function" == typeof e || "object" == typeof e && e) if ((i = d.call(e)) == j) o = e;else if (i == _) {
              c = {};
              for (var a, f = 0, l = e.length; l > f; a = e[f++], i = d.call(a), (i == T || i == O) && (c[a] = 1));
            }
            if (r) if ((i = d.call(r)) == O) {
              if ((r -= r % 1) > 0) for (n = "", r > 10 && (r = 10); n.length < r; n += " ");
            } else i == T && (n = r.length <= 10 ? r : r.slice(0, 10));
            return Z("", (a = {}, a[""] = t, a), o, c, n, "", []);
          };
        }
        if (!o("json-parse")) {
          var F,
            $,
            H = i.fromCharCode,
            I = {
              92: "\\",
              34: '"',
              47: "/",
              98: "\b",
              116: "	",
              110: "\n",
              102: "\f",
              114: "\r"
            },
            Y = function () {
              throw F = $ = null, l();
            },
            B = function () {
              for (var t, e, r, n, o, c = $, i = c.length; i > F;) switch (o = c.charCodeAt(F)) {
                case 9:
                case 10:
                case 13:
                case 32:
                  F++;
                  break;
                case 123:
                case 125:
                case 91:
                case 93:
                case 58:
                case 44:
                  return t = w ? c.charAt(F) : c[F], F++, t;
                case 34:
                  for (t = "@", F++; i > F;) if (o = c.charCodeAt(F), 32 > o) Y();else if (92 == o) switch (o = c.charCodeAt(++F)) {
                    case 92:
                    case 34:
                    case 47:
                    case 98:
                    case 116:
                    case 110:
                    case 102:
                    case 114:
                      t += I[o], F++;
                      break;
                    case 117:
                      for (e = ++F, r = F + 4; r > F; F++) o = c.charCodeAt(F), o >= 48 && 57 >= o || o >= 97 && 102 >= o || o >= 65 && 70 >= o || Y();
                      t += H("0x" + c.slice(e, F));
                      break;
                    default:
                      Y();
                  } else {
                    if (34 == o) break;
                    for (o = c.charCodeAt(F), e = F; o >= 32 && 92 != o && 34 != o;) o = c.charCodeAt(++F);
                    t += c.slice(e, F);
                  }
                  if (34 == c.charCodeAt(F)) return F++, t;
                  Y();
                default:
                  if (e = F, 45 == o && (n = !0, o = c.charCodeAt(++F)), o >= 48 && 57 >= o) {
                    for (48 == o && (o = c.charCodeAt(F + 1), o >= 48 && 57 >= o) && Y(), n = !1; i > F && (o = c.charCodeAt(F), o >= 48 && 57 >= o); F++);
                    if (46 == c.charCodeAt(F)) {
                      for (r = ++F; i > r && (o = c.charCodeAt(r), o >= 48 && 57 >= o); r++);
                      r == F && Y(), F = r;
                    }
                    if (o = c.charCodeAt(F), 101 == o || 69 == o) {
                      for (o = c.charCodeAt(++F), 43 != o && 45 != o || F++, r = F; i > r && (o = c.charCodeAt(r), o >= 48 && 57 >= o); r++);
                      r == F && Y(), F = r;
                    }
                    return +c.slice(e, F);
                  }
                  if (n && Y(), "true" == c.slice(F, F + 4)) return F += 4, !0;
                  if ("false" == c.slice(F, F + 5)) return F += 5, !1;
                  if ("null" == c.slice(F, F + 4)) return F += 4, null;
                  Y();
              }
              return "$";
            },
            L = function K(t) {
              var e, r;
              if ("$" == t && Y(), "string" == typeof t) {
                if ("@" == (w ? t.charAt(0) : t[0])) return t.slice(1);
                if ("[" == t) {
                  for (e = []; t = B(), "]" != t; r || (r = !0)) r && ("," == t ? (t = B(), "]" == t && Y()) : Y()), "," == t && Y(), e.push(K(t));
                  return e;
                }
                if ("{" == t) {
                  for (e = {}; t = B(), "}" != t; r || (r = !0)) r && ("," == t ? (t = B(), "}" == t && Y()) : Y()), "," != t && "string" == typeof t && "@" == (w ? t.charAt(0) : t[0]) && ":" == B() || Y(), e[t.slice(1)] = K(B());
                  return e;
                }
                Y();
              }
              return t;
            },
            q = function (t, e, r) {
              var n = z(t, e, r);
              n === y ? delete t[e] : t[e] = n;
            },
            z = function (t, e, r) {
              var n,
                o = t[e];
              if ("object" == typeof o && o) if (d.call(o) == _) for (n = o.length; n--;) q(o, n, r);else g(o, function (t) {
                q(o, t, r);
              });
              return r.call(t, e, o);
            };
          n.parse = function (t, e) {
            var r, n;
            return F = 0, $ = "" + t, r = L(B()), "$" != B() && Y(), F = $ = null, e && d.call(e) == j ? z((n = {}, n[""] = r, n), "", e) : r;
          };
        }
      }
      return n.runInContext = r, n;
    }
    var o = "function" == typeof define && define.amd,
      c = "object" == typeof t && t;
    if (!c || c.global !== c && c.window !== c || (e = c), "object" != typeof n || !n || n.nodeType || o) {
      var i = e.JSON,
        a = r(e, e.JSON3 = {
          noConflict: function () {
            return e.JSON = i, a;
          }
        });
      e.JSON = {
        parse: a.parse,
        stringify: a.stringify
      };
    } else r(e, n);
    o && define(function () {
      return a;
    });
  }(this);
});
