# WechatMemeLab · 表情包工坊

面向中文聊天场景的在线动态表情包制作工具。上传照片，选择动画模板，实时预览，下载 GIF。

首版已实现：突然怼脸、夸张拉扯、冲撞回弹三个照片搞怪玩法，图片上传/拖入、缩放和位置调整、中文短句、动画幅度/速度、背景颜色，以及 240/320/480px 循环 GIF 下载。照片在浏览器本地处理，不上传服务器，不提供微信/抖音收藏同步。

## 本地运行

需要 Node.js 22.12+（或兼容 Vite 7 的 Node.js 版本）。

```sh
npm ci
npm run dev
```

打开终端打印的本地地址。生产静态文件通过 `npm run build` 生成在 `dist/`，可部署到静态托管服务；`npm run preview` 可在本地检查构建结果。

## 验证

```sh
npm test
npm run build
# 保持开发服务器运行；默认使用已安装的 Chrome
npm run test:browser
```

浏览器测试覆盖实际 GIF 下载、图片上传、设置、错误恢复、播放控制及手机布局，并将临时结果写入被 Git 忽略的 `work/qa/`。可用 `TEST_URL` 指向生产构建的本地预览地址，用 `BROWSER_CHANNEL` 选择已安装的浏览器渠道。测试不读取用户聊天数据、不发送外部消息。

详细验证和剩余限制见 [验证记录](docs/验证记录.md)。

## 代码结构

- `src/main.ts`：制作工作台、图片输入与交互状态。
- `src/render/`：原创动作、裁切和文字，共用于预览与导出。
- `src/export/`：GIF 编码与 Worker，导出时冻结设置。
- `public/sample-person.png`：内置 imagegen 生成的虚构人物照片，来源和提示词见 `docs/素材来源.md`；`public/favicon.svg` 为本项目原创图标。
- `tests/`：GIF 结构测试和实际浏览器流程。

GIF 编码使用 MIT 许可的 [gifenc](https://github.com/mattdesl/gifenc)。GIF 颜色最多 256 色，照片导出后可能有色彩损失。首版不自动抠图，默认保留完整照片及原始长宽比例，手动缩放时可能裁去边缘；透明 PNG 的主体会合成到所选背景上；不输出透明背景 GIF。

## 项目资料

- [开发计划](docs/开发计划.md)
- [项目约定](AGENTS.md)

## 需求来源

2026-10-09 用户要求根据 ChatGPT 对话《微信表情包市场调研》制定计划并开发。

对话 ID：`6ac7b383-fe68-83ea-8eda-feaaf507a631`。

参考工具：https://petpetgenerator.com/index.html

原对话的调研正文在竞品表中截断；不能把后续声称的“完整 16 部分”视作已经取得的需求或证据。竞品规模、商业价值和微信客户端兼容性需要另行验证。
