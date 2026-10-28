import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash,createCipheriv,randomBytes} from 'node:crypto';
import {createPayments,paymentAccountId} from '../cloudfunctions/meme-motion/payments.mjs';

function fixture(overrides={}){
 const rows=new Map(),requests=[];let sessions=0,clock=1000;
 let chain=Promise.resolve();
 const store={transaction(fn){const run=chain.then(async()=>{const next=new Map(structuredClone([...rows]));const result=await fn({get:async(c,id)=>structuredClone(next.get(c+':'+id)),set:async(c,id,v)=>next.set(c+':'+id,structuredClone(v))});rows.clear();for(const [k,v]of next)rows.set(k,v);return result;});chain=run.catch(()=>{});return run;}};
 rows.set('meme_accounts:'+paymentAccountId('alice'),{id:paymentAccountId('alice')});
 const env={MEME_PAY_ENABLED:'true',MEME_PAY_VERIFIED:'true',MEME_PAY_OFFER_ID:'offer',MEME_PAY_APP_KEY:'app-key',MEME_PAY_CALLBACK_TOKEN:'paymentToken',MEME_PAY_CALLBACK_AES_KEY:Buffer.alloc(32,9).toString('base64').slice(0,-1),WECHAT_APP_ID:'wx-test',MEME_PAY_PRODUCTS_JSON:JSON.stringify([{id:'starter',productId:'points100',priceFen:100,points:100}]),...overrides};
 let reply={errcode:0,order:{status:1}},notifyReply={errcode:0};
 const service=createPayments({store,env,now:()=>clock++,wxSession:async code=>{sessions++;return{openid:code==='bob'?'bob':'alice',session_key:'session-key'};},accessToken:async()=>'access-token',fetcher:async(url,options)=>{requests.push({url,options});return{ok:true,json:async()=>structuredClone(new URL(url).pathname==='/xpay/notify_provide_goods'?notifyReply:reply)};}});
 return{service,rows,requests,env,get sessions(){return sessions},set reply(v){reply=v},set notifyReply(v){notifyReply=v},paid(order,extra={}){reply={errcode:0,order:{status:2,order_id:order.id,wx_order_id:'WX'+order.id,order_fee:100,paid_fee:100,order_type:0,...extra}};},wallet:()=>rows.get('meme_wallets:'+paymentAccountId('alice'))};
}

test('payments default closed and malformed catalog cannot enable purchases',async()=>{
 for(const env of [{MEME_PAY_ENABLED:'false'},{MEME_PAY_VERIFIED:''},{MEME_PAY_APP_KEY:''},{MEME_PAY_PRODUCTS_JSON:'oops'},{MEME_PAY_PRODUCTS_JSON:'[{"id":"x","productId":"p","priceFen":0,"points":10}]'}]){
  const f=fixture(env);assert.equal(f.service.catalog().enabled,false);await assert.rejects(()=>f.service.prepare('alice',{productId:'starter',code:'alice'}),/未开通/);assert.equal(f.sessions,0);assert.equal(f.requests.length,0);
 }
});

test('prepare signs exact server-priced payload and persists owned pending order without balance',async()=>{
 const f=fixture(),result=await f.service.prepare('alice',{productId:'starter',code:'alice',priceFen:1,points:999});
 const data=JSON.parse(result.payData.signData);assert.equal(data.goodsPrice,100);assert.equal(data.buyQuantity,1);assert.equal(data.productId,'points100');assert.equal(data.outTradeNo,result.id);assert.match(result.id,/^[A-Za-z0-9]{8,32}$/);
 assert.equal(result.payData.mode,'short_series_goods');
 const h=(k,v)=>createHmac('sha256',k).update(v).digest('hex');
 assert.equal(result.payData.paySig,h('app-key','requestVirtualPayment&'+result.payData.signData));assert.equal(result.payData.signature,h('session-key',result.payData.signData));
 assert.equal((await f.service.orders('alice'))[0].status,'pending');assert.equal(f.wallet(),undefined);assert.equal(f.requests.length,0);assert.equal(JSON.stringify(result).includes('session-key'),false);
});

test('unknown product, missing code, wrong identity and missing account cannot prepare',async()=>{
 const f=fixture();await assert.rejects(()=>f.service.prepare('alice',{productId:'no',code:'alice'}),/商品/);assert.equal(f.sessions,0);
 await assert.rejects(()=>f.service.prepare('alice',{productId:'starter',code:''}),/登录/);
 await assert.rejects(()=>f.service.prepare('alice',{productId:'starter',code:'bob'}),/身份/);
 await assert.rejects(()=>f.service.prepare('bob',{productId:'starter',code:'bob'}),/账户/);assert.deepEqual(await f.service.orders('alice'),[]);
});

