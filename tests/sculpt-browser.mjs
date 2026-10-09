import {chromium} from '@playwright/test';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const p=await browser.newPage({acceptDownloads:true,hasTouch:true,viewport:{width:1365,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await mkdir('work/sculpt',{recursive:true});
 await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
 assert.equal(await p.locator('[data-template]').first().getAttribute('data-template'),'custom');await p.locator('[data-template=custom]').click();await p.locator('#export').click();assert.ok((await p.locator('#status').innerText()).includes('先在照片'));
 await p.locator('#preview').scrollIntoViewIfNeeded();let box=await p.locator('#preview').boundingBox();
 await p.mouse.move(box.x+box.width*.55,box.y+box.height*.55);await p.mouse.down();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.45,{steps:8});await p.mouse.up();
 assert.ok((await p.locator('#sculpt-count').innerText()).startsWith('1 /'));await p.waitForTimeout(100);const edited=await p.locator('#preview').evaluate(c=>c.toDataURL());await p.waitForTimeout(200);assert.ok(await p.locator('#preview').evaluate(c=>c.toDataURL())===edited,'edit view must stay still');
 await p.locator('[data-brush=expand]').click();await p.locator('#preview').click({position:{x:box.width*.4,y:box.height*.6}});assert.ok((await p.locator('#sculpt-count').innerText()).startsWith('2 /'));
 await p.locator('#sculpt-undo').click();assert.ok((await p.locator('#sculpt-count').innerText()).startsWith('1 /'));
 await p.locator('#sculpt-tools details').evaluate(e=>e.open=true);await p.locator('[data-nudge="0,0.12"]').focus();await p.keyboard.press('Enter');assert.ok((await p.locator('#sculpt-count').innerText()).startsWith('2 /'));
 await p.locator('[data-template=cat]').click();assert.ok(await p.locator('#sculpt-tools').isHidden());await p.locator('[data-template=custom]').click();assert.ok((await p.locator('#sculpt-count').innerText()).startsWith('2 /'));
 await p.locator('#caption').fill('已读乱捏');await p.locator('#sculpt-play').click();await p.waitForTimeout(250);const a=await p.locator('#preview').evaluate(c=>c.toDataURL());await p.waitForTimeout(350);assert.ok(await p.locator('#preview').evaluate(c=>c.toDataURL())!==a,'playback must animate');
 const download=p.waitForEvent('download');await p.locator('#export').click();await(await download).saveAs('work/sculpt/custom.gif');await p.waitForFunction(()=>!document.querySelector('#export').disabled);
 await p.locator('#sculpt-play').click();assert.equal(await p.locator('#sculpt-play').innerText(),'播放我的动作');await p.screenshot({path:'work/sculpt/desktop.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.locator('#sculpt-tools').scrollIntoViewIfNeeded();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'work/sculpt/mobile.png',fullPage:true});
 await p.locator('#sculpt-clear').click();assert.ok((await p.locator('#sculpt-count').innerText()).startsWith('0 /'));
 await p.locator('[data-brush=drag]').click();await p.locator('#preview').scrollIntoViewIfNeeded();box=await p.locator('#preview').boundingBox();
 const cdp=await p.context().newCDPSession(p);const x=box.x+box.width*.5,y=box.y+box.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+box.width*.1,y:y-box.height*.08}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.ok((await p.locator('#sculpt-count').innerText()).startsWith('1 /'));await p.locator('#sculpt-clear').click();
 await p.locator('[data-brush=shrink]').click();box=await p.locator('#preview').boundingBox();await p.locator('#preview').click({position:{x:box.width*.5,y:box.height*.5}});
 await p.locator('#sample2').click();await p.waitForFunction(()=>document.querySelector('#file-name').textContent.includes('竖图示例'));assert.ok((await p.locator('#sculpt-count').innerText()).startsWith('0 /'));
 assert.deepEqual(errors,[]);console.log('PASS local drag, brush, undo/clear, keyboard, static edit/animated playback, mode preservation, photo reset, mobile and GIF export');
}finally{await browser.close();}
