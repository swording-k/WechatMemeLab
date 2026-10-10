/** Inverse pixel mapping: preserve the outside of the lens, deform its contents.
 * @param {string} mode @param {number} x @param {number} y @param {number[]} center @param {number} amount @param {number} radius
 */
export function mapPixel(mode,x,y,center,amount,radius=.43) {
  const dx=x-center[0],dy=y-center[1];
  const r2=(dx*dx+dy*dy)/(radius*radius);
  if(r2>=1 || amount===0) return [x,y];
  const weight=(1-r2)**2;
  if(mode==='clockout') return [x+dx*.2*amount*weight,y-amount*radius*.32*weight];
  if(mode==='cat') return [center[0]+dx*(1-.34*amount*weight),center[1]+dy*(1+.75*amount*weight)+amount*radius*.05*weight];
  if(mode==='dog') return [center[0]+dx*(1-.76*amount*weight),center[1]+dy*(1-.70*amount*weight)];
  if(mode==='notify') return [x-amount*radius*.23*weight,y+amount*radius*.13*weight];
  if(mode==='crack') return [x+amount*radius*.22*Math.sin(dy/radius*4)*weight,y-amount*radius*.12*weight*(dx>0?1:-1)];
  if(mode==='screen') {const scale=1-.86*amount*weight;return [center[0]+dx*scale,center[1]+dy*scale];}
  if(mode==='suction') return [x-amount*radius*.52*weight,y+amount*radius*.42*weight];
  if(mode==='melt') {
    const lower=Math.max(0,Math.min(1,(dy/radius+.35)*1.5));
    return [x+Math.sin(dy/radius*8)*radius*.05*amount*weight,y-amount*radius*.62*weight*lower];
  }
  if(mode==='leak') return [center[0]+dx*(1-.55*amount*weight),center[1]+dy*(1-.4*amount*weight)];
  if(mode==='bulge') {
    const scale=1-.88*amount*weight;
    return [center[0]+dx*scale,center[1]+dy*scale];
  }
  if(mode==='pinch') return [center[0]+dx*(1+.85*amount*weight),y];
  if(mode==='pull') return [center[0]+dx*(1-.65*amount*weight),y];
  if(mode==='squish') return [center[0]+dx*(1-.25*amount*weight),center[1]+dy*(1+.9*amount*weight)];
  if(mode==='knead') return [x+amount*radius*.23*Math.sin(dy/radius*Math.PI*2)*weight,y+amount*radius*.10*Math.sin(dx/radius*Math.PI*2)*weight];
  const angle=amount*2.7*weight;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const u=dx/(1+.6*Math.abs(amount)*weight),v=dy*(1+.4*Math.abs(amount)*weight);
  return [center[0]+u*cos-v*sin,center[1]+u*sin+v*cos];
}
