import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { G, S, SAMPLE } = createRequire(import.meta.url)('./_load.cjs');
const bars = G.parseCSV(SAMPLE).bars;
const O = { pivK: 6, anchorI: null, anchorMode: 'main', timeMode: 'cal', unit: 5, sqk: 1, pf: 1, horizon: 30, harm: false, helio: false, planets: ['Sun', 'Mars', 'Jupiter', 'Saturn'], tolPct: 0.3, win: 1, ptPlanet: 'Sun', boxN: 52 };
const SO = { swingN: 2, setDbl: true, setRet: true, setBrk: true, dblAtr: 0.5, retTol: 0.04, stopAtr: 0.3, maxRiskAtr: 4, useTime: true, timeMin: 3, priceMin: 3, tolPct: 0.3, win: 1, minRR: 1.5, hold: 40, exitMode: 'trail', mBal: true, mSq9: true, mCyc: true, mPdeg: false, mPlan: true, balTol: 0.12, degTol: 6 };
const on = id => !['nsq', 'sq144', 'box', 'boxt', 'ingress', 'lunar'].includes(id);
const key = s => [s.i, s.dir, s.setup, s.base.i, s.entry.toFixed(6), s.stop.toFixed(6), s.grade].join('|');

test('swing points are confirmed only after they happen, and never change later', () => {
  const full = S.swingStream(bars, 2);
  for (const p of full) assert.ok(p.conf > p.i);
  for (const m of [100, 200, bars.length - 10]) {
    const part = S.swingStream(bars.slice(0, m + 1), 2);
    assert.deepEqual(part.map(p => [p.i, p.type, p.conf].join()), full.filter(p => p.conf <= m).map(p => [p.i, p.type, p.conf].join()));
  }
});
test('Gann trades never use future bars: entries match on truncated data', () => {
  const full = S.gannTrades(S.build(bars, O), SO, on).list;
  assert.ok(full.length > 5, 'expected trades on a year of gold');
  for (const m of [150, 230, bars.length - 15]) {
    const part = S.gannTrades(S.build(bars.slice(0, m + 1), O), SO, on).list;
    assert.deepEqual(part.map(key), full.filter(s => s.i <= m).map(key), `entries differ with data cut at bar ${m}`);
  }
});
test('every Gann trade has its stop beyond the bottom/top it is built on', () => {
  for (const s of S.gannTrades(S.build(bars, O), SO, on).list) {
    assert.ok(s.risk > 0);
    if (s.setup !== 'brk') assert.ok(s.dir > 0 ? s.stop < s.base.p : s.stop > s.base.p, 'stop on the wrong side of the base swing');
    assert.ok((s.t1 - s.entry) * s.dir >= s.risk * SO.minRR - 1e-9);
    assert.ok(s.base.i < s.i, 'the base swing must be in the past');
  }
});
test('retracement setups sit between 3/8 and 5/8 of the previous swing (with tolerance)', () => {
  for (const s of S.gannTrades(S.build(bars, O), SO, on).list.filter(x => x.setup === 'ret')) assert.ok(s.ratio >= 0.375 - SO.retTol - 1e-9 && s.ratio <= 0.625 + SO.retTol + 1e-9);
});
test('trailing stop only moves in the trade’s favour', () => {
  for (const s of S.gannTrades(S.build(bars, O), SO, on).list) if (s.res.stopNow != null) assert.ok((s.res.stopNow - s.stop) * s.dir >= -1e-9);
});
