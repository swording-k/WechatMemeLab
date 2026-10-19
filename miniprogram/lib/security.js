const{encodeGif}=require('../core/engine');
const API='https://fitgenius-d0ghm1rz21cef6594-1441969311.ap-shanghai.app.tcloudbase.com/meme-feedback-api';
let session,sessionAt=0,notice=false;
const pending=new Map();
function request(op,data,token){return new Promise((resolve,reject)=>wx.request({url:API+'?op=security-'+op,method:'POST',header:{'content-type':'application/octet-stream',...(token?{Authorization:'Bearer '+token}:{})},data:JSON.stringify(data),timeout:60000,success:r=>r.statusCode===200?resolve(r.data):reject(Error(r.data?.error||'内容检测服务未就绪，请稍后重试')),fail:()=>reject(Error('内容检测连接失败，尚未放行，请稍后重试'))}));}
async function authorize(){if(!notice){const r=await wx.showModal({title:'生成前进行内容检测',content:'制作与反馈中的文字、图片及动图各帧将发送至本站后端和微信内容安全接口进行检测。检测图片为临时存储；编辑仍在本机完成。反馈内容及附件通过后将公开同步到 GitHub。',confirmText:'同意并继续',cancelText:'暂不生成'});if(!r.confirm)throw Error('已取消内容检测');notice=true;}
 if(!session||Date.now()-sessionAt>80*60000){const {code}=await new Promise((resolve,reject)=>wx.login({success:resolve,fail:reject}));const r=await request('login',{code});session=r.session;sessionAt=Date.now();}return session;}
async function check(data,status=()=>{},cancelled=()=>false){const token=await authorize();const key=JSON.stringify(data);let id=pending.get(key);if(!id){status('正在提交内容检测…');const r=await request('check',data,token);id=r.id;pending.set(key,id);if(pending.size>12)pending.delete(pending.keys().next().value);}
 const until=Date.now()+180000;
 while(Date.now()<until){if(cancelled())throw Error('已取消生成');const r=await request('status',{id},token);if(r.state==='pass'&&r.receipt){pending.delete(key);return r.receipt;}if(r.state!=='pending'){pending.delete(key);throw Error(r.state==='blocked'?'内容包含违规信息，请修改后重试':'内容检测未通过，请稍后重试');}status('微信正在检测，请稍候…');await new Promise(resolve=>setTimeout(resolve,1500));}
 throw Error('微信仍在检测中，请稍后用相同内容重试查询');}
async function checkFrames(frames,width,height,text,status,cancelled=()=>false){
 // WeChat only examines the first GIF frame: submit EVERY rendered frame as a single-frame GIF.
 if(text.trim())await check({text,images:[]},status,cancelled);
 for(let i=0;i<frames.length;i+=8){if(cancelled())throw Error('已取消生成');status(`准备检测画面 ${i+1}/${frames.length}`);const images=[];for(const frame of frames.slice(i,i+8)){const bytes=encodeGif([frame],width,100,()=>{},height);const view=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);images.push({type:'image/gif',data:wx.arrayBufferToBase64(view)});await new Promise(resolve=>setTimeout(resolve,0));}await check({text:'',images},message=>status(`${message}（${Math.min(i+8,frames.length)}/${frames.length}帧）`),cancelled);}
}
async function checkPhoto(path,status){
 const compressed=await new Promise((resolve,reject)=>wx.compressImage({src:path,quality:55,compressedWidth:720,compressedHeight:720,success:resolve,fail:reject}));
 const data=await new Promise((resolve,reject)=>wx.getFileSystemManager().readFile({filePath:compressed.tempFilePath,encoding:'base64',success:r=>resolve(r.data),fail:reject}));
 const type=data.startsWith('/9j/')?'image/jpeg':data.startsWith('iVBORw0KGgo')?'image/png':'';
 if(!type||data.length>1400000)throw Error('检测图片过大或格式不支持，请选用较小的JPG/PNG照片');
 await check({text:'',images:[{type,data}]},status);
}
module.exports={check,checkFrames,checkPhoto};
