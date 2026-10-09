import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',build:{rollupOptions:{input:{main:resolve('index.html'),video:resolve('video.html'),feedback:resolve('feedback.html')}}}});
