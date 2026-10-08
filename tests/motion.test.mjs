import { test } from 'node:test';
import assert from 'node:assert/strict';

test('reaction holds the recognizable photo before abruptly punching in', async () => {
  const { getMotion } = await import('../src/render/motion.mjs');
  assert.equal(getMotion('zoom', 0.1, 1).sx, 1);
  assert.ok(getMotion('zoom', 0.5, 1).sx > 2.5);
  assert.equal(getMotion('zoom', 0.94, 1).sx, 1);
});

test('rush enters from off-screen and visibly squashes on impact', async () => {
  const { getMotion } = await import('../src/render/motion.mjs');
  assert.ok(getMotion('rush', 0, 1).x < -300);
  const impact = getMotion('rush', 0.3, 1);
  assert.ok(impact.sx > 1.5 && impact.sy < 0.7);
});

test('all templates have finite, positive geometry throughout the cycle', async () => {
  const { getMotion } = await import('../src/render/motion.mjs');
  for (const id of ['zoom', 'melt', 'rush']) for (const intensity of [0.25, 0.75, 1]) for (let i=0;i<=100;i++) {
    const m=getMotion(id,i/100,intensity);
    assert.ok(Object.values(m).every(Number.isFinite));
    assert.ok(m.sx>0 && m.sy>0);
  }
});
