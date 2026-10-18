// Recovered module 613; analysis path, not original filename.
// Original SHA-256 db0f0a0422577d45b12cb9afa57a6b3776d9e106dacadf1299badd467f1a9197; original byte range [1617452, 1626637).
__d(613, function (e, t, a, i) {
  !function (e) {
    if ("undefined" != typeof a && a.exports) a.exports = e(this);else if ("function" == typeof define && define.amd) {
      var t = this;
      define("i18n", function () {
        return e(t);
      });
    } else this.I18n = e(this);
  }(function (e) {
    "use strict";

    var t = e && e.I18n || {},
      a = Array.prototype.slice,
      i = function (e) {
        return ("0" + e.toString()).substr(-2);
      },
      r = {
        day_names: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        abbr_day_names: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        month_names: [null, "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        abbr_month_names: [null, "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        meridian: ["AM", "PM"]
      },
      n = {
        precision: 3,
        separator: ".",
        delimiter: ",",
        strip_insignificant_zeros: !1
      },
      s = {
        unit: "$",
        precision: 2,
        format: "%u%n",
        sign_first: !0,
        delimiter: ",",
        separator: "."
      },
      l = {
        unit: "%",
        precision: 3,
        format: "%n%u",
        separator: ".",
        delimiter: ""
      },
      o = [null, "kb", "mb", "gb", "tb"],
      u = {
        defaultLocale: "en",
        baseLanguage: null,
        locale: "en",
        defaultSeparator: ".",
        placeholder: /(?:\{\{|%\{)(.*?)(?:\}\}?)/gm,
        fallbacks: !1,
        translations: {},
        missingBehaviour: "message",
        missingTranslationPrefix: ""
      };
    return t.reset = function () {
      this.defaultLocale = u.defaultLocale, this.baseLanguage = u.baseLanguage, this.locale = u.locale, this.defaultSeparator = u.defaultSeparator, this.placeholder = u.placeholder, this.fallbacks = u.fallbacks, this.translations = u.translations, this.missingBehaviour = u.missingBehaviour, this.missingTranslationPrefix = u.missingTranslationPrefix;
    }, t.initializeOptions = function () {
      "undefined" == typeof this.defaultLocale && null !== this.defaultLocale && (this.defaultLocale = u.defaultLocale), "undefined" == typeof this.baseLanguage && null !== this.baseLanguage && (this.baseLanguage = u.baseLanguage), "undefined" == typeof this.locale && null !== this.locale && (this.locale = u.locale), "undefined" == typeof this.defaultSeparator && null !== this.defaultSeparator && (this.defaultSeparator = u.defaultSeparator), "undefined" == typeof this.placeholder && null !== this.placeholder && (this.placeholder = u.placeholder), "undefined" == typeof this.fallbacks && null !== this.fallbacks && (this.fallbacks = u.fallbacks), "undefined" == typeof this.translations && null !== this.translations && (this.translations = u.translations);
    }, t.initializeOptions(), t.locales = {}, t.locales.get = function (e) {
      var a = this[e] || this[t.locale] || this["default"];
      return "function" == typeof a && (a = a(e)), a instanceof Array == !1 && (a = [a]), a;
    }, t.locales["default"] = function (e) {
      var a,
        i = [],
        r = [];
      return e && i.push(e), !e && t.locale && i.push(t.locale), t.fallbacks && t.defaultLocale && i.push(t.defaultLocale), i.forEach(function (e) {
        a = e.split("-")[0], ~r.indexOf(e) || r.push(e), t.fallbacks && a && a !== e && !~r.indexOf(a) && r.push(a);
      }), i.length || i.push("en"), r;
    }, t.pluralization = {}, t.pluralization.get = function (e) {
      return this[e] || this[t.locale] || this["default"];
    }, t.pluralization["default"] = function (e) {
      switch (e) {
        case 0:
          return ["zero", "other"];
        case 1:
          return ["one"];
        default:
          return ["other"];
      }
    }, t.currentLocale = function () {
      return this.locale || this.defaultLocale;
    }, t.isSet = function (e) {
      return void 0 !== e && null !== e;
    }, t.lookup = function (e, t) {
      t = this.prepareOptions(t);
      var a,
        i,
        r,
        n = this.locales.get(t.locale).slice();
      n[0];
      for (e = this.getFullScope(e, t); n.length;) {
        if (a = n.shift(), null !== this.baseLanguage && a == this.baseLanguage) return e;
        if (i = e.split(this.defaultSeparator), r = this.translations[a]) {
          for (; i.length && (r = r[i.shift()], void 0 !== r && null !== r););
          if (void 0 !== r && null !== r) return r;
        }
      }
      return this.isSet(t.defaultValue) ? t.defaultValue : void 0;
    }, t.meridian = function () {
      var e = this.lookup("time"),
        t = this.lookup("date");
      return e && e.am && e.pm ? [e.am, e.pm] : t && t.meridian ? t.meridian : r.meridian;
    }, t.prepareOptions = function () {
      for (var e, t = a.call(arguments), i = {}; t.length;) if (e = t.shift(), "object" == typeof e) for (var r in e) e.hasOwnProperty(r) && (this.isSet(i[r]) || (i[r] = e[r]));
      return i;
    }, t.createTranslationOptions = function (e, t) {
      var a = [{
        scope: e
      }];
      return this.isSet(t.defaults) && (a = a.concat(t.defaults)), this.isSet(t.defaultValue) && (a.push({
        message: t.defaultValue
      }), delete t.defaultValue), a;
    }, t.translate = function (e, t) {
      t = this.prepareOptions(t);
      var a,
        i = this.createTranslationOptions(e, t),
        r = i.some(function (e) {
          return this.isSet(e.scope) ? a = this.lookup(e.scope, t) : this.isSet(e.message) && (a = e.message), void 0 !== a && null !== a ? !0 : void 0;
        }, this);
      return r ? ("string" == typeof a ? a = this.interpolate(a, t) : a instanceof Object && this.isSet(t.count) && (a = this.pluralize(t.count, a, t)), a) : this.missingTranslation(e, t);
    }, t.interpolate = function (e, t) {
      t = this.prepareOptions(t);
      var a,
        i,
        r,
        n,
        s = e.match(this.placeholder);
      if (!s) return e;
      for (var i; s.length;) a = s.shift(), r = a.replace(this.placeholder, "$1"), i = this.isSet(t[r]) ? t[r].toString().replace(/\$/gm, "_#$#_") : r in t ? this.nullPlaceholder(a, e) : this.missingPlaceholder(a, e), n = new RegExp(a.replace(/\{/gm, "\\{").replace(/\}/gm, "\\}")), e = e.replace(n, i);
      return e.replace(/_#\$#_/g, "$");
    }, t.pluralize = function (e, t, a) {
      a = this.prepareOptions(a);
      var i, r, n, s, l;
      if (i = t instanceof Object ? t : this.lookup(t, a), !i) return this.missingTranslation(t, a);
      for (r = this.pluralization.get(a.locale), n = r(e); n.length;) if (s = n.shift(), this.isSet(i[s])) {
        l = i[s];
        break;
      }
      return a.count = String(e), this.interpolate(l, a);
    }, t.missingTranslation = function (e, t) {
      if ("guess" == this.missingBehaviour) {
        var a = e.split(".").slice(-1)[0];
        return (this.missingTranslationPrefix.length > 0 ? this.missingTranslationPrefix : "") + a.replace("_", " ").replace(/([a-z])([A-Z])/g, function (e, t, a) {
          return t + " " + a.toLowerCase();
        });
      }
      var i = this.getFullScope(e, t),
        r = [this.currentLocale(), i].join(this.defaultSeparator);
      return '[missing "' + r + '" translation]';
    }, t.missingPlaceholder = function (e, t) {
      return "[missing " + e + " value]";
    }, t.nullPlaceholder = function () {
      return t.missingPlaceholder.apply(t, arguments);
    }, t.toNumber = function (e, t) {
      t = this.prepareOptions(t, this.lookup("number.format"), n);
      var a,
        i,
        r = 0 > e,
        s = Math.abs(e).toFixed(t.precision).toString(),
        l = s.split("."),
        o = [],
        u = t.format || "%n",
        c = r ? "-" : "";
      for (e = l[0], a = l[1]; e.length > 0;) o.unshift(e.substr(Math.max(0, e.length - 3), 3)), e = e.substr(0, e.length - 3);
      return i = o.join(t.delimiter), t.strip_insignificant_zeros && a && (a = a.replace(/0+$/, "")), t.precision > 0 && a && (i += t.separator + a), u = t.sign_first ? "%s" + u : u.replace("%n", "%s%n"), i = u.replace("%u", t.unit).replace("%n", i).replace("%s", c);
    }, t.toCurrency = function (e, t) {
      return t = this.prepareOptions(t, this.lookup("number.currency.format"), this.lookup("number.format"), s), this.toNumber(e, t);
    }, t.localize = function (e, t, a) {
      switch (a || (a = {}), e) {
        case "currency":
          return this.toCurrency(t);
        case "number":
          return e = this.lookup("number.format"), this.toNumber(t, e);
        case "percentage":
          return this.toPercentage(t);
        default:
          var i;
          return i = e.match(/^(date|time)/) ? this.toTime(e, t) : t.toString(), this.interpolate(i, a);
      }
    }, t.parseDate = function (e) {
      var t, a, i;
      if ("object" == typeof e) return e;
      if (t = e.toString().match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})([\.,]\d{1,3})?)?(Z|\+00:?00)?/)) {
        for (var r = 1; 6 >= r; r++) t[r] = parseInt(t[r], 10) || 0;
        t[2] -= 1, i = t[7] ? 1e3 * ("0" + t[7]) : null, a = t[8] ? new Date(Date.UTC(t[1], t[2], t[3], t[4], t[5], t[6], i)) : new Date(t[1], t[2], t[3], t[4], t[5], t[6], i);
      } else "number" == typeof e ? (a = new Date(), a.setTime(e)) : e.match(/([A-Z][a-z]{2}) ([A-Z][a-z]{2}) (\d+) (\d+:\d+:\d+) ([+-]\d+) (\d+)/) ? (a = new Date(), a.setTime(Date.parse([RegExp.$1, RegExp.$2, RegExp.$3, RegExp.$6, RegExp.$4, RegExp.$5].join(" ")))) : e.match(/\d+ \d+:\d+:\d+ [+-]\d+ \d+/) ? (a = new Date(), a.setTime(Date.parse(e))) : (a = new Date(), a.setTime(Date.parse(e)));
      return a;
    }, t.strftime = function (e, a) {
      var n = this.lookup("date"),
        s = t.meridian();
      n || (n = {}), n = this.prepareOptions(n, r);
      var l = e.getDay(),
        o = e.getDate(),
        u = e.getFullYear(),
        c = e.getMonth() + 1,
        p = e.getHours(),
        h = p,
        f = p > 11 ? 1 : 0,
        d = e.getSeconds(),
        m = e.getMinutes(),
        g = e.getTimezoneOffset(),
        b = Math.floor(Math.abs(g / 60)),
        S = Math.abs(g) - 60 * b,
        y = (g > 0 ? "-" : "+") + (b.toString().length < 2 ? "0" + b : b) + (S.toString().length < 2 ? "0" + S : S);
      return h > 12 ? h -= 12 : 0 === h && (h = 12), a = a.replace("%a", n.abbr_day_names[l]), a = a.replace("%A", n.day_names[l]), a = a.replace("%b", n.abbr_month_names[c]), a = a.replace("%B", n.month_names[c]), a = a.replace("%d", i(o)), a = a.replace("%e", o), a = a.replace("%-d", o), a = a.replace("%H", i(p)), a = a.replace("%-H", p), a = a.replace("%I", i(h)), a = a.replace("%-I", h), a = a.replace("%m", i(c)), a = a.replace("%-m", c), a = a.replace("%M", i(m)), a = a.replace("%-M", m), a = a.replace("%p", s[f]), a = a.replace("%S", i(d)), a = a.replace("%-S", d), a = a.replace("%w", l), a = a.replace("%y", i(u)), a = a.replace("%-y", i(u).replace(/^0+/, "")), a = a.replace("%Y", u), a = a.replace("%z", y);
    }, t.toTime = function (e, t) {
      var a = this.parseDate(t),
        i = this.lookup(e);
      return a.toString().match(/invalid/i) ? a.toString() : i ? this.strftime(a, i) : a.toString();
    }, t.toPercentage = function (e, t) {
      return t = this.prepareOptions(t, this.lookup("number.percentage.format"), this.lookup("number.format"), l), this.toNumber(e, t);
    }, t.toHumanSize = function (e, t) {
      for (var a, i, r = 1024, n = e, s = 0; n >= r && 4 > s;) n /= r, s += 1;
      return 0 === s ? (a = this.t("number.human.storage_units.units.byte", {
        count: n
      }), i = 0) : (a = this.t("number.human.storage_units.units." + o[s]), i = n - Math.floor(n) === 0 ? 0 : 1), t = this.prepareOptions(t, {
        unit: a,
        precision: i,
        format: "%n%u",
        delimiter: ""
      }), this.toNumber(n, t);
    }, t.getFullScope = function (e, t) {
      return t = this.prepareOptions(t), e.constructor === Array && (e = e.join(this.defaultSeparator)), t.scope && (e = [t.scope, e].join(this.defaultSeparator)), e;
    }, t.t = t.translate, t.l = t.localize, t.p = t.pluralize, t;
  });
});
