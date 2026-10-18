const {faceToSettings}=require('../core/engine');
module.exports={
 async detectFaces(){
  if(this.data.busy||this.detecting)return;this.detecting=true;this.stop();this.setData({faceStatus:'正在本机定位人脸…'});let session;
  try{
   if(!wx.createVKSession)throw Error('当前设备不支持自动定位，请在动作页轻点人脸');
   session=wx.createVKSession({track:{face:{mode:2}},version:'v1'});this.faceSession=session;
   await Promise.race([new Promise((resolve,reject)=>session.start(status=>status?reject(Error('人脸定位暂不可用（'+status+'），可手动点选')):resolve())),new Promise((_,reject)=>setTimeout(()=>reject(Error('人脸定位超时，可手动点选')),5000))]);
   const scale=Math.min(1,640/Math.max(this.photo.width,this.photo.height)),width=Math.max(1,Math.round(this.photo.width*scale)),height=Math.max(1,Math.round(this.photo.height*scale));
   const canvas=wx.createOffscreenCanvas({type:'2d',width,height}),ctx=canvas.getContext('2d');ctx.drawImage(this.photo,0,0,width,height);const data=ctx.getImageData(0,0,width,height).data;
   const anchors=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('没有识别到人脸，请在动作页轻点人脸')),5000);const found=list=>{if(list.length){clearTimeout(timeout);resolve(list);}};session.on('addAnchors',found);session.on('updateAnchors',found);session.detectFace({frameBuffer:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),width,height,scoreThreshold:.5,sourceType:1});});
   this.faces=anchors.map(a=>({x:a.origin.x,y:a.origin.y,width:a.size.width,height:a.size.height}));this.setData({faces:this.faces,faceStatus:`找到 ${this.faces.length} 张脸，选择要整活的人；照片取景保持不变。`});this.selectFace({currentTarget:{dataset:{index:0}}});
  }catch(error){this.setData({faceStatus:error.message||'自动定位不可用，请手动点选人脸'});wx.showToast({title:'可在动作页轻点人脸定位',icon:'none'});}
  finally{this.detecting=false;if(session)session.destroy();this.faceSession=null;this.start();}
 },
 selectFace(e){const f=this.faces?.[e.currentTarget.dataset.index];if(!f||this.data.busy)return;this.checkpoint();const value=faceToSettings(this.photo.width,this.photo.height,f,this.settings);Object.assign(this.settings,{focusX:value.focusX,focusY:value.focusY,radius:value.radius});this.sync();}
};
