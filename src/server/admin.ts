import "server-only";
import { sql, withTx } from "@/lib/db";

/**
 * Every read and write the admin console makes. One module, so a page can never
 * invent its own join and a mutation can never bypass the database functions
 * that own the invariants.
 *
 * Transactions: only the three genuinely multi-statement writes open a `withTx`,
 * and none of them calls another transaction-opening function from inside it.
 * Everything else is a single statement or a single `select some_function(...)`,
 * which is already atomic.
 */

/* ============================================================ error mapping */

const CONSTRAINT_MESSAGES: Record<string, string> = {
  products_provenance_required_to_publish:
    "Cannot publish: maker, community, material and technique must all be set first.",
  products_price_positive: "Price must be greater than zero.",
  products_compare_at_sane: "Compare-at price must be higher than the price.",
  products_maker_share_sane: "Maker share must be between zero and the product price.",
  products_labour_hours_positive: "Labour hours must be greater than zero.",
  products_slug_format: "Slug must be lowercase words separated by hyphens.",
  products_slug_key: "That product slug is already taken.",
  product_variants_one_default_uq: "Only one variant can be the default for a product.",
  product_variants_option_uq: "Two variants of a product cannot share the same option value.",
  product_variants_sku_key: "That SKU is already in use.",
  product_variants_sku_present: "Every variant needs a SKU.",
  product_variants_price_positive: "Variant price override must be greater than zero.",
  makers_slug_key: "That maker slug is already taken.",
  makers_slug_format: "Slug must be lowercase words separated by hyphens.",
  communities_slug_key: "That community slug is already taken.",
  communities_slug_format: "Slug must be lowercase words separated by hyphens.",
  consent_records_active_scope_uq:
    "This maker already has an active consent record for that scope. Revoke it first.",
  consent_revoked_after_granted: "Revocation date cannot be before the date consent was granted.",
  content_pages_slug_key: "That journal slug is already taken.",
  content_pages_slug_format: "Slug must be lowercase words separated by hyphens.",
  stock_intake_qty_positive: "Intake quantity must be greater than zero.",
  stock_intake_cost_positive: "Unit cost must be greater than zero.",
  stock_levels_on_hand_non_negative: "That change would take stock below zero.",
  stock_levels_reserved_within_hand: "That change would leave more stock reserved than on hand.",
  refunds_amount_positive: "Refund amount must be greater than zero.",
  order_items_variant_id_fkey: "That variant appears on a past order, so it cannot be deleted.",
  stock_ledger_variant_id_fkey: "That variant has stock history, so it cannot be deleted.",
  stock_intake_variant_id_fkey: "That variant has intake history, so it cannot be deleted.",
  orders_gift_needs_recipient: "A gift order needs a recipient name and phone.",
  categories_slug_key: "That category web address is already taken.",
  categories_slug_format: "Web address must be lowercase words separated by hyphens.",
  collections_slug_key: "That collection web address is already taken.",
  collections_slug_format: "Web address must be lowercase words separated by hyphens.",
  products_category_id_fkey: "Products are still filed under that category, so it cannot be deleted.",
  media_assets_sha256_key: "That image is already in the library.",
  media_assets_type_allowed: "Only JPEG, PNG, WebP and AVIF images can be stored.",
  page_blocks_type_known: "That section type is not one this site knows how to render.",
  page_blocks_data_is_object: "That section's settings were not saved in a readable shape.",
  product_images_alt_present: "Every photograph needs a description for screen readers.",
  product_images_has_a_source: "A photograph needs either a library image or a file path.",
};

/** Rewrites database and validation errors into something a shop manager can act on. */
export function humanError(error: unknown): string {
  const err = error as { name?: string; message?: string; constraint_name?: string; issues?: { message: string }[] };

  // Already written for the operator by the module that threw it.
  if (err?.name === "OperatorError" && err.message) return err.message;

  // zod
  if (err?.issues?.length) return err.issues[0].message;

  const constraint = err?.constraint_name;
  if (constraint && CONSTRAINT_MESSAGES[constraint]) return CONSTRAINT_MESSAGES[constraint];

  const message = err?.message ?? "";

  const transition = message.match(/illegal order transition: (\w+) -> (\w+)/);
  if (transition) {
    return `Not allowed: an order cannot go from ${transition[1].replace(/_/g, " ")} to ${transition[2].replace(/_/g, " ")}.`;
  }
  if (message.includes("cannot be packed before phone confirmation")) {
    return "Confirm this COD order by phone before packing it.";
  }
  if (message.includes("insufficient stock")) {
    return message.replace("insufficient stock for", "Not enough stock for");
  }
  if (message.includes("is append-only")) {
    return "The stock ledger is append-only. Record an intake instead of editing history.";
  }
  if (message.includes("cannot be executed from a function")) {
    // refresh_impact_views() wraps REFRESH … CONCURRENTLY, which Postgres will
    // not run inside a function body. Owned by migration 010, not by admin.
    return "Impact refresh failed: refresh_impact_views() cannot run a CONCURRENT refresh from inside a function. That is a migration fix, not a data problem.";
  }
  if (message.includes("no draft to publish")) {
    return "There is no draft to publish. Save your edits first.";
  }
  if (message.includes("payment amount mismatch")) {
    return "The gateway reported a different amount than we recorded. Left untouched for manual review.";
  }
  if (constraint) return `Rejected by the database (${constraint}).`;

  // Never echo a raw Postgres error to the operator; log it for the developer.
  console.error("[admin]", error);
  return "Something went wrong and nothing was saved.";
}

