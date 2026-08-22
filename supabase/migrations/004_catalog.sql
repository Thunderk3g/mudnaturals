-- 004 · Catalogue: categories, collections, products, variants, images.
--
-- Category is what the object IS: flat, one per product, the breadcrumb parent.
-- Collection is why you'd want it now: curated, many-to-many, manually sorted,
-- and never a breadcrumb parent.

create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  status      publish_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create trigger categories_updated_at before update on categories
  for each row execute function public.set_updated_at();
alter table categories enable row level security;
create policy categories_public_read on categories
  for select to anon, authenticated using (status = 'published');
grant select on categories to anon, authenticated;

create table collections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  subtitle    text,
  story       text,
  cover_image text,
  sort_order  int  not null default 0,
  status      publish_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint collections_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create trigger collections_updated_at before update on collections
  for each row execute function public.set_updated_at();
alter table collections enable row level security;
create policy collections_public_read on collections
  for select to anon, authenticated using (status = 'published');
grant select on collections to anon, authenticated;

-- ------------------------------------------------------------ products ----

create table products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  subtitle     text,
  description  text,
  care         text,
  category_id  uuid not null references categories(id) on delete restrict,

  -- Provenance. Denormalised from the stock intake for display, and required
  -- before publish by the constraint below (decision 2).
  maker_id     uuid references makers(id)          on delete restrict,
  community_id uuid references communities(id)      on delete restrict,
  material_id  uuid references materials(id)        on delete restrict,
  technique_id uuid references craft_techniques(id) on delete restrict,
  labour_hours numeric(6,1),
  variation_note text,      -- expected handmade variation, stated as a spec

  -- Money is integer paisa, everywhere, always.
  price_paisa      integer not null,
  compare_at_paisa integer,
  -- Layer 1 of the impact story: what reaches the maker. Nullable until the
  -- operator publishes the figure (QUESTIONS.md #1); the PDP module hides itself
  -- while it is null rather than printing a placeholder.
  maker_share_paisa integer,

  is_food      boolean not null default false,
  status       publish_status not null default 'draft',
  published_at timestamptz,
  sort_order   int not null default 0,
  search_text  text generated always as (
                 coalesce(name,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(description,'')
               ) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint products_slug_format   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_price_positive check (price_paisa > 0),
  constraint products_compare_at_sane check (compare_at_paisa is null or compare_at_paisa > price_paisa),
  constraint products_maker_share_sane check (
    maker_share_paisa is null or (maker_share_paisa >= 0 and maker_share_paisa <= price_paisa)
  ),
  constraint products_labour_hours_positive check (labour_hours is null or labour_hours > 0),

  -- Decision 2, enforced in the database rather than the form: no provenance,
  -- no publish.
  constraint products_provenance_required_to_publish check (
    status <> 'published' or (
      maker_id is not null and community_id is not null
      and material_id is not null and technique_id is not null
    )
  )
);
create index products_category_id_idx  on products(category_id);
create index products_maker_id_idx     on products(maker_id);
create index products_community_id_idx on products(community_id);
create index products_material_id_idx  on products(material_id);
create index products_technique_id_idx on products(technique_id);
create index products_status_idx       on products(status) where status = 'published';
create index products_search_trgm_idx  on products using gin (search_text gin_trgm_ops);
create trigger products_updated_at before update on products
  for each row execute function public.set_updated_at();
alter table products enable row level security;
create policy products_public_read on products
  for select to anon, authenticated using (status = 'published');
grant select on products to anon, authenticated;

-- Variants are rows, never JSON: an option that has no row cannot be bought.
create table product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  sku         text not null unique,
  option_name text,                     -- 'Size'
  option_value text,                    -- 'Large'
  price_paisa integer,                  -- null = inherit the product price
  is_default  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint product_variants_price_positive check (price_paisa is null or price_paisa > 0),
  constraint product_variants_sku_present    check (btrim(sku) <> '')
);
create index product_variants_product_id_idx on product_variants(product_id);
create unique index product_variants_one_default_uq
  on product_variants(product_id) where is_default;
create unique index product_variants_option_uq
  on product_variants(product_id, coalesce(option_value, ''));
create trigger product_variants_updated_at before update on product_variants
  for each row execute function public.set_updated_at();
alter table product_variants enable row level security;
create policy product_variants_public_read on product_variants
  for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
grant select on product_variants to anon, authenticated;

-- `origin` carries the §9 media disclosure: a real photograph, a retouched
-- photograph, or a generated image. PDP images of real SKUs must be photographs.
create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  alt        text not null,
  width      int,
  height     int,
  origin     text not null default 'photograph',
  is_scale_reference boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint product_images_origin_known check (
    origin in ('photograph', 'photograph-retouched', 'generated')
  ),
  constraint product_images_alt_present check (btrim(alt) <> '')
);
create index product_images_product_id_idx on product_images(product_id, sort_order);
alter table product_images enable row level security;
create policy product_images_public_read on product_images
  for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
grant select on product_images to anon, authenticated;

-- Many-to-many, manually sorted within each collection.
create table collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id    uuid not null references products(id)    on delete cascade,
  sort_order    int  not null default 0,
  primary key (collection_id, product_id)
);
create index collection_products_product_id_idx on collection_products(product_id);
alter table collection_products enable row level security;
create policy collection_products_public_read on collection_products
  for select to anon, authenticated using (true);
grant select on collection_products to anon, authenticated;
