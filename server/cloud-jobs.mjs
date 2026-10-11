import {videoRequest} from './minimax.mjs';
const collection='meme_ai_jobs',ledger='meme_ai_budget',terminal=new Set(['success','failed']);
const publicJob=j=>({id:j.id,status:j.status,error:j.error||null,cost:j.cents/100});
export function createCloudJobs({repository,provider,budget}){
 const limit=Number.isFinite(budget)?Math.max(0,Math.floor(budget*100)):0;
 const read=id=>repository.transact(async tx=>{const j=await tx.get(collection,id);if(!j)throw Object.assign(new Error('任务不存在，请检查本次生成记录'),{code:'not_found'});return j;});
 return {
  async create(id,input){
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||''))throw new Error('请求编号无效');videoRequest(input);
   const reserved=await repository.transact(async tx=>{
    const existing=await tx.get(collection,id);if(existing)return {job:existing,created:false};
    const account=await tx.get(ledger,'total')||{spent:0,active:null};const cents=input.mode==='photo'?135:200;
    if(account.active)throw new Error('上一条视频还在生成或提交未确认，请先查看结果');
    if(!limit||account.spent+cents>limit)throw new Error('本轮生成预算已用完或尚未设置');
    const job={id,status:'submitting',cents,createdAt:Date.now()};
    await tx.set(collection,id,job);await tx.set(ledger,'total',{spent:account.spent+cents,active:id});return {job,created:true};
   });
   if(!reserved.created)return publicJob(reserved.job);
   let update;try{const result=await provider.create(input);update={status:'queued',taskId:result.taskId};}catch(e){update={status:e.rejected?'failed':'unknown',error:e.message+(e.rejected?'':'。提交未确认，请保留任务记录，不要再次创建。'),...(e.rejected?{cents:0}:{})};}
   return repository.transact(async tx=>{const job=await tx.get(collection,id);if(!job)throw new Error('任务记录丢失，请勿重试收费请求');const next={...job,...update};await tx.set(collection,id,next);if(update.status==='failed'){const account=await tx.get(ledger,'total');await tx.set(ledger,'total',{spent:account.spent-job.cents,active:account.active===id?null:account.active});}return publicJob(next);});
  },
  async query(id){const job=await read(id);if(!job.taskId||terminal.has(job.status))return publicJob(job);const result=await provider.query(job.taskId);
   return repository.transact(async tx=>{const current=await tx.get(collection,id);if(terminal.has(current.status))return publicJob(current);const next={...current,...result,...(result.status==='failed'?{error:'生成服务未完成这次动作，请修改描述。'}:{})};await tx.set(collection,id,next);if(terminal.has(result.status)){const a=await tx.get(ledger,'total');if(a.active===id)await tx.set(ledger,'total',{...a,active:null});}return publicJob(next);});
  },
  async video(id){const j=await read(id);if(j.status!=='success'||!j.fileId)throw new Error('视频尚未生成完成');return provider.result(j.fileId);},
  async info(){return repository.transact(async tx=>({budget:limit/100,spent:((await tx.get(ledger,'total'))?.spent||0)/100}));}
 };
}
