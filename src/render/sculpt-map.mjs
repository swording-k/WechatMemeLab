/** @param {number} x @param {number} y @param {{kind:string,x:number,y:number,dx:number,dy:number,radius:number}[]} steps @param {number} amount */
export function mapSculpt(x,y,steps,amount){
 if(!amount)return [x,y];let u=x,v=y;
 // Inverse composition walks the operations backward, preserving the user's order.
 for(let i=steps.length-1;i>=0;i--){
  const s=steps[i],cx=s.x+(s.kind==='drag'?s.dx*amount:0),cy=s.y+(s.kind==='drag'?s.dy*amount:0),dx=u-cx,dy=v-cy,r2=(dx*dx+dy*dy)/(s.radius*s.radius);
  if(r2>=1)continue;const weight=(1-r2)**2;
  if(s.kind==='drag'){u-=s.dx*amount*weight;v-=s.dy*amount*weight;}
  else {const scale=1+(s.kind==='expand'?-.65:.9)*amount*weight;u=s.x+dx*scale;v=s.y+dy*scale;}
 }
 return [u,v];
}
