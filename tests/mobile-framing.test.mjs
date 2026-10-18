import {test} from 'node:test';import assert from 'node:assert/strict';
const m=await import('../src/ui/framing-geometry.mjs').catch(()=>({}));
import {photoPlacement} from '../src/photo/geometry.mjs';
test('pinching preserves the source point under the fingers while the midpoint moves',()=>{
 assert.equal(typeof m.transformPhoto,'function');
 const before={zoom:.5625,x:0,y:0},p=photoPlacement(900,1600,before),anchor={x:.6,y:.4};
 const next=m.transformPhoto(900,1600,before,anchor,2,.08,-.03),q=photoPlacement(900,1600,next);
 assert.ok(Math.abs(q.left+(anchor.x-p.left)/p.width*q.width-(anchor.x+.08))<1e-9);
 assert.ok(Math.abs(q.top+(anchor.y-p.top)/p.height*q.height-(anchor.y-.03))<1e-9);
 assert.equal(next.zoom,1.125);
});
test('crop can be moved to a tiny region of a tall original and resized from every corner without leaving the image',()=>{
 assert.equal(typeof m.moveCrop,'function');assert.equal(typeof m.resizeCrop,'function');
 assert.deepEqual(m.moveCrop(900,1600,{x:50,y:50,size:200},800,1500),{x:700,y:1400,size:200});
 for(const corner of ['nw','ne','sw','se']){
  const r=m.resizeCrop(900,1600,{x:100,y:100,size:300},corner,{x:-1000,y:3000});
  assert.ok(r.size>=900/16&&r.x>=0&&r.y>=0&&r.x+r.size<=900&&r.y+r.size<=1600);
 }
});
