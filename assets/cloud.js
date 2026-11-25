/* N-KELL — cloud storage via Supabase (Postgres + Auth).
   Active only when assets/config.js contains a project URL and anon key.
   Everything a student writes is protected by row-level security (see supabase/schema.sql).
   The mentor chat log is never uploaded; it stays in the browser. */
window.NK = window.NK || {};
(function () {
  'use strict';
  const cfg = NK.CLOUD_CONFIG || {};
  const enabled = !!(cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient);
  const C = {
    enabled, client: null, user: null, profile: null, membership: null, groups: null, overview: {},
    status: 'idle', lastError: null, _timer: null, _pending: null
  };
  if (enabled) {
    try { C.client = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } }); }
    catch (e) { C.enabled = false; console.warn('N-KELL: Supabase client could not start', e); }
  }
  const fail = (e) => { C.status = 'error'; C.lastError = e && (e.message || String(e)); throw e; };
  const chk = ({ data, error }) => { if (error) fail(error); return data; };

  C.me = () => (C.user && C.profile ? { id: C.user.id, nick: C.profile.nickname, grade: C.profile.grade, school: C.profile.school, role: C.profile.role, email: C.user.email, group: C.membership ? C.membership.group_code : null } : null);

  C.init = async () => {
    if (!C.enabled) return null;
    const { data } = await C.client.auth.getSession();
    C.user = data && data.session ? data.session.user : null;
    if (C.user) { await C.loadProfile(); await C.loadMembership(); }
    return C.user;
  };
  C.loadProfile = async () => { C.profile = chk(await C.client.from('profiles').select('nickname, grade, school, role').eq('id', C.user.id).maybeSingle()); return C.profile; };
  C.loadMembership = async () => {
    const rows = chk(await C.client.from('group_members').select('group_code, share_status, share_agg').eq('user_id', C.user.id).limit(1));
    C.membership = rows && rows[0] ? rows[0] : null;
    if (C.membership) { const n = chk(await C.client.rpc('group_name', { p_code: C.membership.group_code })); C.membership.name = n || C.membership.group_code; }
    return C.membership;
  };

  C.signUp = async ({ email, password, nickname, grade, school, role }) => {
    const r = await C.client.auth.signUp({ email, password, options: { data: { nickname, grade, school, role } } });
    if (r.error) fail(r.error);
    if (!r.data.session) return { needsConfirm: true };
    C.user = r.data.user; await C.loadProfile(); C.membership = null; return { ok: true };
  };
  C.signIn = async (email, password) => {
    const r = await C.client.auth.signInWithPassword({ email, password });
    if (r.error) fail(r.error);
    C.user = r.data.user; await C.loadProfile(); await C.loadMembership(); return { ok: true };
  };
  C.signOut = async () => { try { await C.client.auth.signOut(); } finally { C.user = null; C.profile = null; C.membership = null; C.groups = null; C.overview = {}; } };
  C.updateProfile = async (f) => { chk(await C.client.from('profiles').update(f).eq('id', C.user.id)); Object.assign(C.profile, f); };

  /* ---------- Student data ---------- */
  C.loadData = async () => { const row = chk(await C.client.from('user_data').select('data').eq('user_id', C.user.id).maybeSingle()); return row ? row.data : null; };
  const strip = d => { const o = JSON.parse(JSON.stringify(d)); if (o.mentor) o.mentor = { consent: !!o.mentor.consent, log: [] }; return o; };
  C.saveData = (data) => {
    if (!C.enabled || !C.user) return;
    C._pending = data; C.status = 'saving';
    clearTimeout(C._timer);
    C._timer = setTimeout(() => C.flush().catch(() => { if (NK.toast) NK.toast(NK.t('cloud_err')); }), 700);
  };
  C.flush = async () => {
    if (!C._pending || !C.user) return;
    const data = C._pending; C._pending = null;
    chk(await C.client.from('user_data').upsert({ user_id: C.user.id, data: strip(data), updated_at: new Date().toISOString() }));
    await C.syncMember(data);
    C.status = 'saved';
  };
  const summary = (data) => {
    const E = NK.Engine;
    const tests = NK.TESTS.filter(x => E.testResult(data, x.id)).map(x => x.id);
    const R = E.unifiedProfile(data).riasec;
    return { tests_done: tests, has_express: !!(data.results && data.results.length), sims_n: Object.keys(data.sims || {}).length, riasec: R ? R.s : null };
  };
  C.syncMember = async (data) => {
    if (!C.membership) return;
    const s = summary(data);
    chk(await C.client.from('group_members').update({ nickname: C.profile.nickname, tests_done: s.tests_done, has_express: s.has_express, sims_n: s.sims_n, riasec: C.membership.share_agg ? s.riasec : null, updated_at: new Date().toISOString() })
      .eq('group_code', C.membership.group_code).eq('user_id', C.user.id));
  };

  /* ---------- Groups (student side) ---------- */
  C.groupName = async (code) => chk(await C.client.rpc('group_name', { p_code: code }));
  C.joinGroup = async (code, shareStatus, shareAgg, data) => {
    const s = summary(data);
    chk(await C.client.from('group_members').insert({ group_code: code, user_id: C.user.id, nickname: C.profile.nickname, share_status: shareStatus, share_agg: shareAgg, tests_done: s.tests_done, has_express: s.has_express, sims_n: s.sims_n, riasec: shareAgg ? s.riasec : null }));
    await C.loadMembership();
  };
  C.leaveGroup = async () => { if (!C.membership) return; chk(await C.client.from('group_members').delete().eq('group_code', C.membership.group_code).eq('user_id', C.user.id)); C.membership = null; };
  C.setConsent = async (key, val, data) => {
    if (!C.membership) return;
    const f = key === 'agg' ? { share_agg: val, riasec: val ? summary(data).riasec : null } : { share_status: val };
    chk(await C.client.from('group_members').update(f).eq('group_code', C.membership.group_code).eq('user_id', C.user.id));
    if (key === 'agg') C.membership.share_agg = val; else C.membership.share_status = val;
  };

  /* ---------- Groups (teacher side) ---------- */
  C.listGroups = async () => { C.groups = chk(await C.client.from('groups').select('code, name, roster, created_at').eq('owner_id', C.user.id).order('created_at')); return C.groups; };
  C.createGroup = async (name) => {
    for (let i = 0; i < 5; i++) {
      const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      const r = await C.client.from('groups').insert({ code, name, owner_id: C.user.id });
      if (!r.error) return C.listGroups();
      if (r.error.code !== '23505') fail(r.error);
    }
    fail(new Error('code collision'));
  };
  C.deleteGroup = async (code) => { chk(await C.client.from('groups').delete().eq('code', code)); delete C.overview[code]; return C.listGroups(); };
  C.updateRoster = async (code, roster) => { chk(await C.client.from('groups').update({ roster }).eq('code', code)); return C.listGroups(); };
  C.loadOverview = async (code) => { C.overview[code] = chk(await C.client.rpc('group_overview', { p_code: code })); return C.overview[code]; };

  C.deleteAccount = async () => { chk(await C.client.rpc('delete_my_account')); await C.signOut(); };

  NK.Cloud = C;
})();
