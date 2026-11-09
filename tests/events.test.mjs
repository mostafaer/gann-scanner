/* Known astronomical events (published times, UTC) must be found by the event scanner. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { G } = createRequire(import.meta.url)('./_load.cjs');
const U = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const find = (t0, t1, planets, pred) => G.astroEvents(t0, t1, planets, false).find(pred);
const near = (e, t, tolMin, what) => { assert.ok(e, `${what} not found`); const diff = Math.abs(e.t - t) / 6e4; assert.ok(diff <= tolMin, `${what}: off by ${diff.toFixed(1)} min`); };

test('Great conjunction of Jupiter and Saturn, 2020-12-21 ~18:20 UTC', () => {
  near(find(U(2020, 12, 1), U(2021, 1, 10), ['Jupiter', 'Saturn'], e => e.type === 'aspects' && e.asp === 'conj'), U(2020, 12, 21, 18, 20), 120, 'conjunction');
});
test('March equinox 2024-03-20 03:06 UTC (Sun at 0°)', () => {
  near(find(U(2024, 3, 1), U(2024, 4, 1), ['Sun'], e => e.type === 'season' && e.deg === 0), U(2024, 3, 20, 3, 6), 5, 'equinox');
});
test('New moon of the total solar eclipse, 2024-04-08 18:21 UTC', () => {
  near(find(U(2024, 4, 1), U(2024, 4, 15), ['Sun'], e => e.type === 'lunar' && e.phase === 0), U(2024, 4, 8, 18, 21), 5, 'new moon');
});
test('Mercury stations retrograde 2024-04-01 22:14 UTC', () => {
  near(find(U(2024, 3, 20), U(2024, 4, 10), ['Mercury'], e => e.type === 'stations' && e.P === 'Mercury' && e.retro), U(2024, 4, 1, 22, 14), 240, 'Mercury station');
});
