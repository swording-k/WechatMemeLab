const {createHmac}=require('node:crypto');const {validateFeedback,authorized,uuid}=require('./core.cjs');
function createHandler(store,env=process.env){
 const secret=env.FEEDBACK_SYNC_SECRET,base=env.FEEDBACK_PUBLIC_URL;
 const origins=new Set((env.FEEDBACK_ORIGINS||'').split(',').filter(Boolean));
 return async(req,res)=>{
  const origin=req.headers.origin;
  const reply=(status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(Buffer.isBuffer(data)?data:JSON.stringify(data));};
  if(origin&&origins.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){if(!origin||!origins.has(origin))return reply(403,{error:'来源不允许'});return reply(204,'',{'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});}
  const url=new URL(req.url,'http://localhost'),op=url.searchParams.get('op')||'submit',id=url.searchParams.get('id');
  try{
   if(op==='health')return reply(200,{ok:true,service:'meme-feedback',version:'1.0.0'});
   if(op==='pending'||op==='ack'){
    if(!authorized(req.headers.authorization,secret))return reply(401,{error:'Unauthorized'});
    if(op==='pending'&&req.method==='GET'){const rows=await store.pending();return reply(200,{items:rows.map(r=>({id:r.id,type:r.type,title:r.title,detail:r.detail,device:r.device,images:r.files.map((f,i)=>({url:`${base}?op=image&id=${r.id}&slot=${i}`,name:f.name}))}))});}
    if(op==='ack'&&req.method==='POST'){const data=await readBody(req);if(!uuid.test(data.id||'')||!/^https:\/\/github\.com\/swording-k\/WechatMemeLab\/issues\/\d+$/.test(data.issueUrl||''))return reply(400,{error:'Invalid acknowledgement'});await store.ack(data.id,data.issueUrl);return reply(200,{ok:true});}
    return reply(405,{error:'Method not allowed'});
   }
   if(op==='image'&&req.method==='GET'){
    if(!uuid.test(id||''))return reply(404,{error:'Not found'});const row=await store.get(id),slot=Number(url.searchParams.get('slot'));const f=Number.isInteger(slot)&&slot>=0?row?.files?.[slot]:undefined;
    if(!f)return reply(404,{error:'Not found'});if(store.url){const location=await store.url(f.fileID);return reply(302,'',{'Location':location,'Cache-Control':'public, max-age=300'});}const data=await store.download(f.fileID);return reply(200,data,{'Content-Type':f.type,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=3600'});
   }
   if(op==='status'&&req.method==='GET'){if(!uuid.test(id||''))return reply(404,{error:'Not found'});const row=await store.get(id);if(!row)return reply(404,{error:'Not found'});return reply(200,{id:row.id,state:row.state,issueUrl:row.issueUrl||null});}
   if(op!=='submit'||req.method!=='POST')return reply(405,{error:'Method not allowed'});
   if(origin&&!origins.has(origin))return reply(403,{error:'来源不允许'});
   if(!secret||!base)return reply(503,{error:'反馈服务尚未配置'});
   const data=validateFeedback(await readBody(req));const existing=await store.get(data.id);if(existing)return reply(200,{id:data.id,state:existing.state,issueUrl:existing.issueUrl||null});
   const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();
   const key=createHmac('sha256',secret).update(ip+':'+Math.floor(Date.now()/600000)).digest('hex');
   if(!await store.claimRate(key))return reply(429,{error:'提交较频繁，请稍后再试'});
   const files=[];try{for(let i=0;i<data.images.length;i++)files.push(await store.upload(data.id,data.images[i],i));await store.save({id:data.id,type:data.type,title:data.title,detail:data.detail,device:data.device,files,state:'pending',createdAt:Date.now()});}catch(e){try{await store.removeFiles(files);}catch{}throw e;}
   return reply(201,{id:data.id,state:'pending',issueUrl:null});
  }catch(e){console.error('feedback_error',e.status||500,e.code||'unknown');return reply(e.status||503,{error:e.status?e.message:'反馈暂时无法保存，请稍后重试。内容和截图仍保留在页面。'});}
 };
}
async function readBody(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>3*1024*1024){const e=new Error('提交内容过大');e.status=413;throw e;}chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{const e=new Error('提交内容无法读取');e.status=400;throw e;}}
module.exports={createHandler};
