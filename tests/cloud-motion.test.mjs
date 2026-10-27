import test from 'node:test';import assert from 'node:assert/strict';
import {createMotion} from '../cloudfunctions/meme-motion/service.mjs';
function client({reject=false,unknown=false,budget=3,maxJobs=4,running=false,baseCost=0,budgetEnforced=true,activeScope='global'}={}){
 const rows=new Map();let clock=Date.now(),quota={count:0,cost:baseCost},queue=Promise.resolve(),creates=0,downloads=0,removed=0;
 const store={read:async id=>structuredClone(rows.get(id)),info:async()=>({...quota}),atomic(id,fn){const p=queue.then(()=>{const context={row:structuredClone(rows.get(id)),quota:{...quota}},value=fn(context);if(context.row)rows.set(id,structuredClone(context.row));quota=context.quota;return value;});queue=p.catch(()=>{});return p;}};
 const storage={ticket:async(path)=>({fileId:'cloud://'+path,url:'https://bucket.cos.ap-shanghai.myqcloud.com',cloudPath:path,formData:{}}),read:async()=>Buffer.from('photo'),remove:async files=>{removed+=files.length;},save:async()=>{downloads++;return'cloud://result'},url:async()=> 'https://bucket.cos.ap-shanghai.myqcloud.com/result'};
 const provider={create:async()=>{creates++;if(reject)throw Object.assign(Error('no'),{rejected:true});if(unknown)throw Error('network');return'upstream'},query:async()=>running?({status:'processing'}):({status:'success',videoUrl:'https://dashscope-test.oss-cn-beijing.aliyuncs.com/result.mp4'}),download:async()=>Buffer.from('video')};
 const service=createMotion({store,storage,provider,budget,maxJobs,budgetEnforced,activeScope,now:()=>clock,validate:async x=>({...x,image:'data:image/jpeg;base64,cGhvdG8=',imageBytes:x.imageBytes,imageType:'image/jpeg',cost:.3}),verifyInput:async(uid,data)=>{if(data.receipt!=='valid-'+uid)throw Error('素材检测凭证无效');},inspectResult:async()=>({width:240,height:240,duration:2})});
 return {service,rows,advance:ms=>clock+=ms,get creates(){return creates},get downloads(){return downloads},get removed(){return removed},get quota(){return quota}};
}
const id='12345678-1234-4234-8234-123456789abc';
test('cloud draft and query enforce owner and never expose provider task ID',async()=>{
 const c=client();await c.service.prepare('alice',{id,mode:'describe'});await assert.rejects(c.service.query('bob',id),/不存在/);await assert.rejects(c.service.prepare('bob',{id,mode:'describe'}),/不存在/);
 const r=await c.service.create('alice',{id,prompt:'憋笑',receipt:'valid-alice'});assert.equal(r.status,'queued');assert.equal(r.taskId,undefined);assert.equal(c.creates,1);
});
test('cloud concurrent submit is idempotent and rejects changed prompt',async()=>{
 const c=client();await c.service.prepare('alice',{id,mode:'describe'});await Promise.all([c.service.create('alice',{id,prompt:'笑',receipt:'valid-alice'}),c.service.create('alice',{id,prompt:'笑',receipt:'valid-alice'})]);assert.equal(c.creates,1);assert.equal(c.quota.count,1);await assert.rejects(c.service.create('alice',{id,prompt:'改了',receipt:'valid-alice'}),/内容已变化/);
});
test('invalid content receipt and exhausted budget do not create paid provider jobs',async()=>{
 const c=client({budget:.2});await c.service.prepare('alice',{id,mode:'describe'});await assert.rejects(c.service.create('alice',{id,prompt:'笑',receipt:'bad'}),/凭证/);await assert.rejects(c.service.create('alice',{id,prompt:'笑',receipt:'valid-alice'}),/额度/);assert.equal(c.creates,0);
});
test('unknown submission keeps reservation and never retries upstream; definitive reject releases it',async()=>{
 for(const unknown of [true,false]){const c=client({unknown,reject:!unknown});await c.service.prepare('alice',{id,mode:'describe'});const x={id,prompt:'笑',receipt:'valid-alice'};const r=await c.service.create('alice',x);assert.equal(r.status,unknown?'unknown':'failed');await c.service.create('alice',x);assert.equal(c.creates,1);assert.equal(c.quota.cost,unknown?.3:0);}
});
test('successful result is owner-only, cached in own storage, and inputs are removed',async()=>{
 const c=client();await c.service.prepare('alice',{id,mode:'describe'});await c.service.create('alice',{id,prompt:'笑',receipt:'valid-alice'});await c.service.query('alice',id);await assert.rejects(c.service.result('bob',id),/不存在/);const r=await c.service.result('alice',id);assert.equal(r.duration,2);assert.match(r.url,/myqcloud/);await c.service.result('alice',id);assert.equal(c.downloads,1);assert.ok(c.removed>=1);
});
test('a second active job cannot spend money concurrently with the first',async()=>{
 const c=client({running:true}),other='22345678-1234-4234-8234-123456789abc';await c.service.prepare('alice',{id,mode:'describe'});await c.service.create('alice',{id,prompt:'笑',receipt:'valid-alice'});await c.service.prepare('bob',{id:other,mode:'describe'});await assert.rejects(c.service.create('bob',{id:other,prompt:'笑',receipt:'valid-bob'}),/任务/);assert.equal(c.creates,1);
});

