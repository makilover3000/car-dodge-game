-- Car Dodge — setup for high-quality image uploads and the coin system.
-- Run this in the Supabase SQL editor. Safe to re-run.

-- ──────────────────────────────────────────────────────────────
-- 1. Storage bucket for uploaded car and coin artwork
-- ──────────────────────────────────────────────────────────────
-- Images are now stored as real files and only their public URL is kept in the
-- database, so a full-resolution upload no longer bloats a table row.

insert into storage.buckets (id, name, public)
values ('game-images', 'game-images', true)
on conflict (id) do update set public = true;

drop policy if exists "game images are publicly readable" on storage.objects;
create policy "game images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'game-images');

drop policy if exists "anyone can upload game images" on storage.objects;
create policy "anyone can upload game images"
  on storage.objects for insert
  with check (bucket_id = 'game-images');

drop policy if exists "anyone can delete game images" on storage.objects;
create policy "anyone can delete game images"
  on storage.objects for delete
  using (bucket_id = 'game-images');

-- ──────────────────────────────────────────────────────────────
-- 2. Coin balance, banked across runs
-- ──────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists coin_balance integer not null default 0;

-- Increment atomically so two runs finishing at once can't clobber each other.
create or replace function public.add_coins(p_user_id uuid, p_amount integer)
returns void
language sql
as $$
  update public.users
  set coin_balance = coin_balance + greatest(p_amount, 0)
  where id = p_user_id;
$$;

-- ──────────────────────────────────────────────────────────────
-- 3. Custom coin designs
-- ──────────────────────────────────────────────────────────────
create table if not exists public.coin_skins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  image_url   text not null,
  created_at  timestamptz not null default now()
);

create index if not exists coin_skins_user_id_idx on public.coin_skins(user_id);

alter table public.coin_skins enable row level security;

drop policy if exists "anon read coin_skins" on public.coin_skins;
create policy "anon read coin_skins" on public.coin_skins for select using (true);

drop policy if exists "anon insert coin_skins" on public.coin_skins;
create policy "anon insert coin_skins" on public.coin_skins for insert with check (true);

drop policy if exists "anon delete coin_skins" on public.coin_skins;
create policy "anon delete coin_skins" on public.coin_skins for delete using (true);
