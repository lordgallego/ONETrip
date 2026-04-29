-- =========================================================
-- One Trip — Vehicle Dispatch & Logistics Management
-- Schema + seed for DOST Western Visayas
-- Safe to re-run.
-- =========================================================

-- ─── App users (RBAC) ─────────────────────────────────────
create table if not exists public.app_users (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  name         text,
  role         text not null check (role in ('Member','Recommender','Approver','Admin')) default 'Member',
  is_approved  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Auto-register every Google sign-in into public.app_users (Pending).
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.app_users (id, email, name, role, is_approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'Member',
    false
  )
  on conflict (email) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ─── Vehicles (the fleet, with assigned driver) ───────────
create table if not exists public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  plate_number    text,
  capacity        int,
  driver_name     text,
  driver_contact  text,
  active          boolean not null default true
);
alter table public.vehicles add column if not exists driver_name text;
alter table public.vehicles add column if not exists driver_contact text;

-- ─── Vehicle (travel) requests ────────────────────────────
create table if not exists public.vehicle_requests (
  id                            uuid primary key default gen_random_uuid(),
  date_prepared                 timestamptz not null default now(),
  destination                   text not null,
  purpose                       text not null,
  travel_date                   date not null,
  etd                           timestamptz not null,
  eta                           timestamptz not null,
  passengers                    text not null,
  requested_by_id               uuid references public.app_users(id) on delete set null,
  requested_by_name             text,
  recommending_approval_id      uuid references public.app_users(id) on delete set null,
  recommending_approval_name    text,
  status                        text not null check (status in ('Pending','Recommended','Approved','Rejected')) default 'Pending',
  approver_id                   uuid references public.app_users(id) on delete set null,
  approver_name                 text,
  vehicle_id                    uuid references public.vehicles(id) on delete set null,
  vehicle_name                  text,
  notes                         text
);

-- ─── Padala (parcel) requests ─────────────────────────────
create table if not exists public.padala_requests (
  id                  uuid primary key default gen_random_uuid(),
  date_prepared       timestamptz not null default now(),
  size                text not null check (size in ('Small','Medium','Large','Extra Large')),
  weight_kg           numeric(8,2) not null,
  description         text not null,
  recipient           text not null,
  destination         text,
  status              text not null check (status in ('Pending','Recommended','Approved','Rejected')) default 'Pending',
  requested_by_id     uuid references public.app_users(id) on delete set null,
  requested_by_name   text,
  vehicle_id          uuid references public.vehicles(id) on delete set null,
  vehicle_request_id  uuid references public.vehicle_requests(id) on delete set null,
  notes               text
);
-- Padala can ride along an existing vehicle request (link is optional).
alter table public.padala_requests add column if not exists vehicle_request_id uuid references public.vehicle_requests(id) on delete set null;

-- ─── Notifications (broadcast or per-user) ────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.app_users(id) on delete cascade,  -- null = broadcast
  title       text not null,
  body        text,
  link        text,
  kind        text not null default 'info' check (kind in ('info','new_request','status_change','padala_attached')),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.notifications add column if not exists kind text not null default 'info';

-- ─── Row Level Security ───────────────────────────────────
alter table public.app_users        enable row level security;
alter table public.vehicles         enable row level security;
alter table public.vehicle_requests enable row level security;
alter table public.padala_requests  enable row level security;
alter table public.notifications    enable row level security;

drop policy if exists "anon read app_users"          on public.app_users;
drop policy if exists "anon read vehicles"           on public.vehicles;
drop policy if exists "anon read vehicle_requests"   on public.vehicle_requests;
drop policy if exists "anon read padala_requests"    on public.padala_requests;
drop policy if exists "anon read notifications"      on public.notifications;
drop policy if exists "auth insert vehicle_requests" on public.vehicle_requests;
drop policy if exists "auth insert padala_requests"  on public.padala_requests;
drop policy if exists "auth insert notifications"    on public.notifications;
drop policy if exists "auth update vehicle_requests" on public.vehicle_requests;
drop policy if exists "auth update padala_requests"  on public.padala_requests;
drop policy if exists "auth update notifications"    on public.notifications;
drop policy if exists "auth update app_users"        on public.app_users;
drop policy if exists "auth delete app_users"        on public.app_users;

create policy "anon read app_users"        on public.app_users        for select using (true);
create policy "anon read vehicles"         on public.vehicles         for select using (true);
create policy "anon read vehicle_requests" on public.vehicle_requests for select using (true);
create policy "anon read padala_requests"  on public.padala_requests  for select using (true);
create policy "anon read notifications"    on public.notifications    for select using (true);

create policy "auth insert vehicle_requests" on public.vehicle_requests for insert to authenticated with check (true);
create policy "auth insert padala_requests"  on public.padala_requests  for insert to authenticated with check (true);
create policy "auth insert notifications"    on public.notifications    for insert to authenticated with check (true);

create policy "auth update vehicle_requests" on public.vehicle_requests for update to authenticated using (true);
create policy "auth update padala_requests"  on public.padala_requests  for update to authenticated using (true);
create policy "auth update notifications"    on public.notifications    for update to authenticated using (true);
create policy "auth update app_users"        on public.app_users        for update to authenticated using (true);
create policy "auth delete app_users"        on public.app_users        for delete to authenticated using (true);

-- ─── Backfill existing auth users into app_users ──────────
insert into public.app_users (id, email, name, role, is_approved)
select
  u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.email), 'Member', false
from auth.users u
where u.email is not null
on conflict (email) do nothing;

-- ─── Seed: DOST WV fleet (drivers + plates) ───────────────
-- Wipes the fleet and re-inserts the canonical list. Safe to re-run.
delete from public.vehicles;
insert into public.vehicles (name, plate_number, capacity, driver_name, driver_contact, active) values
  ('Hi Ace Van (White)',     'SAA 7104', 14, 'RONIE P. GABORNO',       '0967-983-6360', true),
  ('Hi Ace Van (Gray)',      'SLG 793',  14, 'VICENTE C. PALINGCOD',   '0951-991-8128', true),
  ('Toyota Land Cruiser',    'SGJ 244',   7, 'ISIDRO P. GABORNO JR.',  '0975-373-9587', true),
  ('Ford Ranger Pick Up',    'SJS 685',   5, 'ISIDRO P. GABORNO JR.',  '0975-373-9587', true),
  ('Toyota Innova',          'SFA 3748',  7, 'CORNELIO T. MABERA',     '0949-750-7858', true);
