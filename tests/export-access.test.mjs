import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createLedger}=require('../miniprogram/lib/export-ledger.js');
function setup(policy={enabled:true,dailyFree:3,adUnitId:'adunit-test'}){
 let state,clock=Date.parse('2026-10-26T15:59:00Z'),reads=0,writes=0;
 const ledger=createLedger({policy,read:()=>{reads++;return state&&structuredClone(state);},write:s=>{writes++;state=structuredClone(s);},now:()=>clock});
 return {ledger,get state(){return state},get reads(){return reads},get writes(){return writes},nextDay(){clock+=120000;}};
}
test('disabled or unconfigured policy never reads storage or limits exports',()=>{
 for(const policy of [{enabled:false,dailyFree:3,adUnitId:'adunit-test'},{enabled:true,dailyFree:3,adUnitId:''}]){
  const c=setup(policy);for(let i=0;i<5;i++)c.ledger.begin().commit();assert.equal(c.ledger.snapshot().enabled,false);assert.equal(c.reads,0);assert.equal(c.writes,0);
 }
});
test('one shared ledger counts successful exports only, rejects concurrent reservations and exhausted quota',()=>{
 const c=setup(),l=c.ledger;const a=l.begin();assert.throws(()=>l.begin(),/正在生成/);a.release();assert.equal(l.snapshot().remaining,3);
 for(let i=0;i<3;i++){const p=l.begin();p.commit();p.commit();p.release();}
 assert.equal(l.snapshot().remaining,0);assert.throws(()=>l.begin(),e=>e.code==='AD_REQUIRED');
});
test('Beijing midnight resets daily free count; an in-flight success counts in completion day',()=>{
 const c=setup(),l=c.ledger;l.begin().commit();l.begin().commit();const pending=l.begin();c.nextDay();pending.commit();assert.equal(l.snapshot().remaining,2);assert.equal(c.state.day,'2026-10-27');
});
test('reward is retained after failed generation, consumed once after success and survives module recreation',()=>{
 const c=setup(),l=c.ledger;for(let i=0;i<3;i++)l.begin().commit();l.reward();const p=l.begin();p.release();assert.equal(l.snapshot().rewards,1);const retry=l.begin();retry.commit();retry.commit();assert.equal(l.snapshot().rewards,0);
 const restored=createLedger({policy:{enabled:true,dailyFree:3,adUnitId:'adunit-test'},read:()=>c.state,write:()=>{},now:()=>Date.parse('2026-10-26T15:59:00Z')});assert.throws(()=>restored.begin(),e=>e.code==='AD_REQUIRED');
});
test('storage failure never reports successful consumption and releases the reservation',()=>{
 const l=createLedger({policy:{enabled:true,dailyFree:3,adUnitId:'adunit-test'},read:()=>undefined,write:()=>{throw Error('disk full');}});const p=l.begin();assert.throws(()=>p.commit(),/次数.*保存/);p.release();assert.doesNotThrow(()=>l.begin().release());
});
