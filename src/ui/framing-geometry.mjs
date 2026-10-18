import {photoPlacement} from '../photo/geometry.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function transformPhoto(w,h,before,anchor,scale,dx=0,dy=0){
 const zoom=clamp(before.zoom*scale,.05,16),p=photoPlacement(w,h,before),q=photoPlacement(w,h,{zoom,x:0,y:0});
 return {zoom,x:clamp((anchor.x+dx-(anchor.x-p.left)/p.width*q.width-q.left)/q.travelX*100,-200,200),y:clamp((anchor.y+dy-(anchor.y-p.top)/p.height*q.height-q.top)/q.travelY*100,-200,200)};
}
export function moveCrop(w,h,before,dx,dy){return {...before,x:clamp(before.x+dx,0,w-before.size),y:clamp(before.y+dy,0,h-before.size)};}
export function resizeCrop(w,h,before,corner,point){
 const west=corner.includes('w'),north=corner.includes('n'),ax=before.x+(west?before.size:0),ay=before.y+(north?before.size:0);
 const maximum=Math.min(west?ax:w-ax,north?ay:h-ay),minimum=Math.min(Math.min(w,h)/16,maximum);
 const size=clamp(Math.max((point.x-ax)*(west?-1:1),(point.y-ay)*(north?-1:1)),minimum,maximum);
 return {x:west?ax-size:ax,y:north?ay-size:ay,size};
}
