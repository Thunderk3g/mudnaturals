import { describe, expect, it } from "vitest";
import {
  buildKhaltiInitiateBody,
  khaltiBase,
  mapKhaltiLookup,
  mapKhaltiStatus,
  resolveKhaltiEnv,
} from "./khalti";
import { decideFromStatus } from "./esewa";

describe("environment resolution", () => {
  it("is sandbox unless told 'production' exactly", () => {
    expect(resolveKhaltiEnv("production")).toBe("production");
    expect(resolveKhaltiEnv("prod")).toBe("sandbox");
    expect(resolveKhaltiEnv(undefined)).toBe("sandbox");
    expect(khaltiBase("sandbox")).toContain("dev.khalti.com");
    expect(khaltiBase("production")).toBe("https://khalti.com/api/v2");
  });
});

describe("initiate body", () => {
  it("carries the amount in paisa untouched", () => {
    const body = buildKhaltiInitiateBody({
      amountPaisa: 420000,
      purchaseOrderId: "order-1",
      purchaseOrderName: "MUD Naturals order",
      returnUrl: "https://x.test/api/khalti/return",
      websiteUrl: "https://x.test",
    });
    // Khalti's unit IS paisa — any conversion here would charge 100× off.
    expect(body.amount).toBe(420000);
    expect(body.purchase_order_id).toBe("order-1");
    expect(body).not.toHaveProperty("customer_info");
  });

  it("includes customer_info only when something is actually known", () => {
    const withPhone = buildKhaltiInitiateBody({
      amountPaisa: 1000,
      purchaseOrderId: "o",
      purchaseOrderName: "n",
      returnUrl: "r",
      websiteUrl: "w",
      customer: { phone: "9800000001" },
    });
    expect(withPhone.customer_info).toEqual({ phone: "9800000001" });

    const empty = buildKhaltiInitiateBody({
      amountPaisa: 1000,
      purchaseOrderId: "o",
      purchaseOrderName: "n",
      returnUrl: "r",
      websiteUrl: "w",
      customer: {},
    });
    expect(empty).not.toHaveProperty("customer_info");
  });
});

describe("status mapping", () => {
  it("maps every documented Khalti status into the shared vocabulary", () => {
    expect(mapKhaltiStatus("Completed")).toBe("COMPLETE");
    expect(mapKhaltiStatus("Pending")).toBe("PENDING");
    expect(mapKhaltiStatus("Initiated")).toBe("PENDING");
    expect(mapKhaltiStatus("Expired")).toBe("CANCELED");
    expect(mapKhaltiStatus("User canceled")).toBe("CANCELED");
    expect(mapKhaltiStatus("Refunded")).toBe("FULL_REFUND");
    expect(mapKhaltiStatus("Partially Refunded")).toBe("PARTIAL_REFUND");
  });

  it("treats an undocumented status as UNKNOWN, which the pipeline holds", () => {
    expect(mapKhaltiStatus("Settled")).toBe("UNKNOWN");
    expect(
      decideFromStatus(mapKhaltiStatus("Settled"), { pastExpiry: true, abandoned: true }),
    ).toEqual({ action: "wait" });
  });

  it("only Completed can reach a confirmation", () => {
    for (const raw of ["Pending", "Initiated", "Expired", "User canceled"]) {
      const decision = decideFromStatus(mapKhaltiStatus(raw), {
        pastExpiry: false,
        abandoned: false,
      });
      expect(decision.action, raw).not.toBe("confirm");
    }
    expect(
      decideFromStatus(mapKhaltiStatus("Completed"), { pastExpiry: false, abandoned: false }),
    ).toEqual({ action: "confirm" });
  });

  it("Expired and User canceled release stock immediately, not at window close", () => {
    // Khalti itself has killed the link; waiting for our own expiry would hold
    // the reservation for nothing.
    for (const raw of ["Expired", "User canceled"]) {
      expect(
        decideFromStatus(mapKhaltiStatus(raw), { pastExpiry: false, abandoned: false }),
      ).toEqual({ action: "fail", attemptStatus: "canceled" });
    }
  });
});

describe("lookup shaping", () => {
  it("passes the paisa amount through as a number and keeps the raw body", () => {
    const result = mapKhaltiLookup({
      pidx: "hQxkeCQngNndwc6rHJy7AJ",
      status: "Completed",
      total_amount: 420000,
      transaction_id: "txn-1",
      fee: 0,
      refunded: false,
    });
    expect(result.status).toBe("COMPLETE");
    expect(result.amountPaisa).toBe(420000);
    expect(result.refId).toBe("txn-1");
    expect(result.transactionCode).toBe("hQxkeCQngNndwc6rHJy7AJ");
    expect(result.body.refunded).toBe(false);
  });

  it("a non-numeric amount becomes null, which confirm treats as ambiguous", () => {
    const result = mapKhaltiLookup({ status: "Completed", total_amount: "420000" });
    expect(result.amountPaisa).toBeNull();
  });
});
