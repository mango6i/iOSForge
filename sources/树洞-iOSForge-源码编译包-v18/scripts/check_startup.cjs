// Execute the real bundled JS entry with mocked native interfaces.
// This checks initialization and React element construction, not iOS execution.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const fragment=fs.readFileSync(root+'/JavaScript/runtime/fragments/000.js','utf8');
const dims={window:{width:375,height:812,scale:3,fontScale:1},screen:{width:375,height:812,scale:3,fontScale:1}};
function nativeModules(logs){
 const noop=()=>{},view=()=>({Constants:{forceTouchAvailable:false},NativeProps:{},bubblingEventTypes:{},directEventTypes:{}});
 const ui=new Proxy({Dimensions:dims,RCTView:view(),customBubblingEventTypes:{},customDirectEventTypes:{},takeSnapshot:noop,ViewManagerNames:[]},{get:(o,k)=>k in o?o[k]:typeof k==='string'&&/^[A-Z]/.test(k)?(o[k]=view()):noop});
 const supplied={UIManager:ui,RNI18n:{locale:'zh-CN'},SourceCode:{scriptURL:'file:///app/main.jsbundle'},PlatformConstants:{forceTouchAvailable:false,osVersion:'16.6',systemName:'iOS'},DeviceInfo:{Dimensions:dims},StatusBarManager:{HEIGHT:44,style:'default',getHeight:cb=>cb({height:44})},RNDeviceInfo:{uniqueId:'probe-device',deviceId:'iPhone10,3',systemName:'iOS',systemVersion:'16.6',model:'iPhone X',appVersion:'2.2.1163',appName:'树洞',buildNumber:'18',bundleId:'co.whou.pick',userAgent:'probe',deviceCountry:'CN',deviceLocale:'zh-CN'},RNFSManager:{DocumentDirectoryPath:'/documents',CachesDirectoryPath:'/cache',MainBundlePath:'/app',TemporaryDirectoryPath:'/tmp',LibraryDirectoryPath:'/library'},ExceptionsManager:{reportSoftException:(message,stack)=>logs.push({message,stack})}};
 const cache={};
 return new Proxy(cache,{get:(o,name)=>{
  if(name in o)return o[name];
  const fields=supplied[name]||{};
  return o[name]=new Proxy(fields,{get:(v,k)=>k==='then'?undefined:k in v?v[k]:typeof k==='symbol'?undefined:(...args)=>{}});
 }});
}
function checkNavigation(context,main,apps){
 const rn=context.require(312),Friends=context.require(342).FriendsNavigator;
 const friends=new Friends({}),route=friends.routes.friends,rendered=friends.render(),maps=rendered.props.navbarMappers;
 // NavigationBar invokes these callbacks after Main returns its element tree.
 // Merely calling Main.render() does not execute the callbacks.
 for(const name of ['Title','LeftButton','RightButton'])if(maps[name])maps[name](route,null,0,null);
 const back=maps.LeftButton({id:'interact_startup',friendId:'peer'},null,1,null);
 if(!back||back.type!==context.require(314).BackButton)throw Error('Conversation back button was not constructed');
 const scene=friends.renderSceneContent(route),list=new scene.type(scene.props);
 const homeTree=list.render();if(typeof apps.openRecoveryGlobalSearch==='function'){
  if(maps.LeftButton(route,null,0,null)!==null)throw Error('Home search must not remain in the top-left corner');
  const contains=node=>!!node&&(Array.isArray(node)?node.some(contains):typeof node==='object'&&(node.props&&node.props.accessibilityLabel==='全局搜索'||contains(node.props&&node.props.children)));
  if(!contains(homeTree))throw Error('Message-list search bar is missing');
 }
 list.renderRowMiddleBlock({friendId:'peer',time:1792280000000});
 const Welcome=context.require(341).WelcomeNavigator,welcome=new Welcome({}),welcomeRoot=welcome.render(),welcomeRoute=welcomeRoot.props.initialRoute;
 welcome.renderSceneContent(welcomeRoute);
 for(const name of ['Title','LeftButton','RightButton'])if(welcomeRoot.props.navbarMappers[name])welcomeRoot.props.navbarMappers[name](welcomeRoute,null,0,null);
 main.state.rootNavigator='friends';main.state.quickLaunch=false;
 const root=main.render(),children=rn.Children?rn.Children.toArray(root.props.children):Array.from(root.props.children),all=[];
 function visit(node){if(!node)return;if(Array.isArray(node)){node.forEach(visit);return;}if(typeof node==='object'&&node.type){all.push(node);visit(node.props&&node.props.children);}}
 visit(children);
 if(!all.some(node=>node.type===Friends))throw Error('Main did not include the conversation navigator');
 if(typeof apps.openRecoveryStorage==='function'){
  for(const id of [9003,9006,9007])if(!all.some(node=>node.type===context.require(id)))throw Error('Maintenance view '+id+' is not mounted by Main');
 }
 main.state.rootNavigator='welcome';main.render();
 return {homeNavigationRendered:true,welcomeNavigationRendered:true,maintenanceViewsWired:typeof apps.openRecoveryStorage==='function'};
}
function checkProfilePages(context,main,apps){
 const RN=context.require(312),cfg=context.require(314),P=vm.runInContext('Promise',context),timers=context.require(37);
 const original=new Map(),mounted=[],forwarded=[];let storageImageLocationChecked=false,cloudLoadingChecked=false,restoreDatabase;
 function replace(name,value){if(!original.has(name))original.set(name,{exists:Object.prototype.hasOwnProperty.call(apps,name),value:apps[name]});apps[name]=value;}
 function stateful(instance){instance.setState=function(value,callback){Object.assign(this.state,typeof value==='function'?value(this.state,this.props):value);if(callback)callback.call(this);};return instance;}
 function drain(){for(let i=0;timers.immediates.length;i++){if(i>=100)throw Error('Profile event queue did not settle');timers.callImmediatesPass();if(timers.errors&&timers.errors.length)throw timers.errors[0];}}
 function find(node,type){if(!node)return null;if(Array.isArray(node)){for(const child of node){const hit=find(child,type);if(hit)return hit;}return null;}if(typeof node!=='object')return null;if(node.props&&node.props.pointerEvents==="none")return null;if(node.type===type)return node;return find(node.props&&node.props.children,type);}
 function mount(element){if(!element||typeof element.type!=='function')throw Error('Profile route returned no component');const view=stateful(new element.type(element.props));if(view.componentDidMount)view.componentDidMount();mounted.push(view);return view;}
 function renderList(view,label){
  const element=find(view.render(),RN.ListView);if(!element)throw Error(label+' has no ListView');
  const data=element.props.dataSource;let count=0;
  for(let section=0;section<data.rowIdentities.length;section++)for(let row=0;row<data.rowIdentities[section].length;row++){
   const value=data.getRowData(section,row),tree=element.props.renderRow(value,data.sectionIdentities[section],data.rowIdentities[section][row]);
   if(value&&value.type&&!tree)throw Error(label+' failed to render '+value.type);
   if(tree){count++;const visit=node=>{if(!node)return;if(Array.isArray(node)){node.forEach(visit);return;}if(typeof node!=='object')return;if(node.type&&['AsyncBtn','Album'].includes(node.type.displayName))new node.type(node.props).render();visit(node.props&&node.props.children);};visit(tree);}
  }
  return count;
 }
 function verify(view,label){
  drain();if(!view.state.loaded||!view.listData.length)throw Error(label+' received no profileLoaded data through the actual route');
  const element=find(view.render(),RN.ListView);if(!element||element.props.dataSource.getRowCount()<1)throw Error(label+' did not show a populated ListView');
  const count=renderList(view,label);
  if(count<4)throw Error(label+' rendered too few visible rows');return count;
 }
 const myId=apps.userid,peer='profile-probe-peer-0123456789',stranger='profile-probe-stranger-0123456789',group='2:profile-probe-group';
 const profiles={[myId]:{name:'Probe Me',avatar:'me.jpg'},[peer]:{name:'Probe Friend',ftag:'Probe Remark',avatar:'peer.jpg',phoneNum:'+8613800000000'},[stranger]:{name:'Probe Stranger',avatar:'stranger.jpg'},[group]:{name:'Probe Group',avatar:'group.jpg'}};
 try{
  // Keep data/native boundaries offline. Navigation, events, profile loading,
  // Promise callbacks, AboutMeView and each actual row renderer remain real.
  replace('profiles',profiles);replace('account','profile-probe-account');replace('permissions',{notification:false});replace('showCmdBall',false);replace('version','2.2.1163');replace('pkgvv','probe');
  replace('getRelationShip',id=>P.resolve(id===group?{isInGroup:true,isCreator:false}:id===peer?{isFriend:true}:{isFriend:false}));
  replace('getProfile',id=>P.resolve(profiles[id]||{}));replace('getProfileK',(id,key)=>P.resolve((profiles[id]||{})[key]));replace('syncFriendProfile',()=>P.resolve());
  replace('refreshRecoveryTestStars',()=>{});replace('clearInputPanel',()=>{});replace('closeInputPanel',()=>{});replace('myInputViewRef',{changePlaceHolder(){}});
  replace('send',name=>{throw Error('Unexpected server request in screen probe: '+name);});replace('launch',()=>apps.emit('appLaunchEnd','normal'));
  const Friends=context.require(342).FriendsNavigator,About=context.require(343).AboutMeNavigator;
  const friends=stateful(new Friends({})),about=stateful(new About({}));about.componentDidMount();mounted.push(about);
  about.navi={navForward:route=>forwarded.push(route)};friends.navi={navForward:route=>forwarded.push(route)};
  replace('friendsNavigator',friends);replace('aboutMeNavigator',about);replace('curNavigator',friends);
  stateful(main);main.componentDidMount();
  const Tabs=context.require(330).MainTabView,tabs=stateful(new Tabs({tabIndex:0}));tabs.onPressAboutMeTab();
  if(main.state.aboutMeNavFlex!==1||!about.state.launched)throw Error('Settings tab did not make AboutMeNavigator visible');
  const settingNav=about.render();if(!settingNav)throw Error('Settings navigator returned no content after tab switch');
  const settings=mount(about.renderSceneContent(about.routes.aboutMe));settingNav.props.onDidFocus(about.routes.aboutMe,{});
  const settingsRows=verify(settings,'Settings');
  const settingsNames=settings.listData.filter(Boolean).map(row=>row.label||row.text||row.name||'');
  if(!settingsNames.includes(cfg.tr('Account ID'))||!settingsNames.includes(cfg.tr('Password'))||!settingsNames.includes(cfg.tr('Nickname')))throw Error('Settings core account rows are missing');
  if(typeof apps.openRecoveryStorage==='function'){
   const entry=settings.listData.find(row=>row&&row.name==='CloudRepo');if(entry)throw Error('Cloud settings entry must be hidden');const route=about.routes.cloudRepo;
   let requests=0;replace('send',(name,params)=>{if(name!=='fetchMoreCloudRepo')throw Error('Unexpected cloud probe request');requests++;if(!params.limit||params.sendTimeoutIntv!==10000)throw Error('Cloud request parameters invalid');return P.resolve({data:[{time:1792280000000,imgId:'cloud-probe.jpg',width:100,height:100,size:100}],end:1});});
   const scene=about.renderSceneContent(route),cloud=stateful(new scene.type(scene.props));cloud.componentWillMount();cloud.componentDidMount();mounted.push(cloud);settingNav.props.onDidFocus(route,{});drain();
   if(requests!==1||cloud.assets.length!==1||renderList(cloud,'Cloud files')!==1)throw Error('Cloud route did not load and display server data');
   settingNav.props.navbarMappers.RightButton(route,null,1,null).props.onPress();drain();if(requests!==2||cloud.assets[0][0].imgId!=='cloud-probe.jpg')throw Error('Cloud refresh did not reload server data');cloudLoadingChecked=true;
   replace('send',name=>{throw Error('Unexpected server request in screen probe: '+name);});
  }
  const overlays={},message={msgid:'probe-photo-message',fromId:peer,toId:myId,peer,type:3,time:1792280000000,imgId:'probe-photo.jpg',text:'',stat:2};
  if(typeof apps.openRecoveryStorage==='function'){
   const rootTree=main.render();for(const id of [9003,9006,9007]){const element=find(rootTree,context.require(id));if(!element)throw Error('Feature '+id+' not reachable from Main');overlays[id]=mount(element);}
   replace('recoveryHistoryQuery',()=>P.resolve({items:[message],hasMore:false}));
   replace('recoveryGlobalSearch',()=>P.resolve({contacts:[{friendId:peer,name:'Probe Friend',note:'Probe Remark'}],messages:[message],hasMore:false}));
   const file={key:'probe-file',path:'/documents/cachedImages/probe-photo.jpg',name:'probe-photo.jpg',kind:'images',size:123,messages:[message]};
   const snapshot={token:'probe-token',ownerId:myId,bytes:123,fileCount:1,messageCount:1,issues:[],files:[file],chats:[{key:peer,peer,bytes:123,fileCount:1,messageCount:1,attachmentCount:1,fileKeys:[file.key],messageIds:[message.msgid]}]};
   replace('recoveryStorageScan',()=>P.resolve(snapshot));
   const cache=settings.listData.find(row=>row&&row.name==='CacheSize');if(!cache||cache.label!=='内存管理')throw Error('Memory management entry is missing or mislabeled');cache.onPress();drain();
   const storage=overlays[9006];if(!storage.state.visible||!storage.state.snapshot)throw Error('Storage entry did not show loaded content');if(renderList(storage,'Storage chats')!==1)throw Error('Storage chat row missing');storage.changeMode('files');if(renderList(storage,'Storage files')!==1)throw Error('Storage file row missing');
   storage.setState({menu:'time'});storage.render();storage.choosePeriod('custom');storage.render();storage.setState({menu:null});storage.close();
   const homeScene=friends.renderSceneContent(friends.routes.friends),homeList=new homeScene.type(homeScene.props),homeSearch=homeList.renderRecoveryGlobalSearchBar();homeSearch.props.children.props.onPress();
   const search=overlays[9007];if(!search.state.visible)throw Error('Home search entry did not open its actual overlay');search.setState({keyword:'Probe'});search.search();drain();
   if(search.state.messages.length!==1||search.state.contacts.length!==1)throw Error('Global search did not display results');if(renderList(search,'Global search')!==4)throw Error('Global search rows missing');search.close();
   if(typeof apps.recoveryStorageTimestamp==='function'){
    // Enter through settings, preview its cached photo, invoke the real image
    // long-press callback, then consume the pending context in InteractView.
    const database=context.require(321),oldDatabase=database.db;database.db={};restoreDatabase=()=>{database.db=oldDatabase;};replace('dbIsReady',true);
    replace('recoveryChatContext',()=>P.resolve([message]));let dialog,picture;
    replace('diag',value=>{dialog=value;});replace('closeDiag',callback=>{if(callback)callback();});
    const capture=value=>{picture=value;};apps.on('showModelImage',capture);
    function named(node,name){if(!node)return null;if(Array.isArray(node)){for(const child of node){const match=named(child,name);if(match)return match;}return null;}if(typeof node!=='object')return null;if(node.type&&node.type.displayName===name)return node;return named(node.props&&node.props.children,name);}
    const navigatorElement=friends.render(),MyNavigator=navigatorElement.type,chatNavigator=stateful(new MyNavigator(navigatorElement.props));chatNavigator.navi={push(){},pop(){},popToRoute(){},popToTop(){}};navigatorElement.ref(chatNavigator);
    tabs.onPressAboutMeTab();cache.onPress();drain();storage.openChat(storage.items()[0]);storage.showFile(storage.items()[0]);drain();
    if(!picture||!picture.recoveryMessage)throw Error('Storage photo preview lost its message identity');
    const imageElement=named(main.render(),'ModelImageView'),image=stateful(new imageElement.type(imageElement.props));image.curProps=picture;image.state.imgId=picture.imgId;image.state.uri=picture.uri;image.onRecoveryImageLongPress();drain();
    if(!dialog||!dialog.buttons.some(button=>button.text==='定位到聊天位置'))throw Error('Image long press did not show location action');
    dialog.buttons.find(button=>button.text==='定位到聊天位置').onPress();drain();apps.unon('showModelImage',capture);
    const route=chatNavigator.curRoute,scene=friends.renderSceneContent(route);
    if(main.state.friendsNavFlex!==1||!scene||scene.type!==context.require(362).InteractView)throw Error('Storage image location opened no visible conversation');
    chatNavigator.onWillFocus(route);
    replace('loadNewMsgCounter',()=>P.resolve());replace('loadMsgsData',()=>{});replace('hasPeopleApproves',()=>P.resolve(true));replace('changeChatInputPlaceHolder',()=>{});
    const chat=stateful(new scene.type(scene.props));chat.componentWillMount();chat.componentDidMount();mounted.push(chat);drain();
    if(chat.recoveryLocatedMessage!==message.msgid||chat.state.dataSource.getRowCount()!==1)throw Error('Located conversation did not load the selected message');
    if(renderList(chat,'Located conversation')!==1)throw Error('Located conversation displayed no message rows');
    chatNavigator.onDidFocus(route);storageImageLocationChecked=true;
    replace('addBottleAlert',()=>{});chatNavigator.lock=false;chatNavigator.navBack();drain();
    if(main.state.aboutMeNavFlex!==1||!storage.state.visible||storage.state.mode!=='files'||storage.state.focusPeer!==peer)throw Error('Back from located photo did not resume the exact storage source');
   }
  }
  tabs.onPressFriendsTab();if(main.state.friendsNavFlex!==1)throw Error('Returning to conversation tab did not restore it');
  const results={settingsRows};
  for(const [label,id]of [['contact',peer],['stranger',stranger],['selfProfile',myId],['group',group]]){
   const route={id:'about_probe_'+label,friendId:id,name:cfg.tr('Profile')};
   const view=mount(friends.renderSceneContent(route));friends.render().props.onDidFocus(route,{});results[label+'Rows']=verify(view,label+' profile');
   if(id===peer&&typeof apps.openRecoveryHistory==='function'){
    const userId=view.listData.find(row=>row&&row.name==='profileUserId');if(!userId||userId.value!==peer)throw Error('Contact profile lost the full user ID');
    const history=view.listData.find(row=>row&&row.label==='查看聊天记录');if(!history)throw Error('Contact profile lost the chat-history entry');
    if(view.listData.some(row=>row&&row.name==='recoveryConnectionIp'))throw Error('Removed connection-IP row reappeared');
    const phone=view.listData.find(row=>row&&row.name==='profilePhoneNumber');if(typeof apps.openRecoveryStorage==='function'&&(!phone||phone.value!==profiles[peer].phoneNum||view.listData.indexOf(phone)!==view.listData.indexOf(userId)+1))throw Error('Returned profile phone was not shown below ID');
    if(overlays[9003]){history.onPress();drain();const historyView=overlays[9003];if(!historyView.state.visible||historyView.state.items.length!==1)throw Error('Profile history entry did not show loaded content');if(renderList(historyView,'History messages')!==1)throw Error('History message row missing');historyView.mode('images');drain();if(renderList(historyView,'History images')!==1)throw Error('History image row missing');historyView.close();}
   }
  }
  return {profileRoutesChecked:true,profileRowsRendered:results,featureEntryRoutesChecked:Object.keys(overlays).length===3,storageImageLocationChecked,cloudLoadingChecked};
 }finally{
  for(const view of mounted.reverse())if(view.componentWillUnmount)view.componentWillUnmount();
  if(restoreDatabase)restoreDatabase();
  for(const [name,saved]of original){if(saved.exists)apps[name]=saved.value;else delete apps[name];}
 }
}
function checkBundle(text,inspect){
 if(!text.startsWith(fragment))throw Error('JavaScript runtime prefix changed');
 const logs=[],native=nativeModules(logs),context={__fbBatchedBridgeConfig:{remoteModuleConfig:[]},nativeLoggingHook:(message,level)=>{if(level>=3)logs.push({message});},nativePerformanceNow:()=>0};context.global=context;
 vm.createContext(context);vm.runInContext(fragment,context,{timeout:5000});
 const define=context.__d;
 context.__d=(id,factory)=>define(id,id===31?(g,r,m)=>{m.exports=native;}:factory);
 vm.runInContext(text.slice(fragment.length).replace(/;require\(133\);\s*;require\(0\);[\s\S]*$/,''),context,{timeout:5000,filename:'bundle.js'});
 vm.runInContext('require(133);ErrorUtils.setGlobalHandler(function(error){throw error;});require(0);',context,{timeout:5000,filename:'startup.js'});
 const keys=Array.from(context.require(312).AppRegistry.getAppKeys());
 if(!keys.includes('eggf'))throw Error('Application entry was not registered');
 const Main=context.require(310).default,main=new Main({});main.render();main.state.quickLaunch=false;main.render();
 const apps=context.require(316).default;apps.userid='startup-test';let historyRendered=false,settingsRendered=false;
 if(typeof apps.openRecoveryHistory==='function'){
  const History=context.require(9003),history=new History({});history.options={ownerId:apps.userid,friendId:'peer'};history.state.visible=true;
  history.render();history.state.mode='images';history.render();historyRendered=true;
  const Accounts=context.require(355).SuSelectView,accounts=new Accounts({type:'muid',route:{id:'suSelect_startup',type:'muid'}});accounts.render();
  const Cloud=context.require(358).CloudRepoPicBoard,cloud=new Cloud({});cloud.render();
  const Navigator=context.require(343).AboutMeNavigator,navigator=new Navigator({});navigator.navbarMappers();settingsRendered=true;
  if(typeof apps.openRecoveryStorage==='function'){
   const Storage=context.require(9006),storage=new Storage({});storage.options={ownerId:apps.userid};storage.state.visible=true;storage.render();storage.state.mode='files';storage.render();
   const Global=context.require(9007),globalSearch=new Global({});globalSearch.options={ownerId:apps.userid};globalSearch.state.visible=true;globalSearch.render();
  }
 }
 const navigation=checkNavigation(context,main,apps);
 const profiles=checkProfilePages(context,main,apps);
 if(inspect)inspect({context,apps,main});
 if(logs.length)throw Error('JavaScript startup reported errors: '+logs.map(x=>x.message).join('; '));
 return {registered:keys,mainRendered:true,historyRendered,settingsRendered,...navigation,...profiles,nativeInterfacesMocked:true,iosExecuted:false};
}
module.exports={checkBundle};
if(require.main===module){
 try{console.log(JSON.stringify(checkBundle(fs.readFileSync(process.argv[2]||root+'/Xingkong/Resources/main.jsbundle','utf8'))));}
 catch(error){console.error(error.stack);process.exitCode=1;}
}
