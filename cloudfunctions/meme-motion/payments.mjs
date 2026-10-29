import {createHash,createHmac,randomBytes} from 'node:crypto';
import security from '../meme-feedback/security-core.cjs';

// Matches the existing account identity contract; OpenID never leaves this service.
export const paymentAccountId=uid=>createHash('sha256').update('wechat:'+uid).digest('hex');
const hmac=(key,value)=>createHmac('sha256',key).update(value,'utf8').digest('hex');
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;return e;};
const publicOrder=r=>({id:r.id,productId:r.productId,priceFen:r.priceFen,points:r.points,status:r.status,createdAt:r.createdAt,updatedAt:r.updatedAt,creditedAt:r.creditedAt??null,deliveryPending:r.deliveryPending===true,clientFailure:r.clientFailure||null});
const validUid=uid=>typeof uid==='string'&&uid.length>0&&uid.length<=128&&!uid.startsWith('web:');
const validCode=code=>typeof code==='string'&&code.length>0&&code.length<=256;

/**
 * WeChat virtual goods purchase, with server-side catalog pricing and query-only
 * fulfillment. No client success signal or unverified callback can credit money.
 * The provider contract follows TencentCloudBase/awesome-cloudbase-examples,
 * integration/cloudbase-virtualpay. Local persistence replaces its in-memory demo.
 */
