export interface Face {x:number;y:number;width:number;height:number;confidence:number;keypoints:{x:number;y:number}[]}
let worker:Worker|undefined,id=0;
const pending=new Map<number,{resolve:(faces:Face[])=>void;reject:(error:Error)=>void;timer:number}>();
export async function detectFaces(image:CanvasImageSource):Promise<Face[]> {
  if(!worker) {
    worker=new Worker('/face-worker.js');
    worker.onmessage=e=>{
      const request=pending.get(e.data.id);if(!request)return;
      clearTimeout(request.timer);pending.delete(e.data.id);
      if(e.data.error)request.reject(new Error(e.data.error));else request.resolve(e.data.faces);
    };
    worker.onerror=()=>{for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error('人脸定位不可用'));}pending.clear();worker?.terminate();worker=undefined;};
  }
  const bitmap=await createImageBitmap(image as ImageBitmapSource);
  const requestId=++id;
  return new Promise((resolve,reject)=>{
    const timer=window.setTimeout(()=>{pending.delete(requestId);reject(new Error('定位超时，可手动选位置'));},20000);
    pending.set(requestId,{resolve,reject,timer});
    worker!.postMessage({id:requestId,image:bitmap},[bitmap]);
  });
}