/* =================================================================== types */

export type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_paisa: number;
  placed_at: string;
  phone: string;
  email: string | null;
  cod_confirmed_at: string | null;
  item_count: number;
};

export type OrderFilters = {
  status?: string;
  method?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
};

export const PAGE_SIZE = 50;

/* ============================================================== dashboard */

// Nepal runs UTC+05:45; "today" means today in Kathmandu, not in the database's UTC.
const DAY_START = sql`(date_trunc('day', now() at time zone 'Asia/Kathmandu')) at time zone 'Asia/Kathmandu'`;

/**
 * The three numbers the left rail shows as badges. Kept separate from
 * `getDashboard` because it runs on every console page and must stay one row
 * and three index-friendly counts.
 */
export async function getConsoleCounts() {
  const [row] = await sql<{ orders_open: number; cod_pending: number; to_reconcile: number }[]>`
    select
      (select count(*)::int from orders
        where status in ('paid','confirmed','packed')) as orders_open,
      (select count(*)::int from orders
        where payment_method = 'cod' and cod_confirmed_at is null
          and status not in ('cancelled','refused','refunded','expired','failed')) as cod_pending,
      (select count(*)::int from orders
        where status in ('payment_verifying','manual_review')) as to_reconcile
  `;
  return row ?? { orders_open: 0, cod_pending: 0, to_reconcile: 0 };
}

export async function getDashboard() {
  const [totals] = await sql<
    {
      orders_today: number;
      revenue_today_paisa: number;
      low_stock: number;
      cod_pending: number;
      attempts_open: number;
      orders_stuck: number;
    }[]
  >`
    select
      (select count(*)::int from orders where placed_at >= ${DAY_START}) as orders_today,
      (select coalesce(sum(total_paisa), 0)::int from orders
        where placed_at >= ${DAY_START}
          and status not in ('cancelled','failed','expired','refused')) as revenue_today_paisa,
      (select count(*)::int from stock_levels where available <= low_stock_threshold) as low_stock,
      (select count(*)::int from orders
        where payment_method = 'cod' and cod_confirmed_at is null
          and status not in ('cancelled','refused','refunded','expired','failed')) as cod_pending,
      (select count(*)::int from payment_attempts
        where status in ('initiated','pending','ambiguous')) as attempts_open,
      (select count(*)::int from orders
        where status in ('payment_verifying','manual_review')) as orders_stuck
  `;

  const recent = await sql<OrderRow[]>`
    select o.id, o.order_number, o.status::text, o.payment_method::text, o.payment_status::text,
           o.total_paisa, o.placed_at, o.phone, o.email, o.cod_confirmed_at,
           (select coalesce(sum(quantity), 0)::int from order_items where order_id = o.id) as item_count
      from orders o
     order by o.placed_at desc
     limit 12
  `;

  return { totals, recent };
}

/* ================================================================= orders */

export async function listOrders(filters: OrderFilters = {}) {
  const { status, method, q, from, to, page = 1 } = filters;
  const offset = (Math.max(page, 1) - 1) * PAGE_SIZE;
  const like = q ? `%${q.trim()}%` : null;

  return sql<OrderRow[]>`
    select o.id, o.order_number, o.status::text, o.payment_method::text, o.payment_status::text,
           o.total_paisa, o.placed_at, o.phone, o.email, o.cod_confirmed_at,
           (select coalesce(sum(quantity), 0)::int from order_items where order_id = o.id) as item_count
      from orders o
     where true
       ${status ? sql`and o.status = ${status}::order_status` : sql``}
       ${method ? sql`and o.payment_method = ${method}::payment_method` : sql``}
       ${like ? sql`and (o.order_number ilike ${like} or o.phone ilike ${like} or o.email ilike ${like})` : sql``}
       ${from ? sql`and o.placed_at >= ${from}::date` : sql``}
       ${to ? sql`and o.placed_at < (${to}::date + 1)` : sql``}
     order by o.placed_at desc
     limit ${PAGE_SIZE} offset ${offset}
  `;
}

