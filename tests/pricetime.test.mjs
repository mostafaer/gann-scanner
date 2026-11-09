import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { G, S, SAMPLE } = createRequire(import.meta.url)('./_load.cjs');
const bars = G.parseCSV(SAMPLE).bars;
const O = { pivK: 6, anchorI: null, anchorMode: 'main', timeMode: 'cal', unit: 5, sqk: 1, pf: 1, horizon: 120, harm: false, helio: false, planets: ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'], tolPct: 0.3, win: 1 };

test('squared curves satisfy sqrt(P) − sqrt(E) = integer (even = same angle, odd = opposite)', () => {
  const c = S.build(bars, O), a = c.main;
  for (const j of [a.i + 10, a.i + 40, c.n + 30]) for (const q of S.squaredCurvePrices(c, a, j, 3000, 5500)) {
    const e = S.elapsedIdx(c, a.i, j);
    if (q.kind === 'bal1') { assert.ok(Math.abs(Math.abs(q.p - a.p) / c.u - e) < 1e-9); continue; }
    const d = Math.sqrt(q.p) - Math.sqrt(e); assert.ok(Math.abs(d - Math.round(d)) < 1e-9);
    assert.equal(Math.round(d) % 2 === 0, q.kind === 'sq9');
    if (q.kind === 'sq9') assert.ok(Math.abs(G.wrap180(G.sq9Deg(q.p) - G.sq9Deg(e))) < 1e-6);
  }
});
test('hot spots sit on both the planet line and a squared curve', () => {
  const c = S.build(bars, O), a = c.main, so = { range: 8 };
  const hs = S.hotSpots(c, a, so, c.n, c.n + c.futN - 1);
  assert.ok(hs.length > 0, 'expected some future hot spots');
  for (const h of hs) {
    const v = G.mod(G.lon(h.P, h.t, false) + h.off, 360) * c.pf, cyc = 360 * c.pf;
    const line = v + Math.round((h.p - v) / cyc) * cyc;
    assert.ok(Math.abs(line - h.p) / h.p < 0.0015, `${h.P} line ${line.toFixed(2)} vs spot ${h.p.toFixed(2)}`);
    if (h.kind === 'bal1') assert.ok(Math.abs(Math.abs(h.p - a.p) / c.u - h.e) < 0.5);
    else { const d = Math.sqrt(h.p) - Math.sqrt(h.e); assert.ok(Math.abs(d - Math.round(d)) < 0.02, `sq9 residual ${d}`); }
  }
});
