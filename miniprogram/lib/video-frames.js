const wait=ms=>new Promise(r=>setTimeout(r,ms));
function stage(task,label,ms,cancelled=()=>false,pollMs=25){return new Promise((resolve,reject)=>{let done=false,timer;const until=Date.now()+ms;function finish(error,result){if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(result);}function tick(){if(cancelled())return finish(Error('已取消生成'));if(Date.now()>=until)return finish(Error(label+'超时，请换一个 MP4（H.264）视频重试'));timer=setTimeout(tick,pollMs);}tick();if(!done)Promise.resolve().then(task).then(r=>finish(null,r),e=>finish(e));});}
async function closeDecoder(decoder,timeoutMs=300){if(!decoder)return;for(const method of ['stop','remove'])if(typeof decoder[method]==='function')try{await stage(()=>decoder[method](),'关闭解码器',timeoutMs);}catch{}}
async function sampleVideo(decoder,source,times,progress,cancelled,map=frame=>({...frame,data:new Uint8Array(frame.data).slice()}),limits={}){
 const poll=limits.pollMs||25;limits.stage?.('正在启动视频解码…');await stage(()=>decoder.start({source,mode:1,abortAudio:true}),'视频解码启动',limits.startMs||8000,cancelled,poll);const frames=[];
 for(let i=0;i<times.length;i++){
  if(cancelled())throw Error('已取消生成');const position=Math.round(times[i]*1000);
  // A new decoder is already at zero. A redundant initial seek can stall native decoders.
  if(i!==0||position!==0){limits.stage?.('正在定位视频画面…');await stage(()=>decoder.seek(position),'视频画面跳转',limits.seekMs||4000,cancelled,poll);}
  let frame;const deadline=Date.now()+(limits.frameMs||4000);
  while(!(frame=decoder.getFrameData())){if(cancelled())throw Error('已取消生成');if(Date.now()>deadline)throw Error('视频帧读取超时，请换一个 MP4 视频');await wait(10);}
  if(!frame.width||!frame.height||frame.data.byteLength!==frame.width*frame.height*4)throw Error('当前视频像素格式不支持，请换一个 MP4 视频');
  frames.push(map(frame));progress((i+1)/times.length);await wait(0);
 }
 return frames;
}
module.exports={sampleVideo,closeDecoder};
