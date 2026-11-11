import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../js/data/session.js');
const S = globalThis.GannSession, U = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);

test('New York offset follows daylight saving time', () => {
  assert.equal(S.nyOffset(U(2026, 7, 1, 12)), -4 * 36e5);
  assert.equal(S.nyOffset(U(2026, 12, 1, 12)), -5 * 36e5);
});
test('Sunday evening belongs to Monday’s daily candle (like TradingView)', () => {
  assert.equal(S.bucket(U(2026, 11, 8, 23, 30), '1day', true), U(2026, 11, 9)); // Sun 18:30 NY (winter)
  assert.equal(S.bucket(U(2026, 11, 9, 21, 59), '1day', true), U(2026, 11, 9)); // Mon 16:59 NY
  assert.equal(S.bucket(U(2026, 11, 9, 23, 0), '1day', true), U(2026, 11, 10)); // Mon 18:00 NY → Tuesday
  assert.equal(S.bucket(U(2026, 7, 5, 22, 0), '1day', true), U(2026, 7, 6)); // summer: Sun 18:00 NY = 22:00 UTC
});
test('4h candles start at the 18:00 New York session open', () => {
  assert.equal(S.bucket(U(2026, 11, 9, 23, 15), '4h', true), U(2026, 11, 9, 23)); // winter: 23,03,07,11,15,19 UTC
  assert.equal(S.bucket(U(2026, 11, 10, 2, 59), '4h', true), U(2026, 11, 9, 23));
  assert.equal(S.bucket(U(2026, 11, 10, 3, 0), '4h', true), U(2026, 11, 10, 3));
  assert.equal(S.bucket(U(2026, 7, 7, 1, 0), '4h', true), U(2026, 7, 6, 22)); // summer: 22,02,06…
});
test('the last 4h candle of the day closes at 17:00 New York, not after the break', () => {
  const st = S.bucket(U(2026, 11, 10, 20, 0), '4h', true); // 15:00 NY
  assert.equal(S.closeOf(st, '4h', true), U(2026, 11, 10, 22)); // 17:00 NY winter
});
test('market hours: closed on the weekend and during the daily break', () => {
  assert.equal(S.isOpen(U(2026, 11, 14, 12)), false); // Saturday
  assert.equal(S.isOpen(U(2026, 11, 13, 22, 30)), false); // Fri 17:30 NY
  assert.equal(S.isOpen(U(2026, 11, 15, 23, 5)), true); // Sun 18:05 NY
  assert.equal(S.isOpen(U(2026, 11, 10, 22, 30)), false); // Tue 17:30 NY break
  assert.equal(S.isOpen(U(2026, 11, 10, 14)), true);
  assert.equal(S.nextOpen(U(2026, 11, 14, 12)), U(2026, 11, 15, 23));
});
test('aggregation keeps open/high/low/close exact', () => {
  const bars = [[U(2026, 11, 8, 23), 10, 12, 9, 11], [U(2026, 11, 9, 5), 11, 15, 10, 14], [U(2026, 11, 9, 21), 14, 14, 8, 9], [U(2026, 11, 9, 23), 9, 10, 9, 10]].map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
  const d = S.aggregate(bars, '1day', true);
  assert.deepEqual(d.map(b => [b.t, b.o, b.h, b.l, b.c]), [[U(2026, 11, 9), 10, 15, 8, 9], [U(2026, 11, 10), 9, 10, 9, 10]]);
});
