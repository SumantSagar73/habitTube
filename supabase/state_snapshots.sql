-- Backup / point-in-time recovery for HabitTube.
--
-- The `states` table keeps ONE row per user, overwritten on every save
-- (last-write-wins). That means no history — a single bad write erases the
-- past permanently. `state_snapshots` keeps dated copies so any prior version
-- can be restored.
--
-- Run this once in the Supabase dashboard → SQL Editor (the anon/publishable
-- key used by the app cannot create tables). Safe to re-run.

create table if not exists public.state_snapshots (
  id         uuid primary key default gen_random_uuid(),
  "userId"   text not null,
  state      jsonb not null,
  reason     text,                       -- 'daily' | 'pre-import' | 'pre-restore' | 'manual'
  "createdAt" bigint not null,           -- epoch ms, matches the app's convention
  inserted_at timestamptz not null default now()
);

create index if not exists state_snapshots_user_time
  on public.state_snapshots ("userId", "createdAt" desc);

-- Match the permissive access model the app already uses for `states`
-- (no per-user auth RLS today). Tighten later when auth-scoped RLS is added.
alter table public.state_snapshots enable row level security;

drop policy if exists "anon full access to snapshots" on public.state_snapshots;
create policy "anon full access to snapshots"
  on public.state_snapshots for all
  using (true) with check (true);

-- ── Optional: true nightly backup independent of the app being open ──────────
-- Requires the pg_cron extension (Database → Extensions → enable "pg_cron").
-- Snapshots every user's current state at 03:00 UTC and prunes to ~30 per user.
--
-- select cron.schedule('habittube-nightly-backup', '0 3 * * *', $$
--   insert into public.state_snapshots ("userId", state, reason, "createdAt")
--   select "userId", state, 'daily', (extract(epoch from now()) * 1000)::bigint
--   from public.states;
--
--   delete from public.state_snapshots s
--   where s.id in (
--     select id from (
--       select id, row_number() over (partition by "userId" order by "createdAt" desc) rn
--       from public.state_snapshots
--     ) t where t.rn > 30
--   );
-- $$);
