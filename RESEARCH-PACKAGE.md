# MUD Naturals — Research Package
### Deep research & design intelligence for the Claude Design prompt and the Opus build

**How to read this.** This is the executive synthesis layer. Full evidence, sources and per-topic detail live in `research/01–14`; each section below cites its source report. Evidence discipline throughout: **[E]** evidence · **[SI]** strong inference · **[R]** recommendation · **[OQ]** open question.

**Coverage note.** 14 of 15 research streams completed. The "premium natural-living ecommerce site teardowns" stream (report 01) was stopped mid-run; its territory is substantially covered by reports 02 (artisan marketplace UX) and 09 (design inspiration), but direct PDP teardowns of The Citizenry-class sites remain thinner than planned.

---

## 1. Executive summary

MUD Naturals should be built as a **curated social-commerce brand** (not a marketplace), positioned as **"objects with origins"** — Nepal's craft house where every product carries verifiable provenance (maker → community → material → technique), rendered as product architecture rather than About-page copy.

The market case: Nepal's craft commerce splits into a fair-trade institutional cohort (real impact, 2014-era digital), a contemporary founder-scale cohort (design, no provenance structure, no local checkout at scale), and horizontal marketplaces (breadth, no curation). **Nobody combines curated contemporary homeware + modern Nepali checkout (eSewa/Khalti/COD) + named-maker provenance at SKU level** [E, three independent research streams]. The gap is execution-shaped: every component is individually proven locally (Mheecha holds Rs 1,550–3,750 domestically; Aji's proves the maker story; Timro/Local Project prove curation; ACP/Dhukuti proves >$1M turnover).

The build case: the reference `ecommerce` codebase is a cautionary tale plus a parts bin. Port four production-grade subsystems (order state machine, stock ledger, CMS draft/publish, snapshotting); greenfield the rest at ~20–25 tables, single-store, with correctness pushed into Postgres constraints. eSewa ePay v2 has **no reliable server-to-server notification** — a reconciliation cron polling the status API is load-bearing, not optional.

The design case: warm editorial minimalism with a provenance/spec register (serif + grotesk + mono) has **zero occupancy in Nepal** and strong global precedent. Recommended territory: **"Catalogue of Origins"** (§21).

---

## 2. Competitive / reference landscape

**Global references** (report 09, 02): The Citizenry (origin-as-nav-axis, workshop pages, "made the long way" scarcity framing), Ferm Living (Canela + KH Teka, photo-first), Monocle Shop (maker-credit above product name), Carl Hansen (catalogue-object naming), Aesop (two-face discipline, 15-year durability), Flamingo Estate (premium nature brand with edge), Nkuku/TOAST (craft storytelling on-domain), Baba Tree (named-weaver attribution — closest structural analogue, needs unfiltered verification).

**Nepal landscape** (reports 12, 13, 13a) — position map:

| Position | Owners | State |
|---|---|---|
| Fair-trade heritage | Mahaguthi, Sana Hastakala, ACP/Dhukuti, WSDO, Knotcraft | Real impact + supply moats; digital brochureware; accessible pricing |
| Tourist retail | Thamel/Lakeside | Shrinking, price-deflating [E: spend down to $33/day] |
| Contemporary design-led | Kolpa, Mheecha, Aji's, Né, Timro, Local Project, Dinadi | Credible, founder-scale, weak/absent online checkout |
| Marketplaces | Saino, Swodeshi, Himali Green | Infrastructure without curation; Swodeshi confirmed on eSewa+Khalti+COD |
| Corporate gifting | Giftmandu | Banks/IT buy annually; product is chocolate — craft-grade lane open |
| **Premium provenance-led craft ecommerce** | **Vacant** | The target position |

## 3. Gallery inspiration keywords

SaaSpo itself: **skip** — SaaS-native taxonomy, wrong corpus [E]. Use **MaxiBestOf** (typefaces listed per site), siteinspire (E-Commerce × Minimal/Typographic), Typewolf, Fonts In Use, Minimal Gallery, recent.design. Search strings: `editorial commerce · warm minimal · craft · artisan · handwoven · homeware · ceramics · provenance · organic minimal · serif ecommerce · type-led commerce · magazine layout ecommerce · product storytelling · maker profile · Japandi · wabi sabi · natural materials · asymmetric grid · photography-led · journal commerce · Canela · GT Alpina · Suisse Int'l · Diatype` (full list: report 09 §4).

