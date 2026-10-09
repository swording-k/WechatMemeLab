import type {Settings} from './types';import {getAction} from './action.mjs';
type Context=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
// Original deterministic vector props, shared by preview and export.
export function drawChatProps(ctx:Context,s:Settings,phase:number){
 if(!['notify','crack','screen'].includes(s.template))return;
 const {contact,pressure}=getAction(s.template,phase,s.intensity);if(contact<=0)return;
 const x=s.focusX*320,y=s.focusY*320,r=s.radius*320;ctx.save();
 if(s.template==='notify'){
  const labels=['在吗','回我','人呢？'];ctx.globalAlpha=contact;ctx.font='800 15px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(let i=0;i<3;i++){
   const stagger=Math.max(0,Math.min(1,(phase-.12-i*.06)/.12));if(!stagger)continue;
   const bx=i%2?Math.min(245,x+r*.65):Math.max(7,x-r-30),by=Math.max(12,y-r*.95)+i*31;
   ctx.save();ctx.translate((i%2?1:-1)*(1-stagger)*90,0);ctx.fillStyle='#242c1f';ctx.beginPath();ctx.roundRect(bx-2,by-2,74,28,8);ctx.fill();ctx.fillStyle='#d9ed7f';ctx.beginPath();ctx.roundRect(bx,by,70,24,6);ctx.fill();ctx.fillStyle='#293323';ctx.fillText(labels[i],bx+35,by+13);ctx.restore();
  }
  ctx.fillStyle='#ef4d4d';ctx.beginPath();ctx.arc(Math.min(302,x+r*.8),Math.max(13,y-r),12,0,Math.PI*2);ctx.fill();ctx.font='900 12px system-ui';ctx.fillStyle='#fff';ctx.fillText('99+',Math.min(302,x+r*.8),Math.max(13,y-r));
 }else if(s.template==='crack'){
  ctx.globalAlpha=contact*.9;ctx.strokeStyle='rgba(14,20,27,.7)';ctx.lineWidth=3;ctx.lineJoin='round';
  const paths=[[[-.45,-.75],[-.28,-.35],[-.4,-.2],[-.15,.05],[-.35,.38],[-.2,.7]],[[.6,-.65],[.35,-.25],[.5,-.1],[.27,.15],[.43,.38]],[[.5,-.1],[.75,.05],[.9,.02]]];
  for(const path of paths){ctx.beginPath();path.forEach(([u,v],i)=>i?ctx.lineTo(x+u*r,y+v*r):ctx.moveTo(x+u*r,y+v*r));ctx.stroke();ctx.save();ctx.translate(1,-1);ctx.strokeStyle='rgba(250,252,255,.8)';ctx.lineWidth=1;ctx.stroke();ctx.restore();}
 }else{
  // A visible screen frame compresses inward as the local face comes forward.
  const w=290-pressure*35,h=260-pressure*15,left=(320-w)/2,top=12;
  ctx.globalAlpha=contact;ctx.lineWidth=7;ctx.strokeStyle='#222824';ctx.beginPath();ctx.roundRect(left,top,w,h,22);ctx.stroke();
  ctx.strokeStyle='#d9ed7f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left+w/2-17,top+6);ctx.lineTo(left+w/2+17,top+6);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*r*.8,y-r*.1);ctx.lineTo(x+side*r*.95,y-r*.3);ctx.moveTo(x+side*r*.8,y+r*.2);ctx.lineTo(x+side*r,y+r*.35);ctx.stroke();}
 }
 ctx.restore();
}
