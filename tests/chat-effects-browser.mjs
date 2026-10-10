import {chromium} from '@playwright/test';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const url=process.env.TEST_URL||'http://127.0.0.1:5173/',dir=process.env.QA_DIR||'work/chat-effects';await mkdir(dir,{recursive:true});
const b=await chromium.launch({headless:true,channel:'chrome'});
try{
 const p=await b.newPage({acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>document.querySelector('#face-status')?.textContent.includes('已定位'),null,{timeout:60000});
 assert.equal(await p.locator('[data-template]').count(),16);assert.equal(await p.locator('[data-template]').first().getAttribute('data-template'),'custom');
 for(const id of ['notify','crack','screen','dog']){
 await p.locator(`[data-template=${id}]`).click();await p.locator('#caption').fill('');const d=p.waitForEvent('download');await p.locator('#export').click();await(await d).saveAs(`${dir}/${id}.gif`);await p.waitForFunction(()=>!document.querySelector('#export').disabled);
 assert.ok((await p.locator('#status').innerText()).includes('已生成 240 × 240'));
 }
 await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`${dir}/mobile.png`,fullPage:true});
 await p.locator('.mode-nav a').nth(1).click();await p.waitForURL('**/video.html');assert.ok(await p.locator('#file').isVisible());assert.deepEqual(errors,[]);
 console.log('PASS four chat GIF exports, custom first, 16 modes, mobile and video navigation:',url);
}finally{await b.close();}
