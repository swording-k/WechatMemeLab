// Offline asset generation only. Pass the installed @napi-rs/canvas module path.
const {createCanvas,loadImage}=require(process.argv[2]||'@napi-rs/canvas');
const {mkdirSync,writeFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {drawFrame,defaults,templates,encodeGif,cropToSettings,DURATION}=require('../miniprogram/core/engine.js');
(async()=>{
 const root=resolve(__dirname,'../miniprogram/assets'),photo=await loadImage(root+'/sample-portrait.jpg'),hand=await loadImage(root+'/pinch-hand.png');
 const size=112,count=12,canvas=createCanvas(size,size),ctx=canvas.getContext('2d');
 mkdirSync(root+'/previews',{recursive:true});
 for(const t of templates){
  const s={...defaults,...cropToSettings(photo.width,photo.height,{x:65,y:45,size:230}),template:t.id,caption:'',focusX:.5,focusY:.52,radius:.35,custom:[{kind:'drag',x:.65,y:.55,dx:.2,dy:-.12,radius:.24}]};
  const frames=[];
  for(let i=0;i<count;i++){drawFrame(ctx,photo,s,i/count,{hand,createCanvas});frames.push(new Uint8Array(ctx.getImageData(0,0,size,size).data));}
  const bytes=encodeGif(frames,size,DURATION/count);writeFileSync(root+'/previews/'+t.id+'.gif',bytes);console.log(t.id,bytes.length);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
