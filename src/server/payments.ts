import "server-only";
import { sql, withTx } from "@/lib/db";
import {
  buildEsewaForm,
  decideFromStatus,
  decodeEsewaCallback,
  fetchEsewaStatus,
  resolveEsewaEnv,
  timingSafeCompare,
  verifyEsewaCallback,
  type EsewaStatusResult,
} from "@/lib/esewa";

/**
 * The DB-facing half of the eSewa integration.
 *
 * Everything that moves money goes through `confirm_payment` /
 * `fail_payment_attempt` in migration 009: they take the row lock, assert the
 * amount against the snapshot frozen at initiation, and write the audit event.
 * Nothing here hand-rolls those UPDATEs.
 *
 * The secret key is read only in this module and in `@/lib/esewa`, both of
 * which are server-only. It never reaches the browser, and no log line in this
 * file prints a key or a signature.
 */

function config() {
  const secretKey = process.env.ESEWA_SECRET_KEY;
  const productCode = process.env.ESEWA_PRODUCT_CODE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secretKey) throw new Error("ESEWA_SECRET_KEY is not set");
  if (!productCode) throw new Error("ESEWA_PRODUCT_CODE is not set");
  if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  return {
    secretKey,
    productCode,
    siteUrl: siteUrl.replace(/\/+$/, ""),
    env: resolveEsewaEnv(process.env.ESEWA_ENV),
  };
}

// ---------------------------------------------------------- initiation ----

export type EsewaInitiation = {
  attemptId: string;
  /** The eSewa form POST URL for the current environment. */
  formAction: string;
  /** Every hidden input, signature included. */
  fields: Record<string, string>;
};

/**
 * Opens a fresh payment attempt for an order and returns the signed form.
 *
 * A new attempt — and therefore a new `transaction_uuid` — on every call, because
 * eSewa requires per-request uniqueness. Two attempts racing is harmless: a
 * partial unique index allows at most one `succeeded` attempt per order, and the
 * loser expires without touching an order that has already been paid.
 *
 * Only an order still in `pending_payment` may be paid. Retrying a `failed` or
 * `expired` order goes back through `place_order`, which is what re-reserves the
 * stock that failing the attempt released.
 */
export async function initiateEsewaPayment(orderId: string): Promise<EsewaInitiation> {
  const cfg = config();

  const attempt = await withTx(async (tx) => {
    const [order] = await tx<
      { id: string; status: string; payment_method: string; total_paisa: number }[]
    >`
      select id, status, payment_method, total_paisa
        from orders where id = ${orderId} for update`;

    if (!order) throw new Error(`order ${orderId} not found`);
    if (order.payment_method !== "esewa") {
      throw new Error(`order ${orderId} is not an eSewa order`);
    }
    if (order.status !== "pending_payment") {
      throw new Error(`order ${orderId} is not awaiting payment (status ${order.status})`);
    }

    const [row] = await tx<{ id: string; amount_paisa: number }[]>`
      insert into payment_attempts (order_id, amount_paisa, product_code)
      values (${orderId}, ${order.total_paisa}, ${cfg.productCode})
      returning id, amount_paisa`;
    if (!row) throw new Error(`could not open a payment attempt for order ${orderId}`);

    await tx`
      insert into payment_events (attempt_id, order_id, source, event, raw_payload)
      values (${row.id}, ${orderId}, 'initiate', 'attempt_created',
              ${sql.json({ amount_paisa: row.amount_paisa, env: cfg.env })})`;

    return row;
  });

  const { formAction, fields } = buildEsewaForm({
    transactionUuid: attempt.id,
    amountPaisa: attempt.amount_paisa,
    productCode: cfg.productCode,
    successUrl: `${cfg.siteUrl}/api/esewa/return`,
    // The failure redirect's payload is undocumented, so the attempt id rides
    // on the URL we control. The handler still tolerates it being absent.
    failureUrl: `${cfg.siteUrl}/api/esewa/failure?attempt=${attempt.id}`,
    secretKey: cfg.secretKey,
    env: cfg.env,
  });

  return { attemptId: attempt.id, formAction, fields };
}

// ------------------------------------------------------ shared plumbing ----

type AttemptRow = {
  id: string;
  order_id: string;
  amount_paisa: number;
  product_code: string;
  status: string;
  order_status: string;
  lookup_token: string;
  past_expiry: boolean;
  abandoned: boolean;
};

const ATTEMPT_FIELDS = sql`
  a.id, a.order_id, a.amount_paisa, a.product_code, a.status,
  o.status as order_status, o.lookup_token,
  (a.expires_at < now()) as past_expiry,
  (a.expires_at < now() - interval '24 hours') as abandoned
`;

