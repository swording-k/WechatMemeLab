const ids=new Set(['pinch','pull','knead','bulge','twist','squish']);
const bound=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
export function encodeRecipe(s) {
  return new URLSearchParams({t:s.template,c:s.caption.slice(0,20),i:String(s.intensity),s:String(s.speed)}).toString();
}
export function decodeRecipe(hash) {
  const p=new URLSearchParams(hash.replace(/^#/,''));const template=p.get('t');if(!ids.has(template))return null;
  return {template,caption:(p.get('c')||'').slice(0,20),intensity:bound(p.get('i')??.75,.25,1,.75),speed:bound(p.get('s')??1,.5,2,1)};
}
