# MUD Naturals — End-to-End Build Prompt (Claude Code)

**How to use this file.** Put it at the repo root as `BUILD-PROMPT.md`, alongside the 16 research
markdown files in `research/`. Open Claude Code in that directory and paste the *Kickoff* block
below. Everything after it is the spec Claude Code will read.

Recommended session model: **Opus** for the whole build. Do not try to split models across
sub-tasks — pick one and stay in it.

---

## END GOAL — one line

> **Run unattended from an approved `PLAN.md` to a live site on the Vercel-generated URL, auto-deploying from GitHub `main` — parking every blocked decision in `QUESTIONS.md` behind a feature flag and continuing, stopping only for money, credentials, or something destructive.**

No custom domain. There is no `mudnaturals.com` yet, and buying one falls under the money stop rule
in §3.1. The operator will configure DNS later; the build treats the `*.vercel.app` URL as the
canonical site URL throughout.

The customer-facing version of the same goal, for judging whether a feature is done: *a customer in
Kathmandu can buy a named maker's product with eSewa or COD, and staff can run makers, stock,
orders and stories from one admin — no step faked, no step manual.*

---

## KICKOFF (paste this)

```
END GOAL: run unattended from an approved PLAN.md to a live site on the Vercel-generated URL,
auto-deploying from GitHub main. Park every blocked decision in QUESTIONS.md behind a feature
flag and keep building. Stop only for money, credentials, or something destructive.

There is no custom domain yet. Do not buy one. Use the *.vercel.app URL as the canonical site
URL everywhere, and make it a single env var so DNS can be swapped in later without a code
change.

Load these first and use them throughout the build:
  caveman:caveman full
  ponytail:ponytail full

If either fails to load, run /plugin to check whether it is installed, tell me which one is
missing, and carry on. Do not stall the build on a missing plugin, and do not silently
substitute your own approach for one of these without saying so.

Read BUILD-PROMPT.md in full, then read every file in research/ before writing any code.
SETUP-PREFLIGHT.md is already done — credentials, repo, Supabase and Vercel are in place.

Section 0 contains ten founding decisions that are already made and locked. Treat them as
constraints, not suggestions. Where research/ contradicts them, Section 0 wins — the research
predates the decisions.

Section 3.1 defines what you may decide alone and what you must stop for. Follow it exactly.
I will be away from the machine, so a wrong stop costs hours of idle time and a wrong
proceed costs a rebuild. When genuinely unsure which applies, park it and continue.

Do WAVE 0 first and wait for my approval of PLAN.md. After I approve, run Waves 1 through 5
without checking in, except where Section 3.1 says to stop.
```

**On the two plugins.** `caveman:caveman` and `ponytail:ponytail` are invoked above at Claude Code's
request. They are not visible in every Claude environment, so Wave 0 should confirm both loaded and
say so in `PLAN.md`. Nothing in the wave plan below depends on either one — if they are absent, the
build still runs end to end.

---

# 0. Decisions — locked

These are settled. Build to them.

| # | Decision | Consequence for the build |
|---|---|---|
| 1 | **Curated shop, not a marketplace.** MUD chooses every product. | One branded storefront. No seller accounts, no seller onboarding, no commission logic, no per-seller storefronts. Makers are partners behind the product, surfaced editorially. |
| 2 | **Promise: every object shows who made it and where it came from.** | The provenance form is a hard gate on publish. A product with no maker, community, material and technique cannot go live. Enforce in the DB, not just the form. |
| 3 | **Wholesale — MUD buys from makers up front and owns the stock.** | **No maker earnings ledger. No payout runs. No consignment settlement.** This removes the single hardest missing subsystem identified in report 07. Maker becomes an attribution relationship plus a `stock_intake` record. MUD carries inventory risk. |
| 4 | **Named makers, with real names and photos, under written consent.** | `consent_records` is required, dated and revocable. Maker profile pages carry names, portraits and quotes. Product cards can show the maker name, not just the community. Revoking consent must degrade a live page gracefully to community-level attribution — build that path, don't bolt it on. |
| 5 | **COD at launch, gated by phone confirmation.** | OTP or WhatsApp confirmation before an order becomes dispatchable. Refusal history, blocklist and an order-value ceiling. |
| 6 | **No corporate or festival gifting at launch.** | Drop `/bulk-orders` lead capture, gift-box bundles and corporate invoicing from launch scope. **But see decision 9** — diaspora gifting still requires gift notes and a separate recipient address. Do not conflate the two and delete both. |
| 7 | **Journal ships with 8–10 stories and publishes monthly.** | Journal earns its primary-nav slot. Every journal post carries a product rail. The publishing cadence is also now load-bearing for photography — see §9.2. |
| 8 | **No professional photo shoot budget.** | The design system shifts to typography-led. T2's lifestyle bands are cut entirely. Higgins Field background and ground-normalisation work on real Instagram photography becomes the primary route to a consistent catalogue, not a nice-to-have. See §4 and §9. |
| 9 | **Nepal-only delivery, plus a "send a gift home" flow for the diaspora.** | One currency, one country, no export logistics, no international card rails at launch. The gift flow needs: gift note, recipient address distinct from billing, and tracking visible to both payer and recipient. |
| 10 | **English only, built for Nepali later.** | All user-facing strings extracted from day one. No hardcoded copy in components. No half-translated surfaces. |

