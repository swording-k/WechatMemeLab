const {frameQueue}=require('./preview');
const {cropToSettings,moveCrop,resizeCrop}=require('../core/engine');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
module.exports={
 async openCrop(){
  if(this.data.busy)return;this.stop();this.setData({cropping:true});
  await new Promise(r=>wx.nextTick(r));
  const n=await new Promise(r=>this.createSelectorQuery().select('#crop').fields({node:true,size:true}).exec(v=>r(v[0])));
  this.cropCanvas=n.node;this.cropCanvas.width=480;this.cropCanvas.height=480;this.cropCtx=n.node.getContext('2d');this.cropQueue=frameQueue(fn=>this.cropCanvas.requestAnimationFrame(fn),id=>this.cropCanvas.cancelAnimationFrame(id),()=>this.paintCrop());this.cropWidth=n.width;this.cropHeight=n.height;
  const size=Math.min(this.photo.width,this.photo.height);this.cropRect={x:(this.photo.width-size)/2,y:(this.photo.height-size)/2,size};this.cropRedraw=false;this.paintCrop();
 },
 paintCrop(){
  const c=this.cropCtx,w=this.photo.width,h=this.photo.height,f=Math.min(480/w,480/h),ox=(480-w*f)/2,oy=(480-h*f)/2,r=this.cropRect;this.cropPlacement={f,ox,oy};
  c.setTransform(1,0,0,1,0,0);c.fillStyle='#222';c.fillRect(0,0,480,480);c.drawImage(this.photo,ox,oy,w*f,h*f);
  const x=ox+r.x*f,y=oy+r.y*f,s=r.size*f;
  c.fillStyle='#1119';c.fillRect(ox,oy,w*f,y-oy);c.fillRect(ox,y+s,w*f,oy+h*f-y-s);c.fillRect(ox,y,x-ox,s);c.fillRect(x+s,y,ox+w*f-x-s,s);
  c.strokeStyle='#d5ed73';c.lineWidth=3;c.strokeRect(x,y,s,s);c.lineWidth=1;c.strokeStyle='#fff9';for(let i=1;i<3;i++){c.beginPath();c.moveTo(x+s*i/3,y);c.lineTo(x+s*i/3,y+s);c.moveTo(x,y+s*i/3);c.lineTo(x+s,y+s*i/3);c.stroke();}
  c.fillStyle='#d5ed73';for(const dx of [0,s])for(const dy of [0,s])c.fillRect(x+dx-8,y+dy-8,16,16);
 },
 cropPoint(t){const {f,ox,oy}=this.cropPlacement;return {x:clamp((t.x/this.cropWidth*480-ox)/f,0,this.photo.width),y:clamp((t.y/this.cropHeight*480-oy)/f,0,this.photo.height)};},
 cropStart(e){const p=this.cropPoint(e.touches[0]),r=this.cropRect,{f}=this.cropPlacement;let corner;
  for(const [name,x,y]of [['nw',r.x,r.y],['ne',r.x+r.size,r.y],['sw',r.x,r.y+r.size],['se',r.x+r.size,r.y+r.size]])if(Math.hypot(p.x-x,p.y-y)<24/this.cropWidth*480/f)corner=name;
  const inside=p.x>=r.x&&p.x<=r.x+r.size&&p.y>=r.y&&p.y<=r.y+r.size;this.cropGesture={p,before:{...r},corner,redraw:this.cropRedraw||(!inside&&!corner)};
 },
 cropMove(e){if(!this.cropGesture)return;const g=this.cropGesture,p=this.cropPoint(e.touches[0]),w=this.photo.width,h=this.photo.height;
  if(g.redraw){const size=Math.max(Math.min(w,h)/16,Math.min(Math.max(Math.abs(p.x-g.p.x),Math.abs(p.y-g.p.y)),w,h));this.cropRect={x:clamp(Math.min(p.x,g.p.x),0,w-size),y:clamp(Math.min(p.y,g.p.y),0,h-size),size};}
  else this.cropRect=g.corner?resizeCrop(w,h,g.before,g.corner,p):moveCrop(w,h,g.before,p.x-g.p.x,p.y-g.p.y);
  this.cropQueue.request();
 },
 cropEnd(){this.cropGesture=null;this.cropRedraw=false;},
 redrawCrop(){this.cropRedraw=true;wx.showToast({title:'在原图上重新画一个选框',icon:'none'});},
 applyCrop(){this.checkpoint();Object.assign(this.settings,cropToSettings(this.photo.width,this.photo.height,this.cropRect));this.setData({cropping:false});this.sync();},
 cancelCrop(){this.cropQueue.cancel();this.setData({cropping:false});this.start();}
};
