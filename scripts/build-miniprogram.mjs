import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('miniprogram/core',{recursive:true});
await build({stdin:{contents:`export {drawFrame} from './src/render/frame';export {defaults,templates,DURATION} from './src/render/types';export {encodeGif} from './src/export/encode.mjs';export {fitPhoto,photoPlacement,cropToSettings,faceToSettings} from './src/photo/geometry.mjs';export {moveCrop,resizeCrop,transformPhoto} from './src/ui/framing-geometry.mjs';export {gestureDelta} from './src/ui/layer-geometry.mjs';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'cjs',platform:'neutral',mainFields:['module','main'],target:'es2020',outfile:'miniprogram/core/engine.js',legalComments:'eof'});
// Optimized native assets are committed; do not overwrite them with full-size web assets.
console.log('小程序共享引擎已构建；在开发者工具导入 miniprogram 目录。');
