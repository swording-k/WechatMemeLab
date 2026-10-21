import test from 'node:test';import assert from 'node:assert/strict';import{createRequire}from'node:module';const require=createRequire(import.meta.url);
test('native sampling seeks in milliseconds and copies decoder-owned pixels',async()=>{const{sampleVideo}=require('../miniprogram/lib/video-frames');const calls=[],data=new Uint8Array(16).fill(5);const decoder={async start(o){calls.push(o.mode)},async seek(t){calls.push(t)},getFrameData(){return{width:2,height:2,data:data.buffer}}};const frames=await sampleVideo(decoder,'clip.mp4',[1,1.2],()=>{},()=>false);data.fill(9);assert.deepEqual(calls,[1,1000,1200]);assert.equal(frames[0].data[0],5);});
test('unsupported decoder pixel formats fail clearly rather than producing corrupted GIFs',async()=>{const{sampleVideo}=require('../miniprogram/lib/video-frames');const d={async start(){},async seek(){},getFrameData(){return{width:2,height:2,data:new ArrayBuffer(3)}}};await assert.rejects(sampleVideo(d,'clip',[0],()=>{},()=>false),/像素格式/);});

// Reproduce a real phone returning a string duration from getVideoInfo.
async function chooseVideo(info, selected={tempFilePath:'clip.mp4',size:1000,duration:9}){
 const {default:vm}=await import('node:vm');const {readFileSync}=await import('node:fs');let page;
 const wx={chooseMedia:async()=>({tempFiles:[selected]}),getVideoInfo:async()=>info,showToast(){}};
 vm.runInNewContext(readFileSync('miniprogram/pages/video/index.js','utf8'),{Page:p=>page=p,wx,clearTimeout,setTimeout,require:()=>({})});
 const state={...page,data:{...page.data},setData(v){Object.assign(this.data,v)}};
 await state.choose();return state;
}
test('phone video with string duration opens and keeps numeric trimming bounds',async()=>{
 const p=await chooseVideo({duration:'2.5',width:1920,height:1080,orientation:'up'});
 assert.equal(p.data.path,'clip.mp4');assert.equal(p.data.name,'视频 2.5 秒');
 assert.equal(p.info.duration,2.5);assert.equal(p.data.end,2.5);assert.equal(p.info.duration+.01,2.51);
});
test('unusable duration falls back to selected video duration, or leaves selection unchanged',async()=>{
 const fallback=await chooseVideo({duration:'not-a-number'},{tempFilePath:'clip.mp4',size:1000,duration:'6.2'});
 assert.equal(fallback.data.path,'clip.mp4');assert.equal(fallback.info.duration,6.2);assert.equal(fallback.data.end,3);
 for(const duration of [undefined,'',0,-1,Infinity,'bad']){
  const invalid=await chooseVideo({duration},{tempFilePath:'clip.mp4',size:1000});
  assert.equal(invalid.data.path,'');assert.match(invalid.data.status,/时长/);assert.equal(invalid.info,undefined);
 }
});
test('native decoder start and seek cannot wait forever and cancellation interrupts pending work',async()=>{
 const {sampleVideo}=require('../miniprogram/lib/video-frames');const never=()=>new Promise(()=>{}),limits={startMs:35,seekMs:35,frameMs:35,pollMs:5};
 await assert.rejects(sampleVideo({start:never},'clip',[0],()=>{},()=>false,undefined,limits),/启动.*超时/);
 await assert.rejects(sampleVideo({start:async()=>{},seek:never},'clip',[1],()=>{},()=>false,undefined,limits),/跳转.*超时/);
 let cancelled=false;const t=setTimeout(()=>{cancelled=true},10);try{await assert.rejects(sampleVideo({start:never},'clip',[0],()=>{},()=>cancelled,undefined,{...limits,startMs:500}),/取消/);}finally{clearTimeout(t);}
});
test('reading the first frame does not redundantly seek zero; stuck cleanup still removes the decoder',async()=>{
 const {sampleVideo,closeDecoder}=require('../miniprogram/lib/video-frames');let seek=0,removed=0;
 await sampleVideo({start:async()=>{},seek:async()=>seek++,getFrameData:()=>({width:1,height:1,data:new ArrayBuffer(4)})},'clip',[0],()=>{},()=>false);
 assert.equal(seek,0);await closeDecoder({stop:()=>new Promise(()=>{}),remove:async()=>removed++},20);assert.equal(removed,1);
});
