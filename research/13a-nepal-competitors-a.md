# Competitive Deep-Dive: Nepali Handicraft / Fair-Trade Commerce — Batch A

**Method note.** The corporate DNS filter (OpenDNS) blocked direct fetch on every retail domain in this batch. All "[OBSERVED]" content was retrieved by routing through the `r.jina.ai` text proxy, which returns the rendered page as markdown — real page text, nav labels, category counts and prices, but *not* pixels, layout, image quality, or interactive checkout state. Anything visual is [INFERENCE] or [UNKNOWN]. Search-snippet material is [RECONSTRUCTED].

---

## 1. Mahaguthi — Craft with a Conscience

**Positioning.** Nepal's heritage fair-trade brand. Traces lineage to 1927, when Tulsi Mehar Shrestha — trained under Gandhi, exiled for opposing caste discrimination — founded a charkha (spinning) movement for destitute women; the trading arm was formalised in 1984 [OBSERVED about page + RECONSTRUCTED]. Vision: *"Economic and social progress for equity, justice and peace."* Self-description: *"Mahaguthi is more than a brand — it is a conscious choice for a meaningful way of living"* [OBSERVED]. Category owned: **moral authority / origin story**. CEO: Dr. Sunil Chitrakar [OBSERVED].

**Critical structural finding:** Mahaguthi runs **two disconnected web properties**. `mahaguthi.org` is institutional and its shop page reads *"Something big is brewing! Our store is in the works and will be launching soon!"* [OBSERVED]. The live commerce site is `mahaguthi.com.np` [OBSERVED]. A prospect who Googles the .org sees a dead store.

**Products.** Eight categories with visible counts — Wearables (66), Home Decors (104), Kitchen & Dining (72), Children & Play (52), Gifts (39), Mind Body & Well-Being (36), Work Study & Organization (30), Seasonal & Festive (1) — roughly **400 SKUs** [OBSERVED]. Breadth, not curation. Observed NPR pricing: Freedom Glass Holder Pouch ₨335 · Freedom Coin Pouch ₨445 · Essential oils ₨495–945 · Black-on-Black Mini Flow Vase ₨650 · Thread of Freedom Knot Bag ₨675 · Bud-Shaped Vase ₨805 · Jute Patched Freedom Laptop Sleeve ₨1,340 · Freedom Tote with Jute Fringe ₨1,400 · Freedom Embroidery Tote ₨1,610 · Mandala Bed Sheet ₨6,635 [OBSERVED]. **Accessible mid-market, not premium** — most of the catalogue sits under ₨1,500. Product naming shows genuine editorial thinking: a coherent *"Freedom"* line across totes, pouches and sleeves, and craft-specific vocabulary (Raku, Luster Raku, Black-on-Black) [OBSERVED].

**Ecommerce UX.** WooCommerce [INFERENCE]. Product cards carry **Wishlist, Quick view, and Compare** [OBSERVED] — Compare is a stock-plugin tell. Free shipping over **NPR 5,000**, gift wrap, custom orders, Track Order [OBSERVED]. `/checkout/` renders *"Your cart is currently empty"* so **payment methods were not exposed** [OBSERVED → UNKNOWN whether eSewa/Khalti/COD]. The **Social Impact footer link 404s** [OBSERVED]. The refund policy is the **unmodified WooCommerce sample text** — it governs "downloadable software," "CDs, DVDs," "newspapers and magazines" [OBSERVED]. A real, verifiable trust leak on a page a hesitant buyer actually reads.

**Storytelling.** Best-in-batch on maker visibility: an **Artisans page naming seven individuals with dedicated profile pages** — Dil Bahadur Prajapati, Reshma Balami, Lal Kumari Sunuwar, Anju Maharjan, Ramita Maharjan, Rabina Maharjan, Krishna Laxmi Nhuchen [OBSERVED]. Blog present [OBSERVED]. But maker profiles appear to live in a separate silo from PDPs — no product→artisan link seen [UNKNOWN whether one exists].

