# eSewa Integration Architecture — MUD Naturals (Next.js/Vercel + Supabase)

## 1. eSewa ePay v2 — Verified API Facts

**Source: https://developer.esewa.com.np/pages/Epay (and /pages/Epay-V2, /pages/Test-credentials, /pages/Intent)**

**Endpoints (EVIDENCE)**

| Purpose | UAT | Production |
|---|---|---|
| Payment form POST | `https://rc-epay.esewa.com.np/api/epay/main/v2/form` | `https://epay.esewa.com.np/api/epay/main/v2/form` |
| Status check (GET) | `https://rc.esewa.com.np/api/epay/transaction/status/` | `https://esewa.com.np/api/epay/transaction/status/` |
| Merchant portal | — | `https://merchant.esewa.com.np` |

**Initiation is a browser form POST, not a server API call (EVIDENCE).** Required fields, all non-null: `amount`, `tax_amount`, `product_service_charge`, `product_delivery_charge`, `total_amount`, `transaction_uuid`, `product_code`, `success_url`, `failure_url`, `signed_field_names`, `signature`. `transaction_uuid` must be "unique on every request" and supports **alphanumeric and hyphen only** — a UUIDv4 is legal as-is.

**Signature (EVIDENCE).** HMAC-SHA256, base64-encoded, over a comma-joined `key=value` string in the exact order named by `signed_field_names`:

```
total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST
```

Docs state the fields "should be in the same order while creating the signature." UAT secret key: `8gBm/:&EnhH.1/q(` — note the **/pages/Test-credentials page prints it without the trailing `(`** while /pages/Epay includes it. Treat the trailing paren as correct and make the key an env var, not a constant (see Open Questions).

**Response (EVIDENCE).** eSewa redirects the browser to `success_url` with the response **base64-encoded in the query string**. Decoded:

```json
{ "transaction_code":"000AWEO", "status":"COMPLETE", "total_amount":1000.0,
  "transaction_uuid":"250610-162413", "product_code":"EPAYTEST",
  "signed_field_names":"transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
  "signature":"62GcfZTmVkzhtUeh+QJ1AqiJrjoWWGof3U+eTPTZ7fA=" }
```

Docs explicitly instruct: *"Make sure you verify the integrity of the response body by comparing the signature that we have sent with the signature that you generate."*

**Status check (EVIDENCE).** `GET .../api/epay/transaction/status/?product_code=&total_amount=&transaction_uuid=`. **No authentication header or token is documented.** Response: `{product_code, transaction_uuid, total_amount, status, ref_id}`. Statuses and documented meanings: `PENDING` (initiated, not complete), `COMPLETE` (successful), `FULL_REFUND`, `PARTIAL_REFUND`, `AMBIGUOUS` ("payment is at hult [halt] state"), `NOT_FOUND` ("terminated at eSewa: session expired"), `CANCELED` ("canceled/reversed from eSewa side").

**Session expiry (EVIDENCE).** *"If payment is not made within 5 minutes of login then transaction will be failed and user must reinitiate the transaction."*

**No IPN/webhook for ePay v2 (EVIDENCE, negative).** The ePay v2 page contains no webhook, callback-URL registration, or server-to-server notification section. The Epay-V2 page mentions IPN in one sentence — *"eSewa application will automatically notifies partner merchant… through Instant Payment Notification (IPN)"* — with **zero technical detail, no registration mechanism, no payload spec**. The newer **Intent** flow (`rc-checkout.esewa.com.np/api/client/intent/payment/{book,status,cancel}`) *does* document a real POST callback, but it is deeplink/mobile-app oriented and a different product code (`INTENT`).

**→ Architectural consequence: for ePay v2 you must assume there is no reliable server-to-server notification. The browser redirect plus your own polling of the status API is the entire notification surface.** This is the single fact that shapes everything below.

**Currency (INFERENCE, not stated).** No currency field exists in the API and no currency is documented. eSewa is a Nepali wallet settling to NPR bank accounts; amounts are implicitly NPR. Treat as NPR-only.

