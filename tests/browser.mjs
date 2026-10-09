import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
const context=await browser.newContext({acceptDownloads:true,viewport:{width:1365,height:1050}});
const page=await context.newPage(),errors=[],outbound=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))outbound.push(r.url());assert.equal(r.method(),'GET');});
await mkdir('work/qa',{recursive:true});
await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
assert.equal(await page.locator('[data-template]').count(),15);
await page.screenshot({path:'work/qa/desktop.png',fullPage:true});
for(const template of ['pinch','pull','knead','bulge','twist','squish']){
 await page.locator(`[data-template=${template}]`).click();
 const dp=page.waitForEvent('download');await page.locator('#export').click();await(await dp).saveAs(`work/qa/${template}-release.gif`);
 await page.waitForFunction(()=>!document.querySelector('#export').disabled);
 assert.match(await page.locator('#status').textContent(),/已生成 240 × 240/);
}
// Portrait, landscape and group input: real detector against raster fixtures.
for(const [name,width,height,positions] of [['portrait',900,1600,[[100,40,700,700]]],['landscape',1600,900,[[850,100,700,700]]],['group',1800,900,[[0,50,800,800],[950,50,800,800]]]]){
 const url=await page.evaluate(async({width,height,positions})=>{const img=new Image();img.src=new URL('sample-person.png',location.href).href;await img.decode();const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle='#dcdcdc';ctx.fillRect(0,0,width,height);positions.forEach(rect=>ctx.drawImage(img,...rect));return c.toDataURL();},{width,height,positions});
 await page.locator('#file').setInputFiles({name:name+'.png',mimeType:'image/png',buffer:Buffer.from(url.split(',')[1],'base64')});
 await page.waitForFunction(name=>document.querySelector('#file-name').textContent===name+'.png',name);
 await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
 assert.equal(await page.locator('[data-face]').count(),positions.length);
 if(name==='group'){const old=await page.locator('#x').inputValue();await page.locator('[data-face="1"]').click();assert.notEqual(await page.locator('#x').inputValue(),old);}
}
await page.locator('#file').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('无法读取'));
assert.equal(await page.locator('#auto-face').isEnabled(),true);
assert.equal(await page.locator('#file-name').textContent(),'group.png');
await page.locator('#file').setInputFiles({name:'huge.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(10*1024*1024+1)});
await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('超过'));
await page.locator('#advanced').evaluate(el=>el.open=true);
await page.locator('.crop-details').evaluate(el=>el.open=true);
await page.locator('#zoom').fill('1.5');await page.locator('#x').fill('45');await page.locator('#reset').click();
assert.equal(await page.locator('#zoom').inputValue(),'1');
await page.locator('#sample').click();await page.waitForFunction(()=>document.querySelector('#file-name').textContent==='虚构人物示例');
await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
await page.locator('#pause').click();assert.equal(await page.locator('#pause').getAttribute('aria-label'),'播放预览');await page.locator('#pause').click();
await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}}));
await page.locator('#caption').fill('有点想你');await page.locator('#copy-recipe').click();
const link=await page.evaluate(()=>window.copied);assert.match(link,/#t=squish/);assert.equal(new URL(link).hash.includes('focus'),false);
await page.goto(link);await page.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
assert.equal(await page.locator('#caption').inputValue(),'有点想你');assert.equal(await page.locator('[data-template=squish]').getAttribute('aria-pressed'),'true');
await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
await page.locator('#copy-recipe').click();await page.locator('#copy-recipe').click();assert.equal(await page.locator('.recipe-fallback').count(),1);
await page.evaluate(()=>document.querySelector('#advanced').open=false);
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));
await page.screenshot({path:'work/qa/mobile-top.png'});
await page.locator('#preview').scrollIntoViewIfNeeded();await page.screenshot({path:'work/qa/mobile-preview.png'});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.equal(await page.locator('header.site-header').count(),1);
const positions=await page.evaluate(()=>['.photo-block','.template-panel','.preview-panel','.tuning-block'].map(s=>document.querySelector(s).getBoundingClientRect().top+scrollY));assert.ok(positions.every((v,i)=>!i||v>positions[i-1]));
// Export worker remains interactive and canShare failure cannot discard a good file.
await page.locator('#size').selectOption('480');
await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{value:()=>{throw Error('unsupported');}});window.ticks=0;window.started=performance.now();window.gaps=[];let last=performance.now();window.timer=setInterval(()=>{window.gaps.push(performance.now()-last);last=performance.now();window.ticks++;},10);});
const dp=page.waitForEvent('download');await page.locator('#export').click();await(await dp).saveAs('work/qa/mobile-release.gif');await page.waitForFunction(()=>!document.querySelector('#export').disabled);
const responsiveness=await page.evaluate(()=>{clearInterval(window.timer);return {ticks:window.ticks,elapsed:performance.now()-window.started,maxGap:Math.max(...window.gaps)};});assert.ok(responsiveness.ticks>0);assert.ok(responsiveness.maxGap<300);console.log({responsiveness});
assert.match(await page.locator('#status').textContent(),/已生成/);
assert.deepEqual(errors,[]);assert.deepEqual(outbound,[]);
await writeFile('work/qa/browser-result.json',JSON.stringify({templates:6,portrait:true,landscape:true,groupSelection:true,errorRecovery:true,recipe:true,mobileWidth:390,exportResponsive:true,outboundRequests:outbound,pageErrors:errors},null,2));
await browser.close();console.log('PASS six exports, face fixtures, error recovery, recipe roundtrip/fallback, mobile order, responsive worker and no outgoing photo requests');
