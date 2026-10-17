// Recovered module 40; analysis path, not original filename.
// Original SHA-256 e1bc108684aca13567dc06dcce976e770af9bb80b4439d37bdebf2d92867937a; original byte range [113887, 114193).
__d(40, function (e, t, a, r) {
  "use strict";

  var p = {
    captureHeap: function (a, r) {
      var p = null;
      try {
        e.nativeCaptureHeap(r), console.log("HeapCapture.captureHeap succeeded: " + r);
      } catch (o) {
        console.log("HeapCapture.captureHeap error: " + o.toString()), p = o.toString();
      }
      t(31).JSCHeapCapture.operationComplete(a, p);
    }
  };
  a.exports = p;
});
