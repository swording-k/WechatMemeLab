import {dimensions,render,type VideoStyle} from '../video/render';

/** Create a chat-size GIF locally; never calls the AI service. */
export async function makeGif(blob:Blob,text:string,progress:(value:number)=>void,signal:AbortSignal){
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
 const url=URL.createObjectURL(blob);let worker:Worker|undefined;
 async function wait(event:string,action:()=>void){await new Promise<void>((resolve,reject)=>{
  const timer=setTimeout(()=>finish(new Error('读取动作超时，请重试制作 GIF')),15000);
  const good=()=>finish(),bad=()=>finish(new Error('无法读取动作，请下载视频后重试')),abort=()=>finish(new DOMException('已取消','AbortError'));
  function finish(error?:Error){clearTimeout(timer);video.removeEventListener(event,good);video.removeEventListener('error',bad);signal.removeEventListener('abort',abort);error?reject(error):resolve();}
  if(signal.aborted){abort();return;}video.addEventListener(event,good,{once:true});video.addEventListener('error',bad,{once:true});signal.addEventListener('abort',abort,{once:true});action();
 });}
 try{
  await wait('loadeddata',()=>{video.src=url;video.load();});
  if(!Number.isFinite(video.duration)||video.duration<=0)throw new Error('动作时长无效');
  const style:VideoStyle={square:false,size:240,text,font:.09,color:'#ffffff',tx:.5,ty:.86,zoom:1,cx:.5,cy:.5};
  const {width,height}=dimensions(video,style),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!,frames:Uint8Array[]=[];
  const duration=Math.min(6,video.duration),count=Math.max(1,Math.ceil(duration*12));
  for(let i=0;i<count;i++){
   if(signal.aborted)throw new DOMException('已取消','AbortError');
   const t=Math.min(i/12,Math.max(0,video.duration-.05));
   if(Math.abs(video.currentTime-t)>.001)await wait('seeked',()=>{video.currentTime=t;});
   render(ctx,video,style);frames.push(new Uint8Array(ctx.getImageData(0,0,width,height).data.buffer));progress((i+1)/count*.6);
  }
  return await new Promise<Blob>((resolve,reject)=>{
   worker=new Worker(new URL('../video/worker.ts',import.meta.url),{type:'module'});
   const timer=setTimeout(()=>finish(undefined,new Error('GIF 编码超时，请重试')),60000);
   const abort=()=>finish(undefined,new DOMException('已取消','AbortError'));
   function finish(result?:Blob,error?:Error){clearTimeout(timer);signal.removeEventListener('abort',abort);worker?.terminate();worker=undefined;error?reject(error):resolve(result!);}
   signal.addEventListener('abort',abort,{once:true});
   worker.onmessage=e=>{if(e.data.error)finish(undefined,new Error(e.data.error));else if(e.data.buffer)finish(new Blob([e.data.buffer],{type:'image/gif'}));else progress(.6+e.data.progress*.4);};
   worker.onerror=()=>finish(undefined,new Error('GIF 编码失败，请重试'));
   worker.postMessage({frames,width,height,delay:80},frames.map(f=>f.buffer));
  });
 }finally{worker?.terminate();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
