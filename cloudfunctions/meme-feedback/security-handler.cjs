const {randomUUID,createHash}=require('node:crypto');const {fail,sign,verify,digest,checkText,callbackMessage,signature}=require('./security-core.cjs');const {validateFeedback}=require('./core.cjs');
function createSecurity({store,wechat,env=process.env,fetcher=fetch}){
 return async(req,res,url,body)=>{
  const op=url.searchParams.get('op');if(!op?.startsWith('security-'))return false;
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const plain=text=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end(text);};
  try{
   if(op==='security-callback'){
    const q=Object.fromEntries(url.searchParams);
    if(req.method==='GET'){signature(q,env);plain(q.echostr||'');return true;}
    if(req.method!=='POST')fail('Method not allowed',405);
    const envelope=await body(),event=callbackMessage(q,envelope,env);
    if(typeof event.Event==='string'&&event.Event.startsWith('xpay_')){
     if(!env.MEME_PAYMENT_CALLBACK_URL)fail('支付通知转发尚未配置',503);
     const target=new URL(env.MEME_PAYMENT_CALLBACK_URL);if(target.protocol!=='https:')fail('支付通知地址无效',503);
     for(const [key,value] of Object.entries(q))if(key!=='op')target.searchParams.set(key,value);
     const forwarded=await fetcher(target,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope),redirect:'error',signal:AbortSignal.timeout(10000)});
     const response=await forwarded.text();res.writeHead(forwarded.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(response);return true;
    }
    if((event.Event||event.event)==='wxa_media_check'){
     const trace=event.trace_id;if(typeof trace!=='string'||trace.length>128||!trace)fail('Invalid trace',400);
     await store.event(trace,Number(event.errcode)===0&&event.result?.suggest==='pass');
    }
    plain('success');return true;
   }
   if(op==='security-cleanup'){
    if(req.headers.authorization!=='Bearer '+env.MEME_SECURITY_SECRET||!env.MEME_SECURITY_SECRET)fail('Unauthorized',401);
    const jobs=await store.stale();for(const job of jobs){await store.remove(job.files||[]);await store.save({...job,cleaned:true,state:'expired'});}json(200,{cleaned:jobs.length});return true;
   }
   if(req.method!=='POST')fail('Method not allowed',405);
   if(op==='security-login'){
    const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown');const key=createHash('sha256').update('login:'+ip+':'+Math.floor(Date.now()/600000)).digest('hex');if(!await store.rate(key))fail('请求较频繁，请稍后重试',429);
    const uid=await wechat.login((await body()).code);json(200,{session:sign({kind:'session',uid,exp:Date.now()+90*60000},env)});return true;
   }
   const session=verify((req.headers.authorization||'').replace(/^Bearer /,''),env,'session'),data=await body();
   if(op==='security-check'){
    const text=typeof data.text==='string'?data.text:'';if(text.length>2000||!Array.isArray(data.images)||data.images.length>8)fail('检测内容过大',400);
    // Reuse the strict format/magic-byte validation already used for feedback attachments.
    const images=data.images.map(image=>validateFeedback({id:'00000000-0000-4000-8000-000000000000',title:'check',detail:'check',images:[image]}).images[0]);
    if(images.reduce((sum,x)=>sum+x.buffer.length,0)>2*1024*1024)fail('检测图片总大小超过2MB',413);
    if(!images.length&&!text.trim())fail('没有待检测内容',400);
    const key=createHash('sha256').update(session.uid+':'+Math.floor(Date.now()/600000)).digest('hex');if(!await store.rate(key))fail('检测较频繁，请稍后重试',429);
    await checkText(wechat.call,session.uid,text);
    const job={id:randomUUID(),uid:session.uid,hash:digest(text,images),state:'pending',files:[],traces:[],createdAt:Date.now(),expiresAt:Date.now()+35*60000,cleaned:false};await store.save(job);
    try{
     // Persist each uploaded file before further calls so interrupted work is cleanable.
     for(let i=0;i<images.length;i++){job.files.push(await store.upload(job.id,images[i],i));await store.save(job);}
     for(let i=0;i<job.files.length;i+=4){const results=await Promise.allSettled(job.files.slice(i,i+4).map(async file=>{const r=await wechat.call('media_check_async',{media_url:await store.url(file),media_type:2,version:2,scene:4,openid:session.uid});if(r.errcode!==0||!r.trace_id)fail('图片检测提交失败，请稍后重试');return r.trace_id;}));for(const r of results){if(r.status==='fulfilled')job.traces.push(r.value);}await store.save(job);if(results.some(x=>x.status==='rejected'))fail('图片检测提交失败，请稍后重试');}
     job.state=images.length?'pending':'pass';await store.save(job);json(200,{id:job.id,state:job.state});return true;
    }catch(e){job.state='failed';await store.save(job);try{await store.remove(job.files);await store.save({...job,cleaned:true});}catch{}throw e;}
   }
   if(op==='security-status'){
    if(typeof data.id!=='string'||!/^[a-f0-9-]{36}$/.test(data.id))fail('检测任务不存在',404);
    const job=await store.get(data.id);if(!job||job.uid!==session.uid)fail('检测任务不存在',404);
    if(job.expiresAt<Date.now())job.state='expired';
    if(job.state==='pending'){
     const results=await Promise.all(job.traces.map(t=>store.verdict(t)));
     if(results.some(x=>x?.pass===false))job.state='blocked';else if(job.traces.length===job.files.length&&results.every(x=>x?.pass===true))job.state='pass';
    }
    if(job.state!=='pending'&&!job.cleaned){await store.remove(job.files);job.cleaned=true;await store.save(job);}
    const receipt=job.state==='pass'?sign({kind:'receipt',uid:job.uid,hash:job.hash,exp:Date.now()+10*60000},env):undefined;
    json(200,{id:job.id,state:job.state,receipt});return true;
   }
   fail('Unknown security operation',404);
  }catch(e){json(e.status||503,{error:e.status?e.message:'内容检测暂不可用，请稍后重试'});return true;}
 };
}
module.exports={createSecurity};
