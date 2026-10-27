const api=require('../../lib/motion-api');
const {check,checkPhoto}=require('../../lib/security');
const RECORD='meme-motion-task-v1';
function uuid(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3)|8).toString(16);});}
Page({
 data:{mode:'draw',family:'image',picturePath:'',pictureReady:false,resultKind:'',pricing:null,photoPath:'',referencePath:'',referenceName:'',prompt:'',caption:'',busy:false,pending:false,jobId:'',jobStatus:'',resultPath:'',available:false,service:'正在连接动作服务…',status:'写个脑洞，或上传照片改造一下',ideas:[{title:'憋不住了',prompt:'人物先抿嘴忍笑，随后憋不住笑一下，肩膀轻轻抖两下，最后恢复镇定。'},{title:'笑容消失',prompt:'人物先得意地微笑，突然愣住，嘴角缓缓放下，目光移开。'},{title:'你再说一遍',prompt:'人物凑近镜头一点，歪头眯眼，露出怀疑的表情。'}]},
 async onLoad(){this.visible=true;try{const r=wx.getStorageSync(RECORD);if(r?.id&&/^[a-f0-9-]{36}$/i.test(r.id))this.setData({jobId:r.id,mode:r.mode||'describe',family:['draw','edit'].includes(r.mode)?'image':'motion',caption:r.caption||'',prompt:r.prompt||'',pending:true,status:'上次任务还在，继续查询即可，不用重新生成'});}catch{}await this.config();this.loaded=true;if(this.visible&&this.data.pending&&!this.data.busy)await this.query();},
 onShow(){this.visible=true;if(this.loaded&&this.data.pending&&!this.data.busy)this.query();},onHide(){this.visible=false;clearTimeout(this.poll);},onUnload(){this.visible=false;this.closed=true;clearTimeout(this.poll);},
 async config(){try{const c=await api.request('config');if(!this.closed)this.setData({available:c.available,pricing:c.pricing||null,service:c.available?'免费内测 · 生图、改图和动作分别提交':'内测额度暂时用完，已有作品仍可获取'});}catch(e){this.setData({available:false,service:e.message});}},
 mode(e){if(this.data.busy||this.data.pending)return;this.setMode(e.currentTarget.dataset.mode);},
 setMode(mode){if(!['draw','edit','describe','imitate'].includes(mode))return;this.setData({mode,family:['draw','edit'].includes(mode)?'image':'motion'});},
 family(e){if(this.data.busy||this.data.pending)return;this.setMode(e.currentTarget.dataset.family==='image'?'draw':'describe');},
 prices(){const items=this.data.pricing?.items;if(!items)return;wx.showModal({title:'用量与价格',content:'当前免费内测，尚未开通充值。\n未来建议价：'+items.map(x=>`${x.name} ${(x.priceFen/100).toFixed(2)}元/${x.unit}`).join('；')+'。\n每次生图、改图、生成动作都是独立操作，满意后再继续。',showCancel:false,confirmText:'知道了'});},
 clearJob(){clearTimeout(this.poll);wx.removeStorageSync(RECORD);this.setData({jobId:'',jobStatus:'',pending:false});},
 async usePicture(mode){if(this.data.busy||this.data.pending||!this.data.pictureReady||!this.data.picturePath)return;this.setData({busy:true});try{const image=await api.image(this.data.picturePath);if(this.closed)return;this.image=image;this.clearJob();this.setMode(mode);this.setData({photoPath:image.path,prompt:'',resultKind:'',resultPath:'',status:mode==='edit'?'这张图继续改，写下新的要求':'图片已选好，写一个动作后再生成'});}catch(e){this.error(e);}finally{if(!this.closed)this.setData({busy:false});}},
 async animatePicture(){await this.usePicture('describe');},
 async editPicture(){await this.usePicture('edit');},
 async savePicture(){if(this.data.busy||!this.data.pictureReady||!this.data.picturePath)return;this.setData({busy:true});try{await wx.saveImageToPhotosAlbum({filePath:this.data.picturePath});this.setData({status:'已保存到相册，可以作为图片表情发送'});}catch(e){this.error(Error('图片未保存，请检查相册权限后重试'));}finally{if(!this.closed)this.setData({busy:false});}},
 prompt(e){if(!this.data.busy&&!this.data.pending)this.setData({prompt:e.detail.value});},
 caption(e){if(!this.data.busy)this.setData({caption:e.detail.value});},
 idea(e){if(!this.data.busy&&!this.data.pending)this.setData({prompt:this.data.ideas[e.currentTarget.dataset.index].prompt});},
 async choosePhoto(){if(this.data.busy||this.data.pending)return;try{const r=await wx.chooseMedia({count:1,mediaType:['image'],sourceType:['album','camera'],sizeType:['compressed']});this.setData({busy:true,status:'正在准备照片…'});this.image=await api.image(r.tempFiles[0].tempFilePath);this.clearJob();this.setData({photoPath:this.image.path,picturePath:'',pictureReady:false,resultKind:'',resultPath:'',status:this.data.family==='image'?'照片已选好，写下想改的地方':'照片已选好，给它安排一个短反应'});}catch(e){if(!/cancel/.test(e.errMsg||''))this.error(e);}finally{this.setData({busy:false});}},
 async chooseReference(){if(this.data.busy||this.data.pending)return;try{const r=await wx.chooseMedia({count:1,mediaType:['video'],sourceType:['album'],maxDuration:6});const f=r.tempFiles[0],info=await wx.getVideoInfo({src:f.tempFilePath});const duration=Number(info.duration||f.duration);if(!Number.isFinite(duration)||duration<2||duration>6.05||Number(f.size)>20*1024*1024)throw Error('请选2～6秒、20MB以内的MP4参考视频');this.setData({referencePath:f.tempFilePath,referenceName:`已选 ${duration.toFixed(1)} 秒参考动作`});}catch(e){if(!/cancel/.test(e.errMsg||''))this.error(e);}},
 remember(){wx.setStorageSync(RECORD,{id:this.data.jobId,mode:this.data.mode,prompt:this.data.prompt,caption:this.data.caption});},
 async generate(){
  if(this.data.busy||this.data.pending||!this.data.available||(this.data.mode!=='draw'&&!this.image))return;
  const prompt=this.data.prompt.trim();if(this.data.mode!=='imitate'&&!prompt)return this.error(Error(this.data.family==='image'?'先写一个你想要的画面':'先写一个你想要的动作'));if(this.data.mode==='imitate'&&!this.data.referencePath)return this.error(Error('先选一段参考动作'));
  this.setData({busy:true,status:'正在检测照片和动作描述…'});let prepared=false;
  try{
   const receipt=await check({text:prompt,images:this.data.mode==='draw'?[]:[{type:this.image.type,data:this.image.data}]},status=>this.setData({status}),()=>this.closed);
   if(this.closed)return;
   const id=uuid();this.setData({jobId:id,pending:true,jobStatus:'draft',resultPath:'',pictureReady:false,resultKind:''});this.remember();
   const p=await api.request('prepare',{id,mode:this.data.mode});prepared=true;
   if(p.uploads.image){this.setData({status:'正在上传照片…'});await api.upload(p.uploads.image,this.image.path);}
   if(this.data.mode==='imitate'){this.setData({status:'正在上传参考动作…'});await api.upload(p.uploads.reference,this.data.referencePath);}
   if(this.closed)return;
   this.setData({status:'正在提交创意，请勿重复点击…'});
   await api.request('create',{id,prompt,receipt});await this.query();
  }catch(e){this.setData({status:e.message+(prepared?'。保留任务记录，先继续查询。':''),pending:Boolean(this.data.jobId)});}
  finally{if(!this.closed)this.setData({busy:false});}
 },
 async query(){
  if(!this.data.jobId||this.closed)return;clearTimeout(this.poll);this.setData({busy:true});
  try{
   const r=await api.request('query',{id:this.data.jobId});if(this.closed)return;this.failures=0;this.setData({jobStatus:r.status});
   if(r.status==='success'){
    this.setData({status:'作品已生成，正在获取…'});const result=await api.request('result',{id:r.id});const kind=result.kind||'video';const path=await api.download(result.url,r.id,kind);if(this.closed)return;
    if(kind==='image'){this.setData({status:'正在检测生成图片…'});await checkPhoto(path,status=>{if(!this.closed)this.setData({status})});if(this.closed)return;this.setData({pending:false,picturePath:path,pictureReady:true,resultKind:'image',resultPath:'',status:'先看图片是否满意，可以保存、继续改，或让它动起来'});}
    else this.setData({pending:false,resultKind:'video',resultPath:path,status:'先看动作是否满意，再剪片段、加字做成 GIF'});
    await this.config();return;
   }
   if(r.status==='draft'||r.status==='failed'){this.setData({pending:false,status:r.error||(r.status==='draft'?'素材尚未提交生成，可以重新选择后再做':'动作未能生成，请调整素材后再做')});await this.config();return;}
   this.setData({pending:true,status:r.error||(r.status==='queued'?'作品正在排队，离开页面后也可回来查询':'作品正在生成，可能需要几分钟')});
   if(this.visible&&['queued','processing'].includes(r.status))this.poll=setTimeout(()=>this.query(),15000);
  }catch(e){
   if(this.closed)return;
   if(this.data.jobStatus==='success'&&/违规/.test(e.message||'')){wx.removeStorageSync(RECORD);this.setData({pending:false,pictureReady:false,picturePath:'',resultKind:'',status:'生成图片未通过内容检测，未展示或保存。可以换个创意重新制作。'});}
   else if([404,410].includes(e.status)){wx.removeStorageSync(RECORD);this.setData({pending:false,jobId:'',jobStatus:'',status:e.status===410?'上次任务已过期，可以重新制作':'上次任务未提交，可以重新制作'});}
   else{this.setData({pending:true,status:e.message+'。稍后会继续查询原任务，无需重新生成。'});if(this.visible)this.poll=setTimeout(()=>this.query(),Math.min(60000,15000*2**Math.min(this.failures||0,2)));this.failures=(this.failures||0)+1;}
  }
  finally{if(!this.closed)this.setData({busy:false});}
 },
 async resume(){if(this.data.pending&&!this.data.busy)await this.query();},
 reset(){if(this.data.busy||(this.data.pending&&this.data.jobStatus!=='success'))return;this.clearJob();this.setData({resultPath:'',picturePath:'',pictureReady:false,resultKind:'',status:'继续设计下一个表情'});},
 edit(){if(!this.data.resultPath||this.data.resultKind==='image'||this.data.busy)return;try{api.handoff(this.data.jobId,this.data.resultPath,this.data.caption);wx.navigateTo({url:'/pages/video/index?motion='+this.data.jobId});}catch(e){this.error(e);}},
 error(e){this.setData({status:e.message||e.errMsg||'操作未完成，请重试'});wx.showToast({title:this.data.status,icon:'none'});}
});
