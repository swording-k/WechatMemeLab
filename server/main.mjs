import {createServer} from 'node:http';import {createMiniMax} from './minimax.mjs';import {createJobs} from './jobs.mjs';
const key=process.env.MINIMAX_API_KEY,host=process.env.AI_HOST||'127.0.0.1',token=process.env.AI_ACCESS_TOKEN||'';
if(!['127.0.0.1','localhost'].includes(host)&&token.length<24)throw new Error('公网服务必须设置至少 24 字符的 AI_ACCESS_TOKEN');
const provider=key?createMiniMax({key,base:process.env.MINIMAX_API_BASE||'https://api.minimax.cn'}):undefined;
const jobs=provider?await createJobs({directory:process.env.AI_DATA_DIR||'work/ai-server',budget:Number(process.env.AI_BUDGET_CNY||0),provider}):undefined;
const origins=new Set((process.env.AI_ALLOWED_ORIGINS||'http://127.0.0.1:5173,http://127.0.0.1:4175').split(','));
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=createServer(async(req,res)=>{
 const origin=req.headers.origin;if(origin&&!origins.has(origin))return send(res,403,{error:'此页面尚未连接生成服务'});
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 const url=new URL(req.url,'http://localhost'),path=url.pathname.replace(/^\/api\/ai/,'');
 if(path==='/config')return send(res,200,{ready:Boolean(jobs),needsAccess:Boolean(token),prices:{text:2,photo:1.35},provider:'MiniMax',...(jobs?jobs.info():{})});
 if(token&&req.headers.authorization!==`Bearer ${token}`)return send(res,401,{error:'请输入正确的内测口令'});
 if(!jobs)return send(res,503,{error:'AI 创作尚未连接生成服务'});
 try{
  if(path==='/jobs'&&req.method==='POST'){
   let text='';for await(const chunk of req){text+=chunk;if(text.length>8_100_000){req.destroy();return;}}
   const input=JSON.parse(text);return send(res,200,await jobs.create(input.id,input));
  }
  const match=path.match(/^\/jobs\/([0-9a-f-]{36})(\/video)?$/i);if(!match||req.method!=='GET')return send(res,404,{error:'找不到此请求'});
  if(!match[2])return send(res,200,await jobs.query(match[1]));
  const remote=new URL(await jobs.video(match[1]));const allowed=['minimax.chat','minimax.cn','minimax.io','hailuoai.com','myqcloud.com','mmcdn.cn'];
  if(remote.protocol!=='https:'||!allowed.some(domain=>remote.hostname===domain||remote.hostname.endsWith('.'+domain)))throw new Error('生成的视频下载域名未通过校验');
  const video=await fetch(remote,{signal:AbortSignal.timeout(90000),redirect:'error'});if(!video.ok||!video.headers.get('content-type')?.startsWith('video/'))throw new Error('生成视频暂时无法下载，请稍后重试');
  const chunks=[];let bytes=0;for await(const chunk of video.body){bytes+=chunk.length;if(bytes>100*1024*1024)throw new Error('生成视频过大，无法导入编辑器');chunks.push(chunk);}
  res.writeHead(200,{'Content-Type':video.headers.get('content-type'),'Cache-Control':'no-store','Content-Length':bytes});res.end(Buffer.concat(chunks));
 }catch(e){send(res,400,{error:e instanceof SyntaxError?'请求格式无效':e.message,...(e.message?.startsWith('任务不存在')?{code:'not_found'}:{})});}
});
server.listen(Number(process.env.AI_PORT||8787),host,()=>console.log('AI service listening; credentials stay on the server.'));