export async function getOrderDetail(id: string) {
  const [order] = await sql<
    {
      id: string;
      order_number: string;
      lookup_token: string;
      status: string;
      payment_method: string;
      payment_status: string;
      subtotal_paisa: number;
      shipping_paisa: number;
      discount_paisa: number;
      total_paisa: number;
      shipping_address: Record<string, string | null>;
      is_gift: boolean;
      gift_note: string | null;
      recipient_name: string | null;
      recipient_phone: string | null;
      phone: string;
      email: string | null;
      carrier: string | null;
      tracking_ref: string | null;
      cod_confirmed_at: string | null;
      cancel_reason: string | null;
      placed_at: string;
      paid_at: string | null;
      delivered_at: string | null;
      customer_id: string | null;
      customer_name: string | null;
      cod_refusals: number | null;
      is_cod_blocked: boolean | null;
    }[]
  >`
    select o.id, o.order_number, o.lookup_token, o.status::text, o.payment_method::text,
           o.payment_status::text, o.subtotal_paisa, o.shipping_paisa, o.discount_paisa,
           o.total_paisa, o.shipping_address, o.is_gift, o.gift_note, o.recipient_name,
           o.recipient_phone, o.phone, o.email, o.carrier, o.tracking_ref, o.cod_confirmed_at,
           o.cancel_reason, o.placed_at, o.paid_at, o.delivered_at,
           c.id as customer_id, c.full_name as customer_name, c.cod_refusals, c.is_cod_blocked
      from orders o
      left join customers c on c.id = o.customer_id
     where o.id = ${id}::uuid
  `;
  if (!order) return null;

  const [items, events, attempts, refunds, nextStatuses] = await Promise.all([
    sql<
      {
        id: string;
        product_name: string;
        variant_label: string | null;
        sku: string;
        maker_name: string | null;
        community_name: string | null;
        district: string | null;
        unit_price_paisa: number;
        maker_share_paisa: number | null;
        quantity: number;
        line_total_paisa: number;
      }[]
    >`
      select oi.id, oi.product_name, oi.variant_label, oi.sku, oi.maker_name,
             com.name as community_name, com.district,
             oi.unit_price_paisa, oi.maker_share_paisa, oi.quantity, oi.line_total_paisa
        from order_items oi
        left join communities com on com.id = oi.community_id
       where oi.order_id = ${id}::uuid
       order by oi.created_at`,

    sql<
      {
        id: string;
        from_status: string | null;
        to_status: string | null;
        event: string;
        detail: Record<string, unknown> | null;
        created_at: string;
      }[]
    >`
      select id::text, from_status::text, to_status::text, event, detail, created_at
        from order_events where order_id = ${id}::uuid order by created_at, id`,

    sql<
      {
        id: string;
        status: string;
        amount_paisa: number;
        product_code: string;
        esewa_transaction_code: string | null;
        esewa_ref_id: string | null;
        last_status_raw: string | null;
        last_polled_at: string | null;
        poll_attempts: number;
        signature_valid: boolean | null;
        expires_at: string;
        created_at: string;
      }[]
    >`
      select id, status::text, amount_paisa, product_code, esewa_transaction_code, esewa_ref_id,
             last_status_raw, last_polled_at, poll_attempts, signature_valid, expires_at, created_at
        from payment_attempts where order_id = ${id}::uuid order by created_at desc`,

    sql<
      {
        id: string;
        amount_paisa: number;
        reason: string | null;
        status: string;
        external_reference: string | null;
        restock: boolean;
        created_at: string;
      }[]
    >`
      select id, amount_paisa, reason, status, external_reference, restock, created_at
        from refunds where order_id = ${id}::uuid order by created_at desc`,

    // The transition map lives in the database (migration 006). Asking it which
    // moves are legal beats keeping a second copy of the map in TypeScript.
    sql<{ status: string }[]>`
      select s::text as status
        from unnest(enum_range(null::order_status)) as s
       where order_transition_allowed(${order.status}::order_status, s)
       order by s`,
  ]);

  const attemptEvents = attempts.length
    ? await sql<
        {
          id: string;
          attempt_id: string;
          source: string;
          event: string;
          signature_valid: boolean | null;
          processed: boolean;
          created_at: string;
        }[]
      >`
        select id::text, attempt_id, source, event, signature_valid, processed, created_at
          from payment_events
         where attempt_id = any(${attempts.map((a) => a.id)}::uuid[])
         order by created_at`
    : [];

  return {
    order,
    items,
    events,
    refunds,
    nextStatuses: nextStatuses.map((r) => r.status),
    attempts: attempts.map((a) => ({
      ...a,
      events: attemptEvents.filter((e) => e.attempt_id === a.id),
    })),
  };
}

/* ============================================================== COD queue */

export async function listCodQueue() {
  return sql<
    {
      id: string;
      order_number: string;
      status: string;
      total_paisa: number;
      placed_at: string;
      phone: string;
      customer_name: string | null;
      cod_refusals: number | null;
      is_cod_blocked: boolean | null;
      district: string | null;
      item_count: number;
    }[]
  >`
    select o.id, o.order_number, o.status::text, o.total_paisa, o.placed_at, o.phone,
           c.full_name as customer_name, c.cod_refusals, c.is_cod_blocked,
           o.shipping_address->>'district' as district,
           (select coalesce(sum(quantity), 0)::int from order_items where order_id = o.id) as item_count
      from orders o
      left join customers c on c.id = o.customer_id
     where o.payment_method = 'cod'
       and o.cod_confirmed_at is null
       and o.status not in ('cancelled','refused','refunded','expired','failed')
     order by o.placed_at asc
  `;
}

/* ======================================================== reconciliation */

