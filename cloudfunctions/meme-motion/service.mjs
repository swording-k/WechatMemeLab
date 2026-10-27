import {createHash} from 'node:crypto';
import {catalog,quote,PRICE_VERSION} from '../../server/motion/pricing.mjs';
import {MODELS} from '../../server/motion/provider.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const uuid=s=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s||'');
export function createMotion({store,storage,provider,validate,verifyInput,inspectResult,inspectImage,budget=3,maxJobs=4,budgetEnforced=true,activeScope='global',now=Date.now}){
 const activeKey=uid=>activeScope==='user'?'active_'+hash(uid):'active';
 const publicRow=r=>({id:r.id,mode:r.mode,status:r.status,error:r.error,created:r.created});
 async function owned(uid,id){if(!uuid(id))throw Object.assign(Error('任务不存在'),{status:404});const r=await store.read(id);if(!r||r.uid!==uid)throw Object.assign(Error('任务不存在'),{status:404});if(r.expires<now())throw Object.assign(Error('任务已过期，请重新制作'),{status:410});return r;}
 async function finish(id,changes){return store.atomic(id,s=>{Object.assign(s.row,changes);const key=activeKey(s.row.uid);if(['success','failed'].includes(s.row.status)&&s.quota[key]===id)delete s.quota[key];return publicRow(s.row);});}
 async function reconcile(uid){
  const key=activeKey(uid),active=(await store.info())[key];if(!active)return;
  const row=await store.read(active);
  if(!row||row.expires<now())return store.atomic(active,s=>{if(s.quota[key]===active)delete s.quota[key];if(s.row)s.row.status='expired';});
  if(['success','failed'].includes(row.status))return finish(active,{});
  if(row.taskId)return finish(active,await provider.query(row.taskId));
  if(row.status==='submitting'&&now()-row.submitted>120000)return finish(active,{status:'unknown',error:'提交结果待确认，请联系开发者查询原任务，暂勿重复生成'});
 }
 return {
  reconcile,
  async info(){const q=await store.info();return{budgetEnforced,available:!budgetEnforced||(Number.isFinite(budget)&&budget>0&&q.count<maxJobs&&q.cost+.2<=budget+.000001),remaining:budgetEnforced?Math.max(0,Math.min(maxJobs-q.count,Math.floor((budget-q.cost+.000001)/.2))):null,models:MODELS,pricing:catalog()};},
  async prepare(uid,{id,mode}){
   if(!uuid(id)||!Object.hasOwn(MODELS,mode))throw Error('制作参数无效');
   await store.atomic(id,s=>{if(s.row){if(s.row.uid!==uid)throw Error('任务不存在');if(s.row.mode!==mode)throw Error('任务内容已变化');return;}s.row={id,uid,mode,status:'draft',created:now(),expires:now()+24*3600000};});
   const row=await owned(uid,id);if(row.status!=='draft')return publicRow(row);
   const prefix=`meme-motion/${hash(uid).slice(0,24)}/${id}`;
   const image=mode==='draw'?undefined:await storage.ticket(prefix+'/input.jpg');const reference=mode==='imitate'?await storage.ticket(prefix+'/reference.mp4'):undefined;
   await store.atomic(id,s=>{if(s.row.status==='draft'){if(image)s.row.imageFile=image.fileId;if(reference)s.row.referenceFile=reference.fileId;s.row.prefix=prefix;}});
   return{...publicRow(row),uploads:{...(image?{image}:{}),...(reference?{reference}:{})}};
  },
  async create(uid,data){
   const row=await owned(uid,data.id);const prompt=typeof data.prompt==='string'?data.prompt.trim():'';
   if(prompt.length>800||(row.mode!=='imitate'&&!prompt))throw Error('请用800字以内描述创意');
   if(row.status!=='draft'){if(row.promptHash!==hash(prompt))throw Error('任务内容已变化，请新建任务');return publicRow(row);}
   await reconcile(uid);
   if(row.mode!=='draw'&&!row.imageFile)throw Error('请先上传照片');
   const imageBytes=row.mode==='draw'?undefined:await storage.read(row.imageFile,1024*1024);
   await verifyInput(uid,{...data,prompt,imageBytes});
   const input=await validate({mode:row.mode,prompt,imageBytes,...(row.mode==='imitate'?{referenceBytes:await storage.read(row.referenceFile,20*1024*1024)}:{})});
   const claimed=await store.atomic(row.id,s=>{
    if(s.row.status!=='draft'){if(s.row.promptHash!==hash(prompt))throw Error('任务内容已变化');return false;}
    if(s.quota[activeKey(uid)])throw Error('已有动作任务进行中，请先查询原任务');
    if(!Number.isFinite(input.cost)||input.cost<0||(budgetEnforced&&(!Number.isFinite(budget)||!Number.isSafeInteger(maxJobs)||maxJobs<1||s.quota.count>=maxJobs||s.quota.cost+input.cost>budget+.000001)))throw Error('免费体验额度暂时用完，请稍后再来');
    s.quota.count++;s.quota.cost+=input.cost;s.quota[activeKey(uid)]=row.id;
    Object.assign(s.row,{status:'submitting',cost:input.cost,model:MODELS[row.mode],priceVersion:PRICE_VERSION,priceFen:quote(row.mode,input.duration).priceFen,promptHash:hash(prompt),submitted:now()});return true;
   });
   if(!claimed)return publicRow(await owned(uid,row.id));
   try{const taskId=await provider.create(input);await finish(row.id,{taskId,status:'queued'});}
   catch(e){await store.atomic(row.id,s=>{if(e.rejected){s.quota.cost-=s.row.cost;s.row.cost=0;const key=activeKey(uid);if(s.quota[key]===row.id)delete s.quota[key];s.row.status='failed';s.row.error='生成服务未接受本次请求，请调整素材后重试';}else{s.row.status='unknown';s.row.error='提交结果还未确认，请查询原任务，暂勿重复生成';}});}
   finally{try{await storage.remove([row.imageFile,row.referenceFile].filter(Boolean));}catch{}}
   return publicRow(await owned(uid,row.id));
  },
  async query(uid,id){
   const row=await owned(uid,id);
   if(row.taskId&&!['success','failed'].includes(row.status))return finish(id,await provider.query(row.taskId));
   if(row.status==='submitting'&&now()-row.submitted>120000)return finish(id,{status:'unknown',error:'提交结果待确认，请联系开发者查询原任务，暂勿重复生成'});
   return publicRow(row);
  },
  async result(uid,id){
   let row=await owned(uid,id);const image=['draw','edit'].includes(row.mode);if(row.status!=='success'||!(image?row.imageUrl:row.videoUrl))throw Error('作品尚未完成，请继续查询');
   if(!row.resultFile){
    const bytes=image?await provider.downloadImage(row.imageUrl):await provider.download(row.videoUrl);const info=image?await inspectImage(bytes):await inspectResult(bytes);
    const resultFile=await storage.save(row.prefix+(image?'/result.png':'/result.mp4'),bytes);
    await store.atomic(id,s=>{s.row.resultFile=resultFile;s.row.resultInfo=info;});row=await owned(uid,id);
   }
   return{...row.resultInfo,kind:image?'image':'video',url:await storage.url(row.resultFile)};
  }
 };
}
