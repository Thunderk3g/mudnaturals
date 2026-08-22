# MUD Naturals — CRM/Admin Requirements vs. the `ecommerce` Reference Implementation

Evidence base: read directly at `C:\Users\Diwakar.Adhikari01\Desktop\ecommerce` — `CLAUDE.md`, `UI-PAGES.md`, `README.md`, `SUPABASE-MIGRATION.md`, all of `src/db/schema/*.ts`, migrations `0004`/`0023`, `src/middleware.ts`, `src/db/client.ts`, `src/modules/auth/rbac.ts`, `src/lib/cookies.ts`, admin route tree and key pages/actions. ~50,081 LOC across `src/`, 56 tables, 58 admin API route files, 24 admin pages, 77 test files.

---

## 1. Reference project inventory

**Note on the docs:** `CLAUDE.md` claims the repo is "greenfield, no code." **That is stale by nine sub-projects.** `UI-PAGES.md` and `SUPABASE-MIGRATION.md` are the accurate documents. Do not trust `CLAUDE.md` for anything.

### Entities (from `src/db/schema/`, cross-checked against `CREATE TABLE` in `src/db/migrations/*.sql`)

| Domain | Tables | Notes |
|---|---|---|
| Tenancy | `stores`, `store_domains`, `site_config`, `feature_flags` | Multi-tenant by host header; `site_config` is one JSONB blob per store |
| Identity | `users`, `store_users`, `sessions`, `customers`, `addresses` | `store_users.permissions` is a `jsonb string[]` with `scope:*` wildcards |
| Catalog | `products`, `product_variants`, `product_images`, `categories`, `attribute_definitions`, `bundle_components`, `product_reviews` | Categories are a self-referencing adjacency list. **No collections table.** `product_reviews` is schema-only, no UI, no API |
| Inventory | `locations`, `stock_levels`, `stock_movements`, `stock_reservations`, `stock_thresholds`, `stock_batches`, `variant_inventory_settings`, `suppliers`, `supplier_skus`, `purchase_orders`, `purchase_order_items` | Full WMS-lite: reservations w/ TTL, movements ledger, POs with receive |
| Cart/checkout | `carts`, `cart_items`, `promotions`, `promotion_redemptions`, `shipping_zones`, `tax_rates` | Promotions support percent/amount/free_shipping/BXGY, usage caps, stackable |
| Orders | `orders`, `order_items`, `order_events`, `fulfillments`, `fulfillment_items`, `shipments`, `shipment_items`, `refunds`, `refund_items` | Address + SKU snapshots as JSONB — correct choice |
| Payments | `payment_intents`, `payments`, `payment_events` | Providers enum: `razorpay \| stripe \| manual` |
| CMS | `content_pages`, `content_versions`, `content_blocks_lib`, `navigation_menus` | Draft/published pointer swap; 8 block kinds |
| Media | `assets`, `asset_derivatives`, `asset_tags` | Content-addressed keys, signed direct upload |
| Ops | `audit_log`, `webhooks`, `webhook_deliveries`, `outbox_events` | Transactional outbox + backoff dispatcher |

### Admin pages (`src/app/admin/(protected)/`)

Dashboard (orders today / revenue today / low-stock count / recent orders + customers) · Products list, new, edit-with-variants, CSV import · Categories tree · Attributes registry · Inventory levels + locations, movements, thresholds, suppliers, purchase-orders sub-pages · Orders list (filter status/email/date-range) + order detail with fulfill / ship / deliver / refund / cancel · Customers list + detail with address book · Promotions list/new/edit · Settings (Brand, Theme, Currency & Locale, Features tabs) · Audit log · Assets gallery + SVG sprite builder · CMS pages list, block editor, signed-token preview, navigation editor. Plus `/admin/login` and `/admin/metrics` (Prometheus scrape).

### Notable architecture

- **RLS is real and it works.** `src/db/client.ts` runs two Postgres roles; `withTenant()` (`src/modules/tenant/with-tenant.ts`) wraps queries in a transaction with `set_config('app.store_id', …, true)`. Policies use `NULLIF(current_setting('app.store_id', true), '')::uuid` so an unset GUC denies rows. Admin pages go through `withTenant`.
- **Dual mutation surface.** 58 REST route files under `/api/v1/admin/**` (RFC 7807 errors, cursor pagination, `Idempotency-Key`, explicit CSRF) *and* a parallel set of Server Actions under each admin page (`actions.ts`, guarded by `requireAdmin('scope:action')`). Both paths exist for the same operations.
- **Order lifecycle is properly modelled**: state machine in `src/modules/orders/lifecycle.ts`, append-only `order_events` with DB-enforced no-update/no-delete policies, per-line partial fulfillment and partial refunds.
- BullMQ workers + scheduler for TTL sweeps, CSV import, inventory alerts, webhook dispatch, image derivatives. Partially migrated to Supabase pg_cron.

