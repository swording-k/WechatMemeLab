/** Hit test a rotated rectangle in the shared 320px rendering coordinates. */
export function hitLayer(p,b){
 const a=-b.angle*Math.PI/180,dx=p.x-b.x,dy=p.y-b.y;
 return Math.abs(dx*Math.cos(a)-dy*Math.sin(a))<=b.width/2+7&&Math.abs(dx*Math.sin(a)+dy*Math.cos(a))<=b.height/2+7;
}
/** @param {{x:number,y:number}[]} before @param {{x:number,y:number}[]} after */
export function gestureDelta(before,after){
 const center=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
 const angle=p=>Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x),distance=p=>Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);
 const b=center(before),a=center(after),r=angle(after)-angle(before);
 return {dx:a.x-b.x,dy:a.y-b.y,scale:distance(after)/Math.max(1,distance(before)),angle:Math.atan2(Math.sin(r),Math.cos(r))*180/Math.PI};
}