**Closed as a consequence, do not ask:** makers do not get logins (there are no earnings to view under wholesale). Maker attribution attaches at the **stock intake batch**, denormalized onto the product for display — this is both honest for handcraft and cheap, because buying up front already creates an intake event to hang it on.

---

# 1. What we are building

**MUD Naturals** — a purpose-driven concept store selling natural products, traditional crafts,
food and everyday goods from independent Nepali makers and communities. Single store, single
currency (NPR), Nepal market, launching with roughly 40 SKUs.

The commercial premise is **"objects with origins"**: every product carries verifiable provenance
— maker → community → material → technique → labour hours — rendered as *product architecture*,
not About-page copy. Nobody in Nepal currently combines curated contemporary homeware + modern
Nepali checkout (eSewa/Khalti/COD) + named-maker provenance at SKU level. That vacancy is the
entire business case.

Full context: `research/BUSINESS-MODEL.md` and `research/RESEARCH-PACKAGE.md` (executive
synthesis, cites every other report).

## 1.1 Definition of done

The build is complete when **all** of these are true. Treat this as the acceptance test.

**Storefront**
- [ ] A customer on a mid-tier Android phone inside the Instagram in-app browser can land on a
      product, add to cart, check out as a guest, pay via eSewa, and reach a thank-you page whose
      state is read from the database — never from the query string.
- [ ] The same journey completes with COD, gated behind phone OTP before the order is dispatchable.
- [ ] A customer who closes the tab mid-payment still ends up with a correct order: the
      reconciliation cron resolves it within 10 minutes and they can retry in one tap without
      losing the cart.
- [ ] Every product page reaches its maker in one click; every maker page reaches products in one
      click. No leaf nodes anywhere in the IA.
- [ ] LCP under 2s on mid-tier Android over 4G.
- [ ] Keyboard-operable end to end, with visible focus, semantic landmarks and a skip link.

**Admin / CMS**
- [ ] Staff can onboard a community and a maker, record dated consent for name/photo/quote, and
      publish a product — where the provenance form is *required* before publish.
- [ ] Image upload works from every admin surface that needs it: product images, maker portraits,
      community covers, CMS page blocks, journal posts. (This is currently broken in the reference
      project — see §7.)
- [ ] Staff can create a draft order from an Instagram DM and send a payment link or set it COD.
- [ ] The eSewa reconciliation queue and the COD confirmation queue are both real working screens.
- [ ] Impact rollups (units and earnings per maker/community) render from materialized views and
      export to the annual Impact Report shape in `BUSINESS-MODEL.md` §8.

**Platform**
- [ ] Deployed on Vercel against Supabase, with crons running and env vars set.
- [ ] `supabase db lint` and the Supabase security advisor are clean.
- [ ] Anon-key smoke test proves no table leaks (see §8).
- [ ] Tests exist and pass for the payment state machine and the RLS policies, at minimum.

---

# 2. Ground rules

1. **Read the research before coding.** It contains verified API facts, a catalogued list of
   defects in the reference codebase, and decisions already made. Re-deriving them wastes the
   budget the research already spent.
2. **Prevention in Postgres, not in application-code discipline.** Every invariant that *can* be a
   constraint, trigger or partial unique index *must* be. The reference project has exactly one
   CHECK constraint in 56 tables and it shows.
3. **`withTx(fn)` at the route/action boundary only.** Every module function signature is
   `(tx, ...)`. Never call a transaction-opening function from inside a transaction. This single
   rule prevents four of the five critical defects found in the reference.
4. **Single store.** No tenancy column, no `withTenant`, no `store_id`. Dropping multi-tenancy is
   the largest simplification available and removes the coupling that caused those defects.
