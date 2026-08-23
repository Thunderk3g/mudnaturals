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
import {
  fetchKhaltiStatus,
  initiateKhalti,
  resolveKhaltiEnv,
} from "@/lib/khalti";
import {
  buildFonepayRequestUrl,
  fetchFonepayVerification,
  fonepayCallbackDvMatches,
  fonepayPrnFromAttemptId,
  readFonepayCallback,
  resolveFonepayEnv,
} from "@/lib/fonepay";

/**
 * The DB-facing half of every online gateway: eSewa, Khalti, Fonepay.
 *
 * One pipeline. An attempt is opened with the amount frozen; each gateway
 * answers a status question in its own dialect; `@/lib/{esewa,khalti,fonepay}`
 * translate the dialects into one status vocabulary; and `applyDecision` is
 * the single place any status becomes a state change. Everything that moves
 * money still goes through `confirm_payment` / `fail_payment_attempt` in
 * migration 009: they take the row lock, assert the amount against the frozen
 * snapshot, and write the audit event. Nothing here hand-rolls those UPDATEs.
 *
 * Secret keys are read only in this module and the three lib modules, all
 * server-only. No log line in this file prints a key or a signature.
 */

export type Gateway = "esewa" | "khalti" | "fonepay";

/** The online methods checkout can offer. COD is not a gateway. */
export const GATEWAYS: Gateway[] = ["esewa", "khalti", "fonepay"];

function siteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  return value.replace(/\/+$/, "");
}

function config() {
  const secretKey = process.env.ESEWA_SECRET_KEY;
  const productCode = process.env.ESEWA_PRODUCT_CODE;
  if (!secretKey) throw new Error("ESEWA_SECRET_KEY is not set");
  if (!productCode) throw new Error("ESEWA_PRODUCT_CODE is not set");
  return {
    secretKey,
    productCode,
    siteUrl: siteUrl(),
    env: resolveEsewaEnv(process.env.ESEWA_ENV),
  };
}

function khaltiConfig() {
  const secretKey = process.env.KHALTI_SECRET_KEY;
  if (!secretKey) throw new Error("KHALTI_SECRET_KEY is not set");
  return { secretKey, siteUrl: siteUrl(), env: resolveKhaltiEnv(process.env.KHALTI_ENV) };
}

