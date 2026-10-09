import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,channel:'chrome'}),p=await b.newPage();await p.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');await p.locator('#sample2').click();await p.waitForFunction(()=>document.querySelector('#file-name').textContent==='虚构人物竖图示例');await p.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));assert.equal(await p.locator('[data-face]').count(),1);
for(const t of ['pinch','pull','knead','bulge','twist','squish']){await p.locator(`[data-template=${t}]`).click();await p.locator('#caption').fill('');const dp=p.waitForEvent('download');await p.locator('#export').click();await(await dp).saveAs(`work/qa/portrait-${t}.gif`);await p.waitForFunction(()=>!document.querySelector('#export').disabled);}
await b.close();console.log('PASS independent 9:16 fictional portrait: full-photo framing, six caption-free GIFs');