## 4. Visual inspiration patterns

(report 09) Premium = **withheld** color (palette lives in photography); texture via photography never CSS; three-register photo system (object / hands-process / place); 3-col max grids, 4:5 object images; asymmetric 5/7 editorial splits earned by content; motion budget = one scroll-in fade + hover crossfade, nothing else; dominant premium type system = **one voiced serif + one neutral grotesk (+ mono for specs)** — verified by production-count evidence, not trend reads.

## 5. Ecommerce UX patterns

(report 03 — Baymard/NN-g grounded; highlights)
- Guest checkout default and visually dominant; account offered post-purchase (18% abandon over forced accounts) [E]
- Total cost incl. shipping on PDP, mini-cart, cart, checkout step 1 (surprise cost = #1 abandonment cause, 40%) [E]
- Single-page accordion checkout, 6–8 fields, delivery **dates** not speeds [E]
- PDP: 6+ images incl. in-scale shot; sticky mobile add-to-cart; button variants with fully synchronized data [E]
- Search: `pg_trgm` typo-tolerant autocomplete with thumbnails; zero-results page merchandises, never dead-ends [E]
- Filters: 3–4 facets max at launch, multi-select, counts, chips; facets are a liability below ~50 SKUs [SI]
- Both mini-cart and cart page; local-storage wishlist without login [E/R]
- Skip at launch: algorithmic recommendations, search vendors, loyalty tiers, multi-step wizards [R]

## 6. Artisan storytelling patterns

(report 02) High-value: named material provenance; process-with-numbers ("8 steps, a day per basket" — labour-time is the most legible price justification); story surfaced early (67% of DTC users seek non-product content); reviews + community Q&A (biggest category gap); explained certifications. Decorative: GPS-coordinate ornaments, uncaptioned atmospheric portraits, maker names on grid tiles, standalone impact pages with no product path. Structural rules: **community as primary storytelling entity with named voices inside; profiles as schema not essay; bidirectional maker↔product links mandatory; "how this was made" inside the buy column.**

## 7. Social-impact storytelling patterns

(report 04) Core: **impact is the reason the product is good, not the reason to forgive it.** Spec-sheet register; verbs of making, never helping. Banned vocabulary: help, support, give back, empower, uplift, underprivileged, change lives, eco-friendly/green/responsible (the last three unlawful unqualified in EU from Sept 2026). Money-flow reframe (Veja) is the strongest desirability device. One hero number per product with visible boundary; prefer wage/money-flow numbers over carbon. Layered disclosure: provenance chip → PDP panel → methodology archive. In-box artisan card (Obakki). Imagery: hands+tools+material mid-process; makers at eye level, named, consented; never poverty-porn compositions. Cautionary evidence: Everlane, BrewDog, TOMS.

## 8. Nepal consumer considerations

(reports 05, 12) Mobile-first (Instagram in-app browsers, sub-2s LCP on mid-tier Android); **COD ≈ 80% of Nepali ecommerce payments** — offer but gate (prepaid nudge, phone OTP/WhatsApp confirmation before dispatch); wallets = eSewa/Khalti/Fonepay; addressing is landmark-based (province/district/municipality-ward/tole/landmark schema; phone mandatory; address snapshot immutable on order); WhatsApp is the primary transactional channel (`wa.me` at minimum); English-only v1, strings extractable; domestic premium buyer exists but thin (KTM/Lalitpur/Pokhara, Rs 2,000–8,000 proven band); diaspora (2.1M+) is the higher-value pool — start with diaspora→family gifting (domestic fulfilment, no FX problem).

## 9. eSewa / payment architecture risks

(report 06 — full failure catalog there) Non-negotiables:
1. ePay v2 = browser form POST + signed redirect + **status-check API; no documented reliable IPN** → **reconciliation cron (2–10 min) is the primary confirmation channel** [E]
2. Redirect is never proof of payment: HMAC verify + mandatory server-side status call + amount check vs **stored** attempt amount [E/R]
3. One order → N `payment_attempts`; `transaction_uuid` = attempt UUID (eSewa requires per-request uniqueness); partial unique index = one success per order [R]
4. Money as integer paisa; NPR only; parse status API amounts defensively [R]
5. Refunds: assume portal-manual; detect via status flipping to `*_REFUND` [E]
6. `AMBIGUOUS` → manual-review queue, never auto-transition [E]
7. COD shares the orders table, skips attempts, `confirmed-unpaid → collected` states [R]

## 10. Existing ecommerce project audit

(reports 07, 11) 50k LOC, 56 tables, Next.js 15 + Drizzle + Supabase + Razorpay + BullMQ. **Critical defects found:** authenticated checkout structurally broken (`orders.customer_id` FK vs `users.id` mismatch — C1); webhook dedupe permanently swallows failed events (C2); inventory commit escapes the order transaction (C3); nested `withTenant` consumes pool connections → deadlock at ~4 concurrent webhooks (C4); idempotency wrapper doesn't prevent double execution (C5). Plus: one CHECK constraint in the entire DB, `order_items` unindexed, zero error boundaries/Suspense, historical full Data API exposure (password hashes + session tokens readable with anon key — hardening script's application to live project unverified).

