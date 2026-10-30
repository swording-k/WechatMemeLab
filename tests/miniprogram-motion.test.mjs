import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import{readFileSync}from'node:fs';
function client({createError=false,blocked=false,restored=false,missing=false,resultKind='video',outputBlocked=false}={}){
 let page,creates=0,queries=0,downloaded=0,handoff,navigated,saved=0;const record=restored?{id:'12345678-1234-4234-8234-123456789abc',mode:'describe',caption:'我没笑'}:undefined;
 const api={request:async(op,data)=>{if(op==='config')return{available:true};if(op==='prepare'&&missing)throw Error('network');if(op==='prepare')return{uploads:data.mode==='draw'?{}:{image:{},reference:{}}};if(op==='create'){creates++;if(createError)throw Error('network');return{status:'queued'};}if(op==='query'){queries++;if(missing)throw Object.assign(Error('任务不存在'),{status:404});return{id:data.id,status:'success'};}if(op==='result')return{kind:resultKind,url:'https://bucket.example/result.mp4'};},image:async path=>({path,type:'image/jpeg',data:'new-image'}),upload:async()=>{},download:async()=>{downloaded++;return resultKind==='image'?'user/motion-image.png':'user/motion-result.mp4';},handoff:(...x)=>handoff=x};
 vm.runInNewContext(readFileSync('miniprogram/pages/motion/index.js','utf8'),{Page:p=>page=p,require:p=>p.includes('motion-api')?api:{checkPhoto:async()=>{if(outputBlocked)throw Error('内容包含违规信息，请修改后重试')},check:async()=>{if(blocked)throw Error('内容未通过');return'receipt';}},wx:{getStorageSync:()=>record,setStorageSync(){},removeStorageSync(){},showToast(){},saveImageToPhotosAlbum:async()=>{saved++},navigateTo:o=>navigated=o.url},setTimeout,clearTimeout});
 const p={...page,data:{...page.data,photoPath:'photo',available:true,prompt:'憋笑'},image:{path:'photo',data:'base64',type:'image/jpeg'},visible:true,setData(x){Object.assign(this.data,x)}};
 return {p,get saved(){return saved},get creates(){return creates},get queries(){return queries},get downloaded(){return downloaded},get handoff(){return handoff},get navigated(){return navigated}};
}
test('native AI creation obtains one job, resumes download, and hands caption to existing editor',async()=>{
 const c=client();await c.p.generate();assert.equal(c.creates,1);assert.equal(c.downloaded,1);assert.equal(c.p.data.pending,false);c.p.edit();assert.match(c.navigated,/pages\/video\/index\?motion=/);assert.equal(c.handoff[1],'user/motion-result.mp4');
});
test('unknown create is kept pending; retry queries original ID instead of another paid creation',async()=>{
 const c=client({createError:true});await c.p.generate();const id=c.p.data.jobId;assert.equal(c.p.data.pending,true);await c.p.generate();assert.equal(c.creates,1);await c.p.resume();assert.equal(c.p.data.jobId,id);assert.equal(c.queries,1);assert.equal(c.creates,1);
});
test('risky input never uploads or creates an AI job; restored job can be queried after reopening',async()=>{
 const bad=client({blocked:true});await bad.p.generate();assert.equal(bad.creates,0);assert.equal(bad.p.data.pending,false);
 const c=client({restored:true});await c.p.onLoad();await c.p.resume();assert.equal(c.creates,0);assert.equal(c.downloaded,1);assert.equal(c.p.data.caption,'我没笑');
});
test('tools video editor ignores retired AI handoff parameters',async()=>{
 let definition,read=false;vm.runInNewContext(readFileSync('miniprogram/pages/video/index.js','utf8'),{Page:p=>definition=p,wx:{getStorageSync:()=>{read=true;}},require:()=>({}),setTimeout,clearTimeout});definition.onLoad({motion:'old-task'});assert.equal(read,false);
});

test('a definitely missing task can escape recovery and generate again instead of being stuck pending',async()=>{const c=client({missing:true});await c.p.generate();assert.equal(c.p.data.pending,true);await c.p.resume();assert.equal(c.p.data.pending,false);assert.equal(c.p.data.jobId,'');});
test('returning to a visible page resumes polling the existing task without creating another',async()=>{const c=client();c.p.loaded=true;c.p.setData({jobId:'12345678-1234-4234-8234-123456789abc',pending:true});c.p.onHide();c.p.onShow();await new Promise(r=>setImmediate(r));assert.equal(c.queries,1);assert.equal(c.creates,0);});


test('text-only image creation needs no photo, saves only checked output, and animates only on a separate click',async()=>{
 const c=client({resultKind:'image'});c.p.image=undefined;c.p.setData({mode:'draw',photoPath:'',prompt:'小恐龙吃面'});await c.p.generate();assert.equal(c.creates,1);assert.equal(c.p.data.resultKind,'image');assert.equal(c.p.data.pictureReady,true);
 await c.p.savePicture();assert.equal(c.saved,1);c.p.edit();assert.equal(c.navigated,undefined);
 await c.p.animatePicture();assert.equal(c.creates,1);assert.equal(c.p.data.mode,'describe');assert.equal(c.p.data.prompt,'');assert.equal(c.p.data.jobId,'');assert.ok(c.p.data.photoPath);
});
test('AI output rejected by content check cannot be saved or used as a generated picture',async()=>{
 const c=client({resultKind:'image',outputBlocked:true});c.p.visible=false;await c.p.generate();assert.equal(c.p.data.pictureReady,false);await c.p.savePicture();assert.equal(c.saved,0);assert.equal(c.p.data.pending,false);c.p.reset();assert.equal(c.p.data.jobId,'');
});
