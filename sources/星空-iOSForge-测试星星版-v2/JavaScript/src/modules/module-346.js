// Recovered module 346; analysis path, not original filename.
// Original SHA-256 39fc08fd32993741cf8766524b0602e497f012c751e4850a4ae1e6b391f0a142; original byte range [1580022, 1581154).
__d(346, function (e, t, r, a) {
  "use strict";

  Object.defineProperty(a, "__esModule", {
    value: !0
  }), a.MyTextView = void 0;
  var i = t(311),
    u = babelHelpers.interopRequireDefault(i),
    l = t(312),
    n = t(314),
    o = {},
    s = [128512, 128513, 128514, 128515, 128516, 128517, 128518, 128519, 128520, 128521, 128522, 128523, 128524, 128525, 128526, 128527, 128528, 128529, 128530, 128531, 128532, 128533, 128534, 128535, 128536, 128537, 128538, 128539, 128540, 128541, 128542, 128543, 128544, 128545, 128546, 128547, 128548, 128549, 128550, 128551, 128552, 128553, 128554, 128555, 128556, 128557, 128558, 128559, 128560, 128561, 128562, 128563, 128564, 128565, 128566, 128577, 128578, 128579, 128580, 129297, 129298, 129299, 129300, 129301, 129303, 128127, 128123, 128164, 128169, 128170, 127770, 127771, 127772, 127773, 127802, 127867, 128046, 128076, 128077, 128078, 127801, 127873, 127874, 127876, 127881, 128054, 128055, 128064, 128068, 128148];
  s.forEach(function (e) {
    return o[e] = 1;
  });
  a.MyTextView = u["default"].createClass({
    displayName: "MyTextView",
    render: function () {
      var e;
      e = this.props.myTextValue;
      try {
        return u["default"].createElement(l.Text, this.props, e);
      } catch (t) {
        return (0, n.tlog)("error", "MyTextView", t), u["default"].createElement(l.Text, this.props, e);
      }
    }
  });
});
