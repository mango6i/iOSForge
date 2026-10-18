// Recovered module 334; analysis path, not original filename.
// Original SHA-256 842c882372eecdd1e55e2d3790dc6ae8cc47268cf427e2d3704e650e917aa46a; original byte range [1356758, 1360791).
__d(334, function (e, t, n, r) {
  function o(e) {
    return e >= 0 && 9 >= e ? "0" + e : e;
  }
  Object.defineProperty(r, "__esModule", {
    value: !0
  });
  r.BirthCalculator = {
    getShengxiao: function (e) {
      if (1900 > e) return "";
      var t = 1900,
        n = ["\u9f20", "\u725b", "\u864e", "\u5154", "\u9f99", "\u86c7", "\u9a6c", "\u7f8a", "\u7334", "\u9e21", "\u72d7", "\u732a"];
      return n[(e - t) % 12];
    },
    getConstellation: function (e, t) {
      return 1 == e && t >= 20 || 2 == e && 18 >= t ? "\u6c34\u74f6\u5ea7" : 2 == e && t >= 19 || 3 == e && 20 >= t ? "\u53cc\u9c7c\u5ea7" : 3 == e && t >= 21 || 4 == e && 19 >= t ? "\u767d\u7f8a\u5ea7" : 4 == e && t >= 20 || 5 == e && 20 >= t ? "\u91d1\u725b\u5ea7" : 5 == e && t >= 21 || 6 == e && 21 >= t ? "\u53cc\u5b50\u5ea7" : 6 == e && t >= 22 || 7 == e && 22 >= t ? "\u5de8\u87f9\u5ea7" : 7 == e && t >= 23 || 8 == e && 22 >= t ? "\u72ee\u5b50\u5ea7" : 8 == e && t >= 23 || 9 == e && 22 >= t ? "\u5904\u5973\u5ea7" : 9 == e && t >= 23 || 10 == e && 22 >= t ? "\u5929\u79e4\u5ea7" : 10 == e && t >= 23 || 11 == e && 21 >= t ? "\u5929\u874e\u5ea7" : 11 == e && t >= 22 || 12 == e && 21 >= t ? "\u5c04\u624b\u5ea7" : 12 == e && t >= 22 || 1 == e && 19 >= t ? "\u6469\u7faf\u5ea7" : void 0;
    },
    getDecade: function (e) {
      return (e + "")[2] + "0\u540e";
    }
  };
  r.formatNum = o;
  var u = (r.fmtDate = function (e) {
      "number" == typeof e && (e = new Date(e));
      var t = e.getFullYear(),
        n = o(e.getHours()),
        r = o(e.getMinutes()),
        u = o(e.getMonth() + 1),
        a = o(e.getDate());
      return t + "-" + u + "-" + a + " " + n + ":" + r;
    }, r.fmtDateWithoutYear = function (e) {
      e || (e = new Date());
      var t = o(e.getMonth() + 1),
        n = o(e.getDate());
      return t + "-" + n;
    }, r.fmtDateTimeWithoutYear = function (e, t) {
      var n = o(e.getHours()),
        r = o(e.getMinutes()),
        u = o(e.getMonth() + 1),
        a = o(e.getDate()),
        i = o(e.getSeconds()),
        g = u + "-" + a + " " + n + ":" + r;
      return t ? g + ":" + i : "" + g;
    }, r.fmtReplyTime = function (e) {
      var t = e.getFullYear(),
        n = e.getMonth(),
        r = e.getDate(),
        u = new Date(),
        a = u.getFullYear(),
        i = u.getMonth(),
        g = u.getDate();
      if (t === a && n === i && r === g) {
        var f = o(e.getHours()),
          l = o(e.getMinutes());
        return f + ":" + l;
      }
      return n = o(e.getMonth() + 1), r = o(e.getDate()), n + "/" + r;
    }, r.dateTime = function (e) {
      var t = e ? new Date(e) : new Date(),
        n = t.getFullYear(),
        r = o(t.getMonth() + 1),
        u = o(t.getDate()),
        a = o(t.getHours()),
        i = o(t.getMinutes());
      return n + "-" + r + "-" + u + " " + a + ":" + i;
    }, r.dateTimeS = function (e) {
      var t = e ? new Date(e) : new Date(),
        n = t.getFullYear() - 2e3,
        r = t.getMonth() + 1,
        o = t.getDate();
      return n + "." + r + "." + o;
    }, r.yeardate = function () {
      var e = new Date(),
        t = e.getFullYear(),
        n = o(e.getMonth() + 1),
        r = o(e.getDate());
      return t + "-" + n + "-" + r;
    }, r.xinspect = function i(e, t) {
      if ("undefined" == typeof t && (t = ""), t.length > 50) return "[MAX ITERATIONS]";
      var n = [];
      for (var r in e) {
        var o = typeof e[r];
        n.push(t + '"' + r + '" (' + o + ") => " + ("object" == o ? "object:" + i(e[r], t + "  ") : e[r] + ""));
      }
      return n.join(t + "\n");
    }, r.wrapSuperMethod = function (e, t, n) {
      var r = e[t];
      e[t] = function () {
        r(), n();
      };
    }, 0),
    a = (r.genSeq = function () {
      return u++;
    }, 0);
  r.genViewId = function () {
    return a++;
  }, r.groupByEveryN = function (e, t) {
    for (var n = [], r = [], o = 0; o < e.length; ++o) o > 0 && o % t === 0 && (n.push(r), r = []), r.push(e[o]);
    if (r.length > 0) {
      for (; r.length !== t;) r.push(null);
      n.push(r);
    }
    return n;
  }, r.groupByEveryNewN = function (e, t, n) {
    var r = [],
      o = [],
      u = e[e.length - 1];
    if (u) {
      var a = n - u.length;
      if (a > 0) {
        var i = t.slice(0, a);
        t = t.slice(a), u = u.concat(i), e[e.length - 1] = u;
      }
    }
    for (var g = 0; g < t.length; ++g) g > 0 && g % n === 0 && (r.push(o), o = []), o.push(t[g]);
    return o.length > 0 && r.push(o), e.push.apply(e, r), e;
  }, r.codePointAt = function (e, t) {
    if (null == e) throw TypeError();
    var n = String(e),
      r = n.length,
      o = t ? Number(t) : 0;
    if (o != o && (o = 0), !(0 > o || o >= r)) {
      var u,
        a = n.charCodeAt(o);
      return a >= 55296 && 56319 >= a && r > o + 1 && (u = n.charCodeAt(o + 1), u >= 56320 && 57343 >= u) ? 1024 * (a - 55296) + u - 56320 + 65536 : a;
    }
  }, r.fromCodePoint = function () {
    var e,
      t,
      n,
      r,
      o = [];
    for (r = 0; r < arguments.length; ++r) e = arguments[r], t = e - 65536, n = e > 65535 ? [55296 + (t >> 10), 56320 + (1023 & t)] : [e], o.push(String.fromCharCode.apply(null, n));
    return o.join("");
  };
  r.codeSlice = function (e, t, n) {
    var o = [];
    if (e) {
      for (var u = e.length, a = 0, i = 0; u > i;) {
        var g = r.codePointAt(e, i),
          f = r.fromCodePoint(g),
          l = f.length;
        if (i += l, a >= t && o.push(f), a += 1, n >= 0 && a >= n) break;
      }
      return n > 0 ? o.join("") : o.slice(0, n).join("");
    }
  }, r.codeLength = function (e) {
    if (e) {
      for (var t = e.length, n = 0, o = 0; t > o;) {
        var u = r.codePointAt(e, o),
          a = r.fromCodePoint(u),
          i = a.length;
        o += i, n += 1;
      }
      return n;
    }
  }, r.filterIllegalCodes = function (e) {
    for (var t = [], n = e.length, o = 0; n > o;) {
      var u = r.codePointAt(e, o),
        a = r.fromCodePoint(u),
        i = a.length;
      o += i, u > 65279 || u >= 8192 && 8233 >= u || t.push(a);
    }
    return t.join("");
  };
});