async function loadAttempt(attemptId: string): Promise<AttemptRow | undefined> {
  const [row] = await sql<AttemptRow[]>`
    select ${ATTEMPT_FIELDS}
      from payment_attempts a join orders o on o.id = a.order_id
     where a.id = ${attemptId}`;
  return row;
}

type EventSource = "initiate" | "return_success" | "return_failure" | "cron" | "admin";

function recordEvent(
  attempt: Pick<AttemptRow, "id" | "order_id">,
  source: EventSource,
  event: string,
  payload: unknown,
  signatureValid: boolean | null = null,
) {
  // Left unprocessed on purpose: the partial unique index only dedupes
  // processed rows, so the audit trail can hold every replay.
  return sql`
    insert into payment_events (attempt_id, order_id, source, event, raw_payload, signature_valid)
    values (${attempt.id}, ${attempt.order_id}, ${source}, ${event},
            ${sql.json(payload as never)}, ${signatureValid})`;
}

/** "We're confirming your payment" — never `failed` on a network error. */
function markVerifying(orderId: string) {
  return sql`
    update orders set status = 'payment_verifying'
     where id = ${orderId} and status = 'pending_payment'`;
}

/**
 * Only ever called for an attempt still in flight. `fail_payment_attempt`
 * happily runs twice, and its second processed audit row would collide with the
 * dedupe index, so the guard lives in the WHERE clause.
 */
function failAttempt(attemptId: string, status: "failed" | "canceled" | "expired", source: EventSource) {
  return sql`
    select fail_payment_attempt(a.id, ${status}::payment_attempt_status, ${source})
      from payment_attempts a
     where a.id = ${attemptId} and a.status in ('initiated', 'pending', 'ambiguous')`;
}

/** AMBIGUOUS never auto-transitions. It parks in a queue a human owns. */
async function markAmbiguous(attempt: AttemptRow, source: EventSource) {
  await withTx(async (tx) => {
    await tx`
      update payment_attempts set status = 'ambiguous'
       where id = ${attempt.id} and status in ('initiated', 'pending')`;
    await tx`
      update orders set status = 'manual_review'
       where id = ${attempt.order_id} and status in ('pending_payment', 'payment_verifying')`;
    await tx`
      insert into payment_events (attempt_id, order_id, source, event)
      values (${attempt.id}, ${attempt.order_id}, ${source}, 'status_ambiguous')`;
  });
}

/**
 * eSewa documents no refund API, so a refund only ever reaches us as the status
 * flipping. We mirror it onto the order where the state machine allows the
 * transition, and otherwise leave the event for the operator — a shipped order
 * that gets refunded is a conversation, not an automatic state change.
 */
async function reconcileRefund(
  attempt: AttemptRow,
  kind: "refunded" | "partially_refunded",
  result: EsewaStatusResult,
) {
  const from =
    kind === "refunded"
      ? ["paid", "confirmed", "delivered", "partially_refunded"]
      : ["paid", "delivered"];

  await withTx(async (tx) => {
    await tx`
      update payment_attempts set status = ${kind}::payment_attempt_status
       where id = ${attempt.id} and status = 'succeeded'`;
    await tx`
      update orders
         set status = ${kind}::order_status,
             payment_status = ${kind}::payment_status
       where id = ${attempt.order_id} and status::text = any(${from}::text[])`;
    await tx`
      insert into payment_events (attempt_id, order_id, source, event, raw_payload)
      values (${attempt.id}, ${attempt.order_id}, 'cron', 'refund_detected',
              ${sql.json(result.body as never)})`;
  });
}

function recordPoll(attemptId: string, status: string) {
  return sql`
    update payment_attempts
       set last_polled_at = now(), poll_attempts = poll_attempts + 1,
           last_status_raw = ${status}
     where id = ${attemptId}`;
}

export type Outcome =
  | "confirmed"
  | "already_confirmed"
  | "failed"
  | "expired"
  | "ambiguous"
  | "refunded"
  | "waiting"
  | "error";

/**
 * The single place a gateway status turns into a state change. The return
 * handler and both crons all route through it, so there is exactly one mapping
 * to get right.
 */
