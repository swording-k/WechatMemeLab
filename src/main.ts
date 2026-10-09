import './style.css';
import './ui/mode-nav.css';
import './ui/product-footer.css';
import {installFraming} from './ui/framing';
import {installSculpt} from './ui/sculpt';
import {mountView} from './ui/view';
import {defaults,templates,DURATION,type Settings,type RenderAssets} from './render/types';
import {drawFrame} from './render/frame';
import {loadAssets} from './render/assets';
import {exportGif} from './export/client';
import {detectFaces,type Face} from './photo/detect';
import {encodeRecipe,decodeRecipe} from './share/recipe.mjs';
import {faceToSettings,fitPhoto} from './photo/geometry.mjs';

mountView();
for(const link of document.querySelectorAll<HTMLAnchorElement>('a[href="#phone-tutorial"]'))link.onclick=()=>{document.querySelector<HTMLDetailsElement>('#phone-tutorial')!.open=true;};
const $=<T extends HTMLElement=HTMLElement>(selector:string):T=>document.querySelector(selector)!;
let settings:Settings={...defaults};
let image:CanvasImageSource,bitmap:ImageBitmap|undefined,samplePromises=new Map<string,Promise<HTMLImageElement>>();
let assets:RenderAssets={},ready=false,busy=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
let loadId=0,photoVersion=0,revision=0,faces:Face[]=[],phase=0,lastTime=0,lastPaint=0,resultUrl='';
let resultBlob:Blob|undefined,resultName='';
const preview=$<HTMLCanvasElement>('#preview');
const ctx=preview.getContext('2d')!;
const exportButton=$<HTMLButtonElement>('#export');
exportButton.disabled=true;
const framing=installFraming(preview,settings,()=>({image,...dimensions()}),()=>{revision++;sync();},()=>ready&&!busy);
const sculpt=installSculpt(preview,settings,()=>{revision++;},()=>ready&&!busy&&framing.mode()==='effect');
function status(text:string,error=false){$('#status').textContent=text;$('#status').classList.toggle('error',error);}
function updateCaption(){settings.caption=$<HTMLInputElement>('#caption').value;$('#char-count').textContent=`${settings.caption.length} / 20`;}
function suggestions(){
  $('.suggestions').replaceChildren(...templates.find(t=>t.id===settings.template)!.suggestions.map(text=>{
    const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>{$<HTMLInputElement>('#caption').value=text;updateCaption();};return b;
  }));
}
function sync(){
  const radius=$<HTMLInputElement>('#radius');radius.min=String(Math.min(.03,settings.radius));radius.max=String(Math.max(.48,settings.radius));
  for(const key of ['zoom','x','y','radius'] as const)$<HTMLInputElement>(`#${key}`).value=String(settings[key]);
  for(const key of ['focusX','focusY'] as const)$<HTMLInputElement>(`#${key}`).value=String(settings[key]*100);
  $('#zoom-value').textContent=`${settings.zoom.toFixed(2)}×`;framing.sync();
}
function selectTemplate(id:Settings['template']){
  settings.template=id;sculpt.active();framing.sync();const t=templates.find(t=>t.id===id)!;
  document.querySelectorAll<HTMLButtonElement>('[data-template]').forEach(b=>{const active=b.dataset.template===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  $('#active-name').textContent=`${t.title} · 循环播放`;$<HTMLInputElement>('#caption').value=t.caption;updateCaption();suggestions();phase=0;
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-template]'))b.onclick=()=>selectTemplate(b.dataset.template as Settings['template']);
$('#caption').oninput=updateCaption;
function syncCaptionStyle(){
 for(const key of ['captionX','captionY','captionSize','captionColor','captionStyle'] as const)$<HTMLInputElement>(`#${key}`).value=String(settings[key]??defaults[key]);
 $('#captionSize-value').textContent=String(settings.captionSize??35);
}
for(const key of ['captionX','captionY','captionSize'] as const)$(`#${key}`).oninput=()=>{settings[key]=Number($<HTMLInputElement>(`#${key}`).value);syncCaptionStyle();};
$('#captionColor').oninput=()=>{settings.captionColor=$<HTMLInputElement>('#captionColor').value;};
$('#captionStyle').onchange=()=>{settings.captionStyle=$<HTMLSelectElement>('#captionStyle').value as Settings['captionStyle'];};
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-caption-pos]'))b.onclick=()=>{settings.captionX=50;settings.captionY=Number(b.dataset.captionPos);syncCaptionStyle();};
$('#caption-reset').onclick=()=>{Object.assign(settings,{captionX:50,captionY:96,captionSize:35,captionColor:'#ffffff',captionStyle:'meme'});syncCaptionStyle();};

for(const key of ['focusX','focusY'] as const)$(`#${key}`).oninput=()=>{revision++;settings[key]=Number($<HTMLInputElement>(`#${key}`).value)/100;};
for(const key of ['intensity','speed','size','radius'] as const)$(`#${key}`).oninput=()=>{
  settings[key]=Number($<HTMLInputElement>(`#${key}`).value);if(key==='radius')revision++;
  if(key==='speed')$(`#${key}-value`).textContent=`${settings[key].toFixed(2)}×`;
  if(key==='intensity')$('#intensity-value').textContent=settings.intensity<.5?'轻一点':settings.intensity>.8?'使劲整':'刚刚好';
};
function resetPosition(){delete settings.petFace;delete settings.petRotation;const view=image?fitPhoto(dimensions().w,dimensions().h):{zoom:1,x:0,y:0};Object.assign(settings,{...view,focusX:.5,focusY:.5,radius:.35,petX:0,petY:0,petScale:1});framing.reset();revision++;sync();}
$('#reset').onclick=resetPosition;
function background(color:string){settings.background=color;$<HTMLInputElement>('#background').value=color;for(const b of document.querySelectorAll<HTMLButtonElement>('[data-color]')){const active=b.dataset.color===color;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-color]'))b.onclick=()=>background(b.dataset.color!);
$('#background').oninput=()=>background($<HTMLInputElement>('#background').value);
function playButton(){const b=$('#pause');b.textContent=paused?'▶':'Ⅱ';b.setAttribute('aria-label',paused?'播放预览':'暂停预览');}
$('#pause').onclick=()=>{paused=!paused;playButton();};playButton();
preview.onpointerdown=e=>{
  if(!ready||busy||settings.template==='custom'||framing.mode()!=='effect')return;
  revision++;const r=preview.getBoundingClientRect();
  settings.focusX=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));settings.focusY=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));sync();
  if(paused)phase=settings.template==='twist'?.25:.5;
};
function dimensions(){const src=image as {width?:number;height?:number;naturalWidth?:number;naturalHeight?:number};return {w:src.naturalWidth||src.width||1,h:src.naturalHeight||src.height||1};}
function chooseFace(index:number,reframe=$<HTMLInputElement>('#auto-frame').checked){const face=faces[index];if(!face)return;const {w,h}=dimensions();Object.assign(settings,faceToSettings(w,h,face,reframe?undefined:settings));revision++;sync();$('#face-status').textContent=`已定位第 ${index+1} 张脸 · 取景可手动调整`;for(const b of document.querySelectorAll<HTMLButtonElement>('[data-face]'))b.setAttribute('aria-pressed',String(Number(b.dataset.face)===index));}
async function locate(seq:number){
  const currentRevision=revision;$<HTMLButtonElement>('#auto-face').disabled=true;$('#face-status').textContent='正在本地定位人脸…';
  try{
    const result=await detectFaces(image);
    if(seq!==loadId)return;
    faces=result;
    $('#faces').hidden=faces.length<2;
    $('#faces').replaceChildren(...faces.map((face,index)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`第 ${index+1} 张脸`);const thumb=document.createElement('canvas');thumb.width=44;thumb.height=44;const {w,h}=dimensions();thumb.getContext('2d')!.drawImage(image,face.x*w,face.y*h,face.width*w,face.height*h,0,0,44,44);b.append(thumb,document.createTextNode(` ${index+1}`));b.dataset.face=String(index);b.setAttribute('aria-pressed','false');b.onclick=()=>chooseFace(index);return b;}));
    if(!faces.length){$('#face-status').textContent='没找到清晰人脸 · 点照片手动选位置';return;}
    if(currentRevision===revision)chooseFace(0);else $('#face-status').textContent=`找到 ${faces.length} 张脸 · 保留了你的手动位置`;
  }catch{if(seq===loadId)$('#face-status').textContent='自动定位暂不可用 · 点照片手动选位置';}
  finally{if(seq===loadId)$<HTMLButtonElement>('#auto-face').disabled=false;}
}
$('#auto-face').onclick=()=>{if(ready&&!busy)void locate(loadId);};
$('#auto-frame').onchange=()=>{revision++;if($<HTMLInputElement>('#auto-frame').checked)chooseFace(0,true);};
async function commitPhoto(next:CanvasImageSource,label:string,seq:number,nextBitmap?:ImageBitmap){
  const nextAssets=await loadAssets();
  if(seq!==loadId){nextBitmap?.close();return;}
  bitmap?.close();bitmap=nextBitmap;image=next;photoVersion++;assets=nextAssets;ready=true;exportButton.disabled=busy;
  faces=[];$('#faces').replaceChildren();$('#file-name').textContent=label;sculpt.reset();resetPosition();phase=0;status('照片已准备好 · 免费，无水印');void locate(seq);
}
async function sample(src=`${import.meta.env.BASE_URL}sample-person.png`,label='虚构人物示例'){const seq=++loadId;try{
  if(!samplePromises.has(src))samplePromises.set(src,(async()=>{const img=new Image();img.src=src;await img.decode();return img;})());
  const next=await samplePromises.get(src)!;await commitPhoto(next,label,seq);
}catch{if(seq===loadId){status('示例加载失败，请重试或上传照片',true);$<HTMLButtonElement>('#auto-face').disabled=false;$('#face-status').textContent='保留了上一张照片 · 可重新定位或手动调整';}samplePromises.delete(src);}}
$('#sample').onclick=()=>void sample();$('#sample2').onclick=()=>void sample(`${import.meta.env.BASE_URL}sample-portrait.png`,'虚构人物竖图示例');
async function loadFile(file:File){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){status('请选择 PNG、JPG 或 WebP 图片',true);return;}
  if(file.size>10*1024*1024){status('图片超过 10 MB，请换一张较小的图片',true);return;}
  const seq=++loadId;let source:ImageBitmap|undefined,next:ImageBitmap|undefined;
  try{
    source=await createImageBitmap(file);if(source.width*source.height>40_000_000)throw new Error('图片像素过大，请缩小后再试');
    const ratio=Math.min(1,1024/Math.max(source.width,source.height));
    next=await createImageBitmap(source,{resizeWidth:Math.max(1,Math.round(source.width*ratio)),resizeHeight:Math.max(1,Math.round(source.height*ratio)),resizeQuality:'high'});
    await commitPhoto(next,file.name,seq,next);next=undefined;
  }catch(error){if(seq===loadId){status(error instanceof Error&&error.message.includes('像素')?error.message:'图片无法读取，请换一张有效图片',true);$<HTMLButtonElement>('#auto-face').disabled=false;$('#face-status').textContent='保留了上一张照片 · 可重新定位或手动调整';}}
  finally{source?.close();next?.close();}
}
$('#file').onchange=()=>{const input=$<HTMLInputElement>('#file');if(input.files?.[0])void loadFile(input.files[0]);input.value='';};
const zone=$('#dropzone');for(const name of ['dragenter','dragover'])zone.addEventListener(name,e=>{e.preventDefault();zone.classList.add('dragging');});
for(const name of ['dragleave','drop'])zone.addEventListener(name,e=>{e.preventDefault();zone.classList.remove('dragging');});
zone.addEventListener('drop',e=>{const file=(e as DragEvent).dataTransfer?.files[0];if(file)void loadFile(file);});
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
exportButton.onclick=async()=>{
  if(busy||!ready)return;if(settings.template==='custom'&&!settings.custom?.length){status('先在照片上拉一下，或点击鼓起／缩小，再导出你的动作');return;}busy=true;exportButton.disabled=true;
const snapshot=structuredClone(settings);
  const label=exportButton.querySelector('span')!;label.textContent='正在生成…';const progress=$<HTMLProgressElement>('#progress');progress.hidden=false;progress.value=0;status('正在把动作打包成 GIF…');
  try{
    const blob=await exportGif(image,snapshot,p=>{progress.value=p;label.textContent=`正在生成 ${Math.round(p*100)}%`;},assets);
    if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=URL.createObjectURL(blob);
    const again=$<HTMLAnchorElement>('#again');again.href=resultUrl;again.download=`表情包-${templates.find(t=>t.id===snapshot.template)!.title}-${snapshot.size}.gif`;again.hidden=false;resultBlob=blob;resultName=again.download;let canShare=false;try{canShare=Boolean(navigator.canShare?.({files:[new File([blob],resultName,{type:'image/gif'})]}));}catch{}$<HTMLButtonElement>('#share-file').hidden=!canShare;again.click();$('#save-guide').hidden=false;
    status(`已生成 ${snapshot.size} × ${snapshot.size} · ${(blob.size/1024).toFixed(0)} KB`);
  }catch(error){status(error instanceof Error?error.message:'生成失败，请重试',true);}
  finally{busy=false;exportButton.disabled=!ready;label.textContent='下载 GIF 表情';progress.hidden=true;}
};
$('#copy-recipe').onclick=async()=>{
  const link=new URL(location.href);link.hash=encodeRecipe(settings);
  try{await navigator.clipboard.writeText(link.href);status('玩法链接已复制 · 不包含你的照片');}
  catch{document.querySelector('.recipe-fallback')?.remove();const field=document.createElement('input');field.value=link.href;field.readOnly=true;field.className='recipe-fallback';field.setAttribute('aria-label','选中复制玩法链接');$('.share-actions').append(field);field.select();status('长按或选中链接复制');}
};
$('#share-file').onclick=async()=>{
  if(!resultBlob)return;
  try{await navigator.share({files:[new File([resultBlob],resultName,{type:'image/gif'})],title:'怪相馆'});}
  catch(error){if(!(error instanceof Error&&error.name==='AbortError'))status('当前设备无法分享文件，请用下载按钮保存');}
};
const thumbnails=[...document.querySelectorAll<HTMLCanvasElement>('.template canvas')];
let thumbKey='';
function animate(time:number){
  const elapsed=lastTime?Math.min(time-lastTime,100):0;lastTime=time;if((!paused||sculpt.playing())&&!document.hidden)phase=(phase+elapsed*settings.speed/DURATION)%1;
  if(ready&&!document.hidden&&time-lastPaint>50){lastPaint=time;drawFrame(ctx,image,settings,framing.editing()?0:sculpt.phase(phase),assets);if(!framing.editing())sculpt.guides(ctx);}
  const nextKey=[photoVersion,settings.zoom,settings.x,settings.y,settings.radius,settings.focusX,settings.focusY,settings.intensity,settings.background,settings.petX,settings.petY,settings.petScale,settings.petRotation,JSON.stringify(settings.petFace),JSON.stringify(settings.custom)].join(':');
  if(ready&&!document.hidden&&thumbKey!==nextKey){thumbKey=nextKey;thumbnails.forEach((c,i)=>{drawFrame(c.getContext('2d')!,image,{...settings,template:templates[i].id,caption:''},templates[i].id==='notify'?.47:templates[i].id==='twist'?.25:templates[i].id==='knead'?.42:.5,assets);});}
  requestAnimationFrame(animate);
}
window.addEventListener('pagehide',()=>{bitmap?.close();if(resultUrl)URL.revokeObjectURL(resultUrl);});
const recipe=decodeRecipe(location.hash);if(recipe){Object.assign(settings,recipe);selectTemplate(settings.template);settings.caption=recipe.caption;$<HTMLInputElement>('#caption').value=recipe.caption;for(const key of ['speed','intensity'])$<HTMLInputElement>(`#${key}`).value=String(settings[key as 'speed'|'intensity']);}
syncCaptionStyle();updateCaption();suggestions();sync();background(settings.background);void sample();requestAnimationFrame(animate);
