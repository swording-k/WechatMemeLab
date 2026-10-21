import test from 'node:test';import assert from 'node:assert/strict';import{createRequire}from'node:module';const require=createRequire(import.meta.url);
const lib=()=>require('../miniprogram/lib/video-edit');
test('trim handles stay in the source and cap a selected segment at six seconds',()=>{
 const {trimRange}=lib();assert.deepEqual(trimRange(20,0,3,'start',19),{start:19,end:20});assert.deepEqual(trimRange(20,0,3,'end',15),{start:9,end:15});assert.deepEqual(trimRange(2.5,0,2.5,'start',2.5),{start:2.4,end:2.5});
});
test('free crop can move to a noncentral area and resize without leaving video bounds',()=>{
 const {dragCrop,normalizeCrop}=lib();const r={x:.2,y:.2,w:.4,h:.5};assert.deepEqual(dragCrop(r,'move',.8,-.9),{x:.6,y:0,w:.4,h:.5});
 const q=dragCrop(r,'nw',-.8,.1);assert.equal(q.x,0);assert.ok(Math.abs(q.y-.3)<1e-9);assert.ok(Math.abs(q.w-.6)<1e-9);assert.ok(q.h>=.04);
 assert.deepEqual(normalizeCrop({x:NaN,y:-1,w:2,h:0}),{x:0,y:0,w:1,h:.04});
});
test('preview and export renderer uses the exact selected source rectangle and subtitle position',()=>{
 const {renderVideo}=lib(),calls=[];const c={canvas:{width:240,height:120},drawImage(...a){calls.push(a)},fillRect(){},strokeText(...a){calls.push(['text',...a])},fillText(){}};
 renderVideo(c,{width:1000,height:500},{crop:{x:.5,y:.2,w:.4,h:.4},caption:'hi',font:.12,tx:.3,ty:.8});
 assert.deepEqual(calls[0].slice(1),[500,100,400,200,0,0,240,120]);assert.equal(calls[1][2],72);assert.equal(calls[1][3],96);c.canvas.width=8;calls.length=0;renderVideo(c,{width:1000,height:500},{crop:{x:0,y:0,w:.04,h:1},caption:'hi',font:.12,ty:.8});assert.ok(calls[1][4]>0);
});
