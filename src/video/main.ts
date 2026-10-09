import './style.css';
import {mount} from './view';
import {render,dimensions,type VideoStyle} from './render';
import {timeline} from './timeline.mjs';
mount();
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const input=(id:string)=>$<HTMLInputElement>(id);
const value=(id:string)=>Number(input(id).value);
const canvas=$<HTMLCanvasElement>('preview'),ctx=canvas.getContext('2d',{willReadFrequently:true})!;
const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
let mode='forward',source='',resultUrl='',blob:Blob|undefined,ready=false,busy=false,previewId=0,loadId=0;
let controller:AbortController|undefined,worker:Worker|undefined;
function status(text:string,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function style():VideoStyle{return {square:input('ratio').value==='square',size:value('size'),text:$<HTMLTextAreaElement>('text').value,font:value('font'),color:input('color').value,tx:value('tx'),ty:value('ty'),zoom:value('zoom'),cx:value('cx'),cy:value('cy')};}
function clearResult(){if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl='';blob=undefined;for(const id of ['result','download','share'])$(id).hidden=true;}
function paint(){if(!ready)return;const s=style(),d=dimensions(video,s);canvas.width=d.width;canvas.height=d.height;render(ctx,video,s);$('time').textContent=`${video.currentTime.toFixed(1)} / ${video.duration.toFixed(1)} 秒`;}
function stop(){previewId++;$('play').textContent='播放预览';}
function waitEvent(target:HTMLVideoElement,event:string,action:()=>void,signal?:AbortSignal){return new Promise<void>((resolve,reject)=>{
 const timer=setTimeout(()=>finish(new Error('读取视频超时，请换一个视频重试')),12000);
 const good=()=>finish(),bad=()=>finish(new Error('浏览器无法读取此视频，请尝试 MP4（H.264）')),abort=()=>finish(new DOMException('已取消','AbortError'));
 function finish(error?:Error){clearTimeout(timer);target.removeEventListener(event,good);target.removeEventListener('error',bad);signal?.removeEventListener('abort',abort);error?reject(error):resolve();}
 target.addEventListener(event,good,{once:true});target.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',abort,{once:true});
 if(signal?.aborted){abort();return;}try{action();}catch(e){finish(e instanceof Error?e:new Error('视频读取失败'));}
 });}
async function seek(time:number,signal?:AbortSignal){if(signal?.aborted)throw new DOMException('已取消','AbortError');if(Math.abs(video.currentTime-time)<.00001&&video.readyState>=2)return;await waitEvent(video,'seeked',()=>{video.currentTime=time;},signal);}
function plan(){const start=value('start'),end=value('end');if(end>video.duration+.001)throw new Error('结束时间不能超过视频长度');return timeline(start,end,value('speed'),mode);}
input('file').onchange=async()=>{
 const file=input('file').files?.[0];if(!file)return;const id=++loadId;
 stop();clearResult();ready=false;$<HTMLButtonElement>('export').disabled=true;$<HTMLButtonElement>('play').disabled=true;$('empty').hidden=false;
 if(file.size>100*1024*1024){status('视频超过 100 MB，请先截短再试',true);return;}
 if(source)URL.revokeObjectURL(source);source=URL.createObjectURL(file);$('name').textContent=file.name;status('正在读取视频…');
 try{await waitEvent(video,'loadeddata',()=>{video.src=source;video.load();});if(id!==loadId)return;
 if(!Number.isFinite(video.duration)||video.duration<=0||!video.videoWidth)throw new Error('无法确定视频长度，请换一个 MP4 文件');
 ready=true;input('start').value='0';input('end').value=Math.min(3,video.duration).toFixed(3);$('empty').hidden=true;$<HTMLButtonElement>('play').disabled=false;$<HTMLButtonElement>('export').disabled=false;paint();status(`已读取 ${video.videoWidth} × ${video.videoHeight} 视频，请选最长 6 秒片段`);
 }catch(e){if(id===loadId)status(e instanceof Error?e.message:'读取失败',true);}
};
for(const element of document.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input:not([type=file]),select,textarea'))element.oninput=()=>{stop();clearResult();paint();};
input('start').onchange=async()=>{try{plan();await seek(value('start'));paint();}catch(e){status(e instanceof Error?e.message:'片段无效',true);}};
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))b.onclick=()=>{
 stop();clearResult();mode=b.dataset.mode!;for(const other of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))other.setAttribute('aria-pressed',String(other===b));
 $('preset-note').textContent={forward:'保留原动作，配一句自己的话。',bounce:'动作来回循环，适合犹豫、嘴硬和反复试探。',reverse:'动作倒过来，试试把崩溃变成强行恢复。'}[mode]!;
};
$('play').onclick=async()=>{
 if($('play').textContent==='暂停预览'){stop();return;}
 try{const p=plan(),id=++previewId;$('play').textContent='暂停预览';let i=0;
 while(id===previewId&&!busy){await seek(p.times[i]);if(id!==previewId)break;paint();i=(i+1)%p.times.length;await new Promise(r=>setTimeout(r,p.delay));}
 }catch(e){stop();status(e instanceof Error?e.message:'预览失败',true);}
};
let dragging=false;
function position(event:PointerEvent){const r=canvas.getBoundingClientRect();input('tx').value=String(Math.max(.05,Math.min(.95,(event.clientX-r.left)/r.width)));input('ty').value=String(Math.max(.05,Math.min(.95,(event.clientY-r.top)/r.height)));clearResult();paint();}
canvas.onpointerdown=e=>{if(!ready||busy)return;stop();dragging=true;canvas.setPointerCapture(e.pointerId);position(e);};
canvas.onpointermove=e=>{if(dragging)position(e);};canvas.onpointerup=canvas.onpointercancel=()=>{dragging=false;};
function setBusy(active:boolean){busy=active;for(const el of document.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|HTMLButtonElement>('.controls input,.controls button,.controls textarea,.controls select,.result select,#play,#export'))el.disabled=active||(!ready&&(el.id==='play'||el.id==='export'));$('cancel').hidden=!active;$('progress').hidden=!active;}
$('cancel').onclick=()=>{controller?.abort();};
async function encode(frames:Uint8Array[],width:number,height:number,delay:number,signal:AbortSignal){return new Promise<Blob>((resolve,reject)=>{
 const encoder=worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
 const timer=setTimeout(()=>finish(undefined,new Error('编码超时，请缩短片段后重试')),60000);
 const abort=()=>finish(undefined,new DOMException('已取消','AbortError'));
 function finish(result?:Blob,error?:Error){clearTimeout(timer);signal.removeEventListener('abort',abort);encoder.terminate();worker=undefined;error?reject(error):resolve(result!);}
 signal.addEventListener('abort',abort,{once:true});
 encoder.onmessage=e=>{if(e.data.error)finish(undefined,new Error(e.data.error));else if(e.data.buffer)finish(new Blob([e.data.buffer],{type:'image/gif'}));else {$<HTMLProgressElement>('progress').value=.6+e.data.progress*.4;status(`正在编码 ${Math.round(e.data.progress*100)}%`);}};
 encoder.onerror=()=>finish(undefined,new Error('编码失败，请缩短片段后重试'));
 encoder.postMessage({frames,width,height,delay},frames.map(f=>f.buffer));
 });}
