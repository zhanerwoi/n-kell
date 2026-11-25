-- N-KELL database schema for Supabase (PostgreSQL).
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste this file → Run.
-- Safe to re-run: objects are created with IF NOT EXISTS / OR REPLACE.
--
-- Privacy model
--   * Every student can read and write ONLY their own rows (row-level security).
--   * Teachers never get direct SELECT access to students' data. They call group_overview(),
--     which returns completion status only for students who allowed it, and RIASEC averages
--     only when at least 3 students allowed anonymous statistics.
--   * The anon role (not logged in) gets no table access at all.

-- ---------- Tables ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 2 and 30),
  grade       text check (grade in ('9', '10', '11', '-')),
  school      text check (char_length(school) <= 60),
  role        text not null default 'student' check (role in ('student', 'teacher')),
  created_at  timestamptz not null default now()
);

create table if not exists public.user_data (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.groups (
  code        text primary key check (code ~ '^[A-Z0-9]{6}$'),
  name        text not null check (char_length(name) between 1 and 40),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  roster      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- One row per student per group. The student writes it; teachers only see it through group_overview().
create table if not exists public.group_members (
  group_code   text not null references public.groups(code) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  nickname     text not null,
  share_status boolean not null default false,  -- allow teacher to see completion status
  share_agg    boolean not null default false,  -- allow inclusion in anonymous group statistics
  tests_done   text[] not null default '{}',     -- ids of completed assessments
  has_express  boolean not null default false,
  sims_n       int not null default 0,
  riasec       jsonb,                            -- stored only when share_agg = true
  updated_at   timestamptz not null default now(),
  primary key (group_code, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);

-- ---------- Row-level security ----------
alter table public.profiles      enable row level security;
alter table public.user_data     enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own data" on public.user_data;
create policy "own data" on public.user_data for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "teacher owns group" on public.groups;
create policy "teacher owns group" on public.groups for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));

drop policy if exists "own membership" on public.group_members;
create policy "own membership" on public.group_members for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (share_agg or riasec is null));

-- ---------- Privileges ----------
-- Supabase grants broad default privileges to anon/authenticated; reset them, then grant only what the app needs.
revoke all on public.profiles, public.user_data, public.groups, public.group_members from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (nickname, grade, school) on public.profiles to authenticated;   -- role can never be changed by the client
grant select, insert, update, delete on public.user_data, public.groups, public.group_members to authenticated;

-- ---------- Profile created automatically at sign-up ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, nickname, grade, school, role)
  values (
    new.id,
    left(coalesce(nullif(trim(m->>'nickname'), ''), split_part(new.email, '@', 1)), 30),
    case when m->>'grade' in ('9', '10', '11', '-') then m->>'grade' else '-' end,
    left(coalesce(m->>'school', ''), 60),
    case when m->>'role' = 'teacher' then 'teacher' else 'student' end
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Functions called by the app ----------
-- Group name by join code (students cannot list groups themselves).
create or replace function public.group_name(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select name from public.groups where code = upper(p_code)
$$;

-- Aggregated, privacy-preserving overview for the group owner only.
create or replace function public.group_overview(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  g public.groups;
  n_agg int;
  result jsonb;
begin
  select * into g from public.groups where code = p_code;
  if g is null or g.owner_id <> auth.uid() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select count(*) into n_agg from public.group_members where group_code = p_code and share_agg and riasec is not null;
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'nickname', m.nickname,
        'shared', m.share_status,
        'tests', case when m.share_status then to_jsonb(m.tests_done) else null end,
        'express', case when m.share_status then m.has_express else null end,
        'sims', case when m.share_status then m.sims_n else null end) order by m.nickname)
      from public.group_members m where m.group_code = p_code), '[]'::jsonb),
    'agg_n', n_agg,
    'riasec_avg', case when n_agg >= 3 then (
        select jsonb_object_agg(k, v) from (
          select k, round(avg((m.riasec->>k)::numeric)) v
          from public.group_members m cross join unnest(array['R','I','A','S','E','C']) k
          where m.group_code = p_code and m.share_agg and m.riasec is not null
          group by k) a) end,
    'riasec_dominant', case when n_agg >= 3 then (
        select jsonb_object_agg(d, c) from (
          select d, count(*) c from (
            select (select k from unnest(array['R','I','A','S','E','C']) k order by (m.riasec->>k)::numeric desc, k limit 1) d
            from public.group_members m where m.group_code = p_code and m.share_agg and m.riasec is not null) t
          group by d) x) end
  ) into result;
  return result;
end $$;

-- Lets a user permanently delete their own account and all related rows.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.group_name(text), public.group_overview(text), public.delete_my_account() from public, anon;
grant execute on function public.group_name(text), public.group_overview(text), public.delete_my_account() to authenticated;
