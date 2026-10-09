import {chromium} from '@playwright/test';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1365,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('work/new-effects',{recursive:true});
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
 assert.ok((await page.locator('.mode-nav a[aria-current=page]').innerText()).includes('照片整活'));
 for(const effect of ['cat','suction','melt','leak']){
 await page.locator(`[data-template=${effect}]`).click();await page.locator('#caption').fill('');
 const d=page.waitForEvent('download');await page.locator('#export').click();await(await d).saveAs(`work/new-effects/${effect}.gif`);await page.waitForFunction(()=>!document.querySelector('#export').disabled);
 await page.locator('#copy-recipe').click();
 }
 await page.locator('#sample2').click();await page.waitForFunction(()=>document.querySelector('#file-name').textContent.includes('竖图示例'));await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
 for(const effect of ['cat','suction','melt','leak']){await page.locator(`[data-template=${effect}]`).click();await page.locator('#caption').fill('');const download=page.waitForEvent('download');await page.locator('#export').click();await(await download).saveAs(`work/new-effects/${effect}-portrait.gif`);await page.waitForFunction(()=>!document.querySelector('#export').disabled);}
 await page.locator('#sample').click();await page.waitForFunction(()=>document.querySelector('#file-name').textContent==='虚构人物示例');await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
 await page.locator('[data-template=cat]').click();await page.locator('.suggestions button').first().click();assert.equal(await page.locator('#caption').inputValue(),'再摸一下');
 await page.locator('#pause').click();await page.screenshot({path:'work/new-effects/desktop.png',fullPage:true});
 for(const width of [390,320]){
 await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const nav=await page.locator('.mode-nav').boundingBox();assert.ok(nav.y+nav.height<250);await page.screenshot({path:`work/new-effects/mobile-${width}.png`});
 }
 await page.locator('.mode-nav a').nth(1).click();await page.waitForURL('**/video.html');assert.ok((await page.locator('.mode-nav a[aria-current=page]').innerText()).includes('视频表情'));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'work/new-effects/video-320.png'});
 await page.locator('.mode-nav a').first().click();await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
 await page.goto('about:blank');await page.goto('http://127.0.0.1:5173/#t=suction&c=上头了');await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));assert.equal(await page.locator('[data-template=suction]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#caption').inputValue(),'上头了');
 assert.deepEqual(errors,[]);console.log('PASS four new GIF exports, captions/recipe, mobile visible navigation and both directions');
}finally{await browser.close();}
