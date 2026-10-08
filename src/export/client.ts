import type { Settings,RenderAssets } from '../render/types';
export async function exportGif(image: CanvasImageSource, settings: Settings, onProgress: (p: number) => void, assets:RenderAssets={}): Promise<Blob> {
  const bitmap = await createImageBitmap(image as ImageBitmapSource);
  const hand=assets.hand ? await createImageBitmap(assets.hand as ImageBitmapSource) : undefined;
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const timeout = window.setTimeout(() => finish(new Error('生成超时，请尝试较小尺寸')), 60000);
    function finish(error?: Error, buffer?: ArrayBuffer) {
      clearTimeout(timeout); worker.terminate();
      if (error) reject(error); else resolve(new Blob([buffer!], { type: 'image/gif' }));
    }
    worker.onmessage = event => {
      if (event.data.error) finish(new Error(event.data.error));
      else if (event.data.buffer) finish(undefined, event.data.buffer);
      else onProgress(event.data.progress);
    };
    worker.onerror = () => finish(new Error('生成失败，请重试或换用 Chrome / Safari 最新版'));
    worker.postMessage({ image: bitmap, settings, hand }, hand ? [bitmap,hand] : [bitmap]);
  });
}
