import type {Settings,Warp} from '../render/types';
export function installSculpt(canvas:HTMLCanvasElement,s:Settings,changed:()=>void,canEdit:()=>boolean){
 const panel=document.querySelector<HTMLElement>('#sculpt-tools')!,tools=document.querySelectorAll<HTMLButtonElement>('[data-brush]');
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
 let kind:Warp['kind']='drag',editing=true,draft:Warp|undefined,saved:Warp[]=[],pointer=-1;
 const steps=()=>s.custom||[];
 function sync(){
  $('sculpt-count').textContent=`${steps().length} / 12 次操作`;
  $<HTMLButtonElement>('sculpt-undo').disabled=!steps().length;$<HTMLButtonElement>('sculpt-clear').disabled=!steps().length;
  $('sculpt-play').textContent=editing?'播放我的动作':'继续捏图';
  canvas.classList.toggle('sculpt-editing',s.template==='custom'&&editing);
  const note=document.querySelector('.stage-note')!;note.textContent=s.template==='custom'?(editing?'在照片上拖动或点击；编辑辅助圈不会导出':'正在播放你的变形，点“继续捏图”修改'):'点照片，选择要变形的位置';
 }
 function stopDraft(){if(draft){s.custom=saved;draft=undefined;pointer=-1;changed();}}
 function add(step:Warp){if(!canEdit()||steps().length>=12)return;editing=true;s.custom=[...steps(),step];changed();sync();}
 const point=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
 const radius=()=>Number($<HTMLInputElement>('sculpt-radius').value);
 for(const b of tools)b.onclick=()=>{stopDraft();kind=b.dataset.brush as Warp['kind'];editing=true;for(const other of tools)other.setAttribute('aria-pressed',String(other===b));sync();};
 canvas.addEventListener('pointerdown',e=>{
  if(s.template!=='custom'||!canEdit())return;e.preventDefault();editing=true;const p=point(e);s.focusX=p.x;s.focusY=p.y;
  if(steps().length>=12){$('sculpt-count').textContent='已达 12 次，可撤销或清空后继续';sync();return;}
  const step={kind,...p,dx:0,dy:0,radius:radius()};
  if(kind!=='drag'){add(step);return;}
  saved=steps();draft=step;pointer=e.pointerId;canvas.setPointerCapture(pointer);s.custom=[...saved,draft];changed();sync();
 });
 canvas.addEventListener('pointermove',e=>{if(!draft||e.pointerId!==pointer)return;const p=point(e);const dx=p.x-draft.x,dy=p.y-draft.y,limit=Math.min(1,Math.min(.35,draft.radius*.9)/(Math.hypot(dx,dy)||1));draft={...draft,dx:dx*limit,dy:dy*limit};s.custom=[...saved,draft];changed();sync();});
 canvas.addEventListener('pointerup',e=>{if(!draft||e.pointerId!==pointer)return;if(Math.hypot(draft.dx,draft.dy)<.005)s.custom=saved;draft=undefined;pointer=-1;changed();sync();});
 canvas.addEventListener('pointercancel',()=>{stopDraft();sync();});
 canvas.addEventListener('lostpointercapture',()=>{stopDraft();sync();});
 $('sculpt-undo').onclick=()=>{stopDraft();s.custom=steps().slice(0,-1);editing=true;changed();sync();};
 $('sculpt-clear').onclick=()=>{stopDraft();s.custom=[];editing=true;changed();sync();};
 $('sculpt-play').onclick=()=>{stopDraft();editing=!editing;changed();sync();};
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-nudge]'))b.onclick=()=>{const [dx,dy]=b.dataset.nudge!.split(',').map(Number);add({kind:'drag',x:s.focusX,y:s.focusY,dx,dy,radius:radius()});};
 return {
  active(){stopDraft();panel.hidden=s.template!=='custom';$('pause').hidden=s.template==='custom';$('copy-recipe').hidden=s.template==='custom';document.querySelector('.recipe-fallback')?.remove();editing=true;sync();},
  reset(){stopDraft();s.custom=[];editing=true;sync();},
  playing(){return s.template==='custom'&&!editing;},
  phase(normal:number){return s.template==='custom'&&editing?.5:normal;},
  guides(ctx:CanvasRenderingContext2D){if(s.template!=='custom'||!editing)return;
   ctx.save();const size=canvas.width;ctx.strokeStyle='#d9ed7f';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(s.focusX*size,s.focusY*size,radius()*size,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#d9ed7f';ctx.beginPath();ctx.arc(s.focusX*size,s.focusY*size,3,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 };
}
