// Recovered module 324; analysis path, not original filename.
// Original SHA-256 8d0841a1b018e3ba2c79e49a0abb31f1baf63684782bdfc40187f25b37acb6d1; original byte range [1252623, 1260017).
__d(324, function (e, t, i, n) {
  Object.defineProperty(n, "__esModule", {
    value: !0
  }), n.cmdWorker = n.CmdView = void 0;
  var s = t(311),
    a = babelHelpers.interopRequireDefault(s),
    o = t(312),
    r = t(314),
    l = [],
    c = !0;
  n.getCmdViewBuf = function () {
    return l;
  };
  var d = (n.CmdView = a["default"].createClass({
      displayName: "CmdView",
      getInitialState: function () {
        return this.footerY = 0, this.prevDis = 0, r.apps.cmdHist = [], this.histIndex = -1, this.floatX = r.theme.winWidth - 100, this.floatY = r.theme.realStatusHeight + 2, {
          show: !1,
          inputValue: "",
          showFull: !1,
          invert: !1,
          screenDoc: new o.ListView.DataSource({
            rowHasChanged: function (e, t) {
              return e !== t;
            }
          })
        };
      },
      onInputTextChanged: function (e) {
        var t = e.length - 1;
        if ("^" === e[t]) this.histIndex += 1, this.histIndex >= r.apps.cmdHist.length && (this.histIndex = 0), this.setState({
          inputValue: r.apps.cmdHist[this.histIndex]
        });else if ("#" === e[t]) this.histIndex -= 1, this.histIndex < 0 && (this.histIndex = r.apps.cmdHist.length - 1), this.setState({
          inputValue: r.apps.cmdHist[this.histIndex]
        });else if ("~" === e[t]) {
          var i = r.apps.cmdHist.indexOf(e.slice(0, t));
          r.apps.cmdHist.splice(i, 1), this.setState({
            inputValue: ""
          }), this.histIndex = -1, r.apps.resetSharedParas("cmdHist");
        } else this.setState({
          inputValue: e
        });
      },
      componentDidMount: function () {
        var e = this;
        r.apps.on("cmdsChanged", function (t) {
          if (l.unshift(t), l.length > 2e3 && l.pop(), e.state.showFull && c) {
            var i = l.length > 10,
              n = i ? l.slice() : l.slice().reverse();
            e.setState({
              invert: i,
              screenDoc: e.state.screenDoc.cloneWithRows(n)
            });
          }
        }), r.apps.on("showCmdBallToggled", function (t) {
          e.setState({
            show: t
          });
        });
      },
      componentWillUnmount: function () {
        r.apps.unon("cmdsChanged"), r.apps.unon("showCmdBallToggled");
      },
      putHistory: function (e) {
        var t = r.apps.cmdHist.indexOf(e);
        -1 !== t && r.apps.cmdHist.splice(t, 1), r.apps.cmdHist.unshift(e), this.histIndex = -1, r.apps.cmdHist.length > 10 && r.apps.cmdHist.pop(), r.apps.resetSharedParas("cmdHist");
      },
      onEnter: function () {
        var e = this;
        this.state.inputValue && (h.inputs(this.state.inputValue), this.putHistory(this.state.inputValue), this.setState({
          inputValue: ""
        }), requestAnimationFrame(function () {
          e.refs.textinput.focus();
        }));
      },
      renderFooter: function () {
        var e = this;
        return a["default"].createElement(o.View, {
          style: u.fakeView,
          onLayout: function (t) {
            if (!e.state.invert) {
              var i = t.nativeEvent.layout.y,
                n = i - 190;
              requestAnimationFrame(function () {
                n >= e.prevDis && (e.prevDis = n, e.refs.scrollView && e.refs.scrollView.scrollTo({
                  y: n
                }));
              });
            }
          }
        });
      },
      render: function () {
        var e = this;
        return this.state.show ? this.state.showFull ? a["default"].createElement(o.View, {
          style: u.cmdInputView
        }, a["default"].createElement(o.ListView, {
          ref: "scrollView",
          style: u.cmdInfoContainer,
          initialListSize: 20,
          pageSize: 20,
          scrollRenderAheadDistance: 1e3,
          scrollsToTop: !1,
          dataSource: this.state.screenDoc,
          renderFooter: this.renderFooter,
          renderRow: function (e) {
            return a["default"].createElement(o.Text, {
              style: u.cmdText
            }, e);
          },
          renderScrollComponent: function (t) {
            return a["default"].createElement(r.InvertibleScrollView, babelHelpers["extends"]({}, t, {
              inverted: e.state.invert
            }));
          }
        }), a["default"].createElement(o.View, {
          style: u.cmdInputWrapperView
        }, a["default"].createElement(o.TextInput, {
          style: u.cmdTextInput,
          value: this.state.inputValue,
          onChangeText: this.onInputTextChanged,
          placeholder: (0, r.tr)("Enter"),
          underlineColorAndroid: r.theme.lightc,
          placeholderTextColor: r.theme.lightc,
          autoCorrect: !1,
          autoCapitalize: "none",
          ref: "textinput",
          onSubmitEditing: this.onEnter,
          selectionColor: r.theme.deepGreen2
        }), a["default"].createElement(o.View, {
          style: u.cmdInputButton
        }, a["default"].createElement(o.TouchableOpacity, {
          onPress: this.onEnter
        }, a["default"].createElement(o.Text, {
          style: u.cmdInputButtonText
        }, " ", (0, r.tr)("Enter"), " ")))), a["default"].createElement(o.TouchableOpacity, {
          style: u.closeCmdViewButton,
          onPress: function () {
            r.apps.cmdViewDisplay = !1, e.setState({
              showFull: !1
            });
          }
        }, a["default"].createElement(o.Text, {
          style: u.closeCmdViewButtonText
        }, "\u2715"))) : a["default"].createElement(r.MoveableView, {
          style: babelHelpers["extends"]({}, u.openCmdViewButton, {
            left: this.floatX,
            top: this.floatY
          }),
          onPress: function () {
            r.apps.cmdViewDisplay = !0, e.setState({
              showFull: !0
            }, function () {
              var t = l.length > 10,
                i = t ? l.slice() : l.slice().reverse();
              e.setState({
                invert: t,
                screenDoc: e.state.screenDoc.cloneWithRows(i)
              });
            });
          },
          onMove: function (t, i) {
            e.floatX = t, e.floatY = i;
          }
        }, a["default"].createElement(o.Text, {
          style: u.openCmdViewButtonText
        }, "C")) : null;
      }
    }), function () {
      r.db.transaction(function (e) {
        e.executeSql("\n      DELETE FROM Friends\n    ")["catch"]((0, r.errCb)("delete friends")), e.executeSql("\n      DELETE FROM Contacts\n    ")["catch"]((0, r.errCb)("delete contacts"));
      }).then(function () {
        return r.apps.send("clearFriends");
      })["catch"]((0, r.errCb)("clearFriends"));
    }),
    p = [],
    h = n.cmdWorker = {
      inputs: function (e) {
        var t;
        if (r.apps.emit("cmdsChanged", "CMD> " + e), e.match(/^ckc$/i)) ;else if (e.match(/^kc$/i)) ;else if (e.match(/^skc$/i)) ;else if (e.match(/^dsa$/i)) ;else if (e.match(/^sdm$/i)) r.apps.switchDevMode();else if (e.match(/^cld$/i)) r.apps.clearDev();else if (e.match(/^crand$/i)) clearInterval(r.apps.randTimer);else if (e.match(/^rus$/i)) r.dbs.delUserProfile("hasRatedApp");else if (e.match(/^dtk$/i)) ;else if (e.match(/^rsv$/i)) r.apps.resetHvdown();else if (e.match(/^rvu$/i)) r.apps.reloadHvdown();else if (e.match(/^rsd$/i)) r.apps.reloadHvdownDebug();else if (e.match(/^cup$/i)) r.apps.setHvdown();else if (t = e.match(/^ckf(\d?)/i)) r.apps.checkForHvdown(t[1]);else if (e.match(/^tst$/i)) r.apps.setSharedParas({
          testerMode: 1
        })["catch"](function (e) {
          return (0, r.tlog)("error", "importantSync", e);
        });else if (e.match(/^tk$/i)) ;else if (t = e.match(/^al\s+(\d+)$/i)) for (var i = parseInt(t[1], 10), n = 0; i > n; n++) p.push(n);else if (e.match(/^disa$/i)) r.apps.disableAnonymous = !0;else if (e.match(/^dv$/i)) r.apps.showShareAndMsgId = 0;else if (e.match(/^cc$/i)) o.NativeModules.FrescoModule.clearCache();else if (e.match(/^cf$/i)) d();else if (t = e.match(/^\.(.*)/i)) r.apps.emit("eval", t[1]);else if (t = e.match(/^db (.*)/i)) r.apps.execSqliteCmd(r.db, t[1]);else if (t = e.match(/^sdb$/i)) r.apps.execSqliteCmd(r.apps.sdb, "SELECT * FROM SharedParas");else {
          if (t = e.match(/^bug\s*report$/i)) return r.apps.request("/api/bugreport", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              time: new Date(),
              userid: r.apps.userid,
              data: [].concat(l).reverse().join("\n")
            })
          }).then(function (e) {
            return 200 === e.status ? e.json() : Promise.reject("resError");
          })["catch"]((0, r.errCb)("bugreport"));
          if (e.match(/^upt$/i)) c = !c;else if (t = e.match(/^iosdevmode\s+(\d)$/)) {
            var s = parseInt(t[1], 10);
            r.apps.send("iosdevmode", {
              iosDevMode: s
            })["catch"]((0, r.errCb)("iosdevmode"));
          }
        }
      }
    },
    u = {
      cmdInputView: {
        position: "absolute",
        left: 0,
        right: 0,
        top: r.theme.barHeight + r.theme.navHeight,
        height: 230,
        backgroundColor: "pink"
      },
      cmdText: {
        color: r.theme.light,
        padding: 3
      },
      cmdInputButtonText: {
        color: r.theme.light
      },
      cmdInputButton: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: r.theme.terminal3
      },
      cmdInputWrapperView: {
        height: 40,
        backgroundColor: r.theme.terminal2,
        flexDirection: "row"
      },
      cmdTextInput: {
        flex: 1,
        color: r.theme.light,
        paddingLeft: 5
      },
      openCmdViewButton: {
        position: "absolute",
        left: r.theme.winWidth - 40,
        top: r.theme.winHeight / 3,
        height: 40,
        width: 40,
        backgroundColor: "rgba(0,0,0,0.2)",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center"
      },
      closeCmdViewButton: {
        position: "absolute",
        right: 0,
        top: 0,
        height: 20,
        width: 20,
        backgroundColor: "rgba(100,100,100,0.2)",
        justifyContent: "center",
        alignItems: "center"
      },
      openCmdViewButtonText: {
        color: r.theme.lighte,
        fontSize: 15
      },
      closeCmdViewButtonText: {
        color: r.theme.lighte
      },
      cmdInfoContainerContent: {},
      cmdInfoContainer: {
        backgroundColor: r.theme.terminal1
      },
      fakeView: {}
    };
});
