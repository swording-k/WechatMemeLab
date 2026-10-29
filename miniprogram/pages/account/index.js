const api=require('../../lib/account-api');
function freshCode(){return new Promise((resolve,reject)=>wx.login({success:r=>r.code?resolve(r.code):reject(Error('微信登录未完成，请重试')),fail:()=>reject(Error('微信登录未完成，请重试'))}));}
function paymentClient(){
 try{const legacy=typeof wx.getSystemInfoSync==='function'&&(!wx.getAppBaseInfo||!wx.getDeviceInfo)?wx.getSystemInfoSync():{};const app=wx.getAppBaseInfo?wx.getAppBaseInfo():legacy;const device=wx.getDeviceInfo?wx.getDeviceInfo():legacy;return{platform:device.platform||'',version:app.version||''};}catch{return{platform:'',version:''};}
}
function unsupportedIos(client){
 if(client.platform!=='ios'||!/^\d+\.\d+\.\d+/.test(client.version))return false;
 const actual=client.version.split('.').map(Number),minimum=[8,0,68];for(let i=0;i<3;i++){if(actual[i]>minimum[i])return false;if(actual[i]<minimum[i])return true;}return false;
}
function orderView(order){const states={credited:'已到账',closed:'已关闭',pending:'等待确认到账',created:'等待支付',paid:'已到账',success:'已到账',failed:'支付未完成',cancelled:'已取消',refunded:'已退款'};return{...order,statusText:states[order.status]||'待查询',canQuery:!!order.deliveryPending||!['credited','closed','paid','success','refunded'].includes(order.status)};}
Page({
 data:{loading:false,busy:false,error:'',queryError:'',notice:'',account:null,wallet:{available:0},free:true,developer:false,payments:{enabled:false,products:[]},orders:[],loginCode:'',lastOrder:null,amount:'1',amountPresets:[1,5,10,20,50],topupPoints:100},
 onLoad(options={}){if(/^\d{8}$/.test(options.code||''))this.setData({loginCode:options.code});},
 async onShow(){await this.refresh();},
 async refresh(){if(this.data.loading)return;this.setData({loading:true,error:''});try{const info=await api.request('me');this.setData({account:info.account,wallet:info.wallet,free:info.free,developer:info.developer===true,payments:{enabled:!!info.payments?.enabled,products:(info.payments?.products||[]).map(p=>({...p,priceText:(p.priceFen/100).toFixed(2)}))}});await this.loadOrders();}catch(e){this.setData({error:e.message});}finally{this.setData({loading:false});}},
 async loadOrders(){const r=await api.request('orders');this.setData({orders:(r.orders||[]).map(orderView)});},
 codeInput(e){this.setData({loginCode:e.detail.value.replace(/\D/g,'').slice(0,8),notice:'',error:''});},
 async confirmLogin(){if(this.data.busy)return;if(!/^\d{8}$/.test(this.data.loginCode)){this.setData({error:'请输入网页上显示的 8 位登录码'});return;}
 const r=await wx.showModal({title:'确认网页登录',content:'仅确认你正在使用的怪相馆网页上显示的登录码。确认后，该网页将登录你的账户。',confirmText:'确认登录',cancelText:'取消'});if(!r.confirm)return;
 this.setData({busy:true,error:'',queryError:'',notice:''});try{await api.request('confirm-login',{code:this.data.loginCode});this.setData({loginCode:'',notice:'已确认，请回到原网页继续使用'});}catch(e){this.setData({error:e.message});}finally{this.setData({busy:false});}},
 amountInput(e){const value=e.detail.value;this.setData({amount:value,topupPoints:/^[0-9]+$/.test(value)?Number(value)*100:0});},
 selectAmount(e){const value=String(e.currentTarget.dataset.amount);this.setData({amount:value,topupPoints:Number(value)*100});},
 async purchase(e){if(this.data.busy||!this.data.payments.enabled)return;const product=this.data.payments.products.find(p=>p.id===e.currentTarget.dataset.id);if(!product)return;const amount=Number(this.data.amount),quantity=amount*100/product.priceFen;if(!/^\d+$/.test(this.data.amount)||!Number.isSafeInteger(amount)||amount<1||amount>500||!Number.isSafeInteger(quantity)||quantity<1){this.setData({error:'请输入1至500元的整数金额'});return;}
 const client=paymentClient();if(unsupportedIos(client)){this.setData({error:'当前微信版本 '+client.version+'，iPhone 充值需要微信 8.0.68 或以上，请更新微信后重试。'});return;}
 this.setData({busy:true,error:'',queryError:'',notice:''});let orderId,cashierCode;
 try{if(typeof wx.requestVirtualPayment!=='function')throw Error('当前微信版本不支持充值，请更新微信后重试');const r=await api.request('pay-prepare',{productId:product.id,quantity,code:await freshCode()});orderId=r.id;await new Promise((resolve,reject)=>wx.requestVirtualPayment({...r.payment,success:resolve,fail:reject}));}
 catch(e){cashierCode=e.errCode;if(orderId)try{await api.request('pay-error',{id:orderId,errorCode:e.errCode,errorMessage:e.errMsg||e.message});}catch{}this.setData({notice:/cancel/i.test(e.errMsg||e.message||'')?'已取消支付，将查询订单状态':'',error:/cancel/i.test(e.errMsg||e.message||'')?'':((e.errCode!==undefined?'微信支付错误 '+e.errCode+'：':'')+(e.errMsg||e.message||'支付未完成，请查询订单状态'))});}
 finally{if(orderId){try{if(cashierCode!==-15001)await this.query(orderId);}catch(e){this.setData(this.data.error?{queryError:e.message}:{error:e.message});}try{await this.loadOrders();}catch(e){this.setData(this.data.error?{queryError:e.message}:{error:e.message});}}this.setData({busy:false});}},
 async query(id){const r=await api.request('pay-query',{id,code:await freshCode()});const order=orderView(r.order);this.setData({lastOrder:order,wallet:r.wallet,notice:['credited','paid','success'].includes(order.status)?'充值成功，点数已到账':order.status==='closed'?'订单已关闭':'订单尚未确认到账，可稍后重新查询'});return r;},
 async queryOrder(e){if(this.data.busy)return;this.setData({busy:true,error:''});try{await this.query(e.currentTarget.dataset.id);await this.loadOrders();}catch(error){this.setData({error:error.message});}finally{this.setData({busy:false});}}
});
