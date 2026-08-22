-- 006 · Orders, line items, and the DB-enforced state machine.
--
-- Ported from the reference project's 0018_state_machine.sql: an explicit
-- transition map with the trigger as the real authority, so an illegal
-- transition raises no matter which code path attempted it.

create table customers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users(id) on delete set null,
  email      text,
  phone      text not null,
  full_name  text,
  notes      text,                       -- internal, staff-only
  cod_refusals int not null default 0,
  is_cod_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_phone_present check (btrim(phone) <> ''),
  constraint customers_email_not_blank check (email is null or btrim(email) <> ''),
  constraint customers_refusals_non_negative check (cod_refusals >= 0)
);
create unique index customers_phone_uq on customers(phone);
create index customers_email_idx on customers(lower(email)) where email is not null;
create trigger customers_updated_at before update on customers
  for each row execute function public.set_updated_at();
alter table customers enable row level security;
-- Deny-all to the Data API. Customer-facing reads go through the trusted server.

create table orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique default public.generate_order_number(),
  -- High-entropy token for guest order lookup; never sequential, never guessable.
  lookup_token  text not null unique default encode(gen_random_bytes(24), 'hex'),

  customer_id   uuid references customers(id) on delete restrict,
  email         text,
  phone         text not null,

  status         order_status   not null default 'pending_payment',
  payment_method payment_method not null,
  payment_status payment_status not null default 'unpaid',

  currency       text    not null default 'NPR',
  subtotal_paisa integer not null,
  shipping_paisa integer not null default 0,
  discount_paisa integer not null default 0,
  total_paisa    integer not null,

  -- Snapshotted immutably. A customer editing their address book must never
  -- rewrite the address a past order shipped to.
  shipping_address jsonb not null,

  -- Decision 9: diaspora gifting survives the cut of corporate gifting.
  is_gift        boolean not null default false,
  gift_note      text,
  recipient_name text,
  recipient_phone text,

  -- Decision 5: COD is gated by phone confirmation before dispatch.
  cod_confirmed_at timestamptz,
  cod_otp_hash     text,
  cod_otp_expires_at timestamptz,
  cod_otp_attempts int not null default 0,

  coupon_id     uuid,                    -- FK added in 009
  tracking_ref  text,
  carrier       text,
  placed_at     timestamptz not null default now(),
  paid_at       timestamptz,
  delivered_at  timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text,
  idempotency_key text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint orders_currency_npr      check (currency = 'NPR'),
  constraint orders_total_positive    check (total_paisa > 0),
  constraint orders_subtotal_positive check (subtotal_paisa > 0),
  constraint orders_shipping_non_negative check (shipping_paisa >= 0),
  constraint orders_discount_non_negative check (discount_paisa >= 0),
  constraint orders_total_is_sum      check (total_paisa = subtotal_paisa + shipping_paisa - discount_paisa),
  constraint orders_email_not_blank   check (email is null or btrim(email) <> ''),
  constraint orders_phone_present     check (btrim(phone) <> ''),
  constraint orders_gift_needs_recipient check (
    not is_gift or (recipient_name is not null and recipient_phone is not null)
  ),
  constraint orders_cod_otp_attempts_non_negative check (cod_otp_attempts >= 0)
);
create unique index orders_idempotency_key_uq on orders(idempotency_key)
  where idempotency_key is not null;
create index orders_customer_id_idx on orders(customer_id);
create index orders_status_idx      on orders(status);
create index orders_placed_at_idx   on orders(placed_at desc);
create index orders_cod_queue_idx   on orders(placed_at)
  where payment_method = 'cod' and cod_confirmed_at is null;
create trigger orders_updated_at before update on orders
  for each row execute function public.set_updated_at();
