import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// 公开站构建照片整活、视频表情、反馈，以及 AI 创作（内测）和账户页。AI 页需要微信账户
// 登录或朋友内测邀请码，不代表对所有人开放生成；账户/支付仍按 README 的边界说明。
const input={main:resolve('index.html'),video:resolve('video.html'),feedback:resolve('feedback.html'),motion:resolve('motion.html'),account:resolve('account.html')};
export default defineConfig({base:'./',server:{proxy:{'/api/motion':process.env.MOTION_BACKEND_URL||'http://127.0.0.1:8790'}},build:{rollupOptions:{input}}});