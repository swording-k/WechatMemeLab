import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import{readFileSync}from'node:fs';
function client({createError=false,blocked=false,restored=false,missing=false}={}){
 let page,creates=0,queries=0,downloaded=0,handoff,navigated;const record=restored?{id:'12345678-1234-4234-8234-123456789abc',mode:'describe',caption:'我没笑'}:undefined;
 const api={request:async(op,data)=>{if(op==='config')return{available:true};if(op==='prepare'&&missing)throw Error('network');if(op==='prepare')return{uploads:{image:{},reference:{}}};if(op==='create'){creates++;if(createError)throw Error('network');return{status:'queued'};}if(op==='query'){queries++;if(missing)throw Object.assign(Error('任务不存在'),{status:404});return{id:data.id,status:'success'};}if(op==='result')return{url:'https://bucket.example/result.mp4'};},upload:async()=>{},download:async()=>{downloaded++;return'user/motion-result.mp4';},handoff:(...x)=>handoff=x};
 vm.runInNewContext(readFileSync('miniprogram/pages/motion/index.js','utf8'),{Page:p=>page=p,require:p=>p.includes('motion-api')?api:{check:async()=>{if(blocked)throw Error('内容未通过');return'receipt';}},wx:{getStorageSync:()=>record,setStorageSync(){},removeStorageSync(){},showToast(){},navigateTo:o=>navigated=o.url},setTimeout,clearTimeout});
 const p={...page,data:{...page.data,photoPath:'photo',available:true,prompt:'憋笑'},image:{path:'photo',data:'base64',type:'image/jpeg'},visible:true,setData(x){Object.assign(this.data,x)}};
 return {p,get creates(){return creates},get queries(){return queries},get downloaded(){return downloaded},get handoff(){return handoff},get navigated(){return navigated}};
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
test('video editor accepts only matching local AI handoff and preserves caption',async()=>{
 let definition;const saved={id:'12345678-1234-4234-8234-123456789abc',path:'user/motion-result.mp4',caption:'我没笑'};
 vm.runInNewContext(readFileSync('miniprogram/pages/video/index.js','utf8'),{Page:p=>definition=p,wx:{env:{USER_DATA_PATH:'user'},getStorageSync:()=>saved},require:()=>({}),setTimeout,clearTimeout});
 let accepted;const p={...definition,data:{...definition.data},setData(x){Object.assign(this.data,x)},useVideo:async f=>accepted=f,error:e=>{throw e;}};
 await p.onLoad({motion:saved.id});assert.equal(accepted.tempFilePath,saved.path);assert.equal(p.data.caption,'我没笑');await assert.rejects(p.onLoad({motion:'wrong'}),/失效/);
});

test('a definitely missing task can escape recovery and generate again instead of being stuck pending',async()=>{const c=client({missing:true});await c.p.generate();assert.equal(c.p.data.pending,true);await c.p.resume();assert.equal(c.p.data.pending,false);assert.equal(c.p.data.jobId,'');});
test('returning to a visible page resumes polling the existing task without creating another',async()=>{const c=client();c.p.loaded=true;c.p.setData({jobId:'12345678-1234-4234-8234-123456789abc',pending:true});c.p.onHide();c.p.onShow();await new Promise(r=>setImmediate(r));assert.equal(c.queries,1);assert.equal(c.creates,0);});