test('only verified paid order credits once, concurrent reconcile is idempotent, transport correctly signed',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r);
 const results=await Promise.all([f.service.reconcile('alice',{id:r.id,code:'alice'}),f.service.reconcile('alice',{id:r.id,code:'alice'})]);
 assert.equal(results[0].status,'credited');assert.equal(f.wallet().available,100);assert.equal(f.wallet().credited,100);
 const request=f.requests[0],url=new URL(request.url);assert.equal(url.pathname,'/xpay/query_order');assert.deepEqual(JSON.parse(request.options.body),{openid:'alice',env:0,order_id:r.id});
 assert.equal(url.searchParams.get('pay_sig'),createHmac('sha256','app-key').update('/xpay/query_order&'+request.options.body).digest('hex'));
 assert.equal([...f.rows.keys()].filter(k=>k.startsWith('meme_wallet_events:')).length,1);
});

test('API success with unpaid/unknown/refund status never adds points; failure preserves pending order',async()=>{
 for(const status of [0,1,3,5,6,7,8,99,'paid']){const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r,{status});await f.service.reconcile('alice',{id:r.id,code:'alice'});assert.equal(f.wallet(),undefined);}
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.reply={errcode:268490002,errmsg:'not exist'};await assert.rejects(()=>f.service.reconcile('alice',{id:r.id,code:'alice'}),/查询/);assert.equal((await f.service.orders('alice'))[0].status,'pending');
});

test('payment mismatch, unknown platform order and cross-account query never credit',async()=>{
 for(const extra of [{order_fee:1},{order_id:'another'},{wx_order_id:''},{order_type:1},{openid:'bob'}]){const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r,extra);await assert.rejects(()=>f.service.reconcile('alice',{id:r.id,code:'alice'}),/不一致|缺少/);assert.equal(f.wallet(),undefined);}
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});await assert.rejects(()=>f.service.reconcile('bob',{id:r.id,code:'bob'}),/不存在/);assert.equal(f.requests.length,0);
 await assert.rejects(()=>f.service.reconcile('alice',{id:r.id,code:'bob'}),/身份/);assert.equal(f.requests.length,0);
});

test('same platform transaction cannot credit a second local order',async()=>{
 const f=fixture(),a=await f.service.prepare('alice',{productId:'starter',code:'alice'}),b=await f.service.prepare('alice',{productId:'starter',code:'alice'});
 f.paid(a,{wx_order_id:'WXfixed'});await f.service.reconcile('alice',{id:a.id,code:'alice'});
 f.paid(b,{wx_order_id:'WXfixed'});await assert.rejects(()=>f.service.reconcile('alice',{id:b.id,code:'alice'}),/重复/);assert.equal(f.wallet().available,100);
});

test('public catalog/orders omit private identity, raw signed payload and signing secrets',async()=>{
 const f=fixture();await f.service.prepare('alice',{productId:'starter',code:'alice'});const s=JSON.stringify({catalog:f.service.catalog(),orders:await f.service.orders('alice')});for(const secret of ['app-key','session-key','access-token','openid','paySig','signature'])assert.equal(s.includes(secret),false);
});

// Fixture follows official JSON push fields (not the sample toolkit's flat attach).
// https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.md
function push(f,plain,queryChanges={}){
 const key=Buffer.from(f.env.MEME_PAY_CALLBACK_AES_KEY+'=','base64'),data=Buffer.from(JSON.stringify(plain)),length=Buffer.alloc(4);length.writeUInt32BE(data.length);
 let raw=Buffer.concat([randomBytes(16),length,data,Buffer.from(f.env.WECHAT_APP_ID)]);const pad=32-raw.length%32;raw=Buffer.concat([raw,Buffer.alloc(pad,pad)]);
 const cipher=createCipheriv('aes-256-cbc',key,key.subarray(0,16));cipher.setAutoPadding(false);const Encrypt=Buffer.concat([cipher.update(raw),cipher.final()]).toString('base64');
 const q={timestamp:String(Math.floor(Date.now()/1000)),nonce:'nonce'};q.msg_signature=createHash('sha1').update([f.env.MEME_PAY_CALLBACK_TOKEN,q.timestamp,q.nonce,Encrypt].sort().join('')).digest('hex');
 return{httpMethod:'POST',queryStringParameters:{...q,...queryChanges},body:JSON.stringify({Encrypt})};
}
const delivery=r=>({Event:'xpay_goods_deliver_notify',OpenId:'alice',OutTradeNo:r.id,Env:0,WeChatPayInfo:{MchOrderNo:'MCH'+r.id},GoodsInfo:{ProductId:'points100',Quantity:1,OrigPrice:100,ActualPrice:100,Attach:r.id}});

