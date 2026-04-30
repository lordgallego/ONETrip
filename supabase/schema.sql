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
-- search_path is pinned to defeat search_path-based privilege escalation
-- against SECURITY DEFINER functions.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

-- ─── RBAC helper functions (used in RLS policies) ─────────
-- Each is SECURITY DEFINER + locked search_path so the policies stay
-- correct regardless of the calling user's session settings.

create or replace function public.current_app_user_role()
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select role from public.app_users where id = auth.uid()
$$;

create or replace function public.is_approved_user()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(is_approved, false) from public.app_users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(role = 'Admin' and is_approved, false)
  from public.app_users where id = auth.uid()
$$;

-- True if caller's role is at least the supplied minimum (and approved).
create or replace function public.has_role_at_least(min_role text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with me as (
    select role, is_approved from public.app_users where id = auth.uid()
  )
  select coalesce(
    me.is_approved and (
      case me.role
        when 'Admin'       then min_role in ('Admin','Approver','Recommender','Member')
        when 'Approver'    then min_role in ('Approver','Recommender','Member')
        when 'Recommender' then min_role in ('Recommender','Member')
        when 'Member'      then min_role in ('Member')
        else false
      end
    ),
    false
  )
  from me
$$;

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
  origin                        text,
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
-- 'origin' (the From location) added later — keep idempotent.
alter table public.vehicle_requests add column if not exists origin text;

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
alter table public.padala_requests add column if not exists vehicle_request_id uuid references public.vehicle_requests(id) on delete set null;

-- ─── Notifications (broadcast or per-user) ────────────────
-- 'app' namespaces notifications so this Supabase project can host
-- multiple apps without cross-bell pollution. One Trip only ever
-- inserts/reads with app = 'one_trip'.
--
-- IMPORTANT: if a table named 'notifications' already exists from a
-- previous app, CREATE TABLE IF NOT EXISTS won't add our columns. The
-- explicit ALTER TABLE ... ADD COLUMN IF NOT EXISTS lines below make
-- the schema converge regardless of the starting state.
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,                           -- null = broadcast (FK added below if missing)
  title       text not null,
  body        text,
  link        text,
  kind        text default 'info',
  app         text default 'one_trip',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.notifications add column if not exists user_id    uuid;
alter table public.notifications add column if not exists title      text;
alter table public.notifications add column if not exists body       text;
alter table public.notifications add column if not exists link       text;
alter table public.notifications add column if not exists kind       text default 'info';
alter table public.notifications add column if not exists app        text;
alter table public.notifications add column if not exists read       boolean default false;
alter table public.notifications add column if not exists created_at timestamptz default now();

-- Defuse legacy NOT NULL constraints on columns we don't write to
-- (e.g. a 'type' column left over from a previous app sharing this DB).
-- Loops over any column on public.notifications outside the One Trip set
-- and drops its NOT NULL so our inserts succeed.
do $$
declare col record;
begin
  for col in
    select column_name from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'notifications'
      and is_nullable  = 'NO'
      and column_name not in (
        'id','user_id','title','body','link','kind','app','read','created_at'
      )
  loop
    execute format('alter table public.notifications alter column %I drop not null', col.column_name);
  end loop;
end $$;

-- ─── Row Level Security ───────────────────────────────────
alter table public.app_users        enable row level security;
alter table public.vehicles         enable row level security;
alter table public.vehicle_requests enable row level security;
alter table public.padala_requests  enable row level security;
alter table public.notifications    enable row level security;

-- Drop any existing policies (idempotent re-run).
drop policy if exists "anon read app_users"           on public.app_users;
drop policy if exists "anon read vehicles"            on public.vehicles;
drop policy if exists "anon read vehicle_requests"    on public.vehicle_requests;
drop policy if exists "anon read padala_requests"     on public.padala_requests;
drop policy if exists "anon read notifications"       on public.notifications;

drop policy if exists "auth insert vehicle_requests"  on public.vehicle_requests;
drop policy if exists "auth insert padala_requests"   on public.padala_requests;
drop policy if exists "auth insert notifications"     on public.notifications;

drop policy if exists "auth update vehicle_requests"  on public.vehicle_requests;
drop policy if exists "auth update padala_requests"   on public.padala_requests;
drop policy if exists "auth update notifications"     on public.notifications;
drop policy if exists "auth update app_users"         on public.app_users;
drop policy if exists "auth delete app_users"         on public.app_users;

-- Newer hardened policy names (drop too in case of re-run).
drop policy if exists "admin manages app_users"       on public.app_users;
drop policy if exists "admin deletes app_users"       on public.app_users;
drop policy if exists "self updates own row"          on public.app_users;
drop policy if exists "owner or recommender+ updates trips" on public.vehicle_requests;
drop policy if exists "approver+ deletes trips"       on public.vehicle_requests;
drop policy if exists "owner or approver+ updates padala"  on public.padala_requests;
drop policy if exists "approver+ deletes padala"      on public.padala_requests;
drop policy if exists "recipient or admin updates notif"   on public.notifications;
drop policy if exists "admin manages vehicles"        on public.vehicles;

-- ─── PUBLIC READ ──────────────────────────────────────────
-- Timeline data is intentionally public so anyone (signed-in or not)
-- can plan around scheduled trips.
create policy "anon read app_users"        on public.app_users        for select using (true);
create policy "anon read vehicles"         on public.vehicles         for select using (true);
create policy "anon read vehicle_requests" on public.vehicle_requests for select using (true);
create policy "anon read padala_requests"  on public.padala_requests  for select using (true);
create policy "anon read notifications"    on public.notifications    for select using (true);

-- ─── INSERTS (any approved authed user) ───────────────────
create policy "auth insert vehicle_requests" on public.vehicle_requests
  for insert to authenticated
  with check (public.is_approved_user());

create policy "auth insert padala_requests" on public.padala_requests
  for insert to authenticated
  with check (public.is_approved_user());

-- Notifications can be inserted by any approved user (the app fans out
-- broadcasts and per-user pings).
create policy "auth insert notifications" on public.notifications
  for insert to authenticated
  with check (public.is_approved_user());

-- ─── APP_USERS UPDATES / DELETES ──────────────────────────
-- Only Admins can change roles, approval, or delete users.
create policy "admin manages app_users" on public.app_users
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes app_users" on public.app_users
  for delete to authenticated
  using (public.is_admin());

-- ─── VEHICLE REQUEST UPDATES ──────────────────────────────
-- The owner can edit *their own* trip while it's still Pending.
-- Recommenders can mark Pending → Recommended.
-- Approvers (and Admin) can do anything.
create policy "owner or recommender+ updates trips" on public.vehicle_requests
  for update to authenticated
  using (
    requested_by_id = auth.uid()
    or public.has_role_at_least('Recommender')
  )
  with check (
    requested_by_id = auth.uid()
    or public.has_role_at_least('Recommender')
  );

create policy "approver+ deletes trips" on public.vehicle_requests
  for delete to authenticated
  using (public.has_role_at_least('Approver'));

-- ─── PADALA UPDATES ───────────────────────────────────────
create policy "owner or approver+ updates padala" on public.padala_requests
  for update to authenticated
  using (
    requested_by_id = auth.uid()
    or public.has_role_at_least('Approver')
  )
  with check (
    requested_by_id = auth.uid()
    or public.has_role_at_least('Approver')
  );

create policy "approver+ deletes padala" on public.padala_requests
  for delete to authenticated
  using (public.has_role_at_least('Approver'));

-- ─── NOTIFICATIONS UPDATES ────────────────────────────────
-- The recipient marks their own notification read; admins can update any.
-- Broadcast (user_id is null) notifications can be marked read by anyone.
create policy "recipient or admin updates notif" on public.notifications
  for update to authenticated
  using (user_id = auth.uid() or user_id is null or public.is_admin())
  with check (user_id = auth.uid() or user_id is null or public.is_admin());

-- ─── VEHICLES (admin-managed) ─────────────────────────────
create policy "admin manages vehicles" on public.vehicles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Backfill existing auth users into app_users ──────────
insert into public.app_users (id, email, name, role, is_approved)
select
  u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.email), 'Member', false
from auth.users u
where u.email is not null
on conflict (email) do nothing;

-- ─── Seed: DOST WV fleet (drivers + plates) ───────────────
-- Wipes and re-inserts the canonical list. Safe to re-run.
delete from public.vehicles;
insert into public.vehicles (name, plate_number, capacity, driver_name, driver_contact, active) values
  ('Hi Ace Van (White)',     'SAA 7104', 14, 'RONIE P. GABORNO',       '0967-983-6360', true),
  ('Hi Ace Van (Gray)',      'SLG 793',  14, 'VICENTE C. PALINGCOD',   '0951-991-8128', true),
  ('Toyota Land Cruiser',    'SGJ 244',   7, 'ISIDRO P. GABORNO JR.',  '0975-373-9587', true),
  ('Ford Ranger Pick Up',    'SJS 685',   5, 'ISIDRO P. GABORNO JR.',  '0975-373-9587', true),
  ('Toyota Innova',          'SFA 3748',  7, 'CORNELIO T. MABERA',     '0949-750-7858', true);
