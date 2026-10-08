import { test } from 'node:test';
import assert from 'node:assert/strict';

test('exports a looping multi-frame GIF with matching dimensions and delays', async () => {
  const { encodeGif } = await import('../src/export/encode.mjs');
  const frames = [0, 1, 2].map(n => {
    const rgba = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < rgba.length; i += 4) rgba.set([n * 100, 20, 50, 255], i);
    return rgba;
  });
  const data = encodeGif(frames, 16, 100);
  assert.equal(new TextDecoder().decode(data.slice(0, 6)), 'GIF89a');
  assert.equal(data[6] | data[7] << 8, 16);
  assert.equal(data[8] | data[9] << 8, 16);
  assert.ok(new TextDecoder().decode(data).includes('NETSCAPE2.0'));
  let controls = 0;
  for (let i = 0; i < data.length - 8; i++) {
    if (data[i] === 0x21 && data[i + 1] === 0xf9 && data[i + 2] === 4) {
      assert.equal(data[i + 4] | data[i + 5] << 8, 10);
      controls++;
    }
  }
  assert.equal(controls, 3);
  assert.equal(data.at(-1), 0x3b);
});

test('rejects mismatched frames rather than producing corrupt output', async () => {
  const { encodeGif } = await import('../src/export/encode.mjs');
  assert.throws(() => encodeGif([new Uint8Array(3)], 16, 100));
  assert.throws(() => encodeGif([], 16, 100));
});

test('merges consecutive held frames while retaining total playback duration', async () => {
  const { encodeGif } = await import('../src/export/encode.mjs');
  const a = new Uint8Array(16 * 16 * 4).fill(255);
  const b = a.slice(); b[0] = 0;
  const data = encodeGif([a, a.slice(), b, b.slice()], 16, 50);
  const delays=[];
  for (let i=0;i<data.length-8;i++) if (data[i]===0x21 && data[i+1]===0xf9 && data[i+2]===4) delays.push(data[i+4] | data[i+5]<<8);
  assert.deepEqual(delays,[10,10]);
});

test('encodes a changed pixel as an offset patch and retains the previous canvas', async()=>{
  const {encodeGif}=await import('../src/export/encode.mjs');
  const a=new Uint8Array(16*16*4);
  for(let i=3;i<a.length;i+=4)a[i]=255;
  const b=a.slice();b.set([255,255,255,255],(5*16+8)*4);
  const bytes=encodeGif([a,b],16,50);
  const descriptors=[];
  // Parse actual GIF blocks, skipping palette and LZW subblocks.
  let p=13+3*(1<<((bytes[10]&7)+1));
  while(p<bytes.length){
    const type=bytes[p++];
    if(type===0x3b)break;
    if(type===0x21){p++;while(bytes[p])p+=bytes[p]+1;p++;continue;}
    assert.equal(type,0x2c);
    const n=i=>bytes[p+i]|bytes[p+i+1]<<8;
    descriptors.push([n(0),n(2),n(4),n(6)]);
    const flags=bytes[p+8];p+=9;if(flags&0x80)p+=3*(1<<((flags&7)+1));p++;
    while(bytes[p])p+=bytes[p]+1;p++;
  }
  assert.deepEqual(descriptors,[[0,0,16,16],[8,5,1,1]]);
});