test('official query contract: status 4 is paid and order_fee is amount in fen',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r,{status:4,order_type:7});await f.service.reconcile('alice',{id:r.id,code:'alice'});assert.equal(f.wallet().available,100);
 const mismatch=fixture(),m=await mismatch.service.prepare('alice',{productId:'starter',code:'alice'});mismatch.paid(m,{order_fee:'100'});await assert.rejects(()=>mismatch.service.reconcile('alice',{id:m.id,code:'alice'}),/不一致/);
});

test('payment callback GET validates independent token, POST requires security mode and config',async()=>{
 const f=fixture(),q={timestamp:String(Math.floor(Date.now()/1000)),nonce:'nonce',echostr:'echo'};q.signature=createHash('sha1').update([f.env.MEME_PAY_CALLBACK_TOKEN,q.timestamp,q.nonce].sort().join('')).digest('hex');
 const valid=await f.service.callback({httpMethod:'GET',queryStringParameters:q});assert.equal(valid.statusCode,200);assert.equal(valid.body,'echo');
 assert.equal((await f.service.callback({httpMethod:'GET',queryStringParameters:{...q,signature:'wrong'}})).statusCode,403);
 assert.equal((await f.service.callback({httpMethod:'POST',body:'{"Event":"xpay_goods_deliver_notify"}'})).statusCode,403);
 assert.equal((await fixture({MEME_PAY_CALLBACK_TOKEN:''}).service.callback({httpMethod:'GET',queryStringParameters:q})).statusCode,503);
});

test('secure callback and query share persistent exactly-once credit even with different platform IDs',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r);
 const resp=await f.service.callback(push(f,delivery(r)));assert.equal(resp.statusCode,200);assert.deepEqual(JSON.parse(resp.body),{ErrCode:0,ErrMsg:'success'});
 await f.service.reconcile('alice',{id:r.id,code:'alice'});await f.service.callback(push(f,delivery(r)));assert.equal(f.wallet().available,100);
 assert.equal([...f.rows.keys()].filter(k=>k.startsWith('meme_wallet_events:')).length,1);
 const g=fixture(),s=await g.service.prepare('alice',{productId:'starter',code:'alice'});g.paid(s);await Promise.all([g.service.reconcile('alice',{id:s.id,code:'alice'}),g.service.callback(push(g,delivery(s)))]);assert.equal(g.wallet().available,100);
});

test('secure callback rejects identity, goods, price, environment and signature mismatches',async()=>{
 for(const change of [{OpenId:'bob'},{Env:1},{GoodsInfo:{ProductId:'other',Quantity:1,OrigPrice:100,ActualPrice:100}},{GoodsInfo:{ProductId:'points100',Quantity:2,OrigPrice:100,ActualPrice:100}},{GoodsInfo:{ProductId:'points100',Quantity:1,OrigPrice:1,ActualPrice:1}}]){
  const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'}),resp=await f.service.callback(push(f,{...delivery(r),...change}));assert.notEqual(resp.statusCode,200);assert.equal(f.wallet(),undefined);
 }
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});assert.equal((await f.service.callback(push(f,delivery(r),{msg_signature:'bad'}))).statusCode,403);assert.equal(f.wallet(),undefined);
});

test('verified callback supports iOS without WeChatPayInfo and full refund never debits wrong account',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'}),event=delivery(r);delete event.WeChatPayInfo;assert.equal((await f.service.callback(push(f,event))).statusCode,200);
 const refund={Event:'xpay_refund_notify',OpenId:'alice',MchOrderId:r.id,WxRefundId:'refund1',RefundFee:100,RetCode:0};
 assert.equal((await f.service.callback(push(f,{...refund,OpenId:'bob'}))).statusCode,404);assert.equal(f.wallet().available,100);
 assert.equal((await f.service.callback(push(f,refund))).statusCode,200);assert.equal((await f.service.orders('alice'))[0].status,'refunded');assert.equal(f.wallet().available,0);
});

