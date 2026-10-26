import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function client({enabled=true}={}) {
 let state,reads=0,written=0,checked=0,block=false,writeFail=false,consent=false,adShows=0,hideDuringWrite=false;
 const wx={env:{USER_DATA_PATH:'user'},showToast(){},saveImageToPhotosAlbum:async()=>({}),getStorageSync(){reads++;return state&&structuredClone(state);},setStorageSync(k,s){state=structuredClone(s);},showModal:async()=>({confirm:consent}),getFileSystemManager:()=>({unlink(){}}),
  createRewardedVideoAd(){let close;return{onClose(f){close=f},onError(){},offClose(){},offError(){},destroy(){},async show(){adShows++;queueMicrotask(()=>close({isEnded:true}));},async load(){}};}};
 const accessModule={exports:{}};
 vm.runInNewContext(readFileSync('miniprogram/lib/export-access.js','utf8'),{module:accessModule,wx,require:p=>p.includes('export-policy')?{enabled,dailyFree:3,adUnitId:'adunit-test'}:require('../miniprogram/lib/'+p.replace('./',''))});
 const access=accessModule.exports;
 function page(kind) {
  let definition;
  vm.runInNewContext(readFileSync(`miniprogram/pages/${kind}/index.js`,'utf8'),{Page:p=>definition=p,wx,setTimeout,clearTimeout,Uint8Array,require:p=>{
   if(p.endsWith('export-access'))return access;
   if(p.endsWith('security'))return{checkFrames:async()=>{checked++;if(block)throw Error('内容未通过');}};
   if(p.endsWith('engine'))return{defaults:{template:'test'},templates:[{id:'test',suggestions:[]}],DURATION:1200,drawFrame(){},encodeGif:()=>new Uint8Array([71,73,70])};
   if(p.endsWith('files'))return{writeBytes:async()=>{if(writeFail)throw Error('disk full');written++;if(hideDuringWrite)activePage.onHide();}};
   return{};
  }});
  const p={...definition,data:{...definition.data,ready:true,exportSize:2,path:'video.mp4'},settings:{caption:'',speed:1},photo:{},off:{},offCtx:{getImageData:()=>({data:new Uint8Array(16)})},alive:true,setData(v){Object.assign(this.data,v)},stop(){},start(){},stopPlayback(){},frames:async()=>({width:2,height:2,delay:100,caption:'',frames:[new Uint8Array(16)]})};
  p.onShow();return p;
 }
 let activePage;
 return{page,run:async p=>{activePage=p;return p.exportGif?p.exportGif():p.generate();},get state(){return state},get reads(){return reads},get written(){return written},get checked(){return checked},get adShows(){return adShows},block:v=>block=v,failWrite:v=>writeFail=v,consent:v=>consent=v,hideDuringWrite:()=>hideDuringWrite=true};
}
test('photo and video pages share three successful exports, then cancel leaves work unprocessed',async()=>{
 const c=client(),photo=c.page('editor'),video=c.page('video');await c.run(photo);await c.run(video);await c.run(photo);assert.equal(c.state.used,3);const before=c.checked;await c.run(video);assert.equal(c.checked,before);assert.equal(c.written,3);assert.match(video.data.status,/已取消/);assert.equal(video.data.busy,false);photo.refreshExportUsage();assert.match(photo.data.exportUsage,/0\/3/);
});
test('default disabled still exports both kinds repeatedly without touching allowance storage',async()=>{
 const c=client({enabled:false}),photo=c.page('editor'),video=c.page('video');for(let i=0;i<4;i++){await c.run(photo);await c.run(video);}assert.equal(c.written,8);assert.equal(c.reads,0);assert.equal(photo.data.exportUsage,'');assert.equal(video.data.exportUsage,'');
});
test('content and file failures release allowance; a completed ad survives failed generation',async()=>{
 const c=client(),p=c.page('video');c.block(true);await c.run(p);assert.equal(c.state,undefined);c.block(false);c.failWrite(true);await c.run(p);assert.equal(c.state,undefined);c.failWrite(false);for(let i=0;i<3;i++)await c.run(p);c.consent(true);c.block(true);await c.run(p);assert.equal(c.adShows,1);assert.equal(c.state.rewards,1);c.block(false);await c.run(p);assert.equal(c.adShows,1);assert.equal(c.state.rewards,0);assert.equal(c.written,4);
});
test('navigating away while writing never spends quota or exposes a cancelled output',async()=>{
 for(const kind of ['editor','video']){const c=client(),p=c.page(kind);c.hideDuringWrite();await c.run(p);assert.equal(c.state,undefined);assert.equal(p.data.gifPath,'');assert.match(p.data.status,/已取消/);}
});
test('saving an existing GIF repeatedly never spends another free export',async()=>{
 for(const kind of ['editor','video']){const c=client(),p=c.page(kind);await c.run(p);const before=structuredClone(c.state);await p.saveGif();await p.saveGif();assert.deepEqual(c.state,before);assert.equal(c.written,1);}
});
