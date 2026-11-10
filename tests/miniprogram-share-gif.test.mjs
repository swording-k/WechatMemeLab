import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function client(name,wx){let page;vm.runInNewContext(readFileSync(`miniprogram/pages/${name}/index.js`,'utf8'),{Page:p=>page=p,wx,require:p=>require('../miniprogram/'+p.replace('../../','')),setTimeout,clearTimeout});return {...page,data:{...page.data,gifPath:'user/checked.gif'},setData(v){Object.assign(this.data,v)}};}
for(const name of ['editor','video']){
 test(`${name}: shares the generated GIF through the image menu without saving`,async()=>{
  const calls=[];const p=client(name,{showShareImageMenu:o=>{calls.push(o);o.success({});},saveImageToPhotosAlbum:()=>assert.fail('must not save'),shareFileMessage:()=>assert.fail('must not send a file')});
  await p.shareGif();assert.equal(calls.length,1);assert.equal(calls[0].path,'user/checked.gif');assert.equal(calls[0].needShowEntrance,false);
  p.data.gifPath='';await p.shareGif();assert.equal(calls.length,1);
  p.data.gifPath='user/checked.gif';p.data.busy=true;await p.shareGif();assert.equal(calls.length,1);
 });
 test(`${name}: cancelling image share never offers or sends a file`,async()=>{
  const p=client(name,{showShareImageMenu:o=>o.fail({errMsg:'showShareImageMenu:fail cancel'}),showModal:()=>assert.fail('cancel must be quiet'),shareFileMessage:()=>assert.fail('cancel must not forward')});await p.shareGif();
 });
 test(`${name}: unsupported image sharing sends a file only after explicit choice`,async()=>{
  let sent;const p=client(name,{showModal:o=>o.success({confirm:false}),shareFileMessage:o=>{sent=o;o.success({});}});await p.shareGif();assert.equal(sent,undefined);
  const q=client(name,{showModal:o=>{assert.match(o.content,/文件/);o.success({confirm:true});},shareFileMessage:o=>{sent=o;o.success({});}});await q.shareGif();assert.equal(sent.filePath,'user/checked.gif');assert.match(sent.fileName,/\.gif$/);
 });
 test(`${name}: image API failure offers fallback; file failure is reported`,async()=>{
  let error;const p=client(name,{showShareImageMenu:o=>o.fail({errMsg:'format unsupported'}),showModal:o=>o.success({confirm:true}),shareFileMessage:o=>o.fail({errMsg:'send failed'})});p.error=e=>{error=e};await p.shareGif();assert.match(error.errMsg,/send failed/);
 });
}
