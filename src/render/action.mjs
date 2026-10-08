const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
/** @param {string} template @param {number} phase @param {number} intensity */
export function getAction(template,phase,intensity) {
  const p=(phase%1+1)%1;
  const contact=p<.18 ? ease(p/.18) : p<.84 ? 1 : 1-ease((p-.84)/.16);
  const pressure=p<.18 ? 0 : p<.43 ? ease((p-.18)/.25) : p<.62 ? 1 : 1-ease((p-.62)/.22);
  const amount=template==='twist' ? Math.sin(p*Math.PI*2)*intensity : template==='knead' ? pressure*Math.sin(p*Math.PI*6)*intensity : pressure*intensity;
  return {amount,pressure:pressure*intensity,contact};
}
