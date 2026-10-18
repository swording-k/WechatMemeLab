var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// <stdin>
var stdin_exports = {};
__export(stdin_exports, {
  DURATION: () => DURATION,
  defaults: () => defaults,
  drawFrame: () => drawFrame,
  encodeGif: () => encodeGif,
  fitPhoto: () => fitPhoto,
  photoPlacement: () => photoPlacement,
  templates: () => templates
});
module.exports = __toCommonJS(stdin_exports);

// src/render/caption-layout.mjs
function captionBox(textWidth, fontSize, x, y) {
  const width = Math.max(0, Math.min(296, textWidth)), height = Math.max(12, Math.min(56, fontSize));
  const clamp2 = (v) => Math.max(0, Math.min(100, v));
  return { width, height, x: 12 + width / 2 + (296 - width) * clamp2(x) / 100, y: 12 + height / 2 + (296 - height) * clamp2(y) / 100 };
}

// src/render/caption.ts
function measureCaption(ctx, s) {
  const text = s.caption.trim();
  ctx.save();
  let fontSize = s.captionSize ?? 35;
  const font = () => {
    ctx.font = `900 ${fontSize}px "Arial Black","PingFang SC",system-ui,sans-serif`;
  };
  font();
  while (ctx.measureText(text).width > 296 && fontSize > 12) {
    fontSize--;
    font();
  }
  const box = captionBox(ctx.measureText(text).width, fontSize, s.captionX ?? 50, s.captionY ?? 96);
  ctx.restore();
  return { ...box, x: s.captionCenterX ?? box.x, y: s.captionCenterY ?? box.y, fontSize, angle: s.captionRotation ?? 0, scale: s.captionScale ?? 1 };
}
function drawCaption(ctx, s, phase) {
  const text = s.caption.trim();
  if (!text) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const box = measureCaption(ctx, s), fontSize = box.fontSize;
  ctx.font = `900 ${fontSize}px "Arial Black","PingFang SC",system-ui,sans-serif`;
  ctx.translate(box.x, box.y);
  ctx.rotate(box.angle * Math.PI / 180);
  ctx.scale(box.scale, box.scale);
  const style = s.captionStyle ?? "meme", y = style === "shake" ? Math.sin(phase * Math.PI * 12) * 2.5 : 0;
  if (style === "band") {
    ctx.fillStyle = "rgba(15,18,14,.78)";
    ctx.beginPath();
    ctx.roundRect(-box.width / 2 - 7, y - fontSize / 2 - 7, box.width + 14, fontSize + 14, 5);
    ctx.fill();
  }
  if (style === "meme" || style === "shake") {
    ctx.strokeStyle = "#151515";
    ctx.lineWidth = Math.max(3, fontSize * 0.17);
    ctx.strokeText(text, 0, y, 296);
  }
  ctx.fillStyle = s.captionColor ?? "#ffffff";
  ctx.fillText(text, 0, y, 296);
  ctx.restore();
}

// src/photo/geometry.mjs
function photoPlacement(iw, ih, s) {
  const scale = Math.max(1 / iw, 1 / ih) * s.zoom, width = iw * scale, height = ih * scale;
  const travelX = Math.max(0.5, (width - 1) / 2), travelY = Math.max(0.5, (height - 1) / 2);
  return { width, height, left: (1 - width) / 2 + s.x / 100 * travelX, top: (1 - height) / 2 + s.y / 100 * travelY, travelX, travelY };
}
function fitPhoto(iw, ih) {
  return { zoom: Math.min(iw, ih) / Math.max(iw, ih), x: 0, y: 0 };
}

// src/render/action.mjs
var clamp = (x) => Math.max(0, Math.min(1, x));
var ease = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
function getAction(template, phase, intensity) {
  const p = (phase % 1 + 1) % 1;
  if (template === "cat" || template === "dog") {
    const contact2 = p < 0.18 ? ease(p / 0.18) : p < 0.82 ? 1 : 1 - ease((p - 0.82) / 0.18);
    const envelope = p < 0.18 ? 0 : p < 0.38 ? ease((p - 0.18) / 0.2) : p < 0.68 ? 1 : p < 0.94 ? 1 - ease((p - 0.68) / 0.26) : 0;
    const pulses = template === "cat" ? 0.78 + 0.22 * Math.sin(p * Math.PI * 10) ** 2 : 0.7 + 0.3 * Math.sin(p * Math.PI * 6) ** 2;
    const amount2 = envelope * pulses * intensity;
    return { amount: amount2, pressure: amount2, contact: contact2 };
  }
  if (["notify", "crack", "screen"].includes(template)) {
    const envelope = p < 0.12 ? 0 : p < 0.4 ? ease((p - 0.12) / 0.28) : p < 0.68 ? 1 : p < 0.92 ? 1 - ease((p - 0.68) / 0.24) : 0;
    const amount2 = template === "notify" ? Math.sin(p * Math.PI * 18) * envelope : envelope;
    return { amount: amount2 * intensity || 0, pressure: envelope * intensity, contact: envelope };
  }
  if (["suction", "melt", "leak"].includes(template)) {
    const envelope = (rise, hold, end) => p < 0.12 ? 0 : p < rise ? ease((p - 0.12) / (rise - 0.12)) : p < hold ? 1 : p < end ? 1 - ease((p - hold) / (end - hold)) : 0;
    const contact2 = envelope(0.26, 0.75, 0.94);
    let amount2 = envelope(template === "melt" ? 0.68 : 0.43, template === "melt" ? 0.76 : 0.57, 0.92);
    if (template === "leak") amount2 = p < 0.12 ? 0 : p < 0.35 ? ease((p - 0.12) / 0.23) : p < 0.44 ? 1 : p < 0.55 ? 1 - 1.85 * ease((p - 0.44) / 0.11) : p < 0.72 ? -0.85 : p < 0.92 ? -0.85 * (1 - ease((p - 0.72) / 0.2)) : 0;
    return { amount: amount2 * intensity, pressure: Math.max(0, amount2) * intensity, contact: contact2 };
  }
  const contact = p < 0.18 ? ease(p / 0.18) : p < 0.84 ? 1 : 1 - ease((p - 0.84) / 0.16);
  const pressure = p < 0.18 ? 0 : p < 0.43 ? ease((p - 0.18) / 0.25) : p < 0.62 ? 1 : 1 - ease((p - 0.62) / 0.22);
  const amount = template === "twist" ? Math.sin(p * Math.PI * 2) * intensity : template === "knead" ? pressure * Math.sin(p * Math.PI * 6) * intensity : pressure * intensity;
  return { amount, pressure: pressure * intensity, contact };
}

