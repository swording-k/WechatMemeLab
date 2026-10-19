const {createHandler}=require('./server.cjs');const {gateway}=require('./gateway.cjs');const store=require('./store.cjs');
const {createSecurity}=require('./security-handler.cjs');const {createWechat}=require('./wechat-security.cjs');const securityStore=require('./security-store.cjs');
const http=gateway(createHandler(store,process.env,createSecurity({store:securityStore,wechat:createWechat()})));
exports.main=async event=>{if(event.Type==='Timer'&&event.TriggerName==='meme-security-cleanup'){const jobs=await securityStore.stale();for(const job of jobs){await securityStore.remove(job.files||[]);await securityStore.save({...job,cleaned:true,state:'expired'});}return {cleaned:jobs.length,purged:await securityStore.purgeMetadata()};}return http(event);};
