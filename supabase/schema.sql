-- =========================================================
-- One Trip — Vehicle Dispatch & Logistics Management
-- Initial schema for DOST Western Visayas
-- =========================================================

-- ─── App users (RBAC) ──────────────────────────────────────
create table if not exists public.app_users (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  name         text,
  role         text not null check (role in ('Member','Recommender','Approver','Admin')) default 'Member',
  is_approved  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Auto-register on first Google sign-in.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.app_users (id, email, name, role, is_approved)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'Member', false)
  on conflict (email) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ─── Vehicles (the fleet) ──────────────────────────────────
create table if not exists public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  plate_number  text,
  capacity      int,
  active        boolean not null default true
);

-- ─── Vehicle (travel) requests ─────────────────────────────
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

-- ─── Padala (parcel) requests ──────────────────────────────
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
  notes               text
);

-- ─── Notifications ─────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.app_users(id) on delete cascade,  -- null = broadcast to all
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── RLS policies ──────────────────────────────────────────
alter table public.app_users        enable row level security;
alter table public.vehicles         enable row level security;
alter table public.vehicle_requests enable row level security;
alter table public.padala_requests  enable row level security;
alter table public.notifications    enable row level security;

-- Allow everyone (anon) to read so the Timeline is universally visible.
create policy if not exists "anon read app_users"        on public.app_users        for select using (true);
create policy if not exists "anon read vehicles"         on public.vehicles         for select using (true);
create policy if not exists "anon read vehicle_requests" on public.vehicle_requests for select using (true);
create policy if not exists "anon read padala_requests"  on public.padala_requests  for select using (true);
create policy if not exists "anon read notifications"    on public.notifications    for select using (true);

-- Authenticated users can insert requests and notifications.
create policy if not exists "auth insert vehicle_requests" on public.vehicle_requests for insert to authenticated with check (true);
create policy if not exists "auth insert padala_requests"  on public.padala_requests  for insert to authenticated with check (true);
create policy if not exists "auth insert notifications"    on public.notifications    for insert to authenticated with check (true);

-- Admins manage app_users (controlled via app-side checks; service role bypasses RLS).
create policy if not exists "auth update notifications"    on public.notifications    for update to authenticated using (true);
create policy if not exists "auth update vehicle_requests" on public.vehicle_requests for update to authenticated using (true);
create policy if not exists "auth update padala_requests"  on public.padala_requests  for update to authenticated using (true);
create policy if not exists "auth update app_users"        on public.app_users        for update to authenticated using (true);
create policy if not exists "auth delete app_users"        on public.app_users        for delete to authenticated using (true);
