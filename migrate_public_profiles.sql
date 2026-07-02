-- Run this once in your Supabase SQL editor to enable public profiles.
-- This creates a publicly readable table for sharing profile snapshots.

create table if not exists public_profiles (
  "userId" text primary key,
  snapshot jsonb not null,
  "updatedAt" bigint not null default 0
);

-- Allow anyone (including anon) to read public profiles
alter table public_profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public_profiles for select
  using (true);

-- Only the profile owner can write (must be authenticated with matching uid)
create policy "Users can upsert their own public profile"
  on public_profiles for insert
  with check (auth.uid()::text = "userId");

create policy "Users can update their own public profile"
  on public_profiles for update
  using (auth.uid()::text = "userId");
