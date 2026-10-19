const {createHash,createHmac,timingSafeEqual,createDecipheriv}=require('node:crypto');
function fail(message,status=503){throw Object.assign(new Error(message),{status});}
function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
function secret(env){if(!env.MEME_SECURITY_SECRET||env.MEME_SECURITY_SECRET.length<32)fail('内容安全服务尚未配置');return env.MEME_SECURITY_SECRET;}
function sign(data,env){const text=Buffer.from(JSON.stringify(data)).toString('base64url');return text+'.'+createHmac('sha256',secret(env)).update(text).digest('base64url');}
function verify(token,env,kind){const [text,mac,...extra]=String(token||'').split('.');if(extra.length||!text||!mac||!equal(mac,createHmac('sha256',secret(env)).update(text).digest('base64url')))fail('检测凭证无效，请重新检测',401);let data;try{data=JSON.parse(Buffer.from(text,'base64url'));}catch{fail('检测凭证无效',401);}if(data.kind!==kind||!Number.isFinite(data.exp)||data.exp<Date.now())fail('检测凭证已过期，请重新检测',401);return data;}
function digest(text,images){const h=createHash('sha256').update(JSON.stringify(String(text)));for(const image of images){const b=image.buffer||Buffer.from(image.data,'base64');h.update(String(b.length)+':').update(b);}return h.digest('hex');}
async function checkText(call,uid,text){if(!text.trim())return;const r=await call('msg_sec_check',{openid:uid,scene:4,version:2,content:text});if(r.errcode!==0||r.result?.suggest!=='pass')fail(r.result?.suggest==='risky'||r.errcode===87014?'内容包含违规信息，请修改后重试':'文字未通过检测，请修改内容或稍后重试',422);}
function signature(q,env,encrypted){if(!env.WECHAT_CALLBACK_TOKEN||env.WECHAT_CALLBACK_TOKEN.length<3||env.WECHAT_CALLBACK_TOKEN.length>32)fail('回调Token须为3至32位');if(!/^\d+$/.test(q.timestamp||'')||Math.abs(Date.now()/1000-Number(q.timestamp))>600||!q.nonce)fail('无效回调',403);const values=[env.WECHAT_CALLBACK_TOKEN,q.timestamp,q.nonce];if(encrypted)values.push(encrypted);const hash=createHash('sha1').update(values.sort().join('')).digest('hex');if(!equal(hash,encrypted?q.msg_signature:q.signature))fail('回调签名不符',403);}
function callbackMessage(q,body,env){
 const encrypted=body.Encrypt||body.encrypt;signature(q,env,encrypted);
 if(!encrypted)fail('请使用安全模式消息推送',403);
 const key=Buffer.from((env.WECHAT_CALLBACK_AES_KEY||'')+'=','base64');if(key.length!==32)fail('回调AES密钥无效');
 const decipher=createDecipheriv('aes-256-cbc',key,key.subarray(0,16));decipher.setAutoPadding(false);let data;try{data=Buffer.concat([decipher.update(Buffer.from(encrypted,'base64')),decipher.final()]);}catch{fail('回调解密失败',403);}
 const pad=data[data.length-1];if(pad<1||pad>32||!data.subarray(data.length-pad).every(x=>x===pad))fail('回调填充错误',403);data=data.subarray(0,data.length-pad);if(data.length<20)fail('回调格式错误',403);const n=data.readUInt32BE(16);if(n>data.length-20||data.subarray(20+n).toString()!==env.WECHAT_APP_ID)fail('回调AppID不匹配',403);try{return JSON.parse(data.subarray(20,20+n).toString());}catch{fail('请配置JSON消息推送',400);}
}
function receiptMatches(ticket,text,images,env){const r=verify(ticket,env,'receipt');if(r.hash!==digest(text,images))fail('提交内容已变化，请重新检测',403);return r;}
module.exports={fail,sign,verify,digest,checkText,callbackMessage,signature,receiptMatches};
