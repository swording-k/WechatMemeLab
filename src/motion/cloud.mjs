export function inviteFromUrl(value){const url=new URL(value);return new URLSearchParams(url.hash.slice(1)).get('invite')||url.pathname.match(/\/try-([A-Za-z0-9_-]{24,64})\.html$/)?.[1]||'';}
// Thin browser adapter over the same persistent CloudBase tasks used by the mini-program.
export function createCloudTransport({endpoint,storage,fetcher=fetch,invite=''}){
 const url=new URL(endpoint);if(url.protocol!=='https:')throw Error('测试服务地址无效');
 const key='meme-web-test-v1:'+url.origin+url.pathname;
 let saved;try{saved=JSON.parse(storage.getItem(key)||'{}');}catch{saved={};}
 let clientId=saved.clientId||crypto.randomUUID(),code=invite||saved.invite||'',session=code===saved.invite?saved.session||'':'';
 const save=()=>storage.setItem(key,JSON.stringify({clientId,invite:code,session}));
 const send=async(op,data,token)=>{const u=new URL(endpoint);u.searchParams.set('op','web-'+op);const r=await fetcher(u.href,{method:'POST',headers:{'Content-Type':'application/octet-stream',Authorization:'Bearer '+token},body:JSON.stringify(data),signal:AbortSignal.timeout(120000)});let value;try{value=await r.json();}catch{throw Error('测试服务返回异常，请稍后查询原任务');}if(!r.ok)throw Object.assign(Error(value.error||'测试服务暂时不可用'),{status:r.status});return value;};
 async function login(){if(!code)throw Object.assign(Error('请打开完整邀请链接，或填写邀请码'),{inviteRequired:true});const r=await send('login',{clientId},code);if(!r.session)throw Error('测试登录未完成，请重试');session=r.session;save();}
 async function request(op,data={}){const formal=storage.getItem('meme-account-session-v1');if(formal){try{return await send(op,data,formal);}catch(e){if(e.status===401){storage.removeItem('meme-account-session-v1');storage.removeItem('meme-account-id-v1');throw Object.assign(Error('账户登录已过期，请重新登录'),{status:401});}throw e;}}if(!session)await login();try{return await send(op,data,session);}catch(e){if(e.status!==401)throw e;session='';await login();return send(op,data,session);}}
 const upload=async(ticket,data)=>{if(!ticket?.url?.startsWith('https://'))throw Error('素材上传地址无效');const r=await fetcher(ticket.url,{method:'PUT',headers:{'Content-Type':'application/octet-stream',...ticket.headers},body:data,signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('素材上传未完成，请查询原任务后重试');};
 function blob(data){const m=typeof data==='string'&&data.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/);if(!m)throw Error('素材格式无效，请重新选择');return new Blob([Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0))],{type:m[1]});}
 return{
  hasInvite:()=>Boolean(code||storage.getItem('meme-account-session-v1')),
  setInvite(value){code=String(value).trim();session='';save();},
  async api(path,body){
   if(path==='/config'){const c=await request('config');return{...c,maxJobs:c.remaining,count:0,budget:c.budgetEnforced?c.remaining*.2:0,reserved:0};}
   if(path==='/jobs'&&body){const p=await request('prepare',{id:body.id,mode:body.mode});if(p.uploads?.image)await upload(p.uploads.image,blob(body.image));if(p.uploads?.reference)await upload(p.uploads.reference,blob(body.reference));return request('create',{id:body.id,prompt:body.prompt,...(body.acceptedPriceFen!==undefined?{acceptedPriceFen:body.acceptedPriceFen,priceVersion:body.priceVersion}:{})});}
   const m=path.match(/^\/jobs\/([a-f0-9-]{36})$/i);if(m)return request('query',{id:m[1]});throw Error('操作不存在');
  },
  async media(id,kind){const r=await request('result',{id});if(r.kind!==kind)throw Error('作品类型不匹配，请重新查询');if(!r.url?.startsWith('https://'))throw Error('作品下载地址无效');const response=await fetcher(r.url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('作品暂时无法取回，请查询原任务重试');return response;}
 };
}