**Impact.** WFTO **Guaranteed** Fair Trade Organization; founding member of Fair Trade Group Nepal; WFTO Asia member [OBSERVED claim, corroborated]. Quantified claim: **68% of sales revenue returns directly to artisans** [OBSERVED] — the sharpest single impact number in the batch. Scale: 1,100+ makers, ~80% women, Kathmandu Valley plus 15 districts [RECONSTRUCTED]. Evidence quality: strong on third-party accreditation, thin on self-published proof (impact page broken).

**Brand.** Heritage-led, worthy, institutional [INFERENCE]. Two physical shops in Kathmandu Valley [OBSERVED].

**Business model.** Hybrid: NGO-linked producer org + domestic D2C + own retail + **wholesale and export** [OBSERVED].

---

## 2. Sana Hastakala

**Positioning.** *"Fair Trade Nepali Handicrafts — Handmade in Nepal Since 1989."* Founded with **UNICEF** backing, since evolved into a self-sufficient NGO; "Celebrating 35 Years in Fair Trade" [OBSERVED]. Category owned: **institutional credibility for wholesale buyers**. The target is explicitly a *buyer*, not a shopper.

**Products.** Ceramics, felt, woven textiles, home accessories; also knitwear, pashmina, mithila, singing bowls, filigree, bags [OBSERVED + RECONSTRUCTED]. Catalogue is **specification-grade, not story-grade**: Placemats & Coasters page lists 23 "Woven Placemat Set" entries with real SKUs, material specs (allo nettle, hemp, 100% cotton, jute+cotton, banana+cotton, wool/felt, stoneware), colour ranges and care instructions [OBSERVED].

**Ecommerce UX.** **No transactional storefront on the current site.** Nav is Home · Catalogue · About · Our Story · Climate Story · Contact [OBSERVED]. No prices, no cart; a **WhatsApp link is the pricing and bulk-order mechanism** (+977 9860981244), stated response time 2–4 hours [OBSERVED]. An older WooCommerce shop at bare `sanahastakala.com/shop/` shows **USD wholesale-level prices — $1.00 to $7.20** [RECONSTRUCTED]; on the `www` host that path now 404s [OBSERVED]. Payment methods: **none — the transaction is offline** [OBSERVED].

**Storytelling.** Structured but generic-collective: *"Woven by hand on traditional looms by artisans in the Kathmandu Valley."* Distinctive **Climate Story** section [OBSERVED] — the only environmental narrative page in the batch. **No named individual makers observed.**

**Impact.** *"100% WFTO Guaranteed"* badge, framed as organisational audit across all 10 Fair Trade Principles [OBSERVED]. **1,200+ producers** [OBSERVED]. Stocked by Ten Thousand Villages (US) [RECONSTRUCTED].

**Brand.** Catalogue reads modern and disciplined in structure and copy [OBSERVED text]; visual premium-ness [UNKNOWN]. Production Ekantakuna/Jawalakhel, showroom **Jhamsikhel** [OBSERVED].

**Business model.** **B2B wholesale/export-first**, NGO-structured, domestic showroom, bulk/customisation service. Deliberately not D2C.

---

## 3. HamroCraft

**Positioning.** *"Nepal's Artisan Marketplace"* [OBSERVED]. Claims the marketplace category but **no seller/vendor pages observed** [UNKNOWN whether genuinely multi-vendor].

**Products.** Six categories with counts: Felt wool (55), Bone jewelries (28), Glass Beads (12), Silver Handicraft (4), Bags and purses (2), Singing Bowl (1) — ~**102 SKUs**, heavily felt-weighted [OBSERVED].

