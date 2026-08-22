# Ecommerce UX Research Brief — MUD Naturals

**Evidence discipline:** `[E]` = named source + verified stat · `[SI]` = strong inference from evidence · `[R]` = recommendation · `[OQ]` = open question. All percentages below are from the named source; nothing is estimated.

---

## 1. Pattern guidance by area

### Product discovery / homepage
`[E]` Baymard: feature at least **40% of your product types** on the homepage — users infer catalog breadth from the homepage. `[E]` **52% of mobile sites/apps auto-rotate the homepage carousel**, which Baymard flags as a defect (users lose control, miss content).
`[R]` Static hero + a visible product-type grid (Baskets, Homeware, Natural Products…) above the fold on mobile. No auto-rotating carousel. With a small catalog, the homepage can legitimately *be* the top of the product list.

### On-site search
`[E]` Baymard 2026 Search benchmark: **46% desktop / 58% mobile / 64% app** sites are "mediocre or worse" on Search UX. Only **19% of sites get autocomplete fully right**. On **69% of sites** users risk misunderstanding the catalog because autocomplete handles misspellings poorly. **88% of mobile "no results" pages** are dead ends with no context-aware help. **94% don't let users search within the current category.** **46% get category-scope autodirect wrong.**
`[R]` Autocomplete: product suggestions *with thumbnails + price*, not just query strings; cap at ~8; support fuzzy/typo matching (Postgres `pg_trgm` similarity on Supabase covers this in a few lines — no external search service needed at this catalog size).
`[R]` Zero-results must never be a dead end: show the query echoed, spelling-corrected alternates, and the full catalog / bestsellers below. `[SI]` At MUD's scale, "no results" is a near-certainty for category-word queries ("gift", "wedding") — treat zero-results as a *merchandising surface*, not an error state.

### Filtering / facets
`[E]` Baymard Product List benchmark (170+ sites, 21,000+ parameters): **58% desktop / 78% mobile** are "poor to mediocre." **51% don't offer all five core filters** (price, ratings, colour, size, brand). **38% lack filters for information they display in the list.** **14% block selecting multiple values in one filter.** **20% lack an applied-filters overview.** **61% don't promote important filters.** **20% lack thematic filters.** **68% desktop / 69% mobile omit all four essential sort types** (price, rating, best-selling, newest).
`[R]` Small catalog rule: **only build a facet if it can split the visible set meaningfully.** Ship 3–4 facets max — likely Category, Price, Material, and one thematic facet ("Gifting", "Kitchen", "Storage"). Multi-select within a facet, applied-filter chips with individual remove, and result counts per option. `[SI]` Never show a filter that returns zero or all products; hide/disable options with zero matches rather than letting users hit an empty list.

### Category navigation
`[E]` Baymard: subdivide a category once it reaches roughly **10 categories**, and keep **at least 10 products** in the deepest-level categories.
`[R]` With a small SKU count, use **one flat level** of 4–6 categories plus cross-cutting thematic collections. Do not build a 3-level mega-menu for 40 products — it makes the catalog feel emptier, not richer.

### Product detail page (PDP)
`[E]` Baymard: **52% desktop / 62% mobile / 64% app** PDPs are "mediocre or worse." **40% of sites truncate gallery thumbnails without a clear truncation indicator.** **43% of sites show no shipping cost or calculator on the PDP**, while **64% of users looked for shipping cost on the product page before adding to cart.**
`[E]` NN/g: "One product view is rarely adequate"; provide rotated, detail, enlarged and in-use/contextual shots; front-load descriptions because users scan; explain unfamiliar terms; confirm add-to-cart conspicuously. `[E]` Baymard: provide **no fewer than 3–5 images per product**, including at least one **"in scale"** image.
`[R]` PDP hierarchy on mobile, top to bottom: gallery (swipeable, pinch-zoom, visible counter "1/6") → name → price → variant selector → stock/lead-time → **add to cart** → shipping cost + delivery date → short scannable description → materials/dimensions/care → artisan/impact story → reviews → related.
`[R]` Sticky add-to-cart bar on mobile once the primary CTA scrolls out of view, carrying price + selected variant. `[SI]` For handcrafted goods the "in scale" image and explicit dimensions are unusually load-bearing — baskets photographed alone are systematically misjudged for size, which drives returns.

### Variant selection
`[E]` Baymard: **28% of sites don't synchronise product data across variations** (image/price/stock stay stale after a variant switch). **28% of desktop sites don't always use buttons for size selection.** **97% don't use a button or button-plus-field quantity selector.**
`[R]` Buttons/swatches, never a `<select>` dropdown, for ≤7 options. On selection, immediately update image, price, stock and SKU. Show unavailable variants as visibly disabled rather than removing them (absence reads as a bug). `[SI]` Handcrafted goods carry natural variation — state explicitly that colour/grain varies per piece, or it will read as a mismatch complaint later.

