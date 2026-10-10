const ease=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** Calm hold, departure, a suspended beat, disappearance, then body recovery.
 * @param {number} phase @param {number} intensity */
export function soulMotion(phase,intensity){
 const p=(phase%1+1)%1,i=Math.max(0,Math.min(1,intensity));
 const rise=ease((p-.18)/.48);
 const opacity=ease((p-.18)/.12)*(1-ease((p-.72)/.18))*i;
 const sag=ease((p-.18)/.2)*(1-ease((p-.83)/.12))*i;
 return {rise,opacity,sag};
}
