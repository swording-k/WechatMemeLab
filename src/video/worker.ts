import {encodeGif} from '../export/encode.mjs';
self.onmessage=(event:MessageEvent<{frames:Uint8Array[];width:number;height:number;delay:number}>)=>{
 try {
  const {frames,width,height,delay}=event.data;
  const bytes=encodeGif(frames,width,delay,p=>self.postMessage({progress:p}),height);
  const buffer=bytes.slice().buffer;
  self.postMessage({buffer},{transfer:[buffer]});
 }catch(error){self.postMessage({error:error instanceof Error?error.message:'编码失败'});}
};
