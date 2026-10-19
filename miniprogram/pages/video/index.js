const {checkFrames}=require('../../lib/security');
const{encodeGif}=require('../../core/engine');const{writeBytes}=require('../../lib/files');const{sampleVideo}=require('../../lib/video-frames');
Page({
 data:{path:'',name:'还没选择视频',modes:[{id:'forward',title:'原片加字'},{id:'bounce',title:'反复横跳'},{id:'reverse',title:'倒带一下'}],selected:'forward',start:0,end:3,caption:'我真的没事',font:.12,ty:.85,speeds:[.5,1,1.5,2],playbackSpeed:1,ratios:['保持原比例','方形取景'],square:false,sizes:[240,320],outputSize:240,zoom:1,busy:false,gifPath:'',status:'本机编辑；生成前联网检测全部导出画面'},
 async onReady(){const n=await new Promise(r=>this.createSelectorQuery().select('#frames').fields({node:true}).exec(v=>r(v[0])));this.canvas=n.node;this.ctx=n.node.getContext('2d');},
 onUnload(){this.cancelled=true;this.dispose();},
 async choose(){if(this.data.busy)return;try{const result=await wx.chooseMedia({count:1,mediaType:['video'],sourceType:['album'],maxDuration:60});const file=result.tempFiles[0];if(file.size>100*1024*1024)throw Error('请选小于 100 MB 的视频');this.info=await wx.getVideoInfo({src:file.tempFilePath});this.setData({path:file.tempFilePath,name:'视频 '+this.info.duration.toFixed(1)+' 秒',start:0,end:Math.min(3,this.info.duration),gifPath:''});}catch(e){if(!/cancel/.test(e.errMsg||''))this.error(e);}},
 mode(e){if(!this.data.busy)this.setData({selected:e.currentTarget.dataset.mode});},number(e){if(!this.data.busy)this.setData({[e.currentTarget.dataset.key]:e.detail.value});},caption(e){this.setData({caption:e.detail.value});},font(e){this.setData({font:e.detail.value});},textY(e){this.setData({ty:e.detail.value});},speed(e){this.setData({playbackSpeed:this.data.speeds[e.detail.value]});},ratio(e){this.setData({square:Number(e.detail.value)===1});},size(e){this.setData({outputSize:this.data.sizes[e.detail.value]});},zoom(e){this.setData({zoom:e.detail.value});},cancel(){this.cancelled=true;},
 error(e){this.setData({status:e.message||e.errMsg||'操作失败'});wx.showToast({title:this.data.status,icon:'none'});},
 async dispose(){if(this.decoder){const decoder=this.decoder;this.decoder=null;try{await decoder.stop();}catch{}try{await decoder.remove();}catch{}}},
 async generate(){
  if(!this.data.path||this.data.busy)return;const s={...this.data},start=Number(s.start),end=Number(s.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>this.info.duration+.01||end-start>6){wx.showToast({title:'请选择视频内的片段，时长不超过 6 秒',icon:'none'});return;}
  if(!wx.createVideoDecoder){this.error(Error('当前微信不支持视频解码，请更新微信'));return;}
  this.cancelled=false;this.setData({busy:true,gifPath:'',status:'正在读取视频…'});
  try{
   this.decoder=wx.createVideoDecoder();const count=Math.max(2,Math.ceil((end-start)*10)),times=Array.from({length:count},(_,i)=>start+(end-start)*i/count);
   let width,height;
   const frames=await sampleVideo(this.decoder,s.path,times,p=>this.setData({status:'正在抽帧 '+Math.round(p*75)+'%'}),()=>this.cancelled,frame=>{
    const orientation=this.info.orientation||'up',rotate=orientation.includes('right')?Math.PI/2:orientation.includes('left')?-Math.PI/2:orientation.includes('down')?Math.PI:0,swap=Math.abs(rotate)===Math.PI/2;
    const iw=swap?frame.height:frame.width,ih=swap?frame.width:frame.height,ratio=s.square?1:iw/ih;width=ratio>=1?s.outputSize:Math.max(1,Math.round(s.outputSize*ratio));height=ratio>=1?Math.max(1,Math.round(s.outputSize/ratio)):s.outputSize;
    if(!this.raw||this.raw.width!==frame.width||this.raw.height!==frame.height)this.raw=wx.createOffscreenCanvas({type:'2d',width:frame.width,height:frame.height});
    const raw=this.raw.getContext('2d'),image=raw.createImageData(frame.width,frame.height);image.data.set(new Uint8Array(frame.data));raw.putImageData(image,0,0);
    this.canvas.width=width;this.canvas.height=height;const c=this.ctx;c.fillStyle='#fff';c.fillRect(0,0,width,height);const scale=(s.square?Math.max(width/iw,height/ih)*s.zoom:width/iw);
    c.save();c.translate(width/2,height/2);c.rotate(rotate);if(orientation.includes('mirrored'))c.scale(-1,1);c.drawImage(this.raw,-frame.width*scale/2,-frame.height*scale/2,frame.width*scale,frame.height*scale);c.restore();
    c.font=`bold ${Math.round(Math.min(width,height)*s.font)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.strokeStyle='#111';c.fillStyle='#fff';c.lineWidth=Math.max(2,Math.min(width,height)*.018);
    const lines=s.caption.split('\n').slice(0,3),lineHeight=Math.min(width,height)*s.font*1.2;lines.forEach((line,i)=>{const y=height*s.ty+(i-(lines.length-1)/2)*lineHeight;c.strokeText(line,width/2,y,width-14);c.fillText(line,width/2,y,width-14);});return new Uint8Array(c.getImageData(0,0,width,height).data);
   });
   if(s.selected==='reverse')frames.reverse();if(s.selected==='bounce')frames.push(...frames.slice(1,-1).reverse());
   if(this.cancelled)throw Error('已取消生成');await checkFrames(frames,width,height,s.caption,message=>this.setData({status:message}),()=>this.cancelled);this.setData({status:'正在编码 GIF…'});await new Promise(r=>setTimeout(r,0));const bytes=encodeGif(frames,width,Math.round(100/s.playbackSpeed),()=>{},height),path=`${wx.env.USER_DATA_PATH}/video-${Date.now()}.gif`;await writeBytes(wx.getFileSystemManager(),path,bytes);if(this.lastPath)wx.getFileSystemManager().unlink({filePath:this.lastPath,fail(){}});this.lastPath=path;this.setData({gifPath:path,status:`已生成 ${width} × ${height} · ${Math.round(bytes.length/1024)} KB`});
  }catch(e){this.error(e);}finally{await this.dispose();this.setData({busy:false});}
 },
 previewGif(){wx.previewImage({urls:[this.data.gifPath]});},
 async saveGif(){try{await wx.saveImageToPhotosAlbum({filePath:this.data.gifPath});wx.showModal({title:'已保存到相册',content:'从微信等平台的相册入口选择动图发送，并检查是否正常播放。',showCancel:false});}catch(e){this.error(e);}}
});
