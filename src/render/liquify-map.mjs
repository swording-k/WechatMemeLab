/** Inverse pixel mapping: preserve the outside of the lens, deform its contents.
 * @param {string} mode @param {number} x @param {number} y @param {number[]} center @param {number} amount
 */
export function mapPixel(mode,x,y,center,amount) {
  const dx=x-center[0],dy=y-center[1];
  const r2=(dx*dx+dy*dy)/(.43*.43);
  if(r2>=1 || amount===0) return [x,y];
  const weight=(1-r2)**2;
  if(mode==='bulge') {
    const scale=1-.88*amount*weight;
    return [center[0]+dx*scale,center[1]+dy*scale];
  }
  const angle=amount*2.7*weight;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const u=dx/(1+.6*Math.abs(amount)*weight),v=dy*(1+.4*Math.abs(amount)*weight);
  return [center[0]+u*cos-v*sin,center[1]+u*sin+v*cos];
}
