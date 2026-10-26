import {imageSize} from 'image-size';
import {createFile} from 'mp4box';
export function videoInfo(bytes){
 return new Promise((resolve,reject)=>{
  const file=createFile(false);let done=false;
  const end=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>end(Error('视频信息读取超时')),5000);
  file.onError=()=>end(Error('无法读取MP4视频，请换一个视频'));
  file.onReady=info=>{const v=info.videoTracks?.[0],width=Number(v?.video?.width||v?.track_width),height=Number(v?.video?.height||v?.track_height),duration=Number(v?.duration)/Number(v?.timescale);if(!width||!height||!Number.isFinite(duration)||duration<=0)return end(Error('MP4没有可用的视频画面'));end(null,{width,height,duration});};
  try{const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);buffer.fileStart=0;file.appendBuffer(buffer);file.flush();if(!done)end(Error('无法读取完整MP4视频'));}catch{end(Error('无法读取MP4视频，请换一个视频'));}
 });
}
const dims=(d,max)=>d.width>=200&&d.height>=200&&d.width<=max&&d.height<=max&&d.width/d.height>=1/3&&d.width/d.height<=3;
export async function validateMedia({mode,prompt,imageBytes,referenceBytes}){
 let im;try{im=imageSize(imageBytes);}catch{throw Error('照片读取失败，请重新选择');}
 const imageType=({jpg:'image/jpeg',png:'image/png',webp:'image/webp'})[im.type];
 if(!imageType||!dims(im,4096)||imageBytes.length>1024*1024)throw Error('请使用200～4096像素、1MB以内的JPG/PNG照片');
 const result={mode,prompt,imageBytes,imageType,image:'data:'+imageType+';base64,'+imageBytes.toString('base64'),cost:.3};
 if(mode==='imitate'){if(!referenceBytes?.length||referenceBytes.length>20*1024*1024)throw Error('参考视频最大20MB');const v=await videoInfo(referenceBytes);if(!dims(v,2048)||v.duration<2||v.duration>6.05)throw Error('参考视频需为2～6秒、宽高200～2048像素的MP4');result.referenceBytes=referenceBytes;result.cost=Math.ceil(v.duration)*.4;}
 return result;
}
