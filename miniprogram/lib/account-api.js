const {getSession}=require('./security');
const ENDPOINT='https://fitgenius-d0ghm1rz21cef6594-1441969311.ap-shanghai.app.tcloudbase.com/meme-motion-api';
async function request(op,data={},retry=true){
 if(!['me','orders','confirm-login','pay-query','pay-prepare','pay-error'].includes(op))throw Error('不支持的账户操作');
 const token=await getSession();
 try{return await new Promise((resolve,reject)=>wx.request({url:ENDPOINT+'?op=account-'+op,method:'POST',header:{'content-type':'application/json',Authorization:'Bearer '+token},data:JSON.stringify(data),timeout:30000,success:r=>r.statusCode===200?resolve(r.data):reject(Object.assign(Error(r.data?.error||'账户服务暂时不可用，请重试'),{status:r.statusCode})),fail:()=>reject(Error('账户连接中断，请检查网络后重试'))}));}
 catch(e){if(e.status===401&&retry){await getSession(true);return request(op,data,false);}throw e;}
}
module.exports={request};
