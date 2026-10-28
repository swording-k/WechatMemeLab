import {createHash} from 'node:crypto';
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
const integer=(value,min=Number.MIN_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min;
const accountFor=uid=>createHash('sha256').update('wechat:'+uid).digest('hex');
function validateWallet(wallet,accountId){
 if(!wallet||wallet.accountId!==accountId||!integer(wallet.available)||!integer(wallet.frozen,0)||!integer(wallet.spent,0))fail('账户点数记录异常，请联系作者');
}
function validateUsage(usage){
 if(!usage||typeof usage.id!=='string'||!usage.id||!/^[a-f0-9]{64}$/.test(usage.accountId||'')||!integer(usage.points,1)||!['held','spent','refunded','free','exempt'].includes(usage.state))fail('任务扣费记录异常，请联系作者');
}
/** Pure transitions: the caller persists wallet and usage together in one transaction. */
export function reserveUsage(state,{id,uid,points,enabled,exempt=false,now=Date.now()}){
 if(typeof id!=='string'||!id||typeof uid!=='string'||!uid||uid.startsWith('web:')||!integer(points,1)||!integer(now,0))fail('任务扣费参数无效',422);
 const accountId=accountFor(uid);
 if(state.usage){
  validateUsage(state.usage);
  if(state.usage.id!==id||state.usage.accountId!==accountId||state.usage.points!==points)fail('任务扣费参数与原记录不一致');
  if(!['free','exempt'].includes(state.usage.state))validateWallet(state.wallet,accountId);
  // A retry may happen after a feature flag changes. The original transition
  // remains authoritative: never convert a free or settled job into a new hold.
  return state;
 }
 const usage={id,accountId,points,state:exempt?'exempt':enabled===true?'held':'free',createdAt:now};
 if(usage.state!=='held')return {...state,usage};
 validateWallet(state.wallet,accountId);
 const wallet={...state.wallet};
 if(wallet.available<points)fail('点数不足，请充值后再试',402);
 if(!integer(wallet.frozen+points,0))fail('账户点数超出范围');
 wallet.available-=points;wallet.frozen+=points;wallet.updatedAt=now;
 return {...state,wallet,usage};
}
export function settleUsage(state,{success,now=Date.now()}){
 if(typeof success!=='boolean'||!integer(now,0))fail('任务结果尚未确认，不能结算');
 validateUsage(state.usage);
 const usage=state.usage;
 if(usage.state==='free'||usage.state==='exempt')return state;
 validateWallet(state.wallet,usage.accountId);
 const result=success?'spent':'refunded';
 if(usage.state!=='held'){
  if(usage.state!==result)fail('任务结算结果与原记录不一致');
  return state;
 }
 const wallet={...state.wallet};
 if(wallet.frozen<usage.points)fail('任务冻结点数记录异常');
 const next=success?wallet.spent+usage.points:wallet.available+usage.points;
 if(!integer(next,success?0:Number.MIN_SAFE_INTEGER))fail('账户点数超出范围');
 wallet.frozen-=usage.points;
 if(success)wallet.spent=next;else wallet.available=next;
 wallet.updatedAt=now;
 return {...state,wallet,usage:{...usage,state:result,settledAt:now}};
}
