const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
/** @param {number} iw @param {number} ih @param {{x:number,y:number}} point @param {{zoom:number,x:number,y:number}} s */
export function sourceToFrame(iw,ih,point,s) {
  const scale=Math.max(1/iw,1/ih)*s.zoom,w=iw*scale,h=ih*scale;
  return {x:(1-w)/2+s.x/100*(w-1)/2+point.x*w,y:(1-h)/2+s.y/100*(h-1)/2+point.y*h};
}
/** @param {number} iw @param {number} ih @param {{x:number,y:number,width:number,height:number,keypoints?:{x:number,y:number}[]}} face */
export function faceToSettings(iw,ih,face) {
  const base=Math.max(1/iw,1/ih);
  const zoom=clamp(.58/Math.max(face.width*iw*base,face.height*ih*base),1,4);
  const w=iw*base*zoom,h=ih*base*zoom;
  const point={x:face.x+face.width/2,y:face.y+face.height/2};
  const x=w>1 ? clamp((.5-((1-w)/2+point.x*w))/((w-1)/2)*100,-100,100) : 0;
  const y=h>1 ? clamp((.48-((1-h)/2+point.y*h))/((h-1)/2)*100,-100,100) : 0;
  const focus=sourceToFrame(iw,ih,point,{zoom,x,y});
  const radius=clamp(Math.max(face.width*w,face.height*h)*.64,.13,.45);
  let petFace;
  if(face.keypoints?.length>=3){
    const [left,right]=face.keypoints.slice(0,2).sort((a,b)=>a.x-b.x).map(p=>sourceToFrame(iw,ih,p,{zoom,x,y}));
    const nose=sourceToFrame(iw,ih,face.keypoints[2],{zoom,x,y});
    const angle=clamp(Math.atan2(right.y-left.y,right.x-left.x),-.55,.55),dx=(nose.x-focus.x)/radius,dy=(nose.y-focus.y)/radius;
    petFace={dx:dx*Math.cos(angle)+dy*Math.sin(angle),dy:-dx*Math.sin(angle)+dy*Math.cos(angle),angle};
    if(!Object.values(petFace).every(Number.isFinite))petFace=undefined;
  }
  return {zoom,x,y,focusX:clamp(focus.x,.03,.97),focusY:clamp(focus.y,.03,.97),radius,petFace};
}