5. **Server Actions only** for mutations. Do not build a parallel REST admin API. Two mutation
   paths means two places to get authorization right.
6. **Money is integer paisa.** Never float. Never numeric mixed with an API returning `100.0`.
7. **Ask rather than assume on anything in `BLOCKERS.md`.**

---

# 3. Wave plan

## 3.1 Autonomy rules — unattended operation

The operator is away from the machine. A wrong stop wastes hours of idle time; a wrong proceed
wastes a rebuild. These rules decide which is which.

### Decide alone and keep going

Library choices, file and module layout, naming, component structure, test structure, migration
ordering, commit granularity, styling within the §4 system, copy drafts within the §4.1 register,
retry and backoff values, index choices, error message wording, seed data, anything reversible by a
later commit.

### Park it and keep going — the default when blocked

**Never stop for a missing decision.** Instead:

1. Append the question to `QUESTIONS.md` with the exact context and what each answer would change.
2. Pick the most conservative option and implement behind a feature flag, defaulted **off**.
3. Build everything around it so answering later is a config change, not a rewrite.
4. Note it in the wave report.

Applies to all six open questions in §10, and to anything similar that surfaces. Concretely: if the
per-product maker share is unknown, build the PDP impact module reading from a config value and
ship it with the module hidden. If DFTQC requirements are unknown, build the food category with
labelling fields present and the category unpublished.

### Stop and wait — only these

- **Money.** Any paid plan, paid API, paid font licence, domain purchase or anything with a
  recurring charge. Vercel Pro is already handled in pre-flight; anything beyond it stops.
- **Credentials.** Any OAuth screen, any account creation, anything needing a login you do not have.
  Never invent, guess or place a support request on the operator's behalf.
- **Destructive actions.** Dropping a table with data, force-pushing, rewriting published history,
  deleting anything outside the repo, or any write to a directory above the project root.
- **Production cutover.** Switching eSewa from UAT to production credentials, or anything that could
  take real money from a real customer. **Deploying to the `*.vercel.app` URL is not a cutover —
  do it freely and often.** Custom domains and DNS are explicitly out of scope: do not buy a
  domain, do not add one in Vercel, and do not treat their absence as a blocker.
- **Anything touching `environments/`** beyond reading it once to populate `.env.local`. Never
  commit it, never copy its contents into source or docs, never print a secret to a log or a report.
- **A locked decision in §0 appears to be wrong.** Do not quietly reinterpret it. Write it up in
  `QUESTIONS.md`, implement §0 as written, and flag it in the wave report.

### Report as you go

Write `WAVE-N-REPORT.md` after every wave: what shipped, what got parked and why, what failed, what
the next wave assumes. This is the operator's only view of an unattended run — write it for someone
returning after eight hours with no memory of the session.

If a wave cannot complete, do not idle. Move to whatever work in later waves does not depend on the
blockage, and record the reordering.

---

## 3.2 Waves

Dispatch subagents in parallel **within** a wave, never across waves. **Maximum 10 concurrent
agents; 6–8 is the practical sweet spot.** Each agent gets: its section of this document, the
relevant research files, and an explicit list of files it owns. Two agents must never own the
same file.

After every wave: run the test suite, run `supabase db lint`, commit, and write a short
`WAVE-N-REPORT.md` before starting the next.

### Wave 0 — Recon and planning (sequential, no subagents)

0. Confirm `caveman:caveman full` and `ponytail:ponytail full` loaded. Record in `PLAN.md` which
   loaded, which did not, and what each contributes to the waves below. If one is missing, say so
   and proceed.
1. Read all of `research/`.
2. Read `design/Home.dc.html` and `design/support.js` — the exported Claude Design homepage. Treat
   it as the **visual reference for the homepage**, not as production code to ship. Extract from it:
   the type scale, spacing rhythm, colour values, section sequence and component shapes. Rebuild
   those as React components inside the §4 system. Reconcile any conflict in favour of §4 — the
   design was made before decision 8 removed the photography budget, so any lifestyle-photo-led
   band in it needs replacing with the typographic and ledger patterns in §4. Record every
   divergence in `PLAN.md`.
3. Read the reference codebase at `C:\Users\Diwakar.Adhikari01\Desktop\ecommerce`. Confirm the
   exact file paths named in §6 still exist and still contain what report 11 says they contain.
   `CLAUDE.md` in that repo is stale and claims the project is greenfield — ignore it. `UI-PAGES.md`
   and `SUPABASE-MIGRATION.md` are accurate.
