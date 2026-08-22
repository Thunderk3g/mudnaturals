-- 008 · CMS pages, journal, reviews, coupons, audit log.

-- CMS draft/publish pointer swap, ported from the reference project. The page
-- row holds two pointers; publishing is swapping one pointer, so a draft can be
-- edited indefinitely without touching what the public sees.
create table content_pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  kind        text not null default 'page',
  title       text not null,
  draft_version_id     uuid,
  published_version_id uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint content_pages_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint content_pages_kind_known check (kind in ('page', 'journal'))
);
create trigger content_pages_updated_at before update on content_pages
  for each row execute function public.set_updated_at();
alter table content_pages enable row level security;
create policy content_pages_public_read on content_pages
  for select to anon, authenticated using (published_version_id is not null);
grant select on content_pages to anon, authenticated;

create table content_versions (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references content_pages(id) on delete cascade,
  blocks     jsonb not null default '[]'::jsonb,
  excerpt    text,
  hero_image text,
  author     text,
  -- Products shown in the "Shop this story" rail. Every story surface is
  -- shoppable: no leaf nodes anywhere in the IA.
  product_ids uuid[] not null default '{}',
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index content_versions_page_id_idx on content_versions(page_id, created_at desc);
alter table content_versions enable row level security;
create policy content_versions_public_read on content_versions
  for select to anon, authenticated
  using (exists (select 1 from content_pages p where p.published_version_id = id));
grant select on content_versions to anon, authenticated;

alter table content_pages
  add constraint content_pages_draft_version_fkey
    foreign key (draft_version_id) references content_versions(id) on delete set null,
  add constraint content_pages_published_version_fkey
    foreign key (published_version_id) references content_versions(id) on delete set null;

-- --------------------------------------------------------------- reviews ----

-- Submitted through a tokenised post-purchase link. Requiring an account to
-- review is the documented reason most craft sites have almost none.
create table reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  order_id   uuid references orders(id) on delete set null,
  author_name text not null,
  rating     int  not null,
  title      text,
  body       text,
  image_path text,
  is_approved boolean not null default false,
  review_token text unique,
  created_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_author_present check (btrim(author_name) <> '')
);
create index reviews_product_id_idx on reviews(product_id) where is_approved;
create unique index reviews_one_per_order_product_uq
  on reviews(order_id, product_id) where order_id is not null;
alter table reviews enable row level security;
create policy reviews_public_read on reviews
  for select to anon, authenticated using (is_approved);
grant select on reviews to anon, authenticated;

-- --------------------------------------------------------------- coupons ----

create table coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  kind          text not null,
  percent_off   int,
  amount_off_paisa integer,
  min_order_paisa  integer not null default 0,
  uses_remaining int,
  per_customer_limit int not null default 1,
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint coupons_kind_known check (kind in ('percent', 'amount', 'free_shipping')),
  constraint coupons_percent_range check (percent_off is null or percent_off between 0 and 100),
  constraint coupons_amount_positive check (amount_off_paisa is null or amount_off_paisa > 0),
  constraint coupons_uses_non_negative check (uses_remaining is null or uses_remaining >= 0),
  constraint coupons_min_order_non_negative check (min_order_paisa >= 0),
  -- Codes long enough that enumeration is impractical.
  constraint coupons_code_length check (length(code) >= 8),
  constraint coupons_value_matches_kind check (
    (kind = 'percent'       and percent_off is not null) or
    (kind = 'amount'        and amount_off_paisa is not null) or
    (kind = 'free_shipping')
  )
);
create trigger coupons_updated_at before update on coupons
  for each row execute function public.set_updated_at();
alter table coupons enable row level security;

create table coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references coupons(id) on delete cascade,
  order_id    uuid not null references orders(id)  on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index coupon_redemptions_coupon_id_idx on coupon_redemptions(coupon_id);
create unique index coupon_redemptions_order_uq on coupon_redemptions(order_id);
-- One redemption per customer per coupon, enforced by the database rather than
-- by a check the application might forget on one code path.
create unique index coupon_redemptions_per_customer_uq
  on coupon_redemptions(coupon_id, customer_id) where customer_id is not null;
alter table coupon_redemptions enable row level security;

alter table orders
  add constraint orders_coupon_id_fkey foreign key (coupon_id) references coupons(id) on delete set null;
create index orders_coupon_id_idx on orders(coupon_id) where coupon_id is not null;

-- ------------------------------------------------------------- audit log ----

create table audit_log (
  id         bigserial primary key,
  actor      uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log(entity, entity_id, created_at desc);
alter table audit_log enable row level security;
create trigger audit_log_no_update before update on audit_log
  for each row execute function public.reject_ledger_mutation();
create trigger audit_log_no_delete before delete on audit_log
  for each row execute function public.reject_ledger_mutation();
