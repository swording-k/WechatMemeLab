import type {Settings} from './types';
import {getAction} from './action.mjs';
import {mapPixel} from './liquify-map.mjs';

type Context=CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const cache=new WeakMap<object,{key:string;image:CanvasImageSource;source:ImageData;output:ImageData}>();
export function drawLiquify(ctx:Context,image:CanvasImageSource,s:Settings,phase:number) {
  const size=ctx.canvas.width;
  const key=[size,s.zoom,s.x,s.y,s.background].join(':');
  let entry=cache.get(ctx.canvas);
  if(!entry || entry.key!==key || entry.image!==image) {
    const canvas=new OffscreenCanvas(size,size);const c=canvas.getContext('2d',{willReadFrequently:true})!;
    const source=image as {width?:number;height?:number;naturalWidth?:number;naturalHeight?:number};
    const iw=source.naturalWidth||source.width||400,ih=source.naturalHeight||source.height||400;
    const fit=Math.max(size/iw,size/ih)*s.zoom;
    const w=iw*fit,h=ih*fit;
    // Fill the frame. Long photos are cropped around the user's chosen position.
    c.fillStyle=s.background;c.fillRect(0,0,size,size);
    c.drawImage(image,(size-w)/2+s.x/100*(w-size)/2,(size-h)/2+s.y/100*(h-size)/2,w,h);
    entry={key,image,source:c.getImageData(0,0,size,size),output:c.createImageData(size,size)};
    cache.set(ctx.canvas,entry);
  }
  const {amount}=getAction(s.template,phase,s.intensity);
  const src=entry.source.data,out=entry.output.data;
  const center=[s.focusX,s.focusY];
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const [u,v]=mapPixel(s.template,x/(size-1),y/(size-1),center,amount,s.radius);
    const fx=Math.max(0,Math.min(size-1,u*(size-1))),fy=Math.max(0,Math.min(size-1,v*(size-1)));
    const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(size-1,x0+1),y1=Math.min(size-1,y0+1);
    const ax=fx-x0,ay=fy-y0;
    const a=(y0*size+x0)*4,b=(y0*size+x1)*4,c=(y1*size+x0)*4,d=(y1*size+x1)*4;
    const target=(y*size+x)*4;
    for(let k=0;k<3;k++) out[target+k]=(src[a+k]*(1-ax)+src[b+k]*ax)*(1-ay)+(src[c+k]*(1-ax)+src[d+k]*ax)*ay;
    out[target+3]=255;
  }
  ctx.putImageData(entry.output,0,0);
}
