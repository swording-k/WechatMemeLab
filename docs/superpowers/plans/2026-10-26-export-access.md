# 可选导出额度实现计划

**目标：**当前保持免费，后续可启用每天三次＋激励视频解锁一次。
**架构：**独立本机额度账本、页面独立的微信广告适配、照片/视频公共接入方法。AI付费账本不混用。
**技术：**现有CommonJS小程序、Node行为测试、官方RewardedVideoAd，无新依赖。

- [x] `tests/export-access.test.mjs`：先验证默认关闭不读写、三次合计、失败释放、跨日、奖励重试和一次性提交；运行观察功能缺失失败。
- [x] `miniprogram/lib/export-ledger.js`：实现北京自然日、持久化次数和奖励、单个并发预留；提交后计数，释放不计数。
- [x] `tests/rewarded-video.test.mjs`与`miniprogram/lib/rewarded-video.js`：以官方事件合同验证完整观看、提前关闭、undefined、重复回调、load/show失败、取消销毁；展示后等onClose，不能把show成功当奖励。
- [x] `miniprogram/config/export-policy.js`与`miniprogram/lib/export-access.js`：默认关闭，配置校验，额度提示、用户确认、页面生命周期。
- [x] 接入`miniprogram/pages/editor/index.js`、`miniprogram/pages/video/index.js`及WXML：生成前取资格，写文件成功后提交，任何失败释放；保存不重复计数。额度关闭时不展示新控件。
- [x] `tests/miniprogram-export-access.test.mjs`：运行真实两页方法，验证默认免费、拦截后不开始检测/编码、成功提交与失败释放。完整测试、共享引擎和网页构建。
- [x] 记录实际完成、限制和后续需要的配置，提交分支；不自动提审、部署或收费。
