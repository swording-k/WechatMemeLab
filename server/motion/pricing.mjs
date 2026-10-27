// Beijing list prices checked on 2026-10-27. Fen are integers; these are not payments.
// https://help.aliyun.com/zh/model-studio/model-pricing
export const PRICE_VERSION='2026-10-27';
export function quote(mode,duration=2){
 if(mode==='draw'||mode==='edit')return{costFen:20,priceFen:50};
 if(mode==='describe')return{costFen:30,priceFen:80};
 if(mode==='imitate'){
  if(!Number.isFinite(duration)||duration<2||duration>6.05)throw Error('参考动作时长需为2～6秒');
  const seconds=Math.ceil(duration);return{costFen:seconds*40,priceFen:seconds*80};
 }
 throw Error('请选择制作方式');
}
export function catalog(){return{version:PRICE_VERSION,currency:'CNY',paymentsEnabled:false,items:[
 {mode:'draw',name:'一句话生图',...quote('draw'),unit:'张'},
 {mode:'edit',name:'AI改图',...quote('edit'),unit:'张'},
 {mode:'describe',name:'2秒动作',...quote('describe'),unit:'次'},
 {mode:'imitate',name:'参考动作',costFen:40,priceFen:80,unit:'秒（向上取整）'}
]};}