### Cart: mini-cart vs page
`[E]` Baymard: **58% of sites have a cart design that hinders using the cart as a comparison tool** — a common real user behaviour. **23% of US online shoppers abandoned an order in the past quarter solely because they weren't given an upfront estimate of total order cost.**
`[R]` Ship **both**: a slide-in mini-cart for add-to-cart confirmation (NN/g: confirmation must be conspicuous) and a full cart page as the canonical URL. Mini-cart shows thumbnail, variant, qty stepper, line total, subtotal, **estimated shipping**, and two CTAs (Continue shopping / Checkout). Never auto-redirect to checkout on add.

### Checkout flow
`[E]` Baymard: **65% of sites are "mediocre" or worse** on Cart & Checkout UX; only **2% of desktop sites rate "good", none "perfect."** The average large site can gain a **35.26% conversion increase** from checkout redesign alone — **$260B recoverable** across US+EU — via an average of **32 discrete improvements**.
`[E]` Average checkout is **12.8 form fields**; a guest flow including card fields is achievable at **6–8 fields**. **28% of mobile sites still require manual City/State entry** instead of postcode autodetect. **61% don't mark both required and optional fields**, and **32% of test users failed to complete required fields when only optional ones were marked**. **94% don't use adaptive validation messages.** **49% don't explain why a phone number is required**, while **over 70% of respondents were reluctant to give one.** Complex password rules produced **up to 19% checkout abandonment**; **65% of sites don't avoid overly complex requirements.**
`[R]` Single-page accordion checkout, 3 collapsed sections (Contact → Delivery → Payment), persistent order summary. Full-name single field, Address Line 2 behind a link, postcode/area autodetect where the postal data supports it, `autocomplete` attributes on every field, correct mobile `inputmode` for phone/postcode, inline validation on blur. Explain the phone field ("for delivery calls only"). Billing = shipping by default with the billing block *hidden*, not pre-filled.

### Guest checkout & account timing
`[E]` Baymard: **18% of abandoners** cite "the site wanted me to create an account" (an earlier Baymard wave measured 24% of US shoppers abandoning for this reason in a single quarter). **62% of sites fail to make guest checkout the most prominent option.**
`[R]` Guest checkout is the default path and the visually dominant option. Offer account creation **on the order-confirmation page**, pre-filled, one-click ("Set a password to track this order"). `[SI]` With Supabase Auth, a magic-link/OTP order-lookup is a lower-friction substitute for accounts entirely — most first-time buyers want order tracking, not an account.

### Wishlist
`[E]` Baymard notes many users repurpose the cart as a save-for-later/comparison tool when no wishlist exists — which is why cart designs that hinder comparison cost conversions.
`[R]` Ship a **local-storage wishlist with no login required**, syncing to Supabase only if the user later authenticates. `[SI]` Gating "save" behind sign-up reproduces the forced-account problem one step earlier.

### Recommendations
`[R]` At small catalog size, skip algorithmic recommenders. Hand-curate "Pairs well with" (3 items) on the PDP and "Complete the set" in the cart. `[SI]` Manual curation outperforms collaborative filtering below a few hundred SKUs — there simply isn't enough behavioural data.

### Abandoned-cart recovery
`[SI]` Recovery requires an identified email, so capture email at the *first* checkout step (contact before address) so a drop-off at payment is still recoverable. `[OQ]` Published recovery-email conversion rates come almost entirely from vendor blogs with undisclosed methodology — could not verify a credible primary figure, so treat any specific "% recovered" claim as unsupported.
`[R]` Three-touch sequence (1h / 24h / 72h), no discount on touch 1 — discounting immediately trains abandonment.

### Trust signals
`[E]` Baymard: users have little grasp of actual technical security and **rely on gut feeling**; visual cues — borders, distinct background, site seals — measurably raise *perceived* security of card fields, but the reinforcement must be visually distinct and localised to the payment fields. `[E]` **19% of abandoners** didn't trust the site with their card details.
`[E]` NN/g: trust is hard to build and easy to lose; standardising customer-service information (hub-and-spoke) indirectly builds trust.
`[R]` Real trust for a social enterprise ≠ badge soup: named artisans with photos, a physical address, a working phone/WhatsApp, order-issue policy in plain language, and one recognised payment-provider mark inside the payment block.

