import {test} from 'node:test';import assert from 'node:assert/strict';
import {encodeRecipe,decodeRecipe} from '../src/share/recipe.mjs';
test('recipe shares the action and text but never photo, crop or face coordinates',()=>{
 const data=encodeRecipe({template:'pinch',caption:'就捏一下',intensity:.75,speed:1,image:'secret-photo',focusX:.123,x:77});
 const result=decodeRecipe(data);assert.equal(result.template,'pinch');assert.equal(result.caption,'就捏一下');assert.equal(result.intensity,.75);
 assert.ok(!data.includes('secret'));assert.equal(result.focusX,undefined);assert.equal(result.x,undefined);
});
test('untrusted URL parameters are bounded and unknown templates rejected',()=>{
 assert.equal(decodeRecipe('t=bad&speed=99'),null);
 const result=decodeRecipe('t=twist&c='+encodeURIComponent('<script>012345678901234567890')+'&i=99&s=-5');
 assert.equal(result.caption.length,20);assert.equal(result.intensity,1);assert.equal(result.speed,.5);
});
