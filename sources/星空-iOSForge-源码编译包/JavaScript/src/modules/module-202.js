// Recovered module 202; analysis path, not original filename.
// Original SHA-256 c962d8fd0c690502d1f5ba399d6e9f3402a607ff9256bfca78695300fe93e248; original byte range [418676, 419758).
__d(202, function (e, n, r, t) {
  "use strict";

  var i = {
    centroidDimension: function (e, n, r, t) {
      var o = e.touchBank,
        u = 0,
        c = 0,
        d = 1 === e.numberActiveTouches ? e.touchBank[e.indexOfSingleActiveTouch] : null;
      if (null !== d) d.touchActive && d.currentTimeStamp > n && (u += t && r ? d.currentPageX : t && !r ? d.currentPageY : !t && r ? d.previousPageX : d.previousPageY, c = 1);else for (var s = 0; s < o.length; s++) {
        var a = o[s];
        if (null !== a && void 0 !== a && a.touchActive && a.currentTimeStamp >= n) {
          var f;
          f = t && r ? a.currentPageX : t && !r ? a.currentPageY : !t && r ? a.previousPageX : a.previousPageY, u += f, c++;
        }
      }
      return c > 0 ? u / c : i.noCentroid;
    },
    currentCentroidXOfTouchesChangedAfter: function (e, n) {
      return i.centroidDimension(e, n, !0, !0);
    },
    currentCentroidYOfTouchesChangedAfter: function (e, n) {
      return i.centroidDimension(e, n, !1, !0);
    },
    previousCentroidXOfTouchesChangedAfter: function (e, n) {
      return i.centroidDimension(e, n, !0, !1);
    },
    previousCentroidYOfTouchesChangedAfter: function (e, n) {
      return i.centroidDimension(e, n, !1, !1);
    },
    currentCentroidX: function (e) {
      return i.centroidDimension(e, 0, !0, !0);
    },
    currentCentroidY: function (e) {
      return i.centroidDimension(e, 0, !1, !0);
    },
    noCentroid: -1
  };
  r.exports = i;
});
