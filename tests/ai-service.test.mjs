import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const api=await import('../server/jobs.mjs').catch(()=>({}));
test('persistent idempotency and budget prevent duplicate paid submissions',async()=>{
 assert.equal(typeof api.createJobs,'function','paid task ledger is missing');
 const dir=await mkdtemp(join(tmpdir(),'meme-ai-'));let submissions=0;
 const provider={create:async()=>{submissions++;return {taskId:'123'};},query:async()=>({status:'success',fileId:'456'}),result:async()=> 'https://filecdn.minimax.chat/test.mp4'};
 try{const service=await api.createJobs({directory:dir,budget:2,provider});const id='12345678-1234-4321-1234-123456789012';const [a,b]=await Promise.all([service.create(id,{mode:'text',prompt:'cat'}),service.create(id,{mode:'text',prompt:'cat'})]);assert.equal(submissions,1);assert.equal(a.id,b.id);assert.equal((await service.query(id)).status,'success');assert.equal(await service.video(id),'https://filecdn.minimax.chat/test.mp4');
 const restarted=await api.createJobs({directory:dir,budget:2,provider});await restarted.create(id,{mode:'text',prompt:'cat'});assert.equal(submissions,1);await assert.rejects(()=>restarted.create('12345678-1234-4321-1234-123456789013',{mode:'photo',prompt:'cat',image:'data:image/jpeg;base64,/9j/AA=='}),/预算/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('uncertain provider submission is not retried or silently refunded',async()=>{
 assert.equal(typeof api.createJobs,'function','paid task ledger is missing');const dir=await mkdtemp(join(tmpdir(),'meme-ai-'));let count=0;
 try{const service=await api.createJobs({directory:dir,budget:2,provider:{create:async()=>{count++;throw new Error('连接超时');}}});const id='12345678-1234-4321-1234-123456789012';assert.equal((await service.create(id,{mode:'text',prompt:'cat'})).status,'unknown');await service.create(id,{mode:'text',prompt:'cat'});assert.equal(count,1);await assert.rejects(()=>service.create('12345678-1234-4321-1234-123456789013',{mode:'text',prompt:'cat'}),/预算/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
