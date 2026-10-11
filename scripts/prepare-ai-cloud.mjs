import {mkdir,copyFile} from 'node:fs/promises';
const target=new URL('../cloudfunctions/meme-ai/lib/',import.meta.url);await mkdir(target,{recursive:true});for(const name of ['minimax.mjs','cloud-jobs.mjs','cloud-http.mjs','video-media.mjs'])await copyFile(new URL('../server/'+name,import.meta.url),new URL(name,target));console.log('AI cloud bundle prepared; no credentials included.');
