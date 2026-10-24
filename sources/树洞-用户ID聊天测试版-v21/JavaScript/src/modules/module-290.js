// Recovered module 290; analysis path, not original filename.
// Original SHA-256 f9f4fe5488eddd482ffda3f099935cb9cd6b259fa1299d6b9c5487df6ef4d340; original byte range [566803, 567334).
__d(290, function (e, t, n, r) {
  "use strict";

  var o = t(311),
    i = t(312),
    a = i.Image,
    c = (i.Platform, i.StyleSheet),
    u = i.TouchableOpacity,
    s = function (e) {
      return o.createElement(u, {
        style: l.buttonContainer,
        onPress: function () {
          return e.onNavigate({
            type: "BackAction"
          });
        }
      }, o.createElement(a, {
        style: l.button,
        source: t(384)
      }));
    };
  s.propTypes = {
    onNavigate: o.PropTypes.func.isRequired
  };
  var l = c.create({
    buttonContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center"
    },
    button: {
      height: 24,
      width: 24,
      margin: 10,
      resizeMode: "contain"
    }
  });
  n.exports = s;
});
