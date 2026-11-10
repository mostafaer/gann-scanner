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
    ptime: ['زاوية زمن الكوكب', 'بدل عدّ الأيام يُعدّ ما قطعه الكوكب من درجات منذ المحور: السعر يتحرك درجة-سعر (المعامل) لكل درجة يقطعها الكوكب. مثال جان: سهم عند 50 والكوكب عند 50°، فإذا وصل الكوكب إلى 60° يُتوقع السهم عند 60. الكوكب يُختار من الإعدادات.'],
    box: ['صندوق جان (سعر)', 'مربع من المحور: ارتفاعه N وحدة سعر وعرضه N وحدة زمن (52 = 52 أسبوعًا). الأثمان والأرباع والأقطار دعم ومقاومة.'],
    boxt: ['صندوق جان (زمن)', 'أرباع وأثمان عرض الصندوق كتواريخ انعكاس: 13 و26 و39 و52 أسبوعًا في صندوق 52.'],
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
    layers: { levels: false }, theme: 'auto', chartType: 'candles', ptPlanet: 'Sun', boxN: 52, legendCollapsed: null,
    so: { swingN: 2, setDbl: true, setRet: true, setBrk: true, dblAtr: 0.5, retTol: 0.04, maxRiskAtr: 4, useTime: true, timeMin: 3, priceMin: 3, exitMode: 'trail', touchPct: 0.12, requireSq: true, mBal: true, mSq9: true, mCyc: true, mPdeg: false, mPlan: true, balTol: 0.12, degTol: 6, win: 1, cooldown: 5, stopAtr: 0.3, minRR: 1.5, hold: 40, minGrade: 'B' }
  };
  const KEY = 'gann-scanner.v3';
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
  const fd = t => (CTX && !CTX.daily) ? `${dFmtS.format(new Date(t))} \u2066${tFmt.format(new Date(t))}\u2069` : dFmt.format(new Date(t)), fds = t => dFmtS.format(new Date(t));
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
      horizon: S.horizon, harm: S.harm, helio: S.helio, planets: S.planets.slice(), tolPct: S.tolPct, win: Math.max(1, S.win), ptPlanet: S.ptPlanet, boxN: S.boxN
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
    try { computeSignals(); computeHot(); } catch (err) { console.error(err); SIG.list = []; SIG.all = []; SIG.hot = []; SIG.hotTop = []; SIG.live = null; SIG.watch = []; SIG.stat = { all: SC.stats([]), A: SC.stats([]), B: SC.stats([]), C: SC.stats([]) }; }
    renderHeader(); renderAnchorSel(); renderTiles(); renderSummary();
    renderSignals(); renderHot(); renderUnitPresets(); renderPT(); renderAstro(); renderSq9(); renderData();
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

  const TVFONT = '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
  const TF_SHORT = { '15min': '15m', '1h': '1h', '4h': '4h', '1day': '1D', '1week': '1W' };
  function chartTheme() {
    return {
      layout: { background: { type: 'solid', color: css('--tv-bg') }, textColor: css('--tv-text'), fontFamily: TVFONT, fontSize: 12 },
      grid: { vertLines: { color: css('--tv-grid') }, horzLines: { color: css('--tv-grid') } },
      rightPriceScale: { borderColor: css('--tv-border') },
      timeScale: { borderColor: css('--tv-border') },
      crosshair: { vertLine: { color: css('--tv-cross'), width: 1, style: 3, labelBackgroundColor: css('--tv-text') === '#131722' ? '#131722' : '#363a45' }, horzLine: { color: css('--tv-cross'), width: 1, style: 3, labelBackgroundColor: css('--tv-text') === '#131722' ? '#131722' : '#363a45' } },
      watermark: { visible: true, text: S.sym + ' · ' + (TF_SHORT[S.tf] || S.tf), fontSize: innerWidth < 600 ? 32 : 52, color: alpha(css('--tv-text'), 0.06), horzAlign: 'center', vertAlign: 'center', fontFamily: TVFONT },
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
    makeMain();
    CHT.hist = CHT.chart.addHistogramSeries({ priceScaleId: 'tc', priceLineVisible: false, lastValueVisible: false, base: 0 });
    CHT.chart.priceScale('tc').applyOptions({ scaleMargins: { top: 0.86, bottom: 0 }, visible: false });
    CHT.vol = CHT.chart.addHistogramSeries({ priceScaleId: 'vol', priceLineVisible: false, lastValueVisible: false, priceFormat: { type: 'volume' } });
    CHT.chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.86, bottom: 0 }, visible: false });
    styleCandles();
    CHT.chart.timeScale().subscribeVisibleLogicalRangeChange(() => requestAnimationFrame(drawOverlay));
    CHT.chart.subscribeCrosshairMove(onCrosshair);
    CHT.chart.subscribeClick(onChartClick);
    new ResizeObserver(() => requestAnimationFrame(drawOverlay)).observe(cwrap);
    const retheme = () => { if (!CHT.chart) return; CHT.chart.applyOptions(chartTheme()); styleCandles(); updateChart(true); };
    const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener && mq.addEventListener('change', retheme);
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    

    $('#rangeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset.d; setRangeDays(d === 'all' || d === 'ytd' ? d : +d); });
    $('#btnFit').onclick = () => { CHT.chart.priceScale('right').applyOptions({ autoScale: true }); setRangeDays(S.tf === '1day' || S.tf === '1week' ? 182 : 30); };
    const scaleMode = m => { CHT.mode = CHT.mode === m ? 0 : m; $('#btnLog').setAttribute('aria-pressed', CHT.mode === 1); $('#btnPct').setAttribute('aria-pressed', CHT.mode === 2); CHT.chart.priceScale('right').applyOptions({ mode: CHT.mode }); };
    $('#btnLog').onclick = () => scaleMode(LWC.PriceScaleMode.Logarithmic);
    $('#btnPct').onclick = () => scaleMode(LWC.PriceScaleMode.Percentage);
    $('#chartType').value = S.chartType || 'candles';
    $('#chartType').onchange = e => { S.chartType = e.target.value; save(); makeMain(); updateChart(true); };
    $('#btnTools').onclick = () => { const c = $('#chartCard'); c.classList.toggle('tools-open'); $('#btnTools').setAttribute('aria-pressed', c.classList.contains('tools-open')); };
    if (!window.claude) { const sb = $('#btnShot'); sb.hidden = false; sb.onclick = () => { try { const cv2 = CHT.chart.takeScreenshot(); const a2 = document.createElement('a'); a2.download = `${S.sym.replace(/\W+/g, '-')}-${S.tf}.png`; a2.href = cv2.toDataURL('image/png'); a2.click(); } catch (err) { toast('تعذّر حفظ اللقطة.'); } }; }
    const clockEl = $('#utcClock'); const tickClock = () => { const d = new Date(); clockEl.textContent = d.toISOString().slice(11, 19) + ' UTC'; }; tickClock(); setInterval(tickClock, 1000);
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
  /* main price series in the chosen chart type (TradingView: candles, hollow, bars, Heikin Ashi, line, area) */
  function makeMain() {
    if (CHT.candle) { clearOverlays(); CHT.chart.removeSeries(CHT.candle); }
    const t = S.chartType || 'candles', base = { priceLineVisible: true, lastValueVisible: true, priceLineStyle: 2 };
    CHT.candle = t === 'bars' ? CHT.chart.addBarSeries(Object.assign({ thinBars: false, openVisible: true }, base))
      : t === 'line' ? CHT.chart.addLineSeries(Object.assign({ lineWidth: 2 }, base))
        : t === 'area' ? CHT.chart.addAreaSeries(Object.assign({ lineWidth: 2 }, base))
          : CHT.chart.addCandlestickSeries(base);
    styleCandles();
  }
  function styleCandles() {
    const up = css('--tv-up'), dn = css('--tv-down'), t = S.chartType || 'candles', acc = css('--tv-accent');
    if (t === 'line') CHT.candle.applyOptions({ color: acc, priceLineColor: acc });
    else if (t === 'area') CHT.candle.applyOptions({ lineColor: acc, topColor: alpha(acc, 0.28), bottomColor: alpha(acc, 0.02), priceLineColor: acc });
    else if (t === 'bars') CHT.candle.applyOptions({ upColor: up, downColor: dn });
    else CHT.candle.applyOptions({ upColor: t === 'hollow' ? 'rgba(0,0,0,0)' : up, downColor: dn, borderUpColor: up, borderDownColor: dn, wickUpColor: up, wickDownColor: dn });
  }
  function mainData(c) {
    const t = S.chartType || 'candles';
    if (t === 'line' || t === 'area') return c.bars.map(b => ({ time: sec(b.t), value: b.c }));
    if (t === 'ha') { const out = []; let po = null, pc = null; for (const b of c.bars) { const hc = (b.o + b.h + b.l + b.c) / 4, ho = po == null ? (b.o + b.c) / 2 : (po + pc) / 2; out.push({ time: sec(b.t), open: ho, high: Math.max(b.h, ho, hc), low: Math.min(b.l, ho, hc), close: hc }); po = ho; pc = hc; } return out; }
    return c.bars.map(b => ({ time: sec(b.t), open: b.o, high: b.h, low: b.l, close: b.c }));
  }
  function setRangeDays(d) {
    if (!CTX) return;
    const ts = CHT.chart.timeScale(), n = CTX.n, lastT = CTX.last.t;
    if (d === 'all') ts.fitContent();
    else {
      const from = d === 'ytd' ? Date.UTC(new Date(lastT).getUTCFullYear(), 0, 1) : lastT - d * DAY;
      const i0 = Math.max(0, SC.idxOfT(CTX, Math.max(from, CTX.bars[0].t))), span = n - i0;
      ts.setVisibleLogicalRange({ from: i0, to: n + Math.min(CTX.futN, Math.max(8, Math.round(span * 0.3))) });
    }
    $$('#rangeSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === String(d)));
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
    const data = mainData(c);
    CHT.chart.applyOptions({ watermark: chartTheme().watermark });
    for (let i = c.n; i < N; i++) data.push({ time: sec(c.T[i]) });
    CHT.candle.setData(data);
    CHT.chart.applyOptions({ timeScale: { timeVisible: !c.daily, secondsVisible: false } });
    clearOverlays();
    const ref = c.last.c, lo = Math.max(c.lo * 0.97, ref * 0.85), hi = Math.min(c.hi * 1.03, ref * 1.15);

    // planetary lines (move with each planet's longitude)
    if (S.on.planet && lay('planets')) {
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
            line({ color: alpha(col, off ? 0.35 : 0.75), lineWidth: off ? 1 : 1.5, lineStyle: off ? LWC.LineStyle.Dotted : LWC.LineStyle.Solid }).setData(pts);
          }
        }
      }
    }
    // Gann fan from the anchor
    if (S.on.angles && lay('fan')) {
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
    if (lay('levels')) for (const l of A.levels) {
      if (l.s === 'angles' || l.s === 'planet' || l.w < 1.5 || (l.a != null && l.a !== c.main.i)) continue;
      CHT.lines.push(CHT.candle.createPriceLine({ price: l.p, color: alpha(css(stratColor(l.s)), 0.55), lineWidth: 1, lineStyle: LWC.LineStyle.Dashed, axisLabelVisible: false, title: '' }));
    }
    if (lay('zones')) A.zones.slice().sort((a, b) => b.score - a.score).slice(0, 6).forEach(z => {
      const r = z.p >= ref;
      CHT.lines.push(CHT.candle.createPriceLine({ price: z.p, color: alpha(css(r ? '--down' : '--up'), 0.85), lineWidth: 2, lineStyle: LWC.LineStyle.Solid, axisLabelVisible: true, title: (r ? 'R ' : 'S ') + z.strats.length }));
    });

    updateProSeries(c, N, ref);

    // markers: pivots, anchor, signals
    const mk = [];
    for (const p of c.piv) {
      const isMain = p === c.main;
      if (!isMain && !lay('pivots')) continue;
      mk.push({ time: sec(p.t), position: p.type === 'H' ? 'aboveBar' : 'belowBar', shape: isMain ? 'circle' : (p.type === 'H' ? 'arrowDown' : 'arrowUp'), color: isMain ? css('--accent') : alpha(css('--muted'), p.tent ? 0.45 : 0.75), size: isMain ? 1.2 : 0.5, text: isMain ? 'محور' : '' });
    }
    const gmin = { A: 3, B: 2, C: 1 }[S.so.minGrade] || 1;
    if (lay('sigs')) for (const s of SIG.list) {
      if ({ A: 3, B: 2, C: 1 }[s.grade] < gmin) continue;
      mk.push({ time: sec(s.t), position: s.dir > 0 ? 'belowBar' : 'aboveBar', shape: s.dir > 0 ? 'arrowUp' : 'arrowDown', color: css(s.dir > 0 ? '--up' : '--down'), size: s.grade === 'A' ? 2 : 1.4, text: `${s.grade} ${{ dbl: s.dir > 0 ? 'DB' : 'DT', tpl: s.dir > 0 ? 'TB' : 'TT', ret: (s.ratio * 100).toFixed(0) + '%', brk: 'BO' }[s.setup]}` });
    }
    mk.sort((a, b) => a.time - b.time);
    CHT.candle.setMarkers(mk);
    if (CHT.fit || !range) { CHT.fit = false; if (c.daily) setRangeDays(innerWidth < 600 ? 91 : 182); else setRange(innerWidth < 600 ? 90 : 160); } else if (keepView || range) CHT.chart.timeScale().setVisibleLogicalRange(range);
    renderLegend(); requestAnimationFrame(drawOverlay);
  }

  /* logical → pixel for fractional positions (the library only maps whole bars) */
  function lx(ts, fi) {
    if (fi == null || !isFinite(fi)) return null;
    const f0 = Math.floor(fi), a = ts.logicalToCoordinate(f0), b = ts.logicalToCoordinate(f0 + 1);
    if (a == null || b == null) return a;
    return a + (fi - f0) * (b - a);
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
    const x = fi => lx(ts, fi);
    const xn = x(CTX.n - 0.5);
    if (xn != null && xn < paneW) { octx.fillStyle = alpha(css('--fg'), 0.03); octx.fillRect(xn, 0, paneW - xn, paneH); octx.strokeStyle = alpha(css('--faint'), 0.8); octx.setLineDash([3, 4]); octx.beginPath(); octx.moveTo(Math.round(xn) + .5, 0); octx.lineTo(Math.round(xn) + .5, paneH); octx.stroke(); octx.setLineDash([]); }
    const win = CTX.daily ? S.win : 0;
    if (lay('windows')) A.windows.slice(0, 8).forEach((w, k) => {
      const fi = SC.idxOfT(CTX, w.t), x0 = x(fi - win - 0.5), x1 = x(fi + win + 0.5);
      if (x0 == null || x1 == null) return;
      octx.fillStyle = alpha(acc, Math.max(0.06, 0.2 - k * 0.018)); octx.fillRect(x0, 0, Math.max(2, x1 - x0), paneH);
      if (k < 5) { octx.fillStyle = acc; octx.font = '500 10px "IBM Plex Mono", monospace'; octx.textAlign = 'center'; octx.textBaseline = 'top'; octx.fillText(String(k + 1), (x0 + x1) / 2, 4); }
    });
    for (const e of A.events) { const xe = x(SC.idxOfT(CTX, e.t)); if (xe == null) continue; octx.fillStyle = alpha(css(stratColor(e.s)), 0.85); octx.fillRect(xe - 0.75, paneH - 6, 1.5, 6); }
    // squaring windows for the anchor (price = time) as thin top ticks
    for (const q of SIG.watch) { const xq = x(SC.idxOfT(CTX, q.t)); if (xq == null) continue; octx.fillStyle = css('--pl-' + q.P); octx.beginPath(); octx.arc(xq, 16, 3, 0, Math.PI * 2); octx.fill(); }
    drawPro(octx, x, p => CHT.candle.priceToCoordinate(p), paneW, paneH);
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
    const hs = hotAt(param.point.x, param.point.y);
    if (hs) html += `<div class="hv-sig" style="color:var(--accent)">◆ نقطة حسم · ${glyph(hs.P)} ${PL[hs.P][1]} <span class="num">${fmtP(hs.p)}</span> · ${HOT_N[hs.kind]} · ${fd(hs.t)}</div>`;
    if (sg) html += `<div class="hv-sig ${sg.dir > 0 ? 'side-s' : 'side-r'}">${sg.dir > 0 ? 'شراء' : 'بيع'} ${sg.grade} · ${setupName(sg)} <span class="num">${fmtP(sg.base.p)}</span> · دخول ${fmtP(sg.entry)} · وقف ${fmtP(sg.stop)}</div>`;
    if (near.length) html += near.map(l => `<div><b class="num">${fmtP(l.p)}</b> ${esc(lvLabel(l))}</div>`).join('');
    if (evs.length) html += evs.map(e => `<div class="hv-ev">${esc(evLabel(e))}</div>`).join('');
    box.innerHTML = html; box.hidden = !html;
  }
  function renderOHLC(i, fi) {
    const el = $('#ohlc'); if (!CTX) return;
    const src = LIVE.meta && LIVE.meta.route ? LIVE.meta.route.provider === 'binance' ? 'Binance' : 'Twelve Data' : S.source === 'csv' ? 'CSV' : 'Sample';
    const sym = `<b>${esc(S.sym)}</b> <span class="src">· ${TF_SHORT[S.tf] || S.tf} · ${src}</span>`;
    if (i == null) { el.innerHTML = `${sym} <span class="src">· ${fd(CTX.T[Math.max(0, fi || 0)])} · مستقبل</span>`; return; }
    const b = CTX.bars[i], p = i ? CTX.bars[i - 1].c : b.o, ch = b.c - p, cl = ch >= 0 ? 'tv-u' : 'tv-d';
    el.innerHTML = `${sym}<span class="o">O<i class="${cl}">${fmtP(b.o)}</i> H<i class="${cl}">${fmtP(b.h)}</i> L<i class="${cl}">${fmtP(b.l)}</i> C<i class="${cl}">${fmtP(b.c)}</i> <i class="${cl}">${ch >= 0 ? '+' : ''}${fmtP(ch)} (${pct(ch / p)})</i></span>${i === CTX.n - 1 ? '<span class="cd" id="cd"></span>' : ''}`;
    tickCountdown();
  }
  function onChartClick(param) {
    if (!CTX || param.logical == null || !param.point) return;
    if (DRAW.tool) return;
    const price = CHT.candle.coordinateToPrice(param.point.y); let best = null, bd = 1e9;
    for (const pv of CTX.piv) { const d = Math.abs(pv.i - param.logical) + Math.abs(pv.p - price) / pv.p * 200; if (Math.abs(pv.i - param.logical) <= 3 && d < bd) { bd = d; best = pv; } }
    if (best && best !== CTX.main && Math.abs(best.p - price) / best.p < 0.03) { S.anchorT = best.t; S.anchorLocked = true; refresh(); toast(`المحور الآن: ${best.type === 'H' ? 'قمة' : 'قاع'} ${fmtP(best.p)} — ${fd(best.t)}`); }
  }

  const EYE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="10" r="2.2" fill="currentColor"/></svg>';
  function renderLegend() {
    if (S.legendCollapsed ?? innerWidth < 600) { $('#legend').innerHTML = `<button class="lg-toggle" type="button" data-lgc="1">▸ ${LAYERS.filter(([k]) => lay(k)).length} مؤشرات</button>`; return; }
    const row = (k, color, name) => `<div class="lg-row ${lay(k) ? '' : 'off'}"><i style="background:${color}"></i><span>${name}</span><button type="button" data-lg="${k}" aria-label="${lay(k) ? 'إخفاء' : 'إظهار'} ${name}" title="${lay(k) ? 'إخفاء' : 'إظهار'}">${EYE}</button></div>`;
    const it = [];
    if (S.on.planet) it.push(row('planets', 'var(--pl-Sun)', 'الكواكب ' + S.planets.map(glyph).join('')));
    if (S.on.ptime) it.push(row('ptime', `var(--pl-${S.ptPlanet || 'Sun'})`, `زاوية ${PL[S.ptPlanet || 'Sun'][1]} 1×1`));
    if (S.on.angles) it.push(row('fan', 'var(--c-angles)', 'مروحة جان'));
    it.push(row('curves', 'var(--accent)', 'منحنيات التربيع'));
    it.push(row('hot', 'var(--accent)', `نقاط الحسم ◆ ${(SIG.hotTop || []).length}`));
    if (S.on.box || S.on.boxt) it.push(row('box', 'var(--c-sq144)', 'صندوق جان ' + SC.boxSpan(CTX).label));
    it.push(row('zones', 'var(--down)', 'مناطق R/S'));
    it.push(row('hist', 'var(--accent)', 'ضغط الزمن'));
    if (CTX && CTX.bars.some(b => b.v > 0)) it.push(row('volume', 'var(--tv-muted)', 'الحجم'));
    it.push('<button class="lg-toggle" type="button" data-lgc="0">▾ إخفاء القائمة</button>');
    $('#legend').innerHTML = it.join('');
  }



  /* ================= DRAWING TOOLS ================= */
  const DRAW = { tool: null, pend: null, hover: null, items: [], sel: -1 };
  const dKey = () => `gann-draw:${S.sym}:${S.tf}`;
  function loadDrawings() { try { DRAW.items = JSON.parse(localStorage.getItem(dKey()) || '[]'); } catch (e) { DRAW.items = []; } DRAW.sel = -1; }
  function saveDrawings() { try { localStorage.setItem(dKey(), JSON.stringify(DRAW.items.slice(-200))); } catch (e) { } }
  const tOfLogical = l => { const i = Math.floor(l), f = l - i; CTX.extendTo(Math.max(0, i + 1)); if (i < 0) return CTX.T[0] + l * (CTX.daily ? DAY : CTX.step); return CTX.T[i] + f * (CTX.T[i + 1] - CTX.T[i]); };
  const TWO = new Set(['line', 'ray', 'rect', 'fib', 'measure', 'gbox']);
  const TOOL_N = { select: 'تحديد: اضغط على رسم ثم Delete لحذفه', line: 'خط اتجاه: اضغط نقطتين', ray: 'شعاع: اضغط نقطتين', hline: 'خط أفقي: اضغط مرة', vline: 'خط رأسي: اضغط مرة', rect: 'مستطيل: اضغط ركنين', fib: 'فيبوناتشي: من القاع للقمة أو العكس', fan: 'مروحة جان: اضغط على قمة أو قاع', gbox: 'صندوق جان: اضغط ركنين', measure: 'قياس: اضغط نقطتين' };
  const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618];
  const LIVE_SCROLL = { handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true } };
  function setTool(t) {
    DRAW.tool = DRAW.tool === t ? null : t; DRAW.pend = null;
    if (DRAW.tool !== 'select') DRAW.sel = -1;
    $$('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === DRAW.tool));
    $('#chartWrap').classList.toggle('drawing', !!DRAW.tool && DRAW.tool !== 'select');
    CHT.chart.applyOptions(DRAW.tool && DRAW.tool !== 'select' ? { handleScroll: false, handleScale: false } : LIVE_SCROLL);
    $('#toolHint').textContent = DRAW.tool ? TOOL_N[DRAW.tool] + ' · Esc للإلغاء' : '';
    $('#toolHint').hidden = !DRAW.tool;
    drawOverlay();
  }
  /* magnet: snap to the nearest O/H/L/C of the bar under the cursor */
  function snap(l, p) {
    const i = Math.round(l);
    if (!CHT.magnet || i < 0 || i >= CTX.n) return { t: tOfLogical(l), p };
    const b = CTX.bars[i]; let best = b.c;
    for (const v of [b.o, b.h, b.l, b.c]) if (Math.abs(v - p) < Math.abs(best - p)) best = v;
    return { t: b.t, p: best };
  }
  function drawClick(param) {
    const p = CHT.candle.coordinateToPrice(param.point.y); if (p == null) return;
    const l = param.logical, pt = snap(l, p);
    if (DRAW.tool === 'select') { DRAW.sel = hitDrawing(param.point.x, param.point.y); drawOverlay(); return; }
    if (DRAW.tool === 'hline' || DRAW.tool === 'vline') { DRAW.items.push({ k: DRAW.tool, a: pt }); done(); return; }
    if (DRAW.tool === 'fan') {
      const i = Math.round(l); let a = pt;
      if (i >= 0 && i < CTX.n) { const b = CTX.bars[i]; a = { t: b.t, p: Math.abs(p - b.h) < Math.abs(p - b.l) ? b.h : b.l }; a.dir = a.p === b.h ? -1 : 1; } else a.dir = p < CTX.last.c ? 1 : -1;
      DRAW.items.push({ k: 'fan', a, u: CTX.u }); done(); return;
    }
    if (!DRAW.pend) { DRAW.pend = pt; drawOverlay(); return; }
    DRAW.items.push({ k: DRAW.tool, a: DRAW.pend, b: pt }); done();
    function done() { saveDrawings(); DRAW.pend = null; setTool(null); }
  }
  /* geometry of a drawing in pixels: list of segments for hit-testing */
  function drawingSegs(d, x, y, paneW) {
    const ax = x(SC.idxOfT(CTX, d.a.t)), ay = y(d.a.p);
    if (d.k === 'hline') return ay == null ? [] : [[0, ay, paneW, ay]];
    if (d.k === 'vline') return ax == null ? [] : [[ax, 0, ax, 4000]];
    if (!d.b) return ax == null ? [] : [[ax - 6, ay, ax + 6, ay]];
    const bx = x(SC.idxOfT(CTX, d.b.t)), by = y(d.b.p);
    if ([ax, ay, bx, by].some(v => v == null)) return [];
    if (d.k === 'line' || d.k === 'measure') return [[ax, ay, bx, by]];
    if (d.k === 'ray') { const tx = bx >= ax ? paneW : 0, s = bx === ax ? 0 : (by - ay) / (bx - ax); return [[ax, ay, tx, ay + s * (tx - ax)]]; }
    if (d.k === 'fib') return FIB.map(f => { const yy = y(d.a.p + (d.b.p - d.a.p) * (1 - f)); return [Math.min(ax, bx), yy, paneW, yy]; });
    return [[ax, ay, bx, ay], [bx, ay, bx, by], [bx, by, ax, by], [ax, by, ax, ay]];
  }
  function hitDrawing(px, py) {
    const ts = CHT.chart.timeScale(), x = fi => lx(ts, fi), y = p => CHT.candle.priceToCoordinate(p);
    const paneW = cwrap.getBoundingClientRect().width - CHT.chart.priceScale('right').width();
    let best = -1, bd = 7;
    DRAW.items.forEach((d, k) => {
      for (const [x1, y1, x2, y2] of drawingSegs(d, x, y, paneW)) {
        const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)) : 0;
        const dist = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); if (dist < bd) { bd = dist; best = k; }
      }
    });
    return best;
  }
  function deleteSelected() { if (DRAW.sel < 0) return false; DRAW.items.splice(DRAW.sel, 1); DRAW.sel = -1; saveDrawings(); drawOverlay(); return true; }
  function renderDrawings(ctx2, x, y, paneW, paneH) {
    const col = css('--tv-text'), acc = css('--tv-accent'), gann = css('--c-angles'), font = '12px -apple-system,BlinkMacSystemFont,"Trebuchet MS",Roboto,sans-serif';
    const list = DRAW.items.map((d, k) => Object.assign({ _k: k }, d));
    if (DRAW.pend && DRAW.hover) list.push({ k: DRAW.tool, a: DRAW.pend, b: DRAW.hover, preview: true });
    const label = (txt, px, py, align, bg) => { ctx2.font = font; const w = ctx2.measureText(txt).width + 10; const lx0 = align === 'right' ? px - w : align === 'center' ? px - w / 2 : px; ctx2.fillStyle = bg || alpha(acc, 0.9); ctx2.fillRect(lx0, py - 9, w, 18); ctx2.fillStyle = '#fff'; ctx2.textAlign = 'left'; ctx2.textBaseline = 'middle'; ctx2.fillText(txt, lx0 + 5, py); };
    for (const d of list) {
      const selected = d._k === DRAW.sel;
      ctx2.save(); ctx2.lineWidth = selected ? 2.5 : 1.5; ctx2.strokeStyle = d.preview ? alpha(acc, 0.7) : selected ? acc : col; ctx2.setLineDash(d.preview ? [4, 4] : []);
      const ax = x(SC.idxOfT(CTX, d.a.t)), ay = y(d.a.p);
      const bx = d.b ? x(SC.idxOfT(CTX, d.b.t)) : null, by = d.b ? y(d.b.p) : null;
      const handles = pts => { for (const [px, py] of pts) { if (px == null || py == null) continue; ctx2.fillStyle = css('--tv-bg'); ctx2.beginPath(); ctx2.arc(px, py, 3.5, 0, Math.PI * 2); ctx2.fill(); ctx2.stroke(); } };
      if (d.k === 'hline' && ay != null) {
        ctx2.beginPath(); ctx2.moveTo(0, ay); ctx2.lineTo(paneW, ay); ctx2.stroke(); label(fmtP(d.a.p), paneW - 4, ay, 'right', selected ? acc : alpha(col, 0.85));
      } else if (d.k === 'vline' && ax != null) {
        ctx2.beginPath(); ctx2.moveTo(ax, 0); ctx2.lineTo(ax, paneH); ctx2.stroke(); label(fd(d.a.t), ax, paneH - 12, 'center', selected ? acc : alpha(col, 0.85));
      } else if ((d.k === 'line' || d.k === 'ray') && ax != null && bx != null) {
        let ex = bx, ey = by;
        if (d.k === 'ray' && bx !== ax) { const s = (by - ay) / (bx - ax), tx = bx > ax ? paneW : 0; ex = tx; ey = ay + s * (tx - ax); }
        ctx2.beginPath(); ctx2.moveTo(ax, ay); ctx2.lineTo(ex, ey); ctx2.stroke(); handles([[ax, ay], [bx, by]]);
      } else if (d.k === 'rect' && ax != null && bx != null) {
        ctx2.fillStyle = alpha(acc, 0.12); ctx2.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
        ctx2.strokeStyle = d.preview ? alpha(acc, 0.7) : acc; ctx2.strokeRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
      } else if (d.k === 'fib' && ax != null && bx != null) {
        const cols = ['--tv-muted', '--down', '--c-sq144', '--up', '--c-angles', '--tv-accent', '--tv-muted', '--c-sq9', '--c-nsq'];
        FIB.forEach((f, k) => {
          const v = d.b.p + (d.a.p - d.b.p) * f, yy = y(v); if (yy == null) return;
          ctx2.strokeStyle = css(cols[k]); ctx2.lineWidth = 1; ctx2.beginPath(); ctx2.moveTo(Math.min(ax, bx), yy); ctx2.lineTo(paneW, yy); ctx2.stroke();
          ctx2.fillStyle = css(cols[k]); ctx2.font = font; ctx2.textAlign = 'left'; ctx2.textBaseline = 'bottom'; ctx2.fillText(`${f} (${fmtP(v)})`, Math.min(ax, bx) + 4, yy - 2);
        });
        ctx2.setLineDash([3, 3]); ctx2.strokeStyle = alpha(col, 0.5); ctx2.beginPath(); ctx2.moveTo(ax, ay); ctx2.lineTo(bx, by); ctx2.stroke();
      } else if (d.k === 'measure' && ax != null && bx != null) {
        const up = d.b.p >= d.a.p, c2 = css(up ? '--tv-up' : '--tv-down');
        ctx2.fillStyle = alpha(c2, 0.15); ctx2.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
        ctx2.strokeStyle = c2; ctx2.beginPath(); ctx2.moveTo(ax, ay); ctx2.lineTo(bx, by); ctx2.stroke();
        const dp = d.b.p - d.a.p, bars = Math.round(SC.idxOfT(CTX, d.b.t) - SC.idxOfT(CTX, d.a.t)), days = (d.b.t - d.a.t) / DAY;
        const units = Math.abs(dp) / CTX.u, tu = S.timeMode === 'bar' ? Math.abs(bars) : Math.abs(days);
        label(`${dp >= 0 ? '+' : ''}${fmtP(dp)} (${pct(dp / d.a.p)}) · ${bars} شمعة · ${days.toFixed(1)} يوم`, (ax + bx) / 2, Math.min(ay, by) - 14, 'center', c2);
        label(`السعر ÷ الزمن = ${(units / (tu || 1)).toFixed(2)} (1×1 = 1.00)`, (ax + bx) / 2, Math.max(ay, by) + 14, 'center', alpha(c2, 0.85));
      } else if (d.k === 'gbox' && ax != null && bx != null) {
        const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by), w = x1 - x0, h = y1 - y0;
        ctx2.strokeStyle = gann; ctx2.lineWidth = 1.3; ctx2.strokeRect(x0, y0, w, h);
        ctx2.lineWidth = 0.8; ctx2.strokeStyle = alpha(gann, 0.6);
        for (const f of [0.25, 0.5, 0.75]) { ctx2.beginPath(); ctx2.moveTo(x0 + w * f, y0); ctx2.lineTo(x0 + w * f, y1); ctx2.moveTo(x0, y0 + h * f); ctx2.lineTo(x1, y0 + h * f); ctx2.stroke(); }
        ctx2.strokeStyle = alpha(gann, 0.85); ctx2.beginPath(); ctx2.moveTo(x0, y1); ctx2.lineTo(x1, y0); ctx2.moveTo(x0, y0); ctx2.lineTo(x1, y1); ctx2.stroke();
        ctx2.fillStyle = gann; ctx2.font = font; ctx2.textAlign = 'center'; ctx2.textBaseline = 'top';
        ['0', '¼', '½', '¾', '1'].forEach((t, k) => ctx2.fillText(t, x0 + w * k / 4, y1 + 3));
      } else if (d.k === 'fan' && ax != null && ay != null) {
        const i0 = SC.idxOfT(CTX, d.a.t), iEnd = CTX.n + CTX.futN - 1;
        for (const A of SC.ANGLES) {
          ctx2.strokeStyle = alpha(gann, A.r === 1 ? 0.95 : 0.5); ctx2.lineWidth = A.r === 1 ? 1.6 : 1;
          ctx2.beginPath(); let lx2 = ax, ly2 = ay; ctx2.moveTo(ax, ay);
          const stepN = Math.max(1, Math.round((iEnd - i0) / 80));
          for (let i = Math.ceil(i0) + 1; i <= iEnd; i += stepN) {
            const e = S.timeMode === 'bar' ? i - i0 : (CTX.T[i] - d.a.t) / DAY;
            const v = d.a.p + d.a.dir * A.r * d.u * e, yy = y(v), xx = x(i); if (yy == null || xx == null) break; ctx2.lineTo(xx, yy); lx2 = xx; ly2 = yy;
          }
          ctx2.stroke();
          if (lx2 < paneW - 4 && ly2 > 8 && ly2 < paneH - 4) { ctx2.fillStyle = ctx2.strokeStyle; ctx2.font = font; ctx2.textAlign = 'right'; ctx2.textBaseline = 'bottom'; ctx2.fillText(A.l, lx2 - 2, ly2 - 2); }
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
      else if (b.id === 'toolClear') { if (!DRAW.items.length) return; if (b.dataset.confirm === '1') { DRAW.items = []; DRAW.sel = -1; saveDrawings(); drawOverlay(); b.dataset.confirm = ''; b.classList.remove('confirm'); toast('حُذفت كل الرسومات.'); } else { b.dataset.confirm = '1'; b.classList.add('confirm'); toast('اضغط زر الحذف مرة ثانية لحذف كل الرسومات.'); setTimeout(() => { b.dataset.confirm = ''; b.classList.remove('confirm'); }, 3000); } }
    });
    document.addEventListener('keydown', e => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && deleteSelected()) { e.preventDefault(); return; }
      if (!typing && e.altKey) { const m = { t: 'line', h: 'hline', v: 'vline', f: 'fib', r: 'rect', g: 'gbox', m: 'measure' }[e.key.toLowerCase()]; if (m) { e.preventDefault(); setTool(m); return; } }
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
  const sigKey = s => `${S.sym}|${S.tf}|${s.t}|${s.setup}|${s.dir}`;
  function markSeen() { if (SIG.live) AL.seen.add(sigKey(SIG.live)); }
  function checkAlerts() {
    if (!AL.on || S.source !== 'live' || !CTX || RP.on) return;
    const s = SIG.live;
    if (s && !AL.seen.has(sigKey(s))) {
      AL.seen.add(sigKey(s)); beep('sig');
      const msg = `${s.dir > 0 ? 'شراء' : 'بيع'} ${s.grade} · ${S.sym} · ${setupName(s)} · دخول ${fmtP(s.entry)} وقف ${fmtP(s.stop)}`;
      toast('إشارة جديدة: ' + msg); document.title = '● ' + msg;
      $('#alertLog').insertAdjacentHTML('afterbegin', `<li><span class="num">${clock(Date.now())}</span> ${esc(msg)}</li>`);
      return;
    }
    // approaching a planet line that squares with time today
    const today = Math.floor(CTX.last.t / DAY), ref = CTX.last.c;
    for (const o of (SIG.pend && SIG.pend.list) || []) {
      const k = `${S.sym}|${o.setup}|${o.dir}|${o.p.toFixed(2)}`;
      if (!AL.near.has(k) && Math.abs(o.dist) <= Math.max(0.0015, S.tolPct / 200)) {
        AL.near.add(k); beep('near');
        const msg = `${S.sym} عند مستوى ${o.dir > 0 ? 'شراء' : 'بيع'}: ${o.note} ${fmtP(o.p)}`;
        toast(msg); $('#alertLog').insertAdjacentHTML('afterbegin', `<li><span class="num">${clock(Date.now())}</span> ${esc(msg)}</li>`);
      }
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && AL.on) document.title = AL.base; });

  /* ================= PRO CHART: layers, price-time map, time pressure, profile, sessions, countdown, replay ================= */
  const LAYERS = [
    ['planets', 'خطوط الكواكب'], ['curves', 'منحنيات التربيع (مربع ٩)'], ['hot', 'نقاط الحسم'], ['fan', 'مروحة جان'],
    ['levels', 'مستويات المحور'], ['zones', 'مناطق التلاقي R/S'], ['profile', 'ملف التلاقي على اليمين'], ['hist', 'ضغط الزمن (أسفل الرسم)'],
    ['windows', 'نوافذ الزمن'], ['sessions', 'جلسات آسيا/لندن/نيويورك'], ['pivots', 'القمم والقيعان'], ['sigs', 'أسهم الإشارات'],
    ['ptime', 'زاوية زمن الكوكب'], ['box', 'صندوق جان'], ['volume', 'الحجم (العملات الرقمية)'],
  ];
  const lay = k => (S.layers || {})[k] !== false;
  function initLayers() {
    const pop = $('#layersPop');
    pop.innerHTML = LAYERS.map(([k, n]) => `<div class="inline"><span class="lbl">${n}</span><button class="sw sm" role="switch" data-ly="${k}" aria-label="${n}"></button></div>`).join('');
    const sync = () => $$('[data-ly]').forEach(b => b.setAttribute('aria-checked', lay(b.dataset.ly)));
    sync();
    pop.addEventListener('click', e => { const b = e.target.closest('[data-ly]'); if (!b) return; S.layers[b.dataset.ly] = !lay(b.dataset.ly); sync(); save(); updateChart(true); });
    $('#btnLayers').onclick = e => {
      e.stopPropagation(); pop.hidden = !pop.hidden; $('#btnLayers').setAttribute('aria-expanded', !pop.hidden);
      if (!pop.hidden) { const r = $('#btnLayers').getBoundingClientRect(); pop.style.position = 'fixed'; pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = Math.max(8, Math.min(r.left, innerWidth - 268)) + 'px'; pop.style.bottom = 'auto'; pop.style.right = 'auto'; }
    };
    $('#legend').addEventListener('click', e => {
      const b = e.target.closest('[data-lg]'); if (b) { S.layers[b.dataset.lg] = !lay(b.dataset.lg); sync(); save(); updateChart(true); return; }
      const c = e.target.closest('[data-lgc]'); if (c) { S.legendCollapsed = c.dataset.lgc === '0'; save(); renderLegend(); }
    });
    document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && e.target !== $('#btnLayers')) { pop.hidden = true; $('#btnLayers').setAttribute('aria-expanded', 'false'); } });
  }
  /* hot spots: a planet's price line crossing a price squared with time (Square of 9 or 1×1) */
  function computeHot() {
    const c = CTX, m = c.main;
    const from = Math.max(m.i + 1, c.n - (c.daily ? 260 : 400)), to = c.n + c.futN - 1;
    let hs = [];
    try { hs = SC.hotSpots(c, m, { range: 7 }, from, to); } catch (e) { console.error(e); }
    const day = t => Math.floor(t / DAY), wScore = new Map();
    for (const w of A.windows) wScore.set(day(w.t), Math.max(wScore.get(day(w.t)) || 0, w.score));
    const tol = c.last.c * S.so.touchPct / 100 * 3;
    for (const h of hs) {
      h.fi = SC.idxOfT(c, h.t);
      h.peers = hs.filter(o => o !== h && Math.abs(o.fi - h.fi) <= 1.5 && Math.abs(o.p - h.p) <= tol);
      h.score = h.w + 0.75 * h.peers.length + 0.25 * (wScore.get(day(h.t)) || 0);
      h.future = h.t > c.last.t;
    }
    SIG.hot = hs;
    SIG.hotTop = hs.filter(h => h.future).sort((a, b) => b.score - a.score).slice(0, 14).sort((a, b) => a.t - b.t);
    SIG.hotMax = Math.max(1, ...SIG.hotTop.map(h => h.score));
  }
  const HOT_N = { sq9: 'زاوية مربع ٩', sq9o: 'مقابلة مربع ٩', bal1: 'توازن 1×1' };
  function renderHot() {
    const ref = CTX.last.c, rows = SIG.hotTop || [];
    $('#hotSub').textContent = `من ${CTX.main.type === 'H' ? 'قمة' : 'قاع'} ${fmtP(CTX.main.p)} · ${rows.length} نقطة`;
    $('#hotBody').innerHTML = rows.length ? rows.map(h => `<tr><td style="white-space:nowrap">${fd(h.t)}<small style="color:var(--faint);display:block">${relT(h.t)}</small></td>
      <td class="num">${fmtP(h.p)}</td><td><span style="color:var(--pl-${h.P})">${glyph(h.P)}</span> ${PL[h.P][1]}${h.off ? ` ⁦+${h.off}°⁩` : ''}${h.peers.length ? ` <small style="color:var(--accent)">+${[...new Set(h.peers.map(p => PL[p.P][1]))].join('، ')}</small>` : ''}</td>
      <td>${HOT_N[h.kind]}</td><td class="num ${h.p > ref ? 'side-r' : 'side-s'}">${pct((h.p - ref) / ref)}</td>
      <td><div class="bar" style="width:70px"><span style="width:${(h.score / SIG.hotMax * 100).toFixed(0)}%"></span></div></td></tr>`).join('')
      : `<tr><td colspan="6"><div class="empty">لا توجد نقاط حسم داخل ±7% من السعر في أفق المسح.</div></td></tr>`;
  }
  const relT = t => { const h = (t - CTX.last.t) / 36e5; return h < 48 ? `بعد ${Math.max(0, Math.round(h))} ساعة` : `بعد ${Math.round(h / 24)} يوم`; };

  function updateProSeries(c, N, ref) {
    // time-pressure histogram in its own band under the candles
    const showHist = lay('hist');
    CHT.candle.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: showHist ? 0.17 : 0.06 } });
    if (!showHist) CHT.hist.setData([]);
    else {
      const score = new Float64Array(N);
      for (const e of A.events) { const j = Math.round(SC.idxOfT(c, e.t)); if (j >= c.n && j < N) score[j] += e.w; }
      for (const h of SIG.hot || []) if (h.future) { const j = Math.round(h.fi); if (j >= c.n && j < N) score[j] += h.w; }
      let mx = 0; for (let j = c.n; j < N; j++) mx = Math.max(mx, score[j]);
      const acc = css('--accent'), d = [];
      for (let j = 0; j < N; j++) d.push(j < c.n || !score[j] ? { time: sec(c.T[j]) } : { time: sec(c.T[j]), value: score[j], color: alpha(acc, 0.25 + 0.7 * score[j] / (mx || 1)) });
      CHT.hist.setData(d);
    }
    // volume (when the feed provides it)
    const hasV = c.bars.some(b => b.v > 0);
    CHT.vol.setData(lay('volume') && hasV ? c.bars.map(b => ({ time: sec(b.t), value: b.v || 0, color: alpha(css(b.c >= b.o ? '--tv-up' : '--tv-down'), 0.35) })) : []);
    if (hasV && lay('volume') && !showHist) CHT.candle.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: 0.17 } });
    // planetary-time fan: price moves one degree-price for every degree the planet travels
    if (S.on.ptime && lay('ptime')) {
      const m = c.main, P = S.ptPlanet || 'Sun', dir = m.type === 'L' ? 1 : -1, col = css('--pl-' + P);
      for (const r of [1, 2, 0.5]) {
        const pts = [];
        for (let j = m.i; j < N; j++) { const d = SC.planetTravel(c, m, j, P); if (d == null) continue; const v = m.p + dir * r * d * c.pf; if (v <= 0) break; pts.push({ time: sec(c.T[j]), value: v }); }
        line({ color: alpha(col, r === 1 ? 1 : 0.55), lineWidth: r === 1 ? 2 : 1, lineStyle: LWC.LineStyle.LargeDashed, title: r === 1 ? glyph(P) + ' 1×1' : '', lastValueVisible: r === 1 }).setData(pts);
      }
    }
    // Square-of-9 squared-price curves from the anchor
    if (lay('curves')) {
      const m = c.main, lo = ref * 0.92, hi = ref * 1.08, groups = new Map();
      for (let j = m.i + 1; j < N; j++) for (const q of SC.squaredCurvePrices(c, m, j, lo, hi)) {
        if (q.kind === 'bal1') continue;
        const k = q.kind + q.n; if (!groups.has(k)) groups.set(k, { kind: q.kind, pts: [] });
        groups.get(k).pts.push({ time: sec(c.T[j]), value: q.p });
      }
      for (const g of groups.values()) line({ color: alpha(css('--accent'), g.kind === 'sq9' ? 0.75 : 0.4), lineWidth: 1, lineStyle: g.kind === 'sq9' ? LWC.LineStyle.Dashed : LWC.LineStyle.SparseDotted }).setData(g.pts);
    }
  }

  function drawPro(ctx2, x, y, paneW, paneH) {
    const c = CTX;
    // sessions strip (intraday)
    if (lay('sessions') && !c.daily) {
      const r = c.T, ts = CHT.chart.timeScale(), vr = ts.getVisibleLogicalRange(); if (vr) {
        const cols = { asia: css('--c-nsq'), lon: css('--c-angles'), ny: css('--c-sq9') };
        for (let j = Math.max(0, Math.floor(vr.from)); j <= Math.min(r.length - 1, Math.ceil(vr.to)); j++) {
          const h = new Date(r[j]).getUTCHours(), x0 = x(j - 0.5), x1 = x(j + 0.5); if (x0 == null || x1 == null) continue;
          const s = h < 7 ? 'asia' : h < 13 ? 'lon' : h < 21 ? 'ny' : null; if (!s) continue;
          ctx2.fillStyle = alpha(cols[s], 0.55); ctx2.fillRect(x0, paneH - 3, x1 - x0, 3);
        }
      }
    }
    // confluence profile on the right edge
    if (lay('profile') && A.zones.length) {
      const zs = A.zones.slice().sort((a, b) => b.score - a.score).slice(0, 14), mx = zs[0].score, ref = c.last.c;
      for (const z of zs) {
        const yy = y(z.p); if (yy == null) continue;
        const w = 18 + 72 * z.score / mx, h = Math.max(3, Math.abs(y(z.p - ref * S.tolPct / 200) - y(z.p + ref * S.tolPct / 200)));
        ctx2.fillStyle = alpha(css(z.p >= ref ? '--down' : '--up'), 0.38); ctx2.fillRect(paneW - w, yy - h / 2, w, h);
        ctx2.fillStyle = alpha(css(z.p >= ref ? '--down' : '--up'), 0.9); ctx2.fillRect(paneW - 2, yy - h / 2, 2, h);
      }
    }
    // Gann box from the anchor
    if ((S.on.box || S.on.boxt) && lay('box')) {
      const m = c.main, b = SC.boxSpan(c), dir = m.type === 'L' ? 1 : -1, col = css('--c-sq144');
      for (const k of [0, 1]) {
        const t0 = k ? SC.dateAfter(c, m, b.time) : m.t, t1 = SC.dateAfter(c, m, b.time * (k + 1));
        const x0 = x(SC.idxOfT(c, t0)), x1 = x(SC.idxOfT(c, t1)), y0 = y(m.p), y1 = y(m.p + dir * b.price);
        if ([x0, x1, y0, y1].some(v => v == null)) continue;
        const w = x1 - x0, h = y1 - y0;
        ctx2.strokeStyle = alpha(col, k ? 0.45 : 0.9); ctx2.lineWidth = 1.2; ctx2.strokeRect(x0, y0, w, h);
        ctx2.lineWidth = 0.7; ctx2.strokeStyle = alpha(col, k ? 0.25 : 0.45);
        for (const f of [0.25, 0.5, 0.75]) { ctx2.beginPath(); ctx2.moveTo(x0 + w * f, y0); ctx2.lineTo(x0 + w * f, y1); ctx2.moveTo(x0, y0 + h * f); ctx2.lineTo(x1, y0 + h * f); ctx2.stroke(); }
        ctx2.strokeStyle = alpha(col, k ? 0.4 : 0.8); ctx2.beginPath(); ctx2.moveTo(x0, y0); ctx2.lineTo(x1, y1); ctx2.moveTo(x0, y1); ctx2.lineTo(x1, y0); ctx2.stroke();
        if (!k) { ctx2.fillStyle = col; ctx2.font = '11px ' + TVFONT; ctx2.textAlign = 'left'; ctx2.textBaseline = 'bottom'; ctx2.fillText(`صندوق ${b.label}`, x0 + 4, Math.min(y0, y1) - 3); }
      }
    }
    // hot spots
    if (lay('hot')) {
      const top = new Set(SIG.hotTop || []);
      for (const h of SIG.hot || []) {
        if (!h.future && h.fi < c.n - 60) continue;
        const xx = x(h.fi), yy = y(h.p); if (xx == null || yy == null || xx < 0 || xx > paneW) continue;
        const big = top.has(h), s = big ? 6 : 2.5, col = css('--pl-' + h.P);
        ctx2.save(); ctx2.translate(xx, yy); ctx2.rotate(Math.PI / 4);
        if (big) { ctx2.shadowColor = alpha(css('--accent'), 0.9); ctx2.shadowBlur = 10; }
        ctx2.fillStyle = h.future ? col : alpha(col, 0.25); ctx2.strokeStyle = h.future ? css('--surface') : col; ctx2.lineWidth = 1.5;
        ctx2.fillRect(-s, -s, 2 * s, 2 * s); ctx2.strokeRect(-s, -s, 2 * s, 2 * s); ctx2.restore();
        if (big) { ctx2.fillStyle = col; ctx2.font = '600 12px "Segoe UI Symbol","Apple Symbols","Noto Sans Symbols 2",serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'bottom'; ctx2.fillText(glyph(h.P), xx, yy - 9); }
      }
    }
    // replay ghost: what actually happened after the replay point
    if (RP.on && RP.ghost && RP.full) {
      const w = Math.max(1, (x(1) - x(0)) * 0.6);
      for (let k = RP.i + 1; k < Math.min(RP.full.length, RP.i + 1 + c.futN); k++) {
        const b = RP.full[k], fi = SC.idxOfT(c, b.t), xx = x(fi); if (xx == null) continue;
        const up = b.c >= b.o; ctx2.strokeStyle = ctx2.fillStyle = alpha(css(up ? '--up' : '--down'), 0.35);
        ctx2.beginPath(); ctx2.moveTo(xx, y(b.h)); ctx2.lineTo(xx, y(b.l)); ctx2.stroke();
        const yo = y(b.o), yc = y(b.c); ctx2.fillRect(xx - w / 2, Math.min(yo, yc), w, Math.max(1, Math.abs(yc - yo)));
      }
    }
  }
  function hotAt(px, py) {
    if (!lay('hot') || !SIG.hot) return null;
    const ts = CHT.chart.timeScale(); let best = null, bd = 10;
    for (const h of SIG.hot) { const xx = lx(ts, h.fi), yy = CHT.candle.priceToCoordinate(h.p); if (xx == null || yy == null) continue; const d = Math.hypot(xx - px, yy - py); if (d < bd) { bd = d; best = h; } }
    return best;
  }

  /* candle countdown */
  function tickCountdown() {
    const el = document.getElementById('cd'); if (!el || !CTX || S.source !== 'live' || RP.on) { if (el) el.textContent = ''; return; }
    const step = CTX.daily ? (S.tf === '1week' ? 7 * DAY : DAY) : CTX.step, left = CTX.last.t + step - Date.now();
    if (left <= 0 || left > step) { el.textContent = ''; return; }
    const s = Math.floor(left / 1000), hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60, ss = s % 60;
    el.textContent = `تغلق الشمعة بعد ${hh ? hh + ':' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  setInterval(tickCountdown, 1000);

  /* ---------- replay ---------- */
  const RP = { on: false, full: null, i: 0, timer: 0, ghost: true, speed: 700 };
  function enterReplay() {
    if (RP.on || BARS.length < 80) return;
    RP.full = BARS; RP.on = true; RP.i = Math.max(60, BARS.length - (CTX.daily ? 90 : 150));
    $('#replay').hidden = false; $('#btnReplay').setAttribute('aria-pressed', 'true');
    const sl = $('#rpSlider'); sl.min = 60; sl.max = RP.full.length - 1; applyReplay(true);
  }
  function applyReplay(fit) {
    RP.i = Math.max(60, Math.min(RP.full.length - 1, RP.i));
    BARS = RP.full.slice(0, RP.i + 1); if (fit) CHT.fit = true;
    if (!S.anchorLocked) S.anchorT = null; // the anchor follows the replayed history
    refresh(!fit);
    $('#rpSlider').value = RP.i; $('#rpDate').textContent = fd(RP.full[RP.i].t);
    $('#replayBadge').hidden = false; $('#replayBadge').textContent = 'وضع الإعادة · ' + fd(RP.full[RP.i].t);
  }
  function exitReplay() {
    if (!RP.on) return; clearInterval(RP.timer); RP.timer = 0; RP.on = false;
    BARS = RP.full; RP.full = null; if (!S.anchorLocked) S.anchorT = null; $('#replay').hidden = true; $('#replayBadge').hidden = true;
    $('#btnReplay').setAttribute('aria-pressed', 'false'); $('#rpPlay').textContent = '▶'; CHT.fit = true; refresh();
  }
  function initReplay() {
    $('#btnReplay').onclick = () => RP.on ? exitReplay() : enterReplay();
    $('#rpExit').onclick = exitReplay;
    $('#rpSlider').oninput = e => { RP.i = +e.target.value; $('#rpDate').textContent = fd(RP.full[RP.i].t); };
    $('#rpSlider').onchange = e => { RP.i = +e.target.value; applyReplay(false); };
    $('#replay').addEventListener('click', e => {
      const b = e.target.closest('[data-step]'); if (!b) return; RP.i += +b.dataset.step; applyReplay(false);
    });
    $('#rpPlay').onclick = () => {
      if (RP.timer) { clearInterval(RP.timer); RP.timer = 0; $('#rpPlay').textContent = '▶'; return; }
      $('#rpPlay').textContent = '❚❚';
      RP.timer = setInterval(() => { if (RP.i >= RP.full.length - 1) { clearInterval(RP.timer); RP.timer = 0; $('#rpPlay').textContent = '▶'; return; } RP.i++; applyReplay(false); }, RP.speed);
    };
    $('#rpGhost').onclick = () => { RP.ghost = !RP.ghost; $('#rpGhost').setAttribute('aria-checked', RP.ghost); drawOverlay(); };
  }

  /* ---------- theme + unit presets ---------- */
  function applyTheme() {
    const r = document.documentElement;
    if (S.theme === 'dark' || S.theme === 'light') r.setAttribute('data-theme', S.theme); else r.removeAttribute('data-theme');
    $('#themeBtn').setAttribute('aria-label', 'المظهر: ' + ({ dark: 'داكن', light: 'فاتح' }[S.theme] || 'تلقائي'));
    $('#themeBtn').dataset.mode = S.theme || 'auto';
  }
  function initTheme() { $('#themeBtn').onclick = () => { S.theme = { auto: 'dark', dark: 'light', light: 'auto' }[S.theme || 'auto']; save(); applyTheme(); }; applyTheme(); }
  function renderUnitPresets() {
    if (!CTX) return; const base = Math.pow(10, Math.floor(Math.log10(CTX.last.c)) - 3);
    const opts = [0, base, 2 * base, 5 * base, 10 * base];
    $('#unitPresets').innerHTML = opts.map(v => `<button type="button" class="chip-btn" data-u="${v}" aria-pressed="${(S.unit || 0) === v}">${v ? '$' + (+v.toPrecision(3)) : 'تلقائي'}</button>`).join('');
  }
  function initPlanetBox() {
    $('#ptPlanet').value = S.ptPlanet || 'Sun'; $('#boxN').value = String(S.boxN || 52);
    $('#ptPlanet').onchange = e => { S.ptPlanet = e.target.value; refresh(true); };
    $('#boxN').onchange = e => { S.boxN = +e.target.value; refresh(true); };
    const syncPf = () => $$('#pfPresets [data-pf]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.pf === (S.pf || 0)));
    $('#pfPresets').addEventListener('click', e => { const b = e.target.closest('[data-pf]'); if (!b) return; S.pf = +b.dataset.pf; $('#pf').value = S.pf || ''; syncPf(); refresh(true); });
    syncPf();
  }
  function initUnitPresets() { $('#unitPresets').addEventListener('click', e => { const b = e.target.closest('[data-u]'); if (!b) return; S.unit = +b.dataset.u; $('#unit').value = S.unit || ''; refresh(true); }); }

  /* ================= SIGNALS ================= */
  const SIG = { list: [], all: [], live: null, watch: [], stat: null, hot: [], hotTop: [], hotMax: 1 };
  const SQ_N = { plan: 'زمن الكوكب', bal1: 'توازن 1×1', sq9: 'زاوية مربع ٩', sq9o: 'مقابلة مربع ٩', cyc: 'دورة/مربع زمن', pdeg: 'السعر كدرجات' };
  const sqText = sq => sq && sq.list.length ? sq.list.map(k => SQ_N[k]).join(' + ') : 'بدون تربيع';
  const SETUP_N = { dbl: 'قاع/قمة مزدوجة', tpl: 'قاع/قمة ثلاثية', ret: 'ارتداد 3/8–5/8', brk: 'كسر آخر قمة/قاع' };
  const setupName = s => s.setup === 'dbl' ? (s.dir > 0 ? 'قاع مزدوج' : 'قمة مزدوجة') : s.setup === 'tpl' ? (s.dir > 0 ? 'قاع ثلاثي' : 'قمة ثلاثية') : s.setup === 'ret' ? `ارتداد ${(s.ratio * 100).toFixed(0)}%` : (s.dir > 0 ? 'كسر آخر قمة' : 'كسر آخر قاع');
  const STRAT_SHORT = id => META[id] ? META[id][0] : id;
  function confText(s) {
    const t = [...new Set(s.time.hits.map(e => e.s))].map(STRAT_SHORT);
    if (s.sq && s.sq.list.length) t.push('السعر = الزمن');
    const p = s.price.strats.map(STRAT_SHORT);
    return { time: t, price: p };
  }
  function soOpts() { return Object.assign({}, S.so, { tolPct: S.tolPct, win: Math.max(1, S.win) }); }
  function computeSignals() {
    const so = soOpts(), GR = { A: 3, B: 2, C: 1 }, gmin = GR[S.so.minGrade] || 1;
    const r = SC.gannTrades(CTX, so, id => !!S.on[id]);
    SIG.all = r.list; SIG.swings = r.swings;
    SIG.list = SIG.all.filter(s => GR[s.grade] >= gmin && S.so['set' + (s.setup === 'tpl' ? 'Dbl' : s.setup[0].toUpperCase() + s.setup.slice(1))] !== false);
    const lastI = CTX.n - 1;
    SIG.live = SIG.list.filter(s => s.i >= lastI - 1).sort((a, b) => b.score - a.score)[0] || null;
    SIG.open = SIG.list.filter(s => s.res.kind === 'open');
    SIG.pend = SC.pendingSetups(CTX, so, r.swings);
    SIG.watch = [];
    const st = l => SC.stats(l);
    SIG.stat = { all: st(SIG.list), A: st(SIG.all.filter(s => s.grade === 'A')), B: st(SIG.all.filter(s => s.grade === 'B')), C: st(SIG.all.filter(s => s.grade === 'C')) };
    SIG.bySetup = ['dbl', 'tpl', 'ret', 'brk'].map(k => ({ k, s: st(SIG.all.filter(x => x.setup === k)) })).filter(x => x.s.n || x.s.open);
  }
  function tradeCard(s, title) {
    const buy = s.dir > 0, cf = confText(s), rr = Math.abs(s.t1 - s.entry) / s.risk;
    const stopNow = s.res && s.res.kind === 'open' ? s.res.stopNow : s.stop;
    return `<div class="sig-h"><span class="pill ${buy ? 'up' : 'down'}">${title} ${buy ? 'شراء' : 'بيع'} ${s.grade}</span><b>${setupName(s)} عند <span class="num">${fmtP(s.setup === 'brk' && s.level ? s.level.p : s.base.p)}</span>${s.setup === 'brk' ? ` <small style="color:var(--muted)">· الوقف تحت ${s.dir > 0 ? 'آخر قاع' : 'آخر قمة'} ${fmtP(s.base.p)}</small>` : ''}</b><small>${fd(s.t)}</small></div>
      <div class="sig-g">
        <div><span>الدخول</span><b class="num">${fmtP(s.entry)}</b></div>
        <div><span>وقف الخسارة${stopNow !== s.stop ? ' (متحرك)' : ''}</span><b class="num side-r">${fmtP(stopNow)}</b></div>
        <div><span>الهدف 1</span><b class="num side-s">${fmtP(s.t1)}</b></div>
        <div><span>الهدف 2 (مربع ٩ ${buy ? '+' : '−'}180°)</span><b class="num side-s">${fmtP(s.t2)}</b></div>
        <div><span>العائد/المخاطرة</span><b class="num">${rr.toFixed(2)}</b></div>
        <div><span>مع الاتجاه</span><b>${s.withTrend ? 'نعم' : 'لا (انعكاس)'}</b></div>
      </div>
      <p class="sig-x"><b>تأكيد الزمن:</b> ${cf.time.length ? cf.time.join('، ') : 'لا يوجد'} · <b>تأكيد السعر:</b> ${cf.price.length ? cf.price.join('، ') : 'لا يوجد'}${s.res && s.res.kind === 'open' ? ` · <b>الآن:</b> <span class="num">${s.res.R >= 0 ? '+' : ''}${s.res.R.toFixed(2)}R</span>` : ''}</p>`;
  }
  function renderSignals() {
    const live = SIG.live || SIG.open[SIG.open.length - 1], box = $('#sigNow'), c = CTX;
    const statCard = (st, nm) => `<div class="st"><div class="k">${nm}</div><div class="v num ${st.exp > 0 ? 'side-s' : st.n ? 'side-r' : ''}">${st.n ? (st.exp >= 0 ? '+' : '') + st.exp.toFixed(2) + 'R' : '—'}</div><div class="s">${st.n} صفقة · ربح ${(st.win * 100).toFixed(0)}% · PF ${isFinite(st.pf) ? st.pf.toFixed(2) : '∞'}</div></div>`;
    const P = SIG.pend, trendTxt = P.trend > 0 ? 'صاعد' : P.trend < 0 ? 'هابط' : 'غير محدد';
    if (live) { box.className = 'sig-now ' + (live.dir > 0 ? 'buy' : 'sell'); box.innerHTML = tradeCard(live, SIG.live ? 'إشارة جديدة:' : 'صفقة مفتوحة:'); }
    else {
      box.className = 'sig-now idle';
      box.innerHTML = `<div class="sig-h"><span class="pill ${P.trend > 0 ? 'up' : P.trend < 0 ? 'down' : 'nt'}">الاتجاه حسب جان: ${trendTxt}</span><b>لا توجد صفقة الآن · الماسح ينتظر أحد إعدادات جان</b></div>
        <div class="sig-g"><div><span>آخر قمة تأرجح</span><b class="num">${P.lastTop ? fmtP(P.lastTop.p) : '—'}</b></div><div><span>آخر قاع تأرجح</span><b class="num">${P.lastBot ? fmtP(P.lastBot.p) : '—'}</b></div></div>`;
    }
    $('#sigWatch').innerHTML = P.list.length ? `<table><thead><tr><th>الإعداد</th><th>المستوى</th><th>المسافة</th><th>الدخول يحدث عندما</th></tr></thead><tbody>${P.list.map(o => {
      const how = o.setup === 'brk' ? 'يغلق السعر خلف المستوى' : o.setup === 'dbl' ? `يصل السعر للمستوى ثم يتحول التأرجح ${o.dir > 0 ? 'صعودًا' : 'هبوطًا'} (شمعتان)` : `يرتد السعر للمستوى ثم يتحول التأرجح ${o.dir > 0 ? 'صعودًا' : 'هبوطًا'}`;
      return `<tr><td><span class="pill ${o.dir > 0 ? 'up' : 'down'}">${o.dir > 0 ? 'شراء' : 'بيع'}</span> ${o.note}</td><td class="num">${fmtP(o.p)}</td><td class="num ${o.dist > 0 ? 'side-r' : 'side-s'}">${pct(o.dist)}</td><td style="font-size:.8rem;color:var(--muted)">${how}</td></tr>`;
    }).join('')}</tbody></table>` : `<div class="empty">لا توجد إعدادات قريبة (±8%) من السعر.</div>`;
    const st = SIG.stat;
    $('#sigStats').innerHTML = statCard(st.all, `الإشارات المعتمدة (${S.so.minGrade === 'C' ? 'الكل' : S.so.minGrade === 'B' ? 'B وأعلى' : 'A فقط'})`) + statCard(st.A, 'الدرجة A') + statCard(st.B, 'الدرجة B') + statCard(st.C, 'الدرجة C')
      + (SIG.bySetup || []).map(x => statCard(x.s, SETUP_N[x.k])).join('');
    const rows = SIG.list.slice().reverse().slice(0, 80);
    $('#sigBody').innerHTML = rows.length ? rows.map(s => {
      const r = s.res, rk = r.kind === 'target' ? ['side-s', 'الهدف'] : r.kind === 'stop' ? ['side-r', 'الوقف'] : r.kind === 'trail' ? [r.R >= 0 ? 'side-s' : 'side-r', 'الوقف المتحرك'] : r.kind === 'time' ? ['', 'انتهاء المدة'] : ['', 'مفتوحة'];
      const cf = confText(s);
      return `<tr><td style="white-space:nowrap">${fd(s.t)}</td><td><span class="pill ${s.dir > 0 ? 'up' : 'down'}">${s.dir > 0 ? 'شراء' : 'بيع'} ${s.grade}</span></td><td>${setupName(s)} <span class="num">${fmtP(s.setup === 'brk' && s.level ? s.level.p : s.base.p)}</span></td><td style="font-size:.78rem;color:var(--muted)">${[...cf.time, ...cf.price].slice(0, 4).join('، ') || '—'}</td><td class="num">${fmtP(s.entry)}</td><td class="num side-r">${fmtP(s.stop)}</td><td class="num side-s">${fmtP(s.t1)}</td><td class="num ${rk[0]}">${rk[1]} ${r.R >= 0 ? '+' : ''}${r.R.toFixed(2)}R</td></tr>`;
    }).join('') : `<tr><td colspan="8"><div class="empty">لا توجد صفقات بهذه القواعد في البيانات الحالية.</div></td></tr>`;
    $('#sigSub').textContent = `${SIG.all.length} صفقة · الخروج: ${S.so.exitMode === 'target' ? 'هدف ثابت' : 'وقف متحرك تحت القيعان'}`;
  }

  /* ================= LIVE DATA (GannData providers) ================= */
  const GD = window.GannData;
  const TF_N = { '15min': '15 دقيقة', '1h': 'ساعة', '4h': '4 ساعات', '1day': 'يومي', '1week': 'أسبوعي' };
  const LIVE = { env: { mcp: null }, feed: null, at: null, meta: null, tickTimer: 0, lastRefresh: 0 };
  const clock = t => new Date(t).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const digitsFor = p => p >= 1000 ? 2 : p >= 100 ? 2 : p >= 10 ? 3 : p >= 1 ? 5 : 6;
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
        if (RP.on) { if (sym === S.sym && tf === S.tf) RP.full = bars; return; }
        if (sym !== S.sym || tf !== S.tf) return;
        const fresh = !reload || S.source !== 'live' || !BARS.length || BARS[0].t !== bars[0].t;
        BARS = bars; S.source = 'live'; LIVE.meta = meta;
        dig = meta.decimals != null ? Math.min(meta.decimals, digitsFor(bars[bars.length - 1].c)) : digitsFor(bars[bars.length - 1].c);
        LIVE.at = Date.now();
        if (fresh) { CHT.fit = true; if (!S.anchorLocked) S.anchorT = null; }
        refresh(!fresh);
      },
      onTick: k => {
        if (RP.on) return;
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
    const o = { pivK: S.pivK, anchorI: null, anchorMode: 'main', timeMode: S.timeMode, unit: 0, sqk: 0, pf: 0, horizon: S.horizon, harm: S.harm, helio: S.helio, planets: S.planets.slice(), tolPct: S.tolPct, win: Math.max(1, S.win), ptPlanet: S.ptPlanet, boxN: S.boxN };
    const c = SC.build(bars, o); if (!c.main) return { st: 'err', msg: 'قمم وقيعان غير كافية' };
    const so = soOpts(), GR = { A: 3, B: 2, C: 1 }; const rr = SC.gannTrades(c, so, id => !!S.on[id]); const sg = rr.list.filter(s => GR[s.grade] >= (GR[S.so.minGrade] || 1));
    const lastSig = sg.filter(s => s.i >= c.n - 3).sort((a, b) => b.score - a.score)[0] || sg.filter(s => s.res.kind === 'open').pop() || null;
    const pend = SC.pendingSetups(c, so, rr.swings).list[0] || null;
    const ref = c.last.c, cyc = 360 * c.pf; let near = null;
    for (const P of S.planets) { const L = G.lon(P, c.last.t, S.helio); if (L == null) continue; for (const off of (S.harm ? [0, 90, 180, 270] : [0])) { const base = G.mod(L + off, 360) * c.pf, v = base + Math.round((ref - base) / cyc) * cyc; const d = (v - ref) / ref; if (!near || Math.abs(d) < Math.abs(near.d)) near = { P, off, v, d, sq: SC.squareState(c, c.main, c.n - 1, v, so) }; } }
    const pc = bars[bars.length - 2].c;
    return { c: ref, ch: (ref - pc) / pc, sig: lastSig, near, pend, dig: digitsFor(ref), bars };
  }
  function renderScan() {
    $('#msBody').innerHTML = MS.rows.length ? MS.rows.map((r, k) => {
      if (r.st !== 'ok') return `<tr><td><b>${esc(r.s)}</b></td><td colspan="5" style="color:var(--faint)">${r.st === 'wait' ? 'في الانتظار' : r.st === 'load' ? 'جارٍ الجلب والحساب…' : esc(r.msg || 'خطأ')}</td></tr>`;
      const f = p => p.toLocaleString('en-US', { minimumFractionDigits: r.dig, maximumFractionDigits: r.dig });
      const sig = r.sig ? `<span class="pill ${r.sig.dir > 0 ? 'up' : 'down'}">${r.sig.dir > 0 ? 'شراء' : 'بيع'} ${r.sig.grade}</span> ${setupName(r.sig)}${r.sig.res.kind === 'open' && r.sig.i < r.bars.length - 3 ? ' (مفتوحة)' : ''}` : '<span class="pill nt">لا شيء</span>';
      const sq = r.pend ? `${r.pend.dir > 0 ? 'شراء' : 'بيع'}: ${r.pend.note} <span class="num">${f(r.pend.p)}</span> <small class="num">${pct(r.pend.dist)}</small>` : '<span style="color:var(--faint)">—</span>';
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
    num('#soDbl', 'dblAtr', 0.1, 2); num('#soMaxRisk', 'maxRiskAtr', 1, 10); num('#soDeg', 'degTol', 1, 20); num('#soBal', 'balTol', 0.02, 0.5); num('#soStop', 'stopAtr', 0, 3); num('#soRR', 'minRR', 0.5, 5); num('#soHold', 'hold', 3, 300); num('#soTimeMin', 'timeMin', 0.5, 10); num('#soPriceMin', 'priceMin', 1, 6);
    $('#soExit').onchange = e => { S.so.exitMode = e.target.value; refresh(true); };
    $('#soSwing').onchange = e => { S.so.swingN = +e.target.value; refresh(true); };
    $('#soGrade').onchange = e => { S.so.minGrade = e.target.value; refresh(true); };
    syncSig();
  }
  function syncSig() {
    $$('[data-so]').forEach(b => b.setAttribute('aria-checked', !!S.so[b.dataset.so]));
    $('#soDbl').value = S.so.dblAtr; $('#soMaxRisk').value = S.so.maxRiskAtr; $('#soTimeMin').value = S.so.timeMin; $('#soPriceMin').value = S.so.priceMin; $('#soExit').value = S.so.exitMode; $('#soSwing').value = String(S.so.swingN); $('#soDeg').value = S.so.degTol; $('#soBal').value = S.so.balTol; $('#soStop').value = S.so.stopAtr; $('#soRR').value = S.so.minRR; $('#soHold').value = S.so.hold; $('#soGrade').value = S.so.minGrade;
  }

  /* ---------- boot ---------- */
  function boot() {
    buildRail(); initTabs(); initChart(); initHeader(); initSigPanel(); initTools(); initKeyBox(); initLayers(); initReplay(); initTheme(); initUnitPresets(); initPlanetBox();
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
