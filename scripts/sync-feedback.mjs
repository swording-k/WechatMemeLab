import {pathToFileURL} from 'node:url';
export async function syncFeedback({base,secret,token,repo='swording-k/WechatMemeLab',request=fetch}){
 if(!base||!secret||!token)throw new Error('Missing sync configuration');
 async function api(url,options={}){const r=await request(url,options);if(!r.ok)throw new Error(`Sync HTTP ${r.status}`);return r.status===204?null:r.json();}
 const auth={Authorization:`Bearer ${secret}`,'Content-Type':'application/json'};
 const {items}=await api(base+'?op=pending',{headers:auth});if(!items.length)return {synced:0};
 const gh={'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 const existing=new Map();let exhausted=false;
 for(let page=1;page<=10;page++){const issues=await api(`https://api.github.com/repos/${repo}/issues?state=all&sort=created&direction=desc&per_page=100&page=${page}`,{headers:gh});for(const i of issues){const id=i.body?.match(/<!-- meme-feedback:([a-f0-9-]+) -->/)?.[1];if(id)existing.set(id,i.html_url);}if(issues.length<100){exhausted=true;break;}}
 if(!exhausted)throw new Error('Issue history too large for safe deduplication');
 let synced=0;
 for(const item of items){let issueUrl=existing.get(item.id);if(!issueUrl){const kind=item.type==='idea'?'玩法建议':item.type==='other'?'其他反馈':'使用问题';
 const images=item.images.map((f,i)=>`![截图 ${i+1}](${f.url})`).join('\n\n');
 const body=`### ${kind}\n${item.detail}\n\n### 设备与浏览器\n${item.device||'未填写'}\n\n${images}\n\n<!-- meme-feedback:${item.id} -->`;
 const issue=await api(`https://api.github.com/repos/${repo}/issues`,{method:'POST',headers:gh,body:JSON.stringify({title:`[${kind}] ${item.title}`,body,assignees:['swording-k']})});issueUrl=issue.html_url;existing.set(item.id,issueUrl);}
 await api(base+'?op=ack',{method:'POST',headers:auth,body:JSON.stringify({id:item.id,issueUrl})});synced++;
 }
 return {synced};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){syncFeedback({base:process.env.FEEDBACK_API_URL,secret:process.env.FEEDBACK_SYNC_SECRET,token:process.env.GITHUB_TOKEN}).then(r=>console.log(`Synced ${r.synced} feedback item(s)`)).catch(e=>{console.error(e.message);process.exitCode=1;});}
