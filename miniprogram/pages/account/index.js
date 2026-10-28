const api=require('../../lib/account-api');
function freshCode(){return new Promise((resolve,reject)=>wx.login({success:r=>r.code?resolve(r.code):reject(Error('微信登录未完成，请重试')),fail:()=>reject(Error('微信登录未完成，请重试'))}));}
function orderView(order){const states={credited:'已到账',closed:'已关闭',pending:'等待确认到账',created:'等待支付',paid:'已到账',success:'已到账',failed:'支付未完成',cancelled:'已取消',refunded:'已退款'};return{...order,statusText:states[order.status]||'待查询',canQuery:!!order.deliveryPending||!['credited','closed','paid','success','refunded'].includes(order.status)};}
Page({
 data:{loading:false,busy:false,error:'',notice:'',account:null,wallet:{available:0},free:true,developer:false,payments:{enabled:false,products:[]},orders:[],loginCode:'',lastOrder:null},
 onLoad(options={}){if(/^\d{8}$/.test(options.code||''))this.setData({loginCode:options.code});},
 async onShow(){await this.refresh();},
 async refresh(){if(this.data.loading)return;this.setData({loading:true,error:''});try{const info=await api.request('me');this.setData({account:info.account,wallet:info.wallet,free:info.free,developer:info.developer===true,payments:{enabled:!!info.payments?.enabled,products:(info.payments?.products||[]).map(p=>({...p,priceText:(p.priceFen/100).toFixed(2)}))}});await this.loadOrders();}catch(e){this.setData({error:e.message});}finally{this.setData({loading:false});}},
 async loadOrders(){const r=await api.request('orders');this.setData({orders:(r.orders||[]).map(orderView)});},
 codeInput(e){this.setData({loginCode:e.detail.value.replace(/\D/g,'').slice(0,8),notice:'',error:''});},
 async confirmLogin(){if(this.data.busy)return;if(!/^\d{8}$/.test(this.data.loginCode)){this.setData({error:'请输入网页上显示的 8 位登录码'});return;}
 const r=await wx.showModal({title:'确认网页登录',content:'仅确认你正在使用的怪相馆网页上显示的登录码。确认后，该网页将登录你的账户。',confirmText:'确认登录',cancelText:'取消'});if(!r.confirm)return;
 this.setData({busy:true,error:'',notice:''});try{await api.request('confirm-login',{code:this.data.loginCode});this.setData({loginCode:'',notice:'已确认，请回到原网页继续使用'});}catch(e){this.setData({error:e.message});}finally{this.setData({busy:false});}},
 async purchase(e){if(this.data.busy||!this.data.payments.enabled)return;const product=this.data.payments.products.find(p=>p.id===e.currentTarget.dataset.id);if(!product)return;
 this.setData({busy:true,error:'',notice:''});let orderId;
 try{if(typeof wx.requestVirtualPayment!=='function')throw Error('当前微信版本不支持充值，请更新微信后重试');const r=await api.request('pay-prepare',{productId:product.id,code:await freshCode()});orderId=r.id;await new Promise((resolve,reject)=>wx.requestVirtualPayment({...r.payment,success:resolve,fail:reject}));}
 catch(e){this.setData({notice:/cancel/i.test(e.errMsg||e.message||'')?'已取消支付，将查询订单状态':'',error:/cancel/i.test(e.errMsg||e.message||'')?'':(e.message||e.errMsg||'支付未完成，请查询订单状态')});}
 finally{if(orderId){try{await this.query(orderId);}catch(e){this.setData({error:e.message});}try{await this.loadOrders();}catch(e){this.setData({error:e.message});}}this.setData({busy:false});}},
 async query(id){const r=await api.request('pay-query',{id,code:await freshCode()});const order=orderView(r.order);this.setData({lastOrder:order,wallet:r.wallet,notice:['credited','paid','success'].includes(order.status)?'充值成功，点数已到账':order.status==='closed'?'订单已关闭':'订单尚未确认到账，可稍后重新查询'});return r;},
 async queryOrder(e){if(this.data.busy)return;this.setData({busy:true,error:''});try{await this.query(e.currentTarget.dataset.id);await this.loadOrders();}catch(error){this.setData({error:error.message});}finally{this.setData({busy:false});}}
});
