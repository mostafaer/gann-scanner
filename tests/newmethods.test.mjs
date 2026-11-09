import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { G, S, SAMPLE } = createRequire(import.meta.url)('./_load.cjs');
const bars = G.parseCSV(SAMPLE).bars;
const O = { pivK: 6, anchorI: null, anchorMode: 'main', timeMode: 'cal', unit: 5, sqk: 1, pf: 1, horizon: 120, harm: false, helio: false, planets: ['Sun', 'Mars', 'Jupiter'], tolPct: 0.3, win: 1, ptPlanet: 'Sun', boxN: 52 };

test('planetary travel matches the change in longitude (Sun moves ~0.95–1.02°/day)', () => {
  const c = S.build(bars, O), a = c.piv.raw[2], i = a.i + 40;
  const d = S.planetTravel(c, a, i, 'Sun'), days = (c.T[i] - a.t) / 864e5;
  assert.ok(d / days > 0.95 && d / days < 1.02, `${(d / days).toFixed(4)}°/day`);
  const direct = G.mod(G.lon('Sun', c.T[i], false) - G.lon('Sun', a.t, false), 360);
  assert.ok(Math.abs(G.mod(d, 360) - direct) < 1e-9);
});
test('planetary-time 1×1 level = anchor ± degrees travelled × price per degree', () => {
  const c = S.build(bars, O), a = c.main, i = c.n - 1;
  const lv = S.priceLevels('ptime', c, i, [a], a, c.prevOpp, c.last.c).find(l => l.ang === '1×1');
  const d = S.planetTravel(c, a, i, 'Sun');
  if (lv) assert.ok(Math.abs(lv.p - (a.p + (a.type === 'L' ? 1 : -1) * d * c.pf)) < 1e-9);
});
test('Gann box 52: price side = 52 units, time side = 364 days, eighths in between', () => {
  const c = S.build(bars, O), b = S.boxSpan(c);
  assert.equal(b.price, 52 * c.u); assert.equal(b.time, 364);
  const ev = S.timeEvents('boxt', c, c.main.t, c.main.t + 800 * 864e5, [c.main], c.main);
  assert.ok(ev.some(e => Math.abs(e.t - (c.main.t + 182 * 864e5)) < 864e5), 'half of the box (26 weeks) missing');
});
test('price ÷ ratio becomes a time count (768 / 10 = 76.8 units)', () => {
  const c = S.build(bars, O), a = Object.assign({}, c.main, { p: 768 });
  const ev = S.timeEvents('ptsq', c, a.t, a.t + 2000 * 864e5, [a], a).filter(e => e.label.includes('÷ 10:'));
  assert.equal(ev.length, 1); assert.equal(Math.round((ev[0].t - a.t) / 864e5), 77);
});
