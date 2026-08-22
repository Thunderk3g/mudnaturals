-- 009 · The transactional core: settings, place_order, confirm_payment,
-- guest lookup, COD confirmation.
--
-- Every multi-table write lives in exactly one function so concurrency and
-- idempotency have exactly one place to be correct. The reference project spread
-- these across module boundaries, and four of its five critical defects came
-- from a function that opened its own transaction being called from inside one.

create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table settings enable row level security;

insert into settings (key, value) values
  ('shipping', '{
     "inside_valley_paisa": 15000,
     "outside_valley_paisa": 25000,
     "free_over_paisa": 500000,
     "valley_districts": ["Kathmandu", "Lalitpur", "Bhaktapur"]
   }'::jsonb),
  ('cod', '{
     "enabled": true,
     "max_order_paisa": 1500000,
     "max_refusals_before_block": 2
   }'::jsonb),
  ('impact', '{
     "maker_share_published": false,
     "fund_formula": "greater of 20% of net profit or 1% of revenue"
   }'::jsonb)
on conflict (key) do nothing;

-- --------------------------------------------------------- place_order ----
--
-- The client sends variant ids, quantities and a coupon *code*. It never sends
-- a price, a discount value or a total: all money is computed here from the
-- products table. Returns the created order, or the existing one when the same
-- idempotency key is replayed.

