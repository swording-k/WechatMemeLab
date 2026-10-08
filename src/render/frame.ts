import type { Settings } from './types';
import { getLayers } from './motion.mjs';
import {drawLiquify} from './liquify';

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export function drawFrame(ctx: Context, image: CanvasImageSource, s: Settings, phase: number) {
  const size = ctx.canvas.width;
  ctx.save(); ctx.setTransform(size / 320, 0, 0, size / 320, 0, 0);
  ctx.clearRect(0, 0, 320, 320); ctx.fillStyle = s.background; ctx.fillRect(0, 0, 320, 320);
  if(s.template==='bulge' || s.template==='twist') {
    drawLiquify(ctx,image,s,phase);
  } else {
  const layers = getLayers(s.template, phase, s.intensity);
  const source = image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
  const iw = source.naturalWidth || source.width || 400;
  const ih = source.naturalHeight || source.height || 400;
  // Fit the whole photo, including the pose/background. Crop only when the user zooms.
  const fit = Math.min(320 / iw, 320 / ih) * s.zoom;
  const w = iw * fit, h = ih * fit;
  for (const m of layers) {
  ctx.save(); ctx.globalAlpha=m.alpha; ctx.translate(160 + m.x, 160 + m.y); ctx.rotate(m.angle); ctx.scale(m.sx, m.sy);
  const ox = s.x * .8, oy = s.y * .8;
  if (Math.abs(m.warp)<.001) {
    ctx.drawImage(image,-w/2+ox,-h/2+oy,w,h);
  } else {
  const rows = 64;
  for (let i = 0; i < rows; i++) {
    const rowY = i / rows;
    // Nonlinear deformation changes the photo itself; the middle bulges/squeezes.
    const bulge = 1 + m.warp * Math.exp(-(((rowY - .5) / .25) ** 2));
    const dw = w * bulge;
    const sh = ih / rows;
    ctx.drawImage(image, 0, i * sh, iw, Math.min(sh + .5, ih - i * sh), -dw / 2 + ox, -h / 2 + i * h / rows + oy, dw, h / rows + .6);
  }
  }
  ctx.restore();
  }
  if(s.template==='kiss' && phase%1>.35 && phase%1<.78) {
    ctx.save(); ctx.translate(180,140); ctx.rotate(-.25); ctx.scale(1.2,1.2);
    ctx.fillStyle='#ce3956';
    ctx.beginPath(); ctx.moveTo(-28,0); ctx.bezierCurveTo(-12,-5,-10,-19,0,-8); ctx.bezierCurveTo(10,-19,12,-5,28,0); ctx.bezierCurveTo(12,4,10,18,0,14); ctx.bezierCurveTo(-10,18,-12,4,-28,0); ctx.fill();
    ctx.strokeStyle='#72263b'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-23,0); ctx.quadraticCurveTo(0,5,23,0); ctx.stroke(); ctx.restore();
  }
  }
  const text = s.caption.trim();
  if (text) {
    // Bold meme caption stays readable on any uploaded photograph.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    let fontSize = 43; ctx.font = `900 ${fontSize}px "Arial Black", "PingFang SC", system-ui, sans-serif`;
    while (ctx.measureText(text).width > 290 && fontSize > 16) { fontSize--; ctx.font = `900 ${fontSize}px "Arial Black", "PingFang SC", system-ui, sans-serif`; }
    ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(4, fontSize * .17); ctx.strokeText(text, 160, 280, 290);
    ctx.fillStyle = '#fff'; ctx.fillText(text, 160, 280, 290);
  }
  ctx.restore();
}
