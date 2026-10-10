import {test} from 'node:test';
import assert from 'node:assert/strict';
import {soulMotion} from '../src/render/soul-motion.mjs';
import {mapPixel} from '../src/render/liquify-map.mjs';
test('soul waits, leaves, fades away and restores the original loop',()=>{
 for(const p of [0,.1,.99,1]) assert.equal(soulMotion(p,1).opacity,0);
 assert.ok(soulMotion(.5,1).rise>soulMotion(.3,1).rise);
 assert.ok(soulMotion(.85,1).opacity<soulMotion(.6,1).opacity);
 for(let i=0;i<=100;i++)for(const intensity of [0,.25,1]){
  const motion=soulMotion(i/100,intensity);
  assert.ok(Object.values(motion).every(Number.isFinite));
  assert.ok(motion.opacity>=0&&motion.opacity<=1);
  if(!intensity)assert.equal(motion.opacity,0);
 }
});
test('soul exit sags the face locally without disturbing the photo edges',()=>{
 assert.deepEqual(mapPixel('clockout',0,0,[.5,.5],1),[0,0]);
 assert.deepEqual(mapPixel('clockout',.55,.6,[.5,.5],0),[.55,.6]);
 assert.ok(mapPixel('clockout',.55,.6,[.5,.5],1)[1]<.6);
});