**Refunds (INFERENCE + gap).** The status enum includes `FULL_REFUND`/`PARTIAL_REFUND`, so refunds exist as a concept eSewa can report. **No refund API is documented anywhere in the developer docs.** Third-party blogs claiming "refunds via API with the original transaction_uuid" are SEO content with no primary source — do not rely on them. Assume refunds are operator-initiated in the merchant portal or via eSewa support, and that your only programmatic signal is the status flipping to `*_REFUND`.

**Settlement (UNVERIFIED).** Not documented. Assume merchant-wallet → bank settlement is configured/initiated in the merchant portal.

---

## 2. Payment Flow and Order State Machine

**Order-first, with a separate payment-attempt entity.** Payment-first is impossible here: the signature commits you to a `total_amount` before the user leaves your site, so the priced order must already exist server-side. But do **not** put `transaction_uuid` on the order — eSewa requires uniqueness per *request*, and a customer who fails and retries needs a fresh one. One order → N payment attempts.

**Initiation (server action / route handler):**
1. Server recomputes the cart total from the `products` table. **The client never supplies an amount.** Persist the line-item price snapshot on the order.
2. Insert `order` (`status='pending_payment'`) + `order_items` in one transaction, decrementing/reserving stock if you reserve at all.
3. Insert `payment_attempt` with `id = gen_random_uuid()` used directly as `transaction_uuid`, `amount_paisa` copied from the order, `status='initiated'`, `expires_at = now() + interval '15 minutes'`.
4. Sign and render an auto-submitting form to the eSewa URL. Signing happens on the server; the secret key never reaches the browser. Node runtime, not Edge (`node:crypto`).

**Return (`/api/esewa/return`, one GET handler for both success and failure URLs, distinguished by path):**
1. Base64-decode `data`, recompute HMAC over the fields named in the returned `signed_field_names`, timing-safe compare.
2. **Regardless of what the payload says, call the status API** with your *stored* `total_amount` and `transaction_uuid`. The redirect is a user-agent navigation: replayable from history, forgeable, and arriving over a channel you don't control. Signature verification proves eSewa authored *some* payload; only the status call proves *this* transaction is currently complete for *this* amount.
3. Compare `status === 'COMPLETE'` **and** returned amount (parsed to paisa) equals the stored attempt amount **and** the attempt belongs to the order you're about to fulfill.
4. Apply the transition through a single Postgres function (below). Redirect to a thank-you page that reads state from the DB, never from the query string.

**Order state machine.** Transitions are performed **only** by (a) the return handler, (b) the reconciliation cron, (c) an admin action. Never by client code.

```
cart ──create──▶ pending_payment ──┬── COMPLETE (verified) ──▶ paid ──▶ fulfilling ──▶ shipped ──▶ delivered
                                    ├── CANCELED / user abort ──▶ failed ──▶ (retry: new attempt, back to pending_payment)
                                    ├── NOT_FOUND + past expiry ──▶ expired
                                    └── AMBIGUOUS ──────────────▶ manual_review
paid ──▶ refund_requested ──▶ refunded / partially_refunded     (all operator-driven)
COD:  cart ──▶ confirmed(payment_method='cod', payment_status='unpaid') ──▶ shipped ──▶ delivered(payment_status='paid')
```

`failed` and `expired` are non-terminal for the *cart* — the customer may re-pay the same order via a new attempt. `paid` is reachable exactly once per order and is enforced by a DB constraint, not by application logic.

---

## 3. Failure-Mode Catalog

