const SESSION='meme-account-session-v1',LOGIN='meme-account-login-v1',ACCOUNT='meme-account-id-v1';
function secureHex(bytes){return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
export function createAccountClient({endpoint,storage=localStorage,fetcher=fetch,randomHex=secureHex,now=()=>Date.now()}){
 let generation=0;
 const session=()=>storage.getItem(SESSION);
 function pending(){try{const p=JSON.parse(storage.getItem(LOGIN)||'null');if(p&&/^\d{8}$/.test(p.code)&&/^[a-f0-9]{32}$/i.test(p.clientId)&&/^[a-z0-9]{40,}$/i.test(p.secret)&&Number.isFinite(p.expires)&&p.expires>now())return p;}catch{}storage.removeItem(LOGIN);return null;}
 async function request(op,data={},authenticated=false){const token=session();if(authenticated&&!token)throw Error('请先登录账户');const response=await fetcher(endpoint+'?op=account-web-'+op,{method:'POST',headers:{'content-type':'application/json',...(authenticated?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});const result=await response.json();if(!response.ok){if(authenticated&&response.status===401){storage.removeItem(SESSION);storage.removeItem(ACCOUNT);}throw Error(result.error||'账户服务暂时不可用，请稍后重试');}return result;}
 return{session,pending,
 async start(){const previous=pending();if(previous)return previous;const current=generation,clientId=randomHex(16),secret=randomHex(24);const r=await request('start',{clientId,secret});if(current!==generation)throw Error('已取消本次登录');if(!/^\d{8}$/.test(r.code)||!Number.isFinite(r.expires)||r.expires<=now())throw Error('登录码未创建，请重新尝试');const p={clientId,secret,code:r.code,expires:r.expires};storage.setItem(LOGIN,JSON.stringify(p));return p;},
 async poll(){const current=generation,p=pending();if(!p)throw Error('登录码已过期，请重新获取');const r=await request('poll',{code:p.code,secret:p.secret});if(current!==generation)throw Error('已取消本次登录');if(r.status==='confirmed'){if(typeof r.session!=='string'||!r.session)throw Error('登录未完成，请重新获取登录码');storage.setItem(SESSION,r.session);storage.removeItem(LOGIN);}return r;},
 async me(){const current=generation,r=await request('me',{},true);if(current!==generation||!session())throw Error('已退出登录');if(typeof r.account?.id!=='string'||!r.account.id)throw Error('账户信息未就绪，请重试');storage.setItem(ACCOUNT,r.account.id);return r;},orders:()=>request('orders',{},true),
 async logout(){generation++;try{if(session())await request('logout',{},true);}finally{storage.removeItem(SESSION);storage.removeItem(ACCOUNT);storage.removeItem(LOGIN);}},
 cancel(){generation++;storage.removeItem(LOGIN);}
 };
}
