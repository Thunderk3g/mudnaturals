# Engineering-Quality Audit — `Desktop/ecommerce` (reference for MUD Naturals)

Scope: correctness, transactions, races, schema integrity, frontend discipline. Prior-analysis topics (feature inventory, multi-tenancy, Data API incident, provider choice) deliberately excluded — see `07-crm-admin-audit.md`.

---

## 1. Findings by severity

### CRITICAL

**C1 — `orders.customer_id` holds the wrong entity; every logged-in checkout fails at order creation.**
`carts.customer_id` is written with a `users.id` (`src/app/api/v1/cart/_lib.ts:91-92`, `:196`) and has **no FK** (`src/db/schema/carts.ts:42-43`). `orders.customer_id` has a FK to **`customers.id`** (`src/db/migrations/0016_order_lifecycle.sql:171`; `src/db/schema/orders.ts:82-86`). `createOrderFromCart` copies straight across: `customerId: cart.customerId ?? null` (`src/modules/checkout/orders.ts:183`).
→ **Consequence:** the INSERT violates `orders_customer_id_fk` for every authenticated order. Payment is already captured; the webhook throws; no order exists. Guest checkout works, so this hides in demo data. The same confusion breaks reads even if the insert succeeded: `listCustomerOrders(storeId, sctx.userSession.userId)` (`src/app/api/v1/customer/orders/route.ts:36`) and `order.customerId !== sctx.userSession.userId` (`src/app/api/v1/orders/[number]/route.ts:57`).
→ **MUD:** one identity column, one meaning, FK-enforced everywhere. Single store means you can likely drop `customers` entirely and hang orders off `auth.users` + an `email` snapshot.

**C2 — A failed webhook can never be retried; the dedupe key permanently swallows it.**
`src/app/api/v1/webhooks/payments/[provider]/route.ts:163-189`: the event is inserted with `onConflictDoNothing`, and a conflict returns `200 OK (duplicate)`. On apply failure the route writes `error` and returns 500 (`:208-234`) — but the event row is already committed. The provider's retry hits the conflict branch and gets 200.
→ **Consequence:** one transient failure (C1, a deadlock, an `AmountMismatchError`) means the customer is charged and the order is lost forever. No retry path exists.
→ **MUD:** dedupe on `(provider, event_id)` **and** `processed = true`. On conflict, re-dispatch if `processed = false`; only short-circuit for genuinely-applied events.

**C3 — Inventory commit escapes the order transaction.**
`createOrderFromCart` receives an open `tx` but calls `commitReservations(storeId, …)` (`src/modules/checkout/orders.ts:255`), which opens its **own** `withTenant` (`src/modules/inventory/reservations.ts:176`). Steps 11-13 run after it.
→ **Consequence:** if `recordRedemption` or the cart delete fails, the outer tx rolls back — order gone, but `on_hand` is already permanently decremented and the reservations are `committed`. On retry, `commit()` throws `ReservationNotActiveError` (`:187`) forever. Unrecoverable stuck state with real stock loss.

