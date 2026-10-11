import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {mkdir,readFile} from 'node:fs/promises';
const dir='work/ai-qa';await mkdir(dir,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const p=await browser.newPage({acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));let submitted=[],temporary=true,budget=10;
 await p.route('**/api/ai/**',async route=>{const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/config'))return route.fulfill({json:{ready:true,needsAccess:false,chunkedVideo:true,budget,spent:0}});
  if(path.endsWith('/jobs')&&route.request().method()==='POST'){submitted.push(route.request().postDataJSON());return route.fulfill({json:{id:submitted.at(-1).id,status:'queued'}});}
  if(path.endsWith('/video-info')){const v=await readFile('work/video-qa/source.webm');return route.fulfill({json:{type:'video/webm',bytes:v.length,chunks:1}});}
  if(path.endsWith('/video/0'))return route.fulfill({contentType:'video/webm',body:await readFile('work/video-qa/source.webm')});
  if(temporary)return route.fulfill({status:503,json:{error:'连接暂时中断'}});
  return route.fulfill({json:{status:'success'}});
 });
 await p.goto('http://127.0.0.1:5173/ai.html');await p.locator('#mode-text').click();await p.locator('#custom-play').click();assert.equal(await p.locator('#prompt').inputValue(),'');await p.locator('#prompt').fill('一只猫抱着手机等消息，突然变成弹簧跳起来');await p.locator('#caption').fill('终于回我了');await p.locator('#generate').click();await p.locator('#resume').waitFor({state:'visible'});
 assert.equal(await p.locator('#generate').isDisabled(),true,'unconfirmed existing task must not be replaced by another paid submission');
 temporary=false;await p.locator('#resume').click();await p.locator('#edit').waitFor({state:'visible'});assert.equal(submitted.length,1);assert.equal(submitted[0].mode,'text');const direct=p.waitForEvent('download');await p.locator('#gif-create').click();await(await direct).saveAs(`${dir}/direct-fixture.gif`);await p.locator('#gif-preview').waitFor({state:'visible'});assert.equal(submitted.length,1,'GIF conversion must not submit another paid AI job');
 for(const width of [390,320]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await p.screenshot({path:`${dir}/ai-mobile.png`,fullPage:true});await p.locator('#edit').click();await p.waitForURL('**/video.html?ai=*');await p.waitForFunction(()=>!document.querySelector('#export').disabled);assert.equal(await p.locator('#name').innerText(),'AI生成动作.mp4');assert.equal(await p.locator('#text').inputValue(),'终于回我了');
 const d=p.waitForEvent('download');await p.locator('#export').click();await(await d).saveAs(`${dir}/handoff-fixture.gif`);await p.waitForFunction(()=>!document.querySelector('#export').disabled);
 await p.goto('http://127.0.0.1:5173/ai.html');await p.locator('#resume').click();await p.locator('#edit').waitFor({state:'visible'});await p.locator('#photo').setInputFiles('public/sample-person.png');await p.locator('#photo-preview').waitFor({state:'visible'});assert.equal(await p.locator('#consent').count(),0);await p.locator('#generate').click();await p.locator('#edit').waitFor({state:'visible'});assert.equal(submitted.length,2);assert.equal(submitted[1].mode,'photo');assert.ok(submitted[1].image.startsWith('data:image/jpeg;base64,'));assert.ok(!JSON.stringify(submitted).includes('sk-api-'));
 budget=0;await p.reload();await p.waitForTimeout(250);assert.ok(await p.locator('#resume').isVisible(),'existing results must remain retrievable when the generation budget is exhausted');assert.ok(await p.locator('#generate').isDisabled());assert.deepEqual(errors,[]);console.log('PASS simulated AI async recovery, photo upload without extra checkbox and direct GIF download, 320/390px, IndexedDB handoff and real GIF encoding; no paid AI generation');
}finally{await browser.close();}