**Verdict: port 4, greenfield the rest.** Port verbatim: DB-enforced order state machine (`0018_state_machine.sql`), append-only stock ledger + trigger-materialized levels, CMS draft/publish pointer swap, order/address snapshotting (+ raw-body webhook verification, RFC 7807 errors, rate limiter, server-authoritative pricing as patterns). Remove: multi-tenancy, dual REST+Actions API, PO/supplier/batch inventory suite, webhooks subsystem, Prometheus middleware, attributes registry. Full keep/adapt/rebuild/remove table: report 07 §3.

## 11. CRM recommendations

(report 07) Missing for MUD and must be built: **makers + communities as first-class entities with consent records; maker economics ledger (consignment vs wholesale decision blocks this); provenance capture at product intake; collections with manual sort; draft/manual orders (Instagram-DM entry); transactional messaging (WhatsApp/SMS + email — reference ships none); COD ops states + refusal history; impact rollups as materialized views; customer notes.** Admin = Server Actions only, owner/staff roles, phone-first customer lookup.

## 12. Database / domain-model recommendations

First-class entities: `products`, `product_variants`, `product_images`, `categories` (flat, taxonomy), `collections` (curated, many-to-many, manual sort), `makers`, `communities`, `regions` (or district field), `materials`, `craft_techniques`, `stories/journal` (CMS pages with maker FK), `orders`, `order_items`, `payment_attempts`, `payment_events`, `refunds`, `shipments` (collapsed with fulfillments), `customers` (or auth.users + snapshot), `reviews`, `coupons` + `coupon_redemptions`, `stock_ledger`, `consent_records`, `audit_log`. Relationship spine: **Product → Maker → Community → District; Product → Materials → Technique; Product → Story; order_items → maker_id (denormalized) → impact views.** One controlled vocabulary (material/technique/region/maker/use) tagged across products, makers, journal, collections — powers the discovery graph and SEO. ~20–25 tables total. All mutations to orders/stock/coupons through one `SECURITY DEFINER place_order()`-family; `withTx` at route boundary only, modules take `tx`.

## 13. Security concerns

(report 08 §3 — adopt as PR rules) RLS enabled + policy in the same migration as every CREATE TABLE; baseline `REVOKE ALL FROM anon` then grant deliberately; roles from `app_metadata`/user-unwritable column, never `user_metadata`; views `security_invoker = on`; functions `SET search_path = ''` with explicit EXECUTE grants; two storage buckets (public product-images, private with per-user paths + signed URLs); service-role key and eSewa secret behind `import 'server-only'` + CI grep for `NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE|ESEWA)`; `getUser()`/`getClaims()` never `getSession()` for authz; Supabase security advisor + `db lint` pre-deploy; guest orders via high-entropy lookup token through a definer RPC.

## 14. Performance concerns

Deloitte/Google: 0.1s mobile improvement ≈ +8.4% retail conversion [E]. Budget: sub-2s LCP on mid-tier Android/4G in Instagram's in-app browser. Means: server-rendered/ISR product pages, `next/image` everywhere (reference used raw `<img>` 13×), no auto-carousels, no heavy motion, indexed FKs from day one (`order_items.order_id` first), `pg_trgm` not an external search service.

## 15. SEO requirements

