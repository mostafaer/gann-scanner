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
    { id: 'ptime', g: 'price', on: true },
    { id: 'box', g: 'price', on: false },
    { id: 'cycles', g: 'time', on: true },
    { id: 'tsq', g: 'time', on: true },
    { id: 'anniv', g: 'time', on: true },
    { id: 'season', g: 'time', on: true },
    { id: 'ptsq', g: 'time', on: true },
    { id: 'boxt', g: 'time', on: false },
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


  /* degrees a planet has travelled since an anchor (retrograde motion subtracts) — cached per anchor */
  const travelCache = new Map();
  function planetTravel(ctx, a, i, P) {
    const helio = ctx.o.helio, key = `${P}|${helio}|${a.t}|${ctx.daily}`;
    let arr = travelCache.get(key);
    if (!arr) { arr = { from: a.i, vals: [0], last: G.lon(P, a.t, helio) }; travelCache.set(key, arr); if (travelCache.size > 200) travelCache.delete(travelCache.keys().next().value); }
    if (arr.last == null) return null;
    ctx.extendTo(i);
    while (arr.from + arr.vals.length - 1 < i) {
      const j = arr.from + arr.vals.length, L = G.lon(P, ctx.T[j], helio);
      arr.vals.push(arr.vals[arr.vals.length - 1] + G.wrap180(L - arr.last)); arr.last = L;
    }
    return i < a.i ? null : arr.vals[i - a.i];
  }
  /* Gann box: N price units (× u) by N time units; "52" means 52 weeks */
  function boxSpan(ctx) {
    const N = ctx.o.boxN || 52, weeks = N === 52;
    const time = weeks ? (ctx.o.timeMode === 'bar' ? (ctx.daily ? 52 * 5 : 52) : 364) : N;
    return { N, price: N * ctx.u, time, label: weeks ? '52 أسبوع' : String(N) };
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
    } else if (id === 'ptime') {
      // planetary time: 1×1 = the price moves one degree-price (pf) for every degree the planet travels
      const P = o.ptPlanet || 'Sun';
      for (const a of anchors) {
        const d = planetTravel(ctx, a, i, P); if (d == null || d <= 0) continue;
        const dir = a.type === 'L' ? 1 : -1;
        for (const A of ANGLES) {
          if (a !== main && A.r !== 1) continue;
          push(a.p + dir * A.r * d * ctx.pf, A.r === 1 ? 2 : (A.r === 2 || A.r === 0.5) ? 1.5 : 1, `زاوية ${P} ${A.l} من ${fmtP(a.p)} (${iso(d.toFixed(1) + '°')})`, { a: a.i, ang: A.l, planet: P, ptime: true });
        }
      }
    } else if (id === 'box') {
      if (main) {
        const b = boxSpan(ctx), dir = main.type === 'L' ? 1 : -1;
        for (let j = -8; j <= 16; j++) if (j) push(main.p + dir * j * b.price / 8, j % 8 === 0 ? 2 : j % 4 === 0 ? 1.75 : j % 2 === 0 ? 1.5 : 1, `صندوق ${b.label} · ${iso((j > 0 ? '+' : '−') + Math.abs(j) + '/8')}`);
      }
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
      // price converted to time by a ratio (e.g. S&P low 768 → 76.8 months)
      for (const a of anchors) for (const r of [10, 100]) { const c = a.p * k / r; if (c >= 7 && c <= 1500) push(dateAfter(ctx, a, c), 1.25, `السعر ÷ ${r}: ${fmtP(a.p)} ← ${iso(c.toFixed(1))} ${unitName}`, a.i); }
      const cur = ctx.last.c;
      if (main) { const e = Math.abs(cur - main.p) / u; push(dateAfter(ctx, main, e), 1, `لو بقي السعر عند ${fmtP(cur)} يتربع مع ${fmtP(main.p)}`, main.i); }
    } else if (id === 'boxt') {
      if (main) { const b = boxSpan(ctx); for (let q = 1; q <= 16; q++) push(dateAfter(ctx, main, b.time * q / 8), q % 8 === 0 ? 2.25 : q % 4 === 0 ? 1.75 : q % 2 === 0 ? 1.25 : 0.75, `صندوق ${b.label}: ${iso(q + '/8')} من ${fmtP(main.p)}`, main.i); }
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
    if (so.mPlan) {
      const d = planetTravel(ctx, a, i, ctx.o.ptPlanet || 'Sun');
      r.travel = d; r.pUnits = Math.abs(v - a.p) / ctx.pf;
      r.plan = d != null && d > 0 && Math.abs(r.pUnits - d) <= Math.max(so.degTol / 3, d * so.balTol);
    }
    r.list = [];
    if (r.bal1) r.list.push('bal1'); if (r.sq9) r.list.push('sq9'); if (r.sq9o) r.list.push('sq9o'); if (r.cyc) r.list.push('cyc'); if (r.pdeg) r.list.push('pdeg'); if (r.plan) r.list.push('plan');
    r.pts = (r.bal1 ? 1.5 : 0) + (r.sq9 ? 1.5 : 0) + (r.sq9o ? 0.75 : 0) + (r.cyc ? 1 : 0) + (r.pdeg ? 1 : 0) + (r.plan ? 1.5 : 0);
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

  /* ================= GANN TRADING RULES =================
     Entries and exits the way Gann wrote them, evaluated bar by bar with only the information
     available at that bar (no look-ahead):
       • Swing chart (N-bar): a swing point is known only on the bar that confirms it.
       • Trend: up after a close above the last swing top, down after a close below the last swing bottom.
       • Setups  dbl : double/triple bottom (top) — a new swing low holds within tolerance of earlier lows
                 ret : 3/8–5/8 retracement (50% key) of the last swing, in the direction of the trend
                 brk : close through the last swing top (bottom) — "buy when the market crosses the old top"
       • Stop    : just under the bottom the trade is built on (Gann: 1–3 points under the bottom)
       • Exit    : trail the stop under each new swing bottom (top) as it is confirmed, or a fixed target
       • Grade   : confirmation from Gann time (cycles, anniversaries, seasonal, squares, aspects/stations,
                   price = time) and price (Square of 9, eighths, angles, planet lines…) at the turning point. */
  function swingStream(bars, N) {
    const conf = []; // {i, p, type:'H'|'L', conf}
    if (bars.length < 3) return conf;
    let dir = bars[1].c >= bars[0].c ? 1 : -1, ext = { i: 0, p: dir > 0 ? bars[0].h : bars[0].l }, cnt = 0, cand = null, prev = bars[0];
    for (let i = 1; i < bars.length; i++) {
      const b = bars[i];
      if (b.h <= prev.h && b.l >= prev.l) continue;
      if (dir > 0) {
        if (b.h > ext.p) { ext = { i, p: b.h }; cnt = 0; cand = null; }
        if (b.l < prev.l) { cnt++; if (!cand || b.l < cand.p) cand = { i, p: b.l }; } else { cnt = 0; cand = null; }
        if (cnt >= N) { conf.push({ i: ext.i, p: ext.p, type: 'H', conf: i }); dir = -1; ext = cand; cnt = 0; cand = null; }
      } else {
        if (b.l < ext.p) { ext = { i, p: b.l }; cnt = 0; cand = null; }
        if (b.h > prev.h) { cnt++; if (!cand || b.h > cand.p) cand = { i, p: b.h }; } else { cnt = 0; cand = null; }
        if (cnt >= N) { conf.push({ i: ext.i, p: ext.p, type: 'L', conf: i }); dir = 1; ext = cand; cnt = 0; cand = null; }
      }
      prev = b;
    }
    return conf;
  }
  const TIME_IDS = ['cycles', 'tsq', 'anniv', 'season', 'ptsq', 'boxt', 'aspects', 'stations'];
  const PRICE_IDS = ['sq9', 'angles', 'div', 'nsq', 'sq144', 'planet', 'ptime', 'box'];
  /* all time events over the history, each kept only if its anchor was confirmed before the event */
  function historicalTime(ctx, on) {
    const k = ctx.o.pivK, raw = (ctx.piv.raw || ctx.piv).filter(p => !p.tent), t0 = ctx.bars[0].t, t1 = ctx.T[ctx.n - 1];
    const out = [];
    for (const id of TIME_IDS) {
      if (!on(id)) continue;
      const anchors = ['cycles', 'tsq', 'ptsq', 'boxt'].includes(id) ? raw : raw;
      let ev = [];
      if (id === 'boxt' || id === 'ptsq') { for (const a of raw) ev.push(...timeEvents(id, ctx, t0, t1, [a], a)); }
      else ev = timeEvents(id, ctx, t0, t1, anchors, raw[raw.length - 1]);
      for (const e of ev) { const at = idxOfT(ctx, e.t); if (e.a == null || e.a + k <= at) out.push(Object.assign(e, { at })); }
    }
    return out.sort((a, b) => a.at - b.at);
  }
  function gannTrades(ctx, so, on) {
    const bars = ctx.bars, n = ctx.n, atr = atrSeries(bars, 14), sw = swingStream(bars, so.swingN || 2), k = ctx.o.pivK;
    const tEv = so.useTime ? historicalTime(ctx, on) : [];
    const out = [];
    let trend = 0, prevTrend = 0, si = 0, lastBrk = { 1: -1, '-1': -1 };
    const known = []; // swings confirmed so far
    const timeAt = (idx) => { const W = so.win; let w = 0; const hits = []; for (const e of tEv) { if (e.at < idx - W - 0.5) continue; if (e.at > idx + W + 0.5) break; w += e.w; hits.push(e); } return { w, hits }; };
    const priceAt = (idx, price) => {
      const anchors = (ctx.piv.raw || ctx.piv).filter(p => p.i + k <= idx).slice(-3); if (anchors.length < 2) return { strats: [], items: [] };
      const main = anchors[anchors.length - 1], prevOpp = anchors[anchors.length - 2], items = [];
      for (const id of PRICE_IDS) if (on(id)) for (const l of priceLevels(id, ctx, idx, anchors, main, prevOpp, price)) if (Math.abs(l.p - price) <= price * so.tolPct / 100) items.push(l);
      return { strats: [...new Set(items.map(x => x.s))], items };
    };
    for (let i = 2; i < n; i++) {
      const b = bars[i], A = atr[i] || b.c * 0.01;
      const fresh = [];
      while (si < sw.length && sw[si].conf === i) { known.push(sw[si]); fresh.push(sw[si]); si++; }
      const tops = known.filter(s => s.type === 'H'), bots = known.filter(s => s.type === 'L');
      const lastTop = tops[tops.length - 1], lastBot = bots[bots.length - 1];
      prevTrend = trend;
      if (lastTop && b.c > lastTop.p && lastTop.conf < i) trend = 1;
      else if (lastBot && b.c < lastBot.p && lastBot.conf < i) trend = -1;
      const cands = [];
      // --- swing-point setups (on the bar that confirms the new swing) ---
      for (const s of fresh) {
        const dir = s.type === 'L' ? 1 : -1, same = (dir > 0 ? bots : tops).slice(0, -1).slice(-3), opp = (dir > 0 ? tops : bots);
        const tol = Math.max(so.dblAtr * (atr[s.i] || A), s.p * 0.0005);
        // double / triple
        if (so.setDbl) {
          const m = same.filter(x => Math.abs(x.p - s.p) <= tol && opp.some(o => o.i > x.i && o.i < s.i));
          const broken = same.some(x => x.i > (m[0] ? m[0].i : Infinity) && (dir > 0 ? x.p < s.p - tol : x.p > s.p + tol));
          if (m.length && !broken) cands.push({ setup: m.length >= 2 ? 'tpl' : 'dbl', dir, base: s, ref: m[m.length - 1] });
        }
        // retracement 3/8 – 5/8 of the last swing, with the trend
        if (so.setRet && trend === dir) {
          const leg0 = same[same.length - 1], leg1 = opp[opp.length - 1];
          if (leg0 && leg1 && leg1.i > leg0.i && leg1.i < s.i) {
            const range = Math.abs(leg1.p - leg0.p), r = Math.abs(leg1.p - s.p) / (range || 1);
            if (range > 0 && r >= 0.375 - so.retTol && r <= 0.625 + so.retTol) cands.push({ setup: 'ret', dir, base: s, ratio: r, leg: [leg0, leg1] });
          }
        }
      }
      // --- breakout of the old top / bottom (trend change) ---
      if (so.setBrk && trend !== prevTrend && trend !== 0 && i - lastBrk[trend] > 3) {
        const dir = trend, base = dir > 0 ? lastBot : lastTop, level = dir > 0 ? lastTop : lastBot;
        if (base && level) { cands.push({ setup: 'brk', dir, base, level }); lastBrk[dir] = i; }
      }
      for (const c of cands) {
        const dir = c.dir, entry = b.c, buf = so.stopAtr * A;
        const stop = dir > 0 ? Math.min(c.base.p, c.ref ? c.ref.p : Infinity) - buf : Math.max(c.base.p, c.ref ? c.ref.p : -Infinity) + buf;
        const risk = (entry - stop) * dir;
        if (!(risk > 0) || risk > so.maxRiskAtr * A) continue;
        // confirmation at the turning point
        const tm = timeAt(c.base.i), pr = priceAt(c.base.i, c.base.p);
        const anc = anchorAt(ctx, c.base.i, k), sq = anc ? squareState(ctx, anc, c.base.i, c.base.p, so) : null;
        const timeOK = tm.w >= so.timeMin || (sq && sq.list.length > 0);
        const priceOK = pr.strats.length >= so.priceMin;
        const withTrend = trend === dir;
        let grade = timeOK && priceOK ? 'A' : timeOK || priceOK ? 'B' : 'C';
        if (!withTrend && c.setup !== 'dbl' && c.setup !== 'tpl') grade = grade === 'A' ? 'B' : 'C';
        // targets: the opposite swing (dbl/ret) or Square of 9 from the bottom/top
        const opp = dir > 0 ? lastTop : lastBot;
        const sq90 = G.sq9Move(c.base.p * ctx.sqk, dir * 90) / ctx.sqk, sq180 = G.sq9Move(c.base.p * ctx.sqk, dir * 180) / ctx.sqk;
        let t1 = [opp && (opp.p - entry) * dir > 0 ? opp.p : null, sq90].filter(v => v != null && isFinite(v) && (v - entry) * dir >= risk * so.minRR).sort((x, y) => (x - y) * dir)[0];
        if (t1 == null) t1 = entry + dir * risk * so.minRR;
        let t2 = isFinite(sq180) && (sq180 - t1) * dir > 0 ? sq180 : entry + dir * Math.abs(t1 - entry) * 2;
        const score = (grade === 'A' ? 3 : grade === 'B' ? 2 : 1) + Math.min(2, tm.w / 3) + pr.strats.length * 0.4 + (withTrend ? 0.5 : 0);
        out.push({ i, t: b.t, dir, setup: c.setup, base: c.base, ref: c.ref, ratio: c.ratio, level: c.level, entry, stop, risk, t1, t2, grade, score, withTrend, time: tm, price: pr, sq, atr: A,
          // old fields kept for the UI
          P: null, v: c.base.p, a: anc || c.base });
      }
    }
    // one trade per bar: keep the best
    const best = new Map(); for (const s of out) { const k2 = s.i + '|' + s.dir; if (!best.has(k2) || best.get(k2).score < s.score) best.set(k2, s); }
    const list = [...best.values()].sort((a, b) => a.i - b.i);
    simulateGann(ctx, list, sw, so, atr);
    return { list, swings: sw };
  }
  /* Gann exits: stop first; trail under each newly confirmed swing (after 1R the stop is at least break-even);
     optional fixed target; time stop; exit on a close through the last swing against the trade */
  function simulateGann(ctx, sigs, sw, so, atr) {
    const bars = ctx.bars, n = ctx.n;
    for (const s of sigs) {
      let stop = s.stop, res = null, moved1R = false;
      for (let j = s.i + 1; j < n; j++) {
        const b = bars[j];
        if (s.dir > 0 ? b.l <= stop : b.h >= stop) { res = { kind: stop === s.stop ? 'stop' : 'trail', j, px: Math.min(stop, b.o * (s.dir > 0 ? 1 : 1)) }; res.px = s.dir > 0 ? Math.min(stop, b.o) : Math.max(stop, b.o); break; }
        if (so.exitMode === 'target' && (s.dir > 0 ? b.h >= s.t1 : b.l <= s.t1)) { res = { kind: 'target', j, px: s.t1 }; break; }
        if (j - s.i >= so.hold) { res = { kind: 'time', j, px: b.c }; break; }
        // update trailing stop at the close of bar j (applies from j+1)
        if (!moved1R && (b.c - s.entry) * s.dir >= s.risk) { moved1R = true; stop = s.dir > 0 ? Math.max(stop, s.entry) : Math.min(stop, s.entry); }
        if (so.exitMode !== 'target') for (const p of sw) {
          if (p.conf !== j || p.i <= s.i) continue;
          if (s.dir > 0 && p.type === 'L') stop = Math.max(stop, p.p - so.stopAtr * (atr[j] || 0));
          if (s.dir < 0 && p.type === 'H') stop = Math.min(stop, p.p + so.stopAtr * (atr[j] || 0));
        }
      }
      if (!res) res = { kind: 'open', j: n - 1, px: bars[n - 1].c };
      res.R = (res.px - s.entry) * s.dir / s.risk;
      res.stopNow = stop;
      s.res = res;
    }
    return sigs;
  }
  /* setups that would trigger next: where to buy/sell if price gets there */
  function pendingSetups(ctx, so, sw) {
    const n = ctx.n, last = ctx.bars[n - 1], known = sw.filter(s => s.conf <= n - 1);
    const tops = known.filter(s => s.type === 'H'), bots = known.filter(s => s.type === 'L'), out = [];
    const lt = tops[tops.length - 1], lb = bots[bots.length - 1], plt = tops[tops.length - 2], plb = bots[bots.length - 2];
    let trend = 0; for (let i = 0; i < n; i++) { const c = ctx.bars[i].c, T = tops.filter(s => s.conf < i).pop(), B = bots.filter(s => s.conf < i).pop(); if (T && c > T.p) trend = 1; else if (B && c < B.p) trend = -1; }
    if (lb) out.push({ dir: 1, setup: 'dbl', p: lb.p, note: 'قاع مزدوج على آخر قاع', from: lb });
    if (lt) out.push({ dir: -1, setup: 'dbl', p: lt.p, note: 'قمة مزدوجة على آخر قمة', from: lt });
    if (trend > 0 && lb && lt && lt.i > lb.i) for (const f of [0.375, 0.5, 0.625]) out.push({ dir: 1, setup: 'ret', p: lt.p - (lt.p - lb.p) * f, note: `ارتداد ${f === 0.5 ? '50%' : f === 0.375 ? '3/8' : '5/8'} من الصعود`, from: lt });
    if (trend < 0 && lb && lt && lb.i > lt.i) for (const f of [0.375, 0.5, 0.625]) out.push({ dir: -1, setup: 'ret', p: lb.p + (lt.p - lb.p) * f, note: `ارتداد ${f === 0.5 ? '50%' : f === 0.375 ? '3/8' : '5/8'} من الهبوط`, from: lb });
    if (lt && trend <= 0) out.push({ dir: 1, setup: 'brk', p: lt.p, note: 'إغلاق فوق آخر قمة = تحول للصعود', from: lt });
    if (lb && trend >= 0) out.push({ dir: -1, setup: 'brk', p: lb.p, note: 'إغلاق تحت آخر قاع = تحول للهبوط', from: lb });
    for (const o of out) o.dist = (o.p - last.c) / last.c;
    return { trend, list: out.filter(o => Math.abs(o.dist) <= 0.08).sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist)), lastTop: lt, lastBot: lb };
  }

  let fmtP = p => (Math.abs(p) >= 1000 ? p.toFixed(1) : Math.abs(p) >= 10 ? p.toFixed(2) : p.toFixed(4));
  root.GannScanner = { gannTrades, simulateGann, swingStream, pendingSetups, historicalTime, planetTravel, boxSpan, hotSpots, squaredCurvePrices, signals, simulate, stats, squareState, anchorAt, atrSeries, STRATS, ANGLES, CYCLES, build, elapsedIdx, dateAfter, idxOfT, priceLevels, cluster, timeEvents, windows, backtest, setFmt: f => { fmtP = f; } };
})(typeof window !== 'undefined' ? window : globalThis);
