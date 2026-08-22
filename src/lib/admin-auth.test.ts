import { beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

/**
 * The admin session is the whole authorization story, so its two primitives get
 * asserted: a wrong password never matches, and a cookie that was not signed by
 * this ADMIN_PASSWORD — or has expired — never verifies.
 */

const PASSWORD = "correct-horse-battery-staple";

let passwordMatches: (input: string) => boolean;
let verifyToken: (token: string | undefined) => boolean;

const tokenFor = (expiresAt: number, key = PASSWORD) =>
  `${expiresAt}.${createHmac("sha256", key).update(String(expiresAt)).digest("hex")}`;

beforeAll(async () => {
  process.env.ADMIN_PASSWORD = PASSWORD;
  ({ passwordMatches, verifyToken } = await import("@/lib/admin-auth"));
});

describe("passwordMatches", () => {
  it("accepts the configured password", () => {
    expect(passwordMatches(PASSWORD)).toBe(true);
  });

  it("rejects a wrong password, including near misses and different lengths", () => {
    expect(passwordMatches("")).toBe(false);
    expect(passwordMatches("correct-horse-battery-stapl")).toBe(false);
    expect(passwordMatches(`${PASSWORD} `)).toBe(false);
    expect(passwordMatches("x")).toBe(false);
  });
});

describe("verifyToken", () => {
  it("accepts a live token it signed itself", () => {
    expect(verifyToken(tokenFor(Date.now() + 60_000))).toBe(true);
  });

  it("rejects an expired token even though the signature is valid", () => {
    expect(verifyToken(tokenFor(Date.now() - 1_000))).toBe(false);
  });

  it("rejects a token signed with a different password", () => {
    expect(verifyToken(tokenFor(Date.now() + 60_000, "some-other-password"))).toBe(false);
  });

  it("rejects a tampered expiry that keeps the old signature", () => {
    const future = Date.now() + 60_000;
    const [, signature] = tokenFor(future).split(".");
    expect(verifyToken(`${future + 999_999_999}.${signature}`)).toBe(false);
  });

  it("rejects malformed input rather than throwing", () => {
    for (const bad of [undefined, "", ".", "abc", "123", "123.", "123.zz", `${Date.now() + 1000}.`]) {
      expect(verifyToken(bad)).toBe(false);
    }
  });
});