(report 10) Flat `/products/[slug]`; category vs collection separation (category = breadcrumb parent; collection = curated, never breadcrumb); facet URLs noindex+canonical with promoted-facet graduation; journal on main domain (subdomain splits verifiably leak equity); structured data: Product+Offer+AggregateRating, BreadcrumbList, Article+author, Person/Organization on maker pages; craft-vocabulary pages (`/craft/sikki-grass`) target unserved Nepali-craft queries — zero local competitors publish structured craft content [E].

## 16. Accessibility requirements

Semantic landmarks + skip link (reference has none); keyboard-operable everything incl. admin tables (reference rows are keyboard-dead); visible focus states; `aria-live` for cart/form feedback; focus management on view swaps; button variants not `<select>`; form labels + both required and optional marked; contrast maintained on warm-paper grounds; `prefers-reduced-motion` respected; alt text as product data, not afterthought.

## 17. Mobile UX requirements

Single-column checkout, thumb-reach CTAs, `inputmode` per field, sticky add-to-cart bar with price+variant, swipeable gallery with counter, no hover-dependent info, in-app-browser-safe (no popups, no reliance on autofill), COD/wallet choice prominent, WhatsApp deep links.

## 18. Ecommerce failure modes

(report 08 — full checklist) Top-10 for MUD: service-role key in bundle; RLS off/`USING(true)` on a public table; trusting the eSewa redirect; paid-but-unrecorded orders; overselling on a drop (atomic conditional decrement + CHECK); duplicate orders on flaky mobile (idempotency key unique index); no per-attempt payment model; COD abuse (OTP + blocklist + ceiling); public bucket listing; Western address model. Design bias: **prevention in Postgres, not in app-code discipline.**

## 19. MUD anti-patterns

**What MUD must not become** (reports 04, 09, 13, 14): generic Shopify template (4-across grids, promo bars, badge sprays, testimonial sliders); NGO aesthetics (sage+kraft, leaf/sun-arc icons, rounded humanist sans, smiling-beneficiary heroes, donate-button styling, progress-bar goals, gratitude testimonials, "% of proceeds" as headline); fake tribal/cultural tokenism (prayer-flag palettes, Buddha/khukuri/singing-bowl iconography — souvenir-cohort signifiers; felt-craft cuteness — Nepal's most crowded category); giant mission statements before products; guilt-based sustainability copy; marketplace tropes (seller ratings, unexplained "verified" ticks); cluttered "treasure trove" abundance (Dhukuti owns it); decorative storytelling disconnected from purchase (Gaatha's three-domain failure mode); makers as marketing props (uncaptioned faces, beneficiary framing, no consent policy); trend devices (WebGL heroes, scroll-jacking, cursor followers, marquees, noise overlays).

## 20. Three visual territories

### T1 — "Catalogue of Origins" (spec-sheet editorial)
- **Emotion:** precise, honest, quietly confident — museum catalogue meets field notebook.
- **Color:** paper `#F7F4EE`, ink `#1C1A17`, clay-ochre accent ≤5% of surface; all other color from photography.
- **Type:** voiced serif display (GT Alpina/Tobias; budget EB Garamond) + neutral grotesk text (Suisse/Neue Haas; budget Inter tightened) + **mono for all provenance/spec data** (Geist Mono) — the mono specimen-label register is the signature.
- **Photography:** three-register (object on warm ground with real shadow / hands mid-process / place); 4:5 cards.
- **Layout:** 12-col, asymmetric 5/7 editorial bands, hairline rules like a printed catalogue, ≥120px section air.
- **Motion:** fade+8px rise once on scroll; hover crossfade to alternate shot; nothing else.
- **Card:** image → mono provenance line (maker · district) → serif name → price. 3-col max.
- **PDP:** buy column with the **origin-trace strip** (maker → community → material → hours, expandable); below: numbered process steps, care, maker rail.
- **Storytelling:** archive/specimen register; craft vocabulary (sikki, dhakiya, allo) as headings.
- **Why it fits:** it is the "objects with origins" USP made visual; photography-resilient; maximally distinct from both Nepali cohorts and the AI-default cream-serif cluster (the mono/spec layer breaks the cliché); ages best.
- **Risks:** can read cold or academic if process photography under-delivers; mono overuse drifts techy.

