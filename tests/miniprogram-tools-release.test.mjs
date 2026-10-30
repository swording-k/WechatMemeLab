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
test('tools account keeps website guidance and recharge without enabling native AI',()=>{
 const view=readFileSync('miniprogram/pages/account/index.wxml','utf8');assert.match(view,/复制网页版网址/);assert.match(view,/确认登录网页版/);assert.match(view,/确认充值/);assert.match(view,/可用点数/);
});
