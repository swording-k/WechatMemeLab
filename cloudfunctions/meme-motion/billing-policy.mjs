import {createHash} from 'node:crypto';
const id=uid=>createHash('sha256').update('wechat:'+uid).digest('hex');
const ids=value=>new Set((value||'').split(',').map(x=>x.trim()).filter(Boolean));
export function billingPolicy(env,publicPaymentEnabled){
 const testers=ids(env.MEME_BILLING_TEST_ACCOUNT_IDS),free=ids([env.MEME_DEVELOPER_ACCOUNT_IDS,env.MEME_FREE_ACCOUNT_IDS].filter(Boolean).join(','));
 const publicEnabled=env.MEME_BILLING_ENABLED==='true'&&publicPaymentEnabled;
 return{enabled:uid=>publicEnabled||(typeof uid==='string'&&testers.has(id(uid))),exempt:uid=>!testers.has(id(uid))&&free.has(id(uid))};
}
