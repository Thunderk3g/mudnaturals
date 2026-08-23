# Open questions — parked, not blocking

Every item here was hit during the build, implemented conservatively, and left
answerable later as a config change rather than a rewrite. Nothing on this list
stopped the build; everything on it blocks **launch**.

Status key: **PARKED** = built around it, safe default shipped · **NEEDS MONEY** ·
**NEEDS A HUMAN** = only the operator can answer.

---

## 1. Product prices are provisional — NEEDS A HUMAN

**Context.** No price appears anywhere in the 24 Instagram screenshots, which are
the only published source of catalogue truth. Every one of the 16 products is
price-silent.

**What shipped.** Provisional NPR prices seeded across a Rs 700–7,800 band,
benchmarked against comparable Nepali contemporary brands (Mheecha holds
Rs 1,550–3,750 domestically). They are real numbers in a real column, so the shop
functions end to end — but they are guesses.

**What changes with an answer.** A single UPDATE per product, or a re-seed. No
code, no schema.

**Blocks launch: yes.** Shipping a guessed price is a commercial decision nobody made.

---

## 2. Per-product maker share — NEEDS A HUMAN

**Context.** This is layer 1 of the impact story and the number that competes with
Mahaguthi's public claim that 68% of sales revenue returns to artisans. Against
that, "20% of profit" loses the comparison badly, so the trade itself has to lead.

Under wholesale (decision 3) this is **computable, not a judgement call**: it is
`stock_intake.unit_cost_paisa ÷ products.price_paisa`. The seed currently writes
an illustrative 55% cost ratio. What is missing is the operator's agreement to
*publish* it.

**What shipped.** `products.maker_share_paisa` is **null** on every product, and
`settings.impact.maker_share_published` is **false**. The PDP impact module and
the per-product figure on `/impact` render nothing at all while that holds — no
placeholder, no "coming soon". A false or provisional number here is worse than
silence for a brand whose entire premise is verifiable provenance.

**What changes with an answer.** Populate `maker_share_paisa`, flip the settings
flag. The UI is already built behind it.

**Blocks launch: yes**, if any impact claim is to appear.

---

## 3. Impact Fund formula — NEEDS A HUMAN

`BUSINESS-MODEL.md` recommends **"20% of net profit, or 1% of revenue, whichever
is greater."** The floor matters: 20% of net profit alone is Rs 0 in a
loss-making first year, and publishing "Impact Fund: Rs 0" destroys the
credibility the fund exists to create. 1% of revenue is cheap and is a mechanism
this market already recognises (a local competitor is a 1% for the Planet member).

**What shipped.** The formula string lives in `settings.impact.fund_formula` and
is rendered as text. No arithmetic is performed on it anywhere.

**Blocks launch: yes**, before any public claim about the fund.

---

## 4. Launch SKU list and category scope — NEEDS A HUMAN

**Context.** All 16 products found in the published material are **Craft & Home**.
There is **zero** evidence for Natural Care, Food & Pantry or Candles & Ritual —
no post, no product shot, no caption.

This matters more than it looks. Corporate and festival gifting were cut at
launch (decision 6), and gifting was the specific answer to curated craft's
structural weakness: people buy a basket once. With gifting deferred, the
frequency engine has to be **Natural Care and Food & Pantry** — the Rs 300–1,500
repeat-purchase categories. If neither is live, MUD launches with no
repeat-purchase mechanism at all and every month's revenue depends on new
customer acquisition.

**What shipped.** Craft & Home is published with 14 live products. The other three
categories exist as **draft** rows, so they are invisible to the storefront but
need no migration to switch on.

**Blocks launch: no** for the shop to function. **Blocks the business model: yes.**

---

## 5. DFTQC food labelling and registration — NEEDS A HUMAN

Nepali food labelling and registration requirements for any tea, honey or candy
are unverified, and they sit directly on the critical path because of question 4.

**What shipped.** `products.is_food` exists; the Food & Pantry category is drafted
and unpublished; the PDP spec table leaves room for ingredient, batch and expiry
rows. Nothing food-related is reachable by a customer.

**Blocks launch: only if food ships.**

---

## 6. eSewa merchant questions — NEEDS A HUMAN (external)

Four unanswered questions, all sent to eSewa merchant support:

1. **Can a callback URL be registered for ePay v2, and what is its payload and
   signature spec?** The docs mention IPN in one sentence with no spec. Until
   answered the build assumes **no reliable notification** and treats the
   reconciliation cron as the primary confirmation channel. That is the safe
   default either way — if an IPN does exist it becomes a latency optimisation,
   not a replacement.
