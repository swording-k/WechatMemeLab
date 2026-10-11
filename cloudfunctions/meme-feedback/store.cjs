const cloudbase=require('@cloudbase/node-sdk');
const app=cloudbase.init({env:process.env.TCB_ENV||process.env.CLOUDBASE_ENV_ID});const db=app.database();
const feedback=db.collection('meme_feedback'),limits=db.collection('meme_feedback_limits');
let initialized;
async function ready(){return initialized??=(async()=>{for(const name of ['meme_feedback','meme_feedback_limits'])try{await db.createCollection(name);}catch(e){if(!/exist|已存在/i.test(e.message||''))throw e;}})().catch(e=>{initialized=undefined;throw e;});}
async function get(id){await ready();const r=await feedback.where({_id:id}).get();return r.data[0];}
async function claimRate(key){
 await ready();return db.runTransaction(async tx=>{
  const c=tx.collection('meme_feedback_limits'),r=await c.where({_id:key}).get(),n=r.data[0]?.count||0;
  if(n>=5)return false;await c.doc(key).set({count:n+1,createdAt:Date.now()});return true;
 });
}
module.exports={ready,get,claimRate,
 save:async data=>feedback.doc(data.id).set(data),
 pending:async()=>{await ready();const r=await feedback.where({state:'pending'}).orderBy('createdAt','asc').limit(20).get();return r.data;},
 ack:async(id,issueUrl)=>feedback.doc(id).update({state:'synced',issueUrl,syncedAt:Date.now()}),
 upload:async(id,f,i)=>{const r=await app.uploadFile({cloudPath:`meme-feedback/${id}/${i}.${f.ext}`,fileContent:f.buffer});if(!r.fileID)throw new Error('upload failed');return {fileID:r.fileID,type:f.type,name:f.name};},
 removeFiles:async files=>{if(files.length)await app.deleteFile({fileList:files.map(f=>f.fileID)});},
 url:async fileID=>{const r=await app.getTempFileURL({fileList:[fileID]});const url=r.fileList?.[0]?.tempFileURL;if(!url||!url.startsWith('https://'))throw new Error('file URL failed');return url;},
 download:async fileID=>{const r=await app.downloadFile({fileID});if(!r.fileContent)throw new Error('download failed');return r.fileContent;}
};