---

## 2. Benchmark vs. Shopify / Medusa / Saleor-class admin

Against the three reference admins, this codebase **over-delivers on operations and under-delivers on merchandising and communication**.

**Present and competitive:** order fulfillment queue, partial refunds, inventory adjust, discount codes, customer lookup, audit log, media library, block-based CMS, webhooks. On inventory it exceeds Medusa's default admin (POs, suppliers, batch tracking, thresholds).

**Missing vs. all three:**

- **Collections.** Shopify's manual-sort collection is *the* merchandising primitive for a small brand; Saleor and Medusa both ship `collections` as a separate entity from categories. Here `product-grid`'s `collectionSlug` resolves to a *category* (`src/components/storefront/blocks/ProductGrid.tsx:44` calls `getCategoryBySlug`). Products have a single `categoryId` FK — a product cannot be in two collections, and there is no per-collection sort order.
- **Transactional email.** The `emails` BullMQ queue is registered (`src/queue/queues.ts:13`) but `src/entrypoints/worker.ts:22` lists it under *stub handlers*. Grep for `nodemailer|resend|sendMail` across `src/` returns zero implementations. **No order confirmation, no shipping notification, no password reset email ships today.** All three benchmarks treat this as table stakes.
- **Draft orders / manual order creation.** Zero occurrences. For a brand taking orders in Instagram DMs this is the *single most important* missing screen.
- **Product search in admin.** Orders filter by status/email/date; the products list filters by status/category/brand but there is no text search box, and no bulk select/bulk edit anywhere (grepped: no checkbox/bulk handling in `products/page.tsx`).
- **Returns as an entity**, customer notes/tags, saved order views, CSV export of orders. Analytics is four cards on one dashboard — no time series, no product-level or channel reporting.

**Over-delivered vs. what a sub-2000-orders/month operator uses:** multi-tenancy, sales-channel-free but region/tax/zone machinery, purchase orders, supplier SKUs, stock batches, multi-location transfers, webhook subscription management, Prometheus metrics, SVG sprite builder.

---

## 3. Verdict table for MUD

