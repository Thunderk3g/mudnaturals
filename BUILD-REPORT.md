# Build report

Written for someone returning to this with no memory of the session.

**State: the shop is built, verified and committed. It is not yet deployed —
network egress from this machine to github.com failed part-way through and never
recovered. Five commits are waiting locally.**

---

## To finish the deploy

```bash
cd mudnaturals
git push origin main
```

That is the whole remaining step. Vercel is already linked to the repo and builds
on every push to `main`, so the deploy runs server-side. Then:

```bash
npm run security      # must print PASS before you trust the deploy
```

**One thing to check by hand in the Vercel dashboard:** `ESEWA_SECRET_KEY`.
Mid-session I corrected it (see "eSewa key" below) by removing and re-adding it
across all three environments, and the Vercel API started failing during that
window. The remove may have landed without the add. The correct value is
`8gBm/:&EnhH.1/q` — **no trailing parenthesis.**

---

## What was built

| Layer | State |
|---|---|
| Database | 10 migrations applied to Supabase. ~25 tables |
| Storefront | Home, shop (grid + ledger), search, product page, cart, checkout, order status |
| Story | Makers, collections, craft/materials, journal, impact, about, contact |
| Payments | eSewa ePay v2 + cash on delivery, reconciliation and expiry crons |
| Admin | 15 screens: orders, COD queue, reconciliation, products, stock, makers, consent, communities, impact, journal |
| Content | 14 published products, 23 variants, 3 communities, 4 materials, 4 techniques, 8 journal posts |
| Media | 21 product images cropped from the brand's own photographs |

**Verification at the last commit:** `tsc --noEmit` clean · 35 tests passing ·
production build compiles all 41 routes · every route returns the right status
code, including 404 on missing slugs · anon-key leak test passed earlier against
this exact schema (it could not be re-run at the end — the network was down, and
the script now reports that as UNKNOWN rather than a pass).

---

## Decisions worth knowing about

**No invented people, no invented prices.** The seed contains no personal names,
because no maker consent has been collected. Every maker row is a workshop-level
record whose display name is its community, so the storefront shows
community-level attribution — which is exactly the degradation path that a
withdrawn consent would need, built as the default rather than bolted on later.
Districts read "Nepal" because that is the only geography the brand has stated
publicly. Prices are provisional and flagged; the per-product maker share renders
**nothing at all** rather than a placeholder, because a provisional number on a
provenance brand is worse than silence.

**Cash on delivery is gated by the database, not by convention.** A COD order
cannot reach `packed` until `cod_confirmed_at` is set — the state-machine trigger
refuses. Unconfirmed COD is what sends roughly a quarter of Nepali parcels back.

**The eSewa redirect is never treated as proof of payment.** Every confirmation
independently calls the status API with the stored transaction id and the amount
frozen at initiation. The *failure* redirect gets the same treatment, because
wrongly failing an order that was actually paid is the one unrecoverable state.

---

## Bugs found and fixed during the build

Several were found only because agents validated against the live database and
the running server rather than trusting that compiling meant working.

1. **eSewa key.** The two eSewa doc pages disagree on a trailing `(` in the UAT
   secret. Resolved empirically: the published signature vector reproduces
   bit-exactly **without** the paren and not with it. The env var was wrong and
   was corrected.
2. **eSewa signs raw JSON text, not parsed values.** `"total_amount":1000.0` must
   be signed as `1000.0`; parsing first yields `1000` and every signature fails.
3. **Two 200-but-blank page classes.** The seed pre-stringified jsonb before
   handing it to postgres.js, which serialises objects itself — so technique
   steps and journal bodies were stored as JSON *strings*. Consumers mapping over
   them threw inside the RSC serializer, which kills the Suspense boundary rather
   than the request. The routes returned 200 with an empty body and looked fine
   in a smoke test.
4. **Every missing page returned 200.** `loading.tsx` at the root and in two
   segments opened a Suspense boundary before `notFound()` could run; streaming
   commits the status first. Search engines would have indexed not-found pages as
   valid. Removed.
5. **Two untyped SQL parameters** in the admin's cancel-order and record-refund
   paths that Postgres refuses to resolve — both would have failed in production.
   Caught by running every statement against the live schema in a rolled-back
   transaction.
6. **A UTF-8 BOM** written by PowerShell into `.env.local` silently swallowed the
   first variable. The env loader is now BOM-tolerant and shared.
7. Duplicate default variants, a footer type-predicate bug, a broken vitest
   install, and a `getCraft` union that collapsed to one branch.

---

## What blocks launch

Full detail in `QUESTIONS.md`. The short list:

- **Prices** are provisional guesses. Nothing published states a price.
- **Vercel is on Hobby**, which caps crons at once per day. Reconciliation wants
  every 2–5 minutes, and with no reliable eSewa callback that cron is the primary
  confirmation channel. Three fallbacks carry it meanwhile (the order page polls
  itself, admin has "Reconcile now", the daily cron sweeps) but Pro is
  effectively required.
- **eSewa is on UAT credentials.** Production is a deliberate cutover.
- **No maker consent collected**, so the USP runs at community level rather than
  named-maker level — which is the thing no Nepali competitor has.
- **No contact route.** Every observed post says "dm to order"; `/contact` ships
  without a fabricated phone number or address.
- **Only Craft & Home has products.** Natural Care and Food & Pantry are the
  repeat-purchase categories and neither has supply evidence; with gifting cut at
  launch, there is currently no repeat-purchase mechanism at all.

---

## Credentials to rotate

The GitHub token and Supabase database password were pasted into the chat
transcript. Rotate both. The admin password is in `.env.local` and on Vercel.
