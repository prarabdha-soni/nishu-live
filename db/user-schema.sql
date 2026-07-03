-- Nishu — per-device user data (profile, orders, saved items, notifications).
-- Run once in Supabase → SQL editor. Until then the app falls back to
-- localStorage, so Account/Activity still work; this makes them persist.
--
-- NOTE: rows are keyed by a random per-device id (no login), so the policies
-- below are permissive (any anon can read/write). Fine for this demo; add real
-- auth + owner-scoped policies before production.

create table if not exists profiles (
  uid text primary key,
  name text,
  handle text,
  updated_at timestamptz default now()
);

create table if not exists orders (
  id bigint generated always as identity primary key,
  uid text not null,
  title text not null,
  image_url text,
  amount int not null,
  kind text not null default 'bought',   -- 'won' | 'bought'
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);
create index if not exists idx_orders_uid on orders (uid, created_at desc);

create table if not exists saved_items (
  uid text not null,
  product_id text not null,
  name text,
  price int,
  image_url text,
  created_at timestamptz not null default now(),
  primary key (uid, product_id)
);

create table if not exists notifications (
  id bigint generated always as identity primary key,
  uid text not null,
  type text not null,
  title text not null,
  sub text,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_uid on notifications (uid, created_at desc);

alter table profiles enable row level security;
alter table orders enable row level security;
alter table saved_items enable row level security;
alter table notifications enable row level security;

create policy "anon all profiles" on profiles for all to anon using (true) with check (true);
create policy "anon all orders" on orders for all to anon using (true) with check (true);
create policy "anon all saved_items" on saved_items for all to anon using (true) with check (true);
create policy "anon all notifications" on notifications for all to anon using (true) with check (true);