alter table orders enable row level security;
-- Deny-all to the Data API. Guest lookup goes through a definer RPC by token.

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  variant_id  uuid references product_variants(id) on delete restrict,
  product_id  uuid references products(id)         on delete restrict,

  -- Snapshots. Product edits must never mutate order history.
  product_name text not null,
  variant_label text,
  sku          text not null,
  maker_id     uuid references makers(id)      on delete set null,
  community_id uuid references communities(id) on delete set null,
  maker_name   text,
  unit_price_paisa integer not null,
  maker_share_paisa integer,
  quantity     integer not null,
  line_total_paisa integer not null,
  created_at   timestamptz not null default now(),

  constraint order_items_qty_positive   check (quantity > 0),
  constraint order_items_price_positive check (unit_price_paisa > 0),
  constraint order_items_line_total_is_product
    check (line_total_paisa = unit_price_paisa * quantity)
);
-- Report 11 calls this the single highest-value line of SQL never written in
-- the reference project.
create index order_items_order_id_idx   on order_items(order_id);
create index order_items_variant_id_idx on order_items(variant_id);
create index order_items_maker_id_idx   on order_items(maker_id);
alter table order_items enable row level security;

-- Now that orders exists, close the ledger's forward reference.
alter table stock_ledger
  add constraint stock_ledger_order_id_fkey
  foreign key (order_id) references orders(id) on delete set null;

-- Append-only timeline. Powers the admin order view and customer support.
create table order_events (
  id         bigserial primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status,
  event      text not null,
  detail     jsonb,
  actor      uuid,
  created_at timestamptz not null default now()
);
create index order_events_order_id_idx on order_events(order_id, created_at);
alter table order_events enable row level security;
create trigger order_events_no_update before update on order_events
  for each row execute function public.reject_ledger_mutation();
create trigger order_events_no_delete before delete on order_events
  for each row execute function public.reject_ledger_mutation();

-- --------------------------------------------------------- state machine ----

create or replace function public.order_transition_allowed(
  p_from order_status, p_to order_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('pending_payment','payment_verifying'), ('pending_payment','paid'),
    ('pending_payment','failed'),            ('pending_payment','expired'),
    ('pending_payment','manual_review'),     ('pending_payment','cancelled'),

    ('payment_verifying','paid'),   ('payment_verifying','failed'),
    ('payment_verifying','manual_review'), ('payment_verifying','expired'),
    ('payment_verifying','cancelled'),

    ('manual_review','paid'), ('manual_review','failed'),
    ('manual_review','cancelled'), ('manual_review','refunded'),

    -- A failed or expired attempt is not terminal for the order: the customer
    -- may retry with a fresh payment attempt.
    ('failed','pending_payment'),  ('failed','cancelled'),  ('failed','expired'),
    ('expired','pending_payment'), ('expired','cancelled'),

    ('paid','confirmed'), ('paid','cancelled'),
    ('paid','refunded'),  ('paid','partially_refunded'),

    ('confirmed','packed'), ('confirmed','cancelled'),
    ('confirmed','refunded'), ('confirmed','refused'),

    ('packed','shipped'), ('packed','cancelled'), ('packed','refused'),

    ('shipped','delivered'), ('shipped','refused'),

    ('delivered','refunded'), ('delivered','partially_refunded'),

    ('refused','cancelled'), ('refused','refunded'),

    ('partially_refunded','refunded')
  );
$$;

create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;                                  -- same-status update is a no-op
  end if;

  if not public.order_transition_allowed(old.status, new.status) then
    raise exception 'illegal order transition: % -> % (order %)',
      old.status, new.status, old.order_number
      using errcode = 'check_violation';
  end if;

  -- Decision 5: a COD order cannot be packed until the phone confirmation lands.
  if new.status = 'packed'
     and new.payment_method = 'cod'
     and new.cod_confirmed_at is null then
    raise exception 'COD order % cannot be packed before phone confirmation',
      old.order_number
      using errcode = 'check_violation';
  end if;

  if new.status = 'paid'  and new.paid_at      is null then new.paid_at      := now(); end if;
  if new.status = 'delivered' and new.delivered_at is null then new.delivered_at := now(); end if;
  if new.status = 'cancelled' and new.cancelled_at is null then new.cancelled_at := now(); end if;

  insert into public.order_events (order_id, from_status, to_status, event)
  values (old.id, old.status, new.status, 'status_change');

  return new;
end;
$$;
create trigger orders_enforce_transition before update of status on orders
  for each row execute function public.enforce_order_transition();
