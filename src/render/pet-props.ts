import type {Settings,RenderAssets} from './types';
import {getAction} from './action.mjs';
type Context=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
// Original hand-drawn animal props. All motion is driven by the same pressure as the pixels.
export function drawPetProps(ctx:Context,s:Settings,phase:number,assets:RenderAssets){
 if(s.template!=='cat'&&s.template!=='dog')return;
 const {amount:a,contact}=getAction(s.template,phase,s.intensity);
 const x=s.focusX*320,y=s.focusY*320,r=s.radius*320;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#242321';ctx.lineWidth=Math.max(2,r*.025);
 const noseDX=(s.petFace?.dx??0)*r,noseDY=(s.petFace?.dy??.12)*r;
 ctx.translate(x,y);ctx.rotate(s.petFace?.angle??0);ctx.translate(-x,-y);
 if(s.template==='cat'){
  const headY=y-a*r*.05;
  for(const side of [-1,1]){
   const baseY=Math.max(12+r*.43,headY-r*(.79-.23*a));
   ctx.save();ctx.translate(x+side*r*.57,baseY);ctx.rotate(side*(-.1-a*.45));
   ctx.fillStyle='#666361';ctx.beginPath();ctx.moveTo(-side*r*.23,r*.10);ctx.lineTo(-side*r*.19,-r*.14);ctx.lineTo(side*r*.06,-r*.43*(1-.48*a));ctx.lineTo(side*r*.29,r*.12);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle='#cf9b9b';ctx.beginPath();ctx.moveTo(-side*r*.09,0);ctx.lineTo(side*r*.06,-r*.30*(1-.48*a));ctx.lineTo(side*r*.18,r*.02);ctx.closePath();ctx.fill();
   // A deliberately scruffy edge, rather than polished costume ears.
   ctx.beginPath();ctx.moveTo(-side*r*.2,r*.08);ctx.lineTo(-side*r*.11,0);ctx.lineTo(-side*r*.07,r*.08);ctx.stroke();ctx.restore();
  }
  const noseX=x+noseDX*(1+.18*a),noseY=headY+noseDY/(1+.5*a),width=r*(1+.18*a);
  ctx.fillStyle='#302729';ctx.beginPath();ctx.moveTo(noseX-r*.065,noseY);ctx.quadraticCurveTo(noseX,noseY-r*.025,noseX+r*.065,noseY);ctx.lineTo(noseX,noseY+r*.055);ctx.closePath();ctx.fill();
  for(const side of [-1,1]){
   for(let i=-1;i<=1;i++){
    ctx.save();ctx.strokeStyle='#f8f2e8';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(noseX+side*width*.23,noseY+r*.1+i*r*.045);ctx.lineTo(noseX+side*width*.72,noseY+r*.09+i*r*.10);ctx.stroke();ctx.strokeStyle='#282323';ctx.lineWidth=1.8;ctx.stroke();ctx.restore();
   }
  }
  if(assets.hand&&contact>0){
   const scratch=Math.sin(phase*Math.PI*12)*a*r*.045,w=Math.max(115,r*1.55);
   ctx.save();ctx.translate(x+r*.48+(1-contact)*180,headY+r*(.72-.12*a)+scratch);ctx.scale(-1,1);ctx.rotate(-.22);ctx.drawImage(assets.hand,-w*.97,-w*.45,w,w);ctx.restore();
  }
 }else{
  const grow=1+a*.45,noseY=y+noseDY*grow,noseX=x+noseDX*grow;
  for(const side of [-1,1]){
   ctx.save();ctx.translate(x+side*r*.7*grow,Math.max(16,y-r*.64*grow));ctx.rotate(side*(.12+Math.sin(phase*Math.PI*12)*a*.55));
   ctx.fillStyle=side<0?'#775343':'#9d7051';ctx.beginPath();ctx.moveTo(-side*r*.15,0);ctx.bezierCurveTo(-side*r*.25,r*.3,-side*r*.13,r*.88,side*r*.10,r*.9);ctx.bezierCurveTo(side*r*.45,r*.92,side*r*.39,r*.37,side*r*.16,-r*.06);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='rgba(41,29,22,.4)';ctx.beginPath();ctx.moveTo(side*r*.10,r*.17);ctx.quadraticCurveTo(side*r*.18,r*.52,side*r*.12,r*.7);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(noseX,noseY);ctx.scale(grow,grow);
  // Small muzzle leaves the person's eyes and expression intact.
  ctx.fillStyle='#e3c8a8';ctx.beginPath();ctx.ellipse(-r*.1,r*.12,r*.16,r*.12,-.12,0,Math.PI*2);ctx.ellipse(r*.1,r*.12,r*.16,r*.12,.12,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(a>.02){
   ctx.fillStyle='#c6797e';ctx.beginPath();ctx.moveTo(-r*.08,r*.20);ctx.bezierCurveTo(-r*.16,r*(.25+a*.35),r*.12,r*(.42+a*.27),r*.10,r*.20);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,r*.22);ctx.lineTo(0,r*(.25+a*.19));ctx.stroke();
  }
  ctx.fillStyle='#302928';ctx.beginPath();ctx.moveTo(-r*.095,0);ctx.quadraticCurveTo(0,-r*.07,r*.095,0);ctx.quadraticCurveTo(r*.08,r*.10,0,r*.13);ctx.quadraticCurveTo(-r*.08,r*.10,-r*.095,0);ctx.fill();
  ctx.fillStyle='#ead7c8';ctx.beginPath();ctx.ellipse(-r*.035,r*.015,r*.025,r*.012,-.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#584437';for(const side of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(side*r*(.1+i*.035),r*(.12+(i%2)*.04),1.5,0,Math.PI*2);ctx.fill();}
  ctx.restore();
 }
 ctx.restore();
}
