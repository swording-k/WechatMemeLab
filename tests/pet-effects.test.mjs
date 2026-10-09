import {test} from 'node:test';import assert from 'node:assert/strict';
import {mapPixel} from '../src/render/liquify-map.mjs';import {getAction} from '../src/render/action.mjs';
import {decodeRecipe} from '../src/share/recipe.mjs';
test('pet actions release at loop edge, remain finite and preserve distant pixels',()=>{
 for(const id of ['cat','dog']){
 assert.equal(getAction(id,0,1).amount,0);assert.equal(getAction(id,.99,1).amount,0);
 assert.deepEqual(mapPixel(id,0,0,[.5,.5],1),[0,0]);
 for(let i=0;i<100;i++){const a=getAction(id,i/100,.85);assert.ok(Object.values(a).every(Number.isFinite));assert.ok(a.contact>=0&&a.contact<=1);assert.ok(a.amount>=0&&a.amount<=.85);}
 }
});
test('cat widens and compresses while dog approaches, rather than twisting',()=>{
 const cat=mapPixel('cat',.58,.58,[.5,.5],.8,.35);assert.ok(cat[0]<.58&&cat[1]>.58);
 const dog=mapPixel('dog',.58,.58,[.5,.5],.8,.35);assert.ok(dog[0]<.58&&dog[1]<.58);
 assert.equal(getAction('cat',.08,1).pressure,0);
});
test('pet recipes are shareable and retired effects are no longer accepted',()=>{
 for(const id of ['cat','dog'])assert.equal(decodeRecipe('#t='+id).template,id);
 for(const id of ['glass','soul'])assert.equal(decodeRecipe('#t='+id),null);
});
