-- 011 · CMS: media library, page blocks, editable navigation and site settings.
--
-- Three things the console could not do before this migration: hold an image it
-- did not get from the build-time crop script, change what the homepage is made
-- of, and change the words in the chrome around every page. Each one is a table
-- or a settings row here, and each one is read by the storefront through
-- src/server/cms.ts — there is no second copy of this data in the codebase.

-- ----------------------------------------------------------- media library --

-- Bytes live in Postgres and are served by /api/media/[id] behind a one-year
-- immutable cache header. That is a deliberate trade: no second vendor, no
-- token to rotate, no bucket to leak, and the CDN means the function runs once
-- per image per region. Uploads are normalised to <= 2400px before they land,
-- so rows are a few hundred KB, not a few MB.
--
-- Content-addressed: the same file uploaded twice is one row, so replacing an
-- image everywhere it appears is a single pointer change and never a partial
-- rename across pages.
create table media_assets (
  id           uuid primary key default gen_random_uuid(),
  sha256       text not null unique,
  filename     text not null,
  content_type text not null,
  bytes        integer not null check (bytes > 0),
  width        integer,
  height       integer,
  -- Alt text is not optional in the console UI. It is nullable here only so an
  -- upload can be recorded before the operator has typed it.
  alt          text not null default '',
  focal_point  text not null default 'center',
  data         bytea not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint media_assets_type_allowed check (
    content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ),
  constraint media_assets_focal_known check (
    focal_point in ('center', 'top', 'bottom', 'left', 'right')
  )
);
create trigger media_assets_updated_at before update on media_assets
  for each row execute function public.set_updated_at();
alter table media_assets enable row level security;
-- No grant, no policy: bytes reach the public only through the route handler,
-- which uses the server connection. The Data API stays shut.

create index media_assets_created_idx on media_assets(created_at desc);

-- ------------------------------------------------------------- page blocks --

-- The homepage and the flat marketing pages are a list of blocks, ordered, each
-- with a typed payload. The console edits rows here; the storefront renders
-- whatever it finds. Adding a section to the site is inserting a row, not a
-- deployment.
--
-- block_type is checked rather than an enum so that adding a type is a
-- migration that alters one constraint, not one that rewrites a type used by
-- other columns. The matching TypeScript definitions live in src/lib/blocks.ts
-- and are the authority on what `data` holds for each type.
create table page_blocks (
  id         uuid primary key default gen_random_uuid(),
  page_key   text not null,
  block_type text not null,
  position   int  not null default 0,
  is_visible boolean not null default true,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint page_blocks_page_known check (page_key in ('home', 'about', 'shop')),
  constraint page_blocks_type_known check (block_type in (
    'hero',
    'statement',
    'value_props',
    'category_grid',
    'product_rail',
    'collection_feature',
    'community_feature',
    'journal_rail',
    'image_banner',
    'rich_text'
  )),
  -- jsonb, not a JSON string. postgres.js will happily store a stringified
  -- object as a scalar and every reader then sees a string; the check makes
  -- that fail at write time instead of silently blanking a page.
  constraint page_blocks_data_is_object check (jsonb_typeof(data) = 'object')
);
create trigger page_blocks_updated_at before update on page_blocks
  for each row execute function public.set_updated_at();
create index page_blocks_page_idx on page_blocks(page_key, position);
alter table page_blocks enable row level security;
grant select on page_blocks to anon, authenticated;
create policy page_blocks_public_read on page_blocks
  for select to anon, authenticated using (is_visible);

-- ------------------------------------------------------- category artwork --

