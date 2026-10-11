import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {validateFeedback,authorized}=require('../cloudfunctions/meme-feedback/core.cjs');
const id='12345678-1234-4234-8234-123456789abc';
test('feedback keeps original unicode, rejects blank or oversized input and unsupported files',()=>{
 assert.equal(validateFeedback({id,title:'  中文 & 猫  ',detail:'问题',images:[]}).title,'中文 & 猫');
 for(const data of [{id,title:'',detail:'x'},{id,title:'x',detail:'x'.repeat(1501)},{id:'bad',title:'x',detail:'x'},{id,title:'x',detail:'x',images:[{type:'image/svg+xml',data:'PHN2Zz4='}]}])assert.throws(()=>validateFeedback(data));
});
test('CI authentication fails closed and cannot accept empty secret',()=>{
 assert.equal(authorized('', ''),false);assert.equal(authorized('Bearer secret','secret'),true);assert.equal(authorized('Bearer wrong','secret'),false);
});
