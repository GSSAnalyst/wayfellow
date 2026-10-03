-- Wayfellow: campus ride board
-- Run this whole file once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Safe to re-run. Change ucsc.edu in is_campus() if your campus uses a different email domain.

create extension if not exists pgcrypto;

create or replace function public.is_campus()
returns boolean language sql stable
as $$ select coalesce(lower(auth.jwt() ->> 'email') like '%@ucsc.edu', false) $$;

-- Tables ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  college text check (college is null or char_length(college) <= 60),
  email_alerts boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists email_alerts boolean not null default true;

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('offer','want')),
  category text not null default 'trip' check (category in ('trip','airport','home','errand','event')),
  origin text not null check (char_length(origin) between 1 and 80),
  destination text not null check (char_length(destination) between 1 and 80),
  depart_at timestamptz not null,
  seats int not null default 1 check (seats between 1 and 7),
  miles numeric check (miles is null or (miles > 0 and miles < 5000)),
  mpg numeric check (mpg is null or (mpg > 0 and mpg < 200)),
  gas_price numeric check (gas_price is null or (gas_price >= 0 and gas_price < 30)),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now()
);
alter table public.rides add column if not exists origin_lat double precision;
alter table public.rides add column if not exists origin_lng double precision;
alter table public.rides add column if not exists dest_lat double precision;
alter table public.rides add column if not exists dest_lng double precision;
alter table public.rides add column if not exists pickup_note text check (pickup_note is null or char_length(pickup_note) <= 120);
alter table public.rides add column if not exists route jsonb;
create index if not exists rides_depart_idx on public.rides (depart_at);

create table if not exists public.ride_contacts (
  ride_id uuid primary key references public.rides(id) on delete cascade,
  contact text not null check (char_length(contact) between 1 and 80)
);

create table if not exists public.seat_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  rider_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  message text check (message is null or char_length(message) <= 200),
  created_at timestamptz not null default now(),
  unique (ride_id, rider_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_ride_idx on public.messages (ride_id, created_at);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  rater_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  ratee_id uuid not null references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  unique (ride_id, rater_id, ratee_id),
  check (rater_id <> ratee_id)
);

-- Helpers (security definer so policies can check membership without recursion) ----

create or replace function public.owns_ride(r uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from rides where id = r and owner_id = auth.uid()) $$;

create or replace function public.approved_on(r uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from seat_requests where ride_id = r and rider_id = auth.uid() and status = 'approved') $$;

create or replace function public.is_participant(r uuid, u uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from rides where id = r and owner_id = u)
      or exists (select 1 from seat_requests where ride_id = r and rider_id = u and status = 'approved')
$$;

create or replace function public.seat_counts()
returns table (ride_id uuid, taken bigint)
language sql stable security definer set search_path = public
as $$
  select ride_id, count(*) from seat_requests
  where status = 'approved' and public.is_campus()
  group by ride_id
$$;

-- Everyone in the car (owner plus approved riders). Only visible to people in the car.
create or replace function public.ride_participants(r uuid)
returns table (id uuid, display_name text, college text, is_owner boolean)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.college, (p.id = rd.owner_id)
  from rides rd
  join profiles p on p.id = rd.owner_id
     or p.id in (select rider_id from seat_requests where ride_id = r and status = 'approved')
  where rd.id = r and public.is_participant(r, auth.uid())
$$;

-- Rides you drove, rode in, or posted (past and upcoming).
create or replace function public.my_trips()
returns table (ride_id uuid, role text)
language sql stable security definer set search_path = public
as $$
  select id, case when kind = 'offer' then 'driver' else 'poster' end from rides where owner_id = auth.uid()
  union
  select ride_id, 'rider' from seat_requests where rider_id = auth.uid() and status = 'approved'
$$;

create or replace function public.profile_stats(u uuid)
returns table (avg_stars numeric, rating_count bigint, rides_driven bigint, rides_taken bigint)
language sql stable security definer set search_path = public
as $$
  select
    (select round(avg(stars)::numeric, 2) from ratings where ratee_id = u),
    (select count(*) from ratings where ratee_id = u),
    (select count(*) from rides where owner_id = u and kind = 'offer' and depart_at < now()),
    (select count(*) from seat_requests s join rides r on r.id = s.ride_id
       where s.rider_id = u and s.status = 'approved' and r.depart_at < now())
  where public.is_campus()
$$;

-- Row level security ---------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.rides         enable row level security;
alter table public.ride_contacts enable row level security;
alter table public.seat_requests enable row level security;
alter table public.messages      enable row level security;
alter table public.ratings       enable row level security;

drop policy if exists "campus reads profiles" on public.profiles;
create policy "campus reads profiles" on public.profiles for select using (public.is_campus());
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert with check (id = auth.uid() and public.is_campus());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "campus reads rides" on public.rides;
create policy "campus reads rides" on public.rides for select using (public.is_campus());
drop policy if exists "post own rides" on public.rides;
create policy "post own rides" on public.rides for insert with check (owner_id = auth.uid() and public.is_campus());
drop policy if exists "edit own rides" on public.rides;
create policy "edit own rides" on public.rides for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "delete own rides" on public.rides;
create policy "delete own rides" on public.rides for delete using (owner_id = auth.uid());

drop policy if exists "owner or approved reads contact" on public.ride_contacts;
create policy "owner or approved reads contact" on public.ride_contacts for select
  using (public.owns_ride(ride_id) or public.approved_on(ride_id));
drop policy if exists "owner writes contact" on public.ride_contacts;
create policy "owner writes contact" on public.ride_contacts for all
  using (public.owns_ride(ride_id)) with check (public.owns_ride(ride_id));

drop policy if exists "rider or owner reads requests" on public.seat_requests;
create policy "rider or owner reads requests" on public.seat_requests for select
  using (rider_id = auth.uid() or public.owns_ride(ride_id));
drop policy if exists "rider requests seat" on public.seat_requests;
create policy "rider requests seat" on public.seat_requests for insert
  with check (rider_id = auth.uid() and status = 'pending' and public.is_campus() and not public.owns_ride(ride_id));
drop policy if exists "owner decides" on public.seat_requests;
create policy "owner decides" on public.seat_requests for update
  using (public.owns_ride(ride_id)) with check (public.owns_ride(ride_id));
drop policy if exists "rider cancels" on public.seat_requests;
create policy "rider cancels" on public.seat_requests for delete using (rider_id = auth.uid());

-- Chat: only the people in the car can read or post.
drop policy if exists "car reads messages" on public.messages;
create policy "car reads messages" on public.messages for select
  using (public.is_participant(ride_id, auth.uid()));
drop policy if exists "car sends messages" on public.messages;
create policy "car sends messages" on public.messages for insert
  with check (sender_id = auth.uid() and public.is_participant(ride_id, auth.uid()));

-- Ratings: public to campus; only people who shared a finished ride can rate each other.
drop policy if exists "campus reads ratings" on public.ratings;
create policy "campus reads ratings" on public.ratings for select using (public.is_campus());
drop policy if exists "participants rate" on public.ratings;
create policy "participants rate" on public.ratings for insert with check (
  rater_id = auth.uid()
  and public.is_participant(ride_id, auth.uid())
  and public.is_participant(ride_id, ratee_id)
  and exists (select 1 from public.rides where id = ride_id and depart_at < now())
);

-- Live updates ---------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.rides;         exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.seat_requests; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.messages;      exception when duplicate_object then null; end $$;