### Shipping & returns presentation
`[E]` Baymard: **48% of sites don't show delivery dates instead of shipping speed**; **20% of abandoners** cite slow delivery; **13%** cite an unsatisfactory returns policy; **43% of sites** omit shipping cost from the PDP despite **64% of users** looking for it there.
`[R]` Show "Arrives Tue 3–Thu 5 Sep" not "3–5 business days." Put shipping cost and the free-shipping threshold on the PDP, in the mini-cart, and in the cart. Returns policy summarised in one sentence at the PDP and expanded on its own page — never PDF, never legalese-only.

### Reviews & social proof
`[E]` Baymard: **95% of users relied on reviews** during PDP testing. **43% of the top 60 sites** lack a ratings-distribution UI. **64%** don't factor rating *count* into the ratings sort. **60% of sites demand too much data to submit a review — especially an account — resulting in few reviews.**
`[R]` Frictionless post-purchase review via a tokenised email link (no login). Show distribution bars, allow photo uploads (high value for handcrafted texture/colour), and display "no reviews yet" honestly rather than hiding the module.

---

## 2. Top 15 costly mistakes to avoid — ranked

| # | Mistake | Why it's costly |
|---|---|---|
| 1 | **Surprise costs revealed late** | `[E]` Baymard: **40%** of abandoners (excluding browsers) cite extra shipping/tax/fees — the single largest cause. **23%** abandoned solely from no upfront total estimate. |
| 2 | **Forced account creation** | `[E]` **18%** of abandoners; **62%** of sites bury guest checkout. Directly removable. |
| 3 | **Long/complex checkout & bloated forms** | `[E]` **17%** cite "too long/complicated"; avg **12.8 fields** vs **6–8** achievable; a redesigned checkout is worth **+35.26%** conversion on average. |
| 4 | **Weak payment-page trust cues** | `[E]` **19%** didn't trust the site with card data; perceived security is gut-driven and responds to visual treatment. |
| 5 | **No shipping cost / delivery date on the PDP** | `[E]` **64%** look for it there; **43%** of sites don't provide it; **48%** show speed not dates; **20%** abandon over slow delivery. |
| 6 | **Errors, crashes and slow pages** | `[E]` **17%** abandon after errors/crashes. `[E]` Deloitte/Google *Milliseconds Make Millions* (37 brands, 30M sessions): a **0.1s** mobile speed improvement correlated with **+8.4% retail conversion** and **+9.2% AOV**. |
| 7 | **Complex password rules at checkout** | `[E]` Baymard measured **up to 19% checkout abandonment** from over-strict rules; **65%** of sites don't avoid them. |
| 8 | **Zero-results dead ends & typo-blind search** | `[E]` **88%** of mobile no-results pages offer no contextual help; **69%** of sites mishandle misspellings, risking catalog misunderstanding. |
| 9 | **Under-specified imagery** | `[E]` <3–5 images per product, no in-scale shot, and **40%** of sites truncate thumbnails without indication. Drives returns on size-ambiguous goods. |
| 10 | **Variant data not synchronised** | `[E]` **28%** of sites leave image/price/stock stale after a variant switch — users buy the wrong thing or distrust the page. |
| 11 | **Vague or hidden returns policy** | `[E]` **13%** of abandoners cite an unsatisfactory returns policy. |
| 12 | **Filters that don't match displayed info / block multi-select** | `[E]` **38%** and **14%** respectively; **20%** lack an applied-filter overview. |
| 13 | **Reviews gated behind an account** | `[E]` **60%** of sites require too much to submit a review → sparse reviews, while **95%** of users rely on them. |
| 14 | **Required/optional fields unmarked** | `[E]` **61%** don't mark both; **32%** of test users then failed to complete required fields. |
| 15 | **Unexplained phone field & auto-rotating carousels** | `[E]` **49%** don't explain the phone field while **>70%** are reluctant to give it; **52%** of mobile homepages auto-rotate. |

---

## 3. Small-catalog specifics

