-- 002 · Extensions, enums and shared helpers.

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums ----

create type publish_status as enum ('draft', 'published', 'archived');

create type order_status as enum (
  'pending_payment',      -- eSewa attempt in flight
  'payment_verifying',    -- redirect seen or network error; cron will resolve
  'paid',                 -- verified against the eSewa status API
  'confirmed',            -- COD confirmed by phone, or paid order accepted
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'partially_refunded',
  'expired',              -- attempt window elapsed, never paid
  'failed',               -- customer may retry with a fresh attempt
  'manual_review',        -- eSewa returned AMBIGUOUS
  'refused'               -- COD refused at the door (RTO)
);

create type payment_method as enum ('esewa', 'cod');

create type payment_status as enum (
  'unpaid', 'pending', 'paid', 'refunded', 'partially_refunded'
);

-- Mirrors the eSewa ePay v2 status enum plus our own pre-redirect state.
create type payment_attempt_status as enum (
  'initiated', 'pending', 'succeeded', 'failed',
  'expired', 'ambiguous', 'canceled', 'refunded', 'partially_refunded'
);

create type stock_movement_reason as enum (
  'intake', 'sale', 'return', 'adjustment', 'damage', 'sample'
);

create type consent_scope as enum ('name', 'portrait', 'quote', 'video');

create type staff_role as enum ('owner', 'staff');

-- ------------------------------------------------------------- helpers ----

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Staff identity is separate from customer identity. A row here is the only
-- thing that makes an auth user staff; the column is never writable by the
-- user themselves (no grant to authenticated, no RLS write policy).
create table staff_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       staff_role  not null default 'staff',
  full_name  text        not null,
  created_at timestamptz not null default now()
);
alter table staff_users enable row level security;
-- No policy and no grant: reachable only through the trusted server connection.

create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff_users s where s.user_id = uid);
$$;
revoke execute on function public.is_staff(uuid) from anon, authenticated;

-- Order numbers must not be sequential and guessable (report 11, M3).
-- search_path is explicit but includes `extensions`, which is where Supabase
-- installs pgcrypto; both schemas are trusted and not user-writable.
create or replace function public.generate_order_number()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'MUD-' || to_char(now() at time zone 'UTC', 'YYMM') || '-' ||
         upper(encode(gen_random_bytes(4), 'hex'));
$$;