export async function getReconciliation() {
  const [attempts, orders] = await Promise.all([
    sql<
      {
        id: string;
        order_id: string;
        order_number: string;
        order_status: string;
        status: string;
        amount_paisa: number;
        order_total_paisa: number;
        last_polled_at: string | null;
        poll_attempts: number;
        expires_at: string;
        created_at: string;
      }[]
    >`
      select pa.id, pa.order_id, o.order_number, o.status::text as order_status,
             pa.status::text, pa.amount_paisa, o.total_paisa as order_total_paisa,
             pa.last_polled_at, pa.poll_attempts, pa.expires_at, pa.created_at
        from payment_attempts pa
        join orders o on o.id = pa.order_id
       where pa.status in ('initiated','pending','ambiguous')
       order by pa.created_at asc`,

    sql<
      {
        id: string;
        order_number: string;
        status: string;
        total_paisa: number;
        placed_at: string;
        phone: string;
        attempt_count: number;
      }[]
    >`
      select o.id, o.order_number, o.status::text, o.total_paisa, o.placed_at, o.phone,
             (select count(*)::int from payment_attempts where order_id = o.id) as attempt_count
        from orders o
       where o.status in ('payment_verifying','manual_review')
       order by o.placed_at asc`,
  ]);

  return { attempts, orders };
}

/* =============================================================== products */

export async function listAdminProducts(filters: { q?: string; status?: string } = {}) {
  const like = filters.q ? `%${filters.q.trim()}%` : null;
  return sql<
    {
      id: string;
      slug: string;
      name: string;
      status: string;
      price_paisa: number;
      category_name: string;
      maker_name: string | null;
      variant_count: number;
      available: number;
      missing: string[];
    }[]
  >`
    select p.id, p.slug, p.name, p.status::text, p.price_paisa,
           cat.name as category_name, mk.display_name as maker_name,
           (select count(*)::int from product_variants where product_id = p.id) as variant_count,
           (select coalesce(sum(sl.available), 0)::int
              from product_variants v join stock_levels sl on sl.variant_id = v.id
             where v.product_id = p.id) as available,
           array_remove(array[
             case when p.maker_id     is null then 'maker'     end,
             case when p.community_id is null then 'community' end,
             case when p.material_id  is null then 'material'  end,
             case when p.technique_id is null then 'technique' end
           ], null) as missing
      from products p
      join categories cat on cat.id = p.category_id
      left join makers mk on mk.id = p.maker_id
     where true
       ${filters.status ? sql`and p.status = ${filters.status}::publish_status` : sql``}
       ${like ? sql`and (p.name ilike ${like} or p.slug ilike ${like} or p.search_text ilike ${like})` : sql``}
     order by p.updated_at desc
     limit 200
  `;
}

export type ProductForEdit = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  care: string | null;
  category_id: string;
  maker_id: string | null;
  community_id: string | null;
  material_id: string | null;
  technique_id: string | null;
  labour_hours: string | null;
  price_paisa: number;
  compare_at_paisa: number | null;
  maker_share_paisa: number | null;
  variation_note: string | null;
  is_food: boolean;
  status: string;
};

export type VariantForEdit = {
  id: string;
  sku: string;
  option_name: string | null;
  option_value: string | null;
  price_paisa: number | null;
  is_default: boolean;
  available: number;
};

export async function getProductForEdit(id: string) {
  const [product] = await sql<ProductForEdit[]>`
    select id, slug, name, subtitle, description, care, category_id, maker_id, community_id,
           material_id, technique_id, labour_hours::text, price_paisa, compare_at_paisa,
           maker_share_paisa, variation_note, is_food, status::text
      from products where id = ${id}::uuid
  `;
  if (!product) return null;

  const variants = await sql<VariantForEdit[]>`
    select v.id, v.sku, v.option_name, v.option_value, v.price_paisa, v.is_default,
           coalesce(sl.available, 0) as available
      from product_variants v
      left join stock_levels sl on sl.variant_id = v.id
     where v.product_id = ${id}::uuid
     order by v.sort_order, v.created_at
  `;
  return { product, variants };
}

/** Every dropdown the product and intake forms need, in one round trip. */
export async function getFormOptions() {
  const [categories, makers, communities, materials, techniques] = await Promise.all([
    sql<{ id: string; name: string }[]>`select id, name from categories order by sort_order, name`,
    sql<{ id: string; name: string; community_id: string }[]>`
      select id, display_name as name, community_id from makers order by display_name`,
    sql<{ id: string; name: string }[]>`
      select id, name || ' · ' || district as name from communities order by name`,
    sql<{ id: string; name: string }[]>`select id, name from materials order by name`,
    sql<{ id: string; name: string }[]>`select id, name from craft_techniques order by name`,
  ]);
  return { categories, makers, communities, materials, techniques };
}

/* ================================================================== stock */

export async function listStock() {
  return sql<
    {
      variant_id: string;
      sku: string;
      option_value: string | null;
      product_id: string;
      product_name: string;
      product_status: string;
      maker_name: string | null;
      on_hand: number;
      reserved: number;
      available: number;
      low_stock_threshold: number;
    }[]
  >`
    select v.id as variant_id, v.sku, v.option_value, p.id as product_id, p.name as product_name,
           p.status::text as product_status, mk.display_name as maker_name,
           coalesce(sl.on_hand, 0) as on_hand,
           coalesce(sl.reserved, 0) as reserved,
           coalesce(sl.available, 0) as available,
           coalesce(sl.low_stock_threshold, 3) as low_stock_threshold
      from product_variants v
      join products p on p.id = v.product_id
      left join makers mk on mk.id = p.maker_id
      left join stock_levels sl on sl.variant_id = v.id
     order by (coalesce(sl.available, 0) <= coalesce(sl.low_stock_threshold, 3)) desc,
              p.name, v.sort_order
  `;
}

