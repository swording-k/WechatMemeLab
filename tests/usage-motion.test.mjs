import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PRICE_VERSION} from '../server/motion/pricing.mjs';
import {createMotion} from '../cloudfunctions/meme-motion/service.mjs';
const id='12345678-1234-1234-1234-123456789abc';
const accountId=createHash('sha256').update('wechat:alice').digest('hex');
function fixture({available=100,billingEnabled=true,billingExempt=()=>false,rejected=false,unknown=false,result='success'}={}){
 const rows=new Map(),events=new Map();let wallet={accountId,available,frozen:0,spent:0},quota={count:0,cost:0},calls=0,clock=1000,queue=Promise.resolve();
 const store={read:async id=>structuredClone(rows.get(id)),info:async()=>structuredClone(quota),atomic(id,fn){const p=queue.then(()=>{const context={row:structuredClone(rows.get(id)),quota:structuredClone(quota),wallet:structuredClone(wallet),usage:structuredClone(events.get(id))};const value=fn(context);if(context.row)rows.set(id,structuredClone(context.row));quota=context.quota;wallet=context.wallet;if(context.usage)events.set(id,structuredClone(context.usage));return value;});queue=p.catch(()=>{});return p;}};
 const service=createMotion({store,storage:{remove:async()=>{}},provider:{create:async()=>{calls++;if(rejected)throw Object.assign(Error('rejected'),{rejected:true});if(unknown)throw Error('network');return 'provider-task';},query:async()=>({status:result,imageUrl:'https://example.com/result.png'})},validate:async x=>({...x,cost:.2}),verifyInput:async()=>{},budgetEnforced:false,billingEnabled,billingExempt,now:()=>clock});
 return{service,rows,get wallet(){return wallet;},get usage(){return events.get(id);},get calls(){return calls;},advance(){clock+=25*3600000;}};
}
const prepare=async f=>f.service.prepare('alice',{id,mode:'draw'});
const create=f=>f.service.create('alice',{id,prompt:'funny cat',acceptedPriceFen:50,priceVersion:PRICE_VERSION});
test('insufficient wallet blocks provider and leaves draft and quota unchanged',async()=>{const f=fixture({available:49});await prepare(f);await assert.rejects(create(f),/点数不足/);assert.equal(f.calls,0);assert.equal(f.rows.get(id).status,'draft');assert.equal(f.wallet.available,49);});
test('real create claims once, freezes once, and success spends once',async()=>{const f=fixture();await prepare(f);await Promise.all([create(f),create(f)]);assert.equal(f.calls,1);assert.equal(f.wallet.available,50);assert.equal(f.wallet.frozen,50);assert.equal(f.usage.state,'held');await f.service.query('alice',id);await f.service.query('alice',id);assert.equal(f.wallet.frozen,0);assert.equal(f.wallet.spent,50);assert.equal(f.usage.state,'spent');});
test('provider explicit rejection refunds the hold',async()=>{const f=fixture({rejected:true});await prepare(f);assert.equal((await create(f)).status,'failed');assert.equal(f.wallet.available,100);assert.equal(f.wallet.frozen,0);assert.equal(f.usage.state,'refunded');});
test('provider final failure refunds the hold',async()=>{const f=fixture({result:'failed'});await prepare(f);await create(f);await f.service.query('alice',id);assert.equal(f.wallet.available,100);assert.equal(f.wallet.frozen,0);assert.equal(f.usage.state,'refunded');});
test('unknown submission and expiry preserve frozen points',async()=>{const f=fixture({unknown:true});await prepare(f);assert.equal((await create(f)).status,'unknown');assert.equal(f.wallet.frozen,50);f.advance();await f.service.reconcile('alice');assert.equal(f.rows.get(id).status,'expired');assert.equal(f.wallet.frozen,50);assert.equal(f.usage.state,'held');});
test('free mode and trusted exemption do not change balances',async()=>{for(const options of [{billingEnabled:false},{billingExempt:()=>true}]){const f=fixture({available:0,...options});await prepare(f);await create(f);await f.service.query('alice',id);assert.equal(f.calls,1);assert.equal(f.wallet.available,0);assert.equal(f.wallet.frozen,0);assert.equal(f.wallet.spent,0);}});
test('paid mode rejects guest identities and info exposes the charging switch',async()=>{const f=fixture();assert.equal((await f.service.info()).billingEnabled,true);await f.service.prepare('web:guest',{id,mode:'draw'});await assert.rejects(f.service.create('web:guest',{id,prompt:'cat'}),/登录/);assert.equal(f.calls,0);assert.equal((await fixture({billingEnabled:false}).service.info()).billingEnabled,false);});

test('paid submission requires an exact accepted price and current pricing version before a hold',async()=>{
 for(const fields of [{},{acceptedPriceFen:49,priceVersion:PRICE_VERSION},{acceptedPriceFen:50,priceVersion:'old'},{acceptedPriceFen:'50',priceVersion:PRICE_VERSION}]){
  const f=fixture();await prepare(f);
  await assert.rejects(f.service.create('alice',{id,prompt:'cat',...fields}),e=>e.status===422&&/价格已更新/.test(e.message));
  assert.equal(f.calls,0);assert.equal(f.wallet.available,100);assert.equal(f.wallet.frozen,0);assert.equal(f.rows.get(id).status,'draft');assert.equal(f.usage,undefined);
 }
});
test('free and exempt generation do not require accepted pricing',async()=>{
 for(const flags of [{billingEnabled:false},{billingExempt:()=>true}]){const f=fixture(flags);await prepare(f);await f.service.create('alice',{id,prompt:'cat'});assert.equal(f.calls,1);assert.equal(f.wallet.available,100);}
});
