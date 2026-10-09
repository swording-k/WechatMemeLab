import {test} from 'node:test';import assert from 'node:assert/strict';
test('caption placement respects selected position while staying inside frame',async()=>{
 const {captionBox}=await import('../src/render/caption-layout.mjs');
 const left=captionBox(180,40,0,0),right=captionBox(180,40,100,100);
 assert.equal(left.x-left.width/2,12);assert.equal(right.x+right.width/2,308);
 assert.equal(left.y-left.height/2,12);assert.equal(right.y+right.height/2,308);
 assert.equal(captionBox(900,56,50,50).width,296);
});
test('text appearance survives sharing and hostile parameters are bounded',async()=>{
 const {encodeRecipe,decodeRecipe}=await import('../src/share/recipe.mjs');
 const s={template:'cat',caption:'你好',intensity:.75,speed:1,captionX:25,captionY:10,captionSize:42,captionColor:'#ef4040',captionStyle:'band'};
 const result=decodeRecipe(encodeRecipe(s));for(const key of ['captionX','captionY','captionSize','captionColor','captionStyle'])assert.equal(result[key],s[key]);
 const bad=decodeRecipe('t=cat&tx=999&ty=-99&fs=999&color=bad&style=bad');assert.equal(bad.captionX,100);assert.equal(bad.captionY,0);assert.equal(bad.captionSize,56);assert.equal(bad.captionColor,'#ffffff');assert.equal(bad.captionStyle,'meme');
});
