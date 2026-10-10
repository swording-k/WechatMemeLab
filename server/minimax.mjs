const models={text:'MiniMax-Hailuo-2.3',photo:'MiniMax-Hailuo-2.3-Fast'};
export function videoRequest(input){
 if(!['text','photo'].includes(input.mode))throw new Error('请选择照片或文字创作');
 if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>2000)throw new Error('请填写 1–2000 字的动作描述');
 const body={model:models[input.mode],prompt:input.prompt.trim(),duration:6,resolution:'768P',prompt_optimizer:false};
 if(input.mode==='photo'){
  if(typeof input.image!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.image)||input.image.length>8_000_000)throw new Error('请选择有效照片，压缩后须小于 6 MB');
  body.first_frame_image=input.image;
 }
 return body;
}
const messages={1004:'MiniMax 密钥无效，请检查服务端配置',1008:'MiniMax 余额不足',1002:'MiniMax 调用过于频繁，请稍后查询',2013:'生成参数无效，请修改动作描述',2049:'这段内容未通过生成服务审核，请调整描述'};
export function createMiniMax({key,base='https://api.minimax.cn',fetchImpl=fetch}){
 if(!key)throw new Error('尚未配置 MiniMax 服务端密钥');
 if(!['https://api.minimax.cn','https://api.minimax.io','https://api.minimaxi.com'].includes(base))throw new Error('仅支持 MiniMax 官方接口地址');
 async function request(path,body){
  let response;try{response=await fetchImpl(base+'/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000),redirect:'error'});}catch{throw new Error('MiniMax 连接超时；请查询已有任务，不要重复创建');}
  let data;try{data=await response.json();}catch{throw new Error('MiniMax 返回格式异常，请稍后查询');}
  const code=data.base_resp?.status_code;if(!response.ok||code!==0)throw new Error(messages[code]||`MiniMax 暂时无法完成请求（${code??response.status}）`);
  return data;
 }
 return {
  async create(input){const d=await request('video_generation',videoRequest(input));if(!/^\d+$/.test(d.task_id))throw new Error('MiniMax 未返回有效任务编号，请勿重复提交');return {taskId:d.task_id};},
  async query(taskId){if(!/^\d+$/.test(taskId))throw new Error('无效任务编号');const d=await request('query/video_generation?task_id='+taskId);const status={Preparing:'preparing',Queueing:'queued',Processing:'processing',Success:'success',Fail:'failed'}[d.status];if(!status)throw new Error('未知生成状态，请稍后查询');return {status,...(d.file_id?{fileId:String(d.file_id)}:{})};},
  async result(fileId){if(!/^\d+$/.test(fileId))throw new Error('无效视频编号');const d=await request('files/retrieve?file_id='+fileId);const url=new URL(d.file?.download_url);if(url.protocol!=='https:')throw new Error('视频下载地址无效');return url.href;}
 };
}