export async function listLedger(limit = 100) {
  return sql<
    {
      id: string;
      sku: string;
      product_name: string;
      delta: number;
      reason: string;
      order_number: string | null;
      batch_ref: string | null;
      unit_cost_paisa: number | null;
      note: string | null;
      created_at: string;
    }[]
  >`
    select l.id::text, v.sku, p.name as product_name, l.delta, l.reason::text,
           o.order_number, si.batch_ref, si.unit_cost_paisa, l.note, l.created_at
      from stock_ledger l
      join product_variants v on v.id = l.variant_id
      join products p on p.id = v.product_id
      left join orders o on o.id = l.order_id
      left join stock_intake si on si.id = l.intake_id
     order by l.created_at desc, l.id desc
     limit ${limit}
  `;
}

export async function listVariantsForIntake() {
  return sql<{ id: string; label: string }[]>`
    select v.id, p.name || ' · ' || v.sku ||
           coalesce(' (' || v.option_value || ')', '') as label
      from product_variants v
      join products p on p.id = v.product_id
     order by p.name, v.sort_order
  `;
}

/* ================================================= makers & communities */

export type ConsentRow = {
  id: string;
  maker_id: string;
  scope: string;
  granted_at: string;
  revoked_at: string | null;
  document_ref: string | null;
  notes: string | null;
};

export const CONSENT_SCOPES = ["name", "portrait", "quote", "video"] as const;

export async function listMakers() {
  const makers = await sql<
    {
      id: string;
      slug: string;
      display_name: string;
      craft: string | null;
      status: string;
      community_name: string;
      district: string;
      product_count: number;
      active_scopes: string[];
    }[]
  >`
    select m.id, m.slug, m.display_name, m.craft, m.status::text,
           c.name as community_name, c.district,
           (select count(*)::int from products where maker_id = m.id) as product_count,
           coalesce((
             select array_agg(cr.scope::text order by cr.scope)
               from consent_records cr
              where cr.maker_id = m.id
                and cr.granted_at <= current_date
                and (cr.revoked_at is null or cr.revoked_at > current_date)
           ), '{}') as active_scopes
      from makers m
      join communities c on c.id = m.community_id
     order by m.display_name
  `;
  return makers;
}

export async function getMaker(id: string) {
  const [maker] = await sql<
    {
      id: string;
      slug: string;
      display_name: string;
      community_id: string;
      craft: string | null;
      bio: string | null;
      quote: string | null;
      portrait_image: string | null;
      working_since: number | null;
      status: string;
    }[]
  >`
    select id, slug, display_name, community_id, craft, bio, quote, portrait_image,
           working_since, status::text
      from makers where id = ${id}::uuid
  `;
  if (!maker) return null;

  const consent = await sql<ConsentRow[]>`
    select id, maker_id, scope::text, granted_at::text, revoked_at::text, document_ref, notes
      from consent_records where maker_id = ${id}::uuid
     order by scope, granted_at desc
  `;
  return { maker, consent };
}

export async function listCommunities() {
  return sql<
    {
      id: string;
      slug: string;
      name: string;
      district: string;
      province: string | null;
      summary: string | null;
      story: string | null;
      maker_count: number | null;
      working_since: number | null;
      status: string;
      linked_makers: number;
    }[]
  >`
    select c.id, c.slug, c.name, c.district, c.province, c.summary, c.story,
           c.maker_count, c.working_since, c.status::text,
           (select count(*)::int from makers where community_id = c.id) as linked_makers
      from communities c
     order by c.name
  `;
}

/* ================================================================= impact */

export async function getImpact() {
  const [byMaker, byCommunity, summaryRow] = await Promise.all([
    sql<
      {
        maker_id: string;
        maker_name: string;
        maker_slug: string;
        community_name: string;
        district: string;
        units_sold: number;
        revenue_paisa: number;
        units_bought: number;
        paid_to_maker_paisa: number;
        // A `date` column: postgres.js hands this back as a JS Date, not a
        // string. Typing it as a string is how it reached JSX raw and crashed
        // the page with "Objects are not valid as a React child".
        working_with_us_since: Date | string | null;
      }[]
    >`select * from impact_by_maker order by paid_to_maker_paisa desc, maker_name`,
    sql<
      {
        community_id: string;
        community_name: string;
        district: string;
        maker_count: number;
        units_sold: number;
        revenue_paisa: number;
        paid_to_maker_paisa: number;
      }[]
    >`select * from impact_by_community order by paid_to_maker_paisa desc, community_name`,
    sql<{ summary: Record<string, number | string> }[]>`select impact_summary() as summary`,
  ]);

  return { byMaker, byCommunity, summary: summaryRow[0].summary };
}

/* ================================================================ journal */

export async function listJournalPages() {
  return sql<
    {
      id: string;
      slug: string;
      title: string;
      draft_version_id: string | null;
      published_version_id: string | null;
      updated_at: string;
      published_at: string | null;
      has_unpublished_draft: boolean;
    }[]
  >`
    select cp.id, cp.slug, cp.title, cp.draft_version_id, cp.published_version_id, cp.updated_at,
           pv.published_at,
           (cp.draft_version_id is not null
             and cp.draft_version_id is distinct from cp.published_version_id) as has_unpublished_draft
      from content_pages cp
      left join content_versions pv on pv.id = cp.published_version_id
     where cp.kind = 'journal'
     order by cp.updated_at desc
  `;
}

