// Framing must stay on the native GPU-backed drawImage path, without getImageData.
function paintPhoto(ctx,image,s,placement){
 const size=ctx.canvas.width,p=placement(image.width,image.height,s);
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=s.background;ctx.fillRect(0,0,size,size);
 ctx.drawImage(image,p.left*size,p.top*size,p.width*size,p.height*size);
}
function frameQueue(request,cancel,draw){
 let id=null,latest;
 return {request(value){latest=value;if(id===null)id=request(()=>{id=null;draw(latest);});},cancel(){if(id!==null)cancel(id);id=null;}};
}
module.exports={paintPhoto,frameQueue};
