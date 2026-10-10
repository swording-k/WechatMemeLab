import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const dir=process.env.QA_DIR||'work/editor';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const p=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
 await p.waitForFunction(()=>document.querySelector('#face-status')?.textContent.includes('已定位'),null,{timeout:60000});
 assert.ok(await p.locator('#photo-crop').count(),'manual crop button must be visible outside advanced settings');
 await p.locator('#file').setInputFiles('public/sample-portrait.png');
 await p.waitForFunction(()=>document.querySelector('#file-name').textContent==='sample-portrait.png');
 await p.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
 assert.ok(Number(await p.locator('#zoom').inputValue())<1,'upload must preserve the whole portrait');
 await p.locator('.caption-controls .layer-fine summary').click();await p.locator('#caption').fill('自由摆放');await p.locator('#captionX').fill('25');await p.locator('#captionY').fill('15');
 await p.locator('#zoom').fill('0.4');
 await p.locator('[data-edit-mode=photo]').click();await p.locator('#preview').scrollIntoViewIfNeeded();const box=await p.locator('#preview').boundingBox();
 await p.mouse.move(box.x+box.width*.4,box.y+box.height*.4);await p.mouse.down();await p.mouse.move(box.x+box.width*.65,box.y+box.height*.65,{steps:8});await p.mouse.up();
 assert.ok(Number(await p.locator('#x').inputValue())>0);assert.ok(Number(await p.locator('#y').inputValue())>0);
 await p.locator('#photo-crop').click();assert.ok(await p.locator('#crop-dialog').isVisible());
 const crop=await p.locator('#crop-canvas').boundingBox();
 await p.mouse.move(crop.x+crop.width*.4,crop.y+crop.height*.46);await p.mouse.down();await p.mouse.move(crop.x+crop.width*.59,crop.y+crop.height*.65,{steps:8});await p.mouse.up();
 await p.locator('#crop-apply').click();assert.ok(await p.locator('#crop-dialog').isHidden());assert.ok(Number(await p.locator('#zoom').inputValue())>1);
 await p.locator('#photo-crop').click();await p.locator('#crop-size').fill('60');await p.locator('#crop-x').fill('55');await p.locator('#crop-y').fill('65');await p.locator('#crop-apply').click();
 const croppedZoom=Number(await p.locator('#zoom').inputValue()),croppedRadius=Number(await p.locator('#radius').inputValue());
 await p.locator('#photo-fit').click();assert.ok(Number(await p.locator('#zoom').inputValue())<1);
 assert.ok(Math.abs(Number(await p.locator('#radius').inputValue())-croppedRadius*Number(await p.locator('#zoom').inputValue())/croppedZoom)<0.011,'roundtrip framing keeps effect scale');
 assert.equal(await p.locator('#captionX').inputValue(),'25');assert.equal(await p.locator('#captionY').inputValue(),'15');
 // A late detection must not replace manual framing.
 await p.locator('#auto-face').click();await p.locator('#zoom').fill('0.4');await p.waitForFunction(()=>!document.querySelector('#auto-face').disabled);assert.equal(await p.locator('#zoom').inputValue(),'0.4');
 for(const id of ['cat','dog']){
  await p.locator(`[data-template=${id}]`).click();assert.ok(await p.locator('#pet-controls').isVisible());
  if(!(await p.locator('#pet-controls details').getAttribute('open')!==null))await p.locator('#pet-controls summary').click();await p.locator('#petRotation').fill('-45');await p.locator('#petX').fill('18');await p.locator('#petY').fill('12');await p.locator('#petScale').fill('1.4');
  await p.locator('#layer-pet').click();await p.locator('#preview').scrollIntoViewIfNeeded();const b=await p.locator('#preview').boundingBox();
  const pet=await p.locator('.layer-selection').boundingBox();const px=Math.max(b.x+10,Math.min(b.x+b.width-10,pet.x+pet.width/2)),py=Math.max(b.y+10,Math.min(b.y+b.height-10,pet.y+pet.height/2));await p.mouse.move(px,py);await p.mouse.down();await p.mouse.move(px+15,py-15,{steps:5});await p.mouse.up();assert.ok(Number(await p.locator('#petX').inputValue())>18);
  for(const [angle,name] of [[-45,'left'],[45,'right'],[0,'upright']]){
   await p.locator('#petRotation').fill(String(angle));await p.locator('[data-edit-mode=effect]').click();
   const download=p.waitForEvent('download');await p.locator('#export').click();await (await download).saveAs(`${dir}/${id}-${name}.gif`);await p.waitForFunction(()=>!document.querySelector('#export').disabled);
  }
  assert.notDeepEqual(await readFile(`${dir}/${id}-left.gif`),await readFile(`${dir}/${id}-right.gif`),'rotation must reach the actual export');
  assert.equal(await p.locator('#captionX').inputValue(),'25');assert.equal(await p.locator('#captionY').inputValue(),'15');
  await p.locator('#pet-reset').click();assert.equal(await p.locator('#petRotation').inputValue(),'0');assert.equal(await p.locator('#petX').inputValue(),'0');
 }
 await p.locator('#preview').screenshot({path:`${dir}/preview.png`});
 for(const width of [390,320]){
  await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('#photo-crop').click();assert.ok(await p.evaluate(()=>document.querySelector('#crop-dialog').getBoundingClientRect().width<=innerWidth));await p.locator('#crop-cancel').click();
 }
 await p.locator('#pet-controls').scrollIntoViewIfNeeded();await p.screenshot({path:`${dir}/mobile-controls.png`});
 await p.locator('[data-template=custom]').click();await p.locator('[data-edit-mode=photo]').click();assert.ok(await p.locator('#pet-controls').isHidden());
 await p.locator('[data-edit-mode=effect]').click();await p.locator('[data-brush=expand]').click();await p.locator('#preview').click({position:{x:100,y:100}});assert.equal(await p.locator('#sculpt-count').innerText(),'1 / 12 次操作');
 assert.deepEqual(errors,[]);console.log('PASS full-photo upload, 2-axis drag, original crop + keyboard controls, late-detection ownership, independent pet position/rotation/scale, six GIFs, 320/390px mobile, sculpt isolation');
}finally{await browser.close();}
