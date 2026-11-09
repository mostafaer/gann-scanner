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
    return { provider: 'twelve', id: s, label: `${s} · Twelve Data` };
  }

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
  async function tdBars(id, tf, size) {
    const j = await tdGet('time_series', { symbol: id, interval: TF[tf].td, outputsize: String(size || 1000), timezone: 'UTC', order: 'ASC' });
    const bars = tdValuesToBars(j.values || []);
    if (bars.length < 40) throw new DataError('short', `بيانات ${id} قليلة (${bars.length} شمعة).`);
    return { bars, meta: { provider: 'twelve', decimals: decimalsOf((j.values || []).slice(-50).map(v => v.close)), exchange: j.meta && j.meta.exchange, type: j.meta && j.meta.type } };
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
    return Object.assign(await tdBars(r.id, tf, size), { route: r });
  }

  /* live feed: history first, then ticks. Callbacks:
     onBars(bars, meta, isReload) · onTick(bar) (in-place update or new bar) · onStatus({kind, text, action}) */
  function createFeed(opts) {
    const { sym, tf, env, onBars, onTick, onStatus } = opts;
    const r = route(sym, !!(env && env.mcp));
    let stopped = false, stopWs = null, timers = [], last = null, quoteFail = 0;
    const later = (fn, ms) => { const id = setTimeout(() => { if (!stopped) fn(); }, ms); timers.push(id); };
    const status = (kind, text, action) => { if (!stopped) onStatus({ kind, text, action, route: r }); };
    const hidden = () => typeof document !== 'undefined' && document.hidden;

    async function loadHistory(reload) {
      try {
        const res = r.provider === 'binance' ? await bnBars(r.id, tf, 1000) : r.provider === 'claude' ? await claudeBars(env.mcp, r.id, tf, 1000) : await tdBars(r.id, tf, 1000);
        if (stopped) return;
        last = res.bars[res.bars.length - 1];
        onBars(res.bars, Object.assign(res.meta, { route: r }), reload);
        return true;
      } catch (e) {
        if (stopped) return;
        const act = e.code === 'nokey' || e.code === 'auth' ? { label: 'إضافة المفتاح', fn: () => opts.onNeedKey && opts.onNeedKey() } : e.needsApproval ? { label: 'السماح وجلب البيانات', fn: () => loadHistory(false) } : null;
        status('err', e.message, act);
        if (e.retryable) later(() => loadHistory(reload), (e.retryAfterMs || 5000) + Math.random() * 3000);
        return false;
      }
    }

    (async () => {
      status('load', `جارٍ جلب ${r.label}…`);
      const ok = await loadHistory(false);
      if (!ok || stopped) return;
      if (r.provider === 'binance') {
        stopWs = bnStream(r.id, tf, k => {
          if (stopped) return;
          onTick(k); last = k;
          status('on', `لحظي · ${r.label}`);
        }, st => status(st === 'open' ? 'on' : 'warn', st === 'open' ? `لحظي · ${r.label}` : 'انقطع البث اللحظي — إعادة الاتصال…'));
        // re-sync history every hour to catch any missed candles
        const resync = () => { loadHistory(true); later(resync, 36e5); }; later(resync, 36e5);
      } else {
        status('on', `مباشر · ${r.label} · تحديث كل ${Math.round(TF[tf].poll / 6e4)} د`);
        const pollSeries = async () => { if (!hidden()) await loadHistory(true); later(pollSeries, TF[tf].poll); };
        later(pollSeries, TF[tf].poll);
        if (r.provider === 'twelve') {
          const pollQuote = async () => {
            if (!hidden() && last) {
              try {
                const q = await tdQuote(r.id); quoteFail = 0;
                if (stopped || !(q.c > 0)) return;
                const daily = TF[tf].ms >= 864e5;
                if (daily && TF[tf].ms === 864e5 && isFinite(q.t) && q.t > last.t) { last = { t: q.t, o: q.o, h: q.h, l: q.l, c: q.c }; onTick(Object.assign({}, last, { isNew: true })); }
                else if (daily && TF[tf].ms === 864e5 && q.t === last.t) { last = Object.assign({}, last, { o: q.o, h: q.h, l: q.l, c: q.c }); onTick(last); }
                else { last = Object.assign({}, last, { c: q.c, h: Math.max(last.h, q.c), l: Math.min(last.l, q.c) }); onTick(last); }
                status('on', `مباشر · ${r.label} · آخر سعر ${new Date().toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}`);
              } catch (e) { quoteFail++; if (e.code === 'auth' || e.code === 'nokey') { status('err', e.message); return; } }
            }
            later(pollQuote, quoteFail ? 120e3 : 60e3);
          };
          later(pollQuote, 60e3);
        }
      }
    })();

    return {
      route: r,
      stop() { stopped = true; timers.forEach(clearTimeout); timers = []; if (stopWs) stopWs(); },
      refresh() { return loadHistory(true); },
    };
  }

  root.GannData = { TF, route, fetchBars, createFeed, getKey, setKey, decimalsOf, DataError, _tdValuesToBars: tdValuesToBars };
})(typeof window !== 'undefined' ? window : globalThis);
