import {test} from 'node:test';import assert from 'node:assert/strict';
const {createMedia}=await import('../server/video-media.mjs').catch(()=>({}));
test('generated video is cached and served as bounded verified chunks',async()=>{assert.equal(typeof createMedia,'function');const video=Buffer.alloc(1200000,7);video.write('ftyp',4);let metadata,uploaded;const media=createMedia({store:{get:async()=>metadata,save:async(_,m)=>metadata=m,upload:async(_,b)=>{uploaded=b;return 'fileID';},url:async()=> 'https://test-env.tcb.qcloud.la/result.mp4'},fetchImpl:async(url,opts)=>{if(!opts?.headers?.Range)return new Response(video,{headers:{'Content-Type':'video/mp4'}});const [a,b]=opts.headers.Range.slice(6).split('-').map(Number);return new Response(uploaded.subarray(a,b+1),{status:206,headers:{'Content-Range':`bytes ${a}-${Math.min(b,uploaded.length-1)}/${uploaded.length}`}});}});assert.equal((await media.info('id','https://filecdn.minimax.chat/result.mp4')).chunks,2);assert.equal((await media.chunk('id',0)).length,1048576);assert.equal((await media.chunk('id',1)).length,151424);await assert.rejects(()=>media.chunk('id',2),/片段/);await assert.rejects(()=>media.info('other','http://127.0.0.1/private'),/地址/);});
test('MiniMax official response OSS host is accepted without allowing arbitrary OSS buckets',async()=>{
 const video=Buffer.alloc(32);video.write('ftyp',4);let metadata;
 const media=createMedia({store:{get:async()=>metadata,save:async(_,m)=>metadata=m,upload:async()=> 'fileID'},fetchImpl:async()=>new Response(video)});
 assert.equal((await media.info('job','https://public-cdn-video-data-algeng.oss-cn-wulanchabu.aliyuncs.com/result.mp4')).bytes,32);
 await assert.rejects(()=>media.info('other','https://untrusted.oss-cn-wulanchabu.aliyuncs.com/result.mp4'),/地址/);
 await assert.rejects(()=>media.info('other','https://public-cdn-video-data-algeng.oss-cn-wulanchabu.aliyuncs.com.evil.test/result.mp4'),/地址/);
});
