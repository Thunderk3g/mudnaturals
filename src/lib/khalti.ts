/**
 * Khalti KPG-2 (ePayment) — initiation and the lookup client.
 *
 * The cleanest of the three gateways: initiation is a server-to-server POST
 * that returns a `pidx` and a hosted payment URL, and that `pidx` is the only
 * key the lookup API takes — so a Khalti attempt is always resolvable from the
 * server, whether or not the customer's browser ever came back. Amounts are
 * integer paisa natively, the same unit this codebase uses everywhere.
 *
 * Like `esewa.ts`, the pure parts here are unit-tested and know nothing about
 * the database or Next. The lookup's verdict is mapped into the same status
 * vocabulary `decideFromStatus` already speaks, so the payments pipeline needs
 * no second decision table.
 *
 * Verified against the live sandbox (dev.khalti.com) on 23 Aug 2026: the
 * documented sample key initiates successfully and returns a pidx.
 */
import type { EsewaStatus, EsewaStatusResult } from "@/lib/esewa";

export type KhaltiEnv = "sandbox" | "production";

const BASES: Record<KhaltiEnv, string> = {
  sandbox: "https://dev.khalti.com/api/v2",
  production: "https://khalti.com/api/v2",
};

/** Anything that is not literally "production" is the sandbox. Fail safe. */
export function resolveKhaltiEnv(value: string | undefined | null): KhaltiEnv {
  return value === "production" ? "production" : "sandbox";
}

export function khaltiBase(env: KhaltiEnv): string {
  return BASES[env];
}

// ----------------------------------------------------------- initiation ----

export type KhaltiInitiateRequest = {
  amountPaisa: number;
  purchaseOrderId: string;
  purchaseOrderName: string;
  returnUrl: string;
  websiteUrl: string;
  customer?: { name?: string; phone?: string; email?: string };
};

/** The exact JSON body for `/epayment/initiate/`. Pure, so the tests own it. */
export function buildKhaltiInitiateBody(req: KhaltiInitiateRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    return_url: req.returnUrl,
    website_url: req.websiteUrl,
    amount: req.amountPaisa,
    purchase_order_id: req.purchaseOrderId,
    purchase_order_name: req.purchaseOrderName,
  };
  if (req.customer && (req.customer.name || req.customer.phone || req.customer.email)) {
    body.customer_info = {
      ...(req.customer.name ? { name: req.customer.name } : {}),
      ...(req.customer.phone ? { phone: req.customer.phone } : {}),
      ...(req.customer.email ? { email: req.customer.email } : {}),
    };
  }
  return body;
}

export type KhaltiInitiation = {
  pidx: string;
  paymentUrl: string;
  /** Khalti's own expiry for the payment link, when it sent one. */
  expiresAt: string | null;
};

export async function initiateKhalti(req: {
  env: KhaltiEnv;
  secretKey: string;
  request: KhaltiInitiateRequest;
  timeoutMs?: number;
}): Promise<KhaltiInitiation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 10000);
  try {
    const response = await fetch(`${khaltiBase(req.env)}/epayment/initiate/`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        // The "Key " prefix is Khalti's own scheme, not a typo for "Bearer".
        authorization: `Key ${req.secretKey}`,
      },
      body: JSON.stringify(buildKhaltiInitiateBody(req.request)),
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) {
      // Khalti's error bodies name the offending field; keep them for the log,
      // but never with the key attached.
      throw new Error(`Khalti initiate returned ${response.status}: ${text.slice(0, 300)}`);
    }
    const body = JSON.parse(text) as Record<string, unknown>;
    const pidx = typeof body.pidx === "string" ? body.pidx : null;
    const paymentUrl = typeof body.payment_url === "string" ? body.payment_url : null;
    if (!pidx || !paymentUrl) {
      throw new Error(`Khalti initiate answered 200 without pidx/payment_url`);
    }
    return {
      pidx,
      paymentUrl,
      expiresAt: typeof body.expires_at === "string" ? body.expires_at : null,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- lookup ----

/** Khalti's documented lookup statuses, verbatim. */
export const KHALTI_STATUSES = [
  "Completed",
  "Pending",
  "Initiated",
  "Refunded",
  "Partially Refunded",
  "Expired",
  "User canceled",
] as const;

/**
 * Maps a Khalti lookup verdict into the vocabulary `decideFromStatus` speaks.
 *
 * - `Completed` is the only success, per Khalti's own docs.
 * - `Pending`/`Initiated` wait: money may be mid-flight through a bank queue,
 *   and the poller's abandonment backstop bounds how long we hold stock.
 * - `Expired`/`User canceled` mean definitively no payment — CANCELED fails
 *   the attempt now and releases the reservation, rather than waiting out the
 *   window for a link Khalti itself has already killed.
 */
export function mapKhaltiStatus(raw: string): EsewaStatus | "UNKNOWN" {
  switch (raw) {
    case "Completed":
      return "COMPLETE";
    case "Pending":
    case "Initiated":
      return "PENDING";
    case "Expired":
    case "User canceled":
      return "CANCELED";
    case "Refunded":
      return "FULL_REFUND";
    case "Partially Refunded":
      return "PARTIAL_REFUND";
    default:
      return "UNKNOWN";
  }
}

/** Shapes a raw lookup body into the pipeline's shared status result. */
export function mapKhaltiLookup(body: Record<string, unknown>): EsewaStatusResult {
  const raw = String(body.status ?? "");
  return {
    status: mapKhaltiStatus(raw),
    rawStatus: raw,
    // Khalti's total_amount is already integer paisa; anything non-numeric is
    // treated as absent, which `applyDecision` turns into a manual review
    // rather than a confirmation.
    amountPaisa: typeof body.total_amount === "number" ? body.total_amount : null,
    refId: typeof body.transaction_id === "string" ? body.transaction_id : null,
    transactionCode: typeof body.pidx === "string" ? body.pidx : null,
    body,
  };
}

export async function fetchKhaltiStatus(req: {
  env: KhaltiEnv;
  secretKey: string;
  pidx: string;
  timeoutMs?: number;
}): Promise<EsewaStatusResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 8000);
  try {
    const response = await fetch(`${khaltiBase(req.env)}/epayment/lookup/`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Key ${req.secretKey}`,
      },
      body: JSON.stringify({ pidx: req.pidx }),
      cache: "no-store",
    });
    const text = await response.text();
    if (response.status === 404) {
      // Khalti has no record of the pidx. Same semantics as eSewa's NOT_FOUND:
      // wait inside the window, expire after it.
      return {
        status: "NOT_FOUND",
        rawStatus: "404",
        amountPaisa: null,
        refId: null,
        transactionCode: req.pidx,
        body: { http_status: 404 },
      };
    }
    if (!response.ok) {
      throw new Error(`Khalti lookup returned ${response.status}`);
    }
    return mapKhaltiLookup(JSON.parse(text) as Record<string, unknown>);
  } finally {
    clearTimeout(timer);
  }
}