export async function getJournalPage(id: string) {
  const [page] = await sql<
    {
      id: string;
      slug: string;
      title: string;
      draft_version_id: string | null;
      published_version_id: string | null;
    }[]
  >`select id, slug, title, draft_version_id, published_version_id
      from content_pages where id = ${id}::uuid and kind = 'journal'`;
  if (!page) return null;

  const versions = await sql<
    {
      id: string;
      excerpt: string | null;
      hero_image: string | null;
      author: string | null;
      product_ids: string[];
      blocks: { type: string; text: string }[];
      published_at: string | null;
      created_at: string;
    }[]
  >`select id, excerpt, hero_image, author, product_ids, blocks, published_at, created_at
      from content_versions where page_id = ${id}::uuid order by created_at desc limit 20`;

  const current =
    versions.find((v) => v.id === page.draft_version_id) ??
    versions.find((v) => v.id === page.published_version_id) ??
    null;

  const products = await sql<{ id: string; name: string; status: string }[]>`
    select id, name, status::text from products where status = 'published' order by name`;

  return { page, versions, current, products };
}

/* ================================================================ exports */

/** The annual Impact Report shape from BUSINESS-MODEL.md §8, as one CSV. */
export async function impactCsv(): Promise<string> {
  const { byMaker, byCommunity, summary } = await getImpact();
  const rupees = (paisa: number) => (paisa / 100).toFixed(2);
  const cell = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const row = (values: unknown[]) => values.map(cell).join(",");

  return [
    row(["MUD Naturals — Impact Report"]),
    row(["generated_at", String(summary.generated_at)]),
    "",
    row(["metric", "value"]),
    row(["revenue_npr", rupees(Number(summary.revenue_paisa))]),
    row(["paid_to_makers_npr", rupees(Number(summary.paid_to_makers_paisa))]),
    row(["units_sold", summary.units_sold]),
    row(["maker_count", summary.maker_count]),
    row(["community_count", summary.community_count]),
    row(["district_count", summary.district_count]),
    "",
    row(["maker", "community", "district", "units_sold", "revenue_npr", "units_bought", "paid_to_maker_npr", "working_with_us_since"]),
    ...byMaker.map((m) =>
      row([
        m.maker_name,
        m.community_name,
        m.district,
        m.units_sold,
        rupees(m.revenue_paisa),
        m.units_bought,
        rupees(m.paid_to_maker_paisa),
        m.working_with_us_since ?? "",
      ]),
    ),
    "",
    row(["community", "district", "makers", "units_sold", "revenue_npr", "paid_to_makers_npr"]),
    ...byCommunity.map((c) =>
      row([
        c.community_name,
        c.district,
        c.maker_count,
        c.units_sold,
        rupees(c.revenue_paisa),
        rupees(c.paid_to_maker_paisa),
      ]),
    ),
  ].join("\n");
}

/* ================================================================ WRITES */

/* ---------------------------------------------------------------- orders */

/**
 * The state machine is a database trigger (migration 006). This is a plain
 * update — the trigger arbitrates, writes the `order_events` row and refuses
 * anything illegal, including packing an unconfirmed COD order.
 */
export async function advanceOrderStatus(
  id: string,
  to: string,
  ship?: { carrier: string; trackingRef: string },
) {
  if (!ship) {
    await sql`update orders set status = ${to}::order_status where id = ${id}::uuid`;
    return;
  }
  await withTx(async (tx) => {
    await tx`
      update orders
         set status = ${to}::order_status,
             carrier = ${ship.carrier},
             tracking_ref = ${ship.trackingRef}
       where id = ${id}::uuid`;
    await tx`
      insert into shipments (order_id, carrier, tracking_ref, shipped_at)
      values (${id}::uuid, ${ship.carrier}, ${ship.trackingRef}, now())`;
  });
}

export async function cancelOrder(id: string, reason: string) {
  await withTx(async (tx) => {
    await tx`
      update orders set status = 'cancelled', cancel_reason = ${reason} where id = ${id}::uuid`;
    // The trigger logs the status change; this carries the reason into the timeline.
    await tx`
      insert into order_events (order_id, event, detail)
      values (${id}::uuid, 'cancelled_by_staff', jsonb_build_object('reason', ${reason}::text))`;
  });
}

export async function recordRefund(input: {
  orderId: string;
  amountPaisa: number;
  reason: string | null;
  externalReference: string | null;
  restock: boolean;
  status: string;
}) {
  await withTx(async (tx) => {
    await tx`
      insert into refunds (order_id, amount_paisa, reason, external_reference, restock, status)
      values (${input.orderId}::uuid, ${input.amountPaisa}, ${input.reason},
              ${input.externalReference}, ${input.restock}, ${input.status})`;
    await tx`
      insert into order_events (order_id, event, detail)
      values (${input.orderId}::uuid, 'refund_recorded',
              jsonb_build_object('amount_paisa', ${input.amountPaisa}::int,
                                 'reference', ${input.externalReference}::text))`;
  });
}

