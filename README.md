# MUD Naturals

A purpose-driven concept store selling natural products, traditional crafts and
everyday goods made by independent Nepali makers. Single store, Nepal only, NPR.

The commercial premise is **objects with origins**: every product carries
verifiable provenance — maker → community → material → technique → labour hours —
rendered as product architecture rather than About-page copy.

- Live: https://mudnaturals.vercel.app
- Strategy and evidence: `RESEARCH-PACKAGE.md`, `BUSINESS-MODEL.md`, `research/`
- Build spec: `BUILD-PROMPT.md`
- Parked decisions: `QUESTIONS.md`

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 15 (App Router), React 19 | Server Components; one mutation path via Server Actions |
| Styling | Tailwind v4, CSS-first tokens | Tokens live in `src/app/globals.css` |
| Database | Supabase Postgres, direct connection via `postgres` | The Data API stays fully revoked; see Security |
| Payments | eSewa ePay v2 (UAT) + Cash on Delivery | eSewa has no reliable callback — see Payments |
| Hosting | Vercel, deploys from GitHub `main` | Pushes to `main` ship production |

Money is **integer paisa** everywhere. It becomes a string only at the UI edge,
via `formatNpr`.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run db:migrate             # apply schema
npm run db:seed                # load the catalogue
npm run media                  # crop product images from screenshots/
npm run dev
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply pending SQL migrations, once each |
| `npm run db:migrate:status` | List applied and pending migrations |
| `npm run db:seed` | Rebuild the catalogue. Refuses to run if orders exist |
| `npm run media` | Crop product photos out of `screenshots/` into `public/media/` |
| `npm run security` | Anon-key leak test. **Must pass before every deploy** |
| `npm run test` | Unit tests (payment signing, status mapping) |

---

## Architecture rules

These are not style preferences. Each one exists because its absence caused a
specific, documented defect in the codebase this build replaces
(`research/11-ecommerce-deep-audit.md`).

1. **Prevention in Postgres, not in application discipline.** Every invariant that
   can be a constraint, trigger or partial unique index is one. Illegal order
   transitions, negative stock, two default variants, a second successful payment
   on one order, a product published without provenance — all rejected by the
   database regardless of which code path tried.
2. **`withTx()` at the route or action boundary only.** Module functions take the
   transaction handle. Never call a transaction-opening function from inside a
   transaction: nested `BEGIN` is not a savepoint, it takes a second pool
   connection, and the pool deadlocks under concurrency.
3. **Single store.** No tenancy column, no `store_id`, no tenant wrapper.
4. **Server Actions only** for mutations. No parallel REST admin API — two
   mutation paths means two places to get authorization right. The eSewa redirect
   handlers and crons are the only route handlers.
5. **The client never sends money.** Variant ids, quantities and a coupon *code*.
   Every price, discount and total is computed in `place_order()`.
6. **Append-only means append-only.** `stock_ledger`, `order_events`,
   `payment_events` and `audit_log` reject UPDATE and DELETE by trigger.

---

## Payments — read before touching

**eSewa ePay v2 has no reliable server-to-server notification.** The docs mention
IPN in a single sentence with no payload spec, no registration mechanism and no
signature format. The browser redirect plus our own polling of the status API is
the entire notification surface.

**Therefore the reconciliation cron is the primary confirmation channel, not a
safety net.**

Non-negotiables:

- The redirect is **never** proof of payment. Verify the HMAC, then — regardless
  of what the payload says — call the status API with the **stored**
  `transaction_uuid` and amount.
- One order → many `payment_attempts`. The attempt's UUID *is* the
  `transaction_uuid`; eSewa requires per-request uniqueness and a retry needs a
  fresh one. A partial unique index allows at most one `succeeded` attempt.
- The amount is frozen on the attempt at initiation and verified against that
  snapshot. Never re-derive at callback time — re-pricing mid-flight strands
  captured payments.
- `AMBIGUOUS` → `manual_review`, never an automatic transition.
- A network error never fails a customer. The order goes to `payment_verifying`
  and the cron resolves it.
- Refunds are manual: no refund API exists. The operator acts in the merchant
  portal and the cron detects the status flipping to `*_REFUND`.
- Signing runs on the **Node runtime** (`node:crypto`), never Edge.

### Region

The Supabase project is in **ap-northeast-2 (Seoul)**, so every query from a
function elsewhere pays a cross-Pacific round trip. Pinning functions to `icn1`
would fix that, but **the Hobby plan does not allow a region override** — adding
`regions` to `vercel.json` fails the deployment during config validation, before
the build starts (it shows up as a build of `0ms`, which is not an obvious clue).
Set it when the plan is upgraded.

Note also that `vercel.json` rejects unknown keys, so it cannot carry comments —
hence this section.

### Known limitation: cron frequency

Vercel **Hobby** caps cron at once per day; reconciliation wants every 2–5
minutes. Until the plan is upgraded, three things carry the load: the order
status page polls itself for ~3 minutes, the admin reconciliation queue has a
"Reconcile now" action, and the daily cron sweeps whatever is left. Raising the
schedule is a one-line change in `vercel.json`.

---

## Security

- Migration `001` revokes all default privileges from `anon` and `authenticated`
  **before any table exists**, then later migrations grant `SELECT` back only on
  published catalogue tables, each with an RLS policy filtering to published rows.
- RLS is enabled in the same migration as every `CREATE TABLE`.
- Every function sets an explicit `search_path`; privileged functions have
  `EXECUTE` revoked from `anon` and `authenticated`.
- Guest order lookup goes through a high-entropy token, never a guessable order
  number. Order numbers are random, not sequential.
- Secrets sit behind `import "server-only"` and never carry a `NEXT_PUBLIC_`
  prefix.
- `npm run security` proves the posture from the outside, using only the
  publishable key. **It must pass before every deploy.**

---

## Deploying

Pushing to `main` deploys production; pull requests get preview URLs. Do not
deploy with CLI credentials.

Environment variables live in Vercel project settings for Production, Preview and
Development. `NEXT_PUBLIC_SITE_URL` is the canonical site URL and the base for
the eSewa `success_url` / `failure_url` — moving to a custom domain means
changing that one variable, and checking whether eSewa pins redirect URLs on
their side.

**eSewa is on UAT credentials.** Switching to production credentials is a
deliberate cutover, not a deploy.
