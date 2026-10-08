import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getAction} from '../src/render/action.mjs';
test('hands arrive before pressing and withdraw only after release',()=>{
  assert.equal(getAction('pinch',.1,1).pressure,0);
  assert.equal(getAction('pinch',.5,1).contact,1);
  assert.equal(getAction('pinch',.5,1).pressure,1);
  assert.equal(getAction('pinch',.9,1).pressure,0);
  assert.ok(getAction('pinch',.9,1).contact<1);
});
test('every active effect has finite, bounded action parameters',()=>{
  for(const id of ['pinch','pull','knead','bulge','twist','squish'])for(let i=0;i<100;i++){
    const a=getAction(id,i/100,.85);assert.ok(Object.values(a).every(Number.isFinite));assert.ok(a.contact>=0&&a.contact<=1);assert.ok(Math.abs(a.amount)<=.85);
  }
});
