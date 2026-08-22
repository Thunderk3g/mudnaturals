# MUD Naturals — Ecommerce Failure Checklist

**Evidence tags:** `[DOC]` documented incident/vendor docs · `[INF]` strong inference from stack shape · `[REC]` recommendation, judgement call · `[OPEN]` unresolved

Design bias throughout: **push prevention into Postgres.** A constraint or a single `SECURITY DEFINER` function cannot be forgotten by a tired developer at 11pm; application-layer discipline can. MUD has no ops capacity to babysit invariants.

---

## 1. Failure checklist

### 1.1 Inventory & orders

**IO-1 · Overselling under concurrency** `[DOC]`
*How:* Read-then-write. Two checkouts both `SELECT stock` → both see 1 → both `UPDATE stock = 0`. Classic lost update; universally documented in Postgres race-condition literature. Amplified by MUD's likely traffic shape (Instagram drop → 200 people on one SKU in 90 seconds).
*Consequence:* Order accepted, product doesn't exist, manual refund + apology + reputational hit on a social-enterprise brand where trust is the product.
*Prevention:* `CHECK (stock_qty >= 0)` on `product_variants` **and** decrement only via conditional atomic update inside the order transaction:
```sql
UPDATE product_variants SET stock_qty = stock_qty - $qty
WHERE id = $id AND stock_qty >= $qty RETURNING id;
```
Zero rows returned ⇒ raise, roll back the whole order. No `SELECT FOR UPDATE` needed, no read-modify-write, no application locking. The CHECK constraint is the backstop that catches every code path you forget.

**IO-2 · Duplicate orders from double-submit** `[DOC]`
*How:* Slow 3G (Nepal mobile-first), user taps "Place order" twice; or browser back-button re-POST; or React StrictMode double-invoke in dev leaking into a handler that isn't idempotent.
*Consequence:* Two orders, two stock decrements, two eSewa redirects, one customer.
*Prevention:* Client generates an `idempotency_key` (UUID) per checkout attempt, stored in component state at mount. `orders.idempotency_key text UNIQUE NOT NULL`. `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *` — on conflict, return the existing order. Also disable the button on submit, but the unique index is the real fix. `[REC]` Additionally: partial unique index `CREATE UNIQUE INDEX ON orders (user_id) WHERE status = 'awaiting_payment'` caps a user to one open payment at a time and kills most double-payment scenarios at the root.

**IO-3 · Stale cart — price or stock changed since add-to-cart** `[INF]`
*How:* Cart persisted in localStorage or a `carts` table holding `product_id + qty`. Admin edits price; customer checks out at yesterday's price, or at a price the UI showed but the server never agreed to.
*Consequence:* Margin loss, or a customer charged more than displayed → dispute.
*Prevention:* Carts store **references only** (`variant_id, qty`) — never prices. Server recomputes the total at order creation from `product_variants.price`. `order_items` snapshots `unit_price_npr` at insert time (immutable thereafter). If the recomputed total differs from the client's displayed total, **do not silently proceed** — return a 409 and re-render the cart with a "prices updated" banner. `[REC]` Same rule for out-of-stock: fail the whole order rather than partially fulfilling.

**IO-4 · Race between checkout and admin stock edit** `[INF]`
*How:* Admin sets `stock_qty = 3` (absolute write) while an order concurrently decrements. Admin's write clobbers the decrement.
*Prevention:* Admin UI performs **adjustments**, not absolute sets: insert into an append-only `stock_ledger (variant_id, delta, reason, actor)`, with `stock_qty` maintained as a derived value or updated by the same conditional-delta pattern. `[REC]` A ledger also gives MUD free shrinkage/audit data at zero ops cost.

**IO-5 · Order rows created before stock is secured** `[INF]`
*How:* Order INSERT and stock decrement in separate round-trips from Next.js; second one fails or the serverless function times out mid-way (Vercel function limits).
*Prevention:* One Postgres function `place_order(cart jsonb, idempotency_key uuid, ...)` doing validate → price → decrement → insert order → insert items, all in a single implicit transaction. One RPC call from the app. This is the single highest-leverage design decision on the list.

### 1.2 Payments (eSewa ePay v2 — redirect + callback)