| # | Failure | Consequence | Required mitigation |
|---|---|---|---|
| 1 | Client posts a tampered `total_amount` | Goods shipped for Rs 1 | Amount computed server-side from `products`; signature covers `total_amount`; return handler re-checks status-API amount against the **stored** attempt amount, not the returned one |
| 2 | Attacker crafts/replays a `?data=` payload at the success URL | Fraudulent `paid` order | Signature verify **plus** mandatory status-API call **plus** attempt-ownership check. A replayed genuine payload is idempotent (see #4), not additive |
| 3 | User double-clicks "Pay" / re-POSTs via back button | Two attempts, possibly two charges | Idempotency key from the client (`Idempotency-Key` header or a form nonce) unique-indexed on `payment_attempts`; return the existing attempt instead of creating a second. Reuse of a `transaction_uuid` is rejected by eSewa anyway |
| 4 | Return handler invoked twice (refresh, retry, cron race) | Double stock decrement, double email | Transition is `UPDATE orders SET status='paid' WHERE id=$1 AND status<>'paid'` inside a function that takes `SELECT … FOR UPDATE` on the order row; downstream side-effects keyed off the affected-row count |
| 5 | **Payment succeeded, browser never returned** (closed tab, mobile app didn't hand back, network drop) | Customer charged, order stuck `pending_payment`, support ticket | **Mandatory** Vercel Cron every 2–5 min polling the status API for every attempt in `initiated`/`pending` created in the last N hours, with exponential back-off per attempt. This is not optional because there is no verified IPN |
| 6 | Status API is down/slow during the return | Customer sees an error on a successful payment | Never fail the customer to `failed` on a network error. Mark `verification_pending`, show "we're confirming your payment", let the cron resolve it |
| 7 | Verification succeeded, order write failed | Money taken, no order | The status API is the durable source of truth and is re-queryable indefinitely. The same cron that handles #5 retries the write. **Skip a transactional outbox** — it would only protect a side effect that is already replayable from an authoritative external system |
| 8 | Status returns `AMBIGUOUS` | Auto-fulfilling risks shipping unpaid goods; auto-failing risks stranding a paid customer | Route to `manual_review` queue. Never auto-transition on `AMBIGUOUS`. Keep re-polling; it usually resolves |
| 9 | `NOT_FOUND` returned for a genuinely completed payment shortly after redirect | Premature `expired` | Only transition to `expired` when `NOT_FOUND` persists **and** `now() > expires_at`. Docs tie `NOT_FOUND` to session expiry, but eventual consistency is unverified |
| 10 | Customer pays twice for one order (two attempts both `COMPLETE`) | Overcharge | Partial unique index allowing at most one `succeeded` attempt per order; the second lands in `overpaid` → manual refund workflow |
| 11 | Stock sold out between initiation and confirmation | Paid order that can't ship | Either reserve stock at initiation with a TTL released on expiry, or accept oversell and refund manually. For MUD Naturals' volume, reserve-at-initiation with a 15-min TTL is the cheaper correctness story |
| 12 | Secret key leaked / rotated | Signature mismatch across the board | Key in Vercel env vars only; accept the previous key for response verification during a rotation window |
| 13 | Refund needed | No API exists | Operator does it in the merchant portal and records it; the cron detects `FULL_REFUND`/`PARTIAL_REFUND` on the status API and reconciles the order state. Do not build a refund API client |
| 14 | Vercel function timeout mid-verification | Same as #7 | Cron covers it; keep the handler's own work minimal and push email/notifications to a queue or a follow-up job |

---

## 4. Supabase / Postgres Schema Implications

Money as **`integer` paisa** throughout. Never `float`, never `numeric` mixed with the API's `100.0`. Parse the status API's `total_amount` defensively (`String(v).replace(/,/g,'')` → round to paisa) before comparing.

```sql
create type order_status as enum ('pending_payment','paid','failed','expired',
  'manual_review','confirmed','shipped','delivered','cancelled','refunded','partially_refunded');
create type payment_attempt_status as enum ('initiated','pending','succeeded','failed',
  'expired','ambiguous','refunded','partially_refunded');

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  status order_status not null default 'pending_payment',
  payment_method text not null check (payment_method in ('esewa','cod')),
  total_paisa integer not null check (total_paisa > 0),
  currency text not null default 'NPR' check (currency = 'NPR'),
  created_at timestamptz not null default now()
);

create table payment_attempts (
  id uuid primary key default gen_random_uuid(),   -- == transaction_uuid sent to eSewa
  order_id uuid not null references orders(id),
  status payment_attempt_status not null default 'initiated',
  amount_paisa integer not null,                   -- frozen snapshot; used for status-API query
  product_code text not null,
  idempotency_key text,
  esewa_transaction_code text,
  esewa_ref_id text,
  last_status_raw text,
  last_polled_at timestamptz,
  poll_attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- at most one successful payment per order (DB constraint > app logic)
create unique index one_success_per_order on payment_attempts(order_id) where status = 'succeeded';
create unique index attempt_idempotency on payment_attempts(order_id, idempotency_key) where idempotency_key is not null;
-- cron's work queue
create index attempts_to_poll on payment_attempts(last_polled_at) where status in ('initiated','pending','ambiguous');

create table payment_events (                      -- append-only audit
  id bigserial primary key,
  attempt_id uuid references payment_attempts(id),
  order_id uuid references orders(id),
  source text not null check (source in ('initiate','return_success','return_failure','cron','admin')),
  event text not null,
  raw_payload jsonb,                               -- decoded eSewa body / status response
  signature_valid boolean,
  actor uuid,
  created_at timestamptz not null default now()
);

create table refunds (                             -- manual workflow, no eSewa API
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  amount_paisa integer not null,
  reason text,
  requested_by uuid, approved_by uuid,
  external_reference text,                         -- portal txn ref typed in by the operator
  status text not null default 'requested',
  created_at timestamptz not null default now()
);
```

**RLS.** `orders`/`payment_attempts`: customers may `select` their own rows and nothing else — **no client-side insert or update on either table**. `payment_events` and `refunds`: deny-all to `anon`/`authenticated`; service-role only. All writes flow through server actions/route handlers using the service key, or through `security definer` functions.

**The transition function** — one `security definer` RPC, `confirm_payment(p_attempt_id uuid, p_esewa_ref text, p_amount_paisa int)`, doing `SELECT … FOR UPDATE` on the order, asserting the amount matches, flipping both rows, and inserting the audit event. Both the return handler and the cron call it. Concurrency and idempotency live in this one function, so there is exactly one place to get right.

**Reconciliation report.** A view joining `payment_attempts` (status `succeeded`) against orders, plus a daily digest of: stuck attempts > 1h, `ambiguous` count, orders `paid` with no attempt, attempts `succeeded` with order not `paid`. Reconcile the totals against the merchant portal export manually — there is no settlement API to automate against.

**COD.** Shares `orders` entirely; `payment_method='cod'` skips `payment_attempts` and goes `cart → confirmed`, with `paid` set on delivery confirmation. No separate table, no parallel state machine.

---

## 5. Open Questions

1. **Does ePay v2 actually deliver an IPN?** The Epay-V2 page asserts it in one sentence with no spec. Ask eSewa merchant support directly whether a callback URL can be registered for ePay v2 and get the payload/signature spec. Until answered, the cron is load-bearing. (If IPN exists, it becomes a latency optimisation, not a replacement for the cron.)
2. **Refund API existence.** Not in the docs; third-party claims are unsourced. Confirm with eSewa whether a merchant refund endpoint exists and what credentials it needs. Design assumes manual.
3. **UAT secret key trailing `(`** — the two doc pages disagree. Resolve empirically in sandbox on day one.
4. **Status API authentication.** No auth is documented, which implies anyone knowing `(product_code, total_amount, transaction_uuid)` can read status. Confirm whether production requires a header — and either way, do not use a guessable `transaction_uuid`. (UUIDv4 already covers this.)
5. **Failure-URL payload.** Docs don't specify what parameters accompany the failure redirect. Must be observed in UAT; the handler must tolerate an empty/absent `data` param.
6. **Status-API eventual consistency.** How soon after `COMPLETE` is the status queryable, and can `NOT_FOUND` be returned transiently for a completed payment? Determines the safe delay before the first poll and the `expired` threshold.
7. **`total_amount` formatting in the status response** — whether thousands separators ever appear (`1,000.0`). Parse defensively regardless; confirm in UAT with a >Rs 1000 transaction.
8. **Should you use Intent instead?** eSewa labels Intent "Recommended" and it has a documented server-to-server callback plus a cancel endpoint — materially better failure semantics. But it is deeplink/app-centric. Worth one question to eSewa about desktop-web viability before committing to ePay v2.
9. **Settlement cadence and reporting format** from the merchant portal — needed to design the reconciliation report's counterpart side.

Sources: [eSewa ePay](https://developer.esewa.com.np/pages/Epay), [ePay-V2](http://developer.esewa.com.np/pages/Epay-V2), [Test credentials](https://developer.esewa.com.np/pages/Test-credentials), [Intent](https://developer.esewa.com.np/pages/Intent).