| Existing Capability | Keep | Adapt | Rebuild | Remove | Reason |
|---|:--:|:--:|:--:|:--:|---|
| Orders + order_items + JSONB address/SKU snapshots | ● | | | | Correct, boring, battle-shaped. Snapshotting is right. |
| Order lifecycle state machine + append-only `order_events` | ● | | | | Timeline + DB-enforced immutability is exactly the audit trail a social-commerce team needs when a DM order goes wrong. |
| Fulfillment / shipment / partial refund model | | ● | | | Keep the tables; collapse the fulfillment**and**shipment pair (already 1:1 per `orders/actions.ts` comment) into one. Add COD-specific states. |
| Refunds + refund_items | ● | | | | Partial refunds by line are needed and correctly done. |
| Products / variants / SKU / images | ● | | | | Sound. Add maker FK; no structural change. |
| Categories (adjacency list) | | ● | | | Keep as taxonomy; add a **separate** collections table for merchandising. |
| `product-grid` `collectionSlug` → category alias | | | ● | | Merchandising must not be a category alias. Needs real collections + manual sort. |
| Promotions (percent/amount/free-ship/BXGY, caps, stackable) | | ● | | | Keep percent/amount/free-shipping. Drop BXGY + `stackable` + `customerSegments` unless asked. |
| Inventory: `stock_levels`, `stock_movements`, `stock_reservations` | | ● | | | Keep the ledger + reservations (real oversell protection). Collapse to **one location**. |
| Suppliers, supplier_skus, purchase_orders, PO receive, transfers, stock_batches | | | | ● | MUD's supply chain is maker communities, not POs. Replace with a maker-consignment intake, not a PO workflow. |
| Locations + thresholds (multi-location) | | ● | | | Single default location; keep `stock_thresholds` for low-stock alerts. |
| Customers + addresses + LTV | | ● | | | Add phone-first lookup (Nepal DTC is phone-identified, not email), Instagram handle, notes, tags. |
| CMS: `content_pages`/`content_versions` draft-publish pointer swap | ● | | | | Genuinely good, low-cost, and MUD needs journal/story pages. |
| CMS block registry (8 kinds) | | ● | | | Keep the pattern; add `maker-spotlight`, `impact-stats`, `story-carousel` blocks. |
| Navigation menus editor | ● | | | | Cheap, used weekly. |
| Assets library + signed direct upload + derivatives | ● | | | | Media-heavy brand; already correct. |
| SVG sprite builder page | | | | ● | Build-time concern masquerading as an admin screen. |
| Settings (Brand/Theme/Currency/Features tabs) | | ● | | | Keep Brand + Features. Theme-token editing is a design-system escape hatch a 5-person team won't use. |
| `audit_log` | ● | | | | Cheap insurance when several people touch orders. |
| RLS multi-tenancy (`store_id` on every table, `withTenant`) | | | | ● | MUD is **one** store. Every table carries a dead column and every query pays a transaction wrapper. This is the largest single simplification available. |
| Dual API: 58 REST routes **and** Server Actions | | | ● | | Pick one. Server Actions alone; Next carries CSRF natively. Deleting the REST layer removes ~half the admin surface area and the hand-rolled idempotency/cursor plumbing. |
| Auth: argon2id + HMAC-signed opaque sessions | ● | | | | Solid. Don't touch. |
| RBAC permission wildcards (`store_users.permissions`) | | ● | | | Keep the check function; collapse roles to owner/staff. |
| Payments: Razorpay + Stripe + intents/events | | | ● | | Wrong market. Needs eSewa/Khalti/Fonepay + COD. |
| Webhooks + deliveries + outbox dispatcher | | | | ● | Nobody is subscribing to MUD's webhooks. Keep `outbox_events` only if you use it for internal jobs. |
| BullMQ + Redis + worker + scheduler roles | | ● | | | Replace with Supabase pg_cron (already half-done per `SUPABASE-MIGRATION.md` Phase 4). Removes Redis and two deploy targets. |
| Prometheus `/admin/metrics` + prom-client in middleware | | | | ● | Node-runtime middleware for metrics on a Vercel deploy is cost without a consumer. |
| Tax rates (region × class, inclusive) | | ● | | | Single Nepal VAT rate; keep the table, delete the region matcher. |
| Shipping zones (JSONB region matchers + rate arrays) | | ● | | | Simplify to inside-valley / outside-valley + free-over threshold. |
| CSV product import (BullMQ job) | | ● | | | Keep — bulk-loading maker catalogs is a real workflow. Move off BullMQ. |
| Bundles (`bundle_components`) | | ● | | | Actually useful for gift sets. Keep. |
| Attributes registry / faceted filtering | | | | ● | 8 facet types for a handful of handcrafted product lines is spec-driven overhead. |
| `product_reviews` table (no UI) | | | ● | | Schema exists but is inert — no API, no admin, no moderation. Build it properly or drop the table. |

---

## 4. Missing for MUD

**Makers (the whole thing).** No vendor entity anywhere. Needed as first-class: `makers` (name, slug, bio, portrait, community FK, status), `communities` (name, region, description, cover), `products.maker_id`, `maker_stories` (or reuse `content_pages` with a maker FK). None of Shopify/Medusa/Saleor gives this either — it's genuinely custom work, and it's the reason MUD can't just install Shopify.

**Maker economics.** Per-maker earnings ledger, payout runs, commission/consignment split. This is the hardest missing piece and needs deciding before schema: is MUD buying inventory outright, or settling per sale? The answer changes the inventory model.

**Impact reporting.** Units sold per maker/community, income routed to makers, active-maker count, orders-to-impact rollups. Nothing in `audit_log` or the dashboard supports it. Sensible shape: a materialized view over `order_items` joined to `products.maker_id` — not a new subsystem.

**COD + eSewa.** `payment_provider` enum has `'manual'` but `src/modules/payments/` has only `razorpay.ts` and `stripe.ts` — `manual` is referenced exactly once, in a cancel-path guard (`src/modules/checkout/checkout.ts:305`). COD needs order states the current machine lacks: *confirmed-unpaid* → *out for delivery* → *cash collected* / *refused-return-to-origin*, plus a cash-reconciliation view and per-customer COD refusal history. The `orders.payment_status` enum (`pending|paid|failed|refunded`) has no slot for "collected on delivery."

**Manual/draft orders.** Instagram-DM order entry, with a payment-link or COD path. Absent.

