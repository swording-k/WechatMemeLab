import {drawSoul} from './soul';
import {drawCaption} from './caption';
import type {Settings,RenderAssets} from './types';
import {drawLiquify} from './liquify';
import {drawChatProps} from './chat-props';
import {drawPetProps} from './pet-props';
import {drawProps} from './props';
import {getAction} from './action.mjs';
type Context=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
export function drawFrame(ctx:Context,image:CanvasImageSource,s:Settings,phase:number,assets:RenderAssets={}) {
  const size=ctx.canvas.width;
  ctx.save();ctx.setTransform(size/320,0,0,size/320,0,0);
  drawLiquify(ctx,image,s,phase);
  if(assets.hand && ['pinch','pull','knead'].includes(s.template)) {
    const {pressure,contact}=getAction(s.template,phase,s.intensity);
    const cx=s.focusX*320,cy=s.focusY*320;
    const radius=s.radius*320;
    const direction=s.template==='pull' ? 1 : -1;
    const grip=radius*.57+direction*pressure*radius*.20;
    const handWidth=Math.max(115,Math.min(205,radius*2.05));
    for(const side of [-1,1]) {
      const offset=(1-contact)*190;
      const wiggle=s.template==='knead' ? Math.sin(phase*Math.PI*6)*pressure*12*side : 0;
      const targetX=cx+side*(grip+offset);
      ctx.save();ctx.translate(targetX,cy+radius*.18+wiggle);
      if(side===1)ctx.scale(-1,1);
      const handHeight=handWidth*(1-pressure*.18);
      ctx.drawImage(assets.hand,-handWidth*.97,-handHeight*.45,handWidth,handHeight);
      ctx.restore();
    }
  }
  drawSoul(ctx,image,s,phase);
  drawChatProps(ctx,s,phase);
  drawProps(ctx,s,phase);
  drawPetProps(ctx,s,phase,assets);
  drawCaption(ctx,s,phase);
  ctx.restore();
}
