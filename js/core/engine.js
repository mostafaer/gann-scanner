/* ===== Gann engine: pure computation, no DOM ===== */
(function (root) {
  'use strict';
  const DAY = 864e5;
  const mod = (a, n) => ((a % n) + n) % n;
  const wrap180 = x => mod(x + 180, 360) - 180;
  const AST = () => root.Astronomy;

  function nice(x) {
    if (!(x > 0)) return 1;
    const e = Math.floor(Math.log10(x)), f = x / Math.pow(10, e);
    const nf = f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10;
    return nf * Math.pow(10, e);
  }

  /* ---------- data ---------- */
  function parseDate(s) {
    s = String(s).trim().replace(/^"|"$/g, '');
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (m) {
      let d = +m[1], mo = +m[2];
      if (mo > 12 && d <= 12) [d, mo] = [mo, d];
      return Date.UTC(+m[3], mo - 1, d);
    }
    if (/^\d{9,13}$/.test(s)) return +s < 1e11 ? +s * 1000 : +s;
    const t = Date.parse(s);
    return isNaN(t) ? NaN : t;
  }
  function num(s, decComma) {
    s = String(s).trim().replace(/^"|"$/g, '').replace(/\s/g, '');
    if (decComma) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    return parseFloat(s);
  }
  function parseCSV(txt) {
    const lines = String(txt).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return { bars: [], error: 'لا توجد بيانات.' };
    const first = lines[0];
    const cnt = c => first.split(c).length - 1;
    const delim = cnt('\t') >= 3 ? '\t' : cnt(';') >= 3 ? ';' : ',';
    const L1 = lines[Math.min(1, lines.length - 1)];
    // European style "1.234,5": comma is the decimal mark, dots group thousands
    const decComma = delim !== ',' && /\d,\d/.test(L1) && (!/\d\.\d/.test(L1) || /\d\.\d{3},\d/.test(L1));
    let idx = { d: 0, o: 1, h: 2, l: 3, c: 4 }, start = 0;
    const head = first.split(delim).map(x => x.trim().toLowerCase().replace(/"/g, ''));
    if (isNaN(parseDate(head[0]))) {
      start = 1;
      const f = re => head.findIndex(h => re.test(h));
      idx = { d: f(/date|time|التاريخ/), o: f(/^open|افتتاح/), h: f(/^high|أعلى|اعلى/), l: f(/^low|أدنى|ادنى/), c: f(/^close|^price|إغلاق|اغلاق/) };
      if (idx.d < 0) idx.d = 0;
      if (idx.c < 0) return { bars: [], error: 'لم أجد عمود الإغلاق (close) في العناوين.' };
      if (idx.o < 0) idx.o = idx.c; if (idx.h < 0) idx.h = idx.c; if (idx.l < 0) idx.l = idx.c;
    }
    const map = new Map(); let bad = 0;
    for (let i = start; i < lines.length; i++) {
      const p = lines[i].split(delim);
      const t = parseDate(p[idx.d]);
      let o = num(p[idx.o], decComma), h = num(p[idx.h], decComma), l = num(p[idx.l], decComma), c = num(p[idx.c], decComma);
      if (isNaN(t) || ![o, h, l, c].every(isFinite) || c <= 0) { bad++; continue; }
      h = Math.max(h, o, c, l); l = Math.min(l, o, c, h);
      map.set(t, { t, o, h, l, c });
    }
    const bars = [...map.values()].sort((a, b) => a.t - b.t);
    if (bars.length < 40) return { bars: [], error: `عدد الشموع الصالحة ${bars.length} فقط، والماسح يحتاج 40 شمعة على الأقل.` };
    return { bars, skipped: bad };
  }

  /* ---------- pivots & swings ---------- */
  function pivots(bars, k) {
    const n = bars.length, raw = [], minRight = Math.max(2, Math.ceil(k / 2));
    for (let i = k; i < n - minRight; i++) {
      const right = Math.min(k, n - 1 - i);
      let isH = true, isL = true;
      for (let j = i - k; j <= i + right && (isH || isL); j++) {
        if (j === i) continue;
        if (j < i ? bars[j].h >= bars[i].h : bars[j].h > bars[i].h) isH = false;
        if (j < i ? bars[j].l <= bars[i].l : bars[j].l < bars[i].l) isL = false;
      }
      const tent = right < k;
      if (isH) raw.push({ i, t: bars[i].t, p: bars[i].h, type: 'H', tent });
      if (isL) raw.push({ i, t: bars[i].t, p: bars[i].l, type: 'L', tent });
    }
    raw.sort((a, b) => a.i - b.i || (a.type === 'H' ? -1 : 1));
    const out = [];
    /* raw = every local extreme exactly as it could be seen at bar p.i + k (no later bar changes it);
       out = alternating H/L swing list for display, where a later deeper extreme replaces an earlier one */
    for (const pv of raw) {
      const last = out[out.length - 1];
      if (last && last.type === pv.type) {
        if ((pv.type === 'H' && pv.p > last.p) || (pv.type === 'L' && pv.p < last.p)) out[out.length - 1] = pv;
      } else out.push(pv);
    }
    out.raw = raw;
    return out;
  }

  /* Gann N-bar swing chart: swing turns after N consecutive lower lows / higher highs (inside bars ignored) */
  function swingChart(bars, N) {
    if (bars.length < 3) return { pts: [], trend: 0 };
    let dir = bars[1].c >= bars[0].c ? 1 : -1;
    let ext = { i: 0, p: dir > 0 ? bars[0].h : bars[0].l };
    const pts = [{ i: 0, p: dir > 0 ? bars[0].l : bars[0].h }];
    let cnt = 0, cand = null, prev = bars[0];
    for (let i = 1; i < bars.length; i++) {
      const b = bars[i];
      if (b.h <= prev.h && b.l >= prev.l) continue; // inside bar
      if (dir > 0) {
        if (b.h > ext.p) { ext = { i, p: b.h }; cnt = 0; cand = null; }
        if (b.l < prev.l) { cnt++; if (!cand || b.l < cand.p) cand = { i, p: b.l }; } else { cnt = 0; cand = null; }
        if (cnt >= N) { pts.push(ext); dir = -1; ext = cand; cnt = 0; cand = null; }
      } else {
        if (b.l < ext.p) { ext = { i, p: b.l }; cnt = 0; cand = null; }
        if (b.h > prev.h) { cnt++; if (!cand || b.h > cand.p) cand = { i, p: b.h }; } else { cnt = 0; cand = null; }
        if (cnt >= N) { pts.push(ext); dir = 1; ext = cand; cnt = 0; cand = null; }
      }
      prev = b;
    }
    pts.push(ext);
    // Gann trend: up when price crosses the last swing top, down when it breaks the last swing bottom
    let trend = 0, lastTop = null, lastBot = null;
    const tops = [], bots = [];
    for (let j = 1; j < pts.length - 1; j++) (pts[j].p > pts[j - 1].p ? tops : bots).push(pts[j]);
    lastTop = tops[tops.length - 1]; lastBot = bots[bots.length - 1];
    const c = bars[bars.length - 1].c;
    if (lastTop && lastBot) {
      if (lastTop.i > lastBot.i) trend = c > lastTop.p ? 1 : c < lastBot.p ? -1 : (dir > 0 ? 1 : -1) * 0.5;
      else trend = c < lastBot.p ? -1 : c > lastTop.p ? 1 : (dir > 0 ? 1 : -1) * 0.5;
    }
    return { pts, trend, dir, lastTop, lastBot };
  }

  /* ---------- Square of Nine ---------- */
  const sq9Deg = x => mod(Math.sqrt(x) * 180 - 225, 360);
  const sq9Move = (x, deg) => { const r = Math.sqrt(x) + deg / 180; return r > 0 ? r * r : NaN; };
  /* all positive numbers n whose Square-of-Nine angle equals deg: n = ((deg+225)/180 + 2k)^2 */
  function sq9NumbersAt(deg, min, max) {
    const out = [];
    let r0 = mod(deg + 225, 360) / 180; // in [0,2)
    for (let r = r0; r * r <= max; r += 2) if (r * r >= min) out.push(r * r);
    return out;
  }
  function sq9Scale(price) { return price >= 100 ? 1 : Math.pow(10, Math.ceil(3 - Math.log10(price))); }

  /* ---------- astronomy ---------- */
  const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node'];
  const lonCache = new Map();
  function meanNode(ms) {
    const T = (ms / DAY + 2440587.5 - 2451545) / 36525;
    return mod(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000, 360);
  }
  function lon(body, ms, helio) {
    const key = body + (helio ? 'h' : 'g') + Math.round(ms / 6e4);
    let v = lonCache.get(key);
    if (v !== undefined) return v;
    const A = AST(), d = new Date(ms);
    if (body === 'Node') v = helio ? null : meanNode(ms);
    else if (body === 'Moon') v = helio ? null : A.EclipticGeoMoon(d).lon;
    else if (body === 'Sun') { v = A.SunPosition(d).elon; if (helio) v = mod(v + 180, 360); }
    else v = helio ? A.Ecliptic(A.HelioVector(body, d)).elon : A.Ecliptic(A.GeoVector(body, d, true)).elon;
    if (lonCache.size > 400000) lonCache.clear();
    lonCache.set(key, v);
    return v;
  }
  const speed = (b, ms, helio) => wrap180(lon(b, ms + DAY / 4, helio) - lon(b, ms - DAY / 4, helio)) * 2;
  function bisect(f, a, b, it = 16) {
    let fa = f(a);
    for (let k = 0; k < it; k++) {
      const m = (a + b) / 2, fm = f(m);
      if ((fa <= 0) === (fm <= 0)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  }

  const SLOW = new Set(['Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);
  const ASPECTS = [
    { a: 0, w: 1.5, key: 'conj' }, { a: 45, w: 0.6, key: 'semisq' }, { a: 60, w: 0.6, key: 'sext' },
    { a: 90, w: 1.25, key: 'sq' }, { a: 120, w: 1, key: 'tri' }, { a: 135, w: 0.6, key: 'sesq' }, { a: 180, w: 1.5, key: 'opp' }
  ];
  const astroCache = new Map();
  /* daily-sampled scan, refined by bisection to ~1 minute */
  function astroEvents(t0, t1, planets, helio) {
    const key = [t0, t1, planets.join(), helio].join('|');
    if (astroCache.has(key)) return astroCache.get(key);
    const A = AST(), ev = [];
    const bodies = planets.filter(p => p !== 'Moon' && !(helio && p === 'Node'));
    const start = t0 - DAY, end = t1 + DAY;
    // aspects
    for (let x = 0; x < bodies.length; x++) for (let y = x + 1; y < bodies.length; y++) {
      const P = bodies[x], Q = bodies[y];
      if (helio && (P === 'Sun' || Q === 'Sun') && false) continue;
      const diff = t => mod(lon(P, t, helio) - lon(Q, t, helio), 360);
      const pairW = (SLOW.has(P) && SLOW.has(Q)) ? 1.5 : (P === 'Sun' && SLOW.has(Q)) ? 1.2 : 1;
      for (const asp of ASPECTS) {
        const targets = asp.a === 0 || asp.a === 180 ? [asp.a] : [asp.a, 360 - asp.a];
        for (const tg of targets) {
          const g = t => wrap180(diff(t) - tg);
          let tp = start, gp = g(tp);
          for (let t = start + DAY; t <= end; t += DAY) {
            const gt = g(t);
            if (Math.abs(gt) < 20 && Math.abs(gp) < 20 && (gp <= 0) !== (gt <= 0)) {
              const tt = bisect(g, tp, t);
              if (tt >= t0 && tt <= t1) ev.push({ t: tt, type: 'aspects', w: asp.w * pairW, P, Q, asp: asp.key, deg: asp.a });
            }
            tp = t; gp = gt;
          }
        }
      }
    }
    // stations & ingresses
    for (const P of bodies) {
      if (P === 'Node') continue;
      let tp = start, sp = speed(P, tp, helio), lp = lon(P, tp, helio);
      for (let t = start + DAY; t <= end; t += DAY) {
        const st = speed(P, t, helio), lt = lon(P, t, helio);
        if (P !== 'Sun' && !helio && (sp <= 0) !== (st <= 0)) {
          const tt = bisect(x => speed(P, x, helio), tp, t);
          if (tt >= t0 && tt <= t1) ev.push({ t: tt, type: 'stations', w: SLOW.has(P) ? 2 : 1.5, P, retro: st < 0, lon: lon(P, tt, helio) });
        }
        const sgp = Math.floor(lp / 30), sgt = Math.floor(lt / 30);
        if (sgp !== sgt) {
          const b = (Math.abs(sgt - sgp) === 11 ? 0 : Math.max(sgp, sgt) * 30);
          const tt = bisect(x => wrap180(lon(P, x, helio) - b), tp, t);
          if (tt >= t0 && tt <= t1) ev.push({ t: tt, type: 'ingress', w: SLOW.has(P) ? 1.25 : 0.75, P, sign: sgt, retro: st < 0 });
        }
        tp = t; sp = st; lp = lt;
      }
    }
    // lunations
    if (!helio) for (const ph of [0, 180]) {
      let s = new Date(start);
      for (let g = 0; g < 40; g++) {
        const r = A.SearchMoonPhase(ph, s, 40);
        if (!r || r.date.getTime() > end) break;
        const tt = r.date.getTime();
        if (tt >= t0 && tt <= t1) ev.push({ t: tt, type: 'lunar', w: 0.5, phase: ph });
        s = new Date(tt + DAY);
      }
    }
    // seasonal: Sun at multiples of 45° (geocentric, always)
    for (let k = 0; k < 8; k++) {
      let s = new Date(start);
      for (let g = 0; g < 40; g++) {
        const r = A.SearchSunLongitude(k * 45, s, 370);
        if (!r || r.date.getTime() > end) break;
        const tt = r.date.getTime();
        if (tt >= t0 && tt <= t1) ev.push({ t: tt, type: 'season', w: k % 2 === 0 ? 2 : 1.5, deg: k * 45 });
        s = new Date(tt + 20 * DAY);
      }
    }
    ev.sort((a, b) => a.t - b.t);
    if (astroCache.size > 30) astroCache.clear();
    astroCache.set(key, ev);
    return ev;
  }

  root.GannEngine = { DAY, mod, wrap180, nice, parseCSV, parseDate, pivots, swingChart, sq9Deg, sq9Move, sq9NumbersAt, sq9Scale, PLANETS, lon, speed, meanNode, astroEvents, ASPECTS };
})(typeof window !== 'undefined' ? window : globalThis);
