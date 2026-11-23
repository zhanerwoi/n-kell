/* N-KELL — Engine: assessment scoring, unified profile, explainable career matching,
   insights and next-step logic. Pure functions only (no DOM), so they can be unit-tested
   and later moved to a backend unchanged. */
window.NK = window.NK || {};
NK.Engine = (function () {
  'use strict';

  /* ---------- Configuration (documented, user-adjustable) ----------
     Weights are initial DESIGN ASSUMPTIONS for an exploratory model, not scientific coefficients.
     interests   — Holland RIASEC interests (dedicated test, or the express test as fallback)
     strengths   — self-reported strengths (Strengths test, or express ability items)
     values      — work values
     env         — preferred work environment
     motivation  — motivational drivers
     personality — Big Five preferences that relate to the career's typical tasks
                   (Emotional Stability is deliberately NOT used for matching). */
  const CONFIG = {
    weights: { interests: 0.35, strengths: 0.20, values: 0.15, env: 0.10, motivation: 0.10, personality: 0.10 },
    codeWeights: [0.5, 0.3, 0.2],
    bands: { low: 40, high: 60 } // <40 lower · 40–59 balanced · ≥60 higher
  };
  const COMPONENTS = Object.keys(CONFIG.weights);

  /* ---------- Answer validation ---------- */
  function validAnswer(item, a) {
    if (a == null) return false;
    switch (item.type) {
      case 'likert': case 'bipolar': return Number.isInteger(a) && a >= 1 && a <= 5;
      case 'choice': return Number.isInteger(a) && a >= 0 && a < item.opts.length;
      case 'pair': return a === 'a' || a === 'b';
      default: return false;
    }
  }

  /* ---------- Generic scoring with reverse keys and normalisation ----------
     Skipped/invalid answers are excluded from BOTH earned and max points. */
  function scoreTest(test, answers) {
    const earned = {}, max = {}, n = {};
    test.dims.forEach(d => { earned[d] = 0; max[d] = 0; n[d] = 0; });
    const add = (d, e, m) => { if (!(d in max)) return; earned[d] += e; max[d] += m; n[d]++; };
    let answered = 0;
    test.items.forEach(it => {
      const a = answers ? answers[it.id] : undefined;
      if (!validAnswer(it, a)) return;
      answered++;
      if (it.type === 'likert') add(it.dim, it.rev ? 5 - a : a - 1, 4);
      else if (it.type === 'bipolar') { add(it.l.d, 5 - a, 4); add(it.r.d, a - 1, 4); }
      else if (it.type === 'pair') { const win = a === 'a' ? it.a.d : it.b.d; add(it.a.d, win === it.a.d ? 2 : 0, 2); add(it.b.d, win === it.b.d ? 2 : 0, 2); }
      else if (it.type === 'choice') {
        const dims = new Set(); it.opts.forEach(o => Object.keys(o.p).forEach(d => dims.add(d)));
        dims.forEach(d => add(d, it.opts[a].p[d] || 0, Math.max.apply(null, it.opts.map(o => o.p[d] || 0))));
      }
    });
    const scores = {};
    test.dims.forEach(d => { scores[d] = max[d] > 0 ? Math.round(earned[d] / max[d] * 100) : null; });
    return { scores, n, answered, total: test.items.length };
  }

  const band = v => (v == null ? 'na' : v < CONFIG.bands.low ? 'low' : v < CONFIG.bands.high ? 'mid' : 'high');
  const sortDims = (scores) => Object.keys(scores).filter(k => scores[k] != null).sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  const mean = arr => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

  /* ---------- Unified profile (best available source per component) ---------- */
  function testResult(data, id) { const r = data.tests && data.tests[id]; return r && r.done && r.result ? r.result : null; }
  function unifiedProfile(data) {
    const ex = data.results && data.results.length ? data.results[data.results.length - 1].scores : null;
    const pick = (src, map) => { const o = {}; Object.keys(map).forEach(k => { const v = typeof map[k] === 'function' ? map[k](src) : src[map[k]]; if (v != null && !isNaN(v)) o[k] = Math.round(v); }); return o; };
    const from = (id, fallback) => { const r = testResult(data, id); if (r) return { s: r.scores, src: id, date: r.date }; return fallback || null; };
    return {
      riasec: from('riasec', ex && { s: pick(ex, { R: 'R', I: 'I', A: 'A', S: 'S', E: 'E', C: 'C' }), src: 'express' }),
      strengths: from('strengths', ex && { s: pick(ex, { analytic: 'an', logic: 'an', math: 'ma', creat: 'cr', verbal: 'co', tech: e => (e.pr + e.di) / 2, leader: 'lead', team: 'team' }), src: 'express' }),
      values: from('values', ex && { s: pick(ex, { money: 'money', indep: 'indep', vcre: 'vcre', impact: 'impact', recog: 'recog', growth: 'growth', help: 'help' }), src: 'express' }),
      env: from('env', ex && { s: pick(ex, { office: 'office', field: 'outdoor', lab: 'lab', studio: 'studio', people: 'people', remote: 'remote', dynamic: 'dyn', struct: 'struct', solo: 'solo', collab: 'team', lead: 'lead', practical: 'hands', theory: 'res' }), src: 'express' }),
      motivation: from('motivation'),
      bigfive: from('bigfive'),
      learning: from('learning'),
      readiness: from('readiness')
    };
  }

  /* ---------- Profession features (derived transparently from catalogue data) ---------- */
  const AB2S = { an: ['analytic', 'logic'], ma: ['math'], cr: ['creat'], co: ['verbal'], pr: ['tech', 'probsolve'], di: ['tech'] };
  const VA2V = { money: ['money', 'secur'], vcre: ['vcre'], help: ['help'], indep: ['indep'], impact: ['impact'], growth: ['growth', 'intel'], recog: ['recog'] };
  const EN2E = { office: ['office'], outdoor: ['field'], lab: ['lab'], studio: ['studio'], people: ['people'], remote: ['remote'], dyn: ['dynamic', 'flex'], struct: ['struct', 'stable'] };
  const PE2 = { strengths: { lead: ['leader'], team: ['team'], res: ['analytic'] }, values: { lead: ['lead'], team: ['collab'] }, env: { solo: ['solo'], team: ['collab'], hands: ['practical'], res: ['theory'], lead: ['lead'] }, personality: { team: ['A'], lead: ['E'], res: ['O'] } };
  const VA2M = { money: ['fin'], recog: ['mrecog'], help: ['contrib'], impact: ['contrib'], indep: ['auto'], growth: ['pgrowth', 'curio'], vcre: ['auto'] };
  const CODE2M = { R: ['ach'], I: ['curio'], A: ['auto'], S: ['contrib'], E: ['comp', 'ach'], C: ['ach'] };
  const CODE2B = { R: ['C'], I: ['O'], A: ['O'], S: ['A', 'E'], E: ['E'], C: ['C'] };
  const _feat = {};
  function profFeatures(p) {
    if (_feat[p.id]) return _feat[p.id];
    const S = () => new Set();
    const f = { strengths: S(), values: S(), env: S(), motivation: S(), personality: S() };
    const put = (set, arr) => (arr || []).forEach(x => set.add(x));
    p.ab.forEach(k => put(f.strengths, AB2S[k]));
    p.va.forEach(k => { put(f.values, VA2V[k]); put(f.motivation, VA2M[k]); });
    p.en.forEach(k => put(f.env, EN2E[k]));
    p.pe.forEach(k => ['strengths', 'values', 'env', 'personality'].forEach(c => put(f[c], PE2[c][k])));
    p.code.split('').forEach((l, i) => { if (i < 2) { put(f.motivation, CODE2M[l]); put(f.personality, CODE2B[l]); } });
    const out = { code: p.code };
    Object.keys(f).forEach(k => { out[k] = Array.from(f[k]); });
    return (_feat[p.id] = out);
  }

  /* ---------- Explainable matching ---------- */
  function getWeights(data) {
    const w = Object.assign({}, CONFIG.weights);
    if (data && data.weights) COMPONENTS.forEach(k => { const v = +data.weights[k]; if (!isNaN(v) && v >= 0 && v <= 1) w[k] = v; });
    return w;
  }
  function matchCareer(p, P, w, data) {
    const F = profFeatures(p);
    const vec = c => (P[c] ? P[c].s : null);
    const comps = {};
    const R = vec('riasec');
    if (R) { const letters = F.code.split(''); const have = letters.map((l, i) => [l, CONFIG.codeWeights[i]]).filter(([l]) => R[l] != null); const ws = have.reduce((s, x) => s + x[1], 0); comps.interests = ws ? have.reduce((s, [l, cw]) => s + cw * R[l], 0) / ws : null; } else comps.interests = null;
    const avg = (c, src) => { const v = vec(src); if (!v) return null; return mean(F[c].filter(d => v[d] != null).map(d => v[d])); };
    comps.strengths = avg('strengths', 'strengths');
    comps.values = avg('values', 'values');
    comps.env = avg('env', 'env');
    comps.motivation = avg('motivation', 'motivation');
    comps.personality = avg('personality', 'bigfive');
    const avail = COMPONENTS.filter(c => comps[c] != null && w[c] > 0);
    const wsum = avail.reduce((s, c) => s + w[c], 0);
    const wall = COMPONENTS.reduce((s, c) => s + w[c], 0) || 1;
    const total = wsum ? Math.round(avail.reduce((s, c) => s + w[c] * comps[c], 0) / wsum) : null;
    // Evidence for explanations
    const good = (src, dims, th) => { const v = vec(src); return v ? dims.filter(d => v[d] != null && v[d] >= th).sort((a, b) => v[b] - v[a]).map(d => [d, v[d]]) : []; };
    const lowOf = (src, dims, th) => { const v = vec(src); return v ? dims.filter(d => v[d] != null && v[d] < th).sort((a, b) => v[a] - v[b]).map(d => [d, v[d]]) : []; };
    const ev = {
      interests: R ? F.code.split('').filter(l => R[l] != null && R[l] >= 55).map(l => [l, R[l]]) : [],
      strengths: good('strengths', F.strengths, 60),
      values: good('values', F.values, 60),
      motivation: good('motivation', F.motivation, 60),
      develop: lowOf('strengths', F.strengths, 50),
      challengesEnv: lowOf('env', F.env, 40),
      challengesInt: R ? F.code.split('').slice(0, 1).filter(l => R[l] != null && R[l] < 40).map(l => [l, R[l]]) : [],
      challengesPers: lowOf('bigfive', F.personality.filter(d => d !== 'ES'), 35)
    };
    const simId = NK.SIM_FOR && NK.SIM_FOR[p.id];
    const sim = simId && data && data.sims && data.sims[simId] ? { id: simId, best: data.sims[simId].best } : null;
    return { id: p.id, total, comps, coverage: wsum / wall, avail, ev, sim, F };
  }

  /* ---------- "Beyond your first choice" themes ---------- */
  const THEMES = [
    { id: 'math', when: (R, S) => (S.math >= 60 || S.analytic >= 60) || (R.I >= 55 && R.C >= 55), profs: ['data', 'fin', 'actuary', 'opsres', 'quant'] },
    { id: 'arttech', when: (R, S) => R.A >= 55 && (S.tech >= 55 || R.I >= 55 || R.R >= 55), profs: ['ux', 'prodes', 'anim', 'graphic', 'archi'] },
    { id: 'peoplesci', when: (R) => R.S >= 55 && R.I >= 55, profs: ['psych', 'doctor', 'nurse', 'edtech', 'vet'] },
    { id: 'biztech', when: (R, S) => R.E >= 55 && (R.I >= 55 || S.tech >= 55), profs: ['data', 'supply', 'prodes', 'entre', 'opsres'] },
    { id: 'nature', when: (R) => R.R >= 55 && R.I >= 55, profs: ['agron', 'ecol', 'roboeng', 'bio'] },
    { id: 'words', when: (R, S) => S.verbal >= 60 || (R.A >= 55 && R.S >= 55), profs: ['journ', 'pr', 'diplomat', 'lawyer', 'edtech'] }
  ];

  function recommend(data, profs) {
    const P = unifiedProfile(data);
    const w = getWeights(data);
    const list = profs.map(p => matchCareer(p, P, w, data)).filter(m => m.total != null)
      .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
    const byId = Object.fromEntries(list.map(m => [m.id, m]));
    const best = list.slice(0, 8);
    const bestIds = new Set(best.map(m => m.id));
    const R = P.riasec ? P.riasec.s : {}; const S = P.strengths ? P.strengths.s : {};
    const beyond = []; const seen = new Set();
    THEMES.forEach(th => {
      if (!th.when(R, S)) return;
      th.profs.forEach(id => { if (byId[id] && !bestIds.has(id) && !seen.has(id)) { seen.add(id); beyond.push({ m: byId[id], theme: th.id }); } });
    });
    if (beyond.length < 3) {
      const topCats = new Set(best.slice(0, 4).map(m => profs.find(p => p.id === m.id).cat));
      list.slice(8).filter(m => !seen.has(m.id) && !topCats.has(profs.find(p => p.id === m.id).cat)).slice(0, 3 - beyond.length)
        .forEach(m => { seen.add(m.id); beyond.push({ m, theme: 'other' }); });
    }
    beyond.sort((a, b) => b.m.total - a.m.total);
    const coverage = list.length ? list[0].coverage : 0;
    const availComps = COMPONENTS.filter(c => list.length && list[0].comps[c] != null);
    return { P, w, list, byId, best, beyond: beyond.slice(0, 6), coverage, availComps };
  }

  /* ---------- Simulation-demonstrated skills ---------- */
  const SIM_SKILLS = { prog: ['logic', 'probsolve', 'tech'], data: ['analytic', 'math'], marketing: ['creat', 'analytic', 'verbal'], finance: ['math', 'analytic'], architect: ['creat', 'probsolve'], journal: ['verbal', 'analytic'], design: ['creat'], econ: ['math', 'analytic'], doctor: ['analytic', 'verbal'], engineer: ['math', 'probsolve', 'tech'] };
  function demonstrated(data) {
    const out = {};
    Object.keys(SIM_SKILLS).forEach(sid => {
      const r = data.sims && data.sims[sid]; if (!r) return;
      SIM_SKILLS[sid].forEach(d => { if (!out[d] || out[d].score < r.best) out[d] = { score: r.best, sim: sid }; });
    });
    return out;
  }

  /* ---------- Insights (rule-based, each tied to a source score) ---------- */
  function insights(P) {
    const out = [];
    const CAT = k => (/^ins_[RIASEC]$/.test(k) ? 'riasec' : k === 'ins_value' ? 'values' : /^ins_(struct|flex|collab|solo)$/.test(k) ? 'env' : k === 'ins_motiv' ? 'motivation' : /^ins_[COE]_/.test(k) ? 'bigfive' : k === 'ins_learn' ? 'learning' : k === 'ins_techsolve' ? 'strengths' : 'readiness');
    const push = (k, src, dim, score, vars) => out.push({ k, src, dim, score, cat: CAT(k), vars: vars || {} });
    if (P.riasec) { const top = sortDims(P.riasec.s)[0]; if (top && P.riasec.s[top] >= 60) push('ins_' + top, P.riasec.src, top, P.riasec.s[top]); }
    if (P.riasec && P.strengths) { const R = P.riasec.s, S = P.strengths.s; if (R.I >= 60 && (S.tech >= 60 || S.logic >= 60)) push('ins_techsolve', 'strengths', 'tech', Math.max(S.tech || 0, S.logic || 0)); }
    if (P.values) { const top = sortDims(P.values.s)[0]; if (top && P.values.s[top] >= 70) push('ins_value', P.values.src, top, P.values.s[top], { dim: top }); }
    if (P.env) {
      const E = P.env.s;
      if (E.struct >= 65 && (E.flex == null || E.struct > E.flex)) push('ins_struct', P.env.src, 'struct', E.struct);
      else if (E.flex >= 65) push('ins_flex', P.env.src, 'flex', E.flex);
      if (E.collab >= 65 && (E.solo == null || E.collab > E.solo)) push('ins_collab', P.env.src, 'collab', E.collab);
      else if (E.solo >= 65) push('ins_solo', P.env.src, 'solo', E.solo);
    }
    if (P.motivation) { const top = sortDims(P.motivation.s)[0]; if (top && P.motivation.s[top] >= 70) push('ins_motiv', 'motivation', top, P.motivation.s[top], { dim: top }); }
    if (P.bigfive) {
      const B = P.bigfive.s;
      if (B.C >= 70) push('ins_C_hi', 'bigfive', 'C', B.C);
      if (B.O >= 70) push('ins_O_hi', 'bigfive', 'O', B.O);
      if (B.E != null && B.E <= 30) push('ins_E_lo', 'bigfive', 'E', B.E);
      if (B.E >= 70) push('ins_E_hi', 'bigfive', 'E', B.E);
    }
    if (P.learning) { const top = sortDims(P.learning.s)[0]; if (top && P.learning.s[top] >= 70) push('ins_learn', 'learning', top, P.learning.s[top], { dim: top }); }
    if (P.readiness) { const avg = mean(Object.values(P.readiness.s).filter(v => v != null)); if (avg != null) push(avg < 45 ? 'ins_ready_lo' : avg >= 70 ? 'ins_ready_hi' : 'ins_ready_mid', 'readiness', null, Math.round(avg)); }
    return out;
  }

  /* ---------- Development recommendations ---------- */
  function development(P, rec, data) {
    const demo = demonstrated(data);
    const keep = P.strengths ? sortDims(P.strengths.s).filter(d => P.strengths.s[d] >= 60).slice(0, 3).map(d => ({ d, self: P.strengths.s[d], sim: demo[d] })) : [];
    Object.keys(demo).forEach(d => { if (demo[d].score >= 70 && !keep.find(x => x.d === d) && keep.length < 5) keep.push({ d, self: P.strengths ? P.strengths.s[d] : null, sim: demo[d] }); });
    const need = {};
    rec.best.slice(0, 5).forEach(m => m.ev.develop.forEach(([d, v]) => { (need[d] = need[d] || { d, v, profs: [] }).profs.push(m.id); }));
    const improve = Object.values(need).sort((a, b) => b.profs.length - a.profs.length || a.v - b.v).slice(0, 4);
    const explore = rec.beyond.slice(0, 3);
    return { keep, improve, explore };
  }

  /* ---------- Next best step ---------- */
  function nextStep(data, rec) {
    const done = id => !!testResult(data, id);
    const hasInterests = done('riasec') || (data.results && data.results.length);
    if (!hasInterests) return { k: 'ns_riasec', href: 'test-riasec' };
    if (!done('values')) return { k: 'ns_values', href: 'test-values' };
    if ((data.viewed || []).length < 3) return { k: 'ns_explore', href: 'recs' };
    const sims = Object.keys(data.sims || {});
    if (!sims.length) { const top = rec.best.find(m => NK.SIM_FOR[m.id]); return { k: 'ns_sim', href: 'sim-' + (top ? NK.SIM_FOR[top.id] : 'prog'), vars: { p: top ? top.id : null } }; }
    if (!(data.compares || []).length) return { k: 'ns_compare', href: 'compare' };
    if (!data.untVisited) return { k: 'ns_unt', href: 'unt' };
    const pending = NK.TESTS.find(tst => !done(tst.id));
    if (pending) return { k: 'ns_test', href: 'test-' + pending.id, vars: { test: pending.id } };
    return { k: 'ns_road', href: 'roadmap' };
  }

  return { CONFIG, COMPONENTS, validAnswer, scoreTest, band, sortDims, mean, unifiedProfile, testResult, profFeatures, getWeights, matchCareer, recommend, THEMES, SIM_SKILLS, demonstrated, insights, development, nextStep };
})();
