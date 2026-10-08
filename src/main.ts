import './style.css';
import { defaults, templates, type Settings } from './render/types';
import { drawFrame } from './render/frame';
import { exportGif } from './export/client';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector(selector)!;
const icon = (name: string) => {
  const paths: Record<string, string> = {
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
    download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    reset: '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
    play: '<path d="m9 5 11 7-11 7z"/>',
    pause: '<path d="M8 5v14m8-14v14"/>',
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
};

$('#app').innerHTML = `
  <header class="site-header"><a class="brand" href="/" aria-label="表情包工坊首页"><img src="/favicon.svg" alt=""/><strong>表情包工坊</strong><span class="beta">BETA</span></a><a href="#usage" class="help-link">怎么使用 ${icon('arrow')}</a></header>
  <main>
    <div class="page-heading"><div><div class="eyebrow"><span></span> 今天的精神状态：</div><h1>把熟人，<em>做成离谱表情。</em></h1><p>上传自己或朋友的照片。把变形点放在脸上，试试鼓成大头、扭到嘴硬。</p></div><div class="local-note">${icon('lock')}<span>照片只在你的设备上处理<br/><b>不用登录，也不用上传服务器</b></span></div></div>
    <div class="workspace">
      <aside class="template-panel"><div class="panel-label"><span class="step">01</span><h2>先试这两个</h2></div><div class="template-list" role="group" aria-label="动画玩法">${templates.slice(0,2).map((t, i) => `
        <button class="template ${i === 0 ? 'selected' : ''}" data-template="${t.id}" aria-pressed="${i === 0}"><div class="template-art art-${t.id}"><canvas width="160" height="160" aria-hidden="true"></canvas><span class="template-tag">${t.tag}</span></div><div class="template-copy"><strong>${t.title}</strong><span>${t.subtitle}</span><i>${icon('arrow')}</i></div></button>`).join('')}</div><div class="template-note">先把变形点放对。<br/>长照片可在右侧调整取景。</div></aside>
      <section class="preview-panel" aria-labelledby="preview-title"><div class="preview-toolbar"><div class="panel-label"><span class="step">02</span><h2 id="preview-title">看看效果</h2></div><span class="live-badge"><i></i>实时预览</span></div><div class="preview-stage"><div class="sticker"><canvas id="preview" width="320" height="320" aria-label="动态表情预览，点击选择变形位置"></canvas></div><span class="stage-note">点照片，选择要变形的位置</span></div><div class="preview-bottom"><span id="active-name">憋成大头 <small>· 循环播放</small></span><button id="pause" class="icon-button" aria-label="暂停预览">${icon('pause')}</button></div><div class="export-area"><div class="export-options"><label for="size">导出尺寸</label><select id="size"><option value="240">240 × 240 · 小巧</option><option value="320" selected>320 × 320 · 推荐</option><option value="480">480 × 480 · 清晰</option></select></div><button id="export" class="download-button">${icon('download')}<span>下载 GIF 表情</span>${icon('arrow')}</button><progress id="progress" max="1" value="0" hidden aria-label="GIF 生成进度"></progress><div id="status" class="status" role="status" aria-live="polite">免费生成 · 无水印</div><a id="again" class="saved-link" hidden download>再次下载刚才的 GIF</a></div></section>
      <section class="settings-panel" aria-labelledby="settings-title"><div class="panel-label"><span class="step">03</span><h2 id="settings-title">换上你的照片</h2></div><label class="upload-zone" id="dropzone" for="file"><span class="upload-icon">${icon('upload')}</span><strong>点击上传，或把照片拖到这里</strong><span>PNG / JPG / WebP，最大 10 MB</span><input id="file" type="file" accept="image/png,image/jpeg,image/webp"/></label><div class="image-info"><span id="file-name">正在加载虚构人物示例…</span><button id="sample" type="button">用示例试试</button></div><label class="field-label" for="caption">最后补一刀 <span id="char-count">5 / 20</span></label><input id="caption" class="caption-input" type="text" maxlength="20" value="憋不住了" placeholder="也可以留空，让动作说话"/><div class="suggestions" aria-label="快捷文案"></div><div class="slider-label"><label for="intensity">发疯程度</label><output id="intensity-value">彻底疯了</output></div><input id="intensity" type="range" min="0.25" max="1" step="0.05" value="0.85"/><div class="slider-label"><label for="speed">动画速度</label><output id="speed-value">1×</output></div><input id="speed" type="range" min="0.5" max="2" step="0.25" value="1"/><div class="field-label">背景颜色</div><div class="swatches" role="group" aria-label="背景颜色">${[{ c: '#ffffff', n: '纯白' }, { c: '#fff8ed', n: '奶油白' }, { c: '#e7efdb', n: '浅绿' }, { c: '#f5dfe4', n: '浅粉' }, { c: '#dfe9f5', n: '浅蓝' }].map((s, i) => `<button class="swatch ${i === 0 ? 'active' : ''}" style="--swatch:${s.c}" data-color="${s.c}" aria-label="${s.n}" aria-pressed="${i === 0}"></button>`).join('')}<label class="custom-color" title="自定义背景颜色"><input type="color" id="background" value="#ffffff" aria-label="自定义背景颜色"/>＋</label></div><div class="focus-controls"><div class="field-label">变形位置 <span>点照片也能调整</span></div><label for="focusX">左右</label><input id="focusX" type="range" min="0" max="100" value="50"/><label for="focusY">上下</label><input id="focusY" type="range" min="0" max="100" value="50"/></div><details class="crop-details"><summary>照片取景与缩放<span>＋</span></summary><div class="crop-settings"><div class="slider-label"><label for="zoom">照片缩放</label><output id="zoom-value">1×</output></div><input id="zoom" type="range" min="1" max="2.5" step="0.05" value="1"/><label for="x">水平位置</label><input id="x" type="range" min="-100" max="100" value="0"/><label for="y">垂直位置</label><input id="y" type="range" min="-100" max="100" value="0"/><button id="reset" class="reset-button">${icon('reset')}重置照片位置</button></div></details><p class="privacy-tip">${icon('lock')}关闭页面后，照片不会保存在这里。</p></section>
    </div>
    <section class="usage" id="usage"><div><span class="eyebrow">做好了，怎么用？</span><h2>做完，丢进聊天里。</h2></div><ol><li><span>1</span><div><strong>下载 GIF</strong><p>得到一份保存在设备上的动图文件。</p></div></li><li><span>2</span><div><strong>在聊天软件中打开</strong><p>通过客户端支持的图片或表情入口添加。</p></div></li><li><span>3</span><div><strong>发给想逗的人</strong><p>发送、收藏方式以你使用的客户端为准。</p></div></li></ol><p class="usage-note">微信、抖音的发送与收藏方式需在各自客户端确认。本工具不提供收藏同步或自动导入。</p></section>
  </main><footer><span>表情包工坊 <span class="footer-dot">·</span> 熟人照片，离谱加工</span><span>原创动画 / 本地制作</span></footer>`;

let settings: Settings = { ...defaults };
let image: CanvasImageSource;
let uploadedBitmap: ImageBitmap | undefined;
let ready = false, busy = false, paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches, lastTime = 0, phase = 0, loadingSequence = 0;
let resultUrl = '';
let sampleImage: HTMLImageElement;
const preview = $<HTMLCanvasElement>('#preview');
const ctx = preview.getContext('2d')!;
const exportButton = $<HTMLButtonElement>('#export');
exportButton.disabled = true;
const captionPresets = { bulge: ['憋不住了', '你看我像正常吗', '就这样吧'], twist: ['嘴硬一下', '你再说一遍', '我没事啊'], zoom: ['啊？', '你再说一遍', '认真的吗'], melt: ['别催了！！', '我很好', '已读乱回'], rush: ['我来了！！', '还有这种好事', '让我看看'], cling: ['贴一下怎么了', '就要贴贴', '别躲啊'], peek: ['你在干嘛', '让我看看', '想我没'], kiss: ['啵！溜了', '偷亲一下', '不许追我'], creep: ['阴暗地爬过来', '扭曲，蠕动', '我又来了'], hop: ['略略略', '抓不到我', '诶嘿'], shy: ['啊啊不许看', '我先消失', '别说了别说了'] };
function updateCaption() { settings.caption = $<HTMLInputElement>('#caption').value; $('#char-count').textContent = `${settings.caption.length} / 20`; }
function updateSuggestions() {
  $('.suggestions').innerHTML = captionPresets[settings.template].map(text => `<button type="button">${text}</button>`).join('');
  $('.suggestions').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { $<HTMLInputElement>('#caption').value = button.textContent!; updateCaption(); }));
}
updateSuggestions(); updateCaption();
if (paused) { $('#pause').innerHTML = icon('play'); $('#pause').setAttribute('aria-label', '播放预览'); }
document.querySelectorAll<HTMLButtonElement>('[data-template]').forEach(button => button.addEventListener('click', () => {
  settings.template = button.dataset.template as Settings['template'];
  const t = templates.find(t => t.id === settings.template)!;
  document.querySelectorAll('[data-template]').forEach(el => { const active = el === button; el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active)); });
  $('#active-name').innerHTML = `${t.title} <small>· 循环播放</small>`;
  $<HTMLInputElement>('#caption').value = t.caption; updateCaption(); updateSuggestions(); phase = 0;
}));
$('#caption').addEventListener('input', updateCaption);
for(const key of ['focusX','focusY'] as const) $(`#${key}`).addEventListener('input',()=>{settings[key]=Number($<HTMLInputElement>(`#${key}`).value)/100;});
(['intensity', 'speed', 'zoom', 'x', 'y', 'size'] as const).forEach(key => {
  $(`#${key}`).addEventListener('input', () => {
    settings[key] = Number($<HTMLInputElement>(`#${key}`).value);
    if (key === 'speed' || key === 'zoom') $(`#${key}-value`).textContent = `${settings[key]}×`;
    if (key === 'intensity') $('#intensity-value').textContent = settings.intensity < 0.5 ? '还算正常' : settings.intensity > 0.8 ? '彻底疯了' : '有点离谱';
  });
});

