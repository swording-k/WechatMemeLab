import type {Settings} from './types';
import {soulMotion} from './soul-motion.mjs';
import {photoPlacement} from '../photo/geometry.mjs';
type Context=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
// Original local collage character. The face follows the user's photo placement
// and effect center; nothing is uploaded and no segmentation service is needed.
export function drawSoul(ctx:Context,image:CanvasImageSource,s:Settings,phase:number){
 if(s.template!=='clockout')return;
 const {rise,opacity}=soulMotion(phase,s.intensity);if(!opacity)return;
 const fx=s.focusX*320,fy=s.focusY*320;
 const r=Math.max(16,Math.min(100,s.radius*320));
 const w=Math.max(48,Math.min(92,r*1.15)),h=w*1.24;
 const destinationX=fx<160?Math.min(265,fx+88):Math.max(55,fx-88);
 const x=fx+(destinationX-fx)*rise,y=fy+(Math.max(h*.65+22,fy-r-85)-fy)*rise;
 const wobble=Math.sin(phase*Math.PI*8)*rise;
 ctx.save();ctx.globalAlpha=opacity;
 // A curved wisp still joins the leaving character to its own face.
 ctx.strokeStyle='rgba(248,255,255,.65)';ctx.lineWidth=5*(1-rise)+1;
 ctx.beginPath();ctx.moveTo(fx,fy);ctx.quadraticCurveTo(x+22,fy-12,x,y+h*.25);ctx.stroke();
 ctx.translate(x,y);ctx.rotate((-.12+Math.sin(phase*Math.PI*6)*.08)*rise);
 ctx.scale(.65+.35*rise,.65+.35*rise);
 ctx.shadowColor='rgba(49,97,117,.35)';ctx.shadowBlur=10;
 ctx.fillStyle='#f2ffff';ctx.strokeStyle='#455964';ctx.lineWidth=2.5;
 ctx.beginPath();ctx.moveTo(-w*.5,h*.45);
 ctx.lineTo(-w*.5,-h*.08);ctx.bezierCurveTo(-w*.5,-h*.66,w*.5,-h*.66,w*.5,-h*.08);
 ctx.lineTo(w*.5,h*.45);
 for(let i=3;i>=0;i--)ctx.quadraticCurveTo((i/4-.375)*w,h*(.25+(i%2)*.12),(i/4-.5)*w,h*.45);
 ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
 // Oval face crop has no rectangular photo background. Sampling uses exactly
// the same coordinates as the main photo, including manual framing.
 const source=image as {width?:number;height?:number;naturalWidth?:number;naturalHeight?:number};
 const iw=source.naturalWidth||source.width||400,ih=source.naturalHeight||source.height||400;
 const p=photoPlacement(iw,ih,s),scale=w*.4/r;
 ctx.save();ctx.beginPath();ctx.ellipse(0,-h*.08,w*.37,h*.32,0,0,Math.PI*2);ctx.clip();
 ctx.translate(0,-h*.08);ctx.scale(scale,scale);ctx.translate(-fx,-fy);
 ctx.drawImage(image,p.left*320,p.top*320,p.width*320,p.height*320);
 ctx.fillStyle='rgba(236,255,255,.28)';ctx.fillRect(fx-r,fy-r,r*2,r*2);ctx.restore();
 // Little waving arms make the exit readable even with the caption removed.
 ctx.strokeStyle='#455964';ctx.lineWidth=3;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(-w*.48,h*.06);ctx.quadraticCurveTo(-w*.7,-h*.05,-w*.73,-h*.16-wobble*2);
 ctx.moveTo(w*.48,h*.06);ctx.quadraticCurveTo(w*.7,-h*.1,w*.73,-h*.24+wobble*3);ctx.stroke();
 ctx.restore();
}