-- Categories were text-only. The console can now give each one a plate, which
-- the shop index and the category_grid block both use.
--
-- Collections, communities and makers already had a `*_image` text column
-- holding a path produced by the build-time crop script. Those columns stay:
-- the readers prefer the uploaded asset and fall back to the path, so existing
-- rows keep their artwork until someone replaces it in the console.
alter table categories   add column image_id      uuid references media_assets(id) on delete set null;
-- Product photography can now come from the library instead of the crop script.
-- `storage_path` loses its NOT NULL and gains a partner: a row must carry one
-- source or the other, never neither. Readers coalesce the two into the single
-- `storage_path` the storefront already expects, so no page changed shape.
alter table product_images add column media_id uuid references media_assets(id) on delete cascade;
alter table product_images alter column storage_path drop not null;
alter table product_images add constraint product_images_has_a_source
  check (media_id is not null or storage_path is not null);
create index product_images_media_id_idx on product_images(media_id) where media_id is not null;
alter table collections  add column cover_image_id uuid references media_assets(id) on delete set null;
alter table communities  add column cover_image_id uuid references media_assets(id) on delete set null;
alter table makers       add column portrait_image_id uuid references media_assets(id) on delete set null;

-- ---------------------------------------------------------- site settings --

-- Chrome copy, navigation and SEO defaults. Shapes are enforced in
-- src/lib/site-settings.ts with zod, and the console renders real fields for
-- every key — an operator never edits raw JSON.
insert into settings (key, value) values
  ('site', '{
     "brand_name": "MUD Naturals",
     "tagline": "Objects with origins",
     "announcement": { "enabled": false, "text": "", "href": "" },
     "footer_blurb": "A curated store for work made in Nepali communities.",
     "instagram": "",
     "email": "",
     "phone": ""
   }'::jsonb),
  ('nav', '{
     "primary": [
       { "label": "Shop", "href": "/shop" },
       { "label": "Communities", "href": "/communities" },
       { "label": "Craft", "href": "/craft" },
       { "label": "Journal", "href": "/journal" },
       { "label": "About", "href": "/about" }
     ],
     "footer_groups": []
   }'::jsonb),
  ('seo', '{
     "default_title": "MUD Naturals",
     "default_description": "Curated goods from Nepali communities, with the origin of every object on the label.",
     "og_media_id": null
   }'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------- default homepage layout --

-- Seeds the homepage as it shipped, so applying this migration changes nothing
-- visible. Everything below is now editable in the console. `on conflict do
-- nothing` is not available without a unique key here, so the insert is guarded
-- on the table being empty for this page — re-running the migration is a no-op
-- and an operator who deletes a block does not get it back on the next deploy.
insert into page_blocks (page_key, block_type, position, data)
select * from (values
  ('home', 'hero', 10, '{
     "eyebrow": "Curated in Nepal",
     "title": "Objects with origins",
     "body": "Every piece here comes from a community we buy from directly. The label tells you which one, what it is made of, and how it was made.",
     "primary_cta": { "label": "Browse the shop", "href": "/shop" },
     "secondary_cta": { "label": "The communities", "href": "/communities" },
     "media_id": null,
     "caption": "Bought outright, at a price the workshop set."
   }'::jsonb),
  ('home', 'category_grid', 20, '{
     "eyebrow": "The store",
     "title": "What we carry",
     "cta_label": "See everything",
     "cta_href": "/shop",
     "category_ids": []
   }'::jsonb),
  ('home', 'collection_feature', 30, '{
     "eyebrow": "This season",
     "collection_id": null
   }'::jsonb),
  ('home', 'product_rail', 40, '{
     "eyebrow": "Newest",
     "title": "Just arrived",
     "cta_label": "See everything",
     "cta_href": "/shop",
     "source": "newest",
     "collection_id": null,
     "category_id": null,
     "product_ids": [],
     "limit": 6
   }'::jsonb),
  ('home', 'community_feature', 50, '{
     "eyebrow": "Where it comes from",
     "community_id": null
   }'::jsonb),
  ('home', 'journal_rail', 60, '{
     "eyebrow": "Journal",
     "title": "From the workshops",
     "limit": 3
   }'::jsonb)
) as seed(page_key, block_type, position, data)
where not exists (select 1 from page_blocks where page_key = 'home');
