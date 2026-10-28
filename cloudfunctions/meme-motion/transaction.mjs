// Only retry aborted CloudBase transactions. Provider/payment HTTP calls stay outside.
export async function retryTransaction(operation,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
 for(let attempt=0;;attempt++)try{return await operation();}catch(error){
  if(attempt>=3||!/TransactionBusy|TransactionConflict/.test(String(error.code||'')+' '+String(error.message||'')))throw error;
  await sleep(100*(attempt+1));
 }
}