/* ------------------------------------------------------------------- COD */

export async function confirmCod(orderId: string) {
  await sql`select confirm_cod_order(${orderId}::uuid, null::uuid)`;
}

export async function recordCodRefusal(orderId: string) {
  await sql`select record_cod_refusal(${orderId}::uuid)`;
}

/* -------------------------------------------------------------- products */

export type VariantInput = {
  /** Form row identity: the variant id, or `new-<row>` for a blank row. */
  key: string;
  id: string | null;
  sku: string;
  optionName: string | null;
  optionValue: string | null;
  pricePaisa: number | null;
  remove: boolean;
};

export type ProductInput = {
  id: string | null;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  care: string | null;
  categoryId: string;
  makerId: string | null;
  communityId: string | null;
  materialId: string | null;
  techniqueId: string | null;
  labourHours: number | null;
  pricePaisa: number;
  compareAtPaisa: number | null;
  makerSharePaisa: number | null;
  variationNote: string | null;
  isFood: boolean;
  status: string;
  variants: VariantInput[];
  defaultVariantKey: string | null;
};

/** Product plus its variants in one transaction — the only place they can diverge. */
export async function saveProduct(input: ProductInput): Promise<string> {
  return withTx(async (tx) => {
    const [row] = input.id
      ? await tx<{ id: string }[]>`
          update products set
            slug = ${input.slug}, name = ${input.name}, subtitle = ${input.subtitle},
            description = ${input.description}, care = ${input.care},
            category_id = ${input.categoryId}::uuid,
            maker_id = ${input.makerId}::uuid, community_id = ${input.communityId}::uuid,
            material_id = ${input.materialId}::uuid, technique_id = ${input.techniqueId}::uuid,
            labour_hours = ${input.labourHours}, price_paisa = ${input.pricePaisa},
            compare_at_paisa = ${input.compareAtPaisa},
            maker_share_paisa = ${input.makerSharePaisa},
            variation_note = ${input.variationNote}, is_food = ${input.isFood},
            status = ${input.status}::publish_status,
            published_at = case when ${input.status} = 'published' and published_at is null
                                then now() else published_at end
          where id = ${input.id}::uuid
          returning id`
      : await tx<{ id: string }[]>`
          insert into products (
            slug, name, subtitle, description, care, category_id, maker_id, community_id,
            material_id, technique_id, labour_hours, price_paisa, compare_at_paisa,
            maker_share_paisa, variation_note, is_food, status, published_at
          ) values (
            ${input.slug}, ${input.name}, ${input.subtitle}, ${input.description}, ${input.care},
            ${input.categoryId}::uuid, ${input.makerId}::uuid, ${input.communityId}::uuid,
            ${input.materialId}::uuid, ${input.techniqueId}::uuid, ${input.labourHours},
            ${input.pricePaisa}, ${input.compareAtPaisa}, ${input.makerSharePaisa},
            ${input.variationNote}, ${input.isFood}, ${input.status}::publish_status,
            case when ${input.status} = 'published' then now() else null end
          ) returning id`;

    if (!row) throw new Error("product not found");
    const productId = row.id;

    const doomed = input.variants.filter((v) => v.remove && v.id).map((v) => v.id as string);
    if (doomed.length) {
      await tx`delete from product_variants where id = any(${doomed}::uuid[]) and product_id = ${productId}::uuid`;
    }

    // Clear every default first: the partial unique index checks per statement,
    // so setting the new default before clearing the old one would collide.
    await tx`update product_variants set is_default = false where product_id = ${productId}::uuid`;

    const live = input.variants.filter((v) => !v.remove && v.sku.trim() !== "");
    const saved: { key: string; id: string }[] = [];

    for (const [index, variant] of live.entries()) {
      const [row2] = variant.id
        ? await tx<{ id: string }[]>`
            update product_variants set
              sku = ${variant.sku}, option_name = ${variant.optionName},
              option_value = ${variant.optionValue}, price_paisa = ${variant.pricePaisa},
              sort_order = ${index}
            where id = ${variant.id}::uuid and product_id = ${productId}::uuid
            returning id`
        : await tx<{ id: string }[]>`
            insert into product_variants (product_id, sku, option_name, option_value, price_paisa, sort_order)
            values (${productId}::uuid, ${variant.sku}, ${variant.optionName},
                    ${variant.optionValue}, ${variant.pricePaisa}, ${index})
            returning id`;

      if (row2) saved.push({ key: variant.key, id: row2.id });
    }

    // Exactly one default, computed rather than trusted: if the radio pointed at
    // a row that was deleted or left blank, the first surviving variant takes it.
    const chosen = saved.find((v) => v.key === input.defaultVariantKey) ?? saved[0];
    if (chosen) {
      await tx`update product_variants set is_default = true where id = ${chosen.id}::uuid`;
    }

    return productId;
  });
}

/* ----------------------------------------------------------------- stock */

/** Stock only ever moves through intake — `stock_ledger` rejects UPDATE and DELETE. */
export async function recordIntake(input: {
  variantId: string;
  makerId: string;
  communityId: string;
  quantity: number;
  unitCostPaisa: number;
  batchRef: string | null;
}) {
  await sql`
    select record_intake(
      ${input.variantId}::uuid, ${input.makerId}::uuid, ${input.communityId}::uuid,
      ${input.quantity}::int, ${input.unitCostPaisa}::int, ${input.batchRef}::text
    )`;
}