eSewa v2 facts driving these items `[DOC, developer.esewa.com.np/pages/Epay-V2]`: the payment form is a **client-side POST** with an HMAC-SHA256 (base64) signature over `total_amount,transaction_uuid,product_code`; the success callback arrives as **base64 JSON in the redirect URL**, itself signed; `transaction_uuid` must be unique per request; a server-to-server **status-check API** exists returning `COMPLETE / PENDING / AMBIGUOUS / NOT_FOUND / CANCELED / FULL_REFUND / PARTIAL_REFUND`.

**PAY-1 · Trusting the redirect callback as proof of payment** `[DOC]`
*How:* Handler at `/payment/success` decodes `?data=` and marks the order paid. But that URL is browser-controlled — anyone can hit it with hand-crafted base64.
*Consequence:* Free goods. Trivially exploitable, and Nepali ecommerce sites have shipped exactly this.
*Prevention:* Two gates, both mandatory: (a) recompute the HMAC over the returned `signed_field_names` fields with the merchant secret and compare in constant time; (b) **independently call the eSewa status API server-side** and require `status = COMPLETE` **and** returned `total_amount` equal to the stored `orders.total_npr`. eSewa's own docs describe the status API as the enquiry mechanism when no response is received — use it on every transaction, not only on timeouts.

**PAY-2 · Customer pays, order never marked paid ("payment success, order failure")** `[DOC]`
*How:* Customer's phone loses connectivity during the redirect back; or Vercel function cold-start timeout; or eSewa returns `AMBIGUOUS`. Money left eSewa, MUD's DB says `awaiting_payment`.
*Consequence:* Worst possible failure for a small brand — customer has a debit SMS and no order. Manual reconciliation the team cannot sustain.
*Prevention:* Never rely on the customer's browser completing the round trip. Add a **reconciliation cron** (Vercel Cron, every 10 min) that selects orders in `awaiting_payment` older than 10 minutes and calls the status API for each attempt: `COMPLETE` → confirm; `NOT_FOUND`/`CANCELED` → release stock and cancel; `PENDING`/`AMBIGUOUS` → leave, retry, and alert after N hours. This one cron closes the entire class.

**PAY-3 · Duplicate / replayed callbacks** `[INF, standard gateway behaviour]`
*How:* User refreshes the success page; browser prefetch fires the URL twice; attacker replays a captured valid callback.
*Consequence:* Double stock decrement, double fulfilment, double loyalty credit.
*Prevention:* Append-only `payment_events(esewa_transaction_uuid, transaction_code, status, raw_payload jsonb)` with `UNIQUE (esewa_transaction_uuid, transaction_code, status)`; handler does `INSERT ... ON CONFLICT DO NOTHING` and only performs side effects when a row was actually inserted. Order state transition guarded: `UPDATE orders SET status='paid' WHERE id=$1 AND status='awaiting_payment'` — zero rows means already handled, exit quietly. Replay of an *old valid* callback is neutralised because `transaction_uuid` is single-use and the order is no longer in the source state.