**C4 — `withTenant` nesting is not a savepoint; it consumes a second pool connection.**
`withTenant` always calls `appDb.transaction(...)` on the top-level db (`src/modules/tenant/with-tenant.ts:12`). Drizzle only nests as a SAVEPOINT via `tx.transaction(...)`. Pool is `max: 10` (`src/db/client.ts:44`); migrator is `max: 1` (`:43`).
The webhook path holds: migrator tx → `withTenant` (#1) → `priceCart`'s own `withTenant` (#2, `src/modules/checkout/orders.ts:145`) → `commitReservations` (#3). **3 app connections per in-flight webhook**, each waiting on the next. At ~4 concurrent webhooks the pool deadlocks — every connection is held by a transaction waiting for a connection that will never be freed.
`src/modules/inventory/purchase-orders.ts:334-336` states this assumption explicitly and is **wrong**: *"Postgres + drizzle treat a nested BEGIN inside an active transaction as a SAVEPOINT — so calling it from within this withTenant block is safe."* It is not; `receivePurchaseOrder` is not atomic.
→ **MUD:** every module function takes `tx` as its first argument; exactly one `withTx` wrapper at the route boundary. Never call a `withTenant`-owning function from inside a transaction.

**C5 — `withIdempotency` does not prevent double execution.**
`src/lib/idempotency.ts:9-19`: `GET` → miss → run `fn()` → `SET … NX`. Two concurrent requests with the same key both miss and both execute. The `NX` only protects the cached *result*.
→ **Consequence:** the checkout guard is decorative. Two provider intents, two reservation sets, double stock hold.
→ **MUD:** `SET key "in-flight" NX EX 60` **first**; if it fails, poll or 409.

### HIGH

**H1 — Checkout start is TOCTOU, and the client defeats what protection exists.** `startCheckout` reads for an existing `attached` intent (`src/modules/checkout/checkout.ts:115-137`), then reserves and inserts — three separate transactions, no lock, no unique constraint on `(cart_id, provider) WHERE status='attached'`. Meanwhile the client mints a **fresh** `idempotency-key` on every click (`src/app/(storefront)/checkout/page.tsx:104`, `:120`), so the Redis guard never matches. Double-click ⇒ two intents, two reservation sets.

**H2 — Tax mode is resolved per-row but rolled up per-config.** Line tax uses the resolved row's mode (`src/modules/cart/pricing.ts:161`), but the total uses the global `configuredMode` (`:218-221`). A row-level `exclusive` rate under a global `inclusive` config computes tax into the line yet never adds it to the total. Silent undercharge on every affected order.

**H3 — Re-pricing at webhook time can strand a captured payment.** `createOrderFromCart` re-prices and throws `AmountMismatchError` beyond ±1 cent (`src/modules/checkout/orders.ts:145-153`). Any price edit, promo expiry, or shipping-rate change between "Pay now" and webhook delivery trips it — money captured, no order, and per C2 no retry. → **MUD:** snapshot the priced lines onto the intent at start; verify against the snapshot, never re-derive.

**H4 — `orders.email` silently defaults to empty string.** `email: input.email ?? ''` (`src/modules/checkout/orders.ts:184`) and the webhook never passes one (`src/modules/payments/webhooks.ts:174-178`). Guest order lookup matches on email (`src/app/api/v1/orders/[number]/route.ts:66`) and can therefore never succeed. No `CHECK (email <> '')`.

**H5 — `receivePurchaseOrder` lost-update race.** Reads `qty_received` without `FOR UPDATE`, validates outstanding, then `SET qty_received = qty_received + qty` (`src/modules/inventory/purchase-orders.ts:355-400`). Concurrent receives both pass validation and over-receive.

**H6 — No error boundaries, no not-found, no Suspense.** Zero `error.tsx`, zero `global-error.tsx`, zero `not-found.tsx` across all 152 components; `Suspense` appears **0** times; only 3 `loading.tsx` (storefront PDP/PLP/search — admin has none). Any server-component throw yields Next's raw error screen.

**H7 — Checkout submit has no `catch`.** `try { … } finally { setSubmitting(false) }` (`src/app/(storefront)/checkout/page.tsx:84-136`). A network failure produces an unhandled rejection, no toast, no boundary — the user sees the button un-disable and nothing else.

**H8 — `order_items` has no index whatsoever.** No `CREATE INDEX` for it in any migration; the schema declares none (`src/db/schema/orders.ts:97-111`). Every order-detail read and every order-list hydration (`src/modules/checkout/orders.ts:369-372`, an `IN (…)` over a page of ids) is a sequential scan. Same for `payments` — no index on `order_id` or `intent_id`, both of which are queried on the hot webhook path (`src/modules/checkout/orders.ts:110-114`).

**H9 — One CHECK constraint in the entire database.** Only `cart_items_qty_positive` (`src/db/migrations/0013_cart_indexes.sql:24`). Nothing enforces `total_cents >= 0`, `qty > 0` on `order_items`, `on_hand >= 0`, `reserved >= 0`, `reserved <= on_hand`, or `percent BETWEEN 0 AND 100` on promotions. A bug anywhere writes negative money or negative stock and the DB accepts it.

**H10 — `provider_ref` uniqueness is assumed, not enforced.** `intents_provider_ref_idx` is a plain index (`0011_cart_checkout.sql:189`), yet `loadIntentByRef` takes `.limit(2)` and picks the first match (`src/modules/payments/webhooks.ts:111-120`) — the code comment admits it's "unique in practice."

### MEDIUM

- **M1 — Admin table rows are keyboard-dead.** `<tr onClick={router.push}>` with no `tabIndex`, `role`, or `onKeyDown` (`src/app/admin/(protected)/orders/_components/OrdersTable.tsx:33-42`), repeated across all 18 `dtable` instances.
- **M2 — No landmarks, no skip link.** `AppShell.tsx` renders `<main>` and `<footer>` but the header and nav are `div`s (`src/components/storefront/AppShell.tsx:60-133`).
- **M3 — Sequential, guessable order numbers** (`SLUG-00000001`, migration 0014) and the guest lookup route has **no** rate limit — unlike checkout (`src/app/api/v1/orders/[number]/route.ts` has no `withRateLimit`). Enables order-volume inference and targeted email guessing.
- **M4 — `confirmCheckoutAdvisory` performs no ownership check** (`src/modules/checkout/checkout.ts:221-254`); any session with an intent id gets the order number.
- **M5 — Soft deletion exists on exactly one table.** Only `products.deleted_at` (`src/db/schema/catalog.ts:85`). Variants, categories, locations, suppliers, addresses, webhooks, CMS pages are hard-deleted (`src/modules/catalog/variants.ts:149`, `inventory/locations.ts:164`, …) — and `order_items.variant_id` is `ON DELETE restrict`, so deleting an ever-ordered variant raises a raw FK error to the admin.
- **M6 — Only `status` is state-machine-guarded.** `payment_status` and `fulfillment_status` are free enums with no trigger, so `status='cancelled', payment_status='paid'` is representable.
- **M7 — N+1 tax resolution:** `resolveTaxRate` runs once per cart line inside the loop (`src/modules/cart/pricing.ts:158`).
- **M8 — `<img>` 13× vs `next/image` 3×**, including the checkout summary (`checkout/page.tsx:373`). `@tanstack/react-table` is installed but every table is hand-rolled — dead dependency. `react-hook-form` + `@hookform/resolvers` are installed but used in only 5 of ~40 forms; the checkout form is raw `useState`.
- **M9 — Admin layout issues 5 sequential round-trips per page render** (`src/app/admin/(protected)/layout.tsx:36-58`) with no caching, two of them via BYPASSRLS `migratorDb`.

---

## 2. Race & transaction analysis

**Correct by design:** `reserve()` takes `SELECT … FOR UPDATE` on the `stock_levels` row before the availability check (`src/modules/inventory/reservations.ts:63-83`) — concurrent reservers genuinely serialize. `transitionOrderTx` is unlocked but saved by the DB trigger: under READ COMMITTED the second `UPDATE` re-reads the winner's row, so `OLD.status` is current and `orders_status_transition_check` raises. That is the belt-and-braces claim actually paying off.

**Broken:** every multi-table write that crosses a module boundary. `createOrderFromCart` is documented as "atomic inside one transaction" (`src/modules/checkout/orders.ts:5-9`) but calls out to two functions that open their own (steps 2 and 10). `receivePurchaseOrder` is documented as atomic and isn't. The root cause is uniform: **`withTenant` is both the tenancy mechanism and the transaction boundary**, so any function that needs RLS also opens a transaction, and composition silently produces independent transactions on separate pooled connections.

→ **MUD's rule:** `withTx(fn)` at the route/action boundary only. Every module function signature is `(tx, …)`. Since MUD is single-store, drop the tenant parameter entirely — that removes the incentive that created this pattern.

---

## 3. Schema quality

**Good:** append-only `stock_movements` ledger with `apply_movement_to_levels()` materializing `stock_levels` (`0010_inventory_triggers.sql`), a generated `available = on_hand - reserved` column, `inv_store_id_check()` cross-table consistency trigger, partial unique indexes separating guest/customer carts (`0013_cart_indexes.sql:12-18`), reservation TTL with a partial index `WHERE status='active'`, JSONB address snapshots on orders.

**Gaps beyond H8/H9:** no index on `stock_levels.store_id`, `stock_reservations.order_id`/`store_id`, `order_items.variant_id`. `stock_reservations.order_id` never got its FK despite the `// FK in SP-5` note (`src/db/schema/inventory.ts:147`). Ledger correctness depends entirely on `commit()` emitting **two** movements (`release` + `outbound`, `reservations.ts:190-214`) — with no constraint tying them, a partial write leaves `reserved` permanently inflated. The TTL sweeper is not visible in the schema; expiry relies on an external job, and there's no `expired` transition trigger.

---

## 4. Frontend quality

Route grouping is clean (`(storefront)` / `admin/(protected)` with login outside the guard — a good pattern). But 84 of 152 components are `'use client'`, and the entire checkout is client-side `fetch` against the HTTP API with no server action, no progressive enhancement, and no JS-off path. Validation is HTML `required` only — no zod, no field-level feedback, no `aria-live`, no focus management when the confirmation view replaces the form. `country` is a free-text input (`checkout/page.tsx:304-310`). Empty states are present and decent (`OrdersTable.tsx:24-30`, `checkout/page.tsx:147-162`); loading and error states are almost entirely absent. Note the checkout **never captures payment** — it stops at "Payment intent created" (`checkout/page.tsx:164-209`), so the client half of the flow is unbuilt.

---

## 5. Top 10 to copy verbatim

1. **DB-enforced order state machine** — `src/db/migrations/0018_state_machine.sql`. Same-status no-op, explicit transition map, trigger as the real authority.
2. **`transitionOrder` / `transitionOrderTx` split** — `src/modules/orders/lifecycle.ts:101-119`. The tx-accepting variant is exactly the pattern the rest of the codebase should have used.
3. **Atomic status + `order_events` + `outbox_events` in one hop** — `lifecycle.ts:165-197`. Correct outbox usage.
4. **Append-only movement ledger + trigger-materialized levels** — `0010_inventory_triggers.sql`. Auditable stock by construction.
5. **`inv_store_id_check()` consistency trigger** — same file. Cheap invariant enforcement at the DB layer; adapt as a product/variant consistency check for MUD.
6. **Raw-body-first webhook verification** — `src/app/api/v1/webhooks/payments/[provider]/route.ts:75-92`. HMAC over `req.text()` before any parse; parse only after trust.
7. **Sliding-window rate limiter** — `src/lib/rate-limit.ts:31-50`. Sorted-set MULTI with the double-burst reasoning documented.
8. **RFC 7807 `problem()` + per-domain error mappers** — `src/lib/errors.ts`, `mapCartError` (`src/app/api/v1/cart/_lib.ts:224+`). Typed domain errors, mapped once at the edge.
9. **Server-authoritative pricing** — `src/modules/cart/pricing.ts:133-237`. Re-prices from `product_variants.price_cents`, never the cart snapshot; client totals are display-only.
10. **Order snapshotting** — `src/modules/checkout/orders.ts:159-231` + JSONB addresses (`src/db/schema/orders.ts:66-67`). Product edits never mutate history.

Runner-up worth stealing: the cursor pagination helper (`src/lib/cursor.ts` + `listCustomerOrders:333-390`) and the partial unique indexes in `0013_cart_indexes.sql`.

---

## 6. Implications for the MUD rebuild

1. **Kill `withTenant` outright.** Single store means no RLS tenancy parameter, which removes the exact coupling that produced C3, C4, H5, and the false savepoint comment. One `withTx` at the boundary; modules take `tx`.
2. **Build the checkout as one transaction, and snapshot the price.** eSewa's callback should verify against an amount snapshotted on the intent — never re-derive (H3). Order creation, payment row, stock commit, and cart delete must be one atomic unit.
3. **Make the payment callback retryable.** Dedupe on `(event_id, processed=true)`, not `event_id` alone (C2). Assume you will need to reprocess.
4. **Push invariants into Postgres.** Copy the transition trigger (#1) and add what's missing: CHECKs on money and stock, `reserved <= on_hand`, unique partial index on active intents per cart. Constraints are the cheapest correctness you will ever buy.
5. **Index FKs from day one.** `order_items.order_id` alone would have been the single highest-value line of SQL not written here.
6. **Budget for the frontend layer this project skipped:** `error.tsx` per route group, `loading.tsx`/Suspense on every data-fetching page, `not-found.tsx`, react-hook-form + zod on the checkout and admin forms (both deps are already justified), keyboard-accessible tables, and semantic landmarks with a skip link.
7. **Keep the strong parts wholesale:** server-authoritative pricing, order snapshotting, the movement ledger, RFC 7807 errors, the rate limiter, and raw-body webhook verification are production-grade and directly portable.