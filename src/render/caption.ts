import type {Settings} from './types';import {captionBox} from './caption-layout.mjs';
type Context=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
export function measureCaption(ctx:Context,s:Settings){
 const text=s.caption.trim();ctx.save();
 let fontSize=s.captionSize??35;const font=()=>{ctx.font=`900 ${fontSize}px "Arial Black","PingFang SC",system-ui,sans-serif`;};font();
 while(ctx.measureText(text).width>296&&fontSize>12){fontSize--;font();}
 const box=captionBox(ctx.measureText(text).width,fontSize,s.captionX??50,s.captionY??96);
 ctx.restore();return {...box,x:s.captionCenterX??box.x,y:s.captionCenterY??box.y,fontSize,angle:s.captionRotation??0,scale:s.captionScale??1};
}
export function drawCaption(ctx:Context,s:Settings,phase:number){
 const text=s.caption.trim();if(!text)return;
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 const box=measureCaption(ctx,s),fontSize=box.fontSize;ctx.font=`900 ${fontSize}px "Arial Black","PingFang SC",system-ui,sans-serif`;
 ctx.translate(box.x,box.y);ctx.rotate(box.angle*Math.PI/180);ctx.scale(box.scale,box.scale);
 const style=s.captionStyle??'meme',y=style==='shake'?Math.sin(phase*Math.PI*12)*2.5:0;
 if(style==='band'){ctx.fillStyle='rgba(15,18,14,.78)';ctx.beginPath();ctx.roundRect(-box.width/2-7,y-fontSize/2-7,box.width+14,fontSize+14,5);ctx.fill();}
 if(style==='meme'||style==='shake'){ctx.strokeStyle='#151515';ctx.lineWidth=Math.max(3,fontSize*.17);ctx.strokeText(text,0,y,296);}
 ctx.fillStyle=s.captionColor??'#ffffff';ctx.fillText(text,0,y,296);ctx.restore();
}