export function createPayments({store,env=process.env,fetcher=fetch,now=Date.now,wxSession,accessToken}){
 let products=[];
 try{
  const parsed=JSON.parse(env.MEME_PAY_PRODUCTS_BASE64?Buffer.from(env.MEME_PAY_PRODUCTS_BASE64,'base64').toString('utf8'):env.MEME_PAY_PRODUCTS_JSON||'[]');
  if(!Array.isArray(parsed)||!parsed.length||parsed.length>30)throw Error('catalog');
  const ids=new Set(),providerIds=new Set();
  products=parsed.map(p=>{
   if(!p||typeof p.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(p.id)||typeof p.productId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(p.productId)||!Number.isSafeInteger(p.priceFen)||p.priceFen<100||p.priceFen>1000000||!Number.isSafeInteger(p.points)||p.points<1||p.points>1000000000||ids.has(p.id)||providerIds.has(p.productId))throw Error('catalog');
   ids.add(p.id);providerIds.add(p.productId);return{id:p.id,productId:p.productId,priceFen:p.priceFen,points:p.points};
  });
 }catch{products=[];}
 // VERIFIED is set only after an operator completes real payment, delivery and
 // refund acceptance. Merely filling credentials must never turn charging on.
 const enabled=env.MEME_PAY_ENABLED==='true'&&env.MEME_PAY_VERIFIED==='true'&&Boolean(env.MEME_PAY_OFFER_ID?.trim())&&Boolean(env.MEME_PAY_APP_KEY?.trim())&&products.length>0;
 const testers=new Set((env.MEME_PAY_TEST_ACCOUNT_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));
 const canPay=uid=>enabled||(validUid(uid)&&testers.has(paymentAccountId(uid))&&Boolean(env.MEME_PAY_OFFER_ID?.trim())&&Boolean(env.MEME_PAY_APP_KEY?.trim())&&products.length>0);
 const guard=uid=>{if(!canPay(uid))throw fail('充值尚未开通，当前保持免费使用',503);};
 const auth=async(uid,code)=>{
  if(!validUid(uid))throw fail('请先使用微信登录',401);
  if(!validCode(code))throw fail('请重新登录后支付',401);
  const s=await wxSession(code);
  if(s?.openid!==uid||typeof s.session_key!=='string'||!s.session_key)throw fail('微信登录身份不一致，请重新登录',401);
  return s;
 };
 const owned=async(tx,uid,id)=>{
  const r=await tx.get('meme_orders',id);
  if(!r||r.accountId!==paymentAccountId(uid)||r.openid!==uid)throw fail('订单不存在',404);
  return r;
 };
 const query=async(uid,id,sessionKey)=>{
  const body=JSON.stringify({openid:uid,env:0,order_id:id});
  const params=new URLSearchParams({access_token:await accessToken(),pay_sig:hmac(env.MEME_PAY_APP_KEY,'/xpay/query_order&'+body),signature:hmac(sessionKey,body)});
  let response,data;
  try{
   response=await fetcher('https://api.weixin.qq.com/xpay/query_order?'+params,{method:'POST',headers:{'Content-Type':'application/json'},body,redirect:'error',signal:AbortSignal.timeout(15000)});
   data=await response.json();
  }catch{throw fail('支付状态查询暂不可用，请稍后查询原订单',502);}
  if(!response.ok||data?.errcode!==0||!data.order||typeof data.order!=='object')throw fail('微信查单未完成（错误码 '+(Number.isSafeInteger(data?.errcode)?data.errcode:'未知')+'），请查询原订单，勿重复付款',502);
  return data.order;
 };
 const hash=value=>createHash('sha256').update(value).digest('hex');
 // Query wx_order_id and callback MchOrderNo are distinct identifiers in the
 // official contract. The immutable local order is the shared credit key.
 const credit=async(tx,row,providerId,providerType)=>{
  const eventId='xpay:'+hash(row.id),event=await tx.get('meme_wallet_events',eventId);
  if(event){
   if(event.orderId!==row.id||event.accountId!==row.accountId||event.points!==row.points||row.status!=='credited')throw fail('订单入账记录不一致，请联系作者核对',409);
   return publicOrder(row);
  }
  if(row.status==='refund_review'||row.status==='refunded'||row.status==='closed')throw fail('订单状态异常，请联系作者核对',409);
  if(providerId){
   const providerKey='platform:'+providerType+':'+hash(providerId),existing=await tx.get('meme_orders',providerKey);
   if(existing&&existing.orderId!==row.id)throw fail('平台交易号重复，请联系作者核对',409);
   await tx.set('meme_orders',providerKey,{orderId:row.id,accountId:row.accountId});
  }
  const updatedAt=now(),wallet=await tx.get('meme_wallets',row.accountId)||{accountId:row.accountId,available:0,frozen:0,spent:0,credited:0};
  for(const field of ['available','frozen','spent','credited'])if(!Number.isSafeInteger(wallet[field])||(field!=='available'&&wallet[field]<0))throw fail('账户点数记录异常，请联系作者',409);
  if(!Number.isSafeInteger(wallet.available+row.points)||!Number.isSafeInteger(wallet.credited+row.points))throw fail('账户点数超出范围',409);
  wallet.available+=row.points;wallet.credited+=row.points;wallet.updatedAt=updatedAt;
  row.status='credited';row.creditedAt=updatedAt;row.updatedAt=updatedAt;
  if(providerType==='wx')row.wxOrderId=providerId;
  else if(providerId)row.channelOrderId=providerId;
  await tx.set('meme_wallets',row.accountId,wallet);
  await tx.set('meme_wallet_events',eventId,{id:eventId,accountId:row.accountId,orderId:row.id,type:'topup',points:row.points,priceFen:row.priceFen,providerId:providerId||null,providerType,createdAt:updatedAt});
  await tx.set('meme_orders',row.id,row);return publicOrder(row);
 };
 const notifyDelivery=async(uid,id)=>{
  const before=await store.transaction(tx=>owned(tx,uid,id));
  if(before.status!=='credited'||before.deliveryPending!==true)return publicOrder(before);
  // Official API, verified 2026-10-28:
  // https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_notify_provide_goods.md
  // POST query: access_token. Body: order_id (or wx_order_id), env.
  // No openid/offer_id/out_trade_no, and no payment/session signature is required.
  // This runs AFTER durable credit. Failed notification never rolls back credit;
  // the pending marker survives and another reconcile retries only notification.
  let delivered=false;
  try{
   const response=await fetcher('https://api.weixin.qq.com/xpay/notify_provide_goods?'+new URLSearchParams({access_token:await accessToken()}),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:id,env:0}),redirect:'error',signal:AbortSignal.timeout(15000)});
   const result=await response.json();delivered=response.ok&&result?.errcode===0;
  }catch{ /* Keep durable deliveryPending for retry, without regenerating money. */ }
  return store.transaction(async tx=>{
   const row=await owned(tx,uid,id);
   // A delivery callback or refund can win while the HTTP request is in flight.
   // Never re-open its completed delivery marker on a failed stale notification.
   if(row.status==='credited'&&row.deliveryPending===true){
    row.deliveryLastAttempt=now();
    if(delivered){row.deliveryPending=false;row.deliveryNotifiedAt=now();}
    await tx.set('meme_orders',id,row);
   }
   return publicOrder(row);
  });
 };
 const response=(statusCode,value,plain=false)=>({statusCode,headers:{'Content-Type':plain?'text/plain; charset=utf-8':'application/json; charset=utf-8','Cache-Control':'no-store'},body:plain?value:JSON.stringify(value)});
 return{
  catalog(uid){return{enabled:canPay(uid),currency:'CNY',products:products.map(p=>({...p}))};},
  async prepare(uid,{productId,code,quantity=1}={}){
   guard(uid);const p=products.find(p=>p.id===productId);
   if(!p)throw fail('充值商品不存在');
   if(!Number.isSafeInteger(quantity)||quantity<1||quantity>500||!Number.isSafeInteger(p.priceFen*quantity)||!Number.isSafeInteger(p.points*quantity))throw fail('充值数量须为1至500的整数');
   const s=await auth(uid,code),accountId=paymentAccountId(uid);
   const id='M'+randomBytes(15).toString('hex');
   const createdAt=now();
   const row={id,accountId,openid:uid,productId:p.productId,catalogId:p.id,quantity,unitPriceFen:p.priceFen,priceFen:p.priceFen*quantity,points:p.points*quantity,status:'pending',createdAt,updatedAt:createdAt};
   const signData=JSON.stringify({offerId:env.MEME_PAY_OFFER_ID,buyQuantity:quantity,env:0,currencyType:'CNY',productId:p.productId,goodsPrice:p.priceFen,outTradeNo:id,attach:id});
   await store.transaction(async tx=>{
    const account=await tx.get('meme_accounts',accountId);
    if(!account||account.deletedAt||account.status==='deleted')throw fail('账户不存在，请重新登录',401);
    if(await tx.get('meme_orders',id))throw fail('订单创建冲突，请重试',409);
    const indexId='index:'+accountId,index=await tx.get('meme_orders',indexId)||{ids:[]};
    await tx.set('meme_orders',id,row);
    await tx.set('meme_orders',indexId,{ids:[id,...index.ids].slice(0,50)});
   });
   return{...publicOrder(row),payData:{signData,mode:'short_series_goods',paySig:hmac(env.MEME_PAY_APP_KEY,'requestVirtualPayment&'+signData),signature:hmac(s.session_key,signData)}};
  },
  async reconcile(uid,{id,code}={}){
   guard(uid);if(!validUid(uid))throw fail('请先使用微信登录',401);
   if(typeof id!=='string'||!/^M[0-9a-f]{30}$/.test(id))throw fail('订单不存在',404);
   const before=await store.transaction(tx=>owned(tx,uid,id));
   if(before.status==='credited')return notifyDelivery(uid,id);
   if(['refund_review','refunded','closed'].includes(before.status))return publicOrder(before);
   const s=await auth(uid,code),remote=await query(uid,id,s.session_key);
   // Official API (retrieved 2026-10-28; .md is machine-readable):
   // https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_query_order.md
   // Res.order.status: 2 = paid, awaiting delivery; 4 = delivered.
   // Res.order.order_fee: number, order amount in fen. order_type 0/7 are
   // ordinary/iOS payments; 1/8 are refunds. errcode=0 alone is NOT paid.
   const paid=remote.status===2||remote.status===4;
   if(paid){
    if(remote.order_id!==id||remote.order_fee!==before.priceFen||(remote.openid!==undefined&&remote.openid!==uid)||(remote.order_type!==undefined&&remote.order_type!==0&&remote.order_type!==7))throw fail('微信支付订单信息不一致，请联系作者核对',502);
    if(typeof remote.wx_order_id!=='string'||!remote.wx_order_id||remote.wx_order_id.length>128)throw fail('微信支付订单缺少平台交易号，请稍后查询',502);
   }
   const reconciled=await store.transaction(async tx=>{
    const row=await owned(tx,uid,id);
    if(row.status==='credited'||row.status==='refund_review')return publicOrder(row);
    const updatedAt=now();
    if(!paid){
     row.updatedAt=updatedAt;row.providerStatus=Number.isSafeInteger(remote.status)?remote.status:null;
     if(remote.status===5||remote.status===8)row.status='refunded';
     else if(remote.status===6)row.status='closed';
     await tx.set('meme_orders',id,row);return publicOrder(row);
    }
    row.providerStatus=remote.status;row.deliveryPending=remote.status===2;
    if(remote.status===4)row.deliveryNotifiedAt=now();
    return credit(tx,row,remote.wx_order_id,'wx');
   });
   return reconciled.status==='credited'?notifyDelivery(uid,id):reconciled;
  },
  async callback(event={}){
   try{
    // Independent payment callback credentials: never borrow the verified
    // content-safety callback token or AES key implicitly.
    const callbackEnv={WECHAT_APP_ID:env.WECHAT_APP_ID,WECHAT_CALLBACK_TOKEN:env.MEME_PAY_CALLBACK_TOKEN,WECHAT_CALLBACK_AES_KEY:env.MEME_PAY_CALLBACK_AES_KEY};
    if(!callbackEnv.WECHAT_APP_ID||typeof callbackEnv.WECHAT_CALLBACK_TOKEN!=='string'||!/^[A-Za-z0-9]{3,32}$/.test(callbackEnv.WECHAT_CALLBACK_TOKEN)||typeof callbackEnv.WECHAT_CALLBACK_AES_KEY!=='string'||callbackEnv.WECHAT_CALLBACK_AES_KEY.length!==43||Buffer.from(callbackEnv.WECHAT_CALLBACK_AES_KEY+'=','base64').length!==32)throw fail('支付消息推送尚未配置',503);
    const q=event.queryStringParameters||event.queryString||{},method=String(event.httpMethod||'').toUpperCase();
    if(method==='GET'){
     security.signature(q,callbackEnv);
     if(typeof q.echostr!=='string'||q.echostr.length>1000)throw fail('回调参数无效',400);
     return response(200,q.echostr,true);
    }
    if(method!=='POST')throw fail('请求方式不支持',405);
    const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString():event.body||'{}';
    if(typeof raw!=='string'||Buffer.byteLength(raw)>30000)throw fail('回调内容过大',413);
    let envelope;try{envelope=JSON.parse(raw);}catch{throw fail('请配置JSON消息推送',400);}
    const message=security.callbackMessage(q,envelope,callbackEnv);
    // Official push contracts, incl. GoodsInfo.Attach and optional WeChatPayInfo:
    // https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.md
    if(message.Event==='xpay_goods_deliver_notify'){
     if(!validUid(message.OpenId)||message.Env!==0||typeof message.OutTradeNo!=='string')throw fail('支付回调身份或环境不一致',403);
     await store.transaction(async tx=>{
      const row=await owned(tx,message.OpenId,message.OutTradeNo),goods=message.GoodsInfo;
      if(!goods||goods.ProductId!==row.productId||goods.Quantity!==(row.quantity||1)||goods.OrigPrice!==row.priceFen||goods.ActualPrice!==row.priceFen||goods.Attach!==row.id)throw fail('支付回调商品信息不一致',409);
      const providerId=message.WeChatPayInfo?.MchOrderNo;
      if(providerId!==undefined&&(typeof providerId!=='string'||!providerId||providerId.length>128))throw fail('支付回调交易号不一致',409);
      row.deliveryPending=false;row.deliveryNotifiedAt=now();
      await credit(tx,row,providerId,'mch');
      // credit() can be a no-op when query already credited this same order.
      // Persist the callback's successful delivery without another wallet event.
      await tx.set('meme_orders',row.id,row);
     });
    }else if(message.Event==='xpay_refund_notify'){
     // Refund MchOrderId differs from deliver OutTradeNo. RetCode=0 is the
     // official final success signal. Only a full refund of an actual local
     // credit reclaims points; partial refunds remain explicitly under review.
     if(!validUid(message.OpenId)||typeof message.MchOrderId!=='string'||typeof message.WxRefundId!=='string'||!message.WxRefundId||message.WxRefundId.length>128||!Number.isSafeInteger(message.RefundFee)||message.RefundFee<=0||!Number.isSafeInteger(message.RetCode))throw fail('退款回调信息不一致',409);
     await store.transaction(async tx=>{
      const row=await owned(tx,message.OpenId,message.MchOrderId);
      if(message.RefundFee>row.priceFen)throw fail('退款金额不一致',409);
      const refundId='refund:'+hash(message.WxRefundId),existing=await tx.get('meme_orders',refundId);
      if(existing&&(existing.orderId!==row.id||existing.accountId!==row.accountId||existing.refundFen!==message.RefundFee))throw fail('退款单号重复或金额不一致',409);
      if(message.WxOrderId!==undefined&&row.wxOrderId&&message.WxOrderId!==row.wxOrderId)throw fail('退款对应支付单不一致',409);
      if(existing?.result===0)return;
      await tx.set('meme_orders',refundId,{orderId:row.id,accountId:row.accountId,refundId:message.WxRefundId,refundFen:message.RefundFee,result:message.RetCode,createdAt:now()});
      if(message.RetCode!==0)return;
      if(message.RefundFee!==row.priceFen){row.status='refund_review';row.updatedAt=now();row.refundNeedsReview=true;await tx.set('meme_orders',row.id,row);return;}
      if(row.refundedAt)throw fail('订单已经完成退款，请核对重复退款单',409);
      const creditEvent=await tx.get('meme_wallet_events','xpay:'+hash(row.id));
      if(creditEvent){
       if(creditEvent.orderId!==row.id||creditEvent.accountId!==row.accountId||creditEvent.points!==row.points||creditEvent.priceFen!==row.priceFen||creditEvent.type!=='topup')throw fail('退款原入账凭证不一致',409);
       const reversalId='refund:'+hash(message.WxRefundId),reversal=await tx.get('meme_wallet_events',reversalId);
       if(reversal)throw fail('退款回收记录不一致',409);
       const wallet=await tx.get('meme_wallets',row.accountId);
       if(!wallet||wallet.accountId!==row.accountId||!Number.isSafeInteger(wallet.available)||!Number.isSafeInteger(wallet.available-row.points)||!Number.isSafeInteger(wallet.refunded??0)||!Number.isSafeInteger((wallet.refunded??0)+row.points))throw fail('退款账户点数记录异常',409);
       // Frozen points belong to in-flight tasks and must remain untouched.
       // A negative available value records points consumed before the refund;
       // reserve must reject insufficient balances, and later topups repay it.
       wallet.available-=row.points;wallet.refunded=(wallet.refunded??0)+row.points;wallet.updatedAt=now();
       await tx.set('meme_wallets',row.accountId,wallet);
       await tx.set('meme_wallet_events',reversalId,{id:reversalId,accountId:row.accountId,orderId:row.id,type:'refund',points:-row.points,refundFen:message.RefundFee,wxRefundId:message.WxRefundId,createdAt:now()});
      }
      // If this local order never credited, no unrelated wallet is touched.
      row.status='refunded';row.refundedAt=now();row.refundFen=message.RefundFee;row.refundNeedsReview=false;row.deliveryPending=false;row.updatedAt=now();await tx.set('meme_orders',row.id,row);
     });
    }
    return response(200,{ErrCode:0,ErrMsg:'success'});
   }catch(e){return response(e.status||503,{ErrCode:-1,ErrMsg:e.status?e.message:'支付回调处理失败，请重试'});}
  },
  async recordClientFailure(uid,{id,errorCode,errorMessage}={}){
   return store.transaction(async tx=>{const row=await owned(tx,uid,id);row.clientFailure={code:Number.isSafeInteger(errorCode)?errorCode:null,message:String(errorMessage||'').slice(0,200),at:now()};await tx.set('meme_orders',id,row);return{recorded:true};});
  },
  async orders(uid){
   if(!validUid(uid))throw fail('请先使用微信登录',401);
   return (store.readOnly?store.readOnly.bind(store):store.transaction.bind(store))(async tx=>{
    const index=await tx.get('meme_orders','index:'+paymentAccountId(uid));
    const rows=await Promise.all((index?.ids||[]).slice(0,50).map(id=>owned(tx,uid,id)));
    return rows.map(publicOrder);
   });
  }
 };
}