// src/render/sculpt-map.mjs
function mapSculpt(x, y, steps, amount) {
  if (!amount) return [x, y];
  let u = x, v = y;
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i], cx = s.x + (s.kind === "drag" ? s.dx * amount : 0), cy = s.y + (s.kind === "drag" ? s.dy * amount : 0), dx = u - cx, dy = v - cy, r2 = (dx * dx + dy * dy) / (s.radius * s.radius);
    if (r2 >= 1) continue;
    const weight = (1 - r2) ** 2;
    if (s.kind === "drag") {
      u -= s.dx * amount * weight;
      v -= s.dy * amount * weight;
    } else {
      const scale = 1 + (s.kind === "expand" ? -0.65 : 0.9) * amount * weight;
      u = s.x + dx * scale;
      v = s.y + dy * scale;
    }
  }
  return [u, v];
}

// src/render/liquify-map.mjs
function mapPixel(mode, x, y, center, amount, radius = 0.43) {
  const dx = x - center[0], dy = y - center[1];
  const r2 = (dx * dx + dy * dy) / (radius * radius);
  if (r2 >= 1 || amount === 0) return [x, y];
  const weight = (1 - r2) ** 2;
  if (mode === "cat") return [center[0] + dx * (1 - 0.34 * amount * weight), center[1] + dy * (1 + 0.75 * amount * weight) + amount * radius * 0.05 * weight];
  if (mode === "dog") return [center[0] + dx * (1 - 0.76 * amount * weight), center[1] + dy * (1 - 0.7 * amount * weight)];
  if (mode === "notify") return [x - amount * radius * 0.23 * weight, y + amount * radius * 0.13 * weight];
  if (mode === "crack") return [x + amount * radius * 0.22 * Math.sin(dy / radius * 4) * weight, y - amount * radius * 0.12 * weight * (dx > 0 ? 1 : -1)];
  if (mode === "screen") {
    const scale = 1 - 0.86 * amount * weight;
    return [center[0] + dx * scale, center[1] + dy * scale];
  }
  if (mode === "suction") return [x - amount * radius * 0.52 * weight, y + amount * radius * 0.42 * weight];
  if (mode === "melt") {
    const lower = Math.max(0, Math.min(1, (dy / radius + 0.35) * 1.5));
    return [x + Math.sin(dy / radius * 8) * radius * 0.05 * amount * weight, y - amount * radius * 0.62 * weight * lower];
  }
  if (mode === "leak") return [center[0] + dx * (1 - 0.55 * amount * weight), center[1] + dy * (1 - 0.4 * amount * weight)];
  if (mode === "bulge") {
    const scale = 1 - 0.88 * amount * weight;
    return [center[0] + dx * scale, center[1] + dy * scale];
  }
  if (mode === "pinch") return [center[0] + dx * (1 + 0.85 * amount * weight), y];
  if (mode === "pull") return [center[0] + dx * (1 - 0.65 * amount * weight), y];
  if (mode === "squish") return [center[0] + dx * (1 - 0.25 * amount * weight), center[1] + dy * (1 + 0.9 * amount * weight)];
  if (mode === "knead") return [x + amount * radius * 0.23 * Math.sin(dy / radius * Math.PI * 2) * weight, y + amount * radius * 0.1 * Math.sin(dx / radius * Math.PI * 2) * weight];
  const angle = amount * 2.7 * weight;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const u = dx / (1 + 0.6 * Math.abs(amount) * weight), v = dy * (1 + 0.4 * Math.abs(amount) * weight);
  return [center[0] + u * cos - v * sin, center[1] + u * sin + v * cos];
}

// src/render/liquify.ts
var cache = /* @__PURE__ */ new WeakMap();
function drawLiquify(ctx, image, s, phase, createCanvas = (width, height) => new OffscreenCanvas(width, height)) {
  const size = ctx.canvas.width;
  const key = [size, s.zoom, s.x, s.y, s.background].join(":");
  let entry = cache.get(ctx.canvas);
  if (!entry || entry.key !== key || entry.image !== image) {
    const canvas = createCanvas(size, size);
    const c = canvas.getContext("2d", { willReadFrequently: true });
    const source = image;
    const iw = source.naturalWidth || source.width || 400, ih = source.naturalHeight || source.height || 400;
    const p = photoPlacement(iw, ih, s);
    c.fillStyle = s.background;
    c.fillRect(0, 0, size, size);
    c.drawImage(image, p.left * size, p.top * size, p.width * size, p.height * size);
    entry = { key, image, source: c.getImageData(0, 0, size, size), output: c.createImageData(size, size) };
    cache.set(ctx.canvas, entry);
  }
  const { amount } = getAction(s.template, phase, s.intensity);
  const src = entry.source.data, out = entry.output.data;
  const center = [s.focusX, s.focusY];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [u, v] = s.template === "custom" ? mapSculpt(x / (size - 1), y / (size - 1), s.custom || [], amount) : mapPixel(s.template, x / (size - 1), y / (size - 1), center, amount, s.radius);
    const fx = Math.max(0, Math.min(size - 1, u * (size - 1))), fy = Math.max(0, Math.min(size - 1, v * (size - 1)));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1);
    const ax = fx - x0, ay = fy - y0;
    const a = (y0 * size + x0) * 4, b = (y0 * size + x1) * 4, c = (y1 * size + x0) * 4, d = (y1 * size + x1) * 4;
    const target = (y * size + x) * 4;
    for (let k = 0; k < 3; k++) out[target + k] = (src[a + k] * (1 - ax) + src[b + k] * ax) * (1 - ay) + (src[c + k] * (1 - ax) + src[d + k] * ax) * ay;
    out[target + 3] = 255;
  }
  ctx.putImageData(entry.output, 0, 0);
}

