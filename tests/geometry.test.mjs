import {test} from 'node:test';
import assert from 'node:assert/strict';
import {faceToSettings, sourceToFrame} from '../src/photo/geometry.mjs';

test('portrait face near the top is positioned inside the output without stretching',()=>{
  const face={x:.3,y:.05,width:.4,height:.25};
  const s=faceToSettings(900,1600,face);
  const point=sourceToFrame(900,1600,{x:.5,y:.175},s);
  assert.ok(point.y>.1 && point.y<.8);
  assert.ok(Math.abs(point.x-.5)<.001);
});
test('landscape face to the side uses horizontal crop position',()=>{
  const s=faceToSettings(1600,900,{x:.65,y:.2,width:.2,height:.4});
  const point=sourceToFrame(1600,900,{x:.75,y:.4},s);
  assert.ok(Math.abs(point.x-.5)<.02);
  assert.ok(s.x<0);
});
test('pet nose follows detector keypoints on a tilted portrait',()=>{
 const face={x:.3,y:.05,width:.4,height:.25,keypoints:[{x:.4,y:.12},{x:.58,y:.16},{x:.46,y:.19}]};
 const s=faceToSettings(900,1600,face),nose=sourceToFrame(900,1600,face.keypoints[2],s);
 assert.ok(s.petFace.angle>0);
 const {dx,dy,angle}=s.petFace;
 const x=s.focusX+s.radius*(dx*Math.cos(angle)-dy*Math.sin(angle)),y=s.focusY+s.radius*(dx*Math.sin(angle)+dy*Math.cos(angle));
 assert.ok(Math.abs(x-nose.x)<.001&&Math.abs(y-nose.y)<.001);
});
