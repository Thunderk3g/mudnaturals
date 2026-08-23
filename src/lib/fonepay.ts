/**
 * Fonepay web redirect — request signing, callback reading, and the merchant
 * verification client.
 *
 * Fonepay is a bank-network gateway: the customer is redirected to Fonepay
 * with a signed query string, pays by QR or bank login, and is redirected back
 * with the outcome. The signature scheme is HMAC-SHA512 over comma-joined
 * field values, hex-encoded.
 *
 * The structural weakness to know about: the server-side verification API
 * needs the `UID` (and `BID`) that arrive **only on the browser callback**.
 * There is no documented way to ask "what happened to PRN x?" from cold. A
 * customer who pays and never returns therefore leaves an attempt we cannot
 * verify, which waits out its window and expires — documented on the attempt
 * columns in migration 012. This is unlike Khalti (pidx lookup) and eSewa
 * (status API on our own uuid), and it is why Fonepay confirmations leans
 * hardest on the callback actually arriving.
 *
 * Request format verified against the live dev gateway on 23 Aug 2026: the
 * signed request 303s into Fonepay's payment page; an altered DV is refused
 * with "Data Validation Failed".
 */
import { createHmac } from "node:crypto";
import { timingSafeCompare, type EsewaStatusResult } from "@/lib/esewa";

export type FonepayEnv = "dev" | "production";

const BASES: Record<FonepayEnv, string> = {
  dev: "https://dev-clientapi.fonepay.com/api/merchantRequest",
  production: "https://clientapi.fonepay.com/api/merchantRequest",
};

/** Anything that is not literally "production" is the dev gateway. Fail safe. */
export function resolveFonepayEnv(value: string | undefined | null): FonepayEnv {
  return value === "production" ? "production" : "dev";
}

export function fonepayBase(env: FonepayEnv): string {
  return BASES[env];
}

export function signFonepay(secretKey: string, parts: string[]): string {
  return createHmac("sha512", secretKey).update(parts.join(","), "utf8").digest("hex");
}

// --------------------------------------------------------------- request ----

/** PRN allows at most 25 characters, so an attempt uuid does not fit. */
export const FONEPAY_PRN_MAX = 25;

/**
 * Derives the PRN from an attempt id: the last 24 hex characters of the uuid.
 * 96 random bits — collisions are not a practical concern, and the unique
 * index on `fonepay_prn` turns the theoretical one into an insert error
 * instead of a mis-credited payment.
 */
export function fonepayPrnFromAttemptId(attemptId: string): string {
  return attemptId.replace(/-/g, "").slice(-24);
}

/** Fonepay wants MM/DD/YYYY, in the merchant's local day — Kathmandu's. */
export function fonepayDate(now = new Date()): string {
  return now.toLocaleDateString("en-US", { timeZone: "Asia/Kathmandu" });
}

export type FonepayRequest = {
  env: FonepayEnv;
  merchantCode: string;
  secretKey: string;
  prn: string;
  amountPaisa: number;
  remark: string;
  returnUrl: string;
  now?: Date;
};

/**
 * The fully signed redirect URL. DV is HMAC-SHA512 over
 * `PID,MD,PRN,AMT,CRN,DT,R1,R2,RU` — the values comma-joined in exactly the
 * order they appear in the query. The amount travels in rupees.
 */
export function buildFonepayRequestUrl(req: FonepayRequest): string {
  const params: Record<string, string> = {
    PID: req.merchantCode,
    MD: "P",
    PRN: req.prn,
    AMT: (req.amountPaisa / 100).toFixed(2),
    CRN: "NPR",
    DT: fonepayDate(req.now),
    R1: req.remark.slice(0, 150) || "order",
    R2: "N/A",
    RU: req.returnUrl,
  };
  params.DV = signFonepay(req.secretKey, [
    params.PID,
    params.MD,
    params.PRN,
    params.AMT,
    params.CRN,
    params.DT,
    params.R1,
    params.R2,
    params.RU,
  ]);
  return `${fonepayBase(req.env)}?${new URLSearchParams(params)}`;
}

// -------------------------------------------------------------- callback ----

export type FonepayCallback = {
  prn: string | null;
  /** "true" means Fonepay believes the payment succeeded. Believed later, not here. */
  ps: boolean;
  uid: string | null;
  bid: string | null;
  responseCode: string | null;
  paidAmountRaw: string | null;
  raw: Record<string, string>;
};

