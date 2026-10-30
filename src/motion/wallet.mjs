// Quotes are display estimates from the server catalog; the server still checks every debit.
export function quotedPoints(pricing,mode,duration=2){const unit=pricing?.items?.find(x=>x.mode===mode)?.priceFen;if(!Number.isSafeInteger(unit)||unit<0)return null;if(mode!=='imitate')return unit;if(!Number.isFinite(duration)||duration<2||duration>6.05)return null;return unit*Math.ceil(duration);}
export function needsRecharge({billing,available,points}){return billing===true&&Number.isSafeInteger(available)&&Number.isSafeInteger(points)&&available<points;}
