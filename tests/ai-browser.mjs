import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {mkdir,readFile} from 'node:fs/promises';
const dir='work/ai-qa';await mkdir(dir,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const p=await browser.newPage({acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));let submitted=[],temporary=true,budget=10;
 await p.route('**/api/ai/**',async route=>{const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/config'))return route.fulfill({json:{ready:true,needsAccess:false,budget,spent:0}});
  if(path.endsWith('/jobs')&&route.request().method()==='POST'){submitted.push(route.request().postDataJSON());return route.fulfill({json:{id:submitted.at(-1).id,status:'queued'}});}
  if(path.endsWith('/video'))return route.fulfill({contentType:'video/webm',body:await readFile('work/video-qa/source.webm')});
  if(temporary)return route.fulfill({status:503,json:{error:'连接暂时中断'}});
  return route.fulfill({json:{status:'success'}});
 });
 await p.goto('http://127.0.0.1:5173/ai.html');await p.locator('#mode-text').click();await p.locator('#generate').click();await p.locator('#resume').waitFor({state:'visible'});
 assert.equal(await p.locator('#generate').isDisabled(),true,'unconfirmed existing task must not be replaced by another paid submission');
 temporary=false;await p.locator('#resume').click();await p.locator('#edit').waitFor({state:'visible'});assert.equal(submitted.length,1);assert.equal(submitted[0].mode,'text');
 for(const width of [390,320]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await p.screenshot({path:`${dir}/ai-mobile.png`,fullPage:true});await p.locator('#edit').click();await p.waitForURL('**/video.html?ai=*');await p.waitForFunction(()=>!document.querySelector('#export').disabled);assert.equal(await p.locator('#name').innerText(),'AI生成动作.mp4');assert.equal(await p.locator('#text').inputValue(),'我只是路过');
 const d=p.waitForEvent('download');await p.locator('#export').click();await(await d).saveAs(`${dir}/handoff-fixture.gif`);await p.waitForFunction(()=>!document.querySelector('#export').disabled);
 await p.goto('http://127.0.0.1:5173/ai.html');await p.locator('#resume').click();await p.locator('#edit').waitFor({state:'visible'});await p.locator('#photo').setInputFiles('public/sample-person.png');await p.locator('#photo-preview').waitFor({state:'visible'});await p.locator('#generate').click();assert.equal(submitted.length,1,'no photo upload without confirmation');await p.locator('#consent').check();await p.locator('#generate').click();await p.locator('#edit').waitFor({state:'visible'});assert.equal(submitted.length,2);assert.equal(submitted[1].mode,'photo');assert.ok(submitted[1].image.startsWith('data:image/jpeg;base64,'));assert.ok(!JSON.stringify(submitted).includes('sk-api-'));
 budget=0;await p.reload();await p.waitForTimeout(250);assert.ok(await p.locator('#resume').isVisible(),'existing results must remain retrievable when the generation budget is exhausted');assert.ok(await p.locator('#generate').isDisabled());assert.deepEqual(errors,[]);console.log('PASS simulated AI async recovery, photo confirmation, 320/390px, IndexedDB handoff and real GIF encoding; no paid AI generation');
}finally{await browser.close();}
