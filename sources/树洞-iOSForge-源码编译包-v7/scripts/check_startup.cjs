// Execute the real bundled JS entry with mocked native interfaces.
// This checks initialization and React element construction, not iOS execution.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const fragment=fs.readFileSync(root+'/JavaScript/runtime/fragments/000.js','utf8');
const dims={window:{width:375,height:812,scale:3,fontScale:1},screen:{width:375,height:812,scale:3,fontScale:1}};
function nativeModules(logs){
 const noop=()=>{},view=()=>({Constants:{forceTouchAvailable:false},NativeProps:{},bubblingEventTypes:{},directEventTypes:{}});
 const ui=new Proxy({Dimensions:dims,RCTView:view(),customBubblingEventTypes:{},customDirectEventTypes:{},takeSnapshot:noop,ViewManagerNames:[]},{get:(o,k)=>k in o?o[k]:typeof k==='string'&&/^[A-Z]/.test(k)?(o[k]=view()):noop});
 const supplied={UIManager:ui,RNI18n:{locale:'zh-CN'},SourceCode:{scriptURL:'file:///app/main.jsbundle'},PlatformConstants:{forceTouchAvailable:false,osVersion:'16.6',systemName:'iOS'},DeviceInfo:{Dimensions:dims},StatusBarManager:{HEIGHT:44,style:'default',getHeight:cb=>cb({height:44})},RNDeviceInfo:{uniqueId:'probe-device',deviceId:'iPhone10,3',systemName:'iOS',systemVersion:'16.6',model:'iPhone X',appVersion:'2.2.1163',appName:'树洞',buildNumber:'7',bundleId:'co.whou.pick',userAgent:'probe',deviceCountry:'CN',deviceLocale:'zh-CN'},RNFSManager:{DocumentDirectoryPath:'/documents',CachesDirectoryPath:'/cache',MainBundlePath:'/app',TemporaryDirectoryPath:'/tmp',LibraryDirectoryPath:'/library'},ExceptionsManager:{reportSoftException:(message,stack)=>logs.push({message,stack})}};
 const cache={};
 return new Proxy(cache,{get:(o,name)=>{
  if(name in o)return o[name];
  const fields=supplied[name]||{};
  return o[name]=new Proxy(fields,{get:(v,k)=>k==='then'?undefined:k in v?v[k]:typeof k==='symbol'?undefined:(...args)=>{}});
 }});
}
function checkBundle(text){
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
 const apps=context.require(316).default;let historyRendered=false;
 if(typeof apps.openRecoveryHistory==='function'){
  apps.userid='startup-test';const History=context.require(9003),history=new History({});history.options={ownerId:apps.userid,friendId:'peer'};history.state.visible=true;
  history.render();history.state.mode='images';history.render();historyRendered=true;
 }
 if(logs.length)throw Error('JavaScript startup reported errors: '+logs.map(x=>x.message).join('; '));
 return {registered:keys,mainRendered:true,historyRendered,nativeInterfacesMocked:true,iosExecuted:false};
}
module.exports={checkBundle};
if(require.main===module){
 try{console.log(JSON.stringify(checkBundle(fs.readFileSync(process.argv[2]||root+'/Xingkong/Resources/main.jsbundle','utf8'))));}
 catch(error){console.error(error.stack);process.exitCode=1;}
}
