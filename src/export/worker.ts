import { drawFrame } from '../render/frame';
import { encodeGif } from './encode.mjs';
import {DURATION,type Settings} from '../render/types';

self.onmessage = (event: MessageEvent<{ image: ImageBitmap; settings: Settings;hand?:ImageBitmap }>) => {
  const { image, settings, hand } = event.data;
  try {
    const canvas = new OffscreenCanvas(settings.size, settings.size);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('无法创建画布');
    const count = 32;
    const delay = Math.round(DURATION / settings.speed / count / 10) * 10;
    const frames: Uint8Array[] = [];
    for (let i = 0; i < count; i++) {
      drawFrame(ctx, image, settings, i / count,{hand});
      frames.push(new Uint8Array(ctx.getImageData(0, 0, settings.size, settings.size).data.buffer));
    }
    const bytes = encodeGif(frames, settings.size, delay, (progress: number) => self.postMessage({ progress }));
    const buffer = bytes.slice().buffer;
    self.postMessage({ buffer, delay, frames: count }, { transfer: [buffer] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '生成失败' });
  } finally { image.close(); hand?.close(); }
};
