const {gestureDelta}=require('../core/engine');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
module.exports={
 hexColor(e){const value=e.detail.value;if(!/^#[0-9a-f]{6}$/i.test(value)){wx.showToast({title:'请输入 # 开头的六位颜色值',icon:'none'});return;}this.checkpoint();this.settings[e.currentTarget.dataset.target]=value;this.sync();},
 brushChange(e){this.setData({brushRadius:e.detail.value});},
 about(){wx.showActionSheet({itemList:['问题反馈','GitHub 开源代码','联系作者'],success:r=>{if(r.tapIndex===0){wx.navigateTo({url:'/pages/feedback/index'});return;}const urls=['https://swording-k.github.io/WechatMemeLab/feedback.html','https://github.com/swording-k/WechatMemeLab','https://swording-k.github.io/#contact'];wx.setClipboardData({data:urls[r.tapIndex]});}});},
 onResize(){this.measureStage();},
 measureStage(){this.createSelectorQuery().select('#preview').boundingClientRect(r=>{if(r){this.stageWidth=r.width;this.stageHeight=r.height;}}).exec();},
 togglePlay(){this.setData({playing:!this.data.playing});this.start();},
 openVideo(){wx.navigateTo({url:'/pages/video/index'});},
 selectLayer(e){this.setData({layer:e.currentTarget.dataset.layer,playing:false,hint:e.currentTarget.dataset.layer==='pet'?'拖动贴图 · 双指缩放旋转':e.currentTarget.dataset.layer==='text'?'拖动文字 · 双指缩放旋转':'轻点照片选择变形中心'});this.start();},
 changeStyle(e){if(this.data.busy)return;this.checkpoint();this.settings.captionStyle=this.data.styles[e.detail.value].id;this.sync();},
 color(e){if(this.data.busy)return;this.checkpoint();this.settings[e.currentTarget.dataset.target]=e.currentTarget.dataset.color;this.sync();},
 captionPosition(e){if(this.data.busy)return;this.checkpoint();this.settings.captionCenterX=160;this.settings.captionCenterY=Number(e.currentTarget.dataset.y);this.sync();},
 resetText(){if(this.data.busy)return;this.checkpoint();for(const key of ['captionCenterX','captionCenterY','captionRotation','captionScale'])delete this.settings[key];Object.assign(this.settings,{captionSize:35,captionColor:'#ffffff',captionStyle:'meme',captionX:50,captionY:96});this.sync();},
 resetPet(){if(this.data.busy)return;this.checkpoint();Object.assign(this.settings,{petX:0,petY:0,petScale:1,petRotation:0});this.sync();},
 tune(e){if(this.data.busy)return;this.checkpoint();this.settings[e.currentTarget.dataset.key]=Number(e.detail.value);this.sync();},
 exportSize(e){if(this.data.busy)return;this.setData({exportSize:Number(this.data.sizes[e.detail.value])});},
 clearSculpt(){if(this.data.busy)return;this.checkpoint();this.settings.custom=[];this.sync();},
 shareRecipe(){wx.setClipboardData({data:'https://swording-k.github.io/WechatMemeLab/?template='+this.settings.template+'&caption='+encodeURIComponent(this.settings.caption)});},
 onShareAppMessage(){return {title:'用你自己的照片整点怪相',path:'/pages/editor/index?t='+this.settings.template+'&c='+encodeURIComponent(this.settings.caption)};},
 layerGesture(g,pts){
  const b=g.before,pet=this.data.layer==='pet'&&['cat','dog'].includes(b.template),v=pet?{x:(b.focusX+(b.petX||0)/100)*320,y:(b.focusY+(b.petY||0)/100)*320,scale:b.petScale??1,angle:b.petRotation??0}:{x:b.captionCenterX??160,y:b.captionCenterY??292,scale:b.captionScale??1,angle:b.captionRotation??0};
  let dx=(pts[0].x-g.points[0].x)*320,dy=(pts[0].y-g.points[0].y)*320,scale=1,angle=0;
  if(pts.length===2&&g.points.length===2){const d=gestureDelta(g.points.map(p=>({x:p.x*320,y:p.y*320})),pts.map(p=>({x:p.x*320,y:p.y*320})));dx=d.dx;dy=d.dy;scale=d.scale;angle=d.angle;}
  if(pet)Object.assign(this.settings,{petX:(clamp(v.x+dx,0,320)/320-b.focusX)*100,petY:(clamp(v.y+dy,0,320)/320-b.focusY)*100,petScale:clamp(v.scale*scale,.3,2.5),petRotation:v.angle+angle});
  else Object.assign(this.settings,{captionCenterX:clamp(v.x+dx,0,320),captionCenterY:clamp(v.y+dy,0,320),captionScale:clamp(v.scale*scale,.3,2.5),captionRotation:v.angle+angle});
 }
};
