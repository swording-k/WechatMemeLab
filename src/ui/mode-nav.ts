import './mode-nav.css';
// 四个入口：照片、视频、AI 创作（内测，需登录或邀请码）和账户。账户页同时服务网页登录。
export function modeNav(active:'photo'|'video'|'motion'|'account') {
 const base=import.meta.env.BASE_URL;
 return `<nav class="mode-nav" aria-label="选择制作方式"><a href="${base}?v=mobile-20261030" ${active==='photo'?'aria-current="page"':''}><span class="mode-symbol" aria-hidden="true">▧</span><span><strong>照片整活</strong><small>贴贴、变形，整蛊熟人</small></span></a><a href="${base}video.html?v=mobile-20261030" ${active==='video'?'aria-current="page"':''}><span class="mode-symbol" aria-hidden="true">▷</span><span><strong>视频表情</strong><small>截片段、加字、转 GIF</small></span><span class="mode-new">新</span></a><a href="${base}motion.html?v=mobile-20261030" ${active==='motion'?'aria-current="page"':''}><span><strong>AI 表情创作</strong><small>生图、改图，再让它动起来 · 内测</small></span></a><a href="${base}account.html?v=mobile-20261030" ${active==='account'?'aria-current="page"':''}><span><strong>我的账户</strong><small>登录、点数与订单</small></span></a></nav>`;
}
export function siteHeader(){const base=import.meta.env.BASE_URL;return `<header class="site-header app-header"><a class="brand" href="${base}?v=mobile-20261030" aria-label="怪相馆首页"><img src="${base}favicon.svg" alt="" width="28" height="28"><strong>怪相馆</strong></a><nav class="header-links" aria-label="帮助与反馈"><a href="${base}#usage">使用教程</a><a href="${base}feedback.html">反馈</a></nav></header>`;}
