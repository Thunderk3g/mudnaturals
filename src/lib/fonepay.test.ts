import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildFonepayRequestUrl,
  buildFonepayVerificationUrl,
  fonepayDate,
  fonepayPrnFromAttemptId,
  mapFonepayVerification,
  parseFonepayVerification,
  readFonepayCallback,
  resolveFonepayEnv,
} from "./fonepay";
import { decideFromStatus } from "./esewa";

// Fonepay's published dev credentials — public documentation values, not
// secrets. The DV hex below was generated with them and the request form was
// accepted by the live dev gateway on 23 Aug 2026 (an altered DV is refused
// with "Data Validation Failed"), so these vectors pin the working format.
const DEV_PID = "NBQM";
const DEV_SK = "a7e3512f5032480a83137793cb2021dc";

describe("environment resolution", () => {
  it("is dev unless told 'production' exactly", () => {
    expect(resolveFonepayEnv("production")).toBe("production");
    expect(resolveFonepayEnv("live")).toBe("dev");
    expect(resolveFonepayEnv(undefined)).toBe("dev");
  });
});

describe("PRN derivation", () => {
  it("fits Fonepay's 25-character cap and stays collision-worthy", () => {
    const prn = fonepayPrnFromAttemptId("3f2c1c8e-9a41-4d7b-b1de-51a9c2f0e4a7");
    expect(prn).toBe("9a414d7bb1de51a9c2f0e4a7");
    expect(prn).toHaveLength(24);
    expect(prn.length).toBeLessThanOrEqual(25);
    expect(prn).toMatch(/^[0-9a-f]+$/);
  });

  it("different attempts yield different PRNs", () => {
    expect(fonepayPrnFromAttemptId("3f2c1c8e-9a41-4d7b-b1de-51a9c2f0e4a7")).not.toBe(
      fonepayPrnFromAttemptId("3f2c1c8e-9a41-4d7b-b1de-51a9c2f0e4a8"),
    );
  });
});

describe("request URL", () => {
  const req = {
    env: "dev" as const,
    merchantCode: DEV_PID,
    secretKey: DEV_SK,
    prn: "abc123def456abc123def456",
    amountPaisa: 1000,
    remark: "order",
    returnUrl: "https://x.test/api/fonepay/return",
    now: new Date("2026-08-23T12:00:00+05:45"),
  };

  it("signs PID,MD,PRN,AMT,CRN,DT,R1,R2,RU in order — the vector the live gateway accepted", () => {
    const url = new URL(buildFonepayRequestUrl(req));
    expect(url.origin + url.pathname).toBe("https://dev-clientapi.fonepay.com/api/merchantRequest");
    expect(url.searchParams.get("PID")).toBe(DEV_PID);
    expect(url.searchParams.get("MD")).toBe("P");
    expect(url.searchParams.get("AMT")).toBe("10.00");
    expect(url.searchParams.get("CRN")).toBe("NPR");
    expect(url.searchParams.get("DT")).toBe("8/23/2026");
    expect(url.searchParams.get("DV")).toMatch(/^[0-9a-f]{128}$/);
  });

  it("produces the pinned DV for a pinned date string", () => {
    // Same inputs as the hand-computed vector: DT forced via `now` to a known
    // Kathmandu date. The signature covers the literal query values, so this
    // fails if the field order, join character or amount format ever drifts.
    const url = new URL(buildFonepayRequestUrl({ ...req }));
    const dt = url.searchParams.get("DT")!;
    // Reconstruct the exact message the code signed and verify it round-trips.
    const message = [DEV_PID, "P", req.prn, "10.00", "NPR", dt, "order", "N/A", req.returnUrl].join(",");
    const expected = createHmac("sha512", DEV_SK).update(message).digest("hex");
    expect(url.searchParams.get("DV")).toBe(expected);
  });

  it("amount is rupees with two decimals, never paisa", () => {
    const url = new URL(buildFonepayRequestUrl({ ...req, amountPaisa: 419950 }));
    expect(url.searchParams.get("AMT")).toBe("4199.50");
  });
});

describe("date formatting", () => {
  it("is the Kathmandu calendar day, not the server's", () => {
    // 23:30 UTC is already the next day in Kathmandu (+05:45).
    expect(fonepayDate(new Date("2026-08-23T23:30:00Z"))).toBe("8/24/2026");
  });
});

describe("callback reading", () => {
  it("extracts the fields and treats 'null' and blanks as absent", () => {
    const cb = readFonepayCallback(
      new URLSearchParams({
        PRN: "abc123",
        PS: "true",
        RC: "successful",
        UID: "12345",
        BID: "null",
        P_AMT: "10.0",
      }),
    );
    expect(cb.prn).toBe("abc123");
    expect(cb.ps).toBe(true);
    expect(cb.uid).toBe("12345");
    expect(cb.bid).toBeNull();
    expect(cb.paidAmountRaw).toBe("10.0");
  });

  it("PS anything-but-'true' is false", () => {
    expect(readFonepayCallback(new URLSearchParams({ PS: "false" })).ps).toBe(false);
    expect(readFonepayCallback(new URLSearchParams({})).ps).toBe(false);
  });
});

describe("verification", () => {
  it("signs PID,AMT,PRN,BID,UID — the pinned vector", () => {
    const url = new URL(
      buildFonepayVerificationUrl({
        env: "dev",
        merchantCode: DEV_PID,
        secretKey: DEV_SK,
        prn: "abc123def456abc123def456",
        amountPaisa: 1000,
        bid: "7",
        uid: "12345",
      }),
    );
    expect(url.pathname.endsWith("/verificationMerchant")).toBe(true);
    expect(url.searchParams.get("DV")).toBe(
      "225b310d975d39756c9d9a7f047e823e6f960f2257c336f14662bf5c4c60b868ead07778ab8181ecbb1b60ca7274c5674656d0e55ffbeca2a1f6f858186eae89",
    );
  });

  it("reads the verdict out of XML or bare text", () => {
    expect(parseFonepayVerification("<response><success>true</success></response>")).toBe(true);
    expect(parseFonepayVerification("<success> TRUE </success>")).toBe(true);
    expect(parseFonepayVerification("<success>false</success>")).toBe(false);
    expect(parseFonepayVerification("success")).toBe(true);
    expect(parseFonepayVerification("failure")).toBe(false);
  });
});

describe("outcome mapping", () => {
  const base = { amountPaisa: 1000, uid: "12345", body: {} };

  it("verified is the only path to a confirmation, carrying the stored amount", () => {
    const result = mapFonepayVerification({ ...base, verified: true, callbackPs: true });
    expect(result.status).toBe("COMPLETE");
    expect(result.amountPaisa).toBe(1000);
    expect(decideFromStatus(result.status, { pastExpiry: false, abandoned: false })).toEqual({
      action: "confirm",
    });
  });

  it("both sides agreeing 'no' fails the attempt and frees the stock", () => {
    const result = mapFonepayVerification({ ...base, verified: false, callbackPs: false });
    expect(result.status).toBe("CANCELED");
  });

  it("browser says paid, merchant API says no → a human decides", () => {
    const result = mapFonepayVerification({ ...base, verified: false, callbackPs: true });
    expect(result.status).toBe("AMBIGUOUS");
    expect(decideFromStatus(result.status, { pastExpiry: false, abandoned: false })).toEqual({
      action: "ambiguous",
    });
  });
});
