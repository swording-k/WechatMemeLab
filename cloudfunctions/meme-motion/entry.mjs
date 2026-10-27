import {createMotion} from './service.mjs';
import {createWebMotionHandler} from './web.mjs';
import {cloudStore} from './store.mjs';
import {validateMedia,videoInfo,imageInfo} from './media.mjs';
import {createProvider} from '../../server/motion/provider.mjs';
import security from '../meme-feedback/security-core.cjs';
const env=process.env,{store,storage}=cloudStore(env);
const shared={store,storage,provider:createProvider({key:env.DASHSCOPE_API_KEY,base:env.DASHSCOPE_BASE_URL||'https://dashscope.aliyuncs.com'}),budgetEnforced:env.MOTION_TEST_UNLIMITED!=='true',budget:Number(env.MOTION_BUDGET_CNY||3),maxJobs:Number(env.MOTION_MAX_JOBS||4),validate:validateMedia,inspectResult:videoInfo,inspectImage:imageInfo};
const webService=createMotion({...shared,activeScope:'user',verifyInput:async uid=>{if(!uid?.startsWith('web:'))throw Error('网页测试身份无效');}});
const webHandler=createWebMotionHandler({service:webService,env});
const service=createMotion({...shared,verifyInput:async(uid,{receipt,prompt,imageBytes})=>{
 const checked=security.receiptMatches(receipt,prompt,imageBytes?[{buffer:imageBytes}]:[],env);if(checked.uid!==uid)throw Error('检测凭证不属于当前用户，请重新检测');
}});
export async function main(event){
 if(event.Type==='Timer'){await service.reconcile();return{cleaned:await store.cleanup()};}
 const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)});
 const op=(event.queryStringParameters||event.queryString||{}).op;
 if(op==='health')return json(200,{configured:Boolean(env.DASHSCOPE_API_KEY),service:'meme-motion',version:'0.3.0'});
 if(!env.DASHSCOPE_API_KEY)return json(503,{error:'AI动作服务尚未配置'});
 if(typeof op==='string'&&op.startsWith('web-'))return webHandler(event,op);
 try{
  if((event.httpMethod||'').toUpperCase()!=='POST')return json(405,{error:'请求方式不支持'});
  const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
  const session=security.verify(String(headers.authorization||'').replace(/^Bearer /,''),env,'session');
  const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString():event.body||'{}';if(Buffer.byteLength(raw)>30000)return json(413,{error:'参数过大，请重新选择素材'});const data=JSON.parse(raw);
  if(op==='config')return json(200,await service.info());
  if(op==='prepare')return json(200,await service.prepare(session.uid,data));
  if(op==='create')return json(200,await service.create(session.uid,data));
  if(op==='query')return json(200,await service.query(session.uid,data.id));
  if(op==='result')return json(200,await service.result(session.uid,data.id));
  return json(404,{error:'操作不存在'});
 }catch(e){const known=/任务|额度|照片|视频|素材|描述|凭证|内容|MP4|JPG|生成|参数/.test(e.message||'');return json(e.status||422,{error:known?e.message:'动作服务暂时不可用，请保留任务记录稍后重试'});}
}
