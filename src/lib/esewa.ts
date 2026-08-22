/**
 * eSewa ePay v2 — signing, response verification, and the status-API client.
 *
 * Pure by design: no database, no Next.js, no environment reads. Everything
 * here is unit-tested in `esewa.test.ts` against the vectors in
 * `research/06-esewa-payments.md`, so a signature bug fails a 20ms test rather
 * than a live payment.
 *
 * Node runtime only — `node:crypto`. Never Edge.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { paisaToEsewaAmount, esewaAmountToPaisa } from "@/lib/money";

export type EsewaEnv = "uat" | "production";

/** The documented status enum, in full. Anything else is treated as unknown. */
export const ESEWA_STATUSES = [
  "PENDING",
  "COMPLETE",
  "FULL_REFUND",
  "PARTIAL_REFUND",
  "AMBIGUOUS",
  "NOT_FOUND",
  "CANCELED",
] as const;
export type EsewaStatus = (typeof ESEWA_STATUSES)[number];

const ENDPOINTS: Record<EsewaEnv, { form: string; status: string }> = {
  uat: {
    form: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    status: "https://rc.esewa.com.np/api/epay/transaction/status/",
  },
  production: {
    form: "https://epay.esewa.com.np/api/epay/main/v2/form",
    status: "https://esewa.com.np/api/epay/transaction/status/",
  },
};

export function esewaEndpoints(env: EsewaEnv) {
  return ENDPOINTS[env];
}

/** Anything that is not literally "production" is the sandbox. Fail safe. */
export function resolveEsewaEnv(value: string | undefined | null): EsewaEnv {
  return value === "production" ? "production" : "uat";
}

// ------------------------------------------------------------- signing ----

/**
 * Builds the exact string eSewa signs: `key=value` pairs joined by commas, in
 * the order named by `signed_field_names`. The *values must be the literal
 * strings that travel on the wire* — see `decodeEsewaCallback` for why that
 * distinction is load-bearing on the response side.
 */
export function signatureMessage(
  values: Record<string, string>,
  signedFieldNames: string,
): string {
  return signedFieldNames
    .split(",")
    .map((name) => name.trim())
    .map((name) => {
      const value = values[name];
      if (value === undefined) {
        throw new Error(`eSewa signature: missing signed field "${name}"`);
      }
      return `${name}=${value}`;
    })
    .join(",");
}

export function signEsewa(secretKey: string, message: string): string {
  return createHmac("sha256", secretKey).update(message, "utf8").digest("base64");
}

export function timingSafeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * The two eSewa doc pages disagree on whether the UAT secret ends with a
 * trailing `(`. This flips it, so a mismatch can report "the other variant of
 * your key would have validated" instead of leaving an operator guessing.
 */
export function alternateSecretKey(secretKey: string): string {
  return secretKey.endsWith("(") ? secretKey.slice(0, -1) : `${secretKey}(`;
}

// --------------------------------------------------------- form fields ----

export const FORM_SIGNED_FIELDS = "total_amount,transaction_uuid,product_code";

export type EsewaFormRequest = {
  transactionUuid: string;
  amountPaisa: number;
  productCode: string;
  successUrl: string;
  failureUrl: string;
  secretKey: string;
  env: EsewaEnv;
};

/**
 * Every hidden input for the browser form POST, signature included. All eleven
 * required fields are present and non-null, which eSewa enforces.
 *
 * Shipping and discounts are already baked into the order total, and eSewa has
 * no field for a discount, so the whole amount rides on `amount` with the tax /
 * service / delivery components at zero. `total_amount` therefore equals
 * `amount`, which is the sum eSewa expects.
 */
export function buildEsewaForm(req: EsewaFormRequest): {
  formAction: string;
  fields: Record<string, string>;
} {
  const total = paisaToEsewaAmount(req.amountPaisa);
  const fields: Record<string, string> = {
    amount: total,
    tax_amount: "0",
    product_service_charge: "0",
    product_delivery_charge: "0",
    total_amount: total,
    transaction_uuid: req.transactionUuid,
    product_code: req.productCode,
    success_url: req.successUrl,
    failure_url: req.failureUrl,
    signed_field_names: FORM_SIGNED_FIELDS,
  };
  fields.signature = signEsewa(req.secretKey, signatureMessage(fields, FORM_SIGNED_FIELDS));
  return { formAction: esewaEndpoints(req.env).form, fields };
}

// ------------------------------------------------------ response decode ----

export type EsewaCallback = {
  /** The decoded JSON text, exactly as eSewa sent it. */
  raw: string;
  /** Parsed object — for auditing and logging only, never for signing. */
  json: Record<string, unknown>;
  /**
   * Values as literal strings. A JSON number `1000.0` stays `"1000.0"`, because
   * that is what eSewa signed; `String(JSON.parse(...))` would yield `"1000"`
   * and every signature check would fail. Verified against the documented
   * response vector in the tests.
   */
  values: Record<string, string>;
};

const JSON_MEMBER =
  /"((?:[^"\\]|\\.)*)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?|true|false|null)/g;

function literalValues(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of text.matchAll(JSON_MEMBER)) {
    const key = JSON.parse(`"${match[1]}"`) as string;
    const value = match[2];
    out[key] = value.startsWith('"') ? (JSON.parse(value) as string) : value;
  }
  return out;
}

/**
 * Decodes the base64 JSON that arrives in the `data` query parameter.
 *
 * Tolerates base64url and the `+` → space mangling that happens when a query
 * string is decoded without percent-encoding — both are silent corruption that
 * would otherwise present as a signature failure.
 */
