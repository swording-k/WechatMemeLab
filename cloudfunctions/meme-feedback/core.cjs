const {timingSafeEqual}=require('node:crypto');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function bad(message){const e=new Error(message);e.status=400;throw e;}
function validateFeedback(v){
 if(!v||!uuid.test(v.id||''))bad('反馈编号无效，请刷新重试');
 const title=String(v.title||'').trim(),detail=String(v.detail||'').trim(),device=String(v.device||'').trim();
 if(!title||title.length>80||!detail||detail.length>1500||device.length>120)bad('请填写标题和描述，并留意字数限制');
 if(v.website)bad('请重试');
 if(!Array.isArray(v.images||[])||(v.images||[]).length>3)bad('最多添加三张图片');
 let total=0;
 const images=(v.images||[]).map((f,i)=>{
  const data=String(f.data||'');if(data.length>1400000||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))bad('图片太大或无法读取');
  const buffer=Buffer.from(data,'base64');let type,ext;
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){type='image/png';ext='png';}
  else if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255){type='image/jpeg';ext='jpg';}
  else if(['GIF87a','GIF89a'].includes(buffer.subarray(0,6).toString())){type='image/gif';ext='gif';}
  else if(buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP'){type='image/webp';ext='webp';}
  else bad('请上传有效的 PNG、JPG、WebP 或 GIF 图片');
  if(f.type!==type||buffer.length<16||buffer.length>1024*1024)bad('图片格式不符或超过 1 MB');
  total+=buffer.length;return {buffer,type,ext,name:`screenshot-${i+1}.${ext}`};
 });
 if(total>2*1024*1024)bad('图片总大小不能超过 2 MB');
 return {id:v.id,title,detail,device,type:['bug','idea','other'].includes(v.type)?v.type:'bug',images};
}
function authorized(header,secret){if(!secret)return false;const a=Buffer.from(header||''),b=Buffer.from('Bearer '+secret);return a.length===b.length&&timingSafeEqual(a,b);}
module.exports={validateFeedback,authorized,uuid};