2. **Does a merchant refund API exist, or are refunds portal-only?** Build assumes
   portal-only: the operator refunds manually and records the reference, and the
   cron detects the status flipping to `FULL_REFUND` / `PARTIAL_REFUND`.
3. **Is the Intent flow viable for desktop web?** eSewa labels it "recommended"
   and it has a documented server-to-server callback and materially better failure
   semantics than ePay v2. Worth one email before committing.
4. **Are merchant redirect URLs registered or whitelisted on eSewa's side?** We
   launch on `https://mudnaturals.vercel.app` and will move to a custom domain
   later. Both URLs derive from `NEXT_PUBLIC_SITE_URL`, so our side is a one-line
   change — but if eSewa pins them, that is a launch-day surprise.

**Also unresolved and testable in-house:** the two eSewa doc pages disagree on
whether the UAT secret key ends with a trailing `(`. Ours is configured with it.

**Blocks launch: yes** — production credentials cannot be requested without this
conversation, and switching UAT → production is an explicit stop.

---

## 7. Vercel plan caps cron frequency — NEEDS MONEY

**Context.** The project is on the **Hobby** plan. Hobby caps cron frequency at
**once per day**. Payment reconciliation needs every 2–5 minutes, and because
eSewa provides no reliable callback, that cron is the *primary* confirmation
channel — not a safety net.

**What shipped, so this is not fatal today:**
- `vercel.json` schedules reconciliation at the daily maximum Hobby allows.
- The order-status page **polls itself** every 5 seconds for ~3 minutes, so the
  common case — customer waits on the thank-you page — resolves without any cron.
- The admin payments queue has a **"Check now"** action that runs the
  same handler on demand.
- Handlers are idempotent and cheap, so raising the schedule to `*/5 * * * *` is a
  one-line change the moment the plan is upgraded.

**Blocks launch: yes, effectively.** Without Pro, an order where the customer
closes the tab mid-payment can sit unconfirmed until someone presses a button.

---

## 8. Maker names, portraits and consent — NEEDS A HUMAN

**Context.** Decision 4 requires named makers with real names and photographs
under written, dated, revocable consent. No consent has been collected, and no
personal name or portrait appears anywhere in the source material.

