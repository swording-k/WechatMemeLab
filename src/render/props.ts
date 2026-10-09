import type {Settings} from './types';
import {getAction} from './action.mjs';
type Context=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
// Original vector props: all coordinates match the shared 320px deformation space.
export function drawProps(ctx:Context,s:Settings,phase:number){
 const {amount,contact}=getAction(s.template,phase,s.intensity);
 const x=s.focusX*320,y=s.focusY*320,r=s.radius*320;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 if(s.template==='suction'){
  const tipX=x+r*.35+(1-contact)*110,tipY=y-r*.34-(1-contact)*80;
  ctx.globalAlpha=contact;ctx.strokeStyle='#273126';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.lineTo(tipX+28,tipY-38);ctx.lineTo(tipX+95,tipY-38);ctx.stroke();
  ctx.strokeStyle='#bddd67';ctx.lineWidth=11;ctx.stroke();ctx.strokeStyle='#f0f8be';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(tipX+1,tipY-2);ctx.lineTo(tipX+29,tipY-40);ctx.lineTo(tipX+92,tipY-40);ctx.stroke();
  ctx.fillStyle='#25301f';ctx.beginPath();ctx.ellipse(tipX,tipY,6,4,-.7,0,Math.PI*2);ctx.fill();
  if(amount>.1){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;for(let i=0;i<3;i++){const t=((phase*5+i/3)%1);ctx.beginPath();ctx.arc(tipX-8-25*t,tipY+8+20*t,4+t*3,-.4,1.8);ctx.stroke();}}
 }else if(s.template==='melt'&&amount>.05){
  // A small glossy trail reinforces gravity without hiding the recognisable face.
  ctx.globalAlpha=amount*.5;ctx.strokeStyle='rgba(255,225,236,.85)';ctx.lineWidth=3;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*r*.42,y+r*.22);ctx.quadraticCurveTo(x+side*r*.46,y+r*.55,x+side*r*.36,y+r*(.55+amount*.3));ctx.stroke();}
 }else if(s.template==='leak'&&amount<0){
  const t=Math.max(0,Math.min(1,(phase-.44)/.4));ctx.globalAlpha=Math.abs(amount)*(1-t*.5);ctx.strokeStyle='#f8fbff';ctx.shadowColor='#333';ctx.shadowBlur=2;ctx.lineWidth=3;
  for(let i=0;i<3;i++){const sy=y+r*.32+(i-1)*9;ctx.beginPath();ctx.moveTo(x+r*.25+t*20,sy);ctx.quadraticCurveTo(x+r*.5+t*40,sy-5,x+r*.8+t*45,sy+(i-1)*10);ctx.stroke();}
 }
 ctx.restore();
}
