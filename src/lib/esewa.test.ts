import { describe, expect, it } from "vitest";
import { esewaAmountToPaisa } from "@/lib/money";
import {
  buildEsewaForm,
  decideFromStatus,
  decodeEsewaCallback,
  signEsewa,
  signatureMessage,
  verifyEsewaCallback,
} from "@/lib/esewa";

/**
 * The eSewa docs print the UAT key on two pages, one with a trailing `(` and one
 * without. The response example below is the tie-breaker: its signature
 * reproduces exactly with the key WITHOUT the paren, and only when
 * `total_amount` is signed as the literal `1000.0` rather than the number a
 * JSON parser hands back. Both facts are load-bearing, so both are asserted.
 */
const UAT_KEY = "8gBm/:&EnhH.1/q";

const RESPONSE_JSON = `{ "transaction_code":"000AWEO", "status":"COMPLETE", "total_amount":1000.0,
  "transaction_uuid":"250610-162413", "product_code":"EPAYTEST",
  "signed_field_names":"transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
  "signature":"62GcfZTmVkzhtUeh+QJ1AqiJrjoWWGof3U+eTPTZ7fA=" }`;
const RESPONSE_SIGNATURE = "62GcfZTmVkzhtUeh+QJ1AqiJrjoWWGof3U+eTPTZ7fA=";
const encode = (json: string) => Buffer.from(json, "utf8").toString("base64");

