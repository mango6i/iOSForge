// Recovered module 23; analysis path, not original filename.
// Original SHA-256 5c109f40eec02a0cc7f9ce5b9bc2cd059c7fb49c1755017526d49d724bc21b48; original byte range [94129, 94746).
__d(23, function (t, i, e, u) {
  "use strict";

  var n = i(24),
    s = i(28),
    o = i(30),
    r = i(41),
    a = (i(380), {
      measure: function (t) {
        o.measure(r(this), c(this, t));
      },
      measureInWindow: function (t) {
        o.measureInWindow(r(this), c(this, t));
      },
      measureLayout: function (t, i, e) {
        o.measureLayout(r(this), t, c(this, e), c(this, i));
      },
      setNativeProps: function (t) {
        var i = n.create(t, this.viewConfig.validAttributes);
        o.updateView(r(this), this.viewConfig.uiViewClassName, i);
      },
      focus: function () {
        s.focusTextInput(r(this));
      },
      blur: function () {
        s.blurTextInput(r(this));
      }
    }),
    c = function (t, i) {
      return function () {
        return !i || t.isMounted && !t.isMounted() ? void 0 : i.apply(t, arguments);
      };
    };
  e.exports = a;
});