export function decodeEsewaCallback(data: string): EsewaCallback {
  const normalised = data.trim().replace(/ /g, "+").replace(/-/g, "+").replace(/_/g, "/");
  const raw = Buffer.from(normalised, "base64").toString("utf8");
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("eSewa callback payload is not a JSON object");
  }
  return { raw, json: parsed as Record<string, unknown>, values: literalValues(raw) };
}

export type SignatureCheck = {
  valid: boolean;
  /** True when the *other* trailing-paren variant of the key would have passed. */
  altKeyValid: boolean;
};

/**
 * Verifies the HMAC over the fields the payload itself names in
 * `signed_field_names` — which, per the documented example, includes
 * `signed_field_names`.
 */
export function verifyEsewaCallback(callback: EsewaCallback, secretKey: string): SignatureCheck {
  const signature = callback.values.signature;
  const names = callback.values.signed_field_names;
  if (!signature || !names) return { valid: false, altKeyValid: false };

  let message: string;
  try {
    message = signatureMessage(callback.values, names);
  } catch {
    return { valid: false, altKeyValid: false };
  }
  return {
    valid: timingSafeCompare(signEsewa(secretKey, message), signature),
    altKeyValid: timingSafeCompare(signEsewa(alternateSecretKey(secretKey), message), signature),
  };
}

// --------------------------------------------------------- status check ----

export type EsewaStatusResult = {
  status: EsewaStatus | "UNKNOWN";
  rawStatus: string;
  amountPaisa: number | null;
  refId: string | null;
  transactionCode: string | null;
  body: Record<string, unknown>;
};

function toStatus(value: unknown): EsewaStatus | "UNKNOWN" {
  const text = String(value ?? "").toUpperCase();
  return (ESEWA_STATUSES as readonly string[]).includes(text)
    ? (text as EsewaStatus)
    : "UNKNOWN";
}

function statusUrl(
  env: EsewaEnv,
  productCode: string,
  transactionUuid: string,
  totalAmount: string,
): string {
  const url = new URL(esewaEndpoints(env).status);
  url.search = new URLSearchParams({
    product_code: productCode,
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
  }).toString();
  return url.toString();
}

async function getStatus(url: string, timeoutMs: number): Promise<EsewaStatusResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`eSewa status API returned ${response.status}`);
    }
    const body = JSON.parse(text) as Record<string, unknown>;
    return {
      status: toStatus(body.status),
      rawStatus: String(body.status ?? ""),
      // `1,000.0` and `100.0` both occur; never parseFloat the raw value.
      amountPaisa:
        body.total_amount === undefined || body.total_amount === null
          ? null
          : esewaAmountToPaisa(body.total_amount),
      refId: body.ref_id == null ? null : String(body.ref_id),
      transactionCode: body.transaction_code == null ? null : String(body.transaction_code),
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Queries the status API with the *stored* uuid and amount. This is the only
 * proof of payment we have: the redirect is a user-agent navigation and the
 * documented IPN has no payload spec.
 *
 * The amount format eSewa will match on is not documented. We send two
 * decimals, and if that yields NOT_FOUND we retry once with the integer form
 * before believing it — a formatting mismatch would otherwise look exactly like
 * "the customer never paid", which is the most expensive wrong answer here.
 */
export async function fetchEsewaStatus(req: {
  env: EsewaEnv;
  productCode: string;
  transactionUuid: string;
  amountPaisa: number;
  timeoutMs?: number;
}): Promise<EsewaStatusResult> {
  const timeout = req.timeoutMs ?? 8000;
  const primary = paisaToEsewaAmount(req.amountPaisa);
  const result = await getStatus(
    statusUrl(req.env, req.productCode, req.transactionUuid, primary),
    timeout,
  );
  if (result.status !== "NOT_FOUND") return result;

  const alternate = String(req.amountPaisa / 100);
  if (alternate === primary) return result;
  return getStatus(
    statusUrl(req.env, req.productCode, req.transactionUuid, alternate),
    timeout,
  );
}

// ------------------------------------------------------ status mapping ----

export type PaymentDecision =
  | { action: "confirm" }
  | { action: "fail"; attemptStatus: "failed" | "canceled" }
  | { action: "expire" }
  | { action: "ambiguous" }
  | { action: "refund"; attemptStatus: "refunded" | "partially_refunded" }
  | { action: "wait" };

/**
 * The whole state mapping, in one testable table.
 *
 * `pastExpiry` — `now() > attempt.expires_at`. `abandoned` — well past it
 * (24h), the backstop that stops a permanently PENDING attempt from holding
 * reserved stock for ever. Nothing here ever auto-transitions on AMBIGUOUS, and
 * NOT_FOUND only expires once the window has actually closed.
 */
export function decideFromStatus(
  status: EsewaStatus | "UNKNOWN",
  ctx: { pastExpiry: boolean; abandoned: boolean },
): PaymentDecision {
  switch (status) {
    case "COMPLETE":
      return { action: "confirm" };
    case "CANCELED":
      return { action: "fail", attemptStatus: "canceled" };
    case "NOT_FOUND":
      return ctx.pastExpiry ? { action: "expire" } : { action: "wait" };
    case "PENDING":
      return ctx.abandoned ? { action: "expire" } : { action: "wait" };
    case "AMBIGUOUS":
      return { action: "ambiguous" };
    case "FULL_REFUND":
      return { action: "refund", attemptStatus: "refunded" };
    case "PARTIAL_REFUND":
      return { action: "refund", attemptStatus: "partially_refunded" };
    default:
      // An undocumented status is not a licence to move money either way.
      return { action: "wait" };
  }
}
