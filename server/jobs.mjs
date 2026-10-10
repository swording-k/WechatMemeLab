import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';import {join} from 'node:path';import {videoRequest} from './minimax.mjs';
export async function createJobs({directory,budget,provider}){
 await mkdir(directory,{recursive:true,mode:0o700});const file=join(directory,'jobs.json');let jobs={};
 try{jobs=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw new Error('任务账本无法读取，停止创建付费任务');}
 let queue=Promise.resolve();const locked=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
 async function save(){const next=file+'.next';await writeFile(next,JSON.stringify(jobs),{mode:0o600});await rename(next,file);}
 const publicJob=j=>({id:j.id,status:j.status,error:j.error,cost:j.cost});
 const requireJob=id=>{const j=jobs[id];if(!j)throw new Error('任务不存在，请检查本次生成记录');return j;};
 return {
  create(id,input){return locked(async()=>{
   if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('请求编号无效');if(jobs[id])return publicJob(jobs[id]);videoRequest(input);
   const cost=input.mode==='photo'?1.35:2,spent=Object.values(jobs).reduce((total,j)=>total+j.cost,0);
   if(!Number.isFinite(budget)||budget<=0||spent+cost>budget+.0001)throw new Error('本轮生成预算已用完或尚未设置');
   if(Object.values(jobs).some(j=>['submitting','queued','preparing','processing'].includes(j.status)))throw new Error('上一条视频还在生成，请先查看结果');
   const job=jobs[id]={id,status:'submitting',cost,created:Date.now()};await save();
   try{const result=await provider.create(input);job.taskId=result.taskId;job.status='queued';}catch(e){job.status='unknown';job.error=e.message+'。提交结果不确定，已保留预算，请勿直接重试。';}
   await save();return publicJob(job);
  });},
  query(id){return locked(async()=>{const job=requireJob(id);if(job.taskId&&!['success','failed'].includes(job.status)){
   const result=await provider.query(job.taskId);Object.assign(job,result);if(result.status==='failed')job.error='MiniMax 未生成成功，请调整描述。';await save();
  }return publicJob(job);});},
  async video(id){const job=requireJob(id);if(job.status!=='success'||!job.fileId)throw new Error('视频尚未生成完成');return provider.result(job.fileId);},
  info(){return {budget,spent:Object.values(jobs).reduce((total,j)=>total+j.cost,0)};}
 };
}
