# MUD Naturals — Indian/South Asian Consumer Ecommerce Expectations and UX Implications

**Headline finding first:** the stack as briefed is internally contradictory. eSewa's ePay v2 API is a Nepal-only gateway settling in NPR only ([eSewa developer docs](https://developer.esewa.com.np/pages/Epay); [PayBridgeNP merchant guide](https://paybridgenp.com/blog/esewa-merchant-account-api-guide)). If MUD sells to Indian consumers, eSewa cannot process a single order. If MUD sells to Nepal, most of the India-specific research below still applies directionally but the payment stack, wallet mix, and logistics assumptions change materially. **This must be resolved before any checkout code is written** — it determines the payment provider, the currency, the address model, and the COD policy. Everything below is written to be usable either way, with the Nepal deltas isolated in section 2.

---

## 1. Findings by area

### 1.1 Mobile-first behaviour

**Evidence.** Mordor Intelligence's India ecommerce report puts smartphones at 76.42% of market share in 2025; Flipkart and Amazon India have both stated over 85% of platform traffic comes from mobile apps. Purchases made via smartphone rose from 45% to 49% of orders. Baymard's mobile checkout research (as summarised by [Total Commerce](https://totalcommerce.partners/blogs/articles/the-current-state-of-checkout-ux-a-comprehensive-look-at-the-key-insights-and-best-practices)) finds mobile abandonment at 80–85% vs 66–70% on desktop.

**Strong inference.** For a new D2C brand with no app, effectively all early traffic will be mobile web arriving from Instagram/WhatsApp links — an in-app browser context with no autofill, no saved cards, and aggressive memory limits.

**Recommendation.** Design and build the mobile viewport first and treat desktop as the adaptation, not the reverse. Ship a single-column checkout, thumb-reachable primary CTAs, native input types (`inputmode="numeric"` for pincode/phone), and no hover-dependent interactions. Budget for a sub-2s LCP on a mid-tier Android over 4G — Next.js static/ISR product pages with `next/image` covers this without extra tooling. *Why:* mobile is not a segment here, it is the product.

### 1.2 COD expectations

**Evidence.** COD remains 60–70% of Indian ecommerce orders ([GoKwik](https://www.gokwik.co/blog/what-is-return-to-origin-rto-in-ecommerce); ET Prime Research 2024 cited by [Razorpay](https://razorpay.com/blog/cash-on-delivery/)). RTO on COD orders runs 20–30% vs 2–3% prepaid; GoKwik's data across 180M+ shoppers puts India's average RTO near 23%, with fashion/footwear/general merchandise touching 40%. Indian D2C brands collectively lose an estimated ₹8,000+ crore/year to RTO ([TrackVid](https://trackvid.in/blogs/rto-in-ecommerce-india.html)).

**Why it persists (strong inference, well-supported):** COD is a trust instrument, not a payment preference. It transfers risk from an unknown seller to the moment of physical inspection — exactly the anxiety EY documents (78% of Indian consumers hesitate to buy online because they cannot physically assess the product).

**Recommendation.** Offer COD, but price and gate it. Concretely: (a) a small prepaid incentive (₹30–50 or 5%) shown *at the payment step*, which sources report converts 8–12% of COD intenders to prepaid; (b) OTP or WhatsApp confirmation on COD orders before dispatch — Indian D2C brands report RTO dropping from 30–35% to 18–22% within a month ([CampaignHQ](https://blog.campaignhq.co/cod-confirmation-whatsapp-reduce-rto)); (c) partial COD (small prepaid token + balance on delivery) as the next lever if RTO stays high. *Why:* removing COD outright suppresses first-order conversion for an unknown brand; leaving it ungated puts ~a quarter of shipped units back on a truck.

### 1.3 UPI dominance, failures, and retry UX

**Evidence.** UPI accounts for ~81% of India's retail digital payments in FY2024-25, rising toward ~85% ([NPCI/PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2257087&reg=3&lang=2)). NPCI tracks Technical Decline (bank/NPCI side, target <1%; system-wide TD fell from 8–10% in 2016 to ~0.8% in 2025) separately from Business Decline (wrong PIN, insufficient balance, target <5%) ([productgrowth.in](https://productgrowth.in/insights/fintech/upi-payment-success-rates/)). Merchant-level *end-to-end* success is much lower than the network number: pure-aggregator setups land around 71–74%, tuned routing around 79–82% ([bepragma](https://www.bepragma.ai/blogs/payment-success-rate)). Automated retries recover 15–20% of failed transactions ([Razorpay](https://razorpay.com/blog/payment-success-rate-optimization-india/)).

**Recommendation.** Make UPI the default and visually first payment method (UPI Intent deep-link on mobile, not a QR code — QR is a desktop pattern). Persist the order server-side *before* redirecting to the gateway so a failed/abandoned return lands on a "Retry payment" screen with everything preserved, one tap. Never destroy the cart on failure. Distinguish "payment failed" from "payment pending" in copy — UPI settles asynchronously and a premature failure message triggers duplicate payments and support tickets. *Why:* at realistic merchant success rates, roughly one in four to one in five payment attempts needs a recovery path; that path is worth more than any acquisition spend at MUD's stage.

### 1.4 Trust building for an unknown D2C brand

**Evidence.** EY India (Aug 2024): 77% worry about data breaches when shopping online, 73% fear private information exposure, 78% prefer platforms offering human customer service, and 84% report buying based on an influencer recommendation. Baymard's checkout abandonment list puts "didn't trust the site with my card information" at 19% and returns-policy dissatisfaction at 13%. Indian Retailer's coverage of D2C trust research identifies product reviews and visible secure-payment signals as the leading drivers, and an elaborate About Us page with a real business address and named team members as an authenticity marker.

**Strong inference.** Review *volume and recency* signal more than rating: a 4.3 with hundreds of reviews outperforms a 4.8 with twelve. For a natural/handcrafted social enterprise, provenance is the trust asset — maker names, sourcing, batch/ingredient transparency.

**Recommendation.** On every product page: real photographs (not renders), ingredient/material list, maker or artisan attribution, and a visible reviews block that shows count. Site-wide: a real About page with founding story, registered address, and named humans; a phone number and WhatsApp link in the header/footer; policy pages (returns, shipping, privacy) reachable in one tap from checkout. Do not fabricate review counts — launch with an honest "be the first to review" state plus founder-story content instead. *Why:* the counterfeit/quality anxiety documented for Indian beauty and wellness categories is exactly MUD's category, and provenance is the one signal a social enterprise can supply more credibly than a marketplace seller.

### 1.5 Shipping and delivery expectations

**Evidence.** Baymard: extra costs (shipping/tax/fees) is the #1 fixable abandonment reason at 40%; "delivery was too slow" is #2 at 20%; "couldn't see total cost upfront" 12%. Globally, 88% of consumers call real-time tracking critical ([capitaloneshopping research](https://capitaloneshopping.com/research/ecommerce-delivery-statistics/)). Indian expectations for ultra-fast delivery have moderated (46% expecting 2-hour delivery in 2022 → 36% in 2023, per ECDB-cited data).

**Strong inference.** MUD cannot compete on speed against quick-commerce, and does not need to for a considered handcrafted purchase — but it must compete on *certainty*. Unquantified "3–7 days" is worse than a specific date.

**Recommendation.** Show a delivery estimate on the product page once a pincode is entered, and show the final total (including shipping) before the payment step, never after. Set one clear free-shipping threshold and display progress toward it in the cart. Send tracking proactively (see 1.8) rather than relying on the customer visiting an order page. *Why:* the single largest fixable abandonment cause in the global data is cost surprise, and it costs nothing to fix architecturally if handled at cart, not checkout.

### 1.6 Regional language

**Evidence.** KPMG–Google's *Indian Languages: Defining India's Internet* found 234M Indian-language internet users vs 175M English users in 2016, projected 9 of every 10 new users through 2021 to be local-language, and 88% of Indian-language users more likely to respond to advertising in their own language. Meesho's growth engine explicitly relies on vernacular UI, vernacular voice search, and AI-translated product descriptions, with ~50% of its user base in tier-4+ towns.

**Strong inference — and this is the important nuance.** The vernacular imperative is strongest for *value-led, tier-3/4, discovery-driven* commerce. Premium urban D2C (Nykaa's own D2C brands, most Instagram-led natural-skincare labels) operates successfully in English because its audience self-selects as English-comfortable. MUD's positioning determines which side it is on.

**Recommendation.** Ship English-only v1. Do not build an i18n framework for a language you have no content for. Do keep copy short, plain, and translatable, and keep strings out of components so Next.js i18n routing can be added later without a refactor. Revisit when analytics show meaningful tier-3+ traffic. *Why:* this is the clearest YAGNI in the brief — half-translated stores read as less trustworthy than confidently monolingual ones.

### 1.7 Address collection

**Evidence.** Indian addresses are non-standardised, frequently landmark-anchored, and often lack consistent component ordering — a documented problem for logistics and platforms alike ([Smarty](https://www.smarty.com/global-address-formatting/india-address-format-examples); [Google Maps India address guidance](https://developers.google.com/maps/countries/india/india-address-feedback)). A pincode already encodes city and state, yet most Indian checkout forms still ask for all three ([UX in India](https://medium.com/ux-for-india/auto-filling-address-with-pin-codes-idea-to-improve-e-commerce-forms-91df568368be)). Baymard: average checkout has ~14.9 form fields against an ideal of ~7; forced account creation drives 18% of abandonment.

**Recommendation.** Pincode-first: ask pincode → auto-fill city and state (read-only, editable on request) → then flat/house, building/street, area/locality, and an explicit optional **Landmark** field. Guest checkout must be the default and most prominent path; offer account creation *after* order confirmation, pre-populated. Phone number is mandatory (couriers call), email optional. *Why:* this removes 2–3 fields, matches how Indians actually recite addresses, and the landmark field measurably reduces failed-delivery RTO.

### 1.8 WhatsApp commerce and communication

**Evidence.** WhatsApp has 550M+ MAU in India and is the primary service channel for most consumer brands; over 30% of Indian ecommerce brands use the WhatsApp API for order tracking; reported read rates are ~98% with ~70% broadcast read rates in India, and 90% of messages read within 3 minutes ([WABA/NXC stats compilation](https://waba.nxccontrols.in/blog/25-whatsapp-business-stats-every-indian-business-must-know); [WizMessage](https://wizmessage.com/blog/whatsapp-business-statistics)). India's WhatsApp commerce GMV was projected at ₹2.5 lakh crore in 2025. Abandoned-cart WhatsApp reminders are reported to recover up to 35% of carts. *Caveat: these engagement figures come from vendors selling WhatsApp tooling; treat direction as reliable, magnitude as optimistic.*

**Recommendation.** Treat WhatsApp as the primary transactional channel and email as the archive. Minimum viable: order confirmation, COD confirmation request, dispatch + tracking link, delivery confirmation, and a support entry point (`wa.me` deep link, no API needed for inbound). Collect explicit opt-in at checkout. Add API-based templates only once volume justifies the WABA setup cost. *Why:* email open rates in this market do not compare, and the COD-confirmation message doubles as the single highest-ROI RTO control.

### 1.9 Support, returns, and authenticity anxiety

**Evidence.** EY India: 78% prefer platforms with human support; top frustrations are damaged goods (21%), inadequate support (20%), refund difficulty (19%). Indian return rates run 25–40% overall ([Instamojo](https://www.instamojo.com/blog/ecommerce-returns-in-india-what-you-should-know-for-your-d2c-business/)); fashion/footwear 25–35% (to ~40% in festive), **beauty 4–12%, held down by hygiene-based non-returnability** ([Richpanel benchmarks](https://www.richpanel.com/learn/ecommerce-return-rates)). Abusive returns rose 64% between Jan 2024 and May 2025.

**Recommendation.** Publish a plain-language returns policy stating exactly what is returnable (unopened/unused for consumables), the window, and who pays return shipping — before checkout, not after. Offer damage/wrong-item replacement generously and separately from change-of-mind returns; the EY data says damaged goods is the top frustration, and a fast no-argument replacement is a cheaper trust purchase than any ad. Publish batch/manufacture dates and ingredient sourcing on-page to pre-empt authenticity doubt. *Why:* MUD's category is structurally low-return; the policy's job is reassurance at purchase, not return volume management.

---

## 2. India vs Nepal — what actually differs

| Dimension | India | Nepal |
|---|---|---|
| Dominant rail | UPI, ~81–85% of retail digital payments (NPCI/PIB) | Wallets: eSewa, Khalti/IME Khalti; Fonepay QR crossed 1M QR transactions in a day ([Simpaisa](https://www.simpaisa.com/blogs/nepals-digital-payment-boom-2025-market-landscape-and-the-road-ahead/)) |
| COD share | ~60–70% of orders (GoKwik/ET Prime) | Higher — reported around 80% of ecommerce payments ([cloco.com.np](https://cloco.com.np/blog/ecommerce-nepal-2025-trends)) |
| Gateway for MUD | eSewa **cannot** be used; needs Razorpay/Cashfree/PayU + UPI | eSewa ePay v2 valid; NPR-only; pair with Khalti for coverage |
| Market size | Multi-hundred-billion USD | ~US$1.3–1.4B in 2025, ~25% user penetration |
| Addressing | Non-standard but pincode system works | Weaker still — no reliable standardised addressing; terrain-driven logistics cost ([BizSewa](https://bizsewa.com/how-daraz-could-and-fix-nepals-digital-marketplace-and-why-it-should/)) |
| COD friction | Widely free to customer | "Cash handling fee" on COD is a known consumer grievance |
| Trust anchor | Reviews, secure-payment badges, brand provenance | COD itself plus a real return policy is the stated trust mechanism (Daraz leadership) |

**Implication:** the UX skeleton (mobile-first, COD-plus-verification, WhatsApp updates, landmark-friendly address, guest checkout, delivery certainty) is common to both. What forks is the payment component, currency formatting, the pincode/postal auto-fill logic, and the COD gating aggressiveness (harsher in Nepal, where COD share is higher and reverse logistics costlier).

---

## 3. UX implications ranked for MUD

1. **Resolve India vs Nepal.** Blocks payment integration, currency, address model, and shipping copy. Nothing else should be built until this is answered.
2. **Payment-failure recovery path.** Order persisted pre-redirect, one-tap retry, pending-vs-failed distinction. Highest revenue-per-line-of-code in the build.
3. **COD offered but gated** — prepaid nudge at payment step + WhatsApp/OTP confirmation before dispatch. Directly attacks the 20–30% COD RTO.
4. **Guest checkout, pincode-first address with landmark field**, phone mandatory. Removes the two biggest form-level abandonment causes.
5. **Total cost visible in cart**, single free-shipping threshold with progress, pincode-based delivery estimate on PDP.
6. **WhatsApp transactional messaging** for confirmation, dispatch, delivery, and support entry.
7. **Trust surface**: About page with real address and named people, visible contact number, provenance/ingredient detail per product, honest review state.
8. **Plain-language returns and replacement policy**, reachable pre-checkout.
9. **Mobile performance budget** — in-app-browser-safe, sub-2s LCP on mid-tier Android.
10. **Regional language** — deliberately deferred; keep strings extractable.

---

## 4. Open questions

- **Which country is MUD selling to?** The single blocking ambiguity. eSewa in the brief points to Nepal; the research framing points to India. A cross-border Nepal→India or India→Nepal model would need customs, currency, and a second gateway — materially different scope.
- **If India:** which gateway (Razorpay/Cashfree/PayU), and is a checkout layer like GoKwik/Shiprocket worth it at launch volume, or is that premature spend?
- **If Nepal:** eSewa alone, or eSewa + Khalti + COD? What is MUD's stance on passing the COD handling fee to customers?
- **Price point and AOV** — determines whether COD gating, partial-COD, and free-shipping thresholds are worth the friction.
- **Category return profile** — are MUD's products consumables (low return, hygiene-exempt) or textiles/craft (higher return, sizing risk)? Changes the returns policy and the RTO exposure by a factor of several.
- **Audience tier** — urban premium English-comfortable, or broader tier-2/3? Decides the vernacular question and the tone of the trust content.
- **Evidence gaps:** several WhatsApp engagement and RTO-reduction figures come from vendor blogs rather than independent research; Nepal-specific consumer UX research is thin and mostly Daraz-anecdotal. Both warrant validation against MUD's own first 500 orders rather than being treated as settled benchmarks.