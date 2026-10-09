import {test} from 'node:test';import assert from 'node:assert/strict';
import {mapPixel} from '../src/render/liquify-map.mjs';import {getAction} from '../src/render/action.mjs';
test('new effects preserve distant pixels and restore the original at loop boundary',()=>{
 for(const mode of ['suction','melt','leak']){
 assert.deepEqual(mapPixel(mode,0,0,[.5,.5],.8),[0,0]);
 assert.equal(getAction(mode,0,1).amount,0);
 assert.equal(getAction(mode,.99,1).amount,0);
 for(let p=0;p<100;p++)for(const pt of [[.5,.5],[.6,.55],[.35,.65]])assert.ok(mapPixel(mode,...pt,[.5,.5],getAction(mode,p/100,1).amount).every(Number.isFinite));
 }
});
test('suction pulls upward-right, melt flows downward',()=>{
 const suction=mapPixel('suction',.5,.5,[.5,.5],1);assert.ok(suction[0]<.5&&suction[1]>.5);
 assert.ok(mapPixel('melt',.5,.6,[.5,.5],1)[1]<.6);
});
test('leak inflates first then deflates sharply before recovering',()=>{
 assert.ok(getAction('leak',.3,1).amount>0);assert.ok(getAction('leak',.6,1).amount<0);
});
