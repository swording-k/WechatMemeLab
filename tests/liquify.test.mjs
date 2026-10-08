import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapPixel} from '../src/render/liquify-map.mjs';

test('bulge changes pixels near the chosen target and leaves distant pixels fixed',()=>{
  const center=[.5,.5];
  const p=mapPixel('bulge',.6,.5,center,1);
  assert.ok(p[0]>.5 && p[0]<.6);
  assert.deepEqual(mapPixel('bulge',0,0,center,1),[0,0]);
  assert.deepEqual(mapPixel('bulge',.6,.5,center,0),[.6,.5]);
});
test('twist follows the user-selected target and keeps mapping finite',()=>{
  assert.deepEqual(mapPixel('twist',.3,.7,[.3,.7],1),[.3,.7]);
  assert.notDeepEqual(mapPixel('twist',.4,.7,[.3,.7],1),[.4,.7]);
  for(const id of ['bulge','twist']) for(let x=0;x<=10;x++) for(let y=0;y<=10;y++) assert.ok(mapPixel(id,x/10,y/10,[.3,.7],1).every(Number.isFinite));
});
