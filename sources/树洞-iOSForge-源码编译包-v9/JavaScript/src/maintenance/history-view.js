// Chat history overlay using the same legacy React/React Native runtime as the app.
__d(9003, function (global, require, module, exports) {
  "use strict";
  var React = require(311); React = React.default || React;
  var RN = require(312), ctx = require(314), h = React.createElement;
  module.exports = React.createClass({
    displayName: "RecoveryHistoryView",
    getTopInset: function (height) {
      if (RN.Platform.OS !== "ios") return Math.max(ctx.theme.statusHeightAll || 0, RN.StatusBar && RN.StatusBar.currentHeight || 0);
      // This runtime's statusHeightAll is zero even on iPhone X. Its existing
      // navigation height includes the safe top inset; native status height
      // also covers newer devices and changes such as an active call.
      return Math.max(20, (ctx.theme.navHeight || 44) - 44, ctx.theme.isIphoneX ? 44 : 0,
        height || RN.StatusBarIOS && RN.StatusBarIOS.currentHeight || 0);
    },
    getInitialState: function () { return {visible: false, mode: "messages", keyword: "", items: [], selected: {}, busy: false, hasMore: false, topInset: this.getTopInset()}; },
    statusBarChanged: function (event) { if (!this.closed) this.setState({topInset: this.getTopInset(event.frame.height)}); },
    componentDidMount: function () {
      ctx.apps.on("openRecoveryHistory", this.open);
      ctx.apps.on("closeRecoveryHistory", this.close);
      ctx.apps.on("resumeRecoveryHistory", this.resume);
      if (RN.Platform.OS === "ios") {
        var self = this;
        if (RN.StatusBarIOS && RN.StatusBarIOS.addListener) this.statusBarSubscription = RN.StatusBarIOS.addListener("statusBarFrameWillChange", this.statusBarChanged);
        if (ctx.StatusBarManager && ctx.StatusBarManager.getHeight) ctx.StatusBarManager.getHeight(function (value) {
          if (!self.closed) self.setState({topInset: self.getTopInset(value.height)});
        });
      }
    },
    componentWillUnmount: function () {
      this.closed = true; this.requestId = (this.requestId || 0) + 1;
      ctx.apps.unon("openRecoveryHistory", this.open); ctx.apps.unon("closeRecoveryHistory", this.close); ctx.apps.unon("resumeRecoveryHistory", this.resume);
      if (this.statusBarSubscription) this.statusBarSubscription.remove();
    },
    open: function (options) { this.options = options; this.setState({visible: true, mode: "messages", keyword: "", items: [], selected: {}}, this.reload); },
    close: function () { this.setState({visible: false}); },
    resume: function () { if (this.options && this.options.ownerId === ctx.apps.userid) this.setState({visible: true}); },
    valid: function () { return this.options && this.options.ownerId === ctx.apps.userid && !this.closed; },
    reload: function () { this.load(false); },
    load: function (more) {
      var self = this;
      if (!this.valid() || more && (this.state.busy || !this.state.hasMore)) return;
      var id = this.requestId = (this.requestId || 0) + 1, offset = more ? this.state.items.length : 0;
      this.setState({busy: true});
      ctx.apps.recoveryHistoryQuery(this.options.friendId, this.state.mode === "messages" ? this.state.keyword : "", offset, this.state.mode === "images").then(function (result) {
        if (!self.valid() || id !== self.requestId) return;
        self.setState({items: more ? self.state.items.concat(result.items) : result.items, hasMore: result.hasMore, busy: false});
      }).catch(function (error) { if (!self.closed && id === self.requestId) { self.setState({busy: false}); ctx.apps.tip(error.message); } });
    },
    mode: function (mode) { if (this.state.mode !== mode) this.setState({mode: mode, items: [], selected: {}, hasMore: false}, this.reload); },
    toggle: function (message) { var selected = Object.assign({}, this.state.selected); if (selected[message.msgid]) delete selected[message.msgid]; else selected[message.msgid] = true; this.setState({selected: selected}); },
    selectAll: function () { var selected = {}; this.state.items.forEach(function (item) { selected[item.msgid] = true; }); this.setState({selected: selected}); },
    invert: function () { var selected = {}, old = this.state.selected; this.state.items.forEach(function (item) { if (!old[item.msgid]) selected[item.msgid] = true; }); this.setState({selected: selected}); },
    showImage: function (item) {
      var self = this; this.setState({visible: false});
      ctx.apps.openRecoveryHistoryImage(item).then(function (opened) { if (!opened) self.resume(); }).catch(function (error) { self.resume(); ctx.apps.tip(error.message); });
    },
    locate: function (item) {
      var self = this;
      RN.Alert.alert("聊天记录", "", [{text: "取消"}, {text: "定位到聊天位置", onPress: function () {
        self.close(); ctx.apps.locateRecoveryMessage(self.options.friendId, item).catch(function (error) { ctx.apps.tip(error.message); });
      }}]);
    },
    saveSelected: function () {
      var self = this, selected = this.state.selected, items = this.state.items.filter(function (item) { return selected[item.msgid]; });
      if (this.state.busy) return;
      if (!items.length) { ctx.apps.tip("请先选择图片"); return; }
      var saved = 0, failed = 0, skipped = 0;
      this.setState({busy: true, visible: false});
      ctx.apps.ensureRecoveryPhotoPermission().then(function () {
        var chain = Promise.resolve();
        items.forEach(function (item) { chain = chain.then(function () {
          if (!self.valid()) throw new Error("账号已切换");
          return ctx.apps.confirmRecoveryImage(item).then(function (allowed) {
            if (!allowed) { skipped++; return; }
            return ctx.apps.saveRecoveryImage(item, true).then(function () { saved++; }, function () { failed++; });
          });
        }); }); return chain;
      }).then(function () { ctx.apps.tip("已保存" + saved + "张" + (failed ? "，失败" + failed + "张" : "") + (skipped ? "，取消" + skipped + "张" : "")); })
        .catch(function (error) { ctx.apps.tip(error.message + (saved ? "；已保存" + saved + "张" : "")); })
        .then(function () { if (self.valid()) self.setState({visible: true, busy: false}); });
    },
    button: function (label, action, active) { return h(RN.TouchableOpacity, {onPress: action, style: {padding: 10, backgroundColor: active ? ctx.theme.deepGreen2Trans4 : "transparent"}}, typeof label === "string" ? h(RN.Text, {style: {color: ctx.theme.deep9, fontSize: 14}}, label) : label); },
    renderMessage: function (item) {
      var self = this;
      return h(RN.TouchableOpacity, {onLongPress: function () { self.locate(item); }, onPress: function () { if (item.type === 3 || item.type === 10) self.showImage(item); },
        style: {padding: 12, borderBottomWidth: 0.5, borderColor: ctx.theme.deep2}},
        h(RN.Text, {style: {color: ctx.theme.deep6, fontSize: 11, marginBottom: 6}}, (item.fromId === ctx.apps.userid ? "我" : ctx.apps.getUserName ? ctx.apps.getUserName(item.fromId) : item.fromId) + "  " + ctx.apps.recoveryFullTime(item.time)),
        item.type === 3 || item.type === 10 ? h(ctx.CachedImage, {imageId: item.imgId, defaultSource: item.uri ? {uri: item.uri} : undefined, style: {width: 90, height: 90}, resizeMode: "cover"}) : h(RN.Text, {style: {color: ctx.theme.deep9, fontSize: 15}}, item.text || (item.type === 2 ? "[语音]" : item.type === 11 ? "[视频]" : "[消息]")));
    },
    renderImages: function (group) {
      var self = this, size = Math.floor((ctx.theme.winWidth - 16) / 3);
      return h(RN.View, {style: {flexDirection: "row"}}, group.map(function (item) {
        return h(RN.View, {key: item.msgid, style: {width: size, height: size, margin: 2}},
          h(RN.TouchableOpacity, {onPress: function () { self.showImage(item); }, onLongPress: function () { self.toggle(item); }},
            h(ctx.CachedImage, {imageId: item.imgId, defaultSource: item.uri ? {uri: item.uri} : undefined, style: {width: size, height: size}, resizeMode: "cover"})),
          h(RN.TouchableOpacity, {onPress: function () { self.toggle(item); }, style: {position: "absolute", top: 3, right: 3, padding: 7, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 15}},
            h(RN.Text, {style: {color: "#fff", fontSize: 18}}, self.state.selected[item.msgid] ? "☑" : "□")));
      }));
    },
    render: function () {
      if (!this.state.visible || !this.valid()) return null;
      var self = this, images = this.state.mode === "images", items = this.state.items;
      if (images) { var groups = []; for (var i = 0; i < items.length; i += 3) groups.push(items.slice(i, i + 3)); items = groups; }
      var data = new RN.ListView.DataSource({rowHasChanged: function () { return true; }}).cloneWithRows(items);
      return h(RN.View, {style: {position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingTop: this.state.topInset, paddingBottom: ctx.theme.iphoneXDiff || 12, backgroundColor: ctx.theme.light}},
        h(RN.View, {style: {height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between"}}, h(RN.View, {style: {width: 60}}, this.button("返回", this.close)), h(RN.Text, {style: {fontSize: 18, color: ctx.theme.deep9}}, "聊天记录"), h(RN.View, {style: {width: 60}})),
        h(RN.View, {style: {flexDirection: "row", justifyContent: "center"}}, this.button("全部记录", function () { self.mode("messages"); }, !images),
          this.button(h(ctx.Ionicons, {name: "ios-images-outline", size: 25, color: ctx.theme.deep9}), function () { self.mode("images"); }, images)),
        images ? h(RN.View, {style: {flexDirection: "row", justifyContent: "space-around"}}, this.button("全选", this.selectAll), this.button("反选", this.invert), this.button("取消选择", function () { self.setState({selected: {}}); }), this.button("保存(" + Object.keys(this.state.selected).length + ")", this.saveSelected)) :
          h(RN.View, {style: {flexDirection: "row", padding: 8}}, h(RN.TextInput, {value: this.state.keyword, onChangeText: function (value) { self.setState({keyword: value}); }, placeholder: "搜索聊天关键词", placeholderTextColor: ctx.theme.deep4, returnKeyType: "search", onSubmitEditing: this.reload, style: {flex: 1, height: 36, padding: 6, borderWidth: 1, borderColor: ctx.theme.deep3, color: ctx.theme.deep9}}), this.button("搜索", this.reload)),
        h(RN.ListView, {style: {flex: 1}, dataSource: data, renderRow: images ? this.renderImages : this.renderMessage, initialListSize: 12, pageSize: 12, enableEmptySections: true,
          onEndReached: function () { if (!images) self.load(true); }, onEndReachedThreshold: 200,
          renderFooter: function () { return h(RN.Text, {style: {textAlign: "center", padding: 15, color: ctx.theme.deep6}}, self.state.busy ? "正在加载…" : !self.state.items.length ? "没有找到记录" : self.state.hasMore ? "上拉加载更多" : "已显示本机保存的全部记录"); }}));
    }
  });
});
