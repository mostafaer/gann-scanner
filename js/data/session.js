/* ===== GannSession: candle boundaries that match TradingView =====
   Metals/forex on TradingView (OANDA:XAUUSD etc.) trade 18:00 → 17:00 New York time.
   • Daily candle = one New York session, dated by the trading day (Sunday evening belongs to Monday).
   • 4h candles start at the session open (18:00 New York) and every 4 hours after.
   • Weekly candle = Sunday 18:00 → Friday 17:00, dated by its Monday.
   • 15m / 1h are clock-aligned (same as plain UTC).
   Daylight saving time is handled through the browser's time-zone database. */
(function (root) {
  'use strict';
  const H = 36e5, DAY = 864e5;
  let NYF = null;
  function nyOffset(t) { // New York local time minus UTC, in ms (−4h in summer, −5h in winter)
    if (!NYF) NYF = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const p = {}; for (const x of NYF.formatToParts(new Date(t))) p[x.type] = x.value;
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(t / 6e4) * 6e4;
  }
  const PERIOD = { '15min': 15 * 6e4, '1h': H, '4h': 4 * H, '1day': DAY, '1week': 7 * DAY };
  /* start time (UTC ms) of the candle that contains t; `session` = true for metals/forex */
  function bucket(t, tf, session) {
    const P = PERIOD[tf];
    if (!session || tf === '15min' || tf === '1h') {
      if (tf === '1week') { const d = Math.floor(t / DAY) * DAY, wd = (new Date(d).getUTCDay() + 6) % 7; return d - wd * DAY; }
      return Math.floor(t / P) * P;
    }
    const off = nyOffset(t), local = t + off;
    if (tf === '4h') { const a = local - 18 * H; return Math.floor(a / P) * P + 18 * H - off; }
    const td = Math.floor((local + 6 * H) / DAY) * DAY; // trading date (UTC midnight label)
    if (tf === '1day') return td;
    const wd = (new Date(td).getUTCDay() + 6) % 7; return td - wd * DAY; // Monday of that trading week
  }
  /* when the candle starting at `start` closes (UTC ms) */
  function closeOf(start, tf, session) {
    if (!session || tf === '15min' || tf === '1h') return start + PERIOD[tf];
    if (tf === '4h') { const end = start + PERIOD[tf], s = sessionClose(start); return Math.min(end, s); }
    if (tf === '1day') return Date.UTC(new Date(start).getUTCFullYear(), new Date(start).getUTCMonth(), new Date(start).getUTCDate(), 17) - nyOffset(start + 17 * H);
    const fri = start + 4 * DAY; return Date.UTC(new Date(fri).getUTCFullYear(), new Date(fri).getUTCMonth(), new Date(fri).getUTCDate(), 17) - nyOffset(fri + 17 * H);
  }
  function sessionClose(t) { // the 17:00 New York close that ends the session containing t
    const off = nyOffset(t), local = t + off, td = Math.floor((local + 6 * H) / DAY) * DAY;
    return td + 17 * H - nyOffset(td + 17 * H);
  }
  /* metals/forex market open? closed Fri 17:00 → Sun 18:00 New York, and the daily 17:00–18:00 break */
  function isOpen(t) {
    const local = new Date(t + nyOffset(t)), wd = local.getUTCDay(), h = local.getUTCHours() + local.getUTCMinutes() / 60;
    if (wd === 6) return false;
    if (wd === 5 && h >= 17) return false;
    if (wd === 0 && h < 18) return false;
    return !(h >= 17 && h < 18);
  }
  function nextOpen(t) { let x = Math.ceil(t / 6e4) * 6e4; for (let k = 0; k < 60 * 24 * 4 && !isOpen(x); k++) x += 6e4; return x; }
  /* build candles of `tf` from finer bars (they must be sorted ascending) */
  function aggregate(bars, tf, session) {
    const out = []; let cur = null;
    for (const b of bars) {
      const k = bucket(b.t, tf, session);
      if (!cur || k !== cur.t) { cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0 }; out.push(cur); }
      else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.v += b.v || 0; }
    }
    return out;
  }
  root.GannSession = { nyOffset, bucket, closeOf, isOpen, nextOpen, aggregate, PERIOD };
})(typeof window !== 'undefined' ? window : globalThis);