4. Inventory the `screenshots/` folder: which SKUs are represented, resolution, background type,
   whether each is usable as a real PDP image after cleanup.
5. Verify empirically, in the eSewa UAT sandbox, on day one:
   - whether the UAT secret key has the trailing `(` (the two doc pages disagree),
   - what the failure-URL redirect actually carries (undocumented),
   - whether the status API returns thousands separators on a >Rs 1000 transaction,
   - how soon after `COMPLETE` the status API is queryable, and whether `NOT_FOUND` can appear
     transiently for a completed payment.
6. Output `PLAN.md` and `QUESTIONS.md`. **Stop and wait for approval — this is the one planned
   pause in the run.**

### Wave 1 — Foundation (sequential; schema is the spine)

Repo scaffold (Next.js 15, TypeScript, Tailwind) → Supabase project → migrations → seed.

**Migration 001 must be the data-API hardening**, before any table exists:
`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;` plus the same for sequences
and functions, plus `ALTER DEFAULT PRIVILEGES`. Then grant deliberately, table by table. The
reference project shipped to production with all 56 tables readable by the anon key — including
`users.password_hash` and live session tokens. Do not inherit that.

Then the schema (§5), RLS policies in the *same migration* as each `CREATE TABLE`, the
`place_order()` / `confirm_payment()` function family, and seed data.

### Wave 2 — Core build (parallel, 8 agents)

| Agent | Owns |
|---|---|
| A | Design system: tokens, typography, layout primitives, motion budget (§4) |
| B | Storefront shell, nav, footer, routing, error/loading/not-found boundaries |
| C | PDP including the origin-trace strip, gallery, sticky mobile add-to-cart |
| D | `/shop` PLP, `pg_trgm` search, filters, zero-results merchandising |
| E | Cart, mini-cart, guest accordion checkout, address model |
| F | eSewa integration, payment attempts, reconciliation cron, COD flow (§6) |
| G | Admin: makers, communities, consent records, provenance intake |
| H | Admin: orders, COD ops queue, reconciliation queue, draft orders |

### Wave 3 — Story and ops surfaces (parallel, 6 agents)

CMS port + **upload bug fixes (§7)** · maker/craft/journal pages with product rails ·
impact materialized views + report export · transactional messaging (`wa.me` + email) ·
tokenized reviews (no login) · SEO, structured data, sitemaps.

### Wave 4 — Hardening (parallel, 4 agents)

Tests (payment state machine and RLS policies first) · accessibility pass · performance budget ·
security review against §8.

### Wave 5 — Deploy (sequential)

Vercel deploys are driven by GitHub: pushing to `main` ships to production, pull requests get
preview URLs. Do not deploy via CLI credentials.

Verify `vercel.json` cron config, confirm Node runtime on every crypto path (signing must not run
on Edge), confirm all env vars resolve in the Vercel environment, run the smoke tests in §1.1
against the deployed `*.vercel.app` URL, and write the ops runbook. No custom domain.

**Media track** — runs alongside Waves 2–3, one agent, see §9.

---

# 4. Design direction

Territory **T1 "Catalogue of Origins"** — museum catalogue meets field notebook. Full rationale
and the two rejected alternatives are in `research/RESEARCH-PACKAGE.md` §20–21 and
`research/09-design-inspiration.md`.

**Adjusted for decision 8 (no shoot budget).** The research recommended T1 *borrowing T2's in-situ
lifestyle photography*. That borrowing is now cut — T2 was explicitly the territory that does not
degrade gracefully on a small photo budget, and there is no budget. Instead:

- **Lean harder on the mono spec layer.** It was already T1's signature; with modest photography it
  becomes the primary carrier of premium feel. Provenance data rendered as specimen labels does
  work that photography would otherwise do.
- **Adopt T3's tabular ledger view** as an alternate catalogue display on `/shop` — every object has
  a record, provenance as data. It is the pattern that survives inconsistent photography best, and
  it is cheap to build.
- **Adopt T3's material macros as section dividers.** Close-up texture is forgiving of phone-camera
  origins in a way that a wide lifestyle scene is not.
- **Uniform grounds, ruthlessly.** Every object shot sits on the same warm paper ground with a
  consistent shadow. Consistency across 40 SKUs reads as more considered than variety across 40.
  This is what the Higgins Field work in §9 is for.