**PAY-4 · Amount tampering** `[DOC — OWASP business-logic / client-side price]`
*How:* The eSewa form is rendered in the browser; the user edits `total_amount` in DevTools. (eSewa rejects it because the signature won't match — *provided the signature was generated server-side*.) The real exposure is a developer computing the amount from a client-supplied cart payload, or generating the signature client-side.
*Prevention:* The merchant secret **never** leaves the server and is never named `NEXT_PUBLIC_*`. Signature generated in a Route Handler / Server Action from `orders.total_npr` read back from the DB — not from request body. On callback, re-assert `returned total_amount == orders.total_npr`. `[REC]` Add a CI grep failing the build on `NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE|ESEWA)`.

**PAY-5 · Retry creates an unusable transaction_uuid collision** `[DOC — eSewa requires uniqueness]`
*How:* Payment fails, customer retries, code re-sends the same `transaction_uuid` (= order id). eSewa rejects.
*Prevention:* Model `payment_attempts(id uuid PK, order_id, esewa_transaction_uuid text UNIQUE, amount_npr, status)`. Each retry = new attempt row with a fresh uuid. Enforce one success per order: `CREATE UNIQUE INDEX ON payment_attempts (order_id) WHERE status = 'COMPLETE';` — the DB now makes double-charging-then-double-fulfilling structurally impossible.

**PAY-6 · Refund inconsistency** `[INF]`
*How:* eSewa reports `FULL_REFUND`/`PARTIAL_REFUND` via status API, but MUD's DB still shows `paid`; or a manual refund is issued outside the system and never recorded.
*Prevention:* The reconciliation cron also re-checks recently-paid orders and writes refund statuses into `payment_events`. Refunds are a *derived* order status, never a hand-edited field. `[REC]` Restocking on refund goes through the same `stock_ledger` delta path (IO-4), never a manual number.

**PAY-7 · COD abuse and phantom orders** `[INF, high prior for Nepal COD ecommerce]`
*How:* COD requires no payment friction; fake names/numbers, bulk orders, refusal at door.
*Consequence:* Real cash loss on courier fees for a thin-margin social enterprise.
*Prevention:* `[REC]` OTP-verify the phone number before a COD order is accepted (Supabase Auth phone provider, or a one-off SMS check). Cap: unique index or trigger limiting open COD orders per verified phone; auto-block phones with N prior refusals via a `cod_blocklist` table checked in `place_order()`. Consider a COD value ceiling above which prepayment is required.

### 1.3 Pricing & promotions

**PROMO-1 · Coupon reuse / stacking / enumeration** `[DOC — pervasive]`
*How:* Validation lives in application code and is checked once at cart display, not re-checked at order creation; or two concurrent requests each redeem the last use; or short guessable codes (`MUD10`, `MUD20`) get brute-forced and shared on Facebook groups.
*Prevention:* `coupon_redemptions(coupon_id, order_id, user_id)` with `UNIQUE (coupon_id, user_id)` for once-per-customer coupons; global cap via `UPDATE coupons SET uses_remaining = uses_remaining - 1 WHERE id=$1 AND uses_remaining > 0 RETURNING id` inside the same transaction as `place_order()`; `CHECK (uses_remaining >= 0)`. One coupon per order enforced by `orders.coupon_id` being a single nullable column — stacking becomes unrepresentable. Codes: ≥10 chars with random suffix, and rate-limit coupon validation endpoints (Vercel WAF rate limit rule) to stop enumeration `[REC]`.

**PROMO-2 · Discount computed client-side** `[INF]`
*Prevention:* Discount amount is an output of `place_order()`, stored on the order, never accepted as input. Same rule as IO-3: the client sends a *code*, never a *value*.

### 1.4 Catalog & UX

**UX-1 · Broken/heavy product images** `[INF — MUD is a visual, artisanal brand]`
*How:* Direct `<img src>` to Supabase Storage public URLs with 3MB unoptimised JPEGs; bucket path renamed; missing `remotePatterns` in `next.config` so `next/image` silently 500s in production but works locally.
*Prevention:* Route all product images through `next/image` with the Supabase hostname whitelisted; store an explicit `image_path` FK with `NOT NULL` on the primary image; add a fallback placeholder in one shared `<ProductImage>` component so a missing asset degrades instead of blanking the grid. `[REC]` Nepal mobile bandwidth makes this a conversion issue, not a cosmetic one.

**UX-2 · Variant model that permits impossible states** `[INF]`
*How:* Size/scent options stored as JSON on the product; some combinations have no price or stock row; "Add to cart" enabled for a combination that doesn't exist.
*Prevention:* Variants are rows, not JSON: `product_variants(product_id, option_key, price_npr NOT NULL, stock_qty NOT NULL)` with `UNIQUE (product_id, option_key)`. The UI renders only rows that exist. Unrepresentable > validated.

**UX-3 · Address handling wrong for Nepal** `[REC]`
*How:* Copy-pasted Western address form: required postal code, state dropdown, no landmark field. Couriers in Kathmandu route by tole/landmark and phone call.
*Consequence:* Failed deliveries — indistinguishable from fraud in the data, and expensive.
*Prevention:* Address schema = `full_name, phone (NOT NULL, validated 10-digit), province, district, municipality/ward, tole/street, landmark, optional postal`. Phone required and OTP-verified for COD. Store the delivered address as an **immutable snapshot on the order**, not a FK to a mutable `addresses` row (customer edits address later → historic orders silently rewrite) `[INF]`.

**UX-4 · Checkout abandonment from avoidable friction** `[DOC — Baymard-class findings]`
*Causes to design out:* forced account creation (support guest checkout with an emailed/SMS'd order-lookup token); surprise delivery charge at the last step (show it in the cart); no visible payment-in-progress state during the eSewa redirect; unclear COD availability. `[REC]` Explicitly render an "order pending payment confirmation" page rather than an ambiguous spinner — this also mitigates PAY-2's customer-facing panic.

**UX-5 · Bad search on a small catalog** `[REC]`
*Prevention:* Don't build search infrastructure. Postgres `pg_trgm` + an index on product name is sufficient below a few hundred SKUs; a client-side filter over a prefetched list is sufficient below ~50. Skipped: any external search service — add when the catalog and the ops capacity both grow.

### 1.5 Fulfilment

**FUL-1 · Shipping status drifts from reality** `[INF]`
*How:* Status is a free-text field an admin types; courier updates arrive by phone; no transition rules, so `delivered` precedes `shipped`.
*Prevention:* `orders.status` is a Postgres `ENUM` and transitions are enforced by a `BEFORE UPDATE` trigger encoding the legal state machine (`pending → paid → packed → shipped → delivered`, plus `cancelled`, `refunded`). Illegal transitions raise. A `order_status_history` append-only table gives the team a free timeline for customer queries.

**FUL-2 · Failed-payment order limbo** `[INF]`
*How:* Orders sit in `awaiting_payment` forever, holding reserved stock; the catalogue shows sold out while nothing sold.
*Prevention:* Choose one model and hold it: **decrement at confirmation** (paid or COD-accepted) rather than at cart, so limbo holds nothing. If reservation is needed for drops, add `reserved_until timestamptz` and let the same reconciliation cron release expirations. `[REC]` For MUD's volume, decrement-at-confirmation is the lazy correct choice — no reservation machinery to operate.

### 1.6 Security

**SEC-1 · Service-role key reaching the browser** `[DOC — the single most common Supabase breach pattern; ~83% of Supabase incidents involve RLS/key misconfiguration]`
*How:* `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, or importing a server Supabase client module into a Client Component so it's bundled. The key bypasses RLS entirely.
*Prevention:* Key only in Route Handlers / Server Actions, file marked `import 'server-only'` at the top of the module that constructs it (this makes the bundler fail the build rather than shipping it). CI grep. Rotate immediately on any suspicion — before fixing code.

**SEC-2 · Tables in `public` with RLS off** `[DOC — Supabase lint 0013 rls_disabled_in_public; CVE-2025-48757 (May 2025) found 10.3% of analysed Lovable-built apps shipping public-readable tables]`
*How:* Tables created via SQL editor or migrations have RLS **off by default**; PostgREST exposes them to anyone holding the (public) anon key.
*Prevention:* `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the same migration that creates every table — make it a checklist item in the migration template. Run the Supabase security advisor before every deploy.

**SEC-3 · RLS enabled, policies wrong** `[DOC — lints 0007, 0008, 0024, 0006, 0015]`
Specific documented traps: `policy_exists_rls_disabled` (policies written, RLS never enabled — false confidence); `permissive_rls_policy` — `USING (true)` defeats the point; `multiple_permissive_policies` compound as OR, so one sloppy policy widens all others; `rls_references_user_metadata` — `auth.jwt() -> 'user_metadata'` is **end-user editable**, so an admin check against it is self-service privilege escalation.
*Prevention:* Roles live in an `app_metadata` claim or a `profiles.role` column the user cannot write (RLS on `profiles` permits updating every column except `role`, or role changes only via a `SECURITY DEFINER` function). Deny-by-default: no policy for `anon` on any order/customer table.

**SEC-4 · Views and functions bypassing RLS** `[DOC — lints 0002 auth_users_exposed, 0010 security_definer_view, 0028/0029 SECURITY DEFINER function executable by anon/authenticated]`
*How:* A convenience view joining `auth.users` to `profiles` is exposed via the API; views run as their creator unless `security_invoker = on`. A `SECURITY DEFINER` RPC written for one internal purpose remains `EXECUTE`-able by `anon`.
*Prevention:* All views: `WITH (security_invoker = on)`. Every `SECURITY DEFINER` function: `SET search_path = ''` (lint 0011), fully-qualified identifiers, and explicit `REVOKE EXECUTE ... FROM anon, authenticated` then `GRANT` to exactly the intended role. Never expose `auth.users` — copy needed fields into `profiles`.

**SEC-5 · Storage bucket misconfiguration** `[DOC — lint 0025 public_bucket_allows_listing]`
*How:* Everything dumped into one public bucket for convenience; a public bucket with broad SELECT policies makes the whole object list enumerable, so invoices/ID photos/unreleased product shots are discoverable by anyone.
*Prevention:* Two buckets minimum: `product-images` (public, and containing *only* content that is safe to enumerate) and `private` (private, per-user path policies `(storage.foldername(name))[1] = auth.uid()::text`, served via signed URLs with short TTL). Never rely on unguessable filenames as access control.

**SEC-6 · Admin permission problems** `[INF]`
*How:* Admin panel is protected only by a client-side `if (user.isAdmin)` render check; the underlying tables permit `authenticated` writes.
*Prevention:* Admin authority is an RLS policy on the table, evaluated server-side. The UI check is cosmetic only. Middleware protecting `/admin` routes is a second layer, never the first.

**SEC-7 · Broken auth flows** `[DOC — lint 0012 auth_allow_anonymous_sign_ins; Supabase SSR guidance]`
*How:* Anonymous sign-ins left enabled means anonymous users hold the `authenticated` role and satisfy every "authenticated" policy. Using `getSession()` in server code trusts an unverified cookie; `getUser()`/`getClaims()` verifies. Missing email confirmation lets anyone claim another person's email.
*Prevention:* Disable anonymous sign-ins unless guest carts genuinely need them (and if so, add `(select auth.jwt() ->> 'is_anonymous') = 'false'` to sensitive policies). `getUser()`/`getClaims()` in all server code paths. Email confirmation on. Redirect allow-list restricted to MUD's domains — open redirect in the auth flow leaks tokens.

**SEC-8 · Customer PII over-exposure** `[DOC — lint 0023 sensitive_columns_exposed]`
*How:* `orders` selectable by any authenticated user; guest orders unprotected because there's no `user_id` to match on.
*Prevention:* Orders RLS: `USING (user_id = (select auth.uid()))`. Guest orders carry a high-entropy `lookup_token`; guest access goes through a `SECURITY DEFINER` RPC taking the token, **not** through a permissive policy. Note the `(select auth.uid())` wrapping — it's also the fix for lint 0003's per-row re-evaluation.

---

## 2. Top 10 risks for MUD, ranked

1. **SEC-1 — service-role key in the client bundle.** Total compromise, one-line mistake, the most documented Supabase failure in existence.
2. **SEC-2/SEC-3 — a public table with RLS off or `USING (true)`.** Full customer list + addresses + phone numbers readable by anyone with the anon key (which is in the page source by design).
3. **PAY-1 — trusting the eSewa redirect without signature + status-API verification.** Free-goods exploit, directly monetisable, findable by anyone who reads the eSewa docs.
4. **PAY-2 — paid-but-not-recorded orders.** Highest-frequency real-world pain, worst customer-trust damage, unsustainable manual load for a small team. Fixed by one cron.
5. **IO-1 — overselling on a launch drop.** Near-certain to occur without the atomic-decrement + CHECK pattern; refunds and apologies at the worst possible moment.
6. **IO-2 — duplicate orders on flaky mobile connections.** High probability given the market's network conditions.
7. **PAY-5 — no per-attempt payment model.** Causes both stuck retries and, worse, double-charge-then-double-ship.
8. **PAY-7 — COD abuse.** Direct cash burn on a thin-margin social enterprise; no technical exploit required.
9. **SEC-5 — public storage bucket listing.** Cheap to get wrong, quiet until it isn't.
10. **UX-3 — address model unfit for Nepal.** Silent revenue loss through failed deliveries; expensive to retrofit once orders exist.

---

## 3. Supabase-specific security rules for MUD

Adopt as non-negotiable migration/PR rules:

1. Every `CREATE TABLE` migration includes `ENABLE ROW LEVEL SECURITY` **and** at least one policy, in the same file. RLS on with no policy (lint 0008) is safe but breaks the app; RLS off is a breach.
2. `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` as a baseline, then grant deliberately. Products/variants readable by `anon`; nothing else.
3. Wrap auth calls: `(select auth.uid())`, never bare `auth.uid()` — correctness is identical, performance is not (lint 0003).
4. Never authorise from `user_metadata` (lint 0015). Roles come from `app_metadata` or a user-unwritable column.
5. All views `WITH (security_invoker = on)`; never expose `auth.users` (lints 0002, 0010). No materialized views or foreign tables in the API schema (0016, 0017).
6. Every function: `SET search_path = ''`. Every `SECURITY DEFINER` function: explicit `REVOKE EXECUTE FROM anon, authenticated` then targeted `GRANT` (lints 0011, 0028, 0029).
7. Two storage buckets only — `product-images` public, `private` private with per-user folder policies and signed URLs. No third bucket without a written reason (lint 0025).
8. Service-role key: server-only modules with `import 'server-only'`, never `NEXT_PUBLIC_*`, CI grep as backstop. Same rule for the eSewa merchant secret.
9. Anonymous sign-ins **off** unless a guest cart requires them; if on, exclude `is_anonymous` JWTs from every write policy (lint 0012).
10. `getUser()` / `getClaims()` in server code — never `getSession()` for authorisation decisions.
11. Run the Supabase **security advisor** (and `supabase db lint`) as a pre-deploy step. It mechanically catches items 1, 4, 5, 6, 7, 9 — this is the entire security programme a small team can actually sustain.
12. All order/payment/stock mutations go through one `SECURITY DEFINER` function (`place_order`) with a locked search path. The Data API never writes to `orders`, `order_items`, `product_variants`, or `coupon_redemptions` directly.

---

## 4. Open questions

- **[OPEN] Guest checkout?** Determines whether RLS can key on `auth.uid()` at all, or whether a token-based `SECURITY DEFINER` path is required. Answer this before writing any order policy — it is expensive to retrofit.
- **[OPEN] Does eSewa's merchant account expose a server-to-server webhook, or only the browser redirect + status-check API?** If redirect-only (as v2 docs suggest), the reconciliation cron is not optional — it is the primary confirmation channel. Confirm with the merchant onboarding team.
- **[OPEN] Refund initiation:** does MUD refund through the eSewa merchant portal manually? If so, the DB only ever learns via status-API polling — decide the polling window for already-`paid` orders.
- **[OPEN] Reservation window needed?** Only if MUD runs limited drops. Default no; revisit if a drop oversells despite IO-1.
- **[OPEN] Partial fulfilment / split shipments?** Assumed out of scope; the schema above (order-level status) does not support it. Confirm before locking the status ENUM.
- **[OPEN] Who is "admin"?** One shared account, or per-person accounts with an audit trail? Per-person is barely more work and makes FUL-1's history table meaningful.
- **[OPEN] COD share of orders.** Drives how hard to invest in PAY-7 controls. If COD is >50% of volume, phone OTP moves into the top 5.

---

Sources: [eSewa ePay v2 docs](http://developer.esewa.com.np/pages/Epay-V2) · [Supabase Database Advisors (security lints)](https://supabase.com/docs/guides/database/database-advisors) · [Supabase security breaches: what actually happened](https://www.guardlayer.io/blog/supabase-security-breaches) · [Supabase RLS common mistakes & CVE-2025-48757](https://vibeappscanner.com/supabase-row-level-security) · [Supabase service-role key leak pattern](https://vibe-eval.com/patterns/supabase-service-role-leak/) · [10 Common Supabase Security Misconfigurations](https://modernpentest.com/blog/supabase-security-misconfigurations) · [Handling race conditions in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-postgresql-race-conditions/view) · [Inventory reservation patterns](https://stoalogistics.com/blog/inventory-reservation-patterns)