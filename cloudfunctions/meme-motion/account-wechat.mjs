// Official WeChat server endpoints; keys and payment session_key stay on server.
export function accountWechat(env,fetcher=fetch){
 let cached,pending;
 const json=async(url,options)=>{try{const r=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();return await r.json();}catch{throw Error('微信账户服务连接失败，请稍后重试');}};
 return{
  async session(code){if(typeof code!=='string'||!code||code.length>256)throw Error('微信登录凭证无效');const q=new URLSearchParams({appid:env.WECHAT_APP_ID,secret:env.WECHAT_APP_SECRET,js_code:code,grant_type:'authorization_code'});const r=await json('https://api.weixin.qq.com/sns/jscode2session?'+q);if(!r.openid||!r.session_key)throw Error('微信登录已过期，请重新登录');return{openid:r.openid,session_key:r.session_key};},
  async token(){if(cached?.expires>Date.now())return cached.value;if(pending)return pending;return pending=(async()=>{const r=await json('https://api.weixin.qq.com/cgi-bin/stable_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'client_credential',appid:env.WECHAT_APP_ID,secret:env.WECHAT_APP_SECRET,force_refresh:false})});if(!r.access_token)throw Error('微信账户服务尚未就绪');cached={value:r.access_token,expires:Date.now()+Math.max(1,Number(r.expires_in)-120)*1000};return cached.value;})().finally(()=>pending=null);}
 };
}
