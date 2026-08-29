-- SuperNav AI — סכימת-סופרבייס. הריצו פעם אחת ב-SQL Editor של הפרויקט
-- (Supabase Dashboard → SQL Editor → New query → הדביקו → Run).
-- כל הגישה מהשרת עוברת דרך ה-service-role key (server/supabaseClient.js)
-- שעוקף RLS, אז לא נדרשות מדיניות-RLS כאן — הטבלאות פרטיות מטבען
-- (אין גישה ישירה מהדפדפן/anon key).

create table if not exists households (
  id text primary key,
  name text not null,
  join_code text unique not null,
  created_at bigint not null
);

create table if not exists users (
  id text primary key,
  username text unique not null,
  password_hash text not null,
  emoji text,
  photo text,
  household_id text references households(id) on delete set null,
  security_question text,
  security_answer_hash text,
  created_at bigint not null
);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at bigint not null
);

create table if not exists products (
  id text primary key,
  name text not null,
  barcode text,
  department text,
  shelf int,
  zone int,
  price numeric not null,
  category text,
  sale_percent int,
  updated_at bigint
);

create table if not exists price_history (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  price numeric not null,
  sale_percent int,
  changed_by text,
  created_at bigint not null,
  note text
);

create table if not exists location_history (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  department text,
  shelf int,
  zone int,
  changed_by text,
  created_at bigint not null,
  note text
);

create table if not exists verifications (
  product_id text primary key references products(id) on delete cascade,
  confirmed int not null default 0,
  not_found int not null default 0
);

create table if not exists venues (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  chain_name text not null,
  branch_name text not null,
  store_type text not null default 'supermarket',
  address text,
  created_by text,
  created_at bigint not null
);

create table if not exists trips (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  venue_id text references venues(id) on delete set null,
  status text not null default 'active',
  created_by text,
  created_at bigint not null,
  finished_at bigint,
  items jsonb not null default '[]'::jsonb
);

create table if not exists price_observations (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  user_id text references users(id) on delete set null,
  venue_id text references venues(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  purchased_at bigint not null,
  created_at bigint not null
);

create table if not exists official_prices (
  id bigserial primary key,
  barcode text not null,
  venue_id text not null references venues(id) on delete cascade,
  name text not null,
  price numeric not null,
  imported_at bigint not null,
  unique (barcode, venue_id)
);

-- מאגר המחירים הארצי. הנתונים מגיעים רק מקובצי שקיפות-המחירים
-- הרשמיים; בחירת העיר של המשפחה קובעת אילו סניפים נשמרים בייבוא.
create table if not exists price_cities (
  code text primary key,
  name text not null unique,
  updated_at bigint not null
);

create table if not exists household_price_preferences (
  household_id text primary key references households(id) on delete cascade,
  city_code text references price_cities(code) on delete set null,
  updated_at bigint not null
);

create table if not exists retail_chains (
  id text primary key,
  name text not null,
  source_name text not null,
  updated_at bigint not null
);

create table if not exists retail_stores (
  id text primary key,
  chain_id text not null references retail_chains(id) on delete cascade,
  external_id text not null,
  name text not null,
  city_code text references price_cities(code) on delete set null,
  city_name text not null,
  address text,
  source_updated_at bigint,
  imported_at bigint not null,
  unique (chain_id, external_id)
);

create table if not exists retail_products (
  barcode text primary key,
  name text not null,
  manufacturer text,
  unit_quantity text,
  updated_at bigint not null
);

create table if not exists retail_prices (
  barcode text not null references retail_products(barcode) on delete cascade,
  store_id text not null references retail_stores(id) on delete cascade,
  price numeric not null,
  unit_price numeric,
  unit_measure text,
  source_file text not null,
  source_url text,
  source_updated_at bigint not null,
  imported_at bigint not null,
  primary key (barcode, store_id)
);

create table if not exists retail_promotions (
  id text primary key,
  store_id text not null references retail_stores(id) on delete cascade,
  description text,
  discounted_price numeric,
  min_quantity numeric,
  club_only boolean not null default false,
  starts_at bigint,
  ends_at bigint,
  source_file text not null,
  source_updated_at bigint not null,
  imported_at bigint not null
);

create table if not exists retail_promotion_items (
  promotion_id text not null references retail_promotions(id) on delete cascade,
  barcode text not null references retail_products(barcode) on delete cascade,
  primary key (promotion_id, barcode)
);

create table if not exists price_import_runs (
  id text primary key,
  chain_id text,
  status text not null,
  stores_imported integer not null default 0,
  prices_imported integer not null default 0,
  promotions_imported integer not null default 0,
  error text,
  started_at bigint not null,
  finished_at bigint
);

create table if not exists groups (
  id text primary key,
  name text not null,
  photo text,
  owner_id text references users(id) on delete set null,
  created_at bigint not null
);

create table if not exists group_memberships (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null default 'member',
  restriction jsonb,
  status text not null default 'active',
  joined_at bigint not null,
  unique (group_id, user_id)
);

create table if not exists group_invites (
  token text primary key,
  group_id text not null references groups(id) on delete cascade,
  created_by text references users(id) on delete set null,
  created_at bigint not null
);

create index if not exists idx_users_household on users(household_id);
create index if not exists idx_venues_household on venues(household_id);
create index if not exists idx_trips_household on trips(household_id);
create index if not exists idx_price_observations_household on price_observations(household_id);
create index if not exists idx_official_prices_barcode on official_prices(barcode);
create index if not exists idx_retail_stores_city on retail_stores(city_code);
create index if not exists idx_retail_products_name on retail_products(name);
create index if not exists idx_retail_prices_store on retail_prices(store_id);
create index if not exists idx_retail_prices_updated on retail_prices(source_updated_at);
create index if not exists idx_retail_promo_store on retail_promotions(store_id);
create index if not exists idx_retail_promo_barcode on retail_promotion_items(barcode);
create index if not exists idx_group_memberships_group on group_memberships(group_id);
create index if not exists idx_group_memberships_user on group_memberships(user_id);
create index if not exists idx_price_history_product on price_history(product_id);
create index if not exists idx_location_history_product on location_history(product_id);
