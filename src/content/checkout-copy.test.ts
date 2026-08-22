import { describe, expect, it } from "vitest";
import {
  DISTRICTS,
  FALLBACK_SHIPPING as s,
  isNepaliMobile,
  normalizePhone,
  PROVINCES,
  shippingFor,
} from "./checkout-copy";

/**
 * `shippingFor` is the number the customer is shown in the cart; `place_order`
 * is the number they are charged. If these two ever disagree the cart is
 * lying, so the branches are pinned in the same order the SQL evaluates them.
 */
describe("shippingFor", () => {
  it("is free at and above the threshold, whatever the district", () => {
    expect(shippingFor(s.free_over_paisa, "Kathmandu", s)).toBe(0);
    expect(shippingFor(s.free_over_paisa + 1, "Humla", s)).toBe(0);
  });

  it("charges the valley rate only for valley districts", () => {
    expect(shippingFor(100000, "Lalitpur", s)).toBe(s.inside_valley_paisa);
    expect(shippingFor(100000, "Bhaktapur", s)).toBe(s.inside_valley_paisa);
    expect(shippingFor(100000, "Kaski", s)).toBe(s.outside_valley_paisa);
  });

  it("shows the worst case before a district is known", () => {
    expect(shippingFor(100000, null, s)).toBe(s.outside_valley_paisa);
  });

  it("charges nothing for an empty cart", () => {
    expect(shippingFor(0, "Kathmandu", s)).toBe(0);
  });
});

describe("phone", () => {
  it("strips formatting and the country code", () => {
    expect(normalizePhone("+977 98-4123-4567")).toBe("9841234567");
    expect(normalizePhone("9841234567")).toBe("9841234567");
  });

  it("accepts 96/97/98 mobiles and nothing else", () => {
    expect(isNepaliMobile("9841234567")).toBe(true);
    expect(isNepaliMobile("+977-9761234567")).toBe(true);
    expect(isNepaliMobile("014412345")).toBe(false); // landline
    expect(isNepaliMobile("98412345")).toBe(false); // too short
  });
});

it("every valley district is a district we can actually pick", () => {
  const all = PROVINCES.flatMap((province) => DISTRICTS[province]);
  expect(all).toHaveLength(77);
  for (const district of s.valley_districts) expect(all).toContain(district);
});
