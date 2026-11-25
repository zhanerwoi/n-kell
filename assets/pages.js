/* N-KELL — pages for the integrated journey: Discover → Explore → Experience → Compare → Plan.
   Uses helpers exported by app.js (NK.H) and pure logic from engine.js (NK.Engine). */
(function () {
  'use strict';
  const NK = window.NK, H = NK.H, E = NK.Engine;
  const { $, $$, esc, icon, t, L } = H;
  const P = NK.PAGES, A = NK.ACTIONS, F = NK.FORMS, C = NK.CHANGES, I = NK.INPUTS;
  const D = () => NK.App.data;
  const ui = () => NK.App.ui;
  const rec = () => NK.rec();
  const tName = id => L(NK.TEST[id].title);
  const tstate = id => { const d = D(); d.tests[id] = d.tests[id] || { answers: {}, idx: 0 }; return d.tests[id]; };
  const fmtDate = iso => (iso ? new Date(iso).toLocaleDateString(NK.App.lang === 'en' ? 'en-GB' : 'ru-RU') : '');
  const pname = H.pname, catName = H.catName;
  const dim = (src, d) => NK.dimName(src, d);
  const SRC_OF = { interests: 'riasec', strengths: 'strengths', values: 'values', env: 'env', motivation: 'motivation', personality: 'bigfive' };
  const band = v => { const b = E.band(v); return `<span class="band band-${b}">${esc(t('band_' + b))}</span>`; };
  const sbar = (label, v, extra) => `<div class="bar-row"><div class="bar-lbl"><span>${esc(label)} ${v == null ? '' : band(v)}</span><b>${v == null ? '—' : v + '%'}</b></div><div class="bar ${v == null ? 'na' : ''}"><i style="--w:${Math.max(2, v || 0)}%"></i></div>${extra || ''}</div>`;
  const srcChip = src => `<span class="src">${icon('info')} ${esc(src === 'express' ? t('src_express') : tName(src))}</span>`;
  const legend = () => `<p class="tiny muted bands-l">${band(20)} 0–39 · ${band(50)} 40–59 · ${band(80)} 60–100 — ${esc(t('band_note'))}</p>`;
  const empty = (ic, title, text, href, btn) => `<div class="empty-s">${icon(ic)}<p><b>${esc(title)}</b></p><p>${esc(text)}</p>${href ? `<a class="btn btn-lime btn-sm" href="#${href}">${esc(btn)} ${icon('arrow-right')}</a>` : ''}</div>`;
  const markOnce = (key, val) => { const d = D(); if (JSON.stringify(d[key]) !== JSON.stringify(val)) { d[key] = val; NK.save(); } };

  /* ======================== Progress helpers ======================== */
  function testsDone(d) { return NK.TESTS.filter(x => E.testResult(d || D(), x.id)).length; }
  NK.testsDone = testsDone;

  /* ======================== Roadmap model ======================== */
  function roadStages(d) {
    d = d || D();
    const r = NK.Engine.recommend(d, NK.PROFS);
    const top = r.best.slice(0, 3).map(m => NK.PROF[m.id]);
    const subj = [...new Set(top.flatMap(p => p.subj))].slice(0, 5).map(NK.subjName).join(', ');
    const dev = E.development(r.P, r, d);
    const done = id => !!E.testResult(d, id);
    const simsN = Object.keys(d.sims || {}).length;
    const S = (id, k, auto, href) => ({ id, k, auto, href });
    const stages = [
      { k: 'rs_1', ic: 'compass', tasks: [S('a_riasec', ['rt_test', { test: tName('riasec') }], done('riasec') || (d.results || []).length > 0, 'test-riasec'), S('a_bigfive', ['rt_test', { test: tName('bigfive') }], done('bigfive'), 'test-bigfive'), S('a_values', ['rt_test', { test: tName('values') }], done('values'), 'test-values'), S('s1_code', ['rt_profile'], null, 'me')] },
      { k: 'rs_2', ic: 'search', tasks: [S('a_view3', ['rt_view3'], (d.viewed || []).length >= 3, 'recs'), S('s2_day', ['rt_day'], null, 'careers'), S('s2_beyond', ['rt_beyond'], null, 'recs'), S('s2_int', ['rt_interview'], null)] },
      { k: 'rs_3', ic: 'swords', tasks: [S('a_compare', ['rt_compare'], (d.compares || []).length > 0, 'compare'), S('s3_pros', ['rt_pros'], null)] },
      { k: 'rs_4', ic: 'book-open', tasks: [S('a_unt', ['rt_unt'], !!d.untVisited, 'unt'), S('s3_subj', ['rt_subj', { s: subj || '—' }], null), S('s3_unt', ['rt_unt_official'], null, NK.UNT_META.sources[0].url)] },
      { k: 'rs_5', ic: 'school', tasks: [S('s5_uni3', ['rt_uni3'], null, 'unis'), S('s5_adm', ['rt_adm'], null), S('s5_open', ['rt_open'], null)] },
      { k: 'rs_6', ic: 'zap', tasks: [S('a_sim1', ['rt_sim1'], simsN >= 1, 'sim'), S('a_sim3', ['rt_sim3'], simsN >= 3, 'sim'), S('a_strengths', ['rt_test', { test: tName('strengths') }], done('strengths'), 'test-strengths')].concat(dev.improve.slice(0, 2).map(x => S('s6_dev_' + x.d, ['rt_dev', { s: dim('strengths', x.d) }], null))).concat([S('s4_course', ['rt_course'], null)]) },
      { k: 'rs_7', ic: 'flag', tasks: [S('a_ready', ['rt_test', { test: tName('readiness') }], done('readiness'), 'test-readiness'), S('s1_talk', ['rt_talk'], null), S('s7_retake', ['rt_retake'], null, 'tests'), S('s7_review', ['rt_review'], null)] }
    ];
    const custom = (d.tasks || []);
    stages.forEach((s, i) => { s.custom = custom.filter(x => x.stage === i + 1); });
    return stages;
  }
  const taskDone = (task, d) => (task.auto != null ? !!task.auto : !!(d || D()).road.done[task.id]);
  function roadProgress(d) {
    d = d || D();
    const st = roadStages(d); const all = st.flatMap(s => s.tasks); const cus = st.flatMap(s => s.custom); const goals = d.road.goals || [];
    const done = all.filter(x => taskDone(x, d)).length + cus.filter(x => x.done).length + goals.filter(g => g.done).length;
    const total = all.length + cus.length + goals.length;
    return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
  }
  NK.roadProgress = roadProgress;

  /* ======================== Next best step card ======================== */
  function nextStepCard(big) {
    const d = D(), r = rec(), ns = E.nextStep(d, r);
    const vars = Object.assign({}, ns.vars || {});
    if (vars.test) vars.test = tName(vars.test);
    if (ns.k === 'ns_sim') vars.p = vars.p ? pname(NK.PROF[vars.p]) : t('nav_sim');
    return `<a class="nstep ${big ? 'big' : ''}" href="#${ns.href}"><span class="nstep-ic">${icon('sparkles')}</span><div><small>${esc(t('ns_title'))}</small><b>${esc(t(ns.k, vars))}</b></div>${icon('arrow-right')}</a>`;
  }
  NK.nextStepText = () => { const ns = E.nextStep(D(), rec()); const vars = Object.assign({}, ns.vars || {}); if (vars.test) vars.test = tName(vars.test); if (ns.k === 'ns_sim') vars.p = vars.p ? pname(NK.PROF[vars.p]) : t('nav_sim'); return { text: t(ns.k, vars), href: ns.href }; };

  /* ======================== DASHBOARD ======================== */
  P.dashboard = function () {
    const d = D(), u = H.me(), r = rec(), n = testsDone();
    const rp = roadProgress();
    const parts = [n / NK.TESTS.length, Math.min((d.viewed || []).length, 3) / 3, Math.min(Object.keys(d.sims).length, 3) / 3, (d.compares || []).length ? 1 : 0, rp.pct / 100];
    const overall = Math.round(parts.reduce((s, v) => s + v, 0) / parts.length * 100);
    const code = r.P.riasec ? E.sortDims(r.P.riasec.s).slice(0, 3) : null;
    const recentSims = Object.keys(d.sims).map(id => [id, d.sims[id]]).sort((a, b) => (b[1].date || '').localeCompare(a[1].date || '')).slice(0, 3);
    return `<section class="page"><div class="wrap">
      <div class="dash-head"><div><span class="eyebrow">${icon('home')} ${esc(t('nav_dash'))}</span><h1 class="h1">${esc(u ? t('dash_hello', { n: u.nick }) : t('dash_hello_guest'))}</h1><p class="lead">${esc(t('dash_sub'))}</p></div>
        <div class="dash-ring">${H.ring(overall, 104, 'lime')}<small>${esc(t('dash_overall'))}</small></div></div>
      ${nextStepCard(true)}
      <div class="journey">${[['discover', 'compass', 'tests'], ['explore', 'search', 'recs'], ['experience', 'play', 'sim'], ['compare', 'swords', 'compare'], ['plan', 'route', 'roadmap']].map(([k, ic, h], i) => `<a href="#${h}" class="jstep"><span>${i + 1}</span>${icon(ic)}<b>${esc(t('stage_' + k))}</b><small>${esc(t('stage_' + k + '_d'))}</small></a>`).join('')}</div>
      <div class="dash-grid">
        <div class="card"><h3>${icon('clipboard-list')} ${esc(t('dash_tests'))} <span class="muted tiny">${n}/${NK.TESTS.length}</span></h3>
          <div class="tchips">${NK.TESTS.map(x => { const r0 = E.testResult(d, x.id); const st = d.tests[x.id]; const prog = st && !r0 ? Object.keys(st.answers || {}).length : 0; return `<a href="#test-${x.id}" class="tchip ${r0 ? 'done' : prog ? 'prog' : ''}">${icon(r0 ? 'check-circle-2' : x.icon)}<span>${esc(tName(x.id))}</span>${r0 ? '' : prog ? `<small>${prog}/${x.items.length}</small>` : ''}</a>`; }).join('')}</div></div>
        <div class="card"><h3>${icon('user-round')} ${esc(t('dash_profile'))}</h3>
          ${code ? `<div class="mini-prof"><div class="code big">${code.map(c => `<i class="c-${c}">${c}</i>`).join('')}</div>${srcChip(r.P.riasec.src)}</div>
            ${r.P.values ? `<p class="tiny muted">${esc(t('me_values'))}</p><ul class="chips">${E.sortDims(r.P.values.s).slice(0, 3).map(k => `<li>${esc(dim('values', k))}</li>`).join('')}</ul>` : ''}
            ${r.P.motivation ? `<p class="tiny muted">${esc(t('me_motiv'))}</p><ul class="chips">${E.sortDims(r.P.motivation.s).slice(0, 2).map(k => `<li>${esc(dim('motivation', k))}</li>`).join('')}</ul>` : ''}
            <a href="#me" class="btn btn-ghost btn-sm">${esc(t('nav_me'))} ${icon('arrow-right')}</a>` : empty('user-round', t('dash_noprof'), t('dash_noprof_d'), 'test-riasec', t('cta_start_riasec'))}</div>
        <div class="card"><h3>${icon('trophy')} ${esc(t('dash_recs'))}</h3>${r.best.length ? `<div class="minis">${r.best.slice(0, 3).map(m => miniCareer(m)).join('')}</div><p class="tiny muted">${esc(t('cov_short', { p: Math.round(r.coverage * 100) }))}</p><a href="#recs" class="btn btn-ghost btn-sm">${esc(t('nav_recs'))} ${icon('arrow-right')}</a>` : empty('trophy', t('recs_none'), t('recs_none_d'), 'test-riasec', t('cta_start_riasec'))}</div>
        <div class="card"><h3>${icon('heart')} ${esc(t('road_favs'))}</h3>${d.favs.length ? `<div class="minis">${d.favs.filter(id => NK.PROF[id]).slice(0, 4).map(id => miniCareer(r.byId[id] || { id })).join('')}</div>` : `<p class="muted tiny">${esc(t('road_nofavs'))}</p><a href="#careers" class="btn btn-ghost btn-sm">${esc(t('nav_careers'))}</a>`}</div>
        <div class="card"><h3>${icon('play')} ${esc(t('dash_sims'))}</h3>${recentSims.length ? `<div class="minis">${recentSims.map(([id, s]) => `<a class="mini" href="#sim-${id}"><span class="pic sm">${icon(NK.SIMS[id] ? NK.SIMS[id].icon : 'play')}</span><span><b>${esc(NK.SIMS[id] ? L(NK.SIMS[id].title) : id)}</b><small>${fmtDate(s.date)}</small></span><span class="mpill">${s.best}%</span></a>`).join('')}</div>` : `<p class="muted tiny">${esc(t('dash_nosims'))}</p><a href="#sim" class="btn btn-ghost btn-sm">${esc(t('nav_sim'))}</a>`}</div>
        <div class="card"><h3>${icon('route')} ${esc(t('nav_road'))}</h3><p class="muted">${rp.done} / ${rp.total}</p><div class="tbar"><i style="--w:${rp.pct}%"></i></div><a href="#roadmap" class="btn btn-ghost btn-sm">${esc(t('nav_road'))} ${icon('arrow-right')}</a></div>
      </div>
      ${u ? '' : `<div class="warn">${icon('info')}<p>${esc(t('prof_guest'))} <a href="#register">${esc(t('register'))} →</a></p></div>`}
    </div></section>`;
  };
  function miniCareer(m) {
    const p = NK.PROF[m.id];
    return `<a class="mini" href="#career-${p.id}"><span class="pic sm">${icon(p.icon)}</span><span><b>${esc(pname(p))}</b><small>${esc(catName(p.cat))} · ${p.code}</small></span>${m.total != null ? `<span class="mpill">${m.total}%</span>` : ''}</a>`;
  }
  NK.miniCareer = miniCareer;

  /* ======================== TEST CENTER ======================== */
  P.tests = function () {
    const d = D();
    const card = x => {
      const r0 = E.testResult(d, x.id), st = d.tests[x.id], prog = st && !r0 ? Object.keys(st.answers || {}).length : 0;
      return `<article class="tcard card"><div class="tcard-h"><span class="pic" style="--tc:${x.color}">${icon(x.icon)}</span>${r0 ? `<span class="chip-ok">${icon('check')} ${esc(t('tc_done'))} · ${fmtDate(r0.date)}</span>` : prog ? `<span class="chip-warn">${esc(t('tc_inprog'))} ${prog}/${x.items.length}</span>` : ''}</div>
        <h3>${esc(tName(x.id))}</h3><p class="muted">${esc(L(x.purpose))}</p>
        <p class="tmeta">${icon('timer')} ~${x.minutes} ${esc(t('min'))} · ${icon('clipboard-list')} ${x.items.length} ${esc(t('tc_items'))}</p>
        <div class="cta-row">${r0 ? `<a class="btn btn-violet btn-sm" href="#test-${x.id}">${esc(t('tc_view'))}</a>` : `<a class="btn btn-lime btn-sm" href="#test-${x.id}">${esc(t(prog ? 'test_continue' : 'test_start'))} ${icon('arrow-right')}</a>`}</div></article>`;
    };
    const ex = d.results.length;
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('compass')} ${esc(t('stage_discover'))}</span><h1 class="h1">${esc(t('tc_h'))}</h1><p class="lead">${esc(t('tc_sub'))}</p>
      <div class="safe card">${icon('shield-check')}<div><h3>${esc(t('safe_h'))}</h3><ul class="dl">${['safe_1', 'safe_2', 'safe_3', 'safe_4', 'safe_5'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ul></div></div>
      <div class="tgrid">${NK.TESTS.map(card).join('')}
        <article class="tcard card express"><div class="tcard-h"><span class="pic">${icon('zap')}</span>${ex ? `<span class="chip-ok">${icon('check')} ${ex}×</span>` : ''}</div><h3>${esc(t('ex_title'))}</h3><p class="muted">${esc(t('ex_desc'))}</p><p class="tmeta">${icon('timer')} ~10 ${esc(t('min'))} · ${icon('clipboard-list')} 30 ${esc(t('tc_items'))}</p>
        <div class="cta-row"><a class="btn btn-ghost btn-sm" href="#test">${esc(t(ex ? 'test_restart' : 'test_start'))}</a>${ex ? `<a class="btn btn-ghost btn-sm" href="#results">${esc(t('tc_view'))}</a>` : ''}</div></article>
      </div>
    </div></section>`;
  };

  /* ======================== TEST RUNNER ======================== */
  P['test-'] = function (id) {
    const x = NK.TEST[id]; if (!x) return null;
    const st = tstate(id); const r0 = E.testResult(D(), id);
    ui().tv = ui().tv || {};
    const view = ui().tv[id] || (r0 ? 'res' : 'intro');
    if (view === 'q') return testQ(x, st);
    if (view === 'res' && r0) return testRes(x, r0);
    const n = Object.keys(st.answers).length;
    return `<section class="page"><div class="wrap narrow">
      <a href="#tests" class="back">${icon('arrow-left')} ${esc(t('tc_h'))}</a>
      <span class="eyebrow">${icon(x.icon)} ~${x.minutes} ${esc(t('min'))} · ${x.items.length} ${esc(t('tc_items'))}</span>
      <h1 class="h1">${esc(tName(id))}</h1>
      <div class="card"><h3>${icon('target')} ${esc(t('ti_purpose'))}</h3><p>${esc(L(x.purpose))}</p><h3 class="mt">${icon('clipboard-list')} ${esc(t('ti_instr'))}</h3><p>${esc(L(x.instr))}</p></div>
      <div class="warn">${icon('info')}<p>${esc(L(x.note))} ${esc(t('ti_skip'))}</p></div>
      <p class="muted tiny">${icon('lock')} ${esc(t('ti_privacy'))}</p>
      <div class="cta-row"><button class="btn btn-lime btn-lg" data-act="t-go" data-id="${id}">${esc(t(n ? 'test_continue' : 'test_start'))}${n ? ` (${n}/${x.items.length})` : ''} ${icon('arrow-right')}</button>${n ? `<button class="btn btn-ghost" data-act="t-reset" data-id="${id}">${icon('rotate-ccw')} ${esc(t('test_restart'))}</button>` : ''}${r0 ? `<button class="btn btn-ghost" data-act="t-view" data-id="${id}">${esc(t('tc_view'))}</button>` : ''}</div>
    </div></section>`;
  };
  function itemBody(x, it, a) {
    const lab = it.t ? `<h2 class="qtext">${esc(L(it.t))}</h2>` : '';
    if (it.type === 'likert') {
      const sc = NK.SCALES[it.scale];
      return `${lab}<div class="scale" role="radiogroup">${[1, 2, 3, 4, 5].map(v => `<button class="sc ${a === v ? 'on' : ''}" data-act="t-ans" data-v="${v}" role="radio" aria-checked="${a === v}"><b>${v}</b><span>${esc(L(sc[v - 1]))}</span></button>`).join('')}</div>`;
    }
    if (it.type === 'choice') return `${it.scene ? `<div class="scene">${icon('lightbulb')}<div><small>${esc(t('situation'))}</small><p>${esc(L(it.scene))}</p></div></div>` : ''}${lab}<div class="opts ${it.opts.length > 4 ? 'two' : ''}" role="radiogroup">${it.opts.map((o, k) => `<button class="opt ${a === k ? 'on' : ''}" data-act="t-ans" data-v="${k}" role="radio" aria-checked="${a === k}"><span class="opt-k">${String.fromCharCode(65 + k)}</span><span>${esc(L(o.t))}</span></button>`).join('')}</div>`;
    if (it.type === 'pair') return `${lab}<div class="pair">${['a', 'b'].map(k => `<button class="pcard2 ${a === k ? 'on' : ''}" data-act="t-ans" data-v="${k}" role="radio" aria-checked="${a === k}">${esc(L(it[k].t))}</button>`).join(`<span class="vs">${esc(t('or'))}</span>`)}</div>`;
    if (it.type === 'bipolar') return `${lab}<div class="bip"><span class="bip-l">${esc(L(it.l.t))}</span><div class="bip-dots" role="radiogroup">${[1, 2, 3, 4, 5].map(v => `<button class="bd ${a === v ? 'on' : ''} s${v}" data-act="t-ans" data-v="${v}" role="radio" aria-checked="${a === v}" aria-label="${v}"><i></i></button>`).join('')}</div><span class="bip-r">${esc(L(it.r.t))}</span></div><p class="tiny muted center">${esc(t('bip_hint'))}</p>`;
    return '';
  }
  function testQ(x, st) {
    const i = Math.min(st.idx || 0, x.items.length - 1); const it = x.items[i]; const a = st.answers[it.id];
    const n = Object.keys(st.answers).filter(k => x.items.some(q => q.id === k)).length, total = x.items.length;
    const last = i === total - 1; const enough = n >= Math.ceil(total * 0.5);
    return `<section class="page test-pg"><div class="wrap narrow">
      <div class="tprog"><div class="tprog-top"><span>${esc(t('q_of'))} <b>${i + 1}</b> / ${total}</span><span class="dimchip">${icon(x.icon)} ${esc(tName(x.id))}</span></div>
      <div class="tbar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i style="--w:${n / total * 100}%"></i></div></div>
      <div class="qcard glass">${itemBody(x, it, a)}</div>
      <div class="tnav"><button class="btn btn-ghost" data-act="t-back">${icon('arrow-left')} ${esc(t('back'))}</button>
        <button class="btn btn-ghost" data-act="t-skip">${esc(t('skip'))}</button>
        ${last ? `<button class="btn btn-lime" data-act="t-finish" ${enough ? '' : 'disabled'}>${esc(t('finish'))} ${icon('check')}</button>` : `<button class="btn btn-violet" data-act="t-next">${esc(t('next'))} ${icon('arrow-right')}</button>`}</div>
      <p class="muted tiny center">${n}/${total} ${esc(t('answered'))}${last && !enough ? ' · ' + esc(t('t_need_half')) : ''}</p>
    </div></section>`;
  }
  A['t-go'] = el => { const id = el.dataset.id; const x = NK.TEST[id], st = tstate(id); const first = x.items.findIndex(it => st.answers[it.id] == null); st.idx = first >= 0 ? first : 0; ui().tv[id] = 'q'; NK.save(); H.render(); };
  A['t-reset'] = el => { const id = el.dataset.id; const st = tstate(id); st.answers = {}; st.idx = 0; ui().tv[id] = 'q'; NK.save(); H.render(); };
  A['t-view'] = el => { ui().tv[el.dataset.id] = 'res'; H.render(); };
  const curTest = () => { const h = location.hash.slice(1); return h.startsWith('test-') ? h.slice(5) : null; };
  A['t-ans'] = el => {
    const id = curTest(); const x = NK.TEST[id], st = tstate(id); const it = x.items[st.idx];
    const v = it.type === 'pair' ? el.dataset.v : +el.dataset.v;
    if (!E.validAnswer(it, v)) return;
    st.answers[it.id] = v; NK.save(); H.render(true);
    if (st.idx < x.items.length - 1) setTimeout(() => { if (curTest() === id && ui().tv[id] === 'q' && x.items[st.idx] === it) { st.idx++; NK.save(); H.render(true); } }, 280);
  };
  A['t-next'] = () => { const id = curTest(), st = tstate(id); if (st.idx < NK.TEST[id].items.length - 1) { st.idx++; NK.save(); H.render(true); } };
  A['t-skip'] = el => { const id = curTest(), st = tstate(id), x = NK.TEST[id]; delete st.answers[x.items[st.idx].id]; if (st.idx < x.items.length - 1) st.idx++; NK.save(); H.render(true); };
  A['t-back'] = () => { const id = curTest(), st = tstate(id); if (st.idx > 0) { st.idx--; NK.save(); H.render(true); } else { ui().tv[id] = 'intro'; H.render(); } };
  A['t-finish'] = () => {
    const id = curTest(), x = NK.TEST[id], st = tstate(id);
    const res = E.scoreTest(x, st.answers);
    if (res.answered < Math.ceil(x.items.length * 0.5)) return;
    st.result = { scores: res.scores, n: res.n, answered: res.answered, total: res.total, date: new Date().toISOString() };
    st.done = true; st.history = (st.history || []).concat([{ date: st.result.date, scores: res.scores }]).slice(-5);
    ui().tv[id] = 'res'; NK.save(); H.toast(t('t_saved')); H.render();
  };
  A['t-del-ask'] = el => { ui().confirmDelTest = el.dataset.id; H.rerenderKeep(); };
  A['t-del-no'] = () => { ui().confirmDelTest = null; H.rerenderKeep(); };
  A['t-del'] = el => { const id = el.dataset.id; delete D().tests[id]; ui().confirmDelTest = null; if (ui().tv) ui().tv[id] = 'intro'; NK.save(); H.toast(t('t_deleted')); H.rerenderKeep(); };

  /* ======================== TEST RESULTS ======================== */
  function resHead(x, r0) {
    const confirm = ui().confirmDelTest === x.id;
    return `<a href="#tests" class="back">${icon('arrow-left')} ${esc(t('tc_h'))}</a>
      <div class="res-head"><div><span class="eyebrow">${icon(x.icon)} ${esc(t('res_date'))}: ${fmtDate(r0.date)} · ${r0.answered}/${r0.total} ${esc(t('answered'))}</span><h1 class="h1">${esc(tName(x.id))}</h1></div>
      <div class="res-actions no-print"><button class="btn btn-ghost btn-sm" data-act="t-reset" data-id="${x.id}">${icon('rotate-ccw')} ${esc(t('res_retake'))}</button>${confirm ? `<button class="btn btn-danger btn-sm" data-act="t-del" data-id="${x.id}">${esc(t('t_del_confirm'))}</button><button class="btn btn-ghost btn-sm" data-act="t-del-no">${esc(t('back'))}</button>` : `<button class="btn btn-ghost btn-sm" data-act="t-del-ask" data-id="${x.id}">${icon('trash-2')} ${esc(t('t_del'))}</button>`}</div></div>
      <div class="warn">${icon('info')}<p>${esc(L(x.note))} ${esc(t('res_change'))}</p></div>`;
  }
  function resFoot(x) {
    return `<details class="card method"><summary>${icon('info')} ${esc(t('res_method_h'))}</summary><p>${esc(t('tm_method'))}</p><div class="formula"><code>${esc(t('tm_f1'))}</code><code>${esc(t('tm_f2'))}</code><code>${esc(t('tm_f3'))}</code></div></details>
      <div class="cta-row"><a href="#me" class="btn btn-violet">${icon('user-round')} ${esc(t('nav_me'))}</a><a href="#recs" class="btn btn-ghost">${icon('trophy')} ${esc(t('nav_recs'))}</a><a href="#tests" class="btn btn-ghost">${esc(t('tc_h'))}</a></div>`;
  }
  function testRes(x, r0) {
    const s = r0.scores; let body = '';
    const sorted = E.sortDims(s);
    if (x.id === 'riasec') {
      const code = sorted.slice(0, 3);
      const careers = NK.PROFS.map(p => { const L3 = p.code.split(''); const sc = L3.reduce((a, l, i) => a + E.CONFIG.codeWeights[i] * (s[l] || 0), 0); return { p, sc: Math.round(sc), shared: L3.filter(l => code.includes(l)) }; }).filter(o => code.slice(0, 2).includes(o.p.code[0])).sort((a, b) => b.sc - a.sc).slice(0, 6);
      body = `<div class="res-grid"><div class="card"><h3>${esc(t('res_radar'))}</h3>${H.radarG(['R', 'I', 'A', 'S', 'E', 'C'], s, k => k)}</div>
        <div class="card"><h3>${esc(t('res_code'))}</h3><div class="hcode"><div>${code.map(c => `<span class="c-${c}"><b>${c}</b><em>${esc(t('k_' + c).replace(/\s*\(.\)/, ''))}</em></span>`).join('')}</div></div>${legend()}${['R', 'I', 'A', 'S', 'E', 'C'].map(k => sbar(t('k_' + k), s[k])).join('')}</div></div>
        <div class="card"><h3>${icon('book-open')} ${esc(t('rr_types'))}</h3><div class="dimcards">${sorted.map(k => `<div class="dimcard"><div class="dimcard-h"><span class="c-${k} lt">${k}</span><b>${esc(t('k_' + k))}</b>${band(s[k])}<span class="mpill">${s[k]}%</span></div><p>${esc(t('rd_' + k))}</p></div>`).join('')}</div></div>
        <div class="card"><h3>${icon('trophy')} ${esc(t('rr_careers'))}</h3><p class="muted tiny">${esc(t('rr_careers_d'))}</p><div class="whylist">${careers.map(o => `<a class="why-i2" href="#career-${o.p.id}"><span class="pic sm">${icon(o.p.icon)}</span><div><b>${esc(pname(o.p))}</b><small>${o.p.code} · ${esc(t('rr_shared'))}: ${o.shared.map(l => t('k_' + l)).join(', ')}</small><p>${esc(t('rr_why', { code: o.p.code, first: t('k_' + o.p.code[0]), v: s[o.p.code[0]] }))}</p></div><span class="mpill">${o.sc}%</span></a>`).join('')}</div></div>`;
    } else if (x.id === 'bigfive') {
      body = `<div class="res-grid"><div class="card"><h3>${esc(t('bf_chart'))}</h3>${H.radarG(x.dims, s, k => L(x.info[k].name).split(' ')[0])}</div><div class="card">${legend()}${x.dims.map(k => sbar(L(x.info[k].name), s[k])).join('')}</div></div>
        <div class="dimcards big">${x.dims.map(k => { const inf = x.info[k], v = s[k]; if (v == null) return `<div class="card dimcard"><h3>${esc(L(inf.name))}</h3><p class="muted">${esc(t('na_data'))}</p></div>`; const hi = v >= 50; return `<div class="card dimcard"><div class="dimcard-h"><b>${esc(L(inf.name))}</b>${band(v)}<span class="mpill">${v}%</span></div><p class="muted tiny">${esc(L(inf.desc))}</p><p>${esc(v >= 60 ? L(inf.hi) : v < 40 ? L(inf.lo) : t('bf_mid') + ' ' + L(inf.hi) + ' ' + L(inf.lo))}</p><ul class="tips">${(hi ? inf.tipHi : inf.tipLo).map(tp => `<li>${esc(L(tp))}</li>`).join('')}</ul></div>`; }).join('')}</div>
        <p class="tiny muted">${icon('shield-check')} ${esc(t('bf_note'))}</p>`;
    } else if (x.id === 'values') {
      const top5 = sorted.slice(0, 5);
      const F = p => E.profFeatures(p).values;
      const fits = NK.PROFS.map(p => ({ p, k: F(p).filter(v => top5.includes(v)).length })).filter(o => o.k >= 2).sort((a, b) => b.k - a.k || pname(a.p).localeCompare(pname(b.p))).slice(0, 8);
      const conf = x.conflicts.filter(([a, b]) => s[a] >= 65 && s[b] >= 65);
      body = `<div class="res-grid"><div class="card"><h3>${icon('gem')} ${esc(t('vr_top5'))}</h3><ol class="rank5">${top5.map((k, i) => `<li><span class="rank">${i + 1}</span><div><b>${esc(dim('values', k))}</b> <span class="mpill">${s[k]}%</span><p class="tiny muted">${esc(L(x.info[k].desc))}</p><p class="tiny">${icon('map-pin')} ${esc(L(x.info[k].env))}</p></div></li>`).join('')}</ol></div>
        <div class="card"><h3>${esc(t('vr_all'))}</h3>${legend()}${sorted.map(k => sbar(dim('values', k), s[k])).join('')}</div></div>
        <div class="card"><h3>${icon('alert-triangle')} ${esc(t('vr_conf'))}</h3>${conf.length ? conf.map(([a, b, tx]) => `<div class="conf"><b>${esc(dim('values', a))} ↔ ${esc(dim('values', b))}</b><p>${esc(L(tx))}</p></div>`).join('') : `<p class="muted">${esc(t('vr_noconf'))}</p>`}</div>
        <div class="card"><h3>${icon('trophy')} ${esc(t('vr_careers'))}</h3><div class="minis">${fits.map(o => miniCareer(rec().byId[o.p.id] || { id: o.p.id })).join('')}</div></div>`;
    } else if (x.id === 'motivation') {
      const main = sorted.slice(0, 2), sec = sorted.slice(2, 4);
      body = `<div class="dimcards big">${main.map(k => `<div class="card dimcard"><div class="dimcard-h"><span class="chip-ok">${esc(t('mo_main'))}</span><b>${esc(dim('motivation', k))}</b><span class="mpill">${s[k]}%</span></div><p><b>${esc(t('mo_situ'))}:</b> ${esc(L(x.info[k].situ))}</p><p><b>${esc(t('mo_strat'))}:</b> ${esc(L(x.info[k].strat))}</p></div>`).join('')}</div>
        <div class="res-grid"><div class="card"><h3>${esc(t('mo_sec'))}</h3>${sec.map(k => `<p><b>${esc(dim('motivation', k))}</b> (${s[k]}%) — ${esc(L(x.info[k].situ))}</p>`).join('')}</div><div class="card"><h3>${esc(t('mo_all'))}</h3>${legend()}${sorted.map(k => sbar(dim('motivation', k), s[k])).join('')}</div></div>`;
    } else if (x.id === 'strengths') {
      const demo = E.demonstrated(D());
      body = `<div class="card"><h3>${icon('trophy')} ${esc(t('sr_table'))}</h3><p class="muted tiny">${esc(t('sr_expl'))}</p>${legend()}
        <div class="tbl-wrap"><table class="dtbl sr"><thead><tr><th>${esc(t('sr_dim'))}</th><th>${esc(t('sr_self'))}</th><th>${esc(t('sr_demo'))}</th></tr></thead><tbody>${sorted.concat(x.dims.filter(k => s[k] == null)).map(k => `<tr><td>${esc(dim('strengths', k))}</td><td>${s[k] == null ? '—' : `<div class="bar sm"><i style="--w:${Math.max(2, s[k])}%"></i></div> ${s[k]}% ${band(s[k])}`}</td><td>${demo[k] ? `<span class="chip-ok">${demo[k].score}% · ${esc(L(NK.SIMS[demo[k].sim].title))}</span>` : `<span class="muted tiny">${esc(t('sr_nodemo'))}</span>`}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card"><h3>${icon('trending-up')} ${esc(t('sr_dev'))}</h3>${sorted.filter(k => s[k] < 45).length ? `<ul class="chips">${sorted.filter(k => s[k] < 45).map(k => `<li class="chip-warn">${esc(dim('strengths', k))} · ${s[k]}%</li>`).join('')}</ul>` : `<p class="muted">${esc(t('sr_nodev'))}</p>`}<a href="#sim" class="btn btn-ghost btn-sm">${icon('play')} ${esc(t('sr_try'))}</a></div>`;
    } else if (x.id === 'learning') {
      body = `<div class="res-grid"><div class="card"><h3>${esc(t('lr_prefs'))}</h3>${legend()}${sorted.map(k => sbar(dim('learning', k), s[k])).join('')}</div><div class="card"><h3>${icon('lightbulb')} ${esc(t('lr_tips'))}</h3>${sorted.slice(0, 3).map(k => `<p><b>${esc(dim('learning', k))}:</b> ${esc(L(x.info[k].tip))}</p>`).join('')}<p class="tiny muted">${esc(t('lr_flex'))}</p></div></div>`;
    } else if (x.id === 'readiness') {
      const avg = Math.round(E.mean(sorted.map(k => s[k])));
      body = `<div class="res-grid"><div class="card"><h3>${esc(t('rd_overall'))}</h3><div class="center">${H.ring(avg, 104)}</div><p>${esc(t(avg < 45 ? 'ins_ready_lo' : avg >= 70 ? 'ins_ready_hi' : 'ins_ready_mid'))}</p><p class="tiny muted">${esc(t('rd_nopress'))}</p></div><div class="card">${legend()}${sorted.map(k => sbar(dim('readiness', k), s[k])).join('')}</div></div>
        <div class="res-grid"><div class="card"><h3>${icon('check-circle-2')} ${esc(t('rd_conf'))}</h3>${sorted.filter(k => s[k] >= 60).length ? `<ul class="chips">${sorted.filter(k => s[k] >= 60).map(k => `<li class="chip-ok">${esc(dim('readiness', k))}</li>`).join('')}</ul>` : `<p class="muted">${esc(t('rd_noconf'))}</p>`}</div>
        <div class="card"><h3>${icon('compass')} ${esc(t('rd_explore'))}</h3>${sorted.filter(k => s[k] < 60).map(k => `<div class="act"><b>${esc(dim('readiness', k))}</b> <span class="muted tiny">${s[k]}%</span><p>${esc(L(x.info[k].action))}</p><a href="#${x.info[k].go}" class="btn btn-ghost btn-sm">${esc(t('go'))} ${icon('arrow-right')}</a></div>`).join('') || `<p class="muted">—</p>`}</div></div>`;
    } else if (x.id === 'env') {
      const locs = ['office', 'field', 'remote', 'lab', 'studio', 'people'].filter(k => s[k] != null).sort((a, b) => s[b] - s[a]);
      body = `<div class="card"><h3>${icon('map-pin')} ${esc(t('en_poles'))}</h3><p class="muted tiny">${esc(t('en_poles_d'))}</p><div class="poles">${x.poles.map(([l, r]) => { const lv = s[l], rv = s[r]; if (lv == null) return ''; const side = rv > lv ? r : l; return `<div class="pole"><span class="${side === l ? 'on' : ''}">${esc(dim('env', l))}</span><div class="pole-bar"><i class="pl" style="--w:${lv / 2}%"></i><i class="pr" style="--w:${rv / 2}%"></i></div><span class="${side === r ? 'on' : ''}">${esc(dim('env', r))}</span></div>`; }).join('')}</div></div>
        <div class="res-grid"><div class="card"><h3>${esc(t('en_places'))}</h3>${locs.map(k => sbar(dim('env', k), s[k])).join('') || `<p class="muted">${esc(t('na_data'))}</p>`}</div><div class="card"><h3>${icon('lightbulb')} ${esc(t('en_why'))}</h3><p>${esc(t('en_why_d'))}</p></div></div>`;
    }
    return `<section class="page"><div class="wrap">${resHead(x, r0)}${body}${resFoot(x)}</div></section>`;
  }

  /* ======================== MY PROFILE (unified) ======================== */
  P.me = function () {
    const d = D(), r = rec(), Pf = r.P;
    const comps = [['riasec', 'compass'], ['bigfive', 'user-round'], ['values', 'gem'], ['motivation', 'zap'], ['strengths', 'trophy'], ['learning', 'book-open'], ['env', 'map-pin'], ['readiness', 'flag']];
    const have = comps.filter(([k]) => Pf[k]).length;
    if (!have) return `<section class="page"><div class="wrap narrow center empty"><div class="empty-ic">${icon('user-round')}</div><h1 class="h1">${esc(t('me_h'))}</h1><p class="lead">${esc(t('me_empty'))}</p><a href="#tests" class="btn btn-lime btn-lg">${esc(t('tc_h'))} ${icon('arrow-right')}</a></div></section>`;
    const top = (k, n) => (Pf[k] ? E.sortDims(Pf[k].s).slice(0, n) : []);
    const demo = E.demonstrated(d);
    const cardFor = (k, ic) => {
      const p = Pf[k];
      if (!p) return `<div class="card pcard3 missing"><h3>${icon(ic)} ${esc(tName(k))}</h3><p class="muted tiny">${esc(t('me_missing'))}</p><a href="#test-${k}" class="btn btn-ghost btn-sm">${esc(t('test_start'))}</a></div>`;
      const s = p.s; let inner = '';
      if (k === 'riasec') { const c = top(k, 3); inner = `<div class="code big">${c.map(x => `<i class="c-${x}">${x}</i>`).join('')}</div><p class="tiny">${esc(c.map(x => t('k_' + x)).join(' · '))}</p>`; }
      else if (k === 'bigfive') inner = NK.TEST.bigfive.dims.map(x => sbar(L(NK.TEST.bigfive.info[x].name), s[x])).join('');
      else if (k === 'env') inner = NK.TEST.env.poles.map(([a, b]) => s[a] == null ? '' : `<p class="tiny"><b>${esc(dim('env', s[b] > s[a] ? b : a))}</b> <span class="muted">(${Math.max(s[a], s[b])}%)</span></p>`).join('');
      else if (k === 'readiness') { const avg = Math.round(E.mean(Object.values(s).filter(v => v != null))); inner = `${H.ring(avg, 64)}<p class="tiny">${esc(t(avg < 45 ? 'ins_ready_lo' : avg >= 70 ? 'ins_ready_hi' : 'ins_ready_mid'))}</p>`; }
      else inner = top(k, 3).map(x => sbar(dim(k, x), s[x], k === 'strengths' && demo[x] ? `<small class="demo-s">${icon('play')} ${esc(t('sr_demo'))}: ${demo[x].score}%</small>` : '')).join('');
      return `<div class="card pcard3"><h3>${icon(ic)} ${esc(tName(k))}</h3>${srcChip(p.src)}${inner}<a href="#${p.src === 'express' ? 'results' : 'test-' + k}" class="more">${esc(t('res_open'))} ${icon('arrow-right')}</a></div>`;
    };
    const ins = E.insights(Pf);
    const dev = E.development(Pf, r, d);
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('user-round')} ${esc(t('stage_discover'))}</span><h1 class="h1">${esc(t('me_h'))}</h1><p class="lead">${esc(t('me_sub'))}</p>
      <div class="cov card"><div><b>${have}/8</b> ${esc(t('me_cov'))}</div><div class="tbar"><i style="--w:${have / 8 * 100}%"></i></div><p class="tiny muted">${esc(t('me_cov_d'))}</p></div>
      <div class="pgrid3">${comps.map(([k, ic]) => cardFor(k, ic)).join('')}</div>
      <div class="card"><h3>${icon('lightbulb')} ${esc(t('me_ins'))}</h3><p class="muted tiny">${esc(t('me_ins_d'))}</p>
        ${ins.length ? `<ul class="ins">${ins.map(x => `<li><p>${esc(t(x.k, x.vars.dim ? { v: dim(x.cat, x.vars.dim) } : {}))}</p><small>${esc(x.src === 'express' ? t('src_express') : tName(x.src))}${x.dim ? ' · ' + esc(dim(x.cat, x.dim)) : ''}: ${x.score}%</small></li>`).join('')}</ul>` : `<p class="muted">${esc(t('me_noins'))}</p>`}</div>
      <div class="dev3">
        <div class="card"><h3>${icon('zap')} ${esc(t('dev_keep'))}</h3>${dev.keep.length ? `<ul class="dl">${dev.keep.map(x => `<li><b>${esc(dim('strengths', x.d))}</b>${x.self != null ? ` <span class="muted tiny">${esc(t('sr_self'))}: ${x.self}%</span>` : ''}${x.sim ? ` <span class="chip-ok">${icon('play')} ${x.sim.score}%</span>` : ''}</li>`).join('')}</ul>` : `<p class="muted tiny">${esc(t('dev_keep_none'))}</p>`}</div>
        <div class="card"><h3>${icon('trending-up')} ${esc(t('dev_improve'))}</h3>${dev.improve.length ? `<ul class="dl">${dev.improve.map(x => `<li><b>${esc(dim('strengths', x.d))}</b> <span class="muted tiny">${x.v}% · ${esc(x.profs.slice(0, 2).map(id => pname(NK.PROF[id])).join(', '))}</span></li>`).join('')}</ul>` : `<p class="muted tiny">${esc(t('dev_improve_none'))}</p>`}</div>
        <div class="card"><h3>${icon('compass')} ${esc(t('dev_explore'))}</h3>${dev.explore.length ? `<div class="minis">${dev.explore.map(b => miniCareer(b.m)).join('')}</div>` : `<p class="muted tiny">—</p>`}</div>
      </div>
      <div class="cta-row"><button class="btn btn-lime btn-lg" data-act="make-plan">${icon('route')} ${esc(t('dev_plan'))}</button><a href="#recs" class="btn btn-ghost">${esc(t('nav_recs'))}</a><a href="#reports" class="btn btn-ghost">${esc(t('nav_reports'))}</a></div>
      <p class="tiny muted">${icon('lock')} ${esc(t('me_privacy'))}</p>
    </div></section>`;
  };
  A['make-plan'] = () => {
    const d = D(), r = rec(), dev = E.development(r.P, r, d);
    d.tasks = d.tasks || []; let added = 0;
    const add = (key, text, stage) => { if (d.tasks.some(x => x.key === key)) return; d.tasks.push({ id: 'c' + Date.now().toString(36) + added, key, t: text, stage, d: '', done: false }); added++; };
    dev.improve.forEach(x => add('dev_' + x.d, t('plan_improve', { s: dim('strengths', x.d) }), 6));
    dev.keep.slice(0, 2).forEach(x => add('keep_' + x.d, t('plan_keep', { s: dim('strengths', x.d) }), 6));
    dev.explore.forEach(b => add('exp_' + b.m.id, t('plan_explore', { p: pname(NK.PROF[b.m.id]) }), 2));
    r.best.slice(0, 2).forEach(m => { const sid = NK.SIM_FOR[m.id]; if (sid && !d.sims[sid]) add('sim_' + sid, t('plan_sim', { s: L(NK.SIMS[sid].title) }), 6); });
    NK.save(); H.toast(t('plan_added', { n: added })); location.hash = 'roadmap';
  };

  /* ======================== CAREER RECOMMENDATIONS ======================== */
  function whyText(m) {
    const p = NK.PROF[m.id], ev = m.ev, parts = [];
    if (ev.interests.length) parts.push(t('why_int', { list: ev.interests.map(([l]) => t('k_' + l).replace(/\s*\(.\)/, '').toLowerCase()).join(', ') }));
    if (ev.strengths.length) parts.push(t('why_str', { list: ev.strengths.slice(0, 2).map(([d]) => dim('strengths', d).toLowerCase()).join(', ') }));
    if (ev.values.length) parts.push(t('why_val', { list: ev.values.slice(0, 2).map(([d]) => dim('values', d).toLowerCase()).join(', ') }));
    if (!parts.length) return t('why_weak', { p: pname(p) });
    return parts.join(' ') + ' ' + t('why_end', { p: pname(p) });
  }
  function challengeText(m) {
    const ev = m.ev, out = [];
    if (ev.challengesInt.length) out.push(t('ch_int', { t: t('k_' + ev.challengesInt[0][0]), v: ev.challengesInt[0][1] }));
    if (ev.challengesEnv.length) out.push(t('ch_env', { list: ev.challengesEnv.slice(0, 2).map(([d, v]) => dim('env', d) + ' (' + v + '%)').join(', ') }));
    if (ev.challengesPers.length) out.push(t('ch_pers', { list: ev.challengesPers.slice(0, 2).map(([d]) => dim('bigfive', d)).join(', ') }));
    return out.length ? out : [t('ch_none')];
  }
  NK.whyText = whyText; NK.challengeText = challengeText;
  function recCard(m, rank) {
    const p = NK.PROF[m.id], open = ui().openRec2 === m.id, w = E.getWeights(D());
    const prog = NK.UNT_PROGRAMS.find(g => g.profs.includes(p.id));
    const unis = NK.UNIS.filter(u => u.dirs.includes(p.cat)).slice(0, 4);
    const chips = (arr, src, cls) => arr.length ? `<ul class="chips">${arr.map(([d, v]) => `<li class="${cls}">${esc(src === 'riasec' ? t('k_' + d) : dim(src, d))} · ${v}%</li>`).join('')}</ul>` : `<p class="muted tiny">${esc(t('na_data_short'))}</p>`;
    return `<li class="rec ${open ? 'open' : ''}">
      <div class="rec-h" data-act="rec2" data-id="${m.id}" role="button" tabindex="0" aria-expanded="${open}"><span class="rank">${rank}</span><span class="pic sm">${icon(p.icon)}</span>
        <div class="rec-n"><b>${esc(pname(p))}</b><small>${esc(catName(p.cat))} · ${p.code}</small><div class="stack">${E.COMPONENTS.map(c => m.comps[c] == null ? '' : `<i class="lg2-${c}" style="width:${w[c] / m.avail.reduce((s, x) => s + w[x], 0) * m.comps[c]}%" title="${esc(t('comp_' + c))}: ${Math.round(m.comps[c])}%"></i>`).join('')}</div></div>
        ${H.ring(m.total, 52)}<span class="chev">${icon('chevron-down')}</span></div>
      <div class="rec-b" ${open ? '' : 'hidden'}>
        <div class="why-box"><h4>${icon('lightbulb')} ${esc(t('rc_why'))}</h4><p>${esc(whyText(m))}</p></div>
        <div class="rec-grid">
          <div><h4>${icon('compass')} ${esc(t('rc_int'))}</h4>${chips(m.ev.interests, 'riasec', 'chip-ok')}</div>
          <div><h4>${icon('zap')} ${esc(t('rc_str'))}</h4>${chips(m.ev.strengths.slice(0, 4), 'strengths', 'chip-ok')}${m.sim ? `<p class="tiny">${icon('play')} ${esc(t('rc_sim', { s: L(NK.SIMS[m.sim.id].title), v: m.sim.best }))}</p>` : ''}</div>
          <div><h4>${icon('gem')} ${esc(t('rc_val'))}</h4>${chips(m.ev.values.slice(0, 4), 'values', 'chip-ok')}</div>
          <div><h4>${icon('alert-triangle')} ${esc(t('rc_chal'))}</h4><ul class="dl">${challengeText(m).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div><h4>${icon('trending-up')} ${esc(t('rc_dev'))}</h4>${m.ev.develop.length ? chips(m.ev.develop, 'strengths', 'chip-warn') : `<p class="muted tiny">${esc(t('res_nothing_improve'))}</p>`}</div>
          <div><h4>${icon('book-open')} ${esc(t('res_subjects'))}</h4><ul class="chips">${p.subj.map(s => `<li>${esc(NK.subjName(s))}</li>`).join('')}</ul></div>
          <div><h4>${icon('clipboard-list')} ${esc(t('p_unt'))}</h4>${prog && prog.combo ? `<p><b>${esc(prog.combo.map(NK.subjName).join(' + '))}</b></p><p class="tiny"><span class="band band-na">${esc(t('unt_unverified'))}</span></p>` : `<p class="muted tiny">${esc(t('p_unt_na'))}</p>`}<a href="#unt" class="tiny" data-act="unt-pick" data-id="${p.id}">${esc(t('nav_unt'))} →</a></div>
          <div><h4>${icon('school')} ${esc(t('rc_unis'))}</h4><ul class="dl">${unis.map(u => `<li><a href="${u.site}" target="_blank" rel="noopener">${esc(H.uniName(u))}</a></li>`).join('')}</ul><p class="tiny muted">${esc(t('rc_unis_note'))}</p></div>
        </div>
        <div class="rec-parts">${E.COMPONENTS.map(c => `<div><small>${esc(t('comp_' + c))} ×${Math.round(w[c] * 100)}%</small><b>${m.comps[c] == null ? '—' : Math.round(m.comps[c]) + '%'}</b></div>`).join('')}</div>
        <div class="cta-row"><a class="btn btn-violet btn-sm" href="#career-${p.id}">${esc(t('res_open'))} ${icon('arrow-right')}</a><button class="btn btn-ghost btn-sm" data-act="cmp-add" data-id="${p.id}">${icon('swords')} ${esc(t('nav_compare'))}</button>${NK.SIM_FOR[p.id] ? `<a class="btn btn-ghost btn-sm" href="#sim-${NK.SIM_FOR[p.id]}">${icon('play')} ${esc(t('p_sim'))}</a>` : ''}${H.favBtn(p.id, true)}</div>
      </div></li>`;
  }
  A.rec2 = el => { const id = el.dataset.id; ui().openRec2 = ui().openRec2 === id ? null : id; H.rerenderKeep(); };
  A['cmp-add'] = el => { const id = el.dataset.id; const c = (ui().cmp || []).filter(x => x && x !== id); ui().cmp = [id].concat(c).slice(0, 3); location.hash = 'compare'; };
  A['unt-pick'] = el => { ui().unt = { mode: 'career', id: el.dataset.id }; };
  P.recs = function () {
    const r = rec(), w = E.getWeights(D());
    if (!r.list.length) return `<section class="page"><div class="wrap narrow center empty"><div class="empty-ic">${icon('trophy')}</div><h1 class="h1">${esc(t('recs_h'))}</h1><p class="lead">${esc(t('recs_none_d'))}</p><a href="#test-riasec" class="btn btn-lime btn-lg">${esc(t('cta_start_riasec'))} ${icon('arrow-right')}</a></div></section>`;
    const missing = E.COMPONENTS.filter(c => !r.availComps.includes(c));
    const themeName = th => t('theme_' + th);
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('search')} ${esc(t('stage_explore'))}</span><h1 class="h1">${esc(t('recs_h'))}</h1><p class="lead">${esc(t('recs_sub'))}</p>
      <div class="cov card"><div><b>${Math.round(r.coverage * 100)}%</b> ${esc(t('cov_h'))}</div><div class="tbar"><i style="--w:${r.coverage * 100}%"></i></div>
        <p class="tiny">${esc(t('cov_used'))}: ${r.availComps.map(c => `<span class="src">${esc(t('comp_' + c))}${r.P[SRC_OF[c]] && r.P[SRC_OF[c]].src === 'express' ? ' (' + esc(t('src_express')) + ')' : ''}</span>`).join(' ')}</p>
        ${missing.length ? `<p class="tiny muted">${esc(t('cov_missing'))}: ${missing.map(c => `<a href="#test-${SRC_OF[c]}">${esc(t('comp_' + c))}</a>`).join(', ')}. ${esc(t('cov_nozero'))}</p>` : ''}</div>
      <div class="warn">${icon('info')}<p>${esc(t('recs_disclaimer'))}</p></div>
      <details class="card wpanel" ${ui().wopen ? 'open' : ''}><summary>${icon('gauge')} ${esc(t('w_h'))}</summary><p class="tiny muted">${esc(t('w_d'))}</p>
        ${E.COMPONENTS.map(c => `<label for="w-${c}">${esc(t('comp_' + c))}: <b>${Math.round(w[c] * 100)}%</b> <span class="tiny muted">— ${esc(t('wd_' + c))}</span></label><input type="range" id="w-${c}" data-change="weight" data-c="${c}" min="0" max="60" step="5" value="${Math.round(w[c] * 100)}">`).join('')}
        <p class="tiny muted">${esc(t('w_norm'))}</p><button class="btn btn-ghost btn-sm" data-act="w-reset">${icon('rotate-ccw')} ${esc(t('w_reset'))}</button></details>
      <div class="card"><div class="sec-head"><h3>${icon('trophy')} ${esc(t('recs_best'))}</h3><div class="legend">${E.COMPONENTS.map(c => `<span><i class="lg2-${c}"></i>${esc(t('comp_' + c))}</span>`).join('')}</div></div><ol class="recs">${r.best.map((m, i) => recCard(m, i + 1)).join('')}</ol></div>
      <div class="card"><h3>${icon('sparkle')} ${esc(t('beyond_h'))}</h3><p class="muted tiny">${esc(t('beyond_d'))}</p>
        <div class="beyond">${r.beyond.map(b => { const p = NK.PROF[b.m.id]; return `<a class="bcard" href="#career-${p.id}"><span class="pic sm">${icon(p.icon)}</span><div><b>${esc(pname(p))}</b><small>${esc(catName(p.cat))} · ${b.m.total}%</small><p>${esc(themeName(b.theme))}</p></div></a>`; }).join('') || `<p class="muted">—</p>`}</div></div>
      <div class="card"><h3>${icon('shuffle')} ${esc(t('res_alt'))}</h3><div class="minis cols2">${r.list.slice(8, 14).map(miniCareer).join('')}</div></div>
      <div class="cta-row"><a href="#compare" class="btn btn-violet">${icon('swords')} ${esc(t('nav_compare'))}</a><a href="#careers" class="btn btn-ghost">${esc(t('nav_careers'))}</a></div>
    </div></section>`;
  };
  C.weight = el => { const d = D(); d.weights = Object.assign({}, E.getWeights(d), d.weights || {}); d.weights[el.dataset.c] = (+el.value) / 100; ui().wopen = true; NK.save(); H.rerenderKeep(); };
  A['w-reset'] = () => { D().weights = null; ui().wopen = true; NK.save(); H.rerenderKeep(); };

  /* ======================== CAREER BATTLE ======================== */
  P.compare = function () {
    const r = rec(), d = D();
    let sel = (ui().cmp || []).filter(id => NK.PROF[id]);
    if (sel.length < 2) { const pool = [...new Set(sel.concat(d.favs.filter(id => NK.PROF[id]), r.best.map(m => m.id), ['dev', 'doctor']))]; sel = pool.slice(0, 2); }
    ui().cmp = sel;
    const ps = sel.map(id => NK.PROF[id]);
    const key = sel.slice().sort().join('|');
    if (!(d.compares || []).includes(key)) { d.compares = (d.compares || []).concat([key]).slice(-20); NK.save(); }
    const options = cur => NK.CATS.map(c => `<optgroup label="${esc(L(c.n))}">${NK.PROFS.filter(p => p.cat === c.id).map(p => `<option value="${p.id}" ${cur === p.id ? 'selected' : ''}>${esc(pname(p))}</option>`).join('')}</optgroup>`).join('');
    const slots = [0, 1, 2].map(i => `<label class="sel-wrap" for="cmp-${i}">${esc(t('cmp_slot', { n: i + 1 }))}<select id="cmp-${i}" data-change="cmp" data-i="${i}">${i === 2 ? `<option value="">— ${esc(t('cmp_opt'))} —</option>` : ''}${options(sel[i])}</select></label>`).join('');
    const ms = ps.map(p => r.byId[p.id]);
    const setsOf = f => ps.map(f);
    const common = arrs => arrs.reduce((a, b) => a.filter(x => b.includes(x)));
    const subjS = setsOf(p => p.subj), envS = setsOf(p => p.en), codeS = setsOf(p => p.code.split(''));
    const cSubj = common(subjS), cEnv = common(envS), cCode = common(codeS);
    const mark = (val, commonArr) => commonArr.includes(val) ? 'same' : 'diff';
    const row = (label, cell) => `<tr><th scope="row">${esc(label)}</th>${ps.map((p, i) => `<td>${cell(p, i)}</td>`).join('')}</tr>`;
    const list = arr => `<ul class="dl">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    let expl = '';
    if (ms.every(Boolean)) {
      const best = (c) => { const v = ms.map(m => m.comps[c]); if (v.some(x => x == null)) return null; const mx = Math.max(...v); const mn = Math.min(...v); if (mx - mn < 5) return null; return ps[v.indexOf(mx)]; };
      const parts = [];
      const bi = best('interests'), be = best('env'), bv = best('values'), bs = best('strengths');
      if (bi) parts.push(t('cmp_e_int', { a: pname(bi) }));
      if (be) parts.push(t('cmp_e_env', { a: pname(be) }));
      if (bv) parts.push(t('cmp_e_val', { a: pname(bv) }));
      if (bs) parts.push(t('cmp_e_str', { a: pname(bs) }));
      expl = parts.length ? parts.join(' ') : t('cmp_e_close');
    }
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('swords')} ${esc(t('stage_compare'))}</span><h1 class="h1">${esc(t('cmp_h'))}</h1><p class="lead">${esc(t('cmp_sub'))}</p>
      <div class="filters wrapf">${slots}</div>
      ${ms.every(Boolean) ? `<div class="card cmp-expl"><h3>${icon('lightbulb')} ${esc(t('cmp_you'))}</h3><p>${esc(expl)}</p><p class="tiny muted">${esc(t('cmp_decide'))}</p></div>` : `<div class="warn">${icon('info')}<p>${esc(t('cmp_notest'))} <a href="#test-riasec">${esc(t('cta_start_riasec'))} →</a></p></div>`}
      <div class="card"><div class="tbl-wrap"><table class="cmp">
        <thead><tr><th></th>${ps.map(p => `<th><a href="#career-${p.id}" class="cmp-h"><span class="pic sm">${icon(p.icon)}</span>${esc(pname(p))}</a></th>`).join('')}</tr></thead>
        <tbody>
          ${row(t('cmp_r_match'), (p, i) => ms[i] ? `${H.ring(ms[i].total, 52)}<div class="tiny">${E.COMPONENTS.filter(c => ms[i].comps[c] != null).map(c => `${esc(t('comp_' + c))}: ${Math.round(ms[i].comps[c])}%`).join('<br>')}</div>` : '<span class="muted tiny">—</span>')}
          ${row(t('p_code'), p => `<span class="code">${p.code.split('').map(c => `<i class="c-${c} ${mark(c, cCode)}">${c}</i>`).join('')}</span>`)}
          ${row(t('p_skills'), p => list(NK.pcl(p, 'skills')))}
          ${row(t('p_subj'), p => `<ul class="chips">${p.subj.map(s => `<li class="${mark(s, cSubj) === 'same' ? 'chip-ok' : ''}">${esc(NK.subjName(s))}</li>`).join('')}</ul>`)}
          ${row(t('p_study'), p => list(NK.pcl(p, 'study')))}
          ${row(t('p_unt'), p => { const g = NK.UNT_PROGRAMS.find(x => x.profs.includes(p.id)); return g && g.combo ? `${esc(g.combo.map(NK.subjName).join(' + '))} <span class="band band-na">${esc(t('unt_unverified'))}</span>` : `<span class="muted tiny">${esc(t('p_unt_na'))}</span>`; })}
          ${row(t('cmp_r_day'), p => list(NK.pday(p).slice(0, 4)))}
          ${row(t('cmp_r_env'), p => `<ul class="chips">${p.en.map(e => `<li class="${mark(e, cEnv) === 'same' ? 'chip-ok' : ''}">${esc(t('k_' + e))}</li>`).join('')}</ul>`)}
          ${row(t('p_career'), p => list(NK.pcl(p, 'career')))}
          ${row(t('p_pros'), p => list(NK.pcl(p, 'pros')))}
          ${row(t('p_cons'), p => list(NK.pcl(p, 'cons')))}
        </tbody></table></div>
        <p class="tiny muted">${icon('check-circle-2')} ${esc(t('cmp_legend'))}</p></div>
      <div class="res-grid"><div class="card"><h3>${icon('layers')} ${esc(t('cmp_same'))}</h3><ul class="dl">${[cSubj.length ? t('cmp_s_subj', { list: cSubj.map(NK.subjName).join(', ') }) : null, cEnv.length ? t('cmp_s_env', { list: cEnv.map(e => t('k_' + e)).join(', ') }) : null, cCode.length ? t('cmp_s_code', { list: cCode.join(', ') }) : null].filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('') || `<li>${esc(t('cmp_s_none'))}</li>`}</ul></div>
        <div class="card"><h3>${icon('shuffle')} ${esc(t('cmp_diff'))}</h3><ul class="dl">${ps.map((p, i) => { const us = subjS[i].filter(s => !cSubj.includes(s)), ue = envS[i].filter(e => !cEnv.includes(e)); return `<li><b>${esc(pname(p))}:</b> ${esc([us.length ? us.map(NK.subjName).join(', ') : null, ue.length ? ue.map(e => t('k_' + e)).join(', ') : null].filter(Boolean).join(' · ') || '—')}</li>`; }).join('')}</ul></div></div>
    </div></section>`;
  };
  C.cmp = el => { const i = +el.dataset.i; const c = (ui().cmp || []).slice(); if (el.value) c[i] = el.value; else c.splice(i, 1); ui().cmp = c.filter((x, k, a) => x && a.indexOf(x) === k).slice(0, 3); H.rerenderKeep(); };

  /* ======================== UNT NAVIGATOR ======================== */
  P.unt = function () {
    const s = ui().unt = ui().unt || { mode: 'career', id: (rec().best[0] || { id: 'dev' }).id };
    if (!D().untVisited) { D().untVisited = true; NK.save(); }
    let progs = [], profs = [];
    if (s.mode === 'career') { const p = NK.PROF[s.id] || NK.PROF.dev; profs = [p]; progs = NK.UNT_PROGRAMS.filter(g => g.profs.includes(p.id)); if (!progs.length) progs = NK.UNT_PROGRAMS.filter(g => g.cats.includes(p.cat)).slice(0, 1); }
    else { const g = NK.UNT_PROGRAMS.find(x => x.id === s.id) || NK.UNT_PROGRAMS[0]; progs = [g]; profs = g.profs.map(id => NK.PROF[id]).filter(Boolean); }
    const cats = [...new Set(progs.flatMap(g => g.cats))];
    const unis = NK.UNIS.filter(u => u.dirs.some(d => cats.includes(d)));
    const careerOpts = NK.CATS.map(c => `<optgroup label="${esc(L(c.n))}">${NK.PROFS.filter(p => p.cat === c.id).map(p => `<option value="${p.id}" ${s.mode === 'career' && s.id === p.id ? 'selected' : ''}>${esc(pname(p))}</option>`).join('')}</optgroup>`).join('');
    const progOpts = NK.UNT_PROGRAMS.map(g => `<option value="${g.id}" ${s.mode === 'program' && s.id === g.id ? 'selected' : ''}>${esc(L(g.n))}</option>`).join('');
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('clipboard-list')} ${esc(t('stage_compare'))}</span><h1 class="h1">${esc(t('unt_h'))}</h1><p class="lead">${esc(t('unt_sub'))}</p>
      <div class="warn">${icon('alert-triangle')}<p>${esc(t('unt_warn'))}</p></div>
      <div class="filters wrapf"><div class="seg">${['career', 'program'].map(m => `<button data-act="unt-mode" data-m="${m}" class="${s.mode === m ? 'on' : ''}">${esc(t('unt_by_' + m))}</button>`).join('')}</div>
        ${s.mode === 'career' ? `<label class="sel-wrap" for="unt-c">${esc(t('unt_pick_c'))}<select id="unt-c" data-change="unt-sel">${careerOpts}</select></label>` : `<label class="sel-wrap" for="unt-p">${esc(t('unt_pick_p'))}<select id="unt-p" data-change="unt-sel">${progOpts}</select></label>`}</div>
      <ol class="chain">
        <li><span class="ch-n">1</span><div><small>${esc(t('unt_c1'))}</small>${profs.map(p => `<a href="#career-${p.id}" class="cchip">${icon(p.icon)}${esc(pname(p))}</a>`).join(' ')}</div></li>
        <li><span class="ch-n">2</span><div><small>${esc(t('unt_c2'))}</small>${progs.map(g => `<p><b>${esc(L(g.n))}</b></p>`).join('') || `<p class="muted">${esc(t('na_data_short'))}</p>`}</div></li>
        <li><span class="ch-n">3</span><div><small>${esc(t('unt_c3'))}</small>${progs.map(g => g.combo ? `<p class="combo">${g.combo.map(x => `<span class="subj">${esc(NK.subjName(x))}</span>`).join('<span>+</span>')}</p><p class="tiny"><span class="band band-na">${esc(t('unt_unverified'))}</span> ${esc(t('unt_entered', { d: NK.UNT_META.entered }))}</p>` : `<p class="muted">${esc(g.creative ? t('unt_creative') : g.note ? L(g.note) : t('unt_nodata'))}</p><p class="tiny"><span class="band band-na">${esc(t('unt_unavailable'))}</span></p>`).join('')}</div></li>
        <li><span class="ch-n">4</span><div><small>${esc(t('unt_c4'))}</small><div class="ulinks">${unis.map(u => `<a href="${u.site}" target="_blank" rel="noopener" class="ulink"><b>${esc(H.uniName(u))}</b><small>${esc(NK.cityName(u.city))}</small>${icon('external-link')}</a>`).join('')}</div></div></li>
        <li><span class="ch-n">5</span><div><small>${esc(t('unt_c5'))}</small><ul class="dl">${NK.UNT_META.sources.map(sr => `<li><a href="${sr.url}" target="_blank" rel="noopener">${esc(L(sr.n))}</a> <span class="tiny muted">${esc(sr.url.replace('https://', ''))}</span></li>`).join('')}</ul><p class="tiny muted">${esc(t('unt_noscores'))}</p></div></li>
      </ol>
      <div class="card"><h3>${icon('info')} ${esc(t('unt_diff_h'))}</h3><p>${esc(t('unt_diff'))}</p></div>
    </div></section>`;
  };
  A['unt-mode'] = el => { const m = el.dataset.m; ui().unt = { mode: m, id: m === 'career' ? (rec().best[0] || { id: 'dev' }).id : NK.UNT_PROGRAMS[0].id }; H.rerenderKeep(); };
  C['unt-sel'] = el => { ui().unt.id = el.value; H.rerenderKeep(); };

  /* ======================== CAREER GUIDE (rule-based assistant) ======================== */
  P.mentor = function () {
    const d = D(); d.mentor = d.mentor || { consent: false, log: [] };
    const log = d.mentor.log;
    return `<section class="page"><div class="wrap narrow-lg">
      <span class="eyebrow">${icon('bot')} ${esc(t('stage_plan'))}</span><h1 class="h1">${esc(t('mt_h'))}</h1><p class="lead">${esc(t('mt_sub'))}</p>
      <div class="warn">${icon('info')}<p>${esc(t('mt_demo_note'))}</p></div>
      <label class="consent card"><input type="checkbox" id="mt-consent" data-change="mt-consent" ${d.mentor.consent ? 'checked' : ''}><span class="box">${icon('check')}</span><span><b>${esc(t('mt_consent'))}</b><small>${esc(t('mt_consent_d'))}</small></span></label>
      <div class="chat card" id="chat" aria-live="polite">
        <div class="msg bot"><span class="avatar sm">${icon('bot')}</span><p>${esc(NK.Mentor.intro(NK.App.lang))}</p></div>
        ${log.map(m => `<div class="msg ${m.who}">${m.who === 'bot' ? `<span class="avatar sm">${icon('bot')}</span>` : ''}<p>${esc(m.text).replace(/\n/g, '<br>')}${m.link ? `<a href="#${m.link}" class="msg-link">${esc(t('go'))} →</a>` : ''}</p></div>`).join('')}
        ${ui().typing ? `<div class="msg bot typing"><span class="avatar sm">${icon('bot')}</span><p><i></i><i></i><i></i></p></div>` : ''}
      </div>
      <div class="mt-chips">${NK.Mentor.chipsFor(NK.App.lang).map(c => `<button class="cchip" data-act="mt-chip" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <form class="mt-form" data-form="mentor"><input id="mt-in" maxlength="300" placeholder="${esc(t('mt_ph'))}" aria-label="${esc(t('mt_ph'))}" autocomplete="off"><button class="btn btn-lime" type="submit">${icon('send')}<span class="sr">${esc(t('mt_send'))}</span></button></form>
      <div class="cta-row"><button class="btn btn-ghost btn-sm" data-act="mt-clear">${icon('trash-2')} ${esc(t('mt_clear'))}</button></div>
    </div></section>`;
  };
  async function ask(q) {
    const d = D(); q = (q || '').trim(); if (!q) return;
    d.mentor.log.push({ who: 'me', text: q }); ui().typing = true; NK.save(); H.rerenderKeep(); scrollChat();
    const r = rec(); const ns = NK.nextStepText();
    const context = d.mentor.consent ? { P: r.P, rec: r, next: ns.text, nextHref: ns.href } : null;
    let res;
    try { res = await NK.Mentor.provider.reply({ text: q, lang: NK.App.lang, context, history: d.mentor.log.slice(-6) }); }
    catch (e) { res = { text: t('mt_error') }; }
    setTimeout(() => { ui().typing = false; d.mentor.log.push({ who: 'bot', text: res.text, link: res.link || null }); d.mentor.log = d.mentor.log.slice(-40); NK.save(); if (location.hash === '#mentor') { H.rerenderKeep(); scrollChat(); const i = $('#mt-in'); if (i) i.focus(); } }, 450);
  }
  const scrollChat = () => { const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; };
  F.mentor = () => { const i = $('#mt-in'); const q = i.value; i.value = ''; ask(q); };
  A['mt-chip'] = el => ask(el.dataset.q);
  A['mt-clear'] = () => { D().mentor.log = []; NK.save(); H.rerenderKeep(); };
  C['mt-consent'] = el => { D().mentor.consent = el.checked; NK.save(); H.toast(t(el.checked ? 'mt_consent_on' : 'mt_consent_off')); };

  /* ======================== PROGRESS & REPORTS ======================== */
  function fullReport() {
    const d = D(), r = rec(), Pf = r.P, u = H.me(), lines = [];
    lines.push('N-KELL — ' + t('rep_title'), (u ? u.nick + ' · ' : '') + new Date().toLocaleDateString(), '');
    lines.push('== ' + t('me_h') + ' ==');
    NK.TESTS.forEach(x => { const p = Pf[x.id]; if (!p) return; const top = E.sortDims(p.s).slice(0, x.id === 'riasec' ? 3 : 3); lines.push(tName(x.id) + (p.src === 'express' ? ' (' + t('src_express') + ')' : '') + ': ' + top.map(k => (x.id === 'riasec' ? k + ' ' + t('k_' + k) : dim(x.id, k)) + ' ' + p.s[k] + '%').join(', ')); });
    lines.push('', '== ' + t('me_ins') + ' ==');
    E.insights(Pf).forEach(x => lines.push('• ' + t(x.k, x.vars.dim ? { v: dim(x.cat, x.vars.dim) } : {}) + ' (' + x.score + '%)'));
    lines.push('', '== ' + t('recs_best') + ' (' + t('cov_short', { p: Math.round(r.coverage * 100) }) + ') ==');
    r.best.forEach((m, i) => { const p = NK.PROF[m.id]; lines.push((i + 1) + '. ' + pname(p) + ' — ' + m.total + '%', '   ' + whyText(m), '   ' + t('rc_chal') + ': ' + challengeText(m).join(' '), '   ' + t('res_subjects') + ': ' + p.subj.map(NK.subjName).join(', ')); });
    lines.push('', '== ' + t('beyond_h') + ' ==');
    r.beyond.forEach(b => lines.push('• ' + pname(NK.PROF[b.m.id]) + ' — ' + t('theme_' + b.theme)));
    const sims = Object.keys(d.sims); if (sims.length) { lines.push('', '== ' + t('nav_sim') + ' =='); sims.forEach(id => lines.push('• ' + L(NK.SIMS[id].title) + ': ' + d.sims[id].best + '%')); }
    const rp = roadProgress(); lines.push('', t('nav_road') + ': ' + rp.done + '/' + rp.total, '', t('test_disclaimer'), t('res_match_note'));
    return lines.join('\n');
  }
  NK.fullReport = fullReport;
  P.reports = function () {
    const d = D(), rp = roadProgress(), n = testsDone();
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('file-text')} ${esc(t('stage_plan'))}</span><h1 class="h1">${esc(t('rep_h'))}</h1><p class="lead">${esc(t('rep_sub'))}</p>
      <div class="pstats">${[[n + '/' + NK.TESTS.length, t('dash_tests'), 'tests'], [d.results.length, t('ex_title'), 'results'], [Object.keys(d.sims).length + '/' + Object.keys(NK.SIMS).length, t('prof_sims'), 'sim'], [(d.viewed || []).length, t('rep_viewed'), 'careers'], [rp.pct + '%', t('nav_road'), 'roadmap']].map(([v, l, h]) => `<a href="#${h}" class="pstat card"><b>${v}</b><span>${esc(l)}</span></a>`).join('')}</div>
      <div class="card"><h3>${icon('clipboard-list')} ${esc(t('rep_tests'))}</h3><div class="tbl-wrap"><table class="dtbl"><thead><tr><th>${esc(t('rep_test'))}</th><th>${esc(t('rep_status'))}</th><th>${esc(t('res_date'))}</th><th></th></tr></thead><tbody>
        ${NK.TESTS.map(x => { const r0 = E.testResult(d, x.id); const st = d.tests[x.id]; return `<tr><td>${icon(x.icon)} ${esc(tName(x.id))}</td><td>${r0 ? `<span class="chip-ok">${esc(t('tc_done'))} · ${r0.answered}/${r0.total}</span>` : st && Object.keys(st.answers || {}).length ? `<span class="chip-warn">${esc(t('tc_inprog'))}</span>` : `<span class="muted tiny">${esc(t('rep_notyet'))}</span>`}</td><td>${r0 ? fmtDate(r0.date) : '—'}</td><td class="row-act"><a class="btn btn-ghost btn-sm" href="#test-${x.id}">${esc(t(r0 ? 'tc_view' : 'test_start'))}</a>${r0 || st ? (ui().confirmDelTest === x.id ? `<button class="btn btn-danger btn-sm" data-act="t-del" data-id="${x.id}">${esc(t('t_del_confirm'))}</button>` : `<button class="btn btn-ghost btn-sm" data-act="t-del-ask" data-id="${x.id}" aria-label="${esc(t('t_del'))}">${icon('trash-2')}</button>`) : ''}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      ${Object.keys(d.sims).length ? `<div class="card"><h3>${icon('play')} ${esc(t('rep_sims'))}</h3><p class="tiny muted">${esc(t('rep_sims_d'))}</p><div class="tbl-wrap"><table class="dtbl"><thead><tr><th>${esc(t('nav_sim'))}</th><th>${esc(t('sim_best'))}</th><th>${esc(t('rep_crit'))}</th></tr></thead><tbody>${Object.keys(d.sims).map(id => `<tr><td>${esc(NK.SIMS[id] ? L(NK.SIMS[id].title) : id)}</td><td>${d.sims[id].best}%</td><td class="tiny">${d.sims[id].crit ? Object.keys(d.sims[id].crit).map(k => esc(t('crit_' + k)) + ' ' + d.sims[id].crit[k] + '%').join(' · ') : '—'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
      <div class="card"><h3>${icon('file-text')} ${esc(t('rep_full'))}</h3><p class="muted tiny">${esc(t('rep_full_d'))}</p><div class="cta-row"><button class="btn btn-lime btn-sm" data-act="rep-print">${icon('download')} ${esc(t('res_pdf'))}</button><button class="btn btn-ghost btn-sm" data-act="rep-copy">${icon('copy')} ${esc(t('copy_report'))}</button></div></div>
      <div class="card"><h3>${icon('lock')} ${esc(t('rep_data'))}</h3><p class="muted tiny">${esc(t('rep_data_d'))}</p><div class="cta-row"><button class="btn btn-ghost btn-sm" data-act="rep-export">${icon('download')} ${esc(t('rep_export'))}</button><a class="btn btn-ghost btn-sm" href="#profile">${icon('trash-2')} ${esc(t('prof_delete'))}</a></div></div>
    </div></section>`;
  };
  const showText = (title, text) => H.modal(`<h3>${esc(title)}</h3>${H.inFrame() ? `<p class="tiny muted">${esc(t('print_blocked'))}</p>` : ''}<textarea id="rep-txt" class="rep-txt" readonly>${esc(text)}</textarea><div class="cta-row"><button class="btn btn-lime btn-sm" data-act="copy-rep">${icon('copy')} ${esc(t('copy_report'))}</button><button class="btn btn-ghost btn-sm" data-act="modal-close">OK</button></div>`);
  A['rep-copy'] = () => showText(t('rep_full'), fullReport());
  A['rep-print'] = () => { if (H.inFrame()) return showText(t('rep_full'), fullReport()); const w = document.createElement('pre'); w.className = 'print-only'; w.textContent = fullReport(); document.body.appendChild(w); document.body.classList.add('printing-report'); H.toast(t('print_hint')); setTimeout(() => { window.print(); document.body.classList.remove('printing-report'); w.remove(); }, 300); };
  A['rep-export'] = () => {
    const json = JSON.stringify({ app: 'N-KELL', exported: new Date().toISOString(), user: H.me() ? { nick: H.me().nick, grade: H.me().grade } : null, data: D() }, null, 2);
    if (H.inFrame()) return showText(t('rep_export'), json);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = 'n-kell-my-data.json'; document.body.appendChild(a); a.click(); a.remove();
  };

  /* ======================== ROADMAP ======================== */
  P.roadmap = function () {
    const d = D(), st = roadStages(), rp = roadProgress(), r = rec();
    const goals = d.road.goals || [], edit = ui().editTask;
    const taskLi = tk => { const on = taskDone(tk); const auto = tk.auto != null; const txt = t(tk.k[0], tk.k[1]); const ext = tk.href && tk.href.startsWith('http'); return `<li><label class="task ${on ? 'on' : ''}"><input type="checkbox" id="tk-${tk.id}" data-change="task2" data-id="${tk.id}" ${on ? 'checked' : ''} ${auto ? 'disabled' : ''}><span class="box">${icon('check')}</span><span>${esc(txt)}${auto ? ` <small class="muted">· ${esc(t('rt_auto'))}</small>` : ''}</span></label>${tk.href ? `<a class="tk-go" href="${ext ? tk.href : '#' + tk.href}" ${ext ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(t('go'))}">${icon(ext ? 'external-link' : 'arrow-right')}</a>` : ''}</li>`; };
    const custLi = c => edit === c.id
      ? `<li><form class="edit-f" data-form="task-edit" data-id="${c.id}"><input id="te-${c.id}" value="${esc(c.t)}" maxlength="140" required aria-label="${esc(t('edit'))}"><input id="ted-${c.id}" type="date" value="${esc(c.d || '')}" aria-label="${esc(t('road_deadline'))}"><button class="btn btn-lime btn-sm" type="submit">${esc(t('prof_save'))}</button></form></li>`
      : `<li><label class="task ${c.done ? 'on' : ''}"><input type="checkbox" id="ct-${c.id}" data-change="ctask" data-id="${c.id}" ${c.done ? 'checked' : ''}><span class="box">${icon('check')}</span><span>${esc(c.t)}${c.d ? ` <small class="muted">· ${icon('calendar')} ${esc(c.d)}</small>` : ''} <small class="mine-t">${esc(t('rt_mine'))}</small></span></label><button class="tk-go" data-act="ct-edit" data-id="${c.id}" aria-label="${esc(t('edit'))}">${icon('pen-tool')}</button><button class="tk-go" data-act="ct-del" data-id="${c.id}" aria-label="${esc(t('delete'))}">${icon('trash-2')}</button></li>`;
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('route')} ${esc(t('stage_plan'))}</span><h1 class="h1">${esc(t('road_h'))}</h1><p class="lead">${esc(t('road_sub2'))}</p>
      ${nextStepCard(true)}
      <div class="road-top card"><div class="rt-ring">${H.ring(rp.pct, 110, 'lime')}</div><div><h3>${esc(t('road_progress'))}</h3><p class="muted">${rp.done} / ${rp.total}</p><div class="tbar"><i style="--w:${rp.pct}%"></i></div></div></div>
      <div class="road-grid">
        <ol class="timeline">${st.map((s, i) => { const all = s.tasks.length + s.custom.length; const dn = s.tasks.filter(x => taskDone(x)).length + s.custom.filter(x => x.done).length; const full = dn === all && all > 0; return `<li class="tl ${full ? 'full' : dn ? 'part' : ''}"><span class="tl-dot">${full ? icon('check') : i + 1}</span><div class="tl-c card"><div class="tl-h">${icon(s.ic)}<h3>${esc(t(s.k))}</h3><span class="tl-n">${dn}/${all}</span></div><ul class="tasks">${s.tasks.map(taskLi).join('')}${s.custom.map(custLi).join('')}</ul></div></li>`; }).join('')}</ol>
        <aside class="road-side">
          <div class="card"><h3>${icon('plus')} ${esc(t('rt_add'))}</h3>
            <form class="goal-f" data-form="ctask-add"><input id="ct-t" required maxlength="140" placeholder="${esc(t('road_goal_ph'))}" aria-label="${esc(t('rt_add'))}"><label class="tiny muted" for="ct-s">${esc(t('rt_stage'))}</label><select id="ct-s">${st.map((s, i) => `<option value="${i + 1}">${i + 1}. ${esc(t(s.k))}</option>`).join('')}</select><label class="tiny muted" for="ct-d">${esc(t('road_deadline'))}</label><input id="ct-d" type="date"><button class="btn btn-violet btn-sm" type="submit">${icon('plus')} ${esc(t('road_add'))}</button></form></div>
          <div class="card"><h3>${icon('flag')} ${esc(t('road_goals'))}</h3>
            <form class="goal-f" data-form="goal"><input id="goal-t" required maxlength="120" placeholder="${esc(t('road_goal_ph'))}" aria-label="${esc(t('road_goals'))}"><label class="tiny muted" for="goal-d">${esc(t('road_deadline'))}</label><input id="goal-d" type="date"><button class="btn btn-violet btn-sm" type="submit">${icon('plus')} ${esc(t('road_add'))}</button></form>
            ${goals.length ? `<ul class="tasks goals">${goals.map((g, i) => ui().editGoal === i ? `<li><form class="edit-f" data-form="goal-edit" data-i="${i}"><input id="ge-${i}" value="${esc(g.t)}" maxlength="120" required><input id="ged-${i}" type="date" value="${esc(g.d || '')}"><button class="btn btn-lime btn-sm" type="submit">${esc(t('prof_save'))}</button></form></li>` : `<li><label class="task ${g.done ? 'on' : ''}"><input type="checkbox" id="goal-${i}" data-change="goal2" data-i="${i}" ${g.done ? 'checked' : ''}><span class="box">${icon('check')}</span><span>${esc(g.t)}${g.d ? `<small class="muted"> · ${icon('calendar')} ${esc(g.d)}</small>` : ''}</span></label><button class="tk-go" data-act="goal-edit" data-i="${i}" aria-label="${esc(t('edit'))}">${icon('pen-tool')}</button><button class="tk-go" data-act="goal-del2" data-i="${i}" aria-label="${esc(t('delete'))}">${icon('trash-2')}</button></li>`).join('')}</ul>` : `<p class="muted tiny">${esc(t('road_nogoals'))}</p>`}</div>
          <div class="card"><h3>${icon('heart')} ${esc(t('road_favs'))}</h3>${d.favs.length ? `<div class="minis">${d.favs.filter(id => NK.PROF[id]).map(id => miniCareer(r.byId[id] || { id })).join('')}</div>` : `<p class="muted tiny">${esc(t('road_nofavs'))}</p><a href="#careers" class="btn btn-ghost btn-sm">${esc(t('nav_careers'))} ${icon('arrow-right')}</a>`}</div>
          <button class="btn btn-ghost btn-sm" data-act="make-plan">${icon('sparkles')} ${esc(t('dev_plan'))}</button>
        </aside>
      </div>
    </div></section>`;
  };
  C.task2 = el => { D().road.done[el.dataset.id] = el.checked; NK.save(); H.rerenderKeep(); };
  C.ctask = el => { const c = (D().tasks || []).find(x => x.id === el.dataset.id); if (c) { c.done = el.checked; NK.save(); H.rerenderKeep(); } };
  C.goal2 = el => { D().road.goals[+el.dataset.i].done = el.checked; NK.save(); H.rerenderKeep(); };
  A['ct-edit'] = el => { ui().editTask = el.dataset.id; H.rerenderKeep(); const i = $('#te-' + el.dataset.id); if (i) i.focus(); };
  A['ct-del'] = el => { D().tasks = (D().tasks || []).filter(x => x.id !== el.dataset.id); NK.save(); H.rerenderKeep(); };
  A['goal-edit'] = el => { ui().editGoal = +el.dataset.i; H.rerenderKeep(); };
  A['goal-del2'] = el => { D().road.goals.splice(+el.dataset.i, 1); NK.save(); H.rerenderKeep(); };
  F['ctask-add'] = () => { const tx = $('#ct-t').value.trim(); if (!tx) return; const d = D(); d.tasks = d.tasks || []; d.tasks.push({ id: 'c' + Date.now().toString(36), t: tx, stage: +$('#ct-s').value || 1, d: $('#ct-d').value, done: false }); NK.save(); H.rerenderKeep(); H.toast(t('toast_saved')); };
  F['task-edit'] = f => { const id = f.dataset.id; const c = (D().tasks || []).find(x => x.id === id); const v = $('#te-' + id).value.trim(); if (c && v) { c.t = v; c.d = $('#ted-' + id).value; } ui().editTask = null; NK.save(); H.rerenderKeep(); H.toast(t('toast_saved')); };
  F.goal = () => { const tx = $('#goal-t').value.trim(); if (!tx) return; D().road.goals.push({ t: tx, d: $('#goal-d').value, done: false }); NK.save(); H.rerenderKeep(); H.toast(t('toast_saved')); };
  F['goal-edit'] = f => { const i = +f.dataset.i; const g = D().road.goals[i]; const v = $('#ge-' + i).value.trim(); if (g && v) { g.t = v; g.d = $('#ged-' + i).value; } ui().editGoal = null; NK.save(); H.rerenderKeep(); H.toast(t('toast_saved')); };

  /* ======================== ACCOUNT (profile) ======================== */
  const CL = () => NK.Cloud;
  const cloud = () => H.cloudOn();
  const busy = async (fn) => { try { await fn(); } catch (e) { H.toast(t('cloud_err')); } H.rerenderKeep(); };
  P.profile = function () {
    const u = H.me(), d = D();
    let groupName = null, cons = d.consent || {};
    if (cloud()) { const m = CL().membership; if (m) { groupName = m.name; cons = { status: m.share_status, agg: m.share_agg }; } }
    else { const groups = H.S.get('nk_groups', {}); if (u && u.group && groups[u.group]) groupName = groups[u.group].name; }
    const head = u ? `<div class="prof-h card"><span class="avatar lg">${esc(u.nick.slice(0, 1).toUpperCase())}</span><div><h1 class="h1 sm">${esc(u.nick)}</h1><p class="muted">${esc(t(u.role === 'teacher' ? 'role_teacher' : 'role_student'))}${u.grade && u.grade !== '-' ? ' · ' + esc(u.grade) + ' ' + esc(t('grade_word')) : ''}${u.school ? ' · ' + esc(u.school) : ''}</p>${u.email ? `<p class="tiny muted">${icon('mail')} ${esc(u.email)}</p>` : ''}</div><button class="btn btn-ghost btn-sm" data-act="logout">${icon('log-out')} ${esc(t('logout'))}</button></div>`
      : `<div class="warn">${icon('info')}<p>${esc(t('prof_guest'))}</p></div><div class="cta-row"><a href="#register" class="btn btn-lime">${esc(t('register'))}</a><a href="#login" class="btn btn-ghost">${esc(t('login'))}</a></div>`;
    return `<section class="page"><div class="wrap narrow-lg">
      <h1 class="h1">${esc(t('acct_h'))}</h1>${head}
      <div class="pstats"><a href="#tests" class="pstat card"><b>${testsDone()}/${NK.TESTS.length}</b><span>${esc(t('dash_tests'))}</span></a><a href="#me" class="pstat card"><b>${rec().P.riasec ? E.sortDims(rec().P.riasec.s).slice(0, 3).join('') : '—'}</b><span>${esc(t('res_code'))}</span></a><a href="#careers" class="pstat card"><b>${d.favs.length}</b><span>${esc(t('prof_favs'))}</span></a><a href="#roadmap" class="pstat card"><b>${roadProgress().pct}%</b><span>${esc(t('prof_road'))}</span></a><a href="#sim" class="pstat card"><b>${Object.keys(d.sims).length}</b><span>${esc(t('prof_sims'))}</span></a></div>
      ${u ? `<form class="card pform" data-form="profile2"><h3>${icon('user')} ${esc(t('profile'))}</h3>
        <div class="two-in"><div><label for="p-nick">${esc(t('auth_nick'))}</label><input id="p-nick" value="${esc(u.nick)}" maxlength="30"></div><div><label for="p-grade">${esc(t('auth_grade'))}</label><select id="p-grade">${['9', '10', '11', '-'].map(g => `<option ${u.grade === g ? 'selected' : ''} value="${g}">${g === '-' ? '—' : g}</option>`).join('')}</select></div></div>
        <label for="p-school">${esc(t('auth_school'))}</label><input id="p-school" value="${esc(u.school || '')}" maxlength="60"><p class="tiny muted">${esc(t('acct_min'))}</p>
        <button class="btn btn-violet btn-sm" type="submit">${esc(t('prof_save'))}</button></form>` : ''}
      ${u && u.role !== 'teacher' ? `<div class="card"><h3>${icon('users')} ${esc(t('prof_group'))}</h3>
        ${groupName ? `<p>${esc(t('prof_joined'))}: <b>${esc(groupName)}</b> <code>${esc(u.group)}</code></p>
          <label class="consent"><input type="checkbox" id="c-status" data-change="consent" data-k="status" ${cons.status ? 'checked' : ''}><span class="box">${icon('check')}</span><span><b>${esc(t('cons_status'))}</b><small>${esc(t('cons_status_d'))}</small></span></label>
          <label class="consent"><input type="checkbox" id="c-agg" data-change="consent" data-k="agg" ${cons.agg ? 'checked' : ''}><span class="box">${icon('check')}</span><span><b>${esc(t('cons_agg'))}</b><small>${esc(t('cons_agg_d'))}</small></span></label>
          <button class="btn btn-ghost btn-sm" data-act="group-leave2">${esc(t('prof_leave'))}</button>`
        : `<form class="inline-f" data-form="join2"><input id="j-code" placeholder="${esc(t('prof_code_ph'))}" maxlength="8" aria-label="${esc(t('prof_code_ph'))}"><button class="btn btn-violet btn-sm" type="submit">${esc(t('prof_join'))}</button>
            <label class="consent"><input type="checkbox" id="j-status" checked><span class="box">${icon('check')}</span><span><b>${esc(t('cons_status'))}</b><small>${esc(t('cons_status_d'))}</small></span></label>
            <label class="consent"><input type="checkbox" id="j-agg" checked><span class="box">${icon('check')}</span><span><b>${esc(t('cons_agg'))}</b><small>${esc(t('cons_agg_d'))}</small></span></label></form><p class="err" id="j-err" role="alert"></p>`}
        <p class="tiny muted">${icon('lock')} ${esc(t('prof_group_note2'))}</p></div>` : ''}
      ${u && u.role === 'teacher' ? `<a href="#teacher" class="btn btn-lime">${icon('users')} ${esc(t('teacher'))}</a>` : ''}
      <div class="card"><h3>${icon('shield-check')} ${esc(t('acct_who'))}</h3><ul class="dl">${['who_1', 'who_2', 'who_3', 'who_4'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ul></div>
      <div class="card danger"><h3>${icon('trash-2')} ${esc(t('prof_delete'))}</h3><p class="tiny muted">${esc(t('acct_del_d'))}</p>
        ${ui().confirmDel ? `<button class="btn btn-danger btn-sm" data-act="del-confirm2">${esc(t('prof_delete_confirm'))}</button> <button class="btn btn-ghost btn-sm" data-act="del-cancel2">${esc(t('back'))}</button>` : `<button class="btn btn-ghost btn-sm" data-act="del-ask2">${esc(t('prof_delete'))}</button>`}</div>
    </div></section>`;
  };
  F.profile2 = () => {
    const nick = $('#p-nick').value.trim(), grade = $('#p-grade').value, school = $('#p-school').value.trim();
    if (cloud()) return busy(async () => { await CL().updateProfile(Object.assign({ grade, school }, nick.length >= 2 ? { nickname: nick } : {})); await CL().syncMember(D()); H.toast(t('prof_saved')); });
    const us = H.users(); const u = us[NK.App.uid]; if (nick.length >= 2) u.nick = nick; u.grade = grade; u.school = school; H.S.set('nk_users', us); H.rerenderKeep(); H.toast(t('prof_saved'));
  };
  F.join2 = () => {
    const code = $('#j-code').value.trim().toUpperCase(), st = $('#j-status').checked, ag = $('#j-agg').checked;
    if (cloud()) return (async () => {
      try { const name = await CL().groupName(code); if (!name) { $('#j-err').textContent = t('prof_bad_code'); return; } await CL().joinGroup(code, st, ag, D()); H.toast(t('prof_joined') + ': ' + name); }
      catch (e) { $('#j-err').textContent = t('cloud_err'); return; }
      H.rerenderKeep();
    })();
    const gs = H.S.get('nk_groups', {}); if (!gs[code]) { $('#j-err').textContent = t('prof_bad_code'); return; }
    const us = H.users(); us[NK.App.uid].group = code; H.S.set('nk_users', us); D().consent = { status: st, agg: ag }; NK.save(); H.rerenderKeep(); H.toast(t('prof_joined') + ': ' + gs[code].name);
  };
  C.consent = el => {
    if (cloud()) return busy(async () => { await CL().setConsent(el.dataset.k, el.checked, D()); H.toast(t('toast_saved')); });
    const d = D(); d.consent = Object.assign({}, d.consent, { [el.dataset.k]: el.checked }); NK.save(); H.toast(t('toast_saved'));
  };
  A['group-leave2'] = () => {
    if (cloud()) return busy(() => CL().leaveGroup());
    const us = H.users(); delete us[NK.App.uid].group; H.S.set('nk_users', us); H.rerenderKeep();
  };
  A['del-ask2'] = () => { ui().confirmDel = true; H.rerenderKeep(); };
  A['del-cancel2'] = () => { ui().confirmDel = false; H.rerenderKeep(); };
  A['del-confirm2'] = async () => {
    ui().confirmDel = false;
    if (cloud() && NK.App.uid) { try { await CL().deleteAccount(); } catch (e) { H.toast(t('cloud_err')); H.rerenderKeep(); return; } }
    H.S.del(H.dataKey(NK.App.uid));
    if (NK.App.uid && !cloud()) { const us = H.users(); delete us[NK.App.uid]; H.S.set('nk_users', us); }
    NK.App.uid = null; H.S.set('nk_session', null);
    H.loadData(); NK.App.testView = 'intro'; H.toast(t('prof_deleted')); location.hash = 'home';
  };

  /* ======================== TEACHER DASHBOARD ======================== */
  const R6 = ['R', 'I', 'A', 'S', 'E', 'C'];
  /* Local mode: builds the same shape as the cloud group_overview() function. */
  function localOverview(code) {
    const us = Object.values(H.users()).filter(u => u.group === code && u.role !== 'teacher');
    const rows = us.map(u => { const d = Object.assign(H.blank(), H.S.get(H.dataKey(u.id), {})); const c = d.consent || {}; return { u, d, status: !!c.status, agg: !!c.agg }; });
    const members = rows.map(r => ({ nickname: r.u.nick, shared: r.status, tests: r.status ? NK.TESTS.filter(x => E.testResult(r.d, x.id)).map(x => x.id) : null, express: r.status ? !!r.d.results.length : null, sims: r.status ? Object.keys(r.d.sims || {}).length : null }));
    const withR = rows.filter(r => r.agg).map(r => E.unifiedProfile(r.d).riasec).filter(Boolean);
    const out = { members, agg_n: withR.length, riasec_avg: null, riasec_dominant: null };
    if (withR.length >= 3) {
      out.riasec_avg = {}; out.riasec_dominant = {};
      R6.forEach(k => { out.riasec_avg[k] = Math.round(withR.reduce((s, p) => s + (p.s[k] || 0), 0) / withR.length); });
      withR.forEach(p => { const top = R6.slice().sort((a, b) => (p.s[b] || 0) - (p.s[a] || 0) || a.localeCompare(b))[0]; out.riasec_dominant[top] = (out.riasec_dominant[top] || 0) + 1; });
    }
    return out;
  }
  function stats(ov) {
    const shared = ov.members.filter(m => m.shared);
    const testDone = {}; NK.TESTS.forEach(x => { testDone[x.id] = shared.filter(m => (m.tests || []).includes(x.id)).length; });
    const anyDone = shared.filter(m => (m.tests || []).length || m.express).length;
    const avgTests = shared.length ? (shared.reduce((s, m) => s + (m.tests || []).length, 0) / shared.length).toFixed(1) : '0';
    const simUsers = shared.filter(m => m.sims > 0).length;
    const dom = {}; R6.forEach(k => { dom[k] = (ov.riasec_dominant && ov.riasec_dominant[k]) || 0; });
    return { members: ov.members, statusN: shared.length, testDone, anyDone, avgTests, simUsers, avg: ov.riasec_avg, dom, aggN: ov.agg_n };
  }
  function teacherGroups() {
    if (!cloud()) return Object.values(H.S.get('nk_groups', {})).filter(g => g.owner === NK.App.uid);
    if (CL().groups === null) { CL().listGroups().then(() => H.rerenderKeep(), () => H.toast(t('cloud_err'))); return null; }
    return CL().groups;
  }
  function overviewOf(code) {
    if (!cloud()) return localOverview(code);
    const ov = CL().overview[code];
    if (!ov) { CL().loadOverview(code).then(() => H.rerenderKeep(), () => H.toast(t('cloud_err'))); return null; }
    return ov;
  }
  P.teacher = function () {
    const u = H.me();
    if (!u || u.role !== 'teacher') return `<section class="page"><div class="wrap narrow center empty"><div class="empty-ic">${icon('users')}</div><h1 class="h1">${esc(t('tch_h'))}</h1><p class="lead">${esc(t('tch_only'))}</p><div class="cta-row center"><a href="#register" class="btn btn-lime">${esc(t('register'))}</a><a href="#login" class="btn btn-ghost">${esc(t('login'))}</a></div></div></section>`;
    const groups = teacherGroups();
    return `<section class="page"><div class="wrap">
      <span class="eyebrow">${icon('users')} ${esc(t('role_teacher'))}</span><h1 class="h1">${esc(t('tch_h'))}</h1><p class="lead">${esc(t('tch_sub'))}</p>
      <div class="safe card">${icon('shield-check')}<div><h3>${esc(t('tch_priv_h'))}</h3><ul class="dl">${['tp_1', 'tp_2', 'tp_3', 'tp_4'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ul></div></div>
      <form class="card inline-f" data-form="group"><h3>${icon('plus')} ${esc(t('tch_new'))}</h3><input id="g-name" required maxlength="40" placeholder="${esc(t('tch_name_ph'))}" aria-label="${esc(t('tch_new'))}"><button class="btn btn-lime btn-sm" type="submit">${esc(t('tch_create'))}</button></form>
      ${groups === null ? `<p class="muted">${esc(t('cloud_loading'))}</p>` : groups.length ? groups.map(groupCard).join('') : `<div class="empty-s">${icon('users')}<p>${esc(t('tch_nogroups'))}</p></div>`}
    </div></section>`;
  };
  function groupCard(g) {
    const ov = overviewOf(g.code);
    const head = `<div class="sec-head"><div><h3>${esc(g.name)}</h3><p class="muted">${esc(t('tch_code'))}: <code class="gcode sel">${esc(g.code)}</code></p></div>
        <div class="cta-row">${cloud() ? `<button class="btn btn-ghost btn-sm" data-act="tch-refresh" data-code="${g.code}">${icon('rotate-ccw')} ${esc(t('tch_refresh'))}</button>` : ''}<button class="btn btn-ghost btn-sm" data-act="csv2" data-code="${g.code}">${icon('download')} ${esc(t('tch_export'))}</button><button class="btn btn-ghost btn-sm" data-act="csv-copy2" data-code="${g.code}">${icon('copy')} ${esc(t('tch_copy_csv'))}</button></div></div>`;
    if (!ov) return `<div class="card gcard">${head}<p class="muted">${esc(t('cloud_loading'))}</p></div>`;
    const st = stats(ov); const n = st.members.length; const roster = g.roster || [];
    const joined = st.members.map(m => m.nickname.toLowerCase());
    const pending = roster.filter(nk => !joined.includes(nk.toLowerCase()));
    const maxDom = Math.max(1, ...Object.values(st.dom));
    return `<div class="card gcard">${head}
      <div class="pstats four"><div class="pstat"><b>${n}</b><span>${esc(t('tch_members'))}</span></div><div class="pstat"><b>${st.anyDone}/${st.statusN}</b><span>${esc(t('tch_completed'))}</span></div><div class="pstat"><b>${st.avgTests}</b><span>${esc(t('tch_avgtests'))}</span></div><div class="pstat"><b>${st.simUsers}</b><span>${esc(t('tch_simusers'))}</span></div></div>
      <h4>${esc(t('tch_bytest'))}</h4><div class="tbars">${NK.TESTS.map(x => `<div class="bar-row"><div class="bar-lbl"><span>${esc(tName(x.id))}</span><b>${st.testDone[x.id]}/${st.statusN}</b></div><div class="bar"><i style="--w:${st.statusN ? Math.max(2, st.testDone[x.id] / st.statusN * 100) : 2}%"></i></div></div>`).join('')}</div>
      ${st.avg ? `<div class="res-grid"><div><h4>${esc(t('tch_dist'))}</h4>${R6.map(k => sbar(t('k_' + k) + ' — ' + t('avg'), st.avg[k])).join('')}</div>
        <div><h4>${esc(t('tch_dom'))}</h4><div class="vbars">${R6.map(k => `<div class="vb"><i style="--h:${st.dom[k] / maxDom * 100}%"></i><b>${st.dom[k]}</b><span>${k}</span></div>`).join('')}</div><p class="tiny muted">${esc(t('tch_n', { n: st.aggN }))}</p></div></div>` : `<p class="muted tiny">${icon('info')} ${esc(t('tch_min'))}</p>`}
      <details><summary>${esc(t('tch_part'))} (${n + pending.length})</summary><ul class="hist">${st.members.map(m => `<li><span>${esc(m.nickname)}</span>${m.shared ? `<span class="${(m.tests || []).length || m.express ? 'chip-ok' : 'chip-warn'}">${esc(t('tch_tests_n', { n: (m.tests || []).length + (m.express ? 1 : 0) }))}</span>` : `<span class="muted tiny">${esc(t('tch_private'))}</span>`}</li>`).join('')}${pending.map(nk => `<li><span>${esc(nk)}</span><span class="muted tiny">${esc(t('tch_invited'))}</span><button class="tk-go" data-act="roster-del" data-code="${g.code}" data-n="${esc(nk)}" aria-label="${esc(t('delete'))}">${icon('trash-2')}</button></li>`).join('')}</ul></details>
      <form class="inline-f" data-form="roster" data-code="${g.code}"><input id="r-${g.code}" maxlength="30" placeholder="${esc(t('tch_add_ph'))}" aria-label="${esc(t('tch_add'))}"><button class="btn btn-ghost btn-sm" type="submit">${icon('user-plus')} ${esc(t('tch_add'))}</button></form>
      <p class="tiny muted">${esc(t('tch_add_d'))}</p>
      <div class="cta-row"><button class="btn btn-ghost btn-sm" data-act="group-del2" data-code="${g.code}">${icon('trash-2')} ${esc(t('tch_delete_group'))}</button></div>
    </div>`;
  }
  function groupCsv(code) {
    const g = (teacherGroups() || []).find(x => x.code === code); const ov = overviewOf(code); if (!g || !ov) return '';
    const st = stats(ov); const ok = !!st.avg;
    const rows = [['group', 'members', 'consenting_status', 'with_any_result', 'avg_tests_per_student', 'students_with_simulation']];
    rows.push([g.name, st.members.length, st.statusN, st.anyDone, st.avgTests, st.simUsers]);
    rows.push([]); rows.push(['assessment', 'completed']); NK.TESTS.forEach(x => rows.push([L(x.title), st.testDone[x.id]]));
    rows.push([]); rows.push(['riasec_type', 'average_score', 'dominant_count']); R6.forEach(k => rows.push([k, ok ? st.avg[k] : 'n<3', ok ? st.dom[k] : 'n<3']));
    return rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
  }
  F.group = () => {
    const name = $('#g-name').value.trim(); if (!name) return;
    if (cloud()) return busy(async () => { await CL().createGroup(name); H.toast(t('toast_saved')); });
    const gs = H.S.get('nk_groups', {}); let code; do { code = Math.random().toString(36).slice(2, 8).toUpperCase(); } while (gs[code]);
    gs[code] = { code, name, owner: NK.App.uid, created: new Date().toISOString(), roster: [] }; H.S.set('nk_groups', gs); H.rerenderKeep(); H.toast(t('toast_saved'));
  };
  F.roster = f => {
    const code = f.dataset.code; const v = $('#r-' + code).value.trim(); if (v.length < 2) return;
    if (cloud()) { const g = CL().groups.find(x => x.code === code); return busy(async () => { await CL().updateRoster(code, [...new Set((g.roster || []).concat(v))]); H.toast(t('toast_saved')); }); }
    const gs = H.S.get('nk_groups', {}); gs[code].roster = [...new Set((gs[code].roster || []).concat(v))]; H.S.set('nk_groups', gs); H.rerenderKeep(); H.toast(t('toast_saved'));
  };
  A['roster-del'] = el => {
    const code = el.dataset.code, nk = el.dataset.n;
    if (cloud()) { const g = CL().groups.find(x => x.code === code); return busy(() => CL().updateRoster(code, (g.roster || []).filter(x => x !== nk))); }
    const gs = H.S.get('nk_groups', {}); const g = gs[code]; g.roster = (g.roster || []).filter(x => x !== nk); H.S.set('nk_groups', gs); H.rerenderKeep();
  };
  A['tch-refresh'] = el => busy(() => CL().loadOverview(el.dataset.code));
  A.csv2 = el => { const csv = groupCsv(el.dataset.code); if (!csv) return; if (H.inFrame()) return showText('CSV', csv); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'n-kell-' + el.dataset.code + '.csv'; document.body.appendChild(a); a.click(); a.remove(); };
  A['csv-copy2'] = el => showText('CSV', groupCsv(el.dataset.code));
  A['group-del2'] = el => {
    const code = el.dataset.code;
    if (cloud()) return busy(() => CL().deleteGroup(code));
    const gs = H.S.get('nk_groups', {}); delete gs[code]; H.S.set('nk_groups', gs); const us = H.users(); Object.values(us).forEach(x => { if (x.group === code) delete x.group; }); H.S.set('nk_users', us); H.rerenderKeep();
  };

  NK.boot();
})();