**Pricing anomaly [OBSERVED, high confidence].** Prices render with a **`$` symbol on values that are almost certainly NPR**: Felt Coin Purse **$340.00**, Endless Knot Silver Pendant **$1,020.00**, Silver Ghau Cylindrical Pendant **$2,180.00**. Multiple SKUs show **$0.00**. Footer promises *"Member Discount on every order over $140.00"*; gallery collections named *"Perfect, New Day, Happy Day, Nature, Morning"* [OBSERVED]. Together: **unconfigured WooCommerce theme demo content and a mis-set currency** [INFERENCE from direct evidence].

**Ecommerce UX.** `/about-us/`, `/shop/`, and `/contact/` all return **404** [OBSERVED]. **No payment methods, no address, no phone, no email observed anywhere.**

**Storytelling / Impact.** Category-level claims only; **no named makers, no geography, no process content, no fair-trade credential observed.**

**Assessment.** Templated; demo-content and $0.00 artifacts undercut trust. Likely an unfinished build — re-check in a few months rather than treating as an active competitor.

---

## 4. "Made in Nepal" Stores

**Finding first: there is no single dominant "Made in Nepal Stores" brand.** Searches surfaced **a fragmented category**: Swodeshi, iMartNepal, Creation Nepal, handicraftsinnepal.com, nepalartshop.com, handmadeinnepal.com, plus diaspora-facing US stores.

**Strongest operating exemplar: Swodeshi (swodeshi.com)** — *"Made In Nepal Products Online Worldwide"* [OBSERVED].

- **Positioning:** national-identity commerce — patriotism and diaspora nostalgia, **not** fair trade and **not** design curation [INFERENCE].
- **Products:** Nepali cultural dress and accessories, art and crafts (woodcraft, metalcraft, Buddha statues, Mithila art), Tibetan items, musical instruments, pooja essentials [OBSERVED]. Observed price: Silver Khukuri Brooch **₨3,190** [OBSERVED].
- **UX / payments:** **eSewa, Khalti, and cash-on-delivery nationwide**, plus international shipping [RECONSTRUCTED from its FAQ]. **The only competitor in the batch with confirmed local wallet + COD coverage — the actual Nepali-market table stakes.**
- **Model:** open marketplace (seller form for any Made-in-Nepal manufacturer or trader), plus a pronounced **corporate gifting / event sourcing / bulk-with-custom-branding** line [OBSERVED testimonials].
- **Storytelling/impact:** essentially none — origin ("made in Nepal") *is* the claim.

---

## 5. Himali Green (himaligreen.com)

**Positioning.** *"Nepal's marketplace for organic, natural & handmade goods."* Three explicit promises: *"No tracking pixels, no data sold" · "Sellers keep at least 97%" · "Every product traceable to its maker"* [OBSERVED]. Category owned: **transparent, ethical marketplace infrastructure**. Most modern *product thinking* in the batch — and the least overlapping assortment with MUD.

**Products.** Predominantly **food and personal care** (achar, spices, honey, coffee/tea, snacks) plus three adjacent-to-MUD categories: **Hemp/Cotton, Beauty & Soap, Paper Products** [OBSERVED]. Shop page: 22 products, **Rs 190–1,500** [OBSERVED]. Thin catalogue; curation by seller rather than by house taste.

**Ecommerce UX.** Nav: **Shop · Collections · Stores · Resources · Sell** [OBSERVED]. Category filtering, ratings with review counts. Self-published claims: **Lighthouse 89**, "fastest e-commerce site in Nepal (measured August 2026)" [OBSERVED as claims]. Buyer payment methods **not observed** [UNKNOWN]. Seller-side has **native iOS and Android apps**, inventory controls, batch label printing, role-based team access [OBSERVED].

**Storytelling.** Maker-first by architecture: a **Stores directory organised by geography** — Pokhara (13 sellers), Butwal, Thankot, Sarangkot, Itahari, etc. — with seller names, taglines, product counts, location badges [OBSERVED]. **21+ shops total** — small.

