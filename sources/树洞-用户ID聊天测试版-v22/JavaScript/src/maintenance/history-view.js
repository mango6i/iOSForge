// Current-conversation history. Global search has a separate entry and view.
__d(9003,function(global,require,module,exports){
 "use strict";
 var React=require(311);React=React.default||React;
 var RN=require(312),ctx=require(314),h=React.createElement;
 var Identity=React.createClass({
  displayName:"RecoveryHistoryIdentity",
  getInitialState:function(){return {title:ctx.apps.recoveryUserTitle(this.props.userid)};},
  componentDidMount:function(){this.identity=ctx.apps.userid;this.subscribedId=this.props.userid;ctx.apps.on("userNameChanged_"+this.subscribedId,this.refresh);this.refresh();},
  componentWillReceiveProps:function(next){if(next.userid!==this.props.userid){ctx.apps.unon("userNameChanged_"+this.subscribedId,this.refresh);this.subscribedId=next.userid;ctx.apps.on("userNameChanged_"+this.subscribedId,this.refresh);this.setState({title:ctx.apps.recoveryUserTitle(next.userid)});this.loadIdentity(next.userid);}},
  componentWillUnmount:function(){this.closed=true;ctx.apps.unon("userNameChanged_"+this.subscribedId,this.refresh);},
  refresh:function(){this.loadIdentity(this.props.userid);},
  loadIdentity:function(id){var self=this,request=this.identityRequest=(this.identityRequest||0)+1;if(!ctx.apps.getProfileK)return;
   Promise.all([ctx.apps.getProfileK(id,"name"),ctx.apps.getProfileK(id,"ftag")]).then(function(values){if(!self.closed&&self.identity===ctx.apps.userid&&request===self.identityRequest)self.setState({title:(values[0]||"未设置昵称")+(values[1]?"（"+values[1]+"）":"")});}).catch(function(){if(!self.closed&&self.identity===ctx.apps.userid&&request===self.identityRequest)self.setState({title:ctx.apps.recoveryUserTitle(id)});});
  },
  render:function(){return h(RN.Text,{numberOfLines:this.props.numberOfLines,style:[{color:ctx.theme.deep6,fontSize:12,marginBottom:5,textAlign:this.props.mine?"right":"left"},this.props.style]},this.state.title);}
 });
 var History=React.createClass({
  displayName:"RecoveryHistoryView",
  getTopInset:function(height){if(RN.Platform.OS!=="ios")return Math.max(ctx.theme.statusHeightAll||0,RN.StatusBar&&RN.StatusBar.currentHeight||0);return Math.max(20,(ctx.theme.navHeight||44)-44,ctx.theme.isIphoneX?44:0,height||RN.StatusBarIOS&&RN.StatusBarIOS.currentHeight||0);},
  getInitialState:function(){return {visible:false,mode:"messages",keyword:"",items:[],selected:{},busy:false,hasMore:false,topInset:this.getTopInset()};},
  statusBarChanged:function(event){if(!this.closed)this.setState({topInset:this.getTopInset(event.frame.height)});},
  componentDidMount:function(){var self=this;ctx.apps.on("openRecoveryHistory",this.open);ctx.apps.on("closeRecoveryHistory",this.close);ctx.apps.on("resumeRecoveryHistory",this.resume);ctx.apps.on("recoveryRecordsDeleted",this.reload);
   if(RN.Platform.OS==="ios"){if(RN.StatusBarIOS&&RN.StatusBarIOS.addListener)this.statusBarSubscription=RN.StatusBarIOS.addListener("statusBarFrameWillChange",this.statusBarChanged);if(ctx.StatusBarManager&&ctx.StatusBarManager.getHeight)ctx.StatusBarManager.getHeight(function(value){if(!self.closed)self.setState({topInset:self.getTopInset(value.height)});});}
  },
  componentWillUnmount:function(){this.closed=true;this.requestId=(this.requestId||0)+1;ctx.apps.unon("openRecoveryHistory",this.open);ctx.apps.unon("closeRecoveryHistory",this.close);ctx.apps.unon("resumeRecoveryHistory",this.resume);ctx.apps.unon("recoveryRecordsDeleted",this.reload);if(this.statusBarSubscription)this.statusBarSubscription.remove();},
  open:function(options){this.options=options;this.setState({visible:true,mode:"messages",keyword:options.keyword||"",items:[],selected:{},hasMore:false},this.reload);},
  close:function(noResume,preserve){this.setState({visible:false,suspended:!!preserve});if(!noResume&&this.options&&this.options.resumeGlobal)ctx.apps.emit("resumeRecoveryGlobalSearch");},
  resume:function(){if(this.valid())this.setState({visible:true,suspended:false});},
  valid:function(){return this.options&&this.options.ownerId===ctx.apps.userid&&!this.closed;},
  reload:function(){if(this.state.visible)this.load(false);},
  load:function(more){var self=this;if(!this.valid()||more&&(this.state.busy||!this.state.hasMore))return;var id=this.requestId=(this.requestId||0)+1,offset=more?this.state.items.length:0;this.setState({busy:true});
   ctx.apps.recoveryHistoryQuery(this.options.friendId,this.state.mode==="messages"?this.state.keyword:"",offset,this.state.mode==="images").then(function(result){if(!self.valid()||id!==self.requestId)return;self.setState({items:more?self.state.items.concat(result.items):result.items,hasMore:result.hasMore,busy:false});}).catch(function(error){if(!self.closed&&id===self.requestId){self.setState({busy:false});ctx.apps.tip(error.message);}});
  },
  mode:function(mode){if(this.state.mode!==mode)this.setState({mode:mode,items:[],selected:{},hasMore:false},this.reload);},
  toggle:function(item){var selected=Object.assign({},this.state.selected);if(selected[item.msgid])delete selected[item.msgid];else selected[item.msgid]=true;this.setState({selected:selected});},
  selectAll:function(){var selected={};this.state.items.forEach(function(item){selected[item.msgid]=true;});this.setState({selected:selected});},
  invert:function(){var old=this.state.selected,selected={};this.state.items.forEach(function(item){if(!old[item.msgid])selected[item.msgid]=true;});this.setState({selected:selected});},
  showImage:function(item){var self=this;this.setState({visible:false,suspended:true});ctx.apps.openRecoveryHistoryImage(item).then(function(opened){if(!opened)self.resume();}).catch(function(error){self.resume();ctx.apps.tip(error.message);});},
  locate:function(item){var self=this;this.setState({visible:false,suspended:true});ctx.apps.showRecoveryLocateDialog(this.options.friendId,item,{cancel:this.resume,beforeLocate:function(){self.close(true,true);ctx.apps.emit("closeRecoveryGlobalSearch",true);},returnTo:ctx.apps.recoveryReturnTarget("resumeRecoveryHistory")});},
  saveSelected:function(){var self=this,selected=this.state.selected,items=this.state.items.filter(function(item){return selected[item.msgid];});if(this.state.busy)return;if(!items.length){ctx.apps.tip("请先选择图片");return;}var saved=0,failed=0,skipped=0;this.setState({busy:true,visible:false});
   ctx.apps.ensureRecoveryPhotoPermission().then(function(){var chain=Promise.resolve();items.forEach(function(item){chain=chain.then(function(){if(!self.valid())throw new Error("账号已切换");return ctx.apps.confirmRecoveryImage(item).then(function(allowed){if(!allowed){skipped++;return;}return ctx.apps.saveRecoveryImage(item,true).then(function(){saved++;},function(){failed++;});});});});return chain;}).then(function(){ctx.apps.tip("已保存"+saved+"张"+(failed?"，失败"+failed+"张":"")+(skipped?"，取消"+skipped+"张":""));}).catch(function(error){ctx.apps.tip(error.message+(saved?"；已保存"+saved+"张":""));}).then(function(){if(self.valid())self.setState({visible:true,busy:false});});
  },
  button:function(label,action,active){return h(RN.TouchableOpacity,{onPress:action,style:{padding:10,backgroundColor:active?ctx.theme.deepGreen2Trans4:"transparent"}},typeof label==="string"?h(RN.Text,{style:{color:ctx.theme.deep9,fontSize:14}},label):label);},
  renderMessage:function(item){var self=this,mine=item.fromId===ctx.apps.userid,photo=item.type===3||item.type===10;
   return h(RN.View,{style:{paddingHorizontal:12,paddingVertical:8,alignItems:mine?"flex-end":"flex-start"}},
    h(Identity,{userid:item.fromId,mine:mine}),
    h(RN.TouchableOpacity,{onLongPress:function(){self.locate(item);},onPress:function(){if(photo)self.showImage(item);},style:{maxWidth:ctx.theme.winWidth*.8,padding:10,borderRadius:8,backgroundColor:mine?ctx.theme.deepGreen2Trans4:ctx.theme.deepTrans1}},
     photo?h(ctx.CachedImage,{imageId:item.imgId,defaultSource:item.uri?{uri:item.uri}:undefined,style:{width:110,height:110},resizeMode:"cover"}):h(RN.Text,{style:{color:ctx.theme.deep9,fontSize:15}},item.text||(item.type===2?"[语音]":item.type===11?"[视频]":"[消息]")),
     h(RN.Text,{style:{color:ctx.theme.deep6,fontSize:10,textAlign:"right",alignSelf:"flex-end",marginTop:6}},ctx.apps.recoveryFullTime(item.time))));
  },
  renderImages:function(group){var self=this,size=Math.floor((ctx.theme.winWidth-16)/3);return h(RN.View,{style:{flexDirection:"row"}},group.map(function(item){return h(RN.View,{key:item.msgid,style:{width:size,height:size,margin:2}},h(RN.TouchableOpacity,{onPress:function(){self.showImage(item);},onLongPress:function(){self.locate(item);}},h(ctx.CachedImage,{imageId:item.imgId,defaultSource:item.uri?{uri:item.uri}:undefined,style:{width:size,height:size},resizeMode:"cover"})),h(RN.TouchableOpacity,{onPress:function(){self.toggle(item);},style:{position:"absolute",top:3,right:3,padding:7,backgroundColor:"rgba(0,0,0,.5)",borderRadius:15}},h(RN.Text,{style:{color:"#fff",fontSize:18}},self.state.selected[item.msgid]?"☑":"□")));}));},
  render:function(){if((!this.state.visible&&!this.state.suspended)||!this.valid())return null;var self=this,images=this.state.mode==="images",items=this.state.items;if(images){var groups=[];for(var i=0;i<items.length;i+=3)groups.push(items.slice(i,i+3));items=groups;}
   var data=new RN.ListView.DataSource({rowHasChanged:function(){return true;}}).cloneWithRows(items);
   return h(RN.View,{pointerEvents:this.state.visible?"auto":"none",style:{opacity:this.state.visible?1:0,position:"absolute",top:0,left:0,right:0,bottom:0,paddingTop:this.state.topInset,paddingBottom:ctx.theme.iphoneXDiff||12,backgroundColor:ctx.theme.light}},
    h(RN.View,{style:{height:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between"}},h(RN.View,{style:{width:60,height:44}},h(ctx.BackButton,{cnt:0,onMount:function(){},onUnMount:function(){},onPress:function(){self.close();}})),h(RN.Text,{style:{fontSize:18,color:ctx.theme.deep9}},"聊天记录"),h(RN.View,{style:{width:60}})),
    h(RN.View,{style:{flexDirection:"row",justifyContent:"center"}},this.button("全部记录",function(){self.mode("messages");},!images),this.button(h(ctx.Ionicons,{name:"ios-images-outline",size:25,color:ctx.theme.deep9}),function(){self.mode("images");},images)),
    images?h(RN.View,{style:{flexDirection:"row",justifyContent:"space-around"}},this.button("全选",this.selectAll),this.button("反选",this.invert),this.button("取消选择",function(){self.setState({selected:{}});}),this.button("保存("+Object.keys(this.state.selected).length+")",this.saveSelected)):
     h(RN.View,{style:{flexDirection:"row",padding:8}},h(RN.TextInput,{value:this.state.keyword,onChangeText:function(value){self.setState({keyword:value});},placeholder:"搜索当前对话",placeholderTextColor:ctx.theme.deep4,returnKeyType:"search",onSubmitEditing:this.reload,style:{flex:1,height:36,padding:6,borderWidth:1,borderColor:ctx.theme.deep3,color:ctx.theme.deep9}}),this.button("搜索",this.reload)),
    h(RN.ListView,{style:{flex:1},dataSource:data,renderRow:images?this.renderImages:this.renderMessage,initialListSize:12,pageSize:12,enableEmptySections:true,onEndReached:function(){if(!images)self.load(true);},onEndReachedThreshold:200,renderFooter:function(){return h(RN.Text,{style:{textAlign:"center",padding:15,color:ctx.theme.deep6}},self.state.busy?"正在加载…":!self.state.items.length?"没有找到记录":self.state.hasMore?"上拉加载更多":"已显示本机保存的全部记录");}}));
  }
 });
 History.Identity=Identity;module.exports=History;
});
