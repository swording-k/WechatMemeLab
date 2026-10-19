import {test} from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {createRequire} from 'node:module';
const {sign,digest}=createRequire(import.meta.url)('../cloudfunctions/meme-feedback/security-core.cjs');
const {createHandler}=createRequire(import.meta.url)('../cloudfunctions/meme-feedback/server.cjs');
test('HTTP persists screenshot, rejects untrusted origins and exposes only safe status',async()=>{
 const rows=new Map(),files=new Map();let uploads=0,ack=false;
 const store={get:async id=>rows.get(id),claimRate:async()=>true,save:async r=>rows.set(r.id,r),upload:async(id,f)=>{uploads++;files.set(id,f.buffer);return {fileID:id,type:f.type,name:f.name};},download:async id=>files.get(id),removeFiles:async()=>{},pending:async()=>[...rows.values()],ack:async(id,url)=>{rows.get(id).state='synced';rows.get(id).issueUrl=url;ack=true;}};
 const env={MEME_SECURITY_SECRET:'s'.repeat(40)};const server=http.createServer(createHandler(store,{...env,FEEDBACK_SYNC_SECRET:'test-secret',FEEDBACK_PUBLIC_URL:'https://example.com/meme-feedback',FEEDBACK_ORIGINS:'https://example.com'}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const id='12345678-1234-4234-8234-123456789abc',image=Buffer.from('GIF89a'+String.fromCharCode(1,0,1,0)+'.'.repeat(20));
  const data={id,title:'截图问题',detail:'复制失败',images:[{type:'image/gif',data:image.toString('base64')}]};
  data.securityReceipt=sign({kind:'receipt',hash:digest(data.title+'\n'+data.detail+'\n',data.images),exp:Date.now()+10000},env);
  const send=()=>fetch(base,{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify(data)});
  assert.equal((await send()).status,201);assert.equal((await send()).status,200);assert.equal(uploads,1);
  const img=await fetch(base+'?op=image&id='+id+'&slot=0');assert.equal(img.headers.get('content-type'),'image/gif');assert.deepEqual(Buffer.from(await img.arrayBuffer()),image);
  assert.equal((await fetch(base+'?op=pending')).status,401);
  const pending=await(await fetch(base+'?op=pending',{headers:{Authorization:'Bearer test-secret'}})).json();assert.equal(pending.items[0].images.length,1);assert.equal(JSON.stringify(pending).includes('fileID'),false);
  assert.equal((await fetch(base,{method:'POST',headers:{Origin:'https://bad.com'},body:JSON.stringify(data)})).status,403);
  await fetch(base+'?op=ack',{method:'POST',headers:{Authorization:'Bearer test-secret'},body:JSON.stringify({id,issueUrl:'https://github.com/swording-k/WechatMemeLab/issues/123'})});assert.equal(ack,true);
  const status=await(await fetch(base+'?op=status&id='+id)).json();assert.equal(status.state,'synced');assert.equal(status.detail,undefined);
 }finally{await new Promise(r=>server.close(r));}
});