- `[SI]` **Facets are a liability below ~50 SKUs.** Baymard's filtering guidance targets sites where the list overwhelms; MUD's risk is the inverse — filters that empty the page. Ship sort + 3 facets, and add more only when a category exceeds ~30 items.
- `[E]` Baymard's rule of **≥10 products per deepest category** argues directly against deep taxonomy at launch. `[R]` One flat category level + curated collections.
- `[R]` **Merchandise the whole catalog.** With few SKUs, "browse all" is a legitimate primary nav item and the homepage can carry the full product-type grid (Baymard's 40%-of-product-types guidance is trivially satisfiable — exceed it).
- `[R]` **Depth over breadth on the PDP.** A small premium catalog competes on story, provenance and craft detail — 6–8 images, artisan attribution, materials, dimensions, care. This is where the small-catalog advantage actually lives.
- `[SI]` **Cold-start social proof:** with zero reviews, substitute verifiable proof — artisan names/photos, production process, impact reporting, press or partner logos if real. Do not fabricate reviews or ratings.
- `[R]` Skip: algorithmic recommendations, faceted search suggestions, a dedicated search vendor, loyalty tiers, and multi-step checkout wizards. All are complexity without a corresponding catalog to justify them.

---

## 4. Recommendations summary

1. Guest checkout as the default and most prominent path; account offered post-purchase.
2. Total cost — including shipping — visible on PDP, mini-cart, cart, and step 1 of checkout. Free-shipping threshold stated with progress.
3. Single-page accordion checkout, 6–8 fields, full autofill support, postcode autodetect, inline adaptive validation, both required and optional fields marked.
4. Delivery **dates**, not speeds. Returns policy in one plain sentence on the PDP.
5. PDP: 6+ images including one in-scale, sticky mobile add-to-cart, button-style variants with fully synchronised data.
6. Search: thumbnail autocomplete with typo tolerance (`pg_trgm`), no-results page that merchandises rather than apologises.
7. Filters: 3–4 max, multi-select, counts, removable chips, zero-result options suppressed.
8. Mini-cart + cart page, both. Local-storage wishlist, no login.
9. Trust via specificity (artisans, address, contact, policy) plus a distinct visual treatment on the payment block.
10. Capture email at checkout step 1 to make abandonment recoverable; 3-touch sequence, no immediate discount.
11. Performance is a conversion feature — Deloitte/Google put 0.1s at +8.4% conversion; on Next.js this means image optimisation, no auto-carousel, and server-rendered PDPs.

---

## 5. Open questions

- `[OQ]` **Market specifics.** "South Asian" spans very different payment/logistics norms. Nepal (eSewa/Khalti, heavy COD) vs India (UPI, RTO risk) vs cross-border diaspora sales change checkout design materially. Which is primary?
- `[OQ]` **Cash on delivery.** If COD is expected, the entire checkout, trust model and abandoned-cart economics shift (RTO cost replaces cart abandonment as the main leak). No Baymard benchmark covers COD-dominant markets.
- `[OQ]` **Address entry.** Postcode-autodetect guidance assumes reliable postal data. Where addresses are landmark-based, a structured address form is the wrong pattern — needs local validation.
- `[OQ]` **Recovery-email effectiveness** — no primary-source figure verified; measure MUD's own rather than adopting vendor claims.
- `[OQ]` Whether MUD's premium positioning supports a returns policy generous enough to clear the **13%** returns-policy abandonment bar, given handcrafted-goods logistics.
- `[OQ]` Language/script needs (English-only vs bilingual) — affects search tokenisation and autocomplete design.

**Sources:** [Baymard — Cart Abandonment Rate Statistics](https://baymard.com/lists/cart-abandonment-rate) · [Baymard — Checkout UX Best Practices](https://baymard.com/blog/current-state-of-checkout-ux) · [Baymard — Product List & Filtering UX](https://baymard.com/blog/current-state-product-list-and-filtering) · [Baymard — Product Page UX](https://baymard.com/blog/current-state-ecommerce-product-page-ux) · [Baymard — Ecommerce Search UX](https://baymard.com/research/ecommerce-search) · [Baymard — Autocomplete Design](https://baymard.com/blog/autocomplete-design) · [Baymard — Make Guest Checkout Prominent](https://baymard.com/blog/make-guest-checkout-prominent) · [Baymard — Minimize Form Fields](https://baymard.com/blog/checkout-flow-average-form-fields) · [Baymard — Shipping Costs on Product Pages](https://baymard.com/blog/show-shipping-costs-on-product-pages) · [Baymard — Perceived Security of Payment Forms](https://baymard.com/blog/perceived-security-of-payment-form) · [Baymard — Ratings Distribution Summary](https://baymard.com/blog/user-ratings-distribution-summary) · [Baymard — Ecommerce UX Best Practices](https://baymard.com/learn/ecommerce-ux-best-practices) · [NN/g — UX Guidelines for Ecommerce Product Pages](https://www.nngroup.com/articles/ecommerce-product-pages/) · [NN/g — Trust and Credibility: Ecommerce UX](https://www.nngroup.com/reports/ecommerce-ux-trust-and-credibility/) · [Deloitte/Google — Milliseconds Make Millions (2020)](https://www.deloitte.com/ie/en/services/consulting/research/milliseconds-make-millions.html)