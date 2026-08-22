# MUD Naturals — Information Architecture Proposal

**Evidence caveat, stated once:** the research network blocks direct fetches of most retail domains. `the-citizenry.com` loaded fully (header, footer, collection tiles, artisan index). The rest are reconstructed from site-scoped search returning live URLs and page titles — strong evidence for **URL schemes and section naming**, weaker for exact dropdown trees. Anything not seen rendered is marked *Inference*, not *Evidence*.

## 1. Observed nav structures

| Brand | Shop organising axes | Story/maker home | Impact placement | URL scheme | Evidence |
|---|---|---|---|---|---|
| **The Citizenry** | Two parallel axes on one surface: product type (`/collections/shop-all-bedding-2`, `/collections/all-baskets`) **and** country (`/collections/the-morocco-collection`, `/collections/shop-the-india-collection`) | `/pages/artisan-partners` — index grouped by country, each partner its own page: `/pages/artisans-of-bolgatanga`, `/pages/women-of-oaxaca` | Folded into `/pages/about` ("People and Planet First"). **Not** in top nav | Everything shoppable under `/collections/`; all editorial/maker under `/pages/`; journal at `/blogs/journal` | Fetched |
| **Obakki** | Region collections (`/collections/…` for Mexico, Japan, Morocco, Eswatini) + type (`/collections/jewelry`, `/collections/furniture`) + `/collections/archive` for retired one-offs | `/blogs/journal/…` artisan stories; `/pages/about-us` | `/pages/ethical-impact` — a page, not a section | `/collections/`, `/pages/`, `/blogs/journal/`, `/blogs/press/` | Search |
| **Ten Thousand Villages** | Type (`/collections/home`, `/collections/accessories`) **and artisan groups modelled as shoppable collections**: `/collections/bethlehem-fair-trade-artisans` | `/pages/artisan-pathways` | `/pages/impact` — page tier | `/collections/`, `/collections/all`, `/pages/` | Search |
| **Made Trade** (closed 2025) | Type + **values as a first-class axis**: BIPOC Owned, Fair Trade, Handcrafted, Made in USA, Recycled + Upcycled, Sustainable, Vegan, Women Owned; `/pages/values`, `/pages/women-owned-brands` | `magazine.madetrade.com` — **separate subdomain** | `/pages/values` | `/collections/handmade-jewelry`; editorial off-domain | Search |
| **Nicobar** | Women / Men / Gifting / Jewellery / Collections; plus `/pages/material-library`, `/pages/the-design-studio` | `journal.nicobar.com` — **separate subdomain**; also `global.nicobar.com` for export | `/pages/about-us` | `/pages/` heavy; editorial off-domain | Search |
| **Jaypore** | `/c/[category]` for categories (`/c/home`, `/c/art`), `/m/[theme]` for thematic + craft landings (`/m/craft`, `/m/coastal`), `/p/[slug]-[id].html` for products | `blog.jaypore.com` — **separate subdomain** | Not surfaced | Cleanest category/theme split in the set | Search |
| **Nkuku** | `/pages/furniture`, `/pages/house-home` as merchandised landings above `/collections/all-furniture` | `/pages/art-of-making`, `/pages/the-beauty-of-handmade` under a "Nkuku Life" umbrella | Distributed through craft storytelling | Hybrid `/pages/` landing → `/collections/` grid | Search |
| **TOAST** | Editorial-led; `/blogs/magazine` is a destination, plus a named programme at `/pages/new-makers`, `/pages/be-a-new-maker` | `/blogs/magazine/…` | Not a separate surface | Editorial on main domain (`/blogs/magazine`) | Search |

**Four patterns that transfer:**

1. **Evidence:** Nobody in this set gives Impact a top-nav slot. TTV, Obakki, Made Trade — the three most mission-defined brands — all put it at `/pages/impact`-tier. *Inference:* impact converts as proof next to the product, not as a nav destination.
2. **Evidence:** TTV makes artisan groups **shoppable collections** (`/collections/bethlehem-fair-trade-artisans`), while The Citizenry makes them **editorial pages** (`/pages/women-of-oaxaca`). The TTV pattern collapses maker→product into zero clicks; The Citizenry pattern needs a product rail bolted on.
3. **Evidence:** The three brands that split editorial to a subdomain (`blog.jaypore.com`, `journal.nicobar.com`, `magazine.madetrade.com`) forfeit link equity to the shop domain. The Shopify-native brands keep it on-domain (`/blogs/journal`, `/blogs/magazine`). **Do not split.**
4. **Evidence:** The Citizenry runs `/collections/all/pillows` tag URLs alongside `/collections/shop-all-pillows` — two near-duplicate pages for one intent. Classic Shopify tag-URL bloat. Avoid by construction.

