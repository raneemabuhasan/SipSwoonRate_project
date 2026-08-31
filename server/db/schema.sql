-- Sip & Swoon target PostgreSQL schema.
-- Google Places data is cafe metadata only. Drink/menu data stays owned by Sip & Swoon.

create table if not exists cafes (
  id bigserial primary key,
  place_id text unique,
  source text not null default 'google_places',
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  rating numeric(2, 1),
  user_rating_count integer not null default 0,
  website text,
  phone_number text,
  photo_names jsonb not null default '[]'::jsonb,
  hours jsonb not null default '[]'::jsonb,
  raw_place jsonb,
  fetched_at timestamptz not null default now(),
  details_fetched_at timestamptz
);

create index if not exists cafes_place_id_idx on cafes (place_id);
create index if not exists cafes_location_idx on cafes (lat, lng);
create index if not exists cafes_name_idx on cafes using gin (to_tsvector('english', name));

create table if not exists app_users (
  id bigserial primary key,
  supabase_user_id uuid not null unique,
  email text not null,
  username text unique,
  username_normalized text unique,
  profile_photo_url text,
  preferences jsonb,
  questionnaire_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_supabase_user_id_idx on app_users (supabase_user_id);
create index if not exists app_users_email_idx on app_users (email);

alter table app_users add column if not exists username_normalized text;
update app_users
set username_normalized = lower(username)
where username is not null and username_normalized is null;
create unique index if not exists app_users_username_normalized_unique_idx
  on app_users (username_normalized)
  where username_normalized is not null;

create table if not exists reviews (
  id bigserial primary key,
  cafe_id bigint not null references cafes(id) on delete cascade,
  user_id bigint not null references app_users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  text text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists reviews_cafe_id_idx on reviews (cafe_id);
create index if not exists reviews_user_id_idx on reviews (user_id);

create table if not exists favorites (
  user_id bigint not null references app_users(id) on delete cascade,
  cafe_id bigint not null references cafes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cafe_id)
);

create index if not exists favorites_cafe_id_idx on favorites (cafe_id);

create table if not exists drinks (
  id bigserial primary key,
  name text not null unique,
  normalized_name text not null unique,
  category text,
  description text,
  aliases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists drinks_normalized_name_idx on drinks (normalized_name);

create table if not exists cafe_drinks (
  cafe_id bigint not null references cafes(id) on delete cascade,
  drink_id bigint not null references drinks(id) on delete cascade,
  availability_status text not null default 'unknown'
    check (availability_status in ('available', 'seasonal', 'unavailable', 'unknown')),
  source text not null default 'user',
  confidence numeric(3, 2) not null default 0.50,
  notes text,
  last_verified_at timestamptz,
  last_updated timestamptz not null default now(),
  primary key (cafe_id, drink_id)
);

create index if not exists cafe_drinks_drink_status_idx on cafe_drinks (drink_id, availability_status);
create index if not exists cafe_drinks_cafe_status_idx on cafe_drinks (cafe_id, availability_status);

create table if not exists user_drink_suggestions (
  id bigserial primary key,
  cafe_id bigint references cafes(id) on delete cascade,
  drink_id bigint references drinks(id) on delete set null,
  suggested_drink_name text not null,
  availability_status text not null default 'unknown'
    check (availability_status in ('available', 'seasonal', 'unavailable', 'unknown')),
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists place_search_cache (
  cache_key text primary key,
  lat double precision not null,
  lng double precision not null,
  radius_miles numeric(6, 2) not null,
  response jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists place_search_cache_expires_idx on place_search_cache (expires_at);

-- Application data is server-only. The browser uses Supabase for Auth, while the
-- Express API accesses these tables through its private PostgreSQL connection.
-- Keep RLS enabled even though anon/authenticated have no direct table grants so
-- an accidental grant cannot silently expose every row.
alter table cafes enable row level security;
alter table app_users enable row level security;
alter table reviews enable row level security;
alter table favorites enable row level security;
alter table drinks enable row level security;
alter table cafe_drinks enable row level security;
alter table user_drink_suggestions enable row level security;
alter table place_search_cache enable row level security;

revoke all privileges on table
  cafes,
  app_users,
  reviews,
  favorites,
  drinks,
  cafe_drinks,
  user_drink_suggestions,
  place_search_cache
from anon, authenticated;

revoke all privileges on all sequences in schema public from anon, authenticated;

-- Protect tables and sequences created by future migrations run as this role.
alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges in schema public
  revoke all privileges on sequences from anon, authenticated;
