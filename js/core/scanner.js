/* ===== Gann scanner: strategies, confluence, backtest (pure) ===== */
(function (root) {
  'use strict';
  const G = root.GannEngine, DAY = G.DAY, mod = G.mod;

  const STRATS = [
    { id: 'sq9', g: 'price', on: true },
    { id: 'angles', g: 'price', on: true },
    { id: 'div', g: 'price', on: true },
    { id: 'nsq', g: 'price', on: false },
    { id: 'sq144', g: 'price', on: false },
    { id: 'planet', g: 'price', on: true },
    { id: 'cycles', g: 'time', on: true },
    { id: 'tsq', g: 'time', on: true },
    { id: 'anniv', g: 'time', on: true },
    { id: 'season', g: 'time', on: true },
    { id: 'ptsq', g: 'time', on: true },
    { id: 'aspects', g: 'astro', on: true },
    { id: 'stations', g: 'astro', on: true },
    { id: 'ingress', g: 'astro', on: false },
    { id: 'lunar', g: 'astro', on: false },
    { id: 'swing', g: 'trend', on: true },
  ];
  const ANGLES = [
    { r: 8, l: '8×1' }, { r: 4, l: '4×1' }, { r: 3, l: '3×1' }, { r: 2, l: '2×1' }, { r: 1, l: '1×1' },
    { r: 1 / 2, l: '1×2' }, { r: 1 / 3, l: '1×3' }, { r: 1 / 4, l: '1×4' }, { r: 1 / 8, l: '1×8' }];
  const CYCLES = [30, 45, 60, 90, 120, 135, 144, 180, 225, 240, 270, 315, 360, 450, 540, 720];
  const CYC_W = { 90: 1.5, 144: 1.5, 180: 2, 270: 1.25, 360: 2, 720: 1.5 };

  /* ---------- context ---------- */
  function build(bars, o) {
    const n = bars.length, last = bars[n - 1];
    const weekend = bars.filter(b => { const d = new Date(b.t).getUTCDay(); return d === 0 || d === 6; }).length / n > 0.1;
    const piv = G.pivots(bars, o.pivK);
    let main = piv.find(p => p.i === o.anchorI) || piv[piv.length - 1];
    const mainPos = piv.indexOf(main);
    const prevOpp = mainPos > 0 ? piv[mainPos - 1] : null;
    let hi = -Infinity, lo = Infinity;
    for (const b of bars) { if (b.h > hi) hi = b.h; if (b.l < lo) lo = b.l; }
    const spanDays = (last.t - bars[0].t) / DAY;
    const u = o.unit > 0 ? o.unit : G.nice((hi - lo) / (o.timeMode === 'bar' ? n : spanDays));
    const sqk = o.sqk > 0 ? o.sqk : G.sq9Scale(last.c);
    const pf = o.pf > 0 ? o.pf : Math.pow(10, Math.floor(Math.log10(last.c)) - 3);
    // future trading calendar
    const T = bars.map(b => b.t);
    const diffs = []; for (let i = Math.max(1, n - 200); i < n; i++) diffs.push(bars[i].t - bars[i - 1].t);
    diffs.sort((a, b) => a - b);
    const step = Math.max(60e3, diffs[diffs.length >> 1] || DAY), daily = step >= DAY * 0.9;
    const stepF = daily ? DAY : step;
    const extendTo = idx => { while (T.length <= idx) { let t = T[T.length - 1] + stepF; if (!weekend) while ([0, 6].includes(new Date(t).getUTCDay())) t += daily ? DAY : step; T.push(t); } };
    let futN = 0; { const end = last.t + o.horizon * DAY; while (T[T.length - 1] < end && futN < 800) { extendTo(T.length); futN++; } }
    const ctx = { bars, n, last, piv, main, prevOpp, hi, lo, u, sqk, pf, T, extendTo, weekend, o, futN, step, daily };
    ctx.anchors = o.anchorMode === 'all' ? piv.filter(p => p.i <= main.i).slice(-8) : [main];
    if (!ctx.anchors.includes(main)) ctx.anchors.push(main);
    return ctx;
  }
  /* elapsed time units between bar a and time index/time */
  function elapsedIdx(ctx, aI, idx) {
    if (ctx.o.timeMode === 'bar') return idx - aI;
    ctx.extendTo(idx); return (ctx.T[idx] - ctx.T[aI]) / DAY;
  }
  function dateAfter(ctx, a, units) {
    if (ctx.o.timeMode === 'bar') { const k = a.i + Math.round(units); ctx.extendTo(k); return ctx.T[k]; }
    return a.t + (ctx.daily ? Math.round(units) * DAY : Math.round(units * DAY / 6e4) * 6e4);
  }
  /* fractional bar index for a time (for chart & bar-mapping) */
  function idxOfT(ctx, t) {
    const T = ctx.T;
    while (T[T.length - 1] < t) ctx.extendTo(T.length);
    let lo = 0, hi = T.length - 1;
    if (t <= T[0]) return (t - T[0]) / DAY;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
    return lo + (t - T[lo]) / (T[hi] - T[lo]);
  }

  /* ---------- PRICE strategies: levels at bar index i ---------- */
  function priceLevels(id, ctx, i, anchors, main, prevOpp, ref) {
    const L = [], o = ctx.o, u = ctx.u, k = ctx.sqk, lo = ref * 0.75, hi = ref * 1.25;
    const push = (p, w, label, extra) => { if (p > lo && p < hi) L.push(Object.assign({ p, w, s: id, label }, extra || {})); };
    if (id === 'sq9') {
      for (const a of anchors) for (let s = -16; s <= 16; s++) {
        if (!s) continue;
        const p = G.sq9Move(a.p * k, s * 45) / k;
        const w = s % 8 === 0 ? 2 : s % 4 === 0 ? 1.75 : s % 2 === 0 ? 1.5 : 1;
        push(p, w, `مربع ٩ ${iso((s > 0 ? '+' : '−') + Math.abs(s * 45) + '°')} من ${fmtP(a.p)}`, { a: a.i, deg: s * 45 });
      }
    } else if (id === 'angles') {
      for (const a of anchors) {
        const e = elapsedIdx(ctx, a.i, i); if (e <= 0) continue;
        const dir = a.type === 'L' ? 1 : -1;
        for (const A of ANGLES) {
          if (a !== main && A.r !== 1) continue;
          const w = A.r === 1 ? 2 : (A.r === 2 || A.r === 0.5) ? 1.5 : 1;
          push(a.p + dir * A.r * u * e, w, `زاوية ${A.l} من ${a.type === 'L' ? 'قاع' : 'قمة'} ${fmtP(a.p)}`, { a: a.i, ang: A.l });
        }
      }
    } else if (id === 'div') {
      const ranges = [];
      if (main && prevOpp) ranges.push({ a: Math.min(main.p, prevOpp.p), b: Math.max(main.p, prevOpp.p), nm: 'الموجة الرئيسية' });
      let mh = -Infinity, ml = Infinity; for (let j = 0; j <= Math.min(i, ctx.n - 1); j++) { mh = Math.max(mh, ctx.bars[j].h); ml = Math.min(ml, ctx.bars[j].l); }
      ranges.push({ a: ml, b: mh, nm: 'المدى الكلي' });
      const F = [[1, 8, 1], [2, 8, 1.25], [3, 8, 1.5], [4, 8, 2], [5, 8, 1.5], [6, 8, 1.25], [7, 8, 1], [1, 3, 1.5], [2, 3, 1.5]];
      for (const r of ranges) for (const [x, y, w] of F) push(r.a + (r.b - r.a) * x / y, w, `${x}/${y} ${r.nm}`);
    } else if (id === 'nsq') {
      const a0 = Math.floor(Math.sqrt(lo * k)), a1 = Math.ceil(Math.sqrt(hi * k));
      for (let m = a0; m <= a1; m++) { push(m * m / k, 1.25, `مربع طبيعي ${m}²`); push((m + 0.5) * (m + 0.5) / k, 0.75, `منتصف ${m}² و ${m + 1}²`); }
    } else if (id === 'sq144') {
      if (main) { const step = 144 * u / 8; for (let j = -24; j <= 24; j++) if (j) push(main.p + j * step, j % 8 === 0 ? 2 : j % 4 === 0 ? 1.5 : j % 2 === 0 ? 1.1 : 0.8, `مربع 144 ${iso((j > 0 ? '+' : '−') + Math.abs(j) + '/8')}`); }
    } else if (id === 'planet') {
      ctx.extendTo(i);
      const t = ctx.T[i] + DAY / 2, pf = ctx.pf;
      const offs = o.harm ? [0, 90, 180, 270] : [0];
      for (const P of o.planets) {
        const lv = G.lon(P, t, o.helio); if (lv == null) continue;
        for (const off of offs) {
          const base = mod(lv + off, 360) * pf, cyc = 360 * pf;
          for (let m = Math.floor((lo - base) / cyc); m <= Math.ceil((hi - base) / cyc); m++)
            push(base + m * cyc, off === 0 ? 1.25 : off === 180 ? 1 : 0.75, `${P}${off ? ` +${off}°` : ''}`, { planet: P, off });
        }
      }
    }
    return L;
  }

  function cluster(levels, ref, tolPct) {
    const tol = ref * tolPct / 100;
    const s = levels.slice().sort((a, b) => a.p - b.p), out = [];
    let cur = null;
    for (const l of s) {
      if (cur && l.p - cur.lo <= tol * 2) { cur.items.push(l); cur.hi = l.p; }
      else { cur = { lo: l.p, hi: l.p, items: [l] }; out.push(cur); }
    }
    for (const c of out) {
      const W = c.items.reduce((a, b) => a + b.w, 0);
      c.p = c.items.reduce((a, b) => a + b.p * b.w, 0) / W;
      c.strats = [...new Set(c.items.map(x => x.s))];
      c.score = W * (1 + 0.35 * (c.strats.length - 1));
    }
    return out;
  }

  /* ---------- TIME strategies: events in [t0,t1] ---------- */
  function timeEvents(id, ctx, t0, t1, anchors, main) {
    const ev = [], o = ctx.o, u = ctx.u;
    const push = (t, w, label, a, extra) => { if (t >= t0 && t <= t1) ev.push(Object.assign({ t, w, s: id, label, a }, extra || {})); };
    const unitName = o.timeMode === 'bar' ? 'شمعة' : 'يوم';
    if (id === 'cycles') {
      for (const a of anchors) for (const c of CYCLES) push(dateAfter(ctx, a, c), CYC_W[c] || 1, `${c} ${unitName} من ${a.type === 'L' ? 'قاع' : 'قمة'} ${fmtP(a.p)}`, a.i);
    } else if (id === 'tsq') {
      for (const a of anchors) for (let m = 4; m <= 32; m++) push(dateAfter(ctx, a, m * m), m % 3 === 0 ? 1.25 : 1, `${m}² = ${m * m} ${unitName} من ${fmtP(a.p)}`, a.i);
    } else if (id === 'anniv') {
      for (const a of ctx.piv) {
        if (a.i > main.i && o.anchorMode !== 'all') continue;
        const d = new Date(a.t);
        for (let y = 1; y <= 7; y++) push(Date.UTC(d.getUTCFullYear() + y, d.getUTCMonth(), d.getUTCDate()), y === 1 ? 1.75 : 1.25, `ذكرى ${y} سنة ل${a.type === 'L' ? 'قاع' : 'قمة'} ${fmtP(a.p)}`, a.i);
        for (const mo of [3, 4, 6, 7, 9]) push(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + mo, d.getUTCDate()), mo === 6 ? 1.25 : 0.75, `${mo} أشهر من ${fmtP(a.p)}`, a.i);
      }
    } else if (id === 'ptsq') {
      const k = ctx.sqk;
      for (const a of anchors) {
        const idx = ctx.piv.indexOf(a), prev = idx > 0 ? ctx.piv[idx - 1] : null;
        if (prev) { const R = Math.abs(a.p - prev.p) / u; for (const [f, w, nm] of [[0.5, 1, 'نصف'], [1, 2.25, ''], [2, 1.5, 'ضعف']]) push(dateAfter(ctx, a, R * f), w, `${nm ? nm + ' ' : ''}مدى ${fmtP(Math.abs(a.p - prev.p))} مُربّعًا بالزمن (${iso(Math.round(R * f))} ${unitName})`, a.i, { core: true }); }
        const P = a.p * k;
        for (let c = mod(P, 360); c <= 1440; c += 360) push(dateAfter(ctx, a, c), 1.5, `سعر ${fmtP(a.p)} كدرجات ≡ ${iso(mod(P, 360).toFixed(0) + '°')} ← ${iso(Math.round(c))} ${unitName}`, a.i);
        const dg = G.sq9Deg(P);
        for (const [off, w] of [[0, 1.75], [180, 1]]) for (const d of G.sq9NumbersAt(dg + off, 7, 1500)) push(dateAfter(ctx, a, d), w, `مربع ٩: زاوية الزمن تطابق زاوية ${fmtP(a.p)}${off ? ' (مقابلة)' : ''} ${iso(dg.toFixed(0) + '°')}`, a.i);
      }
      const cur = ctx.last.c;
      if (main) { const e = Math.abs(cur - main.p) / u; push(dateAfter(ctx, main, e), 1, `لو بقي السعر عند ${fmtP(cur)} يتربع مع ${fmtP(main.p)}`, main.i); }
    } else if (['season', 'aspects', 'stations', 'ingress', 'lunar'].includes(id)) {
      for (const e of G.astroEvents(t0, t1, ctx.o.planets, ctx.o.helio)) if (e.type === id) ev.push(Object.assign({ s: id, label: '' }, e));
    }
    return ev;
  }

  function windows(events, t0, t1, win) {
    const days = Math.ceil((t1 - t0) / DAY) + 1, score = new Float64Array(days), lists = Array.from({ length: days }, () => []);
    for (const e of events) {
      const d = Math.floor((e.t - t0) / DAY);
      for (let k = -win; k <= win; k++) { const j = d + k; if (j < 0 || j >= days) continue; const f = k === 0 ? 1 : 0.5; score[j] += e.w * f; if (k === 0) lists[j].push(e); }
    }
    const out = [];
    for (let j = 0; j < days; j++) {
      if (score[j] <= 0) continue;
      if ((j > 0 && score[j - 1] > score[j]) || (j < days - 1 && score[j + 1] >= score[j] && score[j + 1] > score[j])) continue;
      const items = []; for (let k = -win; k <= win; k++) if (lists[j + k]) items.push(...lists[j + k]);
      const strats = [...new Set(items.map(x => x.s))];
      out.push({ t: t0 + j * DAY, score: score[j] * (1 + 0.25 * (strats.length - 1)), items, strats });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  /* ---------- honest backtest: does price/time hit pivots more often than chance? ---------- */
  function backtest(ctx, ids) {
    const res = [], piv = ctx.piv, k = ctx.o.pivK, W = ctx.o.win, tol = ctx.o.tolPct;
    const usable = piv.filter((p, j) => j >= 3 && !p.tent);
    for (const id of ids) {
      const st = STRATS.find(s => s.id === id);
      if (st.g === 'price') {
        let tests = 0, hits = 0, base = 0, baseN = 0;
        for (const pj of usable) {
          const prior = (piv.raw || piv).filter(a => a.i + k < pj.i).slice(ctx.o.anchorMode === 'all' ? -6 : -2); if (prior.length < 2) continue;
          const main = prior[prior.length - 1], prevOpp = prior[prior.length - 2];
          const lv = priceLevels(id, ctx, pj.i, ctx.o.anchorMode === 'all' ? prior : [main], main, prevOpp, pj.p).map(x => x.p); if (!lv.length) continue;
          const near = p => lv.some(x => Math.abs(x - p) <= p * tol / 100);
          tests++; if (near(pj.p)) hits++;
          for (let b = Math.max(0, pj.i - 20); b <= Math.min(ctx.n - 1, pj.i + 20); b++) {
            if (Math.abs(b - pj.i) <= 2) continue;
            baseN += 2; if (near(ctx.bars[b].h)) base++; if (near(ctx.bars[b].l)) base++;
          }
        }
        res.push({ id, tests, hit: tests ? hits / tests : 0, base: baseN ? base / baseN : 0 });
      } else if (st.g === 'time' || st.g === 'astro') {
        const i0 = (piv[2] ? piv[2].i : 30), i1 = ctx.n - 1 - k;
        if (i1 - i0 < 30) { res.push({ id, tests: 0, hit: 0, base: 0 }); continue; }
        const t0 = ctx.T[i0], t1 = ctx.T[i1];
        const rawConf = (piv.raw || piv).filter(p => !p.tent);
        let ev = timeEvents(id, ctx, t0, t1, rawConf, rawConf[rawConf.length - 1]);
        const mainOnly = ctx.o.anchorMode !== 'all' && id !== 'anniv';
        ev = ev.filter(e => {
          if (e.a == null) return true;
          const at = idxOfT(ctx, e.t);
          if (e.a + k >= at) return false; // anchor not yet confirmed: would be look-ahead
          // "main anchor" mode: only the latest confirmed pivot at that moment projects time
          return !mainOnly || !rawConf.some(p => p.i > e.a && p.i + k < at);
        });
        const covered = new Uint8Array(ctx.n);
        const evBars = ev.map(e => Math.round(idxOfT(ctx, e.t)));
        for (const b of evBars) for (let x = b - W; x <= b + W; x++) if (x >= i0 && x <= i1) covered[x] = 1;
        let cov = 0; for (let x = i0; x <= i1; x++) cov += covered[x];
        const tp = usable.filter(p => p.i >= i0 && p.i <= i1);
        let hits = 0;
        for (const p of tp) if (ev.some((e, q) => Math.abs(evBars[q] - p.i) <= W && e.a !== p.i)) hits++;
        res.push({ id, tests: tp.length, hit: tp.length ? hits / tp.length : 0, base: cov / (i1 - i0 + 1), events: ev.length });
      }
    }
    for (const r of res) {
      r.lift = r.base > 0 ? r.hit / r.base : 0;
      r.hits = Math.round(r.hit * r.tests);
      r.p = binomTail(r.tests, r.hits, Math.min(0.999, Math.max(0.001, r.base)));
    }
    return res;
  }

  /* P(X >= k) for X ~ Binomial(n, p): chance of this many hits or more by luck */
  function binomTail(n, k, p) {
    if (!n) return 1; let lp = 0, sum = 0;
    const lc = (n, j) => { let v = 0; for (let i = 1; i <= j; i++) v += Math.log((n - j + i) / i); return v; };
    for (let j = k; j <= n; j++) { lp = lc(n, j) + j * Math.log(p) + (n - j) * Math.log(1 - p); sum += Math.exp(lp); }
    return Math.min(1, sum);
  }
  const iso = x => '\u2066' + x + '\u2069';

  /* ================= SIGNALS: price touches a planet's price while price & time are squared ================= */
  function atrSeries(bars, len) {
    const out = new Float64Array(bars.length); let a = 0;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i], pc = i ? bars[i - 1].c : b.c;
      const tr = Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
      a = i < len ? (a * i + tr) / (i + 1) : (a * (len - 1) + tr) / len; out[i] = a;
    }
    return out;
  }
  const SQS = []; for (let m = 3; m <= 40; m++) SQS.push(m * m);
  /* squaring state of a price v at bar i measured from anchor a */
  function squareState(ctx, a, i, v, so) {
    const e = elapsedIdx(ctx, a.i, i); if (e <= 0) return null;
    const units = Math.abs(v - a.p) / ctx.u, bal = units / e;
    const dP = G.sq9Deg(v * ctx.sqk), dT = G.sq9Deg(e);
    const d0 = Math.abs(G.wrap180(dP - dT)), d180 = Math.abs(G.wrap180(dP - dT - 180));
    const tw = so.win;
    const r = {
      e, units, bal, dP, dT, d0,
      bal1: so.mBal && Math.abs(bal - 1) <= so.balTol,
      sq9: so.mSq9 && d0 <= so.degTol,
      sq9o: so.mSq9 && !(d0 <= so.degTol) && d180 <= so.degTol,
      cyc: so.mCyc && (CYCLES.some(c => Math.abs(e - c) <= tw) || SQS.some(c => Math.abs(e - c) <= tw)),
      pdeg: so.mPdeg && Math.abs(G.wrap180(G.mod(a.p * ctx.sqk, 360) - G.mod(e, 360))) <= tw,
    };
    r.list = [];
    if (r.bal1) r.list.push('bal1'); if (r.sq9) r.list.push('sq9'); if (r.sq9o) r.list.push('sq9o'); if (r.cyc) r.list.push('cyc'); if (r.pdeg) r.list.push('pdeg');
    r.pts = (r.bal1 ? 1.5 : 0) + (r.sq9 ? 1.5 : 0) + (r.sq9o ? 0.75 : 0) + (r.cyc ? 1 : 0) + (r.pdeg ? 1 : 0);
    return r;
  }
  /* latest pivot that was already confirmed at bar i (k bars on its right exist by then): no look-ahead */
  function anchorAt(ctx, i, k) { let a = null; for (const p of (ctx.piv.raw || ctx.piv)) { if (p.i + k <= i) a = p; else if (p.i >= i) break; } return a; }

  /* scan bars [from..n-1]; so = signal options */
  function signals(ctx, so, from) {
    const bars = ctx.bars, n = ctx.n, k = ctx.o.pivK, atr = atrSeries(bars, 14), out = [];
    const offs = ctx.o.harm ? [0, 90, 180, 270] : [0], cyc = 360 * ctx.pf, last = {};
    for (let i = Math.max(15, from || 0); i < n; i++) {
      const b = bars[i], pb = bars[i - 1], tol = b.c * so.touchPct / 100;
      ctx.extendTo(i);
      const t = ctx.daily ? ctx.T[i] + DAY / 2 : ctx.T[i] + ctx.step / 2;
      const touches = [];
      for (const P of ctx.o.planets) {
        const L = G.lon(P, t, ctx.o.helio); if (L == null) continue;
        for (const off of offs) {
          const base = G.mod(L + off, 360) * ctx.pf;
          for (let m = Math.floor((b.l - tol - base) / cyc); m <= Math.ceil((b.h + tol - base) / cyc); m++) {
            const v = base + m * cyc;
            if (v < b.l - tol || v > b.h + tol) continue;
            let dir = 0;
            if (pb.c > v + tol * 0.25 && b.c >= v - tol) dir = 1;        // came from above, held: support bounce
            else if (pb.c < v - tol * 0.25 && b.c <= v + tol) dir = -1;  // came from below, rejected: resistance
            if (!dir) continue;
            const key = P + off + '_' + m;
            if (last[key] != null && i - last[key] <= so.cooldown) continue;
            touches.push({ P, off, v, dir, key });
          }
        }
      }
      if (!touches.length) continue;
      const a = (so.useMainFrom != null && i >= so.useMainFrom) ? ctx.main : anchorAt(ctx, i, k);
      if (!a) continue;
      let best = null;
      for (const tc of touches) {
        const sq = squareState(ctx, a, i, tc.v, so); if (!sq) continue;
        const agree = touches.filter(x => x.dir === tc.dir && Math.abs(x.v - tc.v) <= tol * 2).length;
        const score = 1 + (tc.off ? 0 : 0.5) + sq.pts + (agree - 1) * 0.5;
        if (!best || score > best.score) best = Object.assign({}, tc, { sq, score, agree });
      }
      if (!best) continue;
      const squared = best.sq.list.length > 0;
      if (so.requireSq && !squared) continue;
      touches.forEach(x => { last[x.key] = i; });
      const A = atr[i] || b.c * 0.01, dir = best.dir, entry = b.c;
      const stop = dir > 0 ? Math.min(b.l, best.v) - A * so.stopAtr : Math.max(b.h, best.v) + A * so.stopAtr;
      const risk = Math.abs(entry - stop);
      let t1 = G.sq9Move(best.v * ctx.sqk, dir * 90) / ctx.sqk, t2 = G.sq9Move(best.v * ctx.sqk, dir * 180) / ctx.sqk;
      if (!isFinite(t1) || (t1 - entry) * dir < risk * so.minRR) t1 = entry + dir * risk * so.minRR;
      if (!isFinite(t2) || (t2 - t1) * dir <= 0) t2 = entry + dir * Math.abs(t1 - entry) * 2;
      const grade = squared && best.sq.list.length >= 2 ? 'A' : squared ? 'B' : 'C';
      out.push({ i, t: b.t, dir, P: best.P, off: best.off, v: best.v, a, sq: best.sq, score: best.score, agree: best.agree, entry, stop, t1, t2, risk, grade, atr: A });
    }
    return out;
  }
  /* simulate each signal forward: stop first if both touched in one bar (conservative) */
  function simulate(ctx, sigs, maxBars) {
    const bars = ctx.bars, n = ctx.n;
    for (const s of sigs) {
      s.res = null;
      for (let j = s.i + 1; j < Math.min(n, s.i + 1 + maxBars); j++) {
        const b = bars[j];
        const hitStop = s.dir > 0 ? b.l <= s.stop : b.h >= s.stop;
        const hitT = s.dir > 0 ? b.h >= s.t1 : b.l <= s.t1;
        if (hitStop) { s.res = { kind: 'stop', j, R: -1 }; break; }
        if (hitT) { s.res = { kind: 'target', j, R: Math.abs(s.t1 - s.entry) / s.risk }; break; }
      }
      if (!s.res) {
        const j = Math.min(n - 1, s.i + maxBars);
        if (j - s.i >= maxBars) s.res = { kind: 'time', j, R: (bars[j].c - s.entry) * s.dir / s.risk };
        else s.res = { kind: 'open', j, R: (bars[n - 1].c - s.entry) * s.dir / s.risk };
      }
    }
    return sigs;
  }
  function stats(sigs) {
    const closed = sigs.filter(s => s.res && s.res.kind !== 'open');
    const R = closed.map(s => s.res.R), wins = R.filter(r => r > 0), losses = R.filter(r => r <= 0);
    const gp = wins.reduce((a, b) => a + b, 0), gl = -losses.reduce((a, b) => a + b, 0);
    return { n: closed.length, open: sigs.length - closed.length, win: closed.length ? wins.length / closed.length : 0,
      exp: closed.length ? R.reduce((a, b) => a + b, 0) / closed.length : 0, pf: gl > 0 ? gp / gl : (gp > 0 ? Infinity : 0), totalR: R.reduce((a, b) => a + b, 0) };
  }

  /* ================= PRICE-TIME MAP =================
     Square of 9: price P and elapsed time E are "squared" when sqrt(P·k) − sqrt(E) is an even integer
     (same angle) or an odd one (opposite angle). 1×1: |P − anchor|/u = E.
     Hot spots = moments when a planet's price line crosses one of these squared curves. */
  function squaredCurvePrices(ctx, a, j, lo, hi) {
    const e = elapsedIdx(ctx, a.i, j); if (e <= 0) return [];
    const k = ctx.sqk, r = Math.sqrt(e), out = [];
    const n0 = Math.ceil((Math.sqrt(Math.max(lo, 0) * k) - r) / 1), n1 = Math.floor((Math.sqrt(hi * k) - r) / 1);
    for (let n = n0; n <= n1; n++) { const p = Math.pow(r + n, 2) / k; out.push({ p, kind: n % 2 === 0 ? 'sq9' : 'sq9o', n }); }
    for (const sgn of [1, -1]) { const p = a.p + sgn * ctx.u * e; if (p > lo && p < hi) out.push({ p, kind: 'bal1', n: sgn }); }
    return out;
  }
  function hotSpots(ctx, a, so, jFrom, jTo) {
    const out = [], ref = ctx.last.c, lo = ref * (1 - so.range / 100), hi = ref * (1 + so.range / 100);
    const k = ctx.sqk, cyc = 360 * ctx.pf, offs = ctx.o.harm ? [0, 90, 180, 270] : [0];
    ctx.extendTo(jTo);
    const tAt = j => ctx.daily ? ctx.T[j] + DAY / 2 : ctx.T[j];
    for (const P of ctx.o.planets) {
      const L = []; for (let j = jFrom - 1; j <= jTo; j++) { const v = G.lon(P, tAt(Math.max(0, j)), ctx.o.helio); if (v == null) { L.length = 0; break; } L.push(v); }
      if (!L.length) continue;
      for (const off of offs) {
        const base0 = G.mod(L[0] + off, 360) * ctx.pf;
        for (let m = Math.floor((lo - base0) / cyc) - 1; m <= Math.ceil((hi - base0) / cyc) + 1; m++) {
          let prev = null, vPrev = null, shift = m * cyc;
          for (let q = 0; q < L.length; q++) {
            const j = jFrom - 1 + q;
            let v = G.mod(L[q] + off, 360) * ctx.pf + shift;
            if (vPrev != null && Math.abs(v - vPrev) > cyc / 2) { shift += v < vPrev ? cyc : -cyc; v += v < vPrev ? cyc : -cyc; }
            vPrev = v;
            const e = elapsedIdx(ctx, a.i, j);
            if (e <= 0 || v <= 0) { prev = null; continue; }
            const f = Math.sqrt(v * k) - Math.sqrt(e), g = Math.abs(v - a.p) / ctx.u - e;
            if (prev && j > jFrom - 1) {
              const cross = [];
              if (Math.floor(f / 2) !== Math.floor(prev.f / 2)) { const n = 2 * Math.max(Math.floor(f / 2), Math.floor(prev.f / 2)); cross.push({ kind: 'sq9', fr: (n - prev.f) / (f - prev.f) }); }
              if (Math.floor((f - 1) / 2) !== Math.floor((prev.f - 1) / 2)) { const n = 2 * Math.max(Math.floor((f - 1) / 2), Math.floor((prev.f - 1) / 2)) + 1; cross.push({ kind: 'sq9o', fr: (n - prev.f) / (f - prev.f) }); }
              if ((g <= 0) !== (prev.g <= 0)) cross.push({ kind: 'bal1', fr: prev.g / (prev.g - g) });
              for (const c of cross) {
                const fr = Math.min(1, Math.max(0, c.fr)), t = ctx.T[j - 1] + fr * (ctx.T[j] - ctx.T[j - 1]), p = prev.v + fr * (v - prev.v);
                if (p < lo || p > hi) continue;
                out.push({ t, p, P, off, kind: c.kind, j: fr < 0.5 ? j - 1 : j, e: elapsedIdx(ctx, a.i, j - 1) + fr * (e - elapsedIdx(ctx, a.i, j - 1)), a });
              }
            }
            prev = { f, g, v };
          }
        }
      }
    }
    for (const h of out) h.w = (h.kind === 'sq9o' ? 1 : 1.5) * (h.off ? 0.75 : 1);
    return out.sort((x, y) => x.t - y.t);
  }

  let fmtP = p => (Math.abs(p) >= 1000 ? p.toFixed(1) : Math.abs(p) >= 10 ? p.toFixed(2) : p.toFixed(4));
  root.GannScanner = { hotSpots, squaredCurvePrices, signals, simulate, stats, squareState, anchorAt, atrSeries, STRATS, ANGLES, CYCLES, build, elapsedIdx, dateAfter, idxOfT, priceLevels, cluster, timeEvents, windows, backtest, setFmt: f => { fmtP = f; } };
})(typeof window !== 'undefined' ? window : globalThis);