test('query fallback reports delivery with official order_id contract after credit; failure retries without recredit',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r);f.notifyReply={errcode:500,errmsg:'temporarily unavailable'};
 const first=await f.service.reconcile('alice',{id:r.id,code:'alice'});assert.equal(first.status,'credited');assert.equal(first.deliveryPending,true);assert.equal(f.wallet().available,100);
 const req=f.requests.find(x=>new URL(x.url).pathname==='/xpay/notify_provide_goods');assert.ok(req);
 assert.deepEqual(JSON.parse(req.options.body),{order_id:r.id,env:0});assert.deepEqual([...new URL(req.url).searchParams.keys()],['access_token']);
 f.notifyReply={errcode:0};const recovered=await f.service.reconcile('alice',{id:r.id});assert.equal(recovered.deliveryPending,false);assert.equal(f.wallet().available,100);
 assert.equal([...f.rows.keys()].filter(k=>k.startsWith('meme_wallet_events:')).length,1);
 const count=f.requests.length;await f.service.reconcile('alice',{id:r.id});assert.equal(f.requests.length,count);
});

test('delivery callback clears fallback retry, and provider-delivered status never sends extra notification',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r);f.notifyReply={errcode:500};await f.service.reconcile('alice',{id:r.id,code:'alice'});
 const count=f.requests.length;assert.equal((await f.service.callback(push(f,delivery(r)))).statusCode,200);const current=await f.service.reconcile('alice',{id:r.id});assert.equal(current.deliveryPending,false);assert.equal(f.requests.length,count);
 const g=fixture(),s=await g.service.prepare('alice',{productId:'starter',code:'alice'});g.paid(s,{status:4});const done=await g.service.reconcile('alice',{id:s.id,code:'alice'});assert.equal(done.deliveryPending,false);assert.equal(g.requests.length,1);
});

test('final verified full refund reclaims points once, preserves frozen, and records consumed-point debt',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r);await f.service.reconcile('alice',{id:r.id,code:'alice'});
 const wallet=f.wallet();wallet.available=10;wallet.spent=70;wallet.frozen=20;
 const event={Event:'xpay_refund_notify',OpenId:'alice',MchOrderId:r.id,WxRefundId:'final-refund',RefundFee:100,RetCode:0};
 const results=await Promise.all([f.service.callback(push(f,event)),f.service.callback(push(f,event))]);assert.ok(results.every(x=>x.statusCode===200));
 assert.equal(f.wallet().available,-90);assert.equal(f.wallet().frozen,20);assert.equal(f.wallet().spent,70);assert.equal(f.wallet().refunded,100);
 assert.equal((await f.service.orders('alice'))[0].status,'refunded');assert.equal([...f.rows.values()].filter(x=>x.type==='refund').length,1);
 const queries=f.requests.length;await f.service.reconcile('alice',{id:r.id});assert.equal(f.requests.length,queries);
 assert.notEqual((await f.service.callback(push(f,delivery(r)))).statusCode,200);assert.equal(f.wallet().available,-90);
});

test('partial/failed refund does not falsely reclaim points; later recharge can repay a negative balance',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.paid(r);await f.service.reconcile('alice',{id:r.id,code:'alice'});
 const event={Event:'xpay_refund_notify',OpenId:'alice',MchOrderId:r.id,WxRefundId:'partial-refund',RefundFee:40,RetCode:0};
 await f.service.callback(push(f,event));assert.equal(f.wallet().available,100);assert.equal((await f.service.orders('alice'))[0].status,'refund_review');
 const g=fixture(),a=await g.service.prepare('alice',{productId:'starter',code:'alice'});g.paid(a);await g.service.reconcile('alice',{id:a.id,code:'alice'});g.wallet().available=5;
 await g.service.callback(push(g,{...event,MchOrderId:a.id,WxRefundId:'failed',RefundFee:100,RetCode:1}));assert.equal(g.wallet().available,5);
 await g.service.callback(push(g,{...event,MchOrderId:a.id,WxRefundId:'full',RefundFee:100}));assert.equal(g.wallet().available,-95);
 const b=await g.service.prepare('alice',{productId:'starter',code:'alice'});g.paid(b);await g.service.reconcile('alice',{id:b.id,code:'alice'});assert.equal(g.wallet().available,5);assert.equal(g.wallet().refunded,100);
});

test('a valid refund for an uncredited local order never removes unrelated existing points',async()=>{
 const f=fixture(),r=await f.service.prepare('alice',{productId:'starter',code:'alice'});f.rows.set('meme_wallets:'+paymentAccountId('alice'),{accountId:paymentAccountId('alice'),available:50,frozen:0,spent:0,credited:50});
 const resp=await f.service.callback(push(f,{Event:'xpay_refund_notify',OpenId:'alice',MchOrderId:r.id,WxRefundId:'uncredited',RefundFee:100,RetCode:0}));assert.equal(resp.statusCode,200);assert.equal(f.wallet().available,50);assert.equal([...f.rows.values()].filter(x=>x.type==='refund').length,0);
});
