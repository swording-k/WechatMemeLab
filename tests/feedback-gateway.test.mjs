import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {gateway}=createRequire(import.meta.url)('../cloudfunctions/meme-feedback/gateway.cjs');
test('CloudBase binary requests retain JSON attachment bytes and query parameters',async()=>{
 const payload=JSON.stringify({images:[{data:'a'.repeat(200000)}]});
 const handler=gateway(async(req,res)=>{assert.equal(req.method,'POST');assert.equal(req.headers['content-type'],'application/octet-stream');assert.equal(req.url,'/?op=submit');const chunks=[];for await(const c of req)chunks.push(c);assert.equal(Buffer.concat(chunks).toString(),payload);res.writeHead(201,{});res.end(JSON.stringify({ok:true}));});
 const r=await handler({httpMethod:'POST',headers:{'Content-Type':'application/octet-stream'},queryStringParameters:{op:'submit'},isBase64Encoded:true,body:Buffer.from(payload).toString('base64')});assert.equal(r.statusCode,201);assert.deepEqual(JSON.parse(r.body),{ok:true});
});
