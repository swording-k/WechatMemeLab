import type {Settings} from '../render/types';
import {measureCaption} from '../render/caption';
import {petPlacement} from '../render/pet-placement.mjs';
import {hitLayer,gestureDelta} from './layer-geometry.mjs';
import './layers.css';
type Layer='text'|'pet';type Point={x:number;y:number};
const keys=['caption','captionX','captionY','captionSize','captionColor','captionStyle','captionCenterX','captionCenterY','captionScale','captionRotation','petX','petY','petScale','petRotation'] as const;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const degrees=(v:number)=>((v+180)%360+360)%360-180;
export function installLayers(canvas:HTMLCanvasElement,s:Settings,changed:()=>void,canEdit:()=>boolean,canHit:()=>boolean,activate:()=>void){
 const ctx=canvas.getContext('2d')!,wrapper=canvas.parentElement!;
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
 wrapper.classList.add('layer-surface');
 const selection=document.createElement('div');selection.className='layer-selection';selection.hidden=true;
 selection.innerHTML='<button type="button" class="layer-handle layer-rotate" data-layer-handle="rotate" aria-label="拖动旋转选中对象">↻</button><button type="button" class="layer-handle layer-resize" data-layer-handle="resize" aria-label="拖动缩放选中对象">↗</button>';
 const handles=[...selection.querySelectorAll<HTMLButtonElement>('button')];
 const guides=['x','y'].map(axis=>{const line=document.createElement('div');line.className=`layer-guide layer-guide-${axis}`;line.hidden=true;return line;});
 wrapper.append(selection,...handles,...guides);canvas.tabIndex=0;
 let selected:Layer|null=null,previous:Layer='text',previewing=false,undo:string[]=[],redo:string[]=[],inputBefore:string|undefined;
 const pointers=new Map<number,Point>();
 let gesture:{before:string;base:{x:number;y:number;scale:number;angle:number};points:Point[];mode:string}|undefined;
 const hasPet=()=>s.template==='cat'||s.template==='dog';
 const snapshot=()=>JSON.stringify(Object.fromEntries(keys.map(k=>[k,s[k]])));
 function restore(value:string){const next=JSON.parse(value);for(const k of keys){delete s[k];}Object.assign(s,next);changed();sync();}
 function record(before:string){if(before!==snapshot()){undo.push(before);if(undo.length>40)undo.shift();redo=[];}sync();}
 function transform(layer:Layer){if(layer==='text'){const b=measureCaption(ctx,s);return {x:b.x,y:b.y,scale:b.scale,angle:b.angle};}const b=petPlacement(s);return {x:b.x,y:b.y,scale:s.petScale??1,angle:b.angle*180/Math.PI};}
 function bounds(layer:Layer){
  if(layer==='text'){const b=measureCaption(ctx,s);return {x:b.x,y:b.y,width:(b.width+14)*b.scale,height:(b.height+14)*b.scale,angle:b.angle};}
  const b=petPlacement(s),offset=-b.radius*.3;return {x:b.x-Math.sin(b.angle)*offset,y:b.y+Math.cos(b.angle)*offset,width:b.radius*2.05,height:b.radius*2,angle:b.angle*180/Math.PI};
 }
 function setTransform(layer:Layer,v:{x:number;y:number;scale:number;angle:number}){
  const x=clamp(v.x,16,304),y=clamp(v.y,16,304),scale=clamp(v.scale,.3,2.5),angle=degrees(v.angle);
  if(layer==='text'){Object.assign(s,{captionCenterX:x,captionCenterY:y,captionScale:scale,captionRotation:angle});const b=measureCaption(ctx,s);s.captionX=clamp((x-12-b.width/2)/Math.max(1,296-b.width)*100,0,100);s.captionY=clamp((y-12-b.height/2)/Math.max(1,296-b.height)*100,0,100);}
  else Object.assign(s,{petX:(x/320-s.focusX)*100,petY:(y/320-s.focusY)*100,petScale:scale,petRotation:angle});
 }
 function paint(){
  if(!selected||previewing||!canEdit()){selection.hidden=true;handles.forEach(h=>h.hidden=true);guides.forEach(g=>g.hidden=true);return;}
  const b=bounds(selected),r=canvas.getBoundingClientRect(),factor=r.width/320;
  selection.hidden=false;selection.style.left=`${b.x/320*100}%`;selection.style.top=`${b.y/320*100}%`;selection.style.width=`${b.width*factor}px`;selection.style.height=`${b.height*factor}px`;selection.style.transform=`translate(-50%,-50%) rotate(${b.angle}deg)`;
  // Handles stay inside the visible canvas even when a rotated/large layer extends out.
  const angle=b.angle*Math.PI/180,width=b.width*factor,height=b.height*factor;
  handles.forEach(h=>{const rotate=h.dataset.layerHandle==='rotate',dx=rotate?0:width/2,dy=rotate?-height/2-22:height/2;
   const x=clamp(b.x*factor+dx*Math.cos(angle)-dy*Math.sin(angle),22,r.width-22),y=clamp(b.y*factor+dx*Math.sin(angle)+dy*Math.cos(angle),22,r.height-22);
   h.hidden=false;h.style.left=`${x-22}px`;h.style.top=`${y-22}px`;h.style.right='auto';h.style.bottom='auto';
  });
  const v=transform(selected);guides[0].hidden=!gesture||Math.abs(v.x-160)>.1;guides[1].hidden=!gesture||Math.abs(v.y-160)>.1;
 }
 function sync(){
  if(selected==='pet'&&!hasPet()||selected==='text'&&!s.caption.trim())selected=null;
  $('layer-pet').hidden=!hasPet();$('layer-text').setAttribute('aria-pressed',String(selected==='text'));$('layer-pet').setAttribute('aria-pressed',String(selected==='pet'));
  $('layer-undo').toggleAttribute('disabled',!undo.length);$('layer-redo').toggleAttribute('disabled',!redo.length);
  $('layer-upright').toggleAttribute('disabled',!selected);$('layer-status').textContent=previewing?'成品预览':selected==='text'?'拖动文字 · 选框可缩放、旋转':selected==='pet'?'拖动贴图 · 双指可缩放、旋转':'点选画面中的文字或贴图';
  $('layer-preview').textContent=previewing?'返回编辑':'预览成品';canvas.classList.toggle('layer-editing',Boolean(selected));paint();
  const note=document.querySelector('.stage-note')!;if(selected)note.textContent=selected==='text'?'直接拖动文字，双指或手柄调整大小与角度':'直接拖动贴图，双指或手柄调整大小与角度';else if(previewing)note.textContent='成品预览 · 返回编辑可继续调整';else if(canHit()&&s.template!=='custom')note.textContent='点文字或贴图可编辑，空白处调整效果位置';
 }
 function select(layer:Layer|null){if(!canEdit())return;cancel();if(layer==='text'&&!s.caption.trim()){s.caption='写点什么';changed();}selected=layer;if(layer){previous=layer;previewing=false;activate();}sync();}
 function point(e:PointerEvent):Point{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*320,y:(e.clientY-r.top)/r.height*320};}
 function cancel(){if(!gesture)return;const before=gesture.before;gesture=undefined;pointers.clear();restore(before);}
 function stop(e:PointerEvent){e.preventDefault();e.stopImmediatePropagation();}
 wrapper.addEventListener('pointerdown',e=>{
  if(!canEdit()||pointers.size>=2)return;if(previewing){stop(e);return;}
  const handle=(e.target as HTMLElement).closest<HTMLElement>('[data-layer-handle]');const p=point(e);
  if(!gesture){
   if(!handle&&!canHit())return;
   const hit=s.caption.trim()&&hitLayer(p,bounds('text'))?'text':hasPet()&&hitLayer(p,bounds('pet'))?'pet':null;
   if(!handle&&!hit){if(selected){selected=null;sync();stop(e);}return;}
   if(hit&&!handle){selected=hit;previous=hit;activate();}if(!selected)return;
   gesture={before:snapshot(),base:transform(selected),points:[p],mode:handle?.dataset.layerHandle??'move'};
  }
  stop(e);pointers.set(e.pointerId,p);wrapper.setPointerCapture(e.pointerId);
  if(pointers.size===2)gesture={...gesture,base:transform(selected!),points:[...pointers.values()],mode:'pinch'};
  sync();
 },true);
 wrapper.addEventListener('pointermove',e=>{
  if(!gesture||!selected||!pointers.has(e.pointerId))return;stop(e);if(!canEdit()){cancel();return;}pointers.set(e.pointerId,point(e));
  const g=gesture,points=[...pointers.values()],v={...g.base},p=points[0],base=g.points[0];
  if(points.length===2){const d=gestureDelta(g.points,points);v.x+=d.dx;v.y+=d.dy;v.scale*=d.scale;v.angle+=d.angle;}
  else if(g.mode==='rotate'){const a=Math.atan2(p.y-v.y,p.x-v.x)-Math.atan2(base.y-v.y,base.x-v.x);v.angle+=Math.atan2(Math.sin(a),Math.cos(a))*180/Math.PI;}
  else if(g.mode==='resize')v.scale*=Math.hypot(p.x-v.x,p.y-v.y)/Math.max(1,Math.hypot(base.x-v.x,base.y-v.y));
  else{v.x+=p.x-base.x;v.y+=p.y-base.y;if(Math.abs(v.x-160)<3)v.x=160;if(Math.abs(v.y-160)<3)v.y=160;}
  setTransform(selected,v);changed();sync();
 },true);
 function end(e:PointerEvent){if(!gesture||!pointers.has(e.pointerId))return;stop(e);pointers.delete(e.pointerId);
  if(pointers.size){gesture={...gesture,base:transform(selected!),points:[...pointers.values()],mode:'move'};return;}
  const before=gesture.before;gesture=undefined;record(before);
 }
 wrapper.addEventListener('pointerup',end,true);
 wrapper.addEventListener('pointercancel',e=>{if(gesture){stop(e);cancel();}},true);
 wrapper.addEventListener('lostpointercapture',e=>{if(gesture&&pointers.has(e.pointerId))cancel();});
 wrapper.addEventListener('dblclick',e=>{if(selected==='text'&&!(e.target as HTMLElement).closest('[data-layer-handle]')){$<HTMLInputElement>('caption').focus();$<HTMLInputElement>('caption').select();}});
 $('layer-text').onclick=()=>select('text');$('layer-pet').onclick=()=>select('pet');
 $('layer-preview').onclick=()=>{if(!canEdit())return;cancel();previewing=!previewing;if(previewing){if(selected)previous=selected;selected=null;}else{selected=previous==='pet'&&!hasPet()?'text':previous;activate();}sync();};
 $('layer-upright').onclick=()=>{if(!canEdit()||!selected)return;const before=snapshot();const v=transform(selected);setTransform(selected,{...v,angle:0});changed();record(before);};
 $('layer-undo').onclick=()=>{if(!canEdit()||!undo.length)return;cancel();redo.push(snapshot());restore(undo.pop()!);};
 $('layer-redo').onclick=()=>{if(!canEdit()||!redo.length)return;cancel();undo.push(snapshot());restore(redo.pop()!);};
 handles.forEach(b=>b.onkeydown=e=>{if(!selected||!canEdit())return;const before=snapshot(),v=transform(selected),direction=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;if(!direction)return;e.preventDefault();if(b.dataset.layerHandle==='rotate')v.angle+=direction;else v.scale+=direction*.05;setTransform(selected,v);changed();record(before);});
 canvas.addEventListener('keydown',e=>{if(!selected||!canEdit())return;const moves:Record<string,Point>={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1}},d=moves[e.key];if(!d)return;e.preventDefault();const before=snapshot(),v=transform(selected);setTransform(selected,{...v,x:v.x+d.x,y:v.y+d.y});changed();record(before);});
 // Group edits from the existing input controls into one history operation.
 const controls=keys.map(k=>document.getElementById(k)).filter(Boolean) as HTMLElement[];
 for(const input of controls){input.addEventListener('focus',()=>{inputBefore=snapshot();});input.addEventListener('change',()=>{if(inputBefore){record(inputBefore);inputBefore=snapshot();}});}
 new ResizeObserver(paint).observe(canvas);sync();
 return {sync,paint,select,editing:()=>Boolean(selected),previewing:()=>previewing,change(fn:()=>void){const before=snapshot();fn();changed();record(before);},clear(){cancel();undo=[];redo=[];selected=null;previewing=false;sync();},deselect(){cancel();selected=null;previewing=false;sync();}};
}
