const size=1024*1024,max=50*1024*1024;
function remoteURL(value){const url=new URL(value),allowed=['minimax.chat','minimax.cn','minimax.io','hailuoai.com','myqcloud.com','mmcdn.cn','tcb.qcloud.la','public-cdn-video-data-algeng.oss-cn-wulanchabu.aliyuncs.com'];if(url.protocol!=='https:'||!allowed.some(d=>url.hostname===d||url.hostname.endsWith('.'+d)))throw new Error('生成视频地址未通过校验');return url.href;}
export function createMedia({store,fetchImpl=fetch}){return{
 async info(id,url){remoteURL(url);const cached=await store.get(id);if(cached)return {bytes:cached.bytes,type:cached.type,chunks:Math.ceil(cached.bytes/size)};
  const response=await fetchImpl(remoteURL(url),{signal:AbortSignal.timeout(45000),redirect:'error'});if(!response.ok||Number(response.headers.get('content-length'))>max)throw new Error('生成视频暂时无法读取或文件过大');
  let bytes=0;const parts=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>max)throw new Error('生成视频超过 50 MB');parts.push(chunk);}const buffer=Buffer.concat(parts);if(buffer.length<12||buffer.toString('ascii',4,8)!=='ftyp')throw new Error('生成结果不是有效的 MP4 视频');
  const fileID=await store.upload(id,buffer),meta={fileID,bytes,type:'video/mp4'};await store.save(id,meta);return {bytes,type:meta.type,chunks:Math.ceil(bytes/size)};
 },
 async chunk(id,index){const meta=await store.get(id);if(!meta||!Number.isInteger(index)||index<0||index>=Math.ceil(meta.bytes/size))throw new Error('视频片段不存在');const a=index*size,b=Math.min(meta.bytes-1,a+size-1),url=await store.url(meta.fileID);
  const response=await fetchImpl(remoteURL(url),{headers:{Range:`bytes=${a}-${b}`},signal:AbortSignal.timeout(30000),redirect:'error'});
  if(response.status!==206||response.headers.get('content-range')!==`bytes ${a}-${b}/${meta.bytes}`)throw new Error('视频片段读取异常，请继续查询');
  const chunks=[];let bytes=0;for await(const c of response.body){bytes+=c.length;if(bytes>b-a+1)throw new Error('视频片段长度异常');chunks.push(c);}if(bytes!==b-a+1)throw new Error('视频片段不完整');return Buffer.concat(chunks);
 }
};}
