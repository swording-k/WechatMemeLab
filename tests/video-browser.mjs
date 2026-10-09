import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='work/video-qa';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({acceptDownloads:true});const errors=[],requests=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.VIDEO_URL||'http://127.0.0.1:5173/video.html');
 const bytes=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=180;c.height=320;const ctx=c.getContext('2d');
  const stream=c.captureStream(20),r=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
  r.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>r.onstop=resolve);r.start();
  for(let i=0;i<30;i++){ctx.fillStyle='#435a88';ctx.fillRect(0,0,180,320);ctx.fillStyle='#d9ed7f';ctx.fillRect(10+i*4,80,40,60);ctx.fillStyle='white';ctx.font='30px sans-serif';ctx.fillText(String(i),70,200);await new Promise(r=>setTimeout(r,50));}
  r.stop();await done;stream.getTracks().forEach(t=>t.stop());return Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));
 });
 await writeFile(`${dir}/source.webm`,new Uint8Array(bytes));
 await page.locator('#file').setInputFiles(`${dir}/source.webm`);
 await page.waitForFunction(()=>!document.querySelector('#export').disabled,{timeout:20000});
 await page.locator('#play').click();await page.waitForTimeout(350);assert.ok(Number(await page.evaluate(()=>document.querySelector('#time').textContent.split(' / ')[0]))>0);await page.locator('#play').click();
 const bounds=await page.locator('#preview').boundingBox();await page.mouse.click(bounds.x+bounds.width*.25,bounds.y+bounds.height*.35);assert.ok(Number(await page.locator('#tx').inputValue())<.3);
 await page.locator('#start').fill('0.2');await page.locator('#end').fill('1.2');await page.locator('#text').fill('我真的没事');
 for(const mode of ['forward','reverse','bounce']){
  await page.locator(`[data-mode="${mode}"]`).click();
  const download=page.waitForEvent('download');await page.locator('#export').click();await (await download).saveAs(`${dir}/${mode}.gif`);
  await page.waitForFunction(()=>!document.querySelector('#export').disabled);assert.ok((await page.locator('#status').innerText()).includes('135 × 240'));
 }
 await page.locator('#ratio').selectOption('square');await page.locator('#text').fill('');
 const download=page.waitForEvent('download');await page.locator('#export').click();await (await download).saveAs(`${dir}/square.gif`);await page.waitForFunction(()=>!document.querySelector('#export').disabled);
 await page.locator('#end').fill('0.1');await page.locator('#export').click();assert.ok((await page.locator('#status').innerText()).includes('片段'));
 await page.locator('#end').fill('7');await page.locator('#export').click();assert.ok((await page.locator('#status').innerText()).includes('视频长度'));
 await page.locator('#end').fill('1.2');await page.locator('#export').click();await page.locator('#cancel').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('已取消'));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${dir}/mobile.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#file').setInputFiles({name:'broken.mp4',mimeType:'video/mp4',buffer:Buffer.from('broken')});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('无法读取'));
 assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(new URL(page.url()).origin)||url.startsWith('blob:')));console.log('Video browser verification passed: 3 presets, portrait/square export, cancel, errors, mobile');
}finally{await browser.close();}