**What shipped — and this is the deliberate part.** The seed contains **no
invented people**. Every maker row is a *workshop-level* record whose display name
is its community ("Kans Weaving Circle", "Pater Mat Weavers", "Gulguliya
Workshop"), and `consent_records` is empty. The storefront therefore shows
community-level attribution everywhere, which is exactly the graceful-degradation
path decision 4 requires for a withdrawn consent — built as the default rather
than bolted on afterwards.

Districts read "Nepal" rather than a plausible-sounding district, because "Rooted
in the wild beauty of Nepal" is the only geography the brand has actually stated.

**What changes with an answer.** Add real names, portraits and dated consent rows
through the admin. No schema change, no layout change.

**Blocks launch: no** — the site is honest as it stands. **Blocks the USP: yes.**
"Objects with origins" is materially weaker at community level than at named-maker
level, and the named maker is the thing no Nepali competitor has.

---

## 9. Product photography — NEEDS A HUMAN

**Context.** Decision 8 removed the photo shoot budget. All 21 product images are
cropped from the brand's own Instagram posts.

**What shipped.** A crop-and-resize pipeline (`scripts/prepare-images.mjs`) that
extracts the photo region from each screenshot to a uniform 4:5. **No image is
generated and none is retouched** — the object in every photograph is the
photographed object, so all are recorded as `origin: 'photograph'`. The design
compensates by leaning on the mono specimen-label layer and the ledger view,
which is precisely the territory that survives modest photography.

**Known quality gaps, from the screenshot audit:**
- Only 2 of 16 products have a clean isolated shot (Reed Clutch, Meditation Mat).
- Six carry a baked-in watermark or wordmark sitting *on the product*: Moon Bag,
  Storage Tray, Woven Placemat, Gulguliya Vase and Pen Stand, Floor Pouf.
- Three share a single frame with no separable shot: Round Braided Table Mat,
  Braided Coaster, Woven Serving Bowl — all three currently use the same image.
- Four exist only as in-hand or lifestyle frames: Ring-Handle Tote, Market Basket,
  Planter Basket, Lace-Trim Sun Hat.
- One asset shows the logo misspelled as **"MUD naturaals"** (double a) printed on
  the Floor Pouf. Confirm before reusing.

**The resolution is operational, not technical.** Decision 7 commits the team to a
maker visit roughly monthly for the journal. Those visits are the photo shoot: a
phone camera in good daylight, shooting object / hands-mid-process / place,
produces portraits, process shots and journal art in one trip.

**Since this was written, the last technical obstacle went away.** The console
now has a photo library: **Website → Photos**, or the picker inside any product,
section, category or collection. Upload straight off a phone — files are rotated
by their EXIF orientation, resized and re-encoded on the way in, so nothing needs
preparing first. Replacing a photograph everywhere it appears is one upload.

That means the twenty-one cropped screenshots can be retired one at a time,
in whatever order the visits happen, with no deploy and no developer. The
watermarked six and the three sharing a single frame are the ones to replace
first.

**Blocks launch: no.** **Caps the premium perception: yes** — but the fix is now
a task for whoever holds the phone, not a ticket.

---

## 10. Instagram is the only sales channel today — NEEDS A HUMAN

Every observed post ends "dm to order". There is no published website, email,
phone or address anywhere in the source material. `/contact` therefore ships
without a fabricated phone number or address — the placeholders are marked in
code comments, not rendered as filler.

**Blocks launch: yes.** A storefront with no contact route fails the trust test
that Nepali consumers apply hardest to unknown D2C brands.

---

## 11. Brand mark inconsistency — NEEDS A HUMAN

Three different wordmark lockups appear across the posts (wide-tracked caps with
script; stacked sans caps; a script signature watermark), plus the circular seal
reading **"MUDNATURALS · CRAFTED BY COMMUNITY"** with a cattail illustration.
The build uses "MUD Naturals" set in the serif, and "Crafted by community" as the
mono tagline — the seal's own words. No logo file exists in the repo.

**Blocks launch: no.** Worth resolving before any print or packaging.

---

## 12. Delivery, returns and FAQ pages — NEEDS A HUMAN

**Context.** The footer linked to `/shipping`, `/returns`, `/faq` and `/orders`,
and the header to `/account`. None of those routes exist. Because the links sat
in the site chrome they appeared on **every page**, and Next prefetched all of
them on hover — so a customer moving a mouse across the footer generated four
404s. That is what showed up in the browser console as
`shipping?_rsc=…  404`.

**What shipped.** The links now point only at routes that exist: `/order/lookup`
for tracking, `/contact` for everything else. The header's person icon became a
parcel — checkout is guest-only by design, so an account icon was promising
something that does not exist and never will.

**What is still missing, and it is content, not code.** A shop needs to say how
long delivery takes, what happens to a damaged basket, and whether anything can
be sent back. Nobody has written that policy, and it cannot be invented here:
returns terms are a commercial commitment, and for food they are a legal one.

The same applies to **privacy and terms**, which the footer also linked at and
which have also been removed. Checkout collects a name, a phone number and a
delivery address, so a privacy policy is not optional — but a 404 where one
should be is worse than an honest absence, and worse than a policy written by
someone with no standing to write it. Five pages are now owed: delivery,
returns, FAQ, privacy, terms.

**What changes with an answer.** Write the three policies. They then need
somewhere to live — either three new routes, or (better) extend
`page_blocks.page_key` beyond `home | about | shop` so the console can build
them as ordinary pages with no deploy. The second is about an hour's work and
the block editor already handles everything such a page needs.

**Blocks launch: yes** for returns and delivery. A Nepali customer paying cash
on the doorstep will ask both questions before they order.

---

## 13. Decisions taken alone, recorded for review

Per the autonomy rules these were reversible and did not warrant a stop. Flagging
them so they are not silently inherited:

- **No `customers` → `auth.users` link is exercised.** Customer identity is
  **phone-first**, because Nepali D2C is phone-identified and the courier calls
  before delivering. Guest checkout is the only path; there is no customer login.
- **Admin auth is a single shared password** plus an HMAC-signed httpOnly cookie,
  not per-person accounts. Appropriate for a team of a few, and it means the
  `audit_log` actor column is coarse. Per-person accounts are a later change.
- **`postgres` (direct connection) rather than `supabase-js`** for all server
  reads and writes. The service-role key was never supplied, and the direct
  connection is both simpler and safer here: the Data API stays fully revoked, as
  the smoke test proves.
- **Stock is reserved at order creation** with a 15-minute expiry, not decremented
  at cart. Reservations are released by the expiry cron when a payment dies.