/** Reads the callback query. Pure extraction — no verdicts are formed here. */
export function readFonepayCallback(params: URLSearchParams): FonepayCallback {
  const get = (key: string) => {
    const value = params.get(key);
    return value === null || value.trim() === "" || value === "null" ? null : value.trim();
  };
  return {
    prn: get("PRN"),
    ps: (get("PS") ?? "").toLowerCase() === "true",
    uid: get("UID"),
    bid: get("BID"),
    responseCode: get("RC"),
    paidAmountRaw: get("P_AMT"),
    raw: Object.fromEntries(params.entries()),
  };
}

// ---------------------------------------------------------- verification ----

/**
 * The merchant verification call — the only server-side proof Fonepay offers.
 * Its DV is a different field order from the request: `PID,AMT,PRN,BID,UID`.
 */
export function buildFonepayVerificationUrl(req: {
  env: FonepayEnv;
  merchantCode: string;
  secretKey: string;
  prn: string;
  amountPaisa: number;
  bid: string;
  uid: string;
}): string {
  const amt = (req.amountPaisa / 100).toFixed(2);
  const dv = signFonepay(req.secretKey, [req.merchantCode, amt, req.prn, req.bid, req.uid]);
  const params = new URLSearchParams({
    PRN: req.prn,
    PID: req.merchantCode,
    BID: req.bid,
    UID: req.uid,
    AMT: amt,
    DV: dv,
  });
  return `${fonepayBase(req.env)}/verificationMerchant?${params}`;
}

/**
 * The verification body is XML-ish (`<success>true</success>`) in some
 * deployments and bare text in others. Look for the verdict, not the markup.
 */
export function parseFonepayVerification(text: string): boolean {
  return /<success>\s*true\s*<\/success>/i.test(text) || /^\s*success\s*$/i.test(text);
}

/**
 * Shapes a Fonepay outcome into the pipeline's shared status result.
 *
 * - verified true                → COMPLETE (with the stored amount: the
 *   verification call itself asserted it, since AMT is inside its DV).
 * - verified false, callback PS false → CANCELED — both sides agree no money moved.
 * - verified false, callback PS true  → AMBIGUOUS — Fonepay told the browser
 *   "paid" and the merchant API "no". Money may have moved; a human decides.
 */
export function mapFonepayVerification(input: {
  verified: boolean;
  callbackPs: boolean;
  amountPaisa: number;
  uid: string | null;
  body: Record<string, unknown>;
}): EsewaStatusResult {
  if (input.verified) {
    return {
      status: "COMPLETE",
      rawStatus: "VERIFIED",
      amountPaisa: input.amountPaisa,
      refId: input.uid,
      transactionCode: input.uid,
      body: input.body,
    };
  }
  return {
    status: input.callbackPs ? "AMBIGUOUS" : "CANCELED",
    rawStatus: input.callbackPs ? "UNVERIFIED_PS_TRUE" : "UNVERIFIED_PS_FALSE",
    amountPaisa: null,
    refId: input.uid,
    transactionCode: input.uid,
    body: input.body,
  };
}

export async function fetchFonepayVerification(req: {
  env: FonepayEnv;
  merchantCode: string;
  secretKey: string;
  prn: string;
  amountPaisa: number;
  bid: string;
  uid: string;
  callbackPs: boolean;
  timeoutMs?: number;
}): Promise<EsewaStatusResult> {
  const url = buildFonepayVerificationUrl(req);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Fonepay verification returned ${response.status}`);
    }
    return mapFonepayVerification({
      verified: parseFonepayVerification(text),
      callbackPs: req.callbackPs,
      amountPaisa: req.amountPaisa,
      uid: req.uid,
      body: { http_status: response.status, text: text.slice(0, 500) },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Response-DV note, recorded rather than enforced: public integrations
 * disagree on which fields the callback's own DV covers (`PRN,BID,UID` in one
 * SDK, longer lists elsewhere), so it is computed for the audit trail but the
 * verification API above is the only thing that confirms money. An attacker
 * who can forge the callback still cannot pass verification: its DV is
 * computed by us, over our stored amount, with the secret only we hold.
 */
export function fonepayCallbackDvMatches(
  secretKey: string,
  callback: FonepayCallback,
): boolean | null {
  const dv = callback.raw.DV;
  if (!dv || !callback.prn || !callback.uid) return null;
  const expected = signFonepay(secretKey, [callback.prn, callback.bid ?? "", callback.uid]);
  return timingSafeCompare(expected.toLowerCase(), dv.toLowerCase());
}
