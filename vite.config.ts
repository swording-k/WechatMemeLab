import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',server:{proxy:{'/api/ai':'http://127.0.0.1:8787'}},build:{rollupOptions:{input:{main:resolve('index.html'),video:resolve('video.html'),ai:resolve('ai.html'),feedback:resolve('feedback.html')}}}});