// src/render/chat-props.ts
function drawChatProps(ctx, s, phase) {
  if (!["notify", "crack", "screen"].includes(s.template)) return;
  const { contact, pressure } = getAction(s.template, phase, s.intensity);
  if (contact <= 0) return;
  const x = s.focusX * 320, y = s.focusY * 320, r = s.radius * 320;
  ctx.save();
  if (s.template === "notify") {
    const labels = ["\u5728\u5417", "\u56DE\u6211", "\u4EBA\u5462\uFF1F"];
    ctx.globalAlpha = contact;
    ctx.font = "800 15px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 3; i++) {
      const stagger = Math.max(0, Math.min(1, (phase - 0.12 - i * 0.06) / 0.12));
      if (!stagger) continue;
      const bx = i % 2 ? Math.min(245, x + r * 0.65) : Math.max(7, x - r - 30), by = Math.max(12, y - r * 0.95) + i * 31;
      ctx.save();
      ctx.translate((i % 2 ? 1 : -1) * (1 - stagger) * 90, 0);
      ctx.fillStyle = "#242c1f";
      ctx.beginPath();
      ctx.roundRect(bx - 2, by - 2, 74, 28, 8);
      ctx.fill();
      ctx.fillStyle = "#d9ed7f";
      ctx.beginPath();
      ctx.roundRect(bx, by, 70, 24, 6);
      ctx.fill();
      ctx.fillStyle = "#293323";
      ctx.fillText(labels[i], bx + 35, by + 13);
      ctx.restore();
    }
    ctx.fillStyle = "#ef4d4d";
    ctx.beginPath();
    ctx.arc(Math.min(302, x + r * 0.8), Math.max(13, y - r), 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "900 12px system-ui";
    ctx.fillStyle = "#fff";
    ctx.fillText("99+", Math.min(302, x + r * 0.8), Math.max(13, y - r));
  } else if (s.template === "crack") {
    ctx.globalAlpha = contact * 0.9;
    ctx.strokeStyle = "rgba(14,20,27,.7)";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    const paths = [[[-0.45, -0.75], [-0.28, -0.35], [-0.4, -0.2], [-0.15, 0.05], [-0.35, 0.38], [-0.2, 0.7]], [[0.6, -0.65], [0.35, -0.25], [0.5, -0.1], [0.27, 0.15], [0.43, 0.38]], [[0.5, -0.1], [0.75, 0.05], [0.9, 0.02]]];
    for (const path of paths) {
      ctx.beginPath();
      path.forEach(([u, v], i) => i ? ctx.lineTo(x + u * r, y + v * r) : ctx.moveTo(x + u * r, y + v * r));
      ctx.stroke();
      ctx.save();
      ctx.translate(1, -1);
      ctx.strokeStyle = "rgba(250,252,255,.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  } else {
    const w = 290 - pressure * 35, h = 260 - pressure * 15, left = (320 - w) / 2, top = 12;
    ctx.globalAlpha = contact;
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#222824";
    ctx.beginPath();
    ctx.roundRect(left, top, w, h, 22);
    ctx.stroke();
    ctx.strokeStyle = "#d9ed7f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + w / 2 - 17, top + 6);
    ctx.lineTo(left + w / 2 + 17, top + 6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * r * 0.8, y - r * 0.1);
      ctx.lineTo(x + side * r * 0.95, y - r * 0.3);
      ctx.moveTo(x + side * r * 0.8, y + r * 0.2);
      ctx.lineTo(x + side * r, y + r * 0.35);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// src/render/pet-placement.mjs
function petPlacement(s) {
  return { x: (s.focusX + (s.petX ?? 0) / 100) * 320, y: (s.focusY + (s.petY ?? 0) / 100) * 320, radius: s.radius * 320 * (s.petScale ?? 1), angle: s.petRotation === void 0 ? s.petFace?.angle ?? 0 : s.petRotation * Math.PI / 180 };
}

// src/render/pet-props.ts
function drawPetProps(ctx, s, phase, assets) {
  if (s.template !== "cat" && s.template !== "dog") return;
  const { amount: a, contact } = getAction(s.template, phase, s.intensity);
  const { x, y, radius: r, angle } = petPlacement(s);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#242321";
  ctx.lineWidth = Math.max(2, r * 0.025);
  const noseDX = (s.petFace?.dx ?? 0) * r, noseDY = (s.petFace?.dy ?? 0.12) * r;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.translate(-x, -y);
  if (s.template === "cat") {
    const headY = y - a * r * 0.05;
    for (const side of [-1, 1]) {
      const baseY = headY - r * (0.79 - 0.23 * a);
      ctx.save();
      ctx.translate(x + side * r * 0.57, baseY);
      ctx.rotate(side * (-0.1 - a * 0.45));
      ctx.fillStyle = "#666361";
      ctx.beginPath();
      ctx.moveTo(-side * r * 0.23, r * 0.1);
      ctx.lineTo(-side * r * 0.19, -r * 0.14);
      ctx.lineTo(side * r * 0.06, -r * 0.43 * (1 - 0.48 * a));
      ctx.lineTo(side * r * 0.29, r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cf9b9b";
      ctx.beginPath();
      ctx.moveTo(-side * r * 0.09, 0);
      ctx.lineTo(side * r * 0.06, -r * 0.3 * (1 - 0.48 * a));
      ctx.lineTo(side * r * 0.18, r * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-side * r * 0.2, r * 0.08);
      ctx.lineTo(-side * r * 0.11, 0);
      ctx.lineTo(-side * r * 0.07, r * 0.08);
      ctx.stroke();
      ctx.restore();
    }
    const noseX = x + noseDX * (1 + 0.18 * a), noseY = headY + noseDY / (1 + 0.5 * a), width = r * (1 + 0.18 * a);
    ctx.fillStyle = "#302729";
    ctx.beginPath();
    ctx.moveTo(noseX - r * 0.065, noseY);
    ctx.quadraticCurveTo(noseX, noseY - r * 0.025, noseX + r * 0.065, noseY);
    ctx.lineTo(noseX, noseY + r * 0.055);
    ctx.closePath();
    ctx.fill();
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.strokeStyle = "#f8f2e8";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(noseX + side * width * 0.23, noseY + r * 0.1 + i * r * 0.045);
        ctx.lineTo(noseX + side * width * 0.72, noseY + r * 0.09 + i * r * 0.1);
        ctx.stroke();
        ctx.strokeStyle = "#282323";
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }
    }
    if (assets.hand && contact > 0) {
      const scratch = Math.sin(phase * Math.PI * 12) * a * r * 0.045, w = Math.max(115, r * 1.55);
      ctx.save();
      ctx.translate(x + r * 0.48 + (1 - contact) * 180, headY + r * (0.72 - 0.12 * a) + scratch);
      ctx.scale(-1, 1);
      ctx.rotate(-0.22);
      ctx.drawImage(assets.hand, -w * 0.97, -w * 0.45, w, w);
      ctx.restore();
    }
  } else {
    const grow = 1 + a * 0.45, noseY = y + noseDY * grow, noseX = x + noseDX * grow;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(x + side * r * 0.7 * grow, y - r * 0.64 * grow);
      ctx.rotate(side * (0.12 + Math.sin(phase * Math.PI * 12) * a * 0.55));
      ctx.fillStyle = side < 0 ? "#775343" : "#9d7051";
      ctx.beginPath();
      ctx.moveTo(-side * r * 0.15, 0);
      ctx.bezierCurveTo(-side * r * 0.25, r * 0.3, -side * r * 0.13, r * 0.88, side * r * 0.1, r * 0.9);
      ctx.bezierCurveTo(side * r * 0.45, r * 0.92, side * r * 0.39, r * 0.37, side * r * 0.16, -r * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(41,29,22,.4)";
      ctx.beginPath();
      ctx.moveTo(side * r * 0.1, r * 0.17);
      ctx.quadraticCurveTo(side * r * 0.18, r * 0.52, side * r * 0.12, r * 0.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(noseX, noseY);
    ctx.scale(grow, grow);
    ctx.fillStyle = "#e3c8a8";
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, r * 0.12, r * 0.16, r * 0.12, -0.12, 0, Math.PI * 2);
    ctx.ellipse(r * 0.1, r * 0.12, r * 0.16, r * 0.12, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (a > 0.02) {
      ctx.fillStyle = "#c6797e";
      ctx.beginPath();
      ctx.moveTo(-r * 0.08, r * 0.2);
      ctx.bezierCurveTo(-r * 0.16, r * (0.25 + a * 0.35), r * 0.12, r * (0.42 + a * 0.27), r * 0.1, r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, r * 0.22);
      ctx.lineTo(0, r * (0.25 + a * 0.19));
      ctx.stroke();
    }
    ctx.fillStyle = "#302928";
    ctx.beginPath();
    ctx.moveTo(-r * 0.095, 0);
    ctx.quadraticCurveTo(0, -r * 0.07, r * 0.095, 0);
    ctx.quadraticCurveTo(r * 0.08, r * 0.1, 0, r * 0.13);
    ctx.quadraticCurveTo(-r * 0.08, r * 0.1, -r * 0.095, 0);
    ctx.fill();
    ctx.fillStyle = "#ead7c8";
    ctx.beginPath();
    ctx.ellipse(-r * 0.035, r * 0.015, r * 0.025, r * 0.012, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#584437";
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(side * r * (0.1 + i * 0.035), r * (0.12 + i % 2 * 0.04), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// src/render/props.ts
function drawProps(ctx, s, phase) {
  const { amount, contact } = getAction(s.template, phase, s.intensity);
  const x = s.focusX * 320, y = s.focusY * 320, r = s.radius * 320;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.template === "suction") {
    const tipX = x + r * 0.35 + (1 - contact) * 110, tipY = y - r * 0.34 - (1 - contact) * 80;
    ctx.globalAlpha = contact;
    ctx.strokeStyle = "#273126";
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + 28, tipY - 38);
    ctx.lineTo(tipX + 95, tipY - 38);
    ctx.stroke();
    ctx.strokeStyle = "#bddd67";
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = "#f0f8be";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tipX + 1, tipY - 2);
    ctx.lineTo(tipX + 29, tipY - 40);
    ctx.lineTo(tipX + 92, tipY - 40);
    ctx.stroke();
    ctx.fillStyle = "#25301f";
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, 6, 4, -0.7, 0, Math.PI * 2);
    ctx.fill();
    if (amount > 0.1) {
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const t = (phase * 5 + i / 3) % 1;
        ctx.beginPath();
        ctx.arc(tipX - 8 - 25 * t, tipY + 8 + 20 * t, 4 + t * 3, -0.4, 1.8);
        ctx.stroke();
      }
    }
  } else if (s.template === "melt" && amount > 0.05) {
    ctx.globalAlpha = amount * 0.5;
    ctx.strokeStyle = "rgba(255,225,236,.85)";
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * r * 0.42, y + r * 0.22);
      ctx.quadraticCurveTo(x + side * r * 0.46, y + r * 0.55, x + side * r * 0.36, y + r * (0.55 + amount * 0.3));
      ctx.stroke();
    }
  } else if (s.template === "leak" && amount < 0) {
    const t = Math.max(0, Math.min(1, (phase - 0.44) / 0.4));
    ctx.globalAlpha = Math.abs(amount) * (1 - t * 0.5);
    ctx.strokeStyle = "#f8fbff";
    ctx.shadowColor = "#333";
    ctx.shadowBlur = 2;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const sy = y + r * 0.32 + (i - 1) * 9;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.25 + t * 20, sy);
      ctx.quadraticCurveTo(x + r * 0.5 + t * 40, sy - 5, x + r * 0.8 + t * 45, sy + (i - 1) * 10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// src/render/frame.ts
function drawFrame(ctx, image, s, phase, assets = {}) {
  const size = ctx.canvas.width;
  ctx.save();
  ctx.setTransform(size / 320, 0, 0, size / 320, 0, 0);
  drawLiquify(ctx, image, s, phase, assets.createCanvas);
  if (assets.hand && ["pinch", "pull", "knead"].includes(s.template)) {
    const { pressure, contact } = getAction(s.template, phase, s.intensity);
    const cx = s.focusX * 320, cy = s.focusY * 320;
    const radius = s.radius * 320;
    const direction = s.template === "pull" ? 1 : -1;
    const grip = radius * 0.57 + direction * pressure * radius * 0.2;
    const handWidth = Math.max(115, Math.min(205, radius * 2.05));
    for (const side of [-1, 1]) {
      const offset = (1 - contact) * 190;
      const wiggle = s.template === "knead" ? Math.sin(phase * Math.PI * 6) * pressure * 12 * side : 0;
      const targetX = cx + side * (grip + offset);
      ctx.save();
      ctx.translate(targetX, cy + radius * 0.18 + wiggle);
      if (side === 1) ctx.scale(-1, 1);
      const handHeight = handWidth * (1 - pressure * 0.18);
      ctx.drawImage(assets.hand, -handWidth * 0.97, -handHeight * 0.45, handWidth, handHeight);
      ctx.restore();
    }
  }
  drawChatProps(ctx, s, phase);
  drawProps(ctx, s, phase);
  drawPetProps(ctx, s, phase, assets);
  drawCaption(ctx, s, phase);
  ctx.restore();
}

// src/render/types.ts
var templates = [
  { id: "custom", title: "\u81EA\u7531\u634F\u56FE", subtitle: "\u81EA\u5DF1\u62C9\u62FD\u3001\u9F13\u8D77\u3001\u7F29\u5C0F\uFF0C\u634F\u51FA\u4F60\u7684\u52A8\u4F5C", caption: "", tag: "\u81EA\u5DF1\u6765", suggestions: ["\u4F60\u770B\u6211\u50CF\u6B63\u5E38\u5417", "\u6211\u5148\u75AF\u4E3A\u656C", "\u5DF2\u8BFB\u4E71\u634F"] },
  { id: "cat", title: "\u6478\u4E24\u4E0B\u5C31\u4E0A\u5934", subtitle: "\u53D8\u6210\u602A\u732B\uFF0C\u6320\u4E0B\u5DF4\u6320\u5230\u8138\u6241\u8033\u6735\u6298", caption: "\u518D\u6478\u4E00\u4E0B", tag: "\u4EBA\u53D8\u732B", suggestions: ["\u518D\u6478\u4E00\u4E0B", "\u4F60\u7684\u5C0F\u732B\u7A81\u7136\u53D1\u75AF", "\u73B0\u5728\u77E5\u9053\u54C4\u6211\u4E86\uFF1F"] },
  { id: "dog", title: "\u89C1\u4F60\u5C31\u53D8\u72D7", subtitle: "\u72D7\u8033\u4E71\u7529\uFF0C\u4F38\u820C\u5934\uFF0C\u5174\u594B\u5230\u6251\u8138", caption: "\u4F60\u7EC8\u4E8E\u56DE\u6211\u4E86", tag: "\u4EBA\u53D8\u72D7", suggestions: ["\u4F60\u7EC8\u4E8E\u56DE\u6211\u4E86", "\u8BA9\u6211\u95FB\u95FB", "\u6211\u5C31\u8E6D\u4E00\u4E0B"] },
  { id: "notify", title: "\u88AB\u6D88\u606F\u9707\u98DE", subtitle: "\u50AC\u547D\u6D88\u606F\u8FDE\u7740\u6765\uFF0C\u8138\u90FD\u9707\u6B6A\u4E86", caption: "\u6765\u4E86\u6765\u4E86", tag: "\u50AC\u56DE\u590D", suggestions: ["\u6765\u4E86\u6765\u4E86", "\u522B\u50AC\u4E86\u5728\u56DE\u4E86", "\u6D88\u606F\u628A\u6211\u9707\u9192\u4E86"] },
  { id: "crack", title: "\u8138\u5148\u7834\u9632", subtitle: "\u5634\u8FD8\u5728\u786C\u6491\uFF0C\u8138\u5DF2\u7ECF\u88C2\u5F00", caption: "\u6211\u6CA1\u6025", tag: "\u4E92\u635F", suggestions: ["\u6211\u6CA1\u6025", "\u5144\u5F1F\u6211\u771F\u6CA1\u7834\u9632", "\u8BF4\u597D\u7684\u4E0D\u8BB8\u7B11"] },
  { id: "screen", title: "\u6324\u8FDB\u4F60\u7684\u5C4F\u5E55", subtitle: "\u8138\u9876\u7740\u5C4F\u5E55\u6324\u8FC7\u6765\uFF0C\u6C42\u4F60\u7406\u4E00\u4E0B", caption: "\u7406\u6211\u4E00\u4E0B", tag: "\u8D34\u8D34", suggestions: ["\u7406\u6211\u4E00\u4E0B", "\u8BA9\u6211\u6324\u8FDB\u53BB", "\u5C31\u8981\u9ECF\u7740\u4F60"] },
  { id: "suction", title: "\u5438\u8D70\u7406\u667A", subtitle: "\u5438\u7BA1\u4E00\u9760\u8FD1\uFF0C\u4E94\u5B98\u88AB\u5438\u8FC7\u53BB", caption: "\u8111\u5B50\u88AB\u4F60\u5438\u8D70\u4E86", tag: "\u4E0A\u5934", suggestions: ["\u8111\u5B50\u88AB\u4F60\u5438\u8D70\u4E86", "\u7406\u667A\u5DF2\u4E0B\u7EBF", "\u4F60\u628A\u6211CPU\u5438\u8D70\u4E86"] },
  { id: "melt", title: "\u88AB\u5938\u5230\u878D\u5316", subtitle: "\u8D8A\u5938\u8D8A\u8F6F\uFF0C\u4E0B\u5DF4\u90FD\u6302\u4E0D\u4F4F", caption: "\u4F60\u518D\u5938\u4E00\u53E5", tag: "\u62FF\u634F", suggestions: ["\u4F60\u518D\u5938\u4E00\u53E5", "\u88AB\u4F60\u62FF\u634F\u4E86", "\u522B\u5938\u4E86\u8981\u5316\u4E86"] },
  { id: "leak", title: "\u5634\u786C\u6F0F\u6C14", subtitle: "\u5148\u618B\u9F13\uFF0C\u7A81\u7136\u6F0F\u6C14\uFF0C\u518D\u88C5\u6CA1\u4E8B", caption: "\u6211\u771F\u7684\u6CA1\u4E8B", tag: "\u5634\u786C", suggestions: ["\u6211\u771F\u7684\u6CA1\u4E8B", "\u624D\u6CA1\u6709\u60F3\u4F60", "\u5144\u5F1F\u6211\u6CA1\u7834\u9632"] },
  { id: "pinch", title: "\u5C31\u634F\u4E00\u4E0B", subtitle: "\u4E24\u8FB9\u634F\u4F4F\uFF0C\u8138\u6324\u6210\u4E00\u56E2", caption: "\u5C31\u634F\u4E00\u4E0B", tag: "\u522B\u8EB2", suggestions: ["\u5C31\u634F\u4E00\u4E0B", "\u4E0D\u8BB8\u8EB2", "\u8BA9\u6211\u634F\u634F"] },
  { id: "pull", title: "\u8138\u501F\u6211\u62C9\u4E00\u4E0B", subtitle: "\u6293\u4F4F\u8138\u988A\uFF0C\u62C9\u957F\u53C8\u5F39\u56DE\u6765", caption: "\u8138\u501F\u6211\u62C9\u4E00\u4E0B", tag: "\u6B20\u63CD", suggestions: ["\u8138\u501F\u6211\u62C9\u4E00\u4E0B", "\u4F60\u600E\u4E48\u56DE\u4E8B", "\u7565\u7565\u7565"] },
  { id: "knead", title: "\u63C9\u5230\u8D70\u5F62", subtitle: "\u5DE6\u53F3\u63C9\u4E24\u4E0B\uFF0C\u4E94\u5B98\u62E7\u5DF4\u4E86", caption: "\u8FC7\u6765\u8BA9\u6211\u63C9\u63C9", tag: "\u8D34\u8138", suggestions: ["\u8FC7\u6765\u8BA9\u6211\u63C9\u63C9", "\u522B\u52A8", "\u4F60\u5148\u522B\u8BF4\u8BDD"] },
  { id: "bulge", title: "\u618B\u6210\u5927\u5934", subtitle: "\u8D8A\u618B\u8D8A\u9F13\uFF0C\u539F\u5730\u7834\u9632", caption: "\u618B\u4E0D\u4F4F\u4E86", tag: "\u62BD\u8C61", suggestions: ["\u618B\u4E0D\u4F4F\u4E86", "\u4F60\u770B\u6211\u50CF\u6B63\u5E38\u5417", "\u5C31\u8FD9\u6837\u5427"] },
  { id: "twist", title: "\u8138\u90FD\u6C14\u6B6A\u4E86", subtitle: "\u5634\u786C\u4E00\u4E0B\uFF0C\u8138\u771F\u7684\u6B6A\u4E86", caption: "\u6211\u6CA1\u4E8B\u554A", tag: "\u5634\u786C", suggestions: ["\u6211\u6CA1\u4E8B\u554A", "\u4F60\u518D\u8BF4\u4E00\u904D", "\u5634\u786C\u4E00\u4E0B"] },
  { id: "squish", title: "\u618B\u6210\u4E00\u56E2", subtitle: "\u8138\u6241\u4E86\uFF0C\u53C8\u6084\u6084\u5F39\u56DE\u6765", caption: "\u4E0D\u8BB8\u7B11", tag: "\u7EF7\u4E0D\u4F4F", suggestions: ["\u4E0D\u8BB8\u7B11", "\u6211\u5FCD", "\u5DF2\u8BFB\u4E71\u56DE"] }
];
var defaults = { template: "pinch", caption: "\u5C31\u634F\u4E00\u4E0B", captionX: 50, captionY: 96, captionSize: 35, captionColor: "#ffffff", captionStyle: "meme", zoom: 1, x: 0, y: 0, intensity: 0.75, speed: 1, background: "#fff8ed", size: 240, focusX: 0.5, focusY: 0.5, radius: 0.35 };
var DURATION = 1600;

// node_modules/gifenc/dist/gifenc.esm.js
var gifenc_esm_exports = {};
__export(gifenc_esm_exports, {
  GIFEncoder: () => ct,
  applyPalette: () => nt,
  default: () => Bt,
  nearestColor: () => ot,
  nearestColorIndex: () => W,
  nearestColorIndexWithDistance: () => N,
  prequantize: () => et,
  quantize: () => H,
  snapColorsToPalette: () => rt
});
var X = { signature: "GIF", version: "89a", trailer: 59, extensionIntroducer: 33, applicationExtensionLabel: 255, graphicControlExtensionLabel: 249, imageSeparator: 44, signatureSize: 3, versionSize: 3, globalColorTableFlagMask: 128, colorResolutionMask: 112, sortFlagMask: 8, globalColorTableSizeMask: 7, applicationIdentifierSize: 8, applicationAuthCodeSize: 3, disposalMethodMask: 28, userInputFlagMask: 2, transparentColorFlagMask: 1, localColorTableFlagMask: 128, interlaceFlagMask: 64, idSortFlagMask: 32, localColorTableSizeMask: 7 };
function F(t = 256) {
  let e = 0, s = new Uint8Array(t);
  return { get buffer() {
    return s.buffer;
  }, reset() {
    e = 0;
  }, bytesView() {
    return s.subarray(0, e);
  }, bytes() {
    return s.slice(0, e);
  }, writeByte(r) {
    n(e + 1), s[e] = r, e++;
  }, writeBytes(r, o = 0, i = r.length) {
    n(e + i);
    for (let c = 0; c < i; c++) s[e++] = r[c + o];
  }, writeBytesView(r, o = 0, i = r.byteLength) {
    n(e + i), s.set(r.subarray(o, o + i), e), e += i;
  } };
  function n(r) {
    var o = s.length;
    if (o >= r) return;
    var i = 1024 * 1024;
    r = Math.max(r, o * (o < i ? 2 : 1.125) >>> 0), o != 0 && (r = Math.max(r, 256));
    let c = s;
    s = new Uint8Array(r), e > 0 && s.set(c.subarray(0, e), 0);
  }
}
var O = 12;
var J = 5003;
var lt = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535];
function at(t, e, s, n, r = F(512), o = new Uint8Array(256), i = new Int32Array(J), c = new Int32Array(J)) {
  let x = i.length, a = Math.max(2, n);
  o.fill(0), c.fill(0), i.fill(-1);
  let l = 0, f = 0, g = a + 1, h = g, b = false, w = h, _ = (1 << w) - 1, u = 1 << g - 1, k = u + 1, B = u + 2, p = 0, A = s[0], z = 0;
  for (let y = x; y < 65536; y *= 2) ++z;
  z = 8 - z, r.writeByte(a), I(u);
  let d = s.length;
  for (let y = 1; y < d; y++) {
    t: {
      let m = s[y], v = (m << O) + A, M = m << z ^ A;
      if (i[M] === v) {
        A = c[M];
        break t;
      }
      let V = M === 0 ? 1 : x - M;
      for (; i[M] >= 0; ) if (M -= V, M < 0 && (M += x), i[M] === v) {
        A = c[M];
        break t;
      }
      I(A), A = m, B < 1 << O ? (c[M] = B++, i[M] = v) : (i.fill(-1), B = u + 2, b = true, I(u));
    }
  }
  return I(A), I(k), r.writeByte(0), r.bytesView();
  function I(y) {
    for (l &= lt[f], f > 0 ? l |= y << f : l = y, f += w; f >= 8; ) o[p++] = l & 255, p >= 254 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0), l >>= 8, f -= 8;
    if ((B > _ || b) && (b ? (w = h, _ = (1 << w) - 1, b = false) : (++w, _ = w === O ? 1 << w : (1 << w) - 1)), y == k) {
      for (; f > 0; ) o[p++] = l & 255, p >= 254 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0), l >>= 8, f -= 8;
      p > 0 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0);
    }
  }
}
var $ = at;
function D(t, e, s) {
  return t << 8 & 63488 | e << 2 & 992 | s >> 3;
}
function G(t, e, s, n) {
  return t >> 4 | e & 240 | (s & 240) << 4 | (n & 240) << 8;
}
function j(t, e, s) {
  return t >> 4 << 8 | e & 240 | s >> 4;
}
function R(t, e, s) {
  return t < e ? e : t > s ? s : t;
}
function T(t) {
  return t * t;
}
function tt(t, e, s) {
  var n = 0, r = 1e100;
  let o = t[e], i = o.cnt, c = o.ac, x = o.rc, a = o.gc, l = o.bc;
  for (var f = o.fw; f != 0; f = t[f].fw) {
    let h = t[f], b = h.cnt, w = i * b / (i + b);
    if (!(w >= r)) {
      var g = 0;
      s && (g += w * T(h.ac - c), g >= r) || (g += w * T(h.rc - x), !(g >= r) && (g += w * T(h.gc - a), !(g >= r) && (g += w * T(h.bc - l), !(g >= r) && (r = g, n = f))));
    }
  }
  o.err = r, o.nn = n;
}
function Q() {
  return { ac: 0, rc: 0, gc: 0, bc: 0, cnt: 0, nn: 0, fw: 0, bk: 0, tm: 0, mtm: 0, err: 0 };
}
function ut(t, e) {
  let s = e === "rgb444" ? 4096 : 65536, n = new Array(s), r = t.length;
  if (e === "rgba4444") for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 24 & 255, x = i >> 16 & 255, a = i >> 8 & 255, l = i & 255, f = G(l, a, x, c), g = f in n ? n[f] : n[f] = Q();
    g.rc += l, g.gc += a, g.bc += x, g.ac += c, g.cnt++;
  }
  else if (e === "rgb444") for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 16 & 255, x = i >> 8 & 255, a = i & 255, l = j(a, x, c), f = l in n ? n[l] : n[l] = Q();
    f.rc += a, f.gc += x, f.bc += c, f.cnt++;
  }
  else for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 16 & 255, x = i >> 8 & 255, a = i & 255, l = D(a, x, c), f = l in n ? n[l] : n[l] = Q();
    f.rc += a, f.gc += x, f.bc += c, f.cnt++;
  }
  return n;
}
function H(t, e, s = {}) {
  let { format: n = "rgb565", clearAlpha: r = true, clearAlphaColor: o = 0, clearAlphaThreshold: i = 0, oneBitAlpha: c = false } = s;
  if (!t || !t.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
  if (!(t instanceof Uint8Array) && !(t instanceof Uint8ClampedArray)) throw new Error("quantize() expected RGBA Uint8Array data");
  let x = new Uint32Array(t.buffer), a = s.useSqrt !== false, l = n === "rgba4444", f = ut(x, n), g = f.length, h = g - 1, b = new Uint32Array(g + 1);
  for (var w = 0, u = 0; u < g; ++u) {
    let C = f[u];
    if (C != null) {
      var _ = 1 / C.cnt;
      l && (C.ac *= _), C.rc *= _, C.gc *= _, C.bc *= _, f[w++] = C;
    }
  }
  T(e) / w < 0.022 && (a = false);
  for (var u = 0; u < w - 1; ++u) f[u].fw = u + 1, f[u + 1].bk = u, a && (f[u].cnt = Math.sqrt(f[u].cnt));
  a && (f[u].cnt = Math.sqrt(f[u].cnt));
  var k, B, p;
  for (u = 0; u < w; ++u) {
    tt(f, u, false);
    var A = f[u].err;
    for (B = ++b[0]; B > 1 && (p = B >> 1, !(f[k = b[p]].err <= A)); B = p) b[B] = k;
    b[B] = u;
  }
  var z = w - e;
  for (u = 0; u < z; ) {
    for (var d; ; ) {
      var I = b[1];
      if (d = f[I], d.tm >= d.mtm && f[d.nn].mtm <= d.tm) break;
      d.mtm == h ? I = b[1] = b[b[0]--] : (tt(f, I, false), d.tm = u);
      var A = f[I].err;
      for (B = 1; (p = B + B) <= b[0] && (p < b[0] && f[b[p]].err > f[b[p + 1]].err && p++, !(A <= f[k = b[p]].err)); B = p) b[B] = k;
      b[B] = I;
    }
    var y = f[d.nn], m = d.cnt, v = y.cnt, _ = 1 / (m + v);
    l && (d.ac = _ * (m * d.ac + v * y.ac)), d.rc = _ * (m * d.rc + v * y.rc), d.gc = _ * (m * d.gc + v * y.gc), d.bc = _ * (m * d.bc + v * y.bc), d.cnt += y.cnt, d.mtm = ++u, f[y.bk].fw = y.fw, f[y.fw].bk = y.bk, y.mtm = h;
  }
  let M = [];
  var V = 0;
  for (u = 0; ; ++V) {
    let L = R(Math.round(f[u].rc), 0, 255), C = R(Math.round(f[u].gc), 0, 255), Y = R(Math.round(f[u].bc), 0, 255), E = 255;
    if (l) {
      if (E = R(Math.round(f[u].ac), 0, 255), c) {
        let st = typeof c == "number" ? c : 127;
        E = E <= st ? 0 : 255;
      }
      r && E <= i && (L = C = Y = o, E = 0);
    }
    let K = l ? [L, C, Y, E] : [L, C, Y];
    if (xt(M, K) || M.push(K), (u = f[u].fw) == 0) break;
  }
  return M;
}
function xt(t, e) {
  for (let s = 0; s < t.length; s++) {
    let n = t[s], r = n[0] === e[0] && n[1] === e[1] && n[2] === e[2], o = n.length >= 4 && e.length >= 4 ? n[3] === e[3] : true;
    if (r && o) return true;
  }
  return false;
}
function U(t, e) {
  var s = 0, n;
  for (n = 0; n < t.length; n++) {
    let r = t[n] - e[n];
    s += r * r;
  }
  return s;
}
function P(t, e) {
  return e > 1 ? Math.round(t / e) * e : t;
}
function et(t, { roundRGB: e = 5, roundAlpha: s = 10, oneBitAlpha: n = null } = {}) {
  let r = new Uint32Array(t.buffer);
  for (let o = 0; o < r.length; o++) {
    let i = r[o], c = i >> 24 & 255, x = i >> 16 & 255, a = i >> 8 & 255, l = i & 255;
    if (c = P(c, s), n) {
      let f = typeof n == "number" ? n : 127;
      c = c <= f ? 0 : 255;
    }
    l = P(l, e), a = P(a, e), x = P(x, e), r[o] = c << 24 | x << 16 | a << 8 | l << 0;
  }
}
function nt(t, e, s = "rgb565") {
  if (!t || !t.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
  if (!(t instanceof Uint8Array) && !(t instanceof Uint8ClampedArray)) throw new Error("quantize() expected RGBA Uint8Array data");
  if (e.length > 256) throw new Error("applyPalette() only works with 256 colors or less");
  let n = new Uint32Array(t.buffer), r = n.length, o = s === "rgb444" ? 4096 : 65536, i = new Uint8Array(r), c = new Array(o), x = s === "rgba4444";
  if (s === "rgba4444") for (let a = 0; a < r; a++) {
    let l = n[a], f = l >> 24 & 255, g = l >> 16 & 255, h = l >> 8 & 255, b = l & 255, w = G(b, h, g, f), _ = w in c ? c[w] : c[w] = gt(b, h, g, f, e);
    i[a] = _;
  }
  else {
    let a = s === "rgb444" ? j : D;
    for (let l = 0; l < r; l++) {
      let f = n[l], g = f >> 16 & 255, h = f >> 8 & 255, b = f & 255, w = a(b, h, g), _ = w in c ? c[w] : c[w] = bt(b, h, g, e);
      i[l] = _;
    }
  }
  return i;
}
function gt(t, e, s, n, r) {
  let o = 0, i = 1e100;
  for (let c = 0; c < r.length; c++) {
    let x = r[c], a = x[3], l = q(a - n);
    if (l > i) continue;
    let f = x[0];
    if (l += q(f - t), l > i) continue;
    let g = x[1];
    if (l += q(g - e), l > i) continue;
    let h = x[2];
    l += q(h - s), !(l > i) && (i = l, o = c);
  }
  return o;
}
function bt(t, e, s, n) {
  let r = 0, o = 1e100;
  for (let i = 0; i < n.length; i++) {
    let c = n[i], x = c[0], a = q(x - t);
    if (a > o) continue;
    let l = c[1];
    if (a += q(l - e), a > o) continue;
    let f = c[2];
    a += q(f - s), !(a > o) && (o = a, r = i);
  }
  return r;
}
function rt(t, e, s = 5) {
  if (!t.length || !e.length) return;
  let n = t.map((i) => i.slice(0, 3)), r = s * s, o = t[0].length;
  for (let i = 0; i < e.length; i++) {
    let c = e[i];
    c.length < o ? c = [c[0], c[1], c[2], 255] : c.length > o ? c = c.slice(0, 3) : c = c.slice();
    let x = N(n, c.slice(0, 3), U), a = x[0], l = x[1];
    l > 0 && l <= r && (t[a] = c);
  }
}
function q(t) {
  return t * t;
}
function W(t, e, s = U) {
  let n = Infinity, r = -1;
  for (let o = 0; o < t.length; o++) {
    let i = t[o], c = s(e, i);
    c < n && (n = c, r = o);
  }
  return r;
}
function N(t, e, s = U) {
  let n = Infinity, r = -1;
  for (let o = 0; o < t.length; o++) {
    let i = t[o], c = s(e, i);
    c < n && (n = c, r = o);
  }
  return [r, n];
}
function ot(t, e, s = U) {
  return t[W(t, e, s)];
}
function ct(t = {}) {
  let { initialCapacity: e = 4096, auto: s = true } = t, n = F(e), r = 5003, o = new Uint8Array(256), i = new Int32Array(r), c = new Int32Array(r), x = false;
  return { reset() {
    n.reset(), x = false;
  }, finish() {
    n.writeByte(X.trailer);
  }, bytes() {
    return n.bytes();
  }, bytesView() {
    return n.bytesView();
  }, get buffer() {
    return n.buffer;
  }, get stream() {
    return n;
  }, writeHeader: a, writeFrame(l, f, g, h = {}) {
    let { transparent: b = false, transparentIndex: w = 0, delay: _ = 0, palette: u = null, repeat: k = 0, colorDepth: B = 8, dispose: p = -1 } = h, A = false;
    if (s ? x || (A = true, a(), x = true) : A = Boolean(h.first), f = Math.max(0, Math.floor(f)), g = Math.max(0, Math.floor(g)), A) {
      if (!u) throw new Error("First frame must include a { palette } option");
      pt(n, f, g, u, B), it(n, u), k >= 0 && dt(n, k);
    }
    let z = Math.round(_ / 10);
    wt(n, p, z, b, w);
    let d = Boolean(u) && !A;
    ht(n, f, g, d ? u : null), d && it(n, u), yt(n, l, f, g, B, o, i, c);
  } };
  function a() {
    ft(n, "GIF89a");
  }
}
function wt(t, e, s, n, r) {
  t.writeByte(33), t.writeByte(249), t.writeByte(4), r < 0 && (r = 0, n = false);
  var o, i;
  n ? (o = 1, i = 2) : (o = 0, i = 0), e >= 0 && (i = e & 7), i <<= 2;
  let c = 0;
  t.writeByte(0 | i | c | o), S(t, s), t.writeByte(r || 0), t.writeByte(0);
}
function pt(t, e, s, n, r = 8) {
  let o = 1, i = 0, c = Z(n.length) - 1, x = o << 7 | r - 1 << 4 | i << 3 | c, a = 0, l = 0;
  S(t, e), S(t, s), t.writeBytes([x, a, l]);
}
function dt(t, e) {
  t.writeByte(33), t.writeByte(255), t.writeByte(11), ft(t, "NETSCAPE2.0"), t.writeByte(3), t.writeByte(1), S(t, e), t.writeByte(0);
}
function it(t, e) {
  let s = 1 << Z(e.length);
  for (let n = 0; n < s; n++) {
    let r = [0, 0, 0];
    n < e.length && (r = e[n]), t.writeByte(r[0]), t.writeByte(r[1]), t.writeByte(r[2]);
  }
}
function ht(t, e, s, n) {
  if (t.writeByte(44), S(t, 0), S(t, 0), S(t, e), S(t, s), n) {
    let r = 0, o = 0, i = Z(n.length) - 1;
    t.writeByte(128 | r | o | 0 | i);
  } else t.writeByte(0);
}
function yt(t, e, s, n, r = 8, o, i, c) {
  $(s, n, e, r, t, o, i, c);
}
function S(t, e) {
  t.writeByte(e & 255), t.writeByte(e >> 8 & 255);
}
function ft(t, e) {
  for (var s = 0; s < e.length; s++) t.writeByte(e.charCodeAt(s));
}
function Z(t) {
  return Math.max(Math.ceil(Math.log2(t)), 1);
}
var Bt = ct;

// src/export/encode.mjs
var gifenc = typeof Bt === "object" ? Bt : gifenc_esm_exports;
var { GIFEncoder, quantize, applyPalette } = gifenc;
function encodeGif(frames, size, delay, onProgress = () => {
}, height = size) {
  if (!frames.length || !Number.isInteger(size) || size < 1 || !Number.isInteger(height) || height < 1 || !Number.isFinite(delay) || delay < 10) throw new Error("Invalid GIF settings");
  for (const rgba of frames) if (rgba.length !== size * height * 4) throw new Error("Frame size mismatch");
  const samplesPerFrame = Math.min(4096, size * height);
  const samples = new Uint8Array(frames.length * samplesPerFrame * 4);
  frames.forEach((rgba, n) => {
    for (let j2 = 0; j2 < samplesPerFrame; j2++) {
      const offset = Math.floor(j2 * size * height / samplesPerFrame) * 4;
      samples.set(rgba.subarray(offset, offset + 4), (n * samplesPerFrame + j2) * 4);
    }
  });
  const palette = quantize(samples, 256);
  const gif = GIFEncoder();
  const indexed = frames.map((rgba) => applyPalette(rgba, palette));
  let i = 0, previous;
  while (i < indexed.length) {
    let end = i + 1;
    while (end < indexed.length && equalFrames(indexed[i], indexed[end])) end++;
    const bounds = previous ? diffBounds(previous, indexed[i], size, height) : { x: 0, y: 0, w: size, h: height };
    const patch = new Uint8Array(bounds.w * bounds.h);
    for (let row = 0; row < bounds.h; row++) patch.set(indexed[i].subarray((bounds.y + row) * size + bounds.x, (bounds.y + row) * size + bounds.x + bounds.w), row * bounds.w);
    const offset = gif.bytesView().length;
    gif.writeFrame(patch, bounds.w, bounds.h, { ...i === 0 ? { palette } : {}, delay: delay * (end - i), repeat: 0, dispose: 1 });
    if (previous) {
      const bytes = gif.bytesView(), descriptor = offset + 8;
      if (bytes[descriptor] !== 44) throw new Error("Unexpected GIF descriptor");
      bytes[descriptor + 1] = bounds.x & 255;
      bytes[descriptor + 2] = bounds.x >> 8;
      bytes[descriptor + 3] = bounds.y & 255;
      bytes[descriptor + 4] = bounds.y >> 8;
    }
    previous = indexed[i];
    onProgress(end / indexed.length);
    i = end;
  }
  gif.finish();
  return gif.bytes();
}
function equalFrames(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function diffBounds(previous, current, size, height) {
  let x0 = size, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < size; x++) if (previous[y * size + x] !== current[y * size + x]) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return x0 === size ? { x: 0, y: 0, w: 1, h: 1 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
