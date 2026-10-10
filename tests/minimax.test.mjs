import {test} from 'node:test';import assert from 'node:assert/strict';
const api=await import('../server/minimax.mjs').catch(()=>({}));
test('selects text-capable model and lower-cost image model with fixed clip bounds',()=>{
 assert.equal(typeof api.videoRequest,'function','MiniMax video request adapter is missing');
 const text=api.videoRequest({mode:'text',prompt:'一只猫突然破防'});assert.equal(text.model,'MiniMax-Hailuo-2.3');assert.equal(text.duration,6);assert.equal(text.resolution,'768P');assert.equal(text.first_frame_image,undefined);
 const image=api.videoRequest({mode:'photo',prompt:'探头偷看',image:'data:image/jpeg;base64,/9j/AA=='});assert.equal(image.model,'MiniMax-Hailuo-2.3-Fast');assert.equal(image.first_frame_image,'data:image/jpeg;base64,/9j/AA==');
 assert.throws(()=>api.videoRequest({mode:'photo',prompt:'hello',image:'http://localhost/private'}));assert.throws(()=>api.videoRequest({mode:'text',prompt:' '.repeat(3)}));
});
test('normalizes async states and never exposes provider credentials in errors',async()=>{
 assert.equal(typeof api.createMiniMax,'function','MiniMax video client is missing');
 const calls=[],responses=[{task_id:'123',base_resp:{status_code:0}},{status:'Success',file_id:'456',base_resp:{status_code:0}},{file:{download_url:'https://filecdn.minimax.chat/sample.mp4'},base_resp:{status_code:0}}];
 const client=api.createMiniMax({key:'private-test-token',fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(responses.shift()),{status:200});}});
 assert.equal((await client.create({mode:'text',prompt:'猫打喷嚏'})).taskId,'123');assert.deepEqual(await client.query('123'),{status:'success',fileId:'456'});assert.equal(await client.result('456'),'https://filecdn.minimax.chat/sample.mp4');
 assert.ok(calls.every(c=>c.options.headers.Authorization==='Bearer private-test-token'));assert.ok(calls[1].url.endsWith('task_id=123'));assert.ok(calls[2].url.endsWith('file_id=456'));
 const bad=api.createMiniMax({key:'private-test-token',fetchImpl:async()=>new Response(JSON.stringify({base_resp:{status_code:1004,status_msg:'echo private-test-token'}}))});await assert.rejects(()=>bad.create({mode:'text',prompt:'猫'}),e=>!e.message.includes('private-test-token')&&e.message.includes('密钥'));
});
