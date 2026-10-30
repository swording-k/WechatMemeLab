import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('tools package exposes no AI page and excludes its implementation from upload',()=>{
 const app=JSON.parse(readFileSync('miniprogram/app.json')),project=JSON.parse(readFileSync('miniprogram/project.config.json'));
 assert.equal(app.pages.includes('pages/motion/index'),false);
 assert.ok(project.packOptions.ignore.some(x=>x.type==='folder'&&x.value==='pages/motion'));
 assert.ok(project.packOptions.ignore.some(x=>x.type==='file'&&x.value==='lib/motion-api.js'));
 let nav;vm.runInNewContext(readFileSync('miniprogram/components/mode-nav/index.js','utf8'),{Component:x=>nav=x});
 assert.deepEqual(Array.from(nav.data.items,x=>x.id),['editor','video','account']);
});
test('tools account does not request payment even when server enables payments',async()=>{
 let page,calls=[];vm.runInNewContext(readFileSync('miniprogram/pages/account/index.js','utf8'),{Page:x=>page=x,require:()=>({request:async op=>{calls.push(op);return op==='me'?{account:{id:'real'},payments:{enabled:true},wallet:{available:200}}:{orders:[]}}})});
 const p={...page,data:{...page.data},setData(x){Object.assign(this.data,x)}};await p.onShow();assert.equal(p.data.account.id,'real');assert.equal(typeof p.purchase,'undefined');assert.deepEqual(calls,['me','orders']);
 const view=readFileSync('miniprogram/pages/account/index.wxml','utf8');assert.doesNotMatch(view,/充值创作|确认充值|可用点数/);assert.match(view,/复制网页版网址/);assert.match(view,/确认登录网页版/);
});
test('tools account rejects new checkout before obtaining a session or making a network request',async()=>{
 let sessions=0,requests=0;const context={module:{exports:{}},require:()=>({getSession:async()=>{sessions++;return'token'}}),wx:{request:()=>{requests++}}};vm.runInNewContext(readFileSync('miniprogram/lib/account-api.js','utf8'),context);await assert.rejects(context.module.exports.request('pay-prepare',{}),/工具版/);assert.equal(sessions,0);assert.equal(requests,0);
});
