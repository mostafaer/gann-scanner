/* ===== GannData: market data providers =====
   - binance : crypto, keyless, REST history + WebSocket ticks (real time)
   - twelve  : forex, metals, stocks, ETFs via Twelve Data REST with the viewer's own API key
   - claude  : Twelve Data through the viewer's claude.ai connector (inside claude.ai only)
   All bar times are UTC epoch milliseconds of the bar's open. */
(function (root) {
  'use strict';
  const G = root.GannEngine;
  const KEY_STORE = 'gann-scanner.tdkey';
  const TF = {
    '15min': { bn: '15m', td: '15min', ms: 15 * 6e4, poll: 60e3 },
    '1h': { bn: '1h', td: '1h', ms: 36e5, poll: 120e3 },
    '4h': { bn: '4h', td: '4h', ms: 4 * 36e5, poll: 300e3 },
    '1day': { bn: '1d', td: '1day', ms: 864e5, poll: 600e3 },
    '1week': { bn: '1w', td: '1week', ms: 7 * 864e5, poll: 1800e3 },
  };
  const CRYPTO = new Set('BTC ETH SOL BNB XRP ADA DOGE AVAX DOT LINK LTC TRX TON SHIB BCH ATOM NEAR UNI ETC FIL APT ARB OP SUI PEPE XLM HBAR ICP INJ RNDR AAVE MKR'.split(' '));
  const BN_REST = 'https://data-api.binance.vision/api/v3/klines';
  const BN_WS = 'wss://data-stream.binance.vision/ws/';
  const TD_REST = 'https://api.twelvedata.com';
  const BNF_WS = 'wss://fstream.binance.com/ws/';
  const SES = root.GannSession;
  // metals: history from Twelve Data (spot), live from Binance's 1-second gold/silver index (keyless, no quota)
  const METALS = { 'XAU/USD': 'xauusdt', 'XAG/USD': 'xagusdt', 'XAUUSD': 'xauusdt', 'XAGUSD': 'xagusdt' };
  const FOREX = /^[A-Z]{3}\/[A-Z]{3}$/;
  /* Twelve Data free plan: 800 credits/day. Count them so a page left open all day never runs out */
  const BUDGET = 800, CREDIT_KEY = 'gann-scanner.tdcredits';
  function credits() { try { const v = JSON.parse(localStorage.getItem(CREDIT_KEY) || '{}'), d = new Date().toISOString().slice(0, 10); return v.d === d ? v.n : 0; } catch (e) { return 0; } }
  function spend(n) { try { const d = new Date().toISOString().slice(0, 10); localStorage.setItem(CREDIT_KEY, JSON.stringify({ d, n: credits() + n })); } catch (e) { } }

  function getKey() { try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; } }
  function setKey(k) { try { if (k) localStorage.setItem(KEY_STORE, k.trim()); else localStorage.removeItem(KEY_STORE); } catch (e) { } }

  /* decide where a symbol lives */
  function route(sym, hasClaude) {
    const s = String(sym).trim().toUpperCase();
    // inside claude.ai the page may only reach the viewer's connector (direct fetches are blocked)
    if (hasClaude) return { provider: 'claude', id: s, label: `${s} · Twelve Data` };
    let m = s.match(/^([A-Z0-9]{2,12})[\/\-]?(USDT|USDC|FDUSD)$/);
    if (m) return { provider: 'binance', id: m[1] + m[2], label: `${m[1]}/${m[2]} · Binance` };
    m = s.match(/^([A-Z0-9]{2,12})\/(USD|BTC|ETH)$/);
    if (m && CRYPTO.has(m[1])) {
      const q = m[2] === 'USD' ? 'USDT' : m[2];
      return { provider: 'binance', id: m[1] + q, label: `${m[1]}/${q} · Binance`, note: m[2] === 'USD' ? 'سعر مقابل USDT' : '' };
    }
    const metal = METALS[s];
    const id = metal ? (s.includes('/') ? s : s.slice(0, 3) + '/' + s.slice(3)) : s;
    return { provider: 'twelve', id, label: `${id} · Twelve Data`, session: !!metal || FOREX.test(id), live: metal || null };
  }
  /* when the candle that started at t closes, and whether the market is open (metals/forex sessions) */
  function barClose(t, tf, r) { return SES.closeOf(t, tf, !!(r && r.session)); }
  function marketOpen(r, t) { return !(r && r.session) || SES.isOpen(t == null ? Date.now() : t); }

  class DataError extends Error {
    constructor(code, message, extra) { super(message); this.code = code; Object.assign(this, extra || {}); }
  }

  /* ---------- Binance ---------- */
  async function bnBars(id, tf, limit) {
    const url = `${BN_REST}?symbol=${encodeURIComponent(id)}&interval=${TF[tf].bn}&limit=${Math.min(1000, limit || 1000)}`;
    let r;
    try { r = await fetch(url, { cache: 'no-store' }); } catch (e) { throw new DataError('network', 'تعذّر الاتصال بـ Binance. تحقق من الإنترنت.', { retryable: true }); }
    if (r.status === 400) throw new DataError('symbol', `الرمز ${id} غير موجود على Binance.`);
    if (r.status === 429 || r.status === 418) throw new DataError('rate', 'Binance طلب تهدئة الطلبات. ستُعاد المحاولة.', { retryable: true, retryAfterMs: 30e3 });
    if (!r.ok) throw new DataError('upstream', `Binance أعاد الخطأ ${r.status}.`, { retryable: true });
    const rows = await r.json();
    const bars = rows.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
    if (bars.length < 40) throw new DataError('short', `بيانات ${id} قليلة (${bars.length} شمعة).`);
    return { bars, meta: { provider: 'binance', decimals: decimalsOf(rows.slice(-50).map(k => k[4])) } };
  }
  function bnStream(id, tf, onKline, onState) {
    let ws = null, stopped = false, tries = 0, timer = null;
    const open = () => {
      if (stopped) return;
      ws = new WebSocket(`${BN_WS}${id.toLowerCase()}@kline_${TF[tf].bn}`);
      ws.onopen = () => { tries = 0; onState('open'); };
      ws.onmessage = ev => {
        try {
          const k = JSON.parse(ev.data).k; if (!k) return;
          onKline({ t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v, closed: k.x });
        } catch (e) { }
      };
      ws.onclose = () => { if (stopped) return; onState('closed'); const wait = Math.min(30e3, 1000 * Math.pow(2, tries++)) + Math.random() * 500; timer = setTimeout(open, wait); };
      ws.onerror = () => { try { ws.close(); } catch (e) { } };
    };
    open();
    return () => { stopped = true; clearTimeout(timer); if (ws) try { ws.close(); } catch (e) { } };
  }

  /* ---------- Twelve Data REST (viewer's key) ---------- */
  function tdError(j, status) {
    const msg = (j && j.message) || `خطأ ${status}`;
    const code = (j && j.code) || status;
    if (code === 401 || code === 403 || /api.?key/i.test(msg)) return new DataError('auth', 'مفتاح Twelve Data غير صالح أو غير مسموح له بهذه البيانات.');
    if (code === 429) return new DataError('rate', 'تجاوزت حد Twelve Data المجاني (8 طلبات/دقيقة أو 800/يوم). ستُعاد المحاولة.', { retryable: true, retryAfterMs: 61e3 });
    if (code === 404 || /symbol|not found|invalid/i.test(msg)) return new DataError('symbol', 'الرمز غير موجود لدى Twelve Data. جرّب صيغة مثل XAU/USD أو EUR/USD أو AAPL.');
    return new DataError('upstream', 'Twelve Data: ' + msg, { retryable: status >= 500 });
  }
  async function tdGet(path, params) {
    const key = getKey();
    if (!key) throw new DataError('nokey', 'أضف مفتاح Twelve Data المجاني من الإعدادات لعرض الذهب والعملات والأسهم.');
    const q = new URLSearchParams(Object.assign({}, params, { apikey: key }));
    let r;
    spend(1);
    try { r = await fetch(`${TD_REST}/${path}?${q}`, { cache: 'no-store' }); } catch (e) { throw new DataError('network', 'تعذّر الاتصال بـ Twelve Data. تحقق من الإنترنت.', { retryable: true }); }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (!r.ok || (j && j.status === 'error')) throw tdError(j, r.status);
    return j;
  }
  function tdValuesToBars(values) {
    const map = new Map();
    for (const v of values) {
      const t = G.parseDate(v.datetime), o = +v.open, h = +v.high, l = +v.low, c = +v.close;
      if (!isFinite(t) || !(c > 0)) continue;
      map.set(t, { t, o, h: Math.max(h, o, c), l: Math.min(l, o, c), c, v: v.volume != null ? +v.volume : undefined });
    }
    return [...map.values()].sort((a, b) => a.t - b.t);
  }
  async function tdBars(id, tf, size, r) {
    if (r && r.session && (tf === '4h' || tf === '1day' || tf === '1week')) return tdSessionBars(id, tf, r);
    const j = await tdGet('time_series', { symbol: id, interval: TF[tf].td, outputsize: String(size || 1000), timezone: 'UTC', order: 'ASC' });
    const bars = tdValuesToBars(j.values || []);
    if (bars.length < 40) throw new DataError('short', `بيانات ${id} قليلة (${bars.length} شمعة).`);
    return { bars, meta: { provider: 'twelve', decimals: decimalsOf((j.values || []).slice(-50).map(v => v.close)), exchange: j.meta && j.meta.exchange, type: j.meta && j.meta.type } };
  }
  /* TradingView-aligned 4h / daily / weekly candles for metals and forex, built from 1h (or daily) bars */
  async function tdSessionBars(id, tf, r) {
    let src;
    if (tf === '1week') {
      const j = await tdGet('time_series', { symbol: id, interval: '1day', outputsize: '1500', timezone: 'UTC', order: 'ASC' });
      src = tdValuesToBars(j.values || []).map(b => Object.assign(b, { t: b.t + 23 * 36e5 })); // a UTC daily bar ≈ the session that ends that day
    } else {
      const j1 = await tdGet('time_series', { symbol: id, interval: '1h', outputsize: '5000', timezone: 'UTC', order: 'ASC' });
      src = tdValuesToBars(j1.values || []);
      if (tf === '1day' && src.length) { // one more page for a longer daily history
        try {
          const end = new Date(src[0].t - 36e5).toISOString().slice(0, 19).replace('T', ' ');
          const j2 = await tdGet('time_series', { symbol: id, interval: '1h', outputsize: '5000', timezone: 'UTC', order: 'ASC', end_date: end });
          src = tdValuesToBars([...(j2.values || []), ...(j1.values || [])]);
        } catch (e) { }
      }
    }
    const bars = SES.aggregate(src, tf, true);
    if (bars.length < 40) throw new DataError('short', `بيانات ${id} قليلة (${bars.length} شمعة).`);
    return { bars, meta: { provider: 'twelve', session: true, decimals: 2, built: tf === '1week' ? '1day' : '1h' } };
  }
  /* Binance futures index price (gold/silver spot index aggregated from several vendors, every second) */
  function indexStream(pair, onPrice, onState) {
    let ws = null, stopped = false, tries = 0, timer = null, alive = 0;
    const open = () => {
      if (stopped) return;
      try { ws = new WebSocket(`${BNF_WS}${pair}@markPrice@1s`); } catch (e) { onState('fail'); return; }
      ws.onopen = () => { tries = 0; onState('open'); };
      ws.onmessage = ev => { try { const m = JSON.parse(ev.data); const i = +m.i; if (i > 0) { alive = Date.now(); onPrice(i, m.E || Date.now()); } } catch (e) { } };
      ws.onclose = () => { if (stopped) return; onState(tries > 3 ? 'fail' : 'closed'); const wait = Math.min(30e3, 1000 * Math.pow(2, tries++)) + Math.random() * 500; timer = setTimeout(open, wait); };
      ws.onerror = () => { try { ws.close(); } catch (e) { } };
    };
    open();
    return { stop() { stopped = true; clearTimeout(timer); if (ws) try { ws.close(); } catch (e) { } }, lastAt: () => alive };
  }
  async function tdQuote(id) {
    const j = await tdGet('quote', { symbol: id, timezone: 'UTC' });
    return { t: G.parseDate(j.datetime), o: +j.open, h: +j.high, l: +j.low, c: +j.close, open: j.is_market_open };
  }

  /* ---------- claude.ai connector ---------- */
  const payloadText = res => { const p = res && res.payload; if (typeof p === 'string') return p; if (p && typeof p.result === 'string') return p.result; const b = res && res.content && res.content.find(x => x.type === 'text'); if (b) { try { const j = JSON.parse(b.text); return typeof j.result === 'string' ? j.result : b.text; } catch (e) { return b.text; } } return ''; };
  function claudeErr(e) {
    const c = e && e.code;
    const M = {
      needs_reauth: 'انتهت صلاحية ربط Twelve Data — أعد ربطه من إعدادات claude.ai ← الموصلات',
      server_not_connected: 'موصل Twelve Data غير مضاف — أضفه من إعدادات claude.ai ← الموصلات',
      selection_required: 'اختر حساب Twelve Data من نافذة claude.ai',
      not_in_manifest: 'لم يُسمح للصفحة باستخدام Twelve Data — اسمح به من قائمة أذونات الصفحة',
      blocked_by_policy: 'سياسة مؤسستك تمنع هذا الموصل',
      approval_required: 'جلب البيانات يحتاج موافقتك',
      server_unavailable: 'خادم البيانات لا يستجيب الآن',
    };
    if (c === 'tool_error') return new DataError('upstream', 'رفض المزود الطلب: ' + String(e.message || '').slice(0, 120));
    return new DataError(c || 'upstream', M[c] || 'تعذّر جلب البيانات (' + (c || 'خطأ') + ')', { retryable: !!(e && e.retryable), retryAfterMs: e && e.retryAfterMs, needsApproval: c === 'approval_required' || c === 'not_in_manifest' });
  }
  async function claudeBars(mcp, id, tf, size) {
    let res;
    try { res = await mcp.callTool('Twelve Data', 'get_time_series', { symbol: id, interval: TF[tf].td, outputsize: size || 1000 }, { cache: { staleTime: 60e3, gcTime: 30 * 60e3 } }); } catch (e) { throw claudeErr(e); }
    const txt = payloadText(res), r = G.parseCSV(txt);
    if (r.error) throw new DataError(/symbol|not found|invalid/i.test(txt) ? 'symbol' : 'short', /symbol|not found|invalid/i.test(txt) ? `الرمز ${id} غير موجود لدى المزود.` : r.error);
    return { bars: r.bars, meta: { provider: 'claude', decimals: null, storedAt: res.cache ? res.cache.storedAt : null } };
  }

  /* ---------- helpers ---------- */
  function decimalsOf(arr) {
    let d = 0;
    for (const s of arr) { const t = String(s); const i = t.indexOf('.'); if (i >= 0) { const frac = t.slice(i + 1).replace(/0+$/, ''); d = Math.max(d, frac.length); } }
    return Math.min(d, 8);
  }

  /* one-shot history (used by the multi-symbol scanner) */
  async function fetchBars(sym, tf, size, env) {
    const r = route(sym, !!(env && env.mcp));
    if (r.provider === 'binance') return Object.assign(await bnBars(r.id, tf, size), { route: r });
    if (r.provider === 'claude') return Object.assign(await claudeBars(env.mcp, r.id, tf, size), { route: r });
    return Object.assign(await tdBars(r.id, tf, size, r), { route: r });
  }

  /* live feed: history first, then ticks. Callbacks:
     onBars(bars, meta, isReload) · onTick(bar) (in-place update or new bar) · onStatus({kind, text, action}) */
  function createFeed(opts) {
    const { sym, tf, env, onBars, onTick, onStatus } = opts;
    const r = route(sym, !!(env && env.mcp));
    let stopped = false, stopWs = null, idx = null, timers = [], last = null, quoteFail = 0, offset = 0, calib = true, histAt = 0, streamOk = false;
    const later = (fn, ms) => { const id = setTimeout(() => { if (!stopped) fn(); }, ms); timers.push(id); };
    const status = (kind, text, action) => { if (!stopped) onStatus({ kind, text, action, route: r }); };
    const hidden = () => typeof document !== 'undefined' && document.hidden;
    const hhmm = t => new Date(t).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
    const lowCredits = () => r.provider === 'twelve' && credits() >= BUDGET - 40;
    const closedText = () => `السوق مغلق · يفتح ${new Date(SES.nextOpen(Date.now())).toLocaleString('ar-EG-u-nu-latn', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}`;

    async function loadHistory(reload) {
      try {
        const res = r.provider === 'binance' ? await bnBars(r.id, tf, 1000) : r.provider === 'claude' ? await claudeBars(env.mcp, r.id, tf, 1000) : await tdBars(r.id, tf, 1000, r);
        if (stopped) return;
        // keep a live candle that is newer than the history (it came from the stream)
        if (reload && last && res.bars.length && last.t > res.bars[res.bars.length - 1].t) res.bars.push(Object.assign({}, last));
        else if (reload && last && res.bars.length && last.t === res.bars[res.bars.length - 1].t && streamOk) Object.assign(res.bars[res.bars.length - 1], { h: Math.max(res.bars[res.bars.length - 1].h, last.h), l: Math.min(res.bars[res.bars.length - 1].l, last.l), c: last.c });
        last = res.bars[res.bars.length - 1]; histAt = Date.now(); calib = true;
        onBars(res.bars, Object.assign(res.meta, { route: r, credits: credits() }), reload);
        return true;
      } catch (e) {
        if (stopped) return;
        const act = e.code === 'nokey' || e.code === 'auth' ? { label: 'إضافة المفتاح', fn: () => opts.onNeedKey && opts.onNeedKey() } : e.needsApproval ? { label: 'السماح وجلب البيانات', fn: () => loadHistory(false) } : null;
        status('err', e.message, act);
        if (e.retryable) later(() => loadHistory(reload), (e.retryAfterMs || 5000) + Math.random() * 3000);
        return false;
      }
    }
    /* one live price → update or open the current candle */
    function tick(price, at) {
      if (!last || !(price > 0)) return;
      const k = SES.bucket(at, tf, !!r.session);
      if (k > last.t) { last = { t: k, o: price, h: price, l: price, c: price, isNew: true }; }
      else if (k === last.t) { last = Object.assign({}, last, { h: Math.max(last.h, price), l: Math.min(last.l, price), c: price, isNew: false }); }
      else return;
      onTick(last);
    }

    (async () => {
      status('load', `جارٍ جلب ${r.label}…`);
      const ok = await loadHistory(false);
      if (!ok || stopped) return;
      if (r.provider === 'binance') {
        stopWs = bnStream(r.id, tf, k => {
          if (stopped) return;
          onTick(k); last = k; streamOk = true;
          status('on', `لحظي · ${r.label}`);
        }, st => status(st === 'open' ? 'on' : 'warn', st === 'open' ? `لحظي · ${r.label}` : 'انقطع البث اللحظي — إعادة الاتصال…'));
        const resync = () => { loadHistory(true); later(resync, 36e5); }; later(resync, 36e5);
        return;
      }
      if (r.provider === 'twelve' && r.live) {
        // real time: Binance gold/silver index every second, aligned to Twelve Data spot with a small offset
        idx = indexStream(r.live, (p, at) => {
          if (stopped) return;
          if (!marketOpen(r, at)) { status('warn', closedText()); return; }
          if (calib && last && Date.now() - histAt < 10 * 6e4) { const o = last.c - p; offset = Math.abs(o) / p < 0.005 ? o : 0; calib = false; }
          streamOk = true;
          tick(p + offset, at);
          status('on', `لحظي كل ثانية · ${r.id} · مؤشر Binance مُعايَر على Twelve Data`);
        }, st => {
          if (st === 'open') return;
          if (st === 'fail') { streamOk = false; status('warn', 'البث اللحظي غير متاح من شبكتك — التحديث كل دقيقة من Twelve Data'); startQuotePoll(); }
          else status('warn', 'انقطع البث اللحظي — إعادة الاتصال…');
        });
        // official candles from Twelve Data every 15 minutes (≈100 credits/day), only while the market is open
        const resync = async () => { if (!hidden() && marketOpen(r) && !lowCredits()) await loadHistory(true); later(resync, 15 * 6e4); };
        later(resync, 15 * 6e4);
        later(() => { if (!streamOk) { status('warn', 'البث اللحظي غير متاح — التحديث كل دقيقة من Twelve Data'); startQuotePoll(); } }, 12e3);
        if (!marketOpen(r)) status('warn', closedText());
        return;
      }
      status('on', `مباشر · ${r.label} · تحديث كل ${Math.round(TF[tf].poll / 6e4)} د`);
      const pollSeries = async () => { if (!hidden() && marketOpen(r) && !lowCredits()) await loadHistory(true); later(pollSeries, TF[tf].poll); };
      later(pollSeries, TF[tf].poll);
      if (r.provider === 'twelve') startQuotePoll();
    })();

    let quotePolling = false;
    function startQuotePoll() {
      if (quotePolling || r.provider !== 'twelve') return; quotePolling = true;
      const pollQuote = async () => {
        if (!hidden() && last && marketOpen(r) && !lowCredits() && !streamOk) {
          try {
            const q = await tdQuote(r.id); quoteFail = 0;
            if (stopped || !(q.c > 0)) return;
            tick(q.c, Date.now());
            status('on', `مباشر · ${r.label} · آخر سعر ${hhmm(Date.now())}`);
          } catch (e) { quoteFail++; if (e.code === 'auth' || e.code === 'nokey') { status('err', e.message); return; } }
        } else if (lowCredits()) status('warn', `اقترب رصيد Twelve Data اليومي من النفاد (${credits()}/${BUDGET}) — توقف التحديث حتى منتصف الليل UTC`);
        else if (!marketOpen(r)) status('warn', closedText());
        later(pollQuote, quoteFail ? 120e3 : 60e3);
      };
      later(pollQuote, 1000);
    }

    return {
      route: r,
      stop() { stopped = true; timers.forEach(clearTimeout); timers = []; if (stopWs) stopWs(); if (idx) idx.stop(); },
      refresh() { return loadHistory(true); },
    };
  }

  root.GannData = { TF, route, fetchBars, createFeed, barClose, marketOpen, credits, BUDGET, getKey, setKey, decimalsOf, DataError, _tdValuesToBars: tdValuesToBars };
})(typeof window !== 'undefined' ? window : globalThis);
