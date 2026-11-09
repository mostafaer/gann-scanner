import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { G, S, SAMPLE } = createRequire(import.meta.url)('./_load.cjs');
const bars = G.parseCSV(SAMPLE).bars;
const O = { pivK: 6, anchorI: null, anchorMode: 'main', timeMode: 'cal', unit: 5, sqk: 1, pf: 1, horizon: 30, harm: false, helio: false, planets: ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'], tolPct: 0.3, win: 1 };
const SO = { touchPct: 0.12, requireSq: true, mBal: true, mSq9: true, mCyc: true, mPdeg: false, balTol: 0.12, degTol: 6, win: 1, cooldown: 5, stopAtr: 0.3, minRR: 1.5, hold: 30 };
const key = s => [s.i, s.dir, s.P, s.off, s.v.toFixed(6), s.grade, s.a.i].join('|');

test('signals never use the future: same signals on truncated data', () => {
  const full = S.signals(S.build(bars, O), SO, 0);
  for (const m of [120, 200, bars.length - 20]) {
    const part = S.signals(S.build(bars.slice(0, m + 1), O), SO, 0);
    assert.deepEqual(part.map(key), full.filter(s => s.i <= m).map(key), `mismatch with data cut at bar ${m}`);
  }
});
test('every signal has a coherent trade plan', () => {
  for (const s of S.signals(S.build(bars, O), SO, 0)) {
    assert.ok(s.risk > 0);
    assert.ok((s.t1 - s.entry) * s.dir >= s.risk * SO.minRR - 1e-9, 'target 1 below the minimum reward:risk');
    assert.ok((s.stop - s.entry) * s.dir < 0, 'stop on the wrong side');
    assert.ok(s.sq.list.length > 0, 'requireSq is on but the signal is not squared');
  }
});
test('trade simulation is conservative: a bar touching stop and target counts as a loss', () => {
  const c = S.build(bars, O);
  const fake = [{ i: 10, dir: 1, entry: 100, stop: 90, t1: 120, risk: 10 }];
  const saved = c.bars[11]; c.bars[11] = { t: saved.t, o: 100, h: 130, l: 80, c: 100 };
  S.simulate(c, fake, 5); c.bars[11] = saved;
  assert.equal(fake[0].res.kind, 'stop'); assert.equal(fake[0].res.R, -1);
});
test('square state: 1×1 balance is exact when price move equals elapsed time units', () => {
  const c = S.build(bars, O), a = c.piv.raw[3], i = a.i + 30, e = S.elapsedIdx(c, a.i, i);
  const v = a.p + (a.type === 'L' ? 1 : -1) * e * c.u;
  const st = S.squareState(c, a, i, v, SO);
  assert.ok(Math.abs(st.bal - 1) < 1e-12 && st.bal1);
});
