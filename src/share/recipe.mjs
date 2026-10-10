const ids=new Set(['pinch','pull','knead','bulge','twist','squish','cat','dog','suction','melt','leak','notify','crack','screen']);
const bound=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
export function encodeRecipe(s) {
  const p=new URLSearchParams({t:s.template,c:s.caption.slice(0,20),i:String(s.intensity),s:String(s.speed),tx:String(s.captionX??50),ty:String(s.captionY??96),fs:String(s.captionSize??35),color:s.captionColor??'#ffffff',style:s.captionStyle??'meme',tr:String(s.captionRotation??0),ts:String(s.captionScale??1)});
  if(s.captionCenterX!==undefined)p.set('cx',String(s.captionCenterX));if(s.captionCenterY!==undefined)p.set('cy',String(s.captionCenterY));return p.toString();
}
export function decodeRecipe(hash) {
  const p=new URLSearchParams(hash.replace(/^#/,''));const template=p.get('t');if(!ids.has(template))return null;
  return {template,caption:(p.get('c')||'').slice(0,20),intensity:bound(p.get('i')??.75,.25,1,.75),speed:bound(p.get('s')??1,.5,2,1),captionX:bound(p.get('tx')??50,0,100,50),captionY:bound(p.get('ty')??96,0,100,96),captionSize:bound(p.get('fs')??35,16,56,35),captionRotation:bound(p.get('tr')??0,-180,180,0),captionScale:bound(p.get('ts')??1,.3,2.5,1),...(p.has('cx')?{captionCenterX:bound(p.get('cx'),16,304,160)}:{}),...(p.has('cy')?{captionCenterY:bound(p.get('cy'),16,304,160)}:{}),captionColor:/^#[0-9a-f]{6}$/i.test(p.get('color')||'')?p.get('color'):'#ffffff',captionStyle:['meme','plain','band','shake'].includes(p.get('style'))?p.get('style'):'meme'};
}
