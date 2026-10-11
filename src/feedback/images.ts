export interface FeedbackImage {name:string;type:string;data:string;preview:string;bytes:number}
export async function prepareImage(file:File):Promise<FeedbackImage>{
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw new Error('截图请选择 PNG、JPG、WebP 或 GIF');
 if(file.size>10*1024*1024)throw new Error('原图片不能超过 10 MB');
 let blob:Blob=file;
 if(file.type==='image/gif'){if(file.size>1024*1024)throw new Error('GIF 不能超过 1 MB，请缩小后再添加');}
 else{
  const bitmap=await createImageBitmap(file);try{
   if(bitmap.width*bitmap.height>40000000)throw new Error('图片像素过大，请先缩小');
   for(const edge of [1600,1024,640]){
    const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('截图处理失败')),'image/jpeg',.85));if(blob.size<=1024*1024)break;
   }
  }finally{bitmap.close();}
 }
 if(blob.size>1024*1024)throw new Error('处理后的图片仍太大，请换一张较小的图片');
 const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('无法读取截图'));reader.readAsDataURL(blob);});
 return {name:file.name,type:blob.type,data,preview:URL.createObjectURL(blob),bytes:blob.size};
}