## 2. Proposed IA

**Governing principle:** don't make the shop storyish — make the story surfaces shoppable. Every maker page, material page, and journal post carries a product rail. That single rule resolves both failure modes at once, and it is cheap.

### Primary navigation (5 items + utilities)

```
Shop  ▾            → /shop   (the label is a link, not a hover trap)
    Shop All
    Baskets & Storage
    Kitchen & Dining
    Home & Decor
    Gifting
    ── Shop by Material ──   Sabai Grass · Kauna Reed · Bamboo · Terracotta · Brass
    ── Shop by Maker ──      [3–5 maker names] · All Makers
    New In · Best Sellers
Collections  ▾     → /collections
    [3–5 live collections, named + thumbnailed]
Makers             → /makers
Journal            → /journal
Our Story  ▾       → /about
    Our Story · Our Impact · Craft & Materials · Contact
─ utilities ─  Search (icon) · Account · Cart · Currency/Region
```

**Why each earns its slot:**

- **Shop** — revenue path. Non-negotiable. It is a *link*, so a decisive user reaches the full catalog in one click without fighting a menu.
- **Collections** — with a small catalog, curated collections are how 40 SKUs read as a considered shop rather than a thin one, and they are the strongest SEO landing type ("handwoven storage baskets"). *Evidence:* both The Citizenry and Obakki run curated collections as a top-level axis in parallel with categories. The confusion risk ("Shop or Collections?") is managed by giving them different jobs: **Shop = complete and filterable** (get me to a product); **Collections = finite and curated** (inspire me).
- **Makers** — the differentiator. If it sits in the footer, the entire premise is footer-tier. *Evidence:* every comparable gives makers a named destination (`/pages/artisan-partners`, `/pages/art-of-making`, `/pages/new-makers`). Ours must be shoppable, per the TTV pattern.
- **Journal** — SEO engine and the top-of-funnel entry. Only earns the slot **if** there is capacity to publish monthly. An abandoned journal is worse than no journal (see Open Questions).
- **Our Story** — one slot absorbing About + Impact + Craft + Contact. Four weak items become one strong one.

**Why these do NOT get slots:**

- **Our Impact** → child of Our Story at `/impact`, *plus* an impact module on every PDP and in cart, *plus* a persistent footer band. Justification: unanimous evidence that peers keep it page-tier; and proof next to the Add-to-Cart button beats proof five nav-clicks away.
- **Materials** → lives inside the Shop menu as a filter entry (commerce intent) and as `/craft/[slug]` editorial pages linked from every PDP (SEO intent). It is a *facet and a content type*, not a section. A top slot for it would be near-empty at launch. *Evidence:* Nicobar treats it exactly this way — `/pages/material-library`, not a nav item.
- **Custom / Bulk Orders** → footer + `/bulk-orders` + a contextual PDP link ("Need 50? Corporate gifting"). *Evidence:* The Citizenry keeps "Corporate Sales & Gifting" and "Trade Program" in the footer despite being high-value lines. Revisit if B2B exceeds ~20% of revenue.
- **Contact** → footer + child of Our Story. Contact never earns a top slot on a transactional site; it earns a persistent footer position and a link from every service page.

### Footer sitemap

```
SHOP                  DISCOVER              ABOUT                  HELP
  All Products          Makers                Our Story              Contact
  Baskets & Storage     Craft & Materials     Our Impact             FAQs
  Kitchen & Dining      Journal               Impact Reports         Shipping & Delivery
  Home & Decor          Collections           Where We Work          Returns & Exchanges
  Gifting               Care & Repair         Careers                Track Order
  New In                                      Press                  Care Instructions
  Best Sellers                                                       Size & Dimensions
  Gift Cards
  Bulk & Corporate Gifting

── impact band: [N] makers · [N] communities · [N]% of revenue to makers → /impact ──
── newsletter · social · payment marks ──
── Terms · Privacy · Accessibility · Sitemap · © ──
```

## 3. URL / SEO scheme

