const {repository,mediaStore}=require('./store.cjs');let handler;
exports.main=async event=>{
 if(!handler){const [{createMiniMax},{createCloudJobs},{createMedia},{createCloudHandler}]=await Promise.all([import('./lib/minimax.mjs'),import('./lib/cloud-jobs.mjs'),import('./lib/video-media.mjs'),import('./lib/cloud-http.mjs')]);const key=process.env.MINIMAX_API_KEY;const jobs=key?createCloudJobs({repository,provider:createMiniMax({key,base:process.env.MINIMAX_API_BASE||'https://api.minimax.cn'}),budget:Number(process.env.AI_BUDGET_CNY||0)}):undefined;
 handler=createCloudHandler({jobs,media:createMedia({store:mediaStore}),token:process.env.AI_ACCESS_TOKEN,origins:(process.env.AI_ALLOWED_ORIGINS||'').split(',')});}
 return handler(event);
};
