// Maintenance source; recovered reference retained separately.
// Maintenance source; recovered reference retained separately.
__d(317, function (e, t, r, n) {
  var i = t(311),
    o = (babelHelpers.interopRequireDefault(i), t(312)),
    s = t(314);
  t(314);
  r.exports = function (e) {
    e.getKeyChain = function () {
      if (e.deviceId) return Promise.resolve(e.deviceId);
      function persist(id) {
        if (typeof id !== "string" || !id.length) throw new Error("Device identity unavailable");
        e.deviceId = id;
        return Promise.resolve().then(function () {
          return e.setSharedParas({
            deviceId: id
          });
        }).catch(function (error) {
          s.tlog("error", "persist device identity", error);
        }).then(function () {
          return id;
        });
      }
      function fallback() {
        var id = s.reactDevInfo.getUniqueID() || e.deviceUuid;
        if (typeof id !== "string" || !id.length) throw new Error("Device identity unavailable");
        Promise.resolve().then(function () {
          return s.keyChain.setGenericPassword("token", id);
        }).catch(function (error) {
          s.tlog("error", "save device keychain", error);
        });
        return persist(id);
      }
      if ("ios" !== o.Platform.OS) return persist(s.reactDevInfo.getUniqueID2());
      var timer;
      var timeout = new Promise(function (resolve) {
        timer = setTimeout(function () {
          resolve(null);
        }, 5000);
      });
      var read = Promise.resolve().then(function () {
        return s.keyChain.getGenericPassword();
      });
      return Promise.race([read, timeout]).then(function (credentials) {
        clearTimeout(timer);
        return credentials && typeof credentials.password === "string" && credentials.password.length ? persist(credentials.password) : fallback();
      }, function (error) {
        clearTimeout(timer);
        s.tlog("error", "read device keychain", error);
        return fallback();
      });
    }, e.getDeviceCheck = function () {
      return new Promise(function (t, r) {
        var n = e.now();
        s.reactDevInfo.getDeviceCheck().then(function (r) {
          (0, s.tlog)("getDeviceCheck using", e.now() - n, (0, s.md5)(r)), t(r);
        })["catch"](function (e) {
          (0, s.tlog)("error", "getDeviceCheck", e), t("");
        });
      });
    }, e.deviceCheckTest = function () {
      return new Promise(function (t, r) {
        return e.verifyVurlsFinished ? void e.getDeviceCheck().then(function (t) {
          return (0, s.tlog)("deviceCheck", t), e.request("/api/deviceCheckTest", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              deviceCheck: t
            })
          });
        }).then(function (e) {
          return 200 === e.status ? e.json() : Promise.reject("resError");
        }).then(function () {
          t();
        })["catch"](function (e) {
          (0, s.tlog)("error", "deviceCheckTest", e), r(e);
        }) : void e.verifyVurlsFinishedCbs.push(function () {
          return e.deviceCheckTest().then(t, r);
        });
      });
    }, e.termsOfServiceGo = function () {
      return new Promise(function (t, r) {
        if (e.termsOfServiceGoing) return void r("termsOfServiceGoing");
        e.termsOfServiceGoing = !0;
        try {
          var n = 0,
            i = function a() {
              e.firstInstallCheckOk ? ((0, s.tlog)("termsOfServiceGo firstInstallCheckOk"), delete e.termsOfServiceGoing, t()) : e.verifyVurlsFailed ? ((0, s.tlog)("termsOfServiceGo verifyVurlsFailed"), n += 1, setTimeout(function () {
                return a();
              }, 1e3), n > 5 && !e.goCheckingRun && ((0, s.tlog)("termsOfServiceGo verifyVurlsFailed", n), e.emit("spinTermView", !1), e.emit("hideTermView", !0), e.goChecking(), n = 0)) : e.has("firstInstallCheckOk") || ((0, s.tlog)("termsOfServiceGo on firstInstallCheckOk"), e.on("firstInstallCheckOk", function () {
                delete e.termsOfServiceGoing, t();
              }));
            };
          i();
        } catch (o) {
          delete e.termsOfServiceGoing, r(o);
        }
      });
    }, e.firstInstallCheck = function () {
      return new Promise(function (t, r) {
        if (!e.verifyVurlsFinished) return void e.verifyVurlsFinishedCbs.push(function () {
          return e.firstInstallCheck().then(t, r);
        });
        var n = Date.now();
        s.fs.greetings("firstInstallCheck_" + e.deviceUuid).then(function (t) {
          return e.post("/api/first_install", {
            deviceId: e.deviceId,
            downFrom: e.downFrom,
            deviceFrom: e.deviceFrom,
            deviceSys: e.deviceSys,
            locale: s.I18n.rawLocale,
            greetings: t
          }, 15e3);
        }).then(function (r) {
          e.userid = r.userid, e.mpasswd = r.mpasswd, e.signuped = r.signuped, e.phone = r.phone, e.accountClr = r.clr, e.appleS = r.appleS, e.signupT = r.signupT, e.authCnt = r.authCnt, e.pkgvv = r.pkgvv;
          var i = Date.now(),
            o = Math.floor((i - n - (r.calTime || 0)) / 2);
          e.timeDiff = (r.time || Date.now()) - o - n, (0, s.tlog)("time sync", e.timeDiff, o, r.calTime), e.firstInstallCheckOk = !0, e.emitOnce("firstInstallCheckOk"), t();
        })["catch"](function (n) {
          (0, s.tlog)("firstInstall request", n), setTimeout(function () {
            return e.firstInstallCheck().then(t, r);
          }, 300), r(n);
        });
      });
    }, e.signMenu = function () {
      e.emit("contextMenu", [[(0, s.tr)("Sign up new account"), function () {
        e.emit("closeContextMenu", function () {
          e.firstInstallStepPost("reg"), e.initUmeng();
          var t = function () {
              e.phone ? (e.firstInstallStepPost("phed"), e.showAvatarNameDiag()) : (e.firstInstallStepPost("phn"), e.popSpin((0, s.tr)("Signuping..."), function () {
                return !0;
              }), e.vfphone());
            },
            r = !1;
          e.signuped && (r = !0), !e.signuped || e.userid || e.mpasswd || (r = !1), e.signuped && e.accountClr && e.now() - e.accountClr < 6e5 && (r = !0), r ? e.diag({
            transp: !0,
            locking: !0,
            header: (0, s.tr)("Tip"),
            content: (0, s.tr)("Cannot signup again on the same phone"),
            buttons: [{
              text: (0, s.tr)("Ok"),
              onPress: function () {
                return e.closeDiag(function () {
                  return e.signMenu();
                });
              }
            }]
          }) : e.appleS ? 1 === e.appleS ? e.showAvatarNameDiag() : e.chooseGender() : e.signupT ? (e.firstInstallStepPost("pst"), e.popSpin((0, s.tr)("Signuping..."), function () {
            return !0;
          }), e.post("/api/signupToo", {
            deviceId: e.deviceId
          }).then(function (r) {
            e.popClose(function () {
              r.too ? e.signupTooAlert() : t();
            });
          })["catch"](function (t) {
            (0, s.tlog)("error", "apps.signupT", t), e.popClose(function () {
              return e.diag({
                header: (0, s.tr)("Tip"),
                content: (0, s.tr)("Connection Failed"),
                buttons: [{
                  text: (0, s.tr)("Ok"),
                  onPress: function () {
                    return e.closeDiag(function () {
                      return e.signMenu();
                    });
                  }
                }]
              });
            });
          })) : t();
        });
      }], [(0, s.tr)("Sign in old account"), function () {
        e.firstInstallStepPost("log"), e.initUmeng(), e.emit("closeContextMenu", function () {
          return e.showSignInDiag();
        });
      }]], !0, !0);
    }, e.termsOfService = function () {
      var t = {
        locking: !0,
        header: (0, s.tr)("Terms of Service"),
        content: (0, s.tr)("By signing up, you agree to:\n\n- Not use our service to send spam or scam users.\n- Not promote violence on publicly viewable posts.\n- Not send objectionable content to others users of this app.\n\n We reserve the right to update these Terms of Service later."),
        link: {
          text: (0, s.tr)("Privacy Policy"),
          onPress: function () {
            return o.Linking.openURL("http://qxchat.cn/privacypolicy.html");
          }
        },
        buttons: [{
          text: (0, s.tr)("OK"),
          onPress: function (t) {
            t.isProgressing || (t.progressing(!0), e.termsOfServiceGo().then(function () {
              e.closeDiag(function () {
                return e.signMenu();
              });
            })["catch"](function (e) {
              t.progressing(!1), t.setState({
                infoTip: (0, s.tr)("Connection Failed")
              }), (0, s.tlog)("error", "termsOfService", e);
            }));
          }
        }]
      };
      e.has("modelView") ? e.diag(t) : e.modelViewDelayParas = t;
    }, e.loginVerification = function (t, r) {
      return new Promise(function (n, i) {
        e.post("/api/phoneVacc", r).then(function (t) {
          t.notExist ? i(new Error("notExist")) : e.diag({
            transp: !0,
            locking: !0,
            header: (0, s.tr)("Tip"),
            content: (0, s.tr)("You need to verify the phone number with this account."),
            buttons: [{
              text: (0, s.tr)("Prev"),
              onPress: function () {
                return e.closeDiag(function () {
                  return e.showSignInDiag();
                });
              }
            }, {
              text: (0, s.tr)("Verify"),
              onPress: function (r) {
                r.isProgressing || (r.progressing(!0), e.phoneVerify(r, "\u9a8c\u8bc1\u767b\u5f55", function () {
                  e.closeDiag(function () {
                    e.popSpin((0, s.tr)("Verifying..."), function () {
                      return !0;
                    }), setTimeout(function () {
                      return e.popClose(function () {
                        return e.payPhoneVerification(t.userid, n, i);
                      });
                    }, 1831);
                  });
                }));
              }
            }]
          });
        })["catch"](function (e) {
          (0, s.tlog)("error", "loginVerification", e), t.setState({
            infoTip: (0, s.tr)("Connection Failed")
          });
        });
      });
    }, e.payPhoneVerificationPromise = function (t, r) {
      return new Promise(function (n, i) {
        e.payPhoneVerification(t, r, n, i);
      });
    }, e.showSignInDiag = function (t) {
      var r = {
        locking: !0,
        transp: !0,
        header: (0, s.tr)("Sign In"),
        content: (0, s.tr)("Sign in your account"),
        showPasswdButton: !0,
        textInputs: [{
          placeholder: (0, s.tr)("Account"),
          value: "",
          maxLength: 50
        }, {
          placeholder: (0, s.tr)("Password"),
          value: "",
          secureTextEntry: !0,
          maxLength: 50
        }],
        buttons: [{
          text: (0, s.tr)("Prev"),
          onPress: function (t) {
            e.closeDiag(function () {
              if (e.multiLoginsRoute) {
                delete e.multiLoginsRoute;
                return;
              }
              return e.signMenu();
            });
          }
        }, {
          text: (0, s.tr)("Next"),
          onPress: function (t) {
            if (!t.isProgressing) {
              var r = t.state.textInputs[0].value.trim(),
                n = t.state.textInputs[1].value.trim();
              if (!r) return void t.setState({
                infoTip: (0, s.tr)("Account cannot be empty")
              });
              if (!n) return void t.setState({
                infoTip: (0, s.tr)("Password cannot be empty")
              });
              var i = "ios" === o.Platform.OS ? 1 : 2;
              e.cheobv && (i += 2);
              var a = {
                account: r,
                password: n,
                platform: i,
                deviceId: e.deviceId
              };
              t.progressing(!0), e.loginingOver === r ? (delete e.loginingOver, e.closeDiag(function () {
                return e.diag({
                  header: (0, s.tr)("Tip"),
                  content: (0, s.tr)("We limit the login times to prevent fraud account"),
                  buttons: [{
                    text: (0, s.tr)("Ok"),
                    onPress: function () {
                      return e.closeDiag(function () {
                        return e.showSignInDiag((0, s.tr)("Login too many times"));
                      });
                    }
                  }]
                });
              })) : e.logining(t, a);
            }
          }
        }]
      };
      t && (r.infoTip = t);
      var n = {
        text: (0, s.tr)("Login previous account?"),
        color: s.theme.deepGreen2,
        onPress: function (t) {
          if (e.phone) {
            e.phone.slice(3, 6) + "****" + e.phone.slice(10);
          }
          !e.signuped || e.userid && e.mpasswd ? e.closeDiag(function () {
            return e.diag({
              transp: !0,
              locking: !0,
              header: (0, s.tr)("Tip"),
              content: (0, s.tr)("You could clear previous account in Settings"),
              buttons: [{
                text: (0, s.tr)("Cancel"),
                onPress: function () {
                  return e.closeDiag(function () {
                    return e.showSignInDiag();
                  });
                }
              }, {
                text: (0, s.tr)("Login"),
                onPress: function () {
                  if (!t.isProgressing) {
                    if (e.logining2Over) return delete e.logining2Over, void e.closeDiag(function () {
                      return e.diag({
                        header: (0, s.tr)("Tip"),
                        content: (0, s.tr)("We limit the login times to prevent fraud account"),
                        buttons: [{
                          text: (0, s.tr)("Ok"),
                          onPress: function () {
                            return e.closeDiag(function () {
                              return e.showSignInDiag((0, s.tr)("Login too many times"));
                            });
                          }
                        }]
                      });
                    });
                    t.progressing(!0), e.logining2(t);
                  }
                }
              }]
            });
          }) : e.vfphone();
        }
      };
      e.userid && e.mpasswd ? r.link = n : (e.signuped || e.accountClr && !(e.now() - e.accountClr > 36e5)) && e.signuped && (!e.userid || !e.mpasswd), e.diag(r);
    }, e.checkSignupField = function (e) {
      var t,
        r,
        n,
        i = 0;
      if ("ios" === o.Platform.OS) {
        for (var a = e, d = Array.isArray(a), u = 0, a = d ? a : a["function" == typeof Symbol ? Symbol.iterator : "@@iterator"]();;) {
          var c;
          if (d) {
            if (u >= a.length) break;
            c = a[u++];
          } else {
            if (u = a.next(), u.done) break;
            c = u.value;
          }
          var l = c;
          i += 1;
          var f = l.codePointAt(0);
          f > 47 && 58 > f ? r = !0 : f > 64 && 91 > f || f > 96 && 123 > f ? t = !0 : n = !0;
        }
        return {
          hasLetter: t,
          hasNumber: r,
          hasOther: n,
          n: i
        };
      }
      for (var g = 0; g < e.length;) {
        var f = s.util.codePointAt(e, g),
          h = s.util.fromCodePoint(f),
          p = h.length;
        g += p, i += 1, f > 47 && 58 > f ? r = !0 : f > 64 && 91 > f || f > 96 && 123 > f ? t = !0 : n = !0;
      }
      return {
        hasLetter: t,
        hasNumber: r,
        hasOther: n,
        n: i
      };
    }, e.phoneVerify = function (t, r, n, i, o) {
      var a,
        d = 1,
        u = function () {
          s.reactDevInfo.aliAuth({
            title: r,
            deviceId: e.deviceId
          })["catch"](function (t) {
            (0, s.tlog)("error", "phoneVerify", t), "nofunction" === t && e.needUpdate();
          });
        };
      e.has("aliAuthOk") || e.on("aliAuthOk", function (r, c) {
        if (!e.isIn(r.code, "600024", "600001", "700002", "700004")) if (t && t.progressing(!1), r.token) e.unon("aliAuthOk"), e.unon("aliAuthErr"), i(c);else if (0 === e.authCnt) e.unon("aliAuthOk"), e.unon("aliAuthErr"), i({});else {
          var l = function () {
            return e.isIn(r.code, "-72931", "700000");
          };
          if ("600008" === r.code) var f = (0, s.tr)("Turn on 4G/5G"),
            g = (0, s.tr)("Please check your 4G/5G network is turned on");else "600007" === r.code ? (f = (0, s.tr)("No Sim Card"), g = (0, s.tr)("Please insert a sim card and try again.")) : (f = (0, s.tr)("Turn on 4G/5G"), g = e.showCmdBall || l() ? r.msg : (0, s.tr)("Please check your 4G/5G network is turned on"));
          if (o) (0, s.tlog)("error", f, g);else {
            var h = function () {
              return e.diag({
                header: f,
                content: g,
                transp: !0,
                locking: !0,
                buttons: [{
                  text: (0, s.tr)("Prev"),
                  onPress: function () {
                    a = !1, n();
                  }
                }, {
                  text: (0, s.tr)("Try Again"),
                  onPress: function () {
                    a = !1, e.authCnt > 0 && d >= e.authCnt ? (e.unon("aliAuthOk"), e.unon("aliAuthErr"), i({})) : (d += 1, e.closeDiag(function () {
                      e.popSpin((0, s.tr)("Signuping..."), function () {
                        return !0;
                      }), u();
                    }));
                  }
                }]
              });
            };
            e.post("/api/aliAuthFailed", {
              deviceId: e.deviceId,
              authCode: r.code
            }).then(function (t) {
              t.pkgvv === e.pkgVersion ? (e.unon("aliAuthOk"), e.unon("aliAuthErr"), i({
                pkgvv: t.pkgvv
              })) : a || (a = !0, h());
            })["catch"](function (e) {
              (0, s.tlog)("error", "aliAuthFailed", e), a = !1, h();
            });
          }
        }
      }), e.has("aliAuthErr") || e.on("aliAuthErr", function () {
        return u();
      }), u();
    }, e.showAvatarNameDiag = function () {
      e.firstInstallStepPost("a&n"), e.getDeviceCheck(), e.diag({
        transp: !0,
        locking: !0,
        header: (0, s.tr)("Sign Up"),
        content: (0, s.tr)("Set up your name and avatar"),
        textInputs: [{
          placeholder: (0, s.tr)("Nickname"),
          value: e.signupInfo.username || "",
          maxLength: 20
        }],
        imagePicker: (0, s.tr)("Avatar"),
        imagePickerResult: e.signupInfo.avatar,
        onImagePicked: function () {
          e.firstInstallStepPost("a");
        },
        buttons: [{
          text: (0, s.tr)("Prev"),
          onPress: function (t) {
            if (!t.isProgressing) {
              var r = t.state.textInputs[0].value.trim();
              r = r.replace(/\ufffc/, "");
              var n = t.state.imagePickerResult;
              r && (e.signupInfo.username = r), n && (e.signupInfo.avatar = n), e.closeDiag(function () {
                e.signMenu();
              });
            }
          }
        }, {
          text: (0, s.tr)("Next"),
          onPress: function (t) {
            if (!t.isProgressing) {
              var r = t.state.textInputs[0].value.trim(),
                n = t.state.imagePickerResult;
              if (!r) return void t.setState({
                infoTip: (0, s.tr)("Nickname cannot be empty")
              });
              if (/^\d{11}$/.test(r)) return void t.setState({
                infoTip: (0, s.tr)("Don't set phone number as your nickname")
              });
              if (!n) return void t.setState({
                infoTip: (0, s.tr)("Avatar not selected")
              });
              e.signupInfo.username = r, e.signupInfo.avatar = n, t.progressing(!0), e.post("/api/nameAbuseCheck", {
                name: r
              }).then(function (r) {
                if (r.illegal) {
                  var n = Object.keys(r.illegal).join("\uff0c");
                  t.progressing(!1), t.setState({
                    infoTip: (0, s.tr)("Username illegal!") + "\uff08" + n + "\uff09"
                  }), e.firstInstallStepPost("ilg");
                } else if (r.abuse) t.progressing(!1), t.setState({
                  infoTip: (0, s.tr)("Username abuse!")
                }), e.firstInstallStepPost("abs");else if (r.exist) t.progressing(!1), t.setState({
                  infoTip: (0, s.tr)("Name existed")
                }), e.firstInstallStepPost("exi");else {
                  var i = function () {
                    return e.closeDiag(function () {
                      e.popSpin((0, s.tr)("Signuping..."), function () {
                        return !0;
                      }, function () {
                        e.finishSignup();
                      });
                    });
                  };
                  i();
                }
              })["catch"](function (e) {
                t.progressing(!1), (0, s.tlog)("error", "nameAbuseCheck", r, e), t.setState({
                  infoTip: (0, s.tr)("Connection Failed")
                });
              });
            }
          }
        }]
      });
    }, e.getCurrentCountry = function () {
      try {
        var e = s.I18n.rawLocale.split("-");
        return s.smsRegion.smsCodeRegion[e[e.length - 1].toLowerCase()];
      } catch (t) {
        (0, s.tlog)("error", "getCurrentCountry", t);
      }
    }, e.finishSignup = function (t) {
      t && t.isProgressing || (t && t.progressing(!0), e.getPasswdSalt().then(function (r) {
        var n = e.signupInfo,
          i = n.username,
          a = n.avatar,
          d = n.account,
          u = n.password,
          c = n.birth,
          l = n.bText,
          f = n.gender,
          g = "ios" === o.Platform.OS ? 1 : 2;
        u = u ? (0, s.md5)(u + r) : "";
        var h = e.getCurrentCountry() || "China",
          p = {
            account: d,
            username: i,
            password: u,
            avatar: {
              data: a.data,
              dataT: a.dataT
            },
            deviceId: e.deviceId,
            platform: g,
            gender: f || 0,
            birth: c,
            country: h,
            bText: l,
            pkgvv: e.pkgVersion
          };
        s.fs.greetings("signuping_" + e.deviceUuid).then(function (t) {
          return p.greetings = t, e.getDeviceCheck();
        }).then(function (t) {
          return p.deviceCheck = t, p.tzo = e.timeZoneOffset, e.signuping(p);
        }).then(function () {
          e.emit("appLaunchEnd", "normal", function () {
            e.closeDiag(), e.popClose(), e.normalLaunch()["catch"](function (e) {
              (0, s.tlog)("error", "signuping", e);
            });
          });
        })["catch"](function (r) {
          if (t && t.progressing(!1), "__break" !== r) {
            if ((0, s.tlog)("error", "finishSignup", r), "iosTooOld" === r) var n = (0, s.tr)("Your ios version is too old");else if ("iosRegRepeat" === r) n = (0, s.tr)("Sign up repeated");else {
              if ("phoneRepeat" !== r) return n = (0, s.tr)("Connection Failed"), void e.popClose(function () {
                return e.diag({
                  transp: !0,
                  locking: !0,
                  header: (0, s.tr)("Tip"),
                  content: (0, s.tr)("Connection Failed"),
                  buttons: [{
                    text: (0, s.tr)("Try Again"),
                    onPress: function (t) {
                      t.isProgressing || (t.progressing(!0), e.finishSignup());
                    }
                  }]
                });
              });
              var i = (0, s.tr)("Sign up failed");
              n = (0, s.tr)("Phone number already signuped");
            }
            e.signuped = 1, e.popClose(function () {
              return e.diag({
                transp: !0,
                locking: !0,
                header: i || (0, s.tr)("Tip"),
                content: n,
                link: {
                  text: (0, s.tr)("Sign in?"),
                  color: s.theme.deepGreen2,
                  onPress: function (t) {
                    e.firstInstallCheck().then(function () {
                      e.signuped && e.userid && e.mpasswd ? (t.progressing(!0), e.logining2(t)) : e.closeDiag(function () {
                        return e.showSignInDiag();
                      });
                    })["catch"](function (e) {
                      (0, s.tlog)("error", "finishSignup firstInstallCheck", e), t.setState({
                        infoTip: (0, s.tr)("Connection Failed")
                      });
                    });
                  }
                },
                buttons: [{
                  text: (0, s.tr)("Ok"),
                  onPress: function () {}
                }]
              });
            });
          }
        });
      })["catch"](function (e) {
        return (0, s.tlog)("error", "showUserSettingsDiag getPasswdSalt", e);
      }));
    }, e.setBirth = function () {
      "ios" === o.Platform.OS ? e.diag({
        transp: !0,
        locking: !0,
        header: (0, s.tr)("Birthday"),
        content: (0, s.tr)("Set up your birthday"),
        showDatepicker: !0,
        buttons: [{
          text: (0, s.tr)("Prev"),
          onPress: function (t) {
            e.closeDiag(function () {
              return e.showAvatarNameDiag();
            });
          }
        }, {
          text: (0, s.tr)("Next"),
          onPress: function (t) {
            t.isProgressing || (e.signupInfo.birth = t.state.datePickerValue, e.closeDiag(function () {
              return e.chooseGender();
            }));
          }
        }]
      }) : e.chooseGender();
    }, e.changeGender = function (t, r, n) {
      n || (n = function () {});
      var i = [{
        text: (0, s.tr)("Cancel"),
        onPress: function () {
          return e.closeDiag();
        }
      }, {
        text: (0, s.tr)("Male"),
        onPress: function (r) {
          e.send("changeGender", {
            userid: t,
            g: 1
          }).then(function () {
            return s.dbs.setUserProfile({
              gender: 1
            });
          }).then(function () {
            e.closeDiag(function () {
              return n();
            }), e.loadProfile(t);
          })["catch"](function (e) {
            (0, s.tlog)("error", "changeGender", e), r.setState({
              infoTip: (0, s.tr)("Network Failed")
            });
          });
        }
      }, {
        text: (0, s.tr)("Female"),
        onPress: function (r) {
          e.send("changeGender", {
            userid: t,
            g: 2
          }).then(function () {
            return s.dbs.setUserProfile({
              gender: 2
            });
          }).then(function () {
            e.closeDiag(function () {
              return n();
            }), e.loadProfile(t);
          })["catch"](function (e) {
            (0, s.tlog)("error", "changeGender", e), r.setState({
              infoTip: (0, s.tr)("Network Failed")
            });
          });
        }
      }];
      r && i.shift(), e.diag({
        header: (0, s.tr)("Your Gender"),
        upPadding: 7,
        downPadding: 8,
        infoColor: s.theme.deepGreen,
        infoTip: (0, s.tr)("Set only once. Choose carefully."),
        buttons: i
      });
    }, e.chooseGender = function () {
      e.diag({
        transp: !0,
        locking: !0,
        header: (0, s.tr)("Gender"),
        upPadding: 7,
        downPadding: 8,
        infoColor: s.theme.deepGreen,
        infoTip: (0, s.tr)("Set only once. Choose carefully."),
        buttons: [{
          text: (0, s.tr)("Prev"),
          onPress: function () {
            e.closeDiag(function () {
              return e.signMenu();
            });
          }
        }, {
          text: (0, s.tr)("Male"),
          onPress: function () {
            e.signupInfo.gender = 1, e.closeDiag(function () {
              return e.showAvatarNameDiag();
            });
          }
        }, {
          text: (0, s.tr)("Female"),
          onPress: function () {
            e.signupInfo.gender = 2, e.closeDiag(function () {
              return e.showAvatarNameDiag();
            });
          }
        }]
      });
    }, e.setFirstBottle = function () {
      e.diag({
        transp: !0,
        locking: !0,
        header: (0, s.tr)("Secret Heart"),
        content: (0, s.tr)("Say something to someone..."),
        textInputs: [{
          placeholder: (0, s.tr)("Throw a bottle..."),
          value: e.signupInfo.bText || "",
          maxLength: 200
        }],
        buttons: [{
          text: (0, s.tr)("Prev"),
          onPress: function (t) {
            t.isProgressing || e.closeDiag(function () {
              return e.chooseGender();
            });
          }
        }, {
          text: (0, s.tr)("Next"),
          onPress: function (t) {
            if (!t.isProgressing) {
              var r = t.state.textInputs[0].value.trim();
              if (!r) return void t.setState({
                infoTip: (0, s.tr)("Say something first")
              });
              t.progressing(!0), e.signupInfo.bText = r;
            }
          }
        }]
      });
    }, e.signuping = function (t) {
      return e.post("/api/signuping", t, 6e4).then(function (r) {
        if (r.signuped) return e.popClose(function () {
          return e.diag({
            locking: !0,
            transp: !0,
            header: (0, s.tr)("Tip"),
            content: (0, s.tr)("Sign up failed, try again."),
            buttons: [{
              text: (0, s.tr)("Try Again"),
              onPress: function (t) {
                t.progressing(!0), e.firstInstallCheck().then(function () {
                  e.signuped && e.userid && e.mpasswd ? e.logining2(t) : e.closeDiag(function () {
                    return e.showSignInDiag();
                  });
                })["catch"](function (e) {
                  t.progressing(!1), (0, s.tlog)("error", "signup again firstInstallCheck", e), t.setState({
                    infoTip: (0, s.tr)("Connection Failed")
                  });
                });
              }
            }]
          });
        }), Promise.reject("__break");
        if (!r.userid) return Promise.reject(r.err);
        var n = r.userid,
          i = r.avatar,
          o = r.userRand,
          a = r.lastLoginTime,
          d = r.username,
          u = r.mpasswd,
          c = r.phoneNum,
          l = r.pubid,
          f = r.pkgvv;
        return e.userid = n, l || (l = n), e["userid_" + e.dataCenter] = n, e.pkgvv = f, e.reloginClear = 1, e.lastLoginTime[n] = a, -1 === e.multiLogins.indexOf(n) && e.multiLogins.unshift(n), e["multiLogins_" + e.dataCenter] = e.multiLogins, e.resetSharedParas(["reloginClear", "lastLoginTime", "userid_" + e.dataCenter, "multiLogins_" + e.dataCenter]).then(function () {
          return e.dataLaunch();
        }).then(function () {
          return Promise.all([s.dbs.setUserProfile({
            phoneNum: c,
            mpasswd: u,
            country: t.country,
            userRand: o,
            account: e.userid,
            pickNoti: 1,
            shareNoti: 1,
            msgNoti: 1,
            commentNoti: 1,
            firReg: 1,
            pubid: l,
            gender: t.gender,
            friendsSync: 1,
            friendShipsSync: 1
          }), s.dbs.setProfile(n, {
            name: d,
            avatar: i,
            background: "",
            gender: t.gender
          })])["catch"](function (e) {
            (0, s.tlog)("error", "signuping set", e);
          });
        });
      }).then(function () {
        e.multiLoginsRoute && e.reloadHvdown();
      });
    }, e.loginNextMonth = function () {
      e.closeDiag(function () {
        return e.diag({
          header: (0, s.tr)("Tip"),
          locking: !0,
          content: (0, s.tr)("Login next month"),
          buttons: [{
            text: (0, s.tr)("Ok"),
            onPress: function (e) {}
          }]
        });
      });
    }, e.logining = function (t, r) {
      e.getPasswdSalt().then(function (t) {
        return r.password = (0, s.md5)(r.password + t), s.fs.greetings("logining_" + e.deviceUuid);
      }).then(function (t) {
        return r.greetings = t, e.post("/api/logining", r);
      }).then(function (e) {
        return e.err ? "needc" === e.err ? Promise.reject("needc") : Promise.reject(e.err) : e;
      }).then(function (t) {
        var n = t.userid,
          i = t.avatar,
          o = t.background,
          a = t.userRand,
          d = t.lastLoginTime,
          u = t.name,
          c = t.mpasswd,
          l = t.pkgvv,
          f = t.phoneNum,
          g = t.pubid,
          h = t.gender,
          p = t.pickNoti,
          m = t.country,
          S = t.shareNoti,
          v = t.msgNoti,
          I = t.commentNoti,
          b = t.disableBottle ? 1 : 0,
          w = t.disableShadow ? 1 : 0;
        return e.userid = n, g || (g = n), e["userid_" + e.dataCenter] = n, e.reloginClear = 1, e.relogin = 1, e.lastLoginTime[n] = d, e.pkgvv = l, -1 === e.multiLogins.indexOf(n) && e.multiLogins.unshift(n), e["multiLogins_" + e.dataCenter] = e.multiLogins, e.resetSharedParas(["relogin", "reloginClear", "lastLoginTime", "userid_" + e.dataCenter, "multiLogins_" + e.dataCenter]).then(function () {
          return e.dataLaunch();
        }).then(function () {
          var e = {
            phoneNum: f,
            mpasswd: c,
            country: m,
            userRand: a,
            account: r.account,
            pickNoti: p,
            shareNoti: S,
            msgNoti: v,
            commentNoti: I,
            pubid: g,
            disableShadow: w,
            gender: h,
            disableBottle: b
          };
          return h || (e.firReg = 1), Promise.all([s.dbs.setUserProfile(e), s.dbs.setProfile(n, {
            name: u,
            avatar: i,
            background: o,
            gender: h
          })])["catch"](function (e) {
            (0, s.tlog)("error", "logining set", e);
          });
        });
      }).then(function () {
        e.multiLoginsRoute && e.reloadHvdown();
      }).then(function () {
        e.closeDiag(function () {
          e.emit("appLaunchEnd", "normal", function () {
            return e.normalLaunch()["catch"](function (e) {
              (0, s.tlog)("error", "logining", e);
            });
          });
        });
      })["catch"](function (n) {
        t.progressing(!1), "needc" === n ? e.loginNextMonth() : "notExist" === n ? t.setState({
          infoTip: (0, s.tr)("Account not exists")
        }) : "mismatch" === n ? t.setState({
          infoTip: (0, s.tr)("Password wrong")
        }) : "accTooShort" === n ? t.setState({
          infoTip: (0, s.tr)("\u8d26\u53f7\u540d\u592a\u77ed")
        }) : "resetPasswd" === n ? t.setState({
          infoTip: (0, s.tr)("\u9700\u8981\u5728\u4e4b\u524d\u767b\u5f55\u7684\u8bbe\u5907\u4e0a\u91cd\u8bbe\u5bc6\u7801\u540e\u624d\u80fd\u767b\u5f55")
        }) : "tooMany" === n ? (e.loginingOver = r.account, t.setState({
          infoTip: (0, s.tr)("Login too many times")
        })) : "nosu" === n ? t.setState({
          infoTip: (0, s.tr)("nosu")
        }) : "notsa" === n ? e.tipCb((0, s.tr)("Due to some system issue, current version cannot login account with different phone."), function () {
          e.showSignInDiag();
        }) : ((0, s.tlog)("error", "showSignInDiag", n), t.setState({
          infoTip: (0, s.tr)("Connection Failed")
        }));
      });
    }, e.logining2 = function (t, r) {
      var n = "ios" === o.Platform.OS ? 1 : 2;
      e.cheobv && (n += 2);
      var i = babelHelpers["extends"]({
        userid: e.userid,
        mpasswd: e.mpasswd,
        deviceId: e.deviceId,
        platform: n
      }, r);
      return s.fs.greetings("logining2_" + e.deviceUuid).then(function (t) {
        return i.greetings = t, e.post("/api/logining2", i);
      }).then(function (e) {
        return e.err ? "needc" === e.err ? Promise.reject("needc") : Promise.reject(e.err) : e;
      }).then(function (t) {
        var r = t.userid,
          n = t.avatar,
          i = t.userRand,
          o = t.background,
          a = t.lastLoginTime,
          d = t.name,
          u = t.mpasswd,
          c = t.pkgvv,
          l = t.account,
          f = t.gender,
          g = t.phoneNum,
          h = t.pubid,
          p = t.country,
          m = t.pickNoti,
          S = t.shareNoti,
          v = t.msgNoti,
          I = t.commentNoti,
          b = t.disableBottle ? 1 : 0,
          w = t.disableShadow ? 1 : 0;
        return e.userid = r, h || (h = r), e["userid_" + e.dataCenter] = r, e.reloginClear = 1, e.relogin = 1, e.lastLoginTime[r] = a, e.pkgvv = c, -1 === e.multiLogins.indexOf(r) && e.multiLogins.unshift(r), e["multiLogins_" + e.dataCenter] = e.multiLogins, e.resetSharedParas(["relogin", "reloginClear", "lastLoginTime", "userid_" + e.dataCenter, "multiLogins_" + e.dataCenter]).then(function () {
          return e.dataLaunch();
        }).then(function () {
          var e = {
            phoneNum: g,
            mpasswd: u,
            country: p,
            userRand: i,
            account: l,
            pickNoti: m,
            shareNoti: S,
            msgNoti: v,
            commentNoti: I,
            pubid: h,
            gender: f,
            disableBottle: b,
            disableShadow: w,
            needLogining: 0
          };
          return f || (e.firReg = 1), Promise.all([s.dbs.setUserProfile(e), s.dbs.setProfile(r, {
            name: d,
            avatar: n,
            background: o,
            gender: f
          })]);
        })["catch"](function (e) {
          (0, s.tlog)("error", "logining2 set", e);
        });
      }).then(function () {
        e.multiLoginsRoute || r && r.userid ? e.reloadHvdown() : (e.closeDiag(), e.emit("appLaunchEnd", "normal", function () {
          return e.normalLaunch()["catch"](function (e) {
            (0, s.tlog)("error", "signuping", e);
          });
        }));
      })["catch"](function (r) {
        t && t.progressing(!1), "needc" === r ? e.loginNextMonth() : "mismatch" === r ? t.setState({
          infoTip: (0, s.tr)("Login info error")
        }) : "tooMany" === r ? (t.setState({
          infoTip: (0, s.tr)("Login too many times")
        }), e.logining2Over = !0) : "notsa" === r ? e.tipCb((0, s.tr)("Due to some system issue, current version cannot login account with different phone."), function () {
          e.showSignInDiag();
        }) : ((0, s.tlog)("error", "logining2", r), t.setState({
          infoTip: (0, s.tr)("Connection Failed")
        }));
      });
    }, e.clearMsgBufferData = function (t) {
      var r = e.msgsDataBufferKeys.indexOf(t);
      -1 !== r && (e.msgsDataBufferKeys.splice(r, 1), delete e.msgsData[t], delete e.msgsLoadPos[t], delete e.renderedMsgsMap[t]);
    }, e.clearChatMessages = function (t) {
      var r,
        n = e.getChatSession(t, e.userid),
        i = e.getFid(t, e.userid, n),
        o = Date.now();
      e.clearTime[n] = o, s.db.executeSql("SELECT * FROM Msgs WHERE shareId=? AND category!=? ORDER BY time DESC LIMIT 1", [n, e.CONS_MSG_CAT_LAST_ITEM]).then(function (e) {
        var t = e[0].rows;
        return 0 === t.length ? Promise.reject("__break") : t.item(0);
      }).then(function (a) {
        a && a.msgscnt === e.CONS_MSGSCNT_TERM && (r = !0);
        var d = e.msgsData[i];
        return d && d.length && (e.msgsData[i] = d.filter(function (t) {
          return t.category === e.CONS_MSG_CAT_LAST_ITEM;
        })), e.sessionFilesCache[n] = [], e.emit("rerenderMsgsData_" + i), s.db.transaction(function (r) {
          r.executeSql("INSERT OR REPLACE INTO ClearTimes(shareId, time) VALUES(?, ?)", [n, o])["catch"](function (e) {
            (0, s.tlog)("error", "clearChatMessages clearTime", n, e);
          }), r.executeSql("DELETE FROM Msgs WHERE shareId=? AND category!=?", [n, e.CONS_MSG_CAT_LAST_ITEM])["catch"](function (e) {
            (0, s.tlog)("error", "clearChatMessages delete Msgs", t, e);
          });
        }).then(function () {
          return e.removeFriendsAllUnread(t);
        }).then(function () {
          return e.loadFriendsData();
        }).then(function () {
          var n = o + 1,
            i = s.util.fmtDateTimeWithoutYear(new Date(n)),
            a = e.getChatSession(t, e.userid),
            d = e.createSysTipMsg({
              time: n,
              text: i,
              shareId: a
            });
          if (d.category = e.CONS_MSG_CAT_LAST_ITEM, r) {
            d.msgscnt = e.CONS_MSGSCNT_TERM;
            var u = e.getFid(t, e.userid, a),
              c = e.msgsData[u];
            c && (e.msgsData[u] = [d].concat(c), e.emit("rerenderMsgsData_" + u, 1));
          }
          s.dbs.insertNewMsg(d)["catch"](function (e) {
            return (0, s.tlog)("errror", "addNewTipMsg", t, i, e);
          });
        });
      })["catch"](function (r) {
        "__break" !== r && ((0, s.tlog)("error", "clearChatMessages", t, r), e.reTryDiag(function () {
          return e.clearChatMessages(t);
        }));
      });
    }, e.getProfileK = function (t, r) {
      return e.getProfile(t).then(function (e) {
        return e[r];
      });
    }, e.getProfile = function (t) {
      return new Promise(function (r, n) {
        if (!t) return void n(new Error("getProfile[" + t + "] failed"));
        var i = function (n) {
          e.profiles[t] ? babelHelpers["extends"](e.profiles[t], n) : e.profiles[t] = n, r(e.profiles[t]);
        };
        e.profiles[t] ? r(e.profiles[t]) : e.has("getProfile_" + t) ? e.on("getProfile_" + t, i) : (e.on("getProfile_" + t, i), s.dbs.getAllProfiles(t).then(function (r) {
          return r ? Promise.resolve(r) : e.send("fetchProfile", {
            userid: t,
            isOb: e.showCmdBall
          }).then(function (r) {
            return delete r.proto, delete r.seq, r.fetchTime = e.now(), s.dbs.setProfile(t, r).then(function () {
              return Promise.resolve(r);
            });
          });
        }).then(function (r) {
          e.emitOnce("getProfile_" + t, r);
        })["catch"](function (e) {
          (0, s.tlog)("error", "getProfile", t, e), n(e);
        }));
      });
    }, e.chooseGroupType = function (t) {
      e.gstyle = 2, e.diag({
        header: (0, s.tr)("Group Type"),
        content: (0, s.tr)("Choose Private means your group could not be discovered by others. You need to add your members from contacts yourself."),
        link: {
          text: (0, s.tr)("Difference from your drift?"),
          onPress: function (t) {
            e.closeDiag(function () {
              return e.diag({
                header: (0, s.tr)("Tip"),
                content: (0, s.tr)("New tell is group drift. All members could post in it."),
                buttons: [{
                  text: (0, s.tr)("Ok"),
                  onPress: function (t) {
                    return e.closeDiag(function () {
                      return e.createNewGroup();
                    });
                  }
                }]
              });
            });
          }
        },
        buttons: [{
          text: (0, s.tr)("Private Group"),
          onPress: function (r) {
            return e.closeDiag(function () {
              e.gtype = 1, t();
            });
          }
        }, {
          text: (0, s.tr)("Drift Group"),
          onPress: function (r) {
            return e.closeDiag(function () {
              e.gtype = 2, t();
            });
          }
        }]
      });
    }, e.createNewGroup = function () {
      e.diag({
        header: (0, s.tr)("New Group"),
        content: (0, s.tr)("Setting avatar and name for your new group"),
        textInputs: [{
          placeholder: (0, s.tr)("Group Name"),
          value: "",
          maxLength: 20
        }],
        imagePicker: (0, s.tr)("Avatar"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            if (!t.isProgressing) {
              var r = t.state.textInputs[0].value.trim(),
                n = t.state.imagePickerResult;
              r ? n ? (t.progressing(!0), e.request("/api/nameAbuseCheck", {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  name: r
                })
              }).then(function (e) {
                return 200 === e.status ? e.json() : Promise.reject("resError");
              }).then(function (t) {
                return t.abuse ? Promise.reject("abuse") : e.createGroup({
                  members: [],
                  name: r,
                  avatarData: n
                });
              }).then(function () {
                e.closeDiag();
              })["catch"](function (e) {
                t.progressing(!1), "abuse" === e ? t.setState({
                  infoTip: (0, s.tr)("Username abuse!")
                }) : e && e.overflow ? t.setState({
                  infoTip: (0, s.tr)("Currently you can only create ## groups", e.overflow)
                }) : e && e.nameExist ? t.setState({
                  infoTip: (0, s.tr)("Drift group name existed")
                }) : ((0, s.tlog)("error", "navigator createNewGroup", e), t.setState({
                  infoTip: (0, s.tr)("Create failed")
                }));
              })) : t.setState({
                infoTip: (0, s.tr)("Avatar not selected")
              }) : t.setState({
                infoTip: (0, s.tr)("Group name cannot be empty")
              });
            }
          }
        }]
      });
    };
    var r = (0, s.tr)("It is only hided from you. The people who receive this message could still see it. If you want it disappear from their devices too, use `Delete`. The hided message will show again when you login on other devices.");
    e.hideAllMsgs = function (t, n) {
      var i = function () {
          e.msgsData[n] = [];
          var r = t.msgid,
            i = t.fromId,
            o = t.toId,
            a = t.chatSession,
            d = t.shareId;
          s.db.executeSql("\n      DELETE FROM Msgs WHERE shareId=?\n    ", [d]).then(function (t) {
            var n = [{
              msgid: r,
              fromId: i,
              chatSession: a,
              toId: o,
              category: 0,
              shareFrom: i,
              time: e.getLowRandomTime(),
              shareId: d,
              stat: 2,
              type: 1
            }];
            return s.dbs.insertFetchedMsgs(n);
          }).then(function () {
            e.emit("rerenderMsgsData_" + n), s.dbs.setUserProfile({
              lastHideTime: Date.now()
            });
          })["catch"]((0, s.errCb)("hideAllMsg " + d + " " + n));
        },
        o = e.lastHideTime || 0;
      Date.now() - o > 864e5 ? e.diag({
        header: (0, s.tr)("Tip"),
        content: r,
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            return e.closeDiag(function () {
              return i();
            });
          }
        }]
      }) : i();
    }, e.hideMsg = function (t, n) {
      var i = function () {
          e.msgsData[n] = e.msgsData[n].filter(function (e) {
            return e.msgid !== t;
          }), s.db.executeSql("\n      DELETE FROM Msgs WHERE msgid=?\n    ", [t])["catch"]((0, s.errCb)("hideMsg " + t + " " + n)), e.emit("rerenderMsgsData_" + n), s.dbs.setUserProfile({
            lastHideTime: Date.now()
          });
        },
        o = e.lastHideTime || 0;
      Date.now() - o > 864e5 ? e.diag({
        header: (0, s.tr)("Tip"),
        content: r,
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            return e.closeDiag(function () {
              return i();
            });
          }
        }]
      }) : i();
    }, e.hideShare = function (t, n) {
      var i = function () {
          e.sharesData[n] = e.sharesData[n].filter(function (e) {
            return e.shareId !== t;
          }), s.db.executeSql("\n      DELETE FROM Shares WHERE shareId=?\n    ", [t])["catch"]((0, s.errCb)("hideShare " + t + " " + n)), e.emit("rerenderSharesData_" + n), s.dbs.setUserProfile({
            lastHideTime: Date.now()
          });
        },
        o = e.lastHideTime || 0;
      Date.now() - o > 864e5 ? e.diag({
        header: (0, s.tr)("Tip"),
        content: r,
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            return e.closeDiag(function () {
              return i();
            });
          }
        }]
      }) : i();
    }, e.getGenderSource = function (r) {
      return t(e.profiles[r] ? 1 === e.profiles[r].gender ? 386 : 385 : 387);
    }, e.getGenderImageId = function (t) {
      return e.profiles[t] ? 1 === e.profiles[t].gender ? "/a/male.png" : "/a/female.png" : "/a/quest.png";
    }, e.transGender = function (t) {
      if (e.profiles[t]) {
        var r = e.profiles[t].gender;
        return 1 === r ? (0, s.tr)("Male") : 2 === r ? (0, s.tr)("Female") : (0, s.tr)(" ");
      }
      return (0, s.tr)("Secret");
    }, e.shouldSetGender = function () {
      if (void 0 === e.profiles[e.userid].gender) {
        var t = function (t) {
          Promise.all([s.dbs.setProfile(e.userid, {
            gender: t
          }), s.dbs.setUserProfile({
            gender: t
          })]).then(function () {
            return e.send("setGender", {
              gender: t
            });
          })["catch"](function (r) {
            (0, s.tlog)("error", "setGender", t, r), Promise.all([s.dbs.setProfile(e.userid, {
              gender: 0
            }), s.dbs.setUserProfile({
              gender: 0
            })])["catch"](function (e) {
              (0, s.tlog)("error", "revert shouldSetGender gender", e);
            });
          });
        };
        e.diag({
          header: (0, s.tr)("Gender"),
          content: (0, s.tr)("Choose your gender"),
          buttons: [{
            text: (0, s.tr)("Male"),
            onPress: function (r) {
              return e.closeDiag(function () {
                return t(1);
              });
            }
          }, {
            text: (0, s.tr)("Female"),
            onPress: function (r) {
              return e.closeDiag(function () {
                return t(2);
              });
            }
          }]
        });
      }
    }, e.setGender = function (t, r) {
      return new Promise(function (n, i) {
        var o = e.profiles[e.userid].gender;
        Promise.all([s.dbs.setProfile(e.userid, {
          gender: r
        }), s.dbs.setUserProfile({
          gender: r
        })]).then(function () {
          return t.setListData(e.changeAllListData(t.listData, function (e) {
            return "Gender" === e.name;
          }, function (t) {
            return t.value = e.transGender(e.userid);
          })), e.send("setGender", {
            gender: r
          });
        }).then(n)["catch"](function (n) {
          (0, s.tlog)("error", "setGender", r, n), Promise.all([s.dbs.setProfile(e.userid, {
            gender: o
          }), s.dbs.setUserProfile({
            gender: o
          })]).then(function () {
            t.setListData(e.changeAllListData(t.listData, function (e) {
              return "Gender" === e.name;
            }, function (t) {
              return t.value = e.transGender(e.userid);
            }));
          })["catch"](function (e) {
            (0, s.tlog)("error", "revert setProfile gender", e);
          });
        });
      });
    }, e.setAccount = function (t, r) {
      var n = e.userid;
      "^1" === e.userid.slice(-2) && (n = e.userid.slice(0, -2));
      var i = {
        text: (0, s.tr)("Destroy Account"),
        onPress: function () {
          return e.forbidExp || e.isForbided ? void e.forbidTip() : void e.diag({
            header: (0, s.tr)("Destroy Account"),
            content: (0, s.tr)("The account will be frozen before destroyed"),
            buttons: [{
              text: (0, s.tr)("Cancel"),
              onPress: function () {
                return e.closeDiag();
              }
            }, {
              text: (0, s.tr)("Unsign Request"),
              onPress: function () {
                return e.unsignAccount();
              }
            }]
          });
        }
      };
      return "" === e.account || e.account === n || e.showCmdBall ? void e.diag({
        header: (0, s.tr)("Setting Account ID"),
        content: e.account === n ? (0, s.tr)("The initial account is random, use 8-16 letters to reset it") : (0, s.tr)("Enter your account ID and password to sign up"),
        textInputs: [{
          placeholder: (0, s.tr)("Haven't set yet"),
          value: r || "",
          maxLength: 16,
          onlyLetters: !0,
          onlyLowercase: !0
        }],
        link: babelHelpers["extends"](i, {
          style: {
            paddingTop: 5,
            paddingBottom: 8
          }
        }),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function () {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (r) {
            var n = r.state.textInputs[0].value;
            if (e.account === n) return void e.closeDiag();
            if (!e.showCmdBall) {
              if (!n) return void r.setState({
                infoTip: (0, s.tr)("Input cannot be empty")
              });
              var i = e.checkSignupField(n);
              if (i.hasOther) return void r.setState({
                infoTip: (0, s.tr)("Account can only contain letter and number")
              });
              if (i.n < 8) return void r.setState({
                infoTip: (0, s.tr)("Account has to be more than 8 letters")
              });
              if (!i.hasNumber) return void r.setState({
                infoTip: (0, s.tr)("Account has to contain number")
              });
              if (!i.hasLetter) return void r.setState({
                infoTip: (0, s.tr)("Account has to contain letter")
              });
            }
            e.closeDiag(function () {
              return e.diag({
                header: (0, s.tr)("Tip"),
                content: (0, s.tr)("Account could only be modified once. Are you sure to set it as\n##", n),
                buttons: [{
                  text: (0, s.tr)("Reset"),
                  onPress: function () {
                    return e.closeDiag(function () {
                      return e.setAccount(t, n);
                    });
                  }
                }, {
                  text: (0, s.tr)("Ok"),
                  onPress: function (r) {
                    if (!r.isProgressing) {
                      r.progressing(!0);
                      var i = !1;
                      e.send("setAccount", {
                        value: n
                      }).then(function (o) {
                        if (r.progressing(!1), o.repeat) r.setState({
                          infoTip: (0, s.tr)("Already set by others")
                        });else {
                          if (!o.noPhone) return i = !0, n || (n = o.account), t.setListData(e.changeAllListData(t.listData, function (e) {
                            return "Account" === e.name;
                          }, function (e) {
                            return e.value = n;
                          })), s.dbs.setUserProfile({
                            account: n
                          })["catch"]((0, s.errCb)("setAccount 1"));
                          r.setState({
                            infoTip: (0, s.tr)("Cannot set a phone number as account id")
                          });
                        }
                      }).then(function () {
                        i && (e.closeDiag(), e.loadProfile(e.userid, "aboutMe"));
                      })["catch"](function (e) {
                        (0, s.tlog)("error", "setAccount", e);
                      });
                    }
                  }
                }]
              });
            });
          }
        }]
      }) : void e.diag({
        header: (0, s.tr)("Tip"),
        content: (0, s.tr)("Acount could only be set once"),
        contentStyle: {
          paddingBottom: 0,
          marginBottom: -1
        },
        link: i,
        buttons: [{
          text: (0, s.tr)("Close"),
          onPress: function () {
            return e.closeDiag();
          }
        }]
      });
    }, e.setGroupAccount = function (t, r, n) {
      e.diag({
        header: (0, s.tr)("Setting Group ID"),
        content: (0, s.tr)(""),
        textInputs: [{
          placeholder: (0, s.tr)("Haven't set yet"),
          value: n.account || "",
          maxLength: 250
        }],
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (i) {
            var o = i.state.textInputs[0].value;
            if (!o) return void i.setState({
              infoTip: (0, s.tr)("Input cannot be empty")
            });
            if (/[^A-Za-z0-9]/.test(o)) return void i.setState({
              infoTip: (0, s.tr)("Only allow alphabets and numbers")
            });
            if (o.length < 8) return void i.setState({
              infoTip: (0, s.tr)("At least 8 letters")
            });
            if (!i.isProgressing) {
              i.progressing(!0);
              var a = !1;
              e.send("setGroupAccount", {
                groupId: r,
                value: o
              }).then(function (r) {
                r.repeat && (i.progressing(!1), i.setState({
                  infoTip: (0, s.tr)("Already set by others")
                })), r.noPhone ? (i.progressing(!1), i.setState({
                  infoTip: (0, s.tr)("Cannot set a phone number as account id")
                })) : (a = !0, n.account = o, t.setListData(e.changeAllListData(t.listData, function (e) {
                  return "groupAccount" === e.name;
                }, function (e) {
                  return e.value = o;
                })));
              }).then(function () {
                a && e.closeDiag();
              })["catch"]((0, s.errCb)("setAccount 2"));
            }
          }
        }]
      });
    }, e.getLastTime = function (t, r) {
      var n = t[t.length - 1];
      return n ? n.time - 1 : r || e.now();
    }, e.getShareContent = function (t) {
      return new Promise(function (r, n) {
        var i = t.friendId,
          o = t.shareId;
        e.has("getShareContent_" + o) ? e.on("getShareContent_" + o, function (e) {
          r(e);
        }) : (e.on("getShareContent_" + o, function (e) {
          r(e);
        }), s.db.executeSql("SELECT * FROM Shares WHERE ShareId=?", [o]).then(function (t) {
          var r = t[0].rows;
          if (!r.length) return e.send("getShareContent", {
            shareId: o,
            friendId: i
          }).then(function (t) {
            e.emitOnce("getShareContent_" + o, t.share);
          });
          var n = r.item(0);
          n.msgs = JSON.parse(n.msgs), e.emitOnce("getShareContent_" + o, n);
        })["catch"](function (e) {
          (0, s.tlog)("error", "getShareContent", o, e), n(e);
        }));
      });
    }, e.loadSharesData = function (t, r, n) {
      if (e.sharesData[r] && e.sharesData[r].length > e.listBlockLimit) return -1;
      if (e.isLocking("loadSharesDataLocking_" + r)) return void e.addLockCb("loadSharesDataLocking_" + r, function () {
        return e.loadSharesData(t, r, n);
      });
      if (e.isLocking("navIsTrans")) return void e.addLockCb("navIsTrans", function () {
        return e.loadSharesData(t, r, n);
      });
      if (e.isLocking("isHandlingUnread")) return void e.addLockCb("isHandlingUnread", function () {
        return e.loadSharesData(t, r, n);
      });
      var i = e.isIn(r.slice(0, 2), e.CONS_PREFIX_CIRCLE);
      if (e.sharesLoadPos[r] || (e.sharesLoadPos[r] = {
        isEnd: 0
      }), !e.sharesLoadPos[r].isEnd) {
        var o = function (t) {
            var n = e.sharesData[r];
            return n || (n = []), t || (t = []), n.concat(t);
          },
          a = e.sharesData[r] || [],
          d = e.getHighRandomTime();
        a.length > 0 && (d = a[a.length - 1].time);
        var u = function (n) {
          e.sharesData[r] = n, e.firstDaily && n.length > 0 && t === r && s.dbs.setUserProfile({
            firstDaily: 0
          })["catch"]((0, s.errCb)("setFirstDaily")), e.emit("sharesDataChanged_" + r);
        };
        return e.lock("loadSharesDataLocking_" + r), e.lock("dbDataIsLoading"), (i ? s.dbs.loadSharesDataFromDb(t, r, d, e.fetchLimit) : Promise.resolve([])).then(function (n) {
          e.unlock("dbDataIsLoading");
          var c,
            l = [];
          if (n.length > 0) for (var f = n.length - 1; f >= 0; f--) {
            var g = n[f];
            g.category === e.CONS_MSG_CAT_LAST_ITEM ? c = g : (g = e.tmpSendingShareMap[g.shareId] || g, l.unshift(g), g.msgs.forEach(function (e) {}));
          }
          if (a = o(l), n.length > 0 && (c && (e.sharesLoadPos[r].isEnd = !0), u(a), (c || n.length === e.fetchLimit) && e.unlock("loadSharesDataLocking_" + r)), !c && n.length < e.fetchLimit) {
            a = e.sharesData[r] || [];
            var h = {
              userid: t,
              friendId: r,
              sendTimeoutIntv: 2e4
            };
            c = a[a.length - 1], c && c.time ? h.time = c.time : (h.time = e.getHighRandomTime(), h.firstFetch = 1);
            var p = r.slice(0, 2);
            return p === e.CONS_PREFIX_FORBID ? c ? h.type = c.type || -1 : h.type = 2 : p === e.CONS_PREFIX_MATCH ? h.g = e.fetchGender : p === e.CONS_PREFIX_AUDIT ? (h.g = e.fetchGender, r.slice(2) !== e.userid && ("A" === r[e.userid.length + 2] ? h.eq = r.slice(e.userid.length + 2) : h.rg = r.slice(e.userid.length + 2))) : p === e.CONS_PREFIX_REPORT ? h.g = e.fetchGender : e.prevShareloadTime[r] && e.prevShareloadTime[r] <= d && (0, s.tlog)("error", "prevShareloadTime", e.prevShareloadTime, d), (p !== e.CONS_PREFIX_CIRCLE || e.showCmdBall ? e.send("fetchMoreShares", h) : Promise.resolve({
              shares: []
            })).then(function (n) {
              e.prevShareloadTime[r] = d;
              var c = [];
              n.isbp ? (e.showCmdBall && h.firstFetch && p === e.CONS_PREFIX_AUDIT && (e.bottlePt && (e.lastBottlePt = e.bottlePt), s.dbs.setUserProfile({
                bottlePt: n.shares[0].time
              })["catch"](function (e) {
                return (0, s.tlog)("error", "set bottlePt", d, e);
              })), n.shares.forEach(function (t) {
                var r = t,
                  n = r.fromId,
                  i = r.time,
                  o = r.text,
                  a = r.forbid;
                r.avatar, r.name;
                i < e.lastBottlePt && (t.lastBottlePt = e.lastBottlePt, delete e.lastBottlePt);
                var d = n + ": " + i,
                  u = d + ":f";
                t = babelHelpers["extends"]({
                  shareId: d,
                  commentNum: 0,
                  newCommentNum: 0,
                  praiseNum: 0,
                  category: 1,
                  seqi: 0,
                  target: [],
                  atime: i
                }, t), t.cnts && (o += "cnts: " + t.cnts + "\n"), t.otime && (o += "otime: " + s.util.fmtDate(t.otime)), /shadow-created/.test(o) && (t.hasShadow = !0), t.msgs = [{
                  msgid: u,
                  shareId: d,
                  type: e.isIn(a, 1, 3) ? e.CONS_MSG_TYPE_WARN : -1 === a ? e.CONS_MSG_TYPE_TERM : 1,
                  category: 1,
                  time: i,
                  text: o,
                  fromId: n,
                  toId: n,
                  shareFrom: n,
                  ftype: 1,
                  seqi: 0,
                  chatSession: ""
                }], c.push(t);
              })) : n.shares.forEach(function (e) {
                e.sync = 1, c.push(e);
              });
              var l = !1,
                f = c;
              return a = o(c), n.shares.length < e.fetchLimit && (l = !0, f = c.concat([{
                shareId: e.getNewShareId(),
                fromId: t,
                toId: r,
                category: 0,
                time: e.getLastTime(a),
                sync: 0,
                praiseNum: 0,
                commentNum: 0,
                newCommentNum: 0,
                msgs: [""]
              }])), i && e.addSessionMsg(c), (i ? s.dbs.insertSyncShares(f, r) : Promise.resolve()).then(function () {
                if (e.sharesLoadPos[r]) {
                  e.sharesLoadPos[r].isEnd = l;
                  var n = o(c);
                  n.length > e.listBlockLimit && (n = n.concat([{
                    shareId: e.getNewShareId(),
                    fromId: t,
                    toId: r,
                    category: e.CONS_MSG_CAT_LOAD_SHARE_LIMIT,
                    time: e.getLastTime(n),
                    sync: 0,
                    praiseNum: 0,
                    commentNum: 0,
                    newCommentNum: 0,
                    msgs: [""]
                  }])), u(n);
                }
                e.unlock("loadSharesDataLocking_" + r);
              });
            });
          }
        })["catch"](function (t) {
          e.unlock("loadSharesDataLocking_" + r), e.unlock("dbDataIsLoading"), "__break" !== t && ((0, s.tlog)("error", "loadSharesData", t), e.emit("loadSharesDataFailed_" + r));
        });
      }
    }, e.removeFriendsShareUnread = function (t) {
      if (e.friendsUnread[t]) {
        var r = e.friendsUnread[t].filter(function (e) {
            return 1 !== e.category && 3 !== e.category && 8 !== e.category;
          }),
          n = e.friendsUnreadList.filter(function (e) {
            return 1 !== e.category && 3 !== e.category && 8 !== e.category || e.userid !== t;
          });
        r.length === e.friendsUnread[t].length && n.length === e.friendsUnreadList.length || (e.friendsUnread[t] = r, e.friendsUnreadList = n, e.emit("friendsUnreadChanged"), s.dbs.removeFriendsShareUnread(t));
      }
    }, e.removeFriendsMsgUnread = function (t, r) {
      if (e.friendsUnread[t]) {
        var n = ("2:" === t.slice(0, 2), e.friendsUnread[t].filter(function (e) {
            return 1 === e.category || e.shareId !== r;
          })),
          i = e.friendsUnreadList.filter(function (e) {
            return 1 === e.category || e.shareId !== r;
          });
        n.length === e.friendsUnread[t].length && i.length === e.friendsUnreadList.length || (e.friendsUnread[t] = n, e.friendsUnreadList = i, e.emit("friendsUnreadChanged"), s.dbs.removeFriendsMsgUnread(t, r));
      }
    }, e.ignoreFriendRequest = function (t) {
      return e.send("refuseFriendAdd", {
        friendId: t
      }).then(function (r) {
        return e.relationShips[t] && (e.relationShips[t].blocked = 1), e.loadProfile(t), s.db.transaction(function (r) {
          r.executeSql("DELETE FROM Friends WHERE userid=? AND friendId=?", [e.userid, t])["catch"](function (e) {
            return (0, s.tlog)("error", "ignoreFriendRequest delete Friends", e);
          });
        });
      });
    }, e.ignoreFriend = function (t) {
      e.diag({
        header: (0, s.tr)("Tip"),
        content: "2:" === t.slice(0, 2) ? (0, s.tr)("New shares of this group will not be prompted on the top after ignoring") : (0, s.tr)("New shares of this friend will not be prompted on the top after ignoring"),
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            e.closeDiag();
          }
        }]
      });
    }, e.cloudFilesSize = function () {
      var t = e.cloudRepoSize / 1024 / 1024;
      return t ? t.toFixed(2) + " MB" : "";
    }, e.cacheFilesSize = function () {
      return ((e.cachedAudiosSize + e.cachedImagesSize) / 1024 / 1024).toFixed(2) + " MB";
    }, e.changeNameDiag = function (t) {
      return e.forbidExp || e.isForbided && e.notIn(e.isForbided, e.CONS_FORBID_NAME, e.CONS_FORBID_AVATAR_NAME) ? void e.forbidTip() : void e.getProfileK(e.userid, "name").then(function (t) {
        e.diag({
          header: (0, s.tr)("Name"),
          content: (0, s.tr)("Change your name"),
          textInputs: [{
            placeholder: (0, s.tr)("Name"),
            value: t,
            maxLength: 20
          }],
          buttons: [{
            text: (0, s.tr)("Cancel"),
            onPress: function (t) {
              e.closeDiag();
            }
          }, {
            text: (0, s.tr)("Ok"),
            onPress: function (r) {
              if (!r.isProgressing) {
                var n = r.state.textInputs[0].value.trim();
                n ? t === n ? e.closeDiag() : e.closeDiag(function () {
                  return e.changeUserName(n);
                }) : r.setState({
                  infoTip: (0, s.tr)("Input cannot be empty")
                });
              }
            }
          }]
        });
      })["catch"](function (e) {
        return (0, s.tlog)("error", "changeNameDiag", t, e);
      });
    }, e.changePassword = function () {
      var t = [{
        placeholder: (0, s.tr)("New Password"),
        value: "",
        secureTextEntry: !0,
        maxLength: 50
      }, {
        placeholder: (0, s.tr)("New Password Again"),
        value: "",
        secureTextEntry: !0,
        maxLength: 50
      }];
      e.diag({
        header: (0, s.tr)("Change Password"),
        content: (0, s.tr)("Enter your new password"),
        showPasswdButton: !0,
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag();
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (t) {
            var r = t.state.textInputs[0].value,
              n = t.state.textInputs[1].value;
            return r && n ? r !== n ? void t.setState({
              infoTip: (0, s.tr)("Two password not same")
            }) : e.account === r ? void t.setState({
              infoTip: (0, s.tr)("Password cannot be the same with account")
            }) : !e.showCmdBall && r.length < 8 ? void t.setState({
              infoTip: (0, s.tr)("Password cannot be less than 8 letters")
            }) : /[A-Z]/.test(r) && /[a-z]/.test(r) && /[0-9]/.test(r) ? void e.getPasswdSalt().then(function (t) {
              return r = (0, s.md5)(r + t), e.send("changePassword", {
                oldPassword: e.passwd,
                newPassword: r
              }).then(function (e) {
                if (e.mpasswd) return s.dbs.setUserProfile({
                  passwd: r,
                  mpasswd: e.mpasswd
                });
                throw new Error("no mpasswd");
              }).then(function (t) {
                return e.closeDiag(function () {
                  return e.loadProfile(e.userid, "aboutMe");
                });
              });
            })["catch"](function (e) {
              t.setState({
                infoTip: (0, s.tr)("Change Failed")
              }), (0, s.tlog)("error", "changePassword getPasswdSalt", e);
            }) : void t.setState({
              infoTip: (0, s.tr)("Password should contain upper and lower and alphabets")
            }) : void t.setState({
              infoTip: (0, s.tr)("Password cannot be empty")
            });
          }
        }],
        textInputs: t
      });
    }, e.joinGroup = function (t, r) {
      e.addGroupMembers(t, [{
        friendId: e.userid
      }]).then(function (n) {
        e.relationShips[t] ? e.relationShips[t].isInGroup = 1 : e.relationShips[t] = {
          isInGroup: 1
        }, e.loadProfile(t), e.emit("relationShipChanged_" + t), r && r();
      });
    }, e.changePhoneNumber = function () {
      var t = e.getShortPhoneNum(),
        r = function () {
          e.diag({
            header: (0, s.tr)("Verification"),
            content: (0, s.tr)("Please enter the code"),
            textInputs: [{
              placeholder: (0, s.tr)("Enter the code"),
              value: "",
              maxLength: 30
            }],
            buttons: [{
              text: (0, s.tr)("Cancel"),
              onPress: function (t) {
                return e.closeDiag(function () {
                  delete e.phoneNumToChange;
                });
              }
            }, {
              text: (0, s.tr)("Ok"),
              onPress: function (t) {
                if (!t.isProgressing) {
                  var r = t.state.textInputs[0].value;
                  t.progressing(!0), e.send("changePhoneNumberSms", {
                    smsCode: r,
                    phone: e.phoneNumToChange
                  }).then(function (r) {
                    t.progressing(!1), r.wrong ? t.setState({
                      infoTip: (0, s.tr)("Verification Code not right")
                    }) : r.expire ? t.setState({
                      infoTip: (0, s.tr)("Verification Code expired")
                    }) : s.dbs.setUserProfile({
                      phoneNum: e.phoneNumToChange
                    }).then(function (t) {
                      delete e.phoneNumToChange, e.closeDiag(), e.loadProfile(e.userid);
                    })["catch"](function (e) {
                      (0, s.tlog)("error", "verifySms", e);
                    });
                  })["catch"](function (e) {
                    (0, s.tlog)("error", "changePhoneNumberSms", e);
                  });
                }
              }
            }]
          });
        };
      e.phoneNumToChange ? r() : e.diag({
        header: (0, s.tr)("Phone Number"),
        content: (0, s.tr)("Change login phone number"),
        textInputs: [{
          placeholder: (0, s.tr)("Phone Number"),
          value: t,
          maxLength: 30
        }],
        buttons: [{
          text: (0, s.tr)("Cancel"),
          onPress: function (t) {
            return e.closeDiag(function () {
              delete e.phoneNumToChange;
            });
          }
        }, {
          text: (0, s.tr)("Ok"),
          onPress: function (n) {
            if (!n.isProgressing) {
              var i = n.state.textInputs[0].value;
              if (i === t) return void e.closeDiag();
              if ("+" !== i[0]) var o = s.smsPhoneCode[e.country] + i;else o = i;
              e.phoneNumToChange = o, n.progressing(!0), e.send("changePhoneNumber", {
                phone: o
              }).then(function (t) {
                n.progressing(!1), t.repeat ? n.setState({
                  infoTip: (0, s.tr)("Phone number has been used")
                }) : t.notphone ? n.setState({
                  infoTip: (0, s.tr)("Phone number format error")
                }) : e.closeDiag(function () {
                  return r();
                });
              })["catch"](function (e) {
                (0, s.tlog)("error", "changePhoneNumber", e);
              });
            }
          }
        }]
      });
    }, e.removeMySpaceShareUnread = function (t) {
      delete e.spaceUnread[t], e.spaceUnreadList = e.spaceUnreadList.filter(function (e) {
        return e.shareId !== t;
      }), e.emit("spaceUnreadChanged"), s.dbs.removeMySpaceShareUnread(t);
    }, e.changeGroupName = function (t, r) {
      return e.send("changeGroupName", {
        groupId: t,
        name: r
      }).then(function () {
        return s.dbs.setProfile(t, {
          name: r
        });
      }).then(function () {
        e.emit("userNameChanged_" + t, r);
      });
    }, e.changeUserName = function (t) {
      e.send("changeUserName", {
        name: t
      }).then(function (r) {
        r.over ? e.diag({
          header: (0, s.tr)("Set Tomorrow"),
          content: (0, s.tr)("Name could be changed only once a day"),
          buttons: [{
            text: (0, s.tr)("Ok"),
            onPress: function () {
              return e.closeDiag();
            }
          }]
        }) : e.on("myNameChanged", function (r) {
          if (r.abuse) e.diag({
            header: (0, s.tr)("Change Failed"),
            content: (0, s.tr)("Username abuse!"),
            buttons: [{
              text: (0, s.tr)("Ok"),
              onPress: function () {
                return e.closeDiag();
              }
            }]
          });else if (r.illegal) {
            var n = Object.keys(r.illegal).join("\uff0c");
            e.diag({
              header: (0, s.tr)("Change Failed"),
              content: (0, s.tr)("Username illegal!") + "\uff08" + n + "\uff09",
              buttons: [{
                text: (0, s.tr)("Ok"),
                onPress: function () {
                  return e.closeDiag();
                }
              }]
            });
          } else s.dbs.setProfile(e.userid, {
            name: t
          }).then(function () {
            e.emit("userNameChanged_" + e.userid, t);
          })["catch"](function (r) {
            (0, s.tlog)("error", "changeUserName setProfile", t, r), e.diag({
              header: (0, s.tr)("Change Failed"),
              content: (0, s.tr)("Network Failed"),
              buttons: [{
                text: (0, s.tr)("Ok"),
                onPress: function () {
                  return e.closeDiag();
                }
              }]
            });
          });
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "changeUserName", t, e);
      });
    }, e.changeGroupAvatar = function (t, r) {
      var n,
        i,
        a = t.uri;
      (0, s.tlog)("changeGroupAvatar uri", a), "ios" === o.Platform.OS && (t.uri = "file://" + t.uri), t.ext = "jpg", t.time = e.now(), e.uploadFile(e.CONS_MSG_TYPE_IMAGE, t).then(function (t) {
        return a = a.replace(/^file:\/\//, ""), s.fs.unlink(a)["catch"]((0, s.errCb)("changeGroupAvatar")), i = t.id.split(".")[0], e.send("uploadGroupAvatar", {
          imgId: i,
          groupId: r
        });
      }).then(function (t) {
        return n = i, s.dbs.setProfile(r, {
          avatar: n
        }).then(function () {
          e.emit("userAvatarChanged_" + r);
        });
      })["catch"](function (t) {
        (0, s.tlog)("error", "changeGroupAvatar", t), e.emit("showTipView", (0, s.tr)("Change Failed")), e.emit("userAvatarChanged_" + r, !0);
      });
    }, e.uploadAvatarT = function (t) {
      return new Promise(function (r, n) {
        var i = t.uri;
        "ios" === o.Platform.OS && (t.uri = "file://" + t.uri), t.ext = "jpg", t.time = e.now(), t.per = 1, e.uploadFile(e.CONS_MSG_TYPE_IMAGE, t).then(function (e) {
          if (i = i.replace(/^file:\/\//, ""), s.fs.unlink(i)["catch"](function (e) {
            return (0, s.tlog)("error", "uploadAvatarT unlink uri", e);
          }), t.uriT) {
            var n = t.uriT.replace(/^file:\/\//, "");
            s.fs.unlink(n)["catch"](function (e) {
              return (0, s.tlog)("error", "uploadAvatarT unlink uriT", e);
            });
          }
          r(e.id.split(".")[0]);
        })["catch"](function (e) {
          (0, s.tlog)("error", "uploadAvatarT", e), n(e);
        });
      });
    }, e.changeUserAvatar = function (t, r) {
      var n,
        i = e.userid,
        a = t.uri;
      (0, s.tlog)("changeUserAvatar uri", a), "ios" === o.Platform.OS && (t.uri = "file://" + t.uri), t.ext = "jpg", t.time = e.now(), t.per = 1, e.popSpin((0, s.tr)("Modify..."), function () {
        return e.popClose();
      }), e.uploadFile(e.CONS_MSG_TYPE_IMAGE, t).then(function (r) {
        if (a = a.replace(/^file:\/\//, ""), s.fs.unlink(a)["catch"](function (e) {
          return (0, s.tlog)("error", "changeUserAvatar unlink uri", e);
        }), t.uriT) {
          var i = t.uriT.replace(/^file:\/\//, "");
          s.fs.unlink(i)["catch"](function (e) {
            return (0, s.tlog)("error", "changeUserAvatar unlink uriT", e);
          });
        }
        return n = r.id.split(".")[0], e.send("uploadAvatar", {
          imgId: n,
          force: e.showCmdBall
        });
      }).then(function (t) {
        return s.dbs.setUserProfile({
          avatarChangeDate: e.getToday()
        })["catch"](function (e) {
          return (0, s.tlog)("error", "avatarChangeDate", e);
        }), r && r(t), s.dbs.setProfile(i, {
          avatar: n
        }).then(function () {
          e.emit("userAvatarChanged_" + i), e.popClose();
        });
      })["catch"](function (t) {
        t.notoday ? e.popTip((0, s.tr)("Avatar could be changed only once a day"), function () {
          r && r({
            notoday: 1
          });
        }) : ((0, s.tlog)("error", "changeUserAvatar", t), e.popTip((0, s.tr)("Change Failed"), function () {
          r && r({
            err: 1
          });
        })), e.emit("userAvatarChanged_" + i, !0);
      });
    }, e.removeInviterConfirm = function (t, r) {
      s.dbs.setProfile(t, {
        invite: 2
      }).then(function () {
        return e.emit("promptInvite_" + r), e.send("changeFriendsInvite", {
          friendId: t,
          invite: 2
        });
      })["catch"]((0, s.errCb)("removeInviterConfirm " + t));
    }, e.invitorRequest = function (t, r) {
      return new Promise(function (n, i) {
        var o = e.getNewMsgId(),
          a = (0, s.tr)("Are you invited by this user?");
        e.send("invitorRequest", {
          fromId: e.userid,
          toId: t,
          msgid: o,
          text: a,
          shareId: r
        }).then(function (e) {
          return n();
        })["catch"]((0, s.errCb)("invitorRequest " + t, i));
      });
    }, e.reportPerson = function (t, r, n) {
      return new Promise(function (i, o) {
        var a = e.userid,
          d = e.getNewMsgId();
        n || (n = e.getChatSession(t, a));
        var u = {
          shareId: n,
          fromId: a,
          toId: t,
          commentNum: 0,
          newCommentNum: 1,
          praiseNum: 0,
          category: 1,
          seqi: 0,
          msgs: [{
            msgid: d,
            shareId: n,
            stat: 2,
            type: 1,
            category: 1,
            time: e.now(),
            text: r.text,
            fromId: a,
            toId: t,
            shareFrom: a,
            ftype: 1,
            seqi: 0
          }]
        };
        e.dropFriend2(t).then(function () {
          return e.getProfile(t);
        }).then(function (t) {
          var n = t.forbid || e.CONS_FORBID_NORMAL;
          return e.isIn(n, e.CONS_FORBID_NORMAL, e.CONS_FORBID_UNS) ? (u.g = t.gender, e.send("reportShare", {
            type: r.type,
            report: u
          })) : Promise.resolve();
        }).then(function (e) {
          i(e);
        })["catch"](function (e) {
          (0, s.tlog)("error", "reportPerson", t, r, n, e), o(e);
        });
      });
    }, e.dropTmpFriend = function (t, r) {
      -910 === r && s.db.executeSql("DELETE FROM Friends WHERE userid=? AND friendId=?", ["3:" + e.userid, t]).then(function () {
        return e.isLocking("navIsTrans") ? e.addLockCb("navIsTrans", function () {
          return e.loadFriendsData("3:" + e.userid);
        }) : e.loadFriendsData("3:" + e.userid), e.send("dropTmpFriend", {
          friendId: t
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "dropTmpFriend", t, r, e);
      }), e.navBackAfterReport();
    }, e.sendCurrentMsg = function (t, r) {
      return new Promise(function (n, i) {
        try {
          e.emit("inputSend", t, r, function () {
            n();
          });
        } catch (o) {
          i(o);
        }
      });
    }, e.dropFriend = function (t) {
      return new Promise(function (r, n) {
        e.getRelationShip(t).then(function (r) {
          var n = {
            friendId: t
          };
          return r.isFriend && (n.isFriend = 1), r.isStared && (n.isStared = 1), r.isFollowed && (n.isFollowed = 1), e.send("dropFriend", n);
        }).then(function (r) {
          e.curDropFriendId = t, e.relationShips[t] && (delete e.relationShips[t].isStared, delete e.relationShips[t].isFriend, delete e.relationShips[t].isFollowed, e.relationShips[t].blocked = 1);
          var n = e.sharesData["8:" + e.userid];
          if (n && (e.sharesData["8:" + e.userid] = n.filter(function (e) {
            return e.fromId !== t;
          }), e.emit("rerenderSharesData_8:" + e.userid)), e.stares = e.stares.filter(function (e) {
            return e.friendId !== t;
          }), e.followers = e.followers.filter(function (e) {
            return e.friendId !== t;
          }), e.blockFriends = e.blockFriends.filter(function (e) {
            return e.friendId !== t;
          }), e.emit("selectViewLoaded_followers", !0), e.newFollowers[t] && (delete e.newFollowers[t], e.newFollowers.cnt -= 1, t === e.lastNewFollower && (s.dbs.delUserProfile("lastNewFollower")["catch"](function (e) {
            return (0, s.tlog)("error", "dropFriend lastNewFollower del", t, e);
          }), e.newFollowers.cnt > 0))) for (var i in e.newFollowers) "cnt" !== i && s.dbs.setUserProfile({
            lastNewFollower: i
          })["catch"](function (e) {
            return (0, s.tlog)("error", "dropFriend lastNewFollower del", t, e);
          });
          return e.removeFriendsAllUnread(t), e.removeFriendAllCircleUnread(t), s.db.transaction(function (r) {
            r.executeSql("DELETE FROM FriendShips WHERE friendId=?", [t])["catch"](function (e) {
              (0, s.tlog)("error", "dropFriend delete friendShips", t, e);
            }), r.executeSql("DELETE FROM Friends WHERE userid IN (?, ?) AND friendId=?", [e.userid, "3:" + e.userid, t])["catch"](function (e) {
              (0, s.tlog)("error", "dropFriend delete friends", t, e);
            }), r.executeSql("DELETE FROM MsgFriends WHERE friendId=?", [t])["catch"](function (e) {
              (0, s.tlog)("error", "dropFriend delete MsgFriends", t, e);
            }), r.executeSql("DELETE FROM Shares WHERE toId=? AND fromId=?", ["8:" + e.userid, t])["catch"](function (e) {
              (0, s.tlog)("error", "dropFriend delete share", t, e);
            });
          });
        }).then(function () {
          e.isLocking("navIsTrans") ? e.addLockCb("navIsTrans", function () {
            e.loadFriendsData(), e.loadFriendsData("3:" + e.userid);
          }) : (e.loadFriendsData(), e.loadFriendsData("3:" + e.userid)), e.friendShipLast.reload = 1, e.emit("selectViewLoaded_contactsBoard", !0), e.navBackAfterReport(), r();
        })["catch"](function (r) {
          (0, s.tlog)("error", "dropFriend", t, r), e.popTip((0, s.tr)("Request failed. Check your network and try again.")), n(r);
        });
      });
    }, e.changeFriendBlock = function (t, r) {
      return new Promise(function (n, i) {
        e.userid === t ? (e.closeDiag(function () {
          return e.tip("You could not block yourself");
        }), i("selfblock")) : e.getRelationShip(t).then(function (o) {
          var a = {
            friendId: t,
            block: r
          };
          return r && (o.isFriend && (a.isFriend = 1), o.isStared && (a.isStared = 1), o.isFollowed && (a.isFollowed = 1)), e.send("changeFriendBlock", a).then(function (n) {
            if (n.isBlack) return e.tip((0, s.tr)("You cannot unblock a user who has banned you")), Promise.reject("selfblock");
            var i = e.relationShips[t];
            if (r) {
              if (i && (delete i.isFriend, delete i.isStared, delete i.isFollowed, i.blocked = r), e.stares = e.stares.filter(function (e) {
                return e.friendId !== t;
              }), e.followers = e.followers.filter(function (e) {
                return e.friendId !== t;
              }), e.blockFriends.length) {
                var o = e.blockFriends.findIndex(function (e) {
                  return e.friendId === t;
                });
                -1 === o && (e.blockFriends = [{
                  friendId: t,
                  time: Date.now()
                }].concat(e.blockFriends));
              }
              return e.emit("selectViewLoaded_followers", !0), s.db.transaction(function (e) {
                e.executeSql("DELETE FROM FriendShips WHERE friendId=?", [t])["catch"](function (e) {
                  (0, s.tlog)("error", "changeFriendBlock delete friendShips", t, e);
                });
              }).then(function () {
                e.friendShipLast.reload = 1, e.emit("selectViewLoaded_contactsBoard", !0);
              });
            }
            i && delete i.blocked, e.blockFriends = e.blockFriends.filter(function (e) {
              return e.friendId !== t;
            });
            var a = (0, s.tr)("Block is canceled"),
              d = e.getChatSession(t, e.userid),
              u = e.now();
            return e.saveFriends([{
              friendId: t,
              isBottle: 0,
              desc: a,
              type: 1,
              time: u
            }]).then(function () {
              return s.dbs.insertNewMsg({
                msgid: e.getNewMsgId(),
                fromId: t,
                toId: e.userid,
                shareId: d,
                stat: 2,
                time: u,
                category: 3,
                text: a,
                type: e.CONS_MSG_TYPE_TIP,
                shareFrom: d,
                chatSession: d
              });
            }).then(function () {
              e.addFakeUnread(null, {
                userid: t,
                text: a,
                shareId: d,
                ftype: 3,
                category: 3,
                utab: 1
              }), e.emit("friendsUnreadChanged");
            });
          }).then(function () {}).then(function () {
            return e.loadProfile(t), n(), e.loadFriendsData();
          })["catch"](function (e) {
            i(e);
          });
        });
      });
    }, e.unStarePeople = function (t) {
      return new Promise(function (r, n) {
        e.send("unStarePeople", {
          friendId: t
        }).then(function (n) {
          if (!n.notStared) {
            e.relationShips[t] && (delete e.relationShips[t].isStared, delete e.relationShips[t].isFriend);
            var i = e.sharesData["8:" + e.userid];
            return i && (e.sharesData["8:" + e.userid] = i.filter(function (e) {
              return e.fromId !== t;
            }), e.emit("rerenderSharesData_8:" + e.userid)), e.stares = e.stares.filter(function (e) {
              return e.friendId !== t;
            }), e.emit("selectViewLoaded_followers", !0), s.db.transaction(function (r) {
              r.executeSql("DELETE FROM Shares WHERE toId=? AND fromId=?", ["8:" + e.userid, t])["catch"](function (e) {
                (0, s.tlog)("error", "unStarePeople delete share", t, e);
              }), r.executeSql("DELETE FROM FriendShips WHERE friendId=?", [t])["catch"](function (e) {
                (0, s.tlog)("error", "unStarePeople delete friendShips", t, e);
              });
            }).then(function () {
              e.friendShipLast.reload = 1, e.emit("selectViewLoaded_contactsBoard", !0), e.loadProfile(t), r();
            });
          }
          r();
        })["catch"](function (e) {
          (0, s.tlog)("error", "unStarePeople", t, e), n(e);
        });
      });
    }, e.starePeople = function (t) {
      return e.forbidExp || e.isForbided ? (e.forbidTip(), Promise.reject("isForbided")) : new Promise(function (r, n) {
        e.isStaring[t] || (e.isStaring[t] = 1, e.getProfileK(t, "forbid").then(function (r) {
          var n = r || e.CONS_FORBID_NORMAL;
          if (e.showCmdBall || !e.isUserForbided(n)) {
            var i = e.getChatSession(t, e.userid);
            return s.db.executeSql("SELECT * FROM Msgscnts WHERE shareId=?", [i]).then(function (r) {
              var n = r[0].rows.item(0),
                i = n && n.msgscnt || "0,0";
              return e.send("starePeople", {
                friendId: t,
                msgscnt: i
              });
            });
          }
          return e.tip((0, s.tr)("This user has been forbidden.")), delete e.isStaring[t], Promise.reject("__break");
        }).then(function (r) {
          var n = r.isMutual,
            i = r.name,
            o = r.fword,
            a = r.time;
          return delete e.isStaring[t], r.stareNumOver || r.blocked ? void (r.stareNumOver ? e.popTip((0, s.tr)("Stare no more than ##", r.stareNumOver)) : r.blocked && e.popTip((0, s.tr)("You have been blocked"))) : r.nobottle ? void e.tip((0, s.tr)("The account has been forbidden.")) : r.locked ? void (r.locked > 1 ? e.tip((0, s.tr)("Only can stare after ## messages(each)", r.locked + 1)) : e.tip((0, s.tr)("Cannot stare until a little more chat later"))) : (s.db.executeSql("UPDATE Friends SET isf=0 WHERE userid=? AND friendId=?", ["3:" + e.userid, t])["catch"](function (e) {
            (0, s.tlog)("errror", "clear isf", e);
          }), e.relationShips[t] && (e.relationShips[t].isStared = 1, n && (e.relationShips[t].isFriend = 1)), e.emit("renderDroper_" + t, t), e.emit("renderApprove_" + t, t), e.stares.unshift({
            friendId: t,
            time: a
          }), e.saveFriends([{
            friendId: t,
            name: i,
            fword: o,
            type: 1,
            noRelDel: 1,
            isBottle: n ? 0 : 1,
            desc: (0, s.tr)("Stared")
          }]).then(function () {}).then(function () {
            e.loadFriendsDataAsync();
          }));
        }).then(function () {
          e.loadProfile(t), r();
        })["catch"](function (r) {
          "__break" !== r && (delete e.isStaring[t], (0, s.tlog)("error", "starePeople", t, r), n(r));
        }));
      });
    }, e.shouldAddTmpFriendShip = function (t) {
      return new Promise(function (r, n) {
        s.db.executeSql("SELECT * FROM TmpFriendShips WHERE friendId=?", [t]).then(function (n) {
          var i = n[0].rows;
          return (0, s.tlog)(i.item(0)), i.length > 0 ? void r(!i.item(0).ship) : e.send("isTmpFriend", {
            friendId: t
          }).then(function (e) {
            return r(!e.is), s.db.executeSql("INSERT OR REPLACE INTO TmpFriendShips(friendId, ship) VALUES(?, ?)", [t, e.is]);
          });
        })["catch"](function (e) {
          (0, s.tlog)("error", "shouldAddTmpFriendShip", t, e);
        });
      });
    }, e.syncFriendProfile = function (t, r) {
      var n = t.match(/^(\d+):/);
      if (n && "2" !== n[1]) return Promise.resolve();
      var i = e.lastSyncFriendProfileTime[t] || e.profiles[t] && e.profiles[t].fetchTime;
      return !r && !e.showCmdBall && i && e.now() - i < 3e4 ? Promise.resolve() : (e.lastSyncFriendProfileTime[t] = e.now(), e.send("syncFriendProfile", {
        friendId: t
      }).then(function (r) {
        var n = {},
          i = r.name,
          o = r.avatar,
          a = r.gender,
          d = r.forbid,
          u = r.shaExp,
          c = r.country,
          l = r.invalid,
          f = r.openT,
          g = r.phoneNum,
          h = r.reportC,
          p = r.mcnt,
          m = r.deviceFrom,
          S = r.ipCnt;
        d || (d = 2), n.name = i || " ", n.avatar = o || "transp", n.gender = a || 0, d && (n.forbid = d), c && (n.country = c), u && (n.shaExp = u), f && (n.openT = f), h && (n.reportC = h), g && (n.phoneNum = g), p && (n.mcnt = p), m && (n.deviceFrom = m), void 0 !== S && (n.ipCnt = S), void 0 !== l ? n.invalid = l : e.profiles[t] && delete e.profiles[t].invalid, e.isUserForbided(d) && t !== e.userid && !e.showCmdBall ? d === e.CONS_FORBID_FAKE ? e.tip((0, s.tr)("This user is fraud and has been forbidden.")) : e.tip((0, s.tr)("This user has been forbidden.")) : d === e.CONS_FORBID_UNS;
        var v = e.profiles[t];
        return s.dbs.setProfile(t, n).then(function () {
          return v && (v.forbid === d && v.invalid === l || (e.showCmdBall && e.loadProfile(t), e.emit("userNameChanged_" + t, null, !0), e.emit("userAvatarChanged_" + t)), v.gender === a && v.name === i && v.shaExp === u && v.mcnt === p && v.reportC === h && v.deviceFrom === m && v.ipCnt === S || e.emit("userNameChanged_" + t, i), v.avatar !== o && e.emit("userAvatarChanged_" + t), v.country !== c && e.emit("userNameChanged_" + t, i)), t === e.userid && a && e.gender !== a ? s.dbs.setUserProfile({
            gender: a
          }) : void 0;
        });
      })["catch"](function (e) {
        (0, s.tlog)("error", "syncFriendProfile", t, e);
      }));
    }, e.customBackground = function () {
      s.ImagePicker.show(function (t) {
        "ios" === o.Platform.OS && (t.uri = "file://" + t.uri), t.ext = "jpg", t.time = e.now(), t.rawUri = t.assetUri + ";" + t.size;
        var r = {
          background: t.uri
        };
        e.backgroundTypeIsUri[e.userid] = !0, s.dbs.setProfile(e.userid, r).then(function () {
          return s.dbs.setUserProfile({
            backgroundImageBlur: 0
          });
        }).then(function () {
          return e.emit("backgroundChanged_" + e.userid), e.setSharedParas({
            hasCustomBg: 1
          });
        }).then(function () {
          e.lightForCusbg();
        })["catch"](function (e) {
          (0, s.tlog)("error", "customBackground", t.uri, e);
        });
        var n = !1;
        e.checkRawUriMapId(t.rawUri).then(function (r) {
          return r && r.imgId ? Promise.resolve({
            id: r.imgId
          }) : (n = !0, e.uploadFile(e.CONS_MSG_TYPE_IMAGE, t));
        }).then(function (t) {
          return r.background = t.id, e.send("updateBackgroundImage", r);
        }).then(function (i) {
          return e.loadProfile(e.userid, "aboutMe"), s.dbs.setProfile(e.userid, r).then(function () {
            e.setSharedParas(e.lightMode ? {
              customBg: r.background
            } : {
              customBgd: r.background
            });
          }).then(function () {
            if (n) {
              var i = t.uri.replace(/^file:\/\//, "");
              return e.imageIsMoving[r.background] = !0, (0, s.cacheImage)({
                imageId: r.background,
                localUri: i,
                size: t.size,
                isVideoThumb: !1
              }).then(function () {
                e.backgroundTypeIsUri[e.userid] = !1, e.emit("backgroundChanged_" + e.userid);
              })["catch"](function (e) {
                return (0, s.tlog)("error", "customBackground moveFile", i, e);
              });
            }
            e.backgroundTypeIsUri[e.userid] = !1, e.emit("backgroundChanged_" + e.userid);
          });
        })["catch"](function (r) {
          (0, s.tlog)("error", "customBackground", t, r), e.tip((0, s.tr)("Select Photo as Wallpaper Failed"), !0);
        });
      }, {
        thumbW: 100,
        thumbH: 100
      });
    }, e.recoverDefaultBackground = function () {
      var t = {
        background: "__clearBg__"
      };
      s.dbs.setProfile(e.userid, t).then(function () {
        var r = 0,
          n = "ios" === o.Platform.OS ? "i" : "a";
        return s.dbs.setUserProfile({
          backgroundImageBlur: r
        }).then(function () {
          return e.loadProfile(e.userid, "aboutMe"), e.send("updateBgBlur", {
            bgblur: n + r
          });
        })["catch"](function (e) {
          return (0, s.tlog)("error", "recoverDefaultBackground", e);
        }), e.emit("backgroundChanged_" + e.userid), e.send("updateBackgroundImage", t);
      })["catch"]((0, s.errCb)("recoverDefaultBackground"));
    }, e.loadBackground = function (t) {
      e.getProfileK(t, "background").then(function (r) {
        e.emit("backgroundChanged_" + t);
      })["catch"](function (e) {
        (0, s.tlog)("error", "loadBackground", t, e);
      });
    }, e.updateAbuseMsg = function (t) {
      try {
        var r = t.shareId,
          n = t.msgid,
          i = t.toId,
          o = e.getFid(i, e.userid, r);
        if (e.msgsData[o]) {
          for (var a = e.msgsData[o].slice(), d = 0; d < a.length && a[d].msgid !== n; d++);
          var u = a[d];
          if (u) {
            var c = babelHelpers["extends"]({}, u, {
              type: e.CONS_MSG_TYPE_ABUSE
            });
            a.splice(d, 1, c), e.msgsData[o] = a, e.emit("rerenderMsgsData_" + o);
          }
        }
        s.db.executeSql("UPDATE Msgs SET type=? WHERE msgid=?", [e.CONS_MSG_TYPE_ABUSE, n])["catch"](function (e) {
          (0, s.tlog)("error", "updateAbuseMsg db", e);
        });
      } catch (l) {
        (0, s.tlog)("error", "updateAbuseMsg", t, l);
      }
    }, e.addFakeUnread = function (t, r, n) {
      try {
        var i = r.shareId || "",
          o = r.userid,
          a = r.text,
          d = r.category || 1,
          u = r.fromId || o,
          c = r.toId || e.userid,
          l = r.ftype || 1,
          f = r.time || e.now(),
          g = r.utab || 1,
          h = r.atime || 0,
          p = r.shareFrom || o,
          m = {
            msgid: "",
            shareId: i,
            type: 1,
            time: f,
            category: d,
            atime: h,
            fromId: u,
            toId: c,
            shareFrom: p,
            text: a,
            userid: o,
            ftype: l,
            utab: g
          };
        e.friendsUnread[o] ? e.friendsUnread[o].push(m) : e.friendsUnread[o] = [m], 1 === g ? e.friendsUnreadList.push(m) : 2 === g && 3 === l && (e.bottleMsgUnreadMap[o] ? e.bottleMsgUnreadMap[o].push(m) : (e.bottleMsgUnreadMap[o] = [m], e.bottleMsgUnreadMap.cnt += 1), n && e.addLastBottleUserid(o)), t && t.unReadMsgs ? t.unReadMsgs.push(m) : e.insertUnread({
          unReadMsgs: [m]
        });
      } catch (S) {
        (0, s.tlog)("error", "addFakeUnread", r, S);
      }
    }, e.handleUnread = function (t, r) {
      try {
        var n = r.category,
          i = r.shareId,
          o = (r.msgid, r.time, r.fromId),
          a = (r.toId, r.group, r.shareFrom),
          d = r.userid,
          u = r.addIdx,
          c = r.utab,
          l = r.type;
        -2 === n && (0, s.tlog)("error", "handleUnread category", n);
        var f = e.currentRoutes[e.currentNavi],
          g = !1;
        return a = e.splitShareId(i).shareFrom, (r.noUnread || 6 === l && a !== e.userid) && (g = !0), (n > 1 || -1 === n) && /^interact_/.test(f.name) && f.shareId === i && (2 === n ? f.userid === o : !0) && (g = !0), 2 === n || "8:" !== d.slice(0, 2) && (t.friendsUpdates[d] ? t.friendsUpdates[d].push(r) : t.friendsUpdates[d] = [r]), g || u || (t.unReadMsgs.push(r), 1 === n ? e.circleShareUnreadList.push(r) : 2 === n || -1 === n ? (e.spaceUnread[i] ? e.spaceUnread[i][o] ? e.spaceUnread[i][o].push(r) : e.spaceUnread[i][o] = [r] : (e.spaceUnread[i] = {}, e.spaceUnread[i][o] = [r]), e.circleMsgUnreadList.push(r)) : (e.friendsUnread[d] ? e.friendsUnread[d].push(r) : e.friendsUnread[d] = [r], 1 === c || 4 === n ? e.friendsUnreadList.push(r) : (t.hasBottle = !0, e.bottleMsgUnreadMap[d] ? e.bottleMsgUnreadMap[d].push(r) : (e.bottleMsgUnreadMap[d] = [r], e.bottleMsgUnreadMap.cnt += 1), e.addLastBottleUserid(d)))), g;
      } catch (h) {
        (0, s.tlog)("error", "handleUnread", r, h);
      }
    }, e.pseudoDeleteSharesInDb = function (e) {
      return new Promise(function (t, r) {
        s.db.transaction(function (t) {
          for (var r in e) {
            var n = r.split(";"),
              i = babelHelpers.slicedToArray(n, 2),
              o = i[0];
            i[1];
            t.executeSql("\n          DELETE FROM Shares WHERE shareId=?\n        ", [o])["catch"](function (e) {
              (0, s.tlog)("error", "pseudoDeleteSharesInDb Shares", r, e);
            });
          }
        }).then(function () {
          return t();
        })["catch"]((0, s.errCb)("pseudoDeleteSharesInDb", r));
      });
    }, e.deleteShareInDb = function (e) {
      var t = e.shareId;
      s.db.transaction(function (e) {
        e.executeSql("\n      DELETE FROM Shares WHERE shareId=?\n    ", [t])["catch"]((0, s.errCb)("deleteSharesInDb 1"));
      })["catch"]((0, s.errCb)("deleteSharesInDb"));
    }, e.pseudoDeleteMsgsInDb = function (e) {
      return new Promise(function (t, r) {
        s.db.transaction(function (t) {
          for (var r in e) t.executeSql("\n          UPDATE Msgs SET isDeleted=1 WHERE msgid=?\n        ", [r])["catch"](function (e) {
            (0, s.tlog)("error", "tx pseudoDeleteMsgsInDb", r, e);
          });
        }).then(t)["catch"](function (e) {
          (0, s.tlog)("error", "pseudoDeleteMsgsInDb", e);
        });
      });
    }, e._deleteShare = function (t, r) {
      try {
        var n = r.shareId,
          i = (r.fromId, r.toId),
          o = r.target;
        t.sessionFilesDelete.push(r);
        var a = n + ";" + i;
        delete t.unReadShares[a], t.deleteDbShares[n + ";" + o] = 1;
        for (var d in t.newMsgs) d.shareId === n && delete t.newMsgs[d];
        var u = e.circleShareUnreadList.length,
          c = e.circleShareUnreadList.filter(function (e) {
            return e.shareId !== n;
          });
        u > c.length && (t.unReadShareDelete.push(n), e.circleShareUnreadList = c), s.db.executeSql("SELECT * FROM MsgFriends WHERE ShareId=?", [n]).then(function (t) {
          return t[0].rows.length ? s.db.executeSql("DELETE FROM MsgFriends WHERE shareId=?", [n]).then(function () {
            return e.send("delMsgHist", {
              shareId: n
            });
          }) : void 0;
        })["catch"](function (e) {
          (0, s.tlog)("error", "_deleteShare delete msgFriends", r, e);
        });
      } catch (l) {
        (0, s.tlog)("error", "deleteShare", r, l);
      }
    }, e.traverseUnread = function (t) {
      for (var r = function (r) {
          try {
            if (r.todo) {
              if ("ureadOk" === r.todo) e.handleUreadOkRes(t, r);else if ("deleteShareMsg" === r.todo) ;else if ("deleteShare" === r.todo) e._deleteShare(t, r);else if ("deleteMsg" === r.todo) e._deleteMsg(t, r);else if ("newContact" === r.todo) {
                var n = (0, s.tr)("Added from contacts"),
                  i = r,
                  o = i.friendId,
                  a = i.phoneNum,
                  y = i.chatId;
                t.friends.push({
                  friendId: o,
                  phoneNum: a,
                  chatId: y,
                  desc: n
                });
              } else if ("nameChanged" === r.todo) t.changedNames.push({
                friendId: r.friendId,
                name: r.name
              });else if ("avatarChanged" === r.todo) t.changedAvatars.push({
                friendId: r.friendId,
                avatar: r.avatar
              });else if ("addfTip" === r.todo) {
                var D = JSON.parse(r.awc);
                e.lastAddfTest && (D.raw = e.lastAddfTest), delete e.lastAddfTest, e.popTip((0, s.inspect)(D, {
                  depth: 10
                }));
              } else if ("msgBanned" === r.todo) e.handleMsgBanned(r);else if ("msgTerm" === r.todo) e.handleMsgTermed(r);else if ("throwBanned" === r.todo) e.throwBanned(r);else if ("bottleThrown" === r.todo) e.unon("firRegThrown"), e.emitOnce("bottleThrown");else if ("throwOver" === r.todo) s.dbs.setUserProfile({
                throwOver: r.over,
                nextBottleTime: r.nextPt || 3
              }), e.emit("throwStateChanged"), e.emitOnce("bottleThrown");else if ("myNameChanged" === r.todo) e.emitOnce("myNameChanged", r);else if ("workerTest" === r.todo) delete e.workerTest;else if ("pickerTest" === r.todo) delete e.pickerTest;else if ("snapDes" === r.todo) {
                var E = e.userid + ":" + r.msgp,
                  F = e.getChatSession(e.userid, r.fromId);
                e.snapDes(e.getFid(r.fromId, e.userid, F), E);
              } else if ("bottlePicked" === r.todo) e.pickStartTime = 0, clearTimeout(e.pickStartTimer), setTimeout(function () {
                if (r.fail) e.popTip((0, s.tr)("Nothing Picked, Bad Luck!"));else {
                  var t = e.bottleTmpMsg,
                    n = t.shareFrom,
                    i = t.friendId,
                    o = t.text,
                    a = t.msgid,
                    d = t.shareId,
                    u = t.time;
                  e.showCmdBall, e.saveFriends([{
                    friendId: i,
                    descType: e.CONS_FRIEND_UNREPLIED,
                    shareFrom: n,
                    msgid: a,
                    chatId: d,
                    isBottle: 1,
                    type: 3,
                    time: u
                  }])["catch"](function (e) {
                    return (0, s.tlog)("error", "enter session", e);
                  });
                  var c = function (t) {
                    var r = t.state.textInputs[0].value.trim();
                    return r ? e.ws ? void (t.isProgressing || (t.progressing(!0), e.closeDiag(function () {
                      e.popSpin("\u5df2\u56de\u590d\uff0c\u7ee7\u7eed\u4e0b\u4e00\u6761");
                    }), s.db.executeSql("UPDATE Friends SET descType=? WHERE userid=? AND friendId=?", [e.CONS_FRIEND_REPLIED, "3:" + e.userid, i])["catch"](function (e) {
                      (0, s.tlog)("error", "CONS_FRIEND_REPLIED", e);
                    }), e.isTempUserid() || e.sendBottleReply(i, r, n, o, function () {
                      setTimeout(function () {
                        e.continueNextBottle = !0, e.pickupBottle(!0);
                      }, 600 + Math.floor(50 * Math.random()));
                    })["catch"](function (e) {
                      (0, s.tlog)("error", "sendBottleReply", i, o, e);
                    }))) : void t.setState({
                      infoTip: (0, s.tr)("Network Failed")
                    }) : void t.setState({
                      infoTip: (0, s.tr)("\u56de\u590d\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a")
                    });
                  };
                  e.diag({
                    bcontent: o,
                    buserid: i,
                    rightTop: {
                      text: (0, s.tr)("\u7b5b\u9009"),
                      onPress: function () {
                        return e.pickupSettings();
                      }
                    },
                    onUserPressed: function () {
                      return e.closeDiag(function () {
                        e.isInBottleMsg = !0, e.newRouteTo("about_", {
                          friendId: i,
                          name: (0, s.tr)("Profile")
                        });
                      });
                    },
                    link: {
                      text: (0, s.tr)("\u770b\u8fc7\u7684\u4eba"),
                      color: s.theme.deepGreen2,
                      onPress: function (t) {
                        e.closeDiag(function () {
                          e.curNavigator.navi.navForward(e.curNavigator.routes.bottleFriends);
                        });
                      }
                    },
                    onPressBcontentRp: function () {
                      return e.closeDiag(function () {
                        return e.flagReport(i, o);
                      });
                    },
                    textInputs: [{
                      placeholder: (0, s.tr)("\u56de\u590d\u6587\u5b57"),
                      onSubmitEditing: function (e) {
                        return c(e);
                      },
                      value: "",
                      maxLength: 300
                    }],
                    buttons: [{
                      text: (0, s.tr)("\u53d6\u6d88"),
                      onPress: function () {
                        e.closeDiag();
                      }
                    }, {
                      text: (0, s.tr)("\u56de\u590d"),
                      onPress: function (e) {
                        return c(e);
                      }
                    }]
                  });
                }
              }, e.showCmdBall || e.continueNextBottle ? 0 : 1 === e.gender ? 3e3 : 1500);else if ("createGroup" === r.todo) {
                var N = r,
                  x = N.friendId,
                  k = N.chatId,
                  M = N.desc,
                  O = (N.create, N.fword);
                t.friends.push({
                  friendId: x,
                  desc: M,
                  chatId: k,
                  fword: O
                }), e.addFakeUnread(t, {
                  userid: x,
                  text: M,
                  shareId: k,
                  category: 4,
                  toId: x,
                  fromId: e.userid
                });
              } else if ("addGroupMembers" === r.todo) {
                var _ = r,
                  R = _.friendId,
                  A = _.desc,
                  U = _.addTime;
                t.friends.push({
                  friendId: R,
                  desc: A
                }), e.addFakeUnread(t, {
                  userid: R,
                  text: A,
                  ftype: 2,
                  time: U,
                  category: 4,
                  shareId: R,
                  toId: R,
                  fromId: e.userid
                });
              } else if ("blocking" === r.todo) !function () {
                var t = r.friendId,
                  n = e.relationShips[t];
                n && (delete n.isStared, delete n.isFollowed), e.followers = e.followers.filter(function (e) {
                  return e.friendId !== t;
                }), e.stares = e.stares.filter(function (e) {
                  return e.friendId !== t;
                });
              }();else if ("approvePeople" === r.todo) s.db.executeSql("INSERT OR REPLACE INTO Approved(userid, time) VALUES(?, ?)", [r.friendId, Date.now()]).then(function () {
                return r.a ? s.db.executeSql("SELECT * FROM Approves WHERE userid=?", [r.friendId]).then(function (t) {
                  return t[0].rows.item(0) ? e.send("approvePeople", {
                    friendId: r.friendId
                  }) : void 0;
                }) : void 0;
              })["catch"](function (e) {
                (0, s.tlog)("error", "insert Approved", e);
              });else if ("friendCut" === r.todo) e.friendCut(r.friendId);else if ("friendNoCut" === r.todo) e.friendNoCut(r.friendId);else if ("unStare" === r.todo) {
                if (e.newFollowers[r.follower] && (delete e.newFollowers[r.follower], e.newFollowers.cnt -= 1, t.newFollowers[r.follower] && delete t.newFollowers[r.follower], r.follower === e.lastNewFollower && (s.dbs.delUserProfile("lastNewFollower")["catch"](function (e) {
                  return (0, s.tlog)("error", "lastNewFollower", r.follower, e);
                }), e.newFollowers.cnt > 0))) for (var L in e.newFollowers) "cnt" !== L && s.dbs.setUserProfile({
                  lastNewFollower: L
                })["catch"](function (e) {
                  return (0, s.tlog)("error", "unStare lastNewFollower del", r.follower, e);
                });
                e.relationShips[r.follower] && delete e.relationShips[r.follower].isFollowed, t.unStares[r.follower] = 1, e.followers = e.followers.filter(function (e) {
                  return e.friendId !== r.follower;
                }), e.cachedFollowers = e.cachedFollowers.filter(function (e) {
                  return e.follower !== r.follower;
                });
              } else if ("newFollower" === r.todo) {
                var G = r,
                  B = G.follower;
                G.addTime;
                e.relationShips[B] && (e.relationShips[B].isFollowed = 1);
              } else if ("shareReplyAbuse" === r.todo) e.updateAbuseMsg(r);else if ("removeGroupMembers" === r.todo) t.removedGroupMembers.push(r);else if ("newSuMsg" === r.todo) t.suid = r.suid;else if ("debugControlCommandReq" === r.todo) t.debugControlCommandReq.push(r);else if ("friendAddRequest" === r.todo) {
                var q = r.friendId,
                  H = (0, s.tr)("Friend Request");
                r.reason && (H += ": " + r.reason), t.friends.push({
                  friendId: q,
                  desc: H,
                  descCategory: 5
                }), e.addFakeUnread(t, {
                  userid: q,
                  text: H,
                  category: 5,
                  shareId: "friendAccept"
                });
              } else if ("addMutualFriend" === r.todo) {
                var V = r,
                  W = V.friendId,
                  j = V.name,
                  Y = V.fword,
                  z = V.chatId;
                e.relationShips[W] && (e.relationShips[W].isFriend = 1, e.relationShips[W].isFollowed = 1), t.friends.push({
                  friendId: W,
                  name: j,
                  fword: Y,
                  desc: (0, s.tr)("Mutual Stared"),
                  chatId: z,
                  nof: 1,
                  noRelDel: 1
                }), e.emit("renderApprove_" + W, W);
              } else if ("acceptFriendAdd" === r.todo) {
                var K = r,
                  J = K.friendId,
                  X = K.chatId,
                  Z = K.name,
                  $ = K.fword;
                t.friends.push({
                  friendId: J,
                  desc: (0, s.tr)("New Friend"),
                  chatId: X,
                  name: Z,
                  fword: $
                }), e.addFakeUnread(t, {
                  userid: J,
                  text: (0, s.tr)("New Friend"),
                  category: 3,
                  shareId: X
                });
              } else "deleteShareOb" === r.todo ? e.deleteShareOb(r.shareId) : "nameForbid" === r.todo ? s.dbs.setUserProfile({
                isForbided: r.a ? e.CONS_FORBID_AVATAR_NAME : e.CONS_FORBID_NAME
              })["catch"](function (e) {
                return (0, s.tlog)("error", "nameForbid isForbided", e);
              }) : "avatarForbid" === r.todo ? (r.preAvatar ? (e.tip((0, s.tr)("Your new avatar is not allowed")), s.dbs.setProfile(e.userid, {
                avatar: r.preAvatar
              }).then(function () {
                e.emit("userAvatarChanged_" + e.userid), e.isChangingAvatar && (delete e.isChangingAvatar, e.needChangeAvatarDiag((0, s.tr)("Your avatar is not allowd")));
              })["catch"](function (e) {
                return (0, s.tlog)("error", "set preAvatar", r.preAvatar, e);
              })) : r.clearAvatarT && s.dbs.delUserProfile("avatarChangeDate")["catch"](function (e) {
                return (0, s.tlog)("error", "del avatarChangeDate", e);
              }), r.forbid && (e.isForbided = r.forbid)) : "vip30daysOk" === r.todo && (e.shadowExpired && e.popTip((0, s.tr)("Purchase Ok")), s.dbs.delUserProfile("shadowExpired")["catch"](function (e) {
                return (0, s.tlog)("error", "vip30daysOk shadowExpired", e);
              }), s.dbs.setUserProfile({
                shaExp: r.shaExp
              })["catch"](function (e) {
                return (0, s.tlog)("error", "vip30daysOk shaExp", e);
              }));
            } else {
              if (e.isForbided && "1" !== r.fromId) return {
                v: void 0
              };
              if (r.z && (r = e.unzipSendReply(e.userid, r)), "3:" === r.toId.slice(0, 2)) {
                var Q = r.msgs[0];
                if (!e.isTempUserid()) {
                  Q.time = e.now(), Q.atime = 1, Q.msgscnt = e.CONS_FIRST_BOTTLE_MSGSCNT;
                  var ee = (Q.text, r.fromId, e.getChatSession(r.fromId, e.userid)),
                    te = Q.shareFrom;
                  Q.chatSession = ee, Q.toId = e.userid, Q.shareId = ee, t.sessionMsgs.push(Q), t.newMsgs[Q.msgid] = Q, d = Q.msgid + ":f", t.newMsgs[d] = {
                    msgid: d,
                    fromId: r.fromId,
                    toId: e.userid,
                    shareId: ee,
                    stat: 2,
                    time: Q.time - 2,
                    category: 0,
                    type: 1,
                    shareFrom: te,
                    chatSession: ee
                  }, t.hasBottle = !0;
                }
                e.bottleTmpMsg = babelHelpers["extends"]({
                  userid: e.userid,
                  friendId: Q.fromId
                }, Q);
              } else if (r.category === e.CONS_MSG_CAT_SHARE || r.category === e.CONS_MSG_CAT_SHARE_TIP) t.sessionMsgs.push(r), r.toId = "8:" + e.userid, r.msgs.forEach(function (n, i) {
                n.isnew = 1, n.userid = "8:" + e.userid;
                var o = n.fromId,
                  a = (n.toId, n.shareId),
                  d = n.shareFrom,
                  u = n.addIdx,
                  c = n.time,
                  l = n.audioId,
                  f = n.chatSession,
                  g = (n.action, r.shareId + ";" + r.toId);
                if (l && (0, s.loadingAudio)(l), 0 === u) {
                  var h = a + ":a";
                  t.newMsgs[h] = {
                    msgid: h,
                    fromId: e.userid,
                    toId: e.userid,
                    shareId: a,
                    stat: 2,
                    time: c - 2,
                    category: 0,
                    type: 1,
                    shareFrom: d,
                    chatSession: f
                  }, h = a + ":b", t.newMsgs[h] = {
                    msgid: h,
                    fromId: o,
                    toId: e.userid,
                    shareId: a,
                    stat: 2,
                    time: c - 1,
                    category: -2,
                    type: 1,
                    shareFrom: d,
                    chatSession: e.getChatSession(o, e.userid)
                  }, t.unReadShares[g] = r, e.handleUnread(t, n);
                }
                t.newMsgs[n.msgid] = n, t.sessionMsgs.push(n);
              });else {
                var re = r;
                u = re.ftype, c = re.firstReply, l = re.category, f = re.fromId, g = re.toId, h = re.shareId, p = re.msgid, m = re.time, S = re.chatSession, v = re.audioId, I = re.isFriend, r.stars && (e.stars = r.stars, s.dbs.setUserProfile({
                  stars: r.stars
                })["catch"](function (e) {
                  return (0, s.tlog)("error", "traverseUnread set stars", e);
                }), e.emit("userChanged"));
                var ne = e.splitShareId(h);
                if (b = ne.shareFrom, w = ne.stype, r.msgscnt === e.CONS_MSGSCNT_TERM) {
                  if (r.mtext) return "continue";
                  P = !0;
                } else P = !1;
                if (r.mtext && e.firstThrow && (e.firstThrowCnt += 1, e.firstThrowCnt > e.firstThrowMax)) return (0, s.tlog)("error", "firstThrow", e.firstThrowCnt), "continue";
                if (v && (0, s.loadingAudio)(v), t.sessionMsgs.push(r), t.newMsgs[r.msgid] = r, T = e.getFid(g, f, h), t.unReadReplyMsgs[T] ? t.unReadReplyMsgs[T].push(r) : t.unReadReplyMsgs[T] = [r], P) return "continue";
                if (r.isnew = 1, "string" == typeof r.msgscnt && !e.canStareMap[f]) {
                  var ie = r.msgscnt.split(",");
                  parseInt(ie[0], 10) >= e.canStareLimit && parseInt(ie[1], 10) >= e.canStareLimit && (e.canStareMap[f] = 1, s.db.executeSql("UPDATE Friends SET isf=1 WHERE userid IN (?, ?) AND friendId=?", ["3:" + e.userid, e.userid, f])["catch"](function (e) {
                    (0, s.tlog)("errror", "update isf", e);
                  }), e.emit("renderDroper_" + f, f), e.emit("renderApprove_" + f, f));
                }
                if (r.type === e.CONS_MSG_TYPE_TIP && /^!!!/.test(r.text) && e.emit("forbidMsgRecved_" + r.fromId), r.userid = e.isSpecialUserid(g) ? g : f, e.isIn(r.category, -1, 2) && (r.userid = "8:" + e.userid, t.shouldUpdateCircleIds.push(f)), !e.handleUnread(t, r) && 1 === r.utab, r.mtext) {
                  var oe = {
                    msgid: p + ":mtext",
                    fromId: g,
                    toId: f,
                    shareId: h,
                    chatSession: S,
                    type: e.CONS_MSG_TYPE_TEXT,
                    category: 3,
                    time: m - 999,
                    ftype: u,
                    shareFrom: h,
                    msgscnt: e.CONS_FIRST_BOTTLE_MSGSCNT2,
                    text: r.mtext
                  };
                  t.newMsgs[p + ":mtext"] = oe, t.unReadReplyMsgs[T].push(oe);
                }
              }
            }
          } catch (se) {
            (0, s.tlog)("error", "traverseUnread forEach", r, se);
          }
          C = r;
        }, n = t.unRead, i = Array.isArray(n), o = 0, n = i ? n : n["function" == typeof Symbol ? Symbol.iterator : "@@iterator"]();;) {
        var a;
        if (i) {
          if (o >= n.length) break;
          a = n[o++];
        } else {
          if (o = n.next(), o.done) break;
          a = o.value;
        }
        var d,
          u,
          c,
          l,
          f,
          g,
          h,
          p,
          m,
          S,
          v,
          I,
          b,
          w,
          P,
          T,
          C = a,
          y = r(C);
        switch (y) {
          case "continue":
            continue;
          default:
            if ("object" == typeof y) return y.v;
        }
      }
    }, e.insertNewShares = function (t) {
      var r = t.unReadShares;
      return new Promise(function (t, n) {
        s.db.transaction(function (t) {
          for (var i in r) {
            var o = r[i],
              a = o.shareId,
              d = o.fromId,
              u = o.toId,
              c = o.time,
              l = o.praiseNum,
              f = o.newCommentNum,
              g = o.commentNum,
              h = o.category,
              p = o.seqi,
              m = o.msgs,
              S = o.target,
              v = o.atime,
              I = JSON.stringify(m);
            "string" != typeof S && (S = "2:" === u.slice(0, 2) ? u : e.userid), e.addSessionMsgTx(t, [r[i]]), t.executeSql("\n          INSERT INTO Shares (shareId, fromId, toId, time, praiseNum, newCommentNum, commentNum, category, seqi, msgs, target, atime)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n        ", [a, d, u, c, l, f, g, h, p, I, S, v])["catch"](function (e) {
              (0, s.tlog)("error", "insertNewShares failed", e), s.db.executeSql("SELECT * from Shares WHERE toId=? AND time=?", [u, c]).then(function (e) {
                if (e[0].rows.length) {
                  var t = e[0].rows.item(0),
                    r = JSON.parse(t.msgs),
                    i = !1;
                  m.forEach(function (e) {
                    -1 === r.findIndex(function (t) {
                      return t.msgid === e.msgid;
                    }) && (r.push(e), i = !0);
                  }), i && s.db.executeSql("\n                  UPDATE Shares SET msgs=? WHERE time=? AND toId=?;\n                ", [JSON.stringify(r), c, u]).then(function () {})["catch"]((0, s.errCb)("1.insertNewShareMsgs", n));
                }
              })["catch"]((0, s.errCb)("2.insertNewShares", n));
            });
          }
        }).then(function () {
          return t();
        })["catch"]((0, s.errCb)("insertNewShares", n));
      });
    }, e.refreshUnreadMsgs = function (t) {
      try {
        for (var r in t.unReadReplyMsgs) {
          var n = e.msgsData[r];
          if (n) {
            var i = [],
              o = t.unReadReplyMsgs[r].sort(function (e, t) {
                return t.time - e.time;
              });
            e.renderedMsgsMap[r] ? o.forEach(function (t) {
              e.renderedMsgsMap[r][t.msgid] ? (0, s.tlog)("error", "refreshUnreadMsgs already exists", t) : (e.renderedMsgsMap[r][t.msgid] = 1, i.push(t));
            }) : i = o, e.msgsData[r] = i.concat(n), e.lazyRefresh("rerenderMsgsData_" + r, i.length);
          }
        }
        for (var r in t.unReadDeleteMsgs) n = e.msgsData[r], n && (n = [].concat(n), t.unReadDeleteMsgs[r].forEach(function (e) {
          var t = n.findIndex(function (t) {
              return t.msgid === e.msgid;
            }),
            r = babelHelpers["extends"]({}, n[t]);
          r.isDeleted = 1, -1 !== t && n.splice(t, 1, r);
        }), e.msgsData[r] = n, e.lazyRefresh("rerenderMsgsData_" + r));
      } catch (a) {
        (0, s.tlog)("error", "refreshUnreadMsgs", a);
      }
    }, e.insertUnread = function (t) {
      return new Promise(function (r, n) {
        s.db.transaction(function (r) {
          for (var n = function (n) {
              u = n.msgid, c = n.shareId, l = n.type, f = n.time, g = n.text, h = n.category, p = n.fromId, m = n.toId, S = n.shareFrom, v = n.userid, I = n.ftype, b = n.atime, w = n.utab, n.isDeleted || r.executeSql("\n            INSERT INTO Unread (\n              msgid, shareId, type, time, category, text, userid, \n              fromId, toId, shareFrom, ftype, atime, utab\n            ) \n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", [u, c, l, f, h, g, v, p, m, S, I, b, w])["catch"](function (e) {
                (0, s.tlog)("error", "insertUnread Unread", n, e);
              }), e.isIn(h, -1, 2) && (t.shouldUpdateMsgFriends = !0, r.executeSql("\n            INSERT INTO MsgFriends (userid, time, shareId, friendId, desc, \n            descType, descCategory, msgid, toId, fromId, shareFrom, type, utab)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n          ", [v, f, c, p, g, l, h, u, m, p, S, I, w])["catch"](function (e) {
                (0, s.tlog)("error", "insertUnread MsgFriends", n, e);
              }));
            }, i = t.unReadMsgs, o = Array.isArray(i), a = 0, i = o ? i : i["function" == typeof Symbol ? Symbol.iterator : "@@iterator"]();;) {
            var d;
            if (o) {
              if (a >= i.length) break;
              d = i[a++];
            } else {
              if (a = i.next(), a.done) break;
              d = a.value;
            }
            var u,
              c,
              l,
              f,
              g,
              h,
              p,
              m,
              S,
              v,
              I,
              b,
              w,
              P = d;
            n(P);
          }
          var T = function (t) {
            r.executeSql("\n          INSERT INTO Unread (\n            msgid, shareId, type, time, category, text, userid, \n            fromId, toId, shareFrom, ftype, atime, utab\n          ) \n          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n        ", ["", "", 1, 0, e.CONS_MSG_CAT_NEW_FOLLOWED, "", t, "", "", "", 1, 0, 2])["catch"](function (e) {
              (0, s.tlog)("error", "insertUnread newFollowers", t, e);
            });
          };
          for (var C in t.newFollowers) T(C);
          var y = function (t) {
            r.executeSql("DELETE FROM Unread WHERE userid=? AND category=?", [t, e.CONS_MSG_CAT_NEW_FOLLOWED])["catch"](function (e) {
              (0, s.tlog)("error", "insertUnread unStares", t, e);
            });
          };
          for (var D in t.unStares) y(D);
          var E = function (e) {
            var n = t.unReadUpdates[e],
              i = n.text,
              o = n.type;
            r.executeSql("UPDATE Unread SET text=?, type=? WHERE msgid=?", [i, o, e])["catch"](function (r) {
              (0, s.tlog)("error", "unReadUpdates", t.unReadUpdates[e], r);
            });
          };
          for (var F in t.unReadUpdates) E(F);
        }).then(function () {
          return r();
        })["catch"](function (e) {
          return (0, s.tlog)("error", "insertUnread 2", e);
        });
      });
    }, e.deleteUnread = function (e) {
      return new Promise(function (t, r) {
        s.db.transaction(function (t) {
          for (var n = e.unReadDelete, i = Array.isArray(n), o = 0, n = i ? n : n["function" == typeof Symbol ? Symbol.iterator : "@@iterator"]();;) {
            var a;
            if (i) {
              if (o >= n.length) break;
              a = n[o++];
            } else {
              if (o = n.next(), o.done) break;
              a = o.value;
            }
            var d = a;
            t.executeSql("\n          DELETE FROM Unread WHERE msgid=?\n        ", [d.msgid])["catch"]((0, s.errCb)("deleteUnread 1", r));
          }
          for (var u = e.unReadShareDelete, c = Array.isArray(u), l = 0, u = c ? u : u["function" == typeof Symbol ? Symbol.iterator : "@@iterator"]();;) {
            var f;
            if (c) {
              if (l >= u.length) break;
              f = u[l++];
            } else {
              if (l = u.next(), l.done) break;
              f = l.value;
            }
            var g = f;
            t.executeSql("\n          DELETE FROM Unread WHERE shareId=?\n        ", [g])["catch"]((0, s.errCb)("deleteUnread 2", r));
          }
        }).then(function () {
          return t();
        })["catch"](function (e) {
          return (0, s.tlog)("error", "deleteUnread", e);
        });
      });
    }, e.insertNewMsgs = function (t) {
      return new Promise(function (r, n) {
        var i = !1;
        s.db.transaction(function (r) {
          t.newMsgsTimeChanges && t.newMsgsTimeChanges.forEach(function (e) {
            r.executeSql("UPDATE Msgs SET time=? WHERE msgid=?", [e.time, e.msgid])["catch"](function (e) {
              return (0, s.tlog)("error", "newMsgsTimeChanges", e);
            });
          });
          var n = function (n) {
            var o = t.newMsgs[n];
            a = o.msgid, d = o.shareId, u = o.fromId, c = o.toId, l = o.imgId, f = o.audioId, g = o.text, h = o.emoj, p = o.stat, m = o.type, S = o.time, v = o.isnew, I = o.showtime, b = o.category, w = o.uri, P = o.ext, T = o.isDeleted, C = o.height, y = o.width, D = o.path, E = o.duration, F = o.size, N = o.shareFrom, x = o.ftype, k = o.seqi, M = o.chatSession, O = o.msgscnt, _ = o.rawImgId, R = o.addIdx, A = o.uread, void 0 === I && (I = S), void 0 === v && (v = 0), void 0 === p && (p = 2), void 0 === M && (M = ""), void 0 === O ? O = "" : O === e.CONS_FIRST_BOTTLE_MSGSCNT ? r.executeSql("DELETE FROM Msgscnts WHERE shareId=?", [d]) : /\d+,\d+/.test(O) && r.executeSql("\n              INSERT OR REPLACE INTO Msgscnts(shareId, msgscnt) VALUES(?, ?); \n            ", [d, O])["catch"](function (e) {
              (0, s.tlog)("error", "insertNewMsgs Msgscnts", o, e);
            }), void 0 === T && (T = 0), void 0 === _ && (_ = ""), 4 === b && (i = !0), void 0 !== R && (k = R), void 0 === A && (A = 0), m === e.CONS_MSG_TYPE_VIDEO ? r.executeSql("\n            INSERT OR IGNORE INTO Msgs(msgid, imgId, fromId, toId, shareId, stat, time, showtime, type, category, uri, ext, height, width, size, isnew, text, shareFrom, ftype, seqi, chatSession, msgscnt, isDeleted, rawImgId, duration, uread)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", [a, l, u, c, d, p, S, I, m, b, w, P, C, y, F, v, g, N, x, k, M, O, T, _, E, A])["catch"](function (e) {
              return (0, s.tlog)("error", "insert new video msg", e);
            }) : m === e.CONS_MSG_TYPE_EMOTION ? r.executeSql("\n            INSERT OR IGNORE INTO Msgs(msgid, fromId, toId, shareId, stat, time, showtime, type, category, isnew, emoj, text, shareFrom, ftype, seqi, chatSession, msgscnt, isDeleted, uread)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", [a, u, c, d, p, S, I, m, b, v, h, g, N, x, k, M, O, T, A])["catch"](function (e) {
              return (0, s.tlog)("error", "insert new emoj msg", e);
            }) : m === e.CONS_MSG_TYPE_IMAGE ? r.executeSql("\n            INSERT OR IGNORE INTO Msgs(msgid, imgId, fromId, toId, shareId, stat, time, showtime, type, category, uri, ext, height, width, size, isnew, text, shareFrom, ftype, seqi, chatSession, msgscnt, isDeleted, rawImgId, uread)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", [a, l, u, c, d, p, S, I, m, b, w, P, C, y, F, v, g, N, x, k, M, O, T, _, A])["catch"](function (e) {
              return (0, s.tlog)("error", "insert new image msg", e);
            }) : m === e.CONS_MSG_TYPE_AUDIO ? r.executeSql("\n            INSERT OR IGNORE INTO Msgs(msgid, audioId, fromId, toId, shareId, stat, time, showtime, type, category, path, duration, size, isnew, text, shareFrom, ftype, seqi, chatSession, msgscnt, isDeleted, uread)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", [a, f, u, c, d, p, S, I, m, b, D, E, F, v, g, N, x, k, M, O, T, A])["catch"](function (e) {
              return (0, s.tlog)("error", "insert new audio msg", e);
            }) : m === e.CONS_MSG_TYPE_LINK ? r.executeSql("\n            INSERT OR IGNORE INTO Msgs(msgid, fromId, toId, shareId, stat, time, showtime, type, category, isnew, text, shareFrom, ftype, seqi, chatSession, msgscnt, uri, isDeleted, uread)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", [a, u, c, d, p, S, I, m, b, v, g, N, x, k, M, O, w, T, A])["catch"](function (e) {
              return (0, s.tlog)("error", "insert new link msg", e);
            }) : m === e.CONS_MSG_TYPE_GIF ? r.executeSql("\n            INSERT OR IGNORE INTO Msgs(msgid, fromId, toId, shareId, stat, time, showtime, type, category, isnew, text, shareFrom, ftype, seqi, chatSession, msgscnt, uri, width, height, size, isDeleted, uread)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", [a, u, c, d, p, S, I, m, b, v, g, N, x, k, M, O, w, y, C, F, T, A])["catch"](function (e) {
              return (0, s.tlog)("error", "insert new gif msg", e);
            }) : r.executeSql("\n            INSERT OR IGNORE INTO Msgs(msgid, fromId, toId, shareId, stat, time, showtime, type, category, isnew, text, shareFrom, ftype, seqi, chatSession, msgscnt, isDeleted, uread)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\n          ", [a, u, c, d, p, S, I, m, b, v, g, N, x, k, M, O, T, A])["catch"](function (e) {
              return (0, s.tlog)("error", "insert new text msg", e);
            });
          };
          for (var o in t.newMsgs) {
            var a, d, u, c, l, f, g, h, p, m, S, v, I, b, w, P, T, C, y, D, E, F, N, x, k, M, O, _, R, A;
            n(o);
          }
        }).then(function () {
          r(), i && e.emit("newReceivedMsgs");
        })["catch"](function (e) {
          return (0, s.tlog)("error", "insertNewMsg", e);
        });
      });
    }, e.editShareMsgs = function (e) {
      return new Promise(function (t, r) {
        var n = 0,
          i = Object.keys(e.editMsgs),
          o = function a() {
            if (n >= i.length) return void t();
            var r = i[n];
            s.db.executeSql("SELECT * from Shares WHERE shareId=?", [r]).then(function (t) {
              var o = t[0].rows.item(0),
                d = JSON.parse(o.msgs);
              o.msgs = d;
              for (var u in e.editMsgs[i[n]]) if ("friendId" !== u) {
                var c = d.findIndex(function (e) {
                  return e.msgid === u;
                });
                -1 !== c && (d[c].text = e.editMsgs[i[n]][u].text);
              }
              return s.db.executeSql("\n          UPDATE Shares SET msgs=? WHERE shareId=?;\n        ", [JSON.stringify(d), r]).then(function () {
                a(++n);
              });
            })["catch"](function (e) {
              (0, s.tlog)("error", "editShareMsgs", r, e), a(++n);
            });
          };
        o();
      });
    };
  };
});