test('expired active job releases the service lock without refunding unknown costs',async()=>{const c=client({running:true}),other='32345678-1234-4234-8234-123456789abc';await c.service.prepare('alice',{id,mode:'describe'});await c.service.create('alice',{id,prompt:'笑',receipt:'valid-alice'});c.advance(25*3600000);await c.service.prepare('bob',{id:other,mode:'describe'});await c.service.create('bob',{id:other,prompt:'笑',receipt:'valid-bob'});assert.equal(c.creates,2);assert.equal(c.quota.cost,.6);});
test('new submission reconciles a completed upstream task even when its owner never came back',async()=>{const c=client(),other='42345678-1234-4234-8234-123456789abc';await c.service.prepare('alice',{id,mode:'describe'});await c.service.create('alice',{id,prompt:'笑',receipt:'valid-alice'});await c.service.prepare('bob',{id:other,mode:'describe'});await c.service.create('bob',{id:other,prompt:'笑',receipt:'valid-bob'});assert.equal(c.creates,2);});

test('last image allowance tolerates floating point residue but never a real shortfall',async()=>{
 const c=client({baseCost:2.8000000000000003,maxJobs:100});const info=await c.service.info();assert.equal(info.remaining,1);assert.equal(info.available,true);
 assert.equal((await client({baseCost:2.81,maxJobs:100}).service.info()).available,false);
 assert.equal((await client({baseCost:3,maxJobs:100}).service.info()).available,false);
});

test('explicit unrestricted test mode ignores spend and count caps while keeping identity and deduplication',async()=>{
 const c=client({budget:0,maxJobs:0,baseCost:15,budgetEnforced:false});const info=await c.service.info();assert.equal(info.available,true);assert.equal(info.remaining,null);assert.equal(info.budgetEnforced,false);
 await c.service.prepare('alice',{id,mode:'describe'});await assert.rejects(c.service.create('alice',{id,prompt:'笑',receipt:'bad'}),/凭证/);
 const input={id,prompt:'笑',receipt:'valid-alice'};await c.service.create('alice',input);await c.service.create('alice',input);assert.equal(c.creates,1);
 await c.service.query('alice',id);const other='52345678-1234-4234-8234-123456789abc';await c.service.prepare('alice',{id:other,mode:'describe'});await c.service.create('alice',{...input,id:other});assert.equal(c.creates,2);assert.equal(c.quota.count,2);assert.ok(c.quota.cost>15);assert.equal((await c.service.info()).available,true);
});

test('invited web testers have independent in-flight locks while one tester still cannot double-submit',async()=>{const c=client({running:true,budgetEnforced:false,activeScope:'user'}),b='62345678-1234-4234-8234-123456789abc',a2='72345678-1234-4234-8234-123456789abc';await c.service.prepare('alice',{id,mode:'describe'});await c.service.create('alice',{id,prompt:'笑',receipt:'valid-alice'});await c.service.prepare('bob',{id:b,mode:'describe'});await c.service.create('bob',{id:b,prompt:'笑',receipt:'valid-bob'});assert.equal(c.creates,2);await c.service.prepare('alice',{id:a2,mode:'describe'});await assert.rejects(c.service.create('alice',{id:a2,prompt:'笑',receipt:'valid-alice'}),/任务/);assert.equal(c.creates,2);c.advance(25*3600000);await c.service.prepare('alice',{id:'82345678-1234-4234-8234-123456789abc',mode:'describe'});await c.service.create('alice',{id:'82345678-1234-4234-8234-123456789abc',prompt:'笑',receipt:'valid-alice'});assert.equal(c.creates,3);});