function download(){const a=$<HTMLAnchorElement>('download');a.click();}
$('export').onclick=async()=>{
 if(!ready||busy)return;
 try{
 const p=plan(),s=style(),d=dimensions(video,s);stop();clearResult();setBusy(true);controller=new AbortController();const signal=controller.signal;
 const capture=document.createElement('canvas');capture.width=d.width;capture.height=d.height;const c=capture.getContext('2d',{willReadFrequently:true})!;const frames:Uint8Array[]=[];
 for(let i=0;i<p.times.length;i++){await seek(p.times[i],signal);render(c,video,s);frames.push(new Uint8Array(c.getImageData(0,0,d.width,d.height).data.buffer));$<HTMLProgressElement>('progress').value=.6*(i+1)/p.times.length;status(`正在取帧 ${i+1} / ${p.times.length}`);}
 blob=await encode(frames,d.width,d.height,p.delay,signal);resultUrl=URL.createObjectURL(blob);const a=$<HTMLAnchorElement>('download');a.href=resultUrl;a.download='怪相馆-视频表情.gif';a.hidden=false;
 const result=$<HTMLImageElement>('result');result.src=resultUrl;result.hidden=false;
 const file=new File([blob],a.download,{type:'image/gif'});$('share').hidden=!(navigator.canShare?.({files:[file]}));status(`已生成 ${d.width} × ${d.height} · ${Math.round(blob.size/1024)} KB · 先保存到相册再发聊天`);download();
 }catch(e){status(e instanceof DOMException&&e.name==='AbortError'?'已取消，可以继续修改':e instanceof Error?e.message:'生成失败',!(e instanceof DOMException&&e.name==='AbortError'));}
 finally{setBusy(false);controller=undefined;paint();}
};
$('share').onclick=async()=>{if(!blob)return;try{await navigator.share({files:[new File([blob],'怪相馆-视频表情.gif',{type:'image/gif'})]});}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))status('无法打开分享菜单，请下载后打开文件',true);}};
window.addEventListener('pagehide',()=>{stop();controller?.abort();worker?.terminate();if(source)URL.revokeObjectURL(source);if(resultUrl)URL.revokeObjectURL(resultUrl);});
