import {createHash,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import security from '../meme-feedback/security-core.cjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=(message,status=422)=>{throw Object.assign(Error(message),{status});};
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const accountId=uid=>hash('wechat:'+uid);
export function createAccounts({store,env,billingEnabled=false,now=Date.now}){
 async function ensure(tx,uid){
  if(typeof uid!=='string'||!uid||uid.startsWith('web:'))fail('请使用微信登录',401);
  const id=accountId(uid);let account=await tx.get('meme_accounts',id);
  if(!account){account={id,createdAt:now()};await tx.set('meme_accounts',id,account);}
  let wallet=await tx.get('meme_wallets',id);if(!wallet){wallet={accountId:id,available:0,frozen:0,spent:0,credited:0};await tx.set('meme_wallets',id,wallet);}
  return {account:{id,number:'GX'+id.slice(0,12).toUpperCase(),createdAt:account.createdAt},wallet:{available:wallet.available,frozen:wallet.frozen,spent:wallet.spent},developer:(env.MEME_DEVELOPER_ACCOUNT_IDS||'').split(',').map(x=>x.trim()).includes(id),free:!billingEnabled||(env.MEME_DEVELOPER_ACCOUNT_IDS||'').split(',').map(x=>x.trim()).includes(id)};
 }
 async function rate(tx,key,limit,window){const r=await tx.get('meme_login_limits',key)||{at:now(),count:0};if(now()-r.at>=window){r.at=now();r.count=0;}if(r.count>=limit)return false;r.count++;await tx.set('meme_login_limits',key,r);return true;}
 return {
  me:uid=>store.transaction(tx=>ensure(tx,uid)),
  async start({clientId,secret}){
   if(!/^[a-f0-9]{32,64}$/.test(clientId||'')||!/^[A-Za-z0-9_-]{40,100}$/.test(secret||''))fail('浏览器登录信息无效',400);
   const result=await store.transaction(async tx=>{
    if(!await rate(tx,'start:'+hash(clientId),1,30000))return {error:'登录码申请过于频繁，请稍后再试'};
    let code;for(let i=0;i<5;i++){code=String(randomInt(10000000,100000000));const old=await tx.get('meme_login_challenges',code);if(!old||old.expires<now())break;code=null;}if(!code)return{error:'登录繁忙，请稍后重试'};
    const row={code,secret:hash(secret),expires:now()+300000,state:'pending',sid:randomUUID()};await tx.set('meme_login_challenges',code,row);return{code,expires:row.expires};
   });if(result.error)fail(result.error,429);return result;
  },
  async confirm(uid,{code}){
   if(!/^\d{8}$/.test(code||''))fail('请输入8位网页登录码',400);
   const result=await store.transaction(async tx=>{
    if(!await rate(tx,'confirm:'+hash(uid),10,60000))return{error:'确认过于频繁，请稍后重试'};
    const r=await tx.get('meme_login_challenges',code);if(!r||r.expires<now())return{error:'登录码不存在或已过期，请刷新网页'};
    if(r.uid&&r.uid!==uid)return{error:'此登录码已确认，请重新申请'};
    await ensure(tx,uid);r.uid=uid;r.state='confirmed';await tx.set('meme_login_challenges',code,r);return{confirmed:true};
   });if(result.error)fail(result.error);return result;
  },
  async poll({code,secret}){
   if(!/^\d{8}$/.test(code||'')||typeof secret!=='string')fail('登录信息无效',400);
   return store.transaction(async tx=>{
    const r=await tx.get('meme_login_challenges',code);if(!r||r.expires<now()||!same(r.secret,hash(secret)))fail('登录码已过期，请重新申请',401);
    if(r.state==='pending')return{status:'pending'};
    let s=await tx.get('meme_account_sessions',r.sid);if(s?.revoked)fail('登录已退出，请重新申请',401);
    if(!s){s={uid:r.uid,exp:now()+30*86400000,revoked:false};await tx.set('meme_account_sessions',r.sid,s);}
    return{status:'confirmed',session:security.sign({kind:'account-session',sid:r.sid,exp:s.exp},env)};
   });
  },
  async resolve(token){const s=security.verify(token,env,'account-session');return store.transaction(async tx=>{const row=await tx.get('meme_account_sessions',s.sid);if(!row||row.revoked||row.exp<now())fail('登录已过期，请重新登录',401);return row.uid;});},
  async webMe(token){return this.me(await this.resolve(token));},
  async logout(token){const s=security.verify(token,env,'account-session');await store.transaction(async tx=>{const row=await tx.get('meme_account_sessions',s.sid);if(row){row.revoked=true;await tx.set('meme_account_sessions',s.sid,row);}});return{loggedOut:true};}
 };
}
