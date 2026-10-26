import test from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';
test('native cloud upload uses signed PUT and raw bytes, not POST form metadata from old SDK',async()=>{
 const bytes=new Uint8Array([1,2,3]).buffer;let request;const module={exports:{}};
 vm.runInNewContext(readFileSync('miniprogram/lib/motion-api.js','utf8'),{module,require:()=>({authorize:async()=>'session'}),wx:{getFileSystemManager:()=>({readFile:o=>o.success({data:bytes})}),request:o=>{request=o;o.success({statusCode:200});}}});
 await module.exports.upload({url:'https://bucket.example/photo.jpg',method:'PUT',headers:{authorization:'short-lived'}},'photo.jpg');assert.equal(request.method,'PUT');assert.equal(request.header.authorization,'short-lived');assert.equal(request.data,bytes);
});
