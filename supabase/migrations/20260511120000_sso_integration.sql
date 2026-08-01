-- =========================================================
-- grave-app: initial schema for SSO + offline-first sync
--
-- WHY this schema looks the way it does
-- -------------------------------------
-- Auth lives in our own SSO (SSO/backend) which mints RS256 JWTs and
-- exposes /.well-known/jwks.json. Supabase is configured (in Dashboard →
-- Authentication → Third-Party Auth) to trust that JWKS, so the SSO's
-- access token can be sent straight to PostgREST as `Authorization: Bearer …`.
-- RLS reads the `userId` claim out of the JWT via `auth.jwt() ->> 'userId'`.
--
-- The SSO `userId` is a Sequelize INTEGER, exposed as TEXT through the JSON
-- accessor — so owner columns are `text`, not `uuid`.
--
-- The schema also carries minimal sync metadata so the Angular PWA can
-- run offline-first against IndexedDB and reconcile with Supabase later:
--   * `client_updated_at` — when the client made the change locally
--     (used by clients for last-write-wins comparisons across devices)
--   * `deleted_at` — tombstone for soft delete; pulled by other devices
--     so they can drop their local copy
-- =========================================================

-- ---- 1. Helper: SSO subject extracted from JWT --------------------
-- search_path = '' so a malicious schema can't shadow pg_catalog.nullif /
-- current_setting (Supabase advisor 0011). pg_catalog is always implicitly
-- on the path, so the bare function calls below still resolve.
create or replace function public.sso_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'userId', '');
$$;

