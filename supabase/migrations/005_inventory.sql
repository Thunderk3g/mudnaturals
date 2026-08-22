-- 005 · Inventory: intake (the wholesale purchase event), an append-only
-- ledger, and trigger-materialised levels.
--
-- Decision 3 is wholesale: MUD buys stock up front and owns it. That removes
-- the earnings ledger and payout runs entirely. `stock_intake` is the purchase
-- event, the provenance anchor and the attribution source in one table.

create table stock_intake (
  id            uuid primary key default gen_random_uuid(),
  variant_id    uuid not null references product_variants(id) on delete restrict,
  maker_id      uuid not null references makers(id)      on delete restrict,
  community_id  uuid not null references communities(id) on delete restrict,
  quantity      integer not null,
  unit_cost_paisa integer not null,      -- what MUD paid the maker, per unit
  batch_ref     text,
  received_on   date not null default current_date,
  notes         text,
  created_at    timestamptz not null default now(),
  constraint stock_intake_qty_positive  check (quantity > 0),
  constraint stock_intake_cost_positive check (unit_cost_paisa > 0)
);
create index stock_intake_variant_id_idx   on stock_intake(variant_id);
create index stock_intake_maker_id_idx     on stock_intake(maker_id);
create index stock_intake_community_id_idx on stock_intake(community_id);
alter table stock_intake enable row level security;
-- Deny-all: purchase costs are commercially sensitive.

-- Materialised current position. Maintained only by the ledger trigger and the
-- reservation helpers below — never written directly by application code.
create table stock_levels (
  variant_id uuid primary key references product_variants(id) on delete cascade,
  on_hand    integer not null default 0,
  reserved   integer not null default 0,
  available  integer generated always as (on_hand - reserved) stored,
  low_stock_threshold integer not null default 3,
  updated_at timestamptz not null default now(),
  constraint stock_levels_on_hand_non_negative  check (on_hand  >= 0),
  constraint stock_levels_reserved_non_negative check (reserved >= 0),
  constraint stock_levels_reserved_within_hand  check (reserved <= on_hand)
);
alter table stock_levels enable row level security;
create policy stock_levels_public_read on stock_levels
  for select to anon, authenticated
  using (exists (
    select 1 from product_variants v join products p on p.id = v.product_id
    where v.id = variant_id and p.status = 'published'
  ));
grant select on stock_levels to anon, authenticated;

-- Append-only. Every change to on_hand leaves a row here, so stock is auditable
-- by construction and an admin "adjustment" can never clobber a concurrent sale.
create table stock_ledger (
  id         bigserial primary key,
  variant_id uuid not null references product_variants(id) on delete restrict,
  delta      integer not null,
  reason     stock_movement_reason not null,
  intake_id  uuid references stock_intake(id) on delete set null,
  order_id   uuid,                      -- FK added in 006, after orders exists
  actor      uuid,
  note       text,
  created_at timestamptz not null default now(),
  constraint stock_ledger_delta_non_zero check (delta <> 0)
);
create index stock_ledger_variant_id_idx on stock_ledger(variant_id, created_at desc);
create index stock_ledger_order_id_idx   on stock_ledger(order_id) where order_id is not null;
alter table stock_ledger enable row level security;

-- The ledger is the authority; levels are derived from it.
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.stock_levels as sl (variant_id, on_hand)
  values (new.variant_id, new.delta)
  on conflict (variant_id) do update
    set on_hand = sl.on_hand + new.delta,
        updated_at = now();
  return new;
end;
$$;
create trigger stock_ledger_apply after insert on stock_ledger
  for each row execute function public.apply_stock_movement();

-- The ledger must stay append-only, enforced in the database rather than by
-- convention (the reference project relied on convention).
create or replace function public.reject_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'stock_ledger is append-only';
end;
$$;
create trigger stock_ledger_no_update before update on stock_ledger
  for each row execute function public.reject_ledger_mutation();
create trigger stock_ledger_no_delete before delete on stock_ledger
  for each row execute function public.reject_ledger_mutation();

-- Reserve stock for an in-flight order. Conditional single-statement update:
-- concurrent callers serialise on the row and the loser simply gets 0 rows,
-- so overselling is impossible without any application-level locking.
create or replace function public.reserve_stock(p_variant_id uuid, p_qty integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  updated integer;
begin
  if p_qty <= 0 then
    raise exception 'quantity must be positive';
  end if;

  update public.stock_levels
     set reserved = reserved + p_qty,
         updated_at = now()
   where variant_id = p_variant_id
     and on_hand - reserved >= p_qty;

  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;

create or replace function public.release_stock(p_variant_id uuid, p_qty integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.stock_levels
     set reserved = greatest(reserved - p_qty, 0),
         updated_at = now()
   where variant_id = p_variant_id;
end;
$$;

-- Convert a reservation into a sale: release the hold and decrement on_hand in
-- one statement pair, inside the caller's transaction.
create or replace function public.commit_stock(
  p_variant_id uuid, p_qty integer, p_order_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.stock_levels
     set reserved = greatest(reserved - p_qty, 0),
         updated_at = now()
   where variant_id = p_variant_id;

  insert into public.stock_ledger (variant_id, delta, reason, order_id)
  values (p_variant_id, -p_qty, 'sale', p_order_id);
end;
$$;

revoke execute on function public.reserve_stock(uuid, integer) from anon, authenticated;
revoke execute on function public.release_stock(uuid, integer) from anon, authenticated;
revoke execute on function public.commit_stock(uuid, integer, uuid) from anon, authenticated;

-- Recording an intake both pays the maker (outside the system) and raises stock.
create or replace function public.record_intake(
  p_variant_id uuid, p_maker_id uuid, p_community_id uuid,
  p_qty integer, p_unit_cost_paisa integer, p_batch_ref text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_intake_id uuid;
begin
  insert into public.stock_intake (variant_id, maker_id, community_id, quantity, unit_cost_paisa, batch_ref)
  values (p_variant_id, p_maker_id, p_community_id, p_qty, p_unit_cost_paisa, p_batch_ref)
  returning id into v_intake_id;

  insert into public.stock_ledger (variant_id, delta, reason, intake_id)
  values (p_variant_id, p_qty, 'intake', v_intake_id);

  return v_intake_id;
end;
$$;
revoke execute on function public.record_intake(uuid, uuid, uuid, integer, integer, text) from anon, authenticated;
