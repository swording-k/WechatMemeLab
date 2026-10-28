import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { reserveUsage, settleUsage } from '../cloudfunctions/meme-motion/usage.mjs';
const accountId=createHash('sha256').update('wechat:alice').digest('hex');
const initial=()=>({wallet:{accountId,available:100,frozen:0,spent:0,credited:100},usage:null});
const request={id:'job1',uid:'alice',points:30,enabled:true,now:100};
test('holds points without mutating input and stores hashed identity only',()=>{
 const state=initial(),r=reserveUsage(state,request);
 assert.equal(state.wallet.available,100);assert.equal(state.usage,null);
 assert.deepEqual(r.wallet,{...state.wallet,available:70,frozen:30,updatedAt:100});
 assert.deepEqual(r.usage,{id:'job1',accountId,points:30,state:'held',createdAt:100});
 assert.ok(!JSON.stringify(r.usage).includes('alice'));
});
test('duplicate hold is idempotent but changed identity or terms conflict',()=>{
 const r=reserveUsage(initial(),request);
 assert.deepEqual(reserveUsage(r,{...request,now:200}),r);
 for(const diff of [{id:'job2'},{uid:'bob'},{points:31}])assert.throws(()=>reserveUsage(r,{...request,...diff}));
});
test('settles a successful job exactly once and conflicting outcomes fail',()=>{
 const held=reserveUsage(initial(),request),r=settleUsage(held,{success:true,now:200});
 assert.equal(held.wallet.frozen,30);assert.equal(r.wallet.available,70);assert.equal(r.wallet.frozen,0);assert.equal(r.wallet.spent,30);assert.equal(r.usage.state,'spent');
 assert.deepEqual(settleUsage(r,{success:true,now:300}),r);
 assert.throws(()=>settleUsage(r,{success:false}));
 assert.deepEqual(reserveUsage(r,request),r);
});
test('failed job refunds once; refund into a negative available balance is allowed',()=>{
 const held=reserveUsage(initial(),request);held.wallet.available=-40;
 const r=settleUsage(held,{success:false,now:200});
 assert.equal(r.wallet.available,-10);assert.equal(r.wallet.frozen,0);assert.equal(r.wallet.spent,0);assert.equal(r.usage.state,'refunded');
 assert.deepEqual(settleUsage(r,{success:false}),r);assert.throws(()=>settleUsage(r,{success:true}));
});
test('free and exempt jobs never reserve or spend wallet points',()=>{
 for(const flags of [{enabled:false},{exempt:true}]){
  const state=initial();state.wallet.available=-100;
  const r=reserveUsage(state,{...request,...flags});assert.deepEqual(r.wallet,state.wallet);
  assert.deepEqual(settleUsage(r,{success:true}).wallet,state.wallet);
  assert.deepEqual(reserveUsage(r,{...request,...flags}),r);
 }
});
test('rejects insufficient funds, invalid identities, invalid integer charges and arithmetic overflow',()=>{
 assert.throws(()=>reserveUsage(initial(),{...request,points:101}));
 for(const points of [0,-1,0.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'30'])assert.throws(()=>reserveUsage(initial(),{...request,points}));
 for(const diff of [{id:''},{uid:''},{uid:'web:guest'}])assert.throws(()=>reserveUsage(initial(),{...request,...diff}));
 const state=initial();state.wallet.frozen=Number.MAX_SAFE_INTEGER;assert.throws(()=>reserveUsage(state,request));
});
test('rejects malformed wallet and inconsistent held amounts without mutation',()=>{
 for(const diff of [{frozen:-1},{spent:-1},{available:0.5},{accountId:'other'}]){
  const state=initial();Object.assign(state.wallet,diff);assert.throws(()=>reserveUsage(state,request));
 }
 const held=reserveUsage(initial(),request);held.wallet.frozen=29;const snapshot=structuredClone(held);assert.throws(()=>settleUsage(held,{success:true}));assert.deepEqual(held,snapshot);
 const overflow=reserveUsage(initial(),request);overflow.wallet.spent=Number.MAX_SAFE_INTEGER;assert.throws(()=>settleUsage(overflow,{success:true}));
});
test('does not settle missing or unknown outcomes or invalid usage records',()=>{
 assert.throws(()=>settleUsage(initial(),{success:true}));
 const held=reserveUsage(initial(),request);
 for(const success of [undefined,null,'unknown',1])assert.throws(()=>settleUsage(held,{success}));
 for(const diff of [{state:'unknown'},{points:0},{accountId:'other'}])assert.throws(()=>settleUsage({...held,usage:{...held.usage,...diff}},{success:false}));
});
test('free paths work without a wallet, and paid retries still validate wallet integrity',()=>{
 const free=reserveUsage({}, {...request,enabled:false});assert.equal(free.wallet,undefined);assert.deepEqual(settleUsage(free,{success:false}),free);
 const held=reserveUsage(initial(),request);held.wallet.spent=-1;assert.throws(()=>reserveUsage(held,request));
 const spent=settleUsage(reserveUsage(initial(),request),{success:true});spent.wallet.frozen=-1;assert.throws(()=>settleUsage(spent,{success:true}));
});