### T2 — "Warm Ground" (tactile domestic editorial)
- **Emotion:** warm, intimate, sun-lit Nepali home — objects in use, not on plinths.
- **Color:** unbleached-cotton ground `#F3EDE2`, ink, terracotta, deep soot-brown footer.
- **Type:** humanist old-style serif for display *and* long text (Martina Plantijn/Freight Text); grotesk only for UI; generous scale and leading.
- **Photography:** lifestyle-dominant, in-situ in real homes, morning light; object shots secondary.
- **Layout:** softer rhythm — full-bleed lifestyle bands alternating with 2-col object grids.
- **Card:** in-situ image default, flat-ground on hover (inverse of T1). **PDP:** short narrative intro above the spec block. **Storytelling:** maker's-note first person, quotes.
- **Why it fits:** strongest emotional warmth; matches "everyday objects for Nepali homes"; most giftable feel.
- **Risks:** nearest to the global boho-craft genre *and* the AI-default warm-cream cluster; wholly dependent on a funded lifestyle shoot [OQ]; slides toward NGO-warmth without discipline.

### T3 — "Modern Ledger" (single-grotesk, type-led)
- **Emotion:** contemporary, exact, urban Kathmandu; craft as design object.
- **Color:** near-white, near-black, one saturated accent from Nepali dye tradition (madder red or indigo — not sage/kraft), used structurally.
- **Type:** one grotesk family, all weights (Neue Montreal/Monument; budget Geist) — the Simon James/Palmer model; scale contrast does the work; no serif.
- **Photography:** object-led on uniform grounds; material macros as dividers; survives inconsistent photography best.
- **Layout:** strict visible grid; a **tabular "ledger" list view** as alternate catalog display (every object has a record — provenance as data). Maker credit above product name (Monocle pattern). Motion: none; speed is the aesthetic.
- **Why it fits:** hardest to date; sharpest contrast with every Nepali competitor; cheapest to execute well.
- **Risks:** warmth deficit — risks reading imported/cold for a community brand; single-face warmth requires elite typographic control.

## 21. Recommended territory

**T1 — Catalogue of Origins, borrowing T2's in-situ photography for lifestyle bands.** Reasons: (1) it is structurally the USP — provenance rendered as specimen data; (2) it degrades gracefully if the shoot budget lands small (T2 does not); (3) it is the only territory simultaneously distant from the NGO cohort, the marketplace cohort, the souvenir aesthetic, and the AI-default cluster; (4) the mono spec layer gives Claude Design a concrete, ownable signature. Decision checkpoint: if the photography budget confirms a full three-register shoot, T2's warmth can be dialed up inside T1's system; if attribution goes collective-only, T3's ledger view is the fallback pattern for maker data.

## 22. Proposed information architecture

(report 10 — full spec there) Primary nav (5): **Shop ▾ · Collections ▾ · Makers · Journal · Our Story ▾** + search/account/cart. Impact = page-tier + PDP module + footer band, not nav-tier [E: unanimous peer evidence]. URL scheme: `/shop/[category]`, flat `/products/[slug]`, `/collections/[slug]`, `/makers/[slug]`, `/craft/[slug]`, `/journal/[slug]`. Governing rule: **make story surfaces shoppable, never the shop storyish** — every maker/craft/journal page carries a product rail; no leaf nodes (every page → product ≤1 click; every product → story ≤1 click). Phase-1: flat catalog + 3–5 collections + 4–8 maker profiles + 8–10 journal posts; phase-2 triggers by thresholds, not dates.

## 23. Proposed customer journeys

1. **Browse→buy:** home → shop → filter (category/material/price) → PDP → mini-cart → guest accordion checkout → eSewa redirect → verified thank-you (state from DB) → WhatsApp confirmation.
2. **Story→buy:** organic/IG landing on journal or `/craft/` → "shop this story" rail → PDP → checkout.
3. **Maker path:** PDP origin-trace → maker page → that community's products → second PDP (the bidirectional loop).
4. **COD:** checkout selects COD → phone OTP → order `confirmed-unpaid` → WhatsApp dispatch confirmation → collected on delivery.
5. **Payment failure/timeout:** redirect fails or user drops → order persisted → "confirming your payment" state → cron resolves → retry screen with one tap (new attempt) — never a destroyed cart.
6. **Festival/diaspora gifting:** gifting collection → gift note + recipient address (Nepal delivery, payer abroad pays via eSewa-holder relative or phase-2 intl rails) → tracking to both parties.
7. **Corporate/bulk:** `/bulk-orders` lead form → admin draft order → payment link or invoice.
8. **Post-purchase:** tokenized review link (no login), order lookup by token/phone — account optional, offered after confirmation.

