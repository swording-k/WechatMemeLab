export interface VideoStyle {square:boolean;size:number;text:string;font:number;color:string;tx:number;ty:number;zoom:number;cx:number;cy:number}
export function dimensions(video:HTMLVideoElement,s:VideoStyle){
 const ratio=s.square?1:video.videoWidth/video.videoHeight;
 return {width:Math.max(1,Math.round(ratio>=1?s.size:s.size*ratio)),height:Math.max(1,Math.round(ratio>=1?s.size/ratio:s.size))};
}
export function render(ctx:CanvasRenderingContext2D,video:HTMLVideoElement,s:VideoStyle){
 const {width:w,height:h}=ctx.canvas;
 const scale=Math.max(w/video.videoWidth,h/video.videoHeight)*s.zoom;
 const sw=w/scale,sh=h/scale;
 ctx.drawImage(video,(video.videoWidth-sw)*s.cx,(video.videoHeight-sh)*s.cy,sw,sh,0,0,w,h);
 if(!s.text)return;
 const font=s.font*Math.min(w,h);ctx.font=`900 ${font}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.lineJoin='round';ctx.strokeStyle='#171717';ctx.fillStyle=s.color;ctx.lineWidth=Math.max(2,font*.13);
 const lines=s.text.split('\n').slice(0,3);
 lines.forEach((line,i)=>{const y=h*s.ty+(i-(lines.length-1)/2)*font*1.2;ctx.strokeText(line,w*s.tx,y,w*.94);ctx.fillText(line,w*s.tx,y,w*.94);});
}
