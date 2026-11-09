(function () {
  'use strict';
  const G = window.GannEngine, SC = window.GannScanner, DAY = G.DAY;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const SAMPLE = window.__SAMPLE__;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- vocabulary ---------- */
  const META = {
    sq9: ['مربع التسعة', 'يأخذ جذر سعر المحور، يضيف أو يطرح الدرجة ÷ 180، ثم يربّع الناتج. كل 45° خطوة؛ زوايا 90° و180° و360° أقوى. الدورة الكاملة 360° = إضافة 2 للجذر.'],
    angles: ['زوايا جان (المروحة)', 'خطوط بنسبة ثابتة بين وحدة السعر ووحدة الزمن تنطلق من المحور. 1×1 = وحدة سعر لكل وحدة زمن وهو خط التوازن. فوق 1×1 الصاعد من قاع = قوة، وكسره يرشّح الهبوط للزاوية التالية.'],
    div: ['تقسيم المدى', 'أثمان وأثلاث المسافة بين قمة وقاع، و50% أهمها عند جان. تُحسب للموجة بين المحور والمحور السابق، وللمدى الكلي للبيانات.'],
    nsq: ['المربعات الطبيعية', 'الأعداد المربعة الكاملة n² ومنتصفاتها. اعتبر جان أعدادًا مثل 16 و36 و64 و144 نقاط مقاومة طبيعية.'],
    sq144: ['مربع 144', 'شبكة ارتفاعها 144 وحدة سعر مقسمة إلى أثمان، تبدأ من المحور. 144 = 12² وكان من أعداد جان الرئيسية.'],
    planet: ['الخطوط الفلكية', 'يحوّل طول الكوكب على دائرة البروج إلى سعر: السعر = (الدرجة + 360 × ن) × المعامل. مع التوافقيات يضاف خط عند +90° و+180° و+270°. الخط يتحرك يوميًا مع حركة الكوكب.'],
    cycles: ['الدورات الثابتة', 'عدّ 30، 45، 60، 90، 120، 135، 144، 180، 225، 240، 270، 315، 360… وحدة زمن من المحور. الربع والنصف والدورة الكاملة أثقل وزنًا.'],
    tsq: ['مربعات الزمن', 'مرور 16، 25، 36، 49… n² وحدة زمن من المحور.'],
    anniv: ['الذكرى السنوية', 'نفس اليوم بعد سنة وأكثر من كل قمة وقاع، و3–4 و6–7 أشهر كما كتب جان في «How to Make Profits in Commodities».'],
    season: ['التواريخ الموسمية', 'مرور الشمس على مضاعفات 45°: الاعتدالان والانقلابان ومنتصفاتها (تقريبًا 4 فبراير، 5 مايو، 8 أغسطس، 8 نوفمبر).'],
    ptsq: ['تربيع السعر بالزمن', 'قلب المعادلة: يوم يساوي فيه الزمن المنقضي مدى السعر بالوحدات، أو يقف رقم الزمن على زاوية سعر المحور في مربع التسعة، أو يُعدّ سعر المحور كدرجات (السعر mod 360) أيامًا.'],
    aspects: ['الأوجه الكوكبية', 'اقتران، تربيع، تثليث، مقابلة، تسديس، ونصف التربيع بين الكواكب المختارة. أوجه الكواكب البطيئة (المريخ وما بعده) أثقل وزنًا.'],
    stations: ['التراجع والاستقامة', 'اليوم الذي يتوقف فيه الكوكب ظاهريًا ويعكس اتجاهه في السماء (أرضي فقط).'],
    ingress: ['دخول البروج', 'عبور الكوكب حدود برج جديد كل 30°.'],
    lunar: ['المحاق والبدر', 'القمر الجديد والبدر كل 29.5 يومًا تقريبًا؛ وزنها منخفض لكثرتها.'],
    swing: ['مخطط التأرجح', 'مخطط جان ذو الشمعتين: يتحول التأرجح بعد شمعتين متتاليتين بقيعان أدنى أو قمم أعلى، ويُحسم الاتجاه بكسر آخر قمة أو آخر قاع.'],
  };
  const GROUPS = { price: 'مستويات السعر', time: 'الزمن', astro: 'الفلك', trend: 'الاتجاه' };
  const GCOL = { price: null, time: '--c-time', astro: '--c-astro', trend: '--c-trend' };
  const PL = {
    Sun: ['☉', 'الشمس'], Moon: ['☽', 'القمر'], Mercury: ['☿', 'عطارد'], Venus: ['♀', 'الزهرة'], Mars: ['♂', 'المريخ'], Jupiter: ['♃', 'المشتري'],
    Saturn: ['♄', 'زحل'], Uranus: ['♅', 'أورانوس'], Neptune: ['♆', 'نبتون'], Pluto: ['♇', 'بلوتو'], Node: ['☊', 'العقدة']
  };
  const glyph = p => PL[p][0] + '︎';
  const SIGNS = ['الحمل', 'الثور', 'الجوزاء', 'السرطان', 'الأسد', 'العذراء', 'الميزان', 'العقرب', 'القوس', 'الجدي', 'الدلو', 'الحوت'];
  const ASP_N = { conj: 'اقتران', semisq: 'نصف تربيع', sext: 'تسديس', sq: 'تربيع', tri: 'تثليث', sesq: 'تربيع ونصف', opp: 'مقابلة' };
  const SEASON_N = { 0: 'الاعتدال الربيعي', 45: 'منتصف الربيع', 90: 'الانقلاب الصيفي', 135: 'منتصف الصيف', 180: 'الاعتدال الخريفي', 225: 'منتصف الخريف', 270: 'الانقلاب الشتوي', 315: 'منتصف الشتاء' };

  /* ---------- state ---------- */
  const DEF = {
    on: Object.fromEntries(SC.STRATS.map(s => [s.id, s.on])),
    planets: ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    pivK: 6, anchorT: null, anchorMode: 'main', timeMode: 'cal', unit: 0, pf: 0, sqk: 0, tolPct: 0.3,
    helio: false, harm: false, horizon: 90, win: 1, sym: 'XAU/USD', csv: null, open: {},
    tf: '1day', source: 'sample', anchorLocked: false,
    watchlist: 'XAU/USD, XAG/USD, BTC/USD, ETH/USD, EUR/USD, GBP/USD, USD/JPY, SPY, QQQ, NVDA',
    so: { touchPct: 0.12, requireSq: true, mBal: true, mSq9: true, mCyc: true, mPdeg: false, balTol: 0.12, degTol: 6, win: 1, cooldown: 5, stopAtr: 0.3, minRR: 1.5, hold: 30, minGrade: 'A' }
  };
  const KEY = 'gann-scanner.v2';
  let S = load();
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v) return Object.assign({}, DEF, v, { on: Object.assign({}, DEF.on, v.on || {}), so: Object.assign({}, DEF.so, v.so || {}) }); } catch (e) { }
    return JSON.parse(JSON.stringify(DEF));
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

  let BARS = [], CTX = null, A = null;

  /* ---------- formatting ---------- */
  let dig = 2;
  const fmtP = p => (p == null || !isFinite(p)) ? '—' : p.toLocaleString('en-US', { minimumFractionDigits: dig, maximumFractionDigits: dig });
  SC.setFmt(fmtP);
  const dFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const dFmtS = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const wFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', timeZone: 'UTC' });
  const tFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  const fd = t => (CTX && !CTX.daily) ? `${dFmtS.format(new Date(t))} ${tFmt.format(new Date(t))}` : dFmt.format(new Date(t)), fds = t => dFmtS.format(new Date(t));
  const fdt = t => { const d = new Date(t); return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`; };
  const pct = x => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(2) + '%';
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); };

  function stratColor(id) {
    const s = SC.STRATS.find(x => x.id === id);
    return s.g === 'price' ? `--c-${id}` : GCOL[s.g];
  }
  function evLabel(e) {
    if (e.label) return e.label;
    if (e.type === 'aspects') return `${glyph(e.P)} ${PL[e.P][1]} ${ASP_N[e.asp]} ${glyph(e.Q)} ${PL[e.Q][1]}`;
    if (e.type === 'stations') return `${glyph(e.P)} ${PL[e.P][1]} ${e.retro ? 'يبدأ التراجع' : 'يعود للاستقامة'} عند \u2066${Math.floor(G.mod(e.lon, 30))}°\u2069 ${SIGNS[Math.floor(e.lon / 30)]}`;
    if (e.type === 'ingress') return `${glyph(e.P)} ${PL[e.P][1]} يدخل ${SIGNS[e.sign]}${e.retro ? ' (متراجعًا)' : ''}`;
    if (e.type === 'lunar') return e.phase === 0 ? 'محاق — قمر جديد' : 'بدر — قمر مكتمل';
    if (e.type === 'season') return `الشمس \u2066${e.deg}°\u2069 — ${SEASON_N[e.deg]}`;
    return e.s;
  }
  const lvLabel = l => l.planet ? `${glyph(l.planet)} خط ${PL[l.planet][1]}${l.off ? ` \u2066+${l.off}°\u2069` : ''}` : l.label;

  /* ---------- rail ---------- */
  function buildRail() {
    const box = $('#stratList'); box.innerHTML = '';
    for (const g of Object.keys(GROUPS)) {
      const items = SC.STRATS.filter(s => s.g === g);
      const wrap = document.createElement('div'); wrap.className = 'grp';
      wrap.innerHTML = `<div class="grp-h"><span>${GROUPS[g]}</span><button class="sw sm" role="switch" data-grp="${g}" aria-label="تفعيل كل ${GROUPS[g]}"></button></div>`;
      for (const s of items) {
        const id = s.id, r = document.createElement('div');
        r.innerHTML = `<div class="row" data-row="${id}"><span class="dot" style="background:var(${stratColor(id)})"></span>
          <span class="nm" data-tog="${id}">${META[id][0]}</span>
          <button class="info-b" type="button" aria-expanded="false" aria-controls="d-${id}" aria-label="شرح ${META[id][0]}">؟</button>
          <button class="sw" role="switch" data-sw="${id}" aria-label="${META[id][0]}"></button></div>
          <p class="desc" id="d-${id}" hidden>${META[id][1]}</p>`;
        wrap.append(...r.children);
      }
      box.appendChild(wrap);
    }
    box.addEventListener('click', e => {
      const sw = e.target.closest('[data-sw]'), nm = e.target.closest('[data-tog]'), gr = e.target.closest('[data-grp]'), inf = e.target.closest('.info-b');
      if (sw || nm) { const id = (sw || nm).dataset.sw || nm.dataset.tog; S.on[id] = !S.on[id]; syncRail(); refresh(); }
      else if (gr) { const g = gr.dataset.grp, all = SC.STRATS.filter(s => s.g === g), v = !all.every(s => S.on[s.id]); all.forEach(s => S.on[s.id] = v); syncRail(); refresh(); }
      else if (inf) { const d = document.getElementById(inf.getAttribute('aria-controls')); d.hidden = !d.hidden; inf.setAttribute('aria-expanded', String(!d.hidden)); }
    });
    $('#allOn').onclick = () => { SC.STRATS.forEach(s => S.on[s.id] = true); syncRail(); refresh(); };
    $('#allOff').onclick = () => { SC.STRATS.forEach(s => S.on[s.id] = false); syncRail(); refresh(); };

    const pc = $('#planetChips'); pc.innerHTML = '';
    for (const p of G.PLANETS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pchip'; b.dataset.p = p;
      b.style.color = `var(--pl-${p})`;
      b.innerHTML = `<span class="g">${glyph(p)}</span><span style="color:var(--fg)">${PL[p][1]}</span>`;
      b.onclick = () => { const i = S.planets.indexOf(p); if (i >= 0) S.planets.splice(i, 1); else S.planets.push(p); S.planets.sort((a, b) => G.PLANETS.indexOf(a) - G.PLANETS.indexOf(b)); syncRail(); refresh(); };
      pc.appendChild(b);
    }
    $$('.seg[data-key]').forEach(sg => sg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const k = sg.dataset.key;
      S[k] = k === 'helio' ? b.dataset.v === '1' : b.dataset.v; syncRail(); refresh();
    }));
    $('#pivK').oninput = e => { S.pivK = +e.target.value; $('#pivKv').textContent = S.pivK; S.anchorT = null; S.anchorLocked = false; refreshSoon(); };
    $('#anchorSel').onchange = e => { S.anchorT = +e.target.value; S.anchorLocked = true; refresh(); };
    const numIn = (id, key) => { $(id).onchange = e => { const v = parseFloat(e.target.value); S[key] = v > 0 ? v : 0; if (!(v > 0)) e.target.value = ''; refresh(); }; };
    numIn('#unit', 'unit'); numIn('#pf', 'pf'); numIn('#sqk', 'sqk');
    $('#tol').onchange = e => { const v = parseFloat(e.target.value); S.tolPct = Math.min(2, Math.max(0.05, v || 0.3)); e.target.value = S.tolPct; refresh(); };
    $('#horizon').onchange = e => { S.horizon = +e.target.value; refresh(); };
    $('#win').onchange = e => { S.win = +e.target.value; refresh(); };
    $('#harm').onclick = () => { S.harm = !S.harm; syncRail(); refresh(); };
  }
  function syncRail() {
    $$('[data-sw]').forEach(b => { const on = !!S.on[b.dataset.sw]; b.setAttribute('aria-checked', on); b.closest('.row').classList.toggle('off', !on); });
    $$('[data-grp]').forEach(b => b.setAttribute('aria-checked', SC.STRATS.filter(s => s.g === b.dataset.grp).every(s => S.on[s.id])));
    const n = SC.STRATS.filter(s => S.on[s.id]).length; $('#stratCount').textContent = `${n}/${SC.STRATS.length}`;
    $$('.pchip').forEach(b => b.setAttribute('aria-pressed', S.planets.includes(b.dataset.p)));
    $$('.seg[data-key]').forEach(sg => { const k = sg.dataset.key, v = k === 'helio' ? (S.helio ? '1' : '0') : S[k]; sg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === String(v))); });
    $('#pivK').value = S.pivK; $('#pivKv').textContent = S.pivK;
    $('#unit').value = S.unit || ''; $('#pf').value = S.pf || ''; $('#sqk').value = S.sqk || ''; $('#tol').value = S.tolPct;
    $('#horizon').value = S.horizon; $('#win').value = S.win;
    $('#harm').setAttribute('aria-checked', S.harm);
    $('#geoHelioLbl').textContent = S.helio ? 'مركز شمسي' : 'مركز أرضي';
  }

  /* ---------- analysis ---------- */
  function analyze() {
    const o = {
      pivK: S.pivK, anchorI: null, anchorMode: S.anchorMode, timeMode: S.timeMode, unit: S.unit, sqk: S.sqk, pf: S.pf,
      horizon: S.horizon, harm: S.harm, helio: S.helio, planets: S.planets.slice(), tolPct: S.tolPct, win: Math.max(1, S.win)
    };
    if (S.anchorT != null) { const i = BARS.findIndex(b => b.t === S.anchorT); if (i >= 0) o.anchorI = i; else S.anchorLocked = false; }
    const c = SC.build(BARS, o);
    if (!c.main) return null;
    if (S.anchorT == null || c.main.t !== S.anchorT) S.anchorT = c.main.t;
    const on = id => S.on[id];
    const ref = c.last.c, r = { c };
    // price
    r.levels = [];
    for (const s of SC.STRATS) if (s.g === 'price' && on(s.id)) r.levels.push(...SC.priceLevels(s.id, c, c.n - 1, c.anchors, c.main, c.prevOpp, ref));
    const nearL = r.levels.filter(l => Math.abs(l.p - ref) / ref <= 0.08);
    r.zones = SC.cluster(nearL, ref, S.tolPct).filter(z => z.items.length > 1 || z.score >= 1.75);
    r.zonesTop = r.zones.slice().sort((a, b) => b.score - a.score).slice(0, 12).sort((a, b) => b.p - a.p);
    r.maxZ = Math.max(1, ...r.zonesTop.map(z => z.score));
    const strong = r.zones.slice().sort((a, b) => b.score - a.score).slice(0, 12);
    r.res = strong.filter(z => z.p > ref * (1 + S.tolPct / 200)).sort((a, b) => a.p - b.p)[0] || null;
    r.sup = strong.filter(z => z.p < ref * (1 - S.tolPct / 200)).sort((a, b) => b.p - a.p)[0] || null;
    // time
    const t0 = c.last.t + DAY, t1 = c.last.t + S.horizon * DAY;
    r.events = [];
    for (const s of SC.STRATS) if ((s.g === 'time' || s.g === 'astro') && on(s.id)) r.events.push(...SC.timeEvents(s.id, c, t0, t1, c.anchors, c.main));
    r.events.sort((a, b) => a.t - b.t);
    r.windows = SC.windows(r.events, t0, t1, S.win);
    r.winTop = r.windows.slice(0, 12).sort((a, b) => a.t - b.t);
    r.maxW = Math.max(1, ...r.winTop.map(w => w.score));
    r.best = r.windows[0] || null;
    r.swing = G.swingChart(BARS, 2);
    r.t0 = t0; r.t1 = t1;
    return r;
  }

  let rq = 0;
  function refreshSoon() { clearTimeout(rq); rq = setTimeout(refresh, 60); }
  function refresh(keepView) {
    syncRail();
    if (!BARS.length) return;
    try { A = analyze(); } catch (err) { console.error(err); toast('تعذّر الحساب: ' + err.message); return; }
    if (!A) { toast('لا توجد قمم أو قيعان كافية بهذه الحساسية. خفّض الرقم.'); return; }
    CTX = A.c; save();
    try { computeSignals(); } catch (err) { console.error(err); SIG.list = []; SIG.live = null; SIG.watch = []; SIG.stat = { all: SC.stats([]), A: SC.stats([]), B: SC.stats([]), C: SC.stats([]) }; }
    renderHeader(); renderAnchorSel(); renderTiles(); renderSummary();
    renderSignals(); renderPT(); renderAstro(); renderSq9(); renderData();
    btDirty = true; if (curTab === 'bt') renderBT();
    updateChart(keepView);
    renderOHLC(CTX.n - 1);
    checkAlerts();
  }

  /* ---------- header / tiles ---------- */
  function renderHeader() {
    const n = BARS.length, l = BARS[n - 1], p = BARS[n - 2];
    $('#qSym').textContent = S.sym;
    $('#qPx').textContent = fmtP(l.c);
    const ch = (l.c - p.c) / p.c, e = $('#qChg'); e.textContent = pct(ch); e.className = 'chg num ' + (ch >= 0 ? 'up' : 'down');
    $('#qAsof').textContent = (S.source === 'live' ? 'آخر شمعة ' : 'إغلاق ') + fd(l.t);
  }
  function renderAnchorSel() {
    const sel = $('#anchorSel');
    sel.innerHTML = CTX.piv.slice().reverse().map(p => `<option value="${p.t}" ${p === CTX.main ? 'selected' : ''}>${p.type === 'H' ? '▲ قمة' : '▼ قاع'} ${fmtP(p.p)} — ${fd(p.t)}${p.tent ? ' (مبدئي)' : ''}</option>`).join('');
    const c = CTX;
    $('#unitsInfo').innerHTML = `المستخدم الآن: 1×1 = <span class="num">${fmtP(c.u)}</span> لكل ${S.timeMode === 'bar' ? 'شمعة' : 'يوم'} · درجة = <span class="num">${+c.pf.toPrecision(6)}</span> · مضاعف مربع ٩ = <span class="num">${c.sqk}</span>`;
  }
  function zoneSrc(z) { return z.strats.map(s => `<span class="tag" style="color:var(${stratColor(s)})">${META[s][0]}</span>`).join(''); }
  function renderTiles() {
    const l = CTX.last;
    $('#tLast').textContent = fmtP(l.c); $('#tLastS').textContent = fd(l.t);
    const zt = (z, el, sub) => { $(el).textContent = z ? fmtP(z.p) : '—'; $(sub).textContent = z ? `${pct((z.p - l.c) / l.c)} · ${z.strats.length} مصادر` : 'لا توجد منطقة قوية في النطاق'; };
    zt(A.res, '#tRes', '#tResS'); zt(A.sup, '#tSup', '#tSupS');
    if (A.best) { $('#tWin').textContent = fds(A.best.t); $('#tWinS').textContent = `${wFmt.format(new Date(A.best.t))} · بعد ${Math.round((A.best.t - l.t) / DAY)} يوم · ${A.best.strats.length} مصادر`; }
    else { $('#tWin').textContent = '—'; $('#tWinS').textContent = 'فعّل استراتيجيات الزمن أو الفلك'; }
  }

  /* ---------- summary ---------- */
  function renderSummary() {
    const ref = CTX.last.c, zb = $('#zoneBody');
    $('#zoneSub').textContent = `±8% · سماحية ${S.tolPct}%`;
    if (!A.zonesTop.length) zb.innerHTML = `<tr><td colspan="4"><div class="empty">فعّل استراتيجية سعر واحدة على الأقل لرؤية المناطق.</div></td></tr>`;
    else {
      let rows = '', placed = false;
      for (const z of A.zonesTop) {
        if (!placed && z.p < ref) { rows += `<tr class="cur"><td class="num">${fmtP(ref)}</td><td colspan="3">السعر الحالي</td></tr>`; placed = true; }
        const side = z.p >= ref ? 'side-r' : 'side-s';
        rows += `<tr title="${esc(z.items.map(lvLabel).join('\n'))}"><td class="num ${side}">${fmtP(z.p)}</td><td class="num">${pct((z.p - ref) / ref)}</td><td><div class="bar"><span style="width:${(z.score / A.maxZ * 100).toFixed(0)}%"></span></div></td><td>${zoneSrc(z)}</td></tr>`;
      }
      if (!placed) rows += `<tr class="cur"><td class="num">${fmtP(ref)}</td><td colspan="3">السعر الحالي</td></tr>`;
      zb.innerHTML = rows;
    }
    const wl = $('#winList');
    $('#winSub').textContent = `${S.horizon} يومًا · ${A.events.length} حدث`;
    const top3 = new Set(A.windows.slice(0, 3).map(w => w.t));
    wl.innerHTML = A.winTop.length ? A.winTop.map(w => {
      const why = [...new Map(w.items.map(e => [evLabel(e), e])).values()].sort((a, b) => b.w - a.w).slice(0, 4).map(e => esc(evLabel(e))).join(' · ');
      return `<div class="win ${top3.has(w.t) ? 'top' : ''}"><div class="dt"><b>${fds(w.t)}</b><small>${wFmt.format(new Date(w.t))} · +${Math.round((w.t - CTX.last.t) / DAY)} يوم</small></div>
        <div class="why">${w.strats.map(s => `<span class="tag" style="color:var(${stratColor(s)})">${META[s][0]}</span>`).join('')}<div>${why}</div></div>
        <div class="sc"><div class="bar" style="width:64px"><span style="width:${(w.score / A.maxW * 100).toFixed(0)}%"></span></div><span class="num" style="color:var(--faint);font-size:.74rem">${w.score.toFixed(1)}</span></div></div>`;
    }).join('') : `<div class="empty">فعّل استراتيجيات الزمن أو الفلك لرؤية النوافذ.</div>`;
    renderRules();
  }
  function angleAt(a, idx, r) { const e = SC.elapsedIdx(CTX, a.i, idx); return a.p + (a.type === 'L' ? 1 : -1) * r * CTX.u * e; }
  function renderRules() {
    const c = CTX, ref = c.last.c, m = c.main, out = [];
    const rule = (st, t, x) => out.push(`<div class="rule"><span class="pill ${st}">${st === 'up' ? 'صاعد' : st === 'down' ? 'هابط' : 'محايد'}</span><div><div class="t">${t}</div><div class="x">${x}</div></div></div>`);
    if (S.on.swing) {
      const sw = A.swing, top = sw.lastTop, bot = sw.lastBot;
      const st = sw.trend >= 1 ? 'up' : sw.trend <= -1 ? 'down' : 'nt';
      rule(st, 'مخطط التأرجح (شمعتان)', `آخر قمة تأرجح <span class="num">${fmtP(top && top.p)}</span> وآخر قاع <span class="num">${fmtP(bot && bot.p)}</span>. ${sw.trend >= 1 ? 'السعر فوق آخر قمة: الاتجاه صاعد حسب جان.' : sw.trend <= -1 ? 'السعر تحت آخر قاع: الاتجاه هابط حسب جان.' : `التأرجح الحالي ${sw.dir > 0 ? 'صاعد' : 'هابط'} لكن لم يكسر آخر ${sw.dir > 0 ? 'قمة' : 'قاع'} بعد.`}`);
    }
    if (S.on.angles) {
      const n1 = angleAt(m, c.n - 1, 1), vals = SC.ANGLES.map(A => ({ l: A.l, v: angleAt(m, c.n - 1, A.r) })).sort((a, b) => a.v - b.v);
      let below = null, above = null; for (const v of vals) { if (v.v <= ref) below = v; else if (!above) above = v; }
      const fromLow = m.type === 'L', over = ref >= n1;
      rule(fromLow ? (over ? 'up' : 'down') : (over ? 'up' : 'down'), `زاوية 1×1 من ${fromLow ? 'القاع' : 'القمة'} ${fmtP(m.p)}`,
        `قيمة 1×1 اليوم <span class="num">${fmtP(n1)}</span>؛ السعر ${over ? 'فوقها' : 'تحتها'} بـ <span class="num">${pct((ref - n1) / n1)}</span>. ${fromLow ? (over ? 'الاحتفاظ فوق 1×1 الصاعد علامة قوة.' : 'كسر 1×1 الصاعد يرشّح الزاوية التالية للأسفل.') : (over ? 'الإغلاق فوق 1×1 الهابط إشارة انعكاس محتمل.' : 'تحت 1×1 الهابط يبقى الضغط هابطًا.')} السعر بين ${below ? `${below.l} (<span class="num">${fmtP(below.v)}</span>)` : '—'} و ${above ? `${above.l} (<span class="num">${fmtP(above.v)}</span>)` : '—'}.`);
    }
    if (S.on.div && c.prevOpp) {
      const mid = (m.p + c.prevOpp.p) / 2;
      rule(ref > mid ? 'up' : 'down', 'منتصف الموجة 50%', `منتصف المسافة بين <span class="num">${fmtP(c.prevOpp.p)}</span> و <span class="num">${fmtP(m.p)}</span> = <span class="num">${fmtP(mid)}</span>. اعتبره جان أهم نقطة دعم/مقاومة في أي موجة.`);
    }
    const e = SC.elapsedIdx(c, m.i, c.n - 1), units = Math.abs(ref - m.p) / c.u, ratio = e > 0 ? units / e : 0;
    const bal = ratio < 0.8 ? 'السعر متأخر عن الزمن — حركة بطيئة نسبةً لخط 1×1' : ratio <= 1.25 ? 'السعر والزمن متوازنان تقريبًا (منطقة تربيع)' : 'السعر يسبق الزمن — حركة أسرع من 1×1';
    rule('nt', 'توازن السعر والزمن', `مضى <span class="num">${e.toFixed(0)}</span> ${S.timeMode === 'bar' ? 'شمعة' : 'يوم'} من المحور، وقطع السعر <span class="num">${units.toFixed(1)}</span> وحدة (الوحدة <span class="num">${fmtP(c.u)}</span>). النسبة <span class="num">${ratio.toFixed(2)}</span>: ${bal}.`);
    if (A.res || A.sup) rule('nt', 'أقرب منطقتين متلاقيتين', `مقاومة ${A.res ? `<span class="num">${fmtP(A.res.p)}</span> (${A.res.strats.map(s => META[s][0]).join('، ')})` : '—'} · دعم ${A.sup ? `<span class="num">${fmtP(A.sup.p)}</span> (${A.sup.strats.map(s => META[s][0]).join('، ')})` : '—'}.`);
    if (A.best) rule('nt', 'أقوى نافذة زمنية', `${fd(A.best.t)} — يتلاقى فيها ${A.best.strats.map(s => META[s][0]).join('، ')}. النافذة تنبيه لمراقبة انعكاس، والسعر هو من يؤكده.`);
    $('#rules').innerHTML = out.join('') || `<div class="empty">فعّل استراتيجيات لرؤية القواعد.</div>`;
  }

  /* ---------- price = time ---------- */
  function renderPT() {
    const c = CTX, m = c.main, ref = c.last.c, k = c.sqk;
    const e = SC.elapsedIdx(c, m.i, c.n - 1);
    const dp = G.sq9Deg(ref * k), dt = G.sq9Deg(Math.max(e, 1)), dm = G.sq9Deg(m.p * k);
    const diff = Math.abs(G.wrap180(dp - dt));
    const units = Math.abs(ref - m.p) / c.u;
    const nextSq = G.sq9NumbersAt(dp, e + 0.5, e + 2000)[0];
    const catchUp = units > e ? m.t + Math.round(units) * DAY : null;
    const R = 92, cx = 120, cy = 120;
    const pt = d => { const a = (d - 90) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
    const hand = (d, col, w) => { const [x, y] = pt(d); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${col}"/>`; };
    let ticks = '';
    for (let d = 0; d < 360; d += 15) { const a = (d - 90) * Math.PI / 180, r1 = d % 45 === 0 ? R - 10 : R - 5; ticks += `<line x1="${(cx + r1 * Math.cos(a)).toFixed(1)}" y1="${(cy + r1 * Math.sin(a)).toFixed(1)}" x2="${(cx + R * Math.cos(a)).toFixed(1)}" y2="${(cy + R * Math.sin(a)).toFixed(1)}" stroke="var(--faint)" stroke-width="${d % 90 === 0 ? 1.6 : 1}"/>`; if (d % 45 === 0) { const [x, y] = [cx + (R + 13) * Math.cos(a), cy + (R + 13) * Math.sin(a)]; ticks += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${d}</text>`; } }
    const svg = `<svg viewBox="0 0 240 240" role="img" aria-label="ساعة مربع التسعة: زاوية السعر ${dp.toFixed(0)} وزاوية الزمن ${dt.toFixed(0)}">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--surface-2)" stroke="var(--line)"/>
      <circle cx="${cx}" cy="${cy}" r="${R * 0.55}" fill="none" stroke="var(--line)" stroke-dasharray="2 3"/>${ticks}
      ${hand(dm, 'var(--faint)', 1.2)}${hand(dt, 'var(--c-angles)', 2.2)}${hand(dp, 'var(--accent)', 2.6)}
      <circle cx="${cx}" cy="${cy}" r="4" fill="var(--fg)"/></svg>`;
    const verdict = diff <= 7.5 ? `<span style="color:var(--accent)">السعر والزمن متربعان الآن (فرق ${diff.toFixed(1)}°)</span>` : `فرق الزاويتين ${diff.toFixed(1)}°`;
    $('#ptBox').innerHTML = `${svg}<div><div class="big-verdict">${verdict}</div><dl class="kv">
      <dt><span style="color:var(--accent)">●</span> زاوية السعر الحالي <span class="num">${fmtP(ref)}</span></dt><dd class="num">${dp.toFixed(1)}°</dd>
      <dt><span style="color:var(--c-angles)">●</span> زاوية الزمن المنقضي <span class="num">${e.toFixed(0)}</span></dt><dd class="num">${dt.toFixed(1)}°</dd>
      <dt><span style="color:var(--faint)">●</span> زاوية سعر المحور <span class="num">${fmtP(m.p)}</span></dt><dd class="num">${dm.toFixed(1)}°</dd>
      <dt>المحور</dt><dd>${m.type === 'H' ? 'قمة' : 'قاع'} ${fd(m.t)}</dd>
      <dt>حركة السعر بوحدات 1×1</dt><dd class="num">${units.toFixed(1)}</dd>
      <dt>الزمن بالوحدات</dt><dd class="num">${e.toFixed(1)}</dd>
      <dt>يتربع الزمن مع زاوية السعر الحالي</dt><dd>${nextSq ? fd(SC.dateAfter(c, m, nextSq)) : '—'}</dd>
      <dt>يلحق الزمن بحركة السعر (1×1)</dt><dd>${catchUp ? fd(catchUp) : 'تجاوزه الزمن'}</dd></dl></div>`;
    const ev = SC.timeEvents('ptsq', c, c.last.t - 30 * DAY, c.last.t + Math.max(S.horizon, 180) * DAY, [m], m).sort((a, b) => a.t - b.t);
    $('#ptList').innerHTML = ev.length ? `<div class="scroll"><table><thead><tr><th>التاريخ</th><th>من الآن</th><th>الطريقة</th></tr></thead><tbody>${ev.map(x => `<tr ${x.t < c.last.t ? 'style="opacity:.55"' : ''}><td>${fd(x.t)}</td><td class="num">${Math.round((x.t - c.last.t) / DAY)}</td><td>${esc(x.label)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">لا توجد تواريخ في هذا الأفق.</div>`;
  }

  /* ---------- astro ---------- */
  function renderAstro() {
    const now = Date.now(), ref = CTX.last.c, pf = CTX.pf, helio = S.helio;
    $('#astroSub').textContent = `${helio ? 'شمسي المركز' : 'أرضي المركز'} · ${fdt(now)} UTC`;
    $('#plBody').innerHTML = G.PLANETS.map(p => {
      const L = G.lon(p, now, helio); if (L == null) return '';
      const sp = p === 'Node' ? -0.053 : G.speed(p, now, helio);
      let best = null; for (const off of (S.harm ? [0, 90, 180, 270] : [0])) { const base = G.mod(L + off, 360) * pf, cyc = 360 * pf, m = Math.round((ref - base) / cyc), v = base + m * cyc; if (!best || Math.abs(v - ref) < Math.abs(best.v - ref)) best = { v, off }; }
      const on = S.planets.includes(p);
      return `<tr style="${on ? '' : 'opacity:.5'}"><td><span style="color:var(--pl-${p});font-size:1.05rem">${glyph(p)}</span> ${PL[p][1]}</td><td class="num">${L.toFixed(2)}°</td><td>${Math.floor(G.mod(L, 30))}° ${SIGNS[Math.floor(L / 30)]}</td><td class="num">${sp >= 0 ? '+' : ''}${sp.toFixed(3)}°</td><td>${sp < 0 ? '<span class="tag side-r">متراجع</span>' : '<span class="tag side-s">مستقيم</span>'}</td><td class="num">${fmtP(best.v)}${best.off ? ` <small style="color:var(--faint)">+${best.off}°</small>` : ''} <small style="color:var(--faint)">${pct((best.v - ref) / ref)}</small></td></tr>`;
    }).join('');
    const ev = A.events.filter(e => ['aspects', 'stations', 'ingress', 'lunar', 'season'].includes(e.s));
    $('#evSub').textContent = `${ev.length} حدث · الاستراتيجيات الفلكية المفعّلة فقط`;
    $('#evBody').innerHTML = ev.length ? ev.map(e => `<tr><td class="num" style="white-space:nowrap">${fdt(e.t)}</td><td>${esc(evLabel(e))}</td><td><span class="tag" style="color:var(${stratColor(e.s)})">${META[e.s][0]}</span></td><td class="num">${e.w.toFixed(2)}</td></tr>`).join('') : `<tr><td colspan="4"><div class="empty">فعّل الأوجه أو التراجع أو دخول البروج أو التواريخ الموسمية.</div></td></tr>`;
  }

  /* ---------- sq9 calculator ---------- */
  let sqTouched = false;
  function renderSq9() {
    const inp = $('#sqIn'), mul = $('#sqMul');
    if (!sqTouched) { inp.value = CTX.last.c; mul.value = CTX.sqk; }
    const x = parseFloat(inp.value), k = parseFloat(mul.value) > 0 ? parseFloat(mul.value) : 1;
    if (!(x > 0)) { $('#sqBody').innerHTML = ''; $('#sqDeg').textContent = 'أدخل رقمًا موجبًا.'; return; }
    const X = x * k;
    $('#sqDeg').innerHTML = `زاوية <span class="num">${X}</span> على مربع التسعة = <span class="num">${G.sq9Deg(X).toFixed(2)}°</span> · الجذر = <span class="num">${Math.sqrt(X).toFixed(4)}</span>`;
    const note = { 90: 'تربيع', 180: 'مقابلة', 270: 'ثلاثة أرباع', 360: 'دورة كاملة', 720: 'دورتان', 120: 'تثليث', 240: 'تثليث' };
    const degs = [30, 45, 60, 90, 120, 135, 180, 225, 240, 270, 315, 360, 450, 540, 630, 720];
    $('#sqBody').innerHTML = degs.map(d => `<tr ${d % 90 === 0 ? 'style="font-weight:600"' : ''}><td class="num">${d}°</td><td class="num side-r">${fmtP(G.sq9Move(X, d) / k)}</td><td class="num side-s">${fmtP(G.sq9Move(X, -d) / k)}</td><td style="color:var(--muted)">${note[d] || ''}</td></tr>`).join('');
  }

  /* ---------- backtest ---------- */
  let btDirty = true;
  function renderBT() {
    if (!btDirty) return; btDirty = false;
    const ids = SC.STRATS.filter(s => s.g !== 'trend').map(s => s.id);
    const res = SC.backtest(CTX, ids);
    $('#btSub').textContent = `${CTX.piv.length} قمة وقاع · نافذة ±${Math.max(1, S.win)} شمعة · سماحية ${S.tolPct}%`;
    $('#btBody').innerHTML = res.map(r => {
      const v = !r.tests ? ['nt', 'بيانات غير كافية'] : r.base > 0.85 ? ['nt', 'تغطي كل شيء تقريبًا'] : r.lift > 1 && r.p < 0.05 ? ['up', 'أفضل من الصدفة'] : r.lift >= 1.3 ? ['nt', 'أعلى لكن غير دال'] : r.lift < 0.8 ? ['down', 'أسوأ من الصدفة'] : ['nt', 'قريب من الصدفة'];
      return `<tr style="${S.on[r.id] ? '' : 'opacity:.55'}"><td><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(${stratColor(r.id)});margin-inline-end:6px"></span>${META[r.id][0]}</td><td class="num">${r.tests}</td><td class="num">${(r.hit * 100).toFixed(0)}%</td><td class="num">${(r.base * 100).toFixed(0)}%</td><td class="num">${r.tests ? r.p.toFixed(2) : '—'}</td><td class="num ${r.lift >= 1.5 ? 'lift-hi' : r.lift < 0.8 && r.tests ? 'lift-lo' : ''}">${r.tests ? r.lift.toFixed(2) + '×' : '—'}</td><td><span class="pill ${v[0]}">${v[1]}</span></td></tr>`;
    }).join('');
  }

  /* ---------- data ---------- */
  function renderData() { $('#symName').value = S.sym; $('#dataSub').textContent = `${BARS.length} شمعة · ${fd(BARS[0].t)} ← ${fd(BARS[BARS.length - 1].t)} · ${S.source === 'live' ? 'Twelve Data مباشر' : S.source === 'csv' ? 'ملف مرفوع' : 'بيانات الذهب المرفقة'}`; }
  function setData(txt, isUser) {
    const r = G.parseCSV(txt);
    if (r.error) { toast(r.error); return false; }
    BARS = r.bars; dig = digitsFor(BARS[BARS.length - 1].c);
    if (isUser) { S.csv = txt.length < 900000 ? txt : null; S.anchorT = null; S.anchorLocked = false; S.unit = 0; S.pf = 0; S.sqk = 0; S.source = 'csv'; stopLive(); setStatus('offline', `بيانات مرفوعة يدويًا · ${S.sym}`, { label: 'العودة للبيانات الحية', fn: () => { S.source = 'sample'; S.sym = 'XAU/USD'; $('#symIn').value = S.sym; loadLive(); } }); }
    CHT.fit = true;
    if (r.skipped) toast(`تم تجاهل ${r.skipped} سطرًا غير صالح.`);
    return true;
  }

  /* ---------- tabs ---------- */
  let curTab = 'sig';
  function initTabs() {
    $('#tabs').addEventListener('click', e => {
      const b = e.target.closest('[role=tab]'); if (!b) return; curTab = b.dataset.t;
      $$('#tabs [role=tab]').forEach(x => x.setAttribute('aria-selected', x === b));
      $$('.pane').forEach(p => p.hidden = p.dataset.p !== curTab);
      if (curTab === 'bt') { $('#btBody').innerHTML = `<tr><td colspan="7"><div class="empty">جارٍ الاختبار…</div></td></tr>`; setTimeout(renderBT, 30); }
    });
    $('#sqIn').oninput = () => { sqTouched = true; renderSq9(); };
    $('#sqMul').oninput = () => { sqTouched = true; renderSq9(); };
    $('#applyData').onclick = () => {
      const txt = $('#csvIn').value.trim(); if (!txt) { toast('الصق البيانات أو اختر ملفًا أولًا.'); return; }
      S.sym = ($('#symName').value.trim() || 'أداة').slice(0, 24);
      if (setData(txt, true)) { refresh(); toast(`تم تحميل ${BARS.length} شمعة.`); }
    };
    $('#resetData').onclick = () => { S.csv = null; S.sym = 'XAU/USD'; S.tf = '1day'; S.anchorT = null; S.anchorLocked = false; S.unit = 0; S.pf = 0; S.sqk = 0; $('#csvIn').value = ''; $('#symIn').value = S.sym; syncTf(); S.source = 'sample'; setData(SAMPLE, false); refresh(); loadLive(); };
    $('#fileIn').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { $('#csvIn').value = rd.result; if (!$('#symName').value.trim() || $('#symName').value === S.sym) $('#symName').value = f.name.replace(/\.[^.]+$/, '').slice(0, 24); }; rd.readAsText(f); };
  }

  function alpha(col, a) {
    col = String(col).trim();
    if (col.startsWith('#')) { let h = col.slice(1); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
    if (col.startsWith('rgba')) return col.replace(/[\d.]+\)$/, a + ')');
    if (col.startsWith('rgb(')) return col.replace('rgb(', 'rgba(').replace(')', `,${a})`);
    return col;
  }
  /* ================= CHART (TradingView Lightweight Charts) ================= */
  const LWC = window.LightweightCharts;
  const CHT = { chart: null, candle: null, series: [], lines: [], fit: true, log: false, magnet: false };
  const ovl = $('#ovl'), octx = ovl.getContext('2d'), cwrap = $('#chartWrap');
  const sec = t => Math.floor(t / 1000);

  function chartTheme() {
    return {
      layout: { background: { type: 'solid', color: css('--surface') }, textColor: css('--muted'), fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 11 },
      grid: { vertLines: { color: css('--grid') }, horzLines: { color: css('--grid') } },
      rightPriceScale: { borderColor: css('--line') },
      timeScale: { borderColor: css('--line') },
      crosshair: { vertLine: { color: css('--faint'), labelBackgroundColor: css('--fg') }, horzLine: { color: css('--faint'), labelBackgroundColor: css('--fg') } },
    };
  }
  function initChart() {
    CHT.chart = LWC.createChart(cwrap, Object.assign({
      autoSize: true,
      localization: { priceFormatter: p => fmtP(p), locale: 'en-US' },
      rightPriceScale: { scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { rightOffset: 6, barSpacing: 7, minBarSpacing: 0.5, fixLeftEdge: false, lockVisibleTimeRangeOnResize: true },
      crosshair: { mode: LWC.CrosshairMode.Normal },
      handleScale: { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    }, chartTheme()));
    CHT.candle = CHT.chart.addCandlestickSeries({ priceLineVisible: true, lastValueVisible: true });
    styleCandles();
    CHT.chart.timeScale().subscribeVisibleLogicalRangeChange(() => requestAnimationFrame(drawOverlay));
    CHT.chart.subscribeCrosshairMove(onCrosshair);
    CHT.chart.subscribeClick(onChartClick);
    new ResizeObserver(() => requestAnimationFrame(drawOverlay)).observe(cwrap);
    const retheme = () => { if (!CHT.chart) return; CHT.chart.applyOptions(chartTheme()); styleCandles(); updateChart(true); };
    const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener && mq.addEventListener('change', retheme);
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => CHT.chart.applyOptions({ layout: { fontFamily: '"IBM Plex Mono", ui-monospace, monospace' } }));

    $('#rangeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRange(+b.dataset.r); });
    $('#btnFit').onclick = () => { CHT.chart.timeScale().fitContent(); CHT.chart.priceScale('right').applyOptions({ autoScale: true }); };
    $('#btnLog').onclick = () => { CHT.log = !CHT.log; $('#btnLog').setAttribute('aria-pressed', CHT.log); CHT.chart.priceScale('right').applyOptions({ mode: CHT.log ? LWC.PriceScaleMode.Logarithmic : LWC.PriceScaleMode.Normal }); };
    $('#btnMag').onclick = () => { CHT.magnet = !CHT.magnet; $('#btnMag').setAttribute('aria-pressed', CHT.magnet); CHT.chart.applyOptions({ crosshair: { mode: CHT.magnet ? LWC.CrosshairMode.Magnet : LWC.CrosshairMode.Normal } }); };
    $('#btnFull').onclick = toggleFull;
    document.addEventListener('fullscreenchange', () => { const on = document.fullscreenElement === $('#chartCard'); $('#chartCard').classList.toggle('max', on); syncFull(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#chartCard').classList.contains('max') && !document.fullscreenElement) { $('#chartCard').classList.remove('max'); syncFull(); } });
  }
  function syncFull() { const on = $('#chartCard').classList.contains('max'); $('#btnFull').setAttribute('aria-pressed', on); $('#btnFull').setAttribute('aria-label', on ? 'خروج من ملء الشاشة' : 'ملء الشاشة'); document.body.style.overflow = on ? 'hidden' : ''; requestAnimationFrame(drawOverlay); }
  function toggleFull() {
    const card = $('#chartCard');
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => { }); return; }
    if (card.classList.contains('max')) { card.classList.remove('max'); syncFull(); return; }
    const p = card.requestFullscreen ? card.requestFullscreen() : null;
    if (p && p.catch) p.catch(() => { card.classList.add('max'); syncFull(); }); else { card.classList.add('max'); syncFull(); }
  }
  function styleCandles() {
    const up = css('--up'), dn = css('--down');
    CHT.candle.applyOptions({ upColor: up, downColor: dn, borderUpColor: up, borderDownColor: dn, wickUpColor: up, wickDownColor: dn, priceLineColor: css('--accent') });
  }
  function setRange(bars) {
    if (!CTX) return;
    const ts = CHT.chart.timeScale(), n = CTX.n;
    if (!bars) ts.fitContent(); else ts.setVisibleLogicalRange({ from: Math.max(0, n - bars), to: n + Math.min(CTX.futN, Math.round(bars * 0.35)) });
    $$('#rangeSeg button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.r === bars));
  }
  function clearOverlays() {
    for (const s of CHT.series) CHT.chart.removeSeries(s);
    for (const l of CHT.lines) CHT.candle.removePriceLine(l);
    CHT.series = []; CHT.lines = [];
  }
  const line = (opts) => { const s = CHT.chart.addLineSeries(Object.assign({ lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, lineWidth: 1, autoscaleInfoProvider: () => null }, opts)); CHT.series.push(s); return s; };

  function updateChart(keepView) {
    if (!CHT.chart || !CTX) return;
    const c = CTX, N = c.n + c.futN; c.extendTo(N - 1);
    const range = CHT.chart.timeScale().getVisibleLogicalRange();
    const data = c.bars.map(b => ({ time: sec(b.t), open: b.o, high: b.h, low: b.l, close: b.c }));
    for (let i = c.n; i < N; i++) data.push({ time: sec(c.T[i]) });
    CHT.candle.setData(data);
    CHT.chart.applyOptions({ timeScale: { timeVisible: !c.daily, secondsVisible: false } });
    clearOverlays();
    const ref = c.last.c, lo = Math.max(c.lo * 0.97, ref * 0.85), hi = Math.min(c.hi * 1.03, ref * 1.15);

    // planetary lines (move with each planet's longitude)
    if (S.on.planet) {
      const offs = S.harm ? [0, 90, 180, 270] : [0], cyc = 360 * c.pf;
      for (const P of S.planets) {
        const L = new Float64Array(N); let ok = true;
        for (let i = 0; i < N; i++) { const v = G.lon(P, c.daily ? c.T[i] + DAY / 2 : c.T[i], S.helio); if (v == null) { ok = false; break; } L[i] = v; }
        if (!ok) continue;
        const col = css('--pl-' + P);
        for (const off of offs) {
          const m0 = Math.floor(lo / cyc) - 1, m1 = Math.ceil(hi / cyc) + 1;
          for (let m = m0; m <= m1; m++) {
            const pts = []; let prev = null, inRange = false;
            for (let i = 0; i < N; i++) {
              const v = G.mod(L[i] + off, 360) * c.pf + m * cyc;
              if (prev != null && Math.abs(v - prev) > cyc / 2) pts.push({ time: sec(c.T[i]) });
              else pts.push({ time: sec(c.T[i]), value: v });
              if (v > lo && v < hi) inRange = true; prev = v;
            }
            if (!inRange) continue;
            line({ color: alpha(col, off ? 0.45 : 0.9), lineWidth: off ? 1 : 2, lineStyle: off ? LWC.LineStyle.Dotted : LWC.LineStyle.Solid }).setData(pts);
          }
        }
      }
    }
    // Gann fan from the anchor
    if (S.on.angles) {
      const m = c.main;
      for (const Ag of SC.ANGLES) {
        const pts = [];
        for (let i = m.i; i < N; i++) { const v = angleAt(m, i, Ag.r); if (v <= 0) break; pts.push({ time: sec(c.T[i]), value: v }); }
        const strong = Ag.r === 1;
        line({ color: alpha(css('--c-angles'), strong ? 1 : 0.55), lineWidth: strong ? 2 : 1, title: strong ? '1×1' : '', lastValueVisible: strong }).setData(pts);
      }
    }
    if (S.on.swing) line({ color: alpha(css('--c-trend'), 0.75), lineWidth: 1 }).setData(A.swing.pts.map(p => ({ time: sec(c.bars[p.i].t), value: p.p })).filter((p, k, arr) => !k || p.time > arr[k - 1].time));

    // static levels from the anchor (strong ones only) + top confluence zones
    for (const l of A.levels) {
      if (l.s === 'angles' || l.s === 'planet' || l.w < 1.5 || (l.a != null && l.a !== c.main.i)) continue;
      CHT.lines.push(CHT.candle.createPriceLine({ price: l.p, color: alpha(css(stratColor(l.s)), 0.55), lineWidth: 1, lineStyle: LWC.LineStyle.Dashed, axisLabelVisible: false, title: '' }));
    }
    A.zones.slice().sort((a, b) => b.score - a.score).slice(0, 6).forEach(z => {
      const r = z.p >= ref;
      CHT.lines.push(CHT.candle.createPriceLine({ price: z.p, color: alpha(css(r ? '--down' : '--up'), 0.85), lineWidth: 2, lineStyle: LWC.LineStyle.Solid, axisLabelVisible: true, title: (r ? 'R ' : 'S ') + z.strats.length }));
    });

    // markers: pivots, anchor, signals
    const mk = [];
    for (const p of c.piv) {
      const isMain = p === c.main;
      mk.push({ time: sec(p.t), position: p.type === 'H' ? 'aboveBar' : 'belowBar', shape: isMain ? 'circle' : (p.type === 'H' ? 'arrowDown' : 'arrowUp'), color: isMain ? css('--accent') : alpha(css('--muted'), p.tent ? 0.45 : 0.75), size: isMain ? 1.2 : 0.5, text: isMain ? 'محور' : '' });
    }
    const gmin = { A: 3, B: 2, C: 1 }[S.so.minGrade] || 1;
    for (const s of SIG.list) {
      if ({ A: 3, B: 2, C: 1 }[s.grade] < gmin) continue;
      mk.push({ time: sec(s.t), position: s.dir > 0 ? 'belowBar' : 'aboveBar', shape: s.dir > 0 ? 'arrowUp' : 'arrowDown', color: css(s.dir > 0 ? '--up' : '--down'), size: s.grade === 'A' ? 2 : 1.4, text: `${s.grade} ${PL[s.P][0]}` });
    }
    mk.sort((a, b) => a.time - b.time);
    CHT.candle.setMarkers(mk);
    if (CHT.fit || !range) { CHT.fit = false; setRange(innerWidth < 600 ? 90 : (c.daily ? 180 : 160)); } else if (keepView || range) CHT.chart.timeScale().setVisibleLogicalRange(range);
    renderLegend(); requestAnimationFrame(drawOverlay);
  }

  /* time windows + event ticks on a canvas laid over the pane */
  function drawOverlay() {
    if (!CHT.chart || !CTX || !A) return;
    const r = cwrap.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    ovl.width = Math.round(r.width * dpr); ovl.height = Math.round(r.height * dpr);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.clearRect(0, 0, r.width, r.height);
    const ts = CHT.chart.timeScale(), paneW = r.width - CHT.chart.priceScale('right').width(), paneH = r.height - ts.height();
    octx.save(); octx.beginPath(); octx.rect(0, 0, paneW, paneH); octx.clip();
    const acc = css('--accent');
    const x = fi => ts.logicalToCoordinate(fi);
    const xn = x(CTX.n - 0.5);
    if (xn != null && xn < paneW) { octx.fillStyle = alpha(css('--fg'), 0.03); octx.fillRect(xn, 0, paneW - xn, paneH); octx.strokeStyle = alpha(css('--faint'), 0.8); octx.setLineDash([3, 4]); octx.beginPath(); octx.moveTo(Math.round(xn) + .5, 0); octx.lineTo(Math.round(xn) + .5, paneH); octx.stroke(); octx.setLineDash([]); }
    const win = CTX.daily ? S.win : 0;
    A.windows.slice(0, 8).forEach((w, k) => {
      const fi = SC.idxOfT(CTX, w.t), x0 = x(fi - win - 0.5), x1 = x(fi + win + 0.5);
      if (x0 == null || x1 == null) return;
      octx.fillStyle = alpha(acc, Math.max(0.06, 0.2 - k * 0.018)); octx.fillRect(x0, 0, Math.max(2, x1 - x0), paneH);
      if (k < 5) { octx.fillStyle = acc; octx.font = '500 10px "IBM Plex Mono", monospace'; octx.textAlign = 'center'; octx.textBaseline = 'top'; octx.fillText(String(k + 1), (x0 + x1) / 2, 4); }
    });
    for (const e of A.events) { const xe = x(SC.idxOfT(CTX, e.t)); if (xe == null) continue; octx.fillStyle = alpha(css(stratColor(e.s)), 0.85); octx.fillRect(xe - 0.75, paneH - 6, 1.5, 6); }
    // squaring windows for the anchor (price = time) as thin top ticks
    for (const q of SIG.watch) { const xq = x(SC.idxOfT(CTX, q.t)); if (xq == null) continue; octx.fillStyle = css('--pl-' + q.P); octx.beginPath(); octx.arc(xq, 16, 3, 0, Math.PI * 2); octx.fill(); }
    renderDrawings(octx, x, p => CHT.candle.priceToCoordinate(p), paneW, paneH);
    octx.restore();
  }

  /* TradingView-style legend + hover details */
  function onCrosshair(param) {
    const box = $('#hover');
    if (!CTX || !param || param.logical == null || !param.point) { renderOHLC(CTX ? CTX.n - 1 : null); box.hidden = true; return; }
    if (DRAW.pend) { const pp = CHT.candle.coordinateToPrice(param.point.y); if (pp != null) { DRAW.hover = { t: tOfLogical(param.logical), p: pp }; drawOverlay(); } }
    const i = Math.round(param.logical); CTX.extendTo(Math.max(0, i));
    if (i < 0) { renderOHLC(CTX.n - 1); box.hidden = true; return; }
    renderOHLC(i < CTX.n ? i : null, i);
    const price = CHT.candle.coordinateToPrice(param.point.y);
    if (price == null) { box.hidden = true; return; }
    const ii = Math.max(0, i), lv = [];
    for (const s of SC.STRATS) if (s.g === 'price' && S.on[s.id]) lv.push(...SC.priceLevels(s.id, CTX, ii, CTX.anchors, CTX.main, CTX.prevOpp, price));
    const near = lv.filter(l => Math.abs(l.p - price) <= price * Math.max(S.tolPct, 0.25) / 100).sort((a, b) => Math.abs(a.p - price) - Math.abs(b.p - price)).slice(0, 4);
    const day = Math.floor(CTX.T[ii] / DAY), evs = A.events.filter(e => Math.floor(e.t / DAY) === day).slice(0, 3);
    const sg = SIG.list.find(s => s.i === ii);
    let html = '';
    if (sg) html += `<div class="hv-sig ${sg.dir > 0 ? 'side-s' : 'side-r'}">${sg.dir > 0 ? 'شراء' : 'بيع'} ${sg.grade} · ${glyph(sg.P)} ${PL[sg.P][1]} <span class="num">${fmtP(sg.v)}</span> · ${sqText(sg.sq)}</div>`;
    if (near.length) html += near.map(l => `<div><b class="num">${fmtP(l.p)}</b> ${esc(lvLabel(l))}</div>`).join('');
    if (evs.length) html += evs.map(e => `<div class="hv-ev">${esc(evLabel(e))}</div>`).join('');
    box.innerHTML = html; box.hidden = !html;
  }
  function renderOHLC(i, fi) {
    const el = $('#ohlc'); if (!CTX) return;
    const sym = `<b>${esc(S.sym)}</b> · ${TF_N[S.tf] || S.tf}`;
    if (i == null) { el.innerHTML = `${sym} · <span class="num">${fd(CTX.T[Math.max(0, fi || 0)])}</span> <span style="color:var(--faint)">مستقبل</span>`; return; }
    const b = CTX.bars[i], p = i ? CTX.bars[i - 1].c : b.o, ch = (b.c - p) / p, cl = ch >= 0 ? 'side-s' : 'side-r';
    el.innerHTML = `${sym} · <span class="num">${fd(b.t)}</span><span class="o num">O <i class="${cl}">${fmtP(b.o)}</i> H <i class="${cl}">${fmtP(b.h)}</i> L <i class="${cl}">${fmtP(b.l)}</i> C <i class="${cl}">${fmtP(b.c)}</i> <i class="${cl}">${pct(ch)}</i></span>`;
  }
  function onChartClick(param) {
    if (!CTX || param.logical == null || !param.point) return;
    if (DRAW.tool) return;
    const price = CHT.candle.coordinateToPrice(param.point.y); let best = null, bd = 1e9;
    for (const pv of CTX.piv) { const d = Math.abs(pv.i - param.logical) + Math.abs(pv.p - price) / pv.p * 200; if (Math.abs(pv.i - param.logical) <= 3 && d < bd) { bd = d; best = pv; } }
    if (best && best !== CTX.main && Math.abs(best.p - price) / best.p < 0.03) { S.anchorT = best.t; S.anchorLocked = true; refresh(); toast(`المحور الآن: ${best.type === 'H' ? 'قمة' : 'قاع'} ${fmtP(best.p)} — ${fd(best.t)}`); }
  }

  function renderLegend() {
    const it = [];
    for (const s of SC.STRATS) if (S.on[s.id] && ['angles', 'swing'].includes(s.id)) it.push(`<span><i style="background:var(${stratColor(s.id)})"></i>${META[s.id][0]}</span>`);
    if (S.on.planet) for (const p of S.planets) it.push(`<span><i style="background:var(--pl-${p})"></i>${glyph(p)} ${PL[p][1]}</span>`);
    it.push(`<span><i style="background:var(--down);height:3px"></i>R/S منطقة تلاقٍ (عدد المصادر)</span>`);
    it.push(`<span><i style="background:var(--accent);height:8px;opacity:.5"></i>نافذة زمنية</span>`);
    it.push(`<span><i class="arrow up"></i>إشارة صفقة (A/B/C + الكوكب)</span>`);
    it.push(`<span class="hint">عجلة الفأرة أو قرص الإصبعين للتكبير · اسحب للتحريك · اسحب المحور السعري لتمديده · اضغط قمة/قاعًا لجعله المحور</span>`);
    $('#legend').innerHTML = it.join('');
  }


  /* ================= DRAWING TOOLS ================= */
  const DRAW = { tool: null, pend: null, hover: null, items: [] };
  const dKey = () => `gann-draw:${S.sym}:${S.tf}`;
  function loadDrawings() { try { DRAW.items = JSON.parse(localStorage.getItem(dKey()) || '[]'); } catch (e) { DRAW.items = []; } }
  function saveDrawings() { try { localStorage.setItem(dKey(), JSON.stringify(DRAW.items.slice(-200))); } catch (e) { } }
  const tOfLogical = l => { const i = Math.floor(l), f = l - i; CTX.extendTo(Math.max(0, i + 1)); if (i < 0) return CTX.T[0] + l * (CTX.daily ? DAY : CTX.step); return CTX.T[i] + f * (CTX.T[i + 1] - CTX.T[i]); };
  const TOOL_N = { line: 'خط اتجاه: اضغط نقطتين', ray: 'شعاع: اضغط نقطتين', hline: 'خط أفقي: اضغط مرة', fan: 'مروحة جان: اضغط على قمة أو قاع' };
  function setTool(t) {
    DRAW.tool = DRAW.tool === t ? null : t; DRAW.pend = null;
    $$('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === DRAW.tool));
    $('#chartWrap').classList.toggle('drawing', !!DRAW.tool);
    CHT.chart.applyOptions(DRAW.tool ? { handleScroll: false, handleScale: false } : { handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true } });
    $('#toolHint').textContent = DRAW.tool ? TOOL_N[DRAW.tool] + ' · Esc للإلغاء' : '';
    $('#toolHint').hidden = !DRAW.tool;
    drawOverlay();
  }
  function drawClick(param) {
    const p = CHT.candle.coordinateToPrice(param.point.y); if (p == null) return;
    let l = param.logical; const pt = { t: tOfLogical(l), p };
    if (DRAW.tool === 'hline') { DRAW.items.push({ k: 'hline', a: pt }); done(); return; }
    if (DRAW.tool === 'fan') {
      const i = Math.round(l); let a = pt;
      if (i >= 0 && i < CTX.n) { const b = CTX.bars[i]; a = { t: b.t, p: Math.abs(p - b.h) < Math.abs(p - b.l) ? b.h : b.l }; a.dir = a.p === b.h ? -1 : 1; } else a.dir = p < CTX.last.c ? 1 : -1;
      DRAW.items.push({ k: 'fan', a, u: CTX.u }); done(); return;
    }
    if (!DRAW.pend) { DRAW.pend = pt; drawOverlay(); return; }
    DRAW.items.push({ k: DRAW.tool, a: DRAW.pend, b: pt }); done();
    function done() { saveDrawings(); DRAW.pend = null; setTool(null); }
  }
  function renderDrawings(ctx2, x, y, paneW, paneH) {
    const col = css('--fg'), acc = css('--c-angles');
    const list = DRAW.items.slice();
    if (DRAW.pend && DRAW.hover) list.push({ k: DRAW.tool, a: DRAW.pend, b: DRAW.hover, preview: true });
    for (const d of list) {
      ctx2.save(); ctx2.lineWidth = 1.5; ctx2.strokeStyle = d.preview ? alpha(col, 0.5) : col; ctx2.setLineDash(d.preview ? [4, 4] : []);
      const ax = x(SC.idxOfT(CTX, d.a.t)), ay = y(d.a.p);
      if (d.k === 'hline') {
        if (ay == null) { ctx2.restore(); continue; }
        ctx2.beginPath(); ctx2.moveTo(0, ay); ctx2.lineTo(paneW, ay); ctx2.stroke();
        ctx2.fillStyle = col; ctx2.font = '500 10px "IBM Plex Mono", monospace'; ctx2.textAlign = 'left'; ctx2.textBaseline = 'bottom'; ctx2.fillText(fmtP(d.a.p), 6, ay - 2);
      } else if (d.k === 'line' || d.k === 'ray') {
        const bx = x(SC.idxOfT(CTX, d.b.t)), by = y(d.b.p);
        if (ax == null || bx == null || ay == null || by == null) { ctx2.restore(); continue; }
        let ex = bx, ey = by;
        if (d.k === 'ray' && bx !== ax) { const s = (by - ay) / (bx - ax), tx = bx > ax ? paneW : 0; ex = tx; ey = ay + s * (tx - ax); }
        ctx2.beginPath(); ctx2.moveTo(ax, ay); ctx2.lineTo(ex, ey); ctx2.stroke();
        for (const [px, py] of [[ax, ay], [bx, by]]) { ctx2.fillStyle = css('--surface'); ctx2.beginPath(); ctx2.arc(px, py, 3, 0, Math.PI * 2); ctx2.fill(); ctx2.stroke(); }
      } else if (d.k === 'fan') {
        if (ax == null || ay == null) { ctx2.restore(); continue; }
        const i0 = SC.idxOfT(CTX, d.a.t), iEnd = CTX.n + CTX.futN - 1;
        for (const A of SC.ANGLES) {
          ctx2.strokeStyle = alpha(acc, A.r === 1 ? 0.95 : 0.5); ctx2.lineWidth = A.r === 1 ? 1.6 : 1;
          ctx2.beginPath(); let lx = ax, ly = ay; ctx2.moveTo(ax, ay);
          const stepN = Math.max(1, Math.round((iEnd - i0) / 80));
          for (let i = Math.ceil(i0) + 1; i <= iEnd; i += stepN) {
            const e = S.timeMode === 'bar' ? i - i0 : (CTX.T[i] - d.a.t) / DAY;
            const v = d.a.p + d.a.dir * A.r * d.u * e, yy = y(v), xx = x(i); if (yy == null || xx == null) break; ctx2.lineTo(xx, yy); lx = xx; ly = yy;
          }
          ctx2.stroke();
          if (lx < paneW - 4 && ly > 8 && ly < paneH - 4) { ctx2.fillStyle = ctx2.strokeStyle; ctx2.font = '10px "IBM Plex Mono", monospace'; ctx2.textAlign = 'right'; ctx2.textBaseline = 'bottom'; ctx2.fillText(A.l, lx - 2, ly - 2); }
        }
      }
      ctx2.restore();
    }
  }
  function initTools() {
    const wrapEl = $('#chartWrap'); let down = null;
    wrapEl.addEventListener('pointerdown', e => { if (DRAW.tool) down = { x: e.clientX, y: e.clientY }; }, true);
    wrapEl.addEventListener('pointerup', e => {
      if (!DRAW.tool || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (moved > 6) return;
      const r = wrapEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const paneW = r.width - CHT.chart.priceScale('right').width(), paneH = r.height - CHT.chart.timeScale().height();
      if (x < 0 || y < 0 || x > paneW || y > paneH) return;
      const logical = CHT.chart.timeScale().coordinateToLogical(x); if (logical == null) return;
      drawClick({ logical, point: { x, y } });
    }, true);
    $('#toolbar').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tool) setTool(b.dataset.tool);
      else if (b.id === 'toolUndo') { DRAW.items.pop(); saveDrawings(); drawOverlay(); }
      else if (b.id === 'toolClear') { if (!DRAW.items.length) return; if (b.dataset.confirm === '1') { DRAW.items = []; saveDrawings(); drawOverlay(); b.dataset.confirm = ''; b.textContent = 'مسح'; } else { b.dataset.confirm = '1'; b.textContent = 'تأكيد المسح؟'; setTimeout(() => { b.dataset.confirm = ''; b.textContent = 'مسح'; }, 2500); } }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && DRAW.tool) setTool(null); if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && DRAW.items.length && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); DRAW.items.pop(); saveDrawings(); drawOverlay(); } });
    loadDrawings();
  }

  /* ================= ALERTS ================= */
  const AL = { on: false, ctx: null, seen: new Set(), near: new Set(), base: document.title };
  function beep(kind) {
    if (!AL.ctx) return;
    const ac = AL.ctx, now = ac.currentTime, notes = kind === 'sig' ? [660, 880, 1100] : [520, 520];
    notes.forEach((f, k) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, now + k * 0.18); g.gain.exponentialRampToValueAtTime(0.18, now + k * 0.18 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + k * 0.18 + 0.16); o.connect(g).connect(ac.destination); o.start(now + k * 0.18); o.stop(now + k * 0.18 + 0.18); });
  }
  function toggleAlerts() {
    AL.on = !AL.on;
    if (AL.on && !AL.ctx) { try { AL.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AL.ctx = null; } }
    if (AL.ctx && AL.ctx.state === 'suspended') AL.ctx.resume();
    $('#btnAlert').setAttribute('aria-pressed', AL.on);
    if (AL.on) { markSeen(); beep('near'); toast('التنبيه الصوتي مفعّل. اترك الصفحة مفتوحة ليصلك صوت عند ظهور إشارة.'); } else { document.title = AL.base; toast('التنبيه الصوتي متوقف.'); }
  }
  const sigKey = s => `${S.sym}|${S.tf}|${s.t}|${s.P}|${s.off}|${s.dir}`;
  function markSeen() { if (SIG.live) AL.seen.add(sigKey(SIG.live)); }
  function checkAlerts() {
    if (!AL.on || S.source !== 'live' || !CTX) return;
    const s = SIG.live;
    if (s && !AL.seen.has(sigKey(s))) {
      AL.seen.add(sigKey(s)); beep('sig');
      const msg = `${s.dir > 0 ? 'شراء' : 'بيع'} ${s.grade} · ${S.sym} عند خط ${PL[s.P][1]} ${fmtP(s.v)}`;
      toast('إشارة جديدة: ' + msg); document.title = '● ' + msg;
      $('#alertLog').insertAdjacentHTML('afterbegin', `<li><span class="num">${clock(Date.now())}</span> ${esc(msg)}</li>`);
      return;
    }
    // approaching a planet line that squares with time today
    const today = Math.floor(CTX.last.t / DAY), ref = CTX.last.c;
    for (const w of SIG.watch) {
      if (Math.floor(w.t / DAY) !== today) continue;
      const k = `${S.sym}|${w.P}|${w.off}|${today}`;
      if (!AL.near.has(k) && Math.abs(w.v - ref) / ref <= S.so.touchPct * 3 / 100) {
        AL.near.add(k); beep('near');
        const msg = `${S.sym} يقترب من خط ${PL[w.P][1]} ${fmtP(w.v)} وهو متربع مع الزمن اليوم`;
        toast(msg); $('#alertLog').insertAdjacentHTML('afterbegin', `<li><span class="num">${clock(Date.now())}</span> ${esc(msg)}</li>`);
      }
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && AL.on) document.title = AL.base; });

  /* ================= SIGNALS ================= */
  const SIG = { list: [], live: null, watch: [], stat: null };
  const SQ_N = { bal1: 'توازن 1×1', sq9: 'زاوية مربع ٩', sq9o: 'مقابلة مربع ٩', cyc: 'دورة/مربع زمن', pdeg: 'السعر كدرجات' };
  const sqText = sq => sq && sq.list.length ? sq.list.map(k => SQ_N[k]).join(' + ') : 'بدون تربيع';
  function soOpts() { return Object.assign({}, S.so, { win: S.so.win }); }
  function computeSignals() {
    const so = soOpts();
    so.useMainFrom = S.anchorLocked ? CTX.n - 5 : null;
    SIG.list = SC.signals(CTX, so, 0);
    SC.simulate(CTX, SIG.list, S.so.hold);
    const lastI = CTX.n - 1;
    SIG.live = SIG.list.filter(s => s.i >= lastI - 1).sort((a, b) => b.score - a.score)[0] || null;
    // watch plan: the next time each nearby planet line squares with time from the anchor
    SIG.watch = [];
    const m = CTX.main, ref = CTX.last.c, cyc = 360 * CTX.pf, offs = S.harm ? [0, 90, 180, 270] : [0];
    const end = CTX.n + CTX.futN;
    for (const P of S.planets) for (const off of offs) {
      const L0 = G.lon(P, CTX.last.t, S.helio); if (L0 == null) continue;
      const base = G.mod(L0 + off, 360) * CTX.pf;
      for (const m2 of [Math.floor((ref - base) / cyc), Math.ceil((ref - base) / cyc)]) {
        const v0 = base + m2 * cyc; if (Math.abs(v0 - ref) / ref > 0.06) continue;
        for (let j = CTX.n; j < end; j++) {
          const Lj = G.lon(P, CTX.daily ? CTX.T[j] + DAY / 2 : CTX.T[j], S.helio);
          let v = G.mod(Lj + off, 360) * CTX.pf + m2 * cyc; if (Math.abs(v - v0) > cyc / 2) v += (v < v0 ? cyc : -cyc);
          const sq = SC.squareState(CTX, m, j, v, so);
          if (sq && (sq.bal1 || sq.sq9)) { SIG.watch.push({ P, off, v, v0, t: CTX.T[j], j, sq }); break; }
        }
      }
    }
    SIG.watch.sort((a, b) => a.t - b.t);
    SIG.watch = SIG.watch.filter((w, k, arr) => arr.findIndex(x => x.P === w.P && x.off === w.off && Math.abs(x.v0 - w.v0) < 1e-9) === k).slice(0, 10);
    SIG.stat = { all: SC.stats(SIG.list), A: SC.stats(SIG.list.filter(s => s.grade === 'A')), B: SC.stats(SIG.list.filter(s => s.grade === 'B')), C: SC.stats(SIG.list.filter(s => s.grade === 'C')) };
    // compare: same touches without any squaring requirement → does squaring add value?
    if (S.so.requireSq) { const base = SC.signals(CTX, Object.assign({}, so, { requireSq: false }), 0); SC.simulate(CTX, base, S.so.hold); SIG.stat.touchOnly = SC.stats(base.filter(s => s.grade === 'C')); }
  }
  function nearestLines() {
    const ref = CTX.last.c, cyc = 360 * CTX.pf, offs = S.harm ? [0, 90, 180, 270] : [0], out = [];
    for (const P of S.planets) { const L = G.lon(P, Date.now(), S.helio); if (L == null) continue; for (const off of offs) { const base = G.mod(L + off, 360) * CTX.pf; for (let k = -1; k <= 1; k++) { const v = base + (Math.round((ref - base) / cyc) + k) * cyc; out.push({ P, off, v, d: (v - ref) / ref }); } } }
    const up = out.filter(x => x.d > 0).sort((a, b) => a.d - b.d)[0], dn = out.filter(x => x.d <= 0).sort((a, b) => b.d - a.d)[0];
    return { up, dn };
  }
  function renderSignals() {
    const live = SIG.live, box = $('#sigNow'), c = CTX;
    const statCard = (k, st, nm) => `<div class="st"><div class="k">${nm}</div><div class="v num ${st.exp > 0 ? 'side-s' : st.n ? 'side-r' : ''}">${st.n ? (st.exp >= 0 ? '+' : '') + st.exp.toFixed(2) + 'R' : '—'}</div><div class="s">${st.n} صفقة · ربح ${(st.win * 100).toFixed(0)}% · PF ${isFinite(st.pf) ? st.pf.toFixed(2) : '∞'}</div></div>`;
    if (live) {
      const buy = live.dir > 0;
      box.className = 'sig-now ' + (buy ? 'buy' : 'sell');
      box.innerHTML = `<div class="sig-h"><span class="pill ${buy ? 'up' : 'down'}">${buy ? 'إشارة شراء' : 'إشارة بيع'} ${live.grade}</span><b>السعر لمس خط ${glyph(live.P)} ${PL[live.P][1]}${live.off ? ` ⁦+${live.off}°⁩` : ''} عند <span class="num">${fmtP(live.v)}</span></b><small>${fd(live.t)}</small></div>
        <div class="sig-g">
          <div><span>الدخول</span><b class="num">${fmtP(live.entry)}</b></div>
          <div><span>وقف الخسارة</span><b class="num side-r">${fmtP(live.stop)}</b></div>
          <div><span>الهدف 1 (مربع ٩ ${buy ? '+' : '−'}90°)</span><b class="num side-s">${fmtP(live.t1)}</b></div>
          <div><span>الهدف 2 (${buy ? '+' : '−'}180°)</span><b class="num side-s">${fmtP(live.t2)}</b></div>
          <div><span>العائد/المخاطرة</span><b class="num">${(Math.abs(live.t1 - live.entry) / live.risk).toFixed(2)}</b></div>
          <div><span>التربيع</span><b>${sqText(live.sq)}</b></div>
        </div>
        <p class="sig-x">من ${live.a.type === 'H' ? 'قمة' : 'قاع'} <span class="num">${fmtP(live.a.p)}</span> مضى <span class="num">${live.sq.e.toFixed(1)}</span> ${S.timeMode === 'bar' ? 'شمعة' : 'يوم'} وقطع السعر <span class="num">${live.sq.units.toFixed(1)}</span> وحدة (نسبة <span class="num">${live.sq.bal.toFixed(2)}</span>) · زاوية السعر <span class="num">${live.sq.dP.toFixed(1)}°</span> وزاوية الزمن <span class="num">${live.sq.dT.toFixed(1)}°</span>.</p>`;
    } else {
      const nl = nearestLines();
      box.className = 'sig-now idle';
      box.innerHTML = `<div class="sig-h"><span class="pill nt">لا توجد صفقة الآن</span><b>الماسح يراقب لمس خطوط الكواكب مع تربيع السعر بالزمن</b></div>
        <div class="sig-g">
          <div><span>أقرب خط فوق السعر</span><b>${nl.up ? `${glyph(nl.up.P)} ${PL[nl.up.P][1]} <span class="num">${fmtP(nl.up.v)}</span> <small class="num">${pct(nl.up.d)}</small>` : '—'}</b></div>
          <div><span>أقرب خط تحت السعر</span><b>${nl.dn ? `${glyph(nl.dn.P)} ${PL[nl.dn.P][1]} <span class="num">${fmtP(nl.dn.v)}</span> <small class="num">${pct(nl.dn.d)}</small>` : '—'}</b></div>
        </div>`;
    }
    $('#sigWatch').innerHTML = SIG.watch.length ? `<table><thead><tr><th>التاريخ</th><th>الخط</th><th>سعر الخط يومها</th><th>المسافة الآن</th><th>نوع التربيع</th></tr></thead><tbody>${SIG.watch.map(w => `<tr><td>${fd(w.t)}<small style="color:var(--faint);display:block">+${Math.round((w.t - c.last.t) / DAY)} يوم</small></td><td><span style="color:var(--pl-${w.P})">${glyph(w.P)}</span> ${PL[w.P][1]}${w.off ? ` ⁦+${w.off}°⁩` : ''}</td><td class="num">${fmtP(w.v)}</td><td class="num ${w.v > c.last.c ? 'side-r' : 'side-s'}">${pct((w.v - c.last.c) / c.last.c)}</td><td>${sqText(w.sq)}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">لا يوجد خط كوكبي قريب (±6%) يتربع مع الزمن داخل أفق المسح. زد الأفق أو فعّل كواكب أخرى.</div>`;
    const st = SIG.stat;
    $('#sigStats').innerHTML = statCard('all', st.all, 'كل الإشارات') + statCard('A', st.A, 'الدرجة A') + statCard('B', st.B, 'الدرجة B') + (st.touchOnly ? statCard('t', st.touchOnly, 'لمس بدون تربيع (للمقارنة)') : statCard('C', st.C, 'الدرجة C'));
    const rows = SIG.list.slice().reverse().slice(0, 60);
    $('#sigBody').innerHTML = rows.length ? rows.map(s => {
      const r = s.res, rk = r.kind === 'target' ? ['side-s', 'الهدف'] : r.kind === 'stop' ? ['side-r', 'الوقف'] : r.kind === 'time' ? ['', 'انتهاء المدة'] : ['', 'مفتوحة'];
      return `<tr><td class="num" style="white-space:nowrap">${fd(s.t)}</td><td><span class="pill ${s.dir > 0 ? 'up' : 'down'}">${s.dir > 0 ? 'شراء' : 'بيع'} ${s.grade}</span></td><td><span style="color:var(--pl-${s.P})">${glyph(s.P)}</span> ${PL[s.P][1]}${s.off ? ` ⁦+${s.off}°⁩` : ''} <span class="num">${fmtP(s.v)}</span></td><td style="font-size:.8rem">${sqText(s.sq)}</td><td class="num">${fmtP(s.entry)}</td><td class="num side-r">${fmtP(s.stop)}</td><td class="num side-s">${fmtP(s.t1)}</td><td class="num ${rk[0]}">${rk[1]} ${r.R >= 0 ? '+' : ''}${r.R.toFixed(2)}R</td></tr>`;
    }).join('') : `<tr><td colspan="8"><div class="empty">لا توجد إشارات بهذه القواعد في البيانات الحالية.</div></td></tr>`;
    $('#sigSub').textContent = `${SIG.list.length} إشارة · احتفاظ حتى ${S.so.hold} شمعة`;
  }

  /* ================= LIVE DATA (GannData providers) ================= */
  const GD = window.GannData;
  const TF_N = { '15min': '15 دقيقة', '1h': 'ساعة', '4h': '4 ساعات', '1day': 'يومي', '1week': 'أسبوعي' };
  const LIVE = { env: { mcp: null }, feed: null, at: null, meta: null, tickTimer: 0, lastRefresh: 0 };
  const clock = t => new Date(t).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const digitsFor = p => p >= 1000 ? 2 : p >= 100 ? 3 : p >= 10 ? 3 : p >= 1 ? 5 : 6;
  function setStatus(kind, text, action) {
    const el = $('#live'); el.className = 'live ' + kind;
    el.querySelector('.lt').textContent = text;
    const btn = $('#liveAct'); btn.hidden = !action; if (action) { btn.textContent = action.label; btn.onclick = action.fn; }
  }
  async function initLive() {
    try { LIVE.env.mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null; } catch (e) { LIVE.env.mcp = null; }
    $('#keyBox').hidden = !!LIVE.env.mcp;
    if (S.source === 'csv') return;
    loadLive();
  }
  function stopLive() { if (LIVE.feed) LIVE.feed.stop(); LIVE.feed = null; }
  function loadLive() {
    stopLive(); loadDrawings(); AL.seen.clear();
    const sym = S.sym, tf = S.tf;
    LIVE.feed = GD.createFeed({
      sym, tf, env: LIVE.env,
      onStatus: st => { setStatus(st.kind, st.text, st.action); if (st.kind === 'err' && S.source !== 'live' && !BARS.length) { setData(SAMPLE, false); refresh(); } },
      onNeedKey: openKeySettings,
      onBars: (bars, meta, reload) => {
        if (sym !== S.sym || tf !== S.tf) return;
        const fresh = !reload || S.source !== 'live' || !BARS.length || BARS[0].t !== bars[0].t;
        BARS = bars; S.source = 'live'; LIVE.meta = meta;
        dig = meta.decimals != null ? Math.min(Math.max(meta.decimals, 2), 6) : digitsFor(bars[bars.length - 1].c);
        LIVE.at = Date.now();
        if (fresh) { CHT.fit = true; if (!S.anchorLocked) S.anchorT = null; }
        refresh(!fresh);
      },
      onTick: k => {
        if (sym !== S.sym || tf !== S.tf || !BARS.length) return;
        const last = BARS[BARS.length - 1];
        if (k.t === last.t) Object.assign(last, { o: k.o, h: k.h, l: k.l, c: k.c });
        else if (k.t > last.t) BARS.push({ t: k.t, o: k.o, h: k.h, l: k.l, c: k.c });
        else return;
        LIVE.at = Date.now();
        $('#qPx').textContent = fmtP(k.c);
        // heavy re-analysis at most every 3 s; the header price updates on every tick
        const wait = 3000 - (Date.now() - LIVE.lastRefresh);
        clearTimeout(LIVE.tickTimer);
        LIVE.tickTimer = setTimeout(() => { LIVE.lastRefresh = Date.now(); refresh(true); }, Math.max(0, wait));
      },
    });
  }
  function openKeySettings() {
    $$('#tabs [role=tab]').forEach(x => x.setAttribute('aria-selected', x.dataset.t === 'data'));
    $$('.pane').forEach(p => p.hidden = p.dataset.p !== 'data'); curTab = 'data';
    $('#keyIn').focus(); $('#keyBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function initKeyBox() {
    const k = GD.getKey(); $('#keyIn').value = k ? '••••••••' + k.slice(-4) : '';
    $('#keySave').onclick = async () => {
      const v = $('#keyIn').value.trim();
      if (!v || v.startsWith('••')) { toast('اكتب المفتاح كاملًا.'); return; }
      GD.setKey(v); $('#keyIn').value = '••••••••' + v.slice(-4);
      $('#keyMsg').textContent = 'جارٍ التحقق…';
      try { await GD.fetchBars('EUR/USD', '1day', 40, {}); $('#keyMsg').textContent = 'المفتاح يعمل. تم الحفظ على هذا الجهاز فقط.'; loadLive(); }
      catch (e) { $('#keyMsg').textContent = e.message; }
    };
    $('#keyDel').onclick = () => { GD.setKey(''); $('#keyIn').value = ''; $('#keyMsg').textContent = 'تم حذف المفتاح من هذا الجهاز.'; };
  }

  /* ================= MULTI-SYMBOL SCANNER ================= */
  const MS = { running: false, rows: [] };
  async function runScan() {
    if (MS.running) { MS.running = false; return; }
    const syms = $('#msList').value.split(/[,\n،]+/).map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 25);
    S.watchlist = syms.join(', '); save();
    MS.running = true; MS.rows = syms.map(s => ({ s, st: 'wait' })); renderScan();
    $('#msRun').textContent = 'إيقاف المسح';
    for (let k = 0; k < syms.length && MS.running; k++) {
      const row = MS.rows[k]; row.st = 'load'; renderScan();
      const rt = GD.route(row.s, !!LIVE.env.mcp);
      try {
        const res = await GD.fetchBars(row.s, S.tf, 500, LIVE.env);
        Object.assign(row, scanOne(res.bars), { st: 'ok', src: rt.provider });
      } catch (e) { row.st = 'err'; row.msg = e.message || 'خطأ'; if (['auth', 'nokey'].includes(e.code)) MS.running = false; }
      renderScan();
      // Twelve Data free plan allows 8 requests per minute; Binance needs no wait
      if (k < syms.length - 1 && MS.running && rt.provider !== 'binance') await new Promise(r => setTimeout(r, 7600));
    }
    MS.running = false; $('#msRun').textContent = 'ابدأ المسح'; renderScan();
  }
  function scanOne(bars) {
    const o = { pivK: S.pivK, anchorI: null, anchorMode: 'main', timeMode: S.timeMode, unit: 0, sqk: 0, pf: 0, horizon: S.horizon, harm: S.harm, helio: S.helio, planets: S.planets.slice(), tolPct: S.tolPct, win: Math.max(1, S.win) };
    const c = SC.build(bars, o); if (!c.main) return { st: 'err', msg: 'قمم وقيعان غير كافية' };
    const so = soOpts(); const sg = SC.signals(c, so, Math.max(0, c.n - 120));
    const lastSig = sg.filter(s => s.i >= c.n - 3).sort((a, b) => b.score - a.score)[0] || null;
    const ref = c.last.c, cyc = 360 * c.pf; let near = null;
    for (const P of S.planets) { const L = G.lon(P, c.last.t, S.helio); if (L == null) continue; for (const off of (S.harm ? [0, 90, 180, 270] : [0])) { const base = G.mod(L + off, 360) * c.pf, v = base + Math.round((ref - base) / cyc) * cyc; const d = (v - ref) / ref; if (!near || Math.abs(d) < Math.abs(near.d)) near = { P, off, v, d, sq: SC.squareState(c, c.main, c.n - 1, v, so) }; } }
    const pc = bars[bars.length - 2].c;
    return { c: ref, ch: (ref - pc) / pc, sig: lastSig, near, dig: digitsFor(ref), bars };
  }
  function renderScan() {
    $('#msBody').innerHTML = MS.rows.length ? MS.rows.map((r, k) => {
      if (r.st !== 'ok') return `<tr><td><b>${esc(r.s)}</b></td><td colspan="5" style="color:var(--faint)">${r.st === 'wait' ? 'في الانتظار' : r.st === 'load' ? 'جارٍ الجلب والحساب…' : esc(r.msg || 'خطأ')}</td></tr>`;
      const f = p => p.toLocaleString('en-US', { minimumFractionDigits: r.dig, maximumFractionDigits: r.dig });
      const sig = r.sig ? `<span class="pill ${r.sig.dir > 0 ? 'up' : 'down'}">${r.sig.dir > 0 ? 'شراء' : 'بيع'} ${r.sig.grade}</span> ${glyph(r.sig.P)}` : '<span class="pill nt">لا شيء</span>';
      const sq = r.near && r.near.sq && r.near.sq.list.length ? `<span class="tag" style="color:var(--accent)">${sqText(r.near.sq)}</span>` : '<span style="color:var(--faint)">غير متربع</span>';
      return `<tr class="ms-row" data-k="${k}" tabindex="0"><td><b>${esc(r.s)}</b></td><td class="num">${f(r.c)} <small class="num ${r.ch >= 0 ? 'side-s' : 'side-r'}">${pct(r.ch)}</small></td><td>${sig}</td><td>${r.near ? `<span style="color:var(--pl-${r.near.P})">${glyph(r.near.P)}</span> <span class="num">${f(r.near.v)}</span> <small class="num">${pct(r.near.d)}</small>` : '—'}</td><td>${sq}</td><td><button class="mini-btn" type="button" data-open="${k}">فتح</button></td></tr>`;
    }).join('') : `<tr><td colspan="6"><div class="empty">اكتب الرموز ثم اضغط «ابدأ المسح». الخطة المجانية لـ Twelve Data تسمح بـ 8 طلبات في الدقيقة، لذلك يمر الماسح على رمز كل 8 ثوانٍ تقريبًا.</div></td></tr>`;
  }
  function openSymbol(sym) { S.sym = sym; S.anchorT = null; S.anchorLocked = false; S.unit = 0; S.pf = 0; S.sqk = 0; if (S.source === 'csv') S.source = 'sample'; $('#symIn').value = sym; save(); loadLive(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  /* ================= header controls ================= */
  function initHeader() {
    $('#symIn').value = S.sym;
    $('#symForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#symIn').value.trim().toUpperCase(); if (!v) return; openSymbol(v); });
    $('#tfSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.tf = b.dataset.tf; if (S.tf !== '1day' && S.tf !== '1week' && S.timeMode === 'cal') S.timeMode = 'bar'; syncTf(); save(); S.anchorT = null; S.anchorLocked = false; S.unit = 0; if (S.source === 'csv') { toast('تغيير الإطار الزمني يعمل مع البيانات الحية فقط.'); return; } loadLive(); });
    syncTf();
    $('#msRun').onclick = runScan;
    $('#msList').value = S.watchlist;
    $('#msBody').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openSymbol(MS.rows[+b.dataset.open].s); });
    renderScan();
  }
  function syncTf() { $$('#tfSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.tf === S.tf)); }

  /* ---------- signal rules panel ---------- */
  function initSigPanel() {
    const box = $('#sigSet');
    box.addEventListener('click', e => {
      const sw = e.target.closest('[data-so]'); if (!sw) return;
      S.so[sw.dataset.so] = !S.so[sw.dataset.so]; syncSig(); refresh(true);
    });
    const num = (id, key, lo, hi) => { $(id).onchange = e => { let v = parseFloat(e.target.value); if (!isFinite(v)) v = DEF.so[key]; S.so[key] = Math.min(hi, Math.max(lo, v)); e.target.value = S.so[key]; refresh(true); }; };
    num('#soTouch', 'touchPct', 0.02, 1); num('#soDeg', 'degTol', 1, 20); num('#soBal', 'balTol', 0.02, 0.5); num('#soStop', 'stopAtr', 0, 3); num('#soRR', 'minRR', 0.5, 5); num('#soHold', 'hold', 3, 200);
    $('#soGrade').onchange = e => { S.so.minGrade = e.target.value; refresh(true); };
    syncSig();
  }
  function syncSig() {
    $$('[data-so]').forEach(b => b.setAttribute('aria-checked', !!S.so[b.dataset.so]));
    $('#soTouch').value = S.so.touchPct; $('#soDeg').value = S.so.degTol; $('#soBal').value = S.so.balTol; $('#soStop').value = S.so.stopAtr; $('#soRR').value = S.so.minRR; $('#soHold').value = S.so.hold; $('#soGrade').value = S.so.minGrade;
  }

  /* ---------- boot ---------- */
  function boot() {
    buildRail(); initTabs(); initChart(); initHeader(); initSigPanel(); initTools(); initKeyBox();
    $('#btnAlert').onclick = toggleAlerts;
    $('#jump').onclick = () => $('.rail').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    let ok = false;
    if (S.source === 'csv' && S.csv) ok = setData(S.csv, false);
    if (!ok) { setData(SAMPLE, false); if (S.source === 'csv') S.source = 'sample'; }
    if (S.csv) $('#csvIn').value = S.csv;
    refresh();
    initLive();
  }
  if (!window.Astronomy || !window.LightweightCharts) {
    document.querySelector('.main').insertAdjacentHTML('afterbegin', `<div class="card"><div class="empty">تعذّر تحميل مكتبات الرسم أو الحسابات الفلكية. تحقّق من الاتصال ثم أعد فتح الصفحة.</div></div>`);
  } else boot();
})();
