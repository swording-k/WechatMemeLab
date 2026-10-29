# meme-motion-api

独立的AI动作编排函数，复用server/motion/provider.mjs和meme-feedback/security-core.cjs。客户端不持有模型Key、AppSecret或存储永久凭据。

## 构建及部署

仓库根目录运行npm ci、npm run build:motion-cloud。函数运行Node.js20，入口index.main，安装本目录package-lock.json中的依赖。当前部署到用户授权的既有CloudBase环境；不修改其他项目函数。

服务端环境变量：DASHSCOPE_API_KEY、DASHSCOPE_BASE_URL、MEME_SECURITY_SECRET、MOTION_BUDGET_CNY、MOTION_MAX_JOBS。已有生成成本可用MOTION_BASE_COUNT、MOTION_BASE_COST作为初始账本基线，不能重置旧成本；额度不是支付余额。密钥只在云端环境或被忽略的私有本地配置保存。

HTTP路径/meme-motion-api；health为只读公开探针，config/prepare/create/query/result只接受POST及现有微信登录会话。照片和prompt须匹配微信检测凭证及当前用户；文件名固定于用户散列/任务ID目录。预算与任务认领使用数据库事务，未知提交不重试模型。

需要两张独立集合meme_motion_jobs、meme_motion_quota，以及meme-motion/存储前缀。30分钟定时入口先对账活动任务，再清理24小时过期素材。输入在模型提交后清理，成片按任务归属下载。

小程序request需允许函数域名与现有COS存储域名；uploadFile/downloadFile也配置相同COS域名。SDK3.18签名使用PUT原始二进制及签名头，不可改成旧版POST表单；下载使用COS_URL签名GET，不用HEAD探测判定GET不可用。

## 运行与发布边界

自动测试不调用付费模型。开发者工具可以验证真实登录/上传/下载与视频工作台交接；其VideoDecoder限制不能代替手机GIF导出验收。支付与广告未启用，未将测试账本包装成用户充值系统。

内测取消额度限制：仅由服务端环境变量MOTION_TEST_UNLIMITED=true开启；同时跳过累计金额与次数门槛，config返回budgetEnforced=false、remaining=null。缺省保持限制，不能由请求参数开启。历史cost/count仅继续记录调用估算，不冻结模型账户余额，不作为产品钱包。身份校验、素材检测、任务归属与幂等/进行中任务互斥保持有效。

## 网页入口

服务端设置 `MEME_WEB_INVITE_CODE`（至少24位随机值）和 `MEME_WEB_ORIGINS`（精确Origin逗号分隔，例如 `https://swording-k.github.io`）后启用 `web-*` 操作，均为POST。邀请登录签发专用Web会话；正式账户登录使用 `account-session`（`resolveAccount`），网页与小程序共用同一账户。没有邀请配置时关闭邀请入口，但正式账户会话仍可用。

免费CloudBase套餐无法通过`tcb cors add`新增安全域名（`CreateAuthDomain`返回“当前套餐无法执行此操作”），因此函数入口自行处理浏览器`OPTIONS`预检：允许的来源返回204及CORS响应头，其他来源返回403。新增网页域名时必须同步更新`MEME_WEB_ORIGINS`，否则实际请求也会被403。

签名PUT直传使用COS。COS桶CORS必须包含网页来源，否则预检403、上传失败；可用COS SDK的`getBucketCors`/`putBucketCors`读取现有规则后追加，保留其他规则。本次已加入`https://swording-k.github.io`。小程序request需允许函数域名与现有COS存储域名；uploadFile/downloadFile也配置相同COS域名。

网页生产构建默认连接本函数（`src/motion/main.ts`的PROD分支），本地开发仍用`/api/motion`回环代理；可用公开的`VITE_MOTION_CLOUD_ENDPOINT`覆盖，不能把模型Key放入任何VITE变量。实际发布与回归证据见 `docs/2026-10-29-网页AI创作上线.md`。