describe("signature generation", () => {
  it("builds the documented message in signed_field_names order", () => {
    const message = signatureMessage(
      {
        total_amount: "100",
        transaction_uuid: "11-201-13",
        product_code: "EPAYTEST",
        amount: "100",
      },
      "total_amount,transaction_uuid,product_code",
    );
    expect(message).toBe("total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST");
  });

  it("reproduces the documented response signature", () => {
    const message = signatureMessage(
      decodeEsewaCallback(encode(RESPONSE_JSON)).values,
      "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    );
    expect(message).toBe(
      "transaction_code=000AWEO,status=COMPLETE,total_amount=1000.0," +
        "transaction_uuid=250610-162413,product_code=EPAYTEST," +
        "signed_field_names=transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    );
    expect(signEsewa(UAT_KEY, message)).toBe(RESPONSE_SIGNATURE);
  });

  it("raises rather than silently signing a missing field", () => {
    expect(() => signatureMessage({ total_amount: "100" }, "total_amount,product_code")).toThrow(
      /product_code/,
    );
  });
});

describe("callback verification", () => {
  it("accepts the documented payload", () => {
    const callback = decodeEsewaCallback(encode(RESPONSE_JSON));
    expect(verifyEsewaCallback(callback, UAT_KEY)).toEqual({ valid: true, altKeyValid: false });
  });

  it("rejects a tampered amount", () => {
    const tampered = decodeEsewaCallback(encode(RESPONSE_JSON.replace("1000.0", "10.0")));
    expect(tampered.values.total_amount).toBe("10.0");
    expect(verifyEsewaCallback(tampered, UAT_KEY).valid).toBe(false);
  });

  it("rejects a tampered status", () => {
    const tampered = decodeEsewaCallback(encode(RESPONSE_JSON.replace("COMPLETE", "PENDING")));
    expect(verifyEsewaCallback(tampered, UAT_KEY).valid).toBe(false);
  });

  it("reports when the other trailing-paren key variant would have validated", () => {
    const callback = decodeEsewaCallback(encode(RESPONSE_JSON));
    // What a misconfigured ESEWA_SECRET_KEY looks like from the inside.
    expect(verifyEsewaCallback(callback, `${UAT_KEY}(`)).toEqual({
      valid: false,
      altKeyValid: true,
    });
  });

  it("rejects a payload with no signature at all", () => {
    const callback = decodeEsewaCallback(encode(`{"status":"COMPLETE"}`));
    expect(verifyEsewaCallback(callback, UAT_KEY).valid).toBe(false);
  });
});

describe("payload decoding", () => {
  it("decodes base64 JSON and keeps numeric literals verbatim", () => {
    const callback = decodeEsewaCallback(encode(RESPONSE_JSON));
    expect(callback.json.status).toBe("COMPLETE");
    expect(callback.values.total_amount).toBe("1000.0");
    expect(String(callback.json.total_amount)).toBe("1000"); // why `values` exists
    expect(callback.values.transaction_uuid).toBe("250610-162413");
  });

  it("survives a query string that turned base64 '+' into a space", () => {
    const mangled = encode(RESPONSE_JSON).replace(/\+/g, " ");
    expect(decodeEsewaCallback(mangled).values.signature).toBe(RESPONSE_SIGNATURE);
  });

  it("rejects a payload that is not a JSON object", () => {
    expect(() => decodeEsewaCallback(encode("[1,2,3]"))).toThrow();
  });
});

describe("amount parsing", () => {
  it("handles every shape the status API is known to return", () => {
    expect(esewaAmountToPaisa("1,000.0")).toBe(100000);
    expect(esewaAmountToPaisa(100.0)).toBe(10000);
    expect(esewaAmountToPaisa("100")).toBe(10000);
    expect(esewaAmountToPaisa("1,234.56")).toBe(123456);
    expect(() => esewaAmountToPaisa("Rs 100")).toThrow();
  });
});

describe("form fields", () => {
  const form = buildEsewaForm({
    transactionUuid: "b1f0b4a2-0c9d-4c0a-9c2e-5c1a2b3c4d5e",
    amountPaisa: 123400,
    productCode: "EPAYTEST",
    successUrl: "https://mudnaturals.vercel.app/api/esewa/return",
    failureUrl: "https://mudnaturals.vercel.app/api/esewa/failure",
    secretKey: UAT_KEY,
    env: "uat",
  });

  it("posts to the UAT endpoint and carries all eleven required fields, none null", () => {
    expect(form.formAction).toBe("https://rc-epay.esewa.com.np/api/epay/main/v2/form");
    for (const key of [
      "amount",
      "tax_amount",
      "product_service_charge",
      "product_delivery_charge",
      "total_amount",
      "transaction_uuid",
      "product_code",
      "success_url",
      "failure_url",
      "signed_field_names",
      "signature",
    ]) {
      expect(form.fields[key], key).toBeTypeOf("string");
      expect(form.fields[key], key).not.toBe("");
    }
    expect(Object.keys(form.fields)).toHaveLength(11);
  });

  it("signs exactly what it sends", () => {
    expect(form.fields.total_amount).toBe("1234.00");
    expect(form.fields.signature).toBe(
      signEsewa(
        UAT_KEY,
        `total_amount=${form.fields.total_amount}` +
          `,transaction_uuid=${form.fields.transaction_uuid}` +
          `,product_code=${form.fields.product_code}`,
      ),
    );
  });

  it("uses the production endpoint when asked", () => {
    const live = buildEsewaForm({
      transactionUuid: "x",
      amountPaisa: 100,
      productCode: "MUD",
      successUrl: "https://s",
      failureUrl: "https://f",
      secretKey: UAT_KEY,
      env: "production",
    });
    expect(live.formAction).toBe("https://epay.esewa.com.np/api/epay/main/v2/form");
  });
});

describe("status to transition mapping", () => {
  const live = { pastExpiry: false, abandoned: false };
  const expired = { pastExpiry: true, abandoned: false };
  const ancient = { pastExpiry: true, abandoned: true };

  it("maps every documented status", () => {
    expect(decideFromStatus("COMPLETE", live)).toEqual({ action: "confirm" });
    expect(decideFromStatus("CANCELED", live)).toEqual({ action: "fail", attemptStatus: "canceled" });
    expect(decideFromStatus("AMBIGUOUS", live)).toEqual({ action: "ambiguous" });
    expect(decideFromStatus("FULL_REFUND", live)).toEqual({
      action: "refund",
      attemptStatus: "refunded",
    });
    expect(decideFromStatus("PARTIAL_REFUND", live)).toEqual({
      action: "refund",
      attemptStatus: "partially_refunded",
    });
    expect(decideFromStatus("PENDING", live)).toEqual({ action: "wait" });
    expect(decideFromStatus("NOT_FOUND", live)).toEqual({ action: "wait" });
  });

  it("expires NOT_FOUND only once the window has closed", () => {
    expect(decideFromStatus("NOT_FOUND", live)).toEqual({ action: "wait" });
    expect(decideFromStatus("NOT_FOUND", expired)).toEqual({ action: "expire" });
  });

  it("holds a PENDING attempt until it is long abandoned", () => {
    expect(decideFromStatus("PENDING", expired)).toEqual({ action: "wait" });
    expect(decideFromStatus("PENDING", ancient)).toEqual({ action: "expire" });
  });

  it("never auto-transitions AMBIGUOUS, whatever the age", () => {
    expect(decideFromStatus("AMBIGUOUS", ancient)).toEqual({ action: "ambiguous" });
  });

  it("waits on an undocumented status rather than moving money", () => {
    expect(decideFromStatus("UNKNOWN", ancient)).toEqual({ action: "wait" });
  });

  it("still confirms a completed payment found after expiry", () => {
    expect(decideFromStatus("COMPLETE", ancient)).toEqual({ action: "confirm" });
  });
});
