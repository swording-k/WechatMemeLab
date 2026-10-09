const ids=new Set(['pinch','pull','knead','bulge','twist','squish','glass','suction','melt','leak','notify','crack','screen','soul']);
const bound=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
export function encodeRecipe(s) {
  return new URLSearchParams({t:s.template,c:s.caption.slice(0,20),i:String(s.intensity),s:String(s.speed),tx:String(s.captionX??50),ty:String(s.captionY??96),fs:String(s.captionSize??35),color:s.captionColor??'#ffffff',style:s.captionStyle??'meme'}).toString();
}
export function decodeRecipe(hash) {
  const p=new URLSearchParams(hash.replace(/^#/,''));const template=p.get('t');if(!ids.has(template))return null;
  return {template,caption:(p.get('c')||'').slice(0,20),intensity:bound(p.get('i')??.75,.25,1,.75),speed:bound(p.get('s')??1,.5,2,1),captionX:bound(p.get('tx')??50,0,100,50),captionY:bound(p.get('ty')??96,0,100,96),captionSize:bound(p.get('fs')??35,16,56,35),captionColor:/^#[0-9a-f]{6}$/i.test(p.get('color')||'')?p.get('color'):'#ffffff',captionStyle:['meme','plain','band','shake'].includes(p.get('style'))?p.get('style'):'meme'};
}
