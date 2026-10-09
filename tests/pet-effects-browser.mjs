import {chromium} from '@playwright/test';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const url=process.env.TEST_URL||'http://127.0.0.1:5173/',dir=process.env.QA_DIR||'work/pets';await mkdir(dir,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true,...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY}}:{})});
try{
 const p=await b.newPage({acceptDownloads:true,viewport:{width:1280,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>document.querySelector('#face-status')?.textContent.includes('已定位'),null,{timeout:60000});
 assert.equal(await p.locator('[data-template]').count(),15);assert.equal(await p.locator('[data-template]').first().getAttribute('data-template'),'custom');assert.equal(await p.locator('[data-template=glass],[data-template=soul]').count(),0);
 for(const [name,file] of [['square','public/sample-person.png'],['portrait','public/sample-portrait.png']]){
  await p.locator('#file').setInputFiles(file);await p.waitForFunction(()=>document.querySelector('#file-name').textContent.includes('sample-'));await p.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));
  for(const id of ['cat','dog']){
   await p.locator(`[data-template=${id}]`).click();const d=p.waitForEvent('download');await p.locator('#export').click();await(await d).saveAs(`${dir}/${id}-${name}.gif`);await p.waitForFunction(()=>!document.querySelector('#export').disabled);assert.ok((await p.locator('#status').innerText()).includes('已生成 240 × 240'));
  }
 }
 await p.locator('[data-template=cat]').click();await p.locator('[data-template=custom]').click();assert.ok(await p.locator('#sculpt-tools').isVisible());await p.locator('[data-template=dog]').click();assert.ok(await p.locator('#sculpt-tools').isHidden());
 await p.locator('#advanced').evaluate(el=>el.open=true);await p.locator('#focusX').fill('45');await p.locator('#focusY').fill('52');
 for(const width of [320,390]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await p.screenshot({path:`${dir}/mobile.png`,fullPage:true});
 await p.goto('about:blank');await p.goto(url+'#t=cat&c=再摸一下');await p.waitForFunction(()=>document.querySelector('#face-status').textContent.includes('已定位'));assert.equal(await p.locator('[data-template=cat]').getAttribute('aria-pressed'),'true');assert.deepEqual(errors,[]);
 console.log('PASS: 4 actual uploaded-photo pet GIFs, retired modes removed, custom switch, focus adjustment, mobile and shared links');
}finally{await b.close();}
