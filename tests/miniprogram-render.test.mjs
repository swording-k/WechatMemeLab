import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('render accepts native canvas factory without browser OffscreenCanvas',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'meme-native-'));
 try {
  const output=join(dir,'liquify.cjs');
  await build({entryPoints:['src/render/liquify.ts'],bundle:true,platform:'node',format:'cjs',outfile:output});
  const {drawLiquify}=createRequire(import.meta.url)(output);let calls=0,result;
  const surface={getContext:()=>({fillRect(){},drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(16).fill(255)}),createImageData:()=>({data:new Uint8ClampedArray(16)})})};
  const ctx={canvas:{width:2},putImageData(value){result=value;}};
  drawLiquify(ctx,{width:2,height:2},{zoom:1,x:0,y:0,background:'#fff',template:'bulge',intensity:.5,focusX:.5,focusY:.5,radius:.35},0,()=>{calls++;return surface;});
  assert.equal(calls,1);assert.equal(result.data.length,16);assert.equal(result.data[3],255);
 }finally{await rm(dir,{recursive:true,force:true});}
});
