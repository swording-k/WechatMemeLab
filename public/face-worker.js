/* MediaPipe runs entirely in this same-origin worker. No photo leaves the browser. */
importScripts('/vision/vision_bundle.js');
let task;
async function detector() {
  if(!task) task=Vision.FilesetResolver.forVisionTasks('/vision').then(files=>Vision.FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/face-detector.tflite',delegate:'CPU'},runningMode:'IMAGE',minDetectionConfidence:.55}));
  return task;
}
self.onmessage=async event=>{
  const {id,image}=event.data;
  try {
    const model=await detector();
    const faces=model.detect(image).detections.map(d=>({
      x:d.boundingBox.originX/image.width,y:d.boundingBox.originY/image.height,width:d.boundingBox.width/image.width,height:d.boundingBox.height/image.height,
      confidence:d.categories[0]?.score||0,keypoints:d.keypoints.map(p=>({x:p.x,y:p.y}))
    })).sort((a,b)=>b.width*b.height-a.width*a.height);
    self.postMessage({id,faces});
  } catch(error) {task=undefined;self.postMessage({id,error:String(error.message||error)});}
  finally {image.close();}
};
