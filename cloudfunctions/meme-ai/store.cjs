const cloudbase=require('@cloudbase/node-sdk');
const app=cloudbase.init({env:process.env.TCB_ENV||process.env.CLOUDBASE_ENV_ID});const db=app.database();let ready;
const initialize=()=>ready??=(async()=>{for(const c of ['meme_ai_jobs','meme_ai_budget','meme_ai_media'])try{await db.createCollection(c);}catch(e){if(!/exist|已存在/i.test(e.message||''))throw e;}})().catch(e=>{ready=undefined;throw e;});
const {createRepository}=require('./repository.cjs');const repository=createRepository(db,initialize);
const mediaStore={
 get:async id=>{await initialize();return (await db.collection('meme_ai_media').where({_id:id}).get()).data[0];},
 save:(id,data)=>db.collection('meme_ai_media').doc(id).set(data),
 upload:async(id,buffer)=>{const r=await app.uploadFile({cloudPath:`meme-ai/${id}/result.mp4`,fileContent:buffer});if(!r.fileID)throw new Error('视频保存失败');return r.fileID;},
 url:async fileID=>{const r=await app.getTempFileURL({fileList:[fileID]});const url=r.fileList?.[0]?.tempFileURL;if(!url)throw new Error('视频地址读取失败');return url;}
};
module.exports={repository,mediaStore};
