import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// 公开站只构建照片整活、视频表情和反馈。motion.html / account.html 是 AI 内测与账户入口，
// 需要独立的云端地址和邀请码，不在 GitHub Pages 构建（详见 README 与 docs/2026-10-27-公网AI朋友测试版.md）。
const input={main:resolve('index.html'),video:resolve('video.html'),feedback:resolve('feedback.html')};
export default defineConfig({base:'./',server:{proxy:{'/api/motion':process.env.MOTION_BACKEND_URL||'http://127.0.0.1:8790'}},build:{rollupOptions:{input}}});