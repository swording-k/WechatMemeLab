import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {mkdir,readFile,writeFile} from 'node:fs/promises';
const root=process.env.TEST_URL||'http://127.0.0.1:5173/',dir=process.env.QA_DIR||'work/layers';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:1000},acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(root);
 await p.waitForFunction(()=>document.querySelector('#face-status')?.textContent.includes('已定位'),null,{timeout:60000});
 assert.equal(await p.locator('.caption-controls details').getAttribute('open'),null);
 await p.locator('#caption').fill('拖我试试');await p.locator('#preview').scrollIntoViewIfNeeded();const initial=await p.locator('#preview').boundingBox();await p.locator('#preview').click({position:{x:initial.width*.5,y:initial.height*.875}});assert.equal(await p.locator('#layer-text').getAttribute('aria-pressed'),'true','tap text directly without selecting a mode');await p.locator('#layer-text').click();await p.locator('#preview').scrollIntoViewIfNeeded();
 const box=()=>p.locator('.layer-selection').boundingBox(),input=id=>p.locator('#'+id).inputValue();
 const drag=async(from,to)=>{await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:8});await p.mouse.up();};
 let b=await box(),beforeY=await input('captionY'),beforeFocus=await input('focusY');
 await drag({x:b.x+b.width/2,y:b.y+b.height/2},{x:b.x+b.width/2-35,y:b.y+b.height/2-55});
 assert.ok(Number(await input('captionY'))<Number(beforeY));assert.equal(await input('focusY'),beforeFocus,'caption drag must not move effect');
 await p.locator('#layer-undo').click();assert.equal(await input('captionY'),beforeY);await p.locator('#layer-redo').click();assert.ok(Number(await input('captionY'))<Number(beforeY));
 b=await box();await p.mouse.dblclick(b.x+b.width/2,b.y+b.height/2);assert.equal(await p.evaluate(()=>document.activeElement.id),'caption','double-click opens the real caption input');await p.locator('#preview').scrollIntoViewIfNeeded();const h=await p.locator('.layer-resize').boundingBox();await drag({x:h.x+22,y:h.y+22},{x:h.x+48,y:h.y+42});assert.ok(Number(await input('captionScale'))>1);
 const r=await p.locator('.layer-rotate').boundingBox();b=await box();await drag({x:r.x+22,y:r.y+22},{x:b.x+b.width+30,y:b.y+b.height/2});assert.ok(Math.abs(Number(await input('captionRotation')))>20);
 await p.locator('#layer-upright').click();assert.equal(await input('captionRotation'),'0');
 // Editing really pauses the rendered animation.
 await p.waitForTimeout(120);const frozen=await p.locator('#preview').evaluate(c=>c.toDataURL());await p.waitForTimeout(180);assert.equal(await p.locator('#preview').evaluate(c=>c.toDataURL()),frozen);
 // The same transform is used by export, without selection guides.
 await p.locator('.caption-controls summary').click();await p.locator('#captionStyle').selectOption('plain');await p.locator('#captionColor').fill('#ef4040');await p.locator('#captionRotation').fill('33');await p.waitForTimeout(150);
 await p.locator('#preview').screenshot({path:`${dir}/caption-preview.png`});
 async function download(name){const d=p.waitForEvent('download');await p.locator('#export').click();await(await d).saveAs(`${dir}/${name}.gif`);await p.waitForFunction(()=>!document.querySelector('#export').disabled);}
 await download('text-rotated');await p.locator('#layer-upright').click();await download('text-upright');assert.notDeepEqual(await readFile(`${dir}/text-rotated.gif`),await readFile(`${dir}/text-upright.gif`));
 await p.locator('#layer-preview').click();assert.ok(await p.locator('.layer-selection').isHidden());await p.waitForTimeout(160);const playing=await p.locator('#preview').evaluate(c=>c.toDataURL());await p.waitForTimeout(220);assert.notEqual(await p.locator('#preview').evaluate(c=>c.toDataURL()),playing);await p.locator('#layer-preview').click();
 // Empty space deselects first; the next click adjusts the effect again.
 await p.locator('#preview').click({position:{x:8,y:8}});assert.ok(await p.locator('.layer-selection').isHidden());
 // Both original cat and dog layers move independently.
 for(const template of ['cat','dog']){
  await p.locator(`[data-template=${template}]`).click();assert.equal(await p.locator('#pet-controls details').getAttribute('open'),null);await p.locator('#layer-pet').click();await p.locator('#preview').scrollIntoViewIfNeeded();b=await box();const oldX=Number(await input('petX')),oldY=Number(await input('petY'));const center={x:b.x+b.width/2,y:b.y+b.height/2};
  await drag(center,{x:center.x+25,y:center.y+20});assert.ok(Number(await input('petX'))>oldX);assert.ok(Number(await input('petY'))>oldY);
  const before=await input('petX');await p.locator('#layer-undo').click();assert.equal(Number(await input('petX')),oldX);await p.locator('#layer-redo').click();assert.equal(await input('petX'),before);
  await download(template);await p.locator('#layer-upright').click();assert.equal(await input('petRotation'),'0');
 }
 // Two-finger rotation/scale, then continue with one finger, with cancellation rollback.
 await p.setViewportSize({width:390,height:844});await p.locator('#layer-text').click();await p.locator('#preview').scrollIntoViewIfNeeded();const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 b=await box();const cx=b.x+b.width/2,cy=b.y+b.height/2,startScale=Number(await input('captionScale'));
 const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:1,radiusY:1,force:1}))});
 await touch('touchStart',[[1,cx-18,cy],[2,cx+18,cy]]);await touch('touchMove',[[1,cx-25,cy-15],[2,cx+35,cy+15]]);assert.ok(Number(await input('captionScale'))>startScale);assert.ok(Math.abs(Number(await input('captionRotation')))>15);
 await touch('touchEnd',[[1,cx-25,cy-15]]);const mid=await input('captionY');await touch('touchMove',[[2,cx+40,cy-5]]);await touch('touchEnd',[]);assert.ok(Number(await input('captionY'))<Number(mid),JSON.stringify({mid,after:await input('captionY'),selection:await p.locator('.layer-selection').getAttribute('style')}));
 const beforeCancel=await input('captionY');b=await box();await touch('touchStart',[[1,b.x+b.width/2,b.y+b.height/2]]);await touch('touchMove',[[1,b.x+b.width/2,b.y+b.height/2-20]]);await touch('touchCancel',[]);assert.equal(await input('captionY'),beforeCancel);
 for(const width of [390,320]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#preview').scrollIntoViewIfNeeded();await p.waitForTimeout(80);const frame=await p.locator('#preview').boundingBox();for(const handle of await p.locator('.layer-handle').all()){const h=await handle.boundingBox();assert.ok(h.x>=frame.x-1&&h.y>=frame.y-1&&h.x+h.width<=frame.x+frame.width+1&&h.y+h.height<=frame.y+frame.height+1,'edge handles remain inside canvas');}await p.screenshot({path:`${dir}/mobile-${width}.png`});}
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await p.locator('[data-edit-mode=photo]').click();assert.ok(await p.locator('.layer-selection').isHidden());
 await p.locator('[data-template=custom]').click();await p.locator('[data-edit-mode=effect]').click();await p.locator('[data-brush=expand]').click();await p.locator('#preview').click({position:{x:100,y:100}});assert.equal(await p.locator('#sculpt-count').innerText(),'1 / 12 次操作');
 assert.deepEqual(errors,[]);await writeFile(`${dir}/result.json`,JSON.stringify({passed:true,exports:['text-rotated','text-upright','cat','dog'],errors}));console.log('PASS direct text/pet dragging, resize, rotate, undo/redo, pause/preview, touch pinch + one-finger continuation + cancellation, 320/390px, sculpt isolation, four real GIF exports');
}finally{await browser.close();}
