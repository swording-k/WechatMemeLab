# 怪相馆 · WechatMemeLab

公开试玩：[怪相馆 · GitHub Pages](https://swording-k.github.io/WechatMemeLab/)。

源代码：[swording-k/WechatMemeLab](https://github.com/swording-k/WechatMemeLab)。原 ChatGPT Sites 入口保留为备用；网络可达性需在用户实际网络上确认。

上传自己或朋友的照片，捏、拉、揉出聊天里的怪相，下载循环 GIF。人物照片铺满画面，动作改变局部像素，背景外缘保持固定。

照片工作台有 **14 种预设＋自由捏图**。预设包括捏、拉、揉、贴玻璃、吸走理智、融化、漏气，以及被消息震飞、脸先破防、挤进屏幕和灵魂出窍。自由捏图支持局部拉拽、鼓起、缩小、多步叠加、撤销清空，并将自己的变形导出为循环 GIF。

页面顶部可切换 **照片整活／视频表情**。视频工作台支持最长 6 秒片段、原片／来回／倒放三种起点、文字位置、速度、原比例或方形取景及 GIF 导出。视频只在本机解码和处理，浏览器无法解码的素材需换成兼容 MP4；GIF 不含声音。

## 使用

1. 上传 PNG/JPG/WebP（≤10 MB），或选择两个虚构人物示例。
2. 本地自动定位人脸并调整取景；合照可以选择目标。识别失败仍可点照片或用滑条手动修正。
3. 选玩法，按需调整短句、文字位置／字号／颜色／样式、力度、速度和取景；短句可留空。
4. 下载 240/320/480px GIF。支持文件分享的设备会额外显示分享按钮。
5. 预设可复制玩法链接让朋友用自己的照片做同样动作。链接只带玩法、文字、力度和速度，不含照片或人脸坐标。自由捏图不复制草稿链接，可直接分享导出的 GIF。

照片不会上传服务器，不存入浏览器持久存储。人脸模型和 WebAssembly 均从本站加载，在后台线程执行。首次加载定位模型需要网络；失败不会阻止手动制作。无需账号、无水印。

## 本地运行和验证

需要 Node.js 22.12+、已安装的 Chrome。

```sh
npm ci
npm run dev
```

另一个终端运行：

```sh
npm test
npm run build
npm run test:browser
npm run test:effects
npm run test:chat-effects
npm run test:sculpt
npm run test:video
npm run test:caption
```

`npm run preview` 检查生产构建，`TEST_URL=http://127.0.0.1:4173/ npm run test:browser` 可在生产预览上运行相同流程。浏览器测试涵盖六种下载、竖图/横图/合照定位、第二脸型无字版本、错误恢复、手动定位降级、键盘、减少动态偏好、参数链接和手机布局。临时文件位于忽略的 `work/qa/`。

可选独立 GIF 解码（Python + Pillow）：

```sh
python3 scripts/verify-gifs.py work/qa/*-release.gif work/qa/portrait-*.gif
```

## 结构

- `src/ui/`：工作台页面；`src/main.ts`：输入、预览和分享状态。
- `src/photo/`、`public/face-worker.js`：本地人脸定位与取景投影。
- `src/render/`：动作时序、局部逆向像素映射、手部接触和文字；预览/导出共用。
- `src/export/`：Worker 渲染、共享调色板、重复帧合并及差分区域 GIF 编码。gifenc 固定为 1.0.3。
- `src/video/`：本地视频片段采样、字幕渲染和矩形 GIF 导出。
- `src/share/`：玩法参数校验；不序列化照片或取景信息。
- `public/licenses/`：第三方许可；原创素材来源见 `docs/素材来源.md`。

## 实际边界

自动检测针对清晰人脸，侧脸、遮挡、远处小脸、宠物和插画可能识别不出；允许人工修正。不自动抠图、不重建人物表情，也不提供双人分别上传合成。GIF 最多 256 色，照片有色彩损失；透明 PNG 会合成到所选背景，不输出透明 GIF。

微信/抖音的发送和收藏需要在真实客户端确认；不宣称直接拖拽、自动加入收藏或收藏同步。浏览器视口检查不等于真实手机兼容性验收。技术验证和发布不证明用户喜欢或会广泛传播。

详情：[开发计划](docs/开发计划.md)、[效果标准](docs/效果设计标准.md)、[验证记录](docs/验证记录.md)、[项目约定](AGENTS.md)。

## GitHub Pages 发布

`.github/workflows/pages.yml` 在 main 代码推送后自动测试、构建并部署 dist。静态资源及本地识别人脸的 Worker 支持项目子路径；无需运行开发者电脑。2026-10-09 首次构建与部署成功，发布代码提交 `2ef787d`。


## 源码、作者和反馈

两个工作台的页脚提供 GitHub 源码、问题与建议、作者主页入口；页头也可直接进入反馈渠道。

- 源码：https://github.com/swording-k/WechatMemeLab
- 站内反馈：`feedback.html`。填写后可前往 GitHub 提交 Issue，或使用邮件发送；两者是独立渠道。
- 截图与 GIF：GitHub 反馈表单有独立附件上传区，支持 JPG/PNG/GIF/WebP，每张最大 10 MB。站内填写的文字会带入表单；截图在 GitHub 中上传。邮件反馈需在邮件应用内附图。
- Issue 模板默认指派作者。邮件通知取决于 GitHub 账户的通知设置；当前未验证实际收信。
- 验证反馈流程：`node tests/feedback-browser.mjs`。
- 作者个人主页：https://swording-k.github.io/#contact
