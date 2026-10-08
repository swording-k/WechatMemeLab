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