async function applyDecision(
  attempt: AttemptRow,
  result: EsewaStatusResult,
  source: EventSource,
  opts: { failOnWait?: boolean } = {},
): Promise<Outcome> {
  const decision = decideFromStatus(result.status, {
    pastExpiry: attempt.past_expiry,
    abandoned: attempt.abandoned,
  });

  switch (decision.action) {
    case "confirm": {
      if (result.amountPaisa === null) {
        // COMPLETE with no amount to check against is not a confirmation.
        await markAmbiguous(attempt, source);
        return "ambiguous";
      }
      try {
        const [row] = await sql<{ already_confirmed: boolean }[]>`
          select * from confirm_payment(${attempt.id}, ${result.amountPaisa},
                                        ${result.transactionCode}, ${result.refId}, ${source})`;
        return row?.already_confirmed ? "already_confirmed" : "confirmed";
      } catch (error) {
        // The only way out of confirm_payment is an amount mismatch: eSewa took
        // a different amount than we froze. Money has moved; a human decides.
        console.error("[esewa] confirm rejected", {
          attemptId: attempt.id,
          reason: error instanceof Error ? error.message : "unknown",
        });
        await markAmbiguous(attempt, source);
        return "ambiguous";
      }
    }
    case "fail":
      await failAttempt(attempt.id, decision.attemptStatus, source);
      return "failed";
    case "expire":
      await failAttempt(attempt.id, "expired", source);
      return "expired";
    case "ambiguous":
      await markAmbiguous(attempt, source);
      return "ambiguous";
    case "refund":
      await reconcileRefund(attempt, decision.attemptStatus, result);
      return "refunded";
    case "wait":
      // The customer was redirected to the failure URL and eSewa has no record
      // of a completed payment: release the stock now rather than in 15 minutes.
      if (opts.failOnWait) {
        await failAttempt(attempt.id, "failed", source);
        return "failed";
      }
      return "waiting";
  }
}

// ------------------------------------------------------- return handlers ----

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Recovers our attempt id from the callback URL. eSewa appends `?data=` without
 * checking whether the URL already carries a query string, so the hint can
 * arrive glued to another parameter — hence a scan rather than a lookup.
 */
export function attemptIdFromUrl(url: string): string | null {
  return UUID_RE.exec(url)?.[0]?.toLowerCase() ?? null;
}

export type CallbackResult = { redirectTo: string; outcome: Outcome };

