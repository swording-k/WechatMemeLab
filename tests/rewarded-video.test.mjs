import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createRewardedVideo}=require('../miniprogram/lib/rewarded-video.js');
function client({showFails=0,loadFails=false}={}){
 let close,error,shows=0,loads=0,destroyed=0;
 const ad={onClose:f=>close=f,onError:f=>error=f,offClose:f=>{if(close===f)close=null;},offError:f=>{if(error===f)error=null;},destroy:()=>destroyed++,show:async()=>{shows++;if(shows<=showFails)throw Error('not loaded');},load:async()=>{loads++;if(loadFails)throw Error('no fill');}};
 const video=createRewardedVideo({wx:{createRewardedVideoAd:()=>ad},adUnitId:'adunit-test',timeoutMs:100});
 return {video,close:r=>close?.(r),error:r=>error?.(r),get shows(){return shows},get loads(){return loads},get destroyed(){return destroyed}};
}
test('show success does not reward until a full close; duplicate close cannot settle another reward',async()=>{
 const c=client();let settled=false;const p=c.video.watch().then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);c.close({isEnded:true});c.close({isEnded:true});await p;assert.equal(settled,true);
});
test('early and undefined close never count as completed watching',async()=>{
 for(const result of [{isEnded:false},undefined]){const c=client(),p=c.video.watch();c.close(result);await assert.rejects(p,/完整观看/);}
});
test('show failure loads and retries once; no fill returns actionable failure',async()=>{
 const c=client({showFails:1});const p=c.video.watch();await new Promise(r=>setImmediate(r));assert.equal(c.loads,1);assert.equal(c.shows,2);c.close({isEnded:true});await p;
 const no=client({showFails:1,loadFails:true});await assert.rejects(no.video.watch(),/暂时没有可用广告/);
});
test('active watch rejects duplicates and disposal cancels without reward or stale listeners',async()=>{
 const c=client(),p=c.video.watch();await assert.rejects(c.video.watch(),/正在播放/);c.video.dispose();await assert.rejects(p,/取消/);assert.equal(c.destroyed,1);c.close({isEnded:true});await assert.rejects(c.video.watch(),/已关闭/);
});
test('unsupported API and ad errors do not resolve rewards',async()=>{
 const v=createRewardedVideo({wx:{},adUnitId:'adunit-test'});await assert.rejects(v.watch(),/更新微信/);
 const c=client(),p=c.video.watch();c.error({errCode:1004});await assert.rejects(p,/暂时没有可用广告/);
});
test('a missing close event times out instead of holding the editor forever',async()=>{
 const c=client();await assert.rejects(c.video.watch(),/超时/);
});
test('disposing before show starts prevents a stale asynchronous show',async()=>{
 const c=client(),p=c.video.watch();c.video.dispose();await assert.rejects(p,/取消/);await Promise.resolve();assert.equal(c.shows,0);
});
