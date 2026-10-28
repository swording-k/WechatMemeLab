import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import security from '../meme-feedback/security-core.cjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const fail=(message,status)=>{throw Object.assign(Error(message),{status});};
export function createWebMotionHandler({service,env,resolveAccount}){
 return async(event,op)=>{
  const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),String(v)])),origin=headers.origin;
  const allowed=(env.MEME_WEB_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean),cors=origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{};
  const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...cors},body:JSON.stringify(body)});
  try{
   if(origin&&!allowed.includes(origin))fail('此页面未获准调用测试服务',403);
   if((event.httpMethod||'').toUpperCase()!=='POST')fail('请求方式不支持',405);
   const invite=env.MEME_WEB_INVITE_CODE;if((!invite||invite.length<24)&&!resolveAccount)fail('网页测试服务尚未启用',503);
   const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString():event.body||'{}';if(Buffer.byteLength(raw)>30000)fail('参数过大，请重新选择素材',413);let data;try{data=JSON.parse(raw);}catch{fail('参数格式无效',400);}
   if(!data||Array.isArray(data)||typeof data!=='object')fail('参数格式无效',400);
   const token=(headers.authorization||'').replace(/^Bearer /,'');
   if(op==='web-login'){
    if(!invite||!equal(token,invite))fail('邀请码不正确，请检查完整测试链接',401);
    if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.clientId||''))fail('浏览器标识无效，请重新打开页面',400);
    const uid='web:'+createHmac('sha256',env.MEME_SECURITY_SECRET).update(invite+':'+data.clientId).digest('hex').slice(0,40);
    const session=security.sign({kind:'web-motion-session',uid,invite:digest(invite),exp:Date.now()+30*24*3600000},env);return json(200,{session});
   }
   let session;
   let kind;try{kind=JSON.parse(Buffer.from(token.split('.')[0],'base64url')).kind;}catch{}
   if(kind==='account-session'&&resolveAccount)session={uid:await resolveAccount(token)};
   else{session=security.verify(token,env,'web-motion-session');if(session.invite!==digest(invite)||!session.uid?.startsWith('web:'))fail('测试登录已失效，请重新打开邀请链接',401);}
   if(op==='web-config')return json(200,{...await service.info(),configured:true});
   if(op==='web-prepare')return json(200,await service.prepare(session.uid,data));
   if(op==='web-create')return json(200,await service.create(session.uid,data));
   if(op==='web-query')return json(200,await service.query(session.uid,data.id));
   if(op==='web-result')return json(200,await service.result(session.uid,data.id));
   return json(404,{error:'操作不存在'});
  }catch(e){return json(e.status||422,{error:e.status===401&&op!=='web-login'?'测试登录已失效，请重新打开邀请链接':e.message||'测试服务暂时不可用，请查询原任务'});}
 };
}
