import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:5173/';
const b=await chromium.launch({channel:'chrome',headless:true,...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY}}:{})});
try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const file of ['','video.html']){await p.goto(new URL(file,base).href);await p.locator('.product-footer a').filter({hasText:'问题与建议'}).click();await p.waitForURL('**/feedback.html');assert.ok(await p.locator('#screenshots').isVisible());}
 await p.locator('#submit').click();assert.ok(p.url().includes('feedback.html'));
 await p.locator('[name=type]').selectOption('idea');await p.locator('[name=title]').fill('猫猫 & 闺蜜');await p.locator('[name=detail]').fill('把脸揉成包子\n不要白底');await p.locator('[name=device]').fill('iPhone Safari');
 await p.locator('#screenshots').setInputFiles(['public/sample-person.png','public/sample-portrait.png']);await p.waitForFunction(()=>document.querySelectorAll('.image-preview').length===2&&!document.querySelector('#submit').disabled);
 await p.getByRole('button',{name:'移除截图 2'}).click();assert.equal(await p.locator('.image-preview').count(),1);
 await p.locator('#screenshots').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});await p.waitForFunction(()=>document.querySelector('#image-status').textContent.includes('请选择'));assert.equal(await p.locator('.image-preview').count(),1);
 let first=true,payloads=[];await p.route('**/meme-feedback*',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'}});if(route.request().method()==='GET')return route.fulfill({json:{state:'synced',issueUrl:'https://github.com/swording-k/WechatMemeLab/issues/999'}});const data=route.request().postDataJSON();payloads.push(data);if(first){first=false;return route.fulfill({status:503,json:{error:'测试保存失败'}});}return route.fulfill({status:201,json:{id:data.id,state:'pending'}});});
 await p.locator('#submit').click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('测试保存失败'));assert.equal(await p.locator('.image-preview').count(),1);assert.equal(await p.locator('[name=title]').inputValue(),'猫猫 & 闺蜜');
 await p.locator('#submit').click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('反馈已收到'));
 assert.equal(payloads[0].id,payloads[1].id);assert.equal(payloads[1].images.length,1);assert.equal(payloads[1].images[0].type,'image/jpeg');assert.ok(Buffer.from(payloads[1].images[0].data,'base64').length>1000);assert.equal(payloads[1].detail,'把脸揉成包子\n不要白底');
 await p.locator('#check-status').click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('已同步到 GitHub'));assert.equal(await p.locator('#status a').getAttribute('href'),'https://github.com/swording-k/WechatMemeLab/issues/999');
 for(const width of [320,390,1280]){await p.setViewportSize({width,height:850});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 if(process.env.SCREENSHOT){await p.setViewportSize({width:390,height:844});await p.screenshot({path:process.env.SCREENSHOT,fullPage:true});}
 await p.locator('#new-feedback').click();assert.equal(await p.locator('.image-preview').count(),0);assert.equal(await p.locator('#submit').isEnabled(),true);assert.deepEqual(errors,[]);
 console.log('PASS: both entries, screenshot resize/preview/remove/invalid file, failed-submit recovery/idempotent retry, status, mobile layout. All server calls mocked.');
}finally{await b.close();}