async function handleCallback(
  input: { data: string | null; urlHint: string | null },
  source: "return_success" | "return_failure",
): Promise<CallbackResult> {
  const cfg = config();
  const home = `${cfg.siteUrl}/`;

  let payload: Record<string, unknown> | null = null;
  let signatureValid: boolean | null = null;
  let attemptId = input.urlHint;

  if (input.data) {
    try {
      const callback = decodeEsewaCallback(input.data);
      payload = callback.json;
      const check = verifyEsewaCallback(callback, cfg.secretKey);
      signatureValid = check.valid;
      if (!check.valid) {
        // Never log the signature or the key — only the diagnosis.
        console.error("[esewa] callback signature mismatch", {
          source,
          transactionUuid: callback.values.transaction_uuid,
          otherKeyVariantWouldValidate: check.altKeyValid,
        });
      }
      // The uuid the payload names is only a lookup key. Everything that
      // authorises money comes from the stored row and the status API.
      const claimed = callback.values.transaction_uuid;
      if (claimed && UUID_RE.test(claimed)) attemptId = claimed.toLowerCase();
    } catch (error) {
      console.error("[esewa] callback payload undecodable", {
        source,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  if (!attemptId) {
    console.error("[esewa] callback carried no identifiable attempt", { source });
    return { redirectTo: home, outcome: "error" };
  }

  const attempt = await loadAttempt(attemptId);
  if (!attempt) {
    console.error("[esewa] callback for unknown attempt", { source, attemptId });
    return { redirectTo: home, outcome: "error" };
  }

  const orderPage = `${cfg.siteUrl}/order/${attempt.lookup_token}`;

  await recordEvent(attempt, source, "callback_received", payload ?? {}, signatureValid);
  if (signatureValid !== null) {
    await sql`update payment_attempts set signature_valid = ${signatureValid} where id = ${attempt.id}`;
  }
  // Set before the network call, so a timeout or a crash leaves the customer on
  // "we're confirming your payment" and the cron with something to resolve.
  await markVerifying(attempt.order_id);

  let result: EsewaStatusResult;
  try {
    result = await fetchEsewaStatus({
      env: cfg.env,
      productCode: attempt.product_code,
      transactionUuid: attempt.id,
      amountPaisa: attempt.amount_paisa,
    });
  } catch (error) {
    console.error("[esewa] status check failed on callback", {
      source,
      attemptId: attempt.id,
      reason: error instanceof Error ? error.message : "unknown",
    });
    await recordEvent(attempt, source, "status_check_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { redirectTo: orderPage, outcome: "error" };
  }

  await recordPoll(attempt.id, result.rawStatus);
  await recordEvent(attempt, source, `status_${result.status.toLowerCase()}`, result.body);

  const outcome = await applyDecision(attempt, result, source, {
    failOnWait: source === "return_failure",
  });
  return { redirectTo: orderPage, outcome };
}

/** Success redirect. The payload is evidence; the status API is the authority. */
export function handleEsewaReturn(input: { data: string | null; urlHint: string | null }) {
  return handleCallback(input, "return_success");
}

/** Failure redirect. Undocumented payload, so `data` may be absent or empty. */
export function handleEsewaFailure(input: { data: string | null; urlHint: string | null }) {
  return handleCallback(input, "return_failure");
}

// ---------------------------------------------------------------- crons ----

export type ReconcileSummary = {
  scanned: number;
  confirmed: number;
  failed: number;
  expired: number;
  ambiguous: number;
  refunded: number;
  waiting: number;
  errors: number;
};

const EMPTY: ReconcileSummary = {
  scanned: 0,
  confirmed: 0,
  failed: 0,
  expired: 0,
  ambiguous: 0,
  refunded: 0,
  waiting: 0,
  errors: 0,
};

function tally(summary: ReconcileSummary, outcome: Outcome) {
  summary.scanned += 1;
  if (outcome === "confirmed" || outcome === "already_confirmed") summary.confirmed += 1;
  else if (outcome === "waiting") summary.waiting += 1;
  else if (outcome === "error") summary.errors += 1;
  else summary[outcome] += 1;
}

async function pollAttempts(
  attempts: AttemptRow[],
  summary: ReconcileSummary,
  opts: { refundsOnly?: boolean } = {},
) {
  for (const attempt of attempts) {
    let result: EsewaStatusResult;
    try {
      result = await fetchEsewaStatus({
        env: config().env,
        productCode: attempt.product_code,
        transactionUuid: attempt.id,
        amountPaisa: attempt.amount_paisa,
      });
    } catch (error) {
      // A gateway that will not answer is never a reason to fail a customer.
      // Bump the counter so backoff widens, and try again next run.
      console.error("[esewa] status poll failed", {
        attemptId: attempt.id,
        reason: error instanceof Error ? error.message : "unknown",
      });
      await recordPoll(attempt.id, "UNREACHABLE");
      summary.scanned += 1;
      summary.errors += 1;
      continue;
    }

    await recordPoll(attempt.id, result.rawStatus);

    if (opts.refundsOnly) {
      summary.scanned += 1;
      if (result.status === "FULL_REFUND" || result.status === "PARTIAL_REFUND") {
        await reconcileRefund(
          attempt,
          result.status === "FULL_REFUND" ? "refunded" : "partially_refunded",
          result,
        );
        summary.refunded += 1;
      }
      continue;
    }

    tally(summary, await applyDecision(attempt, result, "cron"));
  }
}

/**
 * The primary confirmation channel.
 *
 * Per-attempt exponential backoff lives in the WHERE clause: 30s after the
 * first poll, doubling to a 32-minute ceiling, driven by `poll_attempts` and
 * `last_polled_at`. Idempotent and cheap enough to be safe to trigger by hand.
 */
export async function reconcilePayments({ limit = 50 } = {}): Promise<ReconcileSummary> {
  const summary = { ...EMPTY };

  const live = await sql<AttemptRow[]>`
    select ${ATTEMPT_FIELDS}
      from payment_attempts a join orders o on o.id = a.order_id
     where a.status in ('initiated', 'pending', 'ambiguous')
       and a.created_at > now() - interval '24 hours'
       and (a.last_polled_at is null
            or a.last_polled_at <
               now() - (least(power(2, a.poll_attempts), 64) * interval '30 seconds'))
     order by a.last_polled_at nulls first
     limit ${limit}`;
  await pollAttempts(live, summary);

  // Refunds are operator-initiated in the merchant portal; the status flipping
  // is the only signal we get, so recently-paid orders are re-checked daily.
  const paid = await sql<AttemptRow[]>`
    select ${ATTEMPT_FIELDS}
      from payment_attempts a join orders o on o.id = a.order_id
     where a.status = 'succeeded'
       and a.succeeded_at > now() - interval '30 days'
       and (a.last_polled_at is null or a.last_polled_at < now() - interval '20 hours')
     order by a.last_polled_at nulls first
     limit 25`;
  await pollAttempts(paid, summary, { refundsOnly: true });

  return summary;
}

/**
 * Expires attempts whose window has closed — but only after asking eSewa one
 * more time. Expiring blind would strand a payment that completed while the
 * customer's browser never came back, which is the whole failure mode this
 * integration exists to survive.
 */
export async function expireStaleAttempts({ limit = 100 } = {}): Promise<ReconcileSummary> {
  const summary = { ...EMPTY };
  const stale = await sql<AttemptRow[]>`
    select ${ATTEMPT_FIELDS}
      from payment_attempts a join orders o on o.id = a.order_id
     where a.status in ('initiated', 'pending')
       and a.expires_at < now()
     order by a.expires_at
     limit ${limit}`;
  await pollAttempts(stale, summary);
  return summary;
}

/**
 * Vercel strips inbound `x-vercel-*` headers at the edge, so its presence is
 * trustworthy in production; the bearer secret is what makes the same handler
 * safe to trigger by hand from an admin action.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (secret && header && timingSafeCompare(header, `Bearer ${secret}`)) return true;
  return req.headers.get("x-vercel-cron") !== null;
}
