import {test} from 'node:test';import assert from 'node:assert/strict';
const g=await import('../src/ui/layer-geometry.mjs').catch(()=>({}));
test('rotated layer hit testing uses local coordinates',()=>{
 assert.equal(typeof g.hitLayer,'function','direct layer hit testing is missing');
 const b={x:160,y:160,width:120,height:24,angle:90};
 assert.ok(g.hitLayer({x:160,y:210},b));assert.ok(!g.hitLayer({x:210,y:160},b));
});
test('two fingers translate, scale and rotate without angle wrap jumps',()=>{
 assert.equal(typeof g.gestureDelta,'function','two-finger transform is missing');
 const d=g.gestureDelta([{x:0,y:0},{x:10,y:0}],[{x:10,y:10},{x:10,y:30}]);
 assert.equal(d.dx,5);assert.equal(d.dy,20);assert.equal(d.scale,2);assert.equal(d.angle,90);
 const edge=g.gestureDelta([{x:0,y:0},{x:-10,y:.1}],[{x:0,y:0},{x:-10,y:-.1}]);assert.ok(Math.abs(edge.angle)<2);
});
test('absolute text placement, rotation and scale survive recipe sharing',async()=>{
 const {encodeRecipe,decodeRecipe}=await import('../src/share/recipe.mjs');
 const s={template:'cat',caption:'你好',intensity:.75,speed:1,captionCenterX:80,captionCenterY:125,captionRotation:42,captionScale:.65};
 const r=decodeRecipe(encodeRecipe(s));for(const k of ['captionCenterX','captionCenterY','captionRotation','captionScale'])assert.equal(r[k],s[k],k);
});
