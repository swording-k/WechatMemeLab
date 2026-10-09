import {test} from 'node:test';import assert from 'node:assert/strict';import {getAction} from '../src/render/action.mjs';import {mapPixel} from '../src/render/liquify-map.mjs';
test('chat effects restore the photo and preserve the area outside the face',()=>{
 for(const id of ['notify','crack','screen','soul']){
 assert.equal(getAction(id,0,1).amount,0);assert.equal(getAction(id,.99,1).amount,0);
 assert.deepEqual(mapPixel(id,0,0,[.5,.5],1),[0,0]);
 for(let p=0;p<100;p++){const a=getAction(id,p/100,.85);assert.ok(Object.values(a).every(Number.isFinite));assert.ok(Math.abs(a.amount)<=.85);}
 }
});
test('notification shakes both ways, screen approaches, crack skews, soul droops',()=>{
 assert.ok(getAction('notify',.4,1).amount*getAction('notify',.46,1).amount<0);
 assert.ok(mapPixel('screen',.6,.5,[.5,.5],1)[0]<.6);
 assert.notDeepEqual(mapPixel('crack',.55,.65,[.5,.5],1),[.55,.65]);
 assert.ok(mapPixel('soul',.5,.6,[.5,.5],1)[1]<.6);
});
