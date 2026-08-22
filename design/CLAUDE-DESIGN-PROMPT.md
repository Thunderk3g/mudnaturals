# MUD Naturals — Website UI

Design a complete ecommerce website for **MUD Naturals**, a Nepali purpose-driven **concept store**: curated, community-made handicrafts and homeware (handwoven baskets, textiles, lokta paper goods), organic oils and natural cosmetics, food (teas, honeys, traditional candies), and natural handmade candles — plus curated gift boxes. The brand promise: **"objects with origins" — every product shows who made it, where, and from what.** Business model woven in quietly: 80% of value sustains the enterprise, 20% funds the MUD Impact Fund (makers are partners, never beneficiaries). It must feel like a premium contemporary lifestyle brand, never like an NGO site, a souvenir shop, or a generic Shopify store.

**Audience:** urban Kathmandu/Lalitpur professionals buying for their own homes, and the Nepali diaspora sending gifts home. Mobile-first — most traffic arrives from Instagram on mid-range Android phones. Currency is NPR. English only.

---

## Aesthetic direction: "Catalogue of Origins"

Museum catalogue meets field notebook. Precise, honest, quietly confident. The provenance data itself is the visual signature — treat maker, village, material, and hours like specimen labels on archival cards.

**Color** — light theme only, print-like:
- Ground: warm paper `#F7F4EE` (never pure white)
- Surfaces/cards: `#FFFFFF` with hairline borders `#E4DED2`
- Ink: `#1C1A17` (never pure black); secondary `#6B645A`
- Accent: clay ochre `#B4552D` — at most 5% of any screen: links, price, active states, the origin-trace marker. No other decorative color; photography supplies the rest.

**Typography** — three voices, strictly cast:
1. **Display serif** with real character (e.g. GT Alpina, Tobias, or EB Garamond class) — headlines, product names, section titles.
2. **Neutral grotesk** — body, UI, navigation.
3. **Monospace** (e.g. Geist Mono class) — ALL provenance and spec data: maker names, districts, materials, dimensions, hours, SKU. Uppercase micro-labels with letter-spacing. This mono "specimen label" register is the most distinctive element of the whole design — use it consistently, never for body copy.

**Layout:** 12-column grid; asymmetric 5/7 and 7/5 editorial splits with images bleeding to one edge; generous whitespace (≥120px desktop section padding, not proportionally crushed on mobile); 0.5–1px warm-grey hairline rules like a printed catalogue. Product grids max 3 columns desktop / 2 mobile, primary images 4:5 portrait.

**Motion:** one fade + 8px rise on scroll-in (600ms, ease-out, once). Product image crossfade on hover. Nothing else — no parallax, no scroll-jacking, no carousels that auto-rotate.

**Imagery:** three registers — (1) object on warm plain ground with a soft real shadow, (2) hands mid-work on the craft, cropped tight, (3) wide environmental shots of place. Use warm textured placeholders where photos don't exist yet, labeled with the register. Never: smiling-beneficiary portraits, sepia documentary grading, stock imagery.

---

## Pages to design

