import cloudbase from '@cloudbase/node-sdk';
export function cloudStore(env=process.env){
 const app=cloudbase.init({env:env.TCB_ENV||env.CLOUDBASE_ENV_ID}),db=app.database();let initialized;
 const base=()=>({count:Number(env.MOTION_BASE_COUNT||0),cost:Number(env.MOTION_BASE_COST||0)});
 const ready=()=>initialized??=(async()=>{for(const n of ['meme_motion_jobs','meme_motion_quota'])try{await db.createCollection(n);}catch(e){if(!/exist|已存在/i.test(e.message||''))throw e;}})().catch(e=>{initialized=null;throw e;});
 const get=async(c,id)=>(await c.where({_id:id}).get()).data[0];
 const store={
  async read(id){await ready();return get(db.collection('meme_motion_jobs'),id);},
  async info(){await ready();return await get(db.collection('meme_motion_quota'),'global')||base();},
  async atomic(id,fn){await ready();return db.runTransaction(async tx=>{
   const jobs=tx.collection('meme_motion_jobs'),quotas=tx.collection('meme_motion_quota');
   const data={row:await get(jobs,id),quota:await get(quotas,'global')||base()};const result=fn(data);
   if(data.row){const{_id,...row}=data.row;await jobs.doc(id).set(row);}
   const{_id,...quota}=data.quota;await quotas.doc('global').set(quota);return result;
  });},
  async cleanup(){await ready();const rows=(await db.collection('meme_motion_jobs').where({expires:db.command.lt(Date.now()),cleaned:db.command.neq(true)}).limit(30).get()).data;
   for(const r of rows){await storage.remove([r.imageFile,r.referenceFile,r.resultFile].filter(Boolean));await db.collection('meme_motion_jobs').doc(r.id).update({cleaned:true});}return rows.length;
  }
 };
 const storage={
  async ticket(cloudPath){const{data}=await app.getUploadMetadata({cloudPath});if(!data?.fileId||!data?.authorization||!data?.token||!data?.cosFileId||!data.url?.startsWith('https://'))throw Error('素材上传服务暂不可用');return{fileId:data.fileId,url:data.url,cloudPath,method:'PUT',headers:{key:encodeURIComponent(cloudPath),Signature:data.authorization,authorization:data.authorization,'x-cos-security-token':data.token,'x-cos-meta-fileid':data.cosFileId}};},
  async url(fileID){const r=await app.getTempFileURL({fileList:[{fileID,maxAge:600,urlType:'COS_URL'}]});const url=r.fileList?.[0]?.tempFileURL;if(!url?.startsWith('https://'))throw Error('素材地址暂不可用');return url;},
  async read(fileID,max){const url=await this.url(fileID),r=await fetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});if(!r.ok||Number(r.headers.get('content-length'))>max)throw Error('素材过大或上传尚未完成');const reader=r.body.getReader(),parts=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;total+=value.length;if(total>max)throw Error('素材超过大小限制');parts.push(value);}}finally{await reader.cancel();}return Buffer.concat(parts);},
  async save(cloudPath,fileContent){const r=await app.uploadFile({cloudPath,fileContent});if(!r.fileID)throw Error('生成视频保存失败，请重试获取原任务');return r.fileID;},
  async remove(fileList){if(fileList.length)await app.deleteFile({fileList});}
 };
 return {store,storage};
}
