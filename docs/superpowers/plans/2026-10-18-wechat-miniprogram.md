# WeChat Mini Program Implementation Plan

**Goal:** 在微信开发者工具运行可编辑和导出 GIF 的原生体验版。
**Architecture:** 现有渲染器注入原生离屏画布；esbuild 输出单个 CommonJS 核心；原生 Page 管理 Canvas、触摸和本地文件。
**Tech Stack:** 微信原生 WXML/WXSS/JavaScript、Canvas 2D、现有 gifenc 和 esbuild。

- [x] 添加微信画布工厂适配验证，先失败，再注入工厂，保持网页默认行为。
- [x] 新增 scripts/build-miniprogram.mjs 和 miniprogram/，打包共享引擎与原创素材。
- [x] 原生编辑器：选择照片、完整/铺满、拖拽/双指缩放、变形中心、现有预设、自由捏图、文字、撤销重做。
- [x] 导出 240px/24 帧 GIF，错误反馈、文件预览、保存相册与权限拒绝恢复。
- [x] 运行既有测试/网页构建、小程序构建；开发者工具编译和预览，检查实际 GIF。
- [x] 使用真实 AppID 上传体验版（若尚未提供，保留该具体阻塞）；记录模拟器与真机验证的区别。

## 验证边界

已完成工具编译、真实预览包和开发版本上传；真机相册/聊天链路由用户扫码检查，未宣称通过。开发者工具首次启动超时后重新编译恢复；初次上传 appid missing，待自动化窗口初始化完毕后顺序重试成功。
