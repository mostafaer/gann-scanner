import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { D } = createRequire(import.meta.url)('./_load.cjs');

test('routing: crypto goes to Binance, everything else to Twelve Data', () => {
  assert.deepEqual([D.route('BTC/USD').provider, D.route('BTC/USD').id], ['binance', 'BTCUSDT']);
  assert.equal(D.route('ethusdt').id, 'ETHUSDT');
  assert.equal(D.route('SOL-USDC').id, 'SOLUSDC');
  assert.equal(D.route('XAU/USD').provider, 'twelve');
  assert.equal(D.route('XAU/USD').live, 'xauusdt');
  assert.equal(D.route('XAUUSD').id, 'XAU/USD');
  assert.equal(D.route('XAU/USD').session, true);
  assert.equal(D.route('AAPL').session, false);
  assert.equal(D.route('EUR/USD').provider, 'twelve');
  assert.equal(D.route('AAPL').provider, 'twelve');
  assert.equal(D.route('XAU/USD', true).provider, 'claude');
  assert.equal(D.route('BTC/USD', true).provider, 'claude');
});
test('Twelve Data JSON values become ascending UTC bars', () => {
  const b = D._tdValuesToBars([{ datetime: '2026-11-09 13:00:00', open: '2', high: '3', low: '1', close: '2.5' }, { datetime: '2026-11-09 12:00:00', open: '1', high: '2', low: '0.5', close: '2' }]);
  assert.equal(b.length, 2); assert.equal(b[0].t, Date.UTC(2026, 10, 9, 12)); assert.equal(b[1].c, 2.5);
});
test('decimals are read from the quoted strings', () => {
  assert.equal(D.decimalsOf(['4109.59254', '4066.03']), 5);
  assert.equal(D.decimalsOf(['74372.00000000']), 0);
});
