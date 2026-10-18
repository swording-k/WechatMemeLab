import {transformPhoto,moveCrop,resizeCrop} from './framing-geometry.mjs';
import {gestureDelta} from './layer-geometry.mjs';
import type {Settings} from '../render/types';
import {photoPlacement,fitPhoto,cropToSettings,reframeFocus} from '../photo/geometry.mjs';
type Mode='effect'|'photo'|'pet';
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function installFraming(canvas:HTMLCanvasElement,s:Settings,getPhoto:()=>{image:CanvasImageSource,w:number,h:number},changed:()=>void,canEdit:()=>boolean){
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
 let mode:Mode='effect';const pointers=new Map<number,{x:number,y:number}>();let drag:{points:{x:number,y:number}[];settings:Settings}|undefined;
 const clear=()=>{drag=undefined;pointers.clear();};
 const snapshot=()=>{drag={points:[...pointers.values()],settings:structuredClone(s)};};
 const isPet=()=>s.template==='cat'||s.template==='dog';
 function sync(){
  if(mode==='pet'&&!isPet())mode='effect';
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-edit-mode]')){b.hidden=b.dataset.editMode==='pet'&&!isPet();b.setAttribute('aria-pressed',String(b.dataset.editMode===mode));}
  $('pet-controls').hidden=!isPet();canvas.classList.toggle('framing-editing',mode!=='effect');
  for(const key of ['zoom','x','y'] as const)$<HTMLInputElement>(key).value=String(s[key]);
  $('zoom-value').textContent=`${s.zoom.toFixed(2)}×`;
  for(const key of ['petX','petY','petScale','petRotation'] as const){const value=s[key]??(key==='petScale'?1:key==='petRotation'?(s.petFace?.angle??0)*180/Math.PI:0);$<HTMLInputElement>(key).value=String(value);}
  $('petRotation-value').textContent=`${Math.round(s.petRotation??(s.petFace?.angle??0)*180/Math.PI)}°`;
  $('petScale-value').textContent=`${(s.petScale??1).toFixed(2)}×`;
  if(mode!=='effect')document.querySelector('.stage-note')!.textContent=mode==='photo'?'单指拖动 · 双指缩放 · 框选可截取局部':'拖动贴图；滑块可左右旋转和调整大小';
  else if(s.template!=='custom')document.querySelector('.stage-note')!.textContent='点照片，选择要变形的位置';
 }
 function applyView(next:{zoom:number,x:number,y:number},before:Settings={...s}){
  const {w,h}=getPhoto();Object.assign(s,reframeFocus(w,h,before,next),next);
  const ratio=next.zoom/before.zoom;
  if(before.custom)s.custom=before.custom.map(step=>{const point=reframeFocus(w,h,{...before,focusX:step.x,focusY:step.y,radius:step.radius},next);return {...step,x:point.focusX,y:point.focusY,dx:step.dx*ratio,dy:step.dy*ratio,radius:point.radius};});
  s.petX=(before.petX??0)*ratio;s.petY=(before.petY??0)*ratio;
  changed();sync();
 }
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-edit-mode]'))b.onclick=()=>{clear();mode=b.dataset.editMode as Mode;sync();};
 for(const key of ['zoom','x','y'] as const)$(key).oninput=()=>{if(!canEdit())return;applyView({zoom:s.zoom,x:s.x,y:s.y,[key]:Number($<HTMLInputElement>(key).value)});};
 for(const key of ['petX','petY','petScale','petRotation'] as const)$(key).oninput=()=>{if(!canEdit())return;s[key]=Number($<HTMLInputElement>(key).value);changed();sync();};
 $('pet-reset').onclick=()=>{if(!canEdit())return;Object.assign(s,{petX:0,petY:0,petScale:1,petRotation:0});changed();sync();};
 $('pet-auto').onclick=()=>{if(!canEdit())return;delete s.petRotation;changed();sync();};
 $('photo-fit').onclick=()=>{if(!canEdit())return;const {w,h}=getPhoto();applyView(fitPhoto(w,h));};
 $('photo-fill').onclick=()=>{if(canEdit())applyView({zoom:1,x:0,y:0});};
 $('photo-edit').onclick=()=>{if(!canEdit())return;clear();mode='photo';sync();};
 const scalePhoto=(ratio:number)=>{if(!canEdit())return;const {w,h}=getPhoto();mode='photo';applyView(transformPhoto(w,h,s,{x:.5,y:.5},ratio));sync();};
 $('photo-less').onclick=()=>scalePhoto(1/1.15);$('photo-more').onclick=()=>scalePhoto(1.15);
 canvas.tabIndex=0;
 canvas.addEventListener('wheel',e=>{if(mode!=='photo'||!canEdit())return;e.preventDefault();const r=canvas.getBoundingClientRect(),{w,h}=getPhoto();applyView(transformPhoto(w,h,s,{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height},Math.exp(-e.deltaY*.002)));},{passive:false});
 canvas.addEventListener('keydown',e=>{if(mode!=='photo'||!canEdit())return;const arrows:Record<string,number[]>={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]};if(arrows[e.key]){e.preventDefault();const {w,h}=getPhoto(),[dx,dy]=arrows[e.key];applyView(transformPhoto(w,h,s,{x:.5,y:.5},1,dx,dy));}else if(['+','=','-'].includes(e.key)){e.preventDefault();scalePhoto(e.key==='-'?1/1.1:1.1);}});
 canvas.addEventListener('pointerdown',e=>{
  if(mode==='effect'||!canEdit()||pointers.size>=2)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});snapshot();canvas.setPointerCapture(e.pointerId);changed();
 });
 canvas.addEventListener('pointermove',e=>{
  if(!drag||!pointers.has(e.pointerId)||!canEdit())return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const rect=canvas.getBoundingClientRect(),points=[...pointers.values()],before=drag.settings;
  if(mode==='photo'){
   const two=points.length===2&&drag.points.length===2,d=two?gestureDelta(drag.points,points):{dx:points[0].x-drag.points[0].x,dy:points[0].y-drag.points[0].y,scale:1};
   const center=two?{x:(drag.points[0].x+drag.points[1].x)/2,y:(drag.points[0].y+drag.points[1].y)/2}:drag.points[0],{w,h}=getPhoto();
   applyView(transformPhoto(w,h,before,{x:(center.x-rect.left)/rect.width,y:(center.y-rect.top)/rect.height},d.scale,d.dx/rect.width,d.dy/rect.height),before);
  }else{ s.petX=clamp((before.petX??0)+(points[0].x-drag.points[0].x)/rect.width*100,-100,100);s.petY=clamp((before.petY??0)+(points[0].y-drag.points[0].y)/rect.height*100,-100,100);changed();sync(); }
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{const e=event as PointerEvent;if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(pointers.size)snapshot();else drag=undefined;});
 const dialog=$<HTMLDialogElement>('crop-dialog'),cropCanvas=$<HTMLCanvasElement>('crop-canvas'),ctx=cropCanvas.getContext('2d')!;
 let redraw=false,crop={x:0,y:0,size:1},cropStart:{id:number;x:number;y:number;before:typeof crop;corner?:string;move:boolean}|undefined,photo:{image:CanvasImageSource;w:number;h:number};
 const layout=()=>{const scale=480/Math.max(photo.w,photo.h);return {scale,left:(480-photo.w*scale)/2,top:(480-photo.h*scale)/2};};
 function paintCrop(){
  const p=layout();ctx.clearRect(0,0,480,480);ctx.fillStyle='#ecefe7';ctx.fillRect(0,0,480,480);ctx.drawImage(photo.image,p.left,p.top,photo.w*p.scale,photo.h*p.scale);
  const x=p.left+crop.x*p.scale,y=p.top+crop.y*p.scale,size=crop.size*p.scale;
  ctx.fillStyle='rgba(20,30,14,.55)';ctx.beginPath();ctx.rect(0,0,480,480);ctx.rect(x,y,size,size);ctx.fill('evenodd');
  ctx.strokeStyle='#d5ed73';ctx.lineWidth=3;ctx.strokeRect(x,y,size,size);ctx.lineWidth=1;ctx.setLineDash([4,4]);
  for(const n of [1,2]){ctx.beginPath();ctx.moveTo(x+size*n/3,y);ctx.lineTo(x+size*n/3,y+size);ctx.moveTo(x,y+size*n/3);ctx.lineTo(x+size,y+size*n/3);ctx.stroke();}ctx.setLineDash([]);
  ctx.fillStyle='#ffffff';ctx.strokeStyle='#597a21';ctx.lineWidth=2;for(const dx of [0,size])for(const dy of [0,size]){ctx.fillRect(x+dx-9,y+dy-9,18,18);ctx.strokeRect(x+dx-9,y+dy-9,18,18);}
  $<HTMLInputElement>('crop-size').value=String(crop.size/Math.min(photo.w,photo.h)*100);
  $<HTMLInputElement>('crop-x').value=String(photo.w===crop.size?50:crop.x/(photo.w-crop.size)*100);
  $<HTMLInputElement>('crop-y').value=String(photo.h===crop.size?50:crop.y/(photo.h-crop.size)*100);
 }
 $('photo-crop').onclick=()=>{
  if(!canEdit())return;changed();photo=getPhoto();crop.size=Math.min(photo.w,photo.h)*.75;crop.x=(photo.w-crop.size)/2;crop.y=(photo.h-crop.size)/2;cropStart=undefined;redraw=false;$('crop-redraw').setAttribute('aria-pressed','false');paintCrop();dialog.showModal();
 };
 const point=(e:PointerEvent)=>{const r=cropCanvas.getBoundingClientRect(),p=layout();return {x:clamp(((e.clientX-r.left)/r.width*480-p.left)/p.scale,0,photo.w),y:clamp(((e.clientY-r.top)/r.height*480-p.top)/p.scale,0,photo.h)};};
 cropCanvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=point(e),l=layout(),hit=24*480/cropCanvas.getBoundingClientRect().width/l.scale;
  const corner=!redraw?['nw','ne','sw','se'].find(c=>Math.hypot(p.x-(crop.x+(c.includes('e')?crop.size:0)),p.y-(crop.y+(c.includes('s')?crop.size:0)))<hit):undefined;
  const move=!redraw&&!corner&&p.x>=crop.x&&p.x<=crop.x+crop.size&&p.y>=crop.y&&p.y<=crop.y+crop.size;
  cropStart={id:e.pointerId,...p,before:{...crop},corner,move};cropCanvas.setPointerCapture(e.pointerId);
 });
 cropCanvas.addEventListener('pointermove',e=>{
  if(!cropStart||e.pointerId!==cropStart.id)return;const p=point(e),short=Math.min(photo.w,photo.h);
  if(cropStart.corner)crop=resizeCrop(photo.w,photo.h,cropStart.before,cropStart.corner,p);
  else if(cropStart.move)crop=moveCrop(photo.w,photo.h,cropStart.before,p.x-cropStart.x,p.y-cropStart.y);
  else {crop.size=clamp(Math.max(Math.abs(p.x-cropStart.x),Math.abs(p.y-cropStart.y)),short/16,short);crop.x=clamp(Math.min(cropStart.x,p.x),0,photo.w-crop.size);crop.y=clamp(Math.min(cropStart.y,p.y),0,photo.h-crop.size);}
  paintCrop();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])cropCanvas.addEventListener(type,()=>{cropStart=undefined;redraw=false;$('crop-redraw').setAttribute('aria-pressed','false');});
 for(const key of ['crop-size','crop-x','crop-y'])$(key).oninput=()=>{
  const cx=Number($<HTMLInputElement>('crop-x').value)/100,cy=Number($<HTMLInputElement>('crop-y').value)/100;
  crop.size=Number($<HTMLInputElement>('crop-size').value)/100*Math.min(photo.w,photo.h);crop.x=cx*(photo.w-crop.size);crop.y=cy*(photo.h-crop.size);paintCrop();
 };
 const resize=(ratio:number)=>{const size=clamp(crop.size*ratio,Math.min(photo.w,photo.h)/16,Math.min(photo.w,photo.h));crop={size,x:clamp(crop.x+(crop.size-size)/2,0,photo.w-size),y:clamp(crop.y+(crop.size-size)/2,0,photo.h-size)};paintCrop();};
 $('crop-redraw').onclick=()=>{redraw=!redraw;$('crop-redraw').setAttribute('aria-pressed',String(redraw));};
 $('crop-smaller').onclick=()=>resize(.85);$('crop-larger').onclick=()=>resize(1/.85);
 cropCanvas.onkeydown=e=>{const arrows:Record<string,number[]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(arrows[e.key]){e.preventDefault();const [x,y]=arrows[e.key];crop=moveCrop(photo.w,photo.h,crop,x*crop.size*.05,y*crop.size*.05);paintCrop();}else if(['+','=','-'].includes(e.key)){e.preventDefault();resize(e.key==='-'?.85:1/.85);}};
 $('crop-cancel').onclick=()=>dialog.close();
 $('crop-apply').onclick=()=>{if(canEdit()){applyView(cropToSettings(photo.w,photo.h,crop));mode='photo';sync();}dialog.close();};
 return {sync,setMode(next:Mode){clear();mode=next;sync();},mode:()=>mode,editing:()=>mode!=='effect',reset(){clear();mode='effect';dialog.close();sync();}};
}
