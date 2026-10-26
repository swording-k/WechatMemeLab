import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',server:{proxy:{'/api/motion':process.env.MOTION_BACKEND_URL||'http://127.0.0.1:8790'}},build:{rollupOptions:{input:{motion:resolve('motion.html'),main:resolve('index.html'),video:resolve('video.html'),feedback:resolve('feedback.html')}}}});
