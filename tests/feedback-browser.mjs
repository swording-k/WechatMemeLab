import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:5173/';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const file of ['','video.html']){await page.goto(new URL(file,base).href);await page.locator('.product-footer a').filter({hasText:'问题与建议'}).click();await page.waitForURL('**/feedback.html');assert.equal(await page.locator('h1').innerText(),'有问题？有怪点子？\n告诉我。');}
 assert.equal(await page.locator('.screenshot-entry').getAttribute('href'),'https://github.com/swording-k/WechatMemeLab/issues/new?template=feedback.yml');
 await page.getByRole('button',{name:'前往 GitHub 提交反馈'}).click();assert.ok(page.url().includes('feedback.html'));
 await page.locator('[name=type]').selectOption('idea');await page.locator('[name=title]').fill('猫猫 & 闺蜜');await page.locator('[name=detail]').fill('把脸揉成包子\n不要白底');await page.locator('[name=device]').fill('iPhone Safari');
 let outbound;await page.route('https://github.com/**',route=>{outbound=new URL(route.request().url());return route.fulfill({body:'QA navigation intercepted; no Issue submitted',contentType:'text/plain'});});
 await page.getByRole('button',{name:'前往 GitHub 提交反馈'}).click();await page.waitForURL('https://github.com/**');assert.equal(outbound.searchParams.get('title'),'[玩法建议] 猫猫 & 闺蜜');assert.ok(outbound.searchParams.get('detail').includes('不要白底'));assert.equal(outbound.searchParams.get('template'),'feedback.yml');
 await page.goto(new URL('feedback.html',base).href);assert.equal(await page.locator('[name=title]').inputValue(),'猫猫 & 闺蜜');
 await page.locator('[name=detail]').fill('猫'.repeat(1500));await page.getByRole('button',{name:'前往 GitHub 提交反馈'}).click();assert.ok((await page.locator('#status').innerText()).includes('邮件'));
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:850});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:390,height:844});await page.locator('[name=detail]').fill('希望把朋友的脸揉成包子，再弹回来。');
 if(process.env.SCREENSHOT)await page.screenshot({path:process.env.SCREENSHOT,fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: both studio entries, form validation, encoded Issue navigation, draft restore, oversized URL fallback, mobile layout. No feedback submitted.');
}finally{await browser.close();}