- **Do not swap wholesale to T3.** T3's stated risk is a warmth deficit that reads imported and
  cold for a community brand. Decision 4 supplies the warmth instead — named makers, real faces,
  real quotes. Keep T1's serif voice; borrow T3's patterns, not its personality.

- **Colour.** Paper `#F7F4EE`, ink `#1C1A17`, clay-ochre accent on 5% of surface maximum. All
  other colour comes from photography. Withheld colour is what reads as premium.
- **Type.** Voiced display serif + neutral grotesk text + **mono for every piece of provenance and
  spec data**. The mono specimen-label register is the signature — it is what breaks the
  AI-default cream-serif cliché. Licensed route: GT Alpina / Suisse Int'l / Diatype Mono. Open
  route: EB Garamond + Inter (tightened tracking) + Geist Mono. The open route needs harder custom
  tracking and scale work to escape looking default.
- **Layout.** 12-col, asymmetric 5/7 editorial bands, hairline rules like a printed catalogue,
  ≥120px section air, 3-column grids maximum, 4:5 object images.
- **Motion budget.** One fade + 8px rise on scroll-in. Hover crossfade to an alternate shot.
  Nothing else. Respect `prefers-reduced-motion`.
- **Product card.** Image → mono provenance line (maker · district) → serif name → price.
- **No dark mode** on the storefront v1. It is a print-like single theme.

## 4.1 Copy register — enforced

**Banned vocabulary.** help · support · give back · empower · uplift · underprivileged ·
change lives · every purchase changes a life · beneficiary. Also banned unqualified:
eco-friendly · green · responsible (unlawful unqualified in the EU from September 2026).

**Correct register:** verbs of making, never verbs of helping. Makers are partners and producers.
"We work with independent makers and producers to bring their skills, stories and products to
wider markets."

**Impact framing.** Impact is the reason the product is good, not the reason to forgive it. Never
lead with 80/20 — Mahaguthi publicly claims 68% of sales revenue returns to artisans, and "20% of
profit" loses that comparison badly. Two layers, in this order: (1) the trade itself — what MUD
pays makers, published per product or category; (2) the Impact Fund on top. One hero number per
product, with its boundary visible.

## 4.2 Anti-patterns — do not build

