import {build} from 'esbuild';
await build({entryPoints:['cloudfunctions/meme-motion/entry.mjs'],bundle:true,platform:'node',format:'cjs',target:'node20',outfile:'cloudfunctions/meme-motion/index.js',external:['@cloudbase/node-sdk','image-size','mp4box'],legalComments:'eof'});
console.log('AI动作云函数已构建。');
