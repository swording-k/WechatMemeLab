import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('native file write waits for success and writes only the GIF view',async()=>{
 const {writeBytes}=require('../miniprogram/lib/files.js');
 let request,done=false;const source=new Uint8Array([99,71,73,70,99]);
 const pending=writeBytes({writeFile(options){request=options;}},'test.gif',source.subarray(1,4)).then(()=>{done=true;});
 await Promise.resolve();assert.equal(done,false);assert.deepEqual([...new Uint8Array(request.data)],[71,73,70]);request.success();await pending;assert.equal(done,true);
 await assert.rejects(writeBytes({writeFile(o){o.fail(Error('disk full'));}},'test.gif',source),/disk full/);
});