Generic Shopify template (4-across grids, promo bars, badge sprays, testimonial sliders) · NGO
aesthetics (sage + kraft, leaf and sun-arc icons, rounded humanist sans, smiling-beneficiary
heroes, donate-button styling, progress bars, "% of proceeds" as headline) · fake cultural
tokenism (prayer-flag palettes, Buddha/khukuri/singing-bowl iconography, felt-craft cuteness —
Nepal's most crowded category) · giant mission statement before products · guilt-based
sustainability copy · marketplace tropes (seller ratings, unexplained "verified" ticks) ·
cluttered treasure-trove abundance · makers as marketing props (uncaptioned faces, no consent
policy) · trend devices (WebGL heroes, scroll-jacking, cursor followers, marquees, noise overlays).

---

# 5. Information architecture and schema

## 5.1 Navigation and routes

Primary nav is five items plus utilities: **Shop ▾ · Collections ▾ · Makers · Journal ·
Our Story ▾**, with search, account and cart. Impact is page-tier plus a PDP module plus a footer
band — never nav-tier.

```
/                      /shop                  /shop/[category]
/products/[slug]       FLAT — never nested under category
/collections           /collections/[slug]
/makers                /makers/[slug]
/craft                 /craft/[slug]
/journal               /journal/[slug]
/impact                /about                 /bulk-orders
```

**Governing rule:** make story surfaces shoppable, never make the shop storyish. Every maker,
craft and journal page carries a product rail. Every page reaches a product in ≤1 click; every
product reaches its story in ≤1 click.

Category and collection are different things: category is the breadcrumb parent; collection is
curated, many-to-many, manually sorted, and never appears in a breadcrumb.

> **Correct before building:** `research/10-information-architecture.md` illustrates the nav with
> Indian craft vocabulary (Sabai Grass, Kauna Reed, Odisha) carried over from the India-context
> report. The market resolved to **Nepal**. Use Nepali vocabulary throughout: sikki grass, allo,
> lokta, dhakiya, feruwa, deluwa, and Nepali districts.

## 5.2 Schema — roughly 20–25 tables

Relationship spine: **Product → Maker → Community → District; Product → Materials → Technique;
Product → Story; order_items → maker_id (denormalized) → impact views.**

`products` · `product_variants` · `product_images` · `categories` (flat taxonomy) · `collections`
(many-to-many, manual sort) · `makers` · `communities` · `materials` · `craft_techniques` ·
`content_pages` + `content_versions` · `orders` · `order_items` · `payment_attempts` ·
`payment_events` · `refunds` · `shipments` · `customers` · `reviews` · `coupons` +
`coupon_redemptions` · `stock_ledger` + `stock_levels` · `stock_intake` · `consent_records` ·
`audit_log`.

**`stock_intake` is the maker-economics answer under wholesale (decision 3).** Each intake row
records: maker, community, product/variant, quantity, unit cost paid, date, and optionally a batch
reference. It is the purchase event, the provenance anchor and the attribution source, all in one
cheap table. `products.maker_id` is a denormalized display convenience derived from it. There is no
earnings ledger, no payout run and no settlement logic — MUD pays on delivery of stock and owns it
from that moment.

**Gift fields (decision 9).** `orders` needs an optional gift note and a recipient address distinct
from the payer's address, plus tracking visible to both parties. This survives decision 6 —
corporate gifting is cut, diaspora gifting is not.

One controlled vocabulary (material / technique / region / maker / use) tagged across products,
makers, journal posts and collections. It powers both the discovery graph and the SEO surface.

**Identity.** One identity column, one meaning, FK-enforced everywhere. The reference project
writes `users.id` into a column with an FK to `customers.id`, which breaks every authenticated
checkout — guest checkout works, so it hides in demo data. Single store means orders can hang off
`auth.users` plus an email snapshot; drop `customers` if that holds. Split staff auth from
customer auth outright.

**Address model is Nepali, not Western.** Province / district / municipality-ward / tole /
landmark. Phone is mandatory. The address is snapshotted immutably onto the order.

**Constraints to write on day one:** `total_paisa > 0` · `qty > 0` on order_items ·
`on_hand >= 0` · `reserved >= 0` · `reserved <= on_hand` · `currency = 'NPR'` ·
`email <> ''` · percent discounts between 0 and 100. Index every FK, starting with
`order_items.order_id` — report 11 calls it the single highest-value line of SQL that was never
written in the reference.

---

# 6. Payments — the load-bearing risk

Read `research/06-esewa-payments.md` in full before touching this. It contains verified endpoints,
the exact signature format, the full status enum and a 14-row failure catalogue.

**The one fact that shapes everything:** eSewa ePay v2 has **no reliable server-to-server
notification.** The Epay-V2 page mentions IPN in a single sentence with no payload spec, no
registration mechanism and no signature format. The browser redirect plus your own polling of the
status API is the entire notification surface.

**Therefore: the reconciliation cron is the primary confirmation channel, not a safety net.**
Vercel Cron every 2–5 minutes, polling the status API for every attempt in `initiated`/`pending`
created in the last N hours, with per-attempt exponential backoff.

Non-negotiables:

1. **The redirect is never proof of payment.** Verify the HMAC, then *regardless of what the
   payload says*, call the status API with your **stored** `transaction_uuid` and `total_amount`.
   Signature verification proves eSewa authored some payload; only the status call proves this
   transaction is complete for this amount right now.
2. **One order → N `payment_attempts`.** `transaction_uuid` is the attempt UUID, never the order
   id — eSewa requires per-request uniqueness and a customer who fails and retries needs a fresh
   one. Partial unique index enforces at most one `succeeded` attempt per order.
3. **The server computes the amount** from the products table. The client never supplies one.
   Snapshot the priced lines onto the attempt and verify against the snapshot — never re-derive at
   confirmation time. Re-pricing at callback time strands captured payments when a price or promo
   changes mid-flight.
4. **`AMBIGUOUS` routes to a manual-review queue.** Never auto-transition. Keep re-polling.
5. **`NOT_FOUND` only becomes `expired`** when it persists *and* `now() > expires_at`.
6. **Never fail a customer to `failed` on a network error.** Mark `verification_pending`, show
   "we're confirming your payment", let the cron resolve it.
7. **Refunds are manual.** No refund API is documented; third-party blogs claiming otherwise are
   unsourced SEO content. The operator acts in the merchant portal and records the reference; the
   cron detects the status flipping to `*_REFUND`.
8. **One `SECURITY DEFINER` function, `confirm_payment()`**, does `SELECT ... FOR UPDATE` on the
   order, asserts the amount, flips both rows and writes the audit event. Both the return handler
   and the cron call it. Concurrency and idempotency live in exactly one place.
9. **Signing happens on the server, Node runtime** (`node:crypto`), not Edge. The secret never
   reaches the browser.
10. **COD shares the orders table.** `payment_method='cod'` skips attempts entirely:
    `confirmed-unpaid → out for delivery → collected` / `refused-return-to-origin`. Add phone OTP
    before dispatch, a per-customer refusal history, a blocklist and an order-value ceiling. COD is
    roughly 80% of Nepali ecommerce payments — offer it, but gate it.

---

# 7. Porting from the reference codebase, and the CMS bugs

## 7.1 Port these four verbatim

1. **DB-enforced order state machine** — `src/db/migrations/0018_state_machine.sql`. Explicit
   transition map, same-status no-op, trigger as the real authority.
2. **Append-only stock ledger + trigger-materialized levels** —
   `src/db/migrations/0010_inventory_triggers.sql`.
3. **CMS draft/publish pointer swap** — `content_pages` / `content_versions`.
4. **Order and address snapshotting** — `src/modules/checkout/orders.ts:159-231` plus the JSONB
   addresses. Product edits must never mutate order history.

Also port as *patterns*: raw-body-first webhook verification, RFC 7807 `problem()` errors with
per-domain mappers, the sliding-window rate limiter, server-authoritative pricing.

## 7.2 Do not port

Multi-tenancy and `withTenant` · the dual REST + Server Actions surface · purchase orders,
suppliers, stock batches, multi-location · the webhooks subscription subsystem · Prometheus
middleware · the attributes/facet registry · the SVG sprite builder · Razorpay and Stripe.

## 7.3 Five defects to understand, then never reproduce

Read `research/11-ecommerce-deep-audit.md` §1 for the full analysis with line numbers.

- **C1** — wrong entity in `orders.customer_id`; every authenticated checkout fails at insert.
- **C2** — a failed webhook can never be retried; the dedupe key swallows it permanently. Dedupe on
  `(event_id, processed = true)`, not `event_id` alone.
- **C3** — inventory commit escapes the order transaction, leaving permanently stuck stock.
- **C4** — nested `withTenant` is not a savepoint; it takes a second pool connection, and the pool
  deadlocks at about four concurrent webhooks. The code comment asserting it is safe is wrong.
- **C5** — the idempotency wrapper checks-then-sets, so two concurrent requests both execute. Set
  `"in-flight" NX EX 60` *first*, then 409 or poll.

## 7.4 The CMS upload bug — diagnostic order

You reported that image upload fails on CMS pages. Report 07 rates the asset pipeline (assets
library, signed direct upload, derivatives) as sound, which means the fault is most likely
configuration or authorization rather than the upload logic itself. Work through these in order
before rewriting anything:

1. **Storage bucket policies.** Two buckets: public `product-images`, and a private bucket with
   per-user paths and signed URLs. Confirm both exist and that the insert policy actually grants
   the uploading role.
2. **The hardening migration.** If `harden-data-api.sql` was applied, it revoked `anon` and
   `authenticated` broadly — which will silently break any upload path that was relying on those
   default grants. This is the most likely single cause.
3. **Key mismatch on the signed-upload route** — anon key used where the service role is required,
   or the reverse.
4. **Content-addressed key collisions** — the reference derives storage keys from content hashes.
   Re-uploading an identical file may collide.
5. **The derivatives job.** The BullMQ image-derivative worker is listed among stub handlers.
   Upload may be succeeding while post-processing fails, presenting as a broken upload.
6. **Missing bucket entirely** in the live Supabase project.

Report the actual root cause in `WAVE-3-REPORT.md` rather than only that it now works.

---

# 8. Security — adopt as PR rules

- RLS enabled with a policy in the **same migration** as every `CREATE TABLE`.
- Baseline `REVOKE ALL FROM anon` first, then grant deliberately.
- Roles come from `app_metadata` or a user-unwritable column. **Never `user_metadata`.**
- Views declared `security_invoker = on`.
- Functions `SET search_path = ''` with explicit EXECUTE grants.
- Service-role key and eSewa secret behind `import 'server-only'`, plus a CI grep for
  `NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE|ESEWA)`.
- `getUser()` / `getClaims()` for authorization. **Never `getSession()`.**
- Guest order lookup goes through a high-entropy token via a definer RPC. Order numbers must not
  be sequential and guessable, and the lookup route needs a rate limit.
- Supabase security advisor plus `db lint` before every deploy.

**Anon-key smoke test, required before launch.** With only the publishable key, attempt to read
every table. Anything that returns rows it shouldn't is a launch blocker. The reference project
shipped with `GET /rest/v1/users` returning email addresses and password hashes.

---

# 9. Media — Higgins Field scope and limits

## 9.1 The rule

**PDP images of real SKUs must be real photographs of those objects.** This brand's entire premise
is verifiable provenance. A synthesised hero image for a basket a customer can hold is a
credibility failure that one reverse-image search turns into a public one — and it would undercut
the same honesty register that bans "eco-friendly" as an unqualified claim.

**Legitimate uses of generation:**
- Background cleanup, shadow correction and scene extension on your **real** Instagram screenshots.
  The object stays the photographed object.
- Editorial and journal artwork, category headers, atmospheric bands.
- Material and texture macros used as dividers.
- Moodboards and art-direction references to brief the real photo shoot.

**Not legitimate:** generating an object you sell but have not photographed, or generating a maker,
a pair of hands, or a workshop and presenting it as documentary.

**Maker portraits, given no shoot budget.** Decision 4 requires real names and faces; decision 8
removes the shoot. These are reconcilable, and the resolution is operational rather than technical:
decision 7 commits the team to a maker visit roughly monthly for the journal. **Those visits are
the photo shoot.** A phone camera in good daylight, shooting the three registers — object, hands
mid-process, place — produces the portraits, the process shots and the journal art in the same
trip. Build the admin so a maker profile can ship with community-level attribution and no portrait,
then gain its portrait later without a migration. Do not generate a face to fill the gap.

Where a real photograph has been AI-retouched beyond colour and crop, disclose it in the image
metadata and in the site's photography note. That disclosure is cheap, and it is the same
"publish limitations" instinct the business model already applies to the Impact Fund numbers.

## 9.2 Shot system

Three registers, per report 09: **object** on a warm ground with a real shadow · **hands
mid-process** · **place**. Cards are 4:5. Makers photographed at eye level, named, consented.
Never poverty-porn compositions.

## 9.3 Working method

1. Inventory `screenshots/`, map each file to its SKU, grade it usable / needs-cleanup / needs-reshoot.
2. For usable and needs-cleanup: run Higgins Field background and scene work, keeping the object.
3. For needs-reshoot: generate a moodboard and a written shot brief. Do not fabricate the product.
4. For editorial and category art: generate freely within the T1 palette — paper ground, ink,
   restrained ochre, no saturated colour outside photography.
5. Every generated asset gets recorded in the assets table with `origin = 'generated'` or
   `'photograph'` and, where applicable, `'photograph-retouched'`.

---

# 10. Blockers to surface in Wave 0

Section 0 closed seven of the original thirteen. Six remain. None of them block the schema, so
Wave 1 can proceed while they are being answered — but all six block launch.

1. **The per-product maker share.** Layer 1 of the impact story and the number that competes with
   Mahaguthi's public 68% claim. Website copy and the PDP impact module cannot be finalised without
   it. Under wholesale this is computable — it is unit cost paid to the maker over retail price —
   so it may simply need publishing rather than deciding.
2. **The Impact Fund formula.** `BUSINESS-MODEL.md` recommends "greater of 20% of net profit or 1%
   of revenue." Confirm in writing before any public claim renders.
3. **Launch SKU list and category scope.** See the frequency note below — this one has become more
   consequential since decision 6.
4. **DFTQC food labelling and registration** requirements, before any tea, honey or candy is
   listed.
5. **Was `harden-data-api.sql` ever applied** to the reference's live Supabase project? Verify with
   the anon key before reusing anything from it, including the project itself.
6. **eSewa merchant support questions.** Does ePay v2 deliver a registerable IPN with a payload
   spec? Does a refund API exist? Is the Intent flow viable for desktop web? Intent has a
   documented server-to-server callback and materially better failure semantics — worth one email
   before committing to ePay v2.

## 10.1 One consequence of decision 6 to raise with the team

Cutting corporate and festival gifting at launch is defensible on operational grounds, but it
removes what the research called the volume category — and gifting was the specific answer to
curated craft's structural weakness, which is low purchase frequency. Craft & Home carries margin
and identity, but people buy a basket once.

With gifting deferred, **the frequency engine has to be Food & Pantry and Natural Care** — the
Rs 300–1,500 repeat-purchase categories. If those are not live at launch because supply is not
ready, MUD launches with no repeat-purchase mechanism at all, and every month's revenue depends on
new customer acquisition.

This is not an argument to reverse decision 6. It is an argument that blocker 3 above is more
urgent than it looks, and that DFTQC compliance (blocker 4) sits directly on the critical path
rather than off to one side.