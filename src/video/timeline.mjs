/** @param {number} start @param {number} end @param {number} speed @param {string} mode */
export function timeline(start,end,speed,mode) {
 if(![start,end,speed].every(Number.isFinite)||start<0||end<=start||end-start>6.001||speed<.5||speed>2||!['forward','reverse','bounce'].includes(mode))throw new Error('请选择 0–6 秒片段和有效速度');
 const count=Math.max(2,Math.ceil((end-start)*10));
 let times=Array.from({length:count},(_,i)=>start+(end-start)*i/count);
 if(mode==='reverse')times.reverse();
 if(mode==='bounce')times=times.concat(times.slice(1,-1).reverse());
 return {times,delay:Math.max(10,Math.round((end-start)*1000/count/speed/10)*10)};
}
