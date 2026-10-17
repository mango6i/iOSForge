// Recovered module 355; analysis path, not original filename.
// Original SHA-256 d7bfb18204d201ba5f2bfaf4fa448b1cb9f8926841c70dda88bfe49d0ce20b62; original byte range [1687908, 1694604).
__d(355, function (e, t, a, r) {
  var n = t(311),
    o = babelHelpers.interopRequireDefault(n),
    l = t(312),
    i = t(314);
  r.SuSelectView = o["default"].createClass({
    displayName: "SuSelectView",
    getInitialState: function () {
      return this.data = [], {
        searchKeyValue: "",
        dataSource: new l.ListView.DataSource({
          rowHasChanged: function (e, t) {
            return e !== t;
          }
        }).cloneWithRows(this.data)
      };
    },
    onSuSelectViewLoaded: function (e) {
      this.setState({
        loaded: !0
      }), e(this);
    },
    componentDidMount: function () {
      i.apps.on("clearSuSearchKey", this.clearSuSearchKey), i.apps.on("showBackgroundImageToggled", this.onShowBackgroundImageToggled), i.apps.on("suSelectViewLoaded_" + this.props.route.id, this.onSuSelectViewLoaded);
    },
    componentWillUnmount: function () {
      i.apps.unon("showBackgroundImageToggled", this.onShowBackgroundImageToggled), i.apps.unon("suSelectViewLoaded_" + this.props.route.id, this.onSuSelectViewLoaded), i.apps.unon("clearSuSearchKey", this.clearSuSearchKey);
    },
    onShowBackgroundImageToggled: function () {
      var e = this.data.map(function (e) {
        return babelHelpers["extends"]({}, e);
      });
      this.setState({
        dataSource: this.state.dataSource.cloneWithRows(e)
      });
    },
    renderRow: function (e) {
      var t = this;
      if (!e || !e.userid && !e.w && !e.u) return null;
      if (i.apps.showBackgroundImage) var a = i.theme.suSelectRowBg,
        r = {
          height: 1,
          backgroundColor: i.theme.transparent
        };else a = i.theme.selectViewItemBackground, r = {
        height: i.theme.px1,
        backgroundColor: i.theme.lightd
      };
      var n = e.c;
      e.s;
      return e.t && (e.createAt = e.t), e.w ? o["default"].createElement(l.View, {
        style: {
          flex: 1
        }
      }, i.apps.showBackgroundImage ? o["default"].createElement(l.View, {
        style: r
      }) : null, o["default"].createElement(l.TouchableOpacity, {
        style: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          backgroundColor: a,
          height: 45,
          width: i.theme.winWidth
        },
        onPress: function () {
          return t.props.onPressRow(e);
        },
        onLongPress: function () {
          return t.props.onLongPressRow(e);
        }
      }, o["default"].createElement(l.View, {
        style: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 10
        }
      }, o["default"].createElement(l.Text, {
        style: {
          color: i.theme.deep7,
          fontSize: 16
        }
      }, e.w)), o["default"].createElement(l.View, {
        style: {
          backgroundColor: i.theme.warn,
          marginRight: 10,
          paddingVertical: 1,
          paddingHorizontal: 6,
          borderRadius: 11
        }
      }, o["default"].createElement(l.Text, {
        style: {
          color: i.theme.white,
          fontSize: 14
        }
      }, e.c)))) : o["default"].createElement(l.View, {
        style: {
          flex: 1
        }
      }, i.apps.showBackgroundImage ? o["default"].createElement(l.View, {
        style: r
      }) : null, o["default"].createElement(l.TouchableOpacity, {
        style: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          backgroundColor: e.r ? i.theme.deepGreen2Trans4 : a,
          height: 45,
          width: i.theme.winWidth
        },
        onPress: function () {
          return t.props.onPressRow(e);
        }
      }, o["default"].createElement(l.View, {
        style: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center"
        }
      }, o["default"].createElement(i.CachedImage, {
        avatarId: e.userid || e.u,
        style: {
          height: 35,
          width: 35,
          borderRadius: 5,
          marginHorizontal: 7
        },
        resizeMode: "cover"
      }), o["default"].createElement(i.NameText, {
        userid: e.userid || e.u,
        imageFontSize: 15,
        style: {
          fontSize: 15,
          color: i.theme.deep7
        },
        numberOfLines: 1,
        showGender: !!i.apps.showCmdBall,
        showCountry: !!i.apps.showCmdBall,
        showOpenT: !!i.apps.showCmdBall
      })), e.account ? o["default"].createElement(l.View, {
        style: {
          marginRight: 8
        }
      }, o["default"].createElement(l.Text, {
        style: {
          color: i.theme.deep7,
          fontSize: 16
        }
      }, e.account)) : null, e.createAt ? o["default"].createElement(l.View, {
        style: {
          marginRight: 8
        }
      }, o["default"].createElement(l.Text, {
        style: {
          color: i.theme.deep7,
          fontSize: 14
        }
      }, i.util.dateTimeS(e.createAt))) : null, n ? o["default"].createElement(l.View, {
        style: {
          backgroundColor: i.theme.warn,
          marginRight: 10,
          paddingVertical: 1,
          paddingHorizontal: 6,
          borderRadius: 11
        }
      }, o["default"].createElement(l.Text, {
        style: {
          color: i.theme.white,
          fontSize: 14
        }
      }, n)) : null), i.apps.showBackgroundImage ? null : o["default"].createElement(l.View, {
        style: r
      }));
    },
    renderFooter: function () {
      return this.props.route.footer ? o["default"].createElement(l.View, {
        style: {
          flexDirection: "column",
          alignItems: "center",
          paddingHorizontal: i.theme.winWidth / 7,
          paddingBottom: 8,
          marginTop: 10,
          marginBottom: 60
        }
      }, o["default"].createElement(l.TouchableOpacity, {
        style: {
          backgroundColor: i.apps.tipBackgroundColor(),
          paddingHorizontal: 5,
          borderRadius: 5
        },
        onPress: function () {}
      }, o["default"].createElement(i.MyTextView, {
        myTextValue: this.props.route.footer,
        imageFontSize: 14,
        adjustsFontSizeToFit: !0,
        style: {
          fontSize: 14,
          color: i.apps.tipFontColor(),
          paddingTop: 1,
          paddingBottom: 1,
          textAlign: "center"
        }
      }))) : null;
    },
    renderHeader: function () {
      return this.props.route.header ? o["default"].createElement(l.View, {
        style: {
          flexDirection: "column",
          alignItems: "center",
          paddingHorizontal: i.theme.winWidth / 7,
          marginTop: 10,
          marginBottom: 10
        }
      }, o["default"].createElement(i.MyTextView, {
        myTextValue: this.props.route.header,
        imageFontSize: 14,
        adjustsFontSizeToFit: !0,
        style: {
          fontSize: 14,
          color: i.apps.tipFontColor(),
          paddingTop: 1,
          paddingBottom: 1,
          textAlign: "center"
        }
      })) : null;
    },
    onChangeText: function (e) {
      i.apps.suSearchKey = e.trim().toLowerCase(), this.filterData();
    },
    clearSuSearchKey: function () {
      i.apps.suSearchKey = "", this.searchKeyInput.blur(), this.filterData();
    },
    filterData: function () {
      var e = this,
        t = i.apps.suSearchKey || "",
        a = this.data.filter(function (e) {
          var a = "";
          if (e.w) a = e.w;else if (e.u) {
            var r = i.apps.profiles[e.u];
            if (!r || !r.name) return !1;
            a = r.name.toLowerCase();
          }
          var n = a.split(" "),
            o = function () {
              for (var e = 0; e < n.length; e++) if (n[e].startsWith(t)) return !0;
              return !1;
            },
            l = function () {
              for (var e = 0; e < n.length; e++) if (-1 !== n[e].indexOf(t)) return !0;
              return !1;
            };
          return /^[a-z0-9\s()]+$/.test(a) ? o(t) : l(t);
        });
      this.setState({
        dataSource: this.state.dataSource.cloneWithRows(a),
        searchKeyValue: t
      }, function () {
        e.refs.listView && e.refs.listView.scrollTo({
          y: 0,
          animated: !1
        });
      });
    },
    render: function () {
      var e = this;
      return o["default"].createElement(l.View, {
        style: {
          flex: 1
        }
      }, o["default"].createElement(l.View, {
        style: {
          height: i.theme.navHeight
        }
      }), o["default"].createElement(i.BackgroundImageView, {
        shouldRender: !0,
        maskColor: i.theme.lightLessTrans6
      }), o["default"].createElement(l.View, {
        style: {
          flex: 1,
          backgroundColor: i.theme.selectViewBackground
        }
      }, i.apps.showCmdBall && !this.props.route.nosearch ? o["default"].createElement(l.TextInput, {
        ref: function (t) {
          return e.searchKeyInput = t;
        },
        value: this.state.searchKeyValue,
        style: {
          height: 30,
          fontSize: 14,
          backgroundColor: i.theme.transparent,
          paddingVertical: 0,
          paddingHorizontal: 10,
          color: i.theme.deep8
        },
        placeholder: (0, i.tr)("Search"),
        placeholderTextColor: i.apps.darkTheme ? i.theme.deep2 : i.theme.lightb,
        onChangeText: this.onChangeText,
        selectionColor: i.theme.deepGreen2
      }) : null, this.state.loaded ? o["default"].createElement(l.ListView, {
        ref: "listView",
        style: {
          flex: 1,
          backgroundColor: i.theme.transparent
        },
        dataSource: this.state.dataSource,
        renderRow: this.renderRow,
        renderFooter: this.renderFooter,
        renderHeader: this.renderHeader,
        pageSize: 20,
        scrollsToTop: !1,
        scrollRenderAheadDistance: 2e3
      }) : o["default"].createElement(i.InterActionSpinner, {
        glass: !1
      })));
    }
  });
});