function background(color: string) {
  settings.background = color; $<HTMLInputElement>('#background').value = color;
  document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b => { const active = b.dataset.color === color; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
}
document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b => b.addEventListener('click', () => background(b.dataset.color!)));
$('#background').addEventListener('input', () => background($<HTMLInputElement>('#background').value));
function resetPosition() {
  settings.zoom = 1; settings.x = 0; settings.y = 0;
  $<HTMLInputElement>('#zoom').value = '1'; $('#zoom-value').textContent = '1×';
  $<HTMLInputElement>('#x').value = '0'; $<HTMLInputElement>('#y').value = '0';
}
$('#reset').addEventListener('click', resetPosition);
$('#pause').addEventListener('click', () => { paused = !paused; $('#pause').innerHTML = icon(paused ? 'play' : 'pause'); $('#pause').setAttribute('aria-label', paused ? '播放预览' : '暂停预览'); });
function status(text: string, error = false) { $('#status').textContent = text; $('#status').classList.toggle('error', error); }
async function sample() {
  const seq = ++loadingSequence;
  try {
    if (!sampleImage) { sampleImage = new Image(); sampleImage.src = '/sample-person.png'; await sampleImage.decode(); }
    if (seq !== loadingSequence) return;
    uploadedBitmap?.close(); uploadedBitmap = undefined;
    image = sampleImage; ready = true; exportButton.disabled = busy;
    $('#file-name').textContent = '虚构人物示例'; 
    resetPosition(); status('免费生成 · 无水印');
  } catch { status('示例加载失败，请上传一张照片', true); }
}
$('#sample').addEventListener('click', () => void sample());
async function loadFile(file: File) {
  const seq = ++loadingSequence;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { status('请选择 PNG、JPG 或 WebP 图片', true); return; }
  if (file.size > 10 * 1024 * 1024) { status('图片超过 10 MB，请换一张较小的图片', true); return; }
  let source: ImageBitmap | undefined;
  try {
    source = await createImageBitmap(file);
    if (source.width * source.height > 40_000_000) throw new Error('图片像素过大，请缩小后再试');
    const ratio = Math.min(1, 1024 / Math.max(source.width, source.height));
    const bitmap = await createImageBitmap(source, { resizeWidth: Math.max(1, Math.round(source.width * ratio)), resizeHeight: Math.max(1, Math.round(source.height * ratio)), resizeQuality: 'high' });
    if (seq !== loadingSequence) { bitmap.close(); return; }
    uploadedBitmap?.close(); uploadedBitmap = bitmap; image = bitmap;
    ready = true; exportButton.disabled = busy; $('#file-name').textContent = file.name;
    
    resetPosition(); status('照片已准备好，可以下载啦');
  } catch (error) { if (seq === loadingSequence) status(error instanceof Error && error.message.includes('像素') ? error.message : '图片无法读取，请换一张有效图片', true); }
  finally { source?.close(); }
}
$('#file').addEventListener('change', () => { const input = $<HTMLInputElement>('#file'); if (input.files?.[0]) void loadFile(input.files[0]); input.value = ''; });
const dropzone = $('#dropzone');
['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', e => { const file = (e as DragEvent).dataTransfer?.files[0]; if (file) void loadFile(file); });
window.addEventListener('dragover', e => e.preventDefault()); window.addEventListener('drop', e => e.preventDefault());
let drag: { x: number; y: number; ox: number; oy: number } | null = null;
preview.addEventListener('pointerdown', e => { if(settings.template==='bulge'||settings.template==='twist') {const r=preview.getBoundingClientRect();settings.focusX=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));settings.focusY=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));$<HTMLInputElement>('#focusX').value=String(settings.focusX*100);$<HTMLInputElement>('#focusY').value=String(settings.focusY*100);return;} drag = { x: e.clientX, y: e.clientY, ox: settings.x, oy: settings.y }; preview.setPointerCapture(e.pointerId); });
preview.addEventListener('pointermove', e => {
  if (!drag) return;
  const scale = 320 / preview.getBoundingClientRect().width;
  settings.x = Math.max(-100, Math.min(100, drag.ox + (e.clientX - drag.x) * scale));
  settings.y = Math.max(-100, Math.min(100, drag.oy + (e.clientY - drag.y) * scale));
  $<HTMLInputElement>('#x').value = String(settings.x); $<HTMLInputElement>('#y').value = String(settings.y);
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => preview.addEventListener(name, () => { drag = null; }));

exportButton.addEventListener('click', async () => {
  if (busy || !ready) return;
  busy = true; exportButton.disabled = true;
  const snapshot = { ...settings };
  const label = exportButton.querySelector('span')!;
  label.textContent = '正在生成…'; $<HTMLProgressElement>('#progress').hidden = false; $<HTMLProgressElement>('#progress').value = 0;
  status('正在把照片加工成 GIF…');
  try {
    const blob = await exportGif(image, snapshot, p => { $<HTMLProgressElement>('#progress').value = p; label.textContent = `正在生成 ${Math.round(p * 100)}%`; });
    if (resultUrl) URL.revokeObjectURL(resultUrl); resultUrl = URL.createObjectURL(blob);
    const again = $<HTMLAnchorElement>('#again'); again.href = resultUrl; again.download = `表情包-${templates.find(t => t.id === snapshot.template)!.title}-${snapshot.size}.gif`; again.hidden = false;
    again.click(); status(`已生成 ${snapshot.size} × ${snapshot.size} · ${(blob.size / 1024).toFixed(0)} KB`);
  } catch (error) { status(error instanceof Error ? error.message : '生成失败，请重试', true); }
  finally { busy = false; exportButton.disabled = !ready; label.textContent = '下载 GIF 表情'; $<HTMLProgressElement>('#progress').hidden = true; }
});
const thumbnails = [...document.querySelectorAll<HTMLCanvasElement>('.template canvas')];
let lastPaint=0;
function animate(time: number) {
  const elapsed = lastTime ? Math.min(time - lastTime, 100) : 0; lastTime = time;
  if (!paused) phase = (phase + elapsed * settings.speed / 1200) % 1;
  if (ready && time-lastPaint>40) {
    lastPaint=time;
    drawFrame(ctx, image, settings, phase);
    thumbnails.forEach((canvas, i) => drawFrame(canvas.getContext('2d')!, image, { ...defaults, template: templates[i].id, caption: '', focusX:settings.focusX,focusY:settings.focusY, background: ['#edf0e3', '#f6e4e6', '#e3ebf3'][i % 3] }, phase));
  }
  requestAnimationFrame(animate);
}
window.addEventListener('pagehide', () => { uploadedBitmap?.close(); if (resultUrl) URL.revokeObjectURL(resultUrl); });
void sample(); requestAnimationFrame(animate);