## 24. Proposed admin/CRM journeys

1. **Maker onboarding:** community + maker records → consent capture (name/photo/quote permissions, dated) → wage/pricing terms.
2. **Product intake:** provenance form (maker, material, technique, hours, batch) is required before publish — the USP enforced by workflow.
3. **Order ops:** paid queue → pack → ship (status trigger-guarded) → delivered; eSewa reconciliation queue (pending/ambiguous attempts); COD confirmation queue (OTP/WhatsApp before dispatch).
4. **Manual order:** Instagram-DM entry → draft order → payment link or COD.
5. **Merchandising:** collections with manual sort; homepage block editor (port CMS + add maker-spotlight/impact blocks).
6. **Refund:** request → portal action (manual) → external ref recorded → cron confirms `*_REFUND` → stock ledger adjustment.
7. **Impact reporting:** per-maker/community units + earnings rollups (materialized views) → methodology-page numbers and annual report export.
8. **Reviews moderation; customer notes; low-stock alerts.**

## 25. Open questions

**Team-only (block schema/design):** consignment vs wholesale · named individuals vs collectives (consent) · launch SKU list · photography budget · corporate-gifting launch scope · journal ownership · COD-fee stance · % of value transparently attributed · single vs multi region of makers · one-of-a-kind vs repeatable inventory.
**External:** eSewa IPN existence + refund API + Intent-vs-ePay (merchant support) · international card acceptance from a Nepali entity · unfiltered-network verification of competitor checkouts + NPR price ladders · Kathmandu photo-production costs · "Eco Dosti" identity.
**Evidence gaps:** no published A/B data on maker attribution→conversion anywhere in the category; WhatsApp/RTO magnitudes are vendor-reported; domestic craft-homeware AOV ceiling untested.

## 26. Decisions Claude Design must make

Within the chosen territory: exact typeface selections + licensing path (licensed vs open-source route, report 09 §3); the origin-trace component's precise form (strip vs stacked vs expandable panel); product-card provenance-line content (maker vs community vs district — pending attribution decision); homepage sequence (hero thesis, product-type grid position, collection band rhythm); mobile nav pattern; photography art direction brief (shot list per register); empty/zero states (reviews cold-start, sold-out, zero-results merchandising); NPR price display convention; gifting surface treatment; dark-mode stance (recommend: none for storefront v1 — print-like single theme).

## 27. Decisions Opus should make (implementation)

Repo layout + module boundaries honoring `withTx`-at-boundary; exact Drizzle-vs-supabase-js data layer choice for the greenfield; `place_order()` family signatures; cron cadences (payment reconciliation, stock release); WhatsApp integration depth at launch (`wa.me` vs API); image pipeline (Supabase storage + next/image loader config); cart storage (cookie/local vs DB) given guest-first; review token design; seed/import tooling for maker + product intake; test surface (payment state machine + RLS policies first); Vercel project config (crons, env, Node runtime for crypto paths).

## 28. Explicitly identified unknowns

- Whether eSewa production status API requires auth (docs show none) and its eventual-consistency window [OQ]
- UAT secret trailing-`(` discrepancy — resolve empirically day one [OQ]
- Whether `harden-data-api.sql` was ever applied to the reference's live Supabase project — verify before reusing anything from it [OQ]
- Real Nepali payment-rail coverage of premium competitors (all unverified except Swodeshi) [OQ]
- Domestic demand elasticity for craft homeware above Rs 5,000 [OQ]
- FHAN market-size basis (Rs 12bn vs 3.27bn) [OQ]
- Whether Dhukuti Online revives (competitive timing risk) [OQ]
- Volumetric air-freight economics for diaspora-abroad baskets [OQ]

---

### Companion documents
`research/02` artisan UX · `03` conversion UX · `04` impact storytelling · `05` consumer context · `06` eSewa architecture · `07` CRM audit · `08` failure modes + security · `09` design inspiration · `10` information architecture · `11` engineering deep audit · `12` Nepal market/white space · `13`/`13a` Nepal competitors · `14` Nepal strategy/USP.
**Live dashboard:** MUD Project Intelligence artifact (Overview / Research / Competitors / USP / Decisions / Open questions / Agents).