create or replace function public.place_order(
  p_items           jsonb,     -- [{"variant_id": uuid, "quantity": int}]
  p_phone           text,
  p_email           text,
  p_full_name       text,
  p_address         jsonb,
  p_payment_method  payment_method,
  p_idempotency_key text,
  p_coupon_code     text default null,
  p_gift            jsonb default null   -- {"note","recipient_name","recipient_phone"}
)
returns table (order_id uuid, order_number text, lookup_token text, total_paisa integer)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_existing        orders%rowtype;
  v_customer_id     uuid;
  v_item            jsonb;
  v_variant         record;
  v_qty             integer;
  v_subtotal        integer := 0;
  v_shipping        integer := 0;
  v_discount        integer := 0;
  v_total           integer;
  v_order_id        uuid;
  v_coupon          coupons%rowtype;
  v_shipping_cfg    jsonb;
  v_cod_cfg         jsonb;
  v_district        text;
  v_is_gift         boolean := coalesce(p_gift is not null, false);
  v_cust            record;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'idempotency key is required';
  end if;

  -- Replay of a completed request returns the original order rather than
  -- creating a second one. Double-submit on a flaky mobile connection is the
  -- expected case here, not the exceptional one.
  select * into v_existing from orders where idempotency_key = p_idempotency_key;
  if found then
    return query select v_existing.id, v_existing.order_number,
                        v_existing.lookup_token, v_existing.total_paisa;
    return;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'cart is empty';
  end if;

  select value into v_shipping_cfg from settings where key = 'shipping';
  select value into v_cod_cfg      from settings where key = 'cod';

  -- Customer identity is phone-first: Nepali D2C is phone-identified, and the
  -- courier calls before delivering.
  insert into customers (phone, email, full_name)
  values (btrim(p_phone), nullif(btrim(coalesce(p_email, '')), ''), nullif(btrim(coalesce(p_full_name, '')), ''))
  on conflict (phone) do update
    set email     = coalesce(excluded.email, customers.email),
        full_name = coalesce(excluded.full_name, customers.full_name),
        updated_at = now()
  returning id into v_customer_id;

  select * into v_cust from customers where id = v_customer_id;

  if p_payment_method = 'cod' then
    if not (v_cod_cfg->>'enabled')::boolean then
      raise exception 'cash on delivery is not available';
    end if;
    if v_cust.is_cod_blocked then
      raise exception 'cash on delivery is not available for this account';
    end if;
  end if;

  v_order_id := gen_random_uuid();

  -- Price and reserve every line from the database.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid quantity';
    end if;

    select v.id            as variant_id,
           v.sku           as sku,
           v.option_value  as option_value,
           coalesce(v.price_paisa, p.price_paisa) as unit_price_paisa,
           p.id            as product_id,
           p.name          as product_name,
           p.status        as product_status,
           p.maker_id      as maker_id,
           p.community_id  as community_id,
           p.maker_share_paisa as maker_share_paisa,
           m.display_name  as maker_name
      into v_variant
      from product_variants v
      join products p on p.id = v.product_id
      left join makers m on m.id = p.maker_id
     where v.id = (v_item->>'variant_id')::uuid;

    if not found then
      raise exception 'product not found';
    end if;
    if v_variant.product_status <> 'published' then
      raise exception 'product % is not available', v_variant.product_name;
    end if;

    -- Conditional atomic reservation. Concurrent buyers serialise on the row;
    -- the loser gets false and the whole order rolls back rather than
    -- overselling a one-of-a-kind piece.
    if not reserve_stock(v_variant.variant_id, v_qty) then
      raise exception 'insufficient stock for %', v_variant.product_name
        using errcode = 'check_violation';
    end if;

    v_subtotal := v_subtotal + (v_variant.unit_price_paisa * v_qty);

    insert into order_items (
      order_id, variant_id, product_id, product_name, variant_label, sku,
      maker_id, community_id, maker_name, unit_price_paisa, maker_share_paisa,
      quantity, line_total_paisa
    ) values (
      v_order_id, v_variant.variant_id, v_variant.product_id, v_variant.product_name,
      v_variant.option_value, v_variant.sku, v_variant.maker_id, v_variant.community_id,
      v_variant.maker_name, v_variant.unit_price_paisa, v_variant.maker_share_paisa,
      v_qty, v_variant.unit_price_paisa * v_qty
    );
  end loop;

  -- Shipping, from the address the customer actually gave us.
  v_district := p_address->>'district';
  if v_subtotal >= (v_shipping_cfg->>'free_over_paisa')::integer then
    v_shipping := 0;
  elsif v_shipping_cfg->'valley_districts' ? v_district then
    v_shipping := (v_shipping_cfg->>'inside_valley_paisa')::integer;
  else
    v_shipping := (v_shipping_cfg->>'outside_valley_paisa')::integer;
  end if;

  -- Coupons: the client sends a code, never a value. The usage cap is
  -- decremented conditionally in the same transaction, so two concurrent
  -- redemptions of the last use cannot both succeed.
  if p_coupon_code is not null and btrim(p_coupon_code) <> '' then
    select * into v_coupon from coupons
     where upper(code) = upper(btrim(p_coupon_code))
       and is_active
       and (starts_at is null or starts_at <= now())
       and (ends_at   is null or ends_at   >  now());

    if not found then
      raise exception 'coupon is not valid';
    end if;
    if v_subtotal < v_coupon.min_order_paisa then
      raise exception 'order does not meet the coupon minimum';
    end if;
    if exists (select 1 from coupon_redemptions
                where coupon_id = v_coupon.id and customer_id = v_customer_id) then
      raise exception 'coupon has already been used';
    end if;

    if v_coupon.uses_remaining is not null then
      update coupons set uses_remaining = uses_remaining - 1
       where id = v_coupon.id and uses_remaining > 0;
      if not found then
        raise exception 'coupon is no longer available';
      end if;
    end if;

    v_discount := case v_coupon.kind
      when 'percent'       then (v_subtotal * v_coupon.percent_off) / 100
      when 'amount'        then least(v_coupon.amount_off_paisa, v_subtotal - 1)
      when 'free_shipping' then v_shipping
    end;
  end if;

  v_total := v_subtotal + v_shipping - v_discount;

  if p_payment_method = 'cod' and v_total > (v_cod_cfg->>'max_order_paisa')::integer then
    raise exception 'this order is above the cash-on-delivery limit';
  end if;

  insert into orders (
    id, customer_id, email, phone, status, payment_method, payment_status,
    subtotal_paisa, shipping_paisa, discount_paisa, total_paisa,
    shipping_address, is_gift, gift_note, recipient_name, recipient_phone,
    coupon_id, idempotency_key
  ) values (
    v_order_id, v_customer_id,
    nullif(btrim(coalesce(p_email, '')), ''), btrim(p_phone),
    -- COD skips the payment machinery entirely and starts confirmed-unpaid;
    -- the transition trigger blocks packing until phone confirmation lands.
    case when p_payment_method = 'cod' then 'confirmed'::order_status
         else 'pending_payment'::order_status end,
    p_payment_method,
    'unpaid',
    v_subtotal, v_shipping, v_discount, v_total,
    p_address, v_is_gift,
    p_gift->>'note', p_gift->>'recipient_name', p_gift->>'recipient_phone',
    v_coupon.id, p_idempotency_key
  );

  if v_coupon.id is not null then
    insert into coupon_redemptions (coupon_id, order_id, customer_id)
    values (v_coupon.id, v_order_id, v_customer_id);
  end if;

  insert into order_events (order_id, to_status, event, detail)
  values (v_order_id, case when p_payment_method = 'cod' then 'confirmed'::order_status
                           else 'pending_payment'::order_status end,
          'order_placed', jsonb_build_object('method', p_payment_method));

  return query
    select o.id, o.order_number, o.lookup_token, o.total_paisa
      from orders o where o.id = v_order_id;
