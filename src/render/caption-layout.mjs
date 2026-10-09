/** @param {number} textWidth @param {number} fontSize @param {number} x @param {number} y */
export function captionBox(textWidth,fontSize,x,y){
 const width=Math.max(0,Math.min(296,textWidth)),height=Math.max(12,Math.min(56,fontSize));
 const clamp=v=>Math.max(0,Math.min(100,v));
 return {width,height,x:12+width/2+(296-width)*clamp(x)/100,y:12+height/2+(296-height)*clamp(y)/100};
}