function fonepayConfig() {
  const merchantCode = process.env.FONEPAY_PID;
  const secretKey = process.env.FONEPAY_SECRET_KEY;
  if (!merchantCode) throw new Error("FONEPAY_PID is not set");
  if (!secretKey) throw new Error("FONEPAY_SECRET_KEY is not set");
  return {
    merchantCode,
    secretKey,
    siteUrl: siteUrl(),
    env: resolveFonepayEnv(process.env.FONEPAY_ENV),
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
/**
 * Opens the attempt row every gateway shares: order locked, method checked,
 * amount frozen, audit event written. A new attempt on every call — retries
 * need a fresh gateway reference, and the partial unique index allows at most
 * one `succeeded` attempt per order, so racing attempts cannot double-ship.
 */
async function openAttempt(
  orderId: string,
  gateway: Gateway,
  productCode: string,
  env: string,
): Promise<{
  id: string;
  amount_paisa: number;
  phone: string;
  full_name: string | null;
  email: string | null;
}> {
  return withTx(async (tx) => {
    const [order] = await tx<
      {
        id: string;
        status: string;
        payment_method: string;
        total_paisa: number;
        phone: string;
        email: string | null;
        full_name: string | null;
      }[]
    >`
      select o.id, o.status, o.payment_method, o.total_paisa, o.phone, o.email,
             c.full_name
        from orders o left join customers c on c.id = o.customer_id
       where o.id = ${orderId} for update of o`;

    if (!order) throw new Error(`order ${orderId} not found`);
    if (order.payment_method !== gateway) {
      throw new Error(`order ${orderId} is not a ${gateway} order`);
    }
    if (order.status !== "pending_payment") {
      throw new Error(`order ${orderId} is not awaiting payment (status ${order.status})`);
    }

    const [row] = await tx<{ id: string; amount_paisa: number }[]>`
      insert into payment_attempts (order_id, amount_paisa, product_code, gateway)
      values (${orderId}, ${order.total_paisa}, ${productCode}, ${gateway})
      returning id, amount_paisa`;
    if (!row) throw new Error(`could not open a payment attempt for order ${orderId}`);

    await tx`
      insert into payment_events (attempt_id, order_id, source, event, raw_payload)
      values (${row.id}, ${orderId}, 'initiate', 'attempt_created',
              ${sql.json({ amount_paisa: row.amount_paisa, gateway, env })})`;

    return {
      id: row.id,
      amount_paisa: row.amount_paisa,
      phone: order.phone,
      full_name: order.full_name,
      email: order.email,
    };
  });
}

export async function initiateEsewaPayment(orderId: string): Promise<EsewaInitiation> {
  const cfg = config();
  const attempt = await openAttempt(orderId, "esewa", cfg.productCode, cfg.env);

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

export type RedirectInitiation = { attemptId: string; url: string };

/**
 * Khalti: server-to-server initiate, then hand the browser the hosted URL.
 * The returned `pidx` is stored on the attempt — it is the only key the lookup
 * API takes, so it is what makes the attempt reconcilable without a browser.
 */
export async function initiateKhaltiPayment(orderId: string): Promise<RedirectInitiation> {
  const cfg = khaltiConfig();
  const attempt = await openAttempt(orderId, "khalti", "KHALTI", cfg.env);

  let initiation;
  try {
    initiation = await initiateKhalti({
      env: cfg.env,
      secretKey: cfg.secretKey,
      request: {
        amountPaisa: attempt.amount_paisa,
        purchaseOrderId: attempt.id,
        purchaseOrderName: "MUD Naturals order",
        returnUrl: `${cfg.siteUrl}/api/khalti/return?attempt=${attempt.id}`,
        websiteUrl: cfg.siteUrl,
        customer: {
          name: attempt.full_name ?? undefined,
          phone: attempt.phone,
          email: attempt.email ?? undefined,
        },
      },
    });
  } catch (error) {
    // The attempt exists but Khalti never issued a link; nothing can ever
    // complete it. Fail it now so the reservation releases immediately.
    await failAttempt(attempt.id, "failed", "initiate");
    throw error;
  }

  await sql`
    update payment_attempts
       set khalti_pidx = ${initiation.pidx},
           expires_at = coalesce(${initiation.expiresAt}::timestamptz, expires_at)
     where id = ${attempt.id}`;

  return { attemptId: attempt.id, url: initiation.paymentUrl };
}

/**
 * Fonepay: no server call at all — the signed redirect URL is the initiation.
 * The PRN (a 24-char slice of the attempt id, stored for the reverse lookup)
 * is how the callback finds its way back to the attempt.
 */
export async function initiateFonepayPayment(orderId: string): Promise<RedirectInitiation> {
  const cfg = fonepayConfig();
  const attempt = await openAttempt(orderId, "fonepay", cfg.merchantCode, cfg.env);
  const prn = fonepayPrnFromAttemptId(attempt.id);

  await sql`update payment_attempts set fonepay_prn = ${prn} where id = ${attempt.id}`;

  const url = buildFonepayRequestUrl({
    env: cfg.env,
    merchantCode: cfg.merchantCode,
    secretKey: cfg.secretKey,
    prn,
    amountPaisa: attempt.amount_paisa,
    remark: "MUD Naturals order",
    // No attempt hint on the RU: Fonepay appends its own query parameters and
    // the PRN it echoes back is already our reverse index.
    returnUrl: `${cfg.siteUrl}/api/fonepay/return`,
  });

  return { attemptId: attempt.id, url };
}

// ------------------------------------------------------ shared plumbing ----

type AttemptRow = {
  id: string;
  order_id: string;
  amount_paisa: number;
  product_code: string;
  status: string;
  gateway: Gateway;
  khalti_pidx: string | null;
  fonepay_prn: string | null;
  fonepay_uid: string | null;
  fonepay_bid: string | null;
  order_status: string;
  lookup_token: string;
  past_expiry: boolean;
  abandoned: boolean;
};

const ATTEMPT_FIELDS = sql`
  a.id, a.order_id, a.amount_paisa, a.product_code, a.status,
  a.gateway, a.khalti_pidx, a.fonepay_prn, a.fonepay_uid, a.fonepay_bid,
  o.status as order_status, o.lookup_token,
  (a.expires_at < now()) as past_expiry,
  (a.expires_at < now() - interval '24 hours') as abandoned
`;

/**
 * One question, three dialects: "what happened to this attempt?".
 *
 * Every answer arrives in the same shared vocabulary, so `applyDecision` and
 * both crons never know which gateway they are talking about. The two
 * NOT_FOUND fabrications are deliberate: an attempt whose gateway reference
 * never got stored can never complete, and NOT_FOUND is exactly the status
 * whose decision waits inside the window and expires after it.
 */
async function fetchGatewayStatus(attempt: AttemptRow): Promise<EsewaStatusResult> {
  switch (attempt.gateway) {
    case "khalti": {
      if (!attempt.khalti_pidx) {
        return {
          status: "NOT_FOUND",
          rawStatus: "NO_PIDX",
          amountPaisa: null,
          refId: null,
          transactionCode: null,
          body: { reason: "attempt has no pidx stored" },
        };
      }
      const cfg = khaltiConfig();
      return fetchKhaltiStatus({ env: cfg.env, secretKey: cfg.secretKey, pidx: attempt.khalti_pidx });
    }
    case "fonepay": {
      // Verification needs the UID/BID pair that only the browser callback
      // carries. Without them there is nothing to ask Fonepay — the attempt
      // waits out its window and expires, exactly like an eSewa attempt the
      // gateway has no record of.
      if (!attempt.fonepay_uid || !attempt.fonepay_prn) {
        return {
          status: "NOT_FOUND",
          rawStatus: "NO_UID",
          amountPaisa: null,
          refId: null,
          transactionCode: null,
          body: { reason: "no callback ever arrived; fonepay offers no cold lookup" },
        };
      }
      const cfg = fonepayConfig();
      return fetchFonepayVerification({
        env: cfg.env,
        merchantCode: cfg.merchantCode,
        secretKey: cfg.secretKey,
        prn: attempt.fonepay_prn,
        amountPaisa: attempt.amount_paisa,
        bid: attempt.fonepay_bid ?? "",
        uid: attempt.fonepay_uid,
        // Re-polls happen because the callback said "paid" but something later
        // failed; treating an unverified re-poll as ambiguous keeps it parked
        // for a human instead of silently failing a paid order.
        callbackPs: true,
      });
    }
    default: {
      const cfg = config();
      return fetchEsewaStatus({
        env: cfg.env,
        productCode: attempt.product_code,
        transactionUuid: attempt.id,
        amountPaisa: attempt.amount_paisa,
      });
    }
  }
}

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
    result = await fetchGatewayStatus(attempt);
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

/**
 * Khalti return. The query's `status` is advisory; the lookup by stored pidx
 * is what decides. The attempt is found by our own `?attempt=` hint first and
 * the echoed pidx second, so a mangled query still resolves.
 */
export async function handleKhaltiReturn(params: URLSearchParams): Promise<CallbackResult> {
  const home = `${siteUrl()}/`;
  const payload = Object.fromEntries(params.entries());

  let attempt: AttemptRow | undefined;
  const hinted = attemptIdFromUrl(params.get("attempt") ?? "");
  if (hinted) attempt = await loadAttempt(hinted);
  if (!attempt) {
    const pidx = params.get("pidx");
    if (pidx) {
      const [row] = await sql<AttemptRow[]>`
        select ${ATTEMPT_FIELDS}
          from payment_attempts a join orders o on o.id = a.order_id
         where a.khalti_pidx = ${pidx}`;
      attempt = row;
    }
  }
  if (!attempt) {
    console.error("[khalti] return carried no identifiable attempt");
    return { redirectTo: home, outcome: "error" };
  }

  const orderPage = `${siteUrl()}/order/${attempt.lookup_token}`;
  const claimedCanceled = params.get("status") === "User canceled";

  await recordEvent(attempt, claimedCanceled ? "return_failure" : "return_success",
    "callback_received", payload);
  await markVerifying(attempt.order_id);

  let result: EsewaStatusResult;
  try {
    result = await fetchGatewayStatus(attempt);
  } catch (error) {
    console.error("[khalti] lookup failed on return", {
      attemptId: attempt.id,
      reason: error instanceof Error ? error.message : "unknown",
    });
    await recordEvent(attempt, "return_success", "status_check_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { redirectTo: orderPage, outcome: "error" };
  }

  await recordPoll(attempt.id, result.rawStatus);
  await recordEvent(attempt, "return_success", `status_${result.status.toLowerCase()}`, result.body);

  // A canceled redirect whose lookup finds nothing better is failed now, so
  // the reservation releases while the customer is still looking at the cart.
  const outcome = await applyDecision(attempt, result, "return_success", {
    failOnWait: claimedCanceled,
  });
  return { redirectTo: orderPage, outcome };
}

/**
 * Fonepay return — the one callback that must not be missed, because the
 * verification API only answers with the UID/BID this redirect carries. They
 * are stored before anything can fail, so a crash mid-handler still leaves the
 * cron able to verify.
 */
export async function handleFonepayReturn(params: URLSearchParams): Promise<CallbackResult> {
  const cfg = fonepayConfig();
  const home = `${cfg.siteUrl}/`;
  const callback = readFonepayCallback(params);

  if (!callback.prn) {
    console.error("[fonepay] return carried no PRN");
    return { redirectTo: home, outcome: "error" };
  }

  const [attempt] = await sql<AttemptRow[]>`
    select ${ATTEMPT_FIELDS}
      from payment_attempts a join orders o on o.id = a.order_id
     where a.fonepay_prn = ${callback.prn}`;
  if (!attempt) {
    console.error("[fonepay] return for unknown PRN");
    return { redirectTo: home, outcome: "error" };
  }

  const orderPage = `${cfg.siteUrl}/order/${attempt.lookup_token}`;
  const source = callback.ps ? "return_success" : "return_failure";
  const dvMatches = fonepayCallbackDvMatches(cfg.secretKey, callback);

  // UID/BID first, then the audit row, then anything that can fail.
  if (callback.uid) {
    await sql`
      update payment_attempts
         set fonepay_uid = coalesce(fonepay_uid, ${callback.uid}),
             fonepay_bid = coalesce(fonepay_bid, ${callback.bid})
       where id = ${attempt.id}`;
    attempt.fonepay_uid = attempt.fonepay_uid ?? callback.uid;
    attempt.fonepay_bid = attempt.fonepay_bid ?? callback.bid;
  }
  await recordEvent(attempt, source, "callback_received", callback.raw, dvMatches);
  await markVerifying(attempt.order_id);

  // No UID at all: Fonepay is telling us nothing verifiable. PS=false with no
  // UID is a plain abandonment — fail it now. PS=true with no UID would be a
  // paid customer we cannot verify — park it for a human.
  if (!callback.uid) {
    if (callback.ps) {
      await markAmbiguous(attempt, source);
      return { redirectTo: orderPage, outcome: "ambiguous" };
    }
    await failAttempt(attempt.id, "failed", source);
    return { redirectTo: orderPage, outcome: "failed" };
  }

  let result: EsewaStatusResult;
  try {
    result = await fetchFonepayVerification({
      env: cfg.env,
      merchantCode: cfg.merchantCode,
      secretKey: cfg.secretKey,
      prn: callback.prn,
      amountPaisa: attempt.amount_paisa,
      bid: callback.bid ?? "",
      uid: callback.uid,
      callbackPs: callback.ps,
    });
  } catch (error) {
    console.error("[fonepay] verification failed on return", {
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

  const outcome = await applyDecision(attempt, result, source);
  return { redirectTo: orderPage, outcome };
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
      result = await fetchGatewayStatus(attempt);
    } catch (error) {
      // A gateway that will not answer is never a reason to fail a customer.
      // Bump the counter so backoff widens, and try again next run.
      console.error(`[${attempt.gateway}] status poll failed`, {
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
