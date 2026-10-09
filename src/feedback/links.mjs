export function feedbackLinks({type='bug',title='',detail='',device=''}={}){
 title=title.trim();detail=detail.trim();device=device.trim();
 if(!title||!detail||title.length>80||detail.length>1500||device.length>120)throw new Error('请填写标题和描述，并留意字数限制。');
 const kind=type==='idea'?'玩法建议':type==='other'?'其他反馈':'使用问题';
 const subject=`[${kind}] ${title}`;
 const body=`### ${kind}\n${detail}\n\n### 设备与浏览器\n${device||'未填写'}\n\n---\n来自怪相馆网站反馈入口`;
 return {issue:`https://github.com/swording-k/WechatMemeLab/issues/new?${new URLSearchParams({template:'feedback.yml',title:subject,detail,device})}`,email:`mailto:swordingk@gmail.com?${new URLSearchParams({subject,body}).toString().replace(/\+/g,'%20')}`};
}
