export function modeNav(active:'photo'|'video'|'ai') {
 const base=import.meta.env.BASE_URL;
 return `<nav class="mode-nav" aria-label="选择制作方式"><a href="${base}" ${active==='photo'?'aria-current="page"':''}><span class="mode-symbol" aria-hidden="true">▧</span><span><strong>照片整活</strong><small>贴贴、变形，整蛊熟人</small></span></a><a href="${base}video.html" ${active==='video'?'aria-current="page"':''}><span class="mode-symbol" aria-hidden="true">▷</span><span><strong>视频表情</strong><small>截片段、加字、转 GIF</small></span><span class="mode-new">新</span></a><a href="${base}ai.html" ${active==='ai'?'aria-current="page"':''}><span class="mode-symbol" aria-hidden="true">✦</span><span><strong>AI 创作</strong><small>描述动作，演成表情</small></span></a></nav>`;
}
