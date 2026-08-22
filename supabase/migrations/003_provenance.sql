-- 003 · Provenance: communities, makers, consent, materials, techniques.
--
-- Decision 2: a product cannot go live without maker, community, material and
-- technique. Decision 4: named makers under written, dated, revocable consent —
-- revoking must degrade a live page to community-level attribution, not break it.

create table communities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  district    text not null,             -- e.g. 'Rautahat'
  province    text,
  summary     text,
  story       text,
  cover_image text,
  maker_count int,
  working_since int,
  status      publish_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint communities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint communities_name_present check (btrim(name) <> '')
);
create trigger communities_updated_at before update on communities
  for each row execute function public.set_updated_at();
alter table communities enable row level security;
create policy communities_public_read on communities
  for select to anon, authenticated using (status = 'published');
grant select on communities to anon, authenticated;

create table makers (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  community_id uuid not null references communities(id) on delete restrict,
  -- `display_name` is what the site shows. When name consent is withdrawn the
  -- application falls back to the community name; the row is never deleted so
  -- order history and impact rollups stay intact.
  display_name text not null,
  craft        text,
  bio          text,
  quote        text,
  portrait_image text,
  working_since  int,
  status       publish_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint makers_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint makers_name_present check (btrim(display_name) <> '')
);
create index makers_community_id_idx on makers(community_id);
create trigger makers_updated_at before update on makers
  for each row execute function public.set_updated_at();
alter table makers enable row level security;
create policy makers_public_read on makers
  for select to anon, authenticated using (status = 'published');
grant select on makers to anon, authenticated;

-- Dated, revocable, per-scope. Absence of a row means no consent.
create table consent_records (
  id          uuid primary key default gen_random_uuid(),
  maker_id    uuid not null references makers(id) on delete cascade,
  scope       consent_scope not null,
  granted_at  date not null,
  revoked_at  date,
  document_ref text,                    -- storage path of the signed form
  notes       text,
  created_at  timestamptz not null default now(),
  constraint consent_revoked_after_granted check (revoked_at is null or revoked_at >= granted_at)
);
create index consent_records_maker_id_idx on consent_records(maker_id);
create unique index consent_records_active_scope_uq
  on consent_records(maker_id, scope) where revoked_at is null;
alter table consent_records enable row level security;
-- Deny-all: consent paperwork is never public.

-- True when the maker has live consent for a given scope right now.
create or replace function public.maker_has_consent(p_maker_id uuid, p_scope consent_scope)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.consent_records c
    where c.maker_id = p_maker_id
      and c.scope = p_scope
      and c.granted_at <= current_date
      and (c.revoked_at is null or c.revoked_at > current_date)
  );
$$;

create table materials (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,            -- 'Sikki grass'
  local_name  text,                     -- 'सिक्की'
  description text,
  origin_note text,
  status      publish_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint materials_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create trigger materials_updated_at before update on materials
  for each row execute function public.set_updated_at();
alter table materials enable row level security;
create policy materials_public_read on materials
  for select to anon, authenticated using (status = 'published');
grant select on materials to anon, authenticated;

create table craft_techniques (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,            -- 'Coil weaving'
  local_name  text,
  description text,
  steps       jsonb not null default '[]'::jsonb,  -- [{step, title, body, image}]
  status      publish_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint craft_techniques_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create trigger craft_techniques_updated_at before update on craft_techniques
  for each row execute function public.set_updated_at();
alter table craft_techniques enable row level security;
create policy craft_techniques_public_read on craft_techniques
  for select to anon, authenticated using (status = 'published');
grant select on craft_techniques to anon, authenticated;