end;
$$;
revoke execute on function public.place_order(jsonb, text, text, text, jsonb, payment_method, text, text, jsonb)
  from anon, authenticated;

-- ------------------------------------------------------ confirm_payment ----
--
-- Called by both the return handler and the reconciliation cron. Takes the row
-- lock, asserts the amount against the frozen snapshot, flips both rows and
-- commits stock. Safe to call repeatedly: a second call on an already-succeeded
-- attempt is a no-op that reports success.

create or replace function public.confirm_payment(
  p_attempt_id   uuid,
  p_amount_paisa integer,
  p_esewa_code   text default null,
  p_ref_id       text default null,
  p_source       text default 'cron'
)
returns table (order_id uuid, order_number text, already_confirmed boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_attempt payment_attempts%rowtype;
  v_order   orders%rowtype;
  v_item    record;
begin
  select * into v_attempt from payment_attempts where id = p_attempt_id for update;
  if not found then
    raise exception 'payment attempt not found';
  end if;

  select * into v_order from orders where id = v_attempt.order_id for update;

  if v_attempt.status = 'succeeded' then
    return query select v_order.id, v_order.order_number, true;
    return;
  end if;

  -- Verify against the amount frozen at initiation, never a recomputed one.
  if p_amount_paisa is distinct from v_attempt.amount_paisa then
    insert into payment_events (attempt_id, order_id, source, event, raw_payload)
    values (p_attempt_id, v_order.id, p_source, 'amount_mismatch',
            jsonb_build_object('expected', v_attempt.amount_paisa, 'received', p_amount_paisa));
    raise exception 'payment amount mismatch on attempt %', p_attempt_id
      using errcode = 'check_violation';
  end if;

  update payment_attempts
     set status = 'succeeded',
         esewa_transaction_code = coalesce(p_esewa_code, esewa_transaction_code),
         esewa_ref_id = coalesce(p_ref_id, esewa_ref_id),
         succeeded_at = now()
   where id = p_attempt_id;

  if v_order.status in ('pending_payment', 'payment_verifying', 'manual_review') then
    update orders
       set status = 'paid', payment_status = 'paid', paid_at = now()
     where id = v_order.id;

    -- Convert every reservation on this order into a sale.
    for v_item in select variant_id, quantity from order_items
                   where order_items.order_id = v_order.id and variant_id is not null loop
      perform commit_stock(v_item.variant_id, v_item.quantity, v_order.id);
    end loop;
  end if;

  insert into payment_events (attempt_id, order_id, source, event, processed, raw_payload)
  values (p_attempt_id, v_order.id, p_source, 'payment_confirmed', true,
          jsonb_build_object('esewa_code', p_esewa_code, 'ref_id', p_ref_id));

  return query select v_order.id, v_order.order_number, false;
end;
$$;
revoke execute on function public.confirm_payment(uuid, integer, text, text, text) from anon, authenticated;

-- Releasing a dead attempt puts its reserved stock back on the shelf.
create or replace function public.fail_payment_attempt(
  p_attempt_id uuid, p_status payment_attempt_status, p_source text default 'cron'
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_attempt payment_attempts%rowtype;
  v_order   orders%rowtype;
  v_item    record;
begin
  select * into v_attempt from payment_attempts where id = p_attempt_id for update;
  if not found or v_attempt.status = 'succeeded' then
    return;
  end if;

  update payment_attempts set status = p_status where id = p_attempt_id;
  select * into v_order from orders where id = v_attempt.order_id for update;

  if v_order.status in ('pending_payment', 'payment_verifying') then
    update orders
       set status = case when p_status = 'expired' then 'expired'::order_status
                         else 'failed'::order_status end
     where id = v_order.id;

    for v_item in select variant_id, quantity from order_items
                   where order_items.order_id = v_order.id and variant_id is not null loop
      perform release_stock(v_item.variant_id, v_item.quantity);
    end loop;
  end if;

  insert into payment_events (attempt_id, order_id, source, event, processed)
  values (p_attempt_id, v_order.id, p_source, 'attempt_' || p_status::text, true);
end;
$$;
revoke execute on function public.fail_payment_attempt(uuid, payment_attempt_status, text) from anon, authenticated;

-- Guest order lookup by high-entropy token, never by a guessable order number.
create or replace function public.get_order_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_order orders%rowtype;
  v_items jsonb;
begin
  select * into v_order from orders where lookup_token = p_token;
  if not found then
    return null;
  end if;

  select jsonb_agg(jsonb_build_object(
           'product_name', product_name, 'variant_label', variant_label,
           'quantity', quantity, 'unit_price_paisa', unit_price_paisa,
           'line_total_paisa', line_total_paisa, 'maker_name', maker_name))
    into v_items
    from order_items where order_items.order_id = v_order.id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'total_paisa', v_order.total_paisa,
    'subtotal_paisa', v_order.subtotal_paisa,
    'shipping_paisa', v_order.shipping_paisa,
    'discount_paisa', v_order.discount_paisa,
    'placed_at', v_order.placed_at,
    'tracking_ref', v_order.tracking_ref,
    'shipping_address', v_order.shipping_address,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.get_order_by_token(text) from anon, authenticated;

-- COD phone confirmation. Until this lands the transition trigger refuses to
-- let the order be packed.
create or replace function public.confirm_cod_order(p_order_id uuid, p_actor uuid default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update orders
     set cod_confirmed_at = now()
   where id = p_order_id and payment_method = 'cod' and cod_confirmed_at is null;

  insert into order_events (order_id, event, actor, detail)
  values (p_order_id, 'cod_confirmed', p_actor, '{}'::jsonb);
end;
$$;
revoke execute on function public.confirm_cod_order(uuid, uuid) from anon, authenticated;

-- A refused COD delivery is both an order outcome and a customer signal.
create or replace function public.record_cod_refusal(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_customer_id uuid;
  v_max int;
begin
  select customer_id into v_customer_id from orders where id = p_order_id;
  select (value->>'max_refusals_before_block')::int into v_max from settings where key = 'cod';

  update orders set status = 'refused' where id = p_order_id;

  update customers
     set cod_refusals = cod_refusals + 1,
         is_cod_blocked = (cod_refusals + 1) >= v_max
   where id = v_customer_id;

  insert into order_events (order_id, event, detail)
  values (p_order_id, 'cod_refused', '{}'::jsonb);
end;
$$;
revoke execute on function public.record_cod_refusal(uuid) from anon, authenticated;
