import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeGif} from '../src/export/encode.mjs';
test('rectangular GIF retains height and bottom-right pixel patch',()=>{
 const a=new Uint8Array(12*20*4);for(let i=3;i<a.length;i+=4)a[i]=255;
 const b=a.slice();b.set([255,0,0,255],(19*12+11)*4);
 const gif=encodeGif([a,b],12,100,()=>{},20);
 assert.equal(gif[6]|gif[7]<<8,12);assert.equal(gif[8]|gif[9]<<8,20);
 assert.throws(()=>encodeGif([a],12,100,()=>{},0));
 let cursor=13+3*(1<<((gif[10]&7)+1));const patches=[];
 while(cursor<gif.length){const block=gif[cursor++];if(block===0x3b)break;
 if(block===0x21){cursor++;while(gif[cursor])cursor+=gif[cursor]+1;cursor++;continue;}
 assert.equal(block,0x2c);const read=i=>gif[cursor+i]|gif[cursor+i+1]<<8;
 patches.push([read(0),read(2),read(4),read(6)]);const flags=gif[cursor+8];cursor+=9;
 if(flags&0x80)cursor+=3*(1<<((flags&7)+1));cursor++;while(gif[cursor])cursor+=gif[cursor]+1;cursor++;
 }
 assert.deepEqual(patches,[[0,0,12,20],[11,19,1,1]]);
});
test('sampling keeps forward, reverse and ping-pong inside selected interval',async()=>{
 const {timeline}=await import('../src/video/timeline.mjs');
 for(const mode of ['forward','reverse','bounce']) {
 const plan=timeline(2,5,1,mode);
 assert.ok(plan.times.every(t=>t>=2&&t<5));assert.equal(plan.times.length,mode==='bounce'?58:30);
 if(mode==='reverse')assert.ok(plan.times[0]>plan.times.at(-1));
 if(mode==='bounce')assert.equal(plan.times[1],plan.times.at(-1));
 }
 assert.throws(()=>timeline(0,7,1,'forward'));
 assert.throws(()=>timeline(0,2,0,'forward'));
});
