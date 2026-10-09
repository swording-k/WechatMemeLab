import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as geometry from '../src/photo/geometry.mjs';

test('a square photo can move even when it exactly fits the frame',()=>{
 const p=geometry.sourceToFrame(1000,1000,{x:.5,y:.5},{zoom:1,x:40,y:30});
 assert.ok(p.x>.5&&p.y>.5,'horizontal and vertical controls must move a fitting photo');
});
test('fit keeps a full-body portrait entirely visible without enlarging its face',()=>{
 assert.equal(typeof geometry.fitPhoto,'function');
 const s=geometry.fitPhoto(900,1600);
 const top=geometry.sourceToFrame(900,1600,{x:0,y:0},s),bottom=geometry.sourceToFrame(900,1600,{x:1,y:1},s);
 assert.ok(top.x>=0&&top.y>=0&&bottom.x<=1&&bottom.y<=1);
 assert.ok(s.zoom<1);
});
test('manually selected original-photo square maps exactly to the output frame',()=>{
 assert.equal(typeof geometry.cropToSettings,'function');
 const s=geometry.cropToSettings(900,1600,{x:180,y:720,size:360});
 const tl=geometry.sourceToFrame(900,1600,{x:.2,y:.45},s),br=geometry.sourceToFrame(900,1600,{x:.6,y:.675},s);
 assert.ok(Math.abs(tl.x)<1e-8&&Math.abs(tl.y)<1e-8);
 assert.ok(Math.abs(br.x-1)<1e-8&&Math.abs(br.y-1)<1e-8);
});
test('detecting a face can align the effect without changing manual framing',()=>{
 const view={zoom:.5625,x:30,y:20};
 const s=geometry.faceToSettings(900,1600,{x:.3,y:.05,width:.4,height:.25},view);
 assert.equal(s.zoom,view.zoom);assert.equal(s.x,view.x);assert.equal(s.y,view.y);
});

test('dragging a zoomed photo preserves the same source point as the effect anchor',()=>{
 assert.equal(typeof geometry.reframeFocus,'function');
 const before={zoom:1,x:0,y:0,focusX:.45,focusY:.3,radius:.2};
 const after={...before,zoom:.5,x:40,y:20};
 const anchor=geometry.reframeFocus(900,1600,before,after);
 const old=geometry.sourceToFrame(900,1600,{x:.45,y:.3875},before);
 const next=geometry.sourceToFrame(900,1600,{x:.45,y:.3875},after);
 assert.ok(Math.abs(anchor.focusX-next.x)<1e-8&&Math.abs(anchor.focusY-next.y)<1e-8);
 assert.ok(Math.abs(old.y-before.focusY)<1e-8);
 assert.equal(anchor.radius,.1);
});

test('zooming into a crop and back does not permanently shrink the effect or attached sticker',()=>{
 const before={zoom:.5,x:0,y:0,focusX:.5,focusY:.25,radius:.15};
 const cropped={zoom:4,x:0,y:0};
 const next={...cropped,...geometry.reframeFocus(900,1600,before,cropped)};
 const restored=geometry.reframeFocus(900,1600,next,before);
 assert.ok(Math.abs(restored.radius-before.radius)<1e-8,'reframing must be reversible');
 assert.ok(Math.abs(restored.focusX-before.focusX)<1e-8&&Math.abs(restored.focusY-before.focusY)<1e-8);
});
