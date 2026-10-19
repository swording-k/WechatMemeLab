const {checkFrames,checkPhoto}=require('../../lib/security');
const {paintPhoto,frameQueue}=require('../../lib/preview');
const {writeBytes}=require('../../lib/files');
const {drawFrame,defaults,templates,encodeGif,fitPhoto,photoPlacement,DURATION}=require('../../core/engine');
const editorTools=require('../../lib/editor-tools');
const cropTools=require('../../lib/crop');
const faceTools=require('../../lib/faces');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wait=()=>new Promise(resolve=>setTimeout(resolve,0));
Page({
 ...editorTools,...cropTools,...faceTools,
 data:{tabs:[{id:'photo',title:'照片'},{id:'effects',title:'效果'},{id:'text',title:'文字'},{id:'motion',title:'动作'}],tool:'photo',templates,selected:defaults.template,caption:defaults.caption,suggestions:templates.find(t=>t.id===defaults.template).suggestions,intensity:75,speedLabel:'正常速度',sculpt:'drag',sculptModes:[{id:'drag',title:'拉拽'},{id:'expand',title:'鼓起'},{id:'shrink',title:'缩小'}],ready:false,hasPhoto:false,busy:false,status:'本机编辑；生成前联网检测文字与画面',hint:'拖动取景 · 双指缩放',canUndo:false,canRedo:false,gifPath:'',plain:false,playing:false,layer:'text',cropping:false,styles:[{id:'meme',name:'表情包描边'},{id:'plain',name:'纯色文字'},{id:'band',name:'字幕底条'},{id:'shake',name:'抖动文字'}],styleNames:['表情包描边','纯色文字','字幕底条','抖动文字'],colors:['#ffffff','#293122','#f5dfe4','#d5ed73','#ff4747'],backgrounds:['#ffffff','#fff8ed','#e7efdb','#f5dfe4','#dfe9f5'],sizes:[240,320,480],exportSize:240,brushRadius:.2,scope:35,textColor:'#ffffff',background:'#fff8ed',captionStyleName:'表情包描边',faces:[],faceStatus:'自动定位不改变照片取景，也可点选动作位置。',captionRotation:0,petRotation:0,petScale:1},
 onLoad(options){this.recipeOptions=options;},
 async onReady(){
  this.settings={...defaults,custom:[]};this.history=[];this.future=[];this.alive=true;
  try{
   const node=await new Promise(resolve=>this.createSelectorQuery().select('#preview').fields({node:true,size:true,rect:true}).exec(r=>resolve(r[0])));
   if(!node||!node.node)throw Error('无法创建画布，请更新微信后重试');
   this.canvas=node.node;this.canvas.width=240;this.canvas.height=240;this.ctx=this.canvas.getContext('2d');this.stageWidth=node.width;this.stageHeight=node.height;
   this.editQueue=frameQueue(fn=>this.canvas.requestAnimationFrame(fn),id=>this.canvas.cancelAnimationFrame(id),phase=>this.render(phase));
   this.cropQueue=frameQueue(fn=>this.canvas.requestAnimationFrame(fn),id=>this.canvas.cancelAnimationFrame(id),()=>this.paintCrop());
   this.off=wx.createOffscreenCanvas({type:'2d',width:240,height:240});this.offCtx=this.off.getContext('2d');
   this.assets={createCanvas:(width,height)=>wx.createOffscreenCanvas({type:'2d',width,height})};
   this.assets.hand=await this.image('/assets/pinch-hand.png');this.photo=await this.image('/assets/sample-portrait.jpg');
   Object.assign(this.settings,fitPhoto(this.photo.width,this.photo.height));const recipe=templates.find(t=>t.id===this.recipeOptions?.t);if(recipe){this.settings.template=recipe.id;this.settings.caption=recipe.caption;this.setData({selected:recipe.id,caption:this.settings.caption});}this.setData({ready:true});this.start();
  }catch(error){this.error(error);}
 },
 onShow(){this.alive=true;if(this.canvas&&!this.data.busy)this.start();},
 onHide(){this.alive=false;this.stop();},onUnload(){this.alive=false;this.stop();if(this.faceSession)this.faceSession.destroy();},
 image(path){return new Promise((resolve,reject)=>{const image=this.canvas.createImage();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('图片读取失败，请换一张 JPG 或 PNG 图片'));image.src=path;});},
 stop(){if(this.editQueue)this.editQueue.cancel();if(this.timer)clearTimeout(this.timer);this.timer=null;},
 start(){this.stop();if(!this.alive||!this.photo||this.data.busy||this.data.cropping)return;if(!this.data.playing){this.editQueue.request(.5);return;}const tick=()=>{if(!this.alive||this.data.busy||this.data.cropping)return;try{this.render((Date.now()% (DURATION/this.settings.speed))/(DURATION/this.settings.speed));}catch(e){this.error(e);return;}this.timer=setTimeout(tick,80);};tick();},
 render(phase){if(this.data.tool==='photo'&&!this.data.playing)paintPhoto(this.ctx,this.photo,this.settings,photoPlacement);else drawFrame(this.ctx,this.photo,this.settings,phase,this.assets);},
 pause(){this.editingCaption=false;this.stop();},resume(){this.editingCaption=false;this.start();},
 error(error){this.stop();const message=error.message||error.errMsg||'操作失败，请重试';this.setData({status:message,busy:false});wx.showToast({title:message,icon:'none',duration:3000});},
 checkpoint(){this.history.push(JSON.parse(JSON.stringify(this.settings)));if(this.history.length>30)this.history.shift();this.future=[];this.historyState();},
 historyState(){this.setData({canUndo:this.history.length>0,canRedo:this.future.length>0});},
 sync(){const t=templates.find(t=>t.id===this.settings.template);this.setData({selected:t.id,caption:this.settings.caption,suggestions:t.suggestions,intensity:Math.round(this.settings.intensity*100),plain:this.settings.captionStyle==='plain',captionRotation:this.settings.captionRotation||0,petRotation:this.settings.petRotation||0,petScale:this.settings.petScale||1,scope:Math.round(this.settings.radius*100),textColor:this.settings.captionColor,background:this.settings.background,captionStyleName:this.data.styles.find(t=>t.id===(this.settings.captionStyle||'meme')).name,gifPath:'',status:'已调整，请重新生成 GIF'});this.historyState();this.start();},
 undo(){if(!this.history.length||this.data.busy)return;this.future.push(this.settings);this.settings=this.history.pop();this.sync();},
 redo(){if(!this.future.length||this.data.busy)return;this.history.push(this.settings);this.settings=this.future.pop();this.sync();},
 async choosePhoto(){if(this.data.busy)return;try{const result=await wx.chooseMedia({count:1,mediaType:['image'],sourceType:['album','camera'],sizeType:['compressed']});this.stop();this.setData({busy:true,status:'正在检测所选照片…'});await checkPhoto(result.tempFiles[0].tempFilePath,message=>this.setData({status:message}));const image=await this.image(result.tempFiles[0].tempFilePath);this.stop();this.photo=image;this.history=[];this.future=[];this.faces=[];this.setData({faces:[]});Object.assign(this.settings,fitPhoto(image.width,image.height),{focusX:.5,focusY:.5,custom:[]});this.setData({hasPhoto:true,status:'拖动照片并双指缩放，选好要做表情的区域',gifPath:'',canUndo:false,canRedo:false});this.start();}catch(error){if(!/cancel/.test(error.errMsg||''))this.error(error);}finally{this.setData({busy:false});this.start();}},
 switchTool(e){if(this.data.busy)return;const tool=e.currentTarget.dataset.tool;this.setData({tool,playing:tool==='effects',layer:'text',hint:tool==='photo'?'拖动取景 · 双指缩放':tool==='text'?'拖动调整文字位置':tool==='motion'&&this.settings.template==='custom'?'直接拉拽，捏出你的动作':'轻点照片，选择变形的位置'});this.measureStage();this.start();},
 chooseEffect(e){if(this.data.busy)return;this.checkpoint();const t=templates.find(t=>t.id===e.currentTarget.dataset.id);this.settings.template=t.id;this.settings.caption=t.caption;this.setData({playing:t.id!=='custom'});this.sync();if(t.id==='custom')this.switchTool({currentTarget:{dataset:{tool:'motion'}}});},
 fit(){if(this.data.busy)return;this.checkpoint();Object.assign(this.settings,fitPhoto(this.photo.width,this.photo.height));this.sync();},
 fill(){if(this.data.busy)return;this.checkpoint();Object.assign(this.settings,{zoom:1,x:0,y:0});this.sync();},resetPhoto(){this.fit();},
 captionInput(e){if(this.data.busy)return;if(!this.editingCaption){this.checkpoint();this.editingCaption=true;}this.settings.caption=e.detail.value;this.setData({caption:e.detail.value,gifPath:''});this.editQueue.request(.5);},
 suggest(e){if(this.data.busy)return;this.checkpoint();this.settings.caption=e.currentTarget.dataset.text;this.sync();},
 textSize(e){if(this.data.busy)return;this.checkpoint();this.settings.captionSize=clamp((this.settings.captionSize||35)+Number(e.currentTarget.dataset.delta),12,64);this.sync();},
 textStyle(){if(this.data.busy)return;this.checkpoint();this.settings.captionStyle=this.data.plain?'meme':'plain';this.sync();},
 intensityChange(e){if(this.data.busy)return;this.checkpoint();this.settings.intensity=e.detail.value/100;this.sync();},
 speedChange(){if(this.data.busy)return;this.checkpoint();this.settings.speed=this.settings.speed===1?1.5:this.settings.speed===1.5?.65:1;this.setData({speedLabel:this.settings.speed===1?'正常速度':this.settings.speed===1.5?'快一点':'慢一点'});this.sync();},
 sculptMode(e){this.setData({sculpt:e.currentTarget.dataset.kind});},
 point(t){return {x:t.x/this.stageWidth,y:t.y/this.stageHeight};},
 touchStart(e){if(!this.photo||this.data.busy||!this.stageWidth)return;this.stop();this.editingCaption=false;this.checkpoint();this.setData({playing:false});const pts=e.touches.map(t=>this.point(t));this.gesture={points:pts,before:JSON.parse(JSON.stringify(this.settings)),start:pts[0],moved:false};if(this.data.tool==='motion'&&this.settings.template==='custom'&&this.data.sculpt!=='drag'){this.settings.custom=[...(this.settings.custom||[]),{kind:this.data.sculpt,x:pts[0].x,y:pts[0].y,dx:0,dy:0,radius:this.data.brushRadius}].slice(-12);this.gesture.applied=true;}this.editQueue.request(.5);},
 touchMove(e){if(!this.gesture||this.data.busy)return;const pts=e.touches.map(t=>this.point(t)),g=this.gesture;g.moved=true;if(pts.length!==g.points.length){g.points=pts;g.before=JSON.parse(JSON.stringify(this.settings));return;}const b=g.before;
  if(this.data.tool==='photo'){
   if(pts.length!==g.points.length){g.points=pts;g.before={...this.settings};return;}
   const a=g.points[0],z=pts[0];let zoom=b.zoom;
   let ax=a.x,ay=a.y,zx=z.x,zy=z.y;
   if(pts.length>1){const old=Math.hypot(a.x-g.points[1].x,a.y-g.points[1].y),now=Math.hypot(z.x-pts[1].x,z.y-pts[1].y);zoom=clamp(b.zoom*now/Math.max(.01,old),.05,12);ax=(a.x+g.points[1].x)/2;ay=(a.y+g.points[1].y)/2;zx=(z.x+pts[1].x)/2;zy=(z.y+pts[1].y)/2;}
   const p=photoPlacement(this.photo.width,this.photo.height,b),q=photoPlacement(this.photo.width,this.photo.height,{zoom,x:0,y:0});
   Object.assign(this.settings,{zoom,x:(zx-(ax-p.left)/p.width*q.width-q.left)/q.travelX*100,y:(zy-(ay-p.top)/p.height*q.height-q.top)/q.travelY*100});
  }else if(this.data.tool==='text'||this.data.layer==='pet'){this.layerGesture(g,pts);
  }else if(this.data.tool==='motion'&&this.settings.template==='custom'&&this.data.sculpt==='drag'){
   this.settings.custom=[...(b.custom||[]),{kind:'drag',x:g.start.x,y:g.start.y,dx:clamp(pts[0].x-g.start.x,-.45,.45),dy:clamp(pts[0].y-g.start.y,-.45,.45),radius:this.data.brushRadius}].slice(-12);
  }this.editQueue.request(.5);
 },
 touchEnd(){const g=this.gesture;if(!g)return;if(!g.moved&&!g.applied&&(this.data.tool==='effects'||this.data.tool==='motion')){this.settings.focusX=clamp(g.start.x,.02,.98);this.settings.focusY=clamp(g.start.y,.02,.98);}this.gesture=null;this.setData({gifPath:''});this.start();},
 async exportGif(){if(this.data.busy||!this.photo)return;this.stop();this.setData({busy:true,gifPath:'',status:'正在制作 0%'});let file;
  try{const frames=[],count=24,size=this.data.exportSize;this.off.width=size;this.off.height=size;const snapshot=JSON.parse(JSON.stringify(this.settings));
   for(let i=0;i<count;i++){drawFrame(this.offCtx,this.photo,snapshot,i/count,this.assets);frames.push(new Uint8Array(this.offCtx.getImageData(0,0,size,size).data));this.setData({status:`正在制作 ${Math.round((i+1)/count*70)}%`});await wait();}
   await checkFrames(frames,size,size,snapshot.caption,message=>this.setData({status:message}),()=>!this.alive);
   this.setData({status:'正在编码 GIF…'});await wait();const bytes=encodeGif(frames,size,Math.round(DURATION/snapshot.speed/count));
   file=`${wx.env.USER_DATA_PATH}/meme-${Date.now()}.gif`;
   await writeBytes(wx.getFileSystemManager(),file,bytes);
   if(this.lastFile&&this.lastFile!==file)wx.getFileSystemManager().unlink({filePath:this.lastFile,fail(){}});this.lastFile=file;
   this.setData({gifPath:file,status:`已生成 ${size} × ${size} · ${Math.round(bytes.length/1024)} KB`});
  }catch(error){this.error(error);}finally{this.setData({busy:false});this.start();}
 },
 previewGif(){if(this.data.gifPath)wx.previewImage({urls:[this.data.gifPath]});},
 async saveGif(){if(!this.data.gifPath)return;try{await wx.saveImageToPhotosAlbum({filePath:this.data.gifPath});wx.showModal({title:'已保存到相册',content:'打开微信或其他社交平台，从聊天的相册入口选择这张动图发送。发送后检查是否正常播放。',showCancel:false});}catch(error){if(/auth deny|authorize|auth denied/i.test(error.errMsg||'')){const r=await wx.showModal({title:'需要相册权限',content:'允许保存到相册后，即可保存刚生成的 GIF。',confirmText:'去设置'});if(r.confirm)wx.openSetting({});}else this.error(error);}},
 help(){wx.showModal({title:'把动图发到聊天里',content:'1. 生成 GIF，点击「保存到相册」。\n2. 打开微信、抖音等平台的聊天窗口，从相册选择这张动图发送。\n3. 检查发送后是否会动，再按客户端支持的方式添加收藏。\n\n不同手机和平台可能表现不同；不要以文件形式发送。当前小程序仍在真机测试中。',showCancel:false});}
});
