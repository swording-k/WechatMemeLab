const {authorize}=require('./security');
const ENDPOINT='https://fitgenius-d0ghm1rz21cef6594-1441969311.ap-shanghai.app.tcloudbase.com/meme-motion-api';
function request(op,data={}){
 return authorize().then(token=>new Promise((resolve,reject)=>wx.request({url:ENDPOINT+'?op='+op,method:'POST',header:{'content-type':'application/octet-stream',Authorization:'Bearer '+token},data:JSON.stringify(data),timeout:120000,success:r=>r.statusCode===200?resolve(r.data):reject(Object.assign(Error(r.data?.error||'动作服务暂时不可用，请稍后查询原任务'),{status:r.statusCode})),fail:()=>reject(Error('网络连接未完成，请保留任务记录并继续查询，勿重复生成'))})));
}
function upload(ticket,filePath){
 return new Promise((resolve,reject)=>wx.getFileSystemManager().readFile({filePath,success:file=>wx.request({url:ticket.url,method:'PUT',data:file.data,header:{'content-type':'application/octet-stream',...ticket.headers},timeout:120000,success:r=>r.statusCode>=200&&r.statusCode<300?resolve():reject(Error('素材上传未完成，请重试')),fail:e=>reject(Error(/domain|合法/i.test(e.errMsg||'')?'素材上传域名尚未配置，请联系开发者':'素材上传失败，请检查网络后重试'))}),fail:()=>reject(Error('素材文件无法读取，请重新选择'))}));
}
async function image(path){
 const compressed=await new Promise((resolve,reject)=>wx.compressImage({src:path,quality:60,compressedWidth:720,compressedHeight:720,success:resolve,fail:reject}));
 const data=await new Promise((resolve,reject)=>wx.getFileSystemManager().readFile({filePath:compressed.tempFilePath,encoding:'base64',success:r=>resolve(r.data),fail:reject}));
 const type=data.startsWith('/9j/')?'image/jpeg':data.startsWith('iVBOR')?'image/png':'';
 if(!type||data.length>1398100)throw Error('照片仍过大或格式不支持，请换一张较小的JPG/PNG照片');
 return {path:compressed.tempFilePath,data,type};
}
function download(url,id,kind='video'){
 if(!/^https:\/\//.test(url))return Promise.reject(Error('视频地址无效，请重新获取原任务'));
 const filePath=`${wx.env.USER_DATA_PATH}/motion-${id}.${kind==='image'?'png':'mp4'}`;
 return new Promise((resolve,reject)=>{
  const task=wx.downloadFile({url,filePath,timeout:120000,success:r=>r.statusCode===200?resolve(r.filePath||filePath):reject(Error('视频尚未下载完成，请重新获取原任务')),fail:e=>reject(Error(/domain|合法/i.test(e.errMsg||'')?'视频下载域名尚未配置，请联系开发者':'下载中断，请重新获取原任务，无需重新生成'))});
  task?.onProgressUpdate?.(r=>{if(r.totalBytesExpectedToWrite>(kind==='image'?10:80)*1024*1024)task.abort();});
 });
}
function handoff(id,path,caption){
 if(!/^[a-f0-9-]{36}$/i.test(id)||!path.startsWith(wx.env.USER_DATA_PATH+'/motion-'))throw Error('成片尚未就绪，请先获取动作');
 wx.setStorageSync('meme-motion-handoff',{id,path,caption:String(caption||'').slice(0,60)});
}
module.exports={request,upload,image,download,handoff};
