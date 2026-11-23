/* N-KELL — application core: storage, scoring, matching, router and pages. */
(function () {
  'use strict';
  const NK = window.NK;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NK.ICONS[n] || NK.ICONS['circle-dot']}</svg>`;
  NK.icon = icon; NK.esc = esc;

  /* ---------------- Storage (localStorage with in-memory fallback) ---------------- */
  const mem = {};
  const S = {
    get(k, d) {
      let v = null;
      try { v = localStorage.getItem(k); } catch (e) { v = null; }
      if (v != null) { try { return JSON.parse(v); } catch (e) { /* ignore */ } }
      return k in mem ? mem[k] : d;
    },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  NK.S = S;

  const App = { lang: S.get('nk_lang', 'kz'), uid: S.get('nk_session', null), data: null, testView: 'intro', ui: {} };
  NK.App = App;
  const dataKey = uid => 'nk_data_' + (uid || 'guest');
  const blank = () => ({ answers: {}, qi: 0, results: [], favs: [], road: { done: {}, goals: [] }, sims: {}, tests: {}, viewed: [], compares: [], untVisited: false, tasks: [], mentor: { consent: false, log: [] }, weights: null, consent: {} });
  /* Validates stored data so a corrupted or older record never breaks the app. */
  const loadData = () => {
    const d = S.get(dataKey(App.uid), {}) || {};
    const b = blank(); App.data = Object.assign(b, typeof d === 'object' ? d : {});
    ['results', 'favs', 'viewed', 'compares', 'tasks'].forEach(k => { if (!Array.isArray(App.data[k])) App.data[k] = []; });
    ['sims', 'tests', 'answers', 'consent'].forEach(k => { if (!App.data[k] || typeof App.data[k] !== 'object' || Array.isArray(App.data[k])) App.data[k] = {}; });
    App.data.road = Object.assign({ done: {}, goals: [] }, App.data.road || {});
    if (!Array.isArray(App.data.road.goals)) App.data.road.goals = [];
    App.data.mentor = Object.assign({ consent: false, log: [] }, App.data.mentor || {});
    if (!Array.isArray(App.data.mentor.log)) App.data.mentor.log = [];
    App.ver = (App.ver || 0) + 1;
  };
  const save = () => { App.ver = (App.ver || 0) + 1; S.set(dataKey(App.uid), App.data); };
  NK.save = save;
  const users = () => S.get('nk_users', {});
  const me = () => (App.uid ? users()[App.uid] : null);
  if (App.uid && !users()[App.uid]) { App.uid = null; S.set('nk_session', null); }

  /* ---------------- i18n ---------------- */
  const t = (k, vars) => {
    let s = (NK.I18N[App.lang] && NK.I18N[App.lang][k]) || NK.I18N.kz[k] || k;
    if (vars) Object.keys(vars).forEach(v => { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  };
  NK.t = t;
  const L = obj => (obj && (obj[App.lang] || obj.kz)) || '';
  NK.L = L;
  const pname = p => L(p.n);
  const catName = id => L((NK.CATS.find(c => c.id === id) || {}).n);
  const uniName = u => (App.lang === 'ru' ? u.ru : App.lang === 'en' ? u.en : u.n);
  /* Localised content helpers (Kazakh is the base; RU/EN come from content files) */
  NK.pc = (p, f) => { const tx = NK.PROF_TX && NK.PROF_TX[p.id] && NK.PROF_TX[p.id][App.lang]; return tx && tx[f] != null ? tx[f] : p[f]; };
  NK.pcl = (p, f) => { const v = NK.pc(p, f); return Array.isArray(v) ? v : String(v || '').split('|').filter(Boolean); };
  NK.pday = p => { const d = NK.PROF_TX && NK.PROF_TX[p.id] && NK.PROF_TX[p.id].day; return d ? L(d).split('|') : []; };
  NK.subjName = s => (NK.SUBJ_TX && NK.SUBJ_TX[s] ? L(NK.SUBJ_TX[s]) : s);
  NK.cityName = c => (NK.CITY_TX && NK.CITY_TX[c] ? L(NK.CITY_TX[c]) : c);
  NK.uniProgs = u => (App.lang !== 'kz' && NK.UNI_TX && NK.UNI_TX[u.id] ? NK.UNI_TX[u.id][App.lang].split('|') : u.prog);
  NK.dimName = (src, d) => { if (src === 'riasec' || src === 'express') return t('k_' + d); const x = NK.TEST[src]; return x && x.info[d] && x.info[d].name ? L(x.info[d].name) : d; };
  const qT = q => { const tx = NK.Q_TX && NK.Q_TX[q.id] && NK.Q_TX[q.id][App.lang]; return { t: (tx && tx.t) || q.text, s: (tx && tx.s) || q.scene, h: (tx && tx.h) || q.hint, o: (q.options || []).map((o, i) => (tx && tx.o && tx.o[i]) || o.t) }; };
  let _rec = { v: -1, uid: null, val: null };
  NK.rec = () => { if (_rec.v !== App.ver || _rec.uid !== App.uid) _rec = { v: App.ver, uid: App.uid, val: NK.Engine.recommend(App.data, NK.PROFS) }; return _rec.val; };
  const unified = () => { const r = NK.rec(); return r.list.length ? r : null; };

  /* ---------------- Scoring engine (transparent, deterministic) ---------------- */
  const ALLKEYS = [].concat(NK.KEYS.int, NK.KEYS.ab, NK.KEYS.pe, NK.KEYS.va, NK.KEYS.en);
  function maxPoints() {
    const m = {};
    const add = (k, v) => { m[k] = (m[k] || 0) + v; };
    NK.QUESTIONS.forEach(q => {
      if (q.type === 'scale') {
        Object.keys(q.p || {}).forEach(k => add(k, 4 * q.p[k]));
        Object.keys(q.rp || {}).forEach(k => add(k, 4 * q.rp[k]));
      } else if (q.type === 'multi') {
        const keys = new Set(); q.options.forEach(o => Object.keys(o.p).forEach(k => keys.add(k)));
        keys.forEach(k => {
          const vals = q.options.map(o => o.p[k] || 0).sort((a, b) => b - a).slice(0, q.max);
          add(k, vals.reduce((s, v) => s + v, 0));
        });
      } else {
        const keys = new Set(); q.options.forEach(o => Object.keys(o.p).forEach(k => keys.add(k)));
        keys.forEach(k => add(k, Math.max.apply(null, q.options.map(o => o.p[k] || 0))));
      }
    });
    return m;
  }
  const MAX = maxPoints();
  NK.MAX = MAX;

  function computeScores(answers) {
    const e = {};
    const add = (p, mult) => Object.keys(p || {}).forEach(k => { e[k] = (e[k] || 0) + p[k] * mult; });
    NK.QUESTIONS.forEach(q => {
      const a = answers[q.id];
      if (a == null) return;
      if (q.type === 'scale') { add(q.p, a - 1); add(q.rp, 5 - a); }
      else if (q.type === 'multi') (a || []).forEach(i => q.options[i] && add(q.options[i].p, 1));
      else if (q.options[a]) add(q.options[a].p, 1);
    });
    const sc = {};
    ALLKEYS.forEach(k => { sc[k] = MAX[k] ? Math.round((e[k] || 0) / MAX[k] * 100) : 0; });
    return sc;
  }
  NK.computeScores = computeScores;

  function matchProf(p, sc) {
    const letters = p.code.split('');
    const int = letters.reduce((s, l, i) => s + NK.CODE_WEIGHTS[i] * sc[l], 0);
    const avg = arr => (arr.length ? arr.reduce((s, k) => s + (sc[k] || 0), 0) / arr.length : 50);
    const parts = { int, ab: avg(p.ab), pe: avg(p.pe), va: avg(p.va), en: avg(p.en) };
    const total = Object.keys(NK.WEIGHTS).reduce((s, k) => s + NK.WEIGHTS[k] * parts[k], 0);
    return { id: p.id, total: Math.round(total), parts };
  }

  function analyze(sc) {
    const matches = NK.PROFS.map(p => matchProf(p, sc)).sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
    const byId = Object.fromEntries(matches.map(m => [m.id, m]));
    const riasec = NK.KEYS.int.slice().sort((a, b) => sc[b] - sc[a] || NK.KEYS.int.indexOf(a) - NK.KEYS.int.indexOf(b));
    const code = riasec.slice(0, 3).join('');
    const dirs = NK.CATS.map(c => {
      const ms = matches.filter(m => NK.PROF[m.id].cat === c.id).map(m => m.total).sort((a, b) => b - a).slice(0, 2);
      return { id: c.id, score: Math.round(ms.reduce((s, v) => s + v, 0) / (ms.length || 1)) };
    }).sort((a, b) => b.score - a.score);
    const top10 = matches.slice(0, 10);
    const alt = matches.slice(10, 15);
    const topDirIds = dirs.slice(0, 5).map(d => d.id);
    const rest = matches.slice(10);
    let unexp = rest.filter(m => !riasec.slice(0, 2).includes(NK.PROF[m.id].code[0]) && !topDirIds.includes(NK.PROF[m.id].cat));
    if (unexp.length < 3) unexp = unexp.concat(rest.filter(m => !riasec.slice(0, 2).includes(NK.PROF[m.id].code[0]) && !unexp.includes(m)));
    unexp = unexp.sort((a, b) => (b.parts.ab + b.parts.va) - (a.parts.ab + a.parts.va) || a.id.localeCompare(b.id)).slice(0, 3);
    const abSorted = NK.KEYS.ab.slice().sort((a, b) => sc[b] - sc[a]);
    const strengths = abSorted.slice(0, 3);
    const grow = abSorted.slice(-2).reverse();
    const envs = ['office', 'outdoor', 'lab', 'studio', 'people', 'remote'].sort((a, b) => sc[b] - sc[a]).slice(0, 2);
    const rhythm = sc.dyn >= sc.struct ? 'dyn' : 'struct';
    const skillNeed = {};
    top10.slice(0, 5).forEach(m => NK.PROF[m.id].ab.forEach(k => { if (sc[k] < 55) { (skillNeed[k] = skillNeed[k] || []).push(m.id); } }));
    const skills = Object.keys(skillNeed).sort((a, b) => skillNeed[b].length - skillNeed[a].length || sc[a] - sc[b]).map(k => ({ k, profs: skillNeed[k] }));
    return { matches, byId, riasec, code, dirs, top10, alt, unexp, strengths, grow, envs, rhythm, skills };
  }
  NK.analyze = analyze;

  const latest = () => (App.data.results.length ? App.data.results[App.data.results.length - 1] : null);
  let _cache = { key: null, val: null };
  function latestAnalysis() {
    const r = latest(); if (!r) return null;
    const key = r.date + App.uid;
    if (_cache.key !== key) _cache = { key, val: Object.assign({ scores: r.scores, date: r.date }, analyze(r.scores)) };
    return _cache.val;
  }

  /* ---------------- UI helpers ---------------- */
  function toast(msg) {
    const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = icon('check') + '<span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2200); setTimeout(() => el.remove(), 2700);
  }
  NK.toast = toast;
  function modal(html) {
    const m = $('#modal'); $('#modal-body').innerHTML = html; m.hidden = false;
    const f = $('#modal-body button, #modal-body textarea'); if (f) f.focus();
  }
  const closeModal = () => { $('#modal').hidden = true; };
  const pct = v => Math.round(v) + '%';
  const bar = (label, v, cls = '') => `<div class="bar-row ${cls}"><div class="bar-lbl"><span>${esc(label)}</span><b>${pct(v)}</b></div><div class="bar"><i style="--w:${Math.max(2, v)}%"></i></div></div>`;
  const ring = (v, size = 56, cls = '') => {
    const r = (size - 8) / 2, c = 2 * Math.PI * r;
    return `<div class="ring ${cls}" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}" style="--c:${c}"/></svg><span>${Math.round(v)}<small>%</small></span></div>`;
  };
  NK.ring = ring;
  const isFav = id => App.data.favs.includes(id);
  const favBtn = (id, big) => `<button class="fav ${isFav(id) ? 'on' : ''} ${big ? 'fav-big' : ''}" data-act="fav" data-id="${id}" aria-pressed="${isFav(id)}" aria-label="${esc(isFav(id) ? t('fav_remove') : t('fav_add'))}" title="${esc(isFav(id) ? t('fav_remove') : t('fav_add'))}">${icon('heart')}${big ? '<span>' + esc(isFav(id) ? t('fav_remove') : t('fav_add')) + '</span>' : ''}</button>`;
  const inFrame = () => { try { return window.self !== window.top; } catch (e) { return true; } };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };

  /* Simulator ↔ profession mapping */
  NK.SIM_FOR = Object.assign({ dev: 'prog', data: 'prog', ai: 'prog', cyber: 'prog', graphic: 'design', ux: 'design', anim: 'design', econ: 'econ', fin: 'econ', entre: 'econ', supply: 'econ', doctor: 'doctor', nurse: 'doctor', pharm: 'doctor', mecheng: 'engineer', civeng: 'engineer', archi: 'engineer', roboeng: 'engineer', journ: 'journal', smm: 'journal', pr: 'journal' }, NK.SIM_FOR || {});

  /* ---------------- Radar chart (SVG) ---------------- */
  function radar(sc, prev, keysIn, labelFn) {
    const keys = keysIn || NK.KEYS.int, W = 340, cx = W / 2, cy = W / 2, R = 118;
    const lab = labelFn || (k => k); const val = k => (sc[k] == null ? 0 : sc[k]);
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / keys.length; return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100]; };
    let g = '';
    [25, 50, 75, 100].forEach(l => { g += `<polygon class="rg" points="${keys.map((k, i) => pt(i, l).join(',')).join(' ')}"/>`; });
    keys.forEach((k, i) => { const [x, y] = pt(i, 100); g += `<line class="rg" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`; });
    [50, 100].forEach(l => { const [x, y] = pt(0, l); g += `<text class="rtick" x="${x + 4}" y="${y + 3}">${l}</text>`; });
    if (prev) g += `<polygon class="rprev" points="${keys.map((k, i) => pt(i, prev[k] || 0).join(',')).join(' ')}"/>`;
    g += `<polygon class="rshape" points="${keys.map((k, i) => pt(i, val(k)).join(',')).join(' ')}"/>`;
    keys.forEach((k, i) => {
      const [x, y] = pt(i, val(k)); const [lx, ly] = pt(i, 128);
      const anchor = Math.abs(lx - cx) < 5 ? 'middle' : lx > cx ? 'start' : 'end';
      g += `<g class="rpt" tabindex="0"><circle cx="${x}" cy="${y}" r="5"/><title>${esc(keysIn ? lab(k) : t('k_' + k))}: ${sc[k] == null ? '—' : sc[k] + '%'}</title></g>`;
      g += `<text class="rlbl" x="${lx}" y="${ly + 4}" text-anchor="${anchor}"><tspan class="rl-k">${esc(lab(k))}</tspan> <tspan class="rl-v">${sc[k] == null ? '—' : sc[k] + '%'}</tspan></text>`;
    });
    return `<svg class="radar" viewBox="-70 -10 ${W + 140} ${W + 20}" role="img" aria-label="${esc(keys.join(', '))}">${g}</svg>`;
  }

  /* ---------------- Header / navigation (grouped by the 5 journey stages) ---------------- */
  const NAVG = [
    ['dashboard', 'nav_dash', 'home', null],
    ['discover', 'stage_discover', 'compass', [['tests', 'nav_tests', 'clipboard-list'], ['me', 'nav_me', 'user-round']]],
    ['explore', 'stage_explore', 'search', [['recs', 'nav_recs', 'trophy'], ['careers', 'nav_careers', 'search']]],
    ['experience', 'stage_experience', 'play', [['sim', 'nav_sim', 'play']]],
    ['compare', 'stage_compare', 'swords', [['compare', 'nav_compare', 'swords'], ['unt', 'nav_unt', 'clipboard-list'], ['unis', 'nav_unis', 'school']]],
    ['plan', 'stage_plan', 'route', [['roadmap', 'nav_road', 'route'], ['mentor', 'nav_mentor', 'bot'], ['reports', 'nav_reports', 'file-text']]]
  ];
  const NAV_FLAT = [].concat(...NAVG.map(g => (g[3] ? g[3] : [[g[0], g[1], g[2]]])));
  function renderHeader(active) {
    const u = me();
    const link = ([h, k, ic], cls) => `<a href="#${h}" class="${cls} ${active === h ? 'on' : ''}" ${active === h ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(t(k))}</span></a>`;
    const top = NAVG.map(g => {
      if (!g[3]) return link([g[0], g[1], g[2]], 'nav-a');
      if (g[3].length === 1) return link([g[3][0][0], g[1], g[2]], 'nav-a');
      const on = g[3].some(x => x[0] === active);
      return `<div class="dd"><button class="nav-a ${on ? 'on' : ''}" data-act="dd" aria-expanded="false" aria-haspopup="true">${icon(g[2])}<span>${esc(t(g[1]))}</span>${icon('chevron-down', 'dd-ch')}</button><div class="dd-menu" hidden>${g[3].map(x => link(x, 'dd-a')).join('')}</div></div>`;
    }).join('');
    const drawer = NAVG.map(g => `<div class="dr-g">${g[3] ? `<p class="dr-h">${esc(t(g[1]))}</p>${g[3].map(x => link(x, 'nav-a')).join('')}` : link([g[0], g[1], g[2]], 'nav-a')}</div>`).join('');
    const langs = ['kz', 'ru', 'en'].map(l => `<button data-act="lang" data-l="${l}" class="${App.lang === l ? 'on' : ''}" aria-pressed="${App.lang === l}">${l.toUpperCase()}</button>`).join('');
    const acct = u
      ? `${u.role === 'teacher' ? `<a href="#teacher" class="icon-btn" title="${esc(t('teacher'))}" aria-label="${esc(t('teacher'))}">${icon('users')}</a>` : ''}<a href="#profile" class="acct" title="${esc(t('acct_h'))}"><span class="avatar">${esc(u.nick.slice(0, 1).toUpperCase())}</span><span class="acct-n">${esc(u.nick)}</span></a>`
      : `<a href="#login" class="btn btn-ghost btn-sm">${esc(t('login'))}</a><a href="#register" class="btn btn-lime btn-sm hide-sm">${esc(t('register'))}</a>`;
    $('#hdr').innerHTML = `<div class="hdr-in">
      <a href="#home" class="logo" aria-label="N-KELL">${logoSvg()}<span>N<i>-</i>KELL</span></a>
      <nav class="nav" aria-label="main">${top}</nav>
      <div class="hdr-r"><div class="langs" role="group" aria-label="Language">${langs}</div>${acct}
      <button class="burger" data-act="menu" aria-label="${esc(t('menu'))}" aria-expanded="false">${icon('menu')}</button></div></div>
      <div class="drawer" id="drawer" hidden><nav>${drawer}<div class="dr-g">${u ? `<a href="#profile" class="nav-a">${icon('user')}<span>${esc(t('acct_h'))}</span></a>${u.role === 'teacher' ? `<a href="#teacher" class="nav-a">${icon('users')}<span>${esc(t('teacher'))}</span></a>` : ''}` : `<a href="#login" class="nav-a">${icon('log-in')}<span>${esc(t('login'))}</span></a><a href="#register" class="nav-a">${icon('user-plus')}<span>${esc(t('register'))}</span></a>`}</div></nav></div>`;
  }
  function logoSvg() {
    return `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B70F5"/><stop offset="1" stop-color="#5B3FD9"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#lg1)"/><path d="M9 23V9l14 14V9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23" cy="9" r="3" fill="#C4F36B"/></svg>`;
  }

  function renderFooter() {
    $('#ftr').innerHTML = `<div class="wrap ftr-grid">
      <div><a href="#home" class="logo">${logoSvg()}<span>N<i>-</i>KELL</span></a><p class="muted">${esc(t('foot_about'))}</p></div>
      <div><h4>${esc(t('foot_links'))}</h4>${NAV_FLAT.map(([h, k]) => `<a href="#${h}">${esc(t(k))}</a>`).join('')}<a href="#teacher">${esc(t('teacher'))}</a></div>
      <div><h4>${esc(t('foot_priv'))}</h4><ul class="ftr-l">${['foot_p1', 'foot_p2', 'foot_p3'].map(k => `<li>${icon('lock')} ${esc(t(k))}</li>`).join('')}</ul></div>
    </div><div class="wrap ftr-b"><span>© 2026 N-KELL</span><span>Discover yourself. Design your future.</span></div>`;
  }

  /* ---------------- PAGE: Home ---------------- */
  function heroArt() {
    const paths = [
      ['M20 60 C 140 60, 170 200, 300 210', '#8B70F5'], ['M10 150 C 120 150, 180 205, 300 210', '#C4F36B'],
      ['M30 260 C 130 260, 190 215, 300 210', '#7DD3FC'], ['M40 360 C 150 340, 200 230, 300 210', '#F0ABFC'],
      ['M100 20 C 160 100, 220 170, 300 210', '#FCD34D'], ['M110 400 C 180 320, 230 250, 300 210', '#8B70F5']
    ];
    const chips = [['code-2', 'IT', 40, 48], ['stethoscope', 'Med', 4, 138], ['palette', 'Design', 18, 250], ['scale', 'Law', 30, 352], ['cog', 'Eng', 92, 6], ['sprout', 'Eco', 104, 392]];
    return `<div class="hero-art" aria-hidden="true">
      <svg viewBox="0 0 520 430" class="paths">
        <defs><radialGradient id="core" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#E9E3FF"/><stop offset=".35" stop-color="#A893FF"/><stop offset="1" stop-color="#4B2FC0"/></radialGradient>
        <radialGradient id="glow"><stop offset="0" stop-color="#8B70F5" stop-opacity=".55"/><stop offset="1" stop-color="#8B70F5" stop-opacity="0"/></radialGradient>
        <linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="#C4F36B"/><stop offset="1" stop-color="#C4F36B" stop-opacity="0"/></linearGradient></defs>
        <circle cx="300" cy="210" r="120" fill="url(#glow)"/>
        ${paths.map(([d, c], i) => `<path d="${d}" stroke="${c}" class="flow" style="--d:${i * 0.4}s"/><path d="${d}" stroke="${c}" class="flow-base"/>`).join('')}
        <path d="M300 210 L 510 210" stroke="url(#beam)" stroke-width="4" stroke-linecap="round" class="beam"/>
        <circle cx="300" cy="210" r="44" fill="url(#core)"/>
        <ellipse cx="300" cy="210" rx="72" ry="20" class="orbit"/>
        <ellipse cx="300" cy="210" rx="20" ry="72" class="orbit o2"/>
        <circle cx="286" cy="194" r="10" fill="#fff" opacity=".55"/>
      </svg>
      ${chips.map(([ic, l, x, y], i) => `<span class="chip-f" style="left:${x / 5.2}%;top:${y / 4.3}%;--i:${i}">${icon(ic)}${l}</span>`).join('')}
      <span class="chip-goal">${icon('target')}${App.lang === 'en' ? 'Your path' : App.lang === 'ru' ? 'Твой путь' : 'Сенің жолың'}</span>
    </div>`;
  }

  function pageHome() {
    const feat = ['dev', 'doctor', 'ux', 'data', 'archi', 'entre', 'psych', 'ecol'].map(id => profCard(NK.PROF[id])).join('');
    const statN = [[NK.TESTS.length + 1, 'st_tests'], [NK.PROFS.length, 'st_p'], [Object.keys(NK.SIMS).length, 'st_s'], [NK.UNIS.length, 'st_u']];
    const started = App.data.results.length || Object.keys(App.data.tests || {}).length || Object.keys(App.data.sims || {}).length;
    return `
    <section class="hero"><div class="wrap hero-grid">
      <div class="hero-txt">
        <span class="eyebrow">${icon('sparkles')} ${esc(t('hero_eyebrow'))}</span>
        <h1>${esc(t('hero_h'))}</h1>
        <p class="lead">${esc(t('hero_sub'))}</p>
        <div class="cta-row"><a href="#tests" class="btn btn-lime btn-lg">${esc(t('cta_test'))} ${icon('arrow-right')}</a><a href="#careers" class="btn btn-glass btn-lg">${icon('search')} ${esc(t('cta_explore'))}</a>${started ? `<a href="#dashboard" class="btn btn-ghost btn-lg">${icon('home')} ${esc(t('nav_dash'))}</a>` : ''}</div>
        <p class="hero-note">${icon('check-circle-2')} ${esc(t('hero_note'))}</p>
      </div>${heroArt()}</div></section>

    <section class="sec"><div class="wrap">
      <h2 class="h2">${esc(t('how_h'))}</h2>
      <div class="steps">${[1, 2, 3].map(i => `<div class="step glass"><span class="step-n">${i}</span>${icon(['clipboard-list', 'bar-chart-3', 'route'][i - 1], 'step-ic')}<h3>${esc(t('how_' + i))}</h3><p>${esc(t('how_' + i + 'd'))}</p></div>`).join('')}</div>
      <div class="journey home-j">${[['discover', 'compass', 'tests'], ['explore', 'search', 'recs'], ['experience', 'play', 'sim'], ['compare', 'swords', 'compare'], ['plan', 'route', 'roadmap']].map(([k, ic, h], i) => `<a href="#${h}" class="jstep"><span>${i + 1}</span>${icon(ic)}<b>${esc(t('stage_' + k))}</b><small>${esc(t('stage_' + k + '_d'))}</small></a>`).join('')}</div>
    </div></section>

    <section class="sec light"><div class="wrap">
      <div class="sec-head"><h2 class="h2">${esc(t('stats_h'))}</h2></div>
      <div class="stats four">${statN.map(([n, k]) => `<div class="stat"><b>${n}</b><span>${esc(t(k))}</span></div>`).join('')}</div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head"><div><h2 class="h2">${esc(t('cats_h'))}</h2><p class="muted">${esc(t('cats_sub'))}</p></div><a href="#careers" class="btn btn-ghost">${esc(t('see_all'))} ${icon('arrow-right')}</a></div>
      <div class="cats">${NK.CATS.map(c => `<button class="cat" data-act="gocat" data-cat="${c.id}">${icon(c.icon)}<span>${esc(L(c.n))}</span><small>${NK.PROFS.filter(p => p.cat === c.id).length}</small></button>`).join('')}</div>
    </div></section>

    <section class="sec"><div class="wrap why">
      <h2 class="h2">${esc(t('why_h'))}</h2>
      <div class="why-grid">${[1, 2, 3].map(i => `<div class="why-i">${icon(['target', 'timer', 'trending-up'][i - 1])}<h3>${esc(t('why_' + i))}</h3><p>${esc(t('why_' + i + 'd'))}</p></div>`).join('')}</div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head"><h2 class="h2">${esc(t('feat_h'))}</h2><a href="#careers" class="btn btn-ghost">${esc(t('see_all'))} ${icon('arrow-right')}</a></div>
      <div class="pgrid">${feat}</div>
    </div></section>

    <section class="sec light"><div class="wrap">
      <h2 class="h2">${esc(t('trust_h'))}</h2>
      <div class="testis">${[['shield-check', 1], ['lock', 2], ['scale', 3]].map(([ic, i]) => `<div class="testi">${icon(ic, 'trust-ic')}<h3>${esc(t('trust_' + i))}</h3><p>${esc(t('trust_' + i + 'd'))}</p></div>`).join('')}</div>
    </div></section>

    <section class="sec"><div class="wrap"><div class="final">
      <h2>${esc(t('final_h'))}</h2><p>${esc(t('final_sub'))}</p>
      <a href="#tests" class="btn btn-lime btn-lg">${esc(t('cta_test'))} ${icon('arrow-right')}</a>
    </div></div></section>`;
  }

  function profCard(p, m) {
    if (m === undefined) { const r = unified(); m = r ? r.byId[p.id] : null; }
    const desc = NK.pc(p, 'd');
    return `<article class="pcard" data-act="open" data-id="${p.id}" tabindex="0" role="link" aria-label="${esc(pname(p))}">
      <div class="pcard-top"><span class="pic">${icon(p.icon)}</span>${favBtn(p.id)}</div>
      <span class="pcat">${esc(catName(p.cat))}</span>
      <h3>${esc(pname(p))}</h3>
      <p>${esc(desc.length > 120 ? desc.slice(0, 118) + '…' : desc)}</p>
      <div class="pcard-b"><span class="code">${p.code.split('').map(c => `<i class="c-${c}">${c}</i>`).join('')}</span>${m ? `<span class="mpill">${m.total}% ${esc(t('match'))}</span>` : `<span class="more">${esc(t('res_open'))} ${icon('arrow-right')}</span>`}</div>
    </article>`;
  }

  /* ---------------- PAGE: Test ---------------- */
  const answeredCount = () => NK.QUESTIONS.filter(q => isAnswered(q, App.data.answers[q.id])).length;
  function isAnswered(q, a) { if (a == null) return false; if (q.type === 'multi') return Array.isArray(a) && a.length > 0; return true; }

  function pageTest() {
    if (App.testView === 'done') return testDone();
    if (App.testView === 'q') return testQuestion();
    const n = answeredCount();
    return `<section class="page"><div class="wrap narrow">
      <span class="eyebrow">${icon('compass')} ${NK.QUESTIONS.length} · RIASEC</span>
      <h1 class="h1">${esc(t('test_h'))}</h1>
      <p class="lead">${esc(t('test_intro'))}</p>
      <div class="dims">${NK.DIMS.map((d, i) => { const qs = NK.QUESTIONS.filter(q => q.dim === d.id); const a = qs.filter(q => isAnswered(q, App.data.answers[q.id])).length; return `<div class="dim glass"><span class="dim-i">${icon(d.icon)}</span><div><b>${i + 1}. ${esc(t('dim_' + d.id))}</b><small>${a}/${qs.length} ${esc(t('answered'))}</small></div><div class="mini-bar"><i style="--w:${a / qs.length * 100}%"></i></div></div>`; }).join('')}</div>
      <div class="warn">${icon('info')}<p>${esc(t('test_disclaimer'))}</p></div>
      <div class="cta-row">${n > 0 && n < NK.QUESTIONS.length ? `<button class="btn btn-lime btn-lg" data-act="test-go">${esc(t('test_continue'))} (${n}/${NK.QUESTIONS.length}) ${icon('arrow-right')}</button><button class="btn btn-ghost" data-act="test-reset">${icon('rotate-ccw')} ${esc(t('test_restart'))}</button>` : `<button class="btn btn-lime btn-lg" data-act="test-go">${esc(t('test_start'))} ${icon('arrow-right')}</button>`}</div>
      <p class="muted tiny">${icon('lock')} ${esc(t('test_saved'))}</p>
    </div></section>`;
  }

  function testQuestion() {
    const qi = Math.min(App.data.qi, NK.QUESTIONS.length - 1);
    const q = NK.QUESTIONS[qi]; const a = App.data.answers[q.id]; const Q = qT(q);
    const dimIdx = NK.DIMS.findIndex(d => d.id === q.dim);
    const n = answeredCount(); const total = NK.QUESTIONS.length;
    let body = '';
    if (q.type === 'scale') {
      body = `<div class="scale" role="radiogroup" aria-label="${esc(Q.t)}">${[1, 2, 3, 4, 5].map(v => `<button class="sc ${a === v ? 'on' : ''}" data-act="ans" data-v="${v}" role="radio" aria-checked="${a === v}"><b>${v}</b><span>${esc(t('scale_' + v))}</span></button>`).join('')}</div>`;
    } else {
      const multi = q.type === 'multi';
      body = `<div class="opts ${q.options.length > 5 ? 'two' : ''}" role="${multi ? 'group' : 'radiogroup'}">${q.options.map((o, i) => { const on = multi ? (a || []).includes(i) : a === i; return `<button class="opt ${on ? 'on' : ''}" data-act="ans" data-v="${i}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}"><span class="opt-k">${multi ? icon(on ? 'check' : 'plus') : String.fromCharCode(65 + i)}</span><span>${esc(Q.o[i])}</span></button>`; }).join('')}</div>`;
      if (multi) body += `<p class="muted tiny">${(a || []).length}/${q.max} ${esc(t('selected'))}</p>`;
    }
    return `<section class="page test-pg"><div class="wrap narrow">
      <div class="tprog"><div class="tprog-top"><span>${esc(t('q_of'))} <b>${qi + 1}</b> / ${total}</span><span class="dimchip">${icon(NK.DIMS[dimIdx].icon)} ${dimIdx + 1}/5 · ${esc(t('dim_' + q.dim))}</span></div>
      <div class="tbar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i style="--w:${n / total * 100}%"></i></div>
      <div class="tdots">${NK.DIMS.map((d, i) => `<span class="${i < dimIdx ? 'past' : i === dimIdx ? 'cur' : ''}"></span>`).join('')}</div></div>
      <div class="qcard glass" key="${q.id}">
        ${q.scene ? `<div class="scene">${icon('lightbulb')}<div><small>${esc(t('situation'))}</small><p>${esc(Q.s)}</p></div></div>` : ''}
        <h2 class="qtext">${esc(Q.t)}</h2>
        ${Q.h ? `<p class="qhint">${esc(Q.h)}</p>` : ''}
        ${body}
      </div>
      <div class="tnav"><button class="btn btn-ghost" data-act="q-back">${icon('arrow-left')} ${esc(t('back'))}</button>
      ${qi === total - 1 ? `<button class="btn btn-lime" data-act="q-finish" ${n < total ? 'disabled' : ''}>${esc(t('finish'))} ${icon('check')}</button>` : `<button class="btn btn-violet" data-act="q-next" ${isAnswered(q, a) ? '' : 'disabled'}>${esc(t('next'))} ${icon('arrow-right')}</button>`}</div>
      ${qi === total - 1 && n < total ? `<p class="muted tiny center">${n}/${total} ${esc(t('answered'))}</p>` : ''}
    </div></section>`;
  }

  function testDone() {
    return `<section class="page"><div class="wrap narrow center done">
      <div class="burst" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg;--d:${(i % 4) * 0.05}s"></i>`).join('')}
      <svg viewBox="0 0 120 120" class="done-svg"><circle cx="60" cy="60" r="52" class="dc"/><path d="M38 62 L54 77 L84 45" class="dk"/></svg></div>
      <h1 class="h1">${esc(t('done_h'))}</h1><p class="lead" id="done-sub">${esc(t('done_sub'))}</p>
      <a href="#results" class="btn btn-lime btn-lg done-btn">${esc(t('see_results'))} ${icon('arrow-right')}</a>
    </div></section>`;
  }

  function finishTest() {
    const scores = computeScores(App.data.answers);
    const an = analyze(scores);
    App.data.results.push({ date: new Date().toISOString(), scores, code: an.code, top: an.top10.map(m => m.id), dirs: an.dirs.slice(0, 5).map(d => d.id) });
    App.data.road.done.s1_test = true;
    save();
    App.testView = 'done'; render();
  }

  /* ---------------- PAGE: Results ---------------- */
  function pageResults() {
    const A = latestAnalysis();
    if (!A) return `<section class="page"><div class="wrap narrow center empty"><div class="empty-ic">${icon('bar-chart-3')}</div><h1 class="h1">${esc(t('res_none_h'))}</h1><p class="lead">${esc(t('res_none'))}</p><a href="#test" class="btn btn-lime btn-lg">${esc(t('cta_test'))} ${icon('arrow-right')}</a></div></section>`;
    const sc = A.scores;
    const prev = App.data.results.length > 1 ? App.data.results[App.data.results.length - 2].scores : null;
    const d = new Date(A.date);
    const portrait = A.riasec.slice(0, 2).map(k => `<p>${esc(t('rd_' + k))}</p>`).join('');
    const bars = (keys) => keys.slice().sort((a, b) => sc[b] - sc[a]).map(k => bar(t('k_' + k), sc[k])).join('');
    const legend = ['int', 'ab', 'pe', 'va', 'en'].map(k => `<span><i class="lg-${k}"></i>${esc(t('dim_' + k))} ×${NK.WEIGHTS[k] * 100}%</span>`).join('');
    const stack = m => `<div class="stack" title="${esc(t('res_breakdown'))}">${['int', 'ab', 'pe', 'va', 'en'].map(k => `<i class="lg-${k}" style="width:${NK.WEIGHTS[k] * m.parts[k]}%" title="${esc(t('dim_' + k))}: ${Math.round(m.parts[k])}% × ${NK.WEIGHTS[k]}"></i>`).join('')}</div>`;
    const rec = (m, i) => {
      const p = NK.PROF[m.id];
      const keysAll = [...new Set(p.code.split('').concat(p.ab, p.pe, p.va, p.en))];
      const good = keysAll.filter(k => sc[k] >= 60).sort((a, b) => sc[b] - sc[a]).slice(0, 4);
      const weak = p.ab.filter(k => sc[k] < 55);
      const open = App.ui.openRec === m.id;
      return `<li class="rec ${open ? 'open' : ''}">
        <div class="rec-h" data-act="rec" data-id="${m.id}" role="button" tabindex="0" aria-expanded="${open}">
          <span class="rank">${i + 1}</span><span class="pic sm">${icon(p.icon)}</span>
          <div class="rec-n"><b>${esc(pname(p))}</b><small>${esc(catName(p.cat))} · ${p.code}</small>${stack(m)}</div>
          ${ring(m.total, 52)}<span class="chev">${icon('chevron-down')}</span></div>
        <div class="rec-b" ${open ? '' : 'hidden'}>
          <div class="rec-grid">
            <div><h4>${icon('lightbulb')} ${esc(t('res_why'))}</h4><p>${esc(t('res_why_text', { name: pname(p), code: p.code.split('').map(c => t('k_' + c)).join(', '), int: Math.round(m.parts.int), ab: Math.round(m.parts.ab) }))}</p></div>
            <div><h4>${icon('check-circle-2')} ${esc(t('res_match_with'))}</h4>${good.length ? `<ul class="chips">${good.map(k => `<li class="chip-ok">${esc(t('k_' + k))} · ${sc[k]}%</li>`).join('')}</ul>` : `<p class="muted">${esc(t('res_none_strong'))}</p>`}</div>
            <div><h4>${icon('trending-up')} ${esc(t('res_improve'))}</h4>${weak.length ? `<ul class="chips">${weak.map(k => `<li class="chip-warn">${esc(t('k_' + k))} · ${sc[k]}%</li>`).join('')}</ul>` : `<p class="muted">${esc(t('res_nothing_improve'))}</p>`}</div>
            <div><h4>${icon('book-open')} ${esc(t('res_subjects'))}</h4><ul class="chips">${p.subj.map(s => `<li>${esc(NK.subjName(s))}</li>`).join('')}</ul></div>
          </div>
          <div class="rec-parts">${['int', 'ab', 'pe', 'va', 'en'].map(k => `<div><small>${esc(t('dim_' + k))}</small><b>${Math.round(m.parts[k])}%</b></div>`).join('')}</div>
          <div class="cta-row"><a class="btn btn-violet btn-sm" href="#career-${p.id}">${esc(t('res_open'))} ${icon('arrow-right')}</a>${NK.SIM_FOR[p.id] ? `<a class="btn btn-ghost btn-sm" href="#sim-${NK.SIM_FOR[p.id]}">${icon('play')} ${esc(t('p_sim'))}</a>` : ''}${favBtn(p.id, true)}</div>
        </div></li>`;
    };
    const mini = m => { const p = NK.PROF[m.id]; return `<a class="mini" href="#career-${p.id}"><span class="pic sm">${icon(p.icon)}</span><span><b>${esc(pname(p))}</b><small>${esc(catName(p.cat))} · ${p.code}</small></span><span class="mpill">${m.total}%</span></a>`; };
    return `<section class="page res" id="report"><div class="wrap">
      <div class="res-head">
        <div><span class="eyebrow">${icon('sparkles')} ${esc(t('res_date'))}: ${d.toLocaleDateString(App.lang === 'en' ? 'en-GB' : 'ru-RU')}</span><h1 class="h1">${esc(t('res_h'))}</h1>
          <div class="hcode"><small>${esc(t('res_code'))}</small><div>${A.code.split('').map(c => `<span class="c-${c}"><b>${c}</b><em>${esc(t('k_' + c).replace(/\s*\(.\)/, ''))}</em></span>`).join('')}</div></div></div>
        <div class="res-actions no-print"><button class="btn btn-lime" data-act="pdf">${icon('download')} ${esc(t('res_pdf'))}</button><button class="btn btn-ghost" data-act="retake">${icon('rotate-ccw')} ${esc(t('res_retake'))}</button></div>
      </div>
      <div class="warn">${icon('info')}<p>${esc(t('test_disclaimer'))} ${esc(t('res_match_note'))}</p></div>
      <a class="nstep" href="#recs"><span class="nstep-ic">${icon('trophy')}</span><div><small>${esc(t('ex_title'))}</small><b>${esc(t('ex_banner'))}</b></div>${icon('arrow-right')}</a>

      <div class="res-grid">
        <div class="card"><h3>${esc(t('res_radar'))}</h3>${radar(sc, prev)}${prev ? `<p class="tiny muted center"><i class="lg-prev"></i> ${App.lang === 'en' ? 'dashed: previous test' : App.lang === 'ru' ? 'пунктир: прошлый тест' : 'пунктир: алдыңғы тест'}</p>` : ''}</div>
        <div class="card portrait"><h3>${esc(t('profile_text_h'))}</h3>${portrait}
          <div class="sum3">
            <div><h4>${icon('zap')} ${esc(t('res_strengths'))}</h4><ul class="chips">${A.strengths.map(k => `<li class="chip-ok">${esc(t('k_' + k))} · ${sc[k]}%</li>`).join('')}</ul></div>
            <div><h4>${icon('trending-up')} ${esc(t('res_grow'))}</h4><ul class="chips">${A.grow.map(k => `<li class="chip-warn">${esc(t('k_' + k))} · ${sc[k]}%</li>`).join('')}</ul></div>
            <div><h4>${icon('map-pin')} ${esc(t('res_env'))}</h4><ul class="chips">${A.envs.concat([A.rhythm]).map(k => `<li>${esc(t('k_' + k))}</li>`).join('')}</ul></div>
          </div></div>
      </div>

      <div class="bars4">
        <div class="card"><h3>${icon('zap')} ${esc(t('res_abil'))}</h3>${bars(NK.KEYS.ab)}</div>
        <div class="card"><h3>${icon('user-round')} ${esc(t('res_pers'))}</h3>${bars(NK.KEYS.pe)}</div>
        <div class="card"><h3>${icon('gem')} ${esc(t('res_vals'))}</h3>${bars(NK.KEYS.va)}</div>
        <div class="card"><h3>${icon('map-pin')} ${esc(t('res_envs'))}</h3>${bars(NK.KEYS.en)}</div>
      </div>

      <div class="card"><h3>${icon('compass')} ${esc(t('res_dirs'))}</h3>
        <div class="dirs">${A.dirs.slice(0, 5).map((dd, i) => { const c = NK.CATS.find(x => x.id === dd.id); return `<button class="dir" data-act="gocat" data-cat="${c.id}"><span class="rank">${i + 1}</span>${icon(c.icon)}<span class="dir-n">${esc(L(c.n))}</span><div class="bar"><i style="--w:${dd.score}%"></i></div><b>${dd.score}%</b></button>`; }).join('')}</div></div>

      <div class="card"><div class="sec-head"><h3>${icon('trophy')} ${esc(t('res_top'))}</h3><div class="legend">${legend}</div></div>
        <ol class="recs">${A.top10.map(rec).join('')}</ol>
        <p class="tiny muted">${esc(t('res_match_note'))}</p></div>

      <div class="res-grid">
        <div class="card"><h3>${icon('shuffle')} ${esc(t('res_alt'))}</h3><div class="minis">${A.alt.map(mini).join('')}</div></div>
        <div class="card"><h3>${icon('sparkle')} ${esc(t('res_unexp'))}</h3><p class="muted tiny">${esc(t('res_unexp_d'))}</p><div class="minis">${A.unexp.map(mini).join('')}</div></div>
      </div>

      <div class="card"><h3>${icon('target')} ${esc(t('res_skills'))}</h3>
        ${A.skills.length ? `<div class="skills">${A.skills.map(s => `<div class="skill"><div>${bar(t('k_' + s.k), sc[s.k], 'warn')}</div><small>${s.profs.map(id => esc(pname(NK.PROF[id]))).join(', ')}</small></div>`).join('')}</div>` : `<p class="muted">${esc(t('res_nothing_improve'))}</p>`}
        <a href="#roadmap" class="btn btn-violet btn-sm no-print">${icon('route')} ${esc(t('nav_road'))}</a></div>

      <details class="card method"><summary>${icon('info')} ${esc(t('res_method_h'))}</summary><p>${esc(t('res_method'))}</p>
        <div class="formula"><code>match = 0.40·Interest + 0.25·Ability + 0.15·Personality + 0.10·Values + 0.10·Environment</code><code>Interest = 0.5·S(code₁) + 0.3·S(code₂) + 0.2·S(code₃)</code><code>S(scale) = earned points ÷ max possible points × 100</code></div></details>

      ${App.data.results.length > 1 ? `<div class="card"><h3>${icon('calendar')} ${esc(t('res_history'))}</h3><ul class="hist">${App.data.results.slice().reverse().map(r => `<li><span>${new Date(r.date).toLocaleDateString(App.lang === 'en' ? 'en-GB' : 'ru-RU')}</span><b>${r.code}</b><span class="muted">${r.top.slice(0, 3).map(id => esc(pname(NK.PROF[id]))).join(', ')}</span></li>`).join('')}</ul></div>` : ''}
    </div></section>`;
  }

  function reportText() {
    const A = latestAnalysis(); if (!A) return '';
    const sc = A.scores; const lines = [];
    lines.push('N-KELL — ' + t('res_h'), t('res_date') + ': ' + new Date(A.date).toLocaleDateString(), '', t('res_code') + ': ' + A.code, '');
    lines.push(t('res_radar') + ':'); NK.KEYS.int.forEach(k => lines.push('  ' + t('k_' + k) + ': ' + sc[k] + '%'));
    lines.push('', t('res_strengths') + ': ' + A.strengths.map(k => t('k_' + k) + ' ' + sc[k] + '%').join(', '));
    lines.push(t('res_grow') + ': ' + A.grow.map(k => t('k_' + k) + ' ' + sc[k] + '%').join(', '));
    lines.push(t('res_env') + ': ' + A.envs.concat([A.rhythm]).map(k => t('k_' + k)).join(', '), '');
    lines.push(t('res_dirs') + ':'); A.dirs.slice(0, 5).forEach((d, i) => lines.push('  ' + (i + 1) + '. ' + catName(d.id) + ' — ' + d.score + '%'));
    lines.push('', t('res_top') + ':'); A.top10.forEach((m, i) => lines.push('  ' + (i + 1) + '. ' + pname(NK.PROF[m.id]) + ' — ' + m.total + '% (' + NK.PROF[m.id].subj.map(NK.subjName).join(', ') + ')'));
    lines.push('', t('test_disclaimer'), t('res_match_note'));
    return lines.join('\n');
  }

  /* ---------------- PAGE: Careers ---------------- */
  function pageCareers() {
    const f = App.ui.cf = App.ui.cf || { q: '', cat: 'all', fav: false, sort: unified() ? 'match' : 'name' };
    const A = unified();
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('search')} ${NK.PROFS.length} · 12</span>
      <h1 class="h1">${esc(t('car_h'))}</h1><p class="lead">${esc(t('car_sub'))}</p>
      <div class="filters">
        <label class="search">${icon('search')}<input id="car-q" type="search" data-input="car-q" placeholder="${esc(t('search_ph'))}" value="${esc(f.q)}" aria-label="${esc(t('search_ph'))}"></label>
        <button class="tgl ${f.fav ? 'on' : ''}" data-act="car-fav" aria-pressed="${f.fav}">${icon('heart')} ${esc(t('only_favs'))} (${App.data.favs.length})</button>
        <label class="sel-wrap">${esc(t('sort_by'))}<select id="car-sort" data-change="car-sort">${A ? `<option value="match" ${f.sort === 'match' ? 'selected' : ''}>${esc(t('sort_match'))}</option>` : ''}<option value="name" ${f.sort === 'name' ? 'selected' : ''}>${esc(t('sort_name'))}</option></select></label>
      </div>
      <div class="catbar" role="group">${[{ id: 'all', icon: 'layers', n: null }].concat(NK.CATS).map(c => `<button class="cchip ${f.cat === c.id ? 'on' : ''}" data-act="car-cat" data-cat="${c.id}" aria-pressed="${f.cat === c.id}">${icon(c.icon)}${esc(c.n ? L(c.n) : t('all_cats'))}</button>`).join('')}</div>
      <div id="car-list">${careerList()}</div>
    </div></section>`;
  }
  function careerList() {
    const f = App.ui.cf; const A = unified();
    const q = f.q.trim().toLowerCase();
    let list = NK.PROFS.filter(p => (f.cat === 'all' || p.cat === f.cat) && (!f.fav || isFav(p.id)) &&
      (!q || [p.n.kz, p.n.ru, p.n.en, p.d, NK.pc(p, 'd'), p.skills.join(' '), NK.pcl(p, 'skills').join(' '), p.subj.join(' '), p.subj.map(NK.subjName).join(' '), p.study.join(' '), NK.pcl(p, 'study').join(' '), catName(p.cat)].join(' ').toLowerCase().includes(q)));
    if (f.sort === 'match' && A) list.sort((a, b) => (A.byId[b.id] ? A.byId[b.id].total : 0) - (A.byId[a.id] ? A.byId[a.id].total : 0) || a.id.localeCompare(b.id)); else list.sort((a, b) => pname(a).localeCompare(pname(b)));
    return `<p class="muted tiny">${list.length} ${esc(t('results_count'))}</p>` + (list.length ? `<div class="pgrid">${list.map(p => profCard(p, A ? A.byId[p.id] || null : null)).join('')}</div>` : `<div class="empty-s">${icon('search')}<p>${esc(t('no_found'))}</p></div>`);
  }

  /* ---------------- PAGE: Career detail ---------------- */
  function pageCareer(id) {
    const p = NK.PROF[id]; if (!p) return page404();
    if (!App.data.viewed.includes(id)) { App.data.viewed.push(id); App.data.viewed = App.data.viewed.slice(-60); save(); }
    const A = unified(); const m = A && A.byId[id];
    const unis = NK.UNIS.filter(u => u.dirs.includes(p.cat));
    const prog = NK.UNT_PROGRAMS.find(g => g.profs.includes(p.id));
    const day = NK.pday(p);
    const sec = (k, ic, arr) => `<div class="card dsec"><h3>${icon(ic)} ${esc(t(k))}</h3><ul class="dl">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    return `<section class="page"><div class="wrap">
      <a href="#careers" class="back">${icon('arrow-left')} ${esc(t('p_back'))}</a>
      <div class="dhead glass">
        <span class="pic lg">${icon(p.icon)}</span>
        <div class="dhead-t"><span class="pcat">${esc(catName(p.cat))}</span><h1 class="h1">${esc(pname(p))}</h1>
          <p class="muted">${esc([p.n.kz, p.n.ru, p.n.en].filter(x => x !== pname(p)).join(' · '))}</p>
          <div class="dmeta"><span class="code big">${p.code.split('').map(c => `<i class="c-${c}" title="${esc(t('k_' + c))}">${c}</i>`).join('')}</span><small class="muted">${esc(t('p_code'))}: ${p.code.split('').map(c => esc(t('k_' + c))).join(' · ')}</small></div>
          <div class="cta-row">${favBtn(p.id, true)}${NK.SIM_FOR[p.id] ? `<a class="btn btn-ghost btn-sm" href="#sim-${NK.SIM_FOR[p.id]}">${icon('play')} ${esc(t('p_sim'))}</a>` : ''}<button class="btn btn-ghost btn-sm" data-act="cmp-add" data-id="${p.id}">${icon('swords')} ${esc(t('nav_compare'))}</button></div></div>
        <div class="dmatch">${m ? `${ring(m.total, 96)}<small>${esc(t('p_yourmatch'))}</small><small class="tiny muted">${esc(t('cov_short', { p: Math.round(m.coverage * 100) }))}</small>` : `<a href="#tests" class="btn btn-lime btn-sm">${esc(t('p_take_test'))}</a>`}</div>
      </div>
      ${m ? `<div class="res-grid"><div class="card why-box"><h3>${icon('lightbulb')} ${esc(t('rc_why'))}</h3><p>${esc(NK.whyText(m))}</p></div><div class="card"><h3>${icon('alert-triangle')} ${esc(t('rc_chal'))}</h3><ul class="dl">${NK.challengeText(m).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}
      <div class="card"><h3>${icon('file-text')} ${esc(t('p_desc'))}</h3><p class="big-p">${esc(NK.pc(p, 'd'))}</p></div>
      ${day.length ? `<div class="card"><h3>${icon('calendar')} ${esc(t('p_day'))}</h3><ol class="day">${day.map(x => { const i = x.indexOf(' '); return `<li><b>${esc(x.slice(0, i))}</b><span>${esc(x.slice(i + 1))}</span></li>`; }).join('')}</ol><p class="tiny muted">${esc(t('p_day_note'))}</p></div>` : ''}
      <div class="dgrid">
        ${sec('p_duties', 'clipboard-list', NK.pcl(p, 'duties'))}${sec('p_skills', 'zap', NK.pcl(p, 'skills'))}${sec('p_qual', 'user-round', NK.pcl(p, 'qual'))}${sec('p_subj', 'book-open', p.subj.map(NK.subjName))}
        ${sec('p_study', 'graduation-cap', NK.pcl(p, 'study'))}${sec('p_env', 'map-pin', p.en.map(e => t('k_' + e)))}${sec('p_career', 'trending-up', NK.pcl(p, 'career'))}${sec('p_pros', 'check-circle-2', NK.pcl(p, 'pros'))}${sec('p_cons', 'alert-triangle', NK.pcl(p, 'cons'))}
      </div>
      <div class="card"><h3>${icon('rocket')} ${esc(t('p_trend'))}</h3><p class="big-p">${esc(NK.pc(p, 'trend'))}</p></div>
      <div class="dgrid two">
        <div class="card"><h3>${icon('wallet')} ${esc(t('p_salary'))}</h3><p class="muted">${esc(t('p_salary_na'))}</p></div>
        <div class="card"><h3>${icon('clipboard-list')} ${esc(t('p_unt'))}</h3>${prog && prog.combo ? `<p><b>${esc(prog.combo.map(NK.subjName).join(' + '))}</b></p><p><span class="band band-na">${esc(t('unt_unverified'))}</span></p>` : `<p class="muted">${esc(t('p_unt_na'))}</p>`}<p class="tiny muted">${esc(t('p_unt_note'))}</p><a href="#unt" class="btn btn-ghost btn-sm" data-act="unt-pick" data-id="${p.id}">${esc(t('nav_unt'))} ${icon('arrow-right')}</a></div>
      </div>
      <div class="card"><h3>${icon('school')} ${esc(t('p_unis'))}</h3><div class="ulinks">${unis.map(u => `<a href="${u.site}" target="_blank" rel="noopener" class="ulink"><b>${esc(uniName(u))}</b><small>${esc(NK.cityName(u.city))}</small>${icon('external-link')}</a>`).join('')}</div><a href="#unis" class="btn btn-ghost btn-sm">${esc(t('nav_unis'))} ${icon('arrow-right')}</a></div>
      <div class="card"><h3>${icon('network')} ${esc(t('p_rel'))}</h3><div class="minis">${p.rel.filter(r => NK.PROF[r]).map(r => { const rp = NK.PROF[r]; return `<a class="mini" href="#career-${r}"><span class="pic sm">${icon(rp.icon)}</span><span><b>${esc(pname(rp))}</b><small>${esc(catName(rp.cat))}</small></span>${A && A.byId[r] ? `<span class="mpill">${A.byId[r].total}%</span>` : ''}</a>`; }).join('')}</div></div>
    </div></section>`;
  }

  /* ---------------- PAGE: Simulator ---------------- */
  function pageSims() {
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('play')} ${esc(t('stage_experience'))} · ${Object.keys(NK.SIMS).length}</span><h1 class="h1">${esc(t('sim_h'))}</h1><p class="lead">${esc(t('sim_sub'))}</p>
      <div class="warn">${icon('info')}<p>${esc(t('sim_edu'))}</p></div>
      <div class="sgrid">${Object.keys(NK.SIMS).map(id => { const s = NK.SIMS[id]; const r = App.data.sims[id]; return `<a class="scard" href="#sim-${id}"><span class="pic">${icon(s.icon)}</span><div><h3>${esc(L(s.title))}</h3><p>${esc(L(s.teaser))}</p></div><div class="scard-b">${r ? `<span class="chip-ok">${icon('check')} ${esc(t('sim_done'))} · ${r.best}%</span>` : `<span class="more">${esc(t('sim_start'))} ${icon('arrow-right')}</span>`}<span class="muted tiny">${icon('timer')} ~${s.mins} ${esc(t('min'))}</span></div></a>`; }).join('')}</div>
    </div></section>`;
  }
  function pageSim(id) {
    const s = NK.SIMS[id]; if (!s) return page404();
    const r = App.data.sims[id];
    return `<section class="page"><div class="wrap narrow-lg">
      <a href="#sim" class="back">${icon('arrow-left')} ${esc(t('sim_back'))}</a>
      <div class="sim-head"><span class="pic lg">${icon(s.icon)}</span><div><h1 class="h1">${esc(L(s.title))}</h1><p class="lead">${esc(L(s.intro))}</p>${r ? `<span class="chip-ok">${icon('trophy')} ${esc(t('sim_best'))}: ${r.best}%</span>` : ''}</div></div>
      <div class="card"><h3>${icon('target')} ${esc(t('sim_task'))}</h3><p>${esc(L(s.task))}</p></div>
      <div id="sim-stage" class="sim-stage"></div>
      <div class="card"><h3>${icon('zap')} ${esc(t('sim_skills'))}</h3><ul class="chips">${s.skills.map(x => `<li>${esc(L(x))}</li>`).join('')}</ul>
      <p class="tiny muted">${esc(t('sim_edu'))}</p>
      <div class="cta-row">${s.profs.filter(pid => NK.PROF[pid]).map(pid => `<a class="btn btn-ghost btn-sm" href="#career-${pid}">${icon(NK.PROF[pid].icon)} ${esc(pname(NK.PROF[pid]))}</a>`).join('')}</div></div>
    </div></section>`;
  }
  NK.simDone = (id, score, crit) => {
    const prev = App.data.sims[id];
    App.data.sims[id] = { best: Math.max(score, prev ? prev.best : 0), last: score, date: new Date().toISOString(), crit: crit || (prev && prev.crit) || null };
    save();
  };

  /* ---------------- PAGE: Universities ---------------- */
  function pageUnis() {
    const f = App.ui.uf = Object.assign({ q: '', city: 'all', dir: 'all', lv: 'all', uni: 'all', prog: 'all', type: 'all', prof: 'all', mine: false }, App.ui.uf || {});
    const A = unified();
    const cities = [...new Set(NK.UNIS.map(u => u.city))].sort();
    const progs = [...new Set([].concat(...NK.UNIS.map(u => NK.uniProgs(u))))].sort((a, b) => a.localeCompare(b));
    const opt = (v, label, cur) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(label)}</option>`;
    const sel = (id, key, label, opts) => `<label class="sel-wrap" for="${id}">${esc(label)}<select id="${id}" data-change="uni-${key}">${opt('all', t('uni_all'), f[key])}${opts}</select></label>`;
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('school')} ${esc(t('stage_compare'))} · ${NK.UNIS.length}</span><h1 class="h1">${esc(t('uni_h'))}</h1><p class="lead">${esc(t('uni_sub'))}</p>
      <div class="warn">${icon('info')}<p>${esc(t('uni_disclaimer'))} ${esc(t('uni_links_note'))}</p></div>
      <div class="filters wrapf">
        <label class="search">${icon('search')}<input id="uni-q" type="search" data-input="uni-q" placeholder="${esc(t('uni_search'))}" value="${esc(f.q)}" aria-label="${esc(t('uni_search'))}"></label>
        ${sel('uni-city', 'city', t('uni_city'), cities.map(c => opt(c, NK.cityName(c), f.city)).join(''))}
        ${sel('uni-dir', 'dir', t('uni_dir'), NK.CATS.map(c => opt(c.id, L(c.n), f.dir)).join(''))}
        ${sel('uni-prog', 'prog', t('uni_prog'), progs.map(pg => opt(pg, pg, f.prog)).join(''))}
        ${sel('uni-type', 'type', t('uni_type'), Object.keys(NK.UNI_PROFILE_N).map(k => opt(k, L(NK.UNI_PROFILE_N[k]), f.type)).join(''))}
        ${sel('uni-prof', 'prof', t('uni_prof'), NK.PROFS.slice().sort((a, b) => pname(a).localeCompare(pname(b))).map(p => opt(p.id, pname(p), f.prof)).join(''))}
        ${sel('uni-lv', 'lv', t('uni_level'), ['bach', 'mast', 'phd'].map(l => opt(l, t('lv_' + l), f.lv)).join(''))}
        ${sel('uni-uni', 'uni', t('uni_uni'), NK.UNIS.map(u => opt(u.id, uniName(u), f.uni)).join(''))}
        ${A ? `<button class="tgl ${f.mine ? 'on' : ''}" data-act="uni-mine" aria-pressed="${f.mine}">${icon('sparkles')} ${esc(t('uni_for_you'))}</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-act="uni-reset">${icon('rotate-ccw')} ${esc(t('uni_reset'))}</button>
      </div>
      <div id="uni-list">${uniList()}</div>
    </div></section>`;
  }
  function uniList() {
    const f = App.ui.uf; const A = unified(); const myDirs = A ? [...new Set(A.best.map(m => NK.PROF[m.id].cat))].slice(0, 5) : [];
    const q = f.q.trim().toLowerCase(); const profCat = f.prof !== 'all' && NK.PROF[f.prof] ? NK.PROF[f.prof].cat : null;
    const list = NK.UNIS.filter(u => (f.city === 'all' || u.city === f.city) && (f.dir === 'all' || u.dirs.includes(f.dir)) && (f.lv === 'all' || u.lv.includes(f.lv)) && (f.uni === 'all' || u.id === f.uni) &&
      (f.prog === 'all' || NK.uniProgs(u).includes(f.prog)) && (f.type === 'all' || NK.UNI_PROFILE[u.id] === f.type) && (!profCat || u.dirs.includes(profCat)) &&
      (!f.mine || u.dirs.some(d => myDirs.includes(d))) && (!q || [u.n, u.ru, u.en, u.city, NK.cityName(u.city), u.prog.join(' '), NK.uniProgs(u).join(' ')].join(' ').toLowerCase().includes(q)));
    if (!list.length) return `<div class="empty-s">${icon('search')}<p>${esc(t('no_found'))}</p></div>`;
    return `<p class="muted tiny">${list.length} / ${NK.UNIS.length}</p><div class="ugrid">${list.map(u => {
      const profs = NK.PROFS.filter(p => u.dirs.includes(p.cat)).sort((a, b) => (A && A.byId[a.id] && A.byId[b.id] ? A.byId[b.id].total - A.byId[a.id].total : 0)).slice(0, 5);
      const unt = NK.UNT_PROGRAMS.filter(g => g.combo && g.cats.some(c => u.dirs.includes(c))).slice(0, 4).map(g => `<li><small>${esc(L(g.n).split(' (')[0])}:</small> ${esc(g.combo.map(NK.subjName).join(' + '))}</li>`).join('');
      return `<article class="ucard card">
        <div class="uhead"><span class="pic">${icon('school')}</span><div><h3>${esc(uniName(u))}</h3><p class="muted">${icon('map-pin')} ${esc(NK.cityName(u.city))} · ${u.lv.map(l => esc(t('lv_' + l))).join(', ')}</p><p class="tiny muted">${esc(t('uni_type'))}: ${esc(L(NK.UNI_PROFILE_N[NK.UNI_PROFILE[u.id]]))}</p></div></div>
        <div class="udirs">${u.dirs.map(d => `<span class="cchip sm ${myDirs.includes(d) ? 'mine' : ''}">${icon(NK.CATS.find(c => c.id === d).icon)}${esc(catName(d))}</span>`).join('')}</div>
        <h4>${esc(t('uni_progs'))}</h4><ul class="chips">${NK.uniProgs(u).map(pg => `<li>${esc(pg)}</li>`).join('')}</ul>
        <h4>${esc(t('uni_profs'))}</h4><div class="plinks">${profs.map(p => `<a href="#career-${p.id}">${esc(pname(p))}${A && A.byId[p.id] ? ` <small>${A.byId[p.id].total}%</small>` : ''}</a>`).join('')}</div>
        ${unt ? `<h4>${esc(t('uni_unt'))}</h4><ul class="unt">${unt}</ul><p class="tiny muted"><span class="band band-na">${esc(t('unt_unverified'))}</span> ${esc(t('p_unt_note'))}</p>` : ''}
        <p class="tiny muted">${esc(t('uni_fees'))}</p>
        <div class="cta-row"><a class="btn btn-violet btn-sm" href="${u.site}" target="_blank" rel="noopener">${esc(t('uni_site'))} ${icon('external-link')}</a><a class="btn btn-ghost btn-sm" href="${u.site}" target="_blank" rel="noopener">${esc(t('uni_adm'))} ${icon('external-link')}</a></div>
        <p class="tiny muted url">${esc(u.site.replace('https://', ''))}</p>
      </article>`;
    }).join('')}</div>`;
  }

  /* ---------------- PAGE: Auth ---------------- */
  function pageAuth(mode) {
    const reg = mode === 'register';
    return `<section class="page"><div class="wrap auth-wrap"><div class="auth card">
      <div class="auth-logo">${logoSvg()}</div>
      <h1 class="h1 sm">${esc(t(reg ? 'auth_reg_h' : 'auth_login_h'))}</h1>
      <form data-form="${reg ? 'register' : 'login'}" novalidate>
        <label for="a-nick">${esc(t('auth_nick'))}</label><input id="a-nick" autocomplete="username" maxlength="30" required>
        ${reg ? `<div class="two-in"><div><label for="a-grade">${esc(t('auth_grade'))}</label><select id="a-grade">${[9, 10, 11].map(g => `<option ${g === 10 ? 'selected' : ''}>${g}</option>`).join('')}<option value="-">—</option></select></div>
        <div><label for="a-role">${esc(t('auth_role'))}</label><select id="a-role"><option value="student">${esc(t('role_student'))}</option><option value="teacher">${esc(t('role_teacher'))}</option></select></div></div>
        <label for="a-school">${esc(t('auth_school'))}</label><input id="a-school" maxlength="60">` : ''}
        <label for="a-pass">${esc(t('auth_pass'))}</label><input id="a-pass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required>
        <p class="err" id="a-err" role="alert"></p>
        <button class="btn btn-lime btn-lg full" type="submit">${esc(t(reg ? 'auth_submit_reg' : 'auth_submit_login'))}</button>
      </form>
      <a href="#${reg ? 'login' : 'register'}" class="switch">${esc(t(reg ? 'auth_switch_login' : 'auth_switch_reg'))}</a>
      <div class="warn sm">${icon('lock')}<p>${esc(t('auth_local'))}</p></div>
    </div></div></section>`;
  }
  function mergeGuest() {
    const g = S.get(dataKey(null), null);
    if (!g || (!g.results || !g.results.length) && !Object.keys(g.answers || {}).length && !(g.favs || []).length) return false;
    const cur = App.data;
    if (cur.results.length || Object.keys(cur.answers).length) return false;
    App.data = Object.assign(blank(), g); save(); S.del(dataKey(null)); return true;
  }
  function doAuth(mode) {
    const nick = $('#a-nick').value.trim(), pass = $('#a-pass').value, err = $('#a-err');
    if (nick.length < 2 || nick.length > 30) { err.textContent = t('auth_err_nick'); return; }
    if (pass.length < 4) { err.textContent = t('auth_err_pass'); return; }
    const us = users(); const found = Object.values(us).find(u => u.nick.toLowerCase() === nick.toLowerCase());
    if (mode === 'register') {
      if (found) { err.textContent = t('auth_err_exists'); return; }
      const id = 'u' + Date.now().toString(36);
      us[id] = { id, nick, grade: $('#a-grade').value, school: $('#a-school').value.trim(), role: $('#a-role').value, pass: hash(nick.toLowerCase() + ':' + pass), created: new Date().toISOString() };
      S.set('nk_users', us);
      App.uid = id;
    } else {
      if (!found || found.pass !== hash(nick.toLowerCase() + ':' + pass)) { err.textContent = t('auth_err_wrong'); return; }
      App.uid = found.id;
    }
    S.set('nk_session', App.uid); loadData();
    const merged = me().role !== 'teacher' && mergeGuest();
    App.testView = 'intro';
    if (merged) toast(t('auth_merged'));
    location.hash = me().role === 'teacher' ? 'teacher' : 'profile';
  }

  function page404() { return `<section class="page"><div class="wrap narrow center empty"><div class="empty-ic">${icon('compass')}</div><h1 class="h1">${esc(t('page_404'))}</h1><a href="#home" class="btn btn-lime">${esc(t('go_home'))}</a></div></section>`; }

  /* ---------------- Router ---------------- */
  NK.PAGES = NK.PAGES || {}; NK.ACTIONS = NK.ACTIONS || {}; NK.FORMS = NK.FORMS || {}; NK.CHANGES = NK.CHANGES || {}; NK.INPUTS = NK.INPUTS || {};
  function route() {
    const h = (location.hash || '#home').slice(1);
    if (h.startsWith('career-')) return ['careers', () => pageCareer(h.slice(7))];
    if (h.startsWith('sim-')) return ['sim', () => pageSim(h.slice(4)), h.slice(4)];
    if (h.startsWith('test-')) return ['tests', () => (NK.PAGES['test-'] && NK.PAGES['test-'](h.slice(5))) || page404()];
    const map = Object.assign({ home: pageHome, test: pageTest, careers: pageCareers, results: pageResults, sim: pageSims, unis: pageUnis, login: () => pageAuth('login'), register: () => pageAuth('register') }, NK.PAGES);
    delete map['test-'];
    const active = { test: 'tests', results: 'tests' }[h] || h;
    return [map[h] ? active : 'x', map[h] || page404];
  }
  let lastHash = null;
  function render(keepScroll) {
    document.documentElement.lang = App.lang === 'kz' ? 'kk' : App.lang;
    const [active, fn, simId] = route();
    renderHeader(active);
    const v = $('#view');
    v.innerHTML = fn();
    const changed = lastHash !== location.hash;
    if (changed) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); if (!keepScroll) window.scrollTo(0, 0); }
    lastHash = location.hash;
    if (simId && NK.SIMS[simId]) NK.SIMS[simId].render($("#sim-stage"), (score, crit) => NK.simDone(simId, score, crit));
    if (active === 'test' && App.testView === 'done') setTimeout(() => { const s = $('#done-sub'); if (s) s.textContent = t('res_code') + ': ' + (latest() ? latest().code : ''); }, 900);
    document.title = 'N-KELL — ' + (active === 'home' || active === 'x' ? 'Discover yourself. Design your future.' : ($('.h1') ? $('.h1').textContent : ''));
  }
  NK.render = render;
  function rerenderKeep() { const y = window.scrollY; render(true); window.scrollTo(0, y); }

  /* ---------------- Events ---------------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    const q = NK.QUESTIONS[App.data.qi];
    switch (act) {
      case 'lang': App.lang = el.dataset.l; S.set('nk_lang', App.lang); _cache.key = null; rerenderKeep(); renderFooter(); break;
      case 'menu': { const d = $('#drawer'); d.hidden = !d.hidden; el.setAttribute('aria-expanded', String(!d.hidden)); break; }
      case 'dd': { const m = el.nextElementSibling; const open = m.hidden; closeMenus(); m.hidden = !open; el.setAttribute('aria-expanded', String(open)); e.stopPropagation(); break; }
      case 'uni-reset': App.ui.uf = null; rerenderKeep(); break;
      case 'open': if (!e.target.closest('.fav')) location.hash = 'career-' + el.dataset.id; break;
      case 'fav': {
        e.stopPropagation(); e.preventDefault();
        const id = el.dataset.id; const i = App.data.favs.indexOf(id);
        if (i >= 0) { App.data.favs.splice(i, 1); toast(t('toast_fav_rm')); } else { App.data.favs.push(id); toast(t('toast_fav_add')); }
        save();
        if ($('#car-list')) { $('#car-list').innerHTML = careerList(); const b = $('[data-act="car-fav"]'); if (b) b.innerHTML = icon('heart') + ' ' + esc(t('only_favs')) + ' (' + App.data.favs.length + ')'; }
        else rerenderKeep();
        break;
      }
      case 'gocat': App.ui.cf = Object.assign(App.ui.cf || { q: '', fav: false, sort: unified() ? 'match' : 'name' }, { cat: el.dataset.cat, q: '' }); location.hash = 'careers'; break;
      case 'car-cat': App.ui.cf.cat = el.dataset.cat; $$('.cchip', el.parentNode).forEach(b => { b.classList.toggle('on', b === el); b.setAttribute('aria-pressed', String(b === el)); }); $('#car-list').innerHTML = careerList(); break;
      case 'car-fav': App.ui.cf.fav = !App.ui.cf.fav; el.classList.toggle('on', App.ui.cf.fav); el.setAttribute('aria-pressed', String(App.ui.cf.fav)); $('#car-list').innerHTML = careerList(); break;
      case 'car-favonly': App.ui.cf = Object.assign(App.ui.cf || { q: '', cat: 'all', sort: 'name' }, { fav: true }); break;
      case 'uni-mine': App.ui.uf.mine = !App.ui.uf.mine; el.classList.toggle('on', App.ui.uf.mine); $('#uni-list').innerHTML = uniList(); break;
      case 'test-go': App.testView = 'q'; if (App.data.qi >= NK.QUESTIONS.length) App.data.qi = 0; { const firstOpen = NK.QUESTIONS.findIndex(qq => !isAnswered(qq, App.data.answers[qq.id])); if (firstOpen >= 0) App.data.qi = firstOpen; } save(); render(); break;
      case 'test-reset': case 'retake': App.data.answers = {}; App.data.qi = 0; save(); App.testView = 'q'; location.hash === '#test' ? render() : (location.hash = 'test'); break;
      case 'ans': {
        const v = +el.dataset.v;
        if (q.type === 'multi') {
          const cur = (App.data.answers[q.id] || []).slice(); const i = cur.indexOf(v);
          if (i >= 0) cur.splice(i, 1); else if (cur.length < q.max) cur.push(v); else { cur.shift(); cur.push(v); }
          App.data.answers[q.id] = cur; save(); render(true);
        } else {
          App.data.answers[q.id] = v; save(); render(true);
          if (App.data.qi < NK.QUESTIONS.length - 1) setTimeout(() => { if (App.testView === 'q' && NK.QUESTIONS[App.data.qi] === q) { App.data.qi++; save(); render(true); } }, 320);
        }
        break;
      }
      case 'q-next': if (App.data.qi < NK.QUESTIONS.length - 1) { App.data.qi++; save(); render(true); } break;
      case 'q-back': if (App.data.qi > 0) { App.data.qi--; save(); render(true); } else { App.testView = 'intro'; render(); } break;
      case 'q-finish': if (answeredCount() === NK.QUESTIONS.length) finishTest(); break;
      case 'rec': App.ui.openRec = App.ui.openRec === el.dataset.id ? null : el.dataset.id; { const li = el.closest('.rec'); const open = App.ui.openRec === el.dataset.id; $$('.rec').forEach(r => { r.classList.remove('open'); const b = $('.rec-b', r); if (b) b.hidden = true; const h = $('.rec-h', r); if (h) h.setAttribute('aria-expanded', 'false'); }); if (open) { li.classList.add('open'); $('.rec-b', li).hidden = false; el.setAttribute('aria-expanded', 'true'); } } break;
      case 'pdf':
        if (inFrame()) modal(`<h3>${icon('download')} ${esc(t('res_pdf'))}</h3><p>${esc(t('print_blocked'))}</p><textarea id="rep-txt" class="rep-txt" readonly>${esc(reportText())}</textarea><div class="cta-row"><button class="btn btn-lime btn-sm" data-act="copy-rep">${icon('copy')} ${esc(t('copy_report'))}</button><button class="btn btn-ghost btn-sm" data-act="modal-close">OK</button></div>`);
        else { toast(t('print_hint')); setTimeout(() => window.print(), 300); }
        break;
      case 'copy-rep': copyText($('#rep-txt')); break;
      case 'modal-close': closeModal(); break;
      case 'logout': App.uid = null; S.set('nk_session', null); loadData(); App.testView = 'intro'; location.hash = 'home'; break;
      default: if (NK.ACTIONS[act]) NK.ACTIONS[act](el, e);
    }
  });
  function closeMenus() { $$('.dd-menu').forEach(m => { m.hidden = true; }); $$('[data-act="dd"]').forEach(x => x.setAttribute('aria-expanded', 'false')); }
  document.addEventListener('click', e => { if (!e.target.closest('.dd')) closeMenus(); });
  function copyText(ta) {
    if (!ta) return;
    try { navigator.clipboard.writeText(ta.value).then(() => toast(t('copied')), () => { ta.select(); }); } catch (e) { ta.select(); }
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); closeMenus(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act="open"], [data-act="rec"], [data-act="rec2"]')) { e.preventDefault(); e.target.click(); }
  });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('input', e => {
    const k = e.target.dataset.input; if (!k) return;
    if (k === 'car-q') { App.ui.cf.q = e.target.value; $('#car-list').innerHTML = careerList(); }
    if (k === 'uni-q') { App.ui.uf.q = e.target.value; $('#uni-list').innerHTML = uniList(); }
    if (NK.INPUTS[k]) NK.INPUTS[k](e.target, e);
  });
  document.addEventListener('change', e => {
    const k = e.target.dataset.change; if (!k) return;
    if (k === 'car-sort') { App.ui.cf.sort = e.target.value; $('#car-list').innerHTML = careerList(); }
    if (k.startsWith('uni-')) { App.ui.uf[k.slice(4)] = e.target.value; $('#uni-list').innerHTML = uniList(); }
    if (NK.CHANGES[k]) NK.CHANGES[k](e.target, e);
  });
  document.addEventListener('submit', e => {
    const f = e.target.dataset.form; if (!f) return; e.preventDefault();
    if (f === 'login' || f === 'register') doAuth(f);
    else if (NK.FORMS[f]) NK.FORMS[f](e.target, e);
  });
  window.addEventListener('hashchange', () => {
    const d = $('#drawer'); if (d) d.hidden = true; closeMenus();
    if (location.hash === '#test' && App.testView === 'done') App.testView = 'intro';
    render();
  });

  /* ---------------- Exports for pages.js ---------------- */
  NK.H = { $, $$, esc, icon, t, L, ring, bar, toast, modal, closeModal, users, me, favBtn, profCard, pname, catName, uniName, render, rerenderKeep, inFrame, S, dataKey, copyText, blank, loadData, isFav, logoSvg,
    radarG: (keys, sc, label) => radar(sc, null, keys, label) };
  /* ---------------- Boot (called by pages.js after all modules are registered) ---------------- */
  NK.boot = () => {
    loadData();
    if (location.hash === '#test' && Object.keys(App.data.answers).length && answeredCount() < NK.QUESTIONS.length) App.testView = 'intro';
    renderFooter();
    render();
  };
})();
