import {timingSafeEqual} from 'node:crypto';
export function createCloudHandler({jobs,media,token,origins=[]}){return async event=>{
 const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),String(v)])),origin=headers.origin;
 const cors=origin&&origins.includes(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{};
 const reply=(status,data,extra={})=>({statusCode:status,headers:{'Content-Type':Buffer.isBuffer(data)?'application/octet-stream':'application/json; charset=utf-8','Cache-Control':'no-store',...cors,...extra},body:Buffer.isBuffer(data)?data.toString('base64'):JSON.stringify(data),isBase64Encoded:Buffer.isBuffer(data)});
 if(origin&&!origins.includes(origin))return reply(403,{error:'此页面尚未连接生成服务'});
 const method=event.httpMethod||'GET',path=(event.queryStringParameters||event.queryString||{}).op||'/config';
 if(method==='OPTIONS')return reply(204,'',{'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});
 try{
  if(path==='/config'&&method==='GET')return reply(200,{ready:Boolean(jobs&&token?.length>=24),needsAccess:true,chunkedVideo:true,provider:'MiniMax',...(jobs?await jobs.info():{budget:0,spent:0})});
  if(!jobs||!token||token.length<24)return reply(503,{error:'AI 生成服务尚未配置'});
  const actual=Buffer.from(headers.authorization||''),expected=Buffer.from('Bearer '+token);
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reply(401,{error:'请输入正确的内测口令'});
  if(path==='/jobs'&&method==='POST'){
   const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64'):Buffer.from(event.body||'');if(raw.length>4*1024*1024)return reply(413,{error:'照片太大，请缩小后再生成'});
   let input;try{input=JSON.parse(raw.toString());}catch{return reply(400,{error:'请求格式无效'});}return reply(200,await jobs.create(input.id,input));
  }
  const match=path.match(/^\/jobs\/([0-9a-f-]{36})(?:\/(video-info|video\/(\d+)))?$/i);
  if(!match||method!=='GET')return reply(404,{error:'找不到此请求'});
  if(!match[2])return reply(200,await jobs.query(match[1]));
  if(match[2]==='video-info')return reply(200,await media.info(match[1],await jobs.video(match[1])));
  if((await jobs.query(match[1])).status!=='success')throw new Error('视频尚未生成完成');
  return reply(200,await media.chunk(match[1],Number(match[3])));
 }catch(e){return reply(400,{error:e.message||'生成服务暂不可用',...(e.code==='not_found'?{code:'not_found'}:{})});}
};}
