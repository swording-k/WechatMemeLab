import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedbackLinks} from '../src/feedback/links.mjs';
test('feedback carries unicode and literal markdown safely to GitHub and email',()=>{
 const links=feedbackLinks({type:'idea',title:'捏捏 & 小猫?',detail:'你好\n# 建议 + 猫咪',device:'iPhone Safari'});
 const issue=new URL(links.issue);
 assert.equal(issue.searchParams.get('template'),'feedback.yml');
 assert.equal(issue.searchParams.get('title'),'[玩法建议] 捏捏 & 小猫?');
 assert.ok(issue.searchParams.get('detail').includes('你好\n# 建议 + 猫咪'));
 assert.ok(issue.searchParams.get('device').includes('iPhone Safari'));
 const mail=new URL(links.email);assert.equal(mail.pathname,'swordingk@gmail.com');
 assert.equal(mail.searchParams.get('subject'),issue.searchParams.get('title'));
});
test('empty and oversized feedback cannot create navigation links',()=>{
 for(const data of [{title:'',detail:'test'},{title:'x',detail:' '},{title:'x'.repeat(81),detail:'y'},{title:'x',detail:'y'.repeat(1501)}])assert.throws(()=>feedbackLinks(data));
});
