import * as gifencModule from 'gifenc';
// Node resolves the CommonJS entry; Vite resolves the ESM entry.
const gifenc = typeof gifencModule.default === 'object' ? gifencModule.default : gifencModule;
const { GIFEncoder, quantize, applyPalette } = gifenc;

/** @param {Uint8Array[]} frames @param {number} size @param {number} delay @param {(progress: number) => void} onProgress */
export function encodeGif(frames, size, delay, onProgress = () => {}) {
  if (!frames.length || !Number.isInteger(size) || size < 1 || !Number.isFinite(delay) || delay < 10) throw new Error('Invalid GIF settings');
  for (const rgba of frames) if (rgba.length !== size * size * 4) throw new Error('Frame size mismatch');
  const samplesPerFrame = Math.min(4096, size * size);
  const samples = new Uint8Array(frames.length * samplesPerFrame * 4);
  frames.forEach((rgba, n) => {
    for (let j=0;j<samplesPerFrame;j++) {
      const offset=Math.floor(j * size * size / samplesPerFrame)*4;
      samples.set(rgba.subarray(offset,offset+4),(n*samplesPerFrame+j)*4);
    }
  });
  // One shared palette prevents per-frame color flicker and redundant color tables.
  const palette = quantize(samples, 256);
  const gif = GIFEncoder();
  let i=0;
  while (i<frames.length) {
    let end=i+1;
    while (end<frames.length && equalFrames(frames[i],frames[end])) end++;
    gif.writeFrame(applyPalette(frames[i],palette),size,size,{...(i===0 ? {palette} : {}),delay:delay*(end-i),repeat:0});
    onProgress(end/frames.length);
    i=end;
  }
  gif.finish();
  return gif.bytes();
}
function equalFrames(a,b) {
  for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false;
  return true;
}