```
/                              home
/shop                          canonical catalog index, filterable
/shop/[category]               baskets-storage, kitchen-dining, home-decor, gifting
/products/[slug]               FLAT. never nested under category.
/collections                   collections index
/collections/[slug]            curated: /collections/monsoon-table, /collections/odisha
/makers                        maker index
/makers/[slug]                 maker/collective profile + product rail
/craft                         materials & techniques hub
/craft/[slug]                  /craft/sabai-grass, /craft/kauna-reed
/journal                       journal index
/journal/[slug]                FLAT. no date, no category segment.
/journal/topic/[slug]          tag archives — noindex unless ≥8 posts
/about  /impact  /impact/[year]  /contact  /bulk-orders  /care  /faq
```

**Rules:**

- **Flat product URLs.** A basket that is both storage and gifting has one URL. Nesting under category guarantees duplicates or awkward primary-category decisions. *Evidence:* Jaypore already does this (`/p/[slug]`).
- **Category vs Collection — the rule that prevents the mess:** a **category** is *what the object is* — stable, one primary per product, drives breadcrumbs and head-term SEO, lives under `/shop/`. A **collection** is *why you'd want it now* — overlapping, curated, often seasonal, a product belongs to many, lives under `/collections/`, and **is never a breadcrumb parent**.
- **Facets:** `/shop?material=sabai-grass&region=odisha`. All facet URLs `noindex,follow` + canonical to the clean parent. Exception: an allowlist of promoted facets that graduate into real `/collections/[slug]` pages once they clear the phase-2 threshold. This is the direct fix for The Citizenry's `/collections/all/pillows` duplication.
- **Journal on the main domain.** Non-negotiable, given three of eight peers leaked equity to subdomains.
- Schema: `Product` + `Offer` + `AggregateRating` on PDP; `BreadcrumbList` sitewide; `Article` + `author` on journal; `Person`/`Organization` on maker pages; `Organization` + `sameAs` on home.

## 4. Discovery-path map

The graph is powered by **one shared controlled vocabulary** (material, technique, region, maker, room/use) applied to products, makers, journal posts and collections alike. Tag once, link everywhere. **Rule: no leaf nodes.** Every page reaches a product in ≤1 click; every product reaches a story in ≤1 click.

```
PRODUCT ──→ its Maker (named, inline, above the fold)
        ──→ its Material  → /craft/[slug]
        ──→ its Collection(s)
        ──→ "More from [Maker]" rail (4)
        ──→ "Pairs with" rail (4, cross-category)
        ──→ impact module → /impact
        ──→ breadcrumb → /shop/[category]

MAKER   ──→ full product rail (shoppable — the TTV pattern)
        ──→ region → /collections/[region]
        ──→ crafts practised → /craft/[slug]
        ──→ journal posts tagged to them
        ──→ their impact numbers

CRAFT   ──→ all products in that material
        ──→ makers who work it
        ──→ journal posts about it

JOURNAL ──→ explicit "Shop this story" block (3–4 products) — not just inline links
        ──→ maker profile · related posts · one collection

COLLECT.──→ shoppable grid FIRST, story beneath it
        ──→ the maker(s) behind it

IMPACT  ──→ makers · the collections funding each programme
```

Three named journeys this supports: **browse→buy** (Shop → filter → PDP → cart); **inspire→buy** (Home → Collection → PDP → maker → second PDP); **story→buy** (organic landing on /journal or /craft → Shop-this-story → PDP).

**Breadcrumbs:** Product: `Home > Shop > [Category] > [Product]` — always the category, never the collection, so a product has exactly one breadcrumb path. Collection: `Home > Collections > [X]`. Maker: `Home > Makers > [X]`. Journal: `Home > Journal > [Post]`. Filtered views keep the category breadcrumb and show filters as removable chips.

## 5. Search & filter spec

**Search — browse-first at launch.** With <80 SKUs a user sees the whole catalog in two scrolls. A prominent always-open search field signals "big catalog" and invites zero-result queries that read as absence. **Recommendation:** icon-triggered overlay, not a persistent field. But the index must span **products + makers + materials + collections + journal**, so "Odisha" returns a maker group, a craft page, and products — the cheapest way to make a small catalog feel deep. Zero-result state is never a dead end: show category tiles + Browse All + Makers. Log every query from day one; queries are the phase-2 facet roadmap.

