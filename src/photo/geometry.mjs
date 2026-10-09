const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
/** @param {number} iw @param {number} ih @param {{zoom:number,x:number,y:number}} s */
export function photoPlacement(iw,ih,s) {
  const scale=Math.max(1/iw,1/ih)*s.zoom,width=iw*scale,height=ih*scale;
  const travelX=Math.max(.5,(width-1)/2),travelY=Math.max(.5,(height-1)/2);
  return {width,height,left:(1-width)/2+s.x/100*travelX,top:(1-height)/2+s.y/100*travelY,travelX,travelY};
}
/** @param {number} iw @param {number} ih @param {{x:number,y:number}} point @param {{zoom:number,x:number,y:number}} s */
export function sourceToFrame(iw,ih,point,s) {
  const p=photoPlacement(iw,ih,s);
  return {x:p.left+point.x*p.width,y:p.top+point.y*p.height};
}
/** @param {number} iw @param {number} ih */
export function fitPhoto(iw,ih){return {zoom:Math.min(iw,ih)/Math.max(iw,ih),x:0,y:0};}
/** @param {number} iw @param {number} ih @param {{x:number,y:number,size:number}} rect */
export function cropToSettings(iw,ih,rect){
 const zoom=1/(rect.size*Math.max(1/iw,1/ih)),p=photoPlacement(iw,ih,{zoom,x:0,y:0});
 return {zoom,x:(-rect.x/iw*p.width-p.left)/p.travelX*100,y:(-rect.y/ih*p.height-p.top)/p.travelY*100};
}
/** @param {number} iw @param {number} ih @param {{zoom:number,x:number,y:number,focusX:number,focusY:number,radius:number}} before @param {{zoom:number,x:number,y:number}} after */
export function reframeFocus(iw,ih,before,after){
 const p=photoPlacement(iw,ih,before),q=photoPlacement(iw,ih,after);
 return {focusX:q.left+(before.focusX-p.left)/p.width*q.width,focusY:q.top+(before.focusY-p.top)/p.height*q.height,radius:before.radius*after.zoom/before.zoom};
}
/** @param {number} iw @param {number} ih @param {{x:number,y:number,width:number,height:number,keypoints?:{x:number,y:number}[]}} face @param {{zoom:number,x:number,y:number}} [placement] */
export function faceToSettings(iw,ih,face,placement) {
  const base=Math.max(1/iw,1/ih);
  const zoom=placement?.zoom??clamp(.58/Math.max(face.width*iw*base,face.height*ih*base),1,4);
  const w=iw*base*zoom,h=ih*base*zoom;
  const point={x:face.x+face.width/2,y:face.y+face.height/2};
  const x=placement?.x??clamp((.5-((1-w)/2+point.x*w))/Math.max(.5,(w-1)/2)*100,-200,200);
  const y=placement?.y??clamp((.48-((1-h)/2+point.y*h))/Math.max(.5,(h-1)/2)*100,-200,200);
  const focus=sourceToFrame(iw,ih,point,{zoom,x,y});
  const radius=clamp(Math.max(face.width*w,face.height*h)*.64,.03,.45);
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
