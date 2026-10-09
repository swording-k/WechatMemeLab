const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
/** @param {string} template @param {number} phase @param {number} intensity */
export function getAction(template,phase,intensity) {
  const p=(phase%1+1)%1;
  if(template==='cat'||template==='dog') {
    const contact=p<.18?ease(p/.18):p<.82?1:1-ease((p-.82)/.18);
    const envelope=p<.18?0:p<.38?ease((p-.18)/.2):p<.68?1:p<.94?1-ease((p-.68)/.26):0;
    const pulses=template==='cat'?.78+.22*Math.sin(p*Math.PI*10)**2:.7+.3*Math.sin(p*Math.PI*6)**2;
    const amount=envelope*pulses*intensity;
    return {amount,pressure:amount,contact};
  }
  if(['notify','crack','screen'].includes(template)) {
    const envelope=p<.12?0:p<.4?ease((p-.12)/.28):p<.68?1:p<.92?1-ease((p-.68)/.24):0;
    const amount=template==='notify'?Math.sin(p*Math.PI*18)*envelope:envelope;
    return {amount:amount*intensity||0,pressure:envelope*intensity,contact:envelope};
  }
  if(['suction','melt','leak'].includes(template)) {
    const envelope=(rise,hold,end)=>p<.12?0:p<rise?ease((p-.12)/(rise-.12)):p<hold?1:p<end?1-ease((p-hold)/(end-hold)):0;
    const contact=envelope(.26,.75,.94);
    let amount=envelope(template==='melt'?.68:.43,template==='melt'?.76:.57,.92);
    if(template==='leak') amount=p<.12?0:p<.35?ease((p-.12)/.23):p<.44?1:p<.55?1-1.85*ease((p-.44)/.11):p<.72?-.85:p<.92?-.85*(1-ease((p-.72)/.2)):0;
    return {amount:amount*intensity,pressure:Math.max(0,amount)*intensity,contact};
  }
  const contact=p<.18 ? ease(p/.18) : p<.84 ? 1 : 1-ease((p-.84)/.16);
  const pressure=p<.18 ? 0 : p<.43 ? ease((p-.18)/.25) : p<.62 ? 1 : 1-ease((p-.62)/.22);
  const amount=template==='twist' ? Math.sin(p*Math.PI*2)*intensity : template==='knead' ? pressure*Math.sin(p*Math.PI*6)*intensity : pressure*intensity;
  return {amount,pressure:pressure*intensity,contact};
}