**Impact.** A **structured badge taxonomy**: FairTrade, OrganicCertified, FamilyRun, WomenLed, YouthLed, CommunityImpact, SocialEnterprise, WildHarvested, IndigenousCommunity [OBSERVED]. Sellers upload certificates — **self-declared with document backing**, not third-party audited. Commercial transparency unusually concrete: **7 days commission-free, then 3% per sale capped at Rs 100 per product, no subscription fees** [OBSERVED].

**Business model.** **Multi-vendor marketplace / SaaS-like seller platform.** Thin-margin commission, not product margin.

---

## 6. ACP — Association for Craft Producers / Dhukuti

**Positioning.** *"Crafting a Better Future for Nepalese Artisans."* A Fair Trade *producer organisation* explicitly **"blending traditional craft with contemporary design"** [OBSERVED]. Retail arm Dhukuti: *"Contemporary yet Authentic ✨ Handmade with Love | 🌱Sustainable"* [RECONSTRUCTED, Instagram]. **The closest competitor to MUD's intended space** — contemporary design applied to community-made goods, with a flagship store.

**Scale — most disclosed operation in the batch [OBSERVED].** Founded **1984 by Ms. Meera Bhattarai**, from 38 producers and 5 staff to a **43,000 sq ft owned facility at Rabi Bhawan**. 500+ producers across 8 districts, 30 producer groups, 80 staff; 8 of 11 executive board members women. **Annual turnover exceeds US$1,000,000, ~30% domestic**; exports to **70+ buyers in 20 countries** through sister concern Nepali Craft Trading Pvt. Ltd. *Discrepancy:* FTG Nepal and ACP's Instagram state **1,000+ producers, 90% women, 12 districts** [RECONSTRUCTED] — materially different from the 500/8-district figure on acp.org.np. Two live, inconsistent numbers.

**Products.** 15 categories: Bamboo, Carpentry, Ceramic, Copper, Cotton textiles, Felt, Glass, Jewellery, Knitting, Paper, Tea & Coffee, Wellness, Christmas, Easter [OBSERVED] — **Christmas/Easter lines are a pure export signal**. 18 traditional craft skills. **No prices published anywhere on acp.org.np.**

**Ecommerce UX.** **This is the gap.** acp.org.np is institutional — **no shop, no cart, no prices** [OBSERVED]. A separate `dhukutionline.com` exists with an NPR cart — but indexed snippets indicate its listing pages currently show **no products**; direct fetch failed [RECONSTRUCTED, unconfirmed]. **Effectively: a $1M+ business with a world-class physical store and no functioning consumer ecommerce.**

**Storytelling.** Organisation-level and services-level. Named founder is a strong asset. **No individual artisan profiles observed.**

**Impact.** Strongest credentials in the batch: **WFTO member since 1993, upgraded to Guaranteed Membership 2013; founder chair of Fair Trade Group Nepal; founder member of WFTO Asia** [OBSERVED, corroborated]. Peer-reviewed academic study of 25 years of ACP's organisational innovation exists [RECONSTRUCTED].

**Brand.** Dhukuti: three storeys, 3,000 sq ft, Kupondole, Lalitpur, open daily 10–7; described as a *"three-story treasure trove"* [OBSERVED]. The "treasure trove" framing signals **abundance over edited curation** [INFERENCE].

**Business model.** Producer-org NGO + **export/wholesale (dominant, ~70%)** + domestic flagship retail + tourism footfall.

---

## Summary Table