/* ------------------------------------------------- makers & communities */

export type MakerInput = {
  id: string | null;
  slug: string;
  displayName: string;
  communityId: string;
  craft: string | null;
  bio: string | null;
  quote: string | null;
  portraitImage: string | null;
  workingSince: number | null;
  status: string;
};

export async function saveMaker(input: MakerInput): Promise<string> {
  const [row] = input.id
    ? await sql<{ id: string }[]>`
        update makers set
          slug = ${input.slug}, display_name = ${input.displayName},
          community_id = ${input.communityId}::uuid, craft = ${input.craft}, bio = ${input.bio},
          quote = ${input.quote}, portrait_image = ${input.portraitImage},
          working_since = ${input.workingSince}, status = ${input.status}::publish_status
        where id = ${input.id}::uuid returning id`
    : await sql<{ id: string }[]>`
        insert into makers (slug, display_name, community_id, craft, bio, quote,
                            portrait_image, working_since, status)
        values (${input.slug}, ${input.displayName}, ${input.communityId}::uuid, ${input.craft},
                ${input.bio}, ${input.quote}, ${input.portraitImage}, ${input.workingSince},
                ${input.status}::publish_status)
        returning id`;
  if (!row) throw new Error("maker not found");
  return row.id;
}

export async function grantConsent(input: {
  makerId: string;
  scope: string;
  grantedAt: string;
  documentRef: string | null;
  notes: string | null;
}) {
  await sql`
    insert into consent_records (maker_id, scope, granted_at, document_ref, notes)
    values (${input.makerId}::uuid, ${input.scope}::consent_scope, ${input.grantedAt}::date,
            ${input.documentRef}, ${input.notes})`;
}

/** Revoking never deletes the row: the paperwork trail is the point of the table. */
export async function revokeConsent(consentId: string, revokedAt: string) {
  await sql`
    update consent_records set revoked_at = ${revokedAt}::date
     where id = ${consentId}::uuid and revoked_at is null`;
}

export type CommunityInput = {
  id: string | null;
  slug: string;
  name: string;
  district: string;
  province: string | null;
  summary: string | null;
  story: string | null;
  makerCount: number | null;
  workingSince: number | null;
  status: string;
};

export async function saveCommunity(input: CommunityInput): Promise<string> {
  const [row] = input.id
    ? await sql<{ id: string }[]>`
        update communities set
          slug = ${input.slug}, name = ${input.name}, district = ${input.district},
          province = ${input.province}, summary = ${input.summary}, story = ${input.story},
          maker_count = ${input.makerCount}, working_since = ${input.workingSince},
          status = ${input.status}::publish_status
        where id = ${input.id}::uuid returning id`
    : await sql<{ id: string }[]>`
        insert into communities (slug, name, district, province, summary, story,
                                 maker_count, working_since, status)
        values (${input.slug}, ${input.name}, ${input.district}, ${input.province},
                ${input.summary}, ${input.story}, ${input.makerCount}, ${input.workingSince},
                ${input.status}::publish_status)
        returning id`;
  if (!row) throw new Error("community not found");
  return row.id;
}

/* ---------------------------------------------------------------- impact */

export async function refreshImpact() {
  await sql`select refresh_impact_views()`;
}

/* --------------------------------------------------------------- journal */

export async function createJournalPage(slug: string, title: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into content_pages (slug, kind, title) values (${slug}, 'journal', ${title})
    returning id`;
  return row.id;
}

/**
 * Draft/publish pointer swap: an edit always writes a *new* version row and
 * moves `draft_version_id`. A published version is never mutated in place.
 */
export async function saveJournalDraft(input: {
  pageId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  heroImage: string | null;
  author: string | null;
  body: string;
  productIds: string[];
}) {
  const blocks = input.body
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", text }));

  await withTx(async (tx) => {
    const [version] = await tx<{ id: string }[]>`
      insert into content_versions (page_id, blocks, excerpt, hero_image, author, product_ids)
      values (${input.pageId}::uuid, ${JSON.stringify(blocks)}::jsonb, ${input.excerpt},
              ${input.heroImage}, ${input.author}, ${input.productIds}::uuid[])
      returning id`;
    await tx`
      update content_pages
         set draft_version_id = ${version.id}::uuid, slug = ${input.slug}, title = ${input.title}
       where id = ${input.pageId}::uuid`;
  });
}

export async function publishJournal(pageId: string) {
  await withTx(async (tx) => {
    const [page] = await tx<{ draft_version_id: string | null }[]>`
      select draft_version_id from content_pages where id = ${pageId}::uuid for update`;
    if (!page?.draft_version_id) throw new Error("there is no draft to publish");

    await tx`
      update content_versions set published_at = coalesce(published_at, now())
       where id = ${page.draft_version_id}::uuid`;
    await tx`
      update content_pages set published_version_id = ${page.draft_version_id}::uuid
       where id = ${pageId}::uuid`;
  });
}

export async function unpublishJournal(pageId: string) {
  await sql`update content_pages set published_version_id = null where id = ${pageId}::uuid`;
}
