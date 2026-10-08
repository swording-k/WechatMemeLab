const mix = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
/** @param {string} template @param {number} phase @param {number} intensity */
export function getMotion(template, phase, intensity) {
  const p = (phase % 1 + 1) % 1;
  const a = intensity;
  const m = { sx: 1, sy: 1, x: 0, y: 0, angle: 0, warp: 0 };
  if (template === 'zoom') {
    // A deadpan hold, two abrupt cuts, an uncomfortable close-up, then reset.
    const z = p < .25 ? 1 : p < .42 ? 1 + a * .8 : p < .84 ? 1 + a * 2.1 : 1;
    m.sx = z; m.sy = z;
    if (p >= .42 && p < .84) {
      m.x = Math.sin(p * 93) * a * 4;
      m.y = Math.cos(p * 79) * a * 3;
      m.warp = a * .35;
    }
  } else if (template === 'melt') {
    if (p < .18 || p > .85) return m;
    if (p > .65) {
      m.sx = 1 + .75 * a; m.sy = 1 - .52 * a; m.y = 22 * a; m.warp = -.5 * a;
    } else {
      const punch = Math.sin((p - .18) * Math.PI * 10);
      m.sx = 1 + punch * a * .65; m.sy = 1 - punch * a * .55;
      m.x = Math.sin(p * 130) * a * 17;
      m.y = Math.cos(p * 97) * a * 11;
      m.angle = Math.sin(p * 70) * a * .12;
      m.warp = Math.sin(p * 28) * a * .7;
    }
  } else if (template === 'rush') {
    if (p < .22) {
      m.x = mix(-390, 0, Math.pow(p / .22, .4)); m.angle = -.13 * a;
      m.sx = 1 + .35 * a; m.sy = 1 - .25 * a;
    } else if (p < .4) {
      const impact = 1 - (p - .22) / .18;
      m.sx = 1 + impact * a * 1.1; m.sy = 1 - impact * a * .65;
      m.y = impact * a * 65;
    } else if (p < .72) {
      const t = (p - .4) / .32;
      m.x = t * 350; m.y = -Math.sin(t * Math.PI / 2) * 350;
      m.angle = t * a * 3.5;
      m.sx = m.sy = 1 - t * .6;
    } else {
      const t = (p - .72) / .28;
      m.x = mix(-390, 0, 1 - (1 - t) ** 3);
      m.angle = -.08 * (1 - t);
    }
  }
  return m;
}
