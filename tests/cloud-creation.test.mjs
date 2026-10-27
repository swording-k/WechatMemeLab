import test from 'node:test';import assert from 'node:assert/strict';
import {createMotion} from '../cloudfunctions/meme-motion/service.mjs';
const id='12345678-1234-4234-8234-123456789abc';
function setup(){
 const rows=new Map();let quota={count:0,cost:0},calls=0,tickets=0,reads=0,checked,saves=0;
 const service=createMotion({store:{read:async id=>rows.get(id),info:async()=>quota,atomic:async(id,fn)=>{const s={row:rows.get(id),quota};const r=fn(s);if(s.row)rows.set(id,s.row);quota=s.quota;return r;}},
 storage:{ticket:async p=>{tickets++;return{fileId:p}},read:async()=>{reads++;return Buffer.from('photo')},remove:async()=>{},save:async p=>{saves++;return p},url:async p=>'https://bucket.example/'+p},
 provider:{create:async()=>{calls++;return'task'},query:async()=>({status:'success',imageUrl:'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/x.png'}),downloadImage:async()=>Buffer.from('image')},
 validate:async x=>({...x,cost:.2}),verifyInput:async(uid,data)=>{checked=data;if(data.receipt!=='valid')throw Error('凭证无效')},inspectImage:()=>({width:1280,height:1280}),inspectResult:()=>{throw Error('image used video parser')},budget:1,maxJobs:4});
 return{service,get calls(){return calls},get tickets(){return tickets},get reads(){return reads},get checked(){return checked},get saves(){return saves}};
}
test('draw uses a text-only receipt, no upload ticket, and one explicit provider creation',async()=>{
 const c=setup(),draft=await c.service.prepare('alice',{id,mode:'draw'});assert.deepEqual(draft.uploads,{});assert.equal(c.tickets,0);
 await c.service.create('alice',{id,prompt:'小恐龙吃面',receipt:'valid'});assert.equal(c.reads,0);assert.equal(c.checked.imageBytes,undefined);assert.equal(c.calls,1);
 await c.service.query('alice',id);const result=await c.service.result('alice',id);assert.equal(result.kind,'image');assert.equal(result.width,1280);assert.match(result.url,/result\.png/);
 await c.service.result('alice',id);assert.equal(c.saves,1);assert.equal(c.calls,1);await assert.rejects(()=>c.service.result('bob',id),/不存在/);
});
test('edit still requires the selected photo and its matching receipt',async()=>{
 const c=setup();await c.service.prepare('alice',{id,mode:'edit'});assert.equal(c.tickets,1);
 await assert.rejects(()=>c.service.create('alice',{id,prompt:'换装',receipt:'wrong'}),/凭证/);assert.equal(c.calls,0);
 await c.service.create('alice',{id,prompt:'换装',receipt:'valid'});assert.equal(c.checked.imageBytes.toString(),'photo');assert.equal(c.calls,1);
});
