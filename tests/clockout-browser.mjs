import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=process.env.QA_DIR||'work/clockout';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/#t=clockout&s=0.75&c=%E4%BA%BA%E8%BF%98%E5%9C%A8%EF%BC%8C%E9%AD%82%E8%B5%B0%E4%BA%86');
 await page.waitForFunction(()=>document.querySelector('#face-status')?.textContent.includes('已定位'),null,{timeout:60000});
 await page.locator('[data-template=clockout]').click();
 assert.equal(await page.locator('#caption').inputValue(),'人还在，魂走了');

 for(const [name,file] of [['square',null],['portrait','public/sample-portrait.png']]){
  if(file){await page.locator('#file').setInputFiles(file);await page.waitForFunction(()=>document.querySelector('#face-status')?.textContent.includes('已定位'),null,{timeout:60000});}
  const download=page.waitForEvent('download');await page.locator('#export').click();await(await download).saveAs(`${dir}/${name}.gif`);
  await page.waitForFunction(()=>!document.querySelector('#export').disabled);
  if(name==='square'){await page.locator('#caption').fill('');const empty=page.waitForEvent('download');await page.locator('#export').click();await(await empty).saveAs(`${dir}/no-caption.gif`);await page.waitForFunction(()=>!document.querySelector('#export').disabled);await page.locator('#caption').fill('人还在，魂走了');}
 }
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`${dir}/mobile.png`,fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS local square / portrait / caption-free GIF exports and mobile layout');
}finally{await browser.close();}
