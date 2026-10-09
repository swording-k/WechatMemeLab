import type {RenderAssets} from './types';
let pending:Promise<RenderAssets>|undefined;
export function loadAssets():Promise<RenderAssets> {
  return pending??=(async()=>{const hand=new Image();hand.src=`${import.meta.env.BASE_URL}pinch-hand.png`;await hand.decode();return {hand};})().catch(error=>{pending=undefined;throw error;});
}
