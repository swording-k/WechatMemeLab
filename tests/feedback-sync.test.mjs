import {test} from 'node:test';import assert from 'node:assert/strict';import {syncFeedback} from '../scripts/sync-feedback.mjs';
test('CI retries acknowledge an existing Issue instead of posting twice',async()=>{
 let created=0,ack=0;const id='12345678-1234-4234-8234-123456789abc';
 const request=async(url,opts={})=>{let data;if(url.includes('op=pending'))data={items:[{id,title:'x',detail:'y',device:'',images:[]}]};else if(url.includes('op=ack')){ack++;data={ok:true};}else if(opts.method==='POST'){created++;data={html_url:'https://github.com/swording-k/WechatMemeLab/issues/12'};}else data=[{body:`<!-- meme-feedback:${id} -->`,html_url:'https://github.com/swording-k/WechatMemeLab/issues/12'}];return new Response(JSON.stringify(data));};
 assert.equal((await syncFeedback({base:'https://example.com',secret:'x',token:'y',request})).synced,1);assert.equal(created,0);assert.equal(ack,1);
});
