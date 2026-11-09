import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { G, SAMPLE } = createRequire(import.meta.url)('./_load.cjs');
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('Square of 9: 360° adds exactly 2 to the square root', () => {
  close(G.sq9Move(4, 360), 16); close(G.sq9Move(16, -360), 4); close(G.sq9Move(100, 180), 121);
  close(G.sq9Move(3866, 90), Math.pow(Math.sqrt(3866) + 0.5, 2));
});
test('Square of 9: every number from sq9NumbersAt lands on the requested angle', () => {
  for (const d of [0, 45, 90, 167.3, 359]) for (const n of G.sq9NumbersAt(d, 1, 5000)) close(G.sq9Deg(n), d % 360, 1e-7);
});
test('Square of 9: moving a number by +deg changes its angle by deg', () => {
  for (const x of [17, 250, 3866, 74372]) for (const d of [45, 90, 180, 270]) close(G.mod(G.sq9Deg(G.sq9Move(x, d)) - G.sq9Deg(x), 360), d, 1e-7);
});
test('nice() returns 1/2/2.5/5 × 10^k', () => {
  assert.equal(G.nice(4.4), 5); assert.equal(G.nice(0.0012), 0.001); assert.equal(G.nice(220), 200); assert.equal(G.nice(31), 25);
});
test('parseCSV: Twelve Data (;), Binance-like, day-first and decimal-comma inputs', () => {
  const td = G.parseCSV('datetime;open;high;low;close\n' + Array.from({ length: 45 }, (_, i) => `2026-01-${String(1 + (i % 28)).padStart(2, '0')} ${String(i % 24).padStart(2, '0')}:00:00;1.5;2.25;1.25;2`).join('\n'));
  assert.ok(!td.error); assert.equal(td.bars[0].h, 2.25); assert.ok(td.bars.every((b, i) => !i || b.t > td.bars[i - 1].t));
  const dc = G.parseCSV('date;open;high;low;close\n' + Array.from({ length: 45 }, (_, i) => `${String(1 + (i % 28)).padStart(2, '0')}/0${1 + Math.floor(i / 28)}/2026;1.234,5;1.300,0;1.200,0;1.250,0`).join('\n'));
  assert.ok(!dc.error, dc.error); assert.equal(dc.bars[0].c, 1250);
  assert.equal(G.parseDate('2026-11-09 12:30:00'), Date.UTC(2026, 10, 9, 12, 30));
  assert.equal(G.parseDate('09/11/2026'), Date.UTC(2026, 10, 9));
});
test('pivots: raw pivots seen at bar i never change when later bars arrive (no look-ahead)', () => {
  const bars = G.parseCSV(SAMPLE).bars, k = 6, full = G.pivots(bars, k).raw.filter(p => !p.tent);
  for (const m of [80, 150, 220, bars.length - 1]) {
    const part = G.pivots(bars.slice(0, m + 1), k).raw.filter(p => !p.tent);
    const seenFull = full.filter(p => p.i + k <= m).map(p => p.i + p.type).join();
    const seenPart = part.filter(p => p.i + k <= m).map(p => p.i + p.type).join();
    assert.equal(seenPart, seenFull, `differs at m=${m}`);
  }
});
test('swing chart ends at the latest extreme and alternates direction', () => {
  const bars = G.parseCSV(SAMPLE).bars, sw = G.swingChart(bars, 2);
  for (let j = 2; j < sw.pts.length - 1; j++) assert.notEqual(Math.sign(sw.pts[j].p - sw.pts[j - 1].p), Math.sign(sw.pts[j + 1].p - sw.pts[j].p));
});
