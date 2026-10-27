# 实证与发现

## 2026-10-26 小程序AI移植

- 当前web motion后端只监听127.0.0.1，不能作为手机或线上小程序服务。
- 原生app仅editor/video/feedback三个页面；Wan客户端和云函数尚无。
- 现有反馈内容安全会话可验证OpenID。新AI函数使用相同会话签名密钥，任务必须绑定uid，输入照片/提示词检测凭证必须绑定实际内容。
- CloudBase已有共享环境和Node20方案，新增独立meme-motion-api、meme_motion_*集合和meme-motion/存储前缀；不触碰FitGenius业务。
- 云函数请求/响应限制不允许沿用35MB POST与80MB直出。优先官方存储直传；原生上传/下载域名如未配置需用户补一次。
- 成熟替代：image-size@2.0.4和mp4box@2.5.0，可验证图片、MP4元数据，避免在函数内调用未安装的ffprobe。
- CloudBase认证文件还在，旧部署CLI/私有config已删除。密钥变量文件仍在主目录，读取只输出变量名。

- 当前源码只对局部像素膨胀或扭曲，手动中心，没有人脸识别；取景会裁去长图边缘。
- 先前九个矩形照片位移动画未通过用户审美验收，不应恢复成主打效果。
- PetPet参考的价值是手和主体的接触、受压与回弹、写真手部和人物照片的拼贴反差，不是白色背景或模板数量。
- Google MediaPipe官方Web文档：FaceDetector支持人脸框及六个关键点（眼、鼻、嘴、耳侧），提供IMAGE模式；detect同步，可放入Worker避免阻塞。资料：https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js ，2026-10-09核查。
- 模型与WASM部署在本站可保证照片不送到第三方服务；自动定位结果仍需用户修正，不能承诺任意图片都正确识别。

本轮实测：classic Web Worker + 同源MediaPipe脚本/WASM可正常运行；虚构人物示例识别为1张脸，置信度约0.917，返回六个关键点。9:16上部主体和横图偏侧主体的取景坐标已用核心测试验证。原创手部PNG具备真实alpha通道（0到255），不是黑底图。

UI实际截图发现原大照片超出预览舞台，已扩大舞台并给提示留空间。手机完整页面截图出现重复页头的拼接现象，须用可见视口、DOM数量和滚动检查区分截图异常与实际布局，不直接以该截图声称移动端已验证。

最终浏览器检查：此前手机全页重复截图是捕获/拼接异常，DOM仅一个页头，视口及滚动正常。静态UI截图、真实六种GIF和第二脸型无字版本已审查；不能替代用户审美认可。

GIF差分帧被独立解码器逐像素验证，新增、保留及删除/恢复均正确。透明手部接触与人物变形共用时间线。GIF 240px实测约476至846 KiB，480px更大，实际客户端限制尚未测。

官方BlazeFace短距模型卡明示Apache2许可，同源分发附许可原文。首次定位需要下载约12MiB WASM；模型载入失败仍能手动制作和导出。

线上额外观察到同源 `/cdn-cgi/challenge-platform/` POST，属于托管层注入的Cloudflare JavaScript检测；应用请求与托管请求分开记录，不能宣称整页绝无POST。公开匿名真实上传/定位/下载和独立GIF解码均通过。

本轮真实接口修正：当前@cloudbase/node-sdk 3.18.3生成的是PUT签名，不是2.11旧版POST表单。原生改为wx.request PUT原始ArrayBuffer，并验证真实COS返回200。getTempFileURL默认返回tcb.qcloud.la，SDK类型明确支持urlType=COS_URL，需指定以复用用户已配置的COS下载域名。新CLI路由命令不支持系统域名，官方CreateCloudBaseGWAPI已创建仅meme-motion-api路径。


2026-10-27收尾：新SDK临时上传凭证对应PUT，并非旧版本POST表单；COS_URL生成的签名绑定GET，HEAD可返回403，真实GET已200并读取2,909,953字节MP4。用户合法域名更新后原生wx.request PUT及wx.downloadFile均成功，无需关闭域名校验。相同样本进入视频编辑页：duration=2、caption=我没笑、无原生异常。独立审查发现的任务锁/恢复问题均已有回归和修复。


2026-10-27扩展：Wan2.6图像接口必须使用image-generation/generation异步messages协议，成功图URL读取choices[].message.content[].image，n显式1。文生图1280平方起步，不能套1024；编辑用1K。北京生图/改图0.20元，现有2秒无声动作0.30元，组合原始模型费用0.50元，不能统一按0.50元卖组合。用户谈“开发者不限额”是在讨论产品余额，供应商实测预算须单独明确。既有wx.login可识别用户，但不表示余额/支付已存在。

2026-10-27公网入口诊断：正式Pages仅main推送发布，当前AI分支未更新；网页仍走本机/api/motion代理，云端只有微信会话协议，因此只上传HTML不可用。CloudBase静态托管online、meme-lab-test目录空；现静态Origin对函数OPTIONS204、COS PUT OPTIONS200，不需改FitGenius全局CORS。采用现有CLI hosting deploy dist meme-lab-test --safe --verify，发布独立测试目录；默认测试域名可能有确认访问中间页，正式域名后续单独配置。

首次公网浏览器验证发现CloudBase确认访问中间页会去掉URL片段，#invite直接链接首次丢失邀请信息。改为同目录try-<邀请码>.html静态入口，邀请码从保留的文件路径读取；仅dist生成该入口，不将邀请码写入源码或提交仓库。通过后仍有普通motion.html手动邀请码兜底。
