import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRequest,parseTask,createProvider} from '../server/motion/provider.mjs';

test('text-to-image creates exactly one image without requiring a photo',()=>{
 const r=buildRequest({mode:'draw',prompt:'黄色小恐龙抱着饭碗发呆'});
 assert.equal(r.body.model,'wan2.6-t2i');assert.equal(r.body.parameters.n,1);assert.equal(r.body.parameters.size,'1280*1280');
 assert.match(r.path,/image-generation/);assert.deepEqual(r.body.input.messages[0].content,[{text:'黄色小恐龙抱着饭碗发呆'}]);
});
test('image editing permits changing clothes and scene instead of inheriting action-only exclusions',()=>{
 const r=buildRequest({mode:'edit',prompt:'戴军帽，穿军装，身后有一队士兵',image:'data:image/jpeg;base64,eA=='});
 assert.equal(r.body.model,'wan2.6-image');assert.equal(r.body.parameters.n,1);assert.equal(r.body.parameters.enable_interleave,false);
 assert.equal(r.body.input.messages[0].content[0].image,'data:image/jpeg;base64,eA==');
 assert.equal(r.body.input.messages[0].content[1].text,'戴军帽，穿军装，身后有一队士兵');assert.ok(!JSON.stringify(r.body).includes('新增人物'));
});
test('async image results use the new choices envelope and never pretend an empty result succeeded',()=>{
 const x=parseTask({output:{task_status:'SUCCEEDED',choices:[{message:{content:[{image:'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a.png'}]}}]}});
 assert.equal(x.imageUrl,'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a.png');assert.equal(x.status,'success');
 assert.throws(()=>parseTask({output:{task_status:'SUCCEEDED',choices:[]}}),/结果|视频/);
});
test('image downloads enforce provider host, content type, and a separate bounded image limit',async()=>{
 const p=createProvider({key:'x',fetcher:async()=>new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}})});
 assert.deepEqual(await p.downloadImage('https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a.png'),Buffer.from([1,2,3]));
 await assert.rejects(()=>p.downloadImage('http://127.0.0.1/a'),/地址/);
 const wrong=createProvider({key:'x',fetcher:async()=>new Response('html',{headers:{'Content-Type':'text/html'}})});await assert.rejects(()=>wrong.downloadImage('https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a'),/下载/);
 const large=createProvider({key:'x',fetcher:async()=>new Response('png',{headers:{'Content-Type':'image/png','Content-Length':String(10*1024*1024+1)}})});await assert.rejects(()=>large.downloadImage('https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a.png'),/下载/);
});
test('pricing is integer fen, separates image/video, and never enables checkout implicitly',async()=>{
 const {quote,catalog}=await import('../server/motion/pricing.mjs');
 assert.deepEqual(quote('draw'),{costFen:20,priceFen:50});assert.deepEqual(quote('edit'),quote('draw'));
 assert.deepEqual(quote('describe'),{costFen:30,priceFen:80});assert.deepEqual(quote('imitate',2.4),{costFen:120,priceFen:240});
 assert.equal(catalog().paymentsEnabled,false);assert.equal(catalog().currency,'CNY');assert.throws(()=>quote('imitate',NaN),/时长/);
});