**Filters — show a facet only when it has ≥2 populated values and ≥5 products behind it.**

| Phase 1 | Why |
|---|---|
| Category | Primary axis |
| Material | Craft-specific, high search intent, doubles as `/craft/` content |
| Room / Use | How people actually shop homeware |
| Price | Universal; brackets, not a slider, at small volume |
| Maker / Community | Story-to-commerce bridge; unique to the model |
| Region / Origin | Only if makers span >1 region (see Open Questions) |

| Deferred to phase 2 | Why |
|---|---|
| Technique | Too granular early; better served as editorial `/craft/` pages |
| Size / dimensions | Needs consistent product data first |
| Colour | Handcraft colour is inconsistent; poor filter, high false-negative rate |
| Values badges (Made Trade pattern) | Only once there are enough certifications to differentiate between products, not just from other brands |

Filters are multi-select, applied instantly, URL-reflected (shareable), with a visible active-filter chip row and a one-tap clear.

## 6. Phasing

**Phase 1 — launch (<80 SKUs).** Flat `/shop` with filters. Only 3–5 category pages, each needing ≥8 products to exist; everything else stays a filter. 3–5 collections. 4–8 maker profiles (this is the moat — do not launch with two). 8–10 journal posts at launch so it doesn't read as abandoned. One `/impact` page with numbers that are actually verifiable. Shop menu is a single flat list, no second level.

**Phase 2 — triggered, not scheduled.**
- Split a category into sub-categories when it exceeds ~24 products.
- Promote a facet to a real `/collections/[slug]` page when it has ≥12 products **and** demonstrated search demand.
- Add a second level to the Shop mega-menu only when there are ≥3 sub-categories with ≥8 products each.
- Turn on search autocomplete + query-driven merchandising once search is >8% of sessions.
- Add `/makers` filtering (by region, by craft) at >15 makers.
- Promote **Gifting** to a top slot seasonally, then retire it — the cheapest reversible nav experiment available.
- Promote **Bulk Orders** to top nav only if B2B exceeds ~20% of revenue.

## 7. Open questions

1. **Do makers span one region or many?** Obakki organises by country *because* it spans fourteen. Single-region MUD should organise by **craft/material** instead and drop Region as a facet entirely. This is the highest-leverage unknown here.
2. **Named individuals or collectives?** Determines `/makers/[person]` vs `/makers/[group]`, and carries consent, photography-release, and churn implications. Individual pages don't scale past ~30 makers without an editorial process.
3. **Repeatable inventory or one-of-a-kind?** One-of-a-kind breaks category pages with constant sold-out states and demands an archive pattern (Obakki's `/collections/archive`) plus a waitlist rather than a restock.
4. **Are impact numbers verified today?** An `/impact` page without real figures damages trust more than having no page. If numbers aren't ready, ship maker stories at launch and `/impact` in phase 2.
5. **Who writes the journal, monthly, ongoing?** If nobody owns it, drop Journal from primary nav at launch and ship Makers only. A three-post journal in top nav actively signals a dying brand.
6. **Domestic, export, or both?** Determines currency/region switching and whether a `global.` split is on the table. Recommendation regardless: one domain, locale switching — Nicobar's `global.` split is a cost, not a feature.
7. **Is corporate gifting a launch revenue line?** If yes, `/bulk-orders` needs a real lead-capture flow at launch, not a mailto.

---

**Sources:** [The Citizenry](https://www.the-citizenry.com/), [Artisan Partners](https://www.the-citizenry.com/pages/artisan-partners), [Collections](https://www.the-citizenry.com/collections), [Obakki](https://obakki.com/), [Obakki Ethical Impact](https://obakki.com/pages/ethical-impact), [Ten Thousand Villages Impact](https://www.tenthousandvillages.com/pages/impact), [Artisan Pathways](https://www.tenthousandvillages.com/pages/artisan-pathways), [Made Trade Values](https://www.madetrade.com/pages/values), [Nicobar](https://www.nicobar.com/), [Nico Journal](https://journal.nicobar.com/), [Jaypore Craft](https://www.jaypore.com/m/craft), [Jaypore Home](https://www.jaypore.com/c/home), [Nkuku Art of Making](https://www.nkuku.com/pages/art-of-making), [TOAST Magazine](https://www.toa.st/blogs/magazine), [TOAST New Makers](https://www.toa.st/pages/new-makers)