| Competitor | Positioning / category owned | Price tier (observed) | Ecommerce UX quality | Storytelling depth | Impact evidence | Premium perception |
|---|---|---|---|---|---|---|
| **Mahaguthi** | Heritage moral authority; Gandhian 1927 lineage | Mid-market D2C, ₨335–6,635; most SKUs <₨1,500 | **Moderate.** ~400 SKUs; broken Social Impact link; default WooCommerce refund text; payments unverified; dead .org shop | **High** — 7 named artisans with profile pages | **Strong.** WFTO Guaranteed; **68% revenue to artisans**; 1,100+ makers | Medium — worthy/institutional |
| **Sana Hastakala** | Institutional wholesale credibility; UNICEF-founded 1989 | Wholesale/FOB **$1.00–$7.20** [rec.]; no retail prices | **Low as retail.** No cart; WhatsApp is the transaction. Spec-grade catalogue | **Medium** — collective copy + unique **Climate Story**; no named makers | **Strong.** WFTO Guaranteed; 1,200+ producers | Medium-high on structure |
| **HamroCraft** | Claims "Nepal's Artisan Marketplace"; unverified | Ambiguous — `$` on NPR-looking values; several $0.00 | **Low.** /shop, /about-us, /contact all 404; demo content | **Low** | **None observed** | Low |
| **Swodeshi** | National identity + diaspora + souvenir; corporate gifting | Mid, ₨3,190 brooch | **Best local-market fit: eSewa + Khalti + COD nationwide** | **Low** — origin is the story | **None** | Low-medium |
| **Himali Green** | Transparent marketplace infra; 97% to sellers | Low-mid, Rs 190–1,500 | **Most modern platform.** Seller apps, geo store directory | **Medium-high structurally** — 21+ named sellers with location | **Medium.** Self-declared badges + certificate uploads | Medium — tech-forward |
| **ACP / Dhukuti** | Contemporary design × traditional craft; flagship retail | Not published online | **Weakest online, strongest offline.** No working shop; 3-storey flagship | **Medium** — named founder; no individual makers | **Strongest.** WFTO Guaranteed 2013; >$1M turnover | Medium-high — abundant, not edited |

---

## Open Questions

1. **Payment methods are the single biggest verified gap.** Only Swodeshi confirmed on eSewa + Khalti + COD. Mahaguthi, Himali Green, Dhukuti Online all [UNKNOWN] — checkouts require a populated cart; DNS filter prevented it.
2. **Is HamroCraft actually multi-vendor, or a single exporter using the word?** Unfinished build — re-check later.
3. **ACP's producer count is contradictory:** 500/8 districts (own site) vs 1,000+/12 districts (FTGN + Instagram).
4. **Is dhukutionline.com live, stalled, or abandoned?** If ACP is actively building consumer ecommerce, the strongest offline brand is about to enter the online lane MUD wants.
5. **Sana Hastakala's two-site situation** — WooCommerce USD shop deliberately retired for WhatsApp-led B2B, or broken?
6. **Domestic vs export revenue split** disclosed only by ACP (~30% domestic).
7. **Mobile experience and visual quality entirely unverified** (text-proxy retrieval only). Needs a real browser pass on an unfiltered network.
8. **Corporate gifting** explicit only at Swodeshi. Whether Mahaguthi, ACP or Sana Hastakala run B2B gifting is [UNKNOWN] — a high-margin lane MUD could take.
9. **Nobody in this batch owns "curated, contemporary, community-made homeware with per-product maker traceability."** Mahaguthi has makers but ~400 undifferentiated SKUs; Himali Green has traceability but sells food; ACP has design credibility but no store. That intersection is the observable white space.

**Sources:** [mahaguthi.com.np](https://mahaguthi.com.np/) · [mahaguthi.org](https://mahaguthi.org/) · [wfto.com — Mahaguthi](https://wfto.com/members/mahaguthi-craft-with-conscience/) · [sanahastakala.com](https://www.sanahastakala.com/) · [wfto.com — Sana Hastakala](https://wfto.com/members/sana-hastakala-p-ltd/) · [hamrocraft.com](https://www.hamrocraft.com/) · [swodeshi.com](https://swodeshi.com/) · [himaligreen.com](https://www.himaligreen.com/) · [acp.org.np](https://www.acp.org.np/) · [wfto.com — ACP/Dhukuti](https://wfto.com/brands/association-for-craft-producers-dhukuti/) · [fairtradegroupnepal.org members](https://www.fairtradegroupnepal.org/member) · [dhukutionline.com](https://dhukutionline.com/shop/)