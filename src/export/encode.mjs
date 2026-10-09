import * as gifencModule from 'gifenc';
// Node resolves the CommonJS entry; Vite resolves the ESM entry.
const gifenc = typeof gifencModule.default === 'object' ? gifencModule.default : gifencModule;
const { GIFEncoder, quantize, applyPalette } = gifenc;

/** @param {Uint8Array[]} frames @param {number} size @param {number} delay @param {(progress: number) => void} onProgress @param {number} height */
export function encodeGif(frames, size, delay, onProgress = () => {}, height = size) {
  if (!frames.length || !Number.isInteger(size) || size < 1 || !Number.isInteger(height) || height < 1 || !Number.isFinite(delay) || delay < 10) throw new Error('Invalid GIF settings');
  for (const rgba of frames) if (rgba.length !== size * height * 4) throw new Error('Frame size mismatch');
  const samplesPerFrame = Math.min(4096, size * height);
  const samples = new Uint8Array(frames.length * samplesPerFrame * 4);
  frames.forEach((rgba, n) => {
    for (let j=0;j<samplesPerFrame;j++) {
      const offset=Math.floor(j * size * height / samplesPerFrame)*4;
      samples.set(rgba.subarray(offset,offset+4),(n*samplesPerFrame+j)*4);
    }
  });
  // One shared palette prevents per-frame color flicker and redundant color tables.
  const palette = quantize(samples, 256);
  const gif = GIFEncoder();
  const indexed=frames.map(rgba=>applyPalette(rgba,palette));
  let i=0,previous;
  while(i<indexed.length) {
    let end=i+1;
    while(end<indexed.length && equalFrames(indexed[i],indexed[end]))end++;
    const bounds=previous ? diffBounds(previous,indexed[i],size,height) : {x:0,y:0,w:size,h:height};
    const patch=new Uint8Array(bounds.w*bounds.h);
    for(let row=0;row<bounds.h;row++)patch.set(indexed[i].subarray((bounds.y+row)*size+bounds.x,(bounds.y+row)*size+bounds.x+bounds.w),row*bounds.w);
    const offset=gif.bytesView().length;
    gif.writeFrame(patch,bounds.w,bounds.h,{...(i===0 ? {palette} : {}),delay:delay*(end-i),repeat:0,dispose:1});
    if(previous) {
      // gifenc 1.0.3 emits GCE (8 bytes) then an image descriptor at (0,0).
      // Patch only its documented GIF descriptor position fields, not compressed data.
      const bytes=gif.bytesView(),descriptor=offset+8;
      if(bytes[descriptor]!==0x2c)throw new Error('Unexpected GIF descriptor');
      bytes[descriptor+1]=bounds.x&255;bytes[descriptor+2]=bounds.x>>8;
      bytes[descriptor+3]=bounds.y&255;bytes[descriptor+4]=bounds.y>>8;
    }
    previous=indexed[i];onProgress(end/indexed.length);i=end;
  }
  gif.finish();
  return gif.bytes();
}
function equalFrames(a,b) {
  for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false;
  return true;
}

function diffBounds(previous,current,size,height) {
  let x0=size,y0=height,x1=0,y1=0;
  for(let y=0;y<height;y++)for(let x=0;x<size;x++)if(previous[y*size+x]!==current[y*size+x]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  return x0===size ? {x:0,y:0,w:1,h:1} : {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
}
