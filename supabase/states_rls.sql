-- Lock the `states` table (one row per user, holds the whole app state) to its owner.
--
-- Until this is applied, anyone holding the public (publishable) key can read every
-- user's rows. Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.
--
-- Rows are keyed by "userId" = the Supabase auth user id (auth.uid()), which is what
-- the web and mobile apps sync under. Legacy rows keyed by old random IDs ("u_...",
-- "testuser") will no longer be readable by the app after this; export anything you
-- still need from the table editor first.

alter table public.states enable row level security;

-- Remove every existing policy on the table (names vary), then add the strict one.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'states' loop
    execute format('drop policy %I on public.states', p.policyname);
  end loop;
end $$;

create policy "users manage own state"
  on public.states for all
  to authenticated
  using (auth.uid()::text = "userId")
  with check (auth.uid()::text = "userId");

-- Check: this should return [] when called with only the anon key.
--   curl "$VITE_SUPABASE_URL/rest/v1/states?select=userId&limit=3" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
