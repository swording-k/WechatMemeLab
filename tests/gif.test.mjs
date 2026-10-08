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
