/** @param {{focusX:number,focusY:number,radius:number,petX?:number,petY?:number,petScale?:number,petRotation?:number,petFace?:{angle:number}}} s */
export function petPlacement(s){
 return {x:(s.focusX+(s.petX??0)/100)*320,y:(s.focusY+(s.petY??0)/100)*320,radius:s.radius*320*(s.petScale??1),angle:s.petRotation===undefined?(s.petFace?.angle??0):s.petRotation*Math.PI/180};
}
