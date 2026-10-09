import {test} from 'node:test';import assert from 'node:assert/strict';
test('custom displacement preserves distant pixels, follows drag direction and releases fully',async()=>{
 const {mapSculpt}=await import('../src/render/sculpt-map.mjs');const steps=[{kind:'drag',x:.5,y:.5,dx:.15,dy:-.1,radius:.25}];
 assert.deepEqual(mapSculpt(0,0,steps,1),[0,0]);assert.deepEqual(mapSculpt(.5,.5,steps,0),[.5,.5]);
 assert.deepEqual(mapSculpt(.65,.4,steps,1),[.5,.5]);
 const p=mapSculpt(.5,.5,steps,1);assert.ok(p[0]<.5&&p[1]>.5);
});
test('expand and shrink inverse mappings move in opposite directions and compose finitely',async()=>{
 const {mapSculpt}=await import('../src/render/sculpt-map.mjs');
 const step={x:.5,y:.5,dx:0,dy:0,radius:.25};
 assert.ok(mapSculpt(.6,.5,[{...step,kind:'expand'}],1)[0]<.6);
 assert.ok(mapSculpt(.6,.5,[{...step,kind:'shrink'}],1)[0]>.6);
 for(let i=0;i<=10;i++)for(let j=0;j<=10;j++)assert.ok(mapSculpt(i/10,j/10,[{...step,kind:'expand'},{...step,kind:'drag',dx:.2,dy:.1}],1).every(Number.isFinite));
});
