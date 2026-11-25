# N-KELL — architecture and backend readiness

## Storage modes
- **Cloud mode** (Supabase keys in `assets/config.js`): `assets/cloud.js` handles auth (email + password), per-user `user_data` (jsonb), groups and the privacy-preserving `group_overview()` RPC. Schema, RLS and functions: `supabase/schema.sql` (tested on PostgreSQL 16 with an auth stub). Setup: `supabase/SETUP.md`.
- **Local mode** (empty config): everything below under "Local mode" applies.

## Local mode
- Static front end: HTML + CSS + vanilla JS, no build step. `python3 build.py` creates `dist/n-kell.html`.
- **All data lives in the browser's localStorage** (`nk_users`, `nk_session`, `nk_groups`, `nk_data_<userId|guest>`).
  It is not cloud storage, it is not shared between devices, and the local password hash (FNV) is **not** secure authentication.
- The teacher dashboard only sees accounts created in the same browser. A real multi-user deployment needs the backend below.

## Module layout
| File | Responsibility |
|---|---|
| `assets/tests.js` | 8 assessment definitions (items, dimensions, interpretations), KZ/RU/EN |
| `assets/engine.js` | **Pure logic**: validation, reverse scoring, normalisation, unified profile, explainable matching, insights, development plan, next step. No DOM — portable to a server. |
| `assets/data.js`, `content.js`, `content_prof.js` | Careers, express test, universities, UNT programmes, translations |
| `assets/i18n.js`, `i18n2.js` | Interface strings (KZ primary, RU, EN) |
| `assets/sims.js` | 10 simulations; multi-stage runner with final report |
| `assets/mentor.js` | Demo mentor + provider interface for a real model |
| `assets/app.js` | Storage, router, core pages (home, express test, catalogue, career pages, universities, auth) |
| `assets/pages.js` | Dashboard, test center, profile, recommendations, Career battle, UNT navigator, mentor, reports, roadmap, account, teacher |

## Scoring (transparent)
- Likert 1–5: keyed `(v−1)`, reverse `(5−v)`, max 4. Bipolar: right `(v−1)`, left `(5−v)`. Pair: winner +2 of 2. Choice: points of the chosen option; max = best option per dimension.
- Dimension % = earned ÷ max × 100 over **answered** items only. Skipped items are excluded, never zero.
- Matching: `total = Σ wᶜ·scoreᶜ / Σ wᶜ` over available components only; `coverage = Σ available w / Σ all w`.
  Default weights (design assumptions, user-adjustable): interests .35, strengths .20, values .15, environment .10, motivation .10, personality .10.
  Emotional Stability is never used for matching. Career features are derived transparently from catalogue tags (`Engine.profFeatures`).

## Proposed backend (Supabase or Firebase)
Tables (Supabase/Postgres):
- `profiles(id uuid pk = auth.uid, nickname, grade, school, role check in ('student','teacher','admin'), created_at)`
- `assessment_results(id, user_id fk, test_id, answers jsonb, scores jsonb, answered int, created_at)`
- `sim_results(id, user_id, sim_id, best int, criteria jsonb, created_at)`
- `roadmap_items(id, user_id, stage int, text, deadline date, done bool)`; `favorites(user_id, career_id)`
- `groups(code pk, name, owner_id)`; `group_members(group_code, user_id, share_status bool, share_aggregate bool, joined_at)`
- `group_stats` — a **view or RPC** returning only aggregates, enforcing `count >= 3` before returning distributions.

Row-level security:
- Students: `select/insert/update/delete` only rows where `user_id = auth.uid()`.
- Teachers: **no** access to `assessment_results` rows; only the `group_stats` RPC for groups they own, and member completion
  flags where `share_status = true`.
- Admins: management without reading answers by default; any extended access logged.
- Minors: collect only nickname and grade; parental consent flow and data-retention policy required before launch.

Migration path: replace `NK.S` (storage) and `doAuth` with the Supabase client; keep `engine.js` unchanged (it can also run in an Edge Function).

## AI Mentor
`NK.Mentor.provider` implements `async reply({ text, lang, context, history }) -> { text, chips, link }`.
To connect a model, create a backend endpoint (e.g. Supabase Edge Function) that holds the API key, applies a safety system prompt
(no diagnosis, no final decisions for students, refer to school psychologist / helpline 150 / emergency 112 for distress),
receives only the context the student consented to, and returns text. Never put API keys in front-end code.

## Data still requiring official verification
- UNT subject combinations (`content.js → NK.UNT_PROGRAMS`, all `verified: null`). Verify against NTC / Ministry, then set the date and source URL.
- University website URLs and programme lists (`data.js → NK.UNIS`, `content.js → NK.UNI_TX`).
- Helpline numbers in `mentor.js` (150, 112).