**Transactional messaging.** Order confirmation and dispatch notification — email *and* SMS/WhatsApp, which matter more than email in Nepal. The queue name exists; the sender does not.

**Collections with manual sort + homepage merchandising.** Currently a category alias with no ordering control.

**Customer support.** No conversation/ticket/note surface. Minimum viable: notes on the customer record and an order-level internal comment, both writing into `order_events`.

---

## 5. Dangerous / over-engineered

**Dangerous (highest first):**

1. **The Supabase Data API was fully exposed in production** — documented in `SUPABASE-MIGRATION.md`. All 56 tables were granted `ALL` to `anon`/`authenticated` by Supabase's own `ALTER DEFAULT PRIVILEGES`; `GET /rest/v1/users` returned `email` + `password_hash`, `GET /rest/v1/sessions` returned live 64-hex session tokens, with only the publishable key. Fixed by `supabase/harden-data-api.sql` + migration `0023_identity_rls.sql` — but the doc still instructs "Run `harden-data-api.sql` in the SQL Editor before the Vercel cutover," so **whether it was applied to the live project is unverified**. Any MUD build on Supabase must revoke `anon`/`authenticated` defaults as migration #1 and verify with the anon key.
2. **`stores_read_own` fails open.** Migration `0004_enable_rls.sql` makes `stores` readable when `app.store_id` is unset "so early request-time lookups can find a store." Combined with #1, that's how tenant rows leaked.
3. **One `users` table and one `sessions` cookie for customers and admins.** `users.email` is globally unique; `store_users` is the only thing separating a shopper from an admin. A privilege bug in membership resolution is a full admin compromise. For MUD (single store), split staff auth from customer auth outright.
4. **`payment_intents.client_secret` and full provider `raw` JSONB stored unencrypted**, and `webhooks.secret` in plaintext. `raw` payloads carry customer PII and payment metadata indefinitely, with no retention policy.
5. **BYPASSRLS role used on the request path.** `migratorDb` appears in 17 files including the admin layout guard, `rbac.ts`, and the login/signup routes. Bootstrap lookups justify some of it; each one is a query that RLS cannot save you from.
6. **Rate limiter fails open by design** (`src/middleware.ts` — bare `catch {}` around the admin limiter). Deliberate and documented, but it means a Redis outage silently removes the only admin abuse control.
7. **Two mutation paths for the same operations** (REST + Server Actions) means two places to get an authorization check right. `requireAdmin()` in the actions path and `requireStorePermission()` in the REST path are separate implementations.
8. **Storefront CSRF is HMAC'd against the session id** (`src/app/(storefront)/_lib/session.ts`) — the token is derived from a value the cookie already carries, so it's a same-value double-submit rather than an independent secret.

**Over-engineered for a 5-person team:** RLS multi-tenancy for one store; the whole SP-3 inventory suite (POs, suppliers, batches, transfers, multi-location); webhook subscriptions with backoff and delivery logs; the three-role Docker image (`web`/`worker`/`scheduler`); Prometheus in Node-runtime middleware; theme-token editing UI; the attributes/facet registry; BXGY promotions; the SVG sprite builder. Roughly: 56 tables and 50k LOC to run a store that will place its 2,000th order sometime next year.

---

## 6. Open questions

1. **Consignment or wholesale?** Does MUD buy from makers up front, or settle after sale? This determines whether you need a maker ledger and payout runs, or just an attribution field on products.
2. **Nepal or India?** Reference is India-shaped end to end (INR, GST-inclusive, Razorpay, `en-IN` locale defaults). eSewa implies Nepal. Currency, tax, and payment provider all change together. *(Resolved after this report: market is Nepal.)*
3. **Do makers get logins?** A maker-scoped portal (see only my products/orders/earnings) is a different security model than staff-only admin — and none of the benchmark platforms provide it.
4. **Is a maker attached to a product, a variant, or a batch?** Handcrafted goods from the same community may come from different individuals per batch. Product-level is simple; batch-level is honest.
5. **How many locations and staff, really?** If it's one room and three people, drop locations, permission groups, and RLS entirely.
6. **Reuse or greenfield?** This codebase's genuinely reusable assets are the order lifecycle + events model, the CMS draft/publish pointer swap, the asset pipeline, and the auth primitives. Everything else costs more to strip than to write. Recommendation: **port those four, start fresh on the rest** — a single-store schema for MUD is realistically 20-25 tables, not 56.
7. **Was `harden-data-api.sql` actually run against the live Supabase project?** Verify before any MUD work reuses that project or its bootstrap scripts.