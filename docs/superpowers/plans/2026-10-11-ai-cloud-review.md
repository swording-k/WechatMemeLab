# AI 云端内测与 GIF 编辑 Implementation Plan

**Goal:** 在 codex/minimax-ai-creation 分支完成可检查的 AI 创作，保持正式网站不发布新功能。

**Architecture:** 复用已确认的照片/文字生成玩法和 MiniMax 接口，CloudBase 独立函数与事务账本代替本地文件账本。浏览器继续承担字幕、片段编辑与 GIF 编码。收费请求必须有预算，公网接口必须持有内测口令。

**Tech Stack:** TypeScript、Node、CloudBase 事务与存储、MiniMax、Canvas、IndexedDB。

- [x] 增加跨实例事务任务服务测试：相同 ID 只调用一次、总额度原子预留、活动任务互斥、断线不重试收费请求。
- [x] 实现 server/cloud-jobs.mjs，与现有 create/query/video/info 契约兼容。建立独立 meme_ai_jobs/meme_ai_budget 集合。
- [x] 增加云端 HTTP 适配与鉴权测试，封装独立云函数。生成图片输入用二进制请求；结果视频按受控小段读取，适配网关体积限制。
- [x] 改进 AI 页面：明确完全自定义、可编辑玩法、真实额度与任务恢复、云端视频直接进入 GIF 工作台。
- [x] 运行单元、构建、浏览器和真实 CloudBase 免费探针；真实收费样片仍等用户确认预算，尚未执行。
- [x] 推送功能分支并提供本地入口及准确验证记录，待用户检查后合并发布。

验收：用户能从首页找到 AI 创作，照片/文字/自定义动作清楚；后端密钥不进前端；失败保留输入；同任务恢复不重复计费；真实结果可播放、编辑并导出 GIF。模拟素材不标成 AI 样片。

- [ ] 用户确认预算后，执行真实文生/图生样片与 GIF 审美验收。
