import './style.css';
import '../ui/product-footer.css';
import {productFooter} from '../ui/product-footer';
import {feedbackLinks} from './links.mjs';
const base=import.meta.env.BASE_URL;
document.querySelector('#app')!.innerHTML=`<header><a href="${base}">← 回到怪相馆</a><a href="https://swording-k.github.io/#contact" target="_blank" rel="noopener noreferrer">联系作者 ↗</a></header><main><span class="eyebrow">一起把怪相馆做得更好玩</span><h1>有问题？有怪点子？<br>告诉我。</h1><p class="intro">做不出 GIF、保存遇到问题，或者想到一个好玩的玩法，都可以写在这里。</p><form id="feedback"><label>你想反馈什么<select name="type"><option value="bug">使用问题</option><option value="idea">玩法建议</option><option value="other">其他反馈</option></select></label><label>用一句话说说<input name="title" required maxlength="80" placeholder="例如：想要一个把脸揉成包子的玩法"></label><label>详细说说<textarea name="detail" required maxlength="1500" rows="7" placeholder="遇到了什么？怎么操作的？你希望是什么效果？"></textarea></label><label>设备与浏览器 <span>选填</span><input name="device" maxlength="120" placeholder="例如：iPhone / Safari / 微信内打开"></label><p class="note">下一步会打开 GitHub，需要登录后点击提交才会创建 Issue。反馈内容公开，请勿填写邮箱、手机号等私人信息。照片和视频不会自动附带。</p><button type="submit">前往 GitHub 提交反馈 ↗</button><p id="status" role="status"></p><div class="alternative"><strong>不想用 GitHub？</strong><p>也可以用邮件发给作者。邮件内容会带上上面填写的反馈；发送前还可以修改。</p><button type="button" id="email">用邮件发送</button><a href="mailto:swordingk@gmail.com">swordingk@gmail.com</a><small>邮件反馈不会自动创建公开 Issue。</small></div></form><a class="history" href="https://github.com/swording-k/WechatMemeLab/issues" target="_blank" rel="noopener noreferrer">看看已有的问题与建议 ↗</a></main>${productFooter()}`;
const form=document.querySelector<HTMLFormElement>('#feedback')!;
function links(){const data=new FormData(form);return feedbackLinks({type:String(data.get('type')),title:String(data.get('title')),detail:String(data.get('detail')),device:String(data.get('device'))});}
function go(channel:'issue'|'email'){
 if(!form.reportValidity())return;
 try{const url=links()[channel];if(channel==='issue'&&url.length>7500)throw new Error('反馈较长，请缩短描述，或选择邮件发送。');try{sessionStorage.setItem('meme-feedback-draft',JSON.stringify(Object.fromEntries(new FormData(form))));}catch{}location.assign(url);}catch(error){document.querySelector('#status')!.textContent=error instanceof Error?error.message:'请检查反馈内容';}
}
form.onsubmit=e=>{e.preventDefault();go('issue');};
document.querySelector<HTMLButtonElement>('#email')!.onclick=()=>go('email');
try{const draft=JSON.parse(sessionStorage.getItem('meme-feedback-draft')||'null');if(draft)for(const key of ['type','title','detail','device']){const field=form.elements.namedItem(key) as HTMLInputElement;if(typeof draft[key]==='string')field.value=draft[key];}}catch{}
