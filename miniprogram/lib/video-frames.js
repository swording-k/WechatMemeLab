const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function sampleVideo(decoder,source,times,progress,cancelled,map=frame=>({...frame,data:new Uint8Array(frame.data).slice()})){
 await decoder.start({source,mode:1,abortAudio:true});const frames=[];
 for(let i=0;i<times.length;i++){
  if(cancelled())throw Error('已取消生成');await decoder.seek(Math.round(times[i]*1000));let frame;const deadline=Date.now()+4000;
  while(!(frame=decoder.getFrameData())){if(cancelled())throw Error('已取消生成');if(Date.now()>deadline)throw Error('视频帧读取超时，请换一个 MP4 视频');await wait(10);}
  if(!frame.width||!frame.height||frame.data.byteLength!==frame.width*frame.height*4)throw Error('当前视频像素格式不支持，请换一个 MP4 视频');
  frames.push(map(frame));progress((i+1)/times.length);await wait(0);
 }
 return frames;
}
module.exports={sampleVideo};