-- ---- 2. Generic updated_at touch trigger -------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- 3. graves ----------------------------------------------------
create table if not exists public.graves (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,

  -- Geolocation
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,

  -- Location info
  cemetery_name varchar(255),
  grave_number varchar(50),
  sector varchar(50),
  notes text,

  -- Payment tracking
  payment_expiry_date date,
  last_payment_amount numeric(10, 2),
  payment_duration_months integer,
  payment_currency varchar(3) default 'PLN',

  -- Visit tracking
  last_visited timestamptz,

  -- Sync metadata
  client_updated_at timestamptz,
  deleted_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_graves_owner_id on public.graves(owner_id);
create index if not exists idx_graves_location on public.graves(latitude, longitude);
create index if not exists idx_graves_created_at on public.graves(created_at desc);
create index if not exists idx_graves_payment_expiry on public.graves(payment_expiry_date)
  where payment_expiry_date is not null;
create index if not exists idx_graves_deleted_at on public.graves(deleted_at);

drop trigger if exists update_graves_updated_at on public.graves;
create trigger update_graves_updated_at
  before update on public.graves
  for each row execute function public.update_updated_at_column();

-- ---- 4. deceased_persons ------------------------------------------
create table if not exists public.deceased_persons (
  id uuid primary key default gen_random_uuid(),
  grave_id uuid not null references public.graves(id) on delete cascade,

  first_name varchar(100) not null,
  last_name varchar(100) not null,
  birth_date date,
  death_date date,
  maiden_name varchar(100),
  notes text,

  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_deceased_persons_grave_id on public.deceased_persons(grave_id);
create index if not exists idx_deceased_persons_last_name on public.deceased_persons(last_name);

drop trigger if exists update_deceased_persons_updated_at on public.deceased_persons;
create trigger update_deceased_persons_updated_at
  before update on public.deceased_persons
  for each row execute function public.update_updated_at_column();

-- ---- 5. grave_photos ----------------------------------------------
create table if not exists public.grave_photos (
  id uuid primary key default gen_random_uuid(),
  grave_id uuid not null references public.graves(id) on delete cascade,
  storage_path text not null,   -- path inside the grave-photos bucket
  caption text,
  is_primary boolean default false,
  position int default 0,       -- display order
  deleted_at timestamptz,
  uploaded_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_grave_photos_grave_id on public.grave_photos(grave_id);
create index if not exists idx_grave_photos_deleted_at on public.grave_photos(deleted_at);

drop trigger if exists update_grave_photos_updated_at on public.grave_photos;
create trigger update_grave_photos_updated_at
  before update on public.grave_photos
  for each row execute function public.update_updated_at_column();

-- ---- 6. RLS: enable + policies -----------------------------------
alter table public.graves enable row level security;
alter table public.deceased_persons enable row level security;
alter table public.grave_photos enable row level security;

-- graves: row visible only to its owner; reads include tombstones so the
-- client can drop locally-cached rows that were deleted on another device.
drop policy if exists graves_select on public.graves;
create policy graves_select on public.graves
  for select
  using (public.sso_user_id() is not null and owner_id = public.sso_user_id());

drop policy if exists graves_insert on public.graves;
create policy graves_insert on public.graves
  for insert
  with check (public.sso_user_id() is not null and owner_id = public.sso_user_id());

drop policy if exists graves_update on public.graves;
create policy graves_update on public.graves
  for update
  using (owner_id = public.sso_user_id())
  with check (owner_id = public.sso_user_id());

drop policy if exists graves_delete on public.graves;
create policy graves_delete on public.graves
  for delete
  using (owner_id = public.sso_user_id());

-- deceased_persons: ownership inherited from parent grave.
drop policy if exists deceased_select on public.deceased_persons;
create policy deceased_select on public.deceased_persons
  for select using (
    exists (select 1 from public.graves g
            where g.id = deceased_persons.grave_id
              and g.owner_id = public.sso_user_id())
  );

drop policy if exists deceased_insert on public.deceased_persons;
create policy deceased_insert on public.deceased_persons
  for insert with check (
    exists (select 1 from public.graves g
            where g.id = deceased_persons.grave_id
              and g.owner_id = public.sso_user_id())
  );

drop policy if exists deceased_update on public.deceased_persons;
create policy deceased_update on public.deceased_persons
  for update using (
    exists (select 1 from public.graves g
            where g.id = deceased_persons.grave_id
              and g.owner_id = public.sso_user_id())
  );

drop policy if exists deceased_delete on public.deceased_persons;
create policy deceased_delete on public.deceased_persons
  for delete using (
    exists (select 1 from public.graves g
            where g.id = deceased_persons.grave_id
              and g.owner_id = public.sso_user_id())
  );

-- grave_photos: same join pattern.
drop policy if exists photos_select on public.grave_photos;
create policy photos_select on public.grave_photos
  for select using (
    exists (select 1 from public.graves g
            where g.id = grave_photos.grave_id
              and g.owner_id = public.sso_user_id())
  );

drop policy if exists photos_insert on public.grave_photos;
create policy photos_insert on public.grave_photos
  for insert with check (
    exists (select 1 from public.graves g
            where g.id = grave_photos.grave_id
              and g.owner_id = public.sso_user_id())
  );

drop policy if exists photos_update on public.grave_photos;
create policy photos_update on public.grave_photos
  for update using (
    exists (select 1 from public.graves g
            where g.id = grave_photos.grave_id
              and g.owner_id = public.sso_user_id())
  );

drop policy if exists photos_delete on public.grave_photos;
create policy photos_delete on public.grave_photos
  for delete using (
    exists (select 1 from public.graves g
            where g.id = grave_photos.grave_id
              and g.owner_id = public.sso_user_id())
  );

-- ---- 7. Storage bucket: grave-photos -----------------------------
-- Private bucket. Per-user prefixing: paths look like
-- "<sso_user_id>/<grave_id>/<filename>". The first path segment must equal
-- the SSO userId — a leak of one user's grave_id wouldn't let an attacker
-- read another user's photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'grave-photos',
  'grave-photos',
  false,
  10485760, -- 10 MB per file
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;

drop policy if exists "grave-photos owner read" on storage.objects;
create policy "grave-photos owner read" on storage.objects
  for select using (
    bucket_id = 'grave-photos'
    and (storage.foldername(name))[1] = public.sso_user_id()
  );

drop policy if exists "grave-photos owner write" on storage.objects;
create policy "grave-photos owner write" on storage.objects
  for insert with check (
    bucket_id = 'grave-photos'
    and (storage.foldername(name))[1] = public.sso_user_id()
  );

drop policy if exists "grave-photos owner update" on storage.objects;
create policy "grave-photos owner update" on storage.objects
  for update using (
    bucket_id = 'grave-photos'
    and (storage.foldername(name))[1] = public.sso_user_id()
  );

drop policy if exists "grave-photos owner delete" on storage.objects;
create policy "grave-photos owner delete" on storage.objects
  for delete using (
    bucket_id = 'grave-photos'
    and (storage.foldername(name))[1] = public.sso_user_id()
  );

-- ---- 8. Lock down direct table access for anon -------------------
-- RLS already blocks anon (no userId claim → policies fail), but revoking
-- table privileges entirely is belt-and-suspenders.
revoke all on public.graves from anon;
revoke all on public.deceased_persons from anon;
revoke all on public.grave_photos from anon;
