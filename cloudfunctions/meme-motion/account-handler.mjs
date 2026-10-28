import security from '../meme-feedback/security-core.cjs';
export function createAccountHandler({accounts,payments,env}){
 return async(event,op)=>{
  const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),String(v)]));
  const origin=headers.origin,allowed=(env.MEME_WEB_ORIGINS||'').split(',').map(x=>x.trim());
  const cors=origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{};
  const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors},body:JSON.stringify(body)});
  try{
   if(origin&&!allowed.includes(origin))throw Object.assign(Error('此网页尚未配置登录服务'),{status:403});
   if(event.httpMethod!=='POST')return json(405,{error:'请求方式不支持'});
   const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString():event.body||'{}';if(Buffer.byteLength(raw)>4096)return json(413,{error:'登录参数过大'});
   const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))return json(400,{error:'参数格式错误'});
   const token=(headers.authorization||'').replace(/^Bearer /,'');
   if(op==='account-web-start')return json(200,await accounts.start(data));
   if(op==='account-web-poll')return json(200,await accounts.poll(data));
   if(op==='account-web-logout')return json(200,await accounts.logout(token));
   const web=op.startsWith('account-web-'),uid=web?await accounts.resolve(token):security.verify(token,env,'session').uid;
   const action=op.slice(web?'account-web-'.length:'account-'.length);
   if(action==='me')return json(200,{...await accounts.me(uid),payments:payments.catalog(uid)});
   if(action==='orders')return json(200,{orders:await payments.orders(uid)});
   if(!web&&action==='confirm-login')return json(200,await accounts.confirm(uid,data));
   if(!web&&action==='pay-prepare'){await accounts.me(uid);const r=await payments.prepare(uid,data);return json(200,{id:r.id,payment:r.payData});}
   if(!web&&action==='pay-error')return json(200,await payments.recordClientFailure(uid,data));
   if(!web&&action==='pay-query'){const order=await payments.reconcile(uid,data);return json(200,{order,wallet:(await accounts.me(uid)).wallet});}
   return json(404,{error:'操作不存在'});
  }catch(e){return json(e.status||422,{error:e instanceof SyntaxError?'参数格式错误':e.message||'账户服务暂不可用，请稍后重试'});}
 };
}