1. **Home** — order: compact hero (one hero object + 4–6-word provenance tag like "Woven in Rautahat, southern Nepal"), then a category grid covering the whole store (Craft & Home · Natural Care · Food & Pantry · Candles & Ritual · Gifting), one featured collection band, one maker spotlight band (editorial 5/7 split), one journal teaser, footer. Products before mission — no full-screen mission statement.
2. **Shop / product listing** — filterable grid. Facets: Category, Material/Ingredient, Price (brackets), Maker/Community. Multi-select, removable chips, result counts, options with zero results hidden. Sort row. Small catalogue (~60–120 products) must read edited, not thin.
3. **Product detail** — the most important screen. Every product tells five things, in this order and register: **PRODUCT** (what it is) → **ORIGIN** (where it comes from) → **MAKER** (who made it) → **STORY** (why it matters) → **IMPACT** (one quiet line of money-flow arithmetic, e.g. "Rs 1,680 of this price goes to the Rautahat collective" — never charity language). Mobile column order: swipeable gallery with counter ("1/6", include one in-scale shot) → serif product name with mono provenance line above it → NPR price → variant buttons (never dropdowns) → stock/lead time → Add to cart → shipping cost + delivery date estimate → **the Origin Trace** (see below) → description/story → spec table in mono (materials/dimensions/care for craft; ingredients/volume/batch/expiry for oils, cosmetics and food) → handmade-variation note ("no two identical — expected variation stated as a spec, not an apology") → reviews → "More from this maker" rail. Sticky add-to-cart bar on mobile once the button scrolls away.
4. **Makers index + maker profile** — profile is a structured record, not an essay: community name, district, craft, materials, number of makers, working-since, one named voice with a quote and photo, process in 3–5 numbered photographed steps with time-per-piece, then **that maker's shoppable products** (mandatory — story pages always sell).
5. **Collections index + collection page** — shoppable grid first, curatorial story beneath.
6. **Journal index + article** — article ends with a "Shop this story" block of 3–4 products.
7. **Our Story / Impact** — mechanism over statistics, two layers in this order: (1) **the trade** — fair fixed prices agreed with makers, shown as what % of each product's price reaches its maker; (2) **the MUD Impact Fund** — "80% sustains the enterprise, 20% fuels our impact" drawn as a simple ecosystem loop diagram (communities → MUD curates/develops/markets → customers → revenue → 80% growth + 20% fund → back to communities). Philosophy line: "People × Nature × Craft × Commerce." Include a methodology note with stated limitations and dated figures. No "lives impacted" counters, no donation-style progress bars, no beneficiary language — makers are partners and producers.
8. **Cart (slide-in mini-cart + full page)** — thumbnail, variant, quantity stepper, line totals, subtotal, **estimated shipping and free-shipping progress**, checkout + continue-shopping.
9. **Checkout** — single-page accordion: Contact (email/phone first) → Delivery (Nepali address: province, district, municipality/ward, tole/street, landmark field, phone required "for delivery calls only") → Payment (eSewa · Khalti · Cash on Delivery with phone-confirmation note). Guest by default; account offered only on the confirmation page. 6–8 fields total. Full total incl. delivery always visible.
10. **Order confirmation + payment-pending state** — a calm "we're confirming your payment with eSewa" state (payment verification is asynchronous), and a clear COD "we'll call to confirm before dispatch" state.

## Signature component: the Origin Trace

On every product page, a compact strip in the buy column, set in mono:

`MAKER Sita Chaudhary · COMMUNITY Rautahat sikki collective · MATERIAL sikki grass · TIME ~14 hrs`

Tapping/expanding reveals the full path — maker card, community, material — each linking onward. On product cards, a one-line mono provenance credit sits above the serif product name (maker or community + district). This component is the brand.

## Sample content (use real craft vocabulary)

Products like: *Feruwa storage basket — sikki grass, Rautahat, Rs 4,200* · *Dhakiya serving basket — kans grass, Rs 2,800* · *Deluwa ceremonial basket, Rs 6,500* · *Allo (Himalayan nettle) table runner — Sankhuwasabha, Rs 3,400* · *Lokta paper journal — Baglung, Rs 1,200* · *Cold-pressed apricot kernel oil — Mustang, 100ml, Rs 950* · *Chiuri butter soap — Rs 350* · *High-mountain green tea — Ilam, Rs 780* · *Beeswax pillar candle — Rs 650* · *"Morning in the Hills" gift box (tea + honey + candle + lokta notebook) — Rs 3,900*. Price band Rs 350–7,800: food and care are the everyday entry points, craft is the identity and margin, gift boxes are the volume. Prices always fixed and visible — confident pricing is a differentiator in this market.

## Never do

Sage-green + kraft-brown NGO palette; leaf/heart/cupped-hands icons; rounded "friendly" sans (Poppins/Quicksand); prayer-flag colors, Buddha/khukuri/singing-bowl iconography; felt-craft cuteness; guilt copy ("help", "support", "empower", "give back", "every purchase changes a life"); badge sprays; four-across dense grids; auto-rotating hero carousels; impact statistics as hero content; testimonials of gratitude; purple gradients; dark